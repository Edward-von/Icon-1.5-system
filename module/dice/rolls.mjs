/**
 * rolls.mjs — Dice roll logic for ICON 1.5.
 *
 * All rolls use Foundry's Roll class so that:
 *  • Dice So Nice intercepts the 3D roll animation automatically
 *  • Roll objects are attached to ChatMessage for full DSN compatibility
 *  • The chat card (rendered from HBS) shows which die was the result
 */

/* ================================================== */
/*  Constants                                          */
/* ================================================== */

import { ICON } from "../config.mjs";
import { formatTag } from "../helpers/rule-tooltips.mjs";
import { statusBlockHtml } from "../combat/ability-statuses.mjs";
import { rollEvasion, evasionBlockHtml, currentTargets } from "../combat/defenses.mjs";
import { BASE_CRIT, BASE_EXCEED, noteCriticalHit } from "../combat/crit-thresholds.mjs";

const TPLPATH = "systems/icon-system/templates/chat";

/**
 * renderTemplate shim — the bare global `renderTemplate` is deprecated in v13
 * and slated for removal in v14. Resolve the namespaced version at call time,
 * falling back to the global while it still exists. Shadows the global name so
 * the existing call sites below need no changes.
 */
const renderTemplate = (path, data) =>
  (foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate)(path, data);

const OUTCOME_LABELS = {
  fail:     "Fail + Consequence",
  partial:  "Success with Cost",
  success:  "Success",
  critical: "Critical!",
};

const OUTCOME_EFFECTS = {
  fail:     "The GM introduces a consequence.",
  partial:  "Succeed, but at a cost — or reduce the effect.",
  success:  "Clean success at normal effect.",
  critical: "Success with increased effect!",
};

/**
 * Outcome thresholds per roll type. The picked die must be ≥ threshold for
 * the given outcome (checked in descending order).
 *
 *   standard (RAW):   1-3 fail,   4-5 partial, 6 success
 *   heroic   (hard):  1-4 fail,   5   partial, 6 success
 *   routine  (easy):  1-2 fail,   3-4 partial, 5-6 success
 *
 * The critical rule (2+ sixes in the pool) applies to all types.
 */
const ROLL_THRESHOLDS = {
  standard: { success: 6, partial: 4 },
  heroic:   { success: 6, partial: 5 },
  routine:  { success: 5, partial: 3 },
};

const ROLL_TYPE_LABELS = {
  standard: "Standard",
  heroic:   "Heroic",
  routine:  "Routine",
};

/* ================================================== */
/*  Narrative Roll  (d6 pool, pick highest / lowest)   */
/* ================================================== */

/**
 * Perform a narrative action roll.
 *
 * @param {object} opts
 * @param {string}  opts.actionLabel    Displayed action name
 * @param {number}  opts.rating         Action rating 0–4
 * @param {number}  [opts.boons=0]      Raw boon count (capped internally to ±2 net)
 * @param {number}  [opts.curses=0]     Raw curse count
 * @param {number}  [opts.bonusDice=0]  Dice added AFTER the ±2 cap (e.g. from
 *                                       pushing effort — bypasses the cap).
 * @param {string}  [opts.rollType="standard"]  "standard" | "heroic" | "routine"
 * @param {Actor}   [opts.actor]        Originating actor (for speaker)
 * @returns {Promise<{pool, dice, result, outcome, roll}>}
 */
