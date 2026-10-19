/**
 * ability-damage.mjs — Parse damage info out of ability/action free text.
 *
 * Game-rules logic shared by all four actor sheets and the
 * populate-legend-damage macro. Lived in IconSheet.mjs historically;
 * moved here because it's combat logic, not presentation.
 */

import { comboReplacesBase } from "../helpers/ability-blocks.mjs";
import { limitBreakInfusions, masteryInfusion } from "../helpers/infuse.mjs";

// Parse a single text blob for dice formula + fray + flat damage.
function parseChunk(text) {
  if (!text || typeof text !== "string") {
    return { mult: 0, fray: false, flat: 0, type: "", times: 1 };
  }
  const lower = text.toLowerCase();
  // dice multiplier: "[D]", "2[D]", "3[d]"
  const diceMatch = lower.match(/(\d)?\s*\[d\]/);
  const mult = diceMatch ? (diceMatch[1] ? Number(diceMatch[1]) : 1) : 0;
  // fray flat bonus
  const includesFray = /\bfray\b/.test(lower);
  // explicit flat damage: "3 damage", "2 piercing damage". Damage dealt to
  // the user ("each adjacent foe deals 1 piercing damage to you", Provoke
  // p.142) is what they take, not what they deal: skip it. Same for a foe
  // hurting itself (Bale Troll's Incredible Bulk p.457, "The troll deals 10
  // piercing damage to itself"). "2 additional
  // divine damage" (Passage to the Afterlife p.190) counts too, and so does
  // "2 unerring damage" (Astral Chain's Mark p.156).
  const flatMatch = lower.match(/(\d+)\s+(?:additional\s+)?(?:divine\s+|piercing\s+|true\s+|unerring\s+)?damage(?!\s+to\s+(?:you(?:rself)?|itself)\b)/);
  const flat = flatMatch ? Number(flatMatch[1]) : 0;
  // Damage type written next to the amount X
  // p.179; "[D]+fray divine damage", Gigaflare; "2 piercing damage"), so
  // the damage dialog can start with Divine / Pierce ticked (p.104).
  // Same "to you" / "to itself" exclusion as the flat amount. Also "divine fray damage",
  // with the type first (Dread Mock p.141, Gigantas Crusher on legends).
  const typeMatch = lower.match(/(?:(?:\d+|\[d\]|\bfray)\s+(?:additional\s+)?(divine|piercing)|\b(divine|piercing)\s+fray)\s+damage(?!\s+to\s+(?:you(?:rself)?|itself)\b)/);
  const type = typeMatch ? (typeMatch[1] || typeMatch[2]) : "";
  // Repeated damage (p.92: "Some damage is listed as X, Y times […] roll
  // [D] once, then apply the total damage three separate times"): "1 divine
  // damage three times" (Chastise), "3 damage, three times", "deals [D]
  // twice", "deal [D]+fray two more times" (Passage to the Afterlife's Exceed),
  // "they take 2 unerring damage from you twice" (Showdown p.157: who deals
  // it may sit between the damage and the count).
  // Each instance takes armor, vulnerable and weakened on its own
  // (p.92, p.109), so the damage card applies them one by one.
  const timesMatch = lower.match(/(?:\bdamage|\[d\]|\bfray)(?:\s+from\s+(?:you|it|them|(?:the\s+)?[a-z]+))?\s*,?\s*(once|twice|thrice|(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:more\s+)?times)\b/);
  const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const times = !timesMatch ? 1
    : timesMatch[1] === "once" ? 1 : timesMatch[1] === "twice" ? 2 : timesMatch[1] === "thrice" ? 3
    : (Number(timesMatch[2]) || WORDS[timesMatch[2]] || 1);
  // Damage repeated a number of times the situation decides, with a ceiling:
  // "deal fray damage to your foe, up to a maximum of four times" (Circle the
  // Oak), "1 piercing damage once for every object adjacent to them, up to a
  // maximum of 4 times" (Quaking Palm), "to a maximum of four times"
  // (Nothung). `maxTimes` is that ceiling: the dialog starts Instances at 1
  // and lets it go up to it. Only in the same sentence as the damage, so a
  // later "gains 2 vigor …, up to three times" is not read.
  const maxMatch = lower.match(/\bdamage\b[^.]*?\b(?:up\s+to|to|for)\s+(?:a\s+)?(?:maximum\s+of\s+)?(\d+|two|three|four|five|six|seven|eight|nine|ten)\s+times\b/);
  const maxTimes = maxMatch ? (Number(maxMatch[1]) || WORDS[maxMatch[1]] || 0) : 0;
  // "2 unerring damage" (Showdown p.157, Warding Bolts p.158, Astral Chain's
  // Mark p.156): the damage ignores cover and aetherwall (p.104), so the
  // damage dialog starts with Unerring ticked for that outcome.
  const unerring = /\bunerring\s+damage\b/.test(lower);
  return { mult, fray: includesFray, flat, type, times, ...(maxTimes > 1 ? { maxTimes } : {}), ...(unerring ? { unerring } : {}) };
}

/**
 * The unlocked mastery that changes the type of some of the ability's
 * damage — "All 1 piercing damage listed by this ability becomes divine"
 * (Nothung's Excalibur, p.225) — as a function retyping a damage chunk, or
 * null when there is none.
 */
