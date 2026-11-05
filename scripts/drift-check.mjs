// ひな形（template/）からのずれを、全リポジトリについて1行ずつ出す（Claude は使わない。どの AI でも人でも使える）。
// 使い方: node scripts/drift-check.mjs            （トークンなしでも動くが、GitHub の回数制限が厳しい）
//         GH_TOKEN=$(gh auth token) node scripts/drift-check.mjs
//         LOCAL_ROOT=~/src node scripts/drift-check.mjs   （手元の clone（~/src/<リポジトリ名>）を見る。ネットにつながらないとき）
// 週次まとめ（weekly-summary.yml）が「ひな形からのずれ」の節に載せる。出た行は、そのリポジトリで直す PR を作るか、
// ずれてよい理由があれば scripts/drift-allow.json に理由つきで足す（理由の無い許しは置かない）。
// 見るもの:
//   - 全リポジトリにあるはずのファイル（AGENTS.md・CLAUDE.md・scripts/setup.sh・.claude/settings.json・.coderabbit.yaml）
//   - AGENTS.md の節（「push する前の確認」「共通のきまり」）と、CLAUDE.md が AGENTS.md を読み込むこと
//   - 全リポジトリで呼ぶはずの共通部品（ci-failure-issue・secret-scan・branch-cleanup・labels・setup-check）
//   - 共通部品の呼び出しが @main 以外を指している・もう無い部品を呼んでいる
//   - ci-failure-issue の呼び出しに見回り（schedule）が無い
//   - link-check の呼び出しに、main への push で動き直す設定が無い（incidents/2026-11-05-link-check-not-rerun-on-main.md）
//   - scripts/setup.sh の「ひな形の版」が template/scripts/setup.sh より古い（ひな形を直しても写しに届かない。incidents/2026-11-03-setup-false-ready.md）
//   - scripts/setup.sh が渡す CHROMIUM_PATH を、検査のスクリプト（qa/・tools/ など）が読んでいない
//   - 依存の置き場（package.json・requirements.txt・pyproject.toml）を Dependabot が見ていない
//   - 公開リポジトリの既定のブランチに、削除と force push を止めるルールが無い（API で読むときだけ。incidents/2026-11-04-new-repos-no-ruleset.md）
//   - 感想の Issue フォーム（.github/ISSUE_TEMPLATE/feedback.yml）の name がひな形とちがう・形が GitHub の決まりに合わない（incidents/2026-11-05-feedback-form-not-shown.md）
//   - 公開の見張り（post-deploy・site-watch）があるのに GitHub Pages が有効でない（API で読むときだけ。incidents/2026-11-04-pages-never-enabled.md）
// きっかけ: 2026-10-22 新しい部品（ui-check など）を作るたびに、全リポジトリへ配り忘れが出る（「手順の抜け」の繰り返し）。
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formProblems } from './check-issue-forms.mjs';

const OWNER = process.env.OWNER || 'satou-aaaaa';
// weekly-summary.yml の REPOS と同じ並び（shared-workflows 自身は部品の置き場なので見ない）
const REPOS = (process.env.REPOS || 'sandbox last-tell tenbin dungeon-boardgame naitei-no-michi local-kanban articles carcassonne-research usotsuki-roppo wagamama-burger kabu-news batsu-doko kasane-zome rosen-hitofude seiza-tsunagi mannaka-kanji kippu-10 bento-zume todofuken-relay shiritori-saitan madori-puzzle tenkizu-yomi bushu-tashizan')
  .split(/\s+/).filter((r) => r && r !== 'shared-workflows');
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const here = dirname(fileURLToPath(import.meta.url));

const FILES = ['AGENTS.md', 'CLAUDE.md', 'scripts/setup.sh', '.claude/settings.json', '.coderabbit.yaml'];
const SECTIONS = ['## push する前の確認', '## 共通のきまり'];
const CALLS = ['ci-failure-issue', 'secret-scan', 'branch-cleanup', 'labels', 'setup-check'];

// 部品の一覧（このリポジトリの .github/workflows で workflow_call を持つもの）
const wfDir = join(here, '..', '.github', 'workflows');
const reusable = new Set(existsSync(wfDir)
  ? readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f) && /^\s*workflow_call:/m.test(readFileSync(join(wfDir, f), 'utf8'))).map((f) => f.replace(/\.ya?ml$/, ''))
  : []);

// 準備スクリプトのひな形の版（写しの「ひな形の版: N」と比べる）
const setupVer = (text) => Number((text.match(/ひな形の版:\s*(\d+)/) || [])[1] || 1);
const SETUP_VER = setupVer(readFileSync(join(here, '..', 'template', 'scripts', 'setup.sh'), 'utf8'));

// 感想フォームのひな形の name（写しの name がこれとちがえば知らせる）
const FEEDBACK_NAME = formProblems(readFileSync(join(here, '..', 'template', '.github', 'ISSUE_TEMPLATE', 'feedback.yml'), 'utf8')).name;

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
      if (!/^@AGENTS\.md\s*$/m.test(claude)) flag('claude:import', 'CLAUDE.md が @AGENTS.md を読み込んでいない（AGENTS.md と二重に書いている）');
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
      const { name, problems } = formProblems(await src.read(p));
      for (const pr of problems) flag(`form:${p}`, `${p}: ${pr}`);
      if (p.endsWith('/feedback.yml') && name && name !== FEEDBACK_NAME) flag('form:feedback-name', `${p} の name が「${name}」（ひな形は「${FEEDBACK_NAME}」。template/.github/ISSUE_TEMPLATE/feedback.yml を写す）`);
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
    }
    for (const c of CALLS) if (!called.has(c)) flag(`call:${c}`, `共通部品 ${c} を呼んでいない（template/.github/workflows/${c}.yml を写す）`);

    for (const o of out) lines.push(`[${r}] ${o}`);
  } catch (e) { skipped.push(`${r}（${e.message}）`); }
}

if (lines.length) console.log(lines.join('\n'));
else console.log('ずれは見つかりませんでした');
if (skipped.length) console.log(`\n確かめられなかった: ${skipped.join('、')}`);
