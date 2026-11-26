function achView() {
  Core.screens.mark("achView"); // 「戻る」でホームへ（sync-template の migrateBack）
  const s = load(), t = tally(s), got = achGot(s);
  app.innerHTML = `
    <header><button class="icon" id="back" aria-label="ホームへ">←</button><h1>実績<small>${got.length}/${ACH.length}</small></h1></header>
    ${AGRP.map((g, gi) => `<p class="agrp">${g}</p><div class="alist">${ACH.filter((a) => a[3] === gi).map((a) => { const ok = got.includes(a[0]), n = Math.min(t[a[4]], a[5]); return `<div class="ach${ok ? " got" : ""}" data-id="${a[0]}"><span class="ic" aria-hidden="true">🏅</span><b>${ok ? "✓ " : ""}${a[1]}</b><span class="pg">${ok ? "達成" : `${n}/${a[5]}`}</span><small>${a[2]}</small>${ok ? "" : `<span class="bar"><i style="width:${Math.round((n / a[5]) * 100)}%"></i></span>`}</div>`; }).join("")}</div>`).join("")}
    ${footer()}`;
  $("back").onclick = home; bindFooter(); toTop();
}