function _masteryRetype(s) {
  const m = s?.masteryUnlocked && /\ball\s+(?:(\d+)\s+)?(?:(piercing|divine)\s+)?damage\s+(?:listed|dealt)\s+by\s+this\s+ability\s+becomes\s+(divine|piercing)\b/i
    .exec(String(s.mastery ?? "").replace(/<[^>]+>/g, " "));
  if (!m) return null;
  const [, amount, from, to] = m;
  const fits = (c) => !!(c && (c.mult > 0 || c.flat > 0 || c.fray)) && (!from || c.type === from.toLowerCase())
    && (!amount || (c.flat === Number(amount) && !c.mult && !c.fray));
  return (c) => (fits(c) ? { ...c, type: to.toLowerCase() } : c);
}

/**
 * Extract structured damage info from an ability's free-text fields. The
 * source JSON uses patterns like:
 *   hitEffect: "[D] + fray. Attack target is weakened..."
 *   missEffect: "Fray."
 *   areaEffect: "Foes take fray damage"
 *   description: "...Attack: Autohit: 2[D]+fray. Area Effect: fray."
 *
 * We concatenate the fields and look for:
 *   - "autohit" → isAutoHit = true (skip the d20 roll)
 *   - "[D]" / "2[D]" / "3[D]" → dice multiplier
 *   - "fray" → includes fray flat damage
 *   - "N damage" → flat bonus / override
 *
 * Returns an object with per-outcome parsing results. Empty/non-damaging
 * fields default to zeros and no dice.
 * `opts.baseBlocks` (a PC ability on the PC sheet): the damage written in the
 * description's other blocks (Mark, Effect, …) is listed under "Other" too.
 * The damage inside a "Summon Effect:" / "Object Effect:" block is left out
 * there: the summon or object the ability creates deals it later, not the
 * ability. Aethershard (p.210-211): "Summon Effect: When you include the
 * Aethershard in the area effect of any ability … dealing 2 piercing damage"
 * — the resonance card deals it when an area catches the shards. Foe and
 * legend actions keep reading it: their Damage button is how the GM rolls a
 * torpedo's or a munition's blast.
 * `opts.foe` (with baseBlocks, a foe / legend action on its sheet): the same
 * "Other" lines from its Effect blocks (Kelpie's Savage Fang "Effect: Deal 3
 * damage to all other foes adjacent to the Kelpie", Overpower, Mighty Smite),
 * keeping the Summon / Object Effect text as it is.
 */
// A "Summon Effect:" / "Object Effect:" block, up to the end of its paragraph
// (a new line, or "</p>" in an HTML text) or the next label that opens a
// block of the ability itself.
const SUMMON_EFFECT_BLOCK = /\b(?:summon|object)\s+effect\s*:[^\n]*?(?=\n|<\/p>|[\s>](?:summon\s+action|(?:area\s+|terrain\s+)?effect|attack|on\s+hit|auto[-\s]?hit|miss|infuse\s+(?:\d+|x)|charge|heroic|exceed|collide|slay|critical|comeback|finishing\s+blow)\s*:|$)/gi;