export async function narrativeRoll({
  actionLabel,
  rating,
  boons = 0,
  curses = 0,
  bonusDice = 0,
  rollType = "standard",
  actor,
} = {}) {
  const cap      = ICON.rules.boonCurseCap;
  const net      = Math.max(-cap, Math.min(cap, boons - curses));
  const pool     = Math.max(0, rating + net + bonusDice);
  const isLowest = pool === 0;   // 2d6 pick lowest when pool would be 0 or negative

  /* --- Roll --- */
  const formula  = isLowest ? "2d6" : `${pool}d6`;
  const roll     = await new Roll(formula).evaluate();
  const rawDice  = roll.dice[0].results.map(d => d.result);

  const result   = isLowest
    ? Math.min(...rawDice)
    : Math.max(...rawDice);

  const outcome  = _narrativeOutcome(result, rawDice, pool, isLowest, rollType);

  /* --- Per-die display data (which one was picked?) --- */
  const diceData = _buildNarrativeDiceData(rawDice, result, isLowest);

  /* --- Render chat card --- */
  const content = await renderTemplate(`${TPLPATH}/narrative-roll.hbs`, {
    actionLabel: actionLabel ?? "Action",
    rating,
    pool,
    boons:         Math.max(0, net),
    curses:        Math.max(0, -net),
    isLowest,
    diceData,
    result,
    outcome,
    outcomeLabel:  OUTCOME_LABELS[outcome],
    outcomeEffect: OUTCOME_EFFECTS[outcome],
    rollType,
    rollTypeLabel: ROLL_TYPE_LABELS[rollType] ?? rollType,
    isStandard: rollType === "standard",
    isHeroic:   rollType === "heroic",
    isRoutine:  rollType === "routine",
  });

  const speaker = actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker();

  const typeSuffix = rollType !== "standard" ? ` [${ROLL_TYPE_LABELS[rollType]}]` : "";
  await ChatMessage.create({
    speaker,
    flavor:  `${actionLabel ?? "Action"}${typeSuffix} — ${OUTCOME_LABELS[outcome]}`,
    content,
    rolls:   [roll],           // Dice So Nice reads this
  });

  return { pool, dice: rawDice, result, outcome, roll };
}

/* -------------------------------------------------- */
/*  Outcome detection                                  */
/* -------------------------------------------------- */

function _narrativeOutcome(result, dice, pool, isLowest, rollType = "standard") {
  const t = ROLL_THRESHOLDS[rollType] ?? ROLL_THRESHOLDS.standard;

  if (isLowest) {
    // 2d6 pick lowest – no critical possible. Same thresholds apply.
    if (result >= t.success) return "success";
    if (result >= t.partial) return "partial";
    return "fail";
  }
  // Critical rule (2+ sixes in a pool of 2+ dice) applies to all roll types.
  const sixes = dice.filter(d => d === 6).length;
  if (pool >= 2 && sixes >= 2)  return "critical";
  if (result >= t.success)       return "success";
  if (result >= t.partial)       return "partial";
  return "fail";
}

/**
 * Build per-die data array for the template.
 * The "picked" die is highlighted; if multiple dice share the picked value,
 * only the first one is highlighted (consistent with DSN visual).
 */
function _buildNarrativeDiceData(rawDice, result, isLowest) {
  let markedOnce = false;
  return rawDice.map(v => {
    const isPicked = !markedOnce && v === result;
    if (isPicked) markedOnce = true;
    return { value: v, picked: isPicked, isSix: v === 6 };
  });
}

/* ================================================== */
/*  Combat Roll  (d20 + boon/curse d6 pool)           */
/* ================================================== */

/**
 * The `icon-system.attack` flag of an attack card: who attacked, with what,
 * and who was targeted — read by the "when targeted" interrupt buttons
 * (damage-interrupts.mjs#decorateAttackInterrupts, R35).
 * @param {{actor?:Actor, abilityName?:string, targets?:Array<{actorUuid, tokenId, name}>, roll?:boolean}} opts
 */
export function attackFlags({ actor = null, abilityName = "", targets = [], roll = false } = {}) {
  return {
    // An attack roll or auto-hit card (not Show in Chat): the damage card that
    // follows shows its Inflict buttons too (damage.mjs, inflict-status.mjs).
    ...(roll ? { roll: true } : {}),
    sourceActorUuid: actor?.uuid ?? "",
    sourceName:      actor?.name ?? "",
    abilityName:     abilityName ?? "",
    targets: (targets ?? []).filter(t => t?.actorUuid).map(t => ({ actorUuid: t.actorUuid, tokenId: t.tokenId ?? "", name: t.name ?? "" })),
  };
}

