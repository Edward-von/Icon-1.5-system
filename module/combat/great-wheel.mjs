/**
 * great-wheel.mjs — the Seer's cards (R36).
 *
 * "The Wheel of Fate: Set up a deck made up of one suit of a 52 card standard
 * playing card deck (so 13 cards)… Your hand and deck persist through combats…
 * Discarded cards go in a discard pile." (Seer traits, p.199). Each rank has an
 * effect, THE GREAT WHEEL (p.199), applied with Foretell: "You discard a card
 * from your hand and immediately apply the effects to your target".
 *
 * The system ships no deck: the table uses Foundry's own Cards (a deck, a hand
 * and a discard pile, e.g. from the "Poker Deck" preset). A card is read by its
 * value (1 = Ace … 13 = King, as the preset stores it), or else by its name
 * ("Ace of Hearts", "Q", "The Moon"), so renamed cards still work.
 *
 * R36a: the effect is shown under each card on the Cards sheets (deck, hand,
 * pile) and on the single card's sheet. Display only: no card is changed.
 *
 * R36b: playing a card from a hand posts a chat card with its effect (keywords,
 * Gain buttons, reminders) — from the "Foretell" button this module adds to the
 * hand, which moves the card straight to the discard pile, or from Foundry's own
 * Play to a pile. Nothing is applied until a button of the card is clicked.
 *
 * R36c: the card names the ally it was foretold on (the user's targets when it
 * was played: Foretell works "no matter the distance or if you can see them",
 * p.199), and The Ewer's small blast "centered on your ally" is placed with the
 * area tools (placeAreaTemplate) from a button of the card; the allies in it
 * become the targets, for the Blessed button.
 */

import { enrichRuleKeywords } from "../helpers/keywords.mjs";
import { statusBlockHtml, captureTargets } from "./ability-statuses.mjs";
import { placeAreaTemplate } from "../canvas/area-templates.mjs";

const _log = (...a) => console.debug("[ICON | GreatWheel]", ...a);

/**
 * THE GREAT WHEEL (p.199), as printed. `value` is the card's rank (Ace = 1, Jack = 11, Queen = 12, King = 13).
 * R36b: `gains` = statuses the ally gets (the "Gain" buttons of the chat card, on the targeted allies, as on
 * an ability card); `notes` = what is not a status, as reminder chips. The Sun's "until the start of their
 * next turn" closes the whole sentence, so Counter and Sturdy end then too.
 */
const UNTIL_NEXT = "until the start of their next turn";
export const GREAT_WHEEL = [
  { value: 1,  rank: "A",  arcana: "The World",   text: "Ally becomes Unstoppable until the start of their next turn",
    gains: [{ id: "unstoppable", label: "Unstoppable", until: UNTIL_NEXT }] },
  { value: 2,  rank: "2",  arcana: "The Fool",    text: "Ally must dash 3 spaces in a straight line before using the ability.",
    notes: ["Dash 3 in a straight line, before the ability"] },
  { value: 3,  rank: "3",  arcana: "The Scepter", text: "Teleport your ally to an adjacent space to you after the action resolves.",
    notes: ["Teleport the ally adjacent to you, after the action"] },
  { value: 4,  rank: "4",  arcana: "The Ewer",    text: "Bless all allies in a small blast area centered on your ally.",
    gains: [{ id: "blessed", label: "Blessed" }], notes: ["All allies in a small blast centered on the ally"],
    area: { kind: "blast", size: "s", centeredOn: "target", range: 0, label: "Small Blast (target)" } },
  { value: 5,  rank: "5",  arcana: "The Devil",   text: "If the ability forces saves, foes get +2 curses to save against them.",
    notes: ["+2 curses on the foes' saves against the ability"] },
  { value: 6,  rank: "6",  arcana: "The Sword",   text: "Ability gains pierce.",
    gains: [{ id: "pierce", label: "Pierce" }] },
  { value: 7,  rank: "7",  arcana: "Death",       text: "Ally gains Defiance.",
    gains: [{ id: "defiance", label: "Defiance" }] },
  { value: 8,  rank: "8",  arcana: "The Chariot", text: "Ally becomes unstoppable and immune to all damage while moving during the ability.",
    notes: ["Unstoppable and immune to all damage while moving, during the ability"] },
  { value: 9,  rank: "9",  arcana: "The Papessa", text: "Ally becomes pacified but is cured after the ability resolves.",
    gains: [{ id: "pacified", label: "Pacified" }], notes: ["Cured after the ability resolves"] },
  { value: 10, rank: "10", arcana: "The Emperor", text: "Ally gains stealth after the ability resolves.",
    gains: [{ id: "stealth", label: "Stealth" }], notes: ["Stealth after the ability resolves"] },
  { value: 11, rank: "J",  arcana: "The Star",    text: "Ally makes all attacks and saves with +1 Boon until the start of their next turn, including with the triggering ability.",
    notes: ["+1 boon on all attacks and saves until the start of their next turn, the triggering ability included"] },
  { value: 12, rank: "Q",  arcana: "The Moon",    text: "Ally gains Evasion until the start of their next turn",
    gains: [{ id: "evasion", label: "Evasion", until: UNTIL_NEXT }] },
  { value: 13, rank: "K",  arcana: "The Sun",     text: "Ally gains Counter and Sturdy, but cannot gain or benefit from stealth or evasion until the start of their next turn",
    gains: [{ id: "counter", label: "Counter", until: UNTIL_NEXT }, { id: "sturdy", label: "Sturdy", until: UNTIL_NEXT }],
    notes: ["No stealth or evasion until the start of their next turn"] },
];