export function parseAbilityDamage(itemSystem, { baseBlocks = false, foe = false } = {}) {
  const s0 = itemSystem ?? {};
  // Object.create, not a spread: the system can be a data model, or already a
  // shadowing copy (withActiveCombo) whose fields sit on its prototype.
  // `foe` (a foe / legend action, with baseBlocks): the Summon / Object
  // Effect stays, see above.
  const s = baseBlocks && !foe && typeof s0.description === "string" && s0.description.search(SUMMON_EFFECT_BLOCK) >= 0
    ? Object.create(s0, { description: { value: s0.description.replace(SUMMON_EFFECT_BLOCK, " "), enumerable: true } })
    : s0;
  const isAttack = !!s.isAttack;

  const combined = [
    s.hitEffect, s.missEffect, s.areaEffect, s.description,
    s.critEffect, s.exceedEffect, s.heroicEffect,
  ].filter(Boolean).join(" ").toLowerCase();

  const isAutoHit = /auto[-\s]?hit/.test(combined);

  // Primary hit: prefer `hitEffect`; fall back to description "On hit:" / "Autohit:" substring
  let hitText = s.hitEffect || "";
  if (!hitText && s.description) {
    const desc = s.description;
    // "Auto hit" is printed with and without the space (Fortuna: "Auto hit: [D]+fray").
    const m = desc.match(/(?:on\s+hit|auto[-\s]?hit)\s*[:]?\s*([^.]+)/i);
    if (m) hitText = m[1];
  }
  let hit = parseChunk(hitText);

  // Miss: prefer `missEffect`; fall back to "Miss:" in description
  let missText = s.missEffect || "";
  if (!missText && s.description) {
    const m = s.description.match(/miss\s*[:]\s*([^.]+)/i);
    if (m) missText = m[1];
  }
  let miss = parseChunk(missText);

  // Area: prefer `areaEffect`; fall back to "Area Effect:" in description
  let areaText = s.areaEffect || "";
  if (!areaText && s.description) {
    const m = s.description.match(/area\s*effect\s*[:]\s*([^.]+)/i);
    if (m) areaText = m[1];
  }
  let area = parseChunk(areaText);

  // Fallback: many legend/foe actions keep everything in `description` without
  // "On hit:" / "Miss:" / "Area Effect:" prefixes. If all per-outcome chunks
  // came up empty but the description has damage-shaped text, use it as the
  // hit chunk so the Damage button still shows.
  const anyDamage = (c) => c.mult > 0 || c.flat > 0 || c.fray;
  let descAsHit = false;
  if (!anyDamage(hit) && !anyDamage(miss) && !anyDamage(area) && s.description) {
    const descChunk = parseChunk(s.description);
    if (anyDamage(descChunk)) { hit = descChunk; descAsHit = true; }
  }

  // No area damage in the ability's own text: the upgrade in play (selected
  // talent, unlocked mastery) may give it an area that deals damage. Dropkick's
  // Giant Kicker (p.136): "gains … a line 4 area effect … The area deals fray
  // damage to all characters other than your target" → the damage dialog
  // offers Area. The damage sits in the sentence naming the area effect or
  // the next. Not read: damage dealt "again" (a second instance, not the
  // area's own), and a text that writes out a whole other action with its own
  // labels (God Hand's alternate combo, the Magna infusions).
  const talentNo = Number(s.talentSelected ?? 0);
  const upgrades = [
    { source: talentNo === 1 ? "Talent I" : "Talent II", text: { 1: s.talent1, 2: s.talent2 }[talentNo] },
    // A mastery that is an Infuse version (MAGNARIME: Infuse X, Rime p.233)
    // only deals its damage while armed: infusedAbilityDamage reads it then.
    { source: "Mastery", text: s.masteryUnlocked && !masteryInfusion(s).length ? s.mastery : "" },
  ].filter(u => u.text && typeof u.text === "string" && !/\b(?:combo|attack|hit)\s*:/i.test(u.text))
   .map(u => ({ ...u, sentences: u.text.replace(/<[^>]+>/g, " ").split(/(?<=\.)\s+/) }));
  let areaSentence = "";
  if (!anyDamage(area)) {
    for (const u of upgrades) {
      const i = u.sentences.findIndex(x => /\barea\s+effect\b/i.test(x));
      if (i < 0) continue;
      const pick = [u.sentences[i], u.sentences[i + 1]]
        .find(x => x && /\bdamage\b/i.test(x) && !/\bagain\b/i.test(x) && anyDamage(parseChunk(x)));
      if (pick) { area = parseChunk(pick); areaSentence = pick; break; }
    }
  }

  // Damage the upgrade in play deals besides the attack, offered by the
  // damage dialog's "Other" outcome as a one-click roll: Harvest Moon
  // ("dealing 2 piercing damage in a small blast area effect centered on each
  // plant", p.186), Dark Wind Devil Blade ("all foes in any area you created
  // with this ability are slashed and take 2 divine damage", p.128), a talent's
  // "deal fray damage again". One entry per sentence with damage; the sentence
  // already read as the Area damage above is left out, and so is a sentence
  // that changes the ability's damage instead of adding some ("deals 4 damage
  // instead of 2", "damage increases by 1", "becomes divine").
  const extras = [];
  // Same for damage written in the base text's own blocks besides Hit / Miss
  // / Area: Incubus's Mark (p.164) "both the target and any adjacent foes take
  // 2 damage and are dazed", Chastise's Effect (p.179) "they take 1 divine
  // damage three times", Astral Chain's Mark (p.156). One entry per sentence
  // with damage, named after the block it sits in. Not read: an ability whose
  // description already is its Hit (the fallback above), the Hit / Miss / Area
  // lines themselves, an "Area effect:" when Area already deals damage, the
  // Infuse versions (infusedAbilityDamage has those), and a sentence that
  // changes the damage instead of adding some.
  if (baseBlocks && !descAsHit && s.description) {
    // Collide / Exceed / Charge / Slay / Heroic / Comeback / Critical /
    // Finishing Blow: damage dealt only when that condition is met, labelled
    // so their sentences don't fall under the Effect before them, and skipped.
    const BLOCK_RE = /\b(mark|(?:terrain\s+|special\s+|summon\s+|area\s+)?effect|(?:gain\s+)?stance|special|refresh|trigger|object|summon|gamble|attack|on\s+hit|auto[-\s]?hit|hit|miss|collide|exceed|charge|slay|heroic|comeback|critical|finishing\s+blow)\s*:/gi;
    const desc = String(s.description).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ")
      .replace(/\b(?:slay\s+or\s+)?infuse\s+(?:\d+|x)\b(?:\s+or\s+slay)?\s*:.*$/i, "");
    let block = "";
    for (const sentence of desc.split(/(?<=\.)\s+/)) {
      const found = [...sentence.matchAll(BLOCK_RE)].map(m => ({ at: m.index, label: m[1].toLowerCase().replace(/\s+/g, " ").replace(/^gain /, "") }));
      // The damage belongs to the last label written before it, the next
      // sentences to the last one of this sentence: Razer's Aether Split
      // "Area effect: 2 damage, Effect: teleport all characters in the area 1."
      const dmgAt = sentence.search(/\bdamage\b/i);
      const label = found.filter(x => x.at < dmgAt).at(-1)?.label ?? block;
      if (found.length) block = found.at(-1).label;
      if (dmgAt < 0 || !label) continue;
      if (/^(?:attack|on hit|auto[-\s]?hit|hit|miss|trigger|refresh|collide|exceed|charge|slay|heroic|comeback|critical|finishing blow)$/.test(label)) continue;
      if (label === "area effect" && anyDamage(area)) continue;
      if (/\b(?:instead|increases?|becomes|bonus\s+damage)\b|\+\s*\d+\s+damage/i.test(sentence)) continue;
      const chunk = parseChunk(sentence);
      if (!anyDamage(chunk)) continue;
      const source = label.replace(/\b\w/g, ch => ch.toUpperCase());
      // Two separate damages in one sentence, one after the other: Blitz
      // (p.225) "then deal 1 piercing damage to a foe in range 3, then
      // teleport 1, then deal 1 piercing damage to a foe in range 3" — one
      // line each ("Effect — 1st", "Effect — 2nd"), they can hit different foes.
      const steps = sentence.split(/,\s*then\s+/i).filter(x => /\bdamage\b/i.test(x) && anyDamage(parseChunk(x)));
      const parts = steps.length > 1 ? steps : [sentence];
      parts.forEach((x, n) => extras.push({
        source: parts.length > 1 ? `${source} — ${["1st", "2nd", "3rd"][n] ?? `${n + 1}th`}` : source,
        text: x.trim(), ...(parts.length > 1 ? parseChunk(x) : chunk),
        area: /\b(?:area|blast|arc|line|burst|aura)\b/i.test(x),
        unerring: /\bunerring\s+damage\b/i.test(x),
      }));
    }
  }
  // The Collide block's own damage (Gigaton Whip p.137: "They take fray damage"), offered by "Other" as
  // "Collide" — unless the unlocked mastery takes its place (IZUNA DROP: "Instead of the normal collide
  // effect, … takes fray damage twice"): then only the mastery's damage, named "Collide — Izuna Drop".
  const masteryPlain = String(s.mastery ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const collideBy = s.masteryUnlocked && /\binstead of the normal collide effect\b/i.test(masteryPlain)
    ? (/^([A-Z][A-Za-z' -]*[A-Za-z])\s*:/.exec(masteryPlain)?.[1] ?? "Mastery") : "";
  if (baseBlocks && !collideBy && typeof s.collideEffect === "string") {
    for (const sentence of s.collideEffect.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").split(/(?<=\.)\s+/)) {
      if (!/\bdamage\b/i.test(sentence) || /\b(?:instead|increases?|becomes|bonus\s+damage)\b|\+\s*\d+\s+damage/i.test(sentence)) continue;
      const chunk = parseChunk(sentence);
      if (!anyDamage(chunk)) continue;
      extras.push({ source: "Collide", text: sentence.trim(), ...chunk,
                    area: /\b(?:area|blast|arc|line|burst|aura)\b/i.test(sentence),
                    unerring: /\bunerring\s+damage\b/i.test(sentence) });
    }
  }
  for (const u of upgrades) {
    for (const sentence of u.sentences) {
      if (sentence === areaSentence || !/\bdamage\b/i.test(sentence)) continue;
      if (/\b(?:instead\s+of|increases?\s+by|becomes)\b/i.test(sentence)) continue;
      const chunk = parseChunk(sentence);
      if (!anyDamage(chunk)) continue;
      extras.push({ source: u.source === "Mastery" && collideBy ? `Collide — ${collideBy}` : u.source, text: sentence.trim(), ...chunk,
                    area: /\b(?:area|blast|arc|line|burst|aura)\b/i.test(sentence),
                    unerring: /\bunerring\s+damage\b/i.test(sentence) });
    }
  }

  // A mastery that changes the type of some of the ability's damage: "All 1
  // piercing damage listed by this ability becomes divine" (Nothung's
  // Excalibur, p.225). The chunks with that amount and type take the new one,
  // so the dialog ticks Divine instead of Pierce.
  const re = _masteryRetype(s);
  if (re) {
    hit = re(hit); miss = re(miss); area = re(area);
    for (let i = 0; i < extras.length; i++) extras[i] = re(extras[i]);
  }

  // Does this ability deal any damage at all?
  const dealsDamage = hit.mult > 0 || hit.flat > 0 || hit.fray ||
                       area.mult > 0 || area.flat > 0 || area.fray ||
                       miss.fray;

  return {
    isAttack,
    isAutoHit,
    dealsDamage,
    hit,    // { mult, fray, flat, type, times }
    miss,
    area,
    extras, // [{ source, text, mult, fray, flat, type, times, area }] — "Other" outcome
  };
}

/**
 * Parse the COMBO version of an ability. `comboEffect` is a single free-text
 * blob; the "On hit:" / "Miss:" / "Area Effect:" fallbacks in
 * parseAbilityDamage pick its chunks out of it. A chunk the combo doesn't
 * rewrite keeps the base ability's damage, the same merge the cards use
 * (ability-blocks.mjs): Flying Sleeves only changes Death Blossom's area, so
 * it still hits for 2[D]+fray — parsed alone it "dealt no damage" and the
 * Damage button refused to roll.
 * Returns null when the ability has no usable combo version.
 */
export function parseComboAbilityDamage(itemSystem) {
  const s = itemSystem ?? {};
  if (!s.isCombo || !s.comboEffect || !String(s.comboEffect).trim()) return null;
  const text  = String(s.comboEffect).replace(/<[^>]+>/g, " ");
  const combo = parseAbilityDamage({ isAttack: !!s.isAttack, description: text });
  const base  = parseAbilityDamage(s);
  const rewrites = {
    hit:  /\b(?:on\s+hit|auto[-\s]?hit|hit)\s*:/i.test(text),
    miss: /\bmiss\s*:/i.test(text),
    area: /\barea\s*effect\s*:/i.test(text),
  };
  // A combo that restates its trigger is the whole ability written out again
  // (Justice → Judgement: "Interrupt 1. Gamble. Trigger: … Effect: …", no
  // Area Effect line): nothing is inherited from the base version.
  // Same for a complete combo ability written under a name in capitals
  // ("PURGATORIO — Attack: …", see comboReplacesBase).
  if (/\btrigger\s*:/i.test(text) || comboReplacesBase(s.comboEffect)) return combo;
  // No labelled chunk at all but damage-shaped prose: parseAbilityDamage put it in `hit`.
  const anyLabel = rewrites.hit || rewrites.miss || rewrites.area;
  const deals = (c) => c.mult > 0 || c.flat > 0 || c.fray;
  // Damage written in an Effect the combo adds is dealt besides the attack,
  // not in place of its Hit: Succubus (Incubus, p.164) "Instead of the mark,
  // gain Effect: deal 3 damage to all characters marked by Incubus" keeps
  // [D]+fray on hit and only swaps the Mark. Those sentences go to the damage
  // dialog's "Other" outcome; other unlabelled damage prose still rewrites Hit.
  const comboExtras = [];
  if (!anyLabel && deals(combo.hit) && /\beffect\s*:/i.test(text)) {
    const name = /^\s*([^:—–.]{1,40}?)\s*[:—–]/.exec(text)?.[1]?.trim() ?? "";
    for (const sentence of text.split(/(?<=\.)\s+/)) {
      if (!/\bdamage\b|\[d\]|\bfray\b/i.test(sentence)) continue;
      const chunk = parseChunk(sentence);
      if (!deals(chunk)) continue;
      comboExtras.push({ source: name ? `Combo — ${name}` : "Combo", text: sentence.trim(), ...chunk,
                         area: /\b(?:area|blast|arc|line|burst|aura)\b/i.test(sentence) });
    }
  } else if (!anyLabel && deals(combo.hit)) rewrites.hit = true;
  // Base blocks the combo takes the place of ("Instead of the mark", Succubus
  // p.164): their damage lines are not offered while the combo is rolled.
  const replacesBlocks = [...text.matchAll(/\binstead\s+of\s+the\s+(mark|(?:terrain\s+|area\s+)?effect|stance)\b/gi)]
    .map(m => m[1].toLowerCase().replace(/\s+/g, " "));
  const hit  = rewrites.hit  ? combo.hit  : base.hit;
  const miss = rewrites.miss ? combo.miss : base.miss;
  const area = rewrites.area ? combo.area : base.area;
  return {
    isAttack:    !!s.isAttack,
    isAutoHit:   combo.isAutoHit || (!rewrites.hit && base.isAutoHit),
    dealsDamage: deals(hit) || deals(area) || miss.fray,
    hit, miss, area,
    extras:      [...(base.extras ?? []), ...comboExtras],
    comboExtras, // the combo's own "Other" damage, listed by the damage dialog
    replacesBlocks, // ["mark"]: base blocks whose "Other" lines the combo hides
  };
}

/**
 * The damage of an ability with its armed Infuse version in play (p.117),
 * on top of parseAbilityDamage's result. Two ways the book writes it:
 *  - the version writes its own outcomes: "MAGNABIO: Infuse 6 — 2 actions,
 *    Attack, Range 8, Large Blast. Hit: 2[D]+fray. Miss: [D]+fray. Area:
 *    [D]+fray." (Bio p.218, Geo p.219, Cryo p.234): those lines replace the
 *    base Hit / Miss / Area, a line it doesn't write stays as it was;
 *  - it changes the damage as a whole: "CRYOTIC — … increase damage to fray
 *    damage" (Cryo p.234): every outcome of the base that deals damage takes
 *    the new amount.
 * "Bonus damage for every two aether spent" (MAGNACRYO, an Infuse X) is one
 * more [D] per instance of bonus damage (glossary p.102), counted from the
 * Aether spent on arming it: `bonusDice` is the dialog's starting value.
 * Damage a version deals besides the ability's own outcomes goes under the
 * damage dialog's "Other", like a Limit Break's (parseLimitBreakDamage):
 * see infusionExtras. With `infusions` (all of the ability's versions) a
 * "Slay or Infuse N" one is offered even when not armed, since Slay also
 * triggers it (Nothung's GRAM, p.225).
 * @param {object} parsed     parseAbilityDamage(...) of the ability
 * @param {{label?:string, name?:string, text?:string, spent?:number}|null} infusion  the armed one
 * @param {{infusions?: object[], system?: object}} opts  every version (infusionsOf);
 *   the ability's system data, for a mastery retyping its damage (Excalibur)
 * @returns {object} parsed, with `version` ({label, name}) and `bonusDice` when infused
 */
export function infusedAbilityDamage(parsed, infusion, { infusions = [], system = null } = {}) {
  if (!parsed) return parsed;
  const re = _masteryRetype(system);
  const added = [];
  for (const inf of [infusion, ...(infusions ?? []).filter(i => i?.slay && i.label !== infusion?.label)]) {
    if (!inf?.text) continue;
    for (const x of infusionExtras(inf, { spent: inf === infusion ? Number(infusion.spent) || 0 : 0 })) added.push(re ? re(x) : x);
  }
  const out = _infusedOutcomes(parsed, infusion);
  if (!added.length) return out;
  return { ...out, extras: [...(out.extras ?? []), ...added], dealsDamage: true };
}

/**
 * The damage sentences of an Infuse version that add to the ability rather
 * than change it, as "Other" entries of the damage dialog:
 *   MAGNARIME (Rime p.233) "Deal 1 piercing damage to all characters in the
 *     area again after the ability resolves for every two aether infused":
 *     one instance per two Aether spent (none below two);
 *   BOULDER KICK (Dragon Dive p.218) "If only one character is caught in the
 *     area, they take 2 piercing damage twice instead": a case of the area,
 *     the table picks it;
 *   INCANDIUS (Soul Burn p.210) "spark a soul ember at them, dealing 1
 *     piercing" — the book drops the word "damage";
 *   GRAM (Nothung p.225) "dealing 1 piercing damage, twice, to all foes".
 * Not read here: the version's own Hit / Miss / Area lines and a sentence
 * that changes the damage ("increase damage to fray damage", "bonus damage
 * for every two aether", "instead of", "becomes") — _infusedOutcomes has those.
 * @param {{label:string, name?:string, text:string, slay?:boolean}} inf
 * @param {{spent?: number}} opts  Aether spent on it (Infuse X)
 */
export function infusionExtras(inf, { spent = 0 } = {}) {
  const text = String(inf?.text ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
    .replace(/^[A-ZÄÖÜÀ-Þ][A-ZÄÖÜÀ-Þ'\s]{2,}(?:\s*\([^)]*\))?\s*[—–-]\s*/, "");
  const label = String(inf?.label ?? "").replace(/\s*\(mastery\)\s*$/i, "");
  const source = `${label}${inf?.name ? ` — ${inf.name}` : ""}`;
  const deals = (c) => c.mult > 0 || c.flat > 0 || c.fray;
  const WORDS = { one: 1, two: 2, three: 3, four: 4 };
  const out = [];
  for (const raw of text.split(/(?<=\.)\s+/)) {
    if (/^(?:attack\s*:\s*)?(?:on\s+hit|auto[-\s]?hit|hit|miss|area(?:\s+effect)?)\s*:/i.test(raw)) continue;
    if (/\b(?:instead\s+of|increases?|becomes|bonus\s+damage)\b|\bdamage\s+to\s+(?:\[d\]|fray|\d)/i.test(raw)) continue;
    // "dealing 1 piercing." (Incandius): the amount and type without "damage".
    const sentence = raw.replace(/\b(\d+)\s+(piercing|divine)\b(?!\s+(?:fray\s+)?damage)/gi, "$1 $2 damage");
    if (!/\bdamage\b|\[d\]|\bfray\b/i.test(sentence)) continue;
    const chunk = parseChunk(sentence);
    if (!deals(chunk)) continue;
    const every = /\bfor\s+every\s+(\d+|one|two|three|four)\s+aether\b/i.exec(sentence);
    let times = chunk.times;
    if (every) {
      const n = Number(every[1]) || WORDS[every[1].toLowerCase()] || 1;
      times = Math.floor(spent / n);
      if (times < 1) continue;
    }
    out.push({ source: every ? `${source} (${spent} Aether)` : source, text: raw.trim(), ...chunk, times,
               area: /\b(?:area|blast|arc|line|burst|aura)\b/i.test(sentence) });
  }
  return out;
}

/** infusedAbilityDamage's Hit / Miss / Area of the armed version (see there). */
function _infusedOutcomes(parsed, infusion) {
  if (!parsed || !infusion?.text) return parsed;
  const text = String(infusion.text).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const deals = (c) => !!(c && (c.mult > 0 || c.flat > 0 || c.fray));
  const line = (re) => { const m = re.exec(text); return m ? parseChunk(m[1]) : null; };
  // Keep the base type when the line doesn't name one (Cryo's "fray damage").
  const typed = (c, base) => (c.type || !base?.type ? c : { ...c, type: base.type });
  const out = { ...parsed, version: { label: infusion.label ?? "", name: infusion.name ?? "" } };
  const lines = {
    hit:  line(/(?:^|[.;—–]\s*)(?:attack\s*:\s*)?(?:on\s+hit|auto[-\s]?hit|hit)\s*:\s*([^.]+)/i),
    miss: line(/(?:^|[.;—–]\s*)miss\s*:\s*([^.]+)/i),
    area: line(/(?:^|[.;—–]\s*)area(?:\s+effect)?\s*:\s*([^.]+)/i),
  };
  // "Increase damage to fray damage" (Cryotic), "Increase area effect to a
  // large blast and damage to [D]+fray" (Eye of the Storm's Aeoncloud, p.234).
  const whole = /\b(?:increase|change|raise)s?\b[^.]*?\bdamage\s+to\s+([^,;.]+)/i.exec(text);
  const all = whole ? parseChunk(whole[1]) : null;
  for (const k of ["hit", "miss", "area"]) {
    if (lines[k]) out[k] = typed(lines[k], parsed[k]);
    else if (all && deals(all) && deals(parsed[k])) out[k] = typed(all, parsed[k]);
  }
  // A version that writes its own Hit and Miss is rolled to hit, even when the
  // base ability auto-hits (Cryo's MAGNACRYO).
  if (lines.hit && lines.miss) out.isAutoHit = /auto[-\s]?hit/i.test(text);
  const every = /\bbonus\s+damage\s+for\s+every\s+(\d+|one|two|three)\s+aether\b/i.exec(text);
  if (every && Number(infusion.spent) > 0) {
    const n = Number(every[1]) || { one: 1, two: 2, three: 3 }[every[1].toLowerCase()] || 1;
    out.bonusDice = Math.floor(Number(infusion.spent) / n);
  }
  out.dealsDamage = deals(out.hit) || deals(out.area) || !!out.miss?.fray;
  return out;
}

/**
 * Damage of a Limit Break, shaped like parseAbilityDamage so the ability
 * damage dialog and card can roll it. The effect is one text block: its
 * first damage (or its "On hit:" / "Miss:" lines) is the Hit outcome, like
 * an ability's description; every sentence with damage, in the effect and,
 * from chapter 3 (p.113, "Upon entering chapter 3, you unlock the Ultimate
 * limit break"), in the ultimate, is also offered under Other (Cataclysm's
 * explosions, Passage to the Afterlife's Exceed and per-ally divine damage,
 * Dread Mock's divine fray damage). A Divine tag makes all of it divine
 * (p.104). The Infuse versions (limitBreakInfusions): the armed one that
 * deals its damage "instead" replaces the Hit (Tetraflare "Deal [D]+fray
 * twice instead", Meteor "four times instead"); one that adds damage after
 * the ability (Ragnarök, Götterdämmerung) is offered under Other when armed,
 * or always when Slay also triggers it ("Slay or Infuse 3"). A "Special
 * effect" that needs no Aether (Meteor paid with the user's life, "it deals
 * 999 divine damage instead") is always offered under Other.
 * @param {object} lbSystem  the limit-break item's system data
 * @param {{ultimate?: boolean, infused?: string|null}} opts  ultimate unlocked
 *   (chapter 3); label of the armed Infuse version of this limit break
 */
export function parseLimitBreakDamage(lbSystem, { ultimate = false, infused = null } = {}) {
  const s = lbSystem ?? {};
  const plain = (t) => String(t ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  // Text before the first Infuse version ("Infuse 6: TETRAFLARE —", "Slay or Infuse 3: RAGNARÖK —").
  const noInfuse = (t) => t.split(/\b(?:slay\s+or\s+)?infuse\s+\d+\s*:/i)[0].trim();
  const tags = (s.tags ?? []).map(t => String(t).trim().toLowerCase());
  const effect = noInfuse(plain(s.effect));
  const ult    = ultimate ? noInfuse(plain(s.ultimate)) : "";
  const base   = parseAbilityDamage({ isAttack: tags.includes("attack"), description: effect });
  const divine = tags.includes("divine");
  const typed  = (c) => (divine && !c.type ? { ...c, type: "divine" } : c);
  const deals  = (c) => c.mult > 0 || c.flat > 0 || c.fray;
  const same   = (a, b) => a.mult === b.mult && a.fray === b.fray && a.flat === b.flat && a.times === b.times;
  const baseHit = typed(base.hit), area = typed(base.area);
  let hit = baseHit, version = null;
  const infusionExtras = [];
  for (const inf of limitBreakInfusions(s, { ultimate })) {
    const armed = !!infused && inf.label === infused;
    const [main, special = ""] = inf.body.split(/\bspecial effect\s*:\s*/i);
    for (const [part, always] of [[main, false], [special, true]]) {
      for (const sentence of part.split(/(?<=\.)\s+/)) {
        if (!/\bdamage\b|\[d\]|\bfray\b/i.test(sentence)) continue;
        const chunk = parseChunk(sentence);
        if (!deals(chunk)) continue;
        if (!always && /\binstead\b/i.test(sentence)) {
          if (armed && !version) { hit = typed(chunk); version = inf; }
          continue;
        }
        if (!(always || armed || inf.slay)) continue;
        const label = always ? `${inf.name || inf.label} — Special effect`
                            : `${inf.slay ? "Slay or " : ""}${inf.label}${inf.name ? ` — ${inf.name}` : ""}`;
        infusionExtras.push(typed({ source: label, text: sentence, ...chunk,
                                    area: /\b(?:area|blast|arc|line|burst|aura|cross|quarter)\b/i.test(sentence) }));
      }
    }
  }
  // "Miss: Once." (Passage to the Afterlife): the hit damage, dealt once.
  const missOnce = /\bmiss\s*:\s*once\b/i.test(effect) && deals(hit);
  const miss = missOnce ? { ...hit, times: 1 } : typed(base.miss);
  const extras = [];
  let hitSkipped = false;
  for (const [source, text] of [["Limit Break", effect], ["Ultimate", ult]]) {
    for (const sentence of text.split(/(?<=\.)\s+/)) {
      if (!/\bdamage\b|\[d\]|\bfray\b/i.test(sentence)) continue;
      const chunk = parseChunk(sentence);
      if (!deals(chunk)) continue;
      // The first damage of the effect is the Hit outcome: not offered twice.
      if (source === "Limit Break" && !hitSkipped && deals(baseHit) && same(baseHit, chunk)) { hitSkipped = true; continue; }
      extras.push(typed({ source, text: sentence, ...chunk,
                          area: /\b(?:area|blast|arc|line|burst|aura|cross|explosions?)\b/i.test(sentence) }));
    }
  }
  extras.push(...infusionExtras);
  return {
    isAttack:    base.isAttack,
    isAutoHit:   base.isAutoHit,
    dealsDamage: deals(hit) || deals(area) || miss.fray || extras.length > 0,
    hit, miss, area, extras,
    version,     // the armed Infuse version whose damage replaced the Hit, or null
  };
}

/**
 * Damage of a limit break given as a share of the target's max hp, which no
 * die rolls (Gigantas Crusher p.135: "Your foe takes 50% of their max hp as
 * divine damage, or 25% as divine damage on a successful save"; Split Heaven
 * and Hell p.127: "1 space: 100% of max hp / 2-4 spaces: 50% / 5+ spaces: 25%").
 * The share is of the max BASE hp (p.106, "% Health"). Returns null when the
 * text has none.
 * @returns {null|{divine:boolean, options:Array<{label,pct}>,
 *   legend:Array<{label,pct?,fray?,note?}>|null, bonus:{pct,nonLegend,lowHp,name}|null}}
 */
export function parseLimitBreakPercent(lbSystem, { ultimate = false } = {}) {
  const s = lbSystem ?? {};
  const plain = (t) => String(t ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const text = plain(s.effect);
  const options = [];
  // Distance bands of a line (Split Heaven and Hell): "1 space: 100% of max hp".
  for (const m of text.matchAll(/(\d+\s*(?:[-–]\s*\d+|\+)?\s*spaces?)\s*:\s*(\d+)%\s+of\s+(?:their\s+)?max\s+hp/gi)) {
    options.push({ label: m[1].replace(/\s+/g, " "), pct: Number(m[2]) });
  }
  if (!options.length) {
    // A foe's share, with a smaller one on a successful save (Gigantas Crusher).
    const m = /(\d+)%\s+of\s+their\s+max\s+hp([^.]*)/i.exec(text);
    if (m) {
      const saved = /\bor\s+(\d+)%[^.]*\bsuccessful\s+save\b/i.exec(m[2]);
      if (saved) options.push({ label: "Failed save", pct: Number(m[1]) }, { label: "Successful save", pct: Number(saved[1]) });
      else options.push({ label: "Damage", pct: Number(m[1]) });
    }
  }
  if (!options.length) return null;
  // Legends: a fixed share ("Legend characters always take 25% of max hp"), or
  // a save they may always make (Gigantas Crusher: "divine fray damage and
  // refunding this ability's resolve cost on a successful save, and only 25%
  // hp as divine damage on a failed save").
  let legend = null;
  const ls = text.split(/(?<=\.)\s+/).find(t => /\blegends?\b/i.test(t) && /\d+%/.test(t));
  if (ls) {
    const pct = Number(/(\d+)%/.exec(ls)[1]);
    legend = /\bmay always save\b/i.test(ls)
      ? [{ label: "Failed save", pct },
         { label: "Successful save", fray: /\bfray\b/i.test(ls), note: /\brefund/i.test(ls) ? "refunds the resolve cost" : "" }]
      : [{ label: "Legend", pct }];
  }
  // The Ultimate's extra share (Atomos Crusher: "If you're at 1 hp or lower,
  // this ability deals 25% more max hp damage to non-legend characters").
  let bonus = null;
  const u = ultimate ? plain(s.ultimate) : "";
  const b = /(\d+)%\s+more\s+max\s+hp\s+damage/i.exec(u);
  if (b) bonus = { pct: Number(b[1]), nonLegend: /\bnon-legend\b/i.test(u), lowHp: /\b1 hp or lower\b/i.test(u),
                   name: (/^([^:]{1,40}):/.exec(u)?.[1] ?? "Ultimate").trim() };
  const tags = (s.tags ?? []).map(t => String(t).trim().toLowerCase());
  return { divine: tags.includes("divine") || /\bdivine\b/i.test(text), options, legend, bonus };
}

/**
 * Foe/legend actions have no `isAttack` field: an action is an attack if it carries an
 * attack tag (book header "attack" / "melee attack" / "ranged attack") or spells out an
 * "On hit:" line. Non-attack abilities (marks, terrain, Diaga, traits-as-actions…) must
 * NOT show the Attack button on the sheet.
 */
export function isFoeActionAttack(action) {
  const a = action ?? {};
  const tags = (a.tags ?? []).map(t => String(t).toLowerCase());
  if (tags.some(t => t === "attack" || t === "melee-attack" || t === "ranged-attack" || /^ranged-attack-\d+$/.test(t))) return true;
  const text = `${a.hitEffect ?? ""} ${a.description ?? ""}`;
  return /\bon\s+hit\b/i.test(text);
}

/** @deprecated Old name kept for existing world macros — use parseAbilityDamage. */
export const _parseAbilityDamage = parseAbilityDamage;
