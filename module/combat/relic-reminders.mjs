/**
 * relic-reminders.mjs — Relic integration (ICON 1.5 pp. 245–251).
 *
 * Relics are passive most of the time, and the player forgets them: "Byrax I:
 * when you refresh a stance, dash 1" lives on the Relics tab while the stance
 * lives on the Combat tab. This module bridges the two:
 *
 *   1. `abilityRelicReminders(actor, profile)` → the reminder lines a relic adds
 *      to ONE ability ("✦ Byrax I — Whenever you refresh this stance, dash 1"),
 *      driven by the RELIC_REMINDERS table below (relic → rank → matcher → text).
 *      Only the ranks the character has unlocked (`system.currentRank`) count.
 *
 *   2. `attackInvokes(actor)` → the "Invoke (Attack, N+)" powers the character
 *      can trigger on an attack roll, parsed from the unlocked rank texts (and
 *      the Aspect override, e.g. Paleblood "Invoke becomes (Attack, 12+)").
 *      The attack roll compares the RAW d20 (not the total, p.245) and tells
 *      the player whether the invoke goes off.
 *
 * Matching is by name (relic item name, case-insensitive) so renamed or
 * homebrew relics simply add nothing. Texts are reminders, not automation.
 *
 * Ability profile (built by the sheet, see `buildAbilityProfile`):
 *   { isAttack, dealsDamage, tags:[raw…], text (lower-case plain text of every
 *     block), cost, isCombo, blocks:Set<"charge"|"slay"|"exceed"|"collide"|
 *     "comeback"|"finish">, maxRange (from range-N tag, 1 for melee) }
 *
 * Matcher fields (all present fields must hold; an array of matchers = OR):
 *   attack: true|false   isAttack equals
 *   damage: true         dealsDamage
 *   tags: ["stance"]     any effective tag equals or starts with "<tag>-"
 *   text: /regex/        tested on the profile text
 *   block: "charge"      the ability has that rules block
 *   combo: true          the ability has a combo version
 *   cost: ["1action"]    the ability's cost is one of these
 *   rangeAtLeast: 3      listed range ≥ N
 *   round: 5             (attack card only) shown once the combat round is ≥ N
 *   invoke: true         not an ability reminder: a note appended to the relic's
 *                        attack-invoke line (Ape God / Scheherezade aspects)
 *
 * `text` may be a function ({ rank, round, profile }) → string, for reminders
 * whose wording changes with the relic rank or the combat round.
 */

import { parseAbilitySections } from "../helpers/enrich.mjs";

const _log = (...a) => console.debug("[ICON | relic-reminders]", ...a);

export const RANK_LABELS = { 1: "I", 2: "II", 3: "III", 4: "Aspect" };

const CURE   = /\bcures?\b/;
const SHOVE  = /\bshove[sd]?\b/;
const DELAY  = /\bdelay(?:ed)?\b/;
const AREA_TAGS = ["blast", "blast-s", "blast-m", "blast-l", "line", "arc", "burst"];

/**
 * relic name (lower-case) → [{ rank, match, text }]
 * Wording follows the relic text in the pack (pp. 245–251); "this ability"
 * replaces "your abilities" so the line reads as a note on the card.
 */
