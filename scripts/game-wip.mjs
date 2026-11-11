// 新作ゲームの「作りかけ」と「候補の列」を出し、毎日の新作の回（routines/game-factory.md）がすることを1行ずつ出す（Claude は使わない。どの AI でも人でも使える）。
// 使い方: GH_TOKEN=$(gh auth token) node scripts/game-wip.mjs
//         node scripts/game-wip.mjs --json      （機械で読む形）
// 見るもの: shared-workflows の開いている「題材:」Issue。
//   本文に `repo: <名前>` の行がある → 作りかけ（そのリポジトリの開いている PR と、最後に動いた日を見る）
//   本文に `repo:` の行が無い       → 候補の列（番号の小さい順に作る）
// 同時に作る本数の上限は WIP_LIMIT（作りかけを絞るほど1本が早く仕上がる。QA を4本以上同時に回すと落ちやすい。template-distribution）。
// きっかけ: 2026-11-07〜11 新作が並行で十数本動き、ひな形に取り残される・公開後に止まる・題材がかぶるが続いた
//           （incidents/2026-11-07-new-game-old-template.md・2026-11-07-new-game-stopped-after-publish.md・2026-11-11-codeql-url-includes-in-qa.md）。
import { makeApi } from './gh-api.mjs';

const OWNER = process.env.OWNER || 'satou-aaaaa';
export const WIP_LIMIT = Number(process.env.WIP_LIMIT || 2);
export const QUEUE_MIN = 5; // 候補がこれより少なければ足す
const STALL_DAYS = 1; // PR がこれ以上動いていなければ「止まっている」

// 「題材:」Issue の本文から repo: の行を読む
export const repoOf = (body) => (body || '').match(/^repo:\s*([\w.-]+)\s*$/m)?.[1] || null;
export const isTopic = (i) => !i.pull_request && /^題材:/.test(i.title);

// 1本の作りかけについて、することを決める
export function nextStep(w, now = Date.now()) {
  if (!w.exists) return 'リポジトリを作る（onboarding.md 手順0）→ PR #1 を作る';
  if (!w.pr) return w.pages ? '公開済み：Post-deploy check が緑なら Issue に公開先を書いて completed で閉じる（game-dev.md A 手順8 の一覧の PR も）' : 'PR #1 を作る（game-dev.md A 手順4〜6）';
  const days = (now - Date.parse(w.pr.updated_at)) / 864e5;
  const stalled = days >= STALL_DAYS ? `（${Math.floor(days)}日動きなし）` : '';
  return `PR #${w.pr.number} を進める${stalled}：shared-workflows を pull → sync-template → drift-check → 赤い検査を直す → 緑ならマージ（game-dev.md A 手順5〜7）`;
}

export async function collect(api) {
  const issues = [];
  for (let page = 1; page <= 5; page++) {
    const got = await api(`repos/${OWNER}/shared-workflows/issues?state=open&per_page=100&page=${page}`);
    issues.push(...got);
    if (got.length < 100) break;
  }
  const topics = issues.filter(isTopic).sort((a, b) => a.number - b.number);
  const wip = [];
  const queue = [];
  for (const i of topics) {
    const repo = repoOf(i.body);
    if (!repo) { queue.push({ number: i.number, title: i.title, url: i.html_url }); continue; }
    const r = await api(`repos/${OWNER}/${repo}`, { nullOn404: true });
    const prs = r ? await api(`repos/${OWNER}/${repo}/pulls?state=open&per_page=10`) : [];
    const pages = r ? Boolean(r.has_pages) : false;
    const w = { number: i.number, title: i.title, url: i.html_url, repo, exists: Boolean(r), pages, pr: prs.sort((a, b) => a.number - b.number)[0] || null };
    w.next = nextStep(w);
    wip.push(w);
  }
  return { wip, queue };
}

// 今日することを、する順に並べる
export function plan({ wip, queue }) {
  const out = [];
  for (const w of wip) out.push(`作りかけ #${w.number} ${w.repo}: ${w.next}`);
  if (wip.length < WIP_LIMIT && queue.length) out.push(`空きあり（${wip.length}/${WIP_LIMIT}）: 候補 #${queue[0].number}「${queue[0].title}」を始める（Issue の本文に repo: <名前> を足す）`);
  if (wip.length >= WIP_LIMIT) out.push(`空きなし（${wip.length}/${WIP_LIMIT}）: 新しい候補は始めない`);
  if (queue.length < QUEUE_MIN) out.push(`候補が ${queue.length} 本：出典のある新案を「題材:」Issue で ${QUEUE_MIN - queue.length} 本足す（game-dev.md A 手順1）`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const data = await collect(makeApi());
  if (process.argv.includes('--json')) console.log(JSON.stringify({ ...data, plan: plan(data) }, null, 2));
  else for (const line of plan(data)) console.log(line);
}
