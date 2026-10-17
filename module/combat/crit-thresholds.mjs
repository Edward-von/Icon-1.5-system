/**
 * crit-thresholds.mjs — the total an attack roll needs to crit and to exceed.
 *
 * By default a crit is a total of 20+ and an exceed 15+ (p.94). Some effects
 * move those numbers:
 *
 *   • Soulfire (Enochian trait, p.208): "Comeback: Your threshold to critical
 *     hit becomes 18+, and your threshold to exceed becomes 13+. If you're at
 *     1 hp, these thresholds are reduced to 15+ and 10+." Comeback = bloodied.
 *   • Arenheir III (relic, p.252): "Your threshold for exceed and critical hits
 *     is decreased by 1, and decreases again by 1 at round 3 and 5."
 *   • Arenheir Aspected: "When you score a critical hit, reduce the threshold
 *     for critical hits by 1. This cannot reduce it lower than 15+." The crits
 *     scored in the current combat are counted on the relic item as the flag
 *     `icon-system.arenheirCrits = { combatId, count }`.
 *
 * Combination (the book doesn't spell it out; simplest reading): Soulfire sets
 * the starting value, Arenheir III subtracts from it, the Aspect then lowers
 * the crit threshold by its count but never below 15+ (when it's already 15 or
 * less, the Aspect adds nothing).
 *
 * The attack dialog shows the result and lets the player change it by hand.
 */

import { unlockedRelics, currentRound } from "./relic-reminders.mjs";

const _log = (...a) => console.debug("[ICON | crit-thresholds]", ...a);

export const BASE_CRIT   = 20;
export const BASE_EXCEED = 15;
const ASPECT_FLOOR = 15;
const FLAG = "arenheirCrits";

function _arenheir(actor) {
  return unlockedRelics(actor).find(r => r.key === "arenheir") ?? null;
}

function _combatId(actor) {
  return currentRound(actor) ? game.combat.id : null;
}

/** Crits scored in the current combat that count for the Arenheir Aspect. */
function _aspectCrits(relic, combatId) {
  if (!relic || !combatId) return 0;
  const f = relic.item.getFlag?.("icon-system", FLAG) ?? null;
  return f?.combatId === combatId ? Number(f.count) || 0 : 0;
}

/**
 * @param {Actor} actor  the attacker
 * @returns {{ crit:number, exceed:number, sources:string[] }}
 */
export function attackThresholds(actor) {
  let crit = BASE_CRIT, exceed = BASE_EXCEED;
  const sources = [];
  if (!actor || actor.type !== "icon") return { crit, exceed, sources };

  // Soulfire (Comeback = bloodied).
  const soulfire = actor.items.some(i => i.type === "trait" && String(i.name ?? "").trim().toLowerCase() === "soulfire");
  const hp = actor.system?.combat?.hp ?? {};
  const hpValue = Number(hp.value ?? 0);
  if (soulfire && hp.bloodied != null && hpValue <= Number(hp.bloodied)) {
    if (hpValue === 1) { crit = 15; exceed = 10; sources.push("Soulfire (1 hp): crit 15+, exceed 10+"); }
    else               { crit = 18; exceed = 13; sources.push("Soulfire (bloodied): crit 18+, exceed 13+"); }
  }

  const relic = _arenheir(actor);
  if (relic && relic.rank >= 3) {
    const round = currentRound(actor);
    const n = 1 + (round >= 3 ? 1 : 0) + (round >= 5 ? 1 : 0);
    crit -= n; exceed -= n;
    sources.push(`${relic.name} III${round ? ` (round ${round})` : ""}: −${n}`);
  }
  if (relic && relic.rank >= 4) {
    const count = _aspectCrits(relic, _combatId(actor));
    if (count > 0 && crit > ASPECT_FLOOR) {
      const lowered = Math.max(ASPECT_FLOOR, crit - count);
      sources.push(`${relic.name} Aspect (${count} crit${count > 1 ? "s" : ""} this combat): crit −${crit - lowered}, not below ${ASPECT_FLOOR}+`);
      crit = lowered;
    }
  }

  crit = Math.max(1, crit);
  exceed = Math.max(1, exceed);
  return { crit, exceed, sources };
}

/**
 * After a critical hit: the Arenheir Aspect lowers the crit threshold of the
 * next attacks by 1 (counted per combat on the relic item). No-op outside a
 * combat or without the unlocked Aspect.
 */
export async function noteCriticalHit(actor) {
  const relic = _arenheir(actor);
  if (!relic || relic.rank < 4) return;
  const combatId = _combatId(actor);
  if (!combatId) return;
  const count = _aspectCrits(relic, combatId) + 1;
  try {
    await relic.item.setFlag("icon-system", FLAG, { combatId, count });
    _log(`${actor.name}: Arenheir Aspect crits this combat = ${count}`);
  } catch (err) { console.warn("[ICON | crit-thresholds] could not count the crit", err); }
}

