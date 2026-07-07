import type { PackageMetadata } from './types.js';
/**
 * Reads the root package name and version.
 *
 * @param packageRoot - Repository root containing package.json.
 * @returns Package name and version.
 * @throws When package.json cannot be read or parsed.
 */
export declare const readPackageMetadata: (packageRoot: string) => PackageMetadata;
export default readPackageMetadata;
