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

/**
 * Post an NPC (foe / legend / foe-ability item) trait to chat using the
 * shared trait card. `trait` is a plain `{ name, description }` object —
 * NPC traits are inline schema entries, not embedded Items. `actor` may be
 * null (compendium item view): the card then has no speaker actor.
 */
export async function postNpcTraitCard(actor, trait, { label } = {}) {
  const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const tr = {
    name:        trait?.name ?? "Trait",
    jobName:     label ?? actor?.name ?? "",
    class:       "",
    chapter:     null,
    description: await enrichHTML(trait?.description),
  };
  const content = await renderTemplate("systems/icon-system/templates/chat/trait-card.hbs", { tr });
  await ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content,
  });
}
