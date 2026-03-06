export type FontTarget = {
    outputFontDir: string;
    dirName: string;
};
/**
 * Resolves the list of font family targets from `outputDir`.
 *
 * - If `outputDir` contains subdirectories, each subdirectory is a target.
 * - Otherwise falls back to treating every `.scss` file in `outputDir` as a
 *   target (flat layout).
 *
 * @param outputDir - Root output directory (e.g. `build/out/`)
 */
export declare const buildFontTargets: (outputDir: string) => FontTarget[];
export default buildFontTargets;
//# sourceMappingURL=build-font-targets.d.ts.map