/**
 * Perform a combat attack roll.
 *
 * @param {object} opts
 * @param {string}   opts.abilityName
 * @param {number}   [opts.boons=0]
 * @param {number}   [opts.curses=0]
 * @param {number}   [opts.defense]       Target defense threshold
 * @param {string}   [opts.hitEffect]     Enriched HTML
 * @param {string}   [opts.missEffect]    Enriched HTML
 * @param {string}   [opts.exceedEffect]  Enriched HTML (15+)
 * @param {string}   [opts.critEffect]    Enriched HTML
 * @param {Array}    [opts.effects]       {label, text} blocks of a combo version, shown above Hit
 * @param {Array}    [opts.talentEffects] {label, text} blocks of the unlocked talent, shown below Miss
 * @param {Array}    [opts.leadEffects]   {label, text} the ability's own lines written before the attack (Effect, Special), above Hit
 * @param {Array}    [opts.abilityEffects] {label, text} the ability's other lines (Collide, Charge, Heroic, Area…), below Miss
 * @param {string}   [opts.costLabel]     "1 Action" etc.
 * @param {string[]} [opts.tags]
 * @param {string}   [opts.areaHtml]      Safe HTML line describing the placed area + targets (area-templates.mjs)
 * @param {Array}    [opts.statusEntries] Statuses the ability inflicts (ability-statuses.mjs) → "Inflict" buttons per target
 * @param {Array}    [opts.targets]       Targets of the attack (defenses.mjs#currentTargets; default: the user's targets now)
 * @param {object}   [opts.evasionOverride] { tokenId: boolean } — the attack dialog's "Defender has evasion" boxes
 * @param {number}   [opts.critAt=20]     Total needed for a crit (attack dialog: Soulfire, Arenheir, by hand)
 * @param {number}   [opts.exceedAt=15]   Total needed to exceed
 * @param {string}   [opts.forceExceed]   Name of the mastery that triggers the exceed whatever the total ("" = none)
 * @param {Actor}    [opts.actor]
 * @returns {Promise<{d20, modifier, total, isCrit, isHit, isExceed, rolls, evasion}>}
 */
