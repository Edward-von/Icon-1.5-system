/**
 * damage.mjs — Damage pipeline, Wound system, Vigor system for ICON 1.5.
 *
 * Damage pipeline order (per spec):
 *   1. Roll [D] (+ bonus dice pick highest) + fray + flat
 *   2. +1 if target Vulnerable
 *   3. − target Armor
 *   4. Halve if Resistance or Cover (only once)
 *   5. −2 if attacker Weakened
 *
 * Damage hits Vigor before HP.
 * Wounds reduce hp.max by VIT each; 4 wounds = Fallen.
 */

import { damageRoll } from "../dice/rolls.mjs";
import { escapeHTML } from "../helpers/enrich.mjs";
import { getStatusCharges, setStatusCharges } from "./statuses.mjs";

const TPLPATH = "systems/icon-system/templates/chat";

/** Socket channel shared with IconCombat.mjs — GM-relay for actions players can't perform. */
const SOCKET = "system.icon-system";

/**
 * renderTemplate shim — the bare global `renderTemplate` is deprecated in v13
 * and slated for removal in v14. Resolve the namespaced version at call time,
 * falling back to the global while it still exists. Shadows the global name so
 * the existing call site below needs no change.
 */
const renderTemplate = (path, data) =>
  (foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate)(path, data);

/* ================================================== */
/*  HP / Vigor path helpers                            */
/* ================================================== */

/**
 * Return the update-path for an actor's hp/vigor fields. PCs keep combat
 * stats under `system.combat.*`; foes and legends keep them at top level.
 */
function paths(actor) {
  const isPC = actor?.type === "icon";
  return {
    isPC,
    hp:        isPC ? "system.combat.hp.value"    : "system.hp.value",
    hpMax:     isPC ? "system.combat.hp.max"      : "system.hp.max",
    vigor:     isPC ? "system.combat.vigor.value" : "system.vigor.value",
    container: isPC ? actor?.system?.combat        : actor?.system,
  };
}

/** Normalized armor read for any actor type (PCs: system.combat.armor; others: system.armor). */
export function getActorArmor(actor) {
  return Number(paths(actor).container?.armor ?? 0) || 0;
}

/* ================================================== */
/*  Status helpers                                     */
/* ================================================== */

/** Check whether an actor's token has a given ICON status active. */
export function hasActiveStatus(actor, statusId) {
  return actor.statuses?.has(statusId)
    ?? actor.effects.some(e => e.statuses?.has(statusId) || e.getFlag("core", "statusId") === statusId);
}

/** Check if a target has Cover advantage on attacker (height advantage). */
export function hasCover(target) {
  return hasActiveStatus(target, "cover");
}

/* ================================================== */
/*  Full damage pipeline                               */
/* ================================================== */

/**
 * Roll damage and apply it to a target actor, following the full pipeline.
 *
 * @param {Actor}   attacker
 * @param {Actor}   target
 * @param {object}  opts
 * @param {boolean} [opts.isHit=true]
 * @param {boolean} [opts.isCrit=false]
 * @param {number}  [opts.bonusDice=0]    Extra [D] dice
 * @param {number}  [opts.flatBonus=0]
 * @param {string}  [opts.abilityName]
 * @returns {Promise<{net, woundApplied, fallen}>}
 */
