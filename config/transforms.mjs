/**
 * Custom transforms that turn the native Figma variables export (DTCG JSON)
 * into the CSS values our production themes use.
 */

// Number tokens whose name matches one of these stay unitless (everything else gets "px").
export const UNITLESS = [/font-weight/, /line-height/, /opacity/, /z-index/];

// Colors with alpha below 1 are written as rgba(). Set to false to always use the hex value.
export const KEEP_ALPHA = true;

const isNumber = (token) => (token.$type ?? token.type) === 'number';
const isString = (token) => (token.$type ?? token.type) === 'string';
const isColor = (token) => (token.$type ?? token.type) === 'color';
const valueOf = (token) => token.$value ?? token.value;

/** Name: path joined with "-", lowercased, spaces removed ("header nav" -> "headernav"). */
export const nameTransform = {
  name: 'figma/kebab',
  type: 'name',
  transform: (token) =>
    token.path.map((part) => String(part).toLowerCase().replace(/\s+/g, '')).join('-'),
};

/** Figma color object {hex, alpha, components} -> "#RRGGBB" or "rgba(r, g, b, a)". */
export const colorTransform = {
  name: 'figma/color',
  type: 'value',
  transitive: true,
  filter: (token) => isColor(token) && typeof valueOf(token) === 'object',
  transform: (token) => {
    const { hex, alpha = 1, components } = valueOf(token);
    if (!KEEP_ALPHA || alpha >= 1) return hex.toUpperCase();
    const [r, g, b] = components.map((c) => Math.round(c * 255));
    return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`;
  },
};

/** Number -> "24px", unless the token name is listed in UNITLESS. */
export const pxTransform = {
  name: 'figma/px',
  type: 'value',
  transitive: true,
  filter: (token) => isNumber(token) && typeof valueOf(token) === 'number',
  transform: (token) => {
    const name = token.path.join('-');
    return UNITLESS.some((re) => re.test(name)) ? valueOf(token) : `${valueOf(token)}px`;
  },
};

/** String -> quoted CSS string ("Skoda", "SKODA Next"). */
export const quoteTransform = {
  name: 'figma/quote',
  type: 'value',
  transitive: true,
  filter: (token) => isString(token) && typeof valueOf(token) === 'string',
  transform: (token) => `"${valueOf(token).replace(/"/g, '\\"')}"`,
};

export const transforms = [nameTransform, colorTransform, pxTransform, quoteTransform];

export const cssTransformGroup = {
  name: 'figma/css',
  transforms: transforms.map((t) => t.name),
};

export function registerTransforms(StyleDictionary) {
  for (const t of transforms) StyleDictionary.registerTransform(t);
  StyleDictionary.registerTransformGroup(cssTransformGroup);
}
