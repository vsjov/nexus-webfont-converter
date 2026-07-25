//! Differential end-to-end validation against the committed TypeScript oracle.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use nexus_webfont_core::pipeline::{PipelineOptions, run_pipeline};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use walkdir::WalkDir;

#[test]
fn pipeline_matches_the_typescript_oracle_manifest() {
    let expected = read_oracle_manifest();
    let temporary_directory = TemporaryDirectory::new();
    let input = temporary_directory.path().join("input");
    let output = temporary_directory.path().join("output");
    copy_tree(&repository_root().join("fonts-sample/input"), &input);

    let report = run_pipeline(&input, &PipelineOptions::new(&output)).expect("run Rust pipeline");

    assert_eq!(expected.schema_version, 1);
    assert_eq!(expected.conversion.exit_code, 0);
    assert!(report.conversion.failures.is_empty());
    assert_eq!(
        report.conversion.results.len(),
        expected.source_fonts.len() * 2
    );
    assert_manifest_files(
        &expected.source_fonts,
        source_font_manifest_files(&input),
        true,
    );
    assert_manifest_files(&expected.artifacts, manifest_files(&output), false);
}

fn read_oracle_manifest() -> OracleManifest {
    serde_json::from_slice(
        &fs::read(repository_root().join("tests/compatibility/typescript-oracle-manifest.json"))
            .expect("read TypeScript oracle manifest"),
    )
    .expect("parse TypeScript oracle manifest")
}

fn assert_manifest_files(
    expected: &[OracleFile],
    actual: BTreeMap<String, ActualFile>,
    source_fonts: bool,
) {
    let mut expected_paths = expected
        .iter()
        .map(|file| file.path.as_str())
        .collect::<Vec<_>>();
    expected_paths.sort_unstable();
    let actual_paths = actual.keys().map(String::as_str).collect::<Vec<_>>();
    assert_eq!(actual_paths, expected_paths, "manifest paths");

    for expected_file in expected {
        let actual_file = actual
            .get(&expected_file.path)
            .unwrap_or_else(|| panic!("missing {}", expected_file.path));
        assert_eq!(
            actual_file.kind, expected_file.kind,
            "{} type",
            expected_file.path
        );

        if source_fonts || actual_file.kind == "text-or-license" {
            assert_eq!(
                actual_file.byte_length, expected_file.byte_length,
                "{} byte length",
                expected_file.path
            );
            assert_eq!(
                actual_file.sha256.as_deref(),
                expected_file.sha256.as_deref(),
                "{} SHA-256",
                expected_file.path
            );
        } else {
            // Compressed WOFF bytes vary between the Node and Rust codec backends.
            assert!(
                actual_file.byte_length > 0,
                "{} is empty",
                expected_file.path
            );
        }

        assert_eq!(
            actual_file.sfnt_tables.as_deref(),
            expected_file.sfnt_tables.as_deref(),
            "{} SFNT tables",
            expected_file.path
        );
        assert_eq!(
            actual_file.signature.as_deref(),
            expected_file.signature.as_deref(),
            "{} signature",
            expected_file.path
        );
        assert_eq!(
            actual_file.woff_tables.as_deref(),
            expected_file.woff_tables.as_deref(),
            "{} WOFF tables",
            expected_file.path
        );
        assert_eq!(
            actual_file.number_of_tables, expected_file.number_of_tables,
            "{} WOFF2 table count",
            expected_file.path
        );
    }
}

fn manifest_files(root: &Path) -> BTreeMap<String, ActualFile> {
    WalkDir::new(root)
        .min_depth(1)
        .into_iter()
        .map(|entry| entry.expect("walk fixture directory"))
        .filter(|entry| entry.file_type().is_file())
        .map(|entry| {
            let path = entry.path();
            let relative_path = path
                .strip_prefix(root)
                .expect("file is below manifest root")
                .to_string_lossy()
                .replace('\\', "/");
            (relative_path, manifest_file(path))
        })
        .collect()
}

fn source_font_manifest_files(root: &Path) -> BTreeMap<String, ActualFile> {
    manifest_files(root)
        .into_iter()
        .filter(|(_, file)| file.kind == "source-font")
        .collect()
}

