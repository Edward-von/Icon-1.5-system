/**
 * enrich.mjs — Shared HTML-enrichment helper.
 *
 * In Foundry v13 the global `TextEditor` is deprecated; the correct path is
 * `foundry.applications.ux.TextEditor.implementation.enrichHTML`.
 * After Foundry's own enrichment (links, rolls) the rule keywords in the text
 * get their hover tooltips (helpers/keywords.mjs).
 */
import { enrichRuleKeywords } from "./keywords.mjs";

/**
 * @param {string} html
 * @param {object} [options]
 * @param {boolean} [options.keywords=true]  false = skip the rule-keyword
 *   tooltips. Used for an ability's flavour line: it is narrative prose
 *   ("send your target flying"), not rules, so its words must not look like
 *   keywords.
 */
export async function enrichHTML(html, { keywords = true } = {}) {
  const out = await foundry.applications.ux.TextEditor.implementation.enrichHTML(formatRollTables(html), { async: true });
  if (!keywords) return out;
  try { return enrichRuleKeywords(out); }
  catch (err) { console.warn("[ICON | enrich] keyword enrichment failed", err); return out; }
}

/**
 * Turn a numbered d6 table written inline in a plain rules text
 * ("…gamble. 1. Card explodes… 2. All characters… 3. …") into one row per
 * result, as the book prints it (Monogatari p.179, Chaos Tarot p.201, the
 * foes' gamble actions). Pack texts store the table as one run-on line.
 *
 * Only plain texts are touched (hand-edited HTML keeps its own markup), and
 * only when results 1, 2 and 3 are all found in order. The rows are spans
 * (shown as block rows by CSS) because the text sits inside a <p>/<span> on
 * the sheet and in chat, where a list element is not allowed.
 * @param {string} text
 * @returns {string}
 */
