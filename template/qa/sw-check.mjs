// ひな形（shared-workflows template/qa/sw-check.mjs）。ゲームでは直さず写す。
// sw.js を Node の中で動かし、返事の仕方を確かめる（ブラウザ無し）。qa/run.mjs から checkSwStall(sw の中身) を呼ぶ。
// 時間は100分の1で進める（4秒＝40ms・60秒＝600ms）。見るもの:
//   stalled: 本文の途中で通信が止まっても、4秒ほどで保存したものへ切り替わる（2026-11-07 CodeRabbit）
//   normal:  少し遅い通信（1秒）はネットの返事のまま（amida-haitatsu #14 の CodeRabbit）
//   trickle: 本文が少しずつ（1秒ごとに）届くあいだは待ち、ネットの返事を返す（合計の時間で切らない。chikei-ate #2・pikuto-yomi #1）
//   nocache: 保存したものも無く通信も止まり、控えの検索まで止まっても、60秒で Response.error() を返す（sekai-jikoku #1・meirei-narabe #1）
import vm from "node:vm";

const S = 100; // 時間を縮める倍率

export async function checkSwStall(code) {
  const listeners = {};
  const cached = new Response("cached-page", { status: 200 });
  let mode = "stall";
  let store = "hit"; // hit: 保存がある / hang: 控えの検索が返らない
  const match = async () => (store === "hit" ? cached.clone() : new Promise(() => {}));
  const ctx = {
    self: { addEventListener: (t, f) => (listeners[t] = f), location: { origin: "https://x.test", href: "https://x.test/sw.js", toString: () => "https://x.test/sw.js" }, skipWaiting() {}, clients: { claim() {} } },
    caches: { match, open: async () => ({ match, put: async () => {}, keys: async () => [], addAll: async () => {} }), keys: async () => [], delete: async () => true },
    fetch: async () => {
      if (mode === "ok") { await new Promise((r) => setTimeout(r, 1000 / S)); return new Response("net-page", { status: 200 }); }
      if (mode === "trickle") {
        let n = 0;
        return new Response(new ReadableStream({
          pull(c) { return new Promise((r) => setTimeout(() => { if (n++ < 8) c.enqueue(new TextEncoder().encode("net-")); else { c.enqueue(new TextEncoder().encode("page")); c.close(); } r(); }, 1000 / S)); },
        }), { status: 200 });
      }
      // 見出しは届くが本文が終わらない返事
      return new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("half")); } }), { status: 200 });
    },
    setTimeout: (f, ms) => setTimeout(f, ms / S), clearTimeout, URL, Request, Response, Promise, Uint8Array, console,
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  const ask = () => new Promise((resolve) => {
    listeners.fetch({ request: { method: "GET", url: "https://x.test/index.html", mode: "navigate" }, waitUntil() {}, respondWith: (p) => p.then(resolve) });
  });
  const within = (ms, f) => Promise.race([ask().then(f), new Promise((r) => setTimeout(() => r("timeout"), ms / S))]);
  // 4秒で切り替わるなら40ms。10秒（100ms）を過ぎたら遅すぎる
  const stalled = await within(10000, (r) => r.text());
  mode = "ok";
  const normal = await within(30000, (r) => r.text());
  mode = "trickle";
  const trickle = await within(30000, (r) => r.text());
  mode = "stall"; store = "hang";
  const nocache = await within(75000, (r) => r.type);
  return { stalled, normal, trickle, nocache, ok: stalled === "cached-page" && normal === "net-page" && trickle === "net-net-net-net-net-net-net-net-page" && nocache === "error" };
}
