//! Font container encoding and validation primitives.

mod codec;

pub use codec::{CodecError, decode_font, encode_font};
