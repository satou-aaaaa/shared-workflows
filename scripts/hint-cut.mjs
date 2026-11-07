// ヒント2の cutOf が「まちがいの数で消す選び肢を変える」形かを見る（drift-check の hint:cut-moves と、その検査 check-hint-cut.mjs が使う）
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
