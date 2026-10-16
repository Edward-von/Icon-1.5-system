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

import { SECTION_LABELS, parseAbilitySections } from "./enrich.mjs";
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
  ["On hit", String.raw`Auto[\s-]?hit`, "Hit", "Miss", "Area effect", "Area", ...SECTION_LABELS].join("|") +
  String.raw`):\s*`, "gi");

/**
 * Split a combo text into the name of the combo version, the sentence that
 * modifies the whole ability, and the blocks it rewrites.
 *
 *   "The Hook: Gains range 2 and effect: Shove character 1 towards you."
 *     → { name: "The Hook", lead: "Gains range 2 and effect: …", blocks: [] }
 *   "REAP — Attack: On hit: [D]+fray. Miss: Fray. Effect: Summon a Thrall…"
 *     → { name: "REAP", lead: "", blocks: [hit, miss, Effect], whole: true }
 *
 * `whole` is true when the combo is a complete ability of its own. The book
 * (p.173: "you use the combo version instead") prints those under a name in
 * capitals ("Combo: CHARISM", "Combo: DEVIL HAND") with every block written
 * out again, so nothing of the base version carries over — not its Charge,
 * its Mark or its seal. The combos written as a change to the base ("The
 * Hook: Gains range 2 and effect: …", "Sweet Torment: As above, but…") have
 * a name in normal case and merge into the base instead.
 */