export async function applyDamagePipeline(attacker, target, {
  isHit     = true,
  isCrit    = false,
  bonusDice = 0,
  flatBonus = 0,
  abilityName = "Attack",
} = {}) {
  if (!target?.system?.combat && !target?.system?.hp) return null;

  // This path rolls locally and reports vigor/wound results in its own card,
  // so it can't be relayed to the GM — require ownership up front instead of
  // failing halfway through with a cryptic core permission error.
  if (!target.isOwner && !game.user.isGM) {
    ui.notifications.warn(`You don't have permission to apply damage to "${target.name}". Use the damage card's Apply button instead.`);
    return null;
  }

  const ac  = attacker?.system?.combat ?? {};
  const tc  = target?.system?.combat   ?? target?.system ?? {};

  /* --- Status checks --- */
  const vulnerable  = hasActiveStatus(target,   "vulnerable");
  const resistance  = hasActiveStatus(target,   "resistance");
  const cover       = hasCover(target);
  const weakened    = attacker ? hasActiveStatus(attacker, "weakened") : false;
  const halve       = resistance || cover;

  /* --- Roll damage --- */
  const result = await damageRoll({
    dieType:   ac.damagedie ?? "d6",
    fray:      ac.fray ?? 0,
    bonusDice,
    isCrit,
    isMiss:    !isHit,
    vulnerable,
    armor:     tc.armor ?? 0,
    resistance: halve,
    weakened,
    flatBonus,
  });

  const { rolls, steps, net } = result;

  /* --- Apply damage to target (armor already subtracted in the roll) --- */
  const { woundApplied, fallen, vigorAbsorbed, hpLost } =
    await applyDamageToActor(target, net, { allowRelay: false }) ?? {};

  /* --- Chat card --- */
  const content = await renderTemplate(`${TPLPATH}/damage-card.hbs`, {
    targetName:    target.name,
    steps,
    finalDamage:   net,
    vigorAbsorbed,
    woundApplied,
    woundCount:    (tc.wounds?.value ?? 0),
    fallen,
  });

  const speaker = attacker
    ? ChatMessage.getSpeaker({ actor: attacker })
    : ChatMessage.getSpeaker();

  await ChatMessage.create({
    speaker,
    flavor:  `${abilityName} — Damage`,
    content,
    rolls,
  });

  return { net, woundApplied, fallen, vigorAbsorbed, hpLost };
}

/* ================================================== */
/*  Apply damage to actor (vigor → HP → wounds)       */
/* ================================================== */

/**
 * SINGLE entry point for deducting damage from an actor. Used by
 * applyDamagePipeline (armor already handled in the roll), by the damage-card
 * "Apply Damage" button in icon.mjs (applyArmor + half options), and by the
 * GM socket relay in IconCombat.mjs. Keep ALL deduction rules here.
 *
 * Order: − Armor (optional) → ½ (optional, Resistance/Cover) → Vigor → HP →
 * Wound if a PC drops to 0. Mobs (foeClass === "mob") lose exactly 1 hit per
 * call regardless of amount (manual p.291).
 *
 * Players without ownership of `actor` relay the request to the active GM via
 * socket (unless allowRelay is false, in which case they get a warning).
 *
 * @param {Actor}  actor
 * @param {number} amount                    Damage before the options below.
 * @param {object}  [opts]
 * @param {boolean} [opts.applyArmor=false]  Subtract the DEFENDER's armor first.
 * @param {boolean} [opts.half=false]        Halve after armor (Resistance/Cover).
 * @param {boolean} [opts.chatConfirm=false] Post a "Damage Applied" chat note.
 * @param {boolean} [opts.allowRelay=true]   Relay to GM when caller lacks ownership.
 * @returns {Promise<object|null>} Breakdown, or null for no-ops/denied calls:
 *   { ok, relayed, isMob, applied, armorBlocked, vigorAbsorbed,
 *     hpBefore, hpAfter, hpLost, woundApplied, fallen, mob }
 */
