/**
 * ability-statuses.mjs — Read the statuses an ability INFLICTS out of its
 * rules text, and render the "Inflict" block of buttons on chat cards.
 *
 * The book writes inflicted statuses in a handful of shapes (survey of the
 * jobs / foes / legends packs, Session 11):
 *   "[D]+fray and foe is dazed"            → always (on the outcome of that line)
 *   "Foes in the area must save or be stunned"
 *   "must save or take [D]+fray and become stunned, or just fray on a successful save"
 *   "Foes can pass a save to avoid this effect, but are dazed on a successful save"
 *   "On a successful save, they are weakened. On a failed save, they are also…"
 *   "become blinded+"                      → ongoing (+), no end-of-turn save
 *   "foes gain +1 curse on the save"       → save modifier
 *   "Bloodied foes fail the save."         → automatic failure
 * and uses the same words as ADJECTIVES ("Dazed foes take fray damage",
 * "bonus damage against weakened or slashed foes") or CONDITIONS ("if the
 * target is stunned", "immune to being stunned"), which must NOT become
 * buttons. The parser works sentence by sentence with those heuristics; it
 * is deliberately conservative — a missed status costs one click in the
 * Conditions tab, a wrong button would be misleading.
 *
 * Entries carry a `kind`: (none) = negative status inflicted on the targets;
 * "gain" = status the user / allies gain ("you gain evasion", "allies are
 * sturdy" — Session 13); "note" = reminder for an effect that is not a status
 * ("shoved 2", "unable to attack until…", "+1 curse on all attacks"); and
 * "save-damage" = damage tied to a save without a status ("must save or take 6
 * damage, or 3 on a successful save"). Status entries whose sentence also
 * deals damage on the save carry `saveDamage` so one click rolls the save and
 * then the damage.
 *
 * Pure text module (no Foundry API) so it can be unit-tested from Node and
 * imported by rolls.mjs without cycles. The click side (save roll, apply,
 * GM relay) lives in inflict-status.mjs.
 */

/* -------------------------------------------------- */
/*  Status vocabulary                                  */
/* -------------------------------------------------- */

/** Negative statuses as the book spells them → status id (statuses.mjs). */
export const INFLICTABLE = [
  { re: "slashed",        id: "slashed",    label: "Slashed" },
  { re: "blind(?:ed)?",   id: "blind",      label: "Blind" },
  { re: "dazed",          id: "dazed",      label: "Dazed" },
  { re: "hatred",         id: "hatred",     label: "Hatred" },
  { re: "pacified",       id: "pacified",   label: "Pacified" },
  { re: "sealed",         id: "sealed",     label: "Sealed" },
  { re: "shattered",      id: "shattered",  label: "Shattered" },
  { re: "stunned",        id: "stunned",    label: "Stunned" },
  { re: "weakened",       id: "weakened",   label: "Weakened" },
  { re: "vulnerable",     id: "vulnerable", label: "Vulnerable" },
  { re: "immobile",       id: "immobile",   label: "Immobile" },
];
const STATUS_ALT = INFLICTABLE.map(s => s.re).join("|");
// Trailing "(?![a-z])" instead of "\b": "blinded+" must keep its "+".
const MENTION_RE = new RegExp(`\\b(${STATUS_ALT})(\\+)?(?: of (?:you|them|it|(?:the |this )?[a-z]+))?(?![a-z])`, "gi");
const STATUS_BY_WORD = (w) => INFLICTABLE.find(s => new RegExp(`^(?:${s.re})$`, "i").test(w));

/** Positive statuses the text grants ("you gain evasion", "allies gain sturdy") → "Gain" buttons. */
export const GRANTABLE = [
  { re: "counter",       id: "counter",      label: "Counter" },
  { re: "defiance",      id: "defiance",     label: "Defiance" },
  { re: "divine",        id: "divine",       label: "Divine" },
  { re: "dodge",         id: "dodge",        label: "Dodge" },
  { re: "evasion",       id: "evasion",      label: "Evasion" },
  { re: "flying",        id: "flying",       label: "Flying" },
  { re: "intangible",    id: "intangible",   label: "Intangible" },
  { re: "phasing",       id: "phasing",      label: "Phasing" },
  { re: "pierce",        id: "pierce",       label: "Pierce" },
  { re: "rampart",       id: "rampart",      label: "Rampart" },
  { re: "regeneration",  id: "regeneration", label: "Regeneration" },
  { re: "resistance",    id: "resistance",   label: "Resistance" },     // "…are sturdy and have counter and resistance" (Hold the Line!)
  { re: "skirmisher",    id: "skirmisher",   label: "Skirmisher" },
  { re: "stealth",       id: "stealth",      label: "Stealth" },
  { re: "sturdy",        id: "sturdy",       label: "Sturdy" },
  { re: "true strike",   id: "true-strike",  label: "True Strike" },
  { re: "unerring",      id: "unerring",     label: "Unerring" },
  { re: "unstoppable",   id: "unstoppable",  label: "Unstoppable" },
  { re: "vigilance",     id: "vigilance",    label: "Vigilance" },
];
const GRANT_ALT = GRANTABLE.map(s => s.re).join("|");
const GRANT_RE  = new RegExp(`\\b(${GRANT_ALT})\\b`, "gi");
const GRANT_BY_WORD = (w) => GRANTABLE.find(s => new RegExp(`^(?:${s.re})$`, "i").test(w));
/** A positive word used as an adjective / part of another term ("divine damage", "flying movement", "counter damage"). */
const GRANT_ADJ_AFTER_RE = /^\s+(?:damage|attacks?|effects?|movement|ability|abilities|foes?|characters?|allies|ally|summons?|units?|creatures?|targets?)\b/i;
/** Verbs that grant a status to the subject before them. */
const GRANT_VERB_RE = /\b(?:gains?|gained|gaining|have|has|get|gets|regains?|become|becomes|are|is|with|grants?(?:\s+(?:you|them|it|yourself))?)\s*(?:\+\d\s*)?$/i;
/** Imperative start of a clause ("Gain stealth", "Become intangible…") = the user. */
const IMPERATIVE_SELF_RE = /^\s*(?:then\s+|and\s+|you\s+(?:may|can|must)\s+|may\s+|can\s+)?(?:gain|become|regain|have)\s*$/i;
/** "Choose a foe in range 3 and become immobile" — the object of the imperative is not the subject of "become". */
const CHOOSE_AND_SELF_RE = /\b(?:choose|pick|select|target|mark)\s+(?:a|an|one|two|the|up to \d+|any)?\s*(?:foes?|targets?|characters?|allies|ally|creatures?)\b[^,;]*\b(?:and|then)\s+(?:become|gain|are|have)\s*$/i;
/** "until the end of your next turn" after a status mention. */
const UNTIL_RE = /^\+?\s*(?:[a-z ,]*?)?\b(until\s+(?:the\s+)?(?:start|end|beginning)\s+of\s+[^.,;]+|for\s+the\s+rest\s+of\s+(?:the\s+)?combat|this\s+turn(?:\s+only)?)/i;

