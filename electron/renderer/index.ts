import './env.d.ts'
import type { DroppedItem } from '../types.js'
import setupDropZone from './components/drop-zone.js'
import renderFileList from './components/file-list.js'
import setConvertButtonState from './components/convert-button.js'
import { updateProgress, resetProgress } from './components/progress-bar.js'


// Elements
// -----------------------------------------------------------------------------
const dropZoneEl = document.getElementById('drop-zone') as HTMLElement
const fileListEl = document.getElementById('file-list') as HTMLElement
const convertBtnEl = document.getElementById('convert-btn') as HTMLButtonElement
const progressSection = document.getElementById('progress-section') as HTMLElement


// State
// -----------------------------------------------------------------------------
let stagedItems: DroppedItem[] = []
let isConverting = false


// Helpers
// -----------------------------------------------------------------------------
const refresh = (): void => {
  renderFileList(fileListEl, stagedItems, handleRemove)
  setConvertButtonState(convertBtnEl, stagedItems.length > 0 && !isConverting)
}


// Handlers
// -----------------------------------------------------------------------------
const handlePaths = async (paths: string[]): Promise<void> => {
  if (isConverting) return

  const items = await window.api.scanPaths(paths)

  for (const item of items) {
    const alreadyStaged = stagedItems.some(s => s.inputDir === item.inputDir)
    if (!alreadyStaged) stagedItems.push(item)
  }

  refresh()
}

const handleRemove = (index: number): void => {
  stagedItems.splice(index, 1)
  refresh()
}

const handleConvert = (): void => {
  if (stagedItems.length === 0 || isConverting) return

  isConverting = true
  refresh()
  progressSection.hidden = false
  window.api.startConversion(stagedItems)
}


// Event wiring
// -----------------------------------------------------------------------------
setupDropZone(dropZoneEl, paths => void handlePaths(paths))
convertBtnEl.addEventListener('click', handleConvert)

window.api.onProgress(event => {
  updateProgress(progressSection, event.current, event.total, event.step)
})

window.api.onComplete(() => {
  isConverting = false
  stagedItems = []
  refresh()

  setTimeout(() => {
    progressSection.hidden = true
    resetProgress(progressSection)
  }, 1500)
})

window.api.onError(message => {
  isConverting = false
  refresh()
  progressSection.hidden = true
  resetProgress(progressSection)
  alert(`Conversion failed: ${message}`)
})
