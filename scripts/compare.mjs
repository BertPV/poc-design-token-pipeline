/**
 * Compares generated CSS with the production baseline and prints a report.
 * Informational only: always exits 0. Writes Markdown to $GITHUB_STEP_SUMMARY when running in Actions.
 *
 * Usage: node scripts/compare.mjs [generated.css] [reference.css]
 */
import { readFile, appendFile } from 'node:fs/promises';

const [generatedPath = 'dist/css/skoda.css', referencePath = 'reference/skoda.production.css'] =
  process.argv.slice(2);

const parse = (css) =>
  new Map(
    [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(
      ([, name, value]) => [name, value.trim()],
    ),
  );

const normalize = (v) => v.replace(/\s+/g, ' ').toUpperCase();

const generated = parse(await readFile(generatedPath, 'utf8'));
const reference = parse(await readFile(referencePath, 'utf8'));

const missing = [...reference.keys()].filter((k) => !generated.has(k));
const extra = [...generated.keys()].filter((k) => !reference.has(k));
const changed = [...reference.keys()]
  .filter((k) => generated.has(k) && normalize(generated.get(k)) !== normalize(reference.get(k)))
  .map((k) => [k, reference.get(k), generated.get(k)]);

const lines = [
  `## Token comparison: \`${generatedPath}\` vs \`${referencePath}\``,
  '',
  `${generated.size} generated · ${reference.size} in reference · ${missing.length} missing · ${extra.length} new · ${changed.length} changed`,
  '',
];
if (missing.length) lines.push('### Missing (in production, not in Figma)', ...missing.map((k) => `- \`${k}\``), '');
if (extra.length) lines.push('### New (in Figma, not in production)', ...extra.map((k) => `- \`${k}\``), '');
if (changed.length) {
  lines.push('### Changed values', '', '| Variable | Production | Figma |', '|---|---|---|');
  lines.push(...changed.map(([k, a, b]) => `| \`${k}\` | \`${a}\` | \`${b}\` |`), '');
}
if (!missing.length && !extra.length && !changed.length) lines.push('No differences. 🎉');

const report = lines.join('\n');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report + '\n');
