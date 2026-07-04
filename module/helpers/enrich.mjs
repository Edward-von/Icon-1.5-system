/**
 * enrich.mjs — Shared HTML-enrichment helper.
 *
 * In Foundry v13 the global `TextEditor` is deprecated; the correct path is
 * `foundry.applications.ux.TextEditor.implementation.enrichHTML`.
 */
export function enrichHTML(html) {
  return foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "", { async: true });
}

/**
 * escapeHTML — escape a string for safe insertion inside template-literal
 * HTML. Use this on any document name, user-editable label, or other
 * free-form text that gets interpolated into a string that ends up in
 * `innerHTML`, a DialogV2 `content`, or a ChatMessage `content` field.
 */
export function escapeHTML(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