/* -------------------------------------------------- */
/*  Effects that trigger the Exceed without a 15+      */
/* -------------------------------------------------- */

const FIRST_USE_FLAG = "exceedFirstUse";

// "triggers all exceed effects", "triggers any exceed effects", "always triggers exceed effects",
// "activates all exceed effects", Paleblood's "trigger all of the following triggered effects: … exceed".
const EXCEED_TRIGGER_RE = /\b(?:triggers?|activates?)\s+(?:all\s+|any\s+)?(?:of\s+(?:its|the)\s+)?exceed effects\b|\btrigger all of the following triggered effects:[^.]*\bexceed\b/;
const ORDINALS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };
const NUMBERS  = { one: 1, two: 2, three: 3, four: 4 };

function _plainText(html) {
  return String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/’/g, "'").replace(/\s+/g, " ").trim();
}

/** The sentences of a text that make the ability trigger its exceed effects (not "your next attack …"). */
function _exceedSentences(html) {
  return _plainText(html).split(/(?<=[.!?])\s+/)
    .filter(s => EXCEED_TRIGGER_RE.test(s.toLowerCase()) && !/\bnext attack\b/i.test(s));
}

/**
 * What a sentence's condition says about this attack:
 *   on        ticked when the dialog opens
 *   why       shown next to the box
 *   firstUse  the ability's first use in the combat is noted after the dialog
 *   when      resolved by the attack dialog from its targets: { elevation:n } | { targetQuarter:true }
 */
function _readCondition(sentence, actor, item) {
  const t = sentence.toLowerCase();
  const round = currentRound(actor);
  const now = round ? ` (now round ${round})` : "";
  let m = /\bat round (\d+) or later\b/.exec(t);
  if (m) {
    const n = Number(m[1]);
    return { on: !!round && round >= n, why: `round ${n} or later${now}` };
  }
  m = /\bon the (\w+)(?: and (\w+))? rounds? of combat\b/.exec(t);
  if (m && ORDINALS[m[1]]) {
    const rounds = [ORDINALS[m[1]], ORDINALS[m[2]]].filter(Boolean);
    return { on: !!round && rounds.includes(round), why: `round ${rounds.join(" and ")}${now}` };
  }
  if (/\bfirst time\b.*?\bin (?:a |each )?combat\b/.test(t)) {
    const used = round ? item?.getFlag?.("icon-system", FIRST_USE_FLAG) === game.combat.id : false;
    return { on: !!round && !used, why: round ? (used ? "already used this combat" : "first use this combat") : "first use in a combat", firstUse: true };
  }
  m = /\b(\d+|one|two|three|four) or more levels higher\b/.exec(t);
  if (m) {
    const n = NUMBERS[m[1]] ?? Number(m[1]);
    return { on: false, why: `${n}+ levels higher than the target`, when: { elevation: n } };
  }
  if (/\b(?:target|foe) is at 25% hp or lower\b/.test(t)) {
    return { on: false, why: "target at 25% hp or lower", when: { targetQuarter: true } };
  }
  // Anything else (passing through two allies, 3 blessings, the Paleblood die at 4…): the player decides.
  return { on: false, why: sentence.length > 110 ? `${sentence.slice(0, 107)}…` : sentence };
}

/**
 * Everything that makes this attack trigger its exceed effects whatever the
 * total — one box each in the attack dialog:
 *   • the unlocked mastery: BLOOD FESTIVAL (Matsuri, p.192, first use in a
 *     combat, optional "may"), BURIAL FIST (Open the Gates, p.194, round 4+:
 *     "deals bonus damage and always triggers exceed effects at round 4 or
 *     later" — the round covers both, like "At round 3+, deals bonus damage
 *     and …" elsewhere in the book, so its bonus die rides on this box too;
 *     the box stays tickable by hand before round 4);
 *   • the ability's own text — Open the Gates' Effect (p.194: "triggers any
 *     exceed effects the first time it is used in combat"), Soul Shot's area
 *     (p.158: "If it passes through two or more allies, automatically
 *     triggers all exceed effects") — and its unlocked talent; with the combo armed, the combo text
 *     instead of the base one;
 *   • the character's traits: Pulverize (p.135, two or more levels higher),
 *     Aether Shot (p.155, third and sixth round), Blessing of War (p.191,
 *     3 blessings);
 *   • the unlocked relic ranks: Arenheir II (p.252, target at 25% hp or
 *     lower), Paleblood I (p.252, expending the die at 4).
 * A condition the system can read (round, first use, height, target HP) ticks
 * the box; any other leaves it unticked with the sentence as a reminder.
 * "Your next attack triggers …" (stances, end-turn abilities) is left out:
 * that sentence is about a later use.
 * @param {Actor}  actor  the attacker
 * @param {Item}   item   the ability
 * @param {object} [opts]
 * @param {boolean} [opts.comboArmed]
 * @returns {{ source:string, on:boolean, why:string, firstUse?:boolean, when?:object }[]}
 */
