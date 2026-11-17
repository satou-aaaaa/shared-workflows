// template/qa/sw-check.mjs が、本文の途中で止まる返事で読み込み中のままになる sw.js を見分けるか（incidents/2026-11-07-sw-body-stall.md）
import { readFileSync } from 'node:fs';
import { checkSwStall } from '../template/qa/sw-check.mjs';
const read = (f) => readFileSync(new URL(`fixtures/${f}`, import.meta.url), 'utf8');
const good = await checkSwStall(readFileSync(new URL('../template/sw.js', import.meta.url), 'utf8'));
const old = await checkSwStall(read('sw-good.js'));
const bad = await checkSwStall(read('sw-stall.js'));
const slow = await checkSwStall(read('sw-slow.js'));
let ng = 0;
const check = (name, ok, info) => { console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ' ' + JSON.stringify(info)}`); if (!ok) ng++; };
check('ひな形の sw.js は、本文が止まると保存したものを返し・ふつうはネットの返事・少しずつ届けば待ち・控えも止まれば60秒で返す', good.ok, good);
check('前の直し（合計4秒で切り替え・控えの検索を待つ）は落ちる（少しずつ届く本文・控えの止まり）', !old.ok && old.stalled === 'cached-page', old);
// 写す道具が、ゲームの枠（CACHE・SHELL）を残し、二度写しても変わらない
const { makeSw, swRegion } = await import('./sync-template.mjs');
const oldSw = read('sw-good.js');
const once = makeSw(oldSw);
check('写す道具：古い sw.js の CACHE と SHELL を枠に入れて残す', once && swRegion(once) === swRegion(oldSw) && /const CACHE = /.test(swRegion(once)), swRegion(oldSw));
check('写す道具：二度写しても同じ', once && makeSw(once) === once);
// 枠の無い古い sw.js に CACHE・SHELL のほかの働き（国旗の FLAGS・文字の FONT_CACHE）があるときは写さない（incidents/2026-11-17-sw-migration-drops-extras.md）
const withFlags = oldSw.replace(/^(const SHELL\s*=[\s\S]*?\];.*)$/m, '$1\nconst FLAGS = ["./flags/jp.svg"];');
const withFont = oldSw.replace(/^(const CACHE\s*=.*)$/m, '$1\nconst FONT_CACHE = "game-fonts-v1";');
check('写す道具：古い sw.js に FLAGS があると写さない（消えるので）', withFlags !== oldSw && makeSw(withFlags) === null);
check('写す道具：古い sw.js に FONT_CACHE があると写さない（消えるので）', withFont !== oldSw && makeSw(withFont) === null);
check('写す道具：枠のある sw.js は、枠の外の定数があっても写す（枠の外はひな形のもの）', makeSw(once) === once);
// sw.js を写せないゲームには sw の検査も写さない（写すとひな形の sw.js を前にした検査が QA を落とす。2026-11-17 kokki-shuto）
{
  const { plan } = await import('./sync-template.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const g = mkdtempSync(`${tmpdir()}/swstuck-`);
  mkdirSync(`${g}/qa`);
  writeFileSync(`${g}/sw.js`, withFlags);
  writeFileSync(`${g}/qa/sw-check.mjs`, '// 古い検査\n');
  const paths = plan(g).map((x) => x.path);
  check('写す道具：sw.js を写せないときは qa/sw-check.mjs も写さない', paths.includes('sw.js') && !paths.includes('qa/sw-check.mjs'), paths);
  writeFileSync(`${g}/sw.js`, oldSw);
  check('写す道具：sw.js を写せるときは qa/sw-check.mjs も写す', plan(g).some((x) => x.path === 'qa/sw-check.mjs'));
  rmSync(g, { recursive: true, force: true });
}
check('前の sw.js（本文を読む前に切り替えを外す）は落ちる', !bad.ok && bad.stalled !== 'cached-page', bad);
check('切り替えが20秒の sw.js は落ちる（4秒を見る）', !slow.ok, slow);
if (ng) process.exit(1);
console.log('✓ sw.js の検査のひな形が通った');
