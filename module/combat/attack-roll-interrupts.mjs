/**
 * module/combat/attack-roll-interrupts.mjs — interrupts that change an attack
 * roll after it is made: the Sealer's Godly Smite (p.191).
 *
 *   "Godly Smite — Interrupt 1. Trigger: You or an ally makes an attack roll,
 *    and you see the total result (after boons, curses, and other
 *    adjustments). Effect: Add the number on your mantra die to the attack
 *    roll, which changes the final result. That foe also takes damage again
 *    after the attack resolves equal to the number on your mantra die."
 *
 * On an attack-roll card (rolls.mjs combatRoll, flags.icon-system.attack with
 * its `result`), each Sealer the current user plays on the attacker's side
 * gets a "Godly Smite +N" button. Pressing it spends the interrupt's use
 * (damage-interrupts.mjs) and posts a Godly Smite card carrying
 * flags.icon-system.smite = { attackMessageId, ownerUuid, amount }. The attack
 * card reads those cards when it renders: new total, new result. The Godly
 * Smite card has one "N damage" button per target of the attack, for the
 * damage "again after the attack resolves" (armor applies, as to any damage).
 *
 * Nothing changes the attack card's own data, so a player's Sealer can smite
 * an attack card another user posted.
 */

import { escapeHTML } from "../helpers/enrich.mjs";
import { hasStatus } from "./statuses.mjs";
import { interruptsOf, interruptLeft, spendUse, sideOf, userPlays, sceneCharacters, refreshInterruptButtons } from "./damage-interrupts.mjs";
import { powerDieView } from "../data/item/power-die.mjs";

const _log = (...a) => console.debug("[ICON | AttackRollInterrupts]", ...a);
const FLAG_NS = "icon-system";

/** Godly Smite among a character's interrupts (the trait's "Interrupt 1: Trigger: … Effect: …"), or null. */
function godlySmiteOf(actor) {
  return interruptsOf(actor).find(i => i.kind === "trait" && /^godly smite$/i.test(i.name)) ?? null;
}

/** The number on the mantra die (the Godly Smite trait's power die), 0 when it is not set out. */
function mantraValue(actor, it) {
  const item = actor?.items?.get(it?.itemId);
  return powerDieView(item?.system)?.value ?? 0;
}

/** The Godly Smite cards posted on one attack card, in order. */
function smitesOn(attackMessageId) {
  return (game.messages?.contents ?? []).filter(m => m.flags?.[FLAG_NS]?.smite?.attackMessageId === attackMessageId);
}

/** The attack's result with the smites added: { total, isHit, isCrit, isExceed, added }. */
function smitedResult(r, smites) {
  const added = smites.reduce((n, m) => n + (Number(m.flags[FLAG_NS].smite.amount) || 0), 0);
  const total = Number(r.total) + added;
  return {
    total, added,
    isCrit:   total >= Number(r.critAt),
    isHit:    r.defense != null ? total >= Number(r.defense) : null,
    isExceed: total >= Number(r.exceedAt) || !!r.forceExceed,
  };
}

function resultLabel({ isCrit, isHit, isExceed, total }) {
  const base = isCrit ? "CRITICAL HIT" : isHit ? "HIT" : isHit === false ? "MISS" : `Total: ${total}`;
  return isExceed && !isCrit && isHit !== false ? `${base} · EXCEED` : base;
}

/* -------------------------------------------------- */
/*  The attack card                                     */
/* -------------------------------------------------- */

