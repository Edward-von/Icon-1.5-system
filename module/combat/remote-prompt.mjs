/**
 * remote-prompt.mjs — ask the player who owns a character a question, from
 * another client.
 *
 * Some rolls are resolved by the GM even though the choice belongs to a
 * player: the end-of-turn status saves run on the GM's client (the combat
 * update handler is GM-only), and the "Inflict" buttons on a chat card are
 * usually pressed by the attacker. The Blessed charge spent on a save is the
 * target's resource, so the dialog has to open on the target's own client.
 *
 * Transport rides the system socket already used for the status / mark /
 * damage relays. A feature registers a responder for its kind; the asking
 * client awaits the answer and falls back to asking locally when nobody owns
 * the character, when their client is offline, or when they don't answer in
 * time.
 */
const SOCKET  = "system.icon-system";
const TIMEOUT = 90_000;   // ms before the asking client gives up and asks locally

const _log = (...a) => console.debug("[ICON | RemotePrompt]", ...a);

/** requestId → { resolve, timer } on the asking client. */
const PENDING = new Map();
/** kind → async (payload) => result, on the answering client. */
const RESPONDERS = new Map();

/** Register the dialog that answers a kind of question on the owner's client. */
export function registerPromptResponder(kind, fn) {
  RESPONDERS.set(kind, fn);
}

/**
 * The connected player who should answer for `actor`: their assigned
 * character first, then any other active owner. Never the current user (they
 * would just ask themselves) and never a GM (the GM is the fallback).
 * @returns {User|null}
 */
export function ownerUserFor(actor) {
  if (!actor || typeof game === "undefined") return null;
  const owners = game.users.filter(u => u.active && !u.isGM && u.id !== game.user.id
                                     && actor.testUserPermission(u, "OWNER"));
  if (!owners.length) return null;
  return owners.find(u => u.character?.id === actor.id) ?? owners[0];
}

/**
 * Ask `actor`'s player a question and wait for the answer.
 * @param {Actor}  actor
 * @param {object} options
 * @param {string} options.kind      responder registered on the other client
 * @param {object} options.payload   plain data for the dialog (must survive JSON)
 * @param {string} [options.waitingNote]  what to tell the asking user
 * @returns {Promise<{answered: boolean, result?: any}>} answered:false → ask locally
 */
export async function askOwner(actor, { kind, payload, waitingNote = "" } = {}) {
  const user = ownerUserFor(actor);
  if (!user) return { answered: false };
  const requestId = foundry.utils.randomID();
  _log(`asking ${user.name} — ${kind} for "${actor.name}" (${requestId})`);
  ui.notifications.info(waitingNote || `Waiting for ${user.name} to answer for ${actor.name}…`);

  return await new Promise(resolve => {
    const timer = setTimeout(() => {
      PENDING.delete(requestId);
      ui.notifications.warn(`${user.name} didn't answer for ${actor.name} — asking here instead.`);
      resolve({ answered: false });
    }, TIMEOUT);
    PENDING.set(requestId, { resolve, timer });
    game.socket.emit(SOCKET, {
      type: "iconPrompt", requestId, kind, payload,
      toUserId: user.id, fromUserId: game.user.id, fromUserName: game.user.name,
    });
  });
}

/** Socket handler for both directions (called from the combat socket dispatcher). */
export async function handlePromptSocket(data) {
  if (data?.type === "iconPrompt")       return _onRequest(data);
  if (data?.type === "iconPromptResult") return _onResult(data);
}

async function _onRequest(data) {
  if (data.toUserId !== game.user.id) return;
  const responder = RESPONDERS.get(data.kind);
  if (!responder) return;
  let result = null;
  try { result = await responder(data.payload ?? {}, data); }
  catch (err) { console.error("ICON 1.5 | remote prompt responder failed:", err); }
  game.socket.emit(SOCKET, {
    type: "iconPromptResult", requestId: data.requestId, toUserId: data.fromUserId, result,
  });
}

function _onResult(data) {
  if (data.toUserId !== game.user.id) return;
  const pending = PENDING.get(data.requestId);
  if (!pending) return;                       // already timed out
  PENDING.delete(data.requestId);
  clearTimeout(pending.timer);
  pending.resolve({ answered: true, result: data.result ?? null });
}
