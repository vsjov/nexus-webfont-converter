//! Recursive SCSS compilation and CSS minification for generated artifacts.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use grass::Options as SassOptions;
use lightningcss::stylesheet::{MinifyOptions, ParserOptions, PrinterOptions, StyleSheet};
use lightningcss::targets::{Browsers, Targets};
use thiserror::Error;
use walkdir::WalkDir;

/// An error encountered while compiling SCSS files to CSS.
#[derive(Debug, Error)]
pub enum CssCompilationError {
    /// Walking the output tree failed.
    #[error("failed to scan SCSS files below {path}: {source}")]
    Scan {
        /// Root directory being scanned.
        path: PathBuf,
        /// Underlying traversal error.
        #[source]
        source: walkdir::Error,
    },
    /// Sass compilation failed.
    #[error("failed to compile SCSS file {path}: {source}")]
    Compile {
        /// SCSS input path.
        path: PathBuf,
        /// Underlying Sass error.
        #[source]
        source: grass::Error,
    },
    /// Lightning CSS parsing, minification, or serialization failed.
    #[error("failed to transform CSS generated from {path}: {message}")]
    Transform {
        /// SCSS input path.
        path: PathBuf,
        /// Lightning CSS diagnostic.
        message: String,
    },
    /// Reading an output-local Browserslist configuration failed.
    #[error("failed to read Browserslist configuration {path}: {source}")]
    Browserslist {
        /// Browserslist configuration path.
        path: PathBuf,
        /// Underlying filesystem error.
        #[source]
        source: io::Error,
    },
    /// Writing a CSS file failed.
    #[error("failed to write CSS file {path}: {source}")]
    Write {
        /// CSS output path.
        path: PathBuf,
        /// Underlying filesystem error.
        #[source]
        source: io::Error,
    },
}

/// Compiles every SCSS file below `output_dir` to minified CSS beside its source.
///
/// The returned CSS paths are sorted by their corresponding SCSS input paths.
/// Files are compiled independently, matching the Node pipeline's recursive glob
/// behavior, so a failure identifies the SCSS path that caused it.
pub fn compile_css_files(output_dir: &Path) -> Result<Vec<PathBuf>, CssCompilationError> {
    let mut scss_paths = Vec::new();
    for entry in WalkDir::new(output_dir).follow_links(false) {
        let entry = entry.map_err(|source| CssCompilationError::Scan {
            path: output_dir.to_path_buf(),
            source,
        })?;
        let path = entry.path();
        if entry.file_type().is_file()
            && path
                .extension()
                .is_some_and(|extension| extension == "scss")
        {
            scss_paths.push(path.to_path_buf());
        }
    }
    scss_paths.sort();

    scss_paths
        .iter()
        .map(|scss_path| compile_scss_file(scss_path))
        .collect()
}

fn compile_scss_file(scss_path: &Path) -> Result<PathBuf, CssCompilationError> {
    let css = grass::from_path(scss_path, &SassOptions::default()).map_err(|source| {
        CssCompilationError::Compile {
            path: scss_path.to_path_buf(),
            source: *source,
        }
    })?;
    let css = minify_css(&css, scss_path)?;
    let css_path = scss_path.with_extension("css");
    fs::write(&css_path, css).map_err(|source| CssCompilationError::Write {
        path: css_path.clone(),
        source,
    })?;
    Ok(css_path)
}

fn minify_css(css: &str, scss_path: &Path) -> Result<String, CssCompilationError> {
    let parser_options = ParserOptions {
        filename: scss_path.display().to_string(),
        ..ParserOptions::default()
    };
    let mut stylesheet =
        StyleSheet::parse(css, parser_options).map_err(|error| CssCompilationError::Transform {
            path: scss_path.to_path_buf(),
            message: error.to_string(),
        })?;
    let queries = browserslist_queries(scss_path)?;
    let targets = Browsers::from_browserslist(queries.iter().map(String::as_str))
        .map_err(|error| CssCompilationError::Transform {
            path: scss_path.to_path_buf(),
            message: error.to_string(),
        })?
        .map_or_else(Targets::default, |browsers| Targets {
            browsers: Some(browsers),
            ..Targets::default()
        });
    stylesheet
        .minify(MinifyOptions {
            targets,
            ..MinifyOptions::default()
        })
        .map_err(|error| CssCompilationError::Transform {
            path: scss_path.to_path_buf(),
            message: error.to_string(),
        })?;
    stylesheet
        .to_css(PrinterOptions {
            minify: true,
            targets,
            ..PrinterOptions::default()
        })
        .map(|result| result.code)
        .map_err(|error| CssCompilationError::Transform {
            path: scss_path.to_path_buf(),
            message: error.to_string(),
        })
}

