/**
 * wild-cards.mjs — the Seer's Wild Cards (p.200).
 *
 * "Many seer abilities summon a wild card… The card emits a small blast area
 * effect centered on it, which is normally inactive. When any space of an area
 * ability from you or an ally would touch the area, it can be activated,
 * causing the card to explode, and extending the area effect of that ability
 * to encompass the card's area for the duration. Then, remove the card."
 *
 * Two bullets from the same page decide the rest of the behaviour:
 *   • "Wild cards can be triggered by other wild cards" — so a card caught by
 *     the extension triggers in turn, and the chain is walked to the end.
 *   • "Wild cards do not extend the persistent effects of any area abilities"
 *     — the extension is for this ability only, which is exactly what a
 *     placed template is; nothing is written onto the scene's terrain.
 *
 * The cards themselves are the actors of the `summons` pack, dropped on the
 * map like any other summon (the sheet's summon chips drag them there).
 */
import { tokenCells } from "./area-templates.mjs";

const _log = (...a) => console.debug("[ICON | WildCards]", ...a);
const FLAG_NS = "icon-system";

/** Small blast (p.98): the card's space plus the four orthogonal ones. */
const CARD_SHAPE = [{ di: 0, dj: 0 }, { di: -1, dj: 0 }, { di: 1, dj: 0 }, { di: 0, dj: -1 }, { di: 0, dj: 1 }];

const cellKey = (c) => `${c.i},${c.j}`;

/** Is this token one of the Seer's cards? */
export function isWildCard(token) {
  const name = String(token?.actor?.name ?? token?.name ?? "");
  return /^(wild card|master card)$/i.test(name.trim());
}

/** The cards on the current scene, with the cells their dormant blast covers. */
export function wildCardsOnScene() {
  return (canvas?.tokens?.placeables ?? [])
    .filter(isWildCard)
    .map(t => {
      const own = tokenCells(t.document);
      const cells = [];
      for (const c of own) for (const o of CARD_SHAPE) cells.push({ i: c.i + o.di, j: c.j + o.dj });
      return { token: t, name: t.actor?.name ?? t.name, cells, keys: new Set(cells.map(cellKey)) };
    });
}

/**
 * Walk the chain: every card whose blast the area touches explodes, its own
 * blast joins the area, and any card that area now touches explodes too.
 * @param {Array<{i:number,j:number}>} cells   the placed area's cells
 * @returns {{ cards: Array, cells: Array }}   cards caught, and the extended cells
 */
export function chainFrom(cells) {
  const all = wildCardsOnScene();
  if (!all.length) return { cards: [], cells };

  const have = new Map(cells.map(c => [cellKey(c), c]));
  const caught = [];
  let grew = true;
  while (grew) {
    grew = false;
    for (const card of all) {
      if (caught.includes(card)) continue;
      // "when any space of an area ability … would touch the area"
      const touches = [...have.keys()].some(k => card.keys.has(k));
      if (!touches) continue;
      caught.push(card);
      for (const c of card.cells) if (!have.has(cellKey(c))) { have.set(cellKey(c), c); grew = true; }
    }
  }
  return { cards: caught, cells: [...have.values()] };
}

/**
 * Offer the cards an area has touched, extend it with the ones the player
 * takes, and remove those cards. Returns the cells actually used.
 *
 * Activating is a choice ("it CAN be activated"), so the dialog lists them and
 * the player decides; cancelling leaves the cards on the map.
 */
export async function offerWildCards(templateDoc, cells, { abilityName = "" } = {}) {
  const { cards, cells: extended } = chainFrom(cells);
  if (!cards.length) return cells;

  const esc = foundry.utils.escapeHTML;
  const names = cards.map(c => c.name);
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: "Wild Card" },
    content: `<p>${abilityName ? `<strong>${esc(abilityName)}</strong> touches ` : "This area touches "}
        <strong>${cards.length}</strong> card${cards.length > 1 ? "s" : ""}: ${esc(names.join(", "))}.</p>
      <p>Set ${cards.length > 1 ? "them" : "it"} off? The area grows to cover ${cards.length > 1 ? "their" : "its"} small blast${cards.length > 1 ? "s" : ""}
         and the card${cards.length > 1 ? "s are" : " is"} removed (p.200). Persistent effects such as terrain are not extended.</p>`,
    yes: { label: cards.length > 1 ? "Set them off" : "Set it off" },
    no:  { label: "Leave them" },
  });
  if (!ok) { _log("cards left on the map"); return cells; }

  try {
    await templateDoc.update({ [`flags.${FLAG_NS}.cells`]: extended });
  } catch (err) {
    console.error("ICON 1.5 | could not extend the area with the wild cards", err);
    ui.notifications.error("Extending the area failed (see console).");
    return cells;
  }

  const ids = cards.map(c => c.token.id);
  try {
    await canvas.scene.deleteEmbeddedDocuments("Token", ids);
  } catch (err) {
    console.warn("[ICON | WildCards] could not remove the card token(s)", err);
    ui.notifications.warn("The area was extended, but the card tokens could not be removed.");
  }

  _log(`${cards.length} card(s) triggered — area ${cells.length} → ${extended.length} spaces`);
  await ChatMessage.create({
    content: `<div class="icon-chat-card icon-chat-card--wildcard">
        <strong>🃏 ${cards.length} wild card${cards.length > 1 ? "s" : ""}</strong> triggered${abilityName ? ` by <strong>${esc(abilityName)}</strong>` : ""}
        <br><small>${esc(names.join(", "))} — the area grows from ${cells.length} to ${extended.length} spaces and the card${cards.length > 1 ? "s are" : " is"} removed (p.200).</small>
      </div>`,
  });
  return extended;
}
