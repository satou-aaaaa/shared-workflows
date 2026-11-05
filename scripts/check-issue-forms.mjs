// Issue フォーム（template/ と自分の .github/ISSUE_TEMPLATE/*.yml）の形を見る。check.sh と CI の Lint が呼ぶ。
// GitHub の決まり：name・description・body が要る。name は他のひな形と重ねない。空の文字は不可
// （https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms）。
// 加えて、name が2字以下だとフォームが出ず白紙の Issue になった（2026-11-05 name: 感想。incidents/2026-11-05-feedback-form-not-shown.md）。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const MIN_NAME = 3;
// YAML を読む部品は使わない。上の段の「key: 値」だけを拾う
export function formProblems(text) {
  const top = (k) => { const m = text.match(new RegExp(`^${k}:[ \\t]*(.*)$`, 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : null; };
  const out = [];
  const name = top('name');
  if (!name) out.push('name が無いか空');
  else if ([...name].length < MIN_NAME) out.push(`name「${name}」が${MIN_NAME}字より短い（2字だとフォームが出ず白紙の Issue になる）`);
  if (!top('description')) out.push('description が無いか空');
  if (top('body') === null) out.push('body が無い');
  else if (!/^\s+-\s*type:\s*(?!markdown)\w+/m.test(text)) out.push('body に markdown 以外の項目が無い');
  if (/^---\s*$/m.test(text.split(/^body:/m)[0].replace(/^---\s*\n/, ''))) out.push('body の前に --- がある（Body cannot be empty になる）');
  return { name, problems: out };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let bad = 0;
  for (const dir of ['template/.github/ISSUE_TEMPLATE', '.github/ISSUE_TEMPLATE']) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => /\.ya?ml$/.test(x) && !/^config\.ya?ml$/.test(x))) {
      const { problems } = formProblems(readFileSync(join(dir, f), 'utf8'));
      for (const p of problems) { console.error(`✗ ${dir}/${f}: ${p}`); bad++; }
    }
  }
  if (bad) process.exit(1);
  console.log('✓ Issue フォームの形');
}
