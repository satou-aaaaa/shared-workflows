function cal(ym) {
  Core.screens.mark("cal"); // 「戻る」でホームへ（sync-template の migrateBack）
  const s = load(), k = todayKey(), late = lateDays(s, k), st = streak(s.days);
  if (!ym || ym > ymOf(k)) ym = ymOf(k);
  if (ym < ymOf(EPOCH)) ym = ymOf(EPOCH);
  const y = +ym.slice(0, 4), m = +ym.slice(5, 7), dow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), n = new Date(Date.UTC(y, m, 0)).getUTCDate(), cells = [];
  for (let i = 0; i < dow; i++) cells.push(`<span class="c off"></span>`);
  for (let d = 1; d <= n; d++) {
    const key = `${ym}-${String(d).padStart(2, "0")}`, rec = s.days[key], ar = s.adays[key], hd = s.hdays[key] ? `<span class="hd">上</span>` : "";
    if (rec) { const lv = lvOf(rec); cells.push(`<span class="c p${lv}" data-k="${key}" role="img" aria-label="${m}月${d}日 星${lv}つ${hd ? "・上級も" : ""}">${d}<i>${"★".repeat(lv)}</i>${hd}</span>`); }
    else if (ar) cells.push(`<span class="c late" data-k="${key}" role="img" aria-label="${m}月${d}日 あとから遊んだ">${d}<i>↺</i></span>`);
    else if (late.includes(key)) { const go = s.runs[runKey("a", key)]; cells.push(`<button class="c miss" data-k="${key}" aria-label="${m}月${d}日をあとから遊ぶ${go ? "（続きから）" : ""}">${d}<i>${go ? "続き" : "▶"}</i></button>`); }
    else cells.push(`<span class="c${key === k ? " today" : ""}" data-k="${key}">${d}</span>`);
  }
  const pd = playedDays(s);
  app.innerHTML = `<header><button class="icon" id="back" aria-label="ホームへ">←</button><h1>カレンダー${pd ? `<small>合わせて ${pd}日${st >= 1 ? `・続けて ${st}日` : ""}</small>` : ""}</h1></header>
    <div class="calnav"><button class="sub" id="prev" aria-label="前の月"${ym <= ymOf(EPOCH) ? " disabled" : ""}>‹</button><b>${y}年${m}月</b><button class="sub" id="next" aria-label="次の月"${ym >= ymOf(k) ? " disabled" : ""}>›</button></div>
    <div class="cal">${["日", "月", "火", "水", "木", "金", "土"].map((w) => `<span class="wd">${w}</span>`).join("")}${cells.join("")}</div>
    <div class="legend"><span><em style="background:var(--ai)"></em>★★★ まちがいなし</span><span><em style="background:#d5e1f3"></em>★★ 1〜2回</span><span>↺ あとから</span><span>上 上級</span></div>
    ${late.length ? `<p class="note">▶ の日は、その日の5問をあとから遊べます（過去7日まで・続けた日には数えません）。</p>` : ""}
    ${footer()}`;
  $("back").onclick = home; $("prev").onclick = () => cal(ymAdd(ym, -1)); $("next").onclick = () => cal(ymAdd(ym, 1));
  document.querySelectorAll(".cal .miss").forEach((b) => (b.onclick = () => (lateDays(load()).includes(b.dataset.k) ? startRun("a", b.dataset.k) : cal(ym))));
  bindFooter(); toTop();
}
