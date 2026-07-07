import type { ProgressOptions } from '../utils/progress.js';
export type CopyLicenseFilesOptions = ProgressOptions & {
    sourceLicenseFiles?: string[];
};
/**
 * Copies license files (`.txt`, `.md`, `.pdf`, or files with no extension) from
 * `inputDir` and its nested sub-directories to the corresponding paths under
 * `outputDir`, preserving the relative directory structure.
 *
 * @param inputDir - Root input directory (e.g. `build/in/`)
 * @param outputDir - Root output directory (e.g. `build/out/`)
 * @param options - Progress callbacks and optional pre-scanned license files
 */
export declare const copyLicenseFiles: (inputDir: string, outputDir: string, options?: CopyLicenseFilesOptions) => void;
export default copyLicenseFiles;
//# sourceMappingURL=copy-license-files.d.ts.map