/** Foretell (p.199): how a card is used. Shown on the chat card. */
export const FORETELL_TEXT = "You can discard 1 blessing token on yourself or an ally before that ally uses any ability to tell their fortune as an effect. You discard a card from your hand and immediately apply the effects to your target, no matter the distance or if you can see them or not.";

export const GREAT_WHEEL_PAGE = 199;

const RANK_WORDS = {
  ace: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  jack: 11, knave: 11, queen: 12, king: 13,
  a: 1, j: 11, q: 12, k: 13,
};

/**
 * The Great Wheel entry of a card, or null when it isn't one of the 13 ranks.
 * @param {Card|object} card  a Card document (or {value, name})
 */
export function greatWheelEntry(card) {
  if (!card) return null;
  const v = Number(card.value);
  if (Number.isInteger(v) && v >= 1 && v <= 13) return GREAT_WHEEL[v - 1];
  const name = String(card.name ?? "").trim();
  if (!name) return null;
  // Named after the arcana ("The Moon", "Q - The Moon"): the longest match wins ("Death" is not in "The World").
  const lower = name.toLowerCase();
  const byArcana = GREAT_WHEEL.filter(e => new RegExp(`\\b${e.arcana.toLowerCase()}\\b`).test(lower))
    .sort((a, b) => b.arcana.length - a.arcana.length)[0];
  if (byArcana) return byArcana;
  // "Ace of Hearts", "Queen", "10 of Spades", "K♠"
  const m = /^(ace|one|two|three|four|five|six|seven|eight|nine|ten|jack|knave|queen|king|[ajqk]|1[0-3]|[1-9])(?![a-z])/i.exec(lower);
  if (!m) return null;
  const n = RANK_WORDS[m[1]] ?? Number(m[1]);
  return GREAT_WHEEL[n - 1] ?? null;
}

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** "Q — The Moon: Ally gains Evasion…" with the rule keywords highlighted (tooltips as on the sheets). */
export function greatWheelHtml(entry) {
  if (!entry) return "";
  let text = esc(entry.text);
  try { text = enrichRuleKeywords(text); } catch (err) { console.warn("[ICON | GreatWheel] keyword enrichment failed", err); }
  return `<strong>${esc(entry.rank)} — ${esc(entry.arcana)}:</strong> ${text} <small class="icon-great-wheel__page">(p.${GREAT_WHEEL_PAGE})</small>`;
}

/** Is the card's face shown? (A face-down card keeps its effect hidden, like its suit and value.) */
const _faceUp = (card) => card?.face !== null && card?.face !== undefined;

/** Add the effect under each card of a Cards sheet (deck, hand or pile). */
function _decorateStack(app, element) {
  const stack = app.document;
  if (!stack?.cards || !(element instanceof HTMLElement)) return;
  let n = 0;
  for (const li of element.querySelectorAll("li[data-card-id]")) {
    const card = stack.cards.get(li.dataset.cardId);
    const entry = _faceUp(card) ? greatWheelEntry(card) : null;
    li.querySelector(".icon-great-wheel")?.remove();
    if (!entry) continue;
    const box = document.createElement("div");
    box.className = "icon-great-wheel";
    box.innerHTML = greatWheelHtml(entry);
    const name = li.querySelector(".name");
    // Under the card's name, inside its column, so the row keeps its layout.
    if (name) {
      li.classList.add("icon-great-wheel-row");
      name.classList.add("icon-great-wheel__name");
      name.appendChild(box);
    } else li.appendChild(box);
    n++;
  }
  if (n) _log(`${stack.name}: ${n} card effect(s) shown`);
}

