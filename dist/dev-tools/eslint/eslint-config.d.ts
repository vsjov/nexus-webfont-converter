import type { Linter } from 'eslint';
export declare const rulesCommon: Linter.RulesRecord;
export declare const rulesTs: Linter.RulesRecord;
export declare const rulesVue: Linter.RulesRecord;
/**
 * Removes all Vue3 specific rules and deprecations that are incompatible with
 * Vue2
 */
export declare const rulesNoVue3: Linter.RulesRecord;
type ModuleType = 'esm' | 'cjs';
/**
 * Main, configurable ESLint configuration
 *
 * @param options Configuration options
 * @param options.tsconfigPath Path to the TypeScript configuration file relative to packageDir (default: './tsconfig.json')
 * @param options.packageDir Absolute or relative path to the package directory (required for TS/Vue files)
 * @param options.type Module type, either `cjs` for CommonJS or `esm` for ES Modules
 * @returns ESLint configuration object
 */
export declare const eslintConfig: (
/** Configuration options */
options: {
    /**
     * Path to the TypeScript configuration file relative to packageDir
     **/
    tsconfigPath?: string | null;
    /**
     * Absolute or relative path to the package directory (required for TS/Vue files to resolve tsconfigPath)
     */
    packageDir?: string;
    /**
     * Module type, either `cjs` for CommonJS or `esm` for ES Modules
     */
    type?: ModuleType;
    /**
     * Additional ignore patterns
     */
    ignores?: Linter.Config["ignores"];
}) => import("eslint/config").Config[];
export {};
//# sourceMappingURL=eslint-config.d.ts.map