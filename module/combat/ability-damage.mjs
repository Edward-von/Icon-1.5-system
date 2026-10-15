/**
 * ability-damage.mjs — Parse damage info out of ability/action free text.
 *
 * Game-rules logic shared by all four actor sheets and the
 * populate-legend-damage macro. Lived in IconSheet.mjs historically;
 * moved here because it's combat logic, not presentation.
 */

import { comboReplacesBase } from "../helpers/ability-blocks.mjs";

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
 */
export function parseAbilityDamage(itemSystem) {
  const s = itemSystem ?? {};
  const isAttack = !!s.isAttack;

  const combined = [
    s.hitEffect, s.missEffect, s.areaEffect, s.description,
    s.critEffect, s.exceedEffect, s.heroicEffect,
  ].filter(Boolean).join(" ").toLowerCase();

  const isAutoHit = /auto[-\s]?hit/.test(combined);

  // Parse a single text blob for dice formula + fray + flat damage
  const parseChunk = (text) => {
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
    // p.142) is what they take, not what they deal: skip it.
    const flatMatch = lower.match(/(\d+)\s+(?:divine\s+|piercing\s+|true\s+)?damage(?!\s+to\s+you(?:rself)?\b)/);
    const flat = flatMatch ? Number(flatMatch[1]) : 0;
    // Damage type written next to the amount X
    // p.179; "[D]+fray divine damage", Gigaflare; "2 piercing damage"), so
    // the damage dialog can start with Divine / Pierce ticked (p.104).
    // Same "to you" exclusion as the flat amount.
    const typeMatch = lower.match(/(?:\d+|\[d\]|bfray)\s+(divine|piercing)\s+damage(?!\s+to\s+you(?:rself)?b)/);
    const type = typeMatch ? typeMatch[1] : "";
    // Repeated damage (p.92: "Some damage is listed as X, Y times […] roll
    // [D] once, then apply the total damage three separate times"): "1 divine
    // damage three times" (Chastise), "3 damage, three times", "deals [D]
    // twice". Each instance takes armor, vulnerable and weakened on its own
    // (p.92, p.109), so the damage card applies them one by one.
    const timesMatch = lower.match(/(?:\bdamage|\[d\]|\bfray)\s*,?\s*(once|twice|thrice|(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+times)\b/);
    const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
    const times = !timesMatch ? 1
      : timesMatch[1] === "once" ? 1 : timesMatch[1] === "twice" ? 2 : timesMatch[1] === "thrice" ? 3
      : (Number(timesMatch[2]) || WORDS[timesMatch[2]] || 1);
    return { mult, fray: includesFray, flat, type, times };
  };

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
  const miss = parseChunk(missText);

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
  if (!anyDamage(hit) && !anyDamage(miss) && !anyDamage(area) && s.description) {
    const descChunk = parseChunk(s.description);
    if (anyDamage(descChunk)) hit = descChunk;
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
    { source: "Mastery", text: s.masteryUnlocked ? s.mastery : "" },
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
  for (const u of upgrades) {
    for (const sentence of u.sentences) {
      if (sentence === areaSentence || !/\bdamage\b/i.test(sentence)) continue;
      if (/\b(?:instead\s+of|increases?\s+by|becomes)\b/i.test(sentence)) continue;
      const chunk = parseChunk(sentence);
      if (!anyDamage(chunk)) continue;
      extras.push({ source: u.source, text: sentence.trim(), ...chunk,
                    area: /\b(?:area|blast|arc|line|burst|aura)\b/i.test(sentence) });
    }
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
  if (!anyLabel && deals(combo.hit)) rewrites.hit = true;
  const hit  = rewrites.hit  ? combo.hit  : base.hit;
  const miss = rewrites.miss ? combo.miss : base.miss;
  const area = rewrites.area ? combo.area : base.area;
  return {
    isAttack:    !!s.isAttack,
    isAutoHit:   combo.isAutoHit || (!rewrites.hit && base.isAutoHit),
    dealsDamage: deals(hit) || deals(area) || miss.fray,
    hit, miss, area,
  };
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
