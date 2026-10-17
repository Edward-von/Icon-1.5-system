/**
 * area-templates.mjs — Blast / Burst / Line / Arc areas on the canvas.
 *
 * ICON 1.5 area patterns (manual p.97-98):
 *   Line X   — X spaces long, drawn orthogonally, each space further from the
 *              origin than the previous. Origin = the user (no range) or the
 *              first space of the line (with range).
 *   Arc X    — X contiguous spaces drawn sequentially in orthogonal steps, no
 *              overlap, never through the user; first space in range.
 *   Blast    — fixed templates (p.98 diagram): Small = cross of 5 spaces
 *              (every space 1 step away), Medium = 3×3, Large = every space
 *              within 2 orthogonal steps, 13 spaces — a bigger cross, not a
 *              5×5. Origin/attack space = the centre.
 *   Burst X  — a target space in range and every space within X of it (range
 *              counts diagonals, p.85). Does not affect the user unless said.
 *
 * The area is placed as a core MeasuredTemplateDocument whose cells are stored
 * in `flags.icon-system.cells`; IconMeasuredTemplate (registered as
 * CONFIG.MeasuredTemplate.objectClass) draws those cells instead of the
 * circle/cone/rect/ray shape, so every client sees the same squares. Tokens
 * standing in the cells become the placing user's targets.
 *
 * Interaction (placeAreaTemplate): the mouse drags a preview of the shape on
 * a grid highlight layer; left click places, right click / Esc cancels, the
 * mouse wheel rotates a Line. Arcs are painted one space at a time (Enter or
 * right click finishes a shorter arc). The range of the ability is shown
 * around the user's token while placing.
 *
 * Lifetime: a template is cleared at the start of its user's next turn
 * (clearExpiredAreaTemplates, called by IconCombat), since the area has
 * already done its work. Two kinds stay until removed by hand or the end of
 * the encounter: auras, which follow their token, and terrain effects, which
 * last on the battlefield (p.96) — flagged `lasting` when placed. An aura
 * whose text gives it an end ("gain aura 1 until the end of your next turn")
 * carries a countdown (`flags.icon-system.expiry`, same shape as the status
 * one in status-expiry.mjs); when it runs out, a chat card says so and offers
 * to remove it (tickAuraExpiry, called by IconCombat).
 *
 * Aura size: with the mouse over an aura already on the map, + and − grow or
 * shrink it by 1 (the keys that widen a Line while placing it), within the
 * bounds the text writes ("to a maximum of 3 or a minimum of 1", Gentleness'
 * Gentle Prayer p.179), else 1 to 5 (resizeAura).
 */
import { areaTerrainAt } from "../helpers/area-terrain.mjs";

const _log = (...a) => console.debug("[ICON | AreaTemplates]", ...a);
// Local escape: importing enrich.mjs here would close an import loop
// (enrich → keywords → reference → this module).
const escapeHTML = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const FLAG_NS    = "icon-system";
const HL_PREVIEW = "icon-area-preview";
const HL_RANGE   = "icon-area-range";

/** Template colours per pattern (hex strings for the document, ints for PIXI). */
export const AREA_COLORS = { blast: "#e07a2f", burst: "#c8402f", line: "#3d7fd6", arc: "#8a4fc4", aura: "#c4a64f" };

/** Class colours (same values as the sheet's --stalwart/--vagabond/… tokens). */
export const CLASS_COLORS = {
  stalwart: "#c0392b", vagabond: "#d4a017", mendicant: "#27ae60", wright: "#2980b9",
};

/**
 * The colour to draw an area in. Auras are the ones that pile up on the map —
 * several characters can hold one at the same time and they all looked alike —
 * so an aura takes the character's own colour: the one picked on their sheet
 * (`flags.icon-system.auraColor`), else their class colour, else the generic
 * aura gold. Blast / line / arc / burst keep the colour of their shape.
 * @param {object} area
 * @param {Actor}  actor
 * @returns {string} hex colour
 */
export function areaColor(area, actor) {
  if (area?.kind !== "aura") return AREA_COLORS[area?.kind] ?? AREA_COLORS.aura;
  const picked = String(actor?.getFlag?.("icon-system", "auraColor") ?? "").trim();
  if (/^#[0-9a-f]{6}$/i.test(picked)) return picked;
  const cls = String(actor?.system?.combat?.jobs?.find?.(j => j.primary)?.class
                  ?? actor?.system?.class ?? "").toLowerCase();
  return CLASS_COLORS[cls] ?? AREA_COLORS.aura;
}

/** Fixed blast patterns as {di, dj} offsets from the centre cell (p.98). */
const BLAST_SHAPES = {
  s: [{ di: 0, dj: 0 }, { di: -1, dj: 0 }, { di: 1, dj: 0 }, { di: 0, dj: -1 }, { di: 0, dj: 1 }],
  m: [],
  l: [],
};
for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) BLAST_SHAPES.m.push({ di, dj });
// Large blast: the diagram on p.98 is the small blast's cross grown by one
// step — every space at most 2 orthogonal steps from the centre (13 spaces),
// NOT a 5×5 block (that would be 21 and is what this used to draw).
for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) {
  if (Math.abs(di) + Math.abs(dj) > 2) continue;
  BLAST_SHAPES.l.push({ di, dj });
}
const BLAST_LABELS = { s: "Small Blast", m: "Medium Blast", l: "Large Blast" };

const cellKey = (c) => `${c.i},${c.j}`;
const chebyshev = (a, b) => Math.max(Math.abs(a.i - b.i), Math.abs(a.j - b.j));

/* -------------------------------------------------- */
/*  Tag parsing                                        */
/* -------------------------------------------------- */

/**
 * Read the area pattern (and range) out of an ability's tags.
 * Accepts raw strings or the {raw,label} objects the sheets use.
 *   ["attack","range-5","medium-blast"] → { kind:"blast", size:"m", label:"Medium Blast", range:5 }
 *   ["burst-2-self"]                    → { kind:"burst", size:2, self:true, label:"Burst 2 (self)", range:0 }
 *   ["line-4"] / ["arc-6"]              → { kind:"line"|"arc", size:N, … }
 * `size` is 0 for a bare "line"/"arc" tag (the placer asks for it).
 * `range` is 0 when the ability has no range tag (= adjacent), Infinity for
 * "no-max-range". Returns null when the tags carry no area pattern.
 * @param {Array<string|{raw:string}>} tags
 */
export function areaFromTags(tags) {
  let area = null;
  let aura = null;
  let range = 0;
  let width = 0;
  for (const t of tags ?? []) {
    const raw = String(t?.raw ?? t ?? "").trim().toLowerCase().replace(/\s+/g, "-");
    if (!raw) continue;
    let m;
    if ((m = raw.match(/^(small|medium|large)-blast$/)))        area = { kind: "blast", size: m[1][0] };
    else if ((m = raw.match(/^blast-([sml])$/)))                 area = { kind: "blast", size: m[1] };
    else if ((m = raw.match(/^burst-(\d+)(?:-(self|target))?$/))) area = { kind: "burst", size: Number(m[1]), self: m[2] === "self", target: m[2] === "target" };
    else if ((m = raw.match(/^line(?:-(\d+))?$/)))               area = { kind: "line", size: Number(m[1] ?? 0) };
    else if ((m = raw.match(/^arc(?:-(\d+))?$/)))                area = { kind: "arc", size: Number(m[1] ?? 0) };
    else if ((m = raw.match(/^aura(?:-(\d+))?$/)))               aura = { kind: "aura", size: Number(m[1] ?? 0), self: true };
    else if ((m = raw.match(/^width-(\d+)$/)))                   width = Number(m[1]);
    else if ((m = raw.match(/^range-(\d+)\+?$/)))                range = Math.max(range, Number(m[1]));
    else if (raw === "no-max-range")                             range = Infinity;
  }
  // A stance with both an aura and (say) a line keeps the line as its area;
  // the aura is a persistent effect around the user.
  area = area ?? aura;
  if (!area) return null;
  area.range = range;
  if (area.kind === "line" && width > 1) area.width = width;
  area.label = areaLabel(area);
  return area;
}

/**
 * Does the area stay on the battlefield after the turn it was used in? True
 * for terrain effects (p.96: they persist, even when their creator is
 * defeated), told by a "terrain" tag or "terrain effect" in the ability's text.
 * @param {Array<string|{raw:string}>} tags
 * @param {string} [text]  every rules text of the ability
 */
export function areaLasts(tags, text = "") {
  const keys = (tags ?? []).map(t => String(t?.raw ?? t ?? "").toLowerCase());
  return keys.some(k => k.includes("terrain")) || /terrain effect/i.test(String(text ?? ""));
}

/** Range from the tags alone: 0 = none (adjacent), Infinity = no maximum range. */
export function rangeFromTags(tags) {
  let range = 0;
  for (const t of tags ?? []) {
    const raw = String(t?.raw ?? t ?? "").trim().toLowerCase().replace(/\s+/g, "-");
    const m = raw.match(/^range-(\d+)\+?$/);
    if (m) range = Math.max(range, Number(m[1]));
    else if (raw === "no-max-range") range = Infinity;
  }
  return range;
}

/** Human label for an area spec ("Medium Blast", "Burst 2 (target)", "Line 4", "Aura 2"). */
export function areaLabel(area) {
  if (!area) return "";
  switch (area.kind) {
    case "blast": return (BLAST_LABELS[area.size] ?? "Blast") + (area.centeredOn === "target" ? " (target)" : area.centeredOn === "self" ? " (self)" : area.centeredOn === "object" ? " (on object)" : area.centeredOn === "pits" ? " (on pits)" : "");
    case "burst": return `Burst ${area.size}${area.self ? " (self)" : area.target ? " (target)" : area.centeredOn === "object" ? " (on object)" : area.centeredOn === "pits" ? " (on pits)" : ""}`;
    case "line":  return (area.size ? `Line ${area.size}` : "Line") + (area.width > 1 ? ` (width ${area.width})` : "");
    case "arc":   return area.size ? `Arc ${area.size}` : "Arc";
    case "aura":  return (area.size ? `Aura ${area.size}` : "Aura") + (area.atSpace ? " (terrain effect)" : "");
  }
  return "Area";
}

/**
 * Every area pattern mentioned in a rules text, in order of appearance:
 *   "Area becomes Arc 4 … extend the area effect to arc 8" → [Arc 4, Arc 8]
 *   "Increase area to Large Blast"                        → [Large Blast]
 * Used for the combo / charge / talent variants of an ability.
 * @param {string} text
 * @returns {object[]}  area specs (without range)
 */
export function areasInText(text) {
  const orig = String(text ?? "").replace(/<[^>]+>/g, " ");
  const plain = orig.toLowerCase();
  const out = [];
  const seen = new Set();
  let prevCentre = "";
  // "blasts": Draken Cross Talent II, "all areas may be increased to medium blasts".
  // No word boundary after "(target)": "burst 1 (target)." was read as a plain Burst 1.
  const re = /\b(?:(small|medium|large) blasts?\b|line (\d+)\b|arc (\d+)\b|burst (\d+)(?: \((self|target)\)|\b))/g;
  for (const m of plain.matchAll(re)) {
    let area;
    if (m[1]) area = { kind: "blast", size: m[1][0] };
    else if (m[2]) area = { kind: "line", size: Number(m[2]) };
    else if (m[3]) area = { kind: "arc", size: Number(m[3]) };
    else if (m[4]) area = { kind: "burst", size: Number(m[4]), self: m[5] === "self", target: m[5] === "target" };
    else continue;
    // "explodes in a large blast area effect centered on them" (Death's Slay /
    // Finishing Blow, p.155): the area's centre is the character the trigger
    // names, not a space picked in range; "centered on you" is the user.
    const before = plain.slice(0, m.index).split(/[.;:]/).pop();
    let centre = centreOf(before, plain.slice(m.index + m[0].length).split(/[.;:]/)[0]);
    // The same area grown later in the text keeps its centre: Aria (p.178) "a small blast area effect
    // centered on you … the area becomes a medium blast. If you are damaged again, it becomes a large blast".
    if (!centre && prevCentre && /\b(?:the area|it)\s+(?:becomes|grows to|increases to|is increased to)\s+(?:an?\s+)?$/.test(before)) centre = prevCentre;
    prevCentre = centre;
    if (centre) {
      area.centeredOn = centre;
      if (area.kind === "burst" && !area.self && !area.target && centre !== "object" && centre !== "pits") area[centre] = true;
    }
    // R33c: an area whose sentence is a terrain effect lasts on the map and carries what its spaces are
    // (Morrigan's Dark Wing p.171, "a small blast terrain effect in range 3. The area is dangerous terrain for
    // foes"); the same text's other areas (Magnabio's Large Blast attack, p.218) don't.
    const terrain = areaTerrainAt(orig, m.index);
    if (terrain) area.terrain = terrain;
    area.label = areaLabel(area);
    if (seen.has(area.label)) continue;
    seen.add(area.label);
    out.push(area);
  }
  return out;
}

