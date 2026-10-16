/**
 * area-terrain.mjs — what a terrain-effect area does once it is on the map (R33c).
 *
 * Book rules: Terrain effects (p.96) "passive effects that modify the terrain spaces of the battlefield and can
 * overlap with each other … not removed if you are defeated"; Dangerous / Difficult terrain (p.89). The jobs write
 * an area's terrain in the block that creates it:
 *   kinds      "The area is a medium blast terrain effect that is difficult and dangerous terrain" (Tsunami p.233),
 *              "The area is dangerous terrain for foes" (Blood Grove p.186, Morrigan's Dark Wing p.171),
 *              "The area is dangerous terrain" (Blitz's Gungnir p.225, Bio's Magnabio p.218),
 *              "All spaces of this terrain effect are shadow clouds" (Nocturne p.163; Shadow Cloud p.161:
 *              "Difficult terrain. While inside this terrain space, characters are blinded+")
 *   entering   "Characters that enter any end space of the line gain phasing …" (Gust p.234), "Yourself and allies
 *              that enter any space in or adjacent to the area can grab on to it …" (Bifröst p.226)
 *   several    "you cannot have more than three areas active" (Gust's NORTHSOUL p.234), "Create a second cloud"
 *              (Mist Strider's charge p.170), "Create a new line 3 terrain effect, which cannot overlap the first"
 *              (Bifröst's HEIMDALL), "creating a second line 3 area" (PATH TO ERENHELION p.226)
 *   moving     "your tsunami moves 4 spaces in a straight line towards that edge" (Tsunami p.233), "Your active
 *              tsunamis move 2 spaces in that direction" (STORMLASH), "Once during your turn, you may move the
 *              waterspout 1 space" (Waterspout p.235), "At the start of your turn, you can move the area 1 space in
 *              any direction" (Ätherwand Talent II p.226), "moves anywhere from 1 to 4 spaces" (LEGENDARY STORM)
 *   growing    "Bifröst areas grow by 2 spaces at the end of each round" (Bifröst Talent II p.226), "At round 4 or
 *              later, waterspouts grow to a small blast area instead of a single space" (HURRICANE p.235)
 *
 * Pure (no Foundry globals), so the compendium can be checked from Node.
 */

const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const NUMBERS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const num = (w) => /^\d+$/.test(String(w ?? "")) ? Number(w) : (NUMBERS[String(w ?? "").toLowerCase()] ?? 0);

// The label that opens the next, unrelated block: an area's terrain text stops there.
const NEXT_LABEL = /\b(?:Effect|Charge|Heroic|Exceed|Collide|Slay|Critical|Comeback|Finishing Blow|Mark|Summon|Object|Special|Trigger|Hit|Miss|Area|Attack|Area [Ee]ffect|Terrain [Ee]ffect|(?:Slay or )?Infuse (?:\d+|X)(?: or Slay)?)\s*:/;

// Terrain the book names once and the jobs only refer to (Shade's traits, p.161).
const KNOWN = [
  [/\bshadow clouds?\b/i, { name: "Shadow cloud", difficult: true,
    rules: "Shadow Cloud (p.161): Difficult terrain. While inside this terrain space, characters are blinded+. You are immune to these effects." }],
];

/** The sentence of `t` around index `at`, as [start, end). Sentences end on "." or ";". */
function sentenceBounds(t, at) {
  let s0 = at;
  while (s0 > 0 && !/[.;]/.test(t[s0 - 1])) s0--;
  let s1 = at;
  while (s1 < t.length && !/[.;]/.test(t[s1])) s1++;
  return [s0, Math.min(t.length, s1 + 1)];
}
const sentenceAt = (t, at) => { const [a, b] = sentenceBounds(t, at); return t.slice(a, b).trim(); };

/** Label of an area's terrain flag: "Dangerous & difficult", "Dangerous (foes)", "Shadow cloud", "Terrain". */
export function areaTerrainLabel(s) {
  const kinds = s.dangerous && s.difficult ? "Dangerous & difficult" : s.dangerous ? (s.foesOnly ? "Dangerous (foes)" : "Dangerous")
    : s.difficult ? "Difficult" : "";
  if (s.name) return kinds && !(s.difficult && !s.dangerous) ? `${s.name} · ${kinds}` : s.name;
  return kinds || "Terrain";
}

/**
 * What an area's terrain block says about its spaces: dangerous / difficult (for foes only?), a known terrain
 * (shadow clouds), and the sentence a character entering it sets off.
 * @param {string} block  plain or HTML
 * @returns {object}  a terrain flag spec (kind "area"), the shape terrain-spaces.mjs reads at movement
 */
