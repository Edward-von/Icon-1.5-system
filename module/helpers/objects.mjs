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

// The label that opens the block an object is created in ("Effect:", "Object:", "Terrain effect:",
// "Object Effect:" …) and the labels that open the next, unrelated block (the Infuse versions,
// Charge, Slay …). "Effect:" is not a stop: Geyser's "Effect: After the geyser is removed,
// summon a Salt Sprite in its space" is still about the geyser (p.232).
const BLOCK_START = /\b(?:(?:Object|Terrain|Summon|Area) [Ee]ffect|Effect|Object|Summon)\s*:/g;
const BLOCK_STOP  = /\s(?:(?:Slay or )?Infuse (?:\d+|X)|Charge|Heroic|Exceed|Collide|Slay|Critical|Comeback|Finishing Blow)\s*:/;

/** The rules of the object created at `at` in `t`: its block, from the label before it to the next Infuse / trigger block. */
function blockAround(t, at) {
  let start = 0;
  for (const m of t.matchAll(BLOCK_START)) { if (m.index > at) break; start = m.index; }
  const stop = BLOCK_STOP.exec(t.slice(at));
  return t.slice(start, stop ? at + stop.index : t.length).trim();
}

/** An Infuse version's own block, from its name to the next block. */
function infuseBlock(t, at) {
  const stop = BLOCK_STOP.exec(t.slice(at + 1));
  return t.slice(at, stop ? at + 1 + stop.index : t.length).trim();
}

/**
 * The objects one rules text creates, in order of appearance.
 * @param {string} text  plain or HTML
 * @returns {Array<{name:string, height:number, variant:string, aura:number,
 *   replace:boolean, noStack:boolean, noObstruction:boolean}>}
 */