/**
 * Whom the rest of an area's sentence centres it on: "target" for "centered on
 * them / the character / your foe / your ally / the attack target", "self" for
 * "centered on you", "pits" for "them" after pits ("all pits in the area
 * explode … centered on them", Holy's Talent I, R49), "object" for "them" after
 * objects (Helix Heel) and "it" (Geyser's geyser), else "" (the area is placed
 * in range as usual; plants / nails / clouds are still left to placing by hand).
 * @param {string} before  the sentence before the shape, lower case
 * @param {string} rest    the sentence after the shape, lower case
 */
function centreOf(before, rest) {
  // R33a2: "centered on it" (Geyser's VOLCANIC GEYSER p.232, "When it erupts, it removes and places all
  // characters in a medium blast area centered on it") and "them" after objects (Helix Heel p.219, "all
  // objects this line passed through resonate, releasing a burst 1 area effect centered on them") go on an
  // object's token now that objects are on the map ("object": the targeted object, else placed by hand).
  // R33c: "create a small blast terrain effect of smoke on you" (Showdown's Quench, p.157) is on the user too.
  if (/^\s*(?:area effect|terrain effect|area)?\s*(?:of [a-z' -]{1,30}?\s)?on (?:you|yourself)\b/.test(rest)) return "self";
  const m = /\bcent(?:er|r)ed on (you|yourself|them|it|(?:the|your|its|that) (?:attack )?(?:character|foe|target|enemy|ally))\b/.exec(rest);
  if (!m) return "";
  if (m[1] === "it") return "object";
  if (m[1] === "them" && /\b(?:objects?|boulders?|geysers?|aethershards?|shards?)\b/.test(before)) return "object";
  // R49: "all pits in the area explode for a medium blast area effect, centered on them" (Holy Talent I and
  // Pandaemonium's PURGATORIO, p.177): one blast on every pit inside the ability's area ("pits", placed by
  // pitBlastCells). Plants / nails / clouds are still placed by hand.
  if (m[1] === "them" && /\bpits?\b/.test(before)) return "pits";
  if (m[1] === "them" && /\b(?:plants?|nails?|clouds?)\b/.test(before)) return "";
  return /^you(?:rself)?$/.test(m[1]) ? "self" : "target";
}

/**
 * Every aura a rules text gives, in order of appearance (areasInText leaves
 * auras out: most texts that name one are stances already tagged with it).
 *   "hover around you as an Aura 2 instead" (Warding Bolts' Phantom Bolts, p.158) → [Aura 2]
 *   "The character gains aura 2 while marked" (Fulminate, p.226)                 → [Aura 2]
 *   "Terrain effect: The spike has aura 2" (Rampant Nail, p.227)                 → [Aura 2 around a space]
 * "characters in the aura 1 space" is a teleport distance, not an aura. With
 * `resize`, a text that changes the size of the ability's aura counts too:
 * "you can increase the area to 3" / "condense the aura to 1" (Fulminate's
 * talents) → Aura 3 / Aura 1. An aura a terrain effect has goes around a space
 * the user picks (`atSpace`), not around a token; an object's aura is left out
 * (it needs the object on the map first).
 * @param {string} text
 * @param {{resize?: boolean}} [opts]
 * @returns {object[]}  aura specs (without range)
 */
export function aurasInText(text, { resize = false } = {}) {
  const plain = String(text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const found = [];
  for (const m of plain.matchAll(/\baura (\d+)\b(?! spaces?\b)/gi)) {
    const before = plain.slice(Math.max(0, m.index - 40), m.index);
    // An object's aura (Spirit Shrine p.192, "Object Effect: Aura 2") goes with an object on the map: not here.
    if (/object effect\s*:\s*$/i.test(before)) continue;
    const atSpace = /terrain effect\s*:\s*(?:the [\w-]+ has (?:an )?)?$/i.test(before);
    found.push({ at: m.index, area: { kind: "aura", size: Number(m[1]), self: !atSpace, ...(atSpace ? { atSpace: true } : {}) } });
  }
  if (resize) {
    for (const m of plain.matchAll(/\b(?:increase|condense|reduce|decrease|shrink|grow|expand)s?\s+(?:the |its |your )?(?:aura|area)(?: size)?\s+to\s+(?:aura\s+)?(\d+)\b/gi))
      found.push({ at: m.index, area: { kind: "aura", size: Number(m[1]), self: true } });
  }
  const out = [];
  const seen = new Set();
  for (const { area } of found.sort((a, b) => a.at - b.at)) {
    area.label = areaLabel(area);
    if (seen.has(area.label)) continue;
    seen.add(area.label);
    out.push(area);
  }
  return out;
}

/**
 * The areas an armed Infuse version is placed with, sized by the Aether spent
 * on it. Magnarime (p.233): "The area gains range 6 and becomes Arc 4, plus
 * one per aether infused" → Arc 4 + spent. Ätherwand's ÄTHERSTURM (p.226):
 * "Extend the area by 1 space for every Aether infused, up to a maximum of +3
 * spaces" names no shape, so the ability's own area (`baseArea`) grows.
 * A fixed shape ("CRYOTIC — Change area to Line 8") is returned as written.
 * @param {string} text      the Infuse block's text
 * @param {number} spent     Aether spent on it (an Infuse X)
 * @param {object|null} baseArea  the ability's area without the infusion
 * @returns {object[]}  area specs, with range
 */
export function infusedAreas(text, spent = 0, baseArea = null) {
  const n = Math.max(0, Number(spent) || 0);
  let plain = String(text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  plain = plain.replace(/\b(line|arc|burst) (\d+),? plus one (?:space )?(?:per|for every) aether infused/gi,
    (_m, kind, size) => `${kind} ${Number(size) + n}`);
  const r = /\brange\s+(?:to\s+|of\s+)?(\d+)/i.exec(plain);
  const range = r ? Number(r[1]) : (baseArea?.range ?? 0);
  const areas = areasInText(plain).map(a => ({ ...a, range }));
  if (areas.length) return areas;
  const ext = /\bextend the area by (\d+|one) spaces? (?:for every|per) aether infused(?:,? up to a maximum of \+?(\d+))?/i.exec(plain);
  if (ext && baseArea && ["line", "arc", "burst"].includes(baseArea.kind) && baseArea.size) {
    const step = ext[1] === "one" ? 1 : Number(ext[1]);
    const add = Math.min(step * n, ext[2] ? Number(ext[2]) : Infinity);
    if (add > 0) {
      const area = { ...baseArea, size: baseArea.size + add, range };
      area.label = areaLabel(area);
      return [area];
    }
  }
  return [];
}

/**
 * Does a rules text draw its area from the target instead of the user? Sow's
 * mastery Spectral Scythe (p.185): "Reap and Sow also create an arc 4 area
 * effect drawn from your target as the origin space, that cannot include your
 * target". Such an area is placed next to the targeted token (placeAreaTemplate).
 * @param {string} text
 */
export function areaDrawnFromTarget(text) {
  const plain = String(text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return /\bfrom (?:your|the) target as (?:the|its) origin\b/i.test(plain);
}

/**
 * R47b: a second line a text adds to the ability's line. Sturmreiten Talent II
 * (p.227): "Comeback: You may extend Sturmreiten's area by another line 3 area,
 * drawn in a different direction". The book doesn't say where it starts; at the
 * table (Maar) it starts from the first or the last space of the first line.
 * @param {string} text
 * @returns {{size:number, comeback:boolean, rule:string}|null}
 */
export function lineExtensionInText(text) {
  const plain = String(text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const m = /\bextend [^.]*?\barea by another line (\d+)(?: area)?,? drawn in a different direction\b/i.exec(plain);
  if (!m) return null;
  return { size: Number(m[1]), comeback: /^comeback\s*:/i.test(plain), rule: plain };
}

/**
 * The area to offer for an ability: the one in its tags, or — when the tags
 * carry none — the first one named in its own rules text. The book prints the
 * shape of most terrain-effect abilities in the prose rather than the header
 * ("Tsunami, 2 Actions, Terrain Effect … The area is a medium blast terrain
 * effect", p.233; the same for Fairy Ring, Ätherwand, Blood Grove, Party
 * Favor…), so without this they never offered a template at all.
 * @param {Array} tags
 * @param {string} [description]  the ability's own text
 * @returns {object|null}
 */
export function abilityArea(tags, description = "") {
  const area = areaFromTags(tags);
  // A bare "aura" tag takes its size from the text, so the placer does not ask
  // for it: the demons' Aura of Slaughter "(stance, aura): … gains aura 2"
  // (p.407). Player abilities get the same from resolveAbilityTags.
  if (area?.kind === "aura" && !area.size) {
    const size = aurasInText(description)[0]?.size;
    if (size) { area.size = size; area.label = areaLabel(area); }
  }
  return area ?? areasInText(description)[0] ?? null;
}

/**
 * The areas an ability can be placed with: the one from its tags first, then
 * the alternatives its combo / charge / unlocked upgrade texts describe.
 * `alt` adds whole areas before the texts' ones (the ability's base area when
 * a talent's tags changed it), `altFirst` puts them before the tags' area (an
 * upgrade that only applies on a Charge / Heroic is the exception, not the
 * default). A text that also changes the range ("Increase range to 5, and
 * all areas may be increased to medium blasts") gives its areas that range.
 * @param {object} opts
 * @param {Array}  opts.tags    ability tags (raw strings or {raw})
 * @param {Array<[string, string]>} [opts.texts]  [source label, rules text] pairs
 * @param {Array<{source:string, area:object}>} [opts.alt]
 * @param {string} [opts.tagSource]  where the tags' area comes from ("Talent II"), "" for the base
 * @param {boolean} [opts.altFirst]
 * @param {Array<{source:string, area:object}>} [opts.lead]  areas offered before all others (armed Infuse)
 * @param {boolean} [opts.auras]  also offer the auras the texts give (aurasInText): Phantom Bolts'
 *   "Aura 2 instead", Fulminate's "gains aura 2" and its talents' resized aura, Rook's Heroic Aura 2
 * @returns {Array<{label:string, source:string, area:object}>}
 */
export function areaVariants({ tags, texts = [], alt = [], tagSource = "", altFirst = false, lead = [], auras = false }) {
  const base = areaFromTags(tags);
  const range = base?.range ?? rangeFromTags(tags);
  const out = [];
  const seen = new Set();
  // Same shape at another range is another variant (Small Blast r3 / Medium Blast r5).
  // An aura around a token has no range: Dervish's tag Aura 1 and its Talent I text are one.
  const key = (a) => a.kind === "aura" && !a.atSpace ? a.label : `${a.label}@${a.range ?? ""}`;
  const push = (source, area) => {
    if (seen.has(key(area))) return;
    seen.add(key(area));
    out.push({ label: area.label, source, area });
  };
  const alts = () => alt.forEach(a => a?.area && push(a.source ?? "", a.area));
  // The armed Infuse version's areas come first: the Aether is already spent on them.
  lead.forEach(a => a?.area && push(a.source ?? "", a.area));
  if (altFirst) alts();
  if (base) push(tagSource, base);
  if (!altFirst) alts();
  // "increase the area to 3" only resizes an aura when the ability has one (Fulminate's talents).
  const resize = auras && (base?.kind === "aura" || texts.some(([, t]) => aurasInText(t).length));
  for (const [source, text] of texts) {
    const r = /\brange\s+(?:to\s+|of\s+)?(\d+)/i.exec(String(text ?? ""));
    for (const area of areasInText(text)) push(source, { ...area, range: r ? Number(r[1]) : range });
    if (auras) for (const area of aurasInText(text, { resize })) push(source, { ...area, range: area.atSpace ? range : 0 });
  }
  return out;
}

/**
 * Let the user pick one of several area variants (a single variant is
 * returned straight away). Resolves the chosen area or null.
 */
export async function chooseAreaVariant(variants, abilityName = "") {
  if (!variants?.length) return null;
  if (variants.length === 1) return variants[0].area;
  try {
    const ranges = new Set(variants.map(v => v.area?.range ?? 0));
    const withRange = (v) => ranges.size > 1 && v.area?.range ? `${v.label}, range ${v.area.range}` : v.label;
    const buttons = variants.map((v, i) => ({
      action: String(i),
      label: v.source ? `${v.source}: ${withRange(v)}` : withRange(v),
      default: i === 0,
      callback: () => v.area,
    }));
    return await foundry.applications.api.DialogV2.wait({
      window: { title: `${abilityName || "Ability"} — which area?` },
      content: `<p>This ability can be placed as more than one pattern. Pick the one you are using:</p>`,
      buttons,
      rejectClose: false,
    });
  } catch { return null; }
}

/* -------------------------------------------------- */
/*  Geometry helpers                                   */
/* -------------------------------------------------- */

/** Grid cells covered by a token document (top-left offset + width × height). */
export function tokenCells(tokenDoc) {
  const grid = canvas.grid;
  const half = grid.size / 2;
  const tl = grid.getOffset({ x: tokenDoc.x + half, y: tokenDoc.y + half });
  const w = Math.max(1, Math.round(tokenDoc.width ?? 1));
  const h = Math.max(1, Math.round(tokenDoc.height ?? 1));
  const cells = [];
  for (let di = 0; di < h; di++) for (let dj = 0; dj < w; dj++) cells.push({ i: tl.i + di, j: tl.j + dj });
  return cells;
}

/**
 * Cells of a blast / burst centred on `center`, or a line starting there.
 * A line of width W adds the extra columns beside it ("on either side", p.97):
 * odd widths spread evenly, even widths put the extra column on the `flip`
 * side (toggled with Shift + wheel while placing).
 */
export function shapeCells(area, center, { dir = { di: 0, dj: 1 }, flip = false } = {}) {
  const out = [];
  if (area.kind === "blast") {
    for (const o of BLAST_SHAPES[area.size] ?? BLAST_SHAPES.m) out.push({ i: center.i + o.di, j: center.j + o.dj });
  } else if (area.kind === "burst" || area.kind === "aura") {
    // An aura around a space (a terrain effect's, Rampant Nail p.227) covers what a burst of its size would.
    const r = Math.max(0, area.size);
    for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) out.push({ i: center.i + di, j: center.j + dj });
  } else if (area.kind === "line") {
    const w = Math.max(1, area.width ?? 1);
    const perp = { di: dir.dj, dj: -dir.di };                    // 90° to the line
    const lo = -Math.floor((w - 1) / 2), hi = Math.ceil((w - 1) / 2);
    for (let k = 0; k < Math.max(1, area.size); k++) {
      for (let s = lo; s <= hi; s++) {
        const side = flip ? -s : s;
        out.push({ i: center.i + dir.di * k + perp.di * side, j: center.j + dir.dj * k + perp.dj * side });
      }
    }
  }
  return out;
}

/** Smallest Chebyshev distance from `cell` to any of `cells`. */
function distanceToCells(cell, cells) {
  let best = Infinity;
  for (const c of cells) best = Math.min(best, chebyshev(cell, c));
  return best;
}

/** Every cell within `range` of the source cells (source cells excluded). */
export function cellsInRange(sourceCells, range) {
  const src = new Set(sourceCells.map(cellKey));
  const out = [];
  let i0 = Infinity, i1 = -Infinity, j0 = Infinity, j1 = -Infinity;
  for (const c of sourceCells) { i0 = Math.min(i0, c.i); i1 = Math.max(i1, c.i); j0 = Math.min(j0, c.j); j1 = Math.max(j1, c.j); }
  for (let i = i0 - range; i <= i1 + range; i++) for (let j = j0 - range; j <= j1 + range; j++) {
    const c = { i, j };
    if (src.has(cellKey(c))) continue;
    if (distanceToCells(c, sourceCells) <= range) out.push(c);
  }
  return out;
}

/**
 * Tokens (placeables) standing on any of `cells`. A PC's map object (R33a)
 * is left out unless the GM made it destructible: objects are "immune to
 * damage and effects unless specified", destructible ones "targetable by
 * anything that targets characters" (p.89).
 */
export function tokensInCells(cells, { exclude = [] } = {}) {
  const set = new Set(cells.map(cellKey));
  const skip = new Set(exclude);
  const immuneObject = (t) => !!t.document?.flags?.[FLAG_NS]?.mapObject && !!t.actor?.system?.intangible;
  return canvas.tokens.placeables.filter(t => t.actor && !skip.has(t.id) && !immuneObject(t) && tokenCells(t.document).some(c => set.has(cellKey(c))));
}

/**
 * Make `tokens` the user's targets (Foundry v13 has no User#updateTokenTargets:
 * targeting goes through Token#setTarget, which also broadcasts it).
 */
function _setUserTargets(tokens) {
  const keep = new Set(tokens.map(t => t.id));
  for (const t of Array.from(game.user.targets)) if (!keep.has(t.id)) t.setTarget(false, { releaseOthers: false });
  for (const t of tokens) if (!t.isTargeted) t.setTarget(true, { releaseOthers: false });
}

/** The token that represents `actor` on the current scene (controlled first). */
export function sourceTokenFor(actor) {
  return canvas.tokens?.controlled?.find(t => t.actor?.id === actor?.id)
      ?? actor?.getActiveTokens?.(false, false)?.[0]
      ?? null;
}

/* -------------------------------------------------- */
/*  Placement                                          */
/* -------------------------------------------------- */

/** Ask for the length of a bare "line"/"arc" tag. */
async function promptAreaSize(area) {
  try {
    const value = await foundry.applications.api.DialogV2.prompt({
      window: { title: `${areaLabel(area)} — length` },
      content: `<p>How many spaces long is this ${area.kind}?</p>
                <input type="number" name="size" value="3" min="1" max="20" autofocus style="width:80px">`,
      ok: { label: "OK", callback: (_e, button) => Number(button.form?.elements?.size?.value ?? 0) },
      rejectClose: false,
    });
    return Number(value) > 0 ? Number(value) : null;
  } catch { return null; }
}

/**
 * Interactive placement of one area on the canvas. Resolves with the chosen
 * cells, or null when cancelled. Only one placement runs at a time.
 */
class AreaPlacement {
  static #active = null;

  /** Is a placement running? (The aura + / − keys stay out of its way.) */
  static get active() { return !!AreaPlacement.#active; }

  constructor({ area, sourceCells, rangeCells, originInRange = false, check = null }) {
    this.area = area;
    // Extra rule on the placed shape (R47b, a second line): (cells, origin, dir) => warning text or "".
    this.check = check;
    // The clicked space itself must be in range, not just one space of the
    // area: a terrain effect's aura goes around "a space in range" (Rampant Nail).
    this.originInRange = originInRange;
    this.sourceCells = sourceCells;
    this.sourceKeys = new Set(sourceCells.map(cellKey));
    this.rangeKeys = rangeCells ? new Set(rangeCells.map(cellKey)) : null;   // null = no restriction
    this.freePlacement = false;   // Alt held: ignore the range restriction
    this.rangeCells = rangeCells;
    this.rotation = 0;            // quarter turns applied to a Line
    this.flip = false;            // side of the extra width of an even-width Line
    this.arcCells = [];           // painted Arc cells
    this.mouseCell = null;
    this.color = Number(foundry.utils.Color.from(AREA_COLORS[area.kind] ?? "#c4a64f"));
  }

  /** Run the placement; resolves cells[] or null. */
  run() {
    if (AreaPlacement.#active) AreaPlacement.#active.cancel();
    AreaPlacement.#active = this;
    return new Promise(resolve => {
      this.resolve = resolve;
      this.prevLayer = canvas.activeLayer;
      canvas.templates.activate();
      const grid = canvas.interface.grid;
      grid.addHighlightLayer(HL_RANGE);
      grid.addHighlightLayer(HL_PREVIEW);
      if (this.rangeCells) {
        for (const c of this.rangeCells) {
          const p = canvas.grid.getTopLeftPoint(c);
          grid.highlightPosition(HL_RANGE, { x: p.x, y: p.y, color: 0x3d7fd6, border: 0x3d7fd6, alpha: 0.10 });
        }
      }
      this.handlers = {
        move:  (ev) => this.#onMove(ev),
        down:  (ev) => this.#onDown(ev),
        key:   (ev) => this.#onKey(ev),
        keyup: (ev) => { if (ev.key === "Alt") this.#setFreePlacement(false); },
        wheel: (ev) => this.#onWheel(ev),
        ctx:   (ev) => { ev.preventDefault(); },
      };
      // Capture phase: a click on the control icon of a template already on
      // the map would otherwise be swallowed by that icon before reaching us.
      canvas.stage.addEventListener("pointermove", this.handlers.move, { capture: true });
      canvas.stage.addEventListener("pointerdown", this.handlers.down, { capture: true });
      window.addEventListener("keydown", this.handlers.key, { capture: true });
      window.addEventListener("keyup", this.handlers.keyup, { capture: true });
      window.addEventListener("wheel", this.handlers.wheel, { capture: true, passive: false });
      canvas.app.view.addEventListener("contextmenu", this.handlers.ctx, { capture: true });
      const free = this.rangeKeys ? " Hold Alt to place it outside the usual range (an Infuse that extends the range, a GM ruling)." : "";
      const hint = this.area.kind === "arc"
        ? `Paint the ${this.area.label} one space at a time (${this.area.size} spaces, orthogonal steps). Enter or right-click finishes early, Esc cancels.${free}`
        : `Click to place the ${this.area.label}. ${this.area.kind === "line" ? "Mouse wheel rotates it; + and − change its width (an Enochian ability that widens the line). " : ""}Right-click or Esc cancels.${free}`;
      ui.notifications.info(hint);
    });
  }

  cancel() { this.#finish(null); }

  #finish(result) {
    if (AreaPlacement.#active !== this) return;
    AreaPlacement.#active = null;
    canvas.stage.removeEventListener("pointermove", this.handlers.move, { capture: true });
    canvas.stage.removeEventListener("pointerdown", this.handlers.down, { capture: true });
    window.removeEventListener("keydown", this.handlers.key, { capture: true });
    window.removeEventListener("keyup", this.handlers.keyup, { capture: true });
    window.removeEventListener("wheel", this.handlers.wheel, { capture: true });
    canvas.app.view.removeEventListener("contextmenu", this.handlers.ctx, { capture: true });
    const grid = canvas.interface.grid;
    grid.destroyHighlightLayer(HL_PREVIEW);
    grid.destroyHighlightLayer(HL_RANGE);
    try { this.prevLayer?.activate(); } catch { /* layer gone */ }
    this.resolve(result);
  }

  /** Orthogonal direction pointing from the nearest source cell to `cell`. */
  #autoDirection(cell) {
    let nearest = this.sourceCells[0];
    for (const c of this.sourceCells) if (chebyshev(cell, c) < chebyshev(cell, nearest)) nearest = c;
    const di = cell.i - nearest.i, dj = cell.j - nearest.j;
    let dir;
    if (di === 0 && dj === 0) dir = { di: 0, dj: 1 };
    else if (Math.abs(dj) >= Math.abs(di)) dir = { di: 0, dj: Math.sign(dj) };
    else dir = { di: Math.sign(di), dj: 0 };
    for (let k = 0; k < this.rotation; k++) dir = { di: dir.dj, dj: -dir.di };   // rotate 90°
    return dir;
  }

  /** Cells the current mouse position would produce (blast / burst / line). */
  #previewCells() {
    if (!this.mouseCell) return [];
    if (this.area.kind === "line") return shapeCells(this.area, this.mouseCell, { dir: this.#autoDirection(this.mouseCell), flip: this.flip });
    return shapeCells(this.area, this.mouseCell);
  }

  /** Is `cell` a legal next Arc space? */
  #arcCandidateValid(cell) {
    if (!cell || this.sourceKeys.has(cellKey(cell))) return false;
    if (this.arcCells.some(c => cellKey(c) === cellKey(cell))) return false;
    if (!this.arcCells.length) return !this.rangeKeys || this.freePlacement || this.rangeKeys.has(cellKey(cell));
    const last = this.arcCells[this.arcCells.length - 1];
    return Math.abs(last.i - cell.i) + Math.abs(last.j - cell.j) === 1;
  }

  #inRange(cells) {
    if (!this.rangeKeys || this.freePlacement) return true;
    if (this.originInRange) return !!this.mouseCell && this.rangeKeys.has(cellKey(this.mouseCell));
    return cells.some(c => this.rangeKeys.has(cellKey(c)));
  }

  #render() {
    const grid = canvas.interface.grid;
    grid.clearHighlightLayer(HL_PREVIEW);
    const paint = (cell, alpha) => {
      const p = canvas.grid.getTopLeftPoint(cell);
      grid.highlightPosition(HL_PREVIEW, { x: p.x, y: p.y, color: this.color, border: this.color, alpha });
    };
    if (this.area.kind === "arc") {
      for (const c of this.arcCells) paint(c, 0.45);
      if (this.#arcCandidateValid(this.mouseCell)) paint(this.mouseCell, 0.25);
      return;
    }
    const cells = this.#previewCells();
    const ok = this.#inRange(cells) && !this.#checkFails(cells);
    for (const c of cells) paint(c, ok ? 0.4 : 0.15);
  }

  #onMove(ev) {
    const pos = ev.getLocalPosition(canvas.stage);
    const cell = canvas.grid.getOffset({ x: pos.x, y: pos.y });
    if (this.mouseCell && cell.i === this.mouseCell.i && cell.j === this.mouseCell.j) return;
    this.mouseCell = cell;
    this.#render();
  }

  #onDown(ev) {
    const button = ev.button ?? ev.data?.button ?? 0;
    if (button === 2) {               // right click: finish a started arc, else cancel
      if (this.area.kind === "arc" && this.arcCells.length) return this.#finishArc();
      return this.cancel();
    }
    if (button !== 0) return;
    ev.stopPropagation();             // the click is ours: don't select whatever lies under the mouse
    const pos = ev.getLocalPosition(canvas.stage);
    this.mouseCell = canvas.grid.getOffset({ x: pos.x, y: pos.y });
    if (this.area.kind === "arc") {
      if (!this.#arcCandidateValid(this.mouseCell)) {
        ui.notifications.warn(this.arcCells.length
          ? "An arc continues from its last space in an orthogonal step, without overlapping itself or you."
          : "The first space of the arc must be in range.");
        return;
      }
      this.arcCells.push(this.mouseCell);
      this.#render();
      if (this.arcCells.length >= this.area.size) this.#finishArc();
      return;
    }
    const cells = this.#previewCells();
    if (!cells.length) return;
    if (!this.#inRange(cells)) {
      ui.notifications.warn(this.originInRange
        ? `The centre space of the ${this.area.label} must be ${this.area.range ? `within range ${this.area.range}` : "adjacent to you"}.`
        : `At least one space of the ${this.area.label} must be ${this.area.range ? `within range ${this.area.range}` : "adjacent to you"} (p.97).`);
      return;
    }
    const failed = this.#checkFails(cells);
    if (failed) { ui.notifications.warn(failed); return; }
    this.#finish({ cells, origin: this.mouseCell, dir: this.#lineDir() });
  }

  /** The direction the Line under the mouse is drawn in (null for other shapes). */
  #lineDir() {
    return this.area.kind === "line" && this.mouseCell ? this.#autoDirection(this.mouseCell) : null;
  }

  /** The extra rule's warning for these cells, "" when they pass. */
  #checkFails(cells) {
    if (!this.check || !cells.length) return "";
    return this.check(cells, this.mouseCell, this.#lineDir()) || "";
  }

  /** Resolve with the painted arc (origin = its first space). */
  #finishArc() {
    this.#finish({ cells: this.arcCells.slice(), origin: this.arcCells[0] });
  }

  /**
   * Alt releases the range restriction while it is held: the placement rules
   * are the usual ones, but an Infuse that extends the range (or a ruling at
   * the table) shouldn't leave the template unplaceable.
   */
  #setFreePlacement(on) {
    if (this.freePlacement === on) return;
    this.freePlacement = on;
    this.#render();
  }

  /**
   * A Line's width, changed while placing (Maar: Enochian abilities that
   * widen their line had no way to do it). 1 to 5; the label follows.
   */
  #setLineWidth(delta) {
    const width = Math.clamp((this.area.width ?? 1) + delta, 1, 5);
    if (width === (this.area.width ?? 1)) return;
    this.area.width = width;
    this.area.label = areaLabel(this.area);
    ui.notifications.info(`${this.area.label}`, { console: false });
    this.#render();
  }

  #onKey(ev) {
    if (ev.key === "Alt") this.#setFreePlacement(true);
    if (this.area.kind === "line" && ["+", "=", "-", "_"].includes(ev.key)) {
      ev.preventDefault(); ev.stopImmediatePropagation();
      this.#setLineWidth(ev.key === "+" || ev.key === "=" ? 1 : -1);
      return;
    }
    if (ev.key === "Escape") { ev.preventDefault(); ev.stopImmediatePropagation(); this.cancel(); }
    else if (ev.key === "Enter" && this.area.kind === "arc" && this.arcCells.length) {
      ev.preventDefault(); ev.stopImmediatePropagation(); this.#finishArc();
    }
  }

  #onWheel(ev) {
    if (this.area.kind !== "line") return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    if (ev.shiftKey) this.flip = !this.flip;                       // Shift + wheel: swap the wide side
    else this.rotation = (this.rotation + (ev.deltaY > 0 ? 1 : 3)) % 4;
    this.#render();
  }
}

