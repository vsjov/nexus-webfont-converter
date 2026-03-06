import type { ProgressOptions } from '../utils/progress.js';
/**
 * Copies license files (`.txt`, `.md`, `.pdf`, or files with no extension) from
 * `inputDir` and its immediate sub-directories to the corresponding paths under
 * `outputDir`, preserving the relative directory structure.
 *
 * @param inputDir - Root input directory (e.g. `build/in/`)
 * @param outputDir - Root output directory (e.g. `build/out/`)
 * @param progress - Progress and warning callbacks
 */
export declare const copyLicenseFiles: (inputDir: string, outputDir: string, progress?: ProgressOptions) => void;
export default copyLicenseFiles;
//# sourceMappingURL=copy-license-files.d.ts.map