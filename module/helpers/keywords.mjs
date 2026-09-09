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

/**
 * Wrap rule keywords in tooltip spans. Safe on plain text and on HTML.
 * @param {string} html
 * @returns {string}
 */
export function enrichRuleKeywords(html) {
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
    for (const m of text.matchAll(COMBINED)) {
      const entry = _lookup(m[0]);
      const tip = entry ? def(entry.term) : "";
      if (!tip) continue;
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const span = document.createElement("span");
      span.className = `icon-kw${entry.cls ? ` icon-kw--${entry.cls}` : ""}`;
      span.dataset.tooltip = `${entry.term}: ${tip}`;
      span.textContent = m[0];
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last === 0) continue;
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.replaceWith(frag);
  }
  return tpl.innerHTML;
}
