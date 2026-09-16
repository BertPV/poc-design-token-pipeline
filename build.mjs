/**
 * Builds every brand export in tokens/ (e.g. tokens/Skoda.tokens.json -> dist/css/skoda.css).
 */
import { readdir, rm } from 'node:fs/promises';
import { buildBrand, brandFromFile, SUFFIX } from './config/build-brand.mjs';

const TOKENS_DIR = 'tokens';

const files = (await readdir(TOKENS_DIR)).filter((f) => f.endsWith(SUFFIX)).sort();
if (files.length === 0) {
  console.error(`No *${SUFFIX} files found in ${TOKENS_DIR}/`);
  process.exit(1);
}

const brands = files.map(brandFromFile);
const duplicates = brands.filter((b, i) => brands.indexOf(b) !== i);
if (duplicates.length) {
  console.error(`Two token files map to the same brand name: ${[...new Set(duplicates)].join(', ')}`);
  process.exit(1);
}

await rm('dist', { recursive: true, force: true });

for (const file of files) {
  console.log(`\nBuilding brand "${brandFromFile(file)}" from ${TOKENS_DIR}/${file}`);
  await buildBrand(`${TOKENS_DIR}/${file}`);
}

console.log(`\nBuilt ${files.length} brand(s): ${brands.join(', ')}`);
