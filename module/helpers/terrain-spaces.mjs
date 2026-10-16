/**
 * terrain-spaces.mjs — the single terrain spaces an ability or trait marks on the map (R33b).
 *
 * Book rules (p.89): "Difficult Terrain - Costs +1 space of movement to exit"; "Dangerous Terrain - Entering or
 * exiting a dangerous terrain space causes a character to take 2 piercing damage, (ignoring armor and vigor).
 * Characters can only take this damage once a turn, even if they enter new dangerous terrain spaces"; "Pit - …
 * Pits count as one level lower of elevation than their base space". Terrain effects (p.96): "passive effects
 * that modify the terrain spaces of the battlefield and can overlap with each other … not removed if you are
 * defeated".
 *
 * The jobs write them as:
 *   pits       "create two pits" (Terraforming), "create a watery pit under them" (Deepwrath), "The center space
 *              also becomes a pit" (Implode Talent II), "they also have a pit created under them" (Symphony),
 *              "Summon a pit for every two aether infused" (MAGNARIME); "The pit is also dangerous terrain"
 *              after it makes it a dangerous pit (Eclipse Talent I, Pyroclast's MAGMOTIC)
 *   terrain    "a space of dangerous terrain", "two spaces of difficult terrain", "up to 3 spaces of dangerous
 *              terrain", "two lightning dangerous terrain spaces", "a line 3 area of difficult terrain"
 *   named      "create pulsing motes" (Symphony), "throw an explosive mine" (Party Favor), "Inscribe an Elden
 *              Rune on the space underneath you", "create an afterimage terrain effect" (Gates of Hell), "Create a
 *              burning brand of star fire in range, dangerous terrain" (Eclipse); "Choose a space (on the
 *              battlefield) in range" names the space after the ability (Polaris, Implode)
 *   extension  "extend the area by 2 spaces, adding to its total area" (Blood Grove Talent II / HUNGRY GROVE)
 *
 * Pure (no Foundry globals), so the compendium can be checked from Node.
 */

// Text fields read, with the label the chip shows for where the space comes from (as objects.mjs).
const ABILITY_FIELDS = [
  ["description", ""], ["hitEffect", "Hit"], ["missEffect", "Miss"], ["areaEffect", "Area"],
  ["chargeEffect", "Charge"], ["heroicEffect", "Heroic"], ["exceedEffect", "Exceed"],
  ["collideEffect", "Collide"], ["slayEffect", "Slay"], ["critEffect", "Critical"],
  ["finishingBlowEffect", "Finishing Blow"], ["comebackEffect", "Comeback"], ["comboEffect", "Combo"],
  ["talent1", "Talent I"], ["talent2", "Talent II"], ["mastery", "Mastery"],
];

