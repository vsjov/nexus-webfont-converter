// Imports
// -----------------------------------------------------------------------------
// NodeJS
import fs from 'node:fs';
import path from 'node:path';
// Config
import { LICENSE_EXTENSIONS } from '../config/constants.js';
// Internal
import { getEntryName } from './get-entry-name.js';
import { isFileEntry } from './is-file-entry.js';
// Function
// -----------------------------------------------------------------------------
/**
 * Finds the first license file (`.txt`, `.md`, `.pdf`, or extension-less) in `dirPath`.
 * Returns `null` if the directory does not exist or contains no license file.
 *
 * @param dirPath - Directory to search
 * @returns License filename or `null`
 */
export const findLicenseFile = (dirPath) => {
    if (!fs.existsSync(dirPath))
        return null;
    const licenseEntry = fs
        .readdirSync(dirPath, { withFileTypes: true })
        .find(entry => {
        const entryName = getEntryName(entry);
        const ext = path.extname(entryName).toLowerCase();
        return isFileEntry(dirPath, entry) && LICENSE_EXTENSIONS.includes(ext);
    });
    return licenseEntry ? getEntryName(licenseEntry) : null;
};
export default findLicenseFile;
//# sourceMappingURL=find-license-file.js.map