export function parseComboText(comboText) {
  let text = String(comboText ?? "").replace(/<\/?(?:p|br|div)\b[^>]*>/gi, " ").replace(/\s+/g, " ").trim();
  if (!text) return { name: "", lead: "", blocks: [], whole: false, drops: [], insteadOf: "" };

  // "REAP — …" / "The Hook: …" — the book names the combo version first.
  let name = "";
  const dash = text.match(/^([A-Z][A-Za-z' -]{1,28}?)\s*[—–]\s*/);
  const colon = text.match(/^([A-Z][A-Za-z' -]{1,28}?):\s+(?=[A-Z])/);
  if (dash) { name = dash[1].trim(); text = text.slice(dash[0].length); }
  else if (colon && !COMBO_FIELD_LABELS.some(([re]) => re.test(colon[1]))
           && !SECTION_LABELS.some(l => new RegExp(`^${l}$`, "i").test(colon[1]))) {
    name = colon[1].trim(); text = text.slice(colon[0].length);
  }
  const whole = !!dash && /[A-Z]/.test(name) && name === name.toUpperCase();

  // "Attack:" only introduces the attack lines that follow it.
  text = text.replace(/\bAttack:\s*/gi, "");
  // "As above, but replace the base effect with: …" (Sweet Torment) /
  // "Gains True Strike and replaces the base effect with: …" (Indignation):
  // the rest is the new Effect block, which takes the base Effect's place.
  text = text.replace(/^As above,?\s*but\s+/i, "")
             .replace(/\s*,?\s*(?:and\s+)?replaces?\s+the\s+base\s+effect\s+with:\s*/i, "\nEffect: ");
  // "Instead of the mark, gain Effect: …" (Succubus, p.164): the base block
  // named there goes away and the combo's own block takes its place. Only a
  // block label the book uses counts ("mark", "effect"…), and only when a
  // labelled block follows, so a sentence that merely says "instead" stays as written.
  const drops = [];
  if (!whole) {
    const m = text.match(/^Instead\s+of\s+(?:the\s+|your\s+)?([A-Za-z ]+?)\s*,\s*(?:gain\s+)?/i);
    const rest = m ? text.slice(m[0].length) : "";
    const isLabel = (l) => SECTION_LABELS.some(x => new RegExp(`^(?:${x})$`, "i").test(l))
                        || COMBO_FIELD_LABELS.some(([re]) => re.test(l));
    const next = rest.match(/^([A-Za-z ]+?):/);
    if (m && isLabel(m[1].trim()) && next && isLabel(next[1].trim())) {
      drops.push(m[1].trim().toLowerCase());
      text = rest;
    }
  }

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
  // "Teleport your foe up to 3 spaces towards you instead of teleporting
  // yourself." (Penumbra, p.162): a combo with no labelled block that says
  // what it does "instead of <doing>" rewrites the base block about that
  // action ("Effect: You may teleport 3 before the attack"), not the whole
  // ability. `insteadOf` is the verb's stem, matched against the base blocks.
  let insteadOf = "";
  if (!whole && !blocks.length && lead) {
    const m = lead.match(/\binstead\s+of\s+([a-z]{3,})ing\b/i);
    if (m) insteadOf = m[1].toLowerCase();
  }
  return { name, lead, blocks, whole, drops, insteadOf };
}

/**
 * True when the combo version is a complete ability that replaces the base one
 * (see parseComboText) — unless the ability's unlocked mastery gives both
 * versions at once (pass the ability's system data to check that).
 */
export function comboReplacesBase(comboText, system = null) {
  return parseComboText(comboText).whole && !masteryGainsBothEffects(system);
}

/**
 * True when the ability's unlocked mastery uses the base and the combo version
 * together: Dervish's BEACON OF HOPE "You can empower this ability to gain both
 * effects at once and automatically activate their charge effects" (p.178).
 * Read from the mastery text, so any mastery worded this way behaves the same.
 */
export function masteryGainsBothEffects(system) {
  const s = system ?? {};
  if (!s.isCombo || !s.masteryUnlocked || !String(s.comboEffect ?? "").trim()) return false;
  return /\bgain both effects\b/i.test(String(s.mastery ?? "").replace(/<[^>]+>/g, " "));
}

/**
 * The combo version's name as a title: the book prints it in capitals
 * ("DEVIL HAND" → "Devil Hand"); "" when the combo text names none.
 */
export function comboDisplayName(comboText) {
  const name = parseComboText(comboText).name;
  return name && name === name.toUpperCase()
    ? name.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, c => c.toUpperCase())
    : name;
}

/**
 * Card title of the combo version: "Devil Hand (God Hand combo)", or
 * "Low Blow (Combo)" when the combo text has no name of its own.
 */
export function comboTitle(baseName, comboText) {
  const name = comboDisplayName(comboText);
  return name ? `${name} (${baseName} combo)` : `${baseName} (Combo)`;
}

/* -------------------------------------------------- */
/*  Alternate combo from the mastery                   */
/* -------------------------------------------------- */

/**
 * The alternate combo version an unlocked mastery adds, read from the mastery
 * text: "Gain an alternate combo ability. You can choose this ability or Fleet
 * when you spend a token. Combo: FANTASIA (2 actions) — Effect: …" (Felicity,
 * p.177), "Gain an alternate combo action: REGROWTH — Mark: …" (Rot, p.186),
 * FISTS OF HEAVEN AND HELL (God Hand, p.192), GRAN JUDICATA (Justice, p.194).
 * The text comes back in the comboEffect format ("FANTASIA — 2 actions.
 * Effect: …"), so every reader of comboEffect handles it as a complete combo.
 * Its tags are the combo's own ones the alternate also has (the base tags,
 * or a tag its text names: "+1 boon"); Judgement's gamble is not Gran Judicata's.
 * @returns {{text:string, tags:string, name:string}|null}
 */
export function alternateCombo(system) {
  const s = system ?? {};
  if (!s.isCombo || !s.masteryUnlocked) return null;
  const plain = String(s.mastery ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const at = plain.search(/\balternate combo (?:ability|action)\b/i);
  if (at < 0) return null;
  const m = plain.slice(at).match(/(?:Combo:\s*)?\b([A-Z][A-Z' ]*[A-Z])\s*(?:\(([^)]*)\))?\s*[—–]\s*(.+)$/);
  if (!m) return null;
  const text = `${m[1].trim()} — ${m[2] ? `${m[2].trim()}. ` : ""}${m[3].trim()}`;
  const lower = text.toLowerCase();
  const base = new Set((s.tags ?? []).map(t => String(t ?? "").trim().toLowerCase()));
  const tags = String(s.comboTags ?? "").split(",").map(t => t.trim()).filter(Boolean)
    .filter(t => base.has(t.toLowerCase()) || lower.includes(t.toLowerCase().replace(/-/g, " ")))
    .join(", ");
  return { text, tags, name: comboDisplayName(text) };
}

/**
 * The ability data with the chosen combo version in comboEffect / comboTags:
 * the system itself for the normal combo, a view of it with the mastery's
 * alternate combo when `useAlternate` (and the mastery gives one). Every
 * reader of comboEffect (card, attack, damage, statuses, tags) then follows
 * the choice without knowing about it.
 */
export function withActiveCombo(system, useAlternate) {
  const alt = useAlternate ? alternateCombo(system) : null;
  if (!alt) return system;
  // defineProperties, not assignment: it shadows the data model's fields even if they are read-only.
  return Object.create(system, {
    comboEffect: { value: alt.text, enumerable: true },
    comboTags:   { value: alt.tags, enumerable: true },
  });
}

/* -------------------------------------------------- */
/*  Talent text on the attack card                     */
/* -------------------------------------------------- */

/** Trigger labels a talent can grant ("all versions of this ability gain Exceed: …"). */
const TALENT_LABELS = [
  [/^exceed$/i,         "exceed"],
  [/^slay$/i,           "slay"],
  [/^crit(?:ical)?$/i,  "crit"],
  [/^collide$/i,        "collide"],
  [/^finishing blow$/i, "finish"],
  [/^comeback$/i,       "comeback"],
  [/^(?:on )?hit$/i,    "hit"],
  [/^miss$/i,           "miss"],
];
const TALENT_LABEL_RE = /(?:\bgains?\s+|^|[.!?]\s+)(Exceed|Slay|Critical|Crit|Collide|Finishing Blow|Comeback|On hit|Hit|Miss)\s*:\s*/gi;
/** ", and all versions of this ability" left before the next "gain X:" */
const _trimTalentTail = (t) => String(t ?? "")
  .replace(/,?\s*(?:and\s+)?(?:all\s+versions?\s+of\s+(?:this|the)\s+ability|this\s+ability|it)?\s*$/i, "")
  .trim();

/**
 * Split the text of an unlocked talent into what the attack card shows.
 * Talents apply to every version of the ability (God Hand, p.192: "All
 * versions of this ability gain Exceed: …"), so the card of the base and of
 * the combo version both carry them:
 *   "All versions of this ability gain Exceed: Gain evasion …"
 *     → [{ key: "exceed", text: "Gain evasion …" }]
 *   "Increase teleports to 2, and all versions of this ability gain Slay: gain or lose a combo token."
 *     → [{ key: "", text: "Increase teleports to 2" }, { key: "slay", text: "gain or lose a combo token." }]
 * A talent with no trigger label comes back whole, as one block with key "".
 *
 * @param {string} talentText  raw talent text (may hold HTML)
 * @returns {Array<{key:string,label:string,text:string}>} label is the block's own ("Exceed (15+)"), "" for the rest
 */
export function talentAttackBlocks(talentText) {
  const text = String(talentText ?? "").replace(/<\/?(?:p|br|div)\b[^>]*>/gi, " ").replace(/\s+/g, " ").trim();
  if (!text) return [];
  const hits = [...text.matchAll(TALENT_LABEL_RE)].map(m => ({ label: m[1], start: m.index + (/^[.!?]/.test(m[0]) ? 1 : 0), bodyStart: m.index + m[0].length }));
  if (!hits.length) return [{ key: "", label: "", text }];
  const out = [];
  const rest = _trimTalentTail(text.slice(0, hits[0].start));
  if (rest) out.push({ key: "", label: "", text: rest });
  hits.forEach((h, i) => {
    const body = _trimTalentTail(text.slice(h.bodyStart, i + 1 < hits.length ? hits[i + 1].start : undefined));
    const key = TALENT_LABELS.find(([re]) => re.test(h.label))?.[1] ?? "";
    if (body) out.push({ key, label: key ? ABILITY_BLOCK_FIELDS[key].label : h.label, text: body });
  });
  return out;
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
  // and put its modifier sentence at the top. A complete combo ability keeps
  // nothing of the base blocks. A mastery that gives both versions at once
  // (Dervish, p.178) keeps the base blocks and adds the combo's after them,
  // labelled with the combo's name ("Dawn — Effect").
  if (comboText) {
    const combo = parseComboText(comboText);
    const both  = masteryGainsBothEffects(s);
    if (combo.whole && !both) out.length = 0;
    // "Instead of the mark, gain Effect: …": the named base block is dropped.
    if (!both && combo.drops.length) {
      for (let i = out.length - 1; i >= 0; i--) {
        const label = String(out[i].label ?? "").toLowerCase();
        if (combo.drops.includes(label) || combo.drops.includes(out[i].key)) out.splice(i, 1);
      }
    }
    // "… instead of teleporting yourself": the combo sentence replaces the
    // base block about that action; with no such block it rides on top as before.
    let lead = combo.lead;
    if (!both && combo.insteadOf) {
      const re = new RegExp(`\\b${combo.insteadOf}`, "i");
      const at = out.findIndex(b => re.test(_plain(b.text)));
      if (at >= 0) { out[at] = { ...out[at], text: lead, combo: true, comboDone: true }; lead = ""; }
    }
    for (const cb of combo.blocks) {
      if (both) {
        const name = comboDisplayName(comboText);
        out.push({ key: cb.key || "section", label: name ? `${name} — ${cb.label}` : cb.label, text: cb.text, fromText: true, combo: true, comboDone: true });
        continue;
      }
      const at = out.findIndex(b => (cb.key && b.key === cb.key)
                                 || (!cb.key && String(b.label).toLowerCase() === String(cb.label).toLowerCase() && !b.comboDone));
      if (at >= 0) out[at] = { ...out[at], text: cb.text, combo: true, comboDone: true };
      else out.push({ key: cb.key || "section", label: cb.label, text: cb.text, fromText: !cb.key, combo: true, comboDone: true });
    }
    if (lead) {
      // The card adds the bolt icon in front of every combo block, so the label doesn't carry one.
      const name = comboDisplayName(comboText);
      out.unshift({ key: "combo", label: `Combo${name ? ` — ${name}` : ""}`, text: lead, fromText: true, combo: true });
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
  // "Spirit Away — Interrupt 2" → the interrupt rule, not the interrupt's name
  const first = String(label ?? "").split(" or ")[0].replace(/^.*\s—\s(?=Interrupt\b)/, "");
  const key = first.toLowerCase().replace(/\(.*?\)/g, " ").trim().replace(/\s+/g, "-");
  if (!key) return "";
  return explainTag(key) ?? explainTag(key.replace(/-(?:\d+|x)$/, "")) ?? "";
}

/* -------------------------------------------------- */
/*  Granted interrupt on its own                       */
/* -------------------------------------------------- */

/** "Cheat Time — Interrupt 1" → ["Cheat Time", "Interrupt 1"]; null for any other label. */
export function interruptBlockName(label) {
  const m = /^(.*\S)\s—\s(Interrupt \d)$/.exec(String(label ?? ""));
  return m ? [m[1], m[2]] : null;
}

/**
 * The interrupt an ability grants inside its text (Chronotemper's Cheat Time,
 * p.152; Drifting Leaf's Leaf on the Wind, p.227), read for a card of its own:
 * the "Name — Interrupt N" block's trigger, the Effect block right after it,
 * any later block of the ability that changes "this interrupt" (PHANTOM BLADE),
 * then the unlocked mastery and the selected talent when they speak of the
 * interrupt (or name it, or — for an interrupt with an Infuse line — of the
 * infuse: GREAT CYCLONE). Revolution, Chronotemper's mastery, rides at the bottom.
 * @param {object} system  ability data
 * @param {string} label   the block's label, "Cheat Time — Interrupt 1"
 * @returns {{name:string, cost:string, lines:Array<{label:string, text:string, mastery?:boolean}>}|null}
 */
export function grantedInterrupt(system, label) {
  const s = system ?? {};
  const head = interruptBlockName(label);
  if (!head) return null;
  const [name, cost] = head;
  const sections = parseAbilitySections(s.description).sections;
  const at = sections.findIndex(sec => sec.label === label);
  if (at < 0) return null;

  const own = String(sections[at].text ?? "").trim();
  const trig = /^Trigger:\s*/i.exec(own);
  const lines = [{ label: trig ? "Trigger" : cost, text: trig ? own.slice(trig[0].length) : own }];
  let next = at + 1;
  if (sections[next]?.label === "Effect") lines.push({ label: "Effect", text: sections[next++].text });

  const speaksOf = (t) => {
    const p = _plain(t);
    return /\binterrupt\b/.test(p) || p.includes(name.toLowerCase());
  };
  for (const sec of sections.slice(next)) if (speaksOf(sec.text)) lines.push({ label: sec.label, text: sec.text });

  const infused = lines.some(l => /\bInfuse\b/.test(l.label));
  const talent  = { 1: ["Talent I", s.talent1], 2: ["Talent II", s.talent2] }[Number(s.talentSelected ?? 0)];
  if (talent && speaksOf(talent[1])) lines.push({ label: talent[0], text: String(talent[1]).trim() });
  if (s.masteryUnlocked && (speaksOf(s.mastery) || (infused && /\binfuse\b/.test(_plain(s.mastery)))))
    lines.push({ label: "Mastery", text: String(s.mastery).trim(), mastery: true });
  return { name, cost, lines };
}
