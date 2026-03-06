import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { DroppedItem, ProgressEvent, CompleteEvent } from '../types.js'


contextBridge.exposeInMainWorld('api', {
  getPathForFile: (file: File): string =>
    webUtils.getPathForFile(file),

  scanPaths: (paths: string[]): Promise<DroppedItem[]> =>
    ipcRenderer.invoke('scan-paths', paths),

  startConversion: (items: DroppedItem[]): void =>
    ipcRenderer.send('start-conversion', items),

  onProgress: (cb: (event: ProgressEvent) => void): void => {
    ipcRenderer.removeAllListeners('progress')
    ipcRenderer.on('progress', (_event, data: ProgressEvent) => cb(data))
  },

  onComplete: (cb: (event: CompleteEvent) => void): void => {
    ipcRenderer.removeAllListeners('complete')
    ipcRenderer.on('complete', (_event, data: CompleteEvent) => cb(data))
  },

  onError: (cb: (message: string) => void): void => {
    ipcRenderer.removeAllListeners('error')
    ipcRenderer.on('error', (_event, message: string) => cb(message))
  },
})