export function formatRollTables(text) {
  const src = String(text ?? "");
  if (!src || /<[a-z][^>]*>/i.test(src)) return src;
  // Result k: "k. " after a space (or at the start), not immediately followed
  // by another "k. " — "is shoved 2. 2. Lantern" (Shopkeep) is the end of
  // result 1 followed by result 2. Result 1 must also start a sentence.
  const find = (k, from) => {
    const re = new RegExp(`(^|${k === 1 ? "[.:!?]" : ""}\\s+)${k}\\.\\s+(?!${k}\\.\\s)`, "g");
    re.lastIndex = from;
    const m = re.exec(src);
    return m ? { at: m.index + m[1].length, body: m.index + m[0].length } : null;
  };
  const marks = [];
  for (let k = 1, from = 0; ; k++) {
    const m = find(k, from);
    if (!m) break;
    marks.push(m);
    from = m.body;
  }
  if (marks.length < 3) return src;

  const rows = marks.map((m, i) => {
    let body = src.slice(m.body, marks[i + 1]?.at ?? src.length).trim();
    // A short name before ":" or " - " ("A Tale of Fury: …", "Earth - …") is the result's title
    const t = body.match(/^([^:.]{1,45}?)(:|\s[-–—]\s)\s*/);
    if (t) body = `<b class="icon-roll-table__title">${t[1]}${t[2].trim() === ":" ? ":" : ` ${t[2].trim()}`}</b> ${body.slice(t[0].length)}`;
    return `<span class="icon-roll-table__row"><span class="icon-roll-table__num">${i + 1}</span>`
         + `<span class="icon-roll-table__text">${body}</span></span>`;
  });
  return `${src.slice(0, marks[0].at).trim()}<span class="icon-roll-table">${rows.join("")}</span>`;
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
export async function postNpcTraitCard(actor, trait, { label, statusHtml = "" } = {}) {
  const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const tr = {
    name:        trait?.name ?? "Trait",
    jobName:     label ?? actor?.name ?? "",
    class:       "",
    chapter:     null,
    description: await enrichHTML(trait?.description),
    // Inflict / Gain / Effects block read from the trait text (ability-statuses.mjs)
    statusHtml,
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
 * Canonical display form = each word capitalised except small words
 * ("Terrain effect" → "Terrain Effect", "While in this stance" → "While in this Stance").
 */
export const SECTION_LABELS = [
  // Long "end your turn and …" forms first: the book prints them as one label
  // (Eclipse, Morrigan, Six Hells Trigram, Intimidate).
  "End your turn and (?:gain|create) (?:a )?(?:Delay|Terrain Effect|Stance)", "End your turn and Mark",
  "Gain Delay",
  "Effect", "Trigger", "Stance", "Refresh", "Mark", "Terrain Effect", "Summon Effect", "Summon",
  "Special Effect", "Special", "Object Effect", "Object", "Area Effect", "Charge", "Comeback",
  "Collide", "Slay", "Exceed", "Heroic", "Crit", "Finishing Blow", "Free Action", "Delay",
  "Gain Stance", "While in this stance", "In this stance", "Interrupt \\d", "Infuse (?:\\d+|X)",
  // The book writes the pair both ways round: "Slay or Infuse 3" (Blitz,
  // Nothung) and "Infuse 3 or Slay" (Drifting Leaf, p.227).
  "Slay or Infuse \\d", "Infuse \\d or Slay", "Talent", "Mastery",
];
const SECTION_RE = new RegExp(
  `(?:^|[.!?…)\\]]\\s+|—\\s*|>\\s*|\\n\\s*)(${SECTION_LABELS.join("|")}):\\s*`, "gi",
);

/** Words kept lowercase inside a multi-word label ("End your turn and gain Delay"). */
const _SMALL_WORDS = new Set(["a", "an", "and", "in", "or", "the", "this", "your", "turn", "gain", "create"]);
const _canonLabel = (raw) => raw.trim().replace(/\b[a-zA-Z]+/g, (w, i) =>
  (i > 0 && _SMALL_WORDS.has(w.toLowerCase())) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1));

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
  const all = hits.map((h, i) => ({
    label: h.label,
    text:  text.slice(h.bodyStart, i + 1 < hits.length ? hits[i + 1].labelStart : undefined).trim(),
  }));
  // A granted interrupt is printed "Spirit Away — Interrupt 2: Trigger: …"
  // (Fairy Ring p.187, Gran Reversa, Drifting Leaf): its name sits before the
  // label, so it was left dangling at the end of the previous block. Move it
  // onto the interrupt's own label ("Spirit Away — Interrupt 2").
  for (let i = 1; i < all.length; i++) {
    if (!/^Interrupt \d/.test(all[i].label)) continue;
    const m = all[i - 1].text.match(/\s*\b([A-Z][A-Za-z' ]{0,40}?)\s*[—–]$/);
    if (!m) continue;
    all[i - 1].text = all[i - 1].text.slice(0, m.index).trim();
    all[i].label = `${m[1]} — ${all[i].label}`;
  }
  const sections = all.filter(s => s.text);

  let trigger = "";
  if (sections[0]?.label === "Trigger") trigger = sections.shift().text;
  return { flavor, trigger, sections };
}

/**
 * Enrich a whole ability description (item sheet), leaving the leading
 * flavour line without rule-keyword tooltips: only the rules blocks after it
 * get them. Hand-edited HTML descriptions are enriched as before, so their
 * markup is never rebuilt.
 * @param {string} description
 * @returns {Promise<string>}
 */
export async function enrichAbilityDescription(description) {
  const raw = String(description ?? "");
  if (/<[a-z][^>]*>/i.test(raw)) return enrichHTML(raw);
  const { flavor } = parseAbilitySections(raw);
  if (!flavor) return enrichHTML(raw);
  const text = raw.replace(/\s+/g, " ").trim();
  const rest = text.slice(flavor.length).trim();
  const head = await enrichHTML(flavor, { keywords: false });
  return rest ? `${head} ${await enrichHTML(rest)}` : head;
}

/** Human label for a foe/legend action cost key. */
const NPC_COST_LABELS = { "1action": "1 Action", "2actions": "2 Actions", "free": "Free" };

/** Human label for a PC ability cost key ("2actions" → "2 Actions", "interrupt-1" → "Interrupt 1"). */
export function abilityCostLabel(cost) {
  const key = String(cost ?? "").trim();
  if (!key) return "";
  const m = key.match(/^interrupt-(\d)$/);
  if (m) return `Interrupt ${m[1]}`;
  return { "1action": "1 Action", "2actions": "2 Actions", "free": "Free Action" }[key] ?? key;
}

/**
 * Post a foe/legend action to chat (name, cost, tags, description,
 * hit/miss/area). Works for non-attack actions too — the card simply omits
 * the Hit/Miss lines when they are empty.
 * @param {Actor} actor
 * @param {{name:string, cost:string, tags?:string[], description?:string, hitEffect?:string, missEffect?:string, areaEffect?:string}} action
 */
export async function postNpcActionCard(actor, action, { statusHtml = "" } = {}) {
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
  const content = await renderTemplate("systems/icon-system/templates/chat/foe-action-card.hbs", { a, foeName: actor?.name ?? "", statusHtml });
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
export async function postNpcRoundActionCard(actor, roundAction, { statusHtml = "" } = {}) {
  const renderTemplate = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
  const rn = Number(roundAction?.roundNumber ?? 1);
  const a = {
    name:        roundAction?.name ?? "Round Action",
    cost:        rn > 1 ? `Round Action — Round ${rn}+` : "Round Action",
    tags:        [],
    description: await enrichHTML(roundAction?.description),
    effect:      await enrichHTML(roundAction?.effect),
  };
  const content = await renderTemplate("systems/icon-system/templates/chat/foe-action-card.hbs", { a, foeName: actor?.name ?? "", statusHtml });
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
export async function postNpcInterruptCard(actor, interrupt, { statusHtml = "" } = {}) {
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
  const content = await renderTemplate("systems/icon-system/templates/chat/foe-action-card.hbs", { a, foeName: actor?.name ?? "", statusHtml });
  await ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content,
  });
}
