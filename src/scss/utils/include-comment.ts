// Imports
// -----------------------------------------------------------------------------
// Internal
import { FONT_WEIGHT } from '../../config/constants.js'


// Function
// -----------------------------------------------------------------------------
/**
 * Returns the comment label for a single `@include fontFace(...)` line,
 * matching the convention used in `ananda.scss`:
 * - 400 normal -> `Normal`
 * - 400 italic -> `Italic`
 * - other normal -> weight label (e.g. `Bold`)
 * - other italic -> weight label + ` Italic` (e.g. `Bold Italic`)
 */
export const includeComment = (weight: number, style: 'normal' | 'italic'): string => {
  if (weight === 400) return style === 'italic' ? 'Italic' : 'Normal'

  const label = FONT_WEIGHT[weight] ?? `${weight}`

  return style === 'italic' ? `${label} Italic` : label
}

export default includeComment
