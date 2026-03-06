/**
 * Returns the comment label for a single `@include fontFace(...)` line,
 * matching the convention used in `ananda.scss`:
 * - 400 normal → `Normal`
 * - 400 italic → `Italic`
 * - other normal → weight label (e.g. `Bold`)
 * - other italic → weight label + ` Italic` (e.g. `Bold Italic`)
 */
export declare const includeComment: (weight: number, style: "normal" | "italic") => string;
export default includeComment;
//# sourceMappingURL=include-comment.d.ts.map