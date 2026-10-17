/**
 * wheel-of-fate.mjs — the Seer's deck through the combat (p.199).
 *
 * "The Wheel of Fate: … At the start of any combat, draw up to 5 cards if you
 * have less. Your hand and deck persist through combats, and your maximum hand
 * size is 7 (you must discard down to 7 cards at the end of your turn).
 * Discarded cards go in a discard pile. Once you draw through your deck,
 * shuffle the discard pile and draw it as your new deck"
 * "Skein: Draw a card at the start of your turn. If you didn't attack, draw an
 * extra card at the end of your turn as well." (Seer traits, p.199)
 *
 * The cards are Foundry's own Cards (great-wheel.mjs). The active GM posts a
 * card at the start of combat and at the start / end of each Seer's turn; its
 * buttons draw or discard, clicked by the Seer's owner. Nothing moves on its
 * own. A draw that finds the deck empty shuffles the discard pile back into it
 * first.
 *
 * Which stacks are the Seer's: the hand named after the character (else the
 * only hand its player owns, else the only hand there is); the deck its cards
 * came from (else the deck named after the character, else the only deck); the
 * discard pile named after the character, else the one named "Discard".
 */

import { discardPile, greatWheelEntry } from "./great-wheel.mjs";

const _log = (...a) => console.debug("[ICON | WheelOfFate]", ...a);

const FLAG_NS = "icon-system";
const FLAG_USED = "wheelUsed";   // [ "<messageId>:<op>" ] — buttons already used
export const WHEEL_PAGE = 199;
export const START_HAND = 5;
export const MAX_HAND = 7;

const esc = (v) => foundry.utils.escapeHTML(String(v ?? ""));

/** Is this PC a Seer? Its primary job, or the Seer's traits on the sheet. */
export function isSeer(actor) {
  if (actor?.type !== "icon") return false;
  const jobs = actor.system?.combat?.jobs ?? [];
  const primary = jobs.find(j => j.primary) ?? (jobs.length === 1 ? jobs[0] : null);
  if (/\bseer\b/i.test(primary?.name ?? "")) return true;
  return actor.items.some(i => i.type === "trait" && /wheel of fate|\bskein\b/i.test(i.name ?? ""));
}

/* -------------------------------------------------- */
/*  The Seer's stacks                                  */
/* -------------------------------------------------- */

const _named = (list, actor) => {
  const n = String(actor?.name ?? "").trim().toLowerCase();
  return n ? list.filter(c => String(c.name ?? "").toLowerCase().includes(n)) : [];
};
const _players = (actor) => game.users.filter(u => !u.isGM && actor.testUserPermission(u, "OWNER"));
const _ownedBy = (list, users) => list.filter(c => users.some(u => c.testUserPermission(u, "OWNER")));

/** The Seer's hand, or null when it can't be told. */
export function seerHand(actor) {
  if (!actor) return null;
  const hands = game.cards?.filter(c => c.type === "hand") ?? [];
  const named = _named(hands, actor);
  if (named.length === 1) return named[0];
  const owned = _ownedBy(named.length ? named : hands, _players(actor));
  if (owned.length === 1) return owned[0];
  if (!named.length && hands.length === 1) return hands[0];
  return null;
}

/** The Seer's discard pile: the pile named after them, else the "Discard" pile (great-wheel.mjs). */
export function seerPile(actor) {
  const piles = game.cards?.filter(c => c.type === "pile") ?? [];
  const named = _named(piles, actor);
  if (named.length === 1) return named[0];
  return discardPile();
}

/** The Seer's deck: where the cards of the hand / pile came from, else by name, else the only deck. */
export function seerDeck(actor, hand = seerHand(actor), pile = seerPile(actor)) {
  for (const c of [...(hand?.cards ?? []), ...(pile?.cards ?? [])]) {
    if (c.origin?.type === "deck") return c.origin;
  }
  const decks = game.cards?.filter(c => c.type === "deck") ?? [];
  const named = _named(decks, actor);
  if (named.length === 1) return named[0];
  const wheel = decks.filter(d => d.cards.some(c => greatWheelEntry(c)));
  if (wheel.length === 1) return wheel[0];
  return decks.length === 1 ? decks[0] : null;
}

