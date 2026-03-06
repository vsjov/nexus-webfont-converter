/// <reference types="vitest" />
import { relative } from 'path'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import appRootPath from 'app-root-path'
import { _dirname } from './src/dev-tools/utils/dirname.js'
import pkg from './package.json' with { type: 'json' }

const __dirname = _dirname(import.meta.url)
const relativeRootPath = relative(__dirname, appRootPath.toString())

export default defineConfig({
  cacheDir: `${relativeRootPath}/node_modules/.vite/${pkg.name}`,

  plugins: [
    viteTsConfigPaths({
      root: relativeRootPath,
    }),
  ],

  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [
  //    viteTsConfigPaths({
  //      root: relativeRootPath,
  //    }),
  //  ],
  // },

  test: {
    globals: true,
    environment: 'jsdom',
    reporters: ['dot'],
    include: ['src/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      ...configDefaults.exclude,
      './templates/**',
    ],
  },
})
