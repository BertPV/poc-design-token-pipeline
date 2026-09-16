/**
 * Output platforms. Every brand (tokens/<Brand>.tokens.json) is built with each platform below.
 * To add an output (SCSS, JS, iOS, ...), add a platform here.
 */
export function platformsFor(brand, outDir = 'dist') {
  return {
    css: {
      transformGroup: 'figma/css',
      buildPath: `${outDir}/css/`,
      files: [
        {
          destination: `${brand}.css`,
          format: 'css/variables',
          options: { outputReferences: true, selector: ':root' },
        },
      ],
    },
    liferay: {
      transformGroup: 'figma/css',
      buildPath: `${outDir}/liferay/${brand}/`,
      files: [
        {
          destination: 'frontend-token-definition.json',
          format: 'liferay/frontend-token-definition',
        },
      ],
    },
  };
}