/** Is an area being placed right now? (R33c: the Shift + arrow moves stay out of its way.) */
export const isPlacingArea = () => AreaPlacement.active;

/**
 * Place an area for an ability and target the tokens inside it.
 * Resolves with { template, cells, targets } or null when cancelled / not
 * possible (no token on the scene, gridless scene, …).
 *
 * @param {object} opts
 * @param {Actor}  opts.actor         the ability's user
 * @param {object} opts.area          from areaFromTags()
 * @param {string} opts.abilityName   shown on the template and in chat
 * @param {string} opts.abilityKey    identifies the ability (item id / action name) for replace & reuse
 * @param {boolean} [opts.replace=true]  delete this actor's previous template for the same ability
 * @param {boolean} [opts.lasting=false] a terrain effect: not cleared at the user's next turn (areaLasts)
 * @param {string}  [opts.text=""]      the ability's text, read for an aura's duration (auraExpiry)
 * @param {object|null} [opts.terrain]  R33c: what the area's spaces are (helpers/area-terrain.mjs terrainOfBlock),
 *   stored as the `terrain` flag terrain-spaces.mjs reads when a character moves in or out
 * @param {number}  [opts.stack=1]      R33c: how many of this ability's areas may stay at once (areaStackLimit);
 *   above 1, an earlier one is not replaced without asking
 * @param {string}  [opts.stackRule=""] the sentence that allows it, shown in the question
 * @param {object|null} [opts.extension] R47b: a second line the user may add (lineExtensionInText, plus `source`)
 */
