/**
 * follow-marks.mjs — a terrain space put on a character instead of a space, following them (R33d).
 *
 * The talents / masteries that allow it (helpers/terrain-spaces.mjs markOnCharacterIn):
 *   Polaris Talent I (p.202)   "You can cause one of your Polaris to follow a character as a mark instead of a space"
 *                              — it still counts as one of the Polaris spaces for the gamble's 1 / 2 / 3.
 *   Party Favor's Amico (p.151) "You can throw the party favor at any character in range instead, making it a mark.
 *                              You can gamble at the end of any turn after yours to detonate it, ending the mark and
 *                              effect" — the mine's medium blast goes on that character.
 *   Implode's WAKING VOID (p.211) "You can choose a character with this ability instead of a space, but it doesn't stun
 *                              the center character. If that character is defeated, Implode immediately activates".
 *
 * Marks (p.95): "Each ability typically places only one mark, and a character can only mark another character with
 * one mark at a time … Marks also end if the character placing them is defeated". The existing marks.mjs effect does
 * all of that already, so a mark on a character is two things kept together by the active GM:
 *   - the mark effect on the character (applyMark, abilityKey = the item id; Waking Void, which the book doesn't call
 *     a mark, is a tracker: it doesn't replace other marks nor ends when its creator is defeated);
 *   - a one-template terrain space on the character's cells, `followTokenId` = their token, so it moves with them
 *     (area-templates.mjs moves followers) and the terrain flag carries `onCharacter`.
 * Whichever goes first takes the other with it: the mark ending (✕ on the chip, its creator defeated, the end of the
 * combat, a new mark replacing it) removes the space; the space deleted (Delete on the map, right-click on the chip,
 * "End mark" on a card) ends the mark. The Mark button the tags already give Polaris Talent I and Amico gets the
 * space too, since it goes through the same effect.
 */
import { createTerrainSpaces, spacesOfItem, terrainFlag, cellsOf, groupOf, implodeShoveButtons } from "./terrain-spaces.mjs";
import { applyMark, removeMark, marksOn } from "../combat/marks.mjs";

const _log = (...a) => console.debug("[ICON | FollowMarks]", ...a);
const NS = "icon-system";

const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));
const isActiveGM = () => game.users.activeGM?.id === game.user.id;
const plainText = (s) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** The spec of an item that may go on a character (onCharacter set), or null. */
export function characterSpecOf(item) {
  return spacesOfItem(item).find(sp => sp.onCharacter) ?? null;
}

/** Templates of marks on characters on `scene` (or every scene). */
function followMarks(scene = null) {
  const scenes = scene ? [scene] : game.scenes?.contents ?? [];
  return scenes.flatMap(s => s.templates.filter(t => terrainFlag(t)?.onCharacter && t.flags[NS].followTokenId));
}

/** The token a mark template follows, and its actor. */
function holderOf(tpl) {
  const td = tpl.parent?.tokens?.get(tpl.flags[NS].followTokenId) ?? null;
  return { td, actor: td?.actor ?? null };
}

/** The mark effect that goes with a template (same creator, same item, on the followed character). */
function effectOf(tpl) {
  const f = terrainFlag(tpl);
  const { actor } = holderOf(tpl);
  return marksOn(actor).find(m => m.sourceActorId === f.creatorId && m.abilityKey === f.itemId) ?? null;
}

/**
 * The token an actor's effect is on: its own token for an unlinked one, else the token the marker targeted
 * (`tokenUuid`, mark.targetTokenUuid: a linked character on several scenes), else one on a scene.
 */
function tokenOfActor(actor, tokenUuid = null) {
  if (actor?.isToken) return actor.token ?? null;
  const picked = tokenUuid ? fromUuidSync(tokenUuid) : null;
  if (picked?.actorId === actor?.id && picked?.parent) return picked;
  return canvas?.scene?.tokens?.find(t => t.actorId === actor?.id)
      ?? game.scenes?.active?.tokens?.find(t => t.actorId === actor?.id)
      ?? game.scenes?.find(s => s.tokens.some(t => t.actorId === actor?.id))?.tokens?.find(t => t.actorId === actor?.id)
      ?? null;
}

