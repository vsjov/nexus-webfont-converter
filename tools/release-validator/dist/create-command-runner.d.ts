import type { RunCommand } from './types.js';
/**
 * Creates a synchronous command runner bound to the repository root.
 *
 * @param packageRoot - Repository root used as the command working directory.
 * @param sourceEnv - Environment inherited by every command.
 * @returns A command runner that throws when a command cannot run successfully.
 */
export declare const createCommandRunner: (packageRoot: string, sourceEnv?: NodeJS.ProcessEnv) => RunCommand;
export default createCommandRunner;