/* -------------------------------------------------- */
/*  Drawing and discarding                             */
/* -------------------------------------------------- */

async function _post(actor, title, body) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="icon-chat-card icon-chat-card--wheel icon-class--mendicant">
      <div class="icon-chat-card__header"><strong class="icon-chat-card__action">${esc(title)}</strong><span class="icon-badge">Wheel of Fate</span><span class="icon-badge">p.${WHEEL_PAGE}</span></div>
      ${body}
    </div>`,
  });
}

/**
 * Draw `n` cards into the Seer's hand. When the deck runs out, the discard
 * pile's cards from that deck go back into it and it is shuffled (p.199).
 * @returns {Promise<{drawn:number, reshuffled:number}|null>}
 */
export async function seerDraw(actor, n, reason) {
  const hand = seerHand(actor);
  const pile = seerPile(actor);
  const deck = seerDeck(actor, hand, pile);
  if (!hand) { ui.notifications.warn(`No Cards hand found for ${actor.name}: name a hand after the character.`); return null; }
  if (!deck) { ui.notifications.warn(`No deck found for ${actor.name}: name the deck after the character.`); return null; }
  const names = [];
  let need = Math.max(0, n);
  let reshuffled = 0;
  try {
    while (need > 0) {
      const avail = deck.availableCards.length;
      if (!avail) {
        const back = reshuffled ? [] : (pile?.cards.filter(c => c.origin === deck).map(c => c.id) ?? []);
        if (!back.length) break;
        await pile.pass(deck, back, { chatNotification: false });
        await deck.shuffle({ chatNotification: false });
        reshuffled = back.length;
        continue;
      }
      const k = Math.min(need, avail);
      const got = await hand.draw(deck, k, { how: CONST.CARD_DRAW_MODES.RANDOM, chatNotification: false });
      names.push(...(got ?? []).map(c => c.name));
      need -= k;
    }
  } catch (err) {
    console.error("ICON 1.5 | Wheel of Fate draw failed", err);
    ui.notifications.error(`Could not draw: ${err.message} (the player needs Owner permission on the deck, hand and discard pile).`);
    return null;
  }
  const lines = [];
  lines.push(`<p>${esc(reason)}: drew <strong>${names.length}</strong> card${names.length === 1 ? "" : "s"} — ${esc(hand.name)} now holds ${hand.cards.size}.</p>`);
  if (reshuffled) lines.push(`<p><small><i class="fa-solid fa-shuffle"></i> The deck ran out: the discard pile (${reshuffled} card${reshuffled === 1 ? "" : "s"}) was shuffled back into ${esc(deck.name)}.</small></p>`);
  if (names.length < n) lines.push(`<p><small><i class="fa-solid fa-circle-info"></i> No cards left to draw (${n - names.length} short).</small></p>`);
  if (hand.cards.size > MAX_HAND) lines.push(`<p><small><i class="fa-solid fa-triangle-exclamation"></i> More than ${MAX_HAND} cards: discard down to ${MAX_HAND} at the end of the turn.</small></p>`);
  await _post(actor, "Wheel of Fate — draw", lines.join(""));
  if (names.length) ui.notifications.info(`${actor.name} drew: ${names.join(", ")}.`);
  _log(`${actor.name}: ${reason} — drew ${names.length}/${n}${reshuffled ? `, reshuffled ${reshuffled}` : ""}`);
  return { drawn: names.length, reshuffled };
}

/** Pick which cards to discard (exactly `count`, or at least one when count is null). */
export async function pickHandCards(hand, { count = null, title, intro }) {
  const rows = hand.cards.contents
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map(c => {
      const e = greatWheelEntry(c);
      return `<label style="display:flex;gap:6px;align-items:center;margin:2px 0;">
        <input type="checkbox" name="card" value="${esc(c.id)}">
        ${c.img ? `<img src="${esc(c.img)}" alt="" width="24" style="border:none;">` : ""}
        <span>${esc(c.name)}${e ? ` <small>(${esc(e.rank)} — ${esc(e.arcana)})</small>` : ""}</span>
      </label>`;
    }).join("");
  for (;;) {
    const ids = await foundry.applications.api.DialogV2.prompt({
      window: { title },
      content: `<p>${intro}</p><div>${rows}</div>`,
      ok: {
        label: "Discard", icon: "fa-solid fa-trash",
        callback: (_ev, button) => [...button.form.querySelectorAll('input[name="card"]:checked')].map(i => i.value),
      },
      rejectClose: false,
    });
    if (!ids) return null;
    if (count != null && ids.length !== count) { ui.notifications.warn(`Pick exactly ${count} card${count === 1 ? "" : "s"}.`); continue; }
    if (!ids.length) { ui.notifications.warn("Pick at least one card."); continue; }
    return ids;
  }
}

/** Move cards of the hand to the discard pile (not "play": no Great Wheel effect is posted). */
export async function seerDiscard(actor, hand, ids) {
  const pile = seerPile(actor);
  if (!pile) { ui.notifications.warn("No discard pile found: name a pile \"Discard\" (or after the character)."); return null; }
  const names = ids.map(id => hand.cards.get(id)?.name).filter(Boolean);
  try { await hand.pass(pile, ids, { action: "discard", chatNotification: false }); }
  catch (err) { ui.notifications.error(err.message); return null; }
  return names;
}

/** End of turn: discard down to 7 cards (p.199). */
export async function seerDiscardDown(actor) {
  const hand = seerHand(actor);
  if (!hand) { ui.notifications.warn(`No Cards hand found for ${actor.name}.`); return false; }
  const over = hand.cards.size - MAX_HAND;
  if (over <= 0) { ui.notifications.info(`${hand.name} holds ${hand.cards.size} cards: nothing to discard.`); return true; }
  const ids = await pickHandCards(hand, {
    count: over,
    title: `Discard down to ${MAX_HAND}`,
    intro: `${esc(hand.name)} holds ${hand.cards.size} cards. The maximum hand size is ${MAX_HAND}: pick <strong>${over}</strong> to discard (p.${WHEEL_PAGE}).`,
  });
  if (!ids) return false;
  const names = await seerDiscard(actor, hand, ids);
  if (!names) return false;
  await _post(actor, "Wheel of Fate — hand limit", `<p>Discarded down to ${MAX_HAND}: ${names.map(esc).join(", ")}.</p>`);
  return true;
}

/* -------------------------------------------------- */
/*  Reminder cards (posted by the active GM)           */
/* -------------------------------------------------- */

const _btn = (actor, op, label, icon, title, count = 0) =>
  `<button type="button" class="icon-btn icon-btn--sm" data-action="wheelOfFate" data-op="${op}" data-count="${count}" data-actor-uuid="${esc(actor.uuid)}" title="${esc(title)}"><i class="fa-solid ${icon}"></i> ${esc(label)}</button>`;

function _handLine(actor, hand) {
  if (hand) return `<p><small><i class="fa-solid fa-hand"></i> ${esc(hand.name)}: ${hand.cards.size} card${hand.cards.size === 1 ? "" : "s"}.</small></p>`;
  return `<p class="icon-great-wheel-card__hint"><small><i class="fa-solid fa-circle-info"></i> No Cards hand found for ${esc(actor.name)}: name a hand (and the deck) after the character, or give its player the only hand they own.</small></p>`;
}

async function _postReminder(actor, title, body) {
  try { await _post(actor, title, `${body}`); }
  catch (err) { console.warn("ICON 1.5 | Wheel of Fate reminder failed", err); }
}

/** Start of combat: "draw up to 5 cards if you have less". */
export async function wheelCombatStart(combat) {
  const seen = new Set();
  for (const c of combat?.combatants ?? []) {
    const actor = c.actor;
    if (!isSeer(actor) || seen.has(actor.id)) continue;
    seen.add(actor.id);
    const hand = seerHand(actor);
    const n = hand ? hand.cards.size : 0;
    const body = `<p>At the start of any combat, draw up to ${START_HAND} cards if you have less.</p>${_handLine(actor, hand)}
      ${hand && n >= START_HAND ? "" : `<div class="icon-chat-card__buttons">${_btn(actor, "upTo", `Draw up to ${START_HAND}`, "fa-layer-group", `Draw until the hand holds ${START_HAND} cards`, START_HAND)}</div>`}`;
    await _postReminder(actor, "Wheel of Fate — start of combat", body);
  }
}

/** Start of the Seer's turn: Skein, draw a card. */
export async function wheelTurnStart(combatant) {
  const actor = combatant?.actor;
  if (!isSeer(actor)) return;
  const hand = seerHand(actor);
  await _postReminder(actor, "Skein — start of turn", `<p>Draw a card at the start of your turn.</p>${_handLine(actor, hand)}
    <div class="icon-chat-card__buttons">${_btn(actor, "draw", "Draw 1", "fa-clone", "Skein: draw a card", 1)}</div>`);
}

/** End of the Seer's turn: Skein's extra card if they didn't attack, then the hand limit. */
export async function wheelTurnEnd(combatant) {
  const actor = combatant?.actor;
  if (!isSeer(actor)) return;
  const hand = seerHand(actor);
  const n = hand?.cards.size ?? 0;
  const discard = hand && n >= MAX_HAND
    ? _btn(actor, "discard", `Discard down to ${MAX_HAND}`, "fa-trash", `Maximum hand size ${MAX_HAND}: discard down at the end of your turn`)
    : "";
  await _postReminder(actor, "Skein — end of turn", `<p>If you didn't attack, draw an extra card at the end of your turn. Then discard down to ${MAX_HAND} cards.</p>${_handLine(actor, hand)}
    <div class="icon-chat-card__buttons">${_btn(actor, "draw", "Didn't attack: draw 1", "fa-clone", "Skein: only if you didn't attack this turn", 1)}${discard}</div>`);
}

/* -------------------------------------------------- */
/*  Buttons                                            */
/* -------------------------------------------------- */

const _usedKey = (message, op) => `${message.id}:${op}`;

function _markDone(btn) {
  btn.disabled = true;
  btn.classList.add("icon-btn--done");
  if (!btn.querySelector(".icon-wheel__done")) btn.insertAdjacentHTML("beforeend", ' <i class="fa-solid fa-check icon-wheel__done"></i>');
}

async function _onButton(message, btn) {
  let actor = null;
  try { actor = fromUuidSync(btn.dataset.actorUuid); } catch { actor = null; }
  if (!actor?.isOwner) { ui.notifications.warn("Only the Seer's owner can use this button."); return; }
  const op = btn.dataset.op;
  const used = actor.getFlag(FLAG_NS, FLAG_USED) ?? [];
  const key = _usedKey(message, op);
  if (used.includes(key)) { _markDone(btn); return; }
  btn.disabled = true;
  let ok = false;
  try {
    if (op === "draw") ok = !!(await seerDraw(actor, Number(btn.dataset.count) || 1, "Skein"));
    else if (op === "upTo") {
      const hand = seerHand(actor);
      if (!hand) { ui.notifications.warn(`No Cards hand found for ${actor.name}.`); }
      else {
        const need = Math.max(0, (Number(btn.dataset.count) || START_HAND) - hand.cards.size);
        if (!need) { ui.notifications.info(`${hand.name} already holds ${hand.cards.size} cards.`); ok = true; }
        else ok = !!(await seerDraw(actor, need, "Start of combat"));
      }
    }
    else if (op === "discard") ok = await seerDiscardDown(actor);
  } finally {
    btn.disabled = false;
  }
  if (!ok) return;
  await actor.setFlag(FLAG_NS, FLAG_USED, [...used.slice(-40), key]);
  _markDone(btn);
}

export function registerWheelOfFate() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    html.querySelectorAll('[data-action="wheelOfFate"]').forEach(btn => {
      if (btn.dataset.iconBound) return;
      btn.dataset.iconBound = "true";
      let actor = null;
      try { actor = fromUuidSync(btn.dataset.actorUuid); } catch { actor = null; }
      if ((actor?.getFlag(FLAG_NS, FLAG_USED) ?? []).includes(_usedKey(message, btn.dataset.op))) _markDone(btn);
      btn.addEventListener("click", (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        _onButton(message, btn).catch(err => console.error("ICON 1.5 | Wheel of Fate button failed", err));
      });
    });
  });
}
