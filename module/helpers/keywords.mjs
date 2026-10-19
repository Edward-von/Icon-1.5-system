/**
 * keywords.mjs — Inline rule keywords with tooltips.
 *
 * `enrichRuleKeywords(html)` wraps known ICON keywords found in the TEXT of
 * an enriched HTML string ("slashed", "rush 2", "true strike", "gamble", …)
 * in `<span class="icon-kw" data-tooltip="…">` so every ability, trait and
 * foe action shows the rule on hover, the same way the tag chips do.
 * Definitions come from the in-system Reference glossary (reference.mjs),
 * so there is one source of truth for the rule text.
 *
 * Only text nodes are touched; anything already inside a tooltip, a link or
 * a code element is skipped, and elements are never nested twice.
 */

import { GLOSSARY } from "../apps/reference.mjs";
import { summonIndex } from "./summons.mjs";

/** Plain-text glossary definition for a term (case-insensitive). */
const _defs = new Map();
for (const group of GLOSSARY) {
  for (const [term, html] of group.terms ?? []) {
    _defs.set(term.toLowerCase(), String(html).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim());
  }
}
const def = (term) => _defs.get(term.toLowerCase()) ?? "";

/**
 * Keyword table. `re` matches the keyword itself (already bounded by \b),
 * `term` is the glossary key for the tooltip, `cls` a CSS modifier.
 * Order matters: longer / more specific patterns first.
 */
const STATUS = "status";
const KEYWORDS = [
  // ---- Statuses (negative) ----
  { re: /slashed\+?/i,                 term: "Slashed",    cls: STATUS },
  { re: /blind(?:ed)?\+?/i,            term: "Blind",      cls: STATUS },
  { re: /dazed\+?/i,                   term: "Dazed",      cls: STATUS },
  { re: /hatred\+?(?: of (?:you|them|that character|the [a-z]+|[a-z]+))?/i, term: "Hatred of X", cls: STATUS },
  { re: /pacified\+?/i,                term: "Pacified",   cls: STATUS },
  { re: /sealed\+?/i,                  term: "Sealed",     cls: STATUS },
  { re: /shattered\+?/i,               term: "Shattered",  cls: STATUS },
  { re: /stunned\+?/i,                 term: "Stunned",    cls: STATUS },
  { re: /weakened\+?/i,                term: "Weakened",   cls: STATUS },
  { re: /vulnerable\+?/i,              term: "Vulnerable", cls: STATUS },
  { re: /immobile\+?/i,                term: "Immobile",   cls: STATUS },
  { re: /incapacitated/i,              term: "Incapacitated", cls: STATUS },
  // ---- Statuses (positive) & states ----
  { re: /true strike/i,                term: "True Strike", cls: STATUS },
  { re: /unerring/i,                   term: "Unerring",   cls: STATUS },
  { re: /unstoppable/i,                term: "Unstoppable", cls: STATUS },
  { re: /intangible/i,                 term: "Intangible", cls: STATUS },
  { re: /phasing/i,                    term: "Phasing",    cls: STATUS },
  { re: /stealth/i,                    term: "Stealth",    cls: STATUS },
  { re: /sturdy/i,                     term: "Sturdy",     cls: STATUS },
  { re: /dodge/i,                      term: "Dodge",      cls: STATUS },
  { re: /evasion/i,                    term: "Evasion",    cls: STATUS },
  { re: /flying/i,                     term: "Flying",     cls: STATUS },
  { re: /regeneration/i,               term: "Regeneration", cls: STATUS },
  { re: /defiance/i,                   term: "Defiance",   cls: STATUS },
  { re: /counter(?![ -]?clockwise)/i,  term: "Counter",    cls: STATUS },
  { re: /rampart/i,                    term: "Rampart",    cls: STATUS },
  { re: /aetherwall/i,                 term: "Aetherwall", cls: STATUS },
  { re: /bloodied/i,                   term: "Bloodied",   cls: STATUS },
  { re: /resistance/i,                 term: "Resistance", cls: STATUS },
  { re: /pierc(?:e|ing)/i,             term: "Pierce",     cls: STATUS },
  { re: /divine(?= damage)/i,          term: "Divine",     cls: STATUS },
  { re: /vigilance(?: \+?\d+)?/i,      term: "Vigilance X", cls: STATUS },
  { re: /vigor surge/i,                term: "Vigor Surge" },
  { re: /vigor/i,                      term: "Vigor" },
  // ---- Movement ----
  { re: /rush(?:es|ed|ing)?(?: \d+)?/i,       term: "Rush X" },
  { re: /dash(?:es|ed|ing)?(?: \d+)?/i,       term: "Dash" },
  { re: /shove[sd]?(?: \d+)?/i,               term: "Shove X" },
  { re: /teleport(?:s|ed|ing)?(?: \d+)?/i,    term: "Teleport X" },
  { re: /fl(?:y|ies|ying)(?= \d)(?: \d+)?/i,  term: "Fly" },
  { re: /collide[sd]?/i,                      term: "Collide" },
  { re: /engagement/i,                        term: "Engagement" },
  { re: /line of sight/i,                     term: "Line of Sight" },
  { re: /difficult terrain/i,                 term: "Difficult Terrain" },
  { re: /dangerous terrain/i,                 term: "Dangerous Terrain" },
  { re: /pits?/i,                             term: "Pit" },   // P29: bounded, so not "spit" / "pitch"
  { re: /elevation/i,                         term: "Elevation (Height)" },
  // ---- Ability keywords ----
  { re: /terrain effect/i,                    term: "Terrain Effect" },
  { re: /area (?:effect|ability)/i,           term: "Area Ability" },
  { re: /aura(?: \d+)?/i,                     term: "Aura X" },
  { re: /stance/i,                            term: "Stance" },
  { re: /summon(?:s|ed)?/i,                   term: "Summon" },
  { re: /marked/i,                            term: "Mark" },
  { re: /interrupt(?: \d+)?/i,                term: "Interrupt X" },
  { re: /delay(?:ed)?/i,                      term: "Delay" },
  { re: /slow turn/i,                         term: "Slow Turn" },
  { re: /end(?:s)? (?:your|their|its) turn/i, term: "End Turn" },
  { re: /free action/i,                       term: "Free Action" },
  { re: /finishing blow/i,                    term: "Finishing Blow" },
  { re: /comeback/i,                          term: "Comeback" },
  { re: /exceed/i,                            term: "Exceed" },
  { re: /heroics?/i,                          term: "Heroic" },
  { re: /charge(?:d)?(?= effect|:)/i,         term: "Charge" },
  { re: /slay(?= effect|:)/i,                 term: "Slay" },
  { re: /infuse(?: \d+| x)?/i,                term: "Infuse" },
  { re: /critical hit/i,                      term: "Critical Hit" },
  { re: /gamble[sd]?/i,                       term: "Gamble" },
  { re: /boons?/i,                            term: "Boon" },
  { re: /curses?/i,                           term: "Curse" },
  { re: /sacrifices?(?: \d+)?/i,              term: "Sacrifice X" },
  { re: /cure[sd]?/i,                         term: "Cure" },
  { re: /bless(?:ed|es|ing)?/i,               term: "Blessing" },
  { re: /bonus damage/i,                      term: "Bonus Damage" },
  { re: /fray(?: damage)?/i,                  term: "Fray Damage" },
  { re: /\[D\]/,                              term: "[D]", noBoundary: true },
  { re: /power die/i,                         term: "Power Die" },
  { re: /combo(?: token)?/i,                  term: "Combo" },
  { re: /rebound(?:ed)?/i,                    term: "Rebound" },
  { re: /ongoing(?=\+| status)/i,             term: "Ongoing (+)", lookup: /ongoing/i },
  { re: /(?<=\b(?:a|take|takes|taking|last|your|gain|gains|another) )wounds?/i, term: "Wound", lookup: /wounds?/i },   // `lookup`: how a bare match is recognised when `re` needs context
  { re: /armor(?: \d+)?/i,                    term: "Armor X" },
  { re: /cover/i,                             term: "Cover" },
];

