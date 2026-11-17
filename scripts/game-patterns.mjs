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

// waitCounted：回数で区切るくり返し（for (let k = 0; k < N; k++)）の中に、待つだけの回 { await p.waitForTimeout(…); continue; } があり、時間（Date.now()）で区切っていない所の行番号（drift-check の qa:wait-count）
// 2026-11-11 yarikuri-shotengai #4：店主の番を待つ回まで80回に数え、遅い CI で増築できる日まで進まずに落ちた（incidents/2026-11-11-qa-loop-counts-waits.md）
export function waitCounted(qa) {
  const out = [], re = /for \(let (\w+) = 0; \1 < [^;]+; \1\+\+\) \{/g;
  let m;
  while ((m = re.exec(qa))) {
    const body = qa.slice(m.index, m.index + 600), end = body.indexOf('\n}'), b = end > 0 ? body.slice(0, end) : body;
    if (/\{\s*await \w+\.waitForTimeout\(\d+\);\s*continue;\s*\}/.test(b) && !/Date\.now\(\)/.test(b)) out.push(qa.slice(0, m.index).split('\n').length);
  }
  return out;
}
// depthGaps：深さの部品（depth.js）を写したのに、つなぎが足りない所（drift-check の depth:*）
// depth:early：Depth.mark を解き終えたときだけ呼び、まちがえてから降りた問題が復習に入らない（2026-11-11 dema-tashikame #8 の CodeRabbit）
// depth:early-same：途中保存 keep が、同じ問題か（same）を確かめる前に early() で復習へ入れる（古いタブが復習の段を戻す）
// depth:resume：ホームの「復習」ボタンが、日の来た数（Depth.count）だけで出て、途中の復習（runs.r）に戻れない（まちがえると日が先へずれて0になる）
// depth:step-sync：keep が別のタブの2段目（was.step）を合わせても、画面を2段目（askWhy）にしない（3つとも 2026-11-11 gurafu-minuki #7 の CodeRabbit）
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
  else if ((p.match(/Depth\.mark\s*\(/g) || []).length < 2) out.push(['depth:early', 'index.html が Depth.mark を問題を終えたときにしか呼んでいない（まちがえた・ヒントを使ったその時にも呼ぶ。とことんで降りる・閉じると復習に入らない。incidents/2026-11-11-depth-mark-on-quit.md）']);
  const keep = cutOfBody(page, 'keep');
  if (keep && /\bearly\s*\(\s*\)/.test(keep)) {
    const e = keep.search(/\bearly\s*\(\s*\)/), sm = keep.search(/\bsame\s*\(/);
    if (sm < 0 || e < sm) out.push(['depth:early-same', 'index.html の keep が、保存した回が同じ問題か（same）を確かめる前に early() を呼んでいる（別のタブで先に進んだ古い画面が、復習の段を最初に戻す。same のあとで ok を立て、save のあとに if (ok) early()。incidents/2026-11-11-depth-review-resume.md）']);
    if (/\bwas\.step\b/.test(keep) && !/\baskWhy\s*\(/.test(keep)) out.push(['depth:step-sync', 'index.html の keep が別のタブの2段目（was.step）を合わせても、画面を2段目（askWhy）にしない（読み直すまで答えられない。incidents/2026-11-11-depth-review-resume.md）']);
  }
  if (/id=["']go-r["']/.test(p) && !p.split('\n').some((l) => /id=["']go-r["']/.test(l) && /\bruns\.r\b/.test(l))) out.push(['depth:resume', 'ホームの「復習」ボタンが日の来た数（Depth.count）だけで出る（復習の途中でまちがえると日が先へずれて0になり、途中の復習 runs.r に戻れない。同じ行で runs.r の続きを先に見る。incidents/2026-11-11-depth-review-resume.md）']);
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

// playerBugs：遊ぶ人が困る作りのうち、index.html だけで見分けられるもの（drift-check と、ゲームの PR の QA の check-game-new.mjs が使う）。返すのは [id, 説明] の並び
// 2026-11-17：drift-check が週次まとめに出し続けても、直されないまま新作に写って16本に広がっていた（incidents/2026-11-17-known-game-bugs-spread.md）。
// 週に1回知らせるだけでは止まらないので、ゲームの PR で「新しく持ち込んだ」ときに落とす（もとからあるものは週次まとめで直す）
export function playerBugs(page) {
  const s = stripComments(page), out = [];
  // 保存に失敗しても黙っている（incidents/2026-11-07-save-failure-silent.md）
  if (/catch\s*\(e\)\s*\{\s*mem\s*=\s*j;\s*\}/.test(s)) out.push(['save:silent', 'index.html の save が、保存に失敗しても黙っている（開き直すと記録が消える。保存できないあいだは帯 #savewarn を出したままにし、QA に検査を足す。routines/game-dev.md「共通の形」の記録）']);
  // とことんで正解した直後に「ここで降りる」が効かない（2026-11-07 kyuyo-meisai #1 の CodeRabbit）
  if (/if\s*\(\s*cur\s*&&\s*cur\.done\s*\)\s*return;\s*finish\(\)/.test(s)) out.push(['endless:stuck', 'index.html の「ここで降りる」が正解した直後に効かない（if (cur && cur.done) return; finish(); の行。kyuyo-meisai 1bebfdc の直し方）']);
  // 遊ぶ前の鍵（satou さん 2026-11-06「好きなだけ遊んでほしい」）。実績の 🔒 は鍵ではない。コメントの中の「押すと開く」は見ない
  if (page.includes('🎫')) out.push(['free:ticket', 'index.html にチケット🎫がある（遊ぶ量を縛らない。とことんは、まちがえても続き「ここで降りる」で終わる形に。routines/game-dev.md「好きなだけ遊べるように」）']);
  const gate = s.match(/[^<>`'"\n]{0,24}(?:と|たら)開く|🔒 [^<>`'"\n]{2,40}/);
  if (gate) out.push(['free:gate', `index.html に遊ぶ前の鍵がある「${gate[0].trim()}」（どのモードも最初から遊べるように。routines/game-dev.md「好きなだけ遊べるように」）`]);
  // 遊び方の「見た」は「わかった」ですぐ残し、dialog の cancel と close でも残す（incidents/2026-11-07-howto-esc-not-saved.md）
  const ok = s.match(/\$\("howto-ok"\)\.onclick\s*=\s*\(\)\s*=>\s*\{[^\n]*/);
  if (ok) {
    const onClose = /\$\("howto"\)\.addEventListener\("close"[^\n]*tut\s*=\s*true/.test(s);
    const onCancel = /\$\("howto"\)\.addEventListener\("cancel"[^\n]*tut\s*=\s*true/.test(s);
    const atOnce = /^\$\("howto-ok"\)\.onclick\s*=\s*\(\)\s*=>\s*\{\s*save\(/.test(ok[0]);
    if (!onClose) out.push(['howto:close', 'index.html が遊び方の「見た」を dialog の close で残していない（Esc で閉じた人に毎回出る。$("howto").addEventListener("close", () => { if (!load().tut) save(…) })。routines/game-dev.md「共通の形」の遊び方）']);
    else if (!onCancel) out.push(['howto:close', 'index.html が遊び方の「見た」を dialog の cancel（Esc を押したその場）で残していない（close の知らせは遅れて届き、Esc の直後に読み直すとまた出る。$("howto").addEventListener("cancel", …)。routines/game-dev.md「共通の形」の遊び方）']);
    else if (!atOnce) out.push(['howto:close', 'index.html の「わかった」が「見た」をすぐ残していない（close の知らせは遅れて届き、押した直後に読み直すとまた出る。onclick の最初で save(…)。routines/game-dev.md「共通の形」の遊び方）']);
  }
  // 知らせ（.toast）が画面の下に出ているあいだ、その下のボタン（次へ・ここで降りる）を押しても効かない（2026-11-17 全ゲームの点検で、29本中27本）
  const toastCss = (s.replace(/\/\*[\s\S]*?\*\//g, '').match(/\.toast\s*\{[^}]*\}/) || [''])[0];
  if (/position\s*:\s*(?:fixed|absolute)/.test(toastCss) && !/pointer-events\s*:\s*none/.test(toastCss)) out.push(['toast:blocks', 'index.html の .toast に pointer-events:none が無い（知らせが出ている2秒ほど、その下のボタンを押しても効かない。.toast{pointer-events:none;…}。routines/game-dev-detail.md「共通の形」の知らせ）']);
  if (cutMoves(page)) out.push(['hint:cut-moves', 'index.html の cutOf が、まちがいの数で消す選び肢を変える（しぼったあとにまちがいを選ぶと、消した選び肢が戻る。正解でない選び肢のうち最後の1つ以外を消す形にし、QA に検査を足す。routines/game-dev.md「共通の形」のヒント）']);
  if (leftFixed(page)) out.push(['hint:left-fixed', 'index.html のヒント2の「のこりは2つです」が決まった数（先に最後のまちがいを選んでいると押せるのは正解だけ。いま押せる選び肢の数を出す。routines/game-dev.md「共通の形」のヒント）']);
  if (starsBare(page)) out.push(['stars:role', 'index.html の星の表示（class="stars"）に role="img" が無いか、取れなかった星も ★ で色だけで分けている（<span class="stars" role="img" aria-label="星Nつ"> にし、取れなかった星は ☆。routines/game-dev.md「共通の形」の星）']);
  return out;
}
