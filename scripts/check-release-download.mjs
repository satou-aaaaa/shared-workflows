// GitHub の releases/download を curl で取る段には、トークン付きの gh release download での取り直しを必ず書かせる（check.sh と CI の Lint が呼ぶ。Claude は使わない）。
// 名前なし（トークン無し）の取得は、GitHub の側で 403 と断られることがあり、curl の --retry 3 回でも通らない。
// 2026-11-22 昔話ならべの Secret scan が gitleaks の取得の 403 で赤になり、ci-failure の Issue が立った
// （incidents/2026-11-23-secret-scan-gitleaks-download-403.md）。
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export function findMissing(text) {
  const bad = [];
  if (/gh release download/.test(text)) return bad;
  text.split('\n').forEach((l, i) => {
    if (/curl\b.*github\.com\/[^/\s]+\/[^/\s]+\/releases\/download\//.test(l)) bad.push(i + 1);
  });
  return bad;
}

if (process.argv.includes('--self-test')) {
  const ok = 'run: |\n  curl -sSfL -o a https://github.com/o/r/releases/download/v1/a.tgz || gh release download v1 --repo o/r\n';
  const ng = 'run: |\n  curl -sSfL -o a https://github.com/o/r/releases/download/v1/a.tgz\n';
  if (findMissing(ok).length || findMissing(ng).join() !== '2') { console.error('✗ check-release-download の自己検査が通らない'); process.exit(1); }
  console.log('✓ check-release-download 自己検査');
  process.exit(0);
}

let n = 0;
for (const dir of ['.github/workflows', 'template/.github/workflows']) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((x) => /\.ya?ml$/.test(x))) {
    const p = path.join(dir, f);
    for (const line of findMissing(readFileSync(p, 'utf8'))) {
      console.error(`✗ ${p}:${line} releases/download を curl だけで取っている。失敗したら GH_TOKEN 付きの gh release download で取り直す段を書く（incidents/2026-11-23-secret-scan-gitleaks-download-403.md）`);
      n++;
    }
  }
}
if (n) process.exit(1);
console.log('✓ releases/download の取り直し');