export async function placeAreaTemplate({ actor, area, abilityName, abilityKey, replace = true, lasting = false, text = "", terrain = null, stack = 1, stackRule = "", extension = null, allPits = false }) {
  if (!canvas?.ready || !canvas.scene) { ui.notifications.warn("No active scene to place the area on."); return null; }
  if (canvas.grid.type !== CONST.GRID_TYPES.SQUARE) { ui.notifications.warn("Area templates need a square grid (ICON is played on squares, p.85)."); return null; }
  const token = sourceTokenFor(actor);
  if (!token) { ui.notifications.warn(`${actor?.name ?? "The actor"} has no token on this scene — place one to use area templates.`); return null; }

  // R33c: several areas of the same ability at once ("you cannot have more than three areas active", Gust's
  // NORTHSOUL p.234; "Create a second cloud", Mist Strider p.170): ask before placing instead of replacing.
  let removeIds = null;   // null = the usual replacement of every earlier one
  // R49: the pits' explosion (Holy Talent I, PURGATORIO, p.177) is an area effect set off inside the
  // ability's own area: that area stays on the map, only an earlier explosion of the same ability is replaced.
  const pitBlast = area?.centeredOn === "pits";
  if (pitBlast) {
    lasting = false; terrain = null; stack = 1;
    removeIds = findAreaTemplates({ actorId: actor.id, abilityKey }).filter(t => t.flags[FLAG_NS].pitBlast).map(t => t.id);
  }
  if (replace && stack > 1) {
    const earlier = findAreaTemplates({ actorId: actor.id, abilityKey })
      .filter(t => !t.flags[FLAG_NS].followTokenId)
      .sort((a, b) => (a._stats?.createdTime ?? 0) - (b._stats?.createdTime ?? 0));
    if (earlier.length) {
      const full = earlier.length >= stack;
      let choice = null;
      try {
        choice = await foundry.applications.api.DialogV2.wait({
          window: { title: `${abilityName || "Area"} — another area?` },
          content: `<p>${earlier.length} area${earlier.length > 1 ? "s" : ""} of <strong>${escapeHTML(abilityName)}</strong> already on this scene.</p>${stackRule ? `<p><small>${escapeHTML(stackRule)}</small></p>` : ""}<p>Up to ${stack} at once.</p>`,
          buttons: [
            { action: "add", label: full ? "Add (removes the oldest)" : `Add another (${earlier.length + 1} of ${stack})`, default: true },
            { action: "replace", label: "Replace them" },
          ],
          rejectClose: false,
        });
      } catch { choice = null; }
      if (!choice) return null;
      removeIds = choice === "add" ? earlier.slice(0, Math.max(0, earlier.length - stack + 1)).map(t => t.id) : earlier.map(t => t.id);
    }
  }

  area = { ...area };
  if ((area.kind === "line" || area.kind === "arc" || area.kind === "aura") && !area.size) {
    const size = await promptAreaSize(area);
    if (!size) return null;
    area.size = size;
    area.label = areaLabel(area);
  }

  // A terrain effect's aura ("Terrain effect: The spike has aura 2", Rampant
  // Nail p.227) goes around a space picked in range and stays there; every
  // other aura goes around a token and follows it.
  const atSpace = area.kind === "aura" && !!area.atSpace;
  const isAura = area.kind === "aura" && !atSpace;
  // An aura the text gives to an ally ("choose an ally in range 4. That ally
  // gains aura 1", Endless Battlement p.123) or to the marked character
  // (Fulminate p.226) goes around that token — the one the user targeted —
  // and follows it instead of the user.
  const holder = isAura ? auraHolderToken(text, token) : token;
  // "The character gains aura 2 while marked" (Fulminate p.226): the aura on the
  // marked token lasts as long as this ability's mark on it (see the
  // deleteActiveEffect hook in registerAreaTemplates).
  const whileMarked = isAura && holder !== token && holder.actor
    && /\bwhile marked\b/i.test(String(text ?? "").replace(/<[^>]+>/g, " "))
    ? { sourceActorId: actor.id, abilityKey: abilityKey ?? "", targetActorUuid: holder.actor.uuid,
        // the mark it goes with, when already there (follow-marks.mjs places it by itself at marking)
        effectUuid: holder.actor.effects?.find(e => { const k = e.getFlag?.(FLAG_NS, "mark"); return k?.sourceActorId === actor.id && k.abilityKey === abilityKey; })?.uuid ?? "" } : null;
  const sourceCells = tokenCells(holder.document);
  let cells, originCell;
  // An area centred on a character (Death's Slay / Finishing Blow, p.155:
  // "explodes in a large blast area effect centered on them") goes on that
  // token: the one target, or the user for "centered on you".
  const centre = area.centeredOn === "self" ? token
    : area.centeredOn === "target" && !isAura && !atSpace ? centreTargetToken(token)
    : area.centeredOn === "object" && !isAura && !atSpace ? centreObjectToken(token) : null;
  if (pitBlast) {
    const blown = pitBlastCells({ actor, abilityKey, area });
    if (!blown) return null;
    ({ cells, origin: originCell } = blown);
    area.label = `${area.label} × ${blown.pits}`;
  } else if (centre) {
    const centreCells = tokenCells(centre.document);
    if (area.kind === "burst") {
      cells = cellsInRange(centreCells, area.size).concat(centreCells);
      originCell = centreCells[0];
    } else if (centreCells.length === 1) {
      cells = shapeCells(area, centreCells[0]);
      originCell = centreCells[0];
    } else {
      // A big token has no single centre space: pick one of its spaces.
      const placed = await new AreaPlacement({ area, sourceCells: [], rangeCells: centreCells, originInRange: true }).run();
      if (!placed) return null;
      ({ cells, origin: originCell } = placed);
    }
  } else if (isAura || (area.kind === "burst" && area.self)) {
    // Around the user (or the ally holding it), no click needed. An aura keeps following the token.
    cells = cellsInRange(sourceCells, area.size).concat(sourceCells);
    originCell = sourceCells[0];
  } else {
    // An area drawn from the target (Sow's Spectral Scythe, p.185) starts next
    // to the targeted token instead of in the ability's range (p.97: no range
    // of its own = adjacent to the origin) and never covers that token.
    const anchor = area.fromTarget ? targetAnchorToken(token) : null;
    const originCells = anchor ? tokenCells(anchor.document) : sourceCells;
    const range = anchor ? 1 : area.range;
    const rangeCells = Number.isFinite(range) ? cellsInRange(originCells, Math.max(1, range)) : null;
    const blocked = anchor ? [...originCells, ...sourceCells] : sourceCells;
    const placed = await new AreaPlacement({ area, sourceCells: blocked, rangeCells, originInRange: atSpace }).run();
    if (!placed) return null;
    ({ cells, origin: originCell } = placed);
    // R47b: a second line from the first or last space of this one (Sturmreiten Talent II, p.227).
    // With MJÖLLNIR ("Create an arc 5 area any time you would create an area with this ability
    // instead", p.227) the area is an Arc 5 and so is the extension.
    if (extension && ((area.kind === "line" && placed.dir) || area.kind === "arc")) {
      const more = await extendLine({ actor, area, origin: originCell, dir: placed.dir, cells, extension, abilityName, blocked });
      if (more) {
        const seen = new Set(cells.map(cellKey));
        cells = cells.concat(more.cells.filter(c => !seen.has(cellKey(c))));
        area.label = `${area.label} + ${more.label}`;
      }
    }
  }

  // DULCE PURGATORIO (p.178): "Pandaemonium's area effect … extend[s] to all pits on the battlefield": every pit
  // space on the scene joins this area (IconSheet #areaOnAllPits), so whoever stands on a pit is in it, once.
  if (allPits && !pitBlast && !isAura && !atSpace) {
    const seen = new Set(cells.map(cellKey));
    let added = 0;
    for (const t of canvas.scene.templates) {
      if (!t.flags?.[FLAG_NS]?.terrain?.pit) continue;
      for (const c of t.flags[FLAG_NS].cells ?? []) {
        const k = cellKey(c);
        if (!seen.has(k)) { seen.add(k); cells.push({ i: c.i, j: c.j }); added++; }
      }
    }
    if (added) area.label = `${area.label} + all pits`;
  }

  if (replace && removeIds) {
    const own = removeIds.filter(id => canvas.scene.templates.get(id)?.isOwner || game.user.isGM);
    if (own.length) await canvas.scene.deleteEmbeddedDocuments("MeasuredTemplate", own);
  } else if (replace) await deleteAreaTemplates({ actorId: actor.id, abilityKey });

  // Origin = blast/burst centre, first space of a line/arc (control icon + ruler text sit there).
  const origin = canvas.grid.getCenterPoint(originCell);
  const color = areaColor(area, actor);
  const expiry = isAura ? await auraExpiry(text, actor) : null;
  // The bounds the text puts on resizing the aura (+ / − over it, resizeAura)
  const limits = isAura ? auraSizeLimits(text) : null;
  const data = {
    t: "rect", x: origin.x, y: origin.y, distance: 1, direction: 0, width: 0,
    fillColor: color, borderColor: color, hidden: false,
    flags: { [FLAG_NS]: {
      cells, area: { kind: area.kind, size: area.size, self: !!area.self, width: area.width ?? 1, label: area.label, ...(limits ?? {}) },
      actorId: actor.id, actorUuid: actor.uuid, tokenId: token.id, abilityKey, abilityName: abilityName ?? "",
      lasting: !!lasting || isAura || atSpace,
      // Auras move with their token (updateToken hook in registerAreaTemplates)
      followTokenId: isAura ? holder.id : null,
      // "until the end of your next turn": counted down by tickAuraExpiry
      expiry,
      // Removed with the mark it depends on ("while marked")
      ...(whileMarked ? { whileMarked } : {}),
      // R49: the pits' explosion, not the ability's own area (pitBlastCells looks past it)
      ...(pitBlast ? { pitBlast: true } : {}),
      // R33c: a terrain effect's spaces (dangerous, difficult, what entering sets off), read at movement by
      // terrain-spaces.mjs as for its single spaces
      ...(terrain && !isAura ? { terrain: { group: "", source: "", ...terrain, kind: "area", creatorId: actor.id, itemId: abilityKey ?? "" } } : {}),
    } },
  };
  let template = null;
  try {
    [template] = await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [data]);
  } catch (err) {
    console.warn("[ICON | AreaTemplates] template creation failed (permissions?)", err);
    ui.notifications.warn("Could not create the template on the scene (you may lack the 'Create Measured Template' permission) — targets were still selected.");
  }

  if (isAura) {
    // A persistent effect, not an attack: nothing to target.
    if (token.isOwner && !token.controlled) token.control({ releaseOthers: false });
    _log(`placed ${area.label} for "${abilityName}" — follows token ${holder.id}${expiry ? ` — ${expiry.text}` : ""}`);
    ui.notifications.info(`${area.label} placed around ${holder.name}; it follows the token${expiry ? ` (${expiry.text})` : ""}. Mouse over it and press + or − to change its size${limits ? ` (${limits.min} to ${limits.max})` : ""}.`);
    return { template, cells, targets: [], area };
  }
  if (atSpace) {
    // A terrain effect: it stays where it was put, nothing to target.
    if (token.isOwner && !token.controlled) token.control({ releaseOthers: false });
    _log(`placed ${area.label} for "${abilityName}" around space ${originCell.i},${originCell.j}`);
    ui.notifications.info(`${area.label} placed; it stays on the map until removed or replaced. Shift + arrow keys with the mouse over it move it 1 space.`);
    return { template, cells, targets: [], area };
  }

  // Seer wild cards (p.200): a card whose small blast this area touches can be
  // set off, growing the area to cover it — and the cards that reaches in turn.
  // Asked before the targets are read, so the extension counts for targeting.
  // Imported here rather than at the top: wild-cards.mjs reads tokenCells from
  // this module, and a lazy import keeps the two from importing each other.
  if (template) {
    try {
      const { offerWildCards } = await import("./wild-cards.mjs");
      cells = await offerWildCards(template, cells, { abilityName });
    } catch (err) { console.error("ICON 1.5 | wild card check failed", err); }
  }

  const targets = tokensInCells(cells, { exclude: area.kind === "burst" ? [token.id] : [] });
  _setUserTargets(targets);
  // Switching to the template layer released the token: give it back its selection.
  if (token.isOwner && !token.controlled) token.control({ releaseOthers: false });
  _log(`placed ${area.label} for "${abilityName}" — ${cells.length} cells, ${targets.length} target(s)`);
  ui.notifications.info(`${area.label} placed — ${targets.length ? targets.map(t => t.name).join(", ") : "no one"} in the area.${lasting ? " It stays on the map: Shift + arrow keys with the mouse over it move it 1 space." : ""}`);
  // R33a3: the user's objects that trigger when an area includes them (Aethershard p.210: 2 piercing per
  // shard to all characters in the area, then destroyed, +1 Aether). Lazy import, as for the wild cards.
  try {
    const { offerAreaObjectTriggers } = await import("./map-objects.mjs");
    await offerAreaObjectTriggers(cells, { actor, abilityName });
  } catch (err) { console.error("ICON 1.5 | object area check failed", err); }
  return { template, cells, targets, area };
}