fn manifest_file(path: &Path) -> ActualFile {
    let bytes = fs::read(path).unwrap_or_else(|error| panic!("read {}: {error}", path.display()));
    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    match extension.as_str() {
        "ttf" | "otf" => ActualFile {
            kind: "source-font",
            byte_length: bytes.len(),
            sha256: Some(sha256(&bytes)),
            sfnt_tables: Some(sfnt_tables(&bytes)),
            signature: None,
            woff_tables: None,
            number_of_tables: None,
        },
        "woff" => ActualFile {
            kind: "font",
            byte_length: bytes.len(),
            sha256: None,
            sfnt_tables: None,
            signature: Some(ascii_signature(&bytes)),
            woff_tables: Some(woff_tables(&bytes)),
            number_of_tables: None,
        },
        "woff2" => ActualFile {
            kind: "font",
            byte_length: bytes.len(),
            sha256: None,
            sfnt_tables: None,
            signature: Some(ascii_signature(&bytes)),
            woff_tables: None,
            number_of_tables: Some(read_u16(&bytes, 12)),
        },
        _ => ActualFile {
            kind: "text-or-license",
            byte_length: bytes.len(),
            sha256: Some(sha256(&bytes)),
            sfnt_tables: None,
            signature: None,
            woff_tables: None,
            number_of_tables: None,
        },
    }
}

fn sfnt_tables(bytes: &[u8]) -> Vec<OracleTable> {
    let number_of_tables = usize::from(read_u16(bytes, 4));
    (0..number_of_tables)
        .map(|index| table_at(bytes, 12 + index * 16, 4))
        .collect()
}

fn woff_tables(bytes: &[u8]) -> Vec<OracleTable> {
    let number_of_tables = usize::from(read_u16(bytes, 12));
    (0..number_of_tables)
        .map(|index| table_at(bytes, 44 + index * 20, 16))
        .collect()
}

fn table_at(bytes: &[u8], offset: usize, checksum_offset: usize) -> OracleTable {
    let tag = bytes
        .get(offset..offset + 4)
        .unwrap_or_else(|| panic!("missing table tag at offset {offset}"));
    OracleTable {
        tag: String::from_utf8_lossy(tag).into_owned(),
        checksum: read_u32(bytes, offset + checksum_offset),
    }
}

fn ascii_signature(bytes: &[u8]) -> String {
    String::from_utf8_lossy(
        bytes
            .get(..4)
            .expect("font artifact must contain a four-byte signature"),
    )
    .into_owned()
}

fn read_u16(bytes: &[u8], offset: usize) -> u16 {
    let values: [u8; 2] = bytes
        .get(offset..offset + 2)
        .unwrap_or_else(|| panic!("missing u16 at offset {offset}"))
        .try_into()
        .expect("u16 byte length");
    u16::from_be_bytes(values)
}

fn read_u32(bytes: &[u8], offset: usize) -> u32 {
    let values: [u8; 4] = bytes
        .get(offset..offset + 4)
        .unwrap_or_else(|| panic!("missing u32 at offset {offset}"))
        .try_into()
        .expect("u32 byte length");
    u32::from_be_bytes(values)
}

fn sha256(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn copy_tree(source: &Path, destination: &Path) {
    for entry in WalkDir::new(source) {
        let entry = entry.expect("walk source fixture");
        let relative_path = entry
            .path()
            .strip_prefix(source)
            .expect("source entry path");
        let destination_path = destination.join(relative_path);
        if entry.file_type().is_dir() {
            fs::create_dir_all(&destination_path).expect("create fixture directory");
        } else if entry.file_type().is_file() {
            fs::copy(entry.path(), &destination_path).expect("copy fixture file");
        }
    }
}

fn repository_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("repository root")
}

struct TemporaryDirectory(PathBuf);

impl TemporaryDirectory {
    fn new() -> Self {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time after epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "nexus-webfont-compat-{}-{unique}",
            std::process::id()
        ));
        fs::create_dir_all(&path).expect("create temporary directory");
        Self(path)
    }

    fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TemporaryDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OracleManifest {
    schema_version: u8,
    conversion: OracleConversion,
    source_fonts: Vec<OracleFile>,
    artifacts: Vec<OracleFile>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OracleConversion {
    exit_code: i32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OracleFile {
    path: String,
    #[serde(rename = "type")]
    kind: String,
    byte_length: usize,
    sha256: Option<String>,
    sfnt_tables: Option<Vec<OracleTable>>,
    signature: Option<String>,
    woff_tables: Option<Vec<OracleTable>>,
    number_of_tables: Option<u16>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
struct OracleTable {
    tag: String,
    checksum: u32,
}

#[derive(Debug)]
struct ActualFile {
    kind: &'static str,
    byte_length: usize,
    sha256: Option<String>,
    sfnt_tables: Option<Vec<OracleTable>>,
    signature: Option<String>,
    woff_tables: Option<Vec<OracleTable>>,
    number_of_tables: Option<u16>,
}