export async function applyDamageToActor(actor, amount, {
  applyArmor  = false,
  half        = false,
  chatConfirm = false,
  allowRelay  = true,
} = {}) {
  amount = Math.max(0, Number(amount) || 0);
  if (!actor) return null;

  const zero = {
    ok: true, relayed: false, isMob: false, applied: 0, armorBlocked: 0,
    vigorAbsorbed: 0, hpBefore: 0, hpAfter: 0, hpLost: 0,
    woundApplied: false, fallen: false, mob: null,
  };
  if (amount <= 0) return zero;

  /* --- Permission: relay to the active GM if we can't update this actor --- */
  if (!actor.isOwner && !game.user.isGM) {
    if (!allowRelay) {
      ui.notifications.warn(`You don't have permission to apply damage to "${actor.name}".`);
      return null;
    }
    if (!game.users.activeGM) {
      ui.notifications.warn("No GM is connected — damage can't be applied right now.");
      return null;
    }
    game.socket.emit(SOCKET, {
      type:      "applyDamage",
      actorUuid: actor.uuid,
      amount,
      options:   { applyArmor, half },
    });
    ui.notifications.info(`Damage sent to the GM to apply to "${actor.name}".`);
    return { ...zero, relayed: true };
  }

  /* --- MOB path: 1 hit per damage instance (manual p.291) --- */
  if (actor.type === "foe" && actor.system?.foeClass === "mob") {
    const hitsBefore = actor.system.mob?.hitsRemaining ?? 0;
    if (hitsBefore <= 0) return { ...zero, isMob: true };
    const hitsAfter    = Math.max(0, hitsBefore - 1);
    const membersAfter = Math.ceil(hitsAfter / 2);   // 2 hits per member
    await actor.update({
      "system.mob.hitsRemaining": hitsAfter,
      "system.mob.members":       membersAfter,
    });
    if (chatConfirm) {
      await ChatMessage.create({
        speaker: { alias: "Damage Applied" },
        content: `<div class="icon-chat-card icon-chat-card--apply">
                    <strong>${escapeHTML(actor.name)}</strong>: 1 hit removed
                    <br><small>hits ${hitsBefore} → ${hitsAfter} (${membersAfter} members remaining)</small>
                    ${hitsAfter === 0 ? "<br><strong>Mob defeated!</strong>" : ""}
                  </div>`,
      });
    }
    return {
      ...zero, isMob: true, applied: 1, hpLost: 1,
      fallen: hitsAfter === 0,
      mob: { hitsBefore, hitsAfter, membersAfter },
    };
  }

  const p    = paths(actor);
  const cont = p.container ?? {};

  /* --- Armor, then halving (armor applies before the ½, per the manual) --- */
  const armor        = applyArmor ? getActorArmor(actor) : 0;
  const afterArmor   = Math.max(0, amount - armor);
  const armorBlocked = amount - afterArmor;
  const applied      = half ? Math.floor(afterArmor / 2) : afterArmor;

  /* --- Vigor absorbs first, then HP — one atomic update --- */
  const curVigor      = cont.vigor?.value ?? 0;
  const vigorAbsorbed = Math.min(Math.max(0, curVigor), applied);
  const remaining     = applied - vigorAbsorbed;
  const hpBefore      = cont.hp?.value ?? 0;
  const hpAfter       = Math.max(0, hpBefore - remaining);

  const updates = {};
  if (vigorAbsorbed > 0)     updates[p.vigor] = curVigor - vigorAbsorbed;
  if (hpAfter !== hpBefore)  updates[p.hp]    = hpAfter;
  if (Object.keys(updates).length) await actor.update(updates);

  let woundApplied = false;
  let fallen       = false;
  if (remaining > 0 && hpAfter === 0 && actor.type === "icon") {
    const result = await _applyWound(actor);
    woundApplied = true;
    fallen       = result.fallen;
  }

  if (chatConfirm) {
    const parts = [];
    if (armorBlocked > 0)  parts.push(`${armorBlocked} blocked by Armor`);
    if (half)              parts.push("halved");
    if (vigorAbsorbed > 0) parts.push(`${vigorAbsorbed} absorbed by Vigor`);
    parts.push(`${hpBefore - hpAfter} → HP`);
    await ChatMessage.create({
      speaker: { alias: "Damage Applied" },
      content: `<div class="icon-chat-card icon-chat-card--apply">
                  <strong>${escapeHTML(actor.name)}</strong>: <strong>${applied}</strong> damage applied
                  <br><small>${parts.join(", ")} — HP ${hpBefore} → ${hpAfter}</small>
                </div>`,
    });
  }

  return {
    ok: true, relayed: false, isMob: false,
    applied, armorBlocked, vigorAbsorbed,
    hpBefore, hpAfter, hpLost: hpBefore - hpAfter,
    woundApplied, fallen, mob: null,
  };
}

/* ================================================== */
/*  Wound System                                       */
/* ================================================== */

/**
 * Apply one wound to an icon-type actor.
 * Each wound permanently reduces hp.max by VIT (handled in prepareDerivedData).
 * 4 wounds = Fallen (exits campaign).
 *
 * @param {Actor} actor
 * @returns {Promise<{wounds, fallen}>}
 */
export async function applyWound(actor) {
  return _applyWound(actor);
}