/**
 * R47b: offer the second line a text adds (Sturmreiten Talent II, p.227: "extend
 * Sturmreiten's area by another line 3 area, drawn in a different direction").
 * The user picks the first or the last space of the placed line (Maar's ruling,
 * the book doesn't say), then draws the new line from the space next to it, in
 * any orthogonal direction but the first line's own and without crossing it.
 * With MJÖLLNIR the area is an Arc (p.227, "Create an arc 5 area any time you
 * would create an area with this ability instead"): the extension is an arc of
 * the same size, painted from the space next to the first or last space of the
 * first arc, not in the direction the first arc runs at that end, not over it.
 * Resolves { cells, label }, or null (declined / cancelled: the first area stays).
 */
async function extendLine({ actor, area, origin, dir, cells, extension, abilityName, blocked = [] }) {
  const isArc = area.kind === "arc";
  const second = isArc ? { kind: "arc", size: Math.max(1, area.size) } : { kind: "line", size: extension.size };
  const label = areaLabel(second);
  second.label = label;
  const shape = isArc ? "arc" : "line";
  const notBloodied = extension.comeback && actor?.isBloodied === false;
  let from = null;
  try {
    from = await foundry.applications.api.DialogV2.wait({
      window: { title: `${abilityName || "Line"} — another ${label}?` },
      content: `<p><small>${escapeHTML(extension.source ? `${extension.source}: ` : "")}${escapeHTML(extension.rule)}</small></p>`
        + (notBloodied ? `<p><strong>Comeback</strong>: you are not bloodied, so this doesn't apply right now.</p>` : "")
        + `<p>Draw the extra ${label} from which end of the first ${shape}?</p>`,
      buttons: [
        { action: "first", label: "From the first space", default: !notBloodied },
        { action: "last",  label: "From the last space" },
        { action: "no",    label: "No extension", default: notBloodied },
      ],
      rejectClose: false,
    });
  } catch { from = null; }
  if (from !== "first" && from !== "last") return null;
  const len = Math.max(1, area.size);
  const taken = new Set(cells.map(cellKey));
  const dirs = [{ di: 0, dj: 1 }, { di: 1, dj: 0 }, { di: 0, dj: -1 }, { di: -1, dj: 0 }];
  const sameDir = (a, b) => !!a && !!b && a.di === b.di && a.dj === b.dj;
  let end, ownDir;
  if (isArc) {
    // The painted arc: its end space, and the step the arc takes there (into it from the first space,
    // out of it to the last space) — the extension goes another way.
    const n = cells.length;
    end = from === "first" ? cells[0] : cells[n - 1];
    const [a, b] = from === "first" ? [cells[0], cells[1]] : [cells[n - 2], cells[n - 1]];
    ownDir = a && b ? { di: b.i - a.i, dj: b.j - a.j } : null;
  } else {
    end = from === "first" ? origin : { i: origin.i + dir.di * (len - 1), j: origin.j + dir.dj * (len - 1) };
    ownDir = dir;
  }
  const blockedKeys = new Set(blocked.map(cellKey));
  const allowed = dirs.filter(d => !sameDir(d, ownDir) && (isArc
    ? !taken.has(cellKey({ i: end.i + d.di, j: end.j + d.dj })) && !blockedKeys.has(cellKey({ i: end.i + d.di, j: end.j + d.dj }))
    : !shapeCells(second, { i: end.i + d.di, j: end.j + d.dj }, { dir: d }).some(c => taken.has(cellKey(c)))));
  if (!allowed.length) { ui.notifications.warn(`No free direction for another ${label} from that space.`); return null; }
  const starts = allowed.map(d => ({ i: end.i + d.di, j: end.j + d.dj }));
  const check = isArc ? null : (newCells, start, d) => {
    if (!start || !d) return "";
    const step = { di: start.i - end.i, dj: start.j - end.j };
    if (!sameDir(step, d) || !allowed.some(a => sameDir(a, d)))
      return `The extra ${label} goes away from the ${from} space of the first line, in a different direction (mouse wheel rotates it).`;
    return "";
  };
  ui.notifications.info(`Extra ${label}: click one of the highlighted spaces next to the ${from} space of the first ${shape}.`);
  // An arc is painted space by space: the first arc and the user's spaces are off limits (sourceCells).
  const sourceCells = isArc ? [...cells, ...blocked] : [end];
  const placed = await new AreaPlacement({ area: second, sourceCells, rangeCells: starts, originInRange: true, check }).run();
  return placed?.cells ? { cells: placed.cells, label } : null;
}

