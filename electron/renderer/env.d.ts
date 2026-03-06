import type { DroppedItem, ProgressEvent, CompleteEvent } from '../types.js'

declare global {
  interface Window {
    api: {
      getPathForFile: (file: File) => string
      scanPaths: (paths: string[]) => Promise<DroppedItem[]>
      startConversion: (items: DroppedItem[]) => void
      onProgress: (cb: (event: ProgressEvent) => void) => void
      onComplete: (cb: (event: CompleteEvent) => void) => void
      onError: (cb: (message: string) => void) => void
    }
  }
}

export {}