/**
 * The ability's range, for "any character in range": its range tag (Polaris "range-5", Implode "range-6"), else the
 * first "in range N" of its text (Party Favor "a free space in range 3", p.151). 0 when it says none.
 */
async function rangeOfItem(item) {
  const { resolveAbilityTags } = await import("../helpers/rule-tooltips.mjs");
  return rangeOfAbility(resolveAbilityTags(item.system), item.system?.description);
}

/** The same for any ability or foe action: its range tag, else the first "in range N" of `text`. */
async function rangeOfAbility(tags, text) {
  const { rangeFromTags } = await import("./area-templates.mjs");
  const fromTags = rangeFromTags(tags);
  if (fromTags) return fromTags;
  const m = /\bin range (\d+)\b/i.exec(plainText(text));
  return m ? Number(m[1]) : 0;
}

/**
 * "Any character in range" (Amico p.151; Polaris range 5 p.202, Implode range 6 p.211): with both tokens on this
 * scene and the target beyond the ability's range, the user is asked before marking (default: no). True to go on.
 */
async function withinRangeOrConfirmed(actor, item, target) {
  return rangeConfirmed(actor, item.name, await rangeOfItem(item), target);
}

/**
 * The sheets' Mark button (PC abilities, foe and legend actions): the same range check as the "On a character" chip,
 * the ability's range tag or its "Mark a character in range N" (Deepwrath p.235). True to go on.
 * @param {Actor} actor
 * @param {{name: string, tags?: Array, text?: string, item?: Item}} ability  an item, or a foe action's tags and text
 * @param {Token} target
 */
export async function markRangeConfirmed(actor, { name, tags = [], text = "", item = null }, target) {
  const range = item ? await rangeOfItem(item) : await rangeOfAbility(tags, text);
  return rangeConfirmed(actor, name, range, target);
}

/** Ask before going on when `target` stands beyond `range` of `actor`'s token on its scene (default: no). */
async function rangeConfirmed(actor, name, range, target) {
  const own = actor.getActiveTokens?.(false, false)?.find(t => t.document?.parent === target.document?.parent);
  if (!range || !Number.isFinite(range) || !own) return true;
  // Elden Rune (p.209): standing on the rune, a listed range is increased by +3.
  const { rangeWithRune } = await import("./terrain-spaces.mjs");
  const rune = rangeWithRune(actor, range);
  range = rune.range;
  const { gridDistance } = await import("../combat/defenses.mjs");
  const dist = gridDistance(own, target);
  if (dist <= range) return true;
  try {
    return !!(await foundry.applications.api.DialogV2.confirm({
      window: { title: `${name} — out of range` },
      content: `<p><strong>${esc(target.name)}</strong> is ${dist} spaces away, beyond ${esc(name)}'s range ${range}.</p>${rune.note ? `<p><small>${esc(rune.note)}</small></p>` : ""}<p>Put it on ${esc(target.name)} anyway?</p>`,
      yes: { label: "Anyway" }, no: { label: "Cancel", default: true },
      rejectClose: false,
    }));
  } catch { return false; }
}

/**
 * The chip's "On a character": mark the one targeted token (the effect first; the active GM adds the space, see
 * onMarkCreated). With no single target, says how to target one.
 * @param {Actor} actor
 * @param {Item} item
 * @param {object} sp  the spec, with onCharacter
 */
export async function placeMarkOnCharacter(actor, item, sp) {
  const own = actor.getActiveTokens?.(false, true)?.map(t => t.id) ?? [];
  const targets = Array.from(game.user?.targets ?? []).filter(t => t.actor && !own.includes(t.id));
  if (targets.length !== 1) {
    ui.notifications.warn(`${item.name}: target exactly one character (hover their token and press T), then click the chip again.`);
    return;
  }
  const target = targets[0];
  const oc = sp.onCharacter;
  if (!(await withinRangeOrConfirmed(actor, item, target))) return;
  _log(`${item.name} on ${target.name} (${oc.mark ? "mark" : "tracker"})`);
  await applyMark({
    source: actor, target: target.actor, abilityKey: item.id, abilityName: item.name,
    text: `${oc.source ? `${oc.source}: ` : ""}${oc.rule}`, track: !oc.mark,
  });
}