export const RELIC_REMINDERS = {
  "ape god": [
    { rank: 3, match: { text: /\bstun/ }, text: "When you stun a foe with this ability, you can also stun another foe within 2 spaces of them." },
    { rank: 4, match: { invoke: true },   text: "If the Invoke goes off: the attack also deals bonus damage, shoves all foes adjacent to the target 1, and you may shove yourself 2 after it resolves." },
  ],
  "apophis": [
    { rank: 4, match: { damage: true }, text: "Damage to foes standing in dangerous terrain is piercing." },
  ],
  "arenheir": [
    { rank: 1, match: { attack: true },    text: "Critical hits deal bonus damage." },
    { rank: 2, match: { block: "exceed" }, text: "If the target is at 25% HP or lower, every exceed effect triggers." },
    { rank: 3, match: { attack: true },    text: ({ round }) => {
      if (!round) return "Exceed and crit thresholds −1 (−2 from round 3, −3 from round 5).";
      const n = 1 + (round >= 3 ? 1 : 0) + (round >= 5 ? 1 : 0);
      return `Round ${round}: exceed on ${15 - n}+, crit on ${20 - n}+ (thresholds −${n}).`;
    } },
    { rank: 4, match: { attack: true },    text: "Each critical hit lowers your crit threshold by 1 more (never below 15+)." },
  ],
  "byrax": [
    { rank: 1, match: { tags: ["stance"] }, text: "Whenever you refresh this stance, dash 1." },
    { rank: 3, match: { tags: ["stance"], cost: ["1action", "free"] }, text: "On the first turn of combat, you may take this stance as a free action." },
    { rank: 4, match: { tags: ["stance"] }, text: "You can hold one more stance than normal." },
  ],
  "chime": [
    { rank: 3, match: { attack: false, damage: true }, text: "Damage from this ability does not break pacified." },
    { rank: 4, match: { text: /\bpacif/ },            text: "When you pacify a foe, you or an ally in range 2 gains 3 vigor." },
  ],
  "cloudpiercer": [
    { rank: 1, match: { attack: true, rangeAtLeast: 3 }, text: "+1 boon against a foe at exactly range 3." },
    { rank: 2, match: { attack: true, rangeAtLeast: 3 }, text: "After the ability resolves, deal 1 piercing damage again to a target attacked at exactly range 3." },
    { rank: 3, match: { attack: true, rangeAtLeast: 3 }, text: "…and you may deal 1 piercing damage to all other foes at exactly range 3." },
    { rank: 4, match: { attack: true, rangeAtLeast: 2 }, text: "At the start of your turn you may set the 'exact' range of these effects to 2, 3 or 4 until your next turn." },
  ],
  "conquering king": [
    { rank: 1, match: { damage: true, round: 5 }, text: ({ round }) => round ? `Round ${round}: this ability deals bonus damage (Round 5+).` : "Round 5+: this ability deals bonus damage." },
    { rank: 2, match: { attack: true, round: 7 }, text: ({ round }) => round ? `Round ${round}: a hit is a critical hit (Round 7+).` : "Round 7+: your attacks are critical hits on a hit." },
  ],
  "crimson king": [
    { rank: 1, match: { text: /\bsacrifice/ }, text: ({ rank }) => `At 25% HP or lower, this sacrifice cost becomes sacrifice ${rank >= 4 ? 1 : 2} if higher (even % costs).` },
  ],
  "domain": [
    { rank: 1, match: { text: /terrain effect|\bobjects?\b/ }, text: "You may place your Domain (small blast) over one of the spaces this creates, or move it there." },
    { rank: 1, match: { attack: true },                      text: "+1 boon against foes inside your Domain." },
    { rank: 4, match: { attack: true, round: 4 },            text: ({ round }) => round ? `Round ${round}: your Domain is difficult and dangerous terrain for foes (Round 4+).` : "Round 4+: your Domain is difficult and dangerous terrain for foes." },
  ],
  "dominus": [
    { rank: 1, match: { attack: true },                       text: ({ rank }) => `Slay: dash ${rank >= 3 ? 4 : 2} after the ability resolves.` },
    { rank: 4, match: [{ attack: true }, { block: "slay" }],  text: "Slay effects also trigger when a target drops to 25% HP or lower." },
  ],
  "erys": [
    { rank: 3, match: { text: SHOVE }, text: "While you are bloodied, +1 to the distance of any shove." },
    { rank: 4, match: { text: SHOVE }, text: "You can shove diagonally, as long as each step moves the target further from the origin." },
  ],
  "esper": [
    { rank: 2, match: { text: CURE }, text: "Range of cure effects +2." },
    { rank: 3, match: { text: CURE }, text: "Cures can target foes: they deal fray damage instead of their other effects." },
    { rank: 4, match: { text: CURE }, text: "Cures against foes gain true strike and pierce." },
  ],
  "fragment of iz": [
    { rank: 2, match: { text: /\bphas/ }, text: "When you phase through a character, you may deal 2 damage to them (once a round per character)." },
    { rank: 3, match: { text: /\bphas/ }, text: "While phasing, entering a character's or object's space costs at most 1 movement." },
    { rank: 4, match: { text: /\bdash/ }, text: "You have phasing when you dash." },
  ],
  "gilded finger": [
    { rank: 4, match: { text: /\baura/ }, text: "Your auras also affect characters adjacent to the aura." },
  ],
  "gladesong": [
    { rank: 1, match: { attack: true }, text: "+1 boon against foes standing next to an allied summon." },
  ],
  "gloam": [
    { rank: 2, match: { attack: true }, text: "+1 boon against blind targets." },
  ],
  "hermes": [
    { rank: 3, match: { text: /\bteleport/ }, text: "Teleports granted by this ability: +1 range." },
  ],
  "huntress": [
    { rank: 1, match: { tags: ["mark"] }, text: ({ rank }) => `Gain dodge against ${rank >= 4 ? "any marked character" : "characters you marked"}.` },
    { rank: 2, match: { attack: true },   text: ({ rank }) => `Bonus damage against ${rank >= 4 ? "any marked character" : "characters you marked"}.` },
    { rank: 3, match: { attack: true },   text: ({ rank }) => `On a hit against ${rank >= 4 ? "a marked character" : "a character you marked"}, dash 2 after the ability resolves.` },
  ],
  "ironsoul": [
    { rank: 1, match: { attack: true }, text: "+1 boon while adjacent to an ally." },
  ],
  "maiden": [
    { rank: 4, match: { text: /\bcounter\b/ }, text: "Your counter damage is piercing." },
  ],
  "mercy": [
    { rank: 1, match: { text: CURE }, text: "Cures can target defeated characters: they are rescued, then cured." },
    { rank: 2, match: { text: CURE }, text: "Curing a character at 25% HP or lower also clears one status of their choice." },
    { rank: 3, match: { text: CURE }, text: "Cured characters may also save against any marks on them." },
    { rank: 4, match: { text: CURE }, text: "Curing a character at 25% HP or lower also grants them defiance." },
  ],
  "mistborn": [
    { rank: 2, match: { attack: true }, text: "Attacks from stealth deal bonus damage." },
  ],
  "paleblood": [
    { rank: 1, match: [{ damage: true }, { block: "charge" }, { block: "collide" }, { block: "comeback" }, { block: "exceed" }, { block: "finish" }, { block: "slay" }],
      text: ({ rank }) => `When your Paleblood die is at 4, expend it on this ability: bonus damage and every charge, collide, comeback, chain reaction, exceed, finishing blow and slay effect triggers${rank >= 3 ? " (the die resets to 1 instead of being discarded)" : ""}.` },
  ],
  "riftwalker": [
    { rank: 1, match: { attack: true, tags: AREA_TAGS }, text: "The area may include any pit spaces connected to it, even diagonally." },
  ],
  "ruin": [
    { rank: 1, match: { attack: true }, text: "Once per attack, trade 1 boon for bonus damage." },
    { rank: 3, match: { attack: true }, text: ({ rank }) => rank >= 4
      ? "Your first attack of the combat cannot miss, gains +1 boon and +2 to its listed ranges."
      : "Your first attack of the combat cannot miss (a miss becomes a hit)." },
  ],
  "scheherezade": [
    { rank: 4, match: { invoke: true }, text: "The Invoke also blesses an ally in range 3." },
  ],
  "silver rabbit": [
    { rank: 4, match: { invoke: true }, text: "Can also be applied to any single boon or curse die (yours or one rolled against you)." },
  ],
  "skipjack": [
    { rank: 1, match: { tags: ["range"] },               text: ({ profile }) => profile.maxRange ? `Range ${profile.maxRange + 1} (listed range +1).` : "Listed range +1." },
    { rank: 2, match: { attack: true, tags: ["range"] }, text: "Gains rebound (the rebounded attack has a maximum range of 3)." },
    { rank: 3, match: { attack: true, tags: ["range"] }, text: "When the attack bounces, it explodes on the new target: small blast, 1 piercing damage to every character inside." },
    { rank: 4, match: { attack: true, tags: ["range"], round: 4 }, text: ({ round }) => round ? `Round ${round}: can bounce twice, exploding each time — each character takes one explosion at most (Round 4+).` : "Round 4+: can bounce twice, exploding each time (each character takes one explosion at most)." },
  ],
  "sleipnir": [
    { rank: 3, match: { text: /\bfl(?:y|ies|ying|ight)\b/ }, text: "Flight effects +1." },
  ],
  "storm lord": [
    { rank: 2, match: { combo: true }, text: "When you spend a combo token on this ability, you may deal 2 damage again to one of its targets." },
  ],
  "titansbane": [
    { rank: 1, match: { text: DELAY }, text: "When you use this delay effect, rush 1 before activating it (rush 3 if bloodied)." },
    { rank: 2, match: { text: DELAY }, text: "Delay damage is divine against characters at 25% HP or lower." },
    { rank: 3, match: { text: DELAY }, text: "You are sturdy while holding this delay effect." },
  ],
  "tower of barbs": [
    { rank: 1, match: { attack: true, tags: ["range", "line", "arc"] }, text: "Bonus damage if a target is at the attack's maximum range, or in the end space of the line or arc." },
    { rank: 2, match: { attack: true, tags: ["range", "line", "arc"] }, text: "Also unerring when a target is at maximum range." },
  ],
  "trollhide": [
    { rank: 3, match: { text: /\bvigor\b|\bcures?\b/ }, text: ({ rank }) => rank >= 4
      ? "When this ability grants you vigor: +2 vigor, and you may rush 1."
      : "When this ability grants you vigor, you may rush 1." },
  ],
  "ungoliant": [
    { rank: 1, match: { attack: true, block: "charge" }, text: "Charged: +1 boon." },
    { rank: 2, match: { attack: true, block: "charge" }, text: "Charged: also 2 damage to all foes adjacent to the target after the ability resolves." },
  ],
  "vessel": [
    { rank: 1, match: { damage: true }, text: "Bonus damage while you are at 25% HP or lower." },
  ],
  "wyrmtooth": [
    { rank: 2, match: { damage: true }, text: "While you are afflicted by three or more statuses, bonus damage." },
  ],
};