async function _applyWound(actor) {
  if (actor.type !== "icon") return { wounds: 0, fallen: false };

  const wounds    = (actor.system.combat?.wounds?.value ?? 0) + 1;
  const fallen    = wounds >= 4;
  const vit       = actor.system.combat?.vit ?? 10;

  const updates = { "system.combat.wounds.value": Math.min(wounds, 4) };

  if (fallen) {
    updates["system.combat.hp.value"] = 0;
    // Apply incapacitated status
    await _setStatus(actor, "incapacitated", true);
  } else {
    // Defeated: set HP to 1 (can be Rescued); max HP will recalc via prepareDerivedData
    // We set HP to the new minimum segment (vit = 25% max)
    updates["system.combat.hp.value"] = 1;
    await _setStatus(actor, "incapacitated", true);
  }

  await actor.update(updates);

  /* --- Chat notification --- */
  const speaker = ChatMessage.getSpeaker({ actor });
  if (fallen) {
    await ChatMessage.create({
      speaker,
      content: `<div class="icon-chat-card icon-chat-card--fallen">
        <strong>✕ ${escapeHTML(actor.name)} has Fallen!</strong>
        <p>Dead or irrevocably changed. Exits the campaign.</p>
      </div>`,
    });
  } else {
    await ChatMessage.create({
      speaker,
      content: `<div class="icon-chat-card icon-chat-card--wound">
        ⚠ <strong>${escapeHTML(actor.name)}</strong> is <em>Defeated!</em>
        (Wound ${wounds}/4 — max HP reduced by ${vit}. Can be Rescued.)
      </div>`,
    });
  }

  return { wounds, fallen };
}

/** Heal wounds after combat or interlude. */
export async function clearWounds(actor, count = 1) {
  if (actor.type !== "icon") return;
  const wounds = actor.system.combat?.wounds?.value ?? 0;
  await actor.update({ "system.combat.wounds.value": Math.max(0, wounds - count) });
}

/* ================================================== */
/*  Post-combat HP recovery                            */
/* ================================================== */

/**
 * After combat ends, heal each icon to the next 25% HP segment.
 * "or 50% if at 25% or lower" (per spec).
 */
export async function postCombatHeal(actor) {
  if (actor.type !== "icon") return;
  const { hp, vit } = actor.system.combat;
  if (hp.value <= 0) return;   // Defeated/Fallen — don't auto-heal

  const seg = vit;  // Each 25% segment = VIT
  let newHp;

  if (hp.value <= seg) {
    // At 25% or lower → heal to 50%
    newHp = seg * 2;
  } else {
    // Heal to the next segment boundary STRICTLY above current HP. Using
    // floor(value/seg)+1 (not ceil) so a character sitting exactly on a
    // boundary (e.g. exactly 50% HP) still advances to the next segment
    // instead of receiving no healing at all.
    const nextSeg = Math.floor(hp.value / seg) + 1;
    newHp = Math.min(nextSeg * seg, hp.max);
  }

  if (newHp > hp.value) {
    await actor.update({ "system.combat.hp.value": newHp });
  }
}

/* ================================================== */
/*  Vigor System                                       */
/* ================================================== */

/**
 * Grant vigor to an actor (capped at VIT). Works for PCs, foes, and legends.
 * @param {Actor}   actor
 * @param {number}  amount   Vigor to add (ignored if surge = true)
 * @param {boolean} surge    true = vigor surge (fill to max immediately)
 */
export async function addVigor(actor, amount = 0, surge = false) {
  const p    = paths(actor);
  const cont = p.container;
  if (!cont?.vigor) return;
  const max    = cont.vit;     // vigor.max = VIT
  const newVal = surge
    ? max
    : Math.min((cont.vigor.value ?? 0) + amount, max);
  await actor.update({ [p.vigor]: newVal });
}

/** Remove all vigor from an actor (called at combat end). */
export async function clearVigor(actor) {
  const p    = paths(actor);
  const cont = p.container;
  if (!cont?.vigor) return;
  if ((cont.vigor.value ?? 0) === 0) return;
  await actor.update({ [p.vigor]: 0 });
}

/* ================================================== */
/*  Recover action                                     */
/* ================================================== */

/**
 * Execute the Recover basic action (2 actions):
 *   • Cure self: 4 vigor (or Vigor Surge if bloodied)
 *   • Then save vs all current statuses
 */
export async function recoverAction(actor) {
  const combat     = actor.system?.combat;
  if (!combat)     return;
  const bloodied   = combat.hp.value <= combat.hp.bloodied;
  const surge      = bloodied;
  await addVigor(actor, surge ? 0 : 4, surge);

  const speaker = ChatMessage.getSpeaker({ actor });
  await ChatMessage.create({
    speaker,
    content: `<div class="icon-chat-card">
      <strong>${escapeHTML(actor.name)}</strong> Recovers.
      ${surge ? "Vigor Surge (bloodied)!" : "Gains 4 Vigor."}
    </div>`,
  });

  // Status saves handled externally by the save automation hook.
}