/**
 * Active GM, a mark created: when its ability's space may go on a character, put that space on the character's
 * token, following them, with a card.
 */
async function onMarkCreated(effect) {
  const mark = effect.getFlag(NS, "mark");
  if (!mark?.sourceActorUuid) return;
  const creator = fromUuidSync(mark.sourceActorUuid);
  const item = creator?.items?.get(mark.abilityKey);
  const sp = item ? characterSpecOf(item) : null;
  if (!sp) return;
  const td = tokenOfActor(effect.parent, mark.targetTokenUuid);
  const scene = td?.parent;
  if (!scene) { _log(`no token for ${effect.parent?.name}: no space on the map`); return; }
  if (followMarks(scene).some(t => t.flags[NS].followTokenId === td.id && terrainFlag(t).creatorId === creator.id && terrainFlag(t).itemId === item.id)) return;
  const oc = sp.onCharacter;
  const spec = {
    ...sp, label: `${sp.label} (${oc.mark ? "mark" : "on a character"})`,
    // On a character, nobody enters it: no enter reminders, no dangerous / difficult terrain under them.
    onEnter: "", enterFoes: false, enterAllies: false, enterExit: false, onStart: false, dangerous: false, difficult: false, foesOnly: false,
    rules: oc.rule,
  };
  const docs = await createTerrainSpaces(scene, cellsOf(td), spec, {
    actor: creator, abilityName: item.name, abilityKey: `${item.id}:terrain`, group: groupOf(creator, item, sp), source: oc.source,
    itemId: item.id, followTokenId: td.id, asOne: true,
    extra: { onCharacter: true, tracked: !oc.mark, detonate: oc.detonate, onDefeat: oc.onDefeat, holderName: td.name },
  });
  if (!docs.length) return;
  // Polaris: the space on the character is one of the Polaris spaces (1 / 2 / 3 for the gamble).
  const count = scene.templates.filter(t => terrainFlag(t)?.group === groupOf(creator, item, sp)).length;
  const lines = [
    `<strong><i class="fa-solid fa-location-crosshairs"></i> ${esc(item.name)}</strong> <small>(${esc(oc.source)})</small>: the ${esc(sp.label.toLowerCase())} follows <strong>${esc(td.name)}</strong>${oc.mark ? " as a mark" : ""}.`,
    `<small>${esc(oc.rule)}</small>`,
    count > 1 || /polaris/i.test(item.name) ? `<small>${esc(sp.label)} spaces active: <strong>${count}</strong> (this one counts).</small>` : "",
    oc.detonate ? `<small>At the end of any turn after yours a card offers <em>Detonate</em> (gamble, medium blast centred on ${esc(td.name)}).</small>` : "",
    oc.onDefeat ? `<small>If ${esc(td.name)} is defeated, a card reminds you: ${esc(oc.onDefeat)}</small>` : "",
    activatesAtTurnStart(item) ? `<small>At the start of ${esc(creator.name)}'s next turn a card offers the large blast centred on ${esc(td.name)}.</small>` : "",
    oc.mark ? `<small>The mark ends if ${esc(creator.name)} is defeated (p.95); if ${esc(creator.name)} marks ${esc(td.name)} again with another ability, they choose which mark stays.</small>` : "",
  ].filter(Boolean);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: creator }),
    content: `<div class="icon-chat-card icon-chat-card--terrain">${lines.map(l => `<p>${l}</p>`).join("")}<div>${endButton(docs[0])}</div></div>`,
  });
}

/** "End mark" for chat cards: ends the mark and removes the space (bound in registerFollowMarks). */
function endButton(tpl, label = "End mark") {
  return `<button type="button" class="icon-btn icon-btn--sm icon-btn--remove" data-action="endFollowMark" data-scene-id="${esc(tpl.parent.id)}" data-template-id="${esc(tpl.id)}" title="End the mark and remove it from the map"><i class="fa-solid fa-xmark"></i> ${esc(label)}</button>`;
}

/** End a mark on a character from its template: the effect (relayed to the GM for a player), else the template. */
async function endFollowMark(tpl) {
  const eff = effectOf(tpl);
  if (eff) return removeMark(eff.uuid);
  if (tpl.isOwner || game.user.isGM) await tpl.delete();
  return true;
}