/**
 * R49: the spaces of "all pits in the area explode for a medium blast area
 * effect, centered on them" (Holy Talent I, Pandaemonium's PURGATORIO, p.177).
 * "The area" is this ability's own area already on the map (the newest one of
 * this actor and ability that is not a pit, an aura or an earlier explosion;
 * Holy's area is kept as a terrain effect, so those count); every pit space (terrain-spaces.mjs, `terrain.pit`) inside it
 * gets a blast of `area`'s size centred on it, and the blasts are joined into
 * one set of spaces: "characters in at least one area" are hit once each.
 * Warns and resolves null when there is no such area or no pit inside it.
 * @returns {{cells:Array<{i:number,j:number}>, origin:{i:number,j:number}, pits:number}|null}
 */
function pitBlastCells({ actor, abilityKey, area }) {
  // DULCE PURGATORIO (Pandaemonium's mastery, p.178): "Purgatorio's pit explosion effect extend[s] to all pits
  // on the battlefield": with that mastery unlocked every pit explodes, the ability's area is not needed.
  const sys = actor.items?.get?.(abilityKey)?.system;
  const everyPit = !!sys?.masteryUnlocked
    && /\ball pits on the battlefield\b/i.test(String(sys.mastery ?? "").replace(/<[^>]+>/g, " "));
  if (everyPit) _log(`pitBlastCells — mastery: every pit on the battlefield explodes`);
  const own = everyPit ? [] : findAreaTemplates({ actorId: actor.id, abilityKey })
    .filter(t => { const f = t.flags[FLAG_NS]; return !f.pitBlast && !f.terrain?.pit && !f.followTokenId && f.area?.kind !== "space" && f.area?.kind !== "aura"; })
    .sort((a, b) => (b._stats?.createdTime ?? 0) - (a._stats?.createdTime ?? 0));
  if (!everyPit && !own.length) {
    ui.notifications.warn("All pits in the area explode: place this ability's area first (its attack), then the pits' blasts.");
    return null;
  }
  const inArea = everyPit ? null : new Set((own[0].flags[FLAG_NS].cells ?? []).map(cellKey));
  const pits = [];
  const seenPit = new Set();
  for (const t of canvas.scene.templates) {
    const f = t.flags?.[FLAG_NS];
    if (!f?.terrain?.pit) continue;
    for (const c of f.cells ?? []) {
      const k = cellKey(c);
      if ((!inArea || inArea.has(k)) && !seenPit.has(k)) { seenPit.add(k); pits.push({ i: c.i, j: c.j }); }
    }
  }
  if (!pits.length) {
    ui.notifications.warn(everyPit ? "No pit on the battlefield: nothing explodes." : "No pit inside this ability's area: nothing explodes.");
    return null;
  }
  const blast = { kind: area.kind, size: area.size };
  const seen = new Set();
  const cells = [];
  for (const p of pits) for (const c of shapeCells(blast, p)) {
    const k = cellKey(c);
    if (!seen.has(k)) { seen.add(k); cells.push(c); }
  }
  return { cells, origin: pits[0], pits: pits.length };
}

/**
 * The token an area drawn from the target starts from (areaDrawnFromTarget):
 * the one token the user has targeted other than their own. With no such
 * target (or several) the area is drawn from the user as usual, with a warning.
 * @param {Token} token  the user's token
 * @returns {Token|null}
 */
function targetAnchorToken(token) {
  const targets = Array.from(game.user?.targets ?? []).filter(t => t.id !== token.id && t.actor);
  if (targets.length === 1) return targets[0];
  ui.notifications.warn(targets.length
    ? "This area is drawn from your target: target only that token, then place it again. Drawn from you for now."
    : "This area is drawn from your target: target that token, then place it again. Drawn from you for now.");
  return null;
}

/**
 * The token an area centred on "them" goes on (areasInText `centeredOn`): the
 * one token the user has targeted other than their own. With no such target
 * (or several) the area is placed by hand as usual, with a warning.
 * @param {Token} token  the user's token
 * @returns {Token|null}
 */
function centreTargetToken(token) {
  const targets = Array.from(game.user?.targets ?? []).filter(t => t.id !== token.id && t.actor);
  if (targets.length === 1) return targets[0];
  ui.notifications.warn(targets.length
    ? "This area is centered on one character: target only that token, then place it again. Place it by hand for now (Alt ignores the range)."
    : "This area is centered on a character: target that token, then place it again. Place it by hand for now (Alt ignores the range).");
  return null;
}

/**
 * The token an area centred on an object goes on (areasInText `centeredOn:
 * "object"`, R33a2): Volcanic Geyser's "medium blast area centered on it"
 * (p.232), Helix Heel's "burst 1 … centered on them" (p.219). The targeted
 * object token — with several objects targeted, the one the user picks by
 * targeting only it; with no object targeted, the one other token targeted
 * (a summon "centered on it", as Dancing Light). Otherwise the area is placed
 * by hand as before, with a hint.
 * @param {Token} token  the user's token
 * @returns {Token|null}
 */
function centreObjectToken(token) {
  const targets = Array.from(game.user?.targets ?? []).filter(t => t.id !== token.id);
  const objects = targets.filter(t => t.document?.flags?.[FLAG_NS]?.mapObject);
  if (objects.length === 1) return objects[0];
  if (!objects.length && targets.length === 1) return targets[0];
  ui.notifications.info(objects.length
    ? "This area is centered on one object: target only that object's token, then place it again. Place it by hand for now (Alt ignores the range)."
    : "This area is centered on an object: target the object's token (T over it), then place it again — or place it by hand now (Alt ignores the range).");
  return null;
}

/**
 * The bounds an ability's text puts on changing its aura's size, or null when
 * it writes none: "you may increase or decrease the aura size by +1, to a
 * maximum of 3 or a minimum of 1. When you do, foes inside must save or be
 * pacified" (Gentleness' Gentle Prayer, p.179) → { min: 1, max: 3, note }.
 * `note` is the sentence after it when it starts "When you do", shown on
 * each resize as a reminder of what the change sets off.
 * @param {string} text  the ability's text (HTML allowed)
 * @returns {{min:number, max:number, note:string}|null}
 */
