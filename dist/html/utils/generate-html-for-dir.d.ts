import type { ProgressOptions } from '../../utils/progress.js';
/**
 * Generates a `[font-name].html` preview page for a single font family
 * directory.
 *
 * @param fontDir - Directory containing the source font files (TTF / OTF)
 * @param outputFontDir - Directory where the `.html` file will be written
 * @param dirName - Directory basename
 */
export declare const generateHtmlForDir: (fontDir: string, outputFontDir: string, dirName: string, progress?: ProgressOptions) => void;
export default generateHtmlForDir;
//# sourceMappingURL=generate-html-for-dir.d.ts.map