// template/qa/sw-check.mjs が、本文の途中で止まる返事で読み込み中のままになる sw.js を見分けるか（incidents/2026-11-07-sw-body-stall.md）
import { readFileSync } from 'node:fs';
import { checkSwStall } from '../template/qa/sw-check.mjs';
const read = (f) => readFileSync(new URL(`fixtures/${f}`, import.meta.url), 'utf8');
const good = await checkSwStall(read('sw-good.js'));
const bad = await checkSwStall(read('sw-stall.js'));
let ng = 0;
const check = (name, ok, info) => { console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ' ' + JSON.stringify(info)}`); if (!ok) ng++; };
check('直した sw.js は本文が止まると保存したものを返し、ふつうはネットの返事', good.ok, good);
check('前の sw.js（本文を読む前に切り替えを外す）は落ちる', !bad.ok && bad.stalled !== 'cached-page', bad);
if (ng) process.exit(1);
console.log('✓ sw.js の検査のひな形が通った');
