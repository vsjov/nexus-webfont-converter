// Functions
// -----------------------------------------------------------------------------
/**
 * Gets the name from either a string entry or a filesystem dirent.
 *
 * @param entry - Directory entry to read
 * @returns Directory entry name
 */
export const getEntryName = (entry) => typeof entry === 'string' ? entry : entry.name;
export default getEntryName;
//# sourceMappingURL=get-entry-name.js.map