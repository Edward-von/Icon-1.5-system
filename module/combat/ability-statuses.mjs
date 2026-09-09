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
 * Only NEGATIVE statuses are read (the ones the target saves against):
 * boons the user gains ("you gain evasion") are not an offensive effect.
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
        let skip = false, when = "always";

        if (chained) {
          skip = prev.skip; when = prev.when;
        } else {
          // Adjective ("dazed foes", "weakened or slashed characters") / glossary ("Dazed: …").
          if (ADJ_AFTER_RE.test(after) || /^\s*:/.test(after)) skip = true;
          const seg = segOf(start);
          const before = sentence.slice(seg.start, start);
          const beforeLower = before.toLowerCase();
          // Conditions / descriptions rather than inflictions.
          if (!skip && SKIP_BEFORE_RE.test(beforeLower)) skip = true;
          // Self-inflicted ("you are pacified", "the Cantrix is immobile").
          if (!skip) {
            const selfAt  = _lastIndex(selfRe, before);
            // "this character" contains "character": blank the self matches before looking for others.
            const otherAt = _lastIndex(OTHER_SUBJECT_RE, before.replace(selfRe, m => " ".repeat(m.length)));
            const allyAt  = _lastIndex(ALLY_SUBJECT_RE, before);
            if (selfAt >= 0 && selfAt > otherAt) skip = true;
            if (allyAt >= 0 && allyAt > otherAt && allyAt > selfAt) skip = true;
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

        const entry = {
          id: def.id, label: def.label, ongoing, when, section, key: outcomeKey(section),
          sentence, saveBoons, saveCurses, autoFailIf: (when === "always") ? "" : autoFailIf,
          skip, _sentenceIndex: si, end,
        };
        prev = entry;
        if (!skip) blockEntries.push(entry);
      }
    });

    for (const e of blockEntries) {
      // Dedupe inside the block: same status, same gate.
      if (blockEntries.some(o => o !== e && o.id === e.id && o.when === e.when && o.ongoing === e.ongoing && blockEntries.indexOf(o) < blockEntries.indexOf(e))) continue;
      const { skip, _sentenceIndex, end, ...clean } = e;
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
    const k = `${e.section}|${e.id}|${e.when}|${e.ongoing}`;
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
 * @returns {string} safe HTML ("" when there is nothing to inflict)
 */
export function statusBlockHtml(entries, { source, abilityName = "", outcome = null, targets = null } = {}) {
  if (!entries?.length || !source) return "";
  const rows = targets ?? captureTargets();
  const sourceTokenId = source.getActiveTokens?.()?.[0]?.id ?? "";

  // Group by section, keeping the text order.
  const groups = [];
  for (const e of entries) {
    let g = groups.find(x => x.section === e.section);
    if (!g) { g = { section: e.section, key: e.key, entries: [] }; groups.push(g); }
    g.entries.push(e);
  }

  const buttons = (target) => groups.map(g => {
    const on = _blockOn(g.key, outcome);
    const btns = g.entries.map(e => {
      const save = e.when !== "always";
      const title = save
        ? (e.when === "success" ? `${e.label}${e.ongoing ? "+" : ""} — applies on a SUCCESSFUL save (10+)` : `${e.label}${e.ongoing ? "+" : ""} — target saves first: 10+ avoids it`)
        : `${e.label}${e.ongoing ? "+" : ""} — apply (no save)`;
      const mods = [e.saveCurses ? `+${e.saveCurses} curse` : "", e.saveBoons ? `+${e.saveBoons} boon` : "", e.autoFailIf ? `${e.autoFailIf} → auto-fail` : ""].filter(Boolean).join(", ");
      return `<button type="button" class="icon-chat-btn icon-chat-btn--status${save ? " icon-chat-btn--status-save" : ""}${e.when === "success" ? " icon-chat-btn--status-on-success" : ""}${e.ongoing ? " icon-chat-btn--status-ongoing" : ""}"
        data-action="inflictStatus" data-status-id="${esc(e.id)}" data-label="${esc(e.label)}" data-ongoing="${e.ongoing ? "true" : "false"}"
        data-when="${esc(e.when)}" data-section="${esc(e.section)}" data-save-boons="${e.saveBoons}" data-save-curses="${e.saveCurses}"
        data-auto-fail="${esc(e.autoFailIf)}" data-sentence="${esc(e.sentence)}" data-ability="${esc(abilityName)}"
        data-source-uuid="${esc(source.uuid)}" data-source-token="${esc(sourceTokenId)}"
        data-target-uuid="${esc(target?.actorUuid ?? "")}" data-target-token="${esc(target?.tokenId ?? "")}"
        title="${esc(title)}${mods ? ` (${esc(mods)})` : ""}&#10;${esc(e.sentence)}">${save ? "⚄ " : ""}${esc(e.label)}${e.ongoing ? "+" : ""}</button>`;
    }).join("");
    return `<span class="icon-chat-statuses__group${on ? "" : " icon-chat-statuses__group--off"}" ${on ? "" : 'title="Not triggered by this roll"'}>${g.section ? `<small class="icon-chat-statuses__section">${esc(g.section)}</small>` : ""}${btns}</span>`;
  }).join("");

  const rowsHtml = rows.length
    ? rows.map(t => `<div class="icon-chat-statuses__row" data-target-uuid="${esc(t.actorUuid)}">
        ${t.img ? `<img class="icon-chat-card__target-img" src="${esc(t.img)}" alt="" width="24" height="24">` : ""}
        <strong class="icon-chat-statuses__name">${esc(t.name)}</strong>
        <span class="icon-chat-statuses__buttons">${buttons(t)}</span>
      </div>`).join("")
    : `<div class="icon-chat-statuses__row icon-chat-statuses__row--live">
        <strong class="icon-chat-statuses__name" title="No token was targeted when this card was posted: the buttons apply to whoever is targeted when you click">🎯 Current targets</strong>
        <span class="icon-chat-statuses__buttons">${buttons(null)}</span>
      </div>`;

  return `<div class="icon-chat-statuses" data-ability="${esc(abilityName)}">
    <div class="icon-chat-statuses__header"><span>Inflict</span><span class="icon-chat-statuses__note">click to apply · ⚄ = save first (10+)</span></div>
    ${rowsHtml}
  </div>`;
}
