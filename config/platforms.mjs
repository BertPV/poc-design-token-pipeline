/**
 * Output platforms. Every mode (tokens/<Mode>.tokens.json) is built with each platform below.
 * To add an output (SCSS, JS, iOS, ...), add a platform here.
 */
export function platformsFor(mode) {
  return {
    css: {
      transformGroup: 'figma/css',
      buildPath: 'dist/css/',
      files: [
        {
          destination: `${mode}.css`,
          format: 'css/variables',
          options: { outputReferences: true, selector: ':root' },
        },
      ],
    },
    liferay: {
      transformGroup: 'figma/css',
      buildPath: `dist/liferay/${mode}/`,
      files: [
        {
          destination: 'frontend-token-definition.json',
          format: 'liferay/frontend-token-definition',
        },
      ],
    },
  };
}
