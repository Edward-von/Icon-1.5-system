/**
 * enrich.mjs — Shared HTML-enrichment helper.
 *
 * In Foundry v13 the global `TextEditor` is deprecated; the correct path is
 * `foundry.applications.ux.TextEditor.implementation.enrichHTML`.
 * After Foundry's own enrichment (links, rolls) the rule keywords in the text
 * get their hover tooltips (helpers/keywords.mjs).
 */
import { enrichRuleKeywords } from "./keywords.mjs";

export async function enrichHTML(html) {
  const out = await foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "", { async: true });
  try { return enrichRuleKeywords(out); }
  catch (err) { console.warn("[ICON | enrich] keyword enrichment failed", err); return out; }
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
  const { flavor, trigger, sections } = parseAbilitySections(description);
  const effect = sections.map(s => s.label === "Effect" ? s.text : `${s.label}: ${s.text}`).join(" ");
  return { flavor, trigger, effect };
}

/**
 * Labels the book uses to start a rules block inside an ability text. Matched
 * case-insensitively at a sentence start (or after an em dash / line break);
 * the first letter must be a capital so "…remove the mark: …" stays prose.
 * Canonical display form = each word capitalised ("Terrain effect" →
 * "Terrain Effect").
 */
const SECTION_LABELS = [
  "Effect", "Trigger", "Stance", "Refresh", "Mark", "Terrain Effect", "Summon Effect", "Summon",
  "Special Effect", "Special", "Object Effect", "Object", "Area Effect", "Charge", "Comeback",
  "Collide", "Slay", "Exceed", "Heroic", "Crit", "Finishing Blow", "Free Action", "Delay",
  "Gain Stance", "While in this stance", "In this stance", "Interrupt \\d", "Infuse (?:\\d+|X)",
  "Slay or Infuse \\d", "Talent", "Mastery",
];
const SECTION_RE = new RegExp(
  `(?:^|[.!?…)\\]]\\s+|—\\s*|>\\s*|\\n\\s*)(${SECTION_LABELS.join("|")}):\\s*`, "gi",
);

const _canonLabel = (raw) => raw.trim().replace(/\b[a-z]/g, c => c.toUpperCase());

/**
 * Parse an ability text into its book-layout blocks, in the order they are
 * written:
 *   "Flavour. Stance: … Refresh: … Effect: …"
 *   → { flavor: "Flavour.", trigger: "", sections: [{label:"Stance", text}, {label:"Refresh", …}, …] }
 * A leading "Trigger:" block (interrupt abilities) is pulled out into
 * `trigger`; a Trigger nested inside another block ("Interrupt 1: Trigger: …")
 * stays in that block's text. Unknown "Something:" prefixes are left in the
 * running text.
 *
 * @param {string} description  raw description (plain text or light HTML)
 * @returns {{ flavor: string, trigger: string, sections: Array<{label: string, text: string}> }}
 */
export function parseAbilitySections(description) {
  // Pack texts are plain; hand-edited ones may carry <p>/<br> wrappers — turn
  // those into whitespace so a label never ends up inside a half-open tag.
  const text = String(description ?? "").replace(/<\/?(?:p|br|div)\b[^>]*>/gi, " ").replace(/\s+/g, " ").trim();
  if (!text) return { flavor: "", trigger: "", sections: [] };

  const hits = [];
  SECTION_RE.lastIndex = 0;
  for (const m of text.matchAll(SECTION_RE)) {
    const label = m[1];
    if (label[0] !== label[0].toUpperCase()) continue;           // lowercase → prose, not a label
    const labelStart = m.index + m[0].indexOf(label);
    hits.push({ label: _canonLabel(label), labelStart, bodyStart: m.index + m[0].length });
  }

  const flavor = (hits.length ? text.slice(0, hits[0].labelStart) : text).trim();
  const sections = hits.map((h, i) => ({
    label: h.label,
    text:  text.slice(h.bodyStart, i + 1 < hits.length ? hits[i + 1].labelStart : undefined).trim(),
  })).filter(s => s.text);

  let trigger = "";
  if (sections[0]?.label === "Trigger") trigger = sections.shift().text;
  return { flavor, trigger, sections };
}

/** Human label for a foe/legend action cost key. */
const NPC_COST_LABELS = { "1action": "1 Action", "2actions": "2 Actions", "free": "Free" };

/**
 * Post a foe/legend action to chat (name, cost, tags, description,
 * hit/miss/area). Works for non-attack actions too — the card simply omits
 * the Hit/Miss lines when they are empty.
 * @param {Actor} actor
 * @param {{name:string, cost:string, tags?:string[], description?:string, hitEffect?:string, missEffect?:string, areaEffect?:string}} action
 */
export async function postNpcActionCard(actor, action) {
  const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const a = {
    name:        action?.name ?? "Action",
    cost:        NPC_COST_LABELS[action?.cost] ?? action?.cost ?? "",
    tags:        (action?.tags ?? []).filter(t => t && t.trim()),
    description: await enrichHTML(action?.description),
    hitEffect:   await enrichHTML(action?.hitEffect),
    missEffect:  await enrichHTML(action?.missEffect),
    areaEffect:  await enrichHTML(action?.areaEffect),
  };
  const content = await renderTemplate("systems/icon-system/templates/chat/foe-action-card.hbs", { a, foeName: actor?.name ?? "" });
  await ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content,
  });
}

/**
 * Post a foe/legend round action to chat (reuses the foe-action card layout,
 * with "Round N" as the cost badge).
 * @param {Actor} actor
 * @param {{name:string, roundNumber?:number, effect?:string, description?:string}} roundAction
 */
export async function postNpcRoundActionCard(actor, roundAction) {
  const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const rn = Number(roundAction?.roundNumber ?? 1);
  const a = {
    name:        roundAction?.name ?? "Round Action",
    cost:        rn > 1 ? `Round Action — Round ${rn}+` : "Round Action",
    tags:        [],
    description: await enrichHTML(roundAction?.description),
    effect:      await enrichHTML(roundAction?.effect),
  };
  const content = await renderTemplate("systems/icon-system/templates/chat/foe-action-card.hbs", { a, foeName: actor?.name ?? "" });
  await ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content,
  });
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