export async function combatRoll({
  abilityName, boons = 0, curses = 0, defense,
  critAt = BASE_CRIT, exceedAt = BASE_EXCEED, forceExceed = "",
  hitEffect, missEffect, exceedEffect, critEffect, effects = [], talentEffects = [],
  leadEffects = [], abilityEffects = [],
  costLabel, tags = [], areaHtml = "",
  relicInvokes = [], relicNotes = [],
  statusEntries = [],
  targets = null,
  evasionOverride = null,
  actor,
} = {}) {
  const net    = boons - curses;

  // Evasion (p.146): a d6 per targeted token with Evasion, checked BEFORE the
  // attack roll. When every target evades there is no attack roll at all: the
  // d20 is still shown for reference but the result is a miss and relic
  // invokes don't trigger.
  const attackTargets = targets ?? currentTargets();
  const evasion = await rollEvasion({ attacker: actor, targets: attackTargets, tags, evasionOverride });
  const evaded  = evasion.allEvaded;

  const d20r   = await new Roll("1d20").evaluate();
  const d20    = d20r.total;
  const rolls  = [...evasion.rolls, d20r];
  let modifier = 0;
  let absModifier = 0;
  let boonCurseLabel = "";

  if (net !== 0) {
    const poolSize = Math.abs(net);
    const poolRoll = await new Roll(`${poolSize}d6`).evaluate();
    rolls.push(poolRoll);
    absModifier     = Math.max(...poolRoll.dice[0].results.map(d => d.result));
    modifier        = net > 0 ? absModifier : -absModifier;
    boonCurseLabel  = net > 0 ? `${boons} Boon${boons > 1 ? "s" : ""}` : `${curses} Curse${curses > 1 ? "s" : ""}`;
  }

  const total     = d20 + modifier;
  const critT     = Number(critAt)   || BASE_CRIT;
  const exceedT   = Number(exceedAt) || BASE_EXCEED;
  const isCrit    = !evaded && total >= critT;
  const isHit     = evaded ? false : (defense != null ? total >= defense : null);
  // A mastery that "triggers all exceed effects" (BLOOD FESTIVAL p.192, BURIAL FIST p.194) needs no 15+.
  const isExceed  = !evaded && (total >= exceedT || !!forceExceed);
  // Thresholds moved from 20+ / 15+: the card says so next to the total.
  const thresholdNote = (critT !== BASE_CRIT || exceedT !== BASE_EXCEED) ? `crit ${critT}+ · exceed ${exceedT}+` : "";

  const content = await renderTemplate(`${TPLPATH}/attack-roll.hbs`, {
    abilityName:   abilityName ?? "Attack",
    costLabel:     costLabel ?? "",
    // Chips read the same on an NPC card as on a PC one: the raw tag of a foe
    // action ("true-strike", "boon-1") becomes "True Strike" / "+1 Boon" with
    // its rule on hover, instead of being printed as stored.
    tagsHtml:      tags.map(t => {
      const f = formatTag(typeof t === "string" ? t : (t?.raw ?? t?.label ?? ""));
      if (!f) return "";
      return `<span class="icon-tag"${f.tooltip ? ` data-tooltip="${_esc(f.tooltip)}"` : ""}>${_esc(f.label)}</span>`;
    }).join(""),
    areaHtml:      areaHtml ?? "",
    d20,
    modifier,
    absModifier,
    modifierStr:   modifier !== 0 ? String(Math.abs(modifier)) : "",
    isPositive:    modifier >= 0,
    boonCurseLabel,
    total,
    defense:       defense ?? null,
    isCrit,
    isHit,
    isExceed,
    critAt:        critT,
    exceedAt:      exceedT,
    // Exceed reached by the mastery, not by the total: the label names it instead of "15+".
    exceedSource:  forceExceed && total < exceedT ? String(forceExceed) : "",
    thresholdNote,
    evaded,
    evasionHtml:   evasionBlockHtml(evasion),
    hitEffect:     hitEffect   ?? "",
    missEffect:    missEffect  ?? "",
    exceedEffect:  exceedEffect ?? "",
    critEffect:    critEffect   ?? "",
    // Extra blocks shown above Hit / Miss (a combo version's own lines).
    effects:       effects ?? [],
    // The unlocked talent's own lines ("Slay (Talent II): …"), below Miss.
    talentEffects: talentEffects ?? [],
    // The ability's own other lines: before the attack (above Hit) and after it (below Miss).
    leadEffects:    leadEffects ?? [],
    abilityEffects: abilityEffects ?? [],
    // Relic integration (p.245): attack invokes check the RAW d20; notes are
    // the relic reminders that apply to this attack. No attack roll happened
    // when every target evaded, so the invokes are not shown.
    relicInvokeHtml: evaded ? "" : relicInvokeHtml(relicInvokes, d20),
    relicNotesHtml:  relicNotesHtml(relicNotes),
    // Inflicted statuses: one button per status and target; the groups of
    // the outcomes this roll did not reach (Miss on a hit, Exceed under 15…)
    // are dimmed, not hidden. Rows of targets that evaded are dimmed too.
    // `targets` narrowed to one token = the attack target picked in the dialog
    // of an area attack: its row gets the attack part, the rest of the area
    // only the area part (p.97).
    statusHtml: actor ? statusBlockHtml(statusEntries, { source: actor, abilityName: abilityName ?? "Attack", outcome: { isHit, isCrit, isExceed }, evaded: evasion.evadedUuids,
      attackTargetId: targets?.length === 1 ? (targets[0].tokenId ?? "") : "" }) : "",
  });

  const speaker = actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker();

  await ChatMessage.create({
    speaker,
    flavor:  abilityName ?? "Attack",
    content,
    rolls,
    // Who was targeted: the "when targeted" interrupt buttons (damage-interrupts.mjs, R35).
    flags: { "icon-system": { attack: attackFlags({ actor, abilityName, targets: attackTargets, roll: true }) } },
  });

  // Arenheir Aspect: each crit lowers the crit threshold of the next attacks.
  if (isCrit && actor) await noteCriticalHit(actor);

  return { d20, modifier, total, isCrit, isHit, isExceed, rolls, evasion };
}

/* ================================================== */
/*  Relic blocks for attack cards                      */
/* ================================================== */

const _esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));

/**
 * "Invoke — Ape God I (17+)" lines: one per attack invoke, lit when the raw
 * d20 reaches the threshold, dim otherwise. `autoHit` adds the p.245 note
 * that the d20 was rolled only for the invoke.
 */
