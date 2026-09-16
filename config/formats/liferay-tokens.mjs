/**
 * Format: Liferay frontend-token-definition.json (Style Books).
 * https://learn.liferay.com/w/dxp/sites/site-appearance/style-books/developer-guide/frontend-token-definitions
 *
 * Grouping: first path segment = category, second segment = token set
 * (tokens that sit directly under a category go into a set named after the category).
 */

const camel = (parts) =>
  parts
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));

const kebab = (parts) =>
  parts.map((p) => String(p).toLowerCase().replace(/\s+/g, '')).join('-');

function editorTypeFor(token) {
  const type = token.$type ?? token.type;
  const value = String(token.$value ?? token.value);
  if (type === 'color') return 'ColorPicker';
  if (type === 'number' && value.endsWith('px')) return 'Length';
  return undefined;
}

export const liferayTokensFormat = {
  name: 'liferay/frontend-token-definition',
  format: ({ dictionary }) => {
    const categories = new Map();

    for (const token of dictionary.allTokens) {
      const [categoryKey, ...rest] = token.path;
      const setKey = rest.length > 1 ? rest[0] : categoryKey;

      if (!categories.has(categoryKey)) {
        categories.set(categoryKey, {
          name: camel([categoryKey]),
          label: kebab([categoryKey]),
          sets: new Map(),
        });
      }
      const category = categories.get(categoryKey);

      if (!category.sets.has(setKey)) {
        const setPath = setKey === categoryKey ? [categoryKey] : [categoryKey, setKey];
        category.sets.set(setKey, {
          name: camel(setPath),
          label: kebab(setPath),
          frontendTokens: [],
        });
      }

      const editorType = editorTypeFor(token);
      category.sets.get(setKey).frontendTokens.push({
        name: camel(token.path),
        label: token.name,
        defaultValue: String(token.$value ?? token.value),
        type: 'String',
        ...(editorType && { editorType }),
        mappings: [{ type: 'cssVariable', value: token.name }],
      });
    }

    const output = {
      frontendTokenCategories: [...categories.values()].map((c) => ({
        name: c.name,
        label: c.label,
        frontendTokenSets: [...c.sets.values()],
      })),
    };
    return JSON.stringify(output, null, 2) + '\n';
  },
};
