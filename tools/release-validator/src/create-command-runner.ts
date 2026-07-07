// Imports
// -----------------------------------------------------------------------------
// NodeJS
import { spawnSync } from 'node:child_process'

// Types
import type { RunCommand, RunCommandOptions } from './types.js'

// Functions
// -----------------------------------------------------------------------------
/**
 * Creates a synchronous command runner bound to the repository root.
 *
 * @param packageRoot - Repository root used as the command working directory.
 * @param sourceEnv - Environment inherited by every command.
 * @returns A command runner that throws when a command cannot run successfully.
 */
export const createCommandRunner = (
  packageRoot: string,
  sourceEnv: NodeJS.ProcessEnv = process.env,
): RunCommand => {
  /**
   * Runs one command in the configured repository environment.
   *
   * @param command - Executable name or path.
   * @param args - Fixed command arguments.
   * @param options - Standard input and output behavior.
   * @returns The successful child-process result.
   * @throws When the process cannot start or exits unsuccessfully.
   */
  const runCommand = (
    command: string,
    args: string[],
    options: RunCommandOptions = {},
  ) => {
    const result = spawnSync(command, args, {
      cwd: packageRoot,
      encoding: 'utf8',
      env: sourceEnv,
      stdio: options.stdio ?? 'inherit',
    })

    if (result.error) {
      throw result.error
    }

    if (result.status !== 0) {
      throw new Error(`${command} ${args.join(' ')} failed`)
    }

    return result
  }

  return runCommand
}

export default createCommandRunner