/**
 * End of `prev`'s turn (active GM, from IconCombat): Amico's "You can gamble at the end of any turn after yours to
 * detonate it" — a card, to the creator's owners and the GM, with Detonate. Not at the end of the creator's turn.
 * Only the latest card stays in the chat: the previous turn's one, unused, is deleted.
 * @param {Combatant} prev
 */
export async function followMarkTurnEnd(prev) {
  const scene = prev?.token?.parent ?? canvas?.scene;
  if (!scene) return;
  for (const tpl of followMarks(scene)) {
    const f = terrainFlag(tpl);
    if (!f.detonate || f.creatorId === prev.actor?.id) continue;
    const creator = game.actors.get(f.creatorId);
    const { td } = holderOf(tpl);
    if (!creator || !td) continue;
    const whisper = game.users.filter(u => u.isGM || creator.testUserPermission(u, "OWNER")).map(u => u.id);
    // One Detonate card at a time: the one of the previous turn, not used, goes when the new one comes.
    const old = game.messages.filter(m => m.getFlag(NS, "detonateFor") === tpl.uuid).map(m => m.id);
    if (old.length) { try { await ChatMessage.deleteDocuments(old); } catch (err) { console.warn("[ICON | FollowMarks] could not remove the old Detonate card", err); } }
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: creator }), whisper,
      flags: { [NS]: { detonateFor: tpl.uuid } },
      content: `<div class="icon-chat-card icon-chat-card--terrain">
          <p><strong><i class="fa-solid fa-bomb"></i> ${esc(tpl.flags[NS].abilityName)}</strong> <small>(${esc(f.source)})</small>: end of ${esc(prev.name ?? prev.actor?.name ?? "")}'s turn — ${esc(creator.name)} may gamble to detonate the ${esc(String(f.name || "mark").toLowerCase())} on <strong>${esc(td.name)}</strong>.</p>
          <p><small>${esc(f.rules)}</small></p>
          <div><button type="button" class="icon-btn icon-btn--sm" data-action="detonateFollowMark" data-scene-id="${esc(scene.id)}" data-template-id="${esc(tpl.id)}" title="Gamble, then a medium blast centred on ${esc(td.name)}; the mark and effect end"><i class="fa-solid fa-dice"></i> Detonate</button> ${endButton(tpl)}</div>
        </div>`,
    });
  }
}

/**
 * Detonate (Amico, p.151): gamble with the ability, then its medium blast centred on the marked character, then the
 * mark and the effect end. The creator's owner only; nothing happens if the gamble dialog is closed.
 */
async function detonate(tpl) {
  const f = terrainFlag(tpl);
  const creator = game.actors.get(f.creatorId);
  const item = creator?.items?.get(f.itemId);
  const { td } = holderOf(tpl);
  if (!creator?.isOwner || !item || !td) { ui.notifications.warn("Only the owner of the one who placed it can detonate it."); return; }
  if (tpl.parent !== canvas?.scene) { ui.notifications.warn("Open the scene of that mark first."); return; }
  const { rollGamble } = await import("../combat/gamble.mjs");
  const result = await rollGamble(creator, item);
  if (result == null) return;   // the gamble dialog was closed
  await blastOnHolder(creator, item, td, "m", "detonate");
  await endFollowMark(tpl);
}

/** A blast of `size` centred on the marked character: their token targeted, as for the other areas "centered on them". */
async function blastOnHolder(creator, item, td, size, key) {
  const token = td.object;
  if (!token) return;
  for (const t of Array.from(game.user.targets)) if (t !== token) t.setTarget(false, { releaseOthers: false });
  if (!token.isTargeted) token.setTarget(true, { releaseOthers: false });
  const { placeAreaTemplate, areaLabel } = await import("./area-templates.mjs");
  const area = { kind: "blast", size, centeredOn: "target" };
  area.label = areaLabel(area);
  return placeAreaTemplate({ actor: creator, area, abilityName: item.name, abilityKey: `${item.id}:${key}` });
}

