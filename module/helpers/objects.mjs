/**
 * objects.mjs — the objects an ability or trait puts on the map (R33a).
 *
 * "Object - Characters can often summon or create objects … Categorized by
 * height, 1-3. Provides obstruction. Characters can stand on objects and take
 * cover behind them. Objects are immune to damage and effects unless
 * specified" (p.89); "Objects are from size 1-3 … can be stacked or created on
 * other objects as long as the total height of stacked objects isn't past 3.
 * Objects are not removed when you are defeated" (p.95).
 *
 * The jobs write an object three ways:
 *   "create a height 1 boulder object"             (Geo, Terraforming, Stone Double, Pyroclast, Astra, Polaris, Geyser, Fairy Ring)
 *   "Shrine — Height 1 object. Object Effect: Aura 2" (Spirit Shrine p.192, Aethershard)
 *   "it becomes an object (Thrown Weapon, height 1)"  (Comet, Underway "(Underway, size 1)")
 * plus two Infuse versions that change it: Pyroclast's "PYROSPIRE — Terrain
 * space becomes height 3" and Geyser's "VOLCANIC GEYSER — Create a Volcanic
 * Geyser instead".
 *
 * Pure (no Foundry globals), so the compendium can be checked from Node.
 */

// Text fields read, with the label the chip shows for where the object comes from.
const ABILITY_FIELDS = [
  ["description", ""], ["hitEffect", "Hit"], ["missEffect", "Miss"], ["areaEffect", "Area"],
  ["chargeEffect", "Charge"], ["heroicEffect", "Heroic"], ["exceedEffect", "Exceed"],
  ["collideEffect", "Collide"], ["slayEffect", "Slay"], ["critEffect", "Critical"],
  ["finishingBlowEffect", "Finishing Blow"], ["comebackEffect", "Comeback"], ["comboEffect", "Combo"],
  ["talent1", "Talent I"], ["talent2", "Talent II"], ["mastery", "Mastery"],
];

const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const titleCase = (s) => String(s ?? "").trim().toLowerCase().replace(/(^|[\s(-])([a-zà-ÿ])/g, (_m, a, b) => a + b.toUpperCase());
const clampHeight = (n) => Math.min(3, Math.max(1, Number(n) || 1));

/**
 * The objects one rules text creates, in order of appearance.
 * @param {string} text  plain or HTML
 * @returns {Array<{name:string, height:number, variant:string, aura:number,
 *   replace:boolean, noStack:boolean, noObstruction:boolean}>}
 */
export function objectsInText(text) {
  const t = plain(text);
  if (!t || !/\bobjects?\b/i.test(t)) return [];
  // What the text says about all its objects.
  const field = {
    // "The shrine … lasts until this ability is used again" (p.192), "Portals last until …" (Underway p.168)
    replace:       /\blasts? until this ability is used again\b/i.test(t),
    // "Portals don't provide obstruction and can't stack or be placed on other objects" (Underway)
    noStack:       /\bcan(?:'|no)t stack\b/i.test(t),
    noObstruction: /\b(?:don't|do not|doesn't|does not) provide obstruction\b/i.test(t),
  };
  const found = [];
  const add = (at, end, name, height) => {
    let n = String(name ?? "").trim().replace(/^(?:the|a|an)\s+/i, "");
    if (!n || /^objects?$/i.test(n)) return;
    // "Object Effect: Aura 2" right after the object's own line goes with it (Spirit Shrine p.192).
    const aura = /^[\s.]*object effect\s*:\s*aura (\d+)\b/i.exec(t.slice(end, end + 60));
    found.push({ at, name: titleCase(n), height: clampHeight(height), variant: "", aura: aura ? Number(aura[1]) : 0, ...field });
  };
  // "a height 1 boulder object", "two height 1 boulder objects", "a height 1 magma spire object"
  for (const m of t.matchAll(/\bheight ([1-3]) ((?:[a-z][\w'-]*\s+){0,2}?[a-z][\w'-]*)\s+objects?\b/gi))
    add(m.index, m.index + m[0].length, m[2], m[1]);
  // "Shrine — Height 1 object", "Aethershard — Height 1 object"
  for (const m of t.matchAll(/\b([A-Z][\w'-]*(?: [A-Z][\w'-]*)?)\s*[—–]\s*(?:[Hh]eight|[Ss]ize) ([1-3]) [Oo]bject\b/g))
    add(m.index, m.index + m[0].length, m[1], m[2]);
  // "becomes an object (Thrown Weapon, height 1)", "a leafy portal object (Underway, size 1)"
  for (const m of t.matchAll(/\bobject \(([^,()]+), (?:height|size) ([1-3])\)/gi))
    add(m.index, m.index + m[0].length, m[1], m[2]);
  found.sort((a, b) => a.at - b.at);

  const base = found[0];
  if (base) {
    // "Infuse 3: PYROSPIRE — Terrain space becomes height 3" (Pyroclast p.221): the same object, taller.
    for (const m of t.matchAll(/\b([A-ZÄÖÜ][A-ZÄÖÜ' ]{2,}?)\s+[—–]\s+[^.]*?\bbecomes height ([1-3])\b/g))
      found.push({ ...base, at: m.index, height: clampHeight(m[2]), variant: titleCase(m[1]), aura: base.aura });
    // "Infuse 3: VOLCANIC GEYSER — Create a Volcanic Geyser instead" (Geyser p.232): another object, same height.
    for (const m of t.matchAll(/\b([A-ZÄÖÜ][A-ZÄÖÜ' ]{2,}?)\s+[—–]\s+Create an? ([A-Z][\w' -]*?) instead\b/g)) {
      const name = titleCase(m[2]);
      const variant = titleCase(m[1]);
      found.push({ ...base, at: m.index, name, variant: variant === name ? "" : variant });
    }
  }
  return found.map(({ at, ...o }) => o);
}

/**
 * The objects an ability (or a trait) puts on the map. A talent counts only
 * when it is the selected one, the mastery only once unlocked: Fairy Ring's
 * Megamushroom is the mastery's (p.181), Polaris' meteor its Talent II's.
 * @param {object} system   the item's system data
 * @param {{trait?: boolean}} [opts]  a trait reads its description only
 * @returns {Array<{name:string, height:number, variant:string, aura:number, replace:boolean,
 *   noStack:boolean, noObstruction:boolean, source:string, field:string}>}
 */
export function objectsForItem(system, { trait = false } = {}) {
  const s = system ?? {};
  const talent = Number(s.talentSelected) || 0;
  const out = [];
  const seen = new Set();
  for (const [field, source] of trait ? [["description", ""]] : ABILITY_FIELDS) {
    if (field === "talent1" && talent !== 1) continue;
    if (field === "talent2" && talent !== 2) continue;
    if (field === "mastery" && !s.masteryUnlocked) continue;
    for (const o of objectsInText(s[field])) {
      const key = `${o.name}|${o.height}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...o, source: o.variant || source, field });
    }
  }
  return out;
}

/** Token name for an object: "Shrine (height 2)". */
export function objectTokenName(name, height) {
  return `${name} (height ${clampHeight(height)})`;
}
