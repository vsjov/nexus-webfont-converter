type FontConverterParameters = {
    rootDir: string;
    inputDir: string | null;
    outputDir: string | null;
};
/**
 * Generates dynamic paths for the webfont converter.  All paths are relative to
 * the package root.
 *
 * @param parameters - Configuration parameters.
 * @param parameters.rootDir - The root directory for the converter (default:
 * './')
 * @param parameters.inputDir - The input directory containing TTF/OTF files
 * (required)
 * @param parameters.outputDir - The output directory for converted WOFF/WOFF2
 * files (required)
 * @returns An object containing the resolved input and output paths for font
 * conversion.
 */
export declare const fontConverterPaths: (parameters: FontConverterParameters) => {
    convert: {
        in: string;
        out: string;
    };
};
export {};
//# sourceMappingURL=paths.d.ts.map