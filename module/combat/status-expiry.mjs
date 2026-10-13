/**
 * status-expiry.mjs — Statuses that end at a time written in the ability text.
 *
 * "gains hatred+ of you … until the end of their next turn" (Mock), "gain
 * Hatred+ of the closest foe to you until the end of your next turn" (Spite),
 * "gain evasion until the start of your next turn". The button on the card
 * carries the "until …" phrase (ability-statuses.mjs); when the status lands,
 * this module turns it into a countdown stored on the effect:
 *
 *   flags.icon-system.expiry = { at: "end"|"start", left: N, clockUuid, text }
 *
 *   at        whose turn boundary counts: the end or the start of a turn;
 *   clockUuid the character whose turns are counted ("your" = the user of the
 *             ability, "their/its" = the character with the status);
 *   left      how many of those boundaries still have to pass. "End of their
 *             next turn" applied during their own turn skips the current one.
 *
 * The active GM ticks the counters from the combat hook (IconCombat.mjs) and
 * deletes the effect when it reaches 0, with a chat line. An ongoing (+)
 * status with an expiry still can't be saved against: it simply ends then.
 */
import { escapeHTML } from "../helpers/enrich.mjs";

const _log = (...a) => console.debug("[ICON | StatusExpiry]", ...a);
const NS = "icon-system";

const UNTIL_PARSE_RE = /\buntil\s+(?:the\s+)?(start|end|beginning)\s+of\s+(?:(your|their|its|his|her|the\s+[a-z' -]+?)\s+)?(next\s+)?turn\b/i;

/** Is it this actor's turn in the active combat right now? */
function _isTheirTurn(actor) {
  const current = game.combat?.started ? game.combat.combatant?.actor : null;
  return !!current && !!actor && current.uuid === actor.uuid;
}

/** Elite foes and legends get the "lasts two turns instead" extra (Mock, p.141). */
function _isEliteOrLegend(actor) {
  return actor?.type === "legend" || (actor?.type === "foe" && !!actor.system?.isElite);
}

/**
 * Turn an "until …" phrase into the expiry flag, or null when it isn't a
 * turn boundary we can count ("for the rest of combat", unknown wording).
 * @param {string} until        the phrase from the card ("until the end of their next turn")
 * @param {object} ctx
 * @param {Actor}  ctx.target   the character that gets the status
 * @param {Actor}  [ctx.source] the user of the ability
 * @param {number} [ctx.eliteExtra=0] extra turns on elite / legend targets
 */
export function expiryFromUntil(until, { target, source = null, eliteExtra = 0 } = {}) {
  const m = UNTIL_PARSE_RE.exec(String(until ?? ""));
  if (!m || !target) return null;
  const at = m[1].toLowerCase() === "end" ? "end" : "start";
  const whose = (m[2] ?? "their").toLowerCase();
  const clock = whose === "your" && source ? source : target;
  const next = !!m[3];
  // "End of their next turn" while it's their turn: the current end doesn't count.
  // "Start of …" is always the next start; "end of their turn" is the first end.
  let left = 1;
  if (at === "end" && next && _isTheirTurn(clock)) left = 2;
  if (eliteExtra && _isEliteOrLegend(target)) left += Number(eliteExtra) || 0;
  return { at, left, clockUuid: clock.uuid, text: m[0] };
}

/**
 * A turn boundary passed for `clockActor` (`at` = "end" | "start"): count down
 * every effect that waits on it, across the combatants of `combat`, and delete
 * those that are done. Runs on the active GM only.
 * @returns {Promise<string[]>} the uuids of the effects that ended
 */
export async function tickStatusExpiry(combat, clockActor, at) {
  if (!combat || !clockActor) return [];
  const ended = [];
  const seen = new Set();
  for (const c of combat.combatants) {
    const actor = c.actor;
    if (!actor || seen.has(actor.uuid)) continue;
    seen.add(actor.uuid);
    for (const effect of [...actor.effects]) {
      const exp = effect.getFlag(NS, "expiry");
      if (!exp || exp.at !== at || exp.clockUuid !== clockActor.uuid) continue;
      const left = (Number(exp.left) || 1) - 1;
      if (left > 0) {
        await effect.setFlag(NS, "expiry", { ...exp, left });
        _log(`${actor.name}: ${effect.name} — ${left} more`);
        continue;
      }
      _log(`${actor.name}: ${effect.name} ends (${exp.text})`);
      ended.push(effect.uuid);
      await effect.delete();
      try {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `<div class="icon-chat-card icon-chat-card--status-applied"><strong>${escapeHTML(actor.name)}</strong>'s <strong>${escapeHTML(effect.name)}</strong> ends <small>— ${escapeHTML(exp.text)}</small></div>`,
        });
      } catch (err) { console.warn("[ICON | StatusExpiry] chat failed", err); }
    }
  }
  return ended;
}

