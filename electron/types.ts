export type DroppedItem = {
  label: string
  sourcePaths: string[]
  fileCount: number
  inputDir: string
}

export type ProgressEvent = {
  current: number
  total: number
  step: string
}

export type CompleteEvent = {
  savedPath: string
}