const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const titleCase = (s) => String(s ?? "").trim().toLowerCase().replace(/(^|[\s(-])([a-zà-ÿ])/g, (_m, a, b) => a + b.toUpperCase());

const NUMBERS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
/** "two" → 2, "3" → 3, "up to four" → 4, else 0. */
function countWord(w) {
  const s = String(w ?? "").trim().toLowerCase().replace(/^up to\s+/, "");
  if (/^\d+$/.test(s)) return Number(s);
  return NUMBERS[s] ?? 0;
}
const COUNT = "up to (?:\\d+|one|two|three|four|five|six)|an?|one|two|three|four|five|six|\\d+";

// Verbs that make a space ("create", "summon", "becomes", "leave", "throw", "inscribe", "place").
const MAKES = /\b(?:creat(?:e|es|ed|ing)|summon(?:s|ed|ing)?|becomes?|leaves?|throw(?:s|ing)?|inscribes?|places?)\b/i;
// Labels that open the next, unrelated block (a reminder text stops there).
const NEXT_BLOCK = /\b(?:Effect|Charge|Heroic|Exceed|Collide|Slay|Critical|Comeback|Finishing Blow|Mark|Summon|Object|Terrain [Ee]ffect|Area [Ee]ffect|(?:Slay or )?Infuse (?:\d+|X))\s*:/;
// "lasts until this ability is used again", "disappears if you use this ability again", "is replaced if … again"
const REPLACE = /\b(?:lasts? until this ability is used again|disappears? if you use this ability again|(?:is|are) replaced if (?:this ability is )?(?:used|created) again)\b/i;

/** The sentence of `t` around index `at`: [start, end). Sentences end on "." or ";". */
function sentenceBounds(t, at) {
  let start = at;
  while (start > 0 && !/[.;]/.test(t[start - 1])) start--;
  let end = at;
  while (end < t.length && !/[.;]/.test(t[end])) end++;
  return [start, Math.min(t.length, end + 1)];
}

/** The Infuse version a match at `at` sits in ("Infuse 3: DAGON — …"), or "". */
function infuseAround(t, at) {
  let name = "";
  for (const m of t.matchAll(/\bInfuse (?:\d+|X)\s*:\s*([A-ZÄÖÜ][A-ZÄÖÜ' ]{2,}?)\s+[—–]/g)) {
    if (m.index > at) break;
    // Another block opened between the Infuse name and the match ("Effect:" …): not inside it.
    const between = t.slice(m.index + m[0].length, at);
    name = /\b(?:Effect|Charge|Heroic|Exceed|Collide|Slay|Critical|Comeback|Finishing Blow|Mark|Terrain [Ee]ffect)\s*:/.test(between) ? "" : titleCase(m[1]);
  }
  return name;
}

/** The sentences from `start` up to the next block label (a mark's reminder text). */
function reminderFrom(t, start) {
  const rest = t.slice(start);
  const stop = NEXT_BLOCK.exec(rest);
  return (stop ? rest.slice(0, stop.index) : rest).trim();
}

/**
 * What a named mark's rules say happens when a character enters it or starts their turn there:
 *   "Any character that enters an affected space or starts their turn there detonates the mote …" (Symphony p.178)
 *   "When any character enters the space, the mine explodes …" (Party Favor)
 *   "A foe can scrub out an Elden Rune by entering or exiting its space" (Elden Rune)
 * @returns {{onEnter:string, enterFoes:boolean, enterExit:boolean, onStart:boolean}}
 */
function enterRules(t, from) {
  const rest = t.slice(from);
  const stopAt = NEXT_BLOCK.exec(rest)?.index ?? rest.length;
  const enter = /[^.;]*\b(?:enters?|entering)\b[^.;]*[.;]?/i.exec(rest.slice(0, stopAt));
  if (!enter) return { onEnter: "", enterFoes: false, enterExit: false, onStart: false };
  const sentence = enter[0].trim();
  return {
    onEnter: reminderFrom(t, from + enter.index),
    enterFoes: /^(?:a foe|foes)\b/i.test(sentence),
    enterExit: /\bor exit(?:s|ing)?\b/i.test(sentence),
    onStart: /\bstarts? their turn there\b/i.test(sentence),
  };
}

/** Label of a space spec: "Pit", "Dangerous pit", "Dangerous", "Difficult", "Mote", "Area +2". */
export function terrainLabel(s) {
  if (s.kind === "extend") return "Area";
  if (s.kind === "pit") return s.dangerous ? "Dangerous pit" : "Pit";
  if (s.kind === "dangerous") return s.foesOnly ? "Dangerous (foes)" : "Dangerous";
  if (s.kind === "difficult") return "Difficult";
  return s.name || "Mark";
}

/**
 * The terrain spaces one rules text makes, in order of appearance.
 * @param {string} text  plain or HTML
 * @param {{itemName?: string}} [opts]  the ability's name, for "Choose a space in range" (Polaris, Implode)
 * @returns {Array<{kind:"pit"|"dangerous"|"difficult"|"mark"|"extend", name:string, count:number,
 *   dangerous:boolean, foesOnly:boolean, under:string, free:boolean, apart:boolean, replace:boolean,
 *   onEnter:string, enterFoes:boolean, enterExit:boolean, onStart:boolean, rules:string, infuse:string}>}
 *   count 0 = as many as needed ("under every foe", "for every two aether")
 */
export function terrainSpacesInText(text, { itemName = "" } = {}) {
  const t = plain(text);
  if (!t || !/\b(?:pits?|terrain|motes?|mines?|runes?|afterimages?|brands?|waterspouts?|choose a space|extend the area)\b/i.test(t)) return [];
  const replace = REPLACE.test(t);
  const found = [];
  const add = (at, spec) => {
    const [s0, s1] = sentenceBounds(t, at);
    const sentence = t.slice(s0, s1);
    const rest = t.slice(at, s1);
    // "a space of dangerous terrain under every foe", "a pit under them" after "all characters": one per character.
    const many = spec.count <= 1 && /\b(?:all|every|each)\b/i.test(sentence) && !spec.fixed;
    found.push({
      at, name: "", dangerous: false, foesOnly: false, under: "", replace, infuse: infuseAround(t, at),
      onEnter: "", enterFoes: false, enterExit: false, onStart: false,
      free: /\b(?:in|into) (?:an?|any) free (?:adjacent )?space\b|\bin free space\b/i.test(rest),
      apart: false, rules: sentence.trim(),
      ...spec, count: many ? 0 : spec.count,
    });
  };

  // Pits. A count word right before ("a watery pit", "two pits", "a magma-filled Pit") and a verb that makes it
  // earlier in the sentence; "a pit created under them" (Symphony) puts the verb after. "hits a pit", "inside
  // pits", "When a boulder or pit is created" make none.
  for (const m of t.matchAll(new RegExp(`\\b(${COUNT})\\s+(?:[a-z][\\w-]*\\s+)?pits?\\b`, "gi"))) {
    const [s0] = sentenceBounds(t, m.index);
    const before = t.slice(s0, m.index);
    const after = t.slice(m.index + m[0].length, m.index + m[0].length + 20);
    if (!MAKES.test(before) && !/^\s*created under\b/i.test(after)) continue;
    const next = t.slice(sentenceBounds(t, m.index)[1]);
    add(m.index, { kind: "pit", count: countWord(m[1]), fixed: countWord(m[1]) > 1,
      dangerous: /^\s*the pit is (?:also |additionally )?dangerous terrain\b/i.test(next) });
  }
  // MAGNAGEO's crater: "boulders in each side space of a small blast centered on target, pit in the center".
  for (const m of t.matchAll(/[,—–]\s*pit in the cent(?:er|re)\b/gi)) {
    const [s0] = sentenceBounds(t, m.index);
    if (MAKES.test(t.slice(s0, m.index))) add(m.index + 1, { kind: "pit", count: 1, fixed: true });
  }
  // Dangerous / difficult terrain spaces.
  for (const m of t.matchAll(new RegExp(`\\b(${COUNT})\\s+(?:spaces?\\s+of\\s+(?:[a-z][\\w-]*\\s+)?(dangerous|difficult)\\s+terrain|(?:[a-z][\\w-]*\\s+)?(dangerous|difficult)\\s+terrain\\s+spaces?)\\b`, "gi"))) {
    const n = countWord(m[1]);
    add(m.index, { kind: (m[2] ?? m[3]).toLowerCase(), count: n, fixed: n > 1 });
  }
  // "Create a line 3 area of difficult terrain" (Terraforming): that many spaces.
  for (const m of t.matchAll(/\ba line (\d+) area of (dangerous|difficult) terrain\b/gi))
    add(m.index, { kind: m[2].toLowerCase(), count: Number(m[1]), fixed: true });

  // Named marks: a mote, a mine, a rune, an afterimage, a brand — made by a verb earlier in the sentence.
  // R33c: "Summon a waterspout in a space in range that is difficult terrain" (Waterspout p.235) — a one-space mark
  // that moves ("you may move the waterspout 1 space", area-motion.mjs).
  for (const m of t.matchAll(/\b(motes?|mines?|runes?|afterimages?|brands?|waterspouts?)\b/gi)) {
    const [s0, s1] = sentenceBounds(t, m.index);
    const before = t.slice(s0, m.index);
    const verb = [...before.matchAll(/\b(?:creat(?:e|es|ing)|summon(?:s|ing)?|throw(?:s|ing)?|inscribes?|places?)\b/gi)].pop();
    if (!verb) continue;
    const between = before.slice(verb.index + verb[0].length).trim();
    if (between.split(/\s+/).filter(Boolean).length > 3) continue;     // too far: not what the verb makes
    const noun = m[1].toLowerCase().replace(/s$/, "");
    const cap = /([A-Z][\w'-]+)\s*$/.exec(between);                    // "an Elden Rune"
    const name = cap && !/^(?:An?|The)$/.test(cap[1]) ? `${cap[1]} ${titleCase(noun)}` : titleCase(noun);
    const first = between.split(/\s+/)[0] ?? "";
    let count = countWord(first);
    if (!count) count = countWord(/\bup to (\w+)\b/i.exec(t.slice(s0, s1))?.[1]) || 1;
    const rest = t.slice(m.index + m[0].length, s1);
    const next = t.slice(s1);
    const danger = /^[^.;]*?,\s*dangerous terrain\b/i.test(rest)
      ? { dangerous: true, foesOnly: false }
      : (() => {
        const d = new RegExp(`^\\s*the ${noun}s? (?:is|are) (?:also |additionally )?dangerous terrain(,? but only for foes| for foes)?`, "i").exec(next);
        return d ? { dangerous: true, foesOnly: !!d[1] } : { dangerous: false, foesOnly: false };
      })();
    add(m.index, {
      kind: "mark", name, count, fixed: count > 1, ...danger,
      difficult: /\bthat is difficult terrain\b/i.test(rest),
      under: /\b(?:on|in) the space (?:underneath|under|beneath) you\b/i.test(rest) ? "self" : "",
      // Symphony's motes: "None can be placed adjacent to each other or overlap"
      apart: /\bnone can be placed adjacent to each other\b/i.test(t),
      ...enterRules(t, s1),
    });
  }
  // "Choose a space on the battlefield in range 5" (Polaris), "Choose a space in range" (Implode): the space the
  // ability works on, named after it.
  for (const m of t.matchAll(/\bchoose a space (?:on the battlefield )?in range\b/gi)) {
    add(m.index, { kind: "mark", name: titleCase(itemName) || "Space", count: 1, fixed: true });
  }
  // "extend the area by 2 spaces, adding to its total area on any edge" (Blood Grove Talent II), "extend the area by
  // 1 space, added to its total area" (HUNGRY GROVE): spaces added to the ability's area already on the map.
  for (const m of t.matchAll(/\bextend the area by (\d+|one|two|three) spaces?\b[^.;]*?\b(?:adding|added) to its total area\b/gi)) {
    add(m.index, { kind: "extend", count: countWord(m[1]) || 1, fixed: true });
  }

  found.sort((a, b) => a.at - b.at);
  // One spec per kind and name in a text (Symphony's "create a mote" in the mastery is the same mote).
  const out = [];
  const seen = new Set();
  for (const { at, fixed, ...s } of found) {
    const key = `${s.kind}|${s.name}|${s.dangerous}|${s.infuse}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...s, label: terrainLabel(s) });
  }
  return out;
}

/**
 * R33d: a talent / mastery text that lets the ability's space go on a character instead, following them:
 *   "You can cause one of your Polaris to follow a character as a mark instead of a space" (Polaris Talent I, p.202)
 *   "You can throw the party favor at any character in range instead, making it a mark. You can gamble at the end
 *    of any turn after yours to detonate it, ending the mark and effect" (Party Favor's Amico, p.151)
 *   "You can choose a character with this ability instead of a space, but it doesn't stun the center character. If
 *    that character is defeated, Implode immediately activates" (Implode's WAKING VOID, p.211)
 * Only "as a mark" / "making it a mark" is a mark (p.95: one per marker → target, ends when the marker is
 * defeated); Waking Void doesn't say so and is kept as a tracker.
 * @param {string} text
 * @returns {{rule:string, mark:boolean, detonate:boolean, onDefeat:string}|null}
 */
export function markOnCharacterIn(text) {
  const t = plain(text);
  if (!t || !/\b(?:a|any) character\b[^.;]*\binstead\b|\binstead\b[^.;]*\b(?:a|any) character\b/i.test(t)) return null;
  return {
    rule: t,
    mark: /\b(?:as|making it) a mark\b/i.test(t),
    detonate: /\bgamble at the end of any turn after yours to detonate\b/i.test(t),
    onDefeat: /\bif that character is defeated,\s*[^.;]*[.;]?/i.exec(t)?.[0]?.trim() ?? "",
  };
}

/**
 * The terrain spaces an ability (or a trait) marks on the map. A talent counts only when it is the selected one,
 * the mastery only once unlocked (as objectsForItem). R33d: a named space of the ability's own text gets
 * `onCharacter` ({source, rule, mark, detonate, onDefeat}) when the talent / mastery in play lets it go on a
 * character instead (markOnCharacterIn).
 * @param {object} system   the item's system data
 * @param {{trait?: boolean, itemName?: string}} [opts]
 * @returns {Array<object>}  terrainSpacesInText specs, plus `source` (where it comes from) and `field`
 */
export function terrainSpacesForItem(system, { trait = false, itemName = "" } = {}) {
  const s = system ?? {};
  const talent = Number(s.talentSelected) || 0;
  const out = [];
  const seen = new Set();
  let onCharacter = null;
  for (const [field, source] of trait ? [["description", ""]] : ABILITY_FIELDS) {
    if (field === "talent1" && talent !== 1) continue;
    if (field === "talent2" && talent !== 2) continue;
    if (field === "mastery" && !s.masteryUnlocked) continue;
    if (!trait && ["talent1", "talent2", "mastery"].includes(field) && !onCharacter) {
      const oc = markOnCharacterIn(s[field]);
      if (oc) onCharacter = { ...oc, source };
    }
    for (const sp of terrainSpacesInText(s[field], { itemName })) {
      const key = `${sp.kind}|${sp.name}|${sp.dangerous}|${sp.infuse}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...sp, source: sp.infuse || source, field });
    }
  }
  // The space the base text names (Polaris' space, Party Favor's mine, Implode's centre), not a talent's own.
  if (onCharacter) {
    const sp = out.find(x => x.kind === "mark" && x.field === "description" && !x.infuse);
    if (sp) sp.onCharacter = onCharacter;
  }
  return out;
}
