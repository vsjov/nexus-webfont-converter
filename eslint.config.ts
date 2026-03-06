// Imports
// -----------------------------------------------------------------------------
// Local
import { eslintConfig } from './src/dev-tools/eslint/eslint-config.js'
import { _dirname } from './src/dev-tools/utils/dirname.js'


// ESLint configuration
// -----------------------------------------------------------------------------
const __dirname = _dirname(import.meta.url)

export default eslintConfig({
  tsconfigPath: './tsconfig.eslint.json',
  packageDir: __dirname
})
