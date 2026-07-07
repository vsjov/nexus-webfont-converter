import type { Dirent } from 'node:fs';
export type RecursiveDirent = Dirent & {
    parentPath?: string;
    path?: string;
};
/**
 * Converts a recursive dirent into a path relative to the scanned root.
 *
 * @param rootDir - Directory passed to `readdirSync`
 * @param entry - Dirent returned from recursive `readdirSync`
 * @returns Relative path for the entry
 */
export declare const getRelativeDirentPath: (rootDir: string, entry: RecursiveDirent) => string;
export default getRelativeDirentPath;
//# sourceMappingURL=get-relative-dirent-path.d.ts.map