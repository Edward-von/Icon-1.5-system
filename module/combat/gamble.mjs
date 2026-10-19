/**
 * gamble.mjs — the clickable Gamble of an ability (R25).
 *
 * Gamble (p.148): "Roll 1d6, then trigger an effect on a certain result or
 * higher". Some effects roll more dice (Riposte's Dire Parry: one extra d6 per
 * Vigilance charge spent, p.142) and only the highest die counts, as with
 * Vigilance (p.105) — so N dice are rolled as Nd6kh, never added up. The
 * Fool's Stacked Die makes the result 6 (p.149); a few effects let a chosen
 * number stand (Silver Rabbit III p.250, Golden Mask p.340).
 *
 * The button sits on the ability preview of the PC sheet and on the Show in
 * Chat card; both open promptGamble() and post templates/chat/gamble-card.hbs.
 * A Seer's gamble card also has the Bend Fate button (p.199, bendFate below).
 */
import { promptGamble } from "../apps/roll-dialogs.mjs";
import { enrichHTML, rollTableRow, abilityCostLabel } from "../helpers/enrich.mjs";
import { resolveAbilityTags, resolveAbilityCost } from "../helpers/rule-tooltips.mjs";
import { tagKey } from "./defenses.mjs";
import { comboReplacesBase } from "../helpers/ability-blocks.mjs";
import { isSeer, seerHand, pickHandCards, seerDiscard, buttonUsed, markButtonUsed, markDone, WHEEL_PAGE } from "./wheel-of-fate.mjs";

const _log = (...a) => console.debug("[ICON | gamble]", ...a);

const renderTemplate = (path, data) =>
  (foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate)(path, data);

/**
 * The texts of the ability that are in play: its own blocks, the selected
 * talent, the unlocked mastery and the combo version. In reading order — the
 * first one with a 1-6 table gives the row printed on the card.
 *
 * `comboMode` says which version is in play: true = the combo (a complete
 * combo ability like Astra's FORTUNA, p.201, replaces every base block, so the
 * base's "Gamble, then deal that much damage again" is not part of it; talents
 * and mastery apply to all versions), false = the base alone, null = both
 * texts, as before (the gamble roll itself, which doesn't know the version).
 */
function _activeTexts(s, comboMode = null) {
  const sel = Number(s.talentSelected ?? 0);
  const comboOnly = comboMode === true && comboReplacesBase(s.comboEffect, s);
  const base = comboOnly ? [] : [
    s.interruptTrigger, s.description, s.hitEffect, s.missEffect, s.areaEffect,
    s.chargeEffect, s.heroicEffect, s.exceedEffect, s.collideEffect, s.slayEffect,
    s.critEffect, s.finishingBlowEffect, s.comebackEffect,
  ];
  return [
    ...base,
    sel === 1 ? s.talent1 : "", sel === 2 ? s.talent2 : "",
    s.masteryUnlocked ? s.mastery : "",
    s.isCombo && comboMode !== false ? s.comboEffect : "",
  ].map(t => String(t ?? "")).filter(t => t.trim());
}

/**
 * Does this ability gamble? Its "gamble" tag, or the word in a text in play.
 * Pass the tags of the version in play and `comboMode` (see _activeTexts), so
 * the combo's card doesn't get the base's Gamble button (Fortuna, P19).
 */
export function abilityGambles(system, tags = null, { comboMode = null } = {}) {
  const s = system ?? {};
  const list = tags ?? resolveAbilityTags(s, { comboMode: comboMode === true });
  if (list.some(t => tagKey(t) === "gamble")) return true;
  return _activeTexts(s, comboMode).some(t => /\bgambl(?:e|es|ed|ing)\b/i.test(t));
}

/**
 * Open the gamble dialog for `item` (an ability on `actor`), roll, post the
 * card, and take the spent Vigilance charges / Stacked Die off the trackers.
 */
