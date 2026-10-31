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
// きっかけ: 2026-10-22 新しい部品（ui-check など）を作るたびに、全リポジトリへ配り忘れが出る（「手順の抜け」の繰り返し）。
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OWNER = process.env.OWNER || 'satou-aaaaa';
// weekly-summary.yml の REPOS と同じ並び（shared-workflows 自身は部品の置き場なので見ない）
const REPOS = (process.env.REPOS || 'sandbox last-tell tenbin dungeon-boardgame naitei-no-michi local-kanban articles carcassonne-research usotsuki-roppo')
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
    const list = execFileSync('git', ['-C', dir, 'ls-files'], { encoding: 'utf8' }).split('\n').filter((p) => p && existsSync(join(dir, p)));
    return { paths: new Set(list), read: async (p) => readFileSync(join(dir, p), 'utf8') };
  }
  const repo = await api(`repos/${OWNER}/${r}`);
  if (!repo || repo.archived) return repo ? { archived: true } : null;
  const tree = await api(`repos/${OWNER}/${r}/git/trees/${repo.default_branch}?recursive=1`);
  if (tree?.truncated) throw new Error('ファイルが多すぎて一覧が途中で切れた');
  return { paths: new Set((tree?.tree || []).map((t) => t.path)), read: (p) => api(`repos/${OWNER}/${r}/contents/${p}`, true) };
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
      }
    }
    for (const c of CALLS) if (!called.has(c)) flag(`call:${c}`, `共通部品 ${c} を呼んでいない（template/.github/workflows/${c}.yml を写す）`);

    for (const o of out) lines.push(`[${r}] ${o}`);
  } catch (e) { skipped.push(`${r}（${e.message}）`); }
}

if (lines.length) console.log(lines.join('\n'));
else console.log('ずれは見つかりませんでした');
if (skipped.length) console.log(`\n確かめられなかった: ${skipped.join('、')}`);
