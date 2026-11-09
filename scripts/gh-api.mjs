// 全リポジトリを読む定期の検査（週次まとめ・成績表・次にやること・ずれの検査）が使う、GitHub の API の共通の口（Claude は使わない）。
// きっかけ: 2026-11-09 リポジトリが88本・1週間のマージが1,064件（前の週の7倍）になり、1本ずつ順に読む Weekly summary と Scorecard が
// 時間切れで止まって Issue が出なかった（incidents/2026-11-09-weekly-jobs-timeout.md）。
// ここでそろえること:
//   - 1回の読み取りに時間の上限（TIMEOUT_MS）。1つの応答待ちでジョブ全体を止めない
//   - 同時に読む数を少しに絞る（pool）。GitHub は「並べずに順に読む」を勧めるが（Best practices for using the REST API
//     「Avoid concurrent requests」）、二次の制限は「同時100まで・1分900点まで」なので、4本ずつ・1秒に12回までに抑える
//   - 予算（BUDGET_SEC 秒・API_MAX 回）。超えそうになったら残りを読まずに「確かめられなかった」に回し、Issue は必ず出す
//   - 最後に使った時間と回数を出す（usage）。予算の WARN_RATE% を超えたら警告。リポジトリが増えて時間切れが近いことを先に知らせる
// GITHUB_TOKEN の回数は「1つのリポジトリにつき1時間1,000回」（Rate limits for the REST API）。同じ時間帯に動く定期の検査で分け合う。

const started = Date.now();
const BUDGET_SEC = Number(process.env.BUDGET_SEC || 0); // 0 なら時間の予算なし（手元で動かすとき）
const API_MAX = Number(process.env.API_MAX || 0); // 0 なら回数の予算なし
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 30000);
export const WARN_RATE = 60;
const MIN_GAP_MS = 1000 / 12;

let calls = 0;
let lastStart = 0;
let remaining = null; // GitHub が返す x-ratelimit-remaining（core）

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 予算の残り。読む前に確かめ、足りなければ投げる（呼ぶ側はそのリポジトリを「確かめられなかった」に入れる）
export class OverBudget extends Error {}
export function checkBudget(reserve = 0.1) {
  if (BUDGET_SEC && (Date.now() - started) / 1000 > BUDGET_SEC * (1 - reserve)) throw new OverBudget('時間の予算を使い切った');
  if (API_MAX && calls >= API_MAX) throw new OverBudget('API の回数の予算を使い切った');
  if (remaining !== null && remaining < 30) throw new OverBudget(`GitHub の回数の残りが ${remaining}`);
}

// opts.raw: 中身をそのまま（ファイル）・opts.nullOn404: 無ければ null・opts.full: { body, headers } で返す
// opts.graphql: { query, variables } を GraphQL で読む（REST とは別の回数の枠。1回で多くを読めるので、PR ごとに読むものに使う）
export function makeApi(token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '') {
  return async function api(path, opts = {}) {
    for (let attempt = 0; ; attempt++) {
      checkBudget(0.05);
      const now = Date.now();
      const at = Math.max(now, lastStart + MIN_GAP_MS);
      lastStart = at;
      if (at > now) await sleep(at - now);
      calls++;
      let res;
      try {
        res = await fetch(opts.graphql ? 'https://api.github.com/graphql' : path.startsWith('https://') ? path : `https://api.github.com/${path}`, {
          method: opts.graphql ? 'POST' : 'GET',
          ...(opts.graphql ? { body: JSON.stringify(opts.graphql) } : {}),
          headers: {
            Accept: opts.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (e) {
        if (attempt < 2) { await sleep(2000 * (attempt + 1)); continue; }
        throw new Error(`${e.name === 'TimeoutError' ? `${TIMEOUT_MS / 1000}秒で応答なし` : e.message} ${path}`);
      }
      const left = res.headers.get('x-ratelimit-remaining');
      if (left !== null && res.headers.get('x-ratelimit-resource') === 'core') remaining = Number(left);
      if (res.status === 404 && opts.nullOn404) return null;
      // 二次の制限（403/429 と retry-after）と GitHub 側の一時的な失敗は、少し待って2回まで読み直す
      const retryAfter = Number(res.headers.get('retry-after') || 0);
      if ((res.status >= 500 || ((res.status === 403 || res.status === 429) && retryAfter)) && attempt < 2) {
        await sleep(Math.min(retryAfter || 2 * (attempt + 1), 60) * 1000);
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${path}`);
      const body = opts.raw ? await res.text() : await res.json();
      if (opts.graphql && body.errors?.length) throw new Error(`GraphQL: ${body.errors[0].message}`);
      return opts.full ? { body, headers: res.headers } : body;
    }
  };
}

// 次のページの URL（Link ヘッダーの rel="next"）
export const nextLink = (headers) => (headers.get('link') || '').match(/<([^>]+)>;\s*rel="next"/)?.[1] || null;

// items を n 本ずつ並べて fn に通す。結果は items と同じ順
export async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k], k);
    }
  }));
  return out;
}

// 使った時間と回数を1行で。予算の WARN_RATE% を超えたら warn が true（呼ぶ側が Issue の本文と ::warning:: に出す）
export function usage(name) {
  const sec = Math.round((Date.now() - started) / 1000);
  const rates = [];
  if (BUDGET_SEC) rates.push(Math.round((sec * 100) / BUDGET_SEC));
  if (API_MAX) rates.push(Math.round((calls * 100) / API_MAX));
  const rate = rates.length ? Math.max(...rates) : 0;
  const text = `${name}: ${sec}秒${BUDGET_SEC ? `（予算 ${BUDGET_SEC}秒）` : ''}・API ${calls}回${API_MAX ? `（予算 ${API_MAX}回）` : ''}${remaining !== null ? `・GitHub の残り ${remaining}回` : ''}`;
  return { sec, calls, rate, warn: rate > WARN_RATE, text };
}

// 標準エラーにかかった時間を出し、予算の WARN_RATE% を超えたら ::warning:: も出す（ジョブのログと注記に残る）
export function reportUsage(name) {
  const u = usage(name);
  console.error(u.warn ? `::warning title=時間切れが近い::${u.text}。予算の ${u.rate}%（${WARN_RATE}% 超）。リポジトリが増えた分、読む数を減らすか並べる（incidents/2026-11-09-weekly-jobs-timeout.md）` : `::notice::${u.text}`);
  return u;
}

// 検索（search/issues）で全リポジトリをまとめて読む。リポジトリごとに読むより回数がずっと少ない（検索は1分30回の別の枠）。
// 1,000件を超えると読み切れないので投げる（呼ぶ側は「確かめられなかった」にする）。返す各件に repo（名前）を足す
export async function searchIssues(api, q) {
  const items = [];
  for (let page = 1; page <= 10; page++) {
    const j = await api(`search/issues?q=${encodeURIComponent(q)}&per_page=100&page=${page}`);
    if (j.incomplete_results) throw new Error(`検索が途中で切れた ${q}`);
    for (const it of j.items) items.push({ ...it, repo: it.repository_url.split('/').pop() });
    if (items.length >= j.total_count || j.items.length < 100) return items;
  }
  throw new Error(`検索が1,000件を超えた ${q}`);
}