export function relicInvokeHtml(invokes, d20, { autoHit = false } = {}) {
  if (!invokes?.length) return "";
  const rows = invokes.map(i => {
    const on = Number(d20) >= i.threshold;
    const notes = on && i.notes?.length ? ` <em>${i.notes.map(_esc).join(" ")}</em>` : "";
    return `<div class="icon-chat-relic ${on ? "icon-chat-relic--on" : "icon-chat-relic--off"}">
      <span class="icon-chat-relic__label">${on ? "\u2726 Invoke" : "Invoke"} \u2014 ${_esc(i.relic)} ${_esc(i.rankLabel)} <small>(${i.threshold}+ \u00b7 d20 ${_esc(d20)})</small></span>
      <span class="icon-chat-relic__text">${on ? _esc(i.effect) : "not triggered"}${notes}</span>
    </div>`;
  }).join("");
  const note = autoHit ? `<p class="icon-chat-relic__note">Auto-hit: 1d20 rolled only to check the relic invoke (p.245).</p>` : "";
  return `<div class="icon-chat-relics">${rows}${note}</div>`;
}

/** Relic reminder lines ("Ruin I — Once per attack, trade 1 boon for bonus damage."). */
export function relicNotesHtml(notes) {
  if (!notes?.length) return "";
  const rows = notes.map(n => `<div class="icon-chat-relic icon-chat-relic--note"><span class="icon-chat-relic__label">\u2726 ${_esc(n.relic)} ${_esc(n.rankLabel)}</span><span class="icon-chat-relic__text">${_esc(n.text)}</span></div>`).join("");
  return `<div class="icon-chat-relics icon-chat-relics--notes">${rows}</div>`;
}

/* ================================================== */
/*  Save Roll                                          */
/* ================================================== */

/**
 * Roll a save vs a status effect (d20, 10+ = success).
 *
 * @param {object} opts
 * @param {string}  opts.statusLabel  Human-readable status name
 * @param {boolean} [opts.ongoing]    Ongoing+ status (auto-fail)
 * @param {number}  [opts.boons]      Boons applied to the save (e.g. 1 from a Mendicant blessing)
 * @param {number}  [opts.curses]     Curses applied to the save
 * @param {string}  [opts.boonNote]   Optional note shown next to the modifier (e.g. "blessing")
 * @param {string}  [opts.subtitle]   Context line ("Haymaker — Brawler → Warrior") for saves against an incoming effect
 * @param {string}  [opts.successText]  Result text override (default: "Saved! X cleared." — the end-of-turn wording)
 * @param {string}  [opts.failureText]  Result text override (default: "Failed — X persists.")
 * @param {Actor}   [opts.actor]
 * @returns {Promise<{total, success, roll}>}
 */
export async function saveRoll({ statusLabel, ongoing = false, boons = 0, curses = 0, boonNote = "", subtitle = "", successText = "", failureText = "", actor } = {}) {
  const d20r  = await new Roll("1d20").evaluate();
  const d20   = d20r.total;
  const rolls = [d20r];
  // Deepwrath Talent I (p.235): "Marked allies gain +1 boon on saves in pits".
  if (!ongoing && actor) {
    const { pitMarkEffects } = await import("../canvas/terrain-spaces.mjs");
    const td = actor.token ?? actor.getActiveTokens?.(false, true)?.[0] ?? null;
    const pit = pitMarkEffects(td);
    if (pit.saveBoons) {
      boons += pit.saveBoons;
      boonNote = [boonNote || (boons - pit.saveBoons ? `${boons - pit.saveBoons} boon${boons - pit.saveBoons > 1 ? "s" : ""}` : ""), `${pit.saveSource}: in a pit`].filter(Boolean).join(", ");
    }
  }
  const net   = boons - curses;
  let modifier = 0;
  let boonCurseLabel = "";

  if (net !== 0) {
    const poolSize = Math.abs(net);
    const poolRoll = await new Roll(`${poolSize}d6`).evaluate();
    rolls.push(poolRoll);
    const absMod  = Math.max(...poolRoll.dice[0].results.map(d => d.result));
    modifier = net > 0 ? absMod : -absMod;
    boonCurseLabel = net > 0
      ? `+${modifier}${boonNote ? ` (${boonNote})` : ` (${boons} boon${boons > 1 ? "s" : ""})`}`
      : `${modifier} (${curses} curse${curses > 1 ? "s" : ""})`;
  }

  const total   = d20 + modifier;
  const success = !ongoing && total >= 10;

  const content = await renderTemplate(`${TPLPATH}/save-roll.hbs`, {
    statusLabel: statusLabel ?? "status",
    ongoing,
    total,
    d20,
    modifier,
    boonCurseLabel,
    success,
    subtitle,
    successText,
    failureText,
  });

  const speaker = actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker();

  await ChatMessage.create({
    speaker,
    flavor:  `Save vs ${statusLabel ?? "status"}`,
    content,
    rolls,
  });

  return { total, success, roll: d20r };
}

