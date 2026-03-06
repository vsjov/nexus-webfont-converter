import path, { basename, extname, join, dirname } from "node:path";
import { ipcMain, dialog, app, BrowserWindow, shell } from "electron";
import fs from "node:fs";
import os from "node:os";
import { deleteAsync } from "del";
import ttf2woff from "ttf2woff";
import ttf2woff2 from "ttf2woff2";
import log from "fancy-log";
import pc from "picocolors";
import gulp from "gulp";
import gulpSass from "gulp-sass";
import * as sassCompiler from "sass";
import rename from "gulp-rename";
import lightningcss from "gulp-lightningcss";
import archiver from "archiver";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const SOURCE_EXTENSIONS = [".ttf", ".otf"];
const LICENSE_EXTENSIONS = [".txt", ".md", ".pdf", ""];
const FONT_WEIGHT = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black"
};
const PREVIEW_GLYPHS = [
  "currency",
  "latin1_supplemental",
  "latin1",
  "latin2",
  "cyrillic"
];
const WEIGHT_MAP = [
  [/extralight|extra[-\s]?light/i, 200],
  [/ultralight|ultra[-\s]?light/i, 200],
  [/extrabold|extra[-\s]?bold/i, 800],
  [/ultrabold|ultra[-\s]?bold/i, 800],
  [/semibold|semi[-\s]?bold/i, 600],
  [/demibold|demi[-\s]?bold/i, 600],
  [/thin/i, 100],
  [/light/i, 300],
  [/medium/i, 500],
  [/bold/i, 700],
  [/black/i, 900],
  [/heavy/i, 900]
];
const inferFontFamilyName = (dirName) => dirName.split("-").map(
  (word) => word.length <= 2 ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
).join(" ");
const toHyphenated = (name) => name.replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2").replace(/([a-z\d])([A-Z])/g, "$1-$2").replace(/[\s_]+/g, "-").replace(/-+/g, "-").toLowerCase();
const copyLicenseFiles = (inputDir, outputDir) => {
  const allEntries = fs.readdirSync(inputDir, { recursive: true, encoding: "utf-8" });
  const licenseFiles = allEntries.filter((entry) => {
    if (path.basename(entry) === ".gitkeep") return false;
    const ext = path.extname(entry).toLowerCase();
    if (!LICENSE_EXTENSIONS.includes(ext)) return false;
    return fs.statSync(path.join(inputDir, entry)).isFile();
  });
  if (licenseFiles.length === 0) {
    log(pc.yellow(`No license files found in ${pc.blue(inputDir)}`));
    return;
  }
  for (const relPath of licenseFiles) {
    const destPath = path.join(outputDir, relPath);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(path.join(inputDir, relPath), destPath);
    log(`Copied license ${pc.green(path.basename(relPath))} -> ${pc.blue(path.dirname(destPath))}`);
  }
};
const getSubdirectories = (dirPath) => fs.readdirSync(dirPath).filter((entry) => {
  try {
    return fs.statSync(path.join(dirPath, entry)).isDirectory();
  } catch {
    return false;
  }
});
const inferFontWeight = (fileName) => {
  for (const [pattern, weight] of WEIGHT_MAP) {
    if (pattern.test(fileName)) return weight;
  }
  return 400;
};
const inferFontStyle = (fileName) => /italic|oblique/i.test(fileName) ? "italic" : "normal";
const buildFontEntries = (fontFiles) => {
  const entries = fontFiles.map((file) => {
    const raw = basename(file, extname(file));
    return {
      normalizedBase: toHyphenated(raw),
      weight: inferFontWeight(raw),
      style: inferFontStyle(raw)
    };
  });
  entries.sort((a, b) => {
    if (a.weight !== b.weight) return a.weight - b.weight;
    return a.style === "normal" ? -1 : 1;
  });
  return entries;
};
const includeComment = (weight, style) => {
  if (weight === 400) return style === "italic" ? "Italic" : "Normal";
  const label = FONT_WEIGHT[weight] ?? `${weight}`;
  return style === "italic" ? `${label} Italic` : label;
};
const FORMAT_LABELS = {
  ".woff2": "woff2",
  ".woff": "woff",
  ".ttf": "truetype",
  ".otf": "opentype"
};
const FONT_WEIGHT_GUIDE = `// Font Weight Guide
// -----------------
// 100 - thin
// 200 - extralight
// 300 - light
// 400 - regular / normal
// 500 - medium
// 600 - semi-bold
// 700 - bold
// 800 - extrabold
// 900 - black / heavy`;
const templateFontFaceMixin = (detectedFormats) => {
  const srcLines = detectedFormats.map((ext, i) => {
    const format = FORMAT_LABELS[ext];
    const line = `    src: url("#{$fileName}${ext}") format("${format}")`;
    const isLast = i === detectedFormats.length - 1;
    return i === 0 ? line + (isLast ? ";" : ",") : `         url("#{$fileName}${ext}") format("${format}")` + (isLast ? ";" : ",");
  });
  const fontFaceMixinTemplate = `${FONT_WEIGHT_GUIDE}

// Font Face Mixin
@mixin fontFace($fontName, $fileName, $fontWeight, $fontStyle) {
  @font-face {
    font-family: "#{$fontName}";
${srcLines.join("\n")}
    font-weight: #{$fontWeight};
    font-style: #{$fontStyle};
    font-display: swap;
  }
}
`;
  return fontFaceMixinTemplate;
};
const FORMAT_PRIORITY = [".woff2", ".woff", ".ttf", ".otf"];
const generateScssForDir = (fontDir, outputFontDir, dirName) => {
  const entries = fs.readdirSync(fontDir);
  const fontFiles = entries.filter((f) => SOURCE_EXTENSIONS.includes(path.extname(f).toLowerCase()));
  if (fontFiles.length === 0) {
    log(pc.yellow(`No TTF or OTF files found in ${pc.blue(fontDir)} - skipping SCSS generation`));
    return;
  }
  const outputEntries = fs.existsSync(outputFontDir) ? fs.readdirSync(outputFontDir) : [];
  const detectedFormats = FORMAT_PRIORITY.filter(
    (ext) => outputEntries.some((f) => path.extname(f).toLowerCase() === ext)
  );
  if (detectedFormats.length === 0) {
    log(pc.yellow(`No converted font files found in ${pc.blue(outputFontDir)} - skipping SCSS generation`));
    return;
  }
  const familyName = inferFontFamilyName(dirName);
  const fontEntries = buildFontEntries(fontFiles);
  const includeLines = fontEntries.map(
    (entry) => `// ${includeComment(entry.weight, entry.style)}
@include fontFace("${familyName}", "${entry.normalizedBase}", ${entry.weight}, "${entry.style}");`
  ).join("\n");
  const scss = `${templateFontFaceMixin(detectedFormats)}

${includeLines}
`;
  const outputFileName = `${dirName}.scss`;
  const outputPath = path.join(outputFontDir, outputFileName);
  fs.mkdirSync(outputFontDir, { recursive: true });
  fs.writeFileSync(outputPath, scss, "utf-8");
  log(`Generated ${pc.green(outputFileName)} for ${pc.blue(familyName)} (${fontEntries.length} variants)`);
};
const generateFontFaceScss = (inputDir, outputDir) => {
  const fontDirs = getSubdirectories(inputDir);
  if (fontDirs.length === 0) {
    const directFonts = fs.readdirSync(inputDir).filter(
      (e) => SOURCE_EXTENSIONS.includes(path.extname(e).toLowerCase())
    );
    if (directFonts.length > 0) {
      generateScssForDir(inputDir, outputDir, path.basename(inputDir));
      return;
    }
    log(pc.yellow(`No font subdirectories found in ${pc.blue(inputDir)}`));
    return;
  }
  for (const dirName of fontDirs) {
    generateScssForDir(
      path.join(inputDir, dirName),
      path.join(outputDir, dirName),
      dirName
    );
  }
};
const sass = gulpSass(sassCompiler);
const compileCssFiles = (outputDir) => {
  return gulp.src(`${outputDir}/**/*.scss`, { base: outputDir }).pipe(sass().on("error", sass.logError)).pipe(lightningcss({ minify: true, sourceMap: false })).pipe(rename((path2) => {
    path2.extname = ".css";
  })).pipe(gulp.dest(outputDir));
};
const findLicenseFile = (dirPath) => {
  if (!fs.existsSync(dirPath)) return null;
  return fs.readdirSync(dirPath).find((f) => {
    const ext = path.extname(f).toLowerCase();
    return fs.statSync(path.join(dirPath, f)).isFile() && LICENSE_EXTENSIONS.includes(ext);
  }) ?? null;
};
const GLYPHS = {
  sample: "The quick brown fox jumps over the lazy dog",
  digits: "0 1 2 3 4 5 6 7 8 9",
  punctuation: `! @ # $ % ^ & * ( ) - _ = + [ ] { } ; : ' " , . < > / ?`,
  currency: "₠ ₡ ₢ ₣ ₤ ₥ ₦ ₧ ₨ ₩ ₪ ₫ € ₭ ₮ ₯ ₰ ₱ ₲ ₳ ₴ ₵ ₶ ₷ ₸ ₹ ₺ ₻ ₼ ₽ ₾ ₿",
  latin: "A B C D E F G H I J K L M N O P Q R S T U V W X Y Z a b c d e f g h i j k l m n o p q r s t u v w x y z",
  cyrillic: "А Б В Г Д Ђ Е Ж З И Ј К Л Љ М Н Њ О П Р С Т Ћ У Ф Х Ц Ч Џ Ш а б в г д ђ е ж з и ј к л љ м н њ о п р с т ћ у ф х ц ч џ ш",
  latin1: "À Á Â Ã Ä Å Æ Ç È É Ê Ë Ì Í Î Ï Ð Ñ Ò Ó Ô Õ Ö Ø Ù Ú Û Ü Ý Þ ß à á â ã ä å æ ç è é ê ë ì í î ï ð ñ ò ó ô õ ö ø ù ú û ü ý þ ÿ",
  latin1_supplemental: "¡ ¢ £ ¤ ¥ ¦ § ¨ © ª « ¬ ® ¯ ° ± ² ³ ´ µ ¶ · ¸ ¹ º » ¼ ½ ¾ ¿",
  latin2: "Ą ą Ć ć Č č Ď ď Đ đ Ě ě Ę ę Ĺ ĺ Ľ ľ Ł ł Ń ń Ň ň Ő ő Ř ř Ś ś Š š Ş ş Ť ť Ţ ţ Ű ű Ů ů Ź ź Ž ž Ż ż",
  latin_ext_a: "Ā ā Ă ă Ą ą Ć ć Ĉ ĉ Ċ ċ Č č Ď ď Đ đ Ē ē Ĕ ĕ Ė ė Ę ę Ě ě Ĝ ĝ Ğ ğ Ġ ġ Ģ ģ Ĥ ĥ Ħ ħ Ĩ ĩ Ī ī Ĭ ĭ Į į İ ı Ĳ ĳ Ĵ ĵ Ķ ķ ĸ Ĺ ĺ Ļ ļ Ľ ľ Ŀ ŀ Ł ł Ń ń Ņ ņ Ň ň ŉ Ŋ ŋ Ō ō Ŏ ŏ Ő ő Œ œ Ŕ ŕ Ŗ ŗ Ř ř Ś ś Ŝ ŝ Ş ş Š š Ţ ţ Ť ť Ŧ ŧ Ũ ũ Ū ū Ŭ ŭ Ů ů Ű ű Ų ų Ŵ ŵ Ŷ ŷ Ÿ Ź ź Ż ż Ž ž ſ",
  latin_ext_b: "ƀ Ɓ Ƃ ƃ Ɔ Ƈ ƈ Ɖ Ɗ Ƌ ƌ Ǝ Ə Ɛ Ƒ ƒ Ɠ Ɣ Ɩ Ɨ Ƙ ƙ Ɯ Ɲ Ɵ Ơ ơ Ƣ ƣ Ƥ ƥ Ʀ Ƨ ƨ Ʃ Ƭ ƭ Ʈ Ư ư Ʊ Ʋ Ƴ ƴ Ƶ ƶ Ʒ Ƹ ƹ Ǎ ǎ Ǐ ǐ Ǒ ǒ Ǔ ǔ Ǵ ǵ Ǹ ǹ Ǻ ǻ Ǽ ǽ Ǿ ǿ Ș ș Ț ț Ȧ ȧ Ȩ ȩ Ȳ ȳ Ⱥ Ȼ ȼ Ƀ Ʉ Ʌ Ɇ ɇ Ɉ ɉ Ɋ ɋ Ɍ ɍ Ɏ ɏ"
};
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const toCssClass = (key) => key.replace(/_/g, "-");
const templateHtmlSamples = ({
  familyName,
  dirName,
  entries,
  glyphs = [],
  licenseFile = null
}) => {
  const weightLabel = (weight) => FONT_WEIGHT[weight] ?? `${weight}`;
  const variantLabel = (weight, style) => {
    if (weight === 400 && style === "normal") return "Regular";
    if (weight === 400 && style === "italic") return "Italic";
    return style === "italic" ? `${weightLabel(weight)} Italic` : weightLabel(weight);
  };
  const variantSections = entries.map(({ weight, style }) => {
    const label = variantLabel(weight, style);
    const fontStyle = `font-family: '${escapeHtml(familyName)}'; font-weight: ${weight}; font-style: ${style};`;
    const extraLines = glyphs.map(
      (key) => `    <p class="variant__sample variant__sample--${toCssClass(key)}" style="${fontStyle}">${GLYPHS[key]}</p>`
    );
    return [
      `  <section class="variant">`,
      `    <h2 class="variant__label">${label} <span class="variant__meta">${weight} / ${style}</span></h2>`,
      `    <p class="variant__sample variant__sample--large" style="${fontStyle}">${GLYPHS.sample}</p>`,
      `    <p class="variant__sample variant__sample--small" style="${fontStyle}">${GLYPHS.sample}</p>`,
      `    <p class="variant__sample variant__sample--latin" style="${fontStyle}">${GLYPHS.latin}</p>`,
      `    <p class="variant__sample variant__sample--digits" style="${fontStyle}">${GLYPHS.digits}</p>`,
      `    <p class="variant__sample variant__sample--punctuation" style="${fontStyle}">${GLYPHS.punctuation}</p>`,
      ...extraLines,
      `  </section>`
    ].join("\n");
  }).join("\n\n");
  return [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8">`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1.0">`,
    `  <title>${escapeHtml(familyName)} - Font Preview</title>`,
    `  <link rel="stylesheet" href="${escapeHtml(dirName)}.css">`,
    `  <style>`,
    `    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`,
    `    body { background: #fff; color: #111; font-family: sans-serif; padding: 2rem; }`,
    `    h1 { font-size: 1rem; font-weight: 400; color: #666; margin-bottom: 2rem; letter-spacing: 0.05em; text-transform: uppercase; }`,
    `    .variant { border-top: 1px solid #e5e5e5; padding: 2rem 0; }`,
    `    .variant__label { font-size: 0.75rem; font-weight: 600; color: #999; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 1rem; }`,
    `    .variant__meta { font-weight: 400; color: #bbb; }`,
    `    .variant__sample { line-height: 1.3; margin-bottom: 0.5rem; }`,
    `    .variant__sample--large { font-size: 2.5rem; }`,
    `    .variant__sample--small { font-size: 1rem; color: #444; margin-bottom: 1.5rem; }`,
    `    .variant__sample--latin { font-size: 1.25rem; color: #666; }`,
    `    .variant__sample--digits { font-size: 1.25rem; color: #666; }`,
    `    .variant__sample--punctuation { font-size: 1rem; color: #999; }`,
    ...glyphs.map(
      (key) => `    .variant__sample--${toCssClass(key)} { font-size: 1rem; color: #999; }`
    ),
    `    footer { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e5e5e5; font-size: 0.75rem; color: #aaa; }`,
    `    footer a { color: #888; text-decoration: underline; }`,
    `    footer a:hover { color: #444; }`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <h1>${escapeHtml(familyName)}</h1>`,
    ``,
    variantSections,
    ...licenseFile ? [
      `  <footer>`,
      `    <a href="${escapeHtml(licenseFile)}"><b>License:</b> ${escapeHtml(licenseFile)}</a>`,
      `  </footer>`
    ] : [],
    `</body>`,
    `</html>`
  ].join("\n");
};
const generateHtmlForDir = (fontDir, outputFontDir, dirName) => {
  const entries = fs.readdirSync(fontDir);
  const fontFiles = entries.filter((f) => SOURCE_EXTENSIONS.includes(path.extname(f).toLowerCase()));
  if (fontFiles.length === 0) {
    log(pc.yellow(`No TTF or OTF files found in ${pc.blue(fontDir)} - skipping HTML generation`));
    return;
  }
  const familyName = inferFontFamilyName(dirName);
  const fontEntries = buildFontEntries(fontFiles);
  const html = templateHtmlSamples({
    familyName,
    dirName,
    entries: fontEntries,
    glyphs: PREVIEW_GLYPHS,
    licenseFile: findLicenseFile(outputFontDir)
  });
  const outputFileName = `${dirName}.html`;
  const outputPath = path.join(outputFontDir, outputFileName);
  fs.mkdirSync(outputFontDir, { recursive: true });
  fs.writeFileSync(outputPath, html, "utf-8");
  log(`Generated ${pc.green(outputFileName)} for ${pc.blue(familyName)}`);
};
const generateFontPreviewHtml = (inputDir, outputDir) => {
  const fontDirs = getSubdirectories(inputDir);
  if (fontDirs.length === 0) {
    const directFonts = fs.readdirSync(inputDir).filter(
      (e) => SOURCE_EXTENSIONS.includes(path.extname(e).toLowerCase())
    );
    if (directFonts.length > 0) {
      generateHtmlForDir(inputDir, outputDir, path.basename(inputDir));
      return;
    }
    log(pc.yellow(`No font subdirectories found in ${pc.blue(inputDir)}`));
    return;
  }
  for (const dirName of fontDirs) {
    generateHtmlForDir(
      path.join(inputDir, dirName),
      path.join(outputDir, dirName),
      dirName
    );
  }
};
const yieldToMain = () => new Promise((resolve) => setImmediate(resolve));
const convertFont = (inputPath, outputPath, format) => {
  const input = fs.readFileSync(inputPath);
  const output = format === "woff" ? ttf2woff(input) : ttf2woff2(input);
  fs.mkdirSync(dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
};
const scanFontFiles = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { recursive: true, encoding: "utf-8" });
  return entries.filter((e) => SOURCE_EXTENSIONS.includes(extname(e).toLowerCase()));
};
const compileCssPromise = (outputDir) => new Promise((resolve, reject) => {
  compileCssFiles(outputDir).on("end", resolve).on("error", reject);
});
const countSteps = (inputDir) => {
  const N = scanFontFiles(inputDir).length;
  return N * 2 + 5;
};
const runElectronPipeline = async (inputDir, outputDir, onStep) => {
  await deleteAsync([
    join(outputDir, "**", "*"),
    `!${join(outputDir, ".gitkeep")}`
  ], { force: true, dot: true });
  onStep("Cleaned output directory");
  const fontFiles = scanFontFiles(inputDir);
  for (const relPath of fontFiles) {
    const inputPath = path.join(inputDir, relPath);
    const normalizedBase = toHyphenated(basename(relPath, extname(relPath)));
    const outputSubDir = join(outputDir, dirname(relPath));
    for (const format of ["woff", "woff2"]) {
      await yieldToMain();
      convertFont(inputPath, join(outputSubDir, `${normalizedBase}.${format}`), format);
      onStep(`Converted ${basename(relPath)} → ${format}`);
    }
  }
  copyLicenseFiles(inputDir, outputDir);
  onStep("Copied license files");
  generateFontFaceScss(inputDir, outputDir);
  onStep("Generated SCSS");
  await compileCssPromise(outputDir);
  onStep("Compiled CSS");
  generateFontPreviewHtml(inputDir, outputDir);
  onStep("Generated HTML preview");
};
const buildZip = (sourceDir, outputPath) => new Promise((resolve, reject) => {
  const output = fs.createWriteStream(outputPath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  output.on("close", resolve);
  archive.on("error", reject);
  archive.pipe(output);
  archive.directory(sourceDir, false);
  archive.finalize();
});
const scanDir = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { recursive: true, encoding: "utf-8" });
  return entries.filter((e) => SOURCE_EXTENSIONS.includes(path.extname(e).toLowerCase())).length;
};
const resolveDroppedPaths = (paths) => {
  const result = [];
  for (const p of paths) {
    let stat;
    try {
      stat = fs.statSync(p);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      const fileCount = scanDir(p);
      if (fileCount > 0) {
        result.push({
          label: inferFontFamilyName(path.basename(p)),
          sourcePaths: [p],
          fileCount,
          inputDir: p
        });
      }
    } else if (SOURCE_EXTENSIONS.includes(path.extname(p).toLowerCase())) {
      const parentDir = path.dirname(p);
      const existing = result.find((r) => r.inputDir === parentDir);
      if (existing) {
        existing.sourcePaths.push(p);
        existing.fileCount++;
      } else {
        result.push({
          label: inferFontFamilyName(path.basename(parentDir)),
          sourcePaths: [p],
          fileCount: 1,
          inputDir: parentDir
        });
      }
    }
  }
  return result;
};
const registerIpcHandlers = (getWindow) => {
  ipcMain.handle("scan-paths", (_event, paths) => resolveDroppedPaths(paths));
  ipcMain.on("start-conversion", (_event, items) => {
    const win = getWindow();
    if (!win) return;
    void runConversion(items, win);
  });
};
const runConversion = async (items, win) => {
  const tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), "wfc-out-"));
  const tempZipDir = fs.mkdtempSync(path.join(os.tmpdir(), "wfc-zip-"));
  const totalSteps = items.reduce((sum, item) => sum + countSteps(item.inputDir), 0) + 1;
  let currentStep = 0;
  const onStep = (step) => {
    currentStep++;
    win.webContents.send("progress", { current: currentStep, total: totalSteps, step });
  };
  try {
    for (const item of items) {
      const itemOutputDir = items.length > 1 ? path.join(tempOutputDir, item.label) : tempOutputDir;
      await runElectronPipeline(item.inputDir, itemOutputDir, onStep);
    }
    const zipName = items.length === 1 ? `${items[0].label}.zip` : "webfonts.zip";
    const zipPath = path.join(tempZipDir, zipName);
    await buildZip(tempOutputDir, zipPath);
    onStep("Built ZIP archive");
    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      title: "Save Converted Fonts",
      defaultPath: zipName,
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }]
    });
    if (!canceled && filePath) {
      await fs.promises.copyFile(zipPath, filePath);
      win.webContents.send("complete", { savedPath: filePath });
    } else {
      win.webContents.send("complete", { savedPath: "" });
    }
  } catch (err) {
    win.webContents.send("error", err.message);
  } finally {
    await deleteAsync([tempOutputDir, tempZipDir], { force: true });
  }
};
let mainWindow = null;
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 640,
    height: 520,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      sandbox: false
    }
  });
  const rendererUrl = process.env["ELECTRON_RENDERER_URL"];
  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl);
    mainWindow.webContents.openDevTools();
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
};
app.whenReady().then(() => {
  registerIpcHandlers(() => mainWindow);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
