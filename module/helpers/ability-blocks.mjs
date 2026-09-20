/**
 * ability-blocks.mjs — the ordered list of rules blocks shown for an ability.
 *
 * The book prints an ability as flavour text followed by labelled blocks
 * ("Hit:", "Miss:", "Area Effect:", "Effect:", "Charge or Heroic:", …) in a
 * meaningful order. Our data splits some of those blocks into their own fields
 * (hitEffect, missEffect, areaEffect, chargeEffect…) while the rest stay inline
 * in `description` and are parsed out by parseAbilitySections(). The written
 * order between the two groups is therefore lost, and the sheet panel and chat
 * card used to re-invent it with a hardcoded sequence — which put "Effect:"
 * after the attack lines for every ability and, for non-attacks, put "Area"
 * after "Effect" (Comet, p.128, prints Area Effect first).
 *
 * This module rebuilds that list in one place:
 *   - DEFAULT_ORDER follows the book's usual layout;
 *   - `system.blockOrder` overrides it per ability (comma-separated keys, the
 *     listed ones first, the rest keeping the default order behind them);
 *   - adjacent blocks with identical text merge into the book's "or" wording
 *     ("Miss or Area: fray", "Charge or Heroic: Rush 3").
 */

import { SECTION_LABELS } from "./enrich.mjs";
import { explainTag } from "./rule-tooltips.mjs";

/** Field-backed blocks: key → { field on system, label printed in the book }. */
export const ABILITY_BLOCK_FIELDS = {
  hit:      { field: "hitEffect",           label: "Hit" },
  miss:     { field: "missEffect",          label: "Miss" },
  area:     { field: "areaEffect",          label: "Area" },
  charge:   { field: "chargeEffect",        label: "Charge" },
  heroic:   { field: "heroicEffect",        label: "Heroic" },
  exceed:   { field: "exceedEffect",        label: "Exceed (15+)" },
  collide:  { field: "collideEffect",       label: "Collide" },
  slay:     { field: "slayEffect",          label: "Slay" },
  crit:     { field: "critEffect",          label: "Crit" },
  finish:   { field: "finishingBlowEffect", label: "Finishing Blow" },
  comeback: { field: "comebackEffect",      label: "Comeback" },
};

/**
 * Default block order. "sections" is the placeholder for every "Label:" block
 * parsed out of the description, kept in the order they are written.
 */
export const DEFAULT_BLOCK_ORDER = [
  "hit", "miss", "area", "sections",
  "charge", "heroic", "exceed", "collide", "slay", "crit", "finish", "comeback",
];

/** All the tokens `system.blockOrder` accepts, for the item sheet's hint. */
export const BLOCK_ORDER_KEYS = DEFAULT_BLOCK_ORDER;

/**
 * Resolve the order of the block tokens for one ability. A token is either a
 * key of ABILITY_BLOCK_FIELDS, the word "sections" (every description block
 * not named on its own), or the label of a single description block
 * ("effect", "terrain effect", "stance") for the abilities the book
 * interleaves ("Area Effect: … Effect: … Area effect: …").
 *
 * @param {string} blockOrder  comma-separated tokens, "" for the default
 * @returns {string[]} the listed tokens first, then the default order behind them
 */