export async function rollGamble(actor, item) {
  if (!actor) return;
  if (!item) { ui.notifications.warn("This ability is no longer on the character."); return; }
  if (!actor.isOwner) { ui.notifications.warn("Only the owner of this character can gamble with it."); return; }
  const s   = item.system ?? {};
  const cr  = actor.system?.combat?.classResources ?? {};
  const texts = _activeTexts(s);
  // Vigilance field only where the ability spends charges on its gamble (Dire Parry, p.142).
  const spendsVigilance = texts.some(t => /vigilance[^.]*gambl|gambl[^.]*vigilance/i.test(t));
  const vigilance = spendsVigilance ? (cr.vigilance?.value ?? 0) : 0;
  const stacked   = cr.stackedDice?.value ?? 0;
  const { tags, ...cost } = resolveAbilityCost(s, resolveAbilityTags(s));

  const pick = await promptGamble({ name: item.name, cost: abilityCostLabel(cost.key), tags }, actor, { vigilance, stacked });
  if (!pick) return;

  let roll = null, dice = [], result, how;
  if (pick.mode === "stacked") {
    result = 6;
    how = "Stacked Die: the result becomes 6 (p.149)";
  } else if (pick.mode === "set") {
    result = pick.value;
    how = `Number set to ${result} (no roll)`;
  } else {
    const n = pick.dice + pick.vigilance;
    // kh = keep the highest die: the dice never add up (p.105).
    roll = await new Roll(n > 1 ? `${n}d6kh` : "1d6").evaluate();
    result = roll.total;
    let picked = false;
    dice = (roll.dice[0]?.results ?? []).map(r => {
      const isPicked = !picked && r.active !== false && !r.discarded && r.result === result;
      if (isPicked) picked = true;
      return { value: r.result, picked: isPicked, isSix: r.result === 6 };
    });
    how = n > 1 ? `${n}d6, highest die${pick.vigilance ? ` (${pick.vigilance} from Vigilance)` : ""}` : "1d6";
  }

  // The matching row of a 1-6 table in the ability's text (formatRollTables, R11).
  let tableRow = "";
  for (const t of texts) {
    const row = rollTableRow(t, result);
    if (row) { tableRow = await enrichHTML(row); break; }
  }

  // Bend Fate (Seer, p.199): offered after a real roll, while the hand has cards.
  const bendFate = pick.mode === "roll" && isSeer(actor) && (seerHand(actor)?.cards.size ?? 0) > 0;
  const content = await renderTemplate("systems/icon-system/templates/chat/gamble-card.hbs", {
    name: item.name, cls: s.class ?? "", dice, result, how, tableRow,
    isSix: result === 6, spentVigilance: pick.mode === "roll" ? pick.vigilance : 0,
    bendFate, actorUuid: actor.uuid, page: WHEEL_PAGE,
  });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: { "icon-system": { gamble: { actorUuid: actor.uuid, itemId: item.id, dice: dice.map(d => d.value) } } },
    ...(roll ? { rolls: [roll] } : {}),   // Dice So Nice reads this
  });
  _log(`gamble — "${actor.name}" / "${item.name}" | ${how} → ${result}`);

  const update = {};
  if (pick.mode === "roll" && pick.vigilance > 0) {
    update["system.combat.classResources.vigilance.value"] = Math.max(0, (cr.vigilance?.value ?? 0) - pick.vigilance);
  }
  if (pick.mode === "stacked") {
    update["system.combat.classResources.stackedDice.value"] = Math.max(0, stacked - 1);
  }
  if (Object.keys(update).length) await actor.update(update);
  // The result, for the callers that act on it (Amico's Detonate, follow-marks.mjs); undefined when cancelled.
  return result;
}

/**
 * Bend Fate (Seer trait, p.199): "You can discard any number of cards after you gamble to roll an extra die
 * per card discarded, choosing any result. You can repeat this effect any number of times as long as you
 * have cards, and you can choose to discard after you see each result."
 * From the button of a gamble card: pick the cards, they go to the discard pile, one d6 each is rolled and a
 * new card shows every die so far with the table row of each result (the player picks one). That card has the
 * button again, to discard more after seeing the dice.
 */
export async function bendFate(message, btn) {
  const flag = message?.getFlag("icon-system", "gamble");
  let actor = null;
  try { actor = fromUuidSync(flag?.actorUuid ?? btn.dataset.actorUuid); } catch { actor = null; }
  if (!actor?.isOwner) { ui.notifications.warn("Only the Seer's owner can bend fate."); return; }
  if (buttonUsed(actor, message, "bend")) { markDone(btn); return; }
  const hand = seerHand(actor);
  if (!hand?.cards.size) { ui.notifications.warn(hand ? `${hand.name} has no cards to discard.` : `No Cards hand found for ${actor.name}.`); return; }
  const ids = await pickHandCards(hand, {
    title: "Bend Fate",
    intro: `Discard any number of cards: one extra die per card, then choose any result (p.${WHEEL_PAGE}).`,
  });
  if (!ids) return;
  const names = await seerDiscard(actor, hand, ids);
  if (!names) return;
  await markButtonUsed(actor, message, "bend");
  markDone(btn);

  const item = actor.items.get(flag?.itemId);
  const s = item?.system ?? {};
  const roll = await new Roll(`${ids.length}d6`).evaluate();
  const added = (roll.dice[0]?.results ?? []).map(r => r.result);
  const before = (flag?.dice ?? []).map(Number).filter(n => n >= 1 && n <= 6);
  const all = [...before, ...added];
  const best = Math.max(...all);
  let picked = false;
  const dice = all.map((v, i) => {
    const isPicked = !picked && v === best;
    if (isPicked) picked = true;
    return { value: v, picked: isPicked, isSix: v === 6, added: i >= before.length };
  });
  // The table row of each result there is, highest first: the player chooses one.
  const choices = [];
  const texts = item ? _activeTexts(s) : [];
  for (const v of [...new Set(all)].sort((a, b) => b - a)) {
    let row = "";
    for (const t of texts) {
      const r = rollTableRow(t, v);
      if (r) { row = await enrichHTML(r); break; }
    }
    if (row) choices.push({ value: v, row });
  }
  const content = await renderTemplate("systems/icon-system/templates/chat/gamble-card.hbs", {
    name: item?.name ?? "Gamble", cls: s.class ?? "", dice, result: best,
    how: `Bend Fate: ${ids.length} card${ids.length === 1 ? "" : "s"} discarded (${names.join(", ")}), +${ids.length}d6 — choose any result`,
    tableRow: "", choices, chooseAny: true, isSix: best === 6, spentVigilance: 0,
    bendFate: hand.cards.size > 0, actorUuid: actor.uuid, page: WHEEL_PAGE,
  });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    flags: { "icon-system": { gamble: { actorUuid: actor.uuid, itemId: flag?.itemId ?? "", dice: all } } },
    rolls: [roll],
  });
  _log(`bend fate — "${actor.name}" | discarded ${names.join(", ")} | dice ${all.join(", ")}`);
}
