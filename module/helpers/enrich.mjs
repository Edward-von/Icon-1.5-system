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

/**
 * Split an ability's `description` into its book-layout pieces. Pack data
 * stores the flavour line, the (interrupt) trigger and the "Effect:" rules
 * text in ONE field, e.g.
 *   "Fill the air with blades. Effect: You may rush 1, then …"
 *   "Better get your sea legs. Trigger: A foe damages you… Effect: After …"
 * The rulebook prints Effect AFTER the Attack/Area lines (and Trigger before
 * everything), so the sheet/chat card need the pieces separately.
 *
 * "Effect:" is only recognised at the start of a sentence — "Area Effect:",
 * "Terrain Effect:", "Summon Effect:", "Special Effect:" stay in the text
 * they belong to. Later "Effect:" repetitions remain inside `effect`
 * (mirrors the book, which lists several Effect lines).
 *
 * @param {string} description  raw description
 * @returns {{ flavor: string, trigger: string, effect: string }}
 */
export function splitAbilityDescription(description) {
  const text = (description ?? "").trim();
  if (!text) return { flavor: "", trigger: "", effect: "" };

  const effectMatch = /(?:^|[.!?…:]\s+|—\s*)Effect:\s*/.exec(text);
  let head   = effectMatch ? text.slice(0, effectMatch.index + (effectMatch[0].startsWith("Effect") ? 0 : 1)) : text;
  let effect = effectMatch ? text.slice(effectMatch.index + effectMatch[0].length) : "";

  let trigger = "";
  const triggerMatch = /(?:^|\s)Trigger:\s*/.exec(head);
  if (triggerMatch) {
    trigger = head.slice(triggerMatch.index + triggerMatch[0].length);
    head    = head.slice(0, triggerMatch.index);
  }
  return { flavor: head.trim(), trigger: trigger.trim(), effect: effect.trim() };
}

/**
 * Post a foe/legend interrupt to chat (reuses the foe-action card layout).
 * @param {Actor} actor
 * @param {{name:string, limit:number, trigger:string, effect:string, description?:string}} interrupt
 */
export async function postNpcInterruptCard(actor, interrupt) {
  const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const limit = Number(interrupt?.limit ?? 1);
  const a = {
    name:        interrupt?.name ?? "Interrupt",
    cost:        limit > 0 ? `Interrupt ${limit}` : "Interrupt",
    tags:        [],
    trigger:     await enrichHTML(interrupt?.trigger),
    description: await enrichHTML(interrupt?.description),
    effect:      await enrichHTML(interrupt?.effect),
  };
  const content = await renderTemplate("systems/icon-system/templates/chat/foe-action-card.hbs", { a, foeName: actor?.name ?? "" });
  await ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content,
  });
}