export function exceedTriggers(actor, item, { comboArmed = false } = {}) {
  const out = [];
  const s = item?.system;
  if (!s) return out;
  const add = (source, html) => {
    for (const sentence of _exceedSentences(html)) out.push({ source, sentence, ..._readCondition(sentence, actor, item) });
  };
  const name = item.name ?? "Ability";
  if (comboArmed) add(`${name} (combo)`, s.comboEffect);
  else for (const f of ["description", "hitEffect", "missEffect", "areaEffect", "chargeEffect", "heroicEffect",
                        "collideEffect", "slayEffect", "critEffect", "finishingBlowEffect", "comebackEffect"]) add(name, s[f]);
  const sel = Number(s.talentSelected ?? 0);
  if (sel === 1) add(`${name} Talent I`, s.talent1);
  if (sel === 2) add(`${name} Talent II`, s.talent2);
  if (s.masteryUnlocked && s.mastery) {
    add(/^([A-Z][A-Za-z' -]*[A-Za-z])\s*:/.exec(_plainText(s.mastery))?.[1] ?? "Mastery", s.mastery);
  }
  for (const tr of actor?.items ?? []) if (tr.type === "trait") add(tr.name, tr.system?.description);
  for (const r of unlockedRelics(actor)) {
    const sys = r.item.system ?? {};
    [["I", sys.rank1], ["II", sys.rank2], ["III", sys.rank3], ["Aspect", sys.aspect]]
      .slice(0, r.rank).forEach(([label, rank]) => add(`${r.name} ${label}`, rank?.description));
  }
  // One box per source.
  const seen = new Set();
  return out.filter(e => !seen.has(e.source) && seen.add(e.source));
}

/* -------------------------------------------------- */
/*  What else the same sentence gives (bonus damage…)  */
/* -------------------------------------------------- */

const BOOST_FLAG = "exceedBoost";
const BONUS_RE = /\bdeals?\s+bonus damage\b/i;
// The sentence gives more than the exceed: bonus damage, "increase all its teleports by +2".
const EXTRA_RE = /\bbonus damage\b|\bincrease\b/i;

/**
 * The exceed triggers ticked in the attack dialog whose sentence also grants
 * something else for this use — BLOOD FESTIVAL (p.192) "increase all its
 * teleports by +2, it deals bonus damage", BURIAL FIST (p.194) "deals bonus
 * damage", Aether Shot (p.155) "deals bonus damage": a block for the attack
 * card, with the sentence (plain text: the sheet enriches it).
 * @param {object[]} taken  promptAttackMods().exceedTaken
 * @returns {{label:string, text:string}[]}
 */
export function exceedExtraBlocks(taken) {
  return (taken ?? []).filter(e => EXTRA_RE.test(e.sentence ?? ""))
    .map(e => ({ label: e.source, text: e.sentence }));
}

function _turnKey() {
  const c = game.combat;
  return c?.started ? `${c.id}|${c.round}|${c.turn}` : "";
}

/**
 * Remember, on the ability, which ticked triggers give it bonus damage, so
 * the damage dialog of the same use (same combat turn) adds the dice.
 * Cleared when nothing gives bonus damage this time.
 */
export async function noteExceedBoost(item, taken) {
  if (!item) return;
  const bonus = (taken ?? []).filter(e => BONUS_RE.test(e.sentence ?? "")).map(e => e.source);
  const key = _turnKey();
  try {
    if (bonus.length && key) await item.setFlag("icon-system", BOOST_FLAG, { key, bonus });
    else if (item.getFlag?.("icon-system", BOOST_FLAG)) await item.unsetFlag("icon-system", BOOST_FLAG);
  } catch (err) { console.warn("[ICON | crit-thresholds] could not note the bonus damage", err); }
}

/** Names of what gives this ability bonus damage on the use attacked this turn (noteExceedBoost), or []. */
export function exceedBoostFor(item) {
  const f = item?.getFlag?.("icon-system", BOOST_FLAG);
  const key = _turnKey();
  return f && key && f.key === key ? [...(f.bonus ?? [])] : [];
}

/** Note the first use of the ability in this combat (BLOOD FESTIVAL). No-op outside a combat. */
export async function noteFirstUseThisCombat(actor, item) {
  if (!item || !currentRound(actor)) return;
  if (item.getFlag?.("icon-system", FIRST_USE_FLAG) === game.combat.id) return;
  try { await item.setFlag("icon-system", FIRST_USE_FLAG, game.combat.id); }
  catch (err) { console.warn("[ICON | crit-thresholds] could not note the first use", err); }
}