/**
 * Implode on a character (WAKING VOID, p.211): its large blast centred on them, a card with one "Shove" button for
 * each character inside ("as close as possible towards it", in any order), then the tracker and its space end.
 * The creator's owner or the GM, on a click.
 */
async function implodeOnHolder(tpl) {
  const f = terrainFlag(tpl);
  const creator = game.actors.get(f.creatorId);
  const item = creator?.items?.get(f.itemId);
  const { td } = holderOf(tpl);
  if (!creator?.isOwner || !item || !td) { ui.notifications.warn("Only the owner of the one who placed it can do that."); return; }
  if (tpl.parent !== canvas?.scene) { ui.notifications.warn("Open the scene of that mark first."); return; }
  const placed = await blastOnHolder(creator, item, td, "l", "implode");
  await endFollowMark(tpl);
  if (!placed?.cells?.length) return;
  // The holder's space is the centre; the holder isn't shoved (nor stunned: "it doesn't stun the center").
  const centre = cellsOf(td)[0];
  const shoves = centre ? implodeShoveButtons(td.parent, creator, item, placed.cells, centre, [td]) : "";
  if (!shoves) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: creator }),
    content: `<div class="icon-chat-card icon-chat-card--terrain"><strong><i class="fa-solid fa-circle-dot"></i> ${esc(item.name)}</strong> activates on <strong>${esc(td.name)}</strong>: shove every character in the area as close as possible towards them, in any order you like (one button each, in the order you choose).
        <div>${shoves}</div></div>`,
  });
}

/** "Implode: Large Blast" for the Waking Void cards (bound in registerFollowMarks). */
function implodeButton(tpl, holderName) {
  return `<button type="button" class="icon-btn icon-btn--sm" data-action="implodeFollowMark" data-scene-id="${esc(tpl.parent.id)}" data-template-id="${esc(tpl.id)}" title="A large blast centred on ${esc(holderName)}, then a Shove button for everyone inside; then it ends"><i class="fa-solid fa-burst"></i> Large Blast on ${esc(holderName)}</button>`;
}

/** Does the ability go off "at the start of that turn" (Implode p.211: "at the start of that turn, that space explodes")? */
const activatesAtTurnStart = (item) => /\bat the start of that turn\b/i.test(plainText(item?.system?.description));

/**
 * Active GM, the start of a turn: a space on a character whose ability goes off at the start of its creator's next
 * turn (Implode with WAKING VOID, p.211: "Your next turn must be slow, but at the start of that turn, that space
 * explodes") — a card, once, with the large blast button. Nothing is placed until someone clicks.
 * @param {Combatant} current  the combatant whose turn starts
 */
async function followMarkTurnStart(current) {
  const actorId = current?.actor?.id;
  const scene = current?.token?.parent ?? canvas?.scene;
  if (!actorId || !scene) return;
  for (const tpl of followMarks(scene)) {
    const f = terrainFlag(tpl);
    if (f.creatorId !== actorId || tpl.flags[NS].turnStartPosted) continue;
    const creator = game.actors.get(f.creatorId);
    const item = creator?.items?.get(f.itemId);
    const { td } = holderOf(tpl);
    if (!item || !td || !activatesAtTurnStart(item)) continue;
    await tpl.update({ [`flags.${NS}.turnStartPosted`]: true });
    const whisper = game.users.filter(u => u.isGM || creator.testUserPermission(u, "OWNER")).map(u => u.id);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: creator }), whisper,
      content: `<div class="icon-chat-card icon-chat-card--terrain">
          <p><strong><i class="fa-solid fa-burst"></i> ${esc(tpl.flags[NS].abilityName)}</strong> <small>(${esc(f.source)})</small>: start of ${esc(creator.name)}'s turn (it must be slow) — the space on <strong>${esc(td.name)}</strong> explodes.</p>
          ${item ? `<p><small>${esc(plainText(item.system.description))}</small></p>` : ""}
          <p><small>${esc(f.rules)}</small></p>
          <div>${implodeButton(tpl, td.name)} ${endButton(tpl, "Done: end it")}</div>
        </div>`,
    });
  }
}

/**
 * Active GM, an actor defeated (0 hp): Waking Void's "If that character is defeated, Implode immediately activates"
 * — a card with the ability's effect. The creator's marks end through marks.mjs (removeMarksBy) and take their
 * spaces with them.
 */