/// Loads output-local Browserslist queries, matching the nearest generated artifact root.
fn browserslist_queries(scss_path: &Path) -> Result<Vec<String>, CssCompilationError> {
    let mut directory = scss_path.parent();

    while let Some(current) = directory {
        let config_path = current.join(".browserslistrc");
        match fs::read_to_string(&config_path) {
            Ok(config) => {
                let queries = config
                    .lines()
                    .map(str::trim)
                    .filter(|line| !line.is_empty() && !line.starts_with('#'))
                    .map(str::to_owned)
                    .collect::<Vec<_>>();
                if !queries.is_empty() {
                    return Ok(queries);
                }
            }
            Err(error) if error.kind() == io::ErrorKind::NotFound => {}
            Err(error) => {
                return Err(CssCompilationError::Browserslist {
                    path: config_path,
                    source: error,
                });
            }
        }
        directory = current.parent();
    }

    Ok(vec!["defaults".to_owned()])
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::Path;
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::{CssCompilationError, compile_css_files};

    const AKROBAT_SCSS: &str = r##"// Font Face Mixin
@mixin fontFace($fontName, $fileName, $fontWeight, $fontStyle) {
  @font-face {
    font-family: "#{$fontName}";
    src: url("#{$fileName}.woff2") format("woff2"),
         url("#{$fileName}.woff") format("woff");
    font-weight: #{$fontWeight};
    font-style: #{$fontStyle};
    font-display: swap;
  }
}

// Normal
@include fontFace("Akrobat", "akrobat-regular", 400, "normal");
"##;

    const UBUNTU_MONO_SCSS: &str = r##"@mixin fontFace($fontName, $fileName, $fontWeight, $fontStyle) {
  @font-face {
    font-family: "#{$fontName}";
    src: url("#{$fileName}.woff2") format("woff2"),
         url("#{$fileName}.woff") format("woff");
    font-weight: #{$fontWeight};
    font-style: #{$fontStyle};
    font-display: swap;
  }
}

@include fontFace("Ubuntu Mono", "ubuntu-mono-nerd-font-regular", 400, "normal");
"##;

    #[test]
    fn compile_css_files_compiles_typescript_generated_scss_recursively() {
        let root = temporary_directory();
        let akrobat = root.join("akrobat/akrobat.scss");
        let ubuntu_mono = root.join("nested/ubuntu-mono/ubuntu-mono.scss");
        write_file(&akrobat, AKROBAT_SCSS);
        write_file(&ubuntu_mono, UBUNTU_MONO_SCSS);

        assert_eq!(
            compile_css_files(&root).expect("compile generated SCSS"),
            vec![
                root.join("akrobat/akrobat.css"),
                root.join("nested/ubuntu-mono/ubuntu-mono.css"),
            ]
        );
        assert_eq!(
            fs::read_to_string(root.join("akrobat/akrobat.css")).expect("read Akrobat CSS"),
            "@font-face{font-family:Akrobat;src:url(akrobat-regular.woff2)format(\"woff2\"),url(akrobat-regular.woff)format(\"woff\");font-weight:400;font-style:normal;font-display:swap}"
        );
        assert_eq!(
            fs::read_to_string(root.join("nested/ubuntu-mono/ubuntu-mono.css"))
                .expect("read Ubuntu Mono CSS"),
            "@font-face{font-family:Ubuntu Mono;src:url(ubuntu-mono-nerd-font-regular.woff2)format(\"woff2\"),url(ubuntu-mono-nerd-font-regular.woff)format(\"woff\");font-weight:400;font-style:normal;font-display:swap}"
        );
        remove_directory(root);
    }

    #[test]
    fn compile_css_files_reports_the_broken_scss_path() {
        let root = temporary_directory();
        let broken = root.join("fonts/broken.scss");
        write_file(&broken, ".broken { color: ; }");

        let error = compile_css_files(&root).expect_err("SCSS compilation must fail");

        assert!(matches!(error, CssCompilationError::Compile { .. }));
        assert!(error.to_string().contains(&broken.display().to_string()));
        remove_directory(root);
    }

    fn temporary_directory() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time after epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("nexus-webfont-css-{unique}"));
        fs::create_dir_all(&path).expect("create temporary directory");
        path
    }

    fn write_file(path: &Path, contents: &str) {
        fs::create_dir_all(path.parent().expect("file parent")).expect("create file parent");
        fs::write(path, contents).expect("write fixture");
    }

    fn remove_directory(path: std::path::PathBuf) {
        fs::remove_dir_all(path).expect("remove temporary directory");
    }
}