/* -------------------------------------------------- */
/*  Profile                                            */
/* -------------------------------------------------- */

const _plain = (html) => String(html ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/**
 * Normalise an ability into the shape the matchers read.
 * @param {object} system     AbilityData (embedded item's `system`)
 * @param {object} opts
 * @param {string[]} opts.tags        effective raw tags (talent/mastery overrides applied)
 * @param {boolean} opts.isAttack
 * @param {boolean} opts.dealsDamage
 */
export function buildAbilityProfile(system, { tags = [], isAttack = false, dealsDamage = false } = {}) {
  const s = system ?? {};
  const sel = Number(s.talentSelected ?? 0);
  const parts = [
    s.description, s.hitEffect, s.missEffect, s.areaEffect, s.chargeEffect, s.heroicEffect,
    s.exceedEffect, s.collideEffect, s.slayEffect, s.critEffect, s.finishingBlowEffect,
    s.comebackEffect, s.interruptTrigger, s.isCombo ? s.comboEffect : "",
    sel === 1 ? s.talent1 : "", sel === 2 ? s.talent2 : "", s.masteryUnlocked ? s.mastery : "",
  ];
  const blocks = new Set();
  if (_plain(s.chargeEffect))        blocks.add("charge");
  if (_plain(s.slayEffect))          blocks.add("slay");
  if (_plain(s.exceedEffect))        blocks.add("exceed");
  if (_plain(s.collideEffect))       blocks.add("collide");
  if (_plain(s.comebackEffect))      blocks.add("comeback");
  if (_plain(s.finishingBlowEffect)) blocks.add("finish");
  // A trigger the book writes inline counts too ("Slay or Infuse 3: GRAN
  // BLITZ…" lives in the description, not in slayEffect), otherwise a relic
  // that keys off a Slay / Charge block would silently skip that ability.
  for (const sec of parseAbilitySections(s.description).sections) {
    for (const word of String(sec.label).toLowerCase().split(" or ")) {
      const key = { "charge": "charge", "slay": "slay", "exceed": "exceed", "collide": "collide",
                    "comeback": "comeback", "finishing blow": "finish", "crit": "crit" }[word.trim()];
      if (key) blocks.add(key);
    }
  }
  const raw = tags.map(t => String(t ?? "").trim().toLowerCase()).filter(Boolean);
  let maxRange = 0;
  for (const t of raw) {
    const m = /^range-(\d+)$/.exec(t);
    if (m) maxRange = Math.max(maxRange, Number(m[1]));
    if (t === "melee") maxRange = Math.max(maxRange, 1);
  }
  return {
    isAttack: !!isAttack,
    dealsDamage: !!dealsDamage,
    tags: raw,
    text: parts.map(_plain).join(" ").toLowerCase(),
    cost: String(s.cost ?? ""),
    isCombo: !!s.isCombo,
    blocks,
    maxRange,
  };
}

/* -------------------------------------------------- */
/*  Matching                                           */
/* -------------------------------------------------- */

function _tagHit(profileTags, wanted) {
  return wanted.some(w => profileTags.some(t => t === w || t.startsWith(`${w}-`)));
}

/** Does one matcher object hold for the profile? `round` null = not in a combat context. */
function _matchOne(m, profile, { round = null, checkRound = false } = {}) {
  if (m.invoke) return false;                                    // invoke notes are not ability reminders
  if (m.attack !== undefined && profile.isAttack !== m.attack) return false;
  if (m.damage && !profile.dealsDamage) return false;
  if (m.tags && !_tagHit(profile.tags, m.tags)) return false;
  if (m.text && !m.text.test(profile.text)) return false;
  if (m.block && !profile.blocks.has(m.block)) return false;
  if (m.combo && !profile.isCombo) return false;
  if (m.cost && !m.cost.includes(profile.cost)) return false;
  if (m.rangeAtLeast && profile.maxRange < m.rangeAtLeast) return false;
  if (m.round && checkRound && !(round >= m.round)) return false;
  return true;
}

function _matches(match, profile, ctx) {
  const list = Array.isArray(match) ? match : [match];
  return list.some(m => _matchOne(m, profile, ctx));
}

/** The relic items of a PC with their unlocked rank, sorted by name. */
export function unlockedRelics(actor) {
  if (!actor || actor.type !== "icon") return [];
  return actor.items
    .filter(i => i.type === "relic")
    .map(i => ({ item: i, name: i.name, key: String(i.name ?? "").trim().toLowerCase(), rank: Math.max(1, Math.min(4, Number(i.system?.currentRank ?? 1))) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Current combat round, or null when the actor is not fighting. */
export function currentRound(actor) {
  const combat = game.combat;
  if (!combat?.started) return null;
  if (actor && !combat.combatants.some(c => c.actorId === actor.id)) return null;
  return Number(combat.round) || null;
}

/**
 * Reminder lines a character's relics add to one ability.
 * @param {Actor}  actor
 * @param {object} profile   from buildAbilityProfile()
 * @param {object} [opts]
 * @param {boolean} [opts.forAttackCard]  round-gated entries only when the round is reached
 * @returns {{ relic:string, rank:number, rankLabel:string, text:string }[]}
 */
export function abilityRelicReminders(actor, profile, { forAttackCard = false } = {}) {
  const out = [];
  const round = currentRound(actor);
  for (const r of unlockedRelics(actor)) {
    const entries = RELIC_REMINDERS[r.key];
    if (!entries) continue;
    for (const e of entries) {
      if (e.rank > r.rank) continue;
      if (!_matches(e.match, profile, { round, checkRound: forAttackCard })) continue;
      const text = typeof e.text === "function" ? e.text({ rank: r.rank, round: forAttackCard ? round : null, profile }) : e.text;
      if (!text) continue;
      out.push({ relic: r.name, rank: e.rank, rankLabel: RANK_LABELS[e.rank], text });
    }
  }
  if (out.length) _log(`reminders for ${actor?.name}:`, out.map(o => `${o.relic} ${o.rankLabel}`).join(", "));
  return out;
}

/* -------------------------------------------------- */
/*  Attack invokes                                     */
/* -------------------------------------------------- */

const INVOKE_RE  = /invoke\s*\(\s*attack\s*,?\s*(\d+)\s*\+\s*\)\s*[:\-–—]?\s*(.*)$/i;
const BECOMES_RE = /becomes?\s*(?:invoke\s*)?\(\s*attack\s*,?\s*(\d+)\s*\+\s*\)/i;

/**
 * Which rank of a relic grants its Invoke.
 *
 * `system.invokeType / invokeCondition / invokeEffect` describe the relic's
 * invoke as a whole, but the invoke itself is written inside one of the rank
 * texts — Riftwalker's "Invoke (Attack, 11+)" is Rank III, Domain's is the
 * Aspect. Without this the chat card advertised an invoke the character has
 * not unlocked yet.
 *
 * @param {object} system  relic system data
 * @returns {number} 1-4; 1 when the invoke is part of the relic from the start
 */
export function relicInvokeRank(system) {
  const s = system ?? {};
  const effect = _plain(s.invokeEffect).toLowerCase();
  const ranks = [[1, s.rank1?.description], [2, s.rank2?.description], [3, s.rank3?.description], [4, s.aspect?.description]];
  // An explicit "Invoke (…)" line wins, at the lowest rank that spells it out.
  for (const [rank, html] of ranks) {
    if (/\binvoke\s*\(/i.test(_plain(html))) return rank;
  }
  // Otherwise the rank whose text is the invoke effect (Mercy, Erenbrass: the
  // invoke restates Rank I).
  if (effect.length > 12) {
    for (const [rank, html] of ranks) {
      const plain = _plain(html).toLowerCase();
      if (plain && (plain.includes(effect.slice(0, 40)) || effect.includes(plain.slice(0, 40)))) return rank;
    }
  }
  return 1;
}

/**
 * "Invoke (Attack, N+)" powers the character can trigger on an attack roll.
 * Parsed from the unlocked rank texts; an unlocked Aspect that says
 * "becomes (Attack, 12+)" lowers the threshold. Entries flagged `invoke: true`
 * in the table are appended as notes (Ape God / Scheherezade aspects).
 * @returns {{ relic:string, rankLabel:string, threshold:number, effect:string, notes:string[] }[]}
 */
export function attackInvokes(actor) {
  const out = [];
  for (const r of unlockedRelics(actor)) {
    const s = r.item.system ?? {};
    const ranks = [[1, s.rank1?.description], [2, s.rank2?.description], [3, s.rank3?.description], [4, s.aspect?.description]];
    for (const [rank, html] of ranks) {
      if (rank > r.rank) continue;
      const plain = _plain(html);
      // "Conquering King III becomes Invoke (Attack, 15+)" is an override of an
      // earlier rank, not a new invoke: handled by BECOMES_RE below.
      if (BECOMES_RE.test(plain)) continue;
      const m = INVOKE_RE.exec(plain);
      if (!m) continue;
      let threshold = Number(m[1]);
      let effect = m[2].trim() || _plain(s.invokeEffect);
      let rankLabel = RANK_LABELS[rank];
      if (r.rank >= 4 && rank < 4) {
        const b = BECOMES_RE.exec(_plain(s.aspect?.description));
        if (b) { threshold = Number(b[1]); rankLabel = `${rankLabel} (Aspect)`; }
      }
      const notes = (RELIC_REMINDERS[r.key] ?? [])
        .filter(e => e.rank <= r.rank && !Array.isArray(e.match) && e.match.invoke)
        .map(e => (typeof e.text === "function" ? e.text({ rank: r.rank, round: null, profile: null }) : e.text));
      out.push({ relic: r.name, rankLabel, threshold, effect, notes });
    }
  }
  if (out.length) _log(`attack invokes for ${actor?.name}:`, out.map(o => `${o.relic} ${o.threshold}+`).join(", "));
  return out;
}

/**
 * Resolve the invokes against a rolled d20: which ones go off.
 * @returns {{ relic, rankLabel, threshold, effect, notes, triggered:boolean }[]}
 */
export function resolveInvokes(invokes, d20) {
  return (invokes ?? []).map(i => ({ ...i, triggered: Number(d20) >= i.threshold }));
}

/* -------------------------------------------------- */
/*  Gambit invokes (p.114: once per combat)            */
/* -------------------------------------------------- */

const GAMBIT_RE = /invoke\s*\(\s*gambit\s*\)\s*[:\-–—]?\s*(.*)$/i;
/** Aspect wording that changes the gambit rather than adding one. */
const GAMBIT_BECOMES_RE = /(?:this\s+relic's\s+)?invoke\s+(?:gambit\s+)?becomes?\s*:?\s*(.*)$/i;
const GAMBIT_TWICE_RE   = /\b(?:can|may)\s+be\s+(?:used|taken)\s+twice\s+a\s+combat|\bcan't\s+be\s+used\s+more\s+than\s+twice\s+a\s+combat|\btwice\s+a\s+combat\b/i;
const GAMBIT_REGAIN_RE  = /\bregain\s+your\s+gambit\b[^.]*/i;

/**
 * The "Invoke (Gambit)" powers a PC's relics give (p.114: "triggered under the
 * listed conditions, but only once per combat"). One entry per relic that has
 * one in an unlocked rank; an unlocked Aspect can rewrite it ("This relic's
 * invoke becomes: …", Hermes) or allow it twice a combat (Sleipnir, Tower of
 * Barbs); Ironsoul III regains it when bloodied (a note).
 *
 * The per-combat use count lives on the relic item as the flag
 * `icon-system.gambitUses = { combatId, count }` (IconSheet#onInvokeGambit).
 *
 * @returns {{ itemId, relic, rankLabel, text, notes:string[], maxUses, used, canInvoke, combatId }[]}
 */
export function gambitInvokes(actor) {
  const out = [];
  const combat = typeof game !== "undefined" ? game.combat : null;
  const combatId = combat?.started ? combat.id : null;
  for (const r of unlockedRelics(actor)) {
    const s = r.item.system ?? {};
    const ranks = [[1, s.rank1?.description], [2, s.rank2?.description], [3, s.rank3?.description], [4, s.aspect?.description]];
    let entry = null;
    const notes = [];
    let maxUses = 1;
    for (const [rank, html] of ranks) {
      if (rank > r.rank) continue;
      const plain = _plain(html);
      const becomes = GAMBIT_BECOMES_RE.exec(plain);
      if (becomes && entry) { entry.text = becomes[1].trim(); entry.rankLabel = `${entry.rankLabel} (Aspect)`; continue; }
      const m = GAMBIT_RE.exec(plain);
      if (m) {
        const text = m[1].trim();
        if (!entry) entry = { itemId: r.item.id, relic: r.name, rankLabel: RANK_LABELS[rank], text };
        else { entry.text += ` — ${RANK_LABELS[rank]}: ${text}`; }   // a second gambit on the same relic (Chime Aspect)
      }
      if (GAMBIT_TWICE_RE.test(plain)) maxUses = 2;
      const rg = GAMBIT_REGAIN_RE.exec(plain);
      if (rg) notes.push(rg[0].trim());
    }
    if (!entry) continue;
    const f = r.item.getFlag?.("icon-system", "gambitUses") ?? null;
    const used = combatId && f?.combatId === combatId ? Number(f.count) || 0 : 0;
    out.push({ ...entry, notes, maxUses, used, combatId, canInvoke: !combatId || used < maxUses });
  }
  return out;
}

/* -------------------------------------------------- */
/*  Turn reminders                                     */
/* -------------------------------------------------- */

/**
 * Relic effects tied to a moment of the combat, posted to chat by the tracker
 * (IconCombat): "start" / "end" of the character's own turn, "combat-start",
 * "round-end". `text` may depend on the unlocked rank.
 */
export const RELIC_TURN_REMINDERS = {
  "apophis": [
    { rank: 1, when: "start", text: "Create a poison pool (dangerous terrain) in a free space adjacent to you." },
    { rank: 2, when: "start", text: "If you start your turn in dangerous terrain, you may deal 1 piercing damage to all adjacent characters." },
  ],
  "erenbrass": [
    { rank: 1, when: "start", text: ({ rank }) => `You may shove an ally 1 space in any direction${rank >= 3 ? " — or dash / teleport / fly them 1 (+1 if they are bloodied)" : ""}${rank >= 4 ? "; foes in range 3 too" : ""}.` },
    { rank: 2, when: "end",   text: ({ rank }) => `You may shove an ally 1 space in any direction (a different character than at the start is fine)${rank >= 3 ? " — or dash / teleport / fly them 1 (+1 if bloodied)" : ""}.` },
  ],
  "ironsoul":     [{ rank: 4, when: "start", text: "Shove one ally in range 2 one space towards you, even diagonally." }],
  "cloudpiercer": [{ rank: 4, when: "start", text: "You may set your 'exact range' effects to range 2, 3 or 4 until the start of your next turn." }],
  "mistborn":     [{ rank: 3, when: "end",   text: "If no other foes or allies are in range 2, gain stealth (if you would already gain stealth, dash 2)." }],
  "storm lord":   [{ rank: 1, when: "end",   text: "If you didn't attack this turn, gain a combo token or spend one to dash 1." }],
  "trollhide": [
    { rank: 1, when: "end", text: "If you didn't attack this turn, gain 4 vigor." },
    { rank: 2, when: "end", text: "If you didn't attack this turn, +1 boon on saves until the start of your next turn." },
  ],
  "byrax":        [{ rank: 3, when: "first-turn", text: "First turn of combat: you may take a stance costing 1 action or less as a free action." }],
  "scheherezade": [{ rank: 1, when: "combat-start", text: "Gain 2 blessing tokens on yourself." }],
  "wyrmtooth":    [{ rank: 4, when: "combat-start", text: "You may inflict one or two statuses of your choice on yourself." }],
  "paleblood": [
    { rank: 1, when: "combat-start", text: "Gain a d4 power die starting at 1 (Paleblood)." },
    { rank: 1, when: "round-end",    text: "Tick the Paleblood die up by 1. At 4 you may expend it on any ability (bonus damage + every triggered effect)." },
  ],
};

/**
 * Reminder lines for one actor at a given moment.
 * @param {Actor}  actor
 * @param {"start"|"end"|"combat-start"|"round-end"|"first-turn"} when
 * @returns {{ relic, rankLabel, text }[]}
 */
export function turnRelicReminders(actor, when) {
  const out = [];
  for (const r of unlockedRelics(actor)) {
    for (const e of RELIC_TURN_REMINDERS[r.key] ?? []) {
      if (e.rank > r.rank || e.when !== when) continue;
      const text = typeof e.text === "function" ? e.text({ rank: r.rank }) : e.text;
      out.push({ relic: r.name, rankLabel: RANK_LABELS[e.rank], text });
    }
  }
  return out;
}