/* ================================================== */
/*  Shared ability/action damage card                  */
/* ================================================== */

/**
 * Roll the damage for a parsed ability/action chunk, build the breakdown
 * steps, collect the user's current targets, and post the damage chat card
 * (with per-target Apply buttons + the icon-system damage flags).
 *
 * Shared by IconSheet / FoeSheet / LegendSheet / SummonSheet so the dice math,
 * mitigation order, target collection, and card markup live in ONE place
 * instead of four near-identical copies.
 *
 * Mitigation order: dice → fray → flat → +Vulnerable → ½Resistance →
 * ½Pacified (attacker) → −2 Weakened. Target Armor is applied later, on the
 * "Apply Damage" button, from the defender's own armor value.
 *
 * @param {Actor}  actor                Attacking actor (speaker + damage flag).
 * @param {object} opts
 * @param {object} opts.parsed          { hit, miss, area } from _parseAbilityDamage.
 * @param {string} opts.outcome         "hit" | "crit" | "miss" | "area".
 * @param {string} opts.damagedie       e.g. "d6" — resolved by caller per actor type.
 * @param {number} opts.fray            fray value resolved by caller.
 * @param {string} opts.abilityName
 * @param {number} [opts.bonusDice=0]
 * @param {boolean}[opts.vulnerable=false]
 * @param {boolean}[opts.resistance=false]
 * @param {boolean}[opts.weakened=false]
 * @param {string} [opts.targetName=""]
 * @returns {Promise<{net:number}>}
 */
