// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { readFileSync } from 'node:fs';
import path from 'node:path';
// Functions
// -----------------------------------------------------------------------------
/**
 * Reads the root package name and version.
 *
 * @param packageRoot - Repository root containing package.json.
 * @returns Package name and version.
 * @throws When package.json cannot be read or parsed.
 */
export const readPackageMetadata = (packageRoot) => {
    const pkg = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
    return {
        name: String(pkg['name']),
        version: String(pkg['version']),
    };
};
export default readPackageMetadata;
