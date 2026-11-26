// game-core（index.html の core:begin〜core:end）の画面の動きを確かめる。各ゲームの qa/run.mjs から呼ぶ。
// 正：satou-aaaaa/shared-workflows の template/qa/core-check.mjs（ゲームでは直さない。sync-template で写す）
// 使い方:
//   import { checkCore } from "./core-check.mjs";
//   await checkCore({ browser, url, check, solve: async (page) => { …練習の1問を正解まで進めて「次へ」を押せる所まで… } });
//   solve を渡さないと、最後まで進める検査は飛ばす（はじめての案内を入れていないゲームは first: false）。
// 見ること:
//   - window.Core があり、版がある
//   - 「感想を送る」（a[data-feedback]）が共通の Googleフォームの事前入力リンクになる
//   - はじめて開くと「遊び方」の窓（dialog）でなく、練習の1問と吹き出しが出る。押す所を隠さない（スマホ幅とパソコン幅）
//   - 吹き出しのボタンは 44px 以上・名前がある・読み上げにも届く
//   - 「案内を閉じる」でも Esc でも消え、読み直しても二度と出ない（「見た」はその場で残る）
//   - solve で最後まで進めると吹き出しが消える
//   - （版5から）ページの上の右に「？ 遊び方」があり、押すと遊び方が開く・押す所を隠さない・44px 以上
//   - （版5から）このページの script のエラーで不具合の帯が出て、「不具合を知らせる」は押したときだけ開く感想フォームのリンク。自動では何も送らない
// 止まったときに、どの段で何を待っていたかが1行目に出るようにする（ゲームの QA は1行目だけを残す。2026-11-22）
export async function checkCore(o) {
  const st = { at: "はじめ" };
  try { return await coreSteps(o, st); } catch (e) { throw new Error(`[${st.at}] ${String(e.message).split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 6).join(" / ")}`); }
}
async function coreSteps({ browser, url, check, solve, first = true, widths = [360, 1280] }, st) {
  const mark = (t) => { st.at = t; };
  const open = async (w) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 640 : 800 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(300);
    return { ctx, p, errs };
  };
  const overlap = (p) => p.evaluate(() => {
    const c = document.getElementById("core-coach"), t = document.querySelector(".core-coach-on");
    if (!c || !t || c.hidden) return null;
    const a = c.getBoundingClientRect(), r = t.getBoundingClientRect();
    return Math.max(0, Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top)) > 1 && !(a.right <= r.left || a.left >= r.right);
  });
  {
    mark("はじめての案内");
    const { ctx, p, errs } = await open(widths[0]);
    check("game-core：window.Core があり版がある", await p.evaluate(() => !!(window.Core && window.Core.v >= 1)));
    // はじめての案内を入れていないゲーム（first: false）は、ここからの吹き出しの検査だけを飛ばす（下の「？ 遊び方」・不具合の帯は見る）
    if (!first) await ctx.close();
    else {
    check("はじめて開くと、遊び方の窓でなく練習の1問と吹き出しが出る", await p.locator("dialog[open]").count() === 0 && await p.locator("#core-coach:not([hidden])").count() === 1 && (await p.textContent("#core-coach-t")).length > 5);
    check("吹き出しに名前（aria-label）がある・ボタンは 44px 以上", await p.evaluate(() => { const c = document.getElementById("core-coach"); return !!c.getAttribute("aria-label") && [...c.querySelectorAll("button:not([hidden])")].every((b) => { const r = b.getBoundingClientRect(); return Math.round(r.height) >= 44 && Math.round(r.width) >= 44; }); }));
    await p.waitForTimeout(100);
    check("吹き出しの文を読み上げにも届ける", (await p.evaluate(() => (document.getElementById("core-live") || {}).textContent || "")) === await p.textContent("#core-coach-t"));
    check("吹き出しは「見た」をその場で残す（開いてすぐ閉じても二度と出ない）", await p.evaluate(() => Object.keys(localStorage).some((k) => { try { return JSON.parse(localStorage.getItem(k)).tut === true; } catch { return false; } })));
    const bad = [];
    for (const w of widths) {
      const o = await open(w);
      for (let n = 0; n < 6 && await o.p.locator("#core-coach").count(); n++) {
        await o.p.waitForTimeout(900);
        if (await overlap(o.p)) bad.push(`${w}px の${n + 1}つ目`);
        const go = o.p.locator("#core-coach .core-coach-go:not([hidden])");
        if (await go.count()) await go.click(); else break;
      }
      await o.ctx.close();
    }
    check("吹き出しが、押す所・読む所（印を付けた所）に重ならない", bad.length === 0, bad.join("・"));
    await p.click("#core-coach .core-coach-skip"); await p.waitForTimeout(100);
    check("「案内を閉じる」で消え、印も残らない", await p.locator("#core-coach").count() === 0 && await p.locator(".core-coach-on").count() === 0);
    await p.reload(); await p.waitForTimeout(300);
    check("とじたあと読み直しても、吹き出しも遊び方の窓も出ない", await p.locator("#core-coach").count() === 0 && await p.locator("dialog[open]").count() === 0);
    check("はじめての案内でエラーが出ない", errs.length === 0, errs.join(" / "));
    await ctx.close();
    }
  }
  if (first) {
    mark("Esc");
    const { ctx, p } = await open(widths[0]);
    await p.keyboard.press("Escape"); await p.waitForTimeout(100);
    check("Esc でも吹き出しが消える", await p.locator("#core-coach").count() === 0);
    await ctx.close();
  }
  if (first) {
    mark("感想のリンク");
    const { ctx, p } = await open(widths[0]);
      // 「感想を送る」（data-feedback）は、押したその時に全ゲーム共通の Googleフォームの事前入力リンクになる（GitHub のアカウントが無くても送れる）
      await p.evaluate(() => { if (window.Core && Core.coach && Core.coach.active()) Core.coach.leave(); });
      const fb = await p.evaluate(() => {
        const a = document.querySelector("a[data-feedback]");
        if (!a) return null;
        const stop = (e) => e.preventDefault();
        document.addEventListener("click", stop);
        a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        document.removeEventListener("click", stop);
        return { href: a.href, target: a.target };
      });
      check("「感想を送る」が全ゲーム共通の Googleフォーム（ゲーム名と付属情報を事前入力）を新しいタブで開く", !!fb && /^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+\/viewform\?usp=pp_url&/.test(fb.href) && /entry\.443796210=[^&]+/.test(fb.href) && /entry\.1094269478=/.test(fb.href) && fb.target === "_blank", fb ? fb.href.slice(0, 120) : "data-feedback のリンクが無い");
    await ctx.close();
  }
  if (await (async () => { const { ctx, p } = await open(widths[0]); const v = await p.evaluate(() => (window.Core && Core.v) || 0); await ctx.close(); return v >= 5; })()) {
    mark("？遊び方");
    for (const w of widths) {
      const { ctx, p, errs } = await open(w);
      await p.evaluate(() => { if (window.Core && Core.coach && Core.coach.active()) Core.coach.leave(); });
      await p.waitForTimeout(200);
      const r = await p.evaluate(() => {
        const b = document.getElementById("core-help");
        if (!b) return null;
        const a = b.getBoundingClientRect();
        // 「？」の下に、ほかの押せる所が重なっていない（ページの上に場所を空けて置く。routines/ui-rules.md U1）
        const under = [...document.querySelectorAll("a[href],button,input,select,textarea,summary,[role=button],[tabindex]")].filter((e) => e !== b && !b.contains(e) && e.getClientRects().length && !e.closest("dialog:not([open]),[hidden]")).filter((e) => { const x = e.getBoundingClientRect(); return x.width > 0 && !(x.right <= a.left || x.left >= a.right || x.bottom <= a.top || x.top >= a.bottom); }).map((e) => (e.id ? "#" + e.id : e.tagName.toLowerCase()) + "「" + (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 12) + "」");
        return { w: a.width, h: a.height, right: innerWidth - a.right, top: a.top + scrollY, label: b.getAttribute("aria-label"), under };
      });
      check(`「？ 遊び方」がページの上の右にある・名前がある・44px 以上（${w}px）`, !!r && r.w >= 44 && r.h >= 44 && r.right <= 40 && r.top <= 12 && !!r.label, JSON.stringify(r));
      check(`「？ 遊び方」がほかの押せる所に重ならない（${w}px）`, !!r && r.under.length === 0, r ? r.under.join("・") : "");
      if (r && r.w > 0) {
        await p.click("#core-help"); await p.waitForTimeout(250);
        check(`「？ 遊び方」を押すと遊び方が開く（${w}px）`, await p.locator("dialog[open]").count() >= 1);
      }
      check(`「？ 遊び方」でエラーが出ない（${w}px）`, errs.length === 0, errs.join(" / "));
      await ctx.close();
    }
    mark("不具合の帯");
    const { ctx, p } = await open(widths[0]);
    const sent = [];
    p.on("request", (q) => { if (!q.url().startsWith("file:") && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(q.url()) && !/fonts\.(googleapis|gstatic)\.com/.test(q.url())) sent.push(q.url().slice(0, 60)); });
    await p.evaluate(() => { if (window.Core && Core.coach && Core.coach.active()) Core.coach.leave(); });
    check("エラーが無いあいだは不具合の帯を出さない", await p.locator("#core-err").count() === 0);
    await p.evaluate(() => setTimeout(() => { throw new Error("core-check のわざと"); }, 0));
    await p.waitForTimeout(300);
    const bar = await p.evaluate(() => { const d = document.getElementById("core-err"); if (!d) return null; const a = d.querySelector("a[data-feedback]"); return { role: d.getAttribute("role"), href: a ? a.href : "", btn: [...d.querySelectorAll("a,button")].every((b) => { const x = b.getBoundingClientRect(); return Math.round(x.height) >= 44 && Math.round(x.width) >= 44; }) }; });
    check("このページのエラーで不具合の帯が出る（role=alert・ボタンは 44px 以上）", !!bar && bar.role === "alert" && bar.btn, JSON.stringify(bar));
    check("「不具合を知らせる」は感想フォーム（不具合・最後のエラー入り）のリンク", !!bar && /^https:\/\/docs\.google\.com\/forms\//.test(bar.href) && [...new URL(bar.href).searchParams.values()].join("\n").includes("core-check のわざと"), bar ? bar.href.slice(0, 80) : "");
    check("不具合の帯を出しても、外へは何も送らない（押した人だけがフォームを開く）", sent.length === 0, sent.join(" / "));
    if (bar && await p.locator("#core-err button").isVisible()) { await p.click("#core-err button"); await p.waitForTimeout(100); }
    check("「閉じる」で不具合の帯が消える", !!bar && await p.locator("#core-err").count() === 0);
    await ctx.close();
  }
  if (solve) {
    mark("練習の1問を最後まで");
    const { ctx, p, errs } = await open(widths[0]);
    const go = p.locator("#core-coach .core-coach-go:not([hidden])");
    for (let n = 0; n < 3 && await go.count(); n++) { await go.click(); await p.waitForTimeout(100); }
    mark("練習の1問を解く（ゲームの solve）");
    await solve(p);
    mark("練習の1問を最後まで");
    const covered = [], stuck = [];
    for (let n = 0; n < 20 && await p.locator("#core-coach").count(); n++) {
      // 吹き出しが押す所を隠したままにならない（ページが動いたあと、古い場所に残っていた。2026-11-22）
      const clear = await p.waitForFunction(() => { const c = document.getElementById("core-coach"), t = document.querySelector(".core-coach-on"); if (!c || !t || c.hidden) return true; const a = c.getBoundingClientRect(), r = t.getBoundingClientRect(); return !(Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top) > 1 && !(a.right <= r.left || a.left >= r.right)); }, null, { timeout: 2000 }).then(() => true, () => false);
      if (!clear) covered.push(n + 1);
      mark(`練習の1問を最後まで（${n + 1}つ目の吹き出し）`);
      // 吹き出しは requestAnimationFrame で次の段へ移る。移る前の「押せなくなった所」（正解のあとで disabled になった選び肢）を押しにいくと、
      // Playwright はその要素が押せるようになるのを30秒待って止まる（2026-11-22 震度よみが GitHub の上でだけ止まった）。押せる所を指すまで待つ
      const ready = await p.waitForFunction(() => { const t = document.querySelector(".core-coach-on"); return !t || !(t.disabled || t.getAttribute("aria-disabled") === "true"); }, null, { timeout: 3000 }).then(() => true, () => false);
      if (!ready) { stuck.push(`${n + 1}つ目：${await p.evaluate(() => { const t = document.querySelector(".core-coach-on"); return t ? (t.id ? "#" + t.id : t.tagName.toLowerCase()) + "「" + (t.getAttribute("aria-label") || t.textContent || "").trim().slice(0, 20) + "」" : ""; })}`); break; }
      const g = p.locator("#core-coach .core-coach-go:not([hidden])");
      if (await g.count()) { await g.click(); } else { const t = p.locator(".core-coach-on").first(); if (!await t.count()) break; await t.click(); }
      await p.waitForTimeout(250);
    }
    check("練習の1問を進めるあいだ、吹き出しが押せない所（disabled）を3秒より長く指したままにしない", stuck.length === 0, stuck.join(","));
    check("練習の1問を進めるあいだ、吹き出しが押す所を2秒より長く隠さない", covered.length === 0, covered.join(","));
    check("練習の1問を最後まで進めると、吹き出しが消える", await p.locator("#core-coach").count() === 0 && await p.locator(".core-coach-on").count() === 0);
    check("練習の1問を最後まで進めてもエラーが出ない", errs.length === 0, errs.join(" / "));
    await ctx.close();
  }
}
