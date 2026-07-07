#!/usr/bin/env node
/**
 * Checks whether this module is running as the CLI entrypoint.
 *
 * @param argvPath - Executed script path, usually `process.argv[1]`
 * @param moduleUrl - Current module URL, usually `import.meta.url`
 * @returns `true` when this file was executed directly
 * @throws If either path cannot be resolved on disk
 */
export declare const isCliEntrypoint: (argvPath?: string, moduleUrl?: string) => boolean;
/**
 * Parses CLI arguments and runs either conversion or maintenance commands.
 *
 * @returns Resolves after the requested command completes
 */
export declare const main: () => Promise<void>;
//# sourceMappingURL=cli.d.ts.map