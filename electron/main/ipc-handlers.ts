import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { dialog, ipcMain, type BrowserWindow } from 'electron'
import { deleteAsync } from 'del'

import type { DroppedItem } from '../types.js'
import { SOURCE_EXTENSIONS } from '../../src/config/constants.js'
import { inferFontFamilyName } from '../../src/utils/infer-font-family-name.js'
import { countSteps, runElectronPipeline } from './pipeline.js'
import buildZip from './zip-builder.js'


// Helpers
// -----------------------------------------------------------------------------
const scanDir = (dirPath: string): number => {
  const entries = fs.readdirSync(dirPath, { recursive: true, encoding: 'utf-8' })
  return entries.filter(e => SOURCE_EXTENSIONS.includes(path.extname(e).toLowerCase())).length
}

const resolveDroppedPaths = (paths: string[]): DroppedItem[] => {
  const result: DroppedItem[] = []

  for (const p of paths) {
    let stat: fs.Stats
    try {
      stat = fs.statSync(p)
    } catch {
      continue
    }

    if (stat.isDirectory()) {
      const fileCount = scanDir(p)
      if (fileCount > 0) {
        result.push({
          label: inferFontFamilyName(path.basename(p)),
          sourcePaths: [p],
          fileCount,
          inputDir: p,
        })
      }
    } else if (SOURCE_EXTENSIONS.includes(path.extname(p).toLowerCase())) {
      const parentDir = path.dirname(p)
      const existing = result.find(r => r.inputDir === parentDir)

      if (existing) {
        existing.sourcePaths.push(p)
        existing.fileCount++
      } else {
        result.push({
          label: inferFontFamilyName(path.basename(parentDir)),
          sourcePaths: [p],
          fileCount: 1,
          inputDir: parentDir,
        })
      }
    }
  }

  return result
}


// Registration
// -----------------------------------------------------------------------------
export const registerIpcHandlers = (getWindow: () => BrowserWindow | null): void => {
  ipcMain.handle('scan-paths', (_event, paths: string[]) => resolveDroppedPaths(paths))

  ipcMain.on('start-conversion', (_event, items: DroppedItem[]) => {
    const win = getWindow()
    if (!win) return

    void runConversion(items, win)
  })
}

const runConversion = async (items: DroppedItem[], win: BrowserWindow): Promise<void> => {
  const tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wfc-out-'))
  const tempZipDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wfc-zip-'))

  const totalSteps = items.reduce((sum, item) => sum + countSteps(item.inputDir), 0) + 1
  let currentStep = 0

  const onStep = (step: string): void => {
    currentStep++
    win.webContents.send('progress', { current: currentStep, total: totalSteps, step })
  }

  try {
    for (const item of items) {
      const itemOutputDir = items.length > 1
        ? path.join(tempOutputDir, item.label)
        : tempOutputDir

      await runElectronPipeline(item.inputDir, itemOutputDir, onStep)
    }

    // Build ZIP
    const zipName = items.length === 1 ? `${items[0]!.label}.zip` : 'webfonts.zip'
    const zipPath = path.join(tempZipDir, zipName)
    await buildZip(tempOutputDir, zipPath)
    onStep('Built ZIP archive')

    // Show save dialog
    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      title: 'Save Converted Fonts',
      defaultPath: zipName,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
    })

    if (!canceled && filePath) {
      await fs.promises.copyFile(zipPath, filePath)
      win.webContents.send('complete', { savedPath: filePath })
    } else {
      win.webContents.send('complete', { savedPath: '' })
    }
  } catch (err) {
    win.webContents.send('error', (err as Error).message)
  } finally {
    await deleteAsync([tempOutputDir, tempZipDir], { force: true })
  }
}
