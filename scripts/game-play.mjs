#!/usr/bin/env node
// 学習ゲーム（ひな形の画面：開始ボタン #go-*・選び肢 .ch・次へ #next）を、決まったやり方で通しで遊ぶ（Claude は使わない）。
// 「中身を読まずに当たるか」を見る：長い順（long）・いつも A（first）・でたらめ（rand）で、初めの1回で当たった数を数える。
// でたらめより long・first がはっきり多く当たるなら、見ただけで当たる手がかりがある（routines/game-fun.md）。
// 使い方: node scripts/game-play.mjs <ゲームのフォルダ> <ボタンid（go-d・go-h・go-p）> <long|first|rand> [回数]
//   出力: [{ qs: 問題の数, tries: 押した数, first: 初めの1回で当たった数, sec: かかった秒, qtexts: 問いの頭 }]
//   ブラウザ: クラウドの会話では CHROMIUM_PATH=/opt/pw-browsers/chromium（ゲームの playwright の版とちがうとき）
// きっかけ: 2026-11-21 悪質商法みやぶりで、長い順に選ぶと今日の5件の8割が1回目で当たった（でたらめは2割）
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/");
const { chromium } = require("playwright");
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const [dir, btn, how = "rand", runs = "1"] = process.argv.slice(2);
const root = path.resolve(dir);
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split("?")[0])); if (f.endsWith("/")) f += "index.html"; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } const t = { ".js": "text/javascript", ".html": "text/html", ".json": "application/json", ".webmanifest": "application/json" }[path.extname(f)] || "application/octet-stream"; r.writeHead(200, { "content-type": t + "; charset=utf-8" }); r.end(d); }); }).listen(0);
const port = srv.address().port;
const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const out = [];
for (let k = 0; k < +runs; k++) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
  await p.click("#" + btn); await p.waitForTimeout(200);
  const t0 = Date.now(); let qs = 0, tries = 0, first = 0, seen = [];
  for (let step = 0; step < 400; step++) {
    const st = await p.evaluate(() => {
      const vis = (e) => e && e.offsetParent !== null;
      const nx = document.getElementById("next"); if (vis(nx)) return { next: true };
      const sure = [...document.querySelectorAll("button")].filter((x) => vis(x) && /自信/.test(x.textContent) && !x.disabled);
      const ch = [...document.querySelectorAll(".ch")].filter((x) => vis(x) && !x.disabled && !x.classList.contains("ng"));
      const q = document.getElementById("q")?.textContent || "";
      return { sure: sure.length, ch: ch.map((x) => ({ j: x.dataset.j, t: x.textContent.trim() })), q, all: document.querySelectorAll(".ch").length };
    });
    if (st.next) { await p.click("#next"); await p.waitForTimeout(80); continue; }
    if (!st.ch.length) break;
    const fresh = !seen.length || seen[seen.length - 1] !== st.q + st.all;
    if (fresh) { qs++; seen.push(st.q + st.all); }
    let c = st.ch;
    if (how === "long") c = [...c].sort((a, b2) => b2.t.length - a.t.length);
    else if (how === "rand") c = [...c].sort(() => Math.random() - 0.5);
    tries++;
    const before = await p.evaluate(() => document.querySelectorAll(".ch.ok").length);
    await p.click(`.ch[data-j="${c[0].j}"]`); await p.waitForTimeout(80);
    const after = await p.evaluate(() => document.querySelectorAll(".ch.ok").length + (document.getElementById("next") ? 1 : 0));
    if (fresh && after > before) first++;
  }
  out.push({ qs, tries, first, sec: Math.round((Date.now() - t0) / 1000), qtexts: seen.map((s) => s.slice(0, 30)) });
  await p.close();
}
await b.close(); srv.close();
console.log(JSON.stringify(out));
