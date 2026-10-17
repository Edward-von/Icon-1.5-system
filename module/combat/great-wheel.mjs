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
 */

import { enrichRuleKeywords } from "../helpers/keywords.mjs";

const _log = (...a) => console.debug("[ICON | GreatWheel]", ...a);

/** THE GREAT WHEEL (p.199), as printed. `value` is the card's rank (Ace = 1, Jack = 11, Queen = 12, King = 13). */
export const GREAT_WHEEL = [
  { value: 1,  rank: "A",  arcana: "The World",   text: "Ally becomes Unstoppable until the start of their next turn" },
  { value: 2,  rank: "2",  arcana: "The Fool",    text: "Ally must dash 3 spaces in a straight line before using the ability." },
  { value: 3,  rank: "3",  arcana: "The Scepter", text: "Teleport your ally to an adjacent space to you after the action resolves." },
  { value: 4,  rank: "4",  arcana: "The Ewer",    text: "Bless all allies in a small blast area centered on your ally." },
  { value: 5,  rank: "5",  arcana: "The Devil",   text: "If the ability forces saves, foes get +2 curses to save against them." },
  { value: 6,  rank: "6",  arcana: "The Sword",   text: "Ability gains pierce." },
  { value: 7,  rank: "7",  arcana: "Death",       text: "Ally gains Defiance." },
  { value: 8,  rank: "8",  arcana: "The Chariot", text: "Ally becomes unstoppable and immune to all damage while moving during the ability." },
  { value: 9,  rank: "9",  arcana: "The Papessa", text: "Ally becomes pacified but is cured after the ability resolves." },
  { value: 10, rank: "10", arcana: "The Emperor", text: "Ally gains stealth after the ability resolves." },
  { value: 11, rank: "J",  arcana: "The Star",    text: "Ally makes all attacks and saves with +1 Boon until the start of their next turn, including with the triggering ability." },
  { value: 12, rank: "Q",  arcana: "The Moon",    text: "Ally gains Evasion until the start of their next turn" },
  { value: 13, rank: "K",  arcana: "The Sun",     text: "Ally gains Counter and Sturdy, but cannot gain or benefit from stealth or evasion until the start of their next turn" },
];

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

export function registerGreatWheel() {
  // Hooks fire for each class of the sheet: CardDeckConfig / CardHandConfig / CardPileConfig all extend CardsConfig.
  Hooks.on("renderCardsConfig", (app, element) => {
    try { _decorateStack(app, element); } catch (err) { console.error("ICON 1.5 | Great Wheel on a Cards sheet failed", err); }
  });
  Hooks.on("renderCardConfig", (app, element) => {
    try { _decorateCard(app, element); } catch (err) { console.error("ICON 1.5 | Great Wheel on a Card sheet failed", err); }
  });
}
