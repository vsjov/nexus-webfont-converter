/// <reference types="vitest" />
import { relative } from 'path'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import appRootPath from 'app-root-path'
import { _dirname } from './src/dev-tools/utils/dirname.js'
import pkg from './package.json' with { type: 'json' }

const __dirname = _dirname(import.meta.url)
const relativeRootPath = relative(__dirname, appRootPath.toString())

export default defineConfig({
  cacheDir: `${relativeRootPath}/node_modules/.vite/${pkg.name}`,

  resolve: {
    tsconfigPaths: true,
  },

  // Uncomment this if you are using workers.
  // worker: {
  //   resolve: {
  //     tsconfigPaths: true,
  //   },
  // },

  test: {
    globals: true,
    environment: 'jsdom',
    reporters: ['dot'],
    include: [
      'src/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'scripts/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tools/release-validator/src/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      ...configDefaults.exclude,
      './templates/**',
    ],
  },
})
