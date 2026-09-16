/**
 * Regression checks for the generated output. Run `npm run build` first (CI does).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import StyleDictionary from 'style-dictionary';
import { registerTransforms } from '../config/transforms.mjs';

const css = await readFile('dist/css/skoda.css', 'utf8');
const liferay = JSON.parse(await readFile('dist/liferay/skoda/frontend-token-definition.json', 'utf8'));

test('CSS is scoped to :root', () => {
  assert.match(css, /^:root \{$/m);
});

test('CSS contains the expected variable formats', () => {
  for (const line of [
    '--color-primary-500: #1A392F;',
    '--color-primary-050: #FFFFFF;',
    '--type-link-color: var(--color-primary-500);',
    '--border-radius-large: 24px;',
    '--button-padding-horizontal-small: 16px;',
    '--type-heading-font-weight: 700;',
    '--theme: "Skoda";',
    '--type-base-font-family: "SKODA Next";',
    '--tabs-border-radius: var(--border-radius-large);',
    '--headernav-nav-dropdown-text: var(--color-primary-500);',
  ]) {
    assert.ok(css.includes(line), `missing: ${line}`);
  }
});

test('every production variable is generated', async () => {
  const names = (s) => new Set([...s.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  const reference = names(await readFile('reference/skoda.production.css', 'utf8'));
  const generated = names(css);
  const missing = [...reference].filter((n) => !generated.has(n));
  assert.deepEqual(missing, []);
});

test('Liferay token definition maps every token to its CSS variable', () => {
  const tokens = liferay.frontendTokenCategories.flatMap((c) => c.frontendTokenSets.flatMap((s) => s.frontendTokens));
  const cssCount = [...css.matchAll(/^\s*--[\w-]+:/gm)].length;
  assert.equal(tokens.length, cssCount);

  const primary = tokens.find((t) => t.name === 'colorPrimary500');
  assert.deepEqual(primary, {
    name: 'colorPrimary500',
    label: 'color-primary-500',
    defaultValue: '#1A392F',
    type: 'String',
    editorType: 'ColorPicker',
    mappings: [{ type: 'cssVariable', value: 'color-primary-500' }],
  });
  // Aliases get their resolved value as default
  assert.equal(tokens.find((t) => t.name === 'typeLinkColor').defaultValue, '#1A392F');
  assert.equal(tokens.find((t) => t.name === 'buttonBorderRadius').editorType, 'Length');
});

test('a broken reference fails the build', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sd-'));
  const src = join(dir, 'Broken.tokens.json');
  await writeFile(src, JSON.stringify({ a: { $type: 'color', $value: '{does.not.exist}' } }));
  const sd = new StyleDictionary({
    source: [src],
    usesDtcg: true,
    log: { warnings: 'error', verbosity: 'silent' },
    platforms: { css: { transforms: ['figma/kebab'], buildPath: join(dir, 'out/'), files: [{ destination: 'x.css', format: 'css/variables' }] } },
  });
  registerTransforms(StyleDictionary);
  await assert.rejects(() => sd.buildAllPlatforms());
  assert.ok(!(await readdir(dir)).includes('out'));
});
