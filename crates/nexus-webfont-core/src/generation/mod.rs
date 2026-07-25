//! SCSS and HTML artifact generation for converted font families.

mod css;
mod html;
mod scss;

pub use css::{CssCompilationError, compile_css_files};
pub use html::{
    PreviewGlyph, generate_font_preview_html, generate_html_for_dir, parse_scss_entries,
    regenerate_font_preview_html, render_html_preview,
};
pub use scss::{
    ScssFormat, generate_font_face_scss, generate_scss_for_dir, include_comment, render_scss,
    template_font_face_mixin,
};