export async function postAbilityDamageCard(actor, {
  parsed, outcome = "hit", damagedie = "d6", fray = 0, abilityName = "Attack",
  bonusDice = 0, vulnerable = false, resistance = false, weakened = false,
  targetName = "",
} = {}) {
  // Select the parsed chunk for the chosen outcome.
  const chunk = outcome === "miss" ? parsed.miss
              : outcome === "area" ? parsed.area
              : parsed.hit;

  // ICON crit rule: +1[D] on top of the normal dice.
  let diceMult = chunk.mult;
  if (outcome === "crit") diceMult = Math.max(1, diceMult) + 1;

  const effectiveFray = chunk.fray ? fray : 0;
  const effectiveFlat = chunk.flat ?? 0;

  const rolls = [];
  const steps = [];
  let diceTotal = 0;

  // Auto-apply the attacker's "Bonus Damage" condition: each charge adds one
  // extra [D] to the pool, on top of any bonus dice entered in the dialog. The
  // charges are consumed (detached) after the card is posted (see below).
  const statusBonusDice = getStatusCharges(actor, "bonus-damage");
  const bonus     = Math.max(0, (Number(bonusDice) || 0) + statusBonusDice);
  const bonusNote = statusBonusDice > 0 ? ` (incl. ${statusBonusDice} from Bonus Damage)` : "";

  // Bonus damage: roll N+K dice and sum the top N (N = base dice count).
  if (diceMult > 0) {
    const totalDice = diceMult + bonus;
    const dRoll     = await new Roll(`${totalDice}${damagedie}`).evaluate();
    rolls.push(dRoll);
    const results = dRoll.dice[0].results.map(d => d.result);
    const sorted  = [...results].sort((a, b) => b - a);
    const kept    = sorted.slice(0, diceMult);
    const dropped = sorted.slice(diceMult);
    diceTotal     = kept.reduce((acc, v) => acc + v, 0);
    const droppedStr = dropped.length ? ` <em>(dropped: ${dropped.join(",")})</em>` : "";
    const formula = bonus > 0
      ? `${diceMult}[${damagedie}] +${bonus} bonus${bonusNote} → roll ${totalDice}${damagedie}, keep top ${diceMult}`
      : `${diceMult}[${damagedie}]`;
    steps.push({ label: `${formula}: [${kept.join(",")}]${droppedStr}`, value: diceTotal });
  } else if (bonus > 0) {
    // No base dice but bonus set: roll the bonus dice and pick the highest.
    const bRoll = await new Roll(`${bonus}${damagedie}`).evaluate();
    rolls.push(bRoll);
    const best  = Math.max(...bRoll.dice[0].results.map(d => d.result));
    diceTotal  += best;
    steps.push({ label: `Bonus ${bonus}[${damagedie}]${bonusNote} (pick highest: ${best})`, value: best });
  }

  if (effectiveFray > 0) steps.push({ label: "Fray", value: effectiveFray });
  if (effectiveFlat > 0) steps.push({ label: `Flat (${effectiveFlat})`, value: effectiveFlat });

  let running = diceTotal + effectiveFray + effectiveFlat;
  if (vulnerable) { running += 1; steps.push({ label: "Vulnerable", value: 1 }); }
  // NOTE: target Armor is NOT subtracted here. It is applied automatically when
  // the defender presses "Apply Damage" on the card (see icon.mjs), using that
  // actor's own armor value, so it can never be forgotten in the attacker dialog.
  if (resistance) {
    const halved = Math.floor(running / 2);
    steps.push({ label: "Resistance (halved)", value: halved - running, isNegative: true });
    running = halved;
  }
  // Pacified (attacker): "deal half damage". Auto-applied from the attacker's
  // own status so it can't be forgotten — previously this status had no effect.
  if (hasActiveStatus(actor, "pacified")) {
    const halved = Math.floor(running / 2);
    steps.push({ label: "Pacified (½)", value: halved - running, isNegative: true });
    running = halved;
  }
  if (weakened) {
    running = Math.max(0, running - 2);
    steps.push({ label: "Weakened −2", value: -2, isNegative: true });
  }

  const net = Math.max(0, running);
  if (steps.length > 0) steps[steps.length - 1].isFinal = true;

  // Collect the user's current targets for the Apply buttons. DEF/HP read the
  // PC path first, then the foe/legend path, so foe targets show real numbers.
  const targets = Array.from(game.user?.targets ?? []).map(t => ({
    tokenId:   t.id,
    actorUuid: t.actor?.uuid ?? null,
    name:      t.actor?.name ?? t.document?.name ?? "Unknown",
    img:       t.actor?.img  ?? t.document?.texture?.src ?? "",
    defense:   t.actor?.system?.combat?.defense ?? t.actor?.system?.defense ?? null,
    hp:        t.actor?.system?.combat?.hp?.value ?? t.actor?.system?.hp?.value ?? null,
    hpMax:     t.actor?.system?.combat?.hp?.max   ?? t.actor?.system?.hp?.max   ?? null,
  })).filter(t => t.actorUuid);

  const content = await renderTemplate(`${TPLPATH}/damage-card.hbs`, {
    steps,
    finalDamage: net,
    targetName:  targetName || "",
    targets,
    hasTargets:  targets.length > 0,
    outcome,
  });

  const flavor = outcome === "crit" ? `${abilityName} — Critical!`
               : outcome === "miss" ? `${abilityName} — Miss (fray only)`
               : outcome === "area" ? `${abilityName} — Area damage`
               : `${abilityName} — Hit`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor,
    content,
    rolls,
    flags: {
      "icon-system": {
        damage: {
          amount:          net,
          sourceActorUuid: actor.uuid,
          sourceName:      actor.name,
          abilityName,
          outcome,
          targets: targets.map(t => t.actorUuid),
        },
      },
    },
  });

  // Detach the Bonus Damage condition — it's a one-shot buff consumed by the
  // attack it boosted. Clearing to 0 removes the underlying status effect.
  if (statusBonusDice > 0) {
    await setStatusCharges(actor, "bonus-damage", 0);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="icon-chat-card"><strong>${escapeHTML(actor.name)}</strong> consumed <strong>Bonus Damage</strong> (${statusBonusDice} extra [${damagedie}]).</div>`,
    });
  }

  return { net };
}

/* ================================================== */
/*  Internal helpers                                   */
/* ================================================== */

async function _setStatus(actor, statusId, active) {
  // Look for existing status effect
  const existing = actor.effects.find(e =>
    e.statuses?.has(statusId) || e.getFlag("core", "statusId") === statusId
  );
  if (active && !existing) {
    const statusDef = CONFIG.statusEffects.find(s => s.id === statusId);
    if (!statusDef) return;
    await actor.createEmbeddedDocuments("ActiveEffect", [{
      name:   statusDef.name ?? statusId,
      img:    statusDef.img  ?? "icons/svg/skull.svg",
      statuses: [statusId],
      flags: { core: { statusId }, "icon-system": { isStatus: true, ongoing: false, canSave: false } },
    }]);
  } else if (!active && existing) {
    await existing.delete();
  }
}