export function auraSizeLimits(text) {
  const plain = String(text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const sentences = plain.split(/(?<=[.;])\s+/);
  for (let k = 0; k < sentences.length; k++) {
    const sentence = sentences[k];
    if (!/\b(?:aura(?:'s)? size|size of (?:the|your|its) aura)\b/i.test(sentence)) continue;
    const max = Number(sentence.match(/\bmaximum (?:of )?(\d+)/i)?.[1] ?? 0);
    const min = Number(sentence.match(/\bminimum (?:of )?(\d+)/i)?.[1] ?? 0);
    if (!max && !min) continue;
    const next = sentences[k + 1]?.trim() ?? "";
    return { min: min || 1, max: max || AURA_MAX_SIZE, note: /^when you do\b/i.test(next) ? next : "" };
  }
  return null;
}

/** Largest aura + / − reach when the text gives no maximum (as the Line's width). */
const AURA_MAX_SIZE = 5;

/**
 * Grow or shrink an aura already on the map by `delta` (Maar: Gentleness'
 * mastery changes the aura size each refresh, p.179). The cells are redrawn
 * around the token holding it, the label follows; the bounds are the ones
 * the text gave when it was placed (auraSizeLimits), else 1 to 5.
 * @param {MeasuredTemplateDocument} doc  an aura template (followTokenId set)
 * @param {number} delta  +1 or -1
 * @returns {Promise<boolean>} whether the size changed
 */
export async function resizeAura(doc, delta) {
  const f = doc?.flags?.[FLAG_NS];
  if (!f?.followTokenId || f.area?.kind !== "aura") return false;
  const holder = doc.parent?.tokens?.get(f.followTokenId);
  if (!holder) { ui.notifications.warn("The token holding this aura is no longer on the scene."); return false; }
  const min = Number(f.area.min) || 1, max = Number(f.area.max) || AURA_MAX_SIZE;
  const now = Number(f.area.size) || 1;
  const size = Math.clamp(now + delta, min, max);
  if (size === now) {
    ui.notifications.info(`${f.area.label ?? "Aura"} is already at its ${delta > 0 ? `maximum (${max})` : `minimum (${min})`}.`, { console: false });
    return false;
  }
  const area = { ...f.area, size };
  area.label = areaLabel(area);
  const sourceCells = tokenCells(holder);
  const cells = cellsInRange(sourceCells, size).concat(sourceCells);
  await doc.update({ [`flags.${FLAG_NS}.area`]: area, [`flags.${FLAG_NS}.cells`]: cells });
  _log(`${f.abilityName}: ${f.area.label} → ${area.label}`);
  const name = f.abilityName ? ` (${f.abilityName})` : "";
  ui.notifications.info(`${area.label}${name}${area.note ? ` — ${area.note}` : ""}`, { console: false });
  return true;
}

/** The aura template under the mouse that this user may resize, or null. */
function auraUnderMouse() {
  if (!canvas?.ready || !canvas.scene || !canvas.mousePosition) return null;
  const c = canvas.grid.getOffset(canvas.mousePosition);
  const under = canvas.scene.templates.filter(t => {
    const f = t.flags?.[FLAG_NS];
    return f?.followTokenId && f.area?.kind === "aura" && (t.isOwner || game.user.isGM)
      && (f.cells ?? []).some(k => k.i === c.i && k.j === c.j);
  });
  // Overlapping auras: the smallest one is the one the mouse points at most precisely.
  under.sort((a, b) => a.flags[FLAG_NS].cells.length - b.flags[FLAG_NS].cells.length);
  return under[0] ?? null;
}

/**
 * The token an aura goes around. Usually the user's own; when the text gives
 * the aura to an ally ("That ally gains aura 1 until the start of your next
 * turn", Endless Battlement p.123) it is the one token the user has targeted
 * other than their own. With no such target (or several) the aura stays on the
 * user, as before, with a warning saying how to move it. The ally's range
 * ("choose an ally in range 4") is only checked to warn: the mastery lifts it
 * ("no maximum range") and the aura is not refused for it.
 * @param {string} text   the ability's text (HTML allowed)
 * @param {Token}  token  the user's token
 * @returns {Token}
 */
export function auraHolderToken(text, token) {
  const plain = String(text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const toAlly = /\b(?:that|the|an|your|target|chosen)\s+ally\s+(?:gains?|has)\s+(?:an?\s+)?aura\b/i.test(plain);
  // Fulminate (p.226): "A character in range 6 is marked. The character gains aura 2 while marked."
  const toCharacter = !toAlly && /\b(?:that|the|target|marked|chosen)\s+character\s+(?:gains?|has)\s+(?:an?\s+)?aura\b/i.test(plain);
  if (!toAlly && !toCharacter) return token;
  const who = toAlly ? "ally" : "character";
  const allies = Array.from(game.user?.targets ?? []).filter(t => t.id !== token.id && t.actor);
  if (allies.length !== 1) {
    ui.notifications.warn(allies.length
      ? `This aura goes on one ${who}: target only that ${who}'s token, then place it again. Placed around you for now.`
      : `This aura goes on ${toAlly ? "an ally" : "another character"}: target that ${who}'s token, then place it again. Placed around you for now.`);
    return token;
  }
  const ally = allies[0];
  const m = /\b(?:ally|character)\s+in\s+range\s+(\d+)/i.exec(plain);
  if (m && !/no maximum range/i.test(plain)) {
    const d = distanceToCellsSet(tokenCells(ally.document), tokenCells(token.document));
    if (d > Number(m[1])) ui.notifications.warn(toAlly
      ? `${ally.name} is ${d} spaces away, beyond range ${m[1]}: the aura is not active while your ally is out of range.`
      : `${ally.name} is ${d} spaces away, beyond range ${m[1]}.`);
  }
  return ally;
}

/**
 * Put an aura around a token already on a scene, with no click: an object's
 * own aura ("Shrine — Height 1 object. Object Effect: Aura 2", p.192) goes on
 * the object's token as soon as it is placed and follows it like any other
 * aura (followTokenId). Works on the token's own scene, which the active GM
 * placing a player's object may not be looking at.
 * @param {TokenDocument} tokenDoc  the token holding the aura
 * @param {object} opts
 * @param {Actor}  opts.actor        whose aura it is (the object's creator: colour, ownership of the flags)
 * @param {number} opts.size         Aura N
 * @param {string} [opts.abilityName]
 * @param {string} [opts.abilityKey]
 * @param {object} [opts.flags]      extra flags for the template
 * @returns {Promise<MeasuredTemplateDocument|null>}
 */
export async function placeAuraOnToken(tokenDoc, { actor, size, abilityName = "", abilityKey = "", flags = {} }) {
  const scene = tokenDoc?.parent;
  if (!scene || !(size > 0)) return null;
  const grid = scene.grid;
  const half = grid.size / 2;
  const tl = grid.getOffset({ x: tokenDoc.x + half, y: tokenDoc.y + half });
  const own = [];
  for (let di = 0; di < Math.max(1, Math.round(tokenDoc.height ?? 1)); di++)
    for (let dj = 0; dj < Math.max(1, Math.round(tokenDoc.width ?? 1)); dj++) own.push({ i: tl.i + di, j: tl.j + dj });
  const cells = cellsInRange(own, size).concat(own);
  const area = { kind: "aura", size, self: false, width: 1 };
  area.label = areaLabel(area);
  const color = areaColor(area, actor);
  const origin = grid.getCenterPoint(tl);
  const data = {
    t: "rect", x: origin.x, y: origin.y, distance: 1, direction: 0, width: 0,
    fillColor: color, borderColor: color, hidden: false,
    flags: { [FLAG_NS]: {
      cells, area,
      actorId: actor?.id ?? "", actorUuid: actor?.uuid ?? "", tokenId: tokenDoc.id, abilityKey, abilityName,
      lasting: true, followTokenId: tokenDoc.id, expiry: null, ...flags,
    } },
  };
  const [template] = await scene.createEmbeddedDocuments("MeasuredTemplate", [data]);
  _log(`${area.label} placed on "${tokenDoc.name}" for "${abilityName}"`);
  return template ?? null;
}

/** Smallest distance between two sets of cells (range counts diagonals, p.85). */
function distanceToCellsSet(a, b) {
  let best = Infinity;
  for (const c of a) best = Math.min(best, distanceToCells(c, b));
  return best;
}

/**
 * Read the tokens standing in an existing area template (for a second attack
 * roll on the same ability after the tokens moved).
 *
 * `retarget: false` returns who is in the area WITHOUT touching the user's
 * targets: an ICON area attack has one attack target and the rest only take
 * the area effect (p.117), so once the player has narrowed the selection by
 * hand — Shift+T on the map, ✕ in the attack dialog — re-targeting everybody
 * would undo that choice on every roll.
 */
export async function retargetFromTemplate(template, { retarget = true } = {}) {
  const cells = template?.getFlag(FLAG_NS, "cells") ?? [];
  const area  = template?.getFlag(FLAG_NS, "area") ?? {};
  const actorId = template?.getFlag(FLAG_NS, "actorId");
  const own = area.kind === "burst" ? canvas.tokens.placeables.filter(t => t.actor?.id === actorId).map(t => t.id) : [];
  const targets = tokensInCells(cells, { exclude: own });
  if (retarget) _setUserTargets(targets);
  return { template, cells, targets, area };
}

/** Existing area templates on the current scene for an actor (+ ability). */
export function findAreaTemplates({ actorId, abilityKey } = {}) {
  if (!canvas?.scene) return [];
  return canvas.scene.templates.filter(t => {
    const f = t.flags?.[FLAG_NS];
    if (!f?.cells) return false;
    if (actorId && f.actorId !== actorId) return false;
    if (abilityKey && f.abilityKey !== abilityKey) return false;
    return true;
  });
}

/** Delete area templates (all of the scene's when no filter is given). */
export async function deleteAreaTemplates({ actorId, abilityKey, scene } = {}) {
  const sc = scene ?? canvas?.scene;
  if (!sc) return 0;
  const docs = (sc === canvas?.scene ? findAreaTemplates({ actorId, abilityKey }) : sc.templates.filter(t => t.flags?.[FLAG_NS]?.cells))
    .filter(t => t.isOwner || game.user.isGM);
  if (!docs.length) return 0;
  await sc.deleteEmbeddedDocuments("MeasuredTemplate", docs.map(d => d.id));
  return docs.length;
}

/**
 * Attack-roll helper: make sure the area of an attack is on the table before
 * rolling. Reuses this actor's existing template for the ability (re-reading
 * the tokens inside it), otherwise places a new one. Returns the placement
 * result, `null` when the user cancelled the placement, or `undefined` when
 * the ability has no area / the placement was impossible (roll goes on).
 */
export async function ensureAreaTargets({ actor, tags, abilityName, abilityKey, lasting = false, area: chosen = null, terrain = null, extension = null, allPits = false }) {
  // `area`: the shape picked from the ability's variants (IconSheet), else the tags' one.
  const area = chosen ?? areaFromTags(tags);
  if (!area || area.kind === "aura") return undefined;      // an aura is not the attack's area
  const existing = findAreaTemplates({ actorId: actor.id, abilityKey })[0];
  // Reusing a template already on the table: only target from it when the
  // player has nothing targeted, otherwise their own selection wins.
  if (existing) return retargetFromTemplate(existing, { retarget: !game.user?.targets?.size });
  if (!canvas?.ready || !sourceTokenFor(actor)) return undefined;
  return placeAreaTemplate({ actor, area, abilityName, abilityKey, lasting, terrain, extension: area.kind === "line" || area.kind === "arc" ? extension : null, allPits });
}

/**
 * Start of a combatant's turn: clear the areas it placed earlier, except the
 * lasting ones (auras, terrain effects). Matched on the token when the
 * template knows it, so two copies of the same foe don't clear each other's.
 * @param {Combatant} combatant
 * @returns {Promise<number>} templates removed
 */
export async function clearExpiredAreaTemplates(combatant) {
  const scene = combatant?.parent?.scene ?? canvas?.scene;
  const actorId = combatant?.actor?.id;
  if (!scene || !actorId) return 0;
  const docs = scene.templates.filter(t => {
    const f = t.flags?.[FLAG_NS];
    if (!f?.cells || f.lasting || f.followTokenId) return false;
    return f.tokenId ? f.tokenId === combatant.tokenId : f.actorId === actorId;
  });
  if (!docs.length) return 0;
  await scene.deleteEmbeddedDocuments("MeasuredTemplate", docs.map(d => d.id));
  _log(`start of ${combatant.name}'s turn: cleared ${docs.length} area template(s)`);
  return docs.length;
}

/**
 * The end an ability's text gives its aura, as an expiry flag, or null (no
 * end written: stance, "while marked", "for the rest of combat"…). Only a
 * sentence that both grants a sized aura and says "until …" counts: "gains
 * aura 2 until the start of its next turn", "Until the start of your next
 * turn, you gain aura 2" — not "an ally in the aura … become sturdy until the
 * start of your turn" (Shieldmaster: that is the status's end).
 * @param {string} text  the ability's text (HTML allowed); the first matching sentence wins
 * @param {Actor}  actor the aura's user (whose turns are counted)
 * @returns {Promise<object|null>}
 */
export async function auraExpiry(text, actor) {
  if (!actor || !text) return null;
  // Lazy import, as for wild-cards.mjs: status-expiry.mjs reads enrich.mjs,
  // whose imports lead back to this module.
  const { expiryFromUntil } = await import("../combat/status-expiry.mjs");
  const plain = String(text ?? "").replace(/<[^>]+>/g, " ");
  for (const sentence of plain.split(/[.;\n]/)) {
    if (!/\baura\s*\d/i.test(sentence)) continue;
    const exp = expiryFromUntil(sentence.replace(/\s+/g, " "), { target: actor, source: actor });
    if (exp) return exp;
  }
  return null;
}

/**
 * A turn boundary passed for `clockActor` (`at` = "end" | "start"): count
 * down the auras that wait on it, on every scene. One that runs out is not
 * deleted on its own (the text may have been read wrong, or something made
 * it last longer): its countdown is dropped and a chat card says it ended,
 * with the Remove area button. Runs on the active GM only.
 * @returns {Promise<number>} auras that ended
 */
export async function tickAuraExpiry(clockActor, at) {
  if (!clockActor) return 0;
  let ended = 0;
  for (const scene of game.scenes ?? []) {
    for (const t of scene.templates) {
      const f = t.flags?.[FLAG_NS];
      const exp = f?.expiry;
      if (!f?.cells || !exp || exp.at !== at || exp.clockUuid !== clockActor.uuid) continue;
      const left = (Number(exp.left) || 1) - 1;
      if (left > 0) {
        await t.setFlag(FLAG_NS, "expiry", { ...exp, left });
        continue;
      }
      await t.unsetFlag(FLAG_NS, "expiry");
      ended++;
      const actor = fromUuidSync(f.actorUuid ?? "") ?? game.actors?.get(f.actorId) ?? clockActor;
      const label = f.area?.label ?? "Aura";
      _log(`${actor?.name}: ${label} (${f.abilityName}) ends — ${exp.text}`);
      const btn = `<button type="button" class="icon-btn icon-btn--sm icon-btn--remove icon-chat-card__area-remove" data-action="removeAreaTemplate" data-template-id="${escapeHTML(t.id)}" data-scene-id="${escapeHTML(scene.id)}" title="Remove the aura from the map"><i class='fa-solid fa-trash'></i> Remove area</button>`;
      try {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `<div class="icon-chat-card icon-chat-card--status-applied"><div><strong>${escapeHTML(actor?.name ?? "")}</strong>'s <strong>${escapeHTML(label)}</strong>${f.abilityName ? ` (${escapeHTML(f.abilityName)})` : ""} ends <small>— ${escapeHTML(exp.text)}</small></div><div class="icon-chat-card__area"><span class="icon-chat-card__area-label"><i class='fa-solid fa-vector-square'></i> ${escapeHTML(label)}</span> ${btn}</div></div>`,
        });
      } catch (err) { console.warn("[ICON | AreaTemplates] aura end chat failed", err); }
    }
  }
  return ended;
}

/**
 * Chat summary line for an attack card (safe HTML). With `attackTargetId` the
 * line separates the one token the attack was rolled against from the ones
 * that only take the area effect (p.117).
 */
export function areaSummaryHtml(placement, { attackTargetId = "" } = {}) {
  if (!placement?.area) return "";
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const inArea = placement.targets ?? [];
  const attacked = attackTargetId ? inArea.find(t => t.id === attackTargetId) : null;
  const others = attacked ? inArea.filter(t => t.id !== attacked.id) : inArea;
  const names = attacked
    ? `attack: ${esc(attacked.name)}${others.length ? ` · area: ${others.map(t => esc(t.name)).join(", ")}` : ""}`
    : (inArea.length ? inArea.map(t => esc(t.name)).join(", ") : "no one");
  const btn = placement.template
    ? ` <button type="button" class="icon-btn icon-btn--sm icon-btn--remove icon-chat-card__area-remove" data-action="removeAreaTemplate" data-template-id="${esc(placement.template.id)}" data-scene-id="${esc(placement.template.parent?.id)}" title="Remove the template from the map"><i class='fa-solid fa-trash'></i> Remove area</button>`
    : "";
  return `<div class="icon-chat-card__area"><span class="icon-chat-card__area-label"><i class='fa-solid fa-vector-square'></i> ${esc(placement.area.label)}</span> <span class="icon-chat-card__area-targets">${names}</span>${btn}</div>`;
}

/**
 * The token in the attack space of a placed Blast / Burst (p.97: "The origin
 * space and the attack space (if there is one) is the central space"), or ""
 * when the area has none of its own: a Line / Arc's attack space is "any
 * character in the area" (the attacker picks it), and a Burst (self) is
 * centred on the user, who is not in it. The template sits on the centre
 * cell (placeAreaTemplate), also after being nudged with Shift + arrows.
 * @param {{template, targets, area}} placement  placeAreaTemplate / retargetFromTemplate result
 * @returns {string} token id, one of `placement.targets`
 */
export function attackSpaceTokenId(placement) {
  const kind = placement?.area?.kind;
  const doc = placement?.template;
  if (!doc || !canvas?.grid || (kind !== "blast" && kind !== "burst")) return "";
  const key = cellKey(canvas.grid.getOffset({ x: doc.x, y: doc.y }));
  const hit = (placement.targets ?? []).find(t => tokenCells(t.document).some(c => cellKey(c) === key));
  return hit?.id ?? "";
}

/* -------------------------------------------------- */
/*  Canvas object                                      */
/* -------------------------------------------------- */

/**
 * MeasuredTemplate that renders the ICON cell set stored in
 * `flags.icon-system.cells`. Core templates (no flag) keep their behaviour.
 */
export class IconMeasuredTemplate extends foundry.canvas.placeables.MeasuredTemplate {

  /** Absolute grid cells of this area, or null for a core template. */
  get iconCells() {
    const cells = this.document?.flags?.[FLAG_NS]?.cells;
    return Array.isArray(cells) && cells.length ? cells : null;
  }

  /** Canvas-space bounding rectangle of the cells. */
  #cellsRect() {
    const grid = canvas.grid;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of this.iconCells) {
      const p = grid.getTopLeftPoint(c);
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x + grid.size); y1 = Math.max(y1, p.y + grid.size);
    }
    return new PIXI.Rectangle(x0, y0, x1 - x0, y1 - y0);
  }

  /** @override */
  get bounds() {
    if (!this.iconCells) return super.bounds;
    return this.#cellsRect();
  }

  /** @override */
  _computeShape() {
    if (!this.iconCells) return super._computeShape();
    const r = this.#cellsRect();
    return new PIXI.Rectangle(r.x - this.document.x, r.y - this.document.y, r.width, r.height);
  }

  /** @override */
  _refreshTemplate() {
    if (!this.iconCells) return super._refreshTemplate();
    const grid = canvas.grid;
    const size = grid.size;
    const s = canvas.dimensions.uiScale;
    const t = this.template.clear();
    const keys = new Set(this.iconCells.map(cellKey));
    const ox = this.document.x, oy = this.document.y;
    t.lineStyle(this._borderThickness * s, this.document.borderColor, 0.9);
    // Outline: every cell edge that is not shared with another cell of the area.
    for (const c of this.iconCells) {
      const p = grid.getTopLeftPoint(c);
      const x = p.x - ox, y = p.y - oy;
      if (!keys.has(cellKey({ i: c.i - 1, j: c.j }))) t.moveTo(x, y).lineTo(x + size, y);
      if (!keys.has(cellKey({ i: c.i + 1, j: c.j }))) t.moveTo(x, y + size).lineTo(x + size, y + size);
      if (!keys.has(cellKey({ i: c.i, j: c.j - 1 }))) t.moveTo(x, y).lineTo(x, y + size);
      if (!keys.has(cellKey({ i: c.i, j: c.j + 1 }))) t.moveTo(x + size, y).lineTo(x + size, y + size);
    }
    // Origin marker (centre / first space)
    t.lineStyle(this._borderThickness * s, 0x000000).beginFill(this.document.fillColor, 0.6).drawCircle(0, 0, 5 * s).endFill();
  }

  /** @override */
  _getGridHighlightPositions() {
    if (!this.iconCells) return super._getGridHighlightPositions();
    return this.iconCells.map(c => canvas.grid.getTopLeftPoint(c));
  }

  /** @override */
  _refreshRulerText() {
    if (!this.iconCells) return super._refreshRulerText();
    const f = this.document.flags[FLAG_NS];
    const name = f.abilityName ? ` · ${f.abilityName}` : "";
    this.ruler.text = `${f.area?.label ?? "Area"}${name}`;
    const r = this.#cellsRect();
    this.ruler.position.set(r.x - this.document.x, r.y + r.height - this.document.y + 4);
  }

  /** @override */
  testPoint(point) {
    if (!this.iconCells) return super.testPoint(point);
    const c = canvas.grid.getOffset(point);
    return this.iconCells.some(k => k.i === c.i && k.j === c.j);
  }

  /** @override — a new cell set (aura following its token) must redraw everything. */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (changed.flags?.[FLAG_NS]?.cells) this.renderFlags.set({ refreshShape: true });
  }
}