async function onDefeated(actor) {
  for (const tpl of followMarks()) {
    const f = terrainFlag(tpl);
    if (!f.onDefeat) continue;
    const { actor: holder } = holderOf(tpl);
    if (!holder || holder.uuid !== actor.uuid) continue;
    const creator = game.actors.get(f.creatorId);
    const item = creator?.items?.get(f.itemId);
    // "Implode immediately activates": not again at the start of the creator's turn.
    if (item && activatesAtTurnStart(item)) { try { await tpl.update({ [`flags.${NS}.turnStartPosted`]: true }); } catch { /* gone */ } }
    await ChatMessage.create({
      speaker: creator ? ChatMessage.getSpeaker({ actor: creator }) : ChatMessage.getSpeaker(),
      content: `<div class="icon-chat-card icon-chat-card--terrain">
          <p><strong><i class="fa-solid fa-burst"></i> ${esc(tpl.flags[NS].abilityName)}</strong> <small>(${esc(f.source)})</small>: <strong>${esc(actor.name)}</strong> is defeated. ${esc(f.onDefeat)}</p>
          ${item ? `<p><small>${esc(plainText(item.system.description))}</small></p>` : ""}
          <p><small>${esc(f.rules)}</small></p>
          <div>${item && activatesAtTurnStart(item) ? `${implodeButton(tpl, actor.name)} ` : ""}${endButton(tpl, "Done: end it")}</div>
        </div>`,
    });
  }
}

/**
 * The aura "while marked" an ability gives (Fulminate p.226), or null: the sizes it can have (the base one first,
 * then the ones an unlocked text offers, Talent I "increase the area to 3") and those texts.
 * @param {Item} item
 * @returns {Promise<{sizes: number[], extra: string[]}|null>}
 */
async function whileMarkedAuraOf(item) {
  const s = item?.system;
  if (!s) return null;
  const own = [s.description, s.effect, s.areaEffect, s.hitEffect].filter(v => typeof v === "string" && v).join(" ");
  const m = /\b(?:that|the|target|marked|chosen)\s+character\s+(?:gains?|has)\s+(?:an?\s+)?aura\s+(\d+)\b[^.]*\bwhile marked\b/i.exec(plainText(own));
  if (!m) return null;
  const { aurasInText } = await import("./area-templates.mjs");
  // The other sizes an unlocked text offers: Talent I "increase the area to 3"; the mastery, if it says one.
  const extra = [
    (s.talentSelected ?? 0) === 1 ? s.talent1 : "", (s.talentSelected ?? 0) === 2 ? s.talent2 : "", s.masteryUnlocked ? s.mastery : "",
  ].filter(t => typeof t === "string" && t.trim());
  const sizes = [...new Set([Number(m[1]), ...extra.flatMap(t => aurasInText(t, { resize: true }).map(a => a.size))])].filter(n => n > 0);
  return sizes.length ? { sizes, extra } : null;
}

/** "Aura 2 / Aura 3": the size, asked only when there is more than one; the first one if the dialog is closed. */
async function askAuraSize(item, targetName, { sizes, extra }) {
  if (sizes.length < 2) return sizes[0];
  try {
    return await foundry.applications.api.DialogV2.wait({
      window: { title: `${item.name} — aura` },
      content: `<p><strong>${esc(targetName)}</strong> is marked and gains an aura. Which size?</p>${extra.map(t => `<p><small>${esc(plainText(t))}</small></p>`).join("")}`,
      buttons: sizes.map((n, i) => ({ action: String(n), label: `Aura ${n}`, default: i === 0, callback: () => n })),
      rejectClose: false,
    }) ?? sizes[0];
  } catch { return sizes[0]; }
}

/**
 * Before a mark is relayed to the GM (marks.mjs applyMark, the marker doesn't own the target): the aura size the
 * marker picks on their own client, so the GM who creates the mark isn't asked. Null when the ability has no aura
 * "while marked", or only one size, or the aura is already around that character (placed with the area button).
 * @param {Actor} source  the marker
 * @param {Actor} target  the marked character
 * @param {string} abilityKey  the item id
 */
