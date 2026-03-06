/**
 * Runs the full webfont conversion pipeline: cleans the output directory,
 * converts fonts to WOFF/WOFF2, copies license files, generates SCSS/CSS,
 * and creates an HTML preview page.
 *
 * @param inputDir - Absolute path to the directory containing source TTF/OTF fonts
 * @param outputDir - Absolute path to the output directory for converted files
 */
declare const runPipeline: (inputDir: string, outputDir: string) => Promise<void>;
export default runPipeline;
//# sourceMappingURL=run-pipeline.d.ts.map