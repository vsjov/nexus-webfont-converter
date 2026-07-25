//! Swappable WOFF encoder boundary.

use thiserror::Error;

use crate::domain::OutputFormat;

/// Failures returned by the webfont codec backend.
#[derive(Debug, Error)]
pub enum CodecError {
    /// The source data could not be converted to the requested container.
    #[error("failed to encode {format:?}: {message}")]
    Encode {
        /// Requested webfont format.
        format: OutputFormat,
        /// Backend error text.
        message: String,
    },
    /// The encoded data could not be decoded for validation.
    #[error("failed to decode {format:?}: {message}")]
    Decode {
        /// Encoded webfont format.
        format: OutputFormat,
        /// Backend error text.
        message: String,
    },
}

/// Encodes an SFNT font as WOFF or WOFF2 without filesystem side effects.
pub fn encode_font(source: &[u8], format: OutputFormat) -> Result<Vec<u8>, CodecError> {
    match format {
        OutputFormat::Woff => {
            oxifont_webfont::encode_woff1(source).map_err(|error| CodecError::Encode {
                format,
                message: error.to_string(),
            })
        }
        OutputFormat::Woff2 => {
            oxifont_webfont::encode_woff2(source).map_err(|error| CodecError::Encode {
                format,
                message: error.to_string(),
            })
        }
    }
}

/// Decodes a WOFF or WOFF2 container to SFNT bytes for validation.
pub fn decode_font(encoded: &[u8], format: OutputFormat) -> Result<Vec<u8>, CodecError> {
    match format {
        OutputFormat::Woff => {
            oxifont_webfont::decode_woff1(encoded).map_err(|error| CodecError::Decode {
                format,
                message: error.to_string(),
            })
        }
        OutputFormat::Woff2 => {
            oxifont_webfont::decode_woff2(encoded).map_err(|error| CodecError::Decode {
                format,
                message: error.to_string(),
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use serde::Deserialize;

    use super::{decode_font, encode_font};
    use crate::domain::OutputFormat;

    const UBUNTU_MONO: &[u8] = include_bytes!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../fonts-sample/input/ubuntu-mono/UbuntuMonoNerdFont-Regular.ttf"
    ));
    const AKROBAT: &[u8] = include_bytes!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../fonts-sample/input/akrobat/Akrobat-Regular.otf"
    ));

    #[test]
    fn encode_font_round_trips_committed_ttf_and_cff_fixtures() {
        for (name, source) in [("Ubuntu Mono", UBUNTU_MONO), ("Akrobat", AKROBAT)] {
            for (format, signature) in [
                (OutputFormat::Woff, b"wOFF".as_slice()),
                (OutputFormat::Woff2, b"wOF2".as_slice()),
            ] {
                let encoded = encode_font(source, format).unwrap_or_else(|error| {
                    panic!("{name} {format:?} encoding failed: {error}");
                });
                assert!(
                    encoded.starts_with(signature),
                    "{name} {format:?} signature"
                );
                let decoded = decode_font(&encoded, format).unwrap_or_else(|error| {
                    panic!("{name} {format:?} decoding failed: {error}");
                });
                assert_eq!(
                    comparable_sfnt_directory(&decoded, format),
                    comparable_sfnt_directory(source, format),
                    "{name} {format:?} tables"
                );
            }
        }
    }

    #[test]
    fn encode_font_rejects_truncated_input() {
        for format in [OutputFormat::Woff, OutputFormat::Woff2] {
            assert!(encode_font(&[0, 1, 2], format).is_err());
        }
    }

    #[test]
    fn encode_font_matches_typescript_woff_table_manifests() {
        let manifest: OracleManifest = serde_json::from_str(
            &fs::read_to_string(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/../../tests/compatibility/typescript-oracle-manifest.json"
            ))
            .expect("read TypeScript oracle manifest"),
        )
        .expect("parse TypeScript oracle manifest");
        let expected_tables = manifest
            .artifacts
            .into_iter()
            .filter_map(|artifact| artifact.woff_tables.map(|tables| (artifact.path, tables)))
            .collect::<std::collections::BTreeMap<_, _>>();

        for (source_path, output_path, source) in [
            (
                "akrobat/Akrobat-Regular.otf",
                "akrobat/akrobat-regular.woff",
                AKROBAT,
            ),
            (
                "ubuntu-mono/UbuntuMonoNerdFont-Regular.ttf",
                "ubuntu-mono/ubuntu-mono-nerd-font-regular.woff",
                UBUNTU_MONO,
            ),
        ] {
            let expected = expected_tables
                .get(output_path)
                .unwrap_or_else(|| panic!("missing oracle artifact for {source_path}"));
            let encoded = encode_font(source, OutputFormat::Woff).expect("encode WOFF");

            assert_eq!(
                woff_directory(&encoded),
                *expected,
                "{source_path} WOFF tables"
            );
        }
    }

    fn comparable_sfnt_directory(font: &[u8], format: OutputFormat) -> Vec<([u8; 4], Option<u32>)> {
        let number_of_tables = usize::from(u16::from_be_bytes([font[4], font[5]]));
        (0..number_of_tables)
            .map(|index| {
                let start = 12 + (index * 16);
                let tag = font[start..start + 4].try_into().expect("four-byte tag");
                let checksum =
                    u32::from_be_bytes(font[start + 4..start + 8].try_into().expect("checksum"));
                // checkSumAdjustment is recomputed when an SFNT is rebuilt.
                // WOFF2 also transforms TrueType glyph data, which can change
                // loca padding while preserving glyph offsets and outlines.
                let is_reconstructed_table =
                    tag == *b"head" || (format == OutputFormat::Woff2 && tag == *b"loca");
                (tag, (!is_reconstructed_table).then_some(checksum))
            })
            .collect()
    }

    fn woff_directory(font: &[u8]) -> Vec<OracleTable> {
        let number_of_tables = usize::from(u16::from_be_bytes([font[12], font[13]]));
        (0..number_of_tables)
            .map(|index| {
                let start = 44 + (index * 20);
                OracleTable {
                    tag: String::from_utf8_lossy(&font[start..start + 4]).into_owned(),
                    checksum: u32::from_be_bytes(
                        font[start + 16..start + 20].try_into().expect("checksum"),
                    ),
                }
            })
            .collect()
    }

    #[derive(Debug, Deserialize)]
    struct OracleManifest {
        artifacts: Vec<OracleArtifact>,
    }

    #[derive(Debug, Deserialize)]
    struct OracleArtifact {
        path: String,
        #[serde(rename = "woffTables")]
        woff_tables: Option<Vec<OracleTable>>,
    }

    #[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
    struct OracleTable {
        tag: String,
        checksum: u32,
    }
}