/** Add the effect to a single card's sheet, above its tabs. */
function _decorateCard(app, element) {
  const card = app.document;
  if (!(element instanceof HTMLElement)) return;
  element.querySelector(".icon-great-wheel")?.remove();
  const entry = greatWheelEntry(card);
  if (!entry) return;
  const box = document.createElement("div");
  box.className = "icon-great-wheel icon-great-wheel--sheet";
  box.innerHTML = `<p class="icon-great-wheel__title"><i class="fa-solid fa-dharmachakra"></i> The Great Wheel (Seer)</p><p>${greatWheelHtml(entry)}</p>`;
  const content = element.querySelector(".window-content") ?? element;
  const header = content.querySelector(".sheet-header");
  header ? header.after(box) : content.prepend(box);
}

/* -------------------------------------------------- */
/*  Playing a card (R36b)                              */
/* -------------------------------------------------- */

/** The Gain / reminder entries of a card, in the shape statusBlockHtml reads (ability-statuses.mjs). */
export function greatWheelStatusEntries(entry) {
  if (!entry) return [];
  const base = { section: "", key: "other", when: "always", ongoing: false, sentence: entry.text, saveBoons: 0, saveCurses: 0, autoFailIf: "" };
  return [
    // No `target: "self"`: the ally gets it, so the button applies to the targeted allies.
    ...(entry.gains ?? []).map(g => ({ ...base, kind: "gain", id: g.id, label: g.label, until: g.until ?? "" })),
    ...(entry.notes ?? []).map(label => ({ ...base, kind: "note", id: "", label })),
  ];
}

/** The Seer playing the card: the controlled token's actor, else the user's character. */
function _playerActor() {
  const controlled = canvas?.tokens?.controlled?.find(t => t.actor?.isOwner)?.actor;
  return controlled ?? game.user?.character ?? null;
}

/**
 * Post the chat card of a played Great Wheel card.
 * @param {object} cardData  the card as it was in the hand ({name, img, value, …}): it may be gone by now
 * @param {object} [opts]
 * @param {Cards}  [opts.from]  the hand it was played from
 * @param {Cards}  [opts.to]    the pile it went to
 */
export async function postGreatWheelCard(cardData, { from = null, to = null } = {}) {
  const entry = greatWheelEntry(cardData);
  if (!entry) return null;
  const actor = _playerActor();
  const statusHtml = actor ? statusBlockHtml(greatWheelStatusEntries(entry), { source: actor, abilityName: `${entry.arcana} (Great Wheel)` }) : "";
  // R36c: who it was foretold on — the user's targets when the card was played.
  const targets = captureTargets();
  const area = entry.area && actor ? {
    label: entry.area.label,
    value: entry.value,
    actorUuid: actor.uuid,
    tokenId: targets.length === 1 ? targets[0].tokenId : "",
  } : null;
  let foretell = esc(FORETELL_TEXT);
  try { foretell = enrichRuleKeywords(foretell); } catch { /* plain text */ }
  const content = await foundry.applications.handlebars.renderTemplate("systems/icon-system/templates/chat/great-wheel-card.hbs", {
    cardName: cardData.name ?? "",
    img: cardData.img ?? "",
    rank: entry.rank,
    arcana: entry.arcana,
    page: GREAT_WHEEL_PAGE,
    effect: greatWheelHtml(entry),
    foretell,
    from: from?.name ?? "",
    to: to?.name ?? "",
    statusHtml,
    noActor: !actor && !!(entry.gains?.length || entry.area),
    targets,
    area,
  });
  _log(`played ${cardData.name} (${entry.rank} — ${entry.arcana})${to ? ` to ${to.name}` : ""}`);
  return ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content,
    flags: { "icon-system": { greatWheel: { value: entry.value, card: cardData.name ?? "", from: from?.id ?? "", to: to?.id ?? "" } } },
  });
}

/**
 * R36c: The Ewer's "small blast area centered on your ally" from the chat card. The ally the card was
 * foretold on is targeted again (when it was one token), the area goes on it (placeAreaTemplate, which
 * also offers the wild cards it touches), then only the characters on the ally's side stay targeted:
 * "Bless all allies" — the Blessed button applies to them.
 */
