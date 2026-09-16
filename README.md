# Skoda design tokens

Figma variables → GitHub → [Style Dictionary](https://styledictionary.com) → CSS variables + Liferay Style Book tokens.

```
Figma "Export variables"          GitHub Actions (on every upload)                 Developers
─────────────────────────   →   ─────────────────────────────────────────   →   ─────────────────────────────
tokens/Skoda.tokens.json         build → test → compare → publish                 npm package (GitHub Packages)
                                                                                 GitHub Release: skoda.css
                                                                                 Liferay frontend-token-definition.json
```

## For designers: update the tokens

1. In Figma, export the variables collection. Each mode is saved as `<Mode>.tokens.json`.
2. On GitHub, open the **`tokens/`** folder and choose **Add file → Upload files**.
3. Drop the exported file in. Use the same file name to update a brand, or a new name to add a brand.
4. Write a short message (for example "Update secondary green") and click **Commit changes**.
5. Open the **Actions** tab and wait for the green check (about 1 minute).
   - The run summary lists every token that differs from the production baseline.
   - A red cross means something is wrong in the tokens, such as a broken alias. Click the run to see the error; nothing was published.

## For developers: use the tokens

### Option A: direct download (no npm)

Each build creates a [GitHub Release](../../releases) that contains:

| File | Use |
|---|---|
| `skoda.css` | Drop-in replacement for the hand-written `:root { --… }` token file |
| `skoda.frontend-token-definition.json` | Liferay Style Books (see below) |

This link always points to the newest build (public repos only):
`https://github.com/<owner>/<repo>/releases/latest/download/skoda.css`

### Option B: npm (GitHub Packages)

1. Create a GitHub personal access token (classic) with the `read:packages` scope.
2. Add a `.npmrc` next to your `package.json`:

   ```
   @<owner>:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

3. Install the package and import the CSS:

   ```bash
   npm install @<owner>/skoda-tokens
   ```

   ```scss
   @import '@<owner>/skoda-tokens/css/skoda.css';
   ```

   The package also contains `liferay/skoda/frontend-token-definition.json`.

## Liferay

### Now: replace the token CSS
The theme currently defines tokens in its own CSS/SCSS file. Replace that file with the generated `skoda.css`, either copied from a Release or imported from the npm package in the theme build. The variable names are identical, so no component CSS has to change.

### Next step: Style Books
`frontend-token-definition.json` turns every token into an editable field under **Design → Style Books**, with the Figma values as defaults. Colors use a color picker and pixel values use a length editor.

- **Theme CSS client extension** (DXP 2024.Q2+ / GA120+), in `client-extension.yaml`:
  ```yaml
  skoda-theme-css:
    type: themeCSS
    name: Skoda Theme CSS
    clayURL: css/clay.css
    mainURL: css/main.css
    frontendTokenDefinitionJSON: src/frontend-token-definition.json
  ```
- **Classic theme:** place the file at `src/WEB-INF/frontend-token-definition.json`.

Style Books write the chosen values as CSS variables, so the theme CSS must use `var(--…)` everywhere. It already does.
Docs: [Frontend token definitions](https://learn.liferay.com/w/dxp/sites/site-appearance/style-books/developer-guide/frontend-token-definitions) · [Theme CSS client extension](https://learn.liferay.com/w/dxp/development/customizing-liferays-look-and-feel/using-a-theme-css-client-extension/theme-css-yaml-configuration-reference)

## How the conversion works

| Figma export | CSS output | Where |
|---|---|---|
| Color object `{ hex, alpha }` | `#1A392F`, or `rgba(…)` if alpha < 1 | `config/transforms.mjs` → `figma/color` |
| Alias `{color.primary.500}` | `var(--color-primary-500)` | `outputReferences` in `config/platforms.mjs` |
| Number `24` | `24px` (font-weight etc. stay unitless) | `figma/px`, `UNITLESS` list |
| String `Skoda` | `"Skoda"` | `figma/quote` |
| Group `header nav` | `--headernav-…` | `figma/kebab` |

Every `tokens/*.tokens.json` is built separately: `tokens/Skoda.tokens.json` becomes `dist/css/skoda.css` and `dist/liferay/skoda/…`.
To add an output format such as SCSS or JS, add a platform in `config/platforms.mjs`.

The build **fails** (and nothing is published) on broken aliases, name collisions or other Style Dictionary warnings.

## Local development

```bash
npm install
npm run build     # generates dist/
npm test          # regression checks
npm run compare   # diff against reference/skoda.production.css
```

Versions are set automatically in CI as `1.0.<run number>`.