/* ================================================== */
/*  Damage Roll                                        */
/* ================================================== */

/**
 * Roll the damage for a hit, following the ICON damage pipeline.
 * Does NOT apply the damage to any actor — call applyDamagePipeline() for that.
 *
 * Pipeline:
 *   1. Roll [D] (+ bonus dice pick highest) + fray + flat mods
 *   2. +1 if target Vulnerable
 *   3. − target Armor
 *   4. Halve if Resistance or Cover (only once)
 *   5. −2 if attacker Weakened
 *
 * @param {object} opts
 * @param {string}  opts.dieType        "d6" | "d8" | "d10"
 * @param {number}  opts.fray
 * @param {number}  [opts.bonusDice=0]  Extra [D] dice (pick highest among all)
 * @param {boolean} [opts.isCrit=false] Add +[D] on crit
 * @param {boolean} [opts.isMiss=false] Miss: fray only (base die not rolled)
 * @param {boolean} [opts.vulnerable=false]
 * @param {number}  [opts.armor=0]
 * @param {boolean} [opts.resistance=false]  Halve damage
 * @param {boolean} [opts.weakened=false]    Attacker has Weakened
 * @param {number}  [opts.flatBonus=0]
 * @returns {Promise<{rolls, baseDie, critDie, fray, steps, gross, net}>}
 */
export async function damageRoll({
  dieType = "d6",
  fray = 0,
  bonusDice = 0,
  isCrit  = false,
  isMiss  = false,
  vulnerable  = false,
  armor   = 0,
  resistance  = false,
  weakened    = false,
  flatBonus   = 0,
} = {}) {
  const rolls = [];
  const steps = [];
  let baseDieValue = 0;
  let critDieValue = 0;

  /* --- Base die (only on hit) --- */
  if (!isMiss) {
    const totalDice = 1 + bonusDice;
    const dieRoll   = await new Roll(`${totalDice}${dieType}`).evaluate();
    rolls.push(dieRoll);
    const dieResults = dieRoll.dice[0].results.map(d => d.result);
    baseDieValue = Math.max(...dieResults);
    const bonusNote = bonusDice > 0 ? ` (${totalDice} dice, pick highest: ${dieResults.join(",")})` : "";
    steps.push({ label: `[D] (${dieType})${bonusNote}`, value: baseDieValue });

    /* --- Crit: +[D] --- */
    if (isCrit) {
      const critRoll = await new Roll(`1${dieType}`).evaluate();
      rolls.push(critRoll);
      critDieValue = critRoll.total;
      steps.push({ label: `Crit +[D]`, value: critDieValue });
    }
  } else {
    steps.push({ label: "[D] (miss — fray only)", value: 0 });
  }

  /* --- Fray & flat --- */
  let running = baseDieValue + critDieValue + fray + flatBonus;
  if (fray)      steps.push({ label: "Fray", value: fray });
  if (flatBonus) steps.push({ label: "Flat bonus", value: flatBonus });

  const gross = running;

  /* --- Vulnerable --- */
  if (vulnerable) {
    running += 1;
    steps.push({ label: "Vulnerable", value: 1 });
  }

  /* --- Armor --- */
  if (armor > 0) {
    running = Math.max(0, running - armor);
    steps.push({ label: `Armor −${armor}`, value: -armor, isNegative: true });
  }

  /* --- Resistance / Cover --- */
  if (resistance) {
    running = Math.ceil(running / 2);   // rounded up (p.86)
    steps.push({ label: "Resistance (halved)", value: running, isFinal: false });
  }

  /* --- Weakened (attacker) --- */
  if (weakened) {
    const pen = ICON.rules.weakenedPenalty;
    running = Math.max(0, running - pen);
    steps.push({ label: `Weakened −${pen}`, value: -pen, isNegative: true });
  }

  steps[steps.length - 1].isFinal = true;

  return {
    rolls,
    baseDieValue,
    critDieValue,
    fray,
    steps,
    gross,
    net: Math.max(0, running),
  };
}
