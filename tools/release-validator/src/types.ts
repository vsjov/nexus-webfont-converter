// Imports
// -----------------------------------------------------------------------------
// NodeJS
import type { SpawnSyncReturns } from 'node:child_process'

// Types
// -----------------------------------------------------------------------------
export type PackageMetadata = {
  name: string
  version: string
}

export type RunCommandOptions = {
  stdio?: 'inherit' | 'pipe'
}

export type RunCommand = (
  command: string,
  args: string[],
  options?: RunCommandOptions,
) => SpawnSyncReturns<string>

export type ReleaseTagValidation = {
  branchRef: string
  packageName: string
  tagCommit: string
  tagName: string
  version: string
}

export type ValidateReleaseTagOptions = {
  packageRoot: string
  runCommand: RunCommand
  tagName: string
}
