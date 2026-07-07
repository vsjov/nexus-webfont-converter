// Types
import type { RunCommand } from './types.js'

// Functions
// -----------------------------------------------------------------------------
/**
 * Runs a command with captured output and returns trimmed standard output.
 *
 * @param runCommand - Configured command runner.
 * @param command - Executable name or path.
 * @param args - Fixed command arguments.
 * @returns Trimmed command standard output.
 * @throws When the configured command runner fails.
 */
export const readCommand = (
  runCommand: RunCommand,
  command: string,
  args: string[],
): string =>
  runCommand(command, args, {
    stdio: 'pipe',
  }).stdout.trim()

export default readCommand
