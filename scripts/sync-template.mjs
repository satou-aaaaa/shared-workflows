// ひな形（template/）の共通部品を、ゲームのフォルダへ写す（Claude は使わない。どの AI でも人でも使える）。
// 使い方: node scripts/sync-template.mjs <ゲームのフォルダ> [...]          写す（ゲームごとの所は残す）
//         node scripts/sync-template.mjs --check <ゲームのフォルダ> [...]  写さずに、ひな形とちがう所を出す（ちがえば 1 で終わる）
// 写すもの（ゲームにすでにあるものだけ。無いものは足さない。足すのは routines/game-dev.md の手順で）:
//   transfer.js・qa/a11y.mjs・qa/transfer-check.mjs・qa/sw-check.mjs …… そのまま写す
//   index.html の <!-- a11y:begin -->〜<!-- a11y:end --> …… その間だけ写す
//   sw.js …… ひな形を写し、// game:begin〜// game:end の間（CACHE・SHELL）はゲームのものを残す。
//            まだ枠の無い古い sw.js からは const CACHE と const SHELL の行を拾って枠に入れる
//   scripts/setup.sh …… ひな形を写し、npm_dir= と next= の行はゲームのものを残す
// きっかけ: 2026-11-07 sw.js が28本で28通りになり、同じ直しを1本ずつ手で入れていた（incidents/2026-11-07-template-copies-drift.md）。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const T = join(dirname(fileURLToPath(import.meta.url)), '..', 'template');
const tpl = (p) => readFileSync(join(T, p), 'utf8');

const REGION = /\/\/ game:begin\n[\s\S]*?\/\/ game:end\n/;
const A11Y = /<!-- a11y:begin[\s\S]*?<!-- a11y:end -->/;

// sw.js のゲームの枠を取り出す（無ければ古い形から CACHE と SHELL の行を拾う）
export function swRegion(old) {
  const m = old.match(REGION);
  if (m) return m[0];
  const cache = old.match(/^const CACHE\s*=.*$/m);
  const shell = old.match(/^const SHELL\s*=[\s\S]*?\];.*$/m);
  if (!cache || !shell) return null;
  return `// game:begin\n${cache[0]}\n${shell[0]}\n// game:end\n`;
}

// ひな形の sw.js に、ゲームの枠を入れたもの
export function makeSw(old) {
  const region = swRegion(old);
  if (!region) return null;
  return tpl('sw.js').replace(REGION, () => region);
}

// ひな形の setup.sh に、ゲームの npm_dir= と next= を入れたもの
export function makeSetup(old) {
  let out = tpl('scripts/setup.sh');
  for (const key of ['npm_dir', 'next']) {
    const line = old.match(new RegExp(`^${key}=.*$`, 'm'));
    if (line) out = out.replace(new RegExp(`^${key}=.*$`, 'm'), () => line[0]);
  }
  return out;
}

// 1つのゲームについて、写したあとの中身を返す（ちがう所だけ）
export function plan(dir) {
  const has = (p) => existsSync(join(dir, p));
  const read = (p) => readFileSync(join(dir, p), 'utf8');
  const out = [];
  const want = (p, next, note) => { if (next !== null && read(p) !== next) out.push({ path: p, next, note }); };
  if (has('qa/run.mjs') && has('sw.js') && !read('qa/run.mjs').includes('checkSwStall')) out.push({ path: 'qa/run.mjs', next: null, note: 'checkSwStall を呼んでいない（import { checkSwStall } from "./sw-check.mjs" と、sw.js の中身で check を1行足す）' });
  for (const p of ['transfer.js', 'qa/a11y.mjs', 'qa/transfer-check.mjs', 'qa/sw-check.mjs']) if (has(p)) want(p, tpl(p));
  // sw.js があるのに sw の検査が無いゲームには足す（qa/run.mjs から呼ぶのは手で。下で知らせる）
  if (has('sw.js') && has('qa') && !has('qa/sw-check.mjs')) out.push({ path: 'qa/sw-check.mjs', next: tpl('qa/sw-check.mjs'), note: '足した。qa/run.mjs から checkSwStall を呼ぶ' });
  if (has('index.html')) {
    const html = read('index.html');
    const block = tpl('a11y/a11y.html').match(A11Y)[0];
    if (A11Y.test(html)) want('index.html', html.replace(A11Y, () => block), '見やすさの設定');
  }
  if (has('sw.js')) {
    const next = makeSw(read('sw.js'));
    if (next === null) out.push({ path: 'sw.js', next: null, note: 'const CACHE と const SHELL の行が見つからない（手で game:begin〜game:end の枠を作る）' });
    else want('sw.js', next);
  }
  if (has('scripts/setup.sh')) want('scripts/setup.sh', makeSetup(read('scripts/setup.sh')));
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const check = args[0] === '--check';
  const dirs = check ? args.slice(1) : args;
  if (!dirs.length) { console.error('使い方: node scripts/sync-template.mjs [--check] <ゲームのフォルダ> [...]'); process.exit(2); }
  let diff = 0;
  for (const dir of dirs) {
    const todo = plan(dir);
    if (!todo.length) { console.log(`✓ ${dir}: ひな形どおり`); continue; }
    for (const t of todo) {
      diff++;
      if (t.next === null) { console.log(`✗ ${dir}/${t.path}: ${t.note}`); continue; }
      if (check) console.log(`✗ ${dir}/${t.path}: ひな形とちがう${t.note ? `（${t.note}）` : ''}`);
      else { writeFileSync(join(dir, t.path), t.next); console.log(`→ ${dir}/${t.path} を写した${t.note ? `（${t.note}）` : ''}`); }
    }
  }
  if (check && diff) process.exit(1);
  if (!check && diff) console.log('写したあとは、ゲームで node qa/run.mjs を回す。sw.js の動きを大きく変えたときは CACHE の版を上げる');
}
