// 部品（template/parts/）の検査。check.sh・Lint から呼ぶ。
// 見るもの: 部品が JavaScript として読める・決まった乱数が今までと同じ数を出す（日替わりの問題が全員・全ゲームで変わらない）・
//           migrateParts が1字も同じ関数にだけ印を付け、印を外すと元どおり・何度かけても同じ・形のちがう関数は触らない。
// きっかけ: incidents/2026-11-27-parts-hand-copied.md
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PARTS, partBody, partOld, migrateParts } from './sync-template.mjs';

const T = join(dirname(fileURLToPath(import.meta.url)), '..', 'template', 'parts');
const errors = [];
const ok = (name, cond) => { if (!cond) errors.push(name); };

for (const [kind, names] of Object.entries(PARTS)) for (const n of names) {
  const src = readFileSync(join(T, kind, `${n}.js`), 'utf8');
  let parsed = true;
  try { new Function(src); } catch (e) { parsed = false; }
  ok(`template/parts/${kind}/${n}.js が JavaScript として読める`, parsed);
  ok(`template/parts/${kind}/${n}.js が ${n} を決める`, new RegExp(`^(?:function\\s+${n}\\s*\\(|const\\s+${n}\\s*=)`).test(src));
  ok(`template/parts/${kind}/${n}.js に印（part:）が入っていない`, !/part:\w+:(begin|end)/.test(src));
}

// 決まった乱数：今までと同じ数を出す（変えると、その日の問題がゲームを開き直すたびに・人ごとに変わる）
{
  const src = PARTS.data.map((n) => partBody('data', n)).join('\n');
  const f = new Function(`${src}\nreturn { rng, seedOf, shuffle, pickN, ri };`)();
  const R = f.rng(f.seedOf('day2026-11-27'));
  ok('seedOf("day2026-11-27") が 2664552880', f.seedOf('day2026-11-27') === 2664552880);
  ok('rng が今までと同じ数を出す', [R(), R(), R()].map((x) => x.toFixed(12)).join(',') === '0.468376626726,0.134635089664,0.560757568339');
  ok('shuffle・pickN が今までと同じ並びを出す', JSON.stringify(f.shuffle(f.rng(42), [1, 2, 3, 4, 5, 6, 7])) === '[4,2,1,6,7,3,5]' && JSON.stringify(f.pickN(f.rng(7), ['a', 'b', 'c', 'd'], 2)) === '["c","b"]');
}

// migrateParts
{
  const data = ['(function () {', ...PARTS.data.map((n) => `  ${partBody('data', n)}`), '  const other = (x) => x;', '})();', ''].join('\n');
  const m = migrateParts(data, 'data');
  const strip = (t) => t.replace(/[ \t]*\/\/ part:\w+:(?:begin[^\n]*|end)\n?/g, '');
  ok('migrateParts：1字も同じ関数に印を付ける（字下げも残す）', PARTS.data.every((n) => m.includes(`  // part:${n}:begin`) && m.includes(`  // part:${n}:end`)));
  ok('migrateParts：印を外すと元どおり（中身は変えない）', strip(m) === data);
  ok('migrateParts：何度かけても同じ', migrateParts(m, 'data') === m);
  const changed = m.replace(/(\/\/ part:ri:begin[^\n]*\n)[^\n]*\n/, '$1  const ri = (R, a, b) => a;\n');
  ok('migrateParts：印のあいだはひな形に戻す', migrateParts(changed, 'data') === m);
  const odd = 'function rng(seed) { return () => 0.5; }\n';
  ok('migrateParts：形のちがう関数は触らない', migrateParts(odd, 'data') === odd);
  const inline = `const x = 1; ${partBody('data', 'ri')}\n`;
  ok('migrateParts：行の途中にあるものは触らない', migrateParts(inline, 'data') === inline);
  const idx = `<script>\n${PARTS.index.map((n) => partBody('index', n)).join('\n')}\n</script>\n`;
  const mi = migrateParts(idx, 'index');
  ok('migrateParts：index の部品（カレンダー・実績）にも印を付け、外すと元どおり', PARTS.index.every((n) => mi.includes(`// part:${n}:begin`)) && strip(mi) === idx && migrateParts(mi, 'index') === mi);
}

// 前の版（template/parts/<種類>/old/）：まだ印の無いゲームの前の版の写しにも印を付け、新しい版に替える（直したら届かなくなるのを防ぐ。2026-11-27 cal の「5問」）
for (const [kind, names] of Object.entries(PARTS)) for (const n of names) for (const old of partOld(kind, n)) {
  ok(`template/parts/${kind}/old/${n}.*.js が今の版とちがう（同じなら置かない）`, old !== partBody(kind, n));
  const t = `<script>\n${old}\n</script>\n`;
  const m = migrateParts(t, kind);
  ok(`migrateParts：${n} の前の版の写しに印を付け、今の版に替える`, m.includes(`// part:${n}:begin`) && m.includes(partBody(kind, n)) && !m.includes(old));
}
ok('カレンダーの案内は問題の数を決めつけない（ゲームごとに出題数がちがう。kawagoe-1day #1 の CodeRabbit）', !/その日の\d+問/.test(partBody('index', 'cal')));

if (errors.length) { for (const e of errors) console.error(`✗ ${e}`); process.exit(1); }
console.log('✓ 部品（template/parts/）');
