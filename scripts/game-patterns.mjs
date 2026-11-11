// ゲームの index.html の作りの見分け（drift-check と、その検査 check-game-patterns.mjs が使う）
// cutMoves：ヒント2の cutOf が「まちがいの数で消す選び肢を変える」形か
// まちがい（cur.wrong）を除いてから「最後の1つ以外」を消すと、しぼったあとにまちがいを選んだとき、消した選び肢が戻る（incidents/2026-11-07-hint-cut-comes-back.md）

// コメントを除く（文字列の中の https:// は残す）
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`\\])\/\/[^\n]*/g, '$1');

// cutOf の定義を、複数行でも終わり（かっこの外の ; か、function の閉じ }）まで取り出す
export function cutOfBody(page, name = 'cutOf') {
  const s = stripComments(page);
  const m = new RegExp(`(?:const|let|var)\\s+${name}\\s*=|function\\s+${name}\\s*\\(`).exec(s);
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

// depthGaps：深さの部品（depth.js）を写したのに、つなぎが足りない所（drift-check の depth:*）
// depth:hint2：2段目のヒント（cut2Of）が、もうまちがえた分け方（cur.w2）を除かずに消す（2026-11-11 kenko-minuki #7 の CodeRabbit）
// 新作は new-game.mjs で depth.js が写るので、つなぎ忘れるとボタンも復習も出ないまま公開される（routines/game-dev.md「1問を深くする」、2026-11-11）
// files：{ page: index.html, sw: sw.js, run: qa/run.mjs }（無いものは空文字）。返すのは [id, 説明] の並び
export function depthGaps({ page = '', sw = '', run = '' }) {
  const p = stripComments(page), out = [];
  const tag = /<script\b[^>]*\bsrc=["']depth\.js["'][^>]*>/.exec(p);
  const key = tag && (/\bdata-key=["']([^"']+)["']/.exec(tag[0]) || [])[1];
  if (!tag) out.push(['depth:script', 'index.html が depth.js を読んでいない（</head> の前、transfer.js の次に <script src="depth.js" data-game="<名前>" data-key="<名前>-depth">）']);
  else {
    const keys = ((/<script\b[^>]*\bsrc=["']transfer\.js["'][^>]*\bdata-keys=["']([^"']*)["']/.exec(p) || [])[1] || '').split(',').map((x) => x.trim());
    if (!key || !keys.includes(key)) out.push(['depth:keys', `引き継ぎ（transfer.js の data-keys）に復習の記録 ${key || '<名前>-depth'} が無い（機種変更で復習が消える）`]);
  }
  if (!/Depth\.setValid\s*\(/.test(p)) out.push(['depth:valid', 'index.html が Depth.setValid を呼んでいない（引き継ぎで入った鍵・消えた種類の鍵が復習に数えられる）']);
  if (!/Depth\.mark\s*\(/.test(p) || !/Depth\.due\s*\(/.test(p)) out.push(['depth:review', 'index.html が Depth.mark・Depth.due を呼んでいない（まちがえた問題が復習に戻らない）']);
  if (!/Depth\.sureHtml\s*\(/.test(p) || !/Depth\.judge\s*\(/.test(p)) out.push(['depth:sure', 'index.html が Depth.sureHtml・Depth.judge を呼んでいない（「🎯 自信あり？」が出ない）']);
  const shell = (stripComments(sw).match(/SHELL\s*=\s*\[([\s\S]*?)\]/) || [, ''])[1];
  if (sw && !/["']\.\/depth\.js["']/.test(shell)) out.push(['depth:sw', 'sw.js の SHELL に ./depth.js が無い（電波が無いと開かない）']);
  const cut2 = cutOfBody(page, 'cut2Of');
  if (cut2) {
    const used = [...cut2.matchAll(/\b([A-Za-z_$][\w$]*Of)\s*\(/g)].map((x) => x[1]).filter((n) => n !== 'cut2Of');
    const all = [cut2, ...used.map((n) => cutOfBody(page, n) || '')].join('\n');
    if (!/\bw2\b/.test(all)) out.push(['depth:hint2', 'index.html の cut2Of（2段目のヒントで消す分け方）が、もうまちがえた分け方（cur.w2）を除いていない（まちがえたあとにヒントを押すと★だけ減って何も消えない。incidents/2026-11-11-depth-hint2-no-cut.md）']);
  }
  if (!/checkDepth\s*\(/.test(stripComments(run))) out.push(['depth:run', 'qa/run.mjs が checkDepth を呼んでいない（template/qa/depth-check.mjs の検査が走らない）']);
  return out;
}
