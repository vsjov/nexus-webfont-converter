// Imports
// -----------------------------------------------------------------------------
// Internal
import { FONT_WEIGHT } from '../../config/constants.js'
import type { FontEntry } from '../../utils/build-font-entries.js'
import { GLYPHS, type GlyphKey } from './glyphs.js'

// Types
// -----------------------------------------------------------------------------
interface BuildHtmlOptions {
  familyName: string,
  dirName: string,
  entries: FontEntry[],
  glyphs?: GlyphKey[],
  licenseFile?: string | null,
}

// Functions
// -----------------------------------------------------------------------------
const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/**
 * Converts a GLYPHS key to a CSS class suffix (e.g. `latin_ext_a` ->
 * `latin-ext-a`)
 **/
const toCssClass = (key: string): string => key.replace(/_/g, '-')

/**
 * Builds an HTML preview page for a single font family.
 *
 * @param options - Configuration for the HTML preview page
 * @param options.familyName - Human-readable font family name (e.g. `DM Sans`)
 * @param options.dirName - Hyphenated directory name (e.g. `dm-sans`)
 * @param options.entries - Sorted list of font entries with weight and style
 * @param options.glyphs - Additional glyph sets to display (beyond the always-present sample, latin, digits, punctuation)
 * @param options.licenseFile - Optional license filename to link in the footer
 */
export const templateHtmlSamples = ({
  familyName,
  dirName,
  entries,
  glyphs = [],
  licenseFile = null,
}: BuildHtmlOptions): string => {
  const weightLabel = (weight: number): string => FONT_WEIGHT[weight] ?? `${weight}`

  const variantLabel = (weight: number, style: 'normal' | 'italic'): string => {
    if (weight === 400 && style === 'normal') return 'Regular'
    if (weight === 400 && style === 'italic') return 'Italic'

    return style === 'italic' ? `${weightLabel(weight)} Italic` : weightLabel(weight)
  }

  const variantSections = entries.map(({ weight, style }) => {
    const label = variantLabel(weight, style)
    const fontStyle = `font-family: '${escapeHtml(familyName)}'; font-weight: ${weight}; font-style: ${style};`

    const extraLines = glyphs.map(key =>
      `    <p class="variant__sample variant__sample--${toCssClass(key)}" style="${fontStyle}">${GLYPHS[key]}</p>`
    )

    return [
      `  <section class="variant">`,
      `    <h2 class="variant__label">${label} <span class="variant__meta">${weight} / ${style}</span></h2>`,
      `    <p class="variant__sample variant__sample--large" style="${fontStyle}">${GLYPHS.sample}</p>`,
      `    <p class="variant__sample variant__sample--small" style="${fontStyle}">${GLYPHS.sample}</p>`,
      `    <p class="variant__sample variant__sample--latin" style="${fontStyle}">${GLYPHS.latin}</p>`,
      `    <p class="variant__sample variant__sample--digits" style="${fontStyle}">${GLYPHS.digits}</p>`,
      `    <p class="variant__sample variant__sample--punctuation" style="${fontStyle}">${GLYPHS.punctuation}</p>`,
      ...extraLines,
      `  </section>`,
    ].join('\n')
  }).join('\n\n')

  return [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8">`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1.0">`,
    `  <title>${escapeHtml(familyName)} - Font Preview</title>`,
    `  <link rel="stylesheet" href="${escapeHtml(dirName)}.css">`,
    `  <style>`,
    `    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`,
    `    body { background: #fff; color: #111; font-family: sans-serif; padding: 2rem; }`,
    `    h1 { font-size: 1rem; font-weight: 400; color: #666; margin-bottom: 2rem; letter-spacing: 0.05em; text-transform: uppercase; }`,
    `    .variant { border-top: 1px solid #e5e5e5; padding: 2rem 0; }`,
    `    .variant__label { font-size: 0.75rem; font-weight: 600; color: #999; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 1rem; }`,
    `    .variant__meta { font-weight: 400; color: #bbb; }`,
    `    .variant__sample { line-height: 1.3; margin-bottom: 0.5rem; }`,
    `    .variant__sample--large { font-size: 2.5rem; }`,
    `    .variant__sample--small { font-size: 1rem; color: #444; margin-bottom: 1.5rem; }`,
    `    .variant__sample--latin { font-size: 1.25rem; color: #666; }`,
    `    .variant__sample--digits { font-size: 1.25rem; color: #666; }`,
    `    .variant__sample--punctuation { font-size: 1rem; color: #999; }`,
    ...glyphs.map(key =>
      `    .variant__sample--${toCssClass(key)} { font-size: 1rem; color: #999; }`
    ),
    `    footer { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e5e5e5; font-size: 0.75rem; color: #aaa; }`,
    `    footer a { color: #888; text-decoration: underline; }`,
    `    footer a:hover { color: #444; }`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <h1>${escapeHtml(familyName)}</h1>`,
    ``,
    variantSections,
    ...(licenseFile
      ? [
          `  <footer>`,
          `    <a href="${escapeHtml(licenseFile)}"><b>License:</b> ${escapeHtml(licenseFile)}</a>`,
          `  </footer>`,
        ]
      : []),
    `</body>`,
    `</html>`,
  ].join('\n')
}

export default templateHtmlSamples
