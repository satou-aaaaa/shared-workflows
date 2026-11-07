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
//   - ci-failure-issue の呼び出しに見回り（schedule）が無い・main で動くワークフローの名前が workflows: に無い
//   - ゲーム（index.html・sw.js・qa/run.mjs がある）の QA が共通部品 game-qa を呼んでいない
//   - link-check の呼び出しに、main への push で動き直す設定が無い（incidents/2026-11-05-link-check-not-rerun-on-main.md）
//   - Playwright を入れるジョブの timeout-minutes が 20 より短い（ファイル名によらず全部のワークフローを見る。入れる段階だけで9分かかる日がある。incidents/2026-11-05-qa-timeout-slow-install.md・2026-11-07-tenbin-check-timeout.md）
//   - scripts/setup.sh にひな形の <> が残っている（埋め忘れ）
//   - scripts/setup.sh の「ひな形の版」が template/scripts/setup.sh より古い（ひな形を直しても写しに届かない。incidents/2026-11-03-setup-false-ready.md）
//   - scripts/setup.sh が渡す CHROMIUM_PATH を、検査のスクリプト（qa/・tools/ など）が読んでいない
//   - 依存の置き場（package.json・requirements.txt・pyproject.toml）を Dependabot が見ていない
//   - 公開リポジトリの既定のブランチに、削除と force push を止めるルールが無い（API で読むときだけ。incidents/2026-11-04-new-repos-no-ruleset.md）・ゲームの必須チェックに QA と Secret scan が無い
//   - 感想の Issue フォーム（.github/ISSUE_TEMPLATE/feedback.yml）の name がひな形とちがう・形が GitHub の決まりに合わない（incidents/2026-11-05-feedback-form-not-shown.md）
//   - 公開の見張り（post-deploy・site-watch）があるのに GitHub Pages が有効でない（API で読むときだけ。incidents/2026-11-04-pages-never-enabled.md）
//   - 記録を localStorage に置く PWA のゲームに、引き継ぎコード（transfer.js）が無い・版が template/transfer.js より古い・sw.js が保存していない（routines/game-dev.md「引き継ぎコード」）
//   - ゲームの qa/run.mjs の例外を待つ検査（try { make("0:y40|…") }）に、問題 id を文字で書いている（incidents/2026-11-07-qa-copied-question-id.md）
//   - ゲーム（index.html と sw.js がある）に、見やすさの設定（template/a11y/a11y.html）と検査（template/qa/a11y.mjs）が無い・ひな形とちがう・qa/run.mjs が回していない（routines/game-dev.md「だれでも遊べるように」）
//   - ゲーム（index.html と sw.js がある）に、遊ぶ量を縛るチケット🎫や「○○すると開く」のモードの鍵がある（routines/game-dev.md「好きなだけ遊べるように」。satou さん 2026-11-06）
//   - 公開リポジトリなのに repos.txt に無い（一覧の足し忘れ。API で読むときだけ。incidents/2026-11-07-repo-list-conflicts.md）
//   - ゲームの sw.js が、入れるとき（install）に HTTP の保存を通して SHELL を取る（cache: 'reload' が無い。古い画面が新しい版に入る。routines/game-dev.md「PWA」）
//   - ゲームの sw.js・qa/sw-check.mjs がひな形（template/sw.js の game:begin〜game:end の外）とちがう（scripts/sync-template.mjs で写す）
//   - とことんの「ここで降りる」が正解の直後に効かない形がある・manifest がふつうのアイコンを maskable にも使い回す
//   - ゲームの save が、localStorage に書けなかったときに黙っている（開き直すと記録が消える。incidents/2026-11-07-save-failure-silent.md）
//   - ゲームのヒント2（cutOf）が、まちがいの数で消す数を変える（しぼったあとにまちがいを選ぶと、消した選び肢が戻る。incidents/2026-11-07-hint-cut-comes-back.md）
// きっかけ: 2026-10-22 新しい部品（ui-check など）を作るたびに、全リポジトリへ配り忘れが出る（「手順の抜け」の繰り返し）。
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { makeSw } from './sync-template.mjs';
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
// main で動いても、落ちたときに Issue を立てなくてよいもの（ci-failure-issue.yml の workflows: に無くてよい）
const UNWATCHED = ['CI failure issue', 'Scorecard', 'Weekly summary'];

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
const SW_QA = readFileSync(join(here, '..', 'template', 'qa', 'sw-check.mjs'), 'utf8');

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
      // ひな形の「<…>」を埋め忘れると、bash が構文エラーで止まる（2026-11-07 haku-uchi #1 の Setup check。drift-check は通っていた）
      // 引用つき（next="<…>"）も見る：構文エラーにはならず、終わりの案内に <…> がそのまま出ていた（2026-11-07 haku-uchi のひな形の写し直し）
      const hole = setup.split('\n').find((l) => !/^\s*#/.test(l) && (/=["']?<[^>\n]*>/.test(l) || /<[^<>\n]*[ぁ-んァ-ヶ一-龠][^<>\n]*>/.test(l)));
      if (hole) flag('setup:placeholder', `scripts/setup.sh にひな形の <> が残っている「${hole.trim().slice(0, 40)}」（埋めないと構文エラーで止まる）`);
      // 要らない節の消し忘れ：無いファイルを読む節が残ると、準備が途中で止まる（2026-11-07 haku-uchi。Python の節が requirements.txt を探して落ちた）
      for (const f of ['requirements.txt', '.python-version', '.nvmrc']) {
        const used = setup.split('\n').some((l) => !/^\s*#/.test(l) && l.includes(f));
        // 版6 の Python の節は if [ -f requirements.txt ] で守られ、ファイルが無ければ動かないので数えない（2026-11-07 標識よみ）
        const guarded = f !== '.nvmrc' && /^\s*if \[ -f requirements\.txt \]; then/m.test(setup);
        if (used && !guarded && !paths.has(f)) flag('setup:unused-section', `scripts/setup.sh が ${f} を読むが、リポジトリに無い（ひな形の要らない節を消す）`);
      }
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
      // ゲーム（QA と Secret scan がある）は、両方を必須チェックにする。無いと Dependabot の自動マージ（--auto）が検査の前にマージする
      // （2026-11-07 CodeRabbit が bousai-handan #1 で指摘。incidents/2026-11-07-game-template-review-gaps.md）
      if (paths.has('.github/workflows/qa.yml') && paths.has('.github/workflows/secret-scan.yml') && paths.has('sw.js')) {
        const need = (Array.isArray(rules) ? rules : []).filter((x) => x.type === 'required_status_checks').flatMap((x) => (x.parameters?.required_status_checks || []).map((c) => c.context));
        const lack = ['qa / qa', 'scan / scan'].filter((c) => !need.includes(c));
        if (lack.length) flag('ruleset:checks', `${src.repo.default_branch} の必須チェックに ${lack.join('・')} が無い（shared-workflows の Actions「Add ruleset」を name=${r} で起こす。routines/onboarding.md 手順5）`);
      }
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

    // QA の「この問題は作れない」検査に、問題 id を文字で書かない。別のゲームから写した id がそのゲームに無いと、
    // 「無い問題」で例外が出て、確かめたいこと（難しさの照合など）を見ないまま通る（2026-11-07 shukujitsu-yurai #1。incidents/2026-11-07-qa-copied-question-id.md）
    if (paths.has('qa/run.mjs')) {
      const qa = await src.read('qa/run.mjs');
      const lit = qa.match(/try\s*\{[^}]*\bmake\(\s*["'][0-9]:[a-z]+[0-9]+/);
      if (lit) flag('qa:literal-id', `qa/run.mjs の例外を待つ検査に、問題 id を文字で書いている「${lit[0].slice(-24)}」（G.POOL などデータから選ぶ。routines/game-dev.md の QA の行）`);
    }

    let pageCache = null; // 同じ index.html を何度も取りに行かない（API の読み込みが途中で失敗しても、それまでのずれを出せるように）
    // 好きなだけ遊べるように：寄付で成り立たせるゲームなので、遊ぶ量を縛る仕組み・課金ゲームのような解放を入れない（satou さん 2026-11-06「チケット制はいれる必要ありますか？好きなだけ遊んでほしいです」）
    // 実績の 🔒（まだ取っていない印）は鍵ではないので見ない。「○○すると開く」のようにモードを閉じる文だけを見る
    if (paths.has('index.html') && paths.has('sw.js')) {
      const page = await src.read('index.html');
      if (page.includes('🎫')) flag('free:ticket', 'index.html にチケット🎫がある（遊ぶ量を縛らない。とことんは、まちがえても続き「ここで降りる」で終わる形に。routines/game-dev.md「好きなだけ遊べるように」）');
      // 「巻を1回読むと開く」「🔒 上級の5本は、今日の5本のあとで」のような文（「設定を開く」「アプリで開く」は鍵ではない。CSS のコメントは見ない）
      const gate = page.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^<>`'"\n]{0,24}(?:と|たら)開く|🔒 [^<>`'"\n]{2,40}/);
      if (gate) flag('free:gate', `index.html に遊ぶ前の鍵がある「${gate[0].trim()}」（どのモードも最初から遊べるように。routines/game-dev.md「好きなだけ遊べるように」）`);
      pageCache = page;
    }

    // 遊び方の「見た」は「わかった」を押したらすぐ残し、dialog の cancel（Esc のその場）と close でも残す（ボタンだけだと Esc で閉じた人に毎回出る。close だけだと知らせが遅れて届き、押した直後に読み直すとまた出る。2026-11-07 incidents/2026-11-07-howto-esc-not-saved.md）
    if (paths.has('index.html')) {
      const page = pageCache ?? await src.read('index.html');
      const ok = page.match(/\$\("howto-ok"\)\.onclick\s*=\s*\(\)\s*=>\s*\{[^\n]*/);
      if (ok) {
        const onClose = /\$\("howto"\)\.addEventListener\("close"[^\n]*tut\s*=\s*true/.test(page);
        const onCancel = /\$\("howto"\)\.addEventListener\("cancel"[^\n]*tut\s*=\s*true/.test(page);
        const atOnce = /^\$\("howto-ok"\)\.onclick\s*=\s*\(\)\s*=>\s*\{\s*save\(/.test(ok[0]);
        if (!onClose) flag('howto:close', 'index.html が遊び方の「見た」を dialog の close で残していない（Esc で閉じた人に毎回出る。$("howto").addEventListener("close", () => { if (!load().tut) save(…) })。routines/game-dev.md「共通の形」の遊び方）');
        else if (!onCancel) flag('howto:close', 'index.html が遊び方の「見た」を dialog の cancel（Esc を押したその場）で残していない（close の知らせは遅れて届き、Esc の直後に読み直すとまた出る。$("howto").addEventListener("cancel", …)。routines/game-dev.md「共通の形」の遊び方）');
        else if (!atOnce) flag('howto:close', 'index.html の「わかった」が「見た」をすぐ残していない（close の知らせは遅れて届き、押した直後に読み直すとまた出る。onclick の最初で save(…)。routines/game-dev.md「共通の形」の遊び方）');
      }
    }

    // ホームの題（h1.title）は、上の帯の h1{flex:1} を受け継ぐと、縦に並べた画面で余った高さを全部取って伸びる（820×1180 で 277〜450px のすき間。2026-11-07 incidents/2026-11-07-title-stretched.md）
    if (paths.has('index.html')) {
      const page = pageCache ?? await src.read('index.html');
      const css = page.replace(/\/\*[\s\S]*?\*\//g, '');
      const h1Grow = /(?:^|[\s};])h1\s*\{[^}]*\bflex\s*:\s*1/.test(css);
      const titleH1 = /<h1[^>]*class="[^"]*\btitle\b/.test(page);
      const t = css.match(/\.title\s*\{([^}]*)\}/);
      if (h1Grow && titleH1 && !(t && /\bflex\s*:\s*(?:none|0)/.test(t[1]))) flag('title:flex', 'index.html のホームの題（h1.title）が h1{flex:1} を受け継いで縦に伸びる（iPad の縦などで題の下に大きなすき間。.title に flex:none。routines/game-dev.md「共通の形」のホームの題）');
    }

    // 保存に失敗したら知らせる：容量いっぱい・保存を切ったブラウザでは、記録は開いているあいだだけ残り、開き直すと消える。
    // 黙っていると遊ぶ人は気づけない（2026-11-07 暑さ指数よみの PR のレビューで見つけ、同じ作りのゲーム14本を直した。incidents/2026-11-07-save-failure-silent.md）
    if (paths.has('index.html')) {
      const page = pageCache ?? await src.read('index.html');
      if (/catch\s*\(e\)\s*\{\s*mem\s*=\s*j;\s*\}/.test(page)) flag('save:silent', 'index.html の save が、保存に失敗しても黙っている（開き直すと記録が消える。保存できないあいだは帯 #savewarn を出したままにし、QA に検査を足す。routines/game-dev.md「共通の形」の記録）');
      // ヒント2：まちがいを除いてから消す数を決めると、しぼったあとにまちがいを選んだとき、消した選び肢が戻る（saibanin-shikumi #1 の CodeRabbit）
      const cut = page.match(/const cutOf\s*=[^\n]*/);
      if (cut && /wrong\.includes/.test(cut[0]) && /left\.length\s*(?:-\s*1|>\s*1)/.test(cut[0])) flag('hint:cut-moves', 'index.html の cutOf が、まちがいの数で消す選び肢を変える（しぼったあとにまちがいを選ぶと、消した選び肢が戻る。正解でない選び肢のうち最後の1つ以外を消す形にし、QA に検査を足す。routines/game-dev.md「共通の形」のヒント）');
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
      // sw.js はひな形（template/sw.js）を写し、ゲームごとに書くのは game:begin〜game:end の間だけ（28本が28通りになっていた。incidents/2026-11-07-template-copies-drift.md）
      const raw = await src.read('sw.js');
      const next = makeSw(raw);
      if (next === null) flag('sw:template', 'sw.js に const CACHE と const SHELL が無い（template/sw.js を写し、game:begin〜game:end に書く）');
      else if (next !== raw) flag('sw:template', 'sw.js がひな形とちがう（node scripts/sync-template.mjs <ゲームのフォルダ> で写す。ゲームの所は game:begin〜game:end の間に書く）');
      if (!paths.has('qa/sw-check.mjs')) flag('sw:qa', 'qa/sw-check.mjs が無い（template/qa/sw-check.mjs を写し、qa/run.mjs から checkSwStall を呼ぶ）');
      else if ((await src.read('qa/sw-check.mjs')) !== SW_QA) flag('sw:qa', 'qa/sw-check.mjs がひな形とちがう（node scripts/sync-template.mjs で写す）');
      else if (!paths.has('qa/run.mjs') || !/checkSwStall\(/.test(await src.read('qa/run.mjs'))) flag('sw:run', 'qa/run.mjs が checkSwStall を呼んでいない（sw.js の検査が CI で走らない）');
      // とことんで正解した直後に「ここで降りる」が効かない形（2026-11-07 kyuyo-meisai #1 の CodeRabbit。同じ行が8本にあった）
      if (paths.has('index.html') && /if\s*\(\s*cur\s*&&\s*cur\.done\s*\)\s*return;\s*finish\(\)/.test(await src.read('index.html'))) flag('endless:stuck', 'index.html の「ここで降りる」が正解した直後に効かない（if (cur && cur.done) return; finish(); の行。kyuyo-meisai 1bebfdc の直し方）');
      // ふつうのアイコンを maskable にも使い回すと、Android で丸く切られて絵の端が欠ける（2026-11-07 tani-kankaku #1 の CodeRabbit）
      if (paths.has('manifest.webmanifest')) {
        let icons = [];
        try { icons = JSON.parse(await src.read('manifest.webmanifest')).icons || []; } catch { /* 形の検査は QA */ }
        const anyUse = new Set(icons.filter((i) => !/maskable/.test(i.purpose || 'any') || /any/.test(i.purpose || 'any')).map((i) => i.src));
        if (icons.some((i) => /maskable/.test(i.purpose || '') && (/any/.test(i.purpose) || anyUse.has(i.src)))) flag('pwa:maskable', 'manifest.webmanifest がふつうのアイコンを maskable にも使っている（中央の半径40％に絵を収めた icon-maskable-512.png を作り、purpose: "maskable" で別に書く。tani-kankaku・wareki-yomi の形）');
      }
    }
    const called = new Set();
    const onMain = []; let watched = null; // main で動くワークフローの名前・ci-failure-issue が見張る名前
    for (const p of paths) {
      if (!/^\.github\/workflows\/[^/]+\.ya?ml$/.test(p)) continue;
      const text = await src.read(p);
      // コメントの行は数えない。値の引用符（' "）は外して読む
      const live = text.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
      const wfName = (live.match(/^name:\s*["']?(.+?)["']?\s*$/m) || [])[1];
      if (wfName && /^\s*(schedule|push):/m.test(live)) onMain.push(wfName);
      if (wfName === 'Auto merge') onMain.push(wfName); // workflow_run で main の上で動く（マージの失敗に気づくため見張る。2026-11-07 setsuden-kotsu #1 の CodeRabbit）
      const wl = live.match(/^\s*workflows:\s*\[(.*)\]/m);
      if (/shared-workflows\/\.github\/workflows\/ci-failure-issue\.ya?ml@/.test(live) && wl) watched = wl[1].split(',').map((x) => x.trim().replace(/^["']|["']$/g, ''));
      for (const m of live.matchAll(/^\s*(?:-\s*)?uses:\s*["']?satou-aaaaa\/shared-workflows\/\.github\/workflows\/([\w.-]+?)\.ya?ml@([^\s#"']+)["']?/gm)) {
        called.add(m[1]);
        if (m[2] !== 'main') flag(`ref:${m[1]}`, `${p} が ${m[1]} を @${m[2]} で呼んでいる（共通部品は @main）`);
        if (reusable.size && !reusable.has(m[1])) out.push(`${p} が、もう無い部品 ${m[1]} を呼んでいる（CI が止まる）`);
        // 見回り（schedule）が無いと、GITHUB_TOKEN で起こした実行（Pages・AI content など）の失敗に気づけない（carcassonne-research #83）
        if (m[1] === 'ci-failure-issue' && !/^\s*schedule:/m.test(live)) flag('ci-failure-issue:sweep', `${p} に見回りの schedule が無い（template/.github/workflows/ci-failure-issue.yml を写す）`);
        // 直した設定がマージされても main で動き直さないと、赤のまま残り Issue が開き直す（incidents/2026-11-05-link-check-not-rerun-on-main.md）
        if (m[1] === 'link-check' && !/^\s*push:/m.test(live)) flag('link-check:push', `${p} に main への push で動き直す設定が無い（template/.github/workflows/link-check.yml を写す）`);
        // 呼び出し側のひな形の版10（2026-11-07 shared-workflows #219 にためた CodeRabbit の指摘）
        // on: の push: の中身（次の2字下げのきっかけまで）
        const pushPart = (live.split(/^ {2}push:\s*$/m)[1] || '').split(/^ {2}\w[\w-]*:/m)[0];
        const pushPaths = (pushPart.split(/^\s*paths:\s*$/m)[1] || '').split(/^\s*[\w-]+:/m)[0];
        const onMainPush = /branches:\s*\[\s*["']?main["']?\s*\]/.test(pushPart) && !/paths-ignore:/.test(pushPart);
        if (m[1] === 'link-check' && /^ {2}push:/m.test(live) && !(onMainPush && /["']\*\.html["']/.test(pushPaths) && /README\.md/.test(pushPaths))) flag('link-check:paths', `${p} の push（main）の paths に "*.html" と README.md が無い（paths-ignore も使わない。リンクを直してマージしても main で動き直さない）`);
        if (m[1] === 'setup-check' && !(onMainPush && /scripts\/setup\.sh/.test(pushPaths))) flag('setup-check:push', `${p} に main への push（paths に scripts/setup.sh）が無い（直した setup.sh をマージしても、失敗の Issue が次の月まで閉じない。template/.github/workflows/setup-check.yml を写す）`);
        if (m[1] === 'ci-failure-issue' && !/^\s*contents:\s*read/m.test(live)) flag('ci-failure-issue:contents', `${p} の permissions に contents: read が無い（非公開にすると見回りが main を読めない）`);
        const group = (live.match(/^\s*group:\s*(.+)$/m) || [, ''])[1];
        if (m[1] === 'game-qa' && /cancel-in-progress/.test(live) && !/run_id/.test(group)) flag('qa:concurrency', `${p} の concurrency の group が main の実行も同じグループにまとめる（待っている main の QA が取り消される。template/.github/workflows/qa.yml の形に）`);
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
    // main で動くのに見張っていないワークフロー（2026-11-07 Setup check が抜けていて、月1の失敗で Issue が立たなかった。incidents/2026-11-07-game-template-review-gaps.md）
    if (watched) {
      const miss = onMain.filter((n) => !watched.includes(n) && !UNWATCHED.includes(n));
      if (miss.length) flag('ci-failure-issue:list', `ci-failure-issue.yml の workflows: に、main で動く ${miss.join('・')} が無い（落ちても Issue が立たない）`);
    }
    // ゲームの QA は共通部品 game-qa を呼ぶ（写しだと、版の固定・時間切れの直しが届かない。同じ incident）
    if (paths.has('index.html') && paths.has('sw.js') && paths.has('qa/run.mjs') && !called.has('game-qa')) flag('call:game-qa', 'ゲームの QA が共通部品 game-qa を呼んでいない（template/.github/workflows/qa.yml を写す。検査の名前は qa / qa になる）');

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