export async function whileMarkedAuraSize(source, target, abilityKey) {
  const item = source?.items?.get(abilityKey);
  const aura = await whileMarkedAuraOf(item);
  if (!aura || aura.sizes.length < 2) return null;
  const targeted = Array.from(game.user?.targets ?? []).find(t => t.actor?.uuid === target.uuid)?.document?.uuid ?? null;
  const placed = (tokenOfActor(target, targeted)?.parent?.templates ?? []).some(t => {
    const w = t.flags?.[NS]?.whileMarked;
    return w && !w.effectUuid && w.sourceActorId === source.id && w.abilityKey === abilityKey && w.targetActorUuid === target.uuid;
  });
  if (placed) return null;
  return askAuraSize(item, target.name, aura);
}

/**
 * A mark whose ability gives the marked character an aura "while marked" (Fulminate p.226: "A character in range 6
 * is marked. The character gains aura 2 while marked."): the aura comes with the mark, no question, around the
 * marked token and following it, tied to that mark (whileMarked, removed with it by area-templates.mjs). Only when
 * a text offers another size ("When marking a character, you can increase the area to 3", Talent I) the user picks.
 * Nothing is placed when that mark's aura is already on the map (placed with the area button before marking).
 * Run on the client that created the mark (the marker's user, or the GM a mark was relayed to). A relayed mark
 * carries the size the marker already chose on their own client (mark.auraSize, see whileMarkedAuraSize): the GM
 * is not asked.
 */
async function placeWhileMarkedAura(effect, mark) {
  const creator = fromUuidSync(mark.sourceActorUuid);
  const item = creator?.items?.get(mark.abilityKey);
  const aura = await whileMarkedAuraOf(item);
  if (!aura) return;
  const td = tokenOfActor(effect.parent, mark.targetTokenUuid);
  const scene = td?.parent;
  if (!scene) { _log(`${item.name}: no token for ${effect.parent?.name}, no aura on the map`); return; }
  const { placeAuraOnToken } = await import("./area-templates.mjs");
  // Already there: an aura of this mark (or placed for this character before the mark existed) is not doubled.
  const same = scene.templates.filter(t => {
    const w = t.flags?.[NS]?.whileMarked;
    return w && w.sourceActorId === creator.id && w.abilityKey === mark.abilityKey && w.targetActorUuid === effect.parent.uuid
      && (!w.effectUuid || w.effectUuid === effect.uuid || fromUuidSync(w.effectUuid));
  });
  if (same.length) {
    for (const t of same.filter(t => !t.flags[NS].whileMarked.effectUuid)) {
      try { await t.update({ [`flags.${NS}.whileMarked.effectUuid`]: effect.uuid }); } catch { /* not this user's */ }
    }
    return;
  }
  // The size the marker chose before the mark was relayed, else asked here when a text offers more than one.
  const size = Number(mark.auraSize) > 0 ? Number(mark.auraSize) : await askAuraSize(item, td.name, aura);
  const effAlive = effect.parent?.effects?.get(effect.id);
  if (!effAlive) return;   // the mark ended while the size was asked
  try {
    await placeAuraOnToken(td, {
      actor: creator, size, abilityName: item.name, abilityKey: mark.abilityKey,
      flags: { whileMarked: { sourceActorId: creator.id, abilityKey: mark.abilityKey, targetActorUuid: effect.parent.uuid, effectUuid: effect.uuid } },
    });
    ui.notifications.info(`${item.name}: Aura ${size} placed around ${td.name}, while marked; it follows the token and ends with the mark.`);
  } catch (err) {
    console.warn("[ICON | FollowMarks] could not place the aura of the marked character", err);
    ui.notifications.warn(`${item.name}: could not place the aura around ${td.name} (you may lack the 'Create Measured Template' permission). Use the area button.`);
  }
}