export function terrainOfBlock(block) {
  const b = plain(block);
  const k = /\b(?:is|are|becomes?)\s+(?:also\s+|all\s+)?(difficult and dangerous|dangerous and difficult|dangerous|difficult)\s+terrain(\s+for foes|,?\s+but only for foes)?/i.exec(b);
  let dangerous = !!k && /dangerous/i.test(k[1]);
  let difficult = !!k && /difficult/i.test(k[1]);
  const foesOnly = !!k?.[2];
  let name = "", extra = "";
  for (const [re, known] of KNOWN) {
    if (!re.test(b)) continue;
    name = known.name; difficult ||= !!known.difficult; dangerous ||= !!known.dangerous; extra = known.rules;
  }
  const enter = /[^.;]*\b(?:enters?|entering)\b[^.;]*[.;]?/i.exec(b);
  const sentence = enter ? enter[0].trim() : "";
  const spec = {
    kind: "area", name, dangerous, difficult, pit: false, foesOnly,
    rules: extra ? `${b} ${extra}` : b,
    onEnter: enter ? b.slice(enter.index).trim() : "",
    enterFoes: /^(?:a foe|foes)\b/i.test(sentence),
    enterAllies: /^(?:yourself and allies|you and allies|allies)\b/i.test(sentence),
    enterExit: /\bor exit(?:s|ing)?\b/i.test(sentence),
    onStart: false,
  };
  spec.label = areaTerrainLabel(spec);
  return spec;
}

/**
 * The terrain of the area a text writes at index `at` (areasInText's match), or null when its sentence is not a
 * terrain effect: Morrigan's Dark Wing "creating a small blast terrain effect in range 3. The area is dangerous
 * terrain for foes" (p.171) → dangerous for foes; Magnabio's "Large Blast" attack (p.218) → null, its "medium blast
 * toxic cloud terrain effect" → dangerous. The block runs from the sentence to the next label.
 * @param {string} text  the text with its HTML tags replaced by spaces (same indexes as areasInText's)
 * @param {number} at
 */
export function areaTerrainAt(text, at) {
  const t = String(text ?? "");
  const [s0, s1] = sentenceBounds(t, at);
  if (!/\bterrain effect\b/i.test(t.slice(s0, s1))) return null;
  const rest = t.slice(at);
  const stop = NEXT_LABEL.exec(rest);
  return terrainOfBlock(t.slice(s0, at + (stop ? stop.index : rest.length)));
}

/**
 * The "Terrain effect:" block of an ability's text, read as its area's terrain (an area from the tags: Gust's Line
 * 3, Bifröst's Line 3), or null when the text has none.
 * @param {string} text
 */
export function terrainBlockOf(text) {
  const t = plain(text);
  const m = /\bTerrain [Ee]ffect\s*:/i.exec(t);
  if (!m) return null;
  const rest = t.slice(m.index + m[0].length);
  const stop = NEXT_LABEL.exec(rest);
  return terrainOfBlock(stop ? rest.slice(0, stop.index) : rest);
}

/**
 * How many areas of the ability may be on the map at once (default 1: a new one replaces the old).
 * @param {Array<[string, string]>} texts  [source label, text] pairs: the ability's active blocks
 * @returns {{max:number, source:string, rule:string}|null}
 */
