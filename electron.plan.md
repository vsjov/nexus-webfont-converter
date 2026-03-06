# Electron App Plan — Nexus Webfont Converter UI

## Overview

A minimal single-window Electron desktop app that wraps the existing
`runPipeline` Node.js logic. The user drops fonts or directories, clicks
Convert, watches a real-time progress bar, and saves the result as a ZIP.

---

## Directory Structure

```
electron/
  main/
    index.ts              - BrowserWindow creation, app lifecycle
    ipc-handlers.ts       - All IPC channel handlers
    progress-tracker.ts   - Pre-scan + step counting + emit helpers
    zip-builder.ts        - Build zip from output dir using `archiver`
  preload/
    preload.ts            - contextBridge: exposes typed `window.api` to renderer
  renderer/
    index.html            - Shell HTML
    index.ts              - Entry point, wires up components
    styles/
      main.css            - Base styles
    components/
      drop-zone.ts        - Drag-and-drop area, file/dir validation
      file-list.ts        - List of staged items (name + file count)
      convert-button.ts   - Enabled/disabled state
      progress-bar.ts     - 0-100%, with step label
```

A separate `tsconfig.electron.json` compiles the `electron/` tree.
Build tool: **electron-vite** (handles main/preload/renderer separately,
fast HMR in dev, production bundling).
Packaging: **electron-builder**.

---

## UI Layout (single 640×520px window, non-resizable)

```
+------------------------------------------+
|                                          |
|   +------------------------------------+ |
|   |                                    | |
|   |     Drop fonts or folders here     | |
|   |                                    | |
|   |     [ font icon ]                  | |
|   |     .ttf  .otf  or  directory      | |
|   |                                    | |
|   +------------------------------------+ |
|                                          |
|   Akrobat (8 files)              [ x ]   |
|   Mononoki (4 files)             [ x ]   |
|                                          |
|   [          Convert          ]          |
|                                          |
|   ████████████░░░░░░░░  14 / 22          |
|   Generating SCSS...                     |
|                                          |
+------------------------------------------+
```

- Drop zone accepts `.ttf`, `.otf` files and directories (recursive scan)
- File list shows each family name + source file count; items removable
- Convert button is disabled until at least one item is staged
- Progress bar + step label hidden until conversion starts
- On completion the native Save dialog opens automatically

---

## IPC Channels

All renderer↔main communication goes through `contextBridge` in preload.
The exposed `window.api` object:

```ts
// renderer → main
scanPaths(paths: string[]): Promise<DroppedItem[]>
  // resolves file/dir paths into { label, sourcePaths, fileCount }

startConversion(items: DroppedItem[], tempDir: string): void
  // kicks off runPipeline; progress events stream back

showSaveDialog(defaultName: string): Promise<string | null>
  // opens native Save dialog, returns chosen path or null

saveZip(sourcePath: string, destPath: string): Promise<void>
  // moves completed zip to user-chosen location

// main → renderer  (event listeners)
onProgress(cb: (e: ProgressEvent) => void): void
onComplete(cb: (e: CompleteEvent) => void): void
onError(cb: (message: string) => void): void
```

```ts
type DroppedItem = {
  label: string       // inferred font family name
  sourcePaths: string[]
  fileCount: number   // count of .ttf/.otf found
}

type ProgressEvent = {
  current: number
  total: number
  step: string        // e.g. "Converting mononoki-Bold.ttf → woff2"
}

type CompleteEvent = {
  zipPath: string     // path to the finished zip in OS temp dir
  zipName: string     // suggested save filename
}
```

---

## Progress Calculation

Pre-scan runs before conversion starts and counts:

```
N   = total source font files (.ttf / .otf) across all dropped items
D   = number of unique font family directories

Total steps =
  1           (clean output dir)
+ N × 2       (woff + woff2 per source font)
+ 1           (copy license files)
+ D           (generate SCSS — one file per family dir)
+ D           (compile CSS — one file per family dir)
+ 1           (generate HTML preview)
+ 1           (build ZIP)
```

`runPipeline` needs a lightweight modification: accept an optional
`onStep(label: string): void` callback that each stage calls once
it completes a unit of work. The main process wraps this to emit
`progress` IPC events to the renderer.

---

## ZIP Strategy

- Conversion writes output to a temp directory (`os.tmpdir()/wfc-{uuid}/`)
- After the pipeline completes, `zip-builder.ts` uses `archiver` to
  pack the temp dir into `{FontFamilyName}.zip` (also in temp)
- The Save dialog opens with that filename as the default
- On confirm, the zip is moved to the user's chosen path
- Temp directory is cleaned up on app quit

**ZIP naming:**
- Single family dropped → `{FamilyName}.zip` (e.g. `Akrobat.zip`)
- Multiple families → `webfonts.zip`

---

## New Dependencies

```jsonc
// production
"archiver": "^7.x"               // ZIP creation

// dev
"electron": "^35.x"
"electron-vite": "^3.x"
"electron-builder": "^26.x"
"@types/archiver": "^6.x"
```

No UI framework. Vanilla TypeScript + CSS is sufficient for this UI.

---

## Modification to Existing Code

Only one change to the existing library code:

**`src/run-pipeline.ts`** — add optional `onStep` callback param:

```ts
const runPipeline = (
  inputDir: string,
  outputDir: string,
  onStep?: (label: string) => void   // <-- new optional param
): Promise<void>
```

Each stage calls `onStep?.('...')` when it completes one unit.
This is backwards-compatible — the CLI and tests are unaffected.

---

## Build & Packaging

```
electron-vite build    → bundles main + preload + renderer into electron/dist/
electron-builder       → packages into platform installers
```

`electron-builder` config in `package.json`:
- Windows: NSIS installer + portable `.exe`
- macOS: `.dmg`
- Linux: `.AppImage`

A separate `package.json` script:
```json
"electron:dev":   "electron-vite dev",
"electron:build": "electron-vite build && electron-builder"
```

---

## Implementation Sequence

1. Scaffold `electron/` tree + `electron-vite` config
2. `main/index.ts` — window creation, basic lifecycle
3. `preload/preload.ts` — `contextBridge` API surface
4. Modify `runPipeline` to accept `onStep` callback
5. `main/progress-tracker.ts` + `main/ipc-handlers.ts`
6. `main/zip-builder.ts`
7. Renderer: drop zone + file list
8. Renderer: convert button + progress bar
9. Wire save dialog + zip move
10. Packaging config
