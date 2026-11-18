// game-lint.mjs の Selftest 用の見本（正しい作り）。UMD の形で名前を置く
(function (root) {
  const api = { hello: (n) => `こんにちは、${n}` };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.GREET = api;
})(this);
