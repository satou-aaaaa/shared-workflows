// ひな形（template/）からのずれを、全リポジトリについて1行ずつ出す（Claude は使わない。どの AI でも人でも使える）。
// 使い方: node scripts/drift-check.mjs            （トークンなしでも動くが、GitHub の回数制限が厳しい）
//         GH_TOKEN=$(gh auth token) node scripts/drift-check.mjs
//         LOCAL_ROOT=~/src node scripts/drift-check.mjs   （手元の clone（~/src/<リポジトリ名>）を見る。ネットにつながらないとき）
// 週次まとめ（weekly-summary.yml）が「ひな形からのずれ」の節に載せる。出た行は、そのリポジトリで直す PR を作るか、
// ずれてよい理由があれば scripts/drift-allow.json に理由つきで足す（理由の無い許しは置かない）。
// 見るもの:
//   - 全リポジトリにあるはずのファイル（AGENTS.md・CLAUDE.md・scripts/setup.sh・.claude/settings.json・.coderabbit.yaml）
//   - AGENTS.md の節（「push する前の確認」「共通のきまり」）と、CLAUDE.md が AGENTS.md を指すこと（4KB 超を @ で取り込まない）
//   - 全リポジトリで呼ぶはずの共通部品（ci-failure-issue・secret-scan・branch-cleanup・labels・setup-check）
//   - 共通部品の呼び出しが @main 以外を指している・もう無い部品を呼んでいる
//   - ci-failure-issue の呼び出しに見回り（schedule）が無い
//   - link-check の呼び出しに、main への push で動き直す設定が無い（incidents/2026-11-05-link-check-not-rerun-on-main.md）
//   - Playwright を入れるジョブの timeout-minutes が 20 より短い（ファイル名によらず全部のワークフローを見る。入れる段階だけで9分かかる日がある。incidents/2026-11-05-qa-timeout-slow-install.md・2026-11-07-tenbin-check-timeout.md）
//   - scripts/setup.sh の「ひな形の版」が template/scripts/setup.sh より古い（ひな形を直しても写しに届かない。incidents/2026-11-03-setup-false-ready.md）
//   - scripts/setup.sh が渡す CHROMIUM_PATH を、検査のスクリプト（qa/・tools/ など）が読んでいない
//   - 依存の置き場（package.json・requirements.txt・pyproject.toml）を Dependabot が見ていない
//   - 公開リポジトリの既定のブランチに、削除と force push を止めるルールが無い（API で読むときだけ。incidents/2026-11-04-new-repos-no-ruleset.md）
//   - 感想の Issue フォーム（.github/ISSUE_TEMPLATE/feedback.yml）の name がひな形とちがう・形が GitHub の決まりに合わない（incidents/2026-11-05-feedback-form-not-shown.md）
//   - 公開の見張り（post-deploy・site-watch）があるのに GitHub Pages が有効でない（API で読むときだけ。incidents/2026-11-04-pages-never-enabled.md）
//   - 記録を localStorage に置く PWA のゲームに、引き継ぎコード（transfer.js）が無い・版が template/transfer.js より古い・sw.js が保存していない（routines/game-dev.md「引き継ぎコード」）
//   - ゲーム（index.html と sw.js がある）に、見やすさの設定（template/a11y/a11y.html）と検査（template/qa/a11y.mjs）が無い・ひな形とちがう・qa/run.mjs が回していない（routines/game-dev.md「だれでも遊べるように」）
//   - ゲーム（index.html と sw.js がある）に、遊ぶ量を縛るチケット🎫や「○○すると開く」のモードの鍵がある（routines/game-dev.md「好きなだけ遊べるように」。satou さん 2026-11-06）
//   - 公開リポジトリなのに repos.txt に無い（一覧の足し忘れ。API で読むときだけ。incidents/2026-11-07-repo-list-conflicts.md）
//   - ゲームの sw.js が、入れるとき（install）に HTTP の保存を通して SHELL を取る（cache: 'reload' が無い。古い画面が新しい版に入る。routines/game-dev.md「PWA」）
// きっかけ: 2026-10-22 新しい部品（ui-check など）を作るたびに、全リポジトリへ配り忘れが出る（「手順の抜け」の繰り返し）。
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formProblems } from './check-issue-forms.mjs';
import { readRepos, repoNames } from './repos.mjs';