/** One combined, case-insensitive regex over all keyword sources. */
const COMBINED = new RegExp(
  KEYWORDS.map(k => k.noBoundary ? `(?:${k.re.source})` : `(?:\\b(?:${k.re.source})\\b)`).join("|"),
  "gi",
);

/** Find the keyword entry a matched string belongs to. */
function _lookup(match) {
  for (const k of KEYWORDS) {
    const anchored = new RegExp(`^(?:${(k.lookup ?? k.re).source})$`, "i");
    if (anchored.test(match)) return k;
  }
  return null;
}

const SKIP_PARENTS = new Set(["A", "CODE", "PRE", "BUTTON", "INPUT", "TEXTAREA", "SELECT", "SCRIPT", "STYLE"]);

// "summon" used as a verb on something that is not a summon character. The
// book uses the same verb for objects and terrain ("Characters can often
// summon or create objects", p.89; "summon a height 1 geyser object",
// "summon a pit", "summon a waterspout") and for plain effects (Morrigan's
// "you summon a massive flock of winged beasts", p.171). Only a verb followed
// by an article or count and the name of a creature of the summons pack
// ("summon a shadow", "summon two bombs", "summon the soul") keeps the Summon
// tooltip (summons are characters, p.95); the noun ("allied summons", "a
// summon you control") always does.
const SUMMON_VERB = /^summon(?:s|ed|ing)?$/i;
const SUMMON_OBJECT = /^\s+((?:(?:a|an|the|one|two|three|four|\+?\d+|more|another|additional|extra|new|real|regular|single|each|some|up)\s+)+)([a-z][a-z' -]*)/i;
function _isSummonCharacter(after, text) {
  const m = SUMMON_OBJECT.exec(after);
  if (!m) return true;                         // no object right after it: a noun or a bare verb
  const names = summonIndex().map(e => String(e.name ?? "").toLowerCase()).filter(Boolean);
  if (!names.length) return true;              // index not loaded yet: keep the old reading
  // A creature is named in full ("salt sprite") or by its last word ("the
  // soul" for the Severed Soul, "a card").
  const words = [...new Set(names.flatMap(n => [n, n.split(/\s+/).pop()]))];
  const named = (str) => words.some(w => str.startsWith(w) && /^s?(?![a-z])/.test(str.slice(w.length)));
  const obj = m[2].toLowerCase();
  if (named(obj)) return true;
  // …or the text says what it is: "summon a mote of life … A mote of life is
  // a plant" (Dark Sliver's mastery, p.187).
  const low = String(text ?? "").toLowerCase();
  const head = obj.split(/\s+/).filter(Boolean);
  for (let k = Math.min(3, head.length); k >= 1; k--) {
    const thing = head.slice(0, k).join(" ");
    // `thing` holds only letters, spaces, "'" and "-" (SUMMON_OBJECT): no escaping needed.
    for (const hit of low.matchAll(new RegExp(String.raw`\b${thing}s? (?:is|are) (?:also )?(?:an? )?`, "g"))) {
      if (named(low.slice(hit.index + hit[0].length))) return true;
    }
  }
  return false;
}

/**
 * The rule keywords of one piece of plain text, in order. Pure (no DOM), so
 * the compendium texts can be checked from Node.
 * @param {string} text
 * @param {object} [options]
 * @param {boolean} [options.summonVerbs=false]  read "summon <something>" as
 *   above: only for player texts, whose summons are all in the summons pack.
 *   Foes summon creatures of their own stat block (natals, attack insects),
 *   so NPC texts keep every "summon".
 * @returns {Array<{index: number, text: string, entry: object, tip: string}>}
 */
export function findRuleKeywords(text, { summonVerbs = false } = {}) {
  const src = String(text ?? "");
  const out = [];
  for (const m of src.matchAll(COMBINED)) {
    const entry = _lookup(m[0]);
    const tip = entry ? def(entry.term) : "";
    if (!tip) continue;
    if (summonVerbs && entry.term === "Summon" && SUMMON_VERB.test(m[0])
        && !_isSummonCharacter(src.slice(m.index + m[0].length), src)) continue;
    out.push({ index: m.index, text: m[0], entry, tip });
  }
  return out;
}

/**
 * Wrap rule keywords in tooltip spans. Safe on plain text and on HTML.
 * @param {string} html
 * @param {object} [options]
 * @param {string|null} [options.damageDie=null]  the character's damage die
 *   ("d10"): "[D]" / "2[D]" are then shown as "d10" / "2d10" (p.84: "if
 *   you're a Freelancer, [D] is 1d10"), with "[D] = d10" in the tooltip.
 *   Null keeps the [D] symbol (item sheets, compendium, NPCs).
 * @returns {string}
 */
export function enrichRuleKeywords(html, { damageDie = null, summonVerbs = false } = {}) {
  const src = String(html ?? "");
  if (!src.trim() || typeof document === "undefined") return src;
  if (!COMBINED.test(src)) return src;
  COMBINED.lastIndex = 0;

  const tpl = document.createElement("template");
  tpl.innerHTML = src;
  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT);
  const texts = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    let p = n.parentElement, skip = false;
    while (p && p !== tpl.content) {
      if (SKIP_PARENTS.has(p.tagName) || p.hasAttribute?.("data-tooltip") || p.classList?.contains("icon-kw")) { skip = true; break; }
      p = p.parentElement;
    }
    if (!skip && COMBINED.test(n.nodeValue)) texts.push(n);
    COMBINED.lastIndex = 0;
  }

  for (const node of texts) {
    const frag = document.createDocumentFragment();
    const text = node.nodeValue;
    let last = 0;
    for (const { index, text: word, entry, tip } of findRuleKeywords(text, { summonVerbs })) {
      let before = text.slice(last, index);
      let label = word, tooltip = `${entry.term}: ${tip}`;
      if (entry.term === "[D]" && damageDie) {
        // "2[D]" → "2d10": the dice count written right before the symbol joins the die.
        const mult = before.match(/(\d+)$/);
        if (mult) before = before.slice(0, mult.index);
        label = `${mult?.[1] ?? ""}${damageDie}`;
        tooltip = `${mult?.[1] ?? ""}[D] = ${label} (your damage die is ${damageDie}). ${tip}`;
      }
      if (before) frag.appendChild(document.createTextNode(before));
      const span = document.createElement("span");
      span.className = `icon-kw${entry.cls ? ` icon-kw--${entry.cls}` : ""}`;
      span.dataset.tooltip = tooltip;
      span.textContent = label;
      frag.appendChild(span);
      last = index + word.length;
    }
    if (last === 0) continue;
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.replaceWith(frag);
  }
  return tpl.innerHTML;
}
