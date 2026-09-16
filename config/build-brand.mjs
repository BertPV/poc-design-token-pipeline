import { basename } from 'node:path';
import StyleDictionary from 'style-dictionary';
import { registerTransforms } from './transforms.mjs';
import { liferayTokensFormat } from './formats/liferay-tokens.mjs';
import { platformsFor } from './platforms.mjs';

export const SUFFIX = '.tokens.json';

registerTransforms(StyleDictionary);
StyleDictionary.registerFormat(liferayTokensFormat);

/** "Skoda.tokens.json" -> "skoda", "VW Commercial.tokens.json" -> "vw-commercial" */
export function brandFromFile(file) {
  return basename(file, SUFFIX).trim().toLowerCase().replace(/\s+/g, '-');
}

/** Builds one Figma mode export into <outDir>/css/<brand>.css and <outDir>/liferay/<brand>/. */
export async function buildBrand(sourcePath, { outDir = 'dist', verbosity = 'verbose' } = {}) {
  const brand = brandFromFile(sourcePath);
  const sd = new StyleDictionary({
    source: [sourcePath],
    usesDtcg: true,
    // Fail on broken references, name collisions, etc., so nothing broken gets published.
    log: { warnings: 'error', verbosity },
    platforms: platformsFor(brand, outDir),
  });
  await sd.buildAllPlatforms();
  return brand;
}