export function resolveBlockOrder(blockOrder) {
  const listed = String(blockOrder ?? "").toLowerCase().split(",")
    .map(k => k.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  if (!listed.length) return [...DEFAULT_BLOCK_ORDER];
  const seen = new Set(listed);
  return [...listed, ...DEFAULT_BLOCK_ORDER.filter(k => !seen.has(k))];
}

/** Strip tags/entities so two blocks written slightly differently still match. */
const _plain = (html) => String(html ?? "")
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();


/* -------------------------------------------------- */
/*  Combo text                                         */
/* -------------------------------------------------- */

/** Labels the combo text uses for a block we keep in a field of its own. */
const COMBO_FIELD_LABELS = [
  [/^(?:on\s+)?hit$/i,            "hit"],
  [/^(?:auto[\s-]?hit)$/i,        "hit"],
  [/^miss$/i,                     "miss"],
  [/^area(?:\s+effect)?$/i,       "area"],
  [/^charge$/i,                   "charge"],
  [/^heroic$/i,                   "heroic"],
  [/^exceed(?:\s*\(?\d*\+?\)?)?$/i, "exceed"],
  [/^collide$/i,                  "collide"],
  [/^slay$/i,                     "slay"],
  [/^crit(?:ical)?$/i,            "crit"],
  [/^finishing\s+blow$/i,         "finish"],
  [/^comeback$/i,                 "comeback"],
];

/** Every label a combo text can start a block with, longest first. */
const COMBO_LABEL_RE = new RegExp(
  String.raw`(?:^|[.!?…)\]]\s+|—\s*|-\s+|\n\s*)(` +
  ["On hit", "Auto[\s-]?hit", "Hit", "Miss", "Area effect", "Area", ...SECTION_LABELS].join("|") +
  String.raw`):\s*`, "gi");

/**
 * Split a combo text into the name of the combo version, the sentence that
 * modifies the whole ability, and the blocks it rewrites.
 *
 *   "The Hook: Gains range 2 and effect: Shove character 1 towards you."
 *     → { name: "The Hook", lead: "Gains range 2 and effect: …", blocks: [] }
 *   "REAP — Attack: On hit: [D]+fray. Miss: Fray. Effect: Summon a Thrall…"
 *     → { name: "REAP", lead: "", blocks: [hit, miss, Effect] }
 */
export function parseComboText(comboText) {
  let text = String(comboText ?? "").replace(/<\/?(?:p|br|div)\b[^>]*>/gi, " ").replace(/\s+/g, " ").trim();
  if (!text) return { name: "", lead: "", blocks: [] };

  // "REAP — …" / "The Hook: …" — the book names the combo version first.
  let name = "";
  const dash = text.match(/^([A-Z][A-Za-z' -]{1,28}?)\s*[—–]\s*/);
  const colon = text.match(/^([A-Z][A-Za-z' -]{1,28}?):\s+(?=[A-Z])/);
  if (dash) { name = dash[1].trim(); text = text.slice(dash[0].length); }
  else if (colon && !COMBO_FIELD_LABELS.some(([re]) => re.test(colon[1])) 
           && !SECTION_LABELS.some(l => new RegExp(`^${l}$`, "i").test(colon[1]))) {
    name = colon[1].trim(); text = text.slice(colon[0].length);
  }

  // "Attack:" only introduces the attack lines that follow it.
  text = text.replace(/\bAttack:\s*/gi, "");

  const hits = [];
  COMBO_LABEL_RE.lastIndex = 0;
  for (const m of text.matchAll(COMBO_LABEL_RE)) {
    const label = m[1];
    hits.push({ label, labelStart: m.index + m[0].indexOf(label), bodyStart: m.index + m[0].length });
  }
  const lead = (hits.length ? text.slice(0, hits[0].labelStart) : text).trim();
  const blocks = hits.map((h, i) => {
    const body = text.slice(h.bodyStart, i + 1 < hits.length ? hits[i + 1].labelStart : undefined).trim();
    const key  = COMBO_FIELD_LABELS.find(([re]) => re.test(h.label))?.[1] ?? "";
    return { key, label: _canonComboLabel(h.label), text: body };
  }).filter(b => b.text);
  return { name, lead, blocks };
}

/** "on hit" → "Hit", "area effect" → "Area", anything else title-cased as written. */
function _canonComboLabel(raw) {
  const key = COMBO_FIELD_LABELS.find(([re]) => re.test(raw.trim()))?.[1];
  if (key) return ABILITY_BLOCK_FIELDS[key].label;
  return raw.trim().replace(/\b[a-z]/g, c => c.toUpperCase());
}

/**
 * Build the ordered blocks of an ability, ready for the templates.
 *
 * With `comboText` the combo version is MERGED into the ability instead of
 * replacing it: the blocks the combo rewrites take its wording, the blocks it
 * doesn't mention stay as they are, and a modifier sentence ("Gains range 2…",
 * "+1 boon") rides on top as its own line. Combo abilities like Low Blow / The
 * Hook only write the addition, so printing the combo text alone lost the
 * whole ability.
 *
 * @param {object} system                 the ability's system data (raw, not enriched)
 * @param {object} options
 * @param {Array<{label:string,text:string}>} options.sections  parsed description blocks
 * @param {(text:string) => Promise<string>} options.enrich     enrichHTML
 * @param {string} [options.comboText]    the combo version's text, when it is active
 * @returns {Promise<Array<{key:string,label:string,text:string,fromText:boolean,combo?:boolean}>>}
 */
export async function buildAbilityBlocks(system, { sections = [], enrich, comboText = "" } = {}) {
  const s = system ?? {};
  const out = [];

  const used = new Set();          // description blocks already placed
  const usedFields = new Set();    // field blocks already placed
  const pushSection = (sec, i) => {
    const text = String(sec.text ?? "").trim();
    used.add(i);
    if (text) out.push({ key: "section", label: sec.label, text, fromText: true });
  };

  for (const token of resolveBlockOrder(s.blockOrder)) {
    if (token === "sections") {
      sections.forEach((sec, i) => { if (!used.has(i)) pushSection(sec, i); });
      continue;
    }
    const def = ABILITY_BLOCK_FIELDS[token];
    if (def) {
      // A field holds one block: a key repeated in blockOrder prints once, at
      // its first position (the book repeats "On hit:" in two-part abilities).
      const text = String(s[def.field] ?? "").trim();
      if (text && !usedFields.has(token)) {
        usedFields.add(token);
        out.push({ key: token, label: def.label, text, fromText: false });
      }
      continue;
    }
    // A single description block named by its label — first one not used yet,
    // so "effect, area, effect" walks the two Effect blocks in order.
    const i = sections.findIndex((sec, idx) => !used.has(idx) && String(sec.label ?? "").toLowerCase() === token);
    if (i >= 0) pushSection(sections[i], i);
  }

  // Combo version: overwrite the blocks it rewrites, append the ones it adds,
  // and put its modifier sentence at the top.
  if (comboText) {
    const combo = parseComboText(comboText);
    for (const cb of combo.blocks) {
      const at = out.findIndex(b => (cb.key && b.key === cb.key)
                                 || (!cb.key && String(b.label).toLowerCase() === String(cb.label).toLowerCase() && !b.comboDone));
      if (at >= 0) out[at] = { ...out[at], text: cb.text, combo: true, comboDone: true };
      else out.push({ key: cb.key || "section", label: cb.label, text: cb.text, fromText: !cb.key, combo: true, comboDone: true });
    }
    if (combo.lead) {
      out.unshift({ key: "combo", label: `⚡ Combo${combo.name ? ` — ${combo.name}` : ""}`, text: combo.lead, fromText: true, combo: true });
    }
  }

  // "Miss or area effect: fray", "Charge or Heroic: Rush 3" — the book prints
  // one line when two blocks share the same text. Only field blocks merge;
  // a parsed section already carries its own (possibly "or") label.
  const merged = [];
  for (const block of out) {
    const prev = merged[merged.length - 1];
    if (prev && !prev.fromText && !block.fromText && !prev.combo === !block.combo
        && _plain(prev.text) === _plain(block.text)) {
      prev.label = `${prev.label} or ${block.label}`;
      prev.key   = `${prev.key}+${block.key}`;
      continue;
    }
    merged.push({ ...block });
  }

  if (enrich) for (const block of merged) block.text = await enrich(block.text);
  for (const block of merged) block.tooltip = blockLabelTooltip(block.label);
  return merged;
}

/**
 * The rule behind a block's label, for the tooltip on the heading.
 *
 * The keywords INSIDE a block's text are explained by keywords.mjs, but the
 * label itself is printed by the template and had no explanation — which is
 * awkward exactly where it matters most, on the trigger words: "Finishing
 * Blow" (the attack target is bloodied), "Comeback", "Charge", "Exceed".
 * Same source as the tag chips (rule-tooltips.mjs), so there is one text per
 * rule: "Exceed (15+)" → exceed, "Infuse 3" → infuse, "Miss or Area" → the
 * first half. Labels with no rule of their own (Hit, Miss, Effect) get "".
 *
 * @param {string} label
 * @returns {string} tooltip text, or "" when the label is not a rule
 */
export function blockLabelTooltip(label) {
  const first = String(label ?? "").split(" or ")[0];
  const key = first.toLowerCase().replace(/\(.*?\)/g, " ").trim().replace(/\s+/g, "-");
  if (!key) return "";
  return explainTag(key) ?? explainTag(key.replace(/-(?:\d+|x)$/, "")) ?? "";
}