/**
 * On an attack-roll card: the new total once smitten, and a Godly Smite
 * button for each Sealer the current user plays on the attacker's side.
 * Called by the renderChatMessageHTML hook (icon.mjs) on every render.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function decorateAttackRollInterrupts(message, html) {
  const atk = message?.flags?.[FLAG_NS]?.attack;
  const r = atk?.result;
  if (!atk?.roll || !r || r.evaded) return;
  const card = html.querySelector(".icon-chat-card");
  if (!card) return;

  const smites = smitesOn(message.id);
  if (smites.length) _showSmitten(card, r, smites);

  if (card.querySelector(".icon-chat-card__interrupts--roll")) return;
  let attacker = null;
  try { attacker = atk.sourceActorUuid ? fromUuidSync(atk.sourceActorUuid) : null; } catch { attacker = null; }
  if (!attacker) return;
  const side = sideOf(attacker);
  const owners = [{ actor: attacker }, ...sceneCharacters().filter(c => c.actor.uuid !== attacker.uuid && sideOf(c.actor, c.tokenId) === side)];
  const buttons = [];
  for (const o of owners) {
    if (!userPlays(o.actor)) continue;
    const it = godlySmiteOf(o.actor);
    if (!it) continue;
    buttons.push(_buttonHtml(o.actor, it, message.id, smites));
  }
  if (!buttons.length) return;
  const box = document.createElement("div");
  box.className = "icon-chat-card__interrupts icon-chat-card__interrupts--roll";
  box.innerHTML = `<span class="icon-chat-card__interrupts-label" title="Interrupts whose trigger is seeing the total of an attack roll: they change the result">Interrupt · attack roll</span>`
    + buttons.join("");
  card.appendChild(box);
  box.querySelectorAll('[data-action="godlySmite"]').forEach(btn => btn.addEventListener("click", async ev => {
    ev.preventDefault(); ev.stopPropagation();
    if (btn.dataset.iconBusy) return;
    btn.dataset.iconBusy = "true";
    btn.disabled = true;
    try { await useGodlySmite(message, btn.dataset.ownerUuid); }
    catch (err) { console.error("ICON 1.5 | Godly Smite failed:", err); ui.notifications.error("Godly Smite failed (see console)."); }
    finally { delete btn.dataset.iconBusy; refreshInterruptButtons(btn.dataset.ownerUuid); }
  }));
}

function _buttonHtml(owner, it, attackMessageId, smites) {
  const { left, max } = interruptLeft(owner, it);
  const n = mantraValue(owner, it);
  const stunned = hasStatus(owner, "stunned");
  const done = smites.some(m => m.flags[FLAG_NS].smite.ownerUuid === owner.uuid);
  const why = done ? "Already used on this attack."
    : stunned ? "Stunned: can't take interrupts."
    : !n ? "The mantra die is not set out (it is set out at the start of combat)."
    : left <= 0 ? "No uses left this round." : "";
  const title = `Godly Smite (Interrupt ${it.limit}) — ${owner.name}. Adds the mantra die (${n}) to this attack roll, `
    + `then the target takes ${n} damage again after the attack resolves (p.191).${why ? `\n${why}` : ""}`;
  return `<button type="button" class="icon-chat-btn icon-chat-btn--interrupt" data-action="godlySmite"
            data-owner-uuid="${escapeHTML(owner.uuid)}" data-attack-id="${escapeHTML(attackMessageId)}"
            title="${escapeHTML(title)}" ${why ? "disabled" : ""}>
            <i class="fa-solid fa-hand-fist"></i> Godly Smite +${n}<small> · ${escapeHTML(owner.name)} ${done ? "used" : `${left}/${max}`}</small>
          </button>`;
}

/** Rewrite the total and the result of a smitten attack card. */
function _showSmitten(card, r, smites) {
  const res = smitedResult(r, smites);
  const totalEl = card.querySelector(".icon-chat-card__total");
  if (totalEl && !totalEl.dataset.iconSmite) {
    totalEl.dataset.iconSmite = "true";
    totalEl.insertAdjacentHTML("beforebegin", `<s class="icon-chat-card__total-old">${escapeHTML(r.total)}</s>`);
  }
  if (totalEl) totalEl.textContent = String(res.total);
  card.classList.toggle("icon-chat-card--crit", res.isCrit);
  card.classList.toggle("icon-chat-card--hit", !res.isCrit && res.isHit === true);
  card.classList.toggle("icon-chat-card--miss", res.isHit === false);
  const resultEl = card.querySelector(".icon-chat-card__result");
  if (resultEl) {
    const kind = res.isCrit ? "crit" : res.isHit ? "hit" : res.isHit === false ? "miss" : "";
    const who = smites.map(m => { const s = m.flags[FLAG_NS].smite; return `+${s.amount} ${s.ownerName ?? ""}`.trim(); }).join(", ");
    const changed = resultLabel(res) !== resultLabel(smitedResult(r, []));
    resultEl.innerHTML = `<strong class="icon-chat-card__result-label${kind ? ` icon-chat-card__result-label--${kind}` : ""}">${escapeHTML(resultLabel(res))}</strong>`
      + `<small class="icon-chat-card__result-note">Godly Smite (${escapeHTML(who)}): total ${escapeHTML(r.total)} → ${res.total}.`
      + `${changed ? " The Hit / Miss / Exceed lines below are still dimmed for the old total." : ""}</small>`;
  }
}

/* -------------------------------------------------- */
/*  Pressing the button                                 */
/* -------------------------------------------------- */

/**
 * Spend Godly Smite's use and post its card on this attack.
 * @param {ChatMessage} attackMessage
 * @param {string} ownerUuid  the Sealer
 * @returns {Promise<boolean>}
 */
