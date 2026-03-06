// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import path from 'node:path';
// Config
import { LICENSE_EXTENSIONS } from '../config/constants.js';
// Function
// -----------------------------------------------------------------------------
/**
 * Finds the first license file (`.txt`, `.md`, `.pdf`, or extension-less) in `dirPath`.
 * Returns `null` if the directory does not exist or contains no license file.
 *
 * @param dirPath - Directory to search
 */
export const findLicenseFile = (dirPath) => {
    if (!fs.existsSync(dirPath))
        return null;
    return fs.readdirSync(dirPath).find(f => {
        const ext = path.extname(f).toLowerCase();
        return fs.statSync(path.join(dirPath, f)).isFile() && LICENSE_EXTENSIONS.includes(ext);
    }) ?? null;
};
export default findLicenseFile;
//# sourceMappingURL=find-license-file.js.map