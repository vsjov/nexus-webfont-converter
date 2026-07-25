//! Font container encoding and validation primitives.

mod codec;
mod convert_directory;

pub use codec::{CodecError, decode_font, encode_font};
pub use convert_directory::{
    ConversionFailure, ConversionReport, ConversionResult, ConversionStatus, ConvertDirectoryError,
    ConvertDirectoryOptions, convert_fonts_in_dir,
};
