#!/usr/bin/env node
/**
 * Runs the guarded release-tag validation CLI.
 *
 * @param args - CLI arguments containing the pushed tag name.
 * @returns Nothing.
 * @throws When the tag argument is missing or release validation fails.
 */
export declare const runReleaseValidatorCli: (args?: string[]) => void;
export default runReleaseValidatorCli;