/**
 * Register the canvas class and the token-following hooks (call from the
 * init hook). Auras stay glued to their token: when it moves, every area
 * template flagged `followTokenId` for it is shifted by the same number of
 * cells. Runs on the active GM's client only (it can update anyone's template),
 * whichever scene that GM is looking at.
 */
export function registerAreaTemplates() {
  CONFIG.MeasuredTemplate.objectClass = IconMeasuredTemplate;
  // Removing an area (the remove button on the card, Delete on the map, end of turn) also
  // drops the targets it gave its author: otherwise the next damage roll still
  // listed every token that had been in it. Targets are per user, so each
  // client clears its own, and only for the areas that user placed.
  Hooks.on("deleteMeasuredTemplate", (doc) => {
    const cells = doc.flags?.[FLAG_NS]?.cells;
    if (!cells?.length || doc.author?.id !== game.user.id) return;
    if (!canvas?.ready || doc.parent !== canvas.scene) return;
    const inArea = new Set(tokensInCells(cells).map(t => t.id));
    for (const t of Array.from(game.user.targets)) {
      if (inArea.has(t.id)) t.setTarget(false, { releaseOthers: false });
    }
  });
  // An aura held "while marked" (Fulminate p.226) ends with its mark: removed
  // by hand, moved to another character by marking again, the marker defeated,
  // end of combat. Active GM only (it can delete anyone's template).
  Hooks.on("deleteActiveEffect", async (effect) => {
    const mark = effect?.getFlag?.(FLAG_NS, "mark");
    if (!mark?.sourceActorId || game.users.activeGM?.id !== game.user.id) return;
    const targetUuid = effect.parent?.uuid;
    for (const scene of game.scenes ?? []) {
      const ids = scene.templates.filter(t => {
        const w = t.flags?.[FLAG_NS]?.whileMarked;
        return w && w.sourceActorId === mark.sourceActorId && w.abilityKey === mark.abilityKey && w.targetActorUuid === targetUuid
          && (!w.effectUuid || w.effectUuid === effect.uuid);   // not the aura of a new mark on the same character
      }).map(t => t.id);
      if (!ids.length) continue;
      try {
        await scene.deleteEmbeddedDocuments("MeasuredTemplate", ids);
        _log(`mark ${mark.abilityName} on ${effect.parent?.name} ended: removed ${ids.length} aura(s) held while marked`);
      } catch (err) { console.warn("[ICON | AreaTemplates] could not remove a while-marked aura", err); }
    }
  });
  // + / − with the mouse over an aura on the map: change its size (resizeAura).
  // Not while typing, nor while an area is being placed (the Line's own + / −),
  // nor with the mouse over a sheet or the sidebar (canvas.mousePosition keeps
  // the last spot on the board, so the board itself must be under the mouse).
  let overBoard = false;
  window.addEventListener("pointermove", (ev) => { overBoard = !!canvas?.app?.view && ev.target === canvas.app.view; }, { capture: true, passive: true });
  window.addEventListener("keydown", (ev) => {
    if (!["+", "=", "-", "_"].includes(ev.key) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (!overBoard || AreaPlacement.active) return;
    const el = document.activeElement;
    if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
    const doc = auraUnderMouse();
    if (!doc) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    if (!ev.repeat) resizeAura(doc, ev.key === "+" || ev.key === "=" ? 1 : -1);
  }, { capture: true });
  Hooks.on("preUpdateToken", (tokenDoc, changed, options) => {
    // Remember where the token was so updateToken can compute the cell delta.
    if ("x" in changed || "y" in changed) options.iconPrevPos = { x: tokenDoc.x, y: tokenDoc.y };
  });
  Hooks.on("updateToken", async (tokenDoc, changed, options) => {
    if (!options?.iconPrevPos) return;
    if (game.users.activeGM?.id !== game.user.id) return;
    const scene = tokenDoc.parent;
    if (!scene) return;
    const followers = scene.templates.filter(t => t.flags?.[FLAG_NS]?.followTokenId === tokenDoc.id);
    if (!followers.length) return;
    // The token's own scene grid: the active GM may be looking at another
    // scene (it used to bail out then, and the aura stayed behind).
    const grid = scene.grid;
    const half = grid.size / 2;
    // v13: inside updateToken the document still reports the pre-move x/y
    // (the movement is applied by the animation) — read the new spot from `changed`.
    const before = grid.getOffset({ x: options.iconPrevPos.x + half, y: options.iconPrevPos.y + half });
    const after  = grid.getOffset({ x: (changed.x ?? tokenDoc.x) + half, y: (changed.y ?? tokenDoc.y) + half });
    const di = after.i - before.i, dj = after.j - before.j;
    if (!di && !dj) return;
    const origin = grid.getCenterPoint(after);   // the token's top-left cell, as when the aura was placed
    const updates = followers.map(t => {
      const cells = (t.flags[FLAG_NS].cells ?? []).map(c => ({ i: c.i + di, j: c.j + dj }));
      return { _id: t.id, x: origin.x, y: origin.y, [`flags.${FLAG_NS}.cells`]: cells };
    });
    try { await scene.updateEmbeddedDocuments("MeasuredTemplate", updates); }
    catch (err) { console.warn("[ICON | AreaTemplates] could not move aura templates", err); }
  });
}
