import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('electron/main/index.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          preload: resolve('electron/preload/preload.ts'),
        },
        output: {
          entryFileNames: '[name].js',
          format: 'cjs',
        },
      },
    },
  },
  renderer: {
    root: resolve('electron/renderer'),
    build: {
      outDir: resolve('out/renderer'),
      rollupOptions: {
        input: resolve('electron/renderer/index.html'),
      },
    },
  },
})
