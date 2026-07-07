import type { ReleaseTagValidation, ValidateReleaseTagOptions } from './types.js';
/**
 * Validates that one release tag identifies the exact tip of its matching remote release branch.
 *
 * @param options - Repository root, tag name, and command boundary.
 * @returns Validated release metadata.
 * @throws When the tag, package, branch, commit, or unique-tag contract is invalid.
 */
export declare const validateReleaseTag: (options: ValidateReleaseTagOptions) => ReleaseTagValidation;
export default validateReleaseTag;