async function _placeCardArea(btn) {
  let actor = null;
  try { actor = fromUuidSync(btn.dataset.actorUuid); } catch { actor = null; }
  if (!actor?.isOwner) { ui.notifications.warn("Only the Seer's owner can place this area."); return; }
  const entry = GREAT_WHEEL.find(e => e.value === Number(btn.dataset.value));
  if (!entry?.area) return;
  const ally = btn.dataset.tokenId ? canvas?.tokens?.get(btn.dataset.tokenId) : null;
  if (ally) ally.setTarget(true, { releaseOthers: true });
  const centre = ally ?? (game.user.targets.size === 1 ? [...game.user.targets][0] : null);
  const placed = await placeAreaTemplate({ actor, area: { ...entry.area }, abilityName: entry.arcana, abilityKey: `great-wheel:${entry.value}` });
  if (!placed) return;
  if (!centre) return;
  const side = centre.document?.disposition;
  const others = (placed.targets ?? []).filter(t => t.document?.disposition !== side);
  for (const t of others) t.setTarget(false, { releaseOthers: false });
  const kept = Array.from(game.user.targets).map(t => t.name);
  if (others.length) ui.notifications.info(`${entry.arcana}: allies only — ${kept.length ? kept.join(", ") : "no one"} targeted (${others.length} other character${others.length > 1 ? "s" : ""} left out).`);
}

/**
 * The discard pile a card from this hand goes to: a pile the user can use named "Discard…" (or "Scarti…"),
 * else the only pile there is. Null when it can't be told: Foundry's Play dialog then asks.
 */
function _discardPile() {
  const piles = game.cards?.filter(c => c.type === "pile" && c.testUserPermission(game.user, "LIMITED")) ?? [];
  const named = piles.filter(p => /\b(?:discard|scart)/i.test(p.name ?? ""));
  if (named.length === 1) return named[0];
  if (!named.length && piles.length === 1) return piles[0];
  return null;
}

/** "Foretell" from a hand: post the card, move it to the discard pile (the passCards hook posts it). */
async function _foretell(hand, card) {
  const pile = _discardPile();
  if (!pile) {
    ui.notifications.info("Pick the discard pile (no single pile named \"Discard\" was found).");
    return hand.playDialog(card);
  }
  try { await hand.pass(pile, [card.id], { action: "play", chatNotification: false }); }
  catch (err) { ui.notifications.error(err.message); }
}

/** The "Foretell" button on each Great Wheel card of a hand. */
function _addForetellButtons(app, element) {
  const hand = app.document;
  if (hand?.type !== "hand" || hand.pack || !app.isEditable) return;
  for (const li of element.querySelectorAll("li[data-card-id]")) {
    const card = hand.cards.get(li.dataset.cardId);
    if (!card || !greatWheelEntry(card) || li.querySelector(".icon-great-wheel__play")) continue;
    const controls = li.querySelector(".controls");
    if (!controls) continue;
    const btn = document.createElement("a");
    btn.className = "icon-great-wheel__play";
    btn.dataset.tooltip = "Foretell: post this card's effect in chat and discard it (p.199)";
    btn.innerHTML = '<i class="fa-solid fa-dharmachakra"></i>';
    btn.addEventListener("click", (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      _foretell(hand, card);
    });
    controls.prepend(btn);
  }
}

export function registerGreatWheel() {
  // Hooks fire for each class of the sheet: CardDeckConfig / CardHandConfig / CardPileConfig all extend CardsConfig.
  Hooks.on("renderCardsConfig", (app, element) => {
    try { _decorateStack(app, element); } catch (err) { console.error("ICON 1.5 | Great Wheel on a Cards sheet failed", err); }
    try { _addForetellButtons(app, element); } catch (err) { console.error("ICON 1.5 | Foretell buttons failed", err); }
  });
  // R36c: the area button of a played card (The Ewer).
  Hooks.on("renderChatMessageHTML", (_message, html) => {
    html.querySelectorAll('[data-action="greatWheelArea"]').forEach(btn => {
      if (btn.dataset.iconBound) return;
      btn.dataset.iconBound = "true";
      btn.addEventListener("click", (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        _placeCardArea(btn).catch(err => console.error("ICON 1.5 | Great Wheel area failed", err));
      });
    });
  });
  // A card played from a hand to a pile (the Foretell button, or Foundry's own Play): its chat card.
  // Only on the client that plays it (the hook runs where Cards#pass is called).
  Hooks.on("passCards", (from, to, { action, toCreate = [], toUpdate = [] } = {}) => {
    if (action !== "play" || from?.type !== "hand" || to?.type !== "pile") return;
    const ids = [...toCreate.map(c => c._id), ...toUpdate.map(c => c._id)];
    for (const id of ids) {
      const card = from.cards.get(id);
      if (!card || !greatWheelEntry(card)) continue;
      const data = { name: card.name, img: card.img, value: card.value, suit: card.suit };
      postGreatWheelCard(data, { from, to }).catch(err => console.error("ICON 1.5 | Great Wheel chat card failed", err));
    }
  });
  Hooks.on("renderCardConfig", (app, element) => {
    try { _decorateCard(app, element); } catch (err) { console.error("ICON 1.5 | Great Wheel on a Card sheet failed", err); }
  });
}
