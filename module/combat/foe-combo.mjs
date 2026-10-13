/**
 * foe-combo.mjs — Foe and legend combo sequences ("combo-1", "combo-2"…).
 *
 * p.290: "Some foes have combo abilities like players, but for foes they are
 * a sequence of abilities instead of a token they gain and lose. Each part of
 * the sequence must be used in order, must be used on different turns, and
 * they loop back to the start after the last part is used."
 *
 * The sheet remembers the last part used (flag `icon-system.foeCombo` =
 * { last, turn }) when its attack, damage or chat is pressed. The part that
 * comes next is highlighted, the others are dimmed until their turn comes.
 * Nothing is blocked: a part used out of order only gets a warning, and the
 * GM can reset the sequence or click a part's Combo chip to make it the next
 * one (for mistakes, or a foe that starts mid-sequence). Cleared at the end
 * of the combat.
 */
import { tagKey } from "./defenses.mjs";

const _log = (...a) => console.debug("[ICON | FoeCombo]", ...a);
const NS = "icon-system";
const FLAG = "foeCombo";

/** The combo part an action is ("combo-2" → 2), or 0. */
export function comboPartOf(tags) {
  for (const t of Array.isArray(tags) ? tags : []) {
    const m = /^combo-(\d+)$/.exec(tagKey(t));
    if (m) return Number(m[1]);
  }
  return 0;
}

/**
 * The turn being played now, or "" outside combat. An elite or a legend takes
 * several turns a round from the same place in the tracker, so the
 * activations it has left tell its turns apart.
 */
function _turnKey() {
  const c = (game.combats ?? []).find(x => x.started && x.combatant) ?? null;
  if (!c) return "";
  return `${c.id}:${c.round}:${c.combatant.id}:${c.combatant.activations?.value ?? "-"}`;
}

/**
 * Where the actor is in its sequence.
 * @returns {{ parts: number, last: number, next: number, sameTurn: boolean }}
 *   parts = how many parts the sequence has (0 = no combo actions).
 */
export function comboState(actor) {
  const parts = Math.max(0, ...(actor?.system?.actions ?? []).map(a => comboPartOf(a.tags)));
  const flag = actor?.getFlag?.(NS, FLAG) ?? {};
  const last = Math.min(parts, Number(flag.last) || 0);
  const next = last >= parts ? 1 : last + 1;
  return { parts, last, next, sameTurn: !!flag.turn && flag.turn === _turnKey() };
}

/**
 * Sheet data for one action: { part, parts, isNext, isWaiting, label, tip }.
 * `part` 0 = not a combo action.
 */
export function comboView(actor, action) {
  const part = comboPartOf(action?.tags);
  if (!part) return { part: 0 };
  const st = comboState(actor);
  const isNext = part === st.next;
  return {
    part, parts: st.parts, isNext, isWaiting: !isNext,
    label: isNext ? `Combo ${part}/${st.parts} — next` : part <= st.last ? `Combo ${part}/${st.parts} — used` : `Combo ${part}/${st.parts}`,
    tip: `${isNext ? "This is the next part of the sequence." : `The next part is Combo ${st.next}.`} Parts go in order, on different turns, and loop back after the last (p.290). Click to make this part the next one.`,
  };
}

/**
 * An action was used (attack, damage or chat). Records it when it is a combo
 * part; warns when it is out of order or a second part in the same turn.
 * The same part pressed again in the same turn (attack, then damage) is the
 * same use.
 */
export async function noteComboUse(actor, action) {
  const part = comboPartOf(action?.tags);
  if (!part || !actor?.isOwner) return;
  const st = comboState(actor);
  if (part === st.last && st.sameTurn) return;
  if (part !== st.next) ui.notifications.warn(`${actor.name}: ${action.name} is Combo ${part}, but the next part is Combo ${st.next} (p.290: in order). Recorded anyway — click a Combo chip on the sheet to fix the sequence.`);
  else if (st.sameTurn && st.last) ui.notifications.warn(`${actor.name}: combo parts must be used on different turns (p.290).`);
  _log(`${actor.name}: ${action.name} — Combo ${part}/${st.parts}`);
  await actor.setFlag(NS, FLAG, { last: part, turn: _turnKey() });
}

/** Make `part` the next one (chip click), or start over with part 0. */
export async function setComboNext(actor, part = 1) {
  const st = comboState(actor);
  const last = part <= 1 ? 0 : Math.min(st.parts, part - 1);
  await actor.setFlag(NS, FLAG, { last, turn: "" });
}

/** End of combat: every sequence starts over. */
export async function clearCombo(actor) {
  if (actor?.getFlag?.(NS, FLAG)) await actor.unsetFlag(NS, FLAG);
}
