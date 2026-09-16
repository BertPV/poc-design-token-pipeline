/**
 * 1. Conversion rules, checked against a fixed fixture (so real Figma changes never break tests).
 * 2. Structural checks on every real brand in dist/ (run `npm run build` first; CI does).
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBrand, brandFromFile } from '../config/build-brand.mjs';

const cssNames = (css) =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]);
const liferayTokens = (json) =>
  json.frontendTokenCategories.flatMap((c) => c.frontendTokenSets.flatMap((s) => s.frontendTokens));
const exists = (p) => access(p).then(() => true, () => false);

describe('conversion rules (fixture)', () => {
  let css, liferay;

  before(async () => {
    const out = await mkdtemp(join(tmpdir(), 'tokens-'));
    const brand = await buildBrand('test/fixtures/Test Brand.tokens.json', { outDir: out, verbosity: 'silent' });
    assert.equal(brand, 'test-brand');
    css = await readFile(join(out, 'css/test-brand.css'), 'utf8');
    liferay = JSON.parse(await readFile(join(out, 'liferay/test-brand/frontend-token-definition.json'), 'utf8'));
  });

  test('CSS is scoped to :root', () => assert.match(css, /^:root \{$/m));

  for (const line of [
    '--theme: "Test Brand";', // strings are quoted, Theme is lowercased
    '--color-primary-050: #FFFFFF;', // leading zero kept
    '--color-primary-500: #1A392F;', // hex from Figma, uppercased
    '--color-transparent: rgba(255, 255, 255, 0);', // alpha kept
    '--type-heading-font-family: "SKODA Next";',
    '--type-heading-font-weight: 700;', // unitless
    '--border-radius-large: 24px;', // numbers get px
    '--type-link-color: var(--color-primary-500);', // aliases become var()
    '--tabs-border-radius: var(--border-radius-large);',
    '--headernav-nav-dropdown-text: var(--type-link-color);', // spaces removed from group names
  ]) {
    test(`CSS contains ${line}`, () => assert.ok(css.includes(line), `missing: ${line}\n\n${css}`));
  }

  test('Liferay token definition matches the CSS', () => {
    const tokens = liferayTokens(liferay);
    assert.deepEqual(tokens.map((t) => `--${t.mappings[0].value}`).sort(), cssNames(css).sort());
    assert.deepEqual(tokens.find((t) => t.name === 'colorPrimary500'), {
      name: 'colorPrimary500',
      label: 'color-primary-500',
      defaultValue: '#1A392F',
      type: 'String',
      editorType: 'ColorPicker',
      mappings: [{ type: 'cssVariable', value: 'color-primary-500' }],
    });
    assert.equal(tokens.find((t) => t.name === 'typeLinkColor').defaultValue, '#1A392F'); // aliases resolved
    assert.equal(tokens.find((t) => t.name === 'tabsBorderRadius').editorType, 'Length');
  });

  test('a broken reference fails the build', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'tokens-'));
    const src = join(dir, 'Broken.tokens.json');
    await writeFile(src, JSON.stringify({ a: { $type: 'color', $value: '{does.not.exist}' } }));
    await assert.rejects(() => buildBrand(src, { outDir: join(dir, 'out'), verbosity: 'silent' }));
    assert.equal(await exists(join(dir, 'out')), false);
  });
});

describe('built brands (dist/)', async () => {
  const files = (await readdir('tokens')).filter((f) => f.endsWith('.tokens.json'));

  test('at least one brand is present', () => assert.ok(files.length > 0));

  for (const file of files) {
    const brand = brandFromFile(file);

    test(`${brand}: CSS and Liferay output contain the same tokens`, async () => {
      const css = await readFile(`dist/css/${brand}.css`, 'utf8');
      const liferay = JSON.parse(await readFile(`dist/liferay/${brand}/frontend-token-definition.json`, 'utf8'));
      assert.match(css, /^:root \{$/m);
      assert.deepEqual(
        liferayTokens(liferay).map((t) => `--${t.mappings[0].value}`).sort(),
        cssNames(css).sort(),
      );
    });

    // Guard for developers: a variable that production uses must not silently disappear.
    const referencePath = `reference/${brand}.production.css`;
    test(`${brand}: no production variables missing`, { skip: !(await exists(referencePath)) && 'no reference file' }, async () => {
      const generated = new Set(cssNames(await readFile(`dist/css/${brand}.css`, 'utf8')));
      const missing = cssNames(await readFile(referencePath, 'utf8')).filter((n) => !generated.has(n));
      assert.deepEqual(missing, [], `Removed from Figma but used in production: ${missing.join(', ')}`);
    });
  }
});
