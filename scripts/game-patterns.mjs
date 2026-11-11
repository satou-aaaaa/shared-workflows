// ゲームの index.html の作りの見分け（drift-check と、その検査 check-game-patterns.mjs が使う）
// cutMoves：ヒント2の cutOf が「まちがいの数で消す選び肢を変える」形か
// まちがい（cur.wrong）を除いてから「最後の1つ以外」を消すと、しぼったあとにまちがいを選んだとき、消した選び肢が戻る（incidents/2026-11-07-hint-cut-comes-back.md）

// コメントを除く（文字列の中の https:// は残す）
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`\\])\/\/[^\n]*/g, '$1');

// cutOf の定義を、複数行でも終わり（かっこの外の ; か、function の閉じ }）まで取り出す
export function cutOfBody(page) {
  const s = stripComments(page);
  const m = /(?:const|let|var)\s+cutOf\s*=|function\s+cutOf\s*\(/.exec(s);
  if (!m) return null;
  let depth = 0, seen = false;
  for (let i = m.index; i < s.length; i++) {
    const c = s[i];
    if ('([{'.includes(c)) { depth++; seen = true; }
    else if (')]}'.includes(c)) { depth--; if (depth === 0 && seen && c === '}' && m[0].startsWith('function')) return s.slice(m.index, i + 1); }
    else if (c === ';' && depth === 0) return s.slice(m.index, i + 1);
  }
  return s.slice(m.index);
}

export function cutMoves(page) {
  const body = cutOfBody(page);
  if (!body) return false;
  const skipsWrong = /wrong\s*\.\s*(?:includes|indexOf|has)\s*\(/.test(body);
  const keepsLast = /\.length\s*(?:-\s*1|>\s*1)|\.slice\s*\(\s*0\s*,\s*-\s*1\s*\)/.test(body);
  return skipsWrong && keepsLast;
}

// leftFixed：ヒント2のあとの「のこりは2つです」が、いま押せる選び肢の数でなく決まった数か（drift-check の hint:left-fixed）
// 最後のまちがいを先に選んでからヒントを2回使うと、押せるのは正解だけなのに「のこりは2つ」と出た（2026-11-07 bousai-handan #3・okane-kihon #6 の CodeRabbit）
export function leftFixed(page) {
  if (!cutOfBody(page)) return false;
  return /のこりは\s*[2２二]\s*つ/.test(stripComments(page));
}

// 星の表示（class="stars"）が role="img" を持たない、または取れなかった星も ★ で色だけで分ける形かを見る（drift-check の stars:role）
// span に role が無いと aria-label が読まれないことがあり、★ の色だけでは色の見分けにくい人に星の数が伝わらない（2026-11-07 食中毒よぼうの CodeRabbit）
export function starsBare(page) {
  const s = stripComments(page);
  const tags = s.match(/<span\b[^>]*\bclass=["'`]stars["'`][^>]*>/g) || [];
  const noRole = tags.some((t) => !/\brole=["'`]img["'`]/.test(t));
  const offStar = /class=["'`]off["'`][^>]*>\$\{\s*["'`]★["'`]\.repeat/.test(s);
  return noRole || offStar;
}

// urlIncludes：URL を文字のまま includes・indexOf で探している（drift-check の qa:url-includes）
// CodeQL の js/incomplete-url-substring-sanitization が high の警告にし、PR の CodeQL が赤のまま止まる。手元の検査では分からない
// （2026-11-07 hyoshiki-yomi #1 が2日止まった。incidents/2026-11-11-codeql-url-includes-in-qa.md）。出典の定義を正規表現で見る
// ホスト名だけ（"laws.e-gov.go.jp"）を探す形も同じ警告になる。ファイル名（"gen.js"）は出さないよう、よくある最後の名前（TLD）で終わるものだけを見る
const HOST = /[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|edu|gov|jp|io|co|info|dev|app|me|uk|us)(?:[\/:?#][^"'`]*)?/;
const URL_ARG = new RegExp(`\\.(?:includes|indexOf|lastIndexOf)\\(\\s*(["'\`])(?:https?:\\/\\/|${HOST.source}\\1)`);
export function urlIncludes(src) {
  return URL_ARG.test(stripComments(src));
}