export async function useGodlySmite(attackMessage, ownerUuid) {
  const owner = await fromUuid(ownerUuid ?? "");
  const it = owner ? godlySmiteOf(owner) : null;
  const r = attackMessage?.flags?.[FLAG_NS]?.attack?.result;
  if (!owner || !it || !r) return false;
  const smites = smitesOn(attackMessage.id);
  if (smites.some(m => m.flags[FLAG_NS].smite.ownerUuid === owner.uuid)) { ui.notifications.warn(`${owner.name} already used Godly Smite on this attack.`); return false; }
  if (hasStatus(owner, "stunned")) { ui.notifications.warn(`${owner.name} is Stunned and can't take interrupts.`); return false; }
  const { left, max } = interruptLeft(owner, it);
  if (left <= 0) { ui.notifications.warn(`Godly Smite: no uses left this round (0/${max}).`); return false; }
  const amount = mantraValue(owner, it);
  if (!amount) { ui.notifications.warn(`${owner.name}'s mantra die is not set out: it is set out at the start of combat (p.191).`); return false; }

  await spendUse(owner, it);
  const atk = attackMessage.flags[FLAG_NS].attack;
  const before = smitedResult(r, smites);
  const after = smitedResult(r, [...smites, { flags: { [FLAG_NS]: { smite: { amount } } } }]);
  _log(`use — "${owner.name}" | +${amount} on "${atk.sourceName}"'s ${atk.abilityName} | ${before.total} → ${after.total} | left ${left - 1}/${max}`);

  const changed = resultLabel(before) !== resultLabel(after) ? ` (was ${escapeHTML(resultLabel(before))})` : "";
  const dmgButtons = (atk.targets ?? []).map(t =>
    `<button type="button" class="icon-chat-btn" data-action="godlySmiteDamage" data-target-uuid="${escapeHTML(t.actorUuid)}"
       title="${escapeHTML(`${t.name}: ${amount} damage, after the attack resolves (armor applies)`)}">
       <i class="fa-solid fa-burst"></i> ${amount} damage · ${escapeHTML(t.name)}</button>`).join("");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: owner }),
    content: `<div class="icon-chat-card icon-chat-card--godly-smite">
      <div class="icon-chat-card__header"><strong>Godly Smite</strong> <span class="icon-badge">Interrupt ${it.limit}</span></div>
      <p><strong>${escapeHTML(owner.name)}</strong> adds the mantra die (<strong>${amount}</strong>) to ${escapeHTML(atk.sourceName)}'s
        <strong>${escapeHTML(atk.abilityName)}</strong>: total ${before.total} → <strong>${after.total}</strong>,
        <strong>${escapeHTML(resultLabel(after))}</strong>${changed}.</p>
      <p><small>After the attack resolves, the target takes ${amount} damage again (p.191). ${left - 1}/${max} use${max === 1 ? "" : "s"} left this round.</small></p>
      ${dmgButtons ? `<div class="icon-chat-card__interrupts">${dmgButtons}</div>` : ""}
    </div>`,
    flags: { [FLAG_NS]: { smite: { attackMessageId: attackMessage.id, ownerUuid: owner.uuid, ownerName: owner.name, amount } } },
  });
  return true;
}

/**
 * When a Godly Smite card arrives, every client redraws the attack card it
 * changed (in the log, its pop-out and the notifications).
 */
export function onSmiteCreated(message) {
  const id = message?.flags?.[FLAG_NS]?.smite?.attackMessageId;
  const attack = id ? game.messages.get(id) : null;
  if (!attack) return;
  document.querySelectorAll(`.chat-message[data-message-id="${CSS.escape(id)}"] .icon-chat-card`).forEach(card => {
    _showSmitten(card, attack.flags[FLAG_NS].attack.result, smitesOn(id));
    card.querySelectorAll('[data-action="godlySmite"]').forEach(btn => {
      if (btn.dataset.ownerUuid !== message.flags[FLAG_NS].smite.ownerUuid) return;
      btn.disabled = true;
      const small = btn.querySelector("small");
      if (small) small.textContent = ` · ${message.flags[FLAG_NS].smite.ownerName ?? ""} used`;
      btn.title = `${btn.title.split("\n")[0]}\nAlready used on this attack.`;
    });
  });
}

/* -------------------------------------------------- */
/*  The Godly Smite card's damage buttons               */
/* -------------------------------------------------- */

/**
 * "N damage · target" on a Godly Smite card: once per target (the flag
 * `smite.dealt` keeps it pressed). Pressed by the card's author or the GM.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function bindSmiteDamageButtons(message, html) {
  const smite = message?.flags?.[FLAG_NS]?.smite;
  if (!smite) return;
  html.querySelectorAll('[data-action="godlySmiteDamage"]').forEach(btn => {
    if (btn.dataset.iconBound) return;
    btn.dataset.iconBound = "true";
    const uuid = btn.dataset.targetUuid;
    if (smite.dealt?.[uuid.replaceAll(".", "_")]) { btn.disabled = true; btn.title = "Damage already applied"; return; }
    if (!message.isOwner) { btn.disabled = true; return; }
    btn.addEventListener("click", async ev => {
      ev.preventDefault(); ev.stopPropagation();
      btn.disabled = true;
      const target = await fromUuid(uuid);
      if (!target) { ui.notifications.warn("That target no longer exists."); return; }
      const { applyDamageInstances } = await import("./damage.mjs");
      _log(`damage — ${smite.amount} to "${target.name}" | card ${message.id}`);
      await applyDamageInstances(target, Number(smite.amount) || 0, 1, { applyArmor: true });
      await message.setFlag(FLAG_NS, `smite.dealt.${uuid.replaceAll(".", "_")}`, true);
    });
  });
}
