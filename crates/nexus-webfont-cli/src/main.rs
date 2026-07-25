#![forbid(unsafe_code)]

//! Native command-line interface for the conversion and maintenance workflows.

use std::env;
use std::error::Error;
use std::fmt;
use std::path::{Path, PathBuf};

use clap::{CommandFactory, Parser};
use nexus_webfont_core::filesystem::validate_output_root;
use nexus_webfont_core::generation::{compile_css_files, regenerate_font_preview_html};
use nexus_webfont_core::maintenance::{remove_unused_fonts, sync_output};
use nexus_webfont_core::pipeline::{PipelineOptions, run_pipeline};

/// Converts font directories and maintains generated webfont artifacts.
#[derive(Debug, Parser)]
#[command(
    name = "wfc",
    about = "Nexus Webfont Converter",
    disable_help_flag = true,
    disable_version_flag = true
)]
struct Cli {
    /// Path to the directory containing TTF/OTF font files.
    #[arg(long = "in", value_name = "INPUT_DIR")]
    input: Option<PathBuf>,

    /// Path to the output directory.
    #[arg(long = "out", value_name = "OUTPUT_DIR")]
    output: Option<PathBuf>,

    /// Compile SCSS to minified CSS in the output directory.
    #[arg(long)]
    compile_css: bool,

    /// Re-generate HTML preview pages from existing SCSS entries.
    #[arg(long)]
    recompile_html: bool,

    /// Delete WOFF and WOFF2 files not referenced in SCSS.
    #[arg(long)]
    remove_unused: bool,

    /// Run CSS compilation, HTML regeneration, and unused-font removal.
    #[arg(long)]
    sync: bool,

    /// Show the version number.
    #[arg(long)]
    version: bool,

    /// Show this help message.
    #[arg(long)]
    help: bool,
}

#[derive(Debug)]
struct CliError(String);

impl fmt::Display for CliError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

impl Error for CliError {}

/// Starts the native CLI.
fn main() {
    if let Err(error) = run() {
        eprintln!("Error: {error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), Box<dyn Error>> {
    let cli = Cli::parse();
    run_cli(cli)
}

fn run_cli(cli: Cli) -> Result<(), Box<dyn Error>> {
    if cli.version {
        println!("{}", env!("CARGO_PKG_VERSION"));
        return Ok(());
    }
    if cli.help || (cli.input.is_none() && cli.output.is_none()) {
        Cli::command().print_help()?;
        println!();
        return Ok(());
    }

    let output = cli.output.as_ref().ok_or_else(|| {
        Box::new(CliError(
            "--out is required. Use --help for usage information.".to_owned(),
        )) as Box<dyn Error>
    })?;
    let output = resolve_path(output)?;

    if is_maintenance_mode(&cli) {
        if cli.input.is_some() {
            eprintln!("Notice: --in is ignored when using maintenance flags.");
        }
        let output = validate_output_root(&output)?;
        run_maintenance(&cli, &output)?;
        return Ok(());
    }

    let input = cli.input.ok_or_else(|| {
        Box::new(CliError(
            "--in is required. Use --help for usage information.".to_owned(),
        )) as Box<dyn Error>
    })?;
    let input = resolve_path(&input)?;
    if !input.is_dir() {
        return Err(Box::new(CliError(format!(
            "Input directory does not exist: {}",
            input.display()
        ))));
    }

    let report = run_pipeline(&input, &PipelineOptions::new(&output))?;
    for warning in &report.conversion.warnings {
        eprintln!("Warning: {warning}");
    }
    println!("Saved to: {}", output.display());
    Ok(())
}

fn is_maintenance_mode(cli: &Cli) -> bool {
    cli.compile_css || cli.recompile_html || cli.remove_unused || cli.sync
}

fn run_maintenance(cli: &Cli, output: &Path) -> Result<(), Box<dyn Error>> {
    if cli.sync {
        sync_output(output)?;
        return Ok(());
    }
    if cli.compile_css {
        compile_css_files(output)?;
    }
    if cli.recompile_html {
        regenerate_font_preview_html(output)?;
    }
    if cli.remove_unused {
        remove_unused_fonts(output)?;
    }
    Ok(())
}

fn resolve_path(path: &Path) -> Result<PathBuf, Box<dyn Error>> {
    let path = expand_tilde(path)?;
    if path.is_absolute() {
        Ok(path)
    } else {
        Ok(env::current_dir()?.join(path))
    }
}

fn expand_tilde(path: &Path) -> Result<PathBuf, Box<dyn Error>> {
    let Some(path) = path.to_str() else {
        return Ok(path.to_path_buf());
    };
    if path == "~" {
        return home_directory();
    }
    if let Some(suffix) = path.strip_prefix("~/") {
        return Ok(home_directory()?.join(suffix));
    }
    Ok(PathBuf::from(path))
}

fn home_directory() -> Result<PathBuf, Box<dyn Error>> {
    env::var_os("HOME").map(PathBuf::from).ok_or_else(|| {
        Box::new(CliError(
            "cannot expand ~ because HOME is not set".to_owned(),
        )) as Box<dyn Error>
    })
}

#[cfg(test)]
mod tests {
    use clap::Parser;
    use clap::error::ErrorKind;

    use super::{Cli, is_maintenance_mode};

    #[test]
    fn parses_node_compatible_conversion_flags() {
        let cli = Cli::try_parse_from(["wfc", "--in", "fonts/in", "--out", "fonts/out"])
            .expect("parse conversion arguments");

        assert_eq!(
            cli.input.as_deref().unwrap(),
            std::path::Path::new("fonts/in")
        );
        assert_eq!(
            cli.output.as_deref().unwrap(),
            std::path::Path::new("fonts/out")
        );
        assert!(!is_maintenance_mode(&cli));
    }

    #[test]
    fn parses_combined_maintenance_flags() {
        let cli = Cli::try_parse_from([
            "wfc",
            "--out",
            "fonts/out",
            "--compile-css",
            "--recompile-html",
            "--remove-unused",
            "--sync",
        ])
        .expect("parse maintenance arguments");

        assert!(is_maintenance_mode(&cli));
    }

    #[test]
    fn rejects_unknown_flags() {
        let error = Cli::try_parse_from(["wfc", "--unknown"]).expect_err("reject unknown flag");

        assert_eq!(error.kind(), ErrorKind::UnknownArgument);
    }

    #[test]
    fn parses_explicit_help_and_version_flags() {
        let help = Cli::try_parse_from(["wfc", "--help"]).expect("parse help flag");
        let version = Cli::try_parse_from(["wfc", "--version"]).expect("parse version flag");

        assert!(help.help);
        assert!(version.version);
    }
}