const OWNER = process.env.OWNER || 'satou-aaaaa';
// 見るリポジトリは repos.txt の game・app（shared-workflows 自身は部品の置き場なので見ない）
const REPOS = (process.env.REPOS || repoNames().join(' '))
  .split(/\s+/).filter((r) => r && r !== 'shared-workflows');
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const here = dirname(fileURLToPath(import.meta.url));

const FILES = ['AGENTS.md', 'CLAUDE.md', 'scripts/setup.sh', '.claude/settings.json', '.coderabbit.yaml'];
const SECTIONS = ['## push する前の確認', '## 共通のきまり'];
const QA_MIN = 20;
const CALLS = ['ci-failure-issue', 'secret-scan', 'branch-cleanup', 'labels', 'setup-check'];

// 部品の一覧（このリポジトリの .github/workflows で workflow_call を持つもの）
const wfDir = join(here, '..', '.github', 'workflows');
const reusable = new Set(existsSync(wfDir)
  ? readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f) && /^\s*workflow_call:/m.test(readFileSync(join(wfDir, f), 'utf8'))).map((f) => f.replace(/\.ya?ml$/, ''))
  : []);

// 準備スクリプトのひな形の版（写しの「ひな形の版: N」と比べる）
const setupVer = (text) => Number((text.match(/ひな形の版:\s*(\d+)/) || [])[1] || 1);
const SETUP_VER = setupVer(readFileSync(join(here, '..', 'template', 'scripts', 'setup.sh'), 'utf8'));

// 引き継ぎコードのひな形の版（写しの「引き継ぎの版: N」と比べる）
const hkVer = (text) => Number((text.match(/引き継ぎの版:\s*(\d+)/) || [])[1] || 0);
const HK_VER = hkVer(readFileSync(join(here, '..', 'template', 'transfer.js'), 'utf8'));

// 感想フォームのひな形の name（写しの name がこれとちがえば知らせる）
const FEEDBACK_NAME = formProblems(readFileSync(join(here, '..', 'template', '.github', 'ISSUE_TEMPLATE', 'feedback.yml'), 'utf8')).name;

// 見やすさの設定と検査のひな形（ゲームの写しがこれと同じか比べる）
const A11Y_BLOCK = (t) => (t.match(/<!-- a11y:begin[\s\S]*?<!-- a11y:end -->/) || [''])[0];
const A11Y_HTML = A11Y_BLOCK(readFileSync(join(here, '..', 'template', 'a11y', 'a11y.html'), 'utf8'));
const A11Y_QA = readFileSync(join(here, '..', 'template', 'qa', 'a11y.mjs'), 'utf8');

const allowPath = join(here, 'drift-allow.json');
const allow = existsSync(allowPath) ? JSON.parse(readFileSync(allowPath, 'utf8')) : {};
for (const [repo, list] of Object.entries(allow)) {
  for (const a of list) if (!a.id || !a.reason) { console.error(`::error::drift-allow.json の ${repo} に id か reason の無い行がある（理由の無い許しは置かない）`); process.exit(2); }
}
const allowed = (repo, id) => (allow[repo] || []).some((a) => a.id === id);