export function areaStackLimit(texts) {
  for (const [source, text] of texts ?? []) {
    const t = plain(text);
    const m = /\b(?:cannot|can't|can not) have more than (\w+) areas? (?:active|at once|on the battlefield)\b/i.exec(t);
    if (m && num(m[1]) > 1) return { max: num(m[1]), source, rule: sentenceAt(t, m.index) };
  }
  for (const [source, text] of texts ?? []) {
    const t = plain(text);
    // Not "without ending your turn or creating a new area" (Eclipse's mastery, p.203).
    const m = [...t.matchAll(/\bcreat(?:e|es|ing) a (?:second|new) (?:[\w-]+ ){0,3}?(?:clouds?|areas?|terrain effects?)\b/gi)]
      .find(x => !/\bwithout\b[^.;]*$/i.test(t.slice(Math.max(0, x.index - 60), x.index)));
    if (m) return { max: 2, source, rule: sentenceAt(t, m.index) };
  }
  return null;
}

/**
 * How an area moves once placed, from the ability's active blocks, or null.
 * @param {Array<[string, string]>} texts
 * @returns {{edge?: {steps:number, source:string, rule:string, onUse:boolean}, drag?: boolean, offMapEnds?: boolean,
 *   lash?: {steps:number, source:string, rule:string}, free?: {steps:number, at:"start"|"turn", noun:string,
 *   source:string, rule:string}, freeAlt?: {steps:number, source:string, rule:string},
 *   range?: {round:number, min:number, max:number, source:string, rule:string}}|null}
 */
export function areaMotion(texts) {
  let out = null;
  const set = (k, v) => { (out ??= {})[k] = v; };
  for (const [source, text] of texts ?? []) {
    const t = plain(text);
    let m = /\bmoves? (\d+|one|two|three|four|five|six) spaces? in a straight line towards? (?:that|the chosen) edge\b/i.exec(t);
    if (m) {
      set("edge", { steps: num(m[1]), source, rule: sentenceAt(t, m.index),
        onUse: /\bwhen you use this ability, and (?:at )?the start of your turns?\b/i.test(t) });
      set("drag", /\bwhen it moves are dragged with it\b/i.test(t));
      set("offMapEnds", /\bwould move off the map, the effect ends\b/i.test(t));
    }
    m = /\byour active [\w-]+ move (\d+|one|two|three|four) spaces? in that direction\b/i.exec(t);
    if (m) {
      const name = [...t.slice(0, m.index).matchAll(/\bInfuse (?:\d+|X)\s*:\s*([A-ZÄÖÜ][A-ZÄÖÜ' ]{2,}?)(?=\s*[(—–-])/g)].pop();
      set("lash", { steps: num(m[1]), source: name ? name[1].trim() : source, rule: sentenceAt(t, m.index) });
    }
    m = /\b(once during your turn|at the start of your turns?),? you (?:can|may) move the ([\w-]+) (\d+|one|two|three) spaces?\b/i.exec(t);
    if (m) set("free", { steps: num(m[3]), at: /start/i.test(m[1]) ? "start" : "turn", noun: m[2].toLowerCase(), source, rule: sentenceAt(t, m.index) });
    m = /\bit can move (\d+|one|two|three|four) spaces? instead\b/i.exec(t);
    if (m) set("freeAlt", { steps: num(m[1]), source, rule: sentenceAt(t, m.index) });
    m = /\bat round (\d+)\+?(?: or later)?,[^.;]*?\bmoves? anywhere from (?:to )?(\d+) to (\d+) spaces?\b/i.exec(t);
    if (m) set("range", { round: Number(m[1]), min: Number(m[2]), max: Number(m[3]), source, rule: sentenceAt(t, m.index) });
    // Tsunami Talent I: "Tsunami creates a pit in its center space after completing its movement" — a reminder.
    m = /\bafter completing its movement\b/i.exec(t);
    if (m) set("afterMove", { source, rule: t.slice(sentenceBounds(t, m.index)[0]).split(/(?<=[.;])\s+/).slice(0, 2).join(" ") });
  }
  return out;
}

/**
 * Growth at the end of each round: "Bifröst areas grow by 2 spaces at the end of each round. When they grow, deal 1
 * piercing damage to all characters inside" (Bifröst Talent II p.226) → { count: 2, note: "When they grow, …" }.
 * @param {Array<[string, string]>} texts
 * @returns {{count:number, source:string, rule:string, note:string}|null}
 */
export function areaGrowth(texts) {
  for (const [source, text] of texts ?? []) {
    const t = plain(text);
    const m = /\b(?:areas?|it|they) grows? by (\d+|one|two|three|four) spaces?\b[^.;]*?\bat the end of each round\b/i.exec(t);
    if (!m) continue;
    const [, s1] = sentenceBounds(t, m.index);
    const next = sentenceAt(t, Math.min(t.length - 1, s1 + 1));
    return { count: num(m[1]), source, rule: sentenceAt(t, m.index), note: /^when (?:they|it) grows?\b/i.test(next) ? next : "" };
  }
  return null;
}

/**
 * A single-space mark that grows into an area from a round on: HURRICANE (p.235), "At round 4 or later, waterspouts
 * grow to a small blast area instead of a single space. They become dangerous terrain …".
 * @param {Array<[string, string]>} texts
 * @returns {{round:number, size:"s"|"m"|"l", noun:string, dangerous:boolean, source:string, rule:string}|null}
 */
export function markGrowTo(texts) {
  for (const [source, text] of texts ?? []) {
    const t = plain(text);
    const m = /\bat round (\d+)(?: or later|\+),? ([\w-]+?)s? grow to an? (small|medium|large) blast(?: area)? instead of a single space\b/i.exec(t);
    if (!m) continue;
    const [s0] = sentenceBounds(t, m.index);
    const rest = t.slice(s0);
    return { round: Number(m[1]), size: m[3][0].toLowerCase(), noun: m[2].toLowerCase(), source,
      dangerous: /\b(?:they|it) becomes? dangerous terrain\b/i.test(rest), rule: rest.split(/(?<=[.;])\s+/).slice(0, 2).join(" ") };
  }
  return null;
}

/**
 * The blocks of an ability that are in play: the base text and its effect blocks, the selected talent, the unlocked
 * mastery (as terrainSpacesForItem / objectsForItem).
 * @param {object} system  the item's system data
 * @returns {Array<[string, string]>}
 */
export function activeAreaTexts(system) {
  const s = system ?? {};
  const talent = Number(s.talentSelected) || 0;
  return [
    ["", s.description], ["", s.effect], ["Area", s.areaEffect], ["Hit", s.hitEffect], ["Charge", s.chargeEffect],
    ["Heroic", s.heroicEffect], ["Collide", s.collideEffect], ["Slay", s.slayEffect],
    talent === 1 ? ["Talent I", s.talent1] : null, talent === 2 ? ["Talent II", s.talent2] : null,
    s.masteryUnlocked ? ["Mastery", s.mastery] : null,
  ].filter(e => e && typeof e[1] === "string" && e[1].trim());
}

/** The ability's base text, without its talents and mastery: whether its own area is a terrain effect. */
export function baseAreaText(system) {
  const s = system ?? {};
  return Object.entries(s).filter(([k, v]) => typeof v === "string" && !["talent1", "talent2", "mastery"].includes(k)).map(([, v]) => v).join(" ");
}
