/**
 * Compares each brand's generated CSS with its production baseline (reference/<brand>.production.css)
 * and prints a report. Informational only: always exits 0.
 * Writes Markdown to $GITHUB_STEP_SUMMARY when running in GitHub Actions.
 */
import { readFile, readdir, appendFile } from 'node:fs/promises';

const parse = (css) =>
  new Map(
    [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(
      ([, name, value]) => [name, value.trim()],
    ),
  );

const normalize = (v) => v.replace(/\s+/g, ' ').toUpperCase();

function compare(brand, generated, reference) {
  const missing = [...reference.keys()].filter((k) => !generated.has(k));
  const extra = [...generated.keys()].filter((k) => !reference.has(k));
  const changed = [...reference.keys()]
    .filter((k) => generated.has(k) && normalize(generated.get(k)) !== normalize(reference.get(k)))
    .map((k) => [k, reference.get(k), generated.get(k)]);

  const lines = [
    `## ${brand}`,
    '',
    `${generated.size} generated · ${reference.size} in production · ${missing.length} missing · ${extra.length} new · ${changed.length} changed`,
    '',
  ];
  if (missing.length) lines.push('### Missing (in production, not in Figma)', ...missing.map((k) => `- \`${k}\``), '');
  if (extra.length) lines.push('### New (in Figma, not in production)', ...extra.map((k) => `- \`${k}\``), '');
  if (changed.length) {
    lines.push('### Changed values', '', '| Variable | Production | Figma |', '|---|---|---|');
    lines.push(...changed.map(([k, a, b]) => `| \`${k}\` | \`${a}\` | \`${b}\` |`), '');
  }
  if (!missing.length && !extra.length && !changed.length) lines.push('No differences. 🎉', '');
  return lines.join('\n');
}

const brands = (await readdir('dist/css')).filter((f) => f.endsWith('.css')).map((f) => f.slice(0, -4)).sort();
const references = new Set(await readdir('reference').catch(() => []));

const sections = ['# Token comparison with production', ''];
for (const brand of brands) {
  const refFile = `${brand}.production.css`;
  if (!references.has(refFile)) {
    sections.push(`## ${brand}`, '', `No \`reference/${refFile}\`, so there is nothing to compare against.`, '');
    continue;
  }
  const generated = parse(await readFile(`dist/css/${brand}.css`, 'utf8'));
  const reference = parse(await readFile(`reference/${refFile}`, 'utf8'));
  sections.push(compare(brand, generated, reference));
}

const report = sections.join('\n');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report + '\n');