export function registerFollowMarks() {
  Hooks.on("createActiveEffect", (effect, _options, userId) => {
    const mark = effect.getFlag?.(NS, "mark");
    if (!mark) return;
    // The aura "while marked" (Fulminate p.226), on the client that marked: it may ask the Talent I size.
    if (!mark.tracked && mark.sourceActorUuid && userId === game.user.id)
      placeWhileMarkedAura(effect, mark).catch(err => console.warn("[ICON | FollowMarks] could not place the while-marked aura", err));
    if (!isActiveGM()) return;
    onMarkCreated(effect).catch(err => console.warn("[ICON | FollowMarks] could not put the mark on the map", err));
  });
  // The mark ended: its space goes too.
  Hooks.on("deleteActiveEffect", async (effect) => {
    const mark = effect.getFlag?.(NS, "mark");
    if (!isActiveGM() || !mark) return;
    for (const s of game.scenes ?? []) {
      const ids = followMarks(s).filter(t => {
        const f = terrainFlag(t);
        return f.creatorId === mark.sourceActorId && f.itemId === mark.abilityKey && holderOf(t).actor?.uuid === effect.parent?.uuid;
      }).map(t => t.id);
      if (ids.length) {
        try { await s.deleteEmbeddedDocuments("MeasuredTemplate", ids); }
        catch (err) { console.warn("[ICON | FollowMarks] could not remove the space of an ended mark", err); }
      }
    }
  });
  // The space deleted: its mark ends.
  Hooks.on("deleteMeasuredTemplate", async (tpl) => {
    if (!isActiveGM() || !terrainFlag(tpl)?.onCharacter) return;
    const eff = effectOf(tpl);
    if (eff) { try { await removeMark(eff.uuid); } catch (err) { console.warn("[ICON | FollowMarks] could not end the mark", err); } }
  });
  // The character's token removed from the scene: its marks' spaces go.
  Hooks.on("deleteToken", async (td) => {
    if (!isActiveGM()) return;
    const ids = td.parent?.templates.filter(t => terrainFlag(t)?.onCharacter && t.flags[NS].followTokenId === td.id).map(t => t.id) ?? [];
    if (ids.length) { try { await td.parent.deleteEmbeddedDocuments("MeasuredTemplate", ids); } catch { /* scene gone */ } }
  });
  Hooks.on("updateActor", (actor, changes) => {
    if (!isActiveGM()) return;
    const hp = foundry.utils.getProperty(changes, "system.combat.hp.value") ?? foundry.utils.getProperty(changes, "system.hp.value");
    if (hp == null || hp > 0) return;
    onDefeated(actor).catch(err => console.warn("[ICON | FollowMarks] defeat reminder failed", err));
  });

  // WAKING VOID: Implode on a character goes off at the start of its creator's next turn (p.211). Not on an undo.
  Hooks.on("updateCombat", (combat, changes, options) => {
    if (!isActiveGM() || !("turn" in changes) || options?._iconSkipEndOfTurn) return;
    const current = combat.turn != null ? combat.combatant : null;
    if (current?.actor) followMarkTurnStart(current).catch(err => console.warn("[ICON | FollowMarks] turn start reminder failed", err));
  });

  Hooks.on("renderChatMessageHTML", (_message, html) => {
    for (const btn of html.querySelectorAll('[data-action="endFollowMark"], [data-action="detonateFollowMark"], [data-action="implodeFollowMark"]')) {
      if (btn.dataset.iconBound) continue;
      btn.dataset.iconBound = "true";
      const tpl = () => game.scenes?.get(btn.dataset.sceneId)?.templates?.get(btn.dataset.templateId) ?? null;
      const off = (why) => { btn.disabled = true; btn.title = why; btn.style.opacity = "0.5"; };
      const t = tpl();
      if (!t) { off("Already ended"); continue; }
      const creator = game.actors.get(terrainFlag(t)?.creatorId);
      if (!game.user.isGM && !creator?.isOwner) { off("Only the one who placed it or the GM"); continue; }
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const doc = tpl();
        if (!doc) { ui.notifications.info("Already ended."); off("Already ended"); return; }
        try {
          if (btn.dataset.action === "detonateFollowMark") await detonate(doc);
          else if (btn.dataset.action === "implodeFollowMark") await implodeOnHolder(doc);
          else await endFollowMark(doc);
        } catch (err) { console.warn("[ICON | FollowMarks] button failed", err); return; }
        if (!tpl() || btn.dataset.action === "endFollowMark") off("Ended");
      });
    }
  });
}