export function objectsInText(text) {
  const t = plain(text);
  // R33a3: Upheaval's mastery names no "object" ("Boulder may be placed as a height 2 pillar instead", p.136).
  const INSTEAD = /\b(?:placed|created) as an? height ([1-3]) ((?:[a-z][\w'-]*\s+)?[a-z][\w'-]*) instead\b/gi;
  if (!t || (!/\bobjects?\b/i.test(t) && !/\b(?:placed|created) as an? height [1-3] /i.test(t))) return [];
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
    found.push({ at, name: titleCase(n), height: clampHeight(height), variant: "", infuse: "",
      aura: aura ? Number(aura[1]) : 0, rules: blockAround(t, at), ...field });
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
  // "Boulder may be placed as a height 2 pillar instead" (Upheaval, Titan Strength p.136)
  for (const m of t.matchAll(INSTEAD))
    add(m.index, m.index + m[0].length, m[2], m[1]);
  found.sort((a, b) => a.at - b.at);

  const base = found[0];
  if (base) {
    // "Infuse 3: PYROSPIRE — Terrain space becomes height 3" (Pyroclast p.221): the same object, taller.
    // `infuse` names the version: its chip is offered while that infusion is armed (R33a2).
    for (const m of t.matchAll(/\b([A-ZÄÖÜ][A-ZÄÖÜ' ]{2,}?)\s+[—–]\s+[^.]*?\bbecomes height ([1-3])\b/g))
      found.push({ ...base, at: m.index, height: clampHeight(m[2]), variant: titleCase(m[1]), infuse: titleCase(m[1]),
        aura: base.aura, rules: `${base.rules} ${infuseBlock(t, m.index)}` });
    // "Infuse 3: VOLCANIC GEYSER — Create a Volcanic Geyser instead" (Geyser p.232): another object, same height.
    for (const m of t.matchAll(/\b([A-ZÄÖÜ][A-ZÄÖÜ' ]{2,}?)\s+[—–]\s+Create an? ([A-Z][\w' -]*?) instead\b/g)) {
      const name = titleCase(m[2]);
      const variant = titleCase(m[1]);
      found.push({ ...base, at: m.index, name, variant: variant === name ? "" : variant, infuse: variant,
        rules: `${base.rules} ${infuseBlock(t, m.index)}` });
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

/**
 * What an object's rules say the table needs to remember (R33a2):
 *   benefits  "The shrine gains additional benefits equal to its total height, including other objects it is
 *             stacked on: 1: … 2: … 3+: …" (Spirit Shrine p.192) → [{min:1, text}, {min:2, text}, {min:3, text}]
 *   noAttack  "While this object is active, you cannot attack" (Comet)
 *   pickUp    "You can pick your weapon up if you enter or exit any space adjacent to it … removing the object" (Comet)
 * @param {string} rules  the object's rules (objectsInText → rules), plain
 */
export function objectRuleNotes(rules) {
  const t = plain(rules);
  const benefits = [];
  const table = /\btotal height\b[^:]*:\s*(.*)$/i.exec(t);
  if (table) {
    for (const m of table[1].matchAll(/(?:^|\s)([1-3])(\+)?:\s*([^.]*\.?)/g))
      benefits.push({ min: Number(m[1]), plus: !!m[2], text: m[3].trim() });
  }
  return {
    benefits,
    noAttack: /\byou cannot attack\b/i.test(t),
    pickUp:   /\bpick (?:\S+ ){0,2}up\b/i.test(t),
    ...objectRuleNotesA3(t),
  };
}

/**
 * The rest of what an object's rules set off (R33a3):
 *   areaTrigger  "When you include the Aethershard in the area effect of any ability, the ability resonates with
 *                the shards, dealing 2 piercing damage as an area effect, once, to all characters in the area for
 *                every one of your Aethershards caught … Then destroy all Aethershards activated this way and gain
 *                1 Aether" (p.210-211; the old pack wording "the ability deals 2 …" reads the same)
 *                → { amount: 2, type: "piercing", aether: 1 }
 *   blessing     "The object has a blessing token on it" (Fairy Ring, Spore Shroud p.187)
 *   countsAs     "… and counts as a plant" → "plant"
 *   erupt        "you can cause it to erupt, removing that character from the battlefield, then placing them one or
 *                two spaces away. Then, remove the geyser. Effect: After the geyser is removed, summon a Salt Sprite in
 *                its space" (Geyser p.232) → { place: "one or two", blast: "", summon: "Salt Sprite", dangerous }
 *                Volcanic Geyser: "it removes and places all characters in a medium blast area centered on it, and
 *                creates dangerous terrain under foes" → blast "m", dangerous true.
 * @param {string} t  plain text
 */
function objectRuleNotesA3(t) {
  const trig = /\bwhen you include the [^.]*?\bin the area effect of any ability\b[^.]*?\b(\d+) (?:(piercing|divine) )?damage\b/i.exec(t);
  const aether = /\bgain (\d+) aether\b/i.exec(t);
  let erupt = null;
  // "you can cause it to erupt" — not Pyroclast's "the ground beneath them erupts" (p.211), which makes the spire.
  if (/\bcause (?:it|the [\w-]+) to erupt\b/i.test(t)) {
    const blast = /\berupts?\b[^.]*?\ball characters in an? (small|medium|large) blast\b/i.exec(t);
    erupt = {
      place:     /\bplacing them ((?:\w+ ){0,3}?\w+) spaces? away\b/i.exec(t)?.[1] ?? "",
      blast:     blast ? blast[1][0].toLowerCase() : "",
      summon:    /\bsummon an? ([A-Z][\w'-]*(?: [A-Z][\w'-]*)?) in its space\b/.exec(t)?.[1] ?? "",
      dangerous: /\bcreates? dangerous terrain under foes\b/i.test(t),
    };
  }
  return {
    areaTrigger: trig ? { amount: Number(trig[1]), type: (trig[2] ?? "").toLowerCase(), aether: aether ? Number(aether[1]) : 0 } : null,
    blessing:    /\bhas an? blessing token on it\b/i.test(t),
    countsAs:    /\bcounts as an? ([a-z]+)\b/i.exec(t)?.[1]?.toLowerCase() ?? "",
    erupt,
    ...objectRuleNotesA4(t),
  };
}

const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
/** "one or two" → 2, "three" → 3, "2" → 2: the largest number in a short phrase, else 0. */
export function largestNumber(phrase) {
  let best = 0;
  for (const w of String(phrase ?? "").toLowerCase().split(/[^a-z0-9]+/)) {
    const n = /^\d+$/.test(w) ? Number(w) : (NUMBER_WORDS[w] ?? 0);
    best = Math.max(best, n);
  }
  return best;
}

/**
 * What an object's rules say about moving around it (R33a4):
 *   portal      "you and allies can teleport from any space adjacent to an underway to a free adjacent space to any
 *               other underway" (Underway p.168) → true
 *   rampart     "Spaces adjacent to it have rampart" (Comet p.128) → true
 *   pickUpNear  "You can pick your weapon up if you enter or exit any space adjacent to it or start your turn there"
 *               (Comet p.128) → true
 * @param {string} t  plain text
 */
function objectRuleNotesA4(t) {
  return {
    portal:     /\bteleport from any space adjacent to an? [\w' -]+? to a free (?:adjacent )?space (?:adjacent )?to any other\b/i.test(t),
    rampart:    /\bspaces adjacent to it have rampart\b/i.test(t),
    pickUpNear: /\bpick [^.]*?\bup if you enter or exit any space adjacent to it\b/i.test(t),
  };
}

/**
 * What the selected talent / unlocked mastery lines of an object (objectUpgrades) add to it (R33a4):
 *   relocate     "you can first remove one of your Aethershards, then place it in any free space up to range 2 from its
 *                original location" (Aethershard Talent I, p.210) → { range: 2, source }
 *   adjacentGain "If you start or end your turn adjacent to an Aethershard, gain phasing until the end of your next
 *                turn" (AETHERSHIFT, p.211) → { status: "phasing", until, source, text }
 *   pullFoes     "Foes that are shoved into portals or that end their turn adjacent to an underway can be teleported …"
 *                (Bale Portal, Underway p.168) → { source, text }
 *   alliesPlace  "Allies can be placed up to three spaces away by a geyser" (GREAT GEYSER, p.232) → 3
 * @param {Array<{source:string, text:string}>} upgrades
 */
export function objectUpgradeEffects(upgrades) {
  const out = { relocate: null, adjacentGain: null, pullFoes: null, alliesPlace: 0, coverNear: null, coverOn: null, pierceNear: null };
  for (const u of upgrades ?? []) {
    const t = plain(u.text);
    const rel = /\bremove one of your [\w' -]+?, then place it in any free space up to range (\d+) from its original location\b/i.exec(t);
    if (rel && !out.relocate) out.relocate = { range: Number(rel[1]), source: u.source };
    const gain = /\bif you start or end your turn adjacent to an? [\w' -]+?, gain ([a-z]+) (until the end of your next turn)\b/i.exec(t);
    if (gain && !out.adjacentGain) out.adjacentGain = { status: gain[1].toLowerCase(), until: gain[2], source: u.source, text: t };
    if (!out.pullFoes && /\bfoes that [^.]*?\bend their turn adjacent to an? [\w' -]+? can be teleported\b/i.test(t)) out.pullFoes = { source: u.source, text: t };
    const allies = /\ballies can be placed up to (\w+) spaces? away\b/i.exec(t);
    if (allies) out.alliesPlace = Math.max(out.alliesPlace, largestNumber(allies[1]));
    // R33a5: Underway Talent II "Allies adjacent to underways have cover" (p.168), Geyser Talent I "Allies standing
    // on a geyser have cover from all directions" (p.232).
    if (!out.coverNear && /\ballies adjacent to (?:an? |your )?[\w' -]+? have cover\b/i.test(t)) out.coverNear = { source: u.source };
    if (!out.coverOn && /\ballies standing on (?:an? |your )?[\w' -]+? have cover from all directions\b/i.test(t)) out.coverOn = { source: u.source };
    // R33a5: Aethershard Talent II "Your abilities gain pierce against characters adjacent to Aethershards" (p.210).
    if (!out.pierceNear && /\byour abilities gain pierce against characters adjacent to (?:an? |your )?[\w' -]+/i.test(t)) out.pierceNear = { source: u.source };
  }
  return out;
}

/**
 * Growth at the start of the creator's turn: "Increase the height of all geysers by +1 at the start of your
 * turn" (Geyser Talent I, p.232) → 1 when it speaks of `name` ("Geyser", "Volcanic Geyser"), else 0.
 * @param {string} text  a talent / mastery text
 * @param {string} name  the object's name
 */
export function turnStartGrowth(text, name) {
  const m = /\bincrease the height of (?:all|each|every|your) (?:of your )?([\w' -]+?) by \+?(\d) at the start of your turn\b/i.exec(plain(text));
  if (!m) return 0;
  const word = (s) => String(s ?? "").trim().split(/\s+/).pop().toLowerCase().replace(/s$/, "");
  return word(m[1]) === word(name) ? Number(m[2]) : 0;
}

/**
 * Damage dealt once per height of the object: Spirit Shrine's mastery "Destroy the shrine, then deal 2 divine
 * damage once to the foe per height of the shrine" (p.193) → { amount: 2, type: "divine" }, else null.
 */
export function perHeightDamage(text) {
  const m = /\b(\d+) (?:(divine|piercing|unerring) )?damage once\b[^.]*?\bper height\b/i.exec(plain(text));
  return m ? { amount: Number(m[1]), type: (m[2] ?? "").toLowerCase() } : null;
}

/**
 * The selected talent and unlocked mastery of the ability an object comes from that speak of
 * that object ("Yourself and allies that end their turn adjacent to your weapon gain 2 vigor",
 * Comet Talent II; "If you or an ally ends their turn inside the Shrine's aura …", Spirit Shrine
 * Talent I): matched on the last word of the object's name, singular or plural.
 * @param {object} system  the ability's system data
 * @param {string} name    the object's name ("Thrown Weapon")
 * @param {string} [field] the field the object itself comes from (left out: already the rules)
 * @returns {Array<{source:string, text:string}>}
 */
export function objectUpgrades(system, name, field = "") {
  const s = system ?? {};
  const word = String(name ?? "").trim().split(/\s+/).pop()?.toLowerCase().replace(/s$/, "");
  if (!word || word.length < 3) return [];
  const re = new RegExp(`\\b${word.replace(/[^\w]/g, "")}s?\\b`, "i");
  const talent = Number(s.talentSelected) || 0;
  const out = [];
  for (const [f, source, on] of [["talent1", "Talent I", talent === 1], ["talent2", "Talent II", talent === 2], ["mastery", "Mastery", !!s.masteryUnlocked]]) {
    if (!on || f === field) continue;
    const text = plain(s[f]);
    if (text && re.test(text)) out.push({ source, text });
  }
  return out;
}

/** Token name for an object: "Shrine (height 2)". */
export function objectTokenName(name, height) {
  return `${name} (height ${clampHeight(height)})`;
}
