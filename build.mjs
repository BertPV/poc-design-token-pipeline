/**
 * Builds every Figma mode export in tokens/ (e.g. tokens/Skoda.tokens.json -> dist/css/skoda.css).
 */
import { readdir, rm } from 'node:fs/promises';
import StyleDictionary from 'style-dictionary';
import { registerTransforms } from './config/transforms.mjs';
import { liferayTokensFormat } from './config/formats/liferay-tokens.mjs';
import { platformsFor } from './config/platforms.mjs';

const TOKENS_DIR = 'tokens';
const SUFFIX = '.tokens.json';

registerTransforms(StyleDictionary);
StyleDictionary.registerFormat(liferayTokensFormat);

const files = (await readdir(TOKENS_DIR)).filter((f) => f.endsWith(SUFFIX));
if (files.length === 0) {
  console.error(`No *${SUFFIX} files found in ${TOKENS_DIR}/`);
  process.exit(1);
}

await rm('dist', { recursive: true, force: true });

for (const file of files) {
  const mode = file.slice(0, -SUFFIX.length).toLowerCase().replace(/\s+/g, '-');
  console.log(`\nBuilding mode "${mode}" from ${TOKENS_DIR}/${file}`);

  const sd = new StyleDictionary({
    source: [`${TOKENS_DIR}/${file}`],
    usesDtcg: true,
    // Fail the pipeline on broken references, name collisions, etc.
    log: { warnings: 'error', verbosity: 'verbose' },
    platforms: platformsFor(mode),
  });
  await sd.buildAllPlatforms();
}
