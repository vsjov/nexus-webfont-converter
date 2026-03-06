import type { FontEntry } from '../../utils/build-font-entries.js';
import { type GlyphKey } from './glyphs.js';
interface BuildHtmlOptions {
    familyName: string;
    dirName: string;
    entries: FontEntry[];
    glyphs?: GlyphKey[];
    licenseFile?: string | null;
}
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
export declare const templateHtmlSamples: ({ familyName, dirName, entries, glyphs, licenseFile, }: BuildHtmlOptions) => string;
export default templateHtmlSamples;
//# sourceMappingURL=template-html-samples.d.ts.map