async function api(path, raw = false) {
  const res = await fetch(`https://api.github.com/${path}`, {
    headers: { Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return raw ? res.text() : res.json();
}

// ワークフローの jobs: の下を、ジョブ（2字下げの名前）ごとに切り分ける
function qaJobs(text) {
  const body = text.split(/^jobs:\s*$/m)[1] || '';
  return body.split(/^(?= {2}[\w-]+:\s*$)/m).filter((c) => /^ {2}[\w-]+:/.test(c)).map((c) => ({ name: c.match(/^ {2}([\w-]+):/)[1], text: c }));
}

const LOCAL_ROOT = process.env.LOCAL_ROOT || '';
// リポジトリの中身の読み方（GitHub の API か、手元の clone か）をそろえる
async function source(r) {
  if (LOCAL_ROOT) {
    const dir = join(LOCAL_ROOT, r);
    if (!existsSync(join(dir, '.git'))) return null;
    // 追跡していても作業ツリーで消したものは「無い」と数える
    // 大きいリポジトリ（last-tell-godot は数万ファイル）は既定の 1MB を超えて ENOBUFS で落ちていた（2026-11-04）
    const list = execFileSync('git', ['-C', dir, 'ls-files'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).split('\n').filter((p) => p && existsSync(join(dir, p)));
    return { paths: new Set(list), read: async (p) => readFileSync(join(dir, p), 'utf8') };
  }
  const repo = await api(`repos/${OWNER}/${r}`);
  if (!repo || repo.archived) return repo ? { archived: true } : null;
  const tree = await api(`repos/${OWNER}/${r}/git/trees/${repo.default_branch}?recursive=1`);
  if (tree?.truncated) throw new Error('ファイルが多すぎて一覧が途中で切れた');
  return { repo, paths: new Set((tree?.tree || []).map((t) => t.path)), read: (p) => api(`repos/${OWNER}/${r}/contents/${p}`, true) };
}

const lines = [];
const skipped = [];
for (const r of REPOS) {
  try {
    const src = await source(r);
    if (!src) { skipped.push(`${r}（見つからない）`); continue; }
    if (src.archived) continue;
    const { paths } = src;
    const out = [];
    const flag = (id, text) => { if (!allowed(r, id)) out.push(text); };

    for (const f of FILES) if (!paths.has(f)) flag(`file:${f}`, `${f} が無い（template/ から写す）`);

    if (paths.has('AGENTS.md')) {
      const agents = await src.read('AGENTS.md');
      for (const s of SECTIONS) if (!agents.includes(s)) flag(`section:${s}`, `AGENTS.md に「${s.replace('## ', '')}」の節が無い`);
      if (!agents.includes('routines/pr.md')) flag('agents:pr', 'AGENTS.md が共通の手順（routines/pr.md）を指していない');
    }
    if (paths.has('CLAUDE.md')) {
      const claude = await src.read('CLAUDE.md');
      const imports = /^@AGENTS\.md\s*$/m.test(claude);
      if (!imports && !/AGENTS\.md/.test(claude)) flag('claude:import', 'CLAUDE.md が AGENTS.md を指していない（template/CLAUDE.md の形に）');
      // 4KB を超える AGENTS.md を @ で取り込むと、全リポジトリを入れたクラウドの会話で毎回全文が読まれる（2026-11-07 トークン節約。routines/game-dev.md「トークンを節約する」）
      if (imports && paths.has('AGENTS.md') && Buffer.byteLength(await src.read('AGENTS.md')) > 4096) flag('claude:big-import', 'CLAUDE.md が 4KB を超える AGENTS.md を @ で取り込んでいる（毎回の会話で全文が読まれる。template/CLAUDE.md の1行に替える）');
      if (Buffer.byteLength(claude) > 1024) flag('claude:long', 'CLAUDE.md が 1KB を超えている（決まりは AGENTS.md に書く）');
    }

    if (paths.has('scripts/setup.sh')) {
      const setup = await src.read('scripts/setup.sh');
      const v = setupVer(setup);
      if (v < SETUP_VER) flag('setup:version', `scripts/setup.sh がひな形の版 ${v}（今は ${SETUP_VER}。template/scripts/setup.sh の版の行の下にある変わったところを写し、版の行も上げる）`);
      // 準備が渡すブラウザの場所（CHROMIUM_PATH）を、検査が読んでいるか。読んでいないと「✓ 準備できた」のあと検査がブラウザを見つけられない
      // （2026-11-04 dungeon-boardgame の qa/run.mjs は PW_CHROMIUM しか読んでいなかった。incidents/2026-11-04-setup-nvm-silent-stop.md）
      if (/session_env "CHROMIUM_PATH=/.test(setup)) {
        const cand = [...paths].filter((q) => /^(qa|tools|tests?|e2e|scripts)\/(?:[^/]+\/)?[^/]+\.[cm]?js$/.test(q) && !q.includes('node_modules')).slice(0, 60);
        let launches = false; let reads = false;
        for (const q of cand) {
          const t = await src.read(q);
          if (/chromium\.launch|chromium\.executablePath|CHROME_PATH/.test(t)) launches = true;
          if (t.includes('CHROMIUM_PATH')) { reads = true; break; }
        }
        if (launches && !reads) flag('setup:chromium-path', 'scripts/setup.sh は CHROMIUM_PATH を渡すが、検査（qa/ など）が CHROMIUM_PATH を読んでいない（chromium.launch の executablePath に process.env.CHROMIUM_PATH を足す）');
      }
    }

    // 依存の置き場（package.json・requirements.txt・pyproject.toml）を Dependabot が見ているか
    // （2026-11-04 tenbin の package.json の Playwright を見ておらず、古いまま残っていた。tenbin #64）
    {
      const eco = { 'package.json': 'npm', 'requirements.txt': 'pip', 'pyproject.toml': 'pip' };
      const manifests = [...paths].filter((q) => eco[q.split('/').pop()] && !/(^|\/)(node_modules|fixtures?|examples?|vendor)\//.test(q));
      if (manifests.length) {
        const dep = paths.has('.github/dependabot.yml') ? await src.read('.github/dependabot.yml') : '';
        // package-ecosystem ごとに directory / directories を拾う（YAML を読む部品は使わない）
        const watched = new Set();
        for (const block of dep.split(/^\s*-\s*package-ecosystem:/m).slice(1)) {
          const e = (block.match(/^\s*["']?([\w-]+)/) || [])[1];
          const dirs = [...block.matchAll(/^\s*(?:directory:\s*|-\s*)["']?(\/[^"'\s]*)["']?\s*$/gm)].map((m) => m[1].replace(/\/$/, '') || '/');
          for (const d of dirs) watched.add(`${e}:${d}`);
        }
        for (const q of manifests) {
          const d = '/' + q.split('/').slice(0, -1).join('/');
          const e = eco[q.split('/').pop()];
          const dir = d === '/' ? '/' : d;
          if (!watched.has(`${e}:${dir}`)) flag(`dependabot:${q}`, `${q} の依存を Dependabot が見ていない（.github/dependabot.yml に package-ecosystem: "${e}"・directory: "${dir}" を足す）`);
        }
      }
    }

    // main の守り（削除と force push の禁止）。設定画面でしか入れられず、Chrome が無い日の受け入れで抜けたまま気づかれなかった
    // （2026-11-04 公開ゲーム14本で0件。incidents/2026-11-04-new-repos-no-ruleset.md）。無料プランの非公開リポジトリは入れられないので見ない
    if (src.repo && !src.repo.private) {
      const rules = await api(`repos/${OWNER}/${r}/rules/branches/${encodeURIComponent(src.repo.default_branch)}`);
      const types = new Set((Array.isArray(rules) ? rules : []).map((x) => x.type));
      const miss = ['deletion', 'non_fast_forward'].filter((t) => !types.has(t));
      if (miss.length) flag('ruleset', `${src.repo.default_branch} のルールセットに ${miss.join('・')} が無い（routines/onboarding.md 手順5の2。…/settings/rules → New branch ruleset →「Restrict deletions」「Block force pushes」）`);
    }

    // 公開の見張り（post-deploy・site-watch）を入れているのに Pages が切れている。site-watch は前は「切れているので何もしない」で緑だった
    // （2026-11-04 mannaka-kanji・kippu-10・bento-zume が 404 のまま X で紹介された。incidents/2026-11-04-pages-never-enabled.md）
    if (src.repo && (paths.has('.github/workflows/post-deploy.yml') || paths.has('.github/workflows/site-watch.yml'))) {
      const pages = await api(`repos/${OWNER}/${r}/pages`);
      if (!pages) flag('pages', 'GitHub Pages が有効になっていない（公開の見張りはあるのにページが 404。routines/onboarding.md 手順5の1：…/settings/pages → Deploy from a branch → main / (root)）');
    }

    // 感想フォーム：name が「感想」（2字）だと GitHub がフォームを出さず白紙の Issue になった（2026-11-05 ゲーム8本。incidents/2026-11-05-feedback-form-not-shown.md）
    for (const p of [...paths].filter((q) => /^\.github\/ISSUE_TEMPLATE\/[^/]+\.ya?ml$/.test(q) && !/\/config\.ya?ml$/.test(q))) {
      const text = await src.read(p);
      const { name, problems } = formProblems(text);
      for (const pr of problems) flag(`form:${p}`, `${p}: ${pr}`);
      // フォームの labels にあるラベルがリポジトリに無いと、付かないまま Issue になる（週1の読み手がラベルで探せない）。
      // 2026-11-05 kabu-news・wagamama-burger は labels.yml が「感想」を足す前に動いたきりで、月1の見回りまで無かった
      if (src.repo) {
        const want = ((text.match(/^labels:\s*\[(.*)\]/m) || [])[1] || '').split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        for (const l of want) if (!(await api(`repos/${OWNER}/${r}/labels/${encodeURIComponent(l)}`))) flag(`label:${l}`, `${p} が付けるラベル「${l}」がリポジトリに無い（Actions の Labels を Run workflow で動かす）`);
      }
      if (p.endsWith('/feedback.yml') && name && name !== FEEDBACK_NAME) flag('form:feedback-name', `${p} の name が「${name}」（ひな形は「${FEEDBACK_NAME}」。template/.github/ISSUE_TEMPLATE/feedback.yml を写す）`);
    }

    // 見やすさ：色覚・ディスレクシアなどの人も遊べるよう、どのゲームにも同じ設定と検査を入れる（satou さん 2026-11-05）
    if (paths.has('index.html') && paths.has('sw.js')) {
      const page = await src.read('index.html');
      const mine = A11Y_BLOCK(page);
      if (!mine) flag('a11y:block', 'index.html に見やすさの設定が無い（template/a11y/a11y.html を </head> の前に写し、開くボタンに data-a11y-open。routines/game-dev.md「だれでも遊べるように」）');
      else if (mine !== A11Y_HTML) flag('a11y:block', 'index.html の見やすさの設定がひな形とちがう（template/a11y/a11y.html をもう一度写す。写しを直さない）');
      if (!paths.has('qa/a11y.mjs')) flag('a11y:qa', 'qa/a11y.mjs が無い（template/qa/a11y.mjs を写し、qa/run.mjs から回す）');
      else {
        if ((await src.read('qa/a11y.mjs')) !== A11Y_QA) flag('a11y:qa', 'qa/a11y.mjs がひな形とちがう（template/qa/a11y.mjs をもう一度写す。ゲームごとの許しは qa/a11y.json に理由つきで）');
        if (paths.has('qa/run.mjs') && !(await src.read('qa/run.mjs')).includes('a11y.mjs')) flag('a11y:run', 'qa/run.mjs が qa/a11y.mjs を回していない（CI の QA で見やすさが見られない）');
      }
    }

    // 好きなだけ遊べるように：寄付で成り立たせるゲームなので、遊ぶ量を縛る仕組み・課金ゲームのような解放を入れない（satou さん 2026-11-06「チケット制はいれる必要ありますか？好きなだけ遊んでほしいです」）
    // 実績の 🔒（まだ取っていない印）は鍵ではないので見ない。「○○すると開く」のようにモードを閉じる文だけを見る
    if (paths.has('index.html') && paths.has('sw.js')) {
      const page = await src.read('index.html');
      if (page.includes('🎫')) flag('free:ticket', 'index.html にチケット🎫がある（遊ぶ量を縛らない。とことんは、まちがえても続き「ここで降りる」で終わる形に。routines/game-dev.md「好きなだけ遊べるように」）');
      // 「巻を1回読むと開く」「🔒 上級の5本は、今日の5本のあとで」のような文（「設定を開く」「アプリで開く」は鍵ではない。CSS のコメントは見ない）
      const gate = page.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^<>`'"\n]{0,24}(?:と|たら)開く|🔒 [^<>`'"\n]{2,40}/);
      if (gate) flag('free:gate', `index.html に遊ぶ前の鍵がある「${gate[0].trim()}」（どのモードも最初から遊べるように。routines/game-dev.md「好きなだけ遊べるように」）`);
    }

    // 引き継ぎコード：記録が端末の中だけにあるゲームは、機種変更で記録が消える（2026-11-05 satou さん「PWA 型のゲームでデータの引継ぎを」）。
    // 新しいゲームに入れ忘れないよう、PWA（sw.js と manifest）で AGENTS.md が localStorage に記録を置くと書いているリポジトリを見る
    // AGENTS.md に書いていなくても、index.html が localStorage を使っていれば見る
    if (paths.has('sw.js') && paths.has('manifest.webmanifest') && ((paths.has('AGENTS.md') && (await src.read('AGENTS.md')).includes('localStorage')) || (paths.has('index.html') && (await src.read('index.html')).includes('localStorage')))) {
      if (!paths.has('transfer.js')) flag('transfer', '引き継ぎコード（transfer.js）が無い（routines/game-dev.md「引き継ぎコード」：template/transfer.js と template/qa/transfer-check.mjs を写す）');
      else {
        const v = hkVer(await src.read('transfer.js'));
        if (v < HK_VER) flag('transfer:version', `transfer.js が引き継ぎの版 ${v}（今は ${HK_VER}。template/transfer.js をそのまま写す）`);
        // コメントの中の './transfer.js' では通さない（SHELL の配列の中の、生きている要素だけを見る）
        const sw = (await src.read('sw.js')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
        const shell = (sw.match(/SHELL\s*=\s*\[([\s\S]*?)\]/) || [, ''])[1];
        if (!/["']\.\/transfer\.js["']/.test(shell)) flag('transfer:sw', 'sw.js の SHELL に ./transfer.js が無い（電波が無いと引き継ぎが開かない）');
        if (!paths.has('qa/transfer-check.mjs')) flag('transfer:qa', 'qa/transfer-check.mjs が無い（template/qa/transfer-check.mjs を写し、qa/run.mjs から checkTransfer を呼ぶ）');
        else if (!paths.has('qa/run.mjs') || !(await src.read('qa/run.mjs')).includes('checkTransfer')) flag('transfer:run', 'qa/run.mjs が checkTransfer を呼んでいない（引き継ぎの画面検査が走らない）');
      }
    }

    // PWA の入れ直し：GitHub Pages は index.html を10分ほど HTTP に保存させるので、install で普通に取ると古い画面を新しい CACHE に入れてしまう（2026-11-06 CodeRabbit が間取り・部首で指摘）
    if (paths.has('index.html') && paths.has('sw.js')) {
      const sw = (await src.read('sw.js')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
      if (/addAll\(/.test(sw) && !/cache:\s*["']reload["']/.test(sw)) flag('sw:reload', 'sw.js の install が SHELL を HTTP の保存から取る（addAll(SHELL.map((u) => new Request(u, { cache: "reload" }))) にする）');
    }
    const called = new Set();
    for (const p of paths) {
      if (!/^\.github\/workflows\/[^/]+\.ya?ml$/.test(p)) continue;
      const text = await src.read(p);
      // コメントの行は数えない。値の引用符（' "）は外して読む
      const live = text.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
      for (const m of live.matchAll(/^\s*(?:-\s*)?uses:\s*["']?satou-aaaaa\/shared-workflows\/\.github\/workflows\/([\w.-]+?)\.ya?ml@([^\s#"']+)["']?/gm)) {
        called.add(m[1]);
        if (m[2] !== 'main') flag(`ref:${m[1]}`, `${p} が ${m[1]} を @${m[2]} で呼んでいる（共通部品は @main）`);
        if (reusable.size && !reusable.has(m[1])) out.push(`${p} が、もう無い部品 ${m[1]} を呼んでいる（CI が止まる）`);
        // 見回り（schedule）が無いと、GITHUB_TOKEN で起こした実行（Pages・AI content など）の失敗に気づけない（carcassonne-research #83）
        if (m[1] === 'ci-failure-issue' && !/^\s*schedule:/m.test(live)) flag('ci-failure-issue:sweep', `${p} に見回りの schedule が無い（template/.github/workflows/ci-failure-issue.yml を写す）`);
        // 直した設定がマージされても main で動き直さないと、赤のまま残り Issue が開き直す（incidents/2026-11-05-link-check-not-rerun-on-main.md）
        if (m[1] === 'link-check' && !/^\s*push:/m.test(live)) flag('link-check:push', `${p} に main への push で動き直す設定が無い（template/.github/workflows/link-check.yml を写す）`);
      }
      // Playwright を入れる段階（apt）が9分かかる日があり、10分の時間切れで QA が止まった（incidents/2026-11-05-qa-timeout-slow-install.md）
      // ジョブごとに見る（ファイル全体の最小だと、別のジョブの短い時間切れまで数えてしまう）。ジョブに書いていなければ GitHub の既定の360分
      // 2026-11-07 tenbin の check.yml（ファイル名が qa.yml でない）だけ10分のまま残り、main の Check が止まった（incidents/2026-11-07-tenbin-check-timeout.md）
      for (const job of qaJobs(live)) {
        if (!/playwright install/.test(job.text)) continue;
        const t = Number((job.text.match(/^ {4}timeout-minutes:\s*(\d+)/m) || [])[1] || 360);
        if (t < QA_MIN) flag('qa:timeout', `${p} の ${job.name} の timeout-minutes が ${t} 分（Playwright を入れるジョブは ${QA_MIN} 分以上。template/.github/workflows/qa.yml を写す）`);
      }
    }
    for (const c of CALLS) if (!called.has(c)) flag(`call:${c}`, `共通部品 ${c} を呼んでいない（template/.github/workflows/${c}.yml を写す）`);

    for (const o of out) lines.push(`[${r}] ${o}`);
  } catch (e) { skipped.push(`${r}（${e.message}）`); }
}

// 公開リポジトリなのに repos.txt に無いもの（新作を一覧に足し忘れると、週次まとめ・成績表・CI 時間・このずれの検査のどれにも出ない。
// 2026-11-07 kengen-check が README にはあるのにワークフローの一覧から抜けていた。incidents/2026-11-07-repo-list-conflicts.md）
if (!LOCAL_ROOT) {
  try {
    const known = new Set([...readRepos().map((x) => x.name), 'shared-workflows']);
    for (let page = 1; page <= 10; page++) {
      const list = await api(`users/${OWNER}/repos?type=owner&per_page=100&page=${page}`);
      if (!Array.isArray(list) || !list.length) break;
      for (const x of list) {
        if (x.fork || x.archived || x.private || known.has(x.name)) continue;
        lines.push(`[${x.name}] repos.txt に無い公開リポジトリ（名前の順の位置に「${x.name} game」などを1行足す。見ないなら ignore と理由）`);
      }
      if (list.length < 100) break;
    }
  } catch (e) { skipped.push(`repos.txt との突き合わせ（${e.message}）`); }
}

if (lines.length) console.log(lines.join('\n'));
else console.log('ずれは見つかりませんでした');
if (skipped.length) console.log(`\n確かめられなかった: ${skipped.join('、')}`);