/* Non-status effects worth a reminder chip on the card (kind "note"). */
const NOTE_SHOVE_RE  = /\b((?:shove[sd]?|push(?:ed|es)?|pull(?:ed|s)?)\s+(?:(?:the|that|all|each|every|any|your|a|an|adjacent|target|targets|it|them|foes?|characters?|allies|ally|yourself|you|other|others|in\s+the\s+area)\s+)*(\d+)(?:\s+spaces?)?(?:\s+(?:towards?|away\s+from|in\s+any\s+direction|closer|directly\s+away)[^.,;]*)?)/gi;
const NOTE_UNABLE_RE = /\b((?:unable\s+to|cannot|can't|can\s+not|may\s+not)\s+(?!be\s+(?:targeted|moved|shoved|pushed))[^,.;]+?\s+until\s+[^,.;]+)/gi;
const NOTE_MOD_RE    = /((?:\+|−|-)\s*\d\s*(?:boons?|curses?)\s+(?:on|to|for|against)\s+[^.,;]+)/gi;
const NOTE_VIGOR_RE  = /\b((?:gains?|grants?|regains?)\s+(?:\d+|[a-z]+)\s+vigor\b|vigor\s+surge)/gi;
const NOTE_MOVE_RE   = /\b((?:dash|rush|teleport|fly|leap|jump)\s+(?:up\s+to\s+)?\d+\b(?:\s+spaces?)?)/gi;
const NOTE_WOUND_RE  = /\b((?:takes?|suffers?|gains?)\s+(?:a\s+)?wound\b)/gi;
const NOTE_SAVE_ONLY_RE = /^\s*(?:the|this|their|that|a|any|all|these)?\s*saves?\b/i;
const NOTE_SKIP_BEFORE_RE = /\b(?:if|while|whenever|unless|instead of|immune|cannot be|can't be|already|as if|rather than)\b/i;

/* Damage tied to a save ("must save or take 2[D]+fray, or [D]+fray on a successful save"). */
const DMG_TIMES_RE = /\b(?:twice|two\s+times)\b|\b(\d+|three|four|five)\s+times\b/i;
function _dmgChunk(text) {
  const lower = String(text ?? "").toLowerCase();
  const diceMatch = lower.match(/(\d)?\s*\[d\]/);
  const mult = diceMatch ? (diceMatch[1] ? Number(diceMatch[1]) : 1) : 0;
  const fray = /\bfray\b/.test(lower);
  const flatMatch = lower.match(/(\d+)\s+(?:divine\s+|piercing\s+|true\s+|unerring\s+)?damage/) ?? (!mult && !fray ? lower.match(/^\s*(?:just\s+|only\s+|takes?\s+)?(\d+)\s*(?:instead)?\s*$/) : null);
  const flat = flatMatch ? Number(flatMatch[1]) : 0;
  const tm = DMG_TIMES_RE.exec(lower);
  const times = tm ? (tm[1] ? ({ three: 3, four: 4, five: 5 }[tm[1]] ?? Number(tm[1])) : 2) : 1;
  return { mult, fray, flat, times, deals: mult > 0 || flat > 0 || fray };
}
function _dmgLabel(c) {
  if (!c?.deals) return "no damage";
  const parts = [];
  if (c.mult) parts.push(`${c.mult}[D]`);
  if (c.fray) parts.push("fray");
  if (c.flat) parts.push(`${c.flat}`);
  return parts.join("+") + (c.times > 1 ? ` ×${c.times}` : "");
}

/** Nouns that make a preceding status word an adjective ("dazed foes"). */
const ADJ_NOUN = "(?:foes?|characters?|character's|allies|ally|targets?|enemies|enemy|creatures?|summons?|objects?|units?|status(?:es)?|darkness|spaces?|areas?|terrain|tokens?)";
const ADJ_AFTER_RE = new RegExp(`^(?:\\+?\\s*(?:,|/|\\bor\\b|\\band\\b|,\\s*(?:or|and))\\s*(?:${STATUS_ALT})\\+?)*\\s+${ADJ_NOUN}\\b`, "i");
const CHAIN_BETWEEN_RE = /^\+?(?:\s*,\s*|\s+(?:and|or)\s+|\s*,\s*(?:and|or)\s+)$/i;

/** Words before a mention (in the same clause) that mean "not an infliction". */
const SKIP_BEFORE_RE = /\b(?:if|while|whenever|against|already|immune|immunity|cannot|can't|can not|unless|instead of|for each|following|bonus damage to|damage to|damage against|cures?|cured|curing|remove[sd]?|removing|ends?|ended|ending|clears?|cleared|purged?|ignores?|ignoring|no longer|not|isn't|aren't|rather than|as if|counts? as|treated as|than|would be|being|were|was|had|has been|have been)\b/i;

/** "you" as the subject (self) — but not "adjacent to you" / "hatred of you". */
const PREP = "(?:to|of|from|with|by|towards?|near|around|against|for|on|at|under|beside|behind|between|inside|within|through|over|under|onto|into)";
const OTHER_SUBJECT_RE = /\b(?:foes?|targets?|enemy|enemies|characters?|character's|they|them|it|creatures?|anyone|everyone|each|all|both|that|those|who|which|summons?)\b/gi;
/** Allies as the subject ("every ally gains hatred of them"): a friendly effect, not an infliction. */
const ALLY_SUBJECT_RE = /\b(?:allies|ally)\b/gi;
/** Whole sentences that never inflict: summon stat lines, stance self-descriptions. */
const SKIP_SENTENCE_RE = /\bsize\s+\d\b.*\bintangible\b|\b(?:in|while in)\s+this\s+stance\b/i;

/** Sentence-level save phrasing. */
const SAVE_TRIGGER_RE = /\b(?:must|can|may|to|first|also|then|will)\s+(?:first\s+|also\s+|then\s+)?(?:pass\s+a\s+|make\s+a\s+|roll\s+a\s+)?save\b|\bsave\s+or\b|\bsave\s+to\s+avoid\b|\bsave\s+against\b|\bforced\s+to\s+save\b/i;
const AVOID_PREV_RE   = /\b(?:can|may)\s+(?:pass\s+a\s+|make\s+a\s+)?save\s+to\s+avoid\s+(?:this|the|that)\s+effect/i;
const SUCCESS_RE      = /\bsuccessful\s+save|\bsucceed(?:s|ed)?\s+(?:on\s+|at\s+)?(?:the|this|their|that|a)\s+save|\bpass(?:es|ed)?\s+(?:the|this|their|that|a)\s+save|\bsaves?\s+successfully/i;
const FAIL_RE         = /\bfailed\s+save|\bfails?\s+(?:the|this|their|that|a)\s+save|\bon\s+(?:a\s+)?failure/i;
const SEGMENT_SPLIT_RE = /,\s*|;\s*|\s+(?:but|or)\s+(?=[a-z])|\s+then\s+/i;

/** "+1 curse on the save" / "+2 curses to save against them" / "+1 boon on saves". */
const SAVE_MOD_RE = /\+\s*(\d)\s*(boon|curse)s?\s*(?:on|to|for|against)\s*(?:the\s+|this\s+|their\s+|that\s+|all\s+|any\s+|these\s+)?saves?\b/gi;
/** "Bloodied foes fail the save." / "Blinded foes fail this save." */
const AUTO_FAIL_RE = new RegExp(`\\b(bloodied|${STATUS_ALT})\\+?\\s+${ADJ_NOUN}\\s+(?:automatically\\s+)?fail\\s+(?:the|this|their|that|these|any)\\s+saves?`, "i");

/* -------------------------------------------------- */
/*  Text helpers                                       */
/* -------------------------------------------------- */

/** Strip tags, collapse whitespace, drop translator notes in parentheses. */
export function plainText(html) {
  return String(html ?? "")
    .replace(/<\/?(?:p|br|div|li|ul|ol|h\d)\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split a rules text into "Label: body" blocks (generic — any capitalised
 * "Something:" at a sentence start counts). Text before the first label gets
 * label "". Used for foe descriptions ("On hit: … Miss: … Effect: …") and
 * PC descriptions ("Effect: … Collide: …") alike.
 * @returns {Array<{label: string, text: string}>}
 */
export function splitLabelledBlocks(text) {
  const t = plainText(text);
  if (!t) return [];
  const LABEL_RE = /(?:^|[.!?…)\]]\s+|—\s*|•\s*|:\s+(?=[A-Z]))([A-Z][A-Za-z' -]{0,30}?(?:\s\d\+?)?):\s+(?=\S)/g;
  const hits = [];
  for (const m of t.matchAll(LABEL_RE)) {
    const label = m[1].trim();
    if (/^(?:e\.g|i\.e|https?|note)$/i.test(label)) continue;
    hits.push({ label, labelStart: m.index + m[0].indexOf(label), bodyStart: m.index + m[0].length });
  }
  const blocks = [];
  const head = (hits.length ? t.slice(0, hits[0].labelStart) : t).trim();
  if (head) blocks.push({ label: "", text: head });
  hits.forEach((h, i) => {
    const body = t.slice(h.bodyStart, i + 1 < hits.length ? hits[i + 1].labelStart : undefined).trim();
    if (body) blocks.push({ label: h.label, text: body });
  });
  return blocks;
}

/** Sentences of a block (".", "!", "?" and bullets). */
function _sentences(text) {
  return String(text).split(/(?<=[.!?])\s+|\s*•\s*/).map(s => s.trim()).filter(Boolean);
}

/**
 * Canonical outcome key of a block label, for dimming on the attack card:
 * "hit" | "miss" | "area" | "exceed" | "crit" | "other".
 */
export function outcomeKey(label) {
  const l = String(label ?? "").toLowerCase().trim();
  if (/^(?:on hit|hit|auto-?hit|combo)$/.test(l)) return "hit";
  if (/^miss(?: or area(?: effect)?)?$/.test(l)) return "miss";
  if (/^area(?: effect)?$/.test(l)) return "area";
  if (/^exceed/.test(l)) return "exceed";
  if (/^crit(?:ical)?(?: hit)?$/.test(l)) return "crit";
  return "other";
}

/* -------------------------------------------------- */
/*  Parser                                             */
/* -------------------------------------------------- */

/**
 * Self-subject regex for a source: "you", "yourself", "this character", "the
 * Armor Demon", "the demon" (last word of the name) — not after a preposition
 * ("adjacent to you", "hatred of the demon").
 */
function _selfRe(sourceName) {
  const names = ["you", "yourself", "this character", "this creature", "this summon", "the summon"];
  const n = plainText(sourceName).toLowerCase().replace(/[^a-z0-9' -]/g, "").trim();
  if (n) {
    names.push(n.replace(/[-\s]+/g, "\\s+"));
    const last = n.split(/[\s-]+/).pop();
    if (last && last.length > 2 && !/^(?:you|of|the|demon|spirit)$/.test(last)) names.push(last);
    if (last === "demon" || last === "spirit") names.push(last);   // "the demon", "the spirit"
  }
  return new RegExp(`(?<!\\b${PREP}\\s(?:the\\s|this\\s)?)\\b(?:the\\s+|this\\s+)?(?:${names.join("|")})\\b`, "gi");
}

function _lastIndex(re, text) {
  let last = -1;
  re.lastIndex = 0;
  for (const m of text.matchAll(re)) last = m.index;
  return last;
}

/**
 * Parse one rules text into inflicted-status entries.
 *
 * @param {string} text                 raw text (HTML allowed)
 * @param {object} [opts]
 * @param {string} [opts.label]         block label shown on the card ("Hit", "Effect", "Exceed"…)
 * @param {string} [opts.sourceName]    the acting character's name (to drop self-inflicted lines)
 * @param {boolean} [opts.splitBlocks]  split the text into "Label:" blocks first (default true)
 * @returns {Array<StatusEntry>}
 *   StatusEntry = { id, label, ongoing, when: "always"|"fail"|"success", section, key,
 *                   sentence, saveBoons, saveCurses, autoFailIf }
 */
export function parseInflictedStatuses(text, { label = "", sourceName = "", splitBlocks = true } = {}) {
  const blocks = splitBlocks ? splitLabelledBlocks(text) : [{ label, text: plainText(text) }];
  const selfRe = _selfRe(sourceName);
  const out = [];

  for (const block of blocks) {
    const section = block.label || label;
    const body = block.text;
    if (!body) continue;

    // Block-level save modifiers and automatic failures.
    let saveBoons = 0, saveCurses = 0;
    for (const m of body.matchAll(SAVE_MOD_RE)) {
      if (m[2].toLowerCase() === "boon") saveBoons += Number(m[1]); else saveCurses += Number(m[1]);
    }
    const af = body.match(AUTO_FAIL_RE);
    const autoFailIf = af ? (af[1].toLowerCase() === "bloodied" ? "bloodied" : STATUS_BY_WORD(af[1])?.id ?? "") : "";

    const sentences = _sentences(body);
    const blockEntries = [];   // entries of this block, in order (for the "avoid this effect" rule)

    sentences.forEach((sentence, si) => {
      const lower = sentence.toLowerCase();
      if (SKIP_SENTENCE_RE.test(lower)) return;
      const saveM = lower.match(SAVE_TRIGGER_RE);
      const savePos = saveM ? saveM.index : -1;
      const hasSave = savePos >= 0;

      // "Foes can pass a save to avoid this effect" → the previous sentence's
      // unconditional statuses are actually save-gated.
      if (AVOID_PREV_RE.test(lower)) {
        for (const e of blockEntries) if (e._sentenceIndex === si - 1 && e.when === "always") e.when = "fail";
      }

      // Segments (clauses) with their offsets, for branch / subject lookups.
      const segments = [];
      let pos = 0;
      for (const part of sentence.split(SEGMENT_SPLIT_RE)) {
        const at = sentence.indexOf(part, pos);
        segments.push({ start: at, end: at + part.length, text: part, lower: part.toLowerCase() });
        pos = at + part.length;
      }
      const segOf = (i) => segments.find(s => i >= s.start && i < s.end) ?? segments[segments.length - 1];

      let prev = null;   // previous mention in this sentence (for chains)
      MENTION_RE.lastIndex = 0;
      for (const m of sentence.matchAll(MENTION_RE)) {
        const def = STATUS_BY_WORD(m[1]);
        if (!def) continue;
        const start = m.index, end = start + m[0].length;
        const after = sentence.slice(end);
        const ongoing = !!m[2];

        // Chained mention ("is stunned, slashed, or weakened") inherits the first one's verdict.
        const chained = prev && CHAIN_BETWEEN_RE.test(sentence.slice(prev.end, start));
        let skip = false, when = "always", gainTarget = "";

        if (chained) {
          skip = prev.skip; when = prev.when; gainTarget = prev.gainTarget ?? "";
        } else {
          // Adjective ("dazed foes", "weakened or slashed characters") / glossary ("Dazed: …").
          if (ADJ_AFTER_RE.test(after) || /^\s*:/.test(after)) skip = true;
          const seg = segOf(start);
          const before = sentence.slice(seg.start, start);
          const beforeLower = before.toLowerCase();
          // Conditions / descriptions rather than inflictions.
          if (!skip && SKIP_BEFORE_RE.test(beforeLower)) skip = true;
          // Self-inflicted ("you are pacified", "the Cantrix is immobile", "Choose a foe
          // and become immobile", "Become intangible") → a "Gain" button on the user;
          // allies ("allies are sturdy") → a "Gain" button for the targets.
          if (!skip) {
            const selfAt  = _lastIndex(selfRe, before);
            // "this character" contains "character": blank the self matches before looking for others.
            const otherAt = _lastIndex(OTHER_SUBJECT_RE, before.replace(selfRe, m => " ".repeat(m.length)));
            const allyAt  = _lastIndex(ALLY_SUBJECT_RE, before);
            // A "Gain" button only when the verb grants the status ("you are pacified",
            // "the Snail becomes immobile"), not for "you can inflict hatred on…".
            const grantVerb = GRANT_VERB_RE.test(before);
            if (selfAt >= 0 && selfAt > otherAt) { skip = true; gainTarget = grantVerb ? "self" : ""; }
            if (allyAt >= 0 && allyAt > otherAt && allyAt > selfAt) { skip = true; gainTarget = grantVerb ? "ally" : ""; }
            const prefixOther = _lastIndex(OTHER_SUBJECT_RE, sentence.slice(0, start).replace(selfRe, x => " ".repeat(x.length)));
            if (!skip && CHOOSE_AND_SELF_RE.test(before)) { skip = true; gainTarget = "self"; }
            else if (!skip && !hasSave && prefixOther < 0 && IMPERATIVE_SELF_RE.test(before)) { skip = true; gainTarget = "self"; }
          }
          // Save gating.
          if (!skip) {
            const segLower = seg.lower;
            if (SUCCESS_RE.test(segLower))      when = "success";
            else if (FAIL_RE.test(segLower))    when = "fail";
            else {
              // Look back through earlier clauses of the sentence for "On a successful save, …".
              let found = null;
              for (let i = segments.indexOf(seg) - 1; i >= 0 && !found; i--) {
                const s = segments[i].lower;
                if (SAVE_TRIGGER_RE.test(s) && !SUCCESS_RE.test(s) && !FAIL_RE.test(s)) break;   // "must save or …" starts the fail branch
                if (SUCCESS_RE.test(s)) found = "success";
                else if (FAIL_RE.test(s)) found = "fail";
              }
              if (found) when = found;
              else if (hasSave && start > savePos) when = "fail";
              else if (hasSave && start < savePos && FAIL_RE.test(lower) && !SUCCESS_RE.test(lower)) when = "always";
            }
          }
        }

        const until = (UNTIL_RE.exec(after)?.[1] ?? "").trim();
        const entry = {
          id: def.id, label: def.label, ongoing, when, section, key: outcomeKey(section),
          sentence, saveBoons, saveCurses, autoFailIf: (when === "always") ? "" : autoFailIf,
          skip, gainTarget, until, _sentenceIndex: si, end,
        };
        prev = entry;
        if (!skip) blockEntries.push(entry);
        else if (gainTarget) blockEntries.push({ ...entry, kind: "gain", when: "always", skip: false, target: gainTarget });
      }

      // Positive statuses granted to the user or to allies ("gain evasion until
      // the start of your next turn", "allies in range 2 gain sturdy").
      GRANT_RE.lastIndex = 0;
      for (const m of sentence.matchAll(GRANT_RE)) {
        const def = GRANT_BY_WORD(m[1]);
        if (!def) continue;
        const start = m.index, end = start + m[0].length;
        const after = sentence.slice(end);
        if (GRANT_ADJ_AFTER_RE.test(after) || /^\s*:/.test(after) || /^\s*\+/.test(after)) continue;
        const seg = segOf(start);
        const before = sentence.slice(seg.start, start);
        const beforeLower = before.toLowerCase();
        if (SKIP_BEFORE_RE.test(beforeLower)) continue;
        if (/\b(?:lose|loses|losing|lost|without|no longer|breaks?|ignores?|ignoring|instead of)\b/.test(beforeLower)) continue;
        // Chained after an earlier grant in the same clause ("gain evasion and dodge").
        const chainedPrev = blockEntries.find(e => e.kind === "gain" && e._sentenceIndex === si && CHAIN_BETWEEN_RE.test(sentence.slice(e.end, start)));
        let target = chainedPrev ? (chainedPrev._targetsAll ?? chainedPrev.target) : "";
        if (!target) {
          if (!GRANT_VERB_RE.test(before)) continue;
          const selfAt  = _lastIndex(selfRe, before);
          const otherAt = _lastIndex(OTHER_SUBJECT_RE, before.replace(selfRe, x => " ".repeat(x.length)));
          const allyAt  = _lastIndex(ALLY_SUBJECT_RE, before);
          if (allyAt >= 0 && allyAt > otherAt) target = selfAt >= 0 && /\byou\s+and\b/i.test(before) ? "both" : "ally";
          else if (selfAt >= 0 && selfAt > otherAt) target = "self";
          else if (otherAt < 0 && IMPERATIVE_SELF_RE.test(before)) target = "self";
          else if (otherAt < 0 && /^\s*(?:gains?|have|has|regains?)\s*$/i.test(before)) target = "self";
          if (!target) continue;
        }
        const until = (UNTIL_RE.exec(after)?.[1] ?? "").trim();
        const targets = target === "both" ? ["self", "ally"] : [target];
        for (const t of targets) {
          if (blockEntries.some(e => e.kind === "gain" && e.id === def.id && e.target === t)) continue;
          blockEntries.push({ id: def.id, label: def.label, ongoing: false, when: "always", section, key: outcomeKey(section),
            sentence, saveBoons: 0, saveCurses: 0, autoFailIf: "", skip: false, kind: "gain", target: t, until, _sentenceIndex: si, end, _targetsAll: target });
        }
      }

      // Reminder chips for effects that are not statuses (shove, unable to…, +1 curse on…, vigor, dash, wound).
      const noteRes = [NOTE_SHOVE_RE, NOTE_UNABLE_RE, NOTE_MOD_RE, NOTE_VIGOR_RE, NOTE_MOVE_RE, NOTE_WOUND_RE];
      for (const re of noteRes) {
        re.lastIndex = 0;
        for (const m of sentence.matchAll(re)) {
          const text = m[1].replace(/\s+/g, " ").trim();
          if (re === NOTE_MOD_RE && NOTE_SAVE_ONLY_RE.test(text.replace(/^[+−-]\s*\d\s*(?:boons?|curses?)\s+(?:on|to|for|against)\s+/i, ""))) continue;
          const seg = segOf(m.index);
          if (NOTE_SKIP_BEFORE_RE.test(sentence.slice(seg.start, m.index).toLowerCase()) && re !== NOTE_UNABLE_RE) continue;
          if (blockEntries.some(e => e.kind === "note" && e.label.toLowerCase() === text.toLowerCase())) continue;
          const t = text.charAt(0).toUpperCase() + text.slice(1);
          blockEntries.push({ id: "", label: t, ongoing: false, when: "always", section, key: outcomeKey(section), sentence,
            saveBoons: 0, saveCurses: 0, autoFailIf: "", skip: false, kind: "note", _sentenceIndex: si, end: m.index + m[0].length });
        }
      }

      // Damage tied to the save of this sentence ("must save or take 2[D]+fray,
      // or [D]+fray on a successful save"): rolled from the same button as the
      // status (one save), or from its own "🎲 damage" button when there is none.
      if (hasSave) {
        const rest = sentence.slice(savePos);
        const restLower = rest.toLowerCase();
        const sIdx = restLower.search(SUCCESS_RE), fIdx = restLower.search(FAIL_RE);
        let failText = "", successText = "";
        if (sIdx >= 0) {
          const head = rest.slice(0, sIdx).replace(/\s+(?:on|with|upon)\s+(?:a|an|the)?\s*$/i, "");
          const parts = head.split(/,?\s+or\s+(?=[^,]*$)/i);
          if (parts.length >= 2) { failText = parts[0]; successText = parts[1]; }
          else {
            // "On a successful save, they take 2 damage. On a failed save, …" (success first)
            successText = rest.slice(sIdx).replace(SUCCESS_RE, "").split(/(?:on\s+a\s+failed\s+save|\.)/i)[0];
            if (fIdx > sIdx) failText = rest.slice(fIdx).replace(FAIL_RE, "");
            else failText = head;
          }
        } else if (fIdx >= 0) {
          failText = rest.slice(fIdx).replace(FAIL_RE, "");
        } else {
          failText = rest.replace(SAVE_TRIGGER_RE, "").replace(/^\s*or\s+/i, "");
        }
        const fail = _dmgChunk(failText);
        let success = _dmgChunk(successText);
        // "…or be shoved 3, or just 1 on a successful save": a bare number only means
        // damage when the failed-save branch deals damage too.
        if (!fail.deals && !/\[d\]|fray|damage/i.test(successText)) success = { deals: false };
        if (fail.deals || success.deals) {
          const saveDamage = { fail, success: success.deals ? success : null, label: `${_dmgLabel(fail)}${success.deals ? ` / ${_dmgLabel(success)} on a successful save` : ""}` };
          const gated = blockEntries.filter(e => e._sentenceIndex === si && !e.kind && e.when !== "always");
          if (gated.length) for (const e of gated) e.saveDamage = saveDamage;
          else blockEntries.push({ id: "", label: `Damage: ${saveDamage.label}`, ongoing: false, when: "fail", section, key: outcomeKey(section), sentence,
            saveBoons, saveCurses, autoFailIf, skip: false, kind: "save-damage", saveDamage, _sentenceIndex: si, end: sentence.length });
        }
      }
    });

    for (const e of blockEntries) {
      // Dedupe inside the block: same status, same gate.
      const kind = e.kind ?? "";
      if (blockEntries.some(o => o !== e && (o.kind ?? "") === kind && o.id === e.id && o.label === e.label && o.when === e.when && o.ongoing === e.ongoing && (o.target ?? "") === (e.target ?? "") && blockEntries.indexOf(o) < blockEntries.indexOf(e))) continue;
      const { skip, _sentenceIndex, end, gainTarget, _targetsAll, ...clean } = e;
      out.push(clean);
    }
  }
  return out;
}

/* -------------------------------------------------- */
/*  Per-document helpers                               */
/* -------------------------------------------------- */

/** Entries for a PC ability item (system data), honouring unlocked talents / mastery and the combo version. */
export function abilityStatusEntries(system, { comboMode = false, sourceName = "" } = {}) {
  const s = system ?? {};
  const opts = { sourceName };
  const out = [];
  const add = (text, label) => { if (text && String(text).trim()) out.push(...parseInflictedStatuses(text, { ...opts, label })); };
  if (comboMode) {
    add(s.comboEffect, "Combo");
  } else {
    add(s.hitEffect, "Hit");
    add(s.missEffect, "Miss");
    add(s.areaEffect, "Area");
    add(s.description, "Effect");
    add(s.chargeEffect, "Charge");
    add(s.heroicEffect, "Heroic");
    add(s.exceedEffect, "Exceed");
    add(s.collideEffect, "Collide");
    add(s.slayEffect, "Slay");
    add(s.critEffect, "Crit");
    add(s.finishingBlowEffect, "Finishing Blow");
    add(s.comebackEffect, "Comeback");
  }
  const talent = Number(s.talentSelected ?? 0);
  if (talent >= 1) add(s.talent1, "Talent I");
  if (talent >= 2) add(s.talent2, "Talent II");
  if (s.masteryUnlocked) add(s.mastery, "Mastery");
  return _dedupe(out);
}

/** Entries for a foe / legend action ({ hitEffect, missEffect, areaEffect, description }). */
export function npcActionStatusEntries(action, { sourceName = "" } = {}) {
  const a = action ?? {};
  const opts = { sourceName };
  const out = [];
  const add = (text, label) => { if (text && String(text).trim()) out.push(...parseInflictedStatuses(text, { ...opts, label })); };
  add(a.hitEffect, "Hit");
  add(a.missEffect, "Miss");
  add(a.areaEffect, "Area");
  add(a.description, "");
  add(a.effect, "Effect");
  return _dedupe(out);
}

/** Entries for a summon's action text (one description blob). */
export function summonStatusEntries(summonAction, { sourceName = "" } = {}) {
  return _dedupe(parseInflictedStatuses(summonAction ?? "", { sourceName, label: "" }));
}

function _dedupe(entries) {
  const seen = new Set();
  return entries.filter(e => {
    const k = `${e.section}|${e.kind ?? ""}|${e.id}|${e.label}|${e.when}|${e.ongoing}|${e.target ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/* -------------------------------------------------- */
/*  Card HTML                                          */
/* -------------------------------------------------- */

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** The user's current targets, as plain data for the card. */
export function captureTargets() {
  const targets = typeof game !== "undefined" ? Array.from(game.user?.targets ?? []) : [];
  return targets.filter(t => t.actor).map(t => ({
    tokenId:   t.id,
    actorUuid: t.actor.uuid,
    name:      t.name ?? t.actor.name,
    img:       t.actor.img ?? t.document?.texture?.src ?? "",
  }));
}

/** Is a block of this outcome key "on" for the rolled outcome? (null outcome = everything on) */
function _blockOn(key, outcome) {
  if (!outcome) return true;
  const { isHit = null, isCrit = false, isExceed = false } = outcome;
  switch (key) {
    case "hit":    return isHit !== false;
    case "miss":   return isHit !== true;
    case "exceed": return isHit === null ? true : isExceed;
    case "crit":   return isHit === null ? true : isCrit;
    default:       return true;
  }
}

/**
 * Render the "Inflict" block: one row per target (or one "current targets"
 * row when nothing was targeted), a button per status grouped by block.
 *
 * @param {Array<StatusEntry>} entries
 * @param {object} opts
 * @param {Actor}  opts.source          the acting actor
 * @param {string} opts.abilityName
 * @param {object} [opts.outcome]       { isHit, isCrit, isExceed } from the attack roll (null = no roll)
 * @param {Array}  [opts.targets]       captureTargets() result (default: capture now)
 * @param {Set<string>} [opts.evaded]   actor uuids that evaded the attack (defenses.mjs) → their row is dimmed
 * @returns {string} safe HTML ("" when there is nothing to inflict)
 */
export function statusBlockHtml(entries, { source, abilityName = "", outcome = null, targets = null, evaded = null } = {}) {
  if (!entries?.length || !source) return "";
  const inflict = entries.filter(e => !e.kind || e.kind === "save-damage");
  const gains   = entries.filter(e => e.kind === "gain");
  const notes   = entries.filter(e => e.kind === "note");
  const sourceTokenId = source.getActiveTokens?.()?.[0]?.id ?? "";
  const parts = [];

  const groupsOf = (list) => {
    const groups = [];
    for (const e of list) {
      let g = groups.find(x => x.section === e.section);
      if (!g) { g = { section: e.section, key: e.key, entries: [] }; groups.push(g); }
      g.entries.push(e);
    }
    return groups;
  };

  /* --- Inflict (negative statuses on the targets, save-linked damage) --- */
  if (inflict.length) {
    const rows = targets ?? captureTargets();
    const groups = groupsOf(inflict);
    const buttons = (target) => groups.map(g => {
      const on = _blockOn(g.key, outcome);
      const btns = g.entries.map(e => {
        const save = e.when !== "always";
        const dmg = e.saveDamage;
        const isDmg = e.kind === "save-damage";
        const title = isDmg
          ? `Save (10+) — damage on a failed save: ${dmg.label}`
          : save
            ? (e.when === "success" ? `${e.label}${e.ongoing ? "+" : ""} — applies on a SUCCESSFUL save (10+)` : `${e.label}${e.ongoing ? "+" : ""} — target saves first: 10+ avoids it`)
            : `${e.label}${e.ongoing ? "+" : ""} — apply (no save)`;
        const mods = [e.saveCurses ? `+${e.saveCurses} curse` : "", e.saveBoons ? `+${e.saveBoons} boon` : "", e.autoFailIf ? `${e.autoFailIf} → auto-fail` : "", dmg && !isDmg ? `then damage: ${dmg.label}` : ""].filter(Boolean).join(", ");
        const dmgAttrs = dmg ? ` data-dmg-fail="${esc(JSON.stringify(dmg.fail))}" data-dmg-success="${esc(JSON.stringify(dmg.success))}" data-dmg-label="${esc(dmg.label)}"` : "";
        const label = isDmg ? `🎲 💥 ${dmg.label}` : `${save ? "🎲 " : ""}${e.label}${e.ongoing ? "+" : ""}${dmg ? " 💥" : ""}`;
        return `<button type="button" class="icon-chat-btn icon-chat-btn--status${save ? " icon-chat-btn--status-save" : ""}${e.when === "success" ? " icon-chat-btn--status-on-success" : ""}${e.ongoing ? " icon-chat-btn--status-ongoing" : ""}${isDmg ? " icon-chat-btn--status-damage" : ""}"
          data-action="inflictStatus" data-kind="${isDmg ? "save-damage" : "inflict"}" data-status-id="${esc(e.id)}" data-label="${esc(e.label)}" data-ongoing="${e.ongoing ? "true" : "false"}"
          data-when="${esc(e.when)}" data-section="${esc(e.section)}" data-save-boons="${e.saveBoons}" data-save-curses="${e.saveCurses}"
          data-auto-fail="${esc(e.autoFailIf)}" data-sentence="${esc(e.sentence)}" data-ability="${esc(abilityName)}"
          data-source-uuid="${esc(source.uuid)}" data-source-token="${esc(sourceTokenId)}"
          data-target-uuid="${esc(target?.actorUuid ?? "")}" data-target-token="${esc(target?.tokenId ?? "")}"${dmgAttrs}
          title="${esc(title)}${mods ? ` (${esc(mods)})` : ""}&#10;${esc(e.sentence)}">${label}</button>`;
      }).join("");
      return `<span class="icon-chat-statuses__group${on ? "" : " icon-chat-statuses__group--off"}" ${on ? "" : 'title="Not triggered by this roll"'}>${g.section ? `<small class="icon-chat-statuses__section">${esc(g.section)}</small>` : ""}${btns}</span>`;
    }).join("");

    const rowsHtml = rows.length
      ? rows.map(t => `<div class="icon-chat-statuses__row${evaded?.has(t.actorUuid) ? " icon-chat-statuses__row--evaded" : ""}" data-target-uuid="${esc(t.actorUuid)}"${evaded?.has(t.actorUuid) ? ' title="This target evaded the attack: only effects that don\'t need a hit apply"' : ""}>
          ${t.img ? `<img class="icon-chat-card__target-img" src="${esc(t.img)}" alt="" width="24" height="24">` : ""}
          <strong class="icon-chat-statuses__name">${esc(t.name)}${evaded?.has(t.actorUuid) ? " <small>(evaded)</small>" : ""}</strong>
          <span class="icon-chat-statuses__buttons">${buttons(t)}</span>
        </div>`).join("")
      : `<div class="icon-chat-statuses__row icon-chat-statuses__row--live">
          <strong class="icon-chat-statuses__name" title="No token was targeted when this card was posted: the buttons apply to whoever is targeted when you click">🎯 Current targets</strong>
          <span class="icon-chat-statuses__buttons">${buttons(null)}</span>
        </div>`;
    const hasDmg = inflict.some(e => e.saveDamage);
    parts.push(`<div class="icon-chat-statuses" data-ability="${esc(abilityName)}">
      <div class="icon-chat-statuses__header"><span>Inflict</span><span class="icon-chat-statuses__note">click to apply · 🎲 = save first (10+)${hasDmg ? " · 💥 = damage rolled after the save" : ""}</span></div>
      ${rowsHtml}
    </div>`);
  }

  /* --- Gain (statuses on the user / on allies) --- */
  if (gains.length) {
    const groups = groupsOf(gains);
    const btns = groups.map(g => {
      const on = _blockOn(g.key, outcome);
      const items = g.entries.map(e => {
        const self = e.target === "self";
        const until = e.until ? ` <small>${esc(e.until)}</small>` : "";
        const title = self
          ? `${e.label}${e.ongoing ? "+" : ""} on ${source.name}${e.until ? ` — ${e.until}` : ""} (click to apply)`
          : `${e.label}${e.ongoing ? "+" : ""} on the targeted allies${e.until ? ` — ${e.until}` : ""} (target them, then click)`;
        return `<button type="button" class="icon-chat-btn icon-chat-btn--status icon-chat-btn--gain${self ? "" : " icon-chat-btn--gain-ally"}${e.ongoing ? " icon-chat-btn--status-ongoing" : ""}"
          data-action="inflictStatus" data-kind="gain" data-status-id="${esc(e.id)}" data-label="${esc(e.label)}" data-ongoing="${e.ongoing ? "true" : "false"}"
          data-when="always" data-section="${esc(e.section)}" data-save-boons="0" data-save-curses="0" data-auto-fail="" data-sentence="${esc(e.sentence)}" data-ability="${esc(abilityName)}"
          data-source-uuid="${esc(source.uuid)}" data-source-token="${esc(sourceTokenId)}"
          data-target-uuid="${self ? esc(source.uuid) : ""}" data-target-token="${self ? esc(sourceTokenId) : ""}"
          title="${esc(title)}&#10;${esc(e.sentence)}">${self ? "" : "👥 "}${esc(e.label)}${e.ongoing ? "+" : ""}${until}</button>`;
      }).join("");
      return `<span class="icon-chat-statuses__group${on ? "" : " icon-chat-statuses__group--off"}" ${on ? "" : 'title="Not triggered by this roll"'}>${g.section ? `<small class="icon-chat-statuses__section">${esc(g.section)}</small>` : ""}${items}</span>`;
    }).join("");
    parts.push(`<div class="icon-chat-statuses icon-chat-statuses--gain" data-ability="${esc(abilityName)}">
      <div class="icon-chat-statuses__header"><span>Gain</span><span class="icon-chat-statuses__note">on ${esc(source.name)} · 👥 = on the targeted allies</span></div>
      <div class="icon-chat-statuses__row"><span class="icon-chat-statuses__buttons">${btns}</span></div>
    </div>`);
  }

  /* --- Reminders (effects that are not statuses) --- */
  if (notes.length) {
    const groups = groupsOf(notes);
    const chips = groups.map(g => {
      const on = _blockOn(g.key, outcome);
      const items = g.entries.map(e => `<span class="icon-chat-note" title="${esc(e.sentence)}">${esc(e.label)}</span>`).join("");
      return `<span class="icon-chat-statuses__group${on ? "" : " icon-chat-statuses__group--off"}">${g.section ? `<small class="icon-chat-statuses__section">${esc(g.section)}</small>` : ""}${items}</span>`;
    }).join("");
    parts.push(`<div class="icon-chat-statuses icon-chat-statuses--notes" data-ability="${esc(abilityName)}">
      <div class="icon-chat-statuses__header"><span>Effects</span><span class="icon-chat-statuses__note">reminders read from the text — apply by hand</span></div>
      <div class="icon-chat-statuses__row"><span class="icon-chat-statuses__buttons">${chips}</span></div>
    </div>`);
  }

  return parts.join("");
}
