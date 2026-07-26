#![forbid(unsafe_code)]

//! Native command-line interface for the conversion and maintenance workflows.

mod progress;

use std::env;
use std::error::Error;
use std::fmt;
use std::io::IsTerminal;
use std::path::{Path, PathBuf};

use clap::Parser;
use nexus_webfont_core::discovery::scan_input_tree;
use nexus_webfont_core::filesystem::validate_output_root;
use nexus_webfont_core::generation::{compile_css_files, regenerate_font_preview_html};
use nexus_webfont_core::maintenance::{remove_unused_fonts, sync_output};
use nexus_webfont_core::pipeline::{PipelineOptions, run_pipeline_with_progress};

use crate::progress::NativeProgressRenderer;

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
        print!("{}", help_text(std::io::stdout().is_terminal()));
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

    println!(
        "\n{} {}",
        stdout_color("1", "nexus-webfont-converter"),
        stdout_color("2", &format!("v{}", env!("CARGO_PKG_VERSION")))
    );
    println!(
        "{}\n",
        stdout_color(
            "2",
            "Converter for desktop font files (TTF, OTF) to web font formats (WOFF, WOFF2)"
        )
    );

    let pipeline_options = PipelineOptions::new(&output);
    let input_scan = scan_input_tree(&input)?;
    let total = pipeline_total(&input_scan, pipeline_options.formats.len());
    let progress = NativeProgressRenderer::new(total, pipeline_options.worker_count);
    let report = run_pipeline_with_progress(&input, &pipeline_options, Some(&progress));
    progress.finish(if report.is_ok() { "Done" } else { "Failed" });
    let report = report?;
    for warning in &report.conversion.warnings {
        eprintln!("{} {warning}", stderr_color("33", "Warning:"));
    }
    println!(
        "Saved to: {}",
        stdout_color("35", &output.display().to_string())
    );
    Ok(())
}

fn stdout_color(code: &str, value: &str) -> String {
    color(code, value, std::io::stdout().is_terminal())
}

fn stderr_color(code: &str, value: &str) -> String {
    color(code, value, std::io::stderr().is_terminal())
}

fn color(code: &str, value: &str, enabled: bool) -> String {
    if enabled {
        format!("\x1b[{code}m{value}\x1b[0m")
    } else {
        value.to_owned()
    }
}

/// Formats the Node-compatible CLI help document for terminal or piped output.
fn help_text(color_enabled: bool) -> String {
    let bold = |value: &str| color("1", value, color_enabled);
    let dim = |value: &str| color("2", value, color_enabled);

    format!(
        "\n{} - Nexus Webfont Converter {}\n\n{}\n  wfc --in <input-dir> --out <output-dir>\n  wfc --out <output-dir> <maintenance-flag>\n\n{}\n  --in   {}\n  --out  {}\n         {}\n\n{} {}\n  --compile-css    {}\n  --recompile-html {}\n  --remove-unused  {}\n  --sync           {}\n\n{}\n  --native  {}\n\n{}\n  --version  {}\n  --help     {}\n\n{}\n  wfc --in ./fonts/source --out ./fonts/web\n  wfc --out ./fonts/web --compile-css\n  wfc --out ./fonts/web --sync\n\n",
        bold("wfc"),
        dim(&format!("v{}", env!("CARGO_PKG_VERSION"))),
        bold("Usage:"),
        bold("Options:"),
        dim("Path to the directory containing TTF/OTF font files (required for conversion)"),
        dim("Path to the output directory (required)"),
        dim("Cannot be empty, the same as --in, or a subfolder of --in."),
        bold("Maintenance flags"),
        dim("(only --out required, no --in needed):"),
        dim("Compile SCSS to minified CSS in the output directory"),
        dim("Re-generate HTML preview pages from existing SCSS entries"),
        dim("Delete .woff/.woff2 files not referenced in the SCSS"),
        dim("Run --compile-css, --recompile-html and --remove-unused in sequence"),
        bold("Engine:"),
        dim("Run the transitional Rust implementation through the wfc wrapper"),
        bold("Other:"),
        dim("Show version number"),
        dim("Show this help message"),
        bold("Examples:"),
    )
}

fn pipeline_total(
    scan: &nexus_webfont_core::discovery::InputTreeScan,
    format_count: usize,
) -> usize {
    1 + scan.font_files.len() * format_count
        + scan.license_files.len()
        + scan.generation_directories.len()
        + 1
        + scan.generation_directories.len()
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

    use super::{Cli, help_text, is_maintenance_mode};

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

    #[test]
    fn formats_node_compatible_help_without_terminal_colors() {
        assert_eq!(
            help_text(false),
            "\nwfc - Nexus Webfont Converter v1.2.0\n\nUsage:\n  wfc --in <input-dir> --out <output-dir>\n  wfc --out <output-dir> <maintenance-flag>\n\nOptions:\n  --in   Path to the directory containing TTF/OTF font files (required for conversion)\n  --out  Path to the output directory (required)\n         Cannot be empty, the same as --in, or a subfolder of --in.\n\nMaintenance flags (only --out required, no --in needed):\n  --compile-css    Compile SCSS to minified CSS in the output directory\n  --recompile-html Re-generate HTML preview pages from existing SCSS entries\n  --remove-unused  Delete .woff/.woff2 files not referenced in the SCSS\n  --sync           Run --compile-css, --recompile-html and --remove-unused in sequence\n\nEngine:\n  --native  Run the transitional Rust implementation through the wfc wrapper\n\nOther:\n  --version  Show version number\n  --help     Show this help message\n\nExamples:\n  wfc --in ./fonts/source --out ./fonts/web\n  wfc --out ./fonts/web --compile-css\n  wfc --out ./fonts/web --sync\n\n"
        );
    }

    #[test]
    fn formats_help_with_terminal_heading_and_description_colors() {
        let help = help_text(true);

        assert!(help.contains("\x1b[1mwfc\x1b[0m"));
        assert!(help.contains("\x1b[2mv1.2.0\x1b[0m"));
        assert!(help.contains("\x1b[2mShow this help message\x1b[0m"));
    }
}
