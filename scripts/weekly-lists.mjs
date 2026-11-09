// 週次まとめ（weekly-summary.yml）の「開いたままの PR」と「ci-failure の Issue」を、検索でまとめて読んで JSON で出す（Claude は使わない）。
// 使い方: GH_TOKEN=... OWNER=satou-aaaaa node scripts/weekly-lists.mjs  → { prs: [...], fails: [...], errors: [...] }
// 前はリポジトリごとに2回ずつ gh api で読み、88本で176回かかっていた（2026-11-09 時間切れ。incidents/2026-11-09-weekly-jobs-timeout.md）。
// 読めなかったときも止まらず、errors に書く（まとめの本文に「確かめられなかった」と出る）。
import { makeApi, searchIssues, reportUsage } from './gh-api.mjs';

const OWNER = process.env.OWNER || 'satou-aaaaa';
const api = makeApi();
const out = { prs: [], fails: [], errors: [] };
try {
  out.prs = (await searchIssues(api, `user:${OWNER} is:pr is:open archived:false`, 'pr'))
    .map((p) => ({ repo: p.repo, number: p.number, draft: Boolean(p.draft), user: p.user.login, created_at: p.created_at, title: p.title }));
} catch (e) { out.errors.push(`開いた PR（${e.message}）`); }
try {
  out.fails = (await searchIssues(api, `user:${OWNER} is:issue is:open label:ci-failure archived:false`, 'issue'))
    .sort((a, b) => a.number - b.number)
    .map((i) => ({ repo: i.repo, number: i.number, title: i.title }));
} catch (e) { out.errors.push(`ci-failure の Issue（${e.message}）`); }
console.log(JSON.stringify(out));
reportUsage('週次まとめの一覧');
