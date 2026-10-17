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
import { createTerrainSpaces, spacesOfItem, terrainFlag, cellsOf, groupOf } from "./terrain-spaces.mjs";
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

/** The token an actor's effect is on: its own token for an unlinked one, else one on a scene. */
function tokenOfActor(actor) {
  if (actor?.isToken) return actor.token ?? null;
  return canvas?.scene?.tokens?.find(t => t.actorId === actor?.id)
      ?? game.scenes?.active?.tokens?.find(t => t.actorId === actor?.id)
      ?? game.scenes?.find(s => s.tokens.some(t => t.actorId === actor?.id))?.tokens?.find(t => t.actorId === actor?.id)
      ?? null;
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
  const td = tokenOfActor(effect.parent);
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
    oc.mark ? `<small>The mark ends if ${esc(creator.name)} is defeated (p.95); a new mark from ${esc(creator.name)} on ${esc(td.name)} replaces it.</small>` : "",
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
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: creator }), whisper,
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
  // The blast centred on the character: target their token, as for the other areas "centered on them".
  const token = td.object;
  if (token) {
    for (const t of Array.from(game.user.targets)) if (t !== token) t.setTarget(false, { releaseOthers: false });
    if (!token.isTargeted) token.setTarget(true, { releaseOthers: false });
    const { placeAreaTemplate, areaLabel } = await import("./area-templates.mjs");
    const area = { kind: "blast", size: "m", centeredOn: "target" };
    area.label = areaLabel(area);
    await placeAreaTemplate({ actor: creator, area, abilityName: item.name, abilityKey: `${item.id}:detonate` });
  }
  await endFollowMark(tpl);
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
    await ChatMessage.create({
      speaker: creator ? ChatMessage.getSpeaker({ actor: creator }) : ChatMessage.getSpeaker(),
      content: `<div class="icon-chat-card icon-chat-card--terrain">
          <p><strong><i class="fa-solid fa-burst"></i> ${esc(tpl.flags[NS].abilityName)}</strong> <small>(${esc(f.source)})</small>: <strong>${esc(actor.name)}</strong> is defeated. ${esc(f.onDefeat)}</p>
          ${item ? `<p><small>${esc(plainText(item.system.description))}</small></p>` : ""}
          <p><small>${esc(f.rules)}</small></p>
          <div>${endButton(tpl, "Done: end it")}</div>
        </div>`,
    });
  }
}

/**
 * A mark whose ability gives the marked character an aura "while marked" (Fulminate p.226: "A character in range 6
 * is marked. The character gains aura 2 while marked."): the aura comes with the mark, no question, around the
 * marked token and following it, tied to that mark (whileMarked, removed with it by area-templates.mjs). Only when
 * a text offers another size ("When marking a character, you can increase the area to 3", Talent I) the user picks.
 * Nothing is placed when that mark's aura is already on the map (placed with the area button before marking).
 * Run on the client that created the mark (the marker's user, or the GM a mark was relayed to).
 */
async function placeWhileMarkedAura(effect, mark) {
  const creator = fromUuidSync(mark.sourceActorUuid);
  const item = creator?.items?.get(mark.abilityKey);
  const s = item?.system;
  if (!s) return;
  const own = [s.description, s.effect, s.areaEffect, s.hitEffect].filter(v => typeof v === "string" && v).join(" ");
  const m = /\b(?:that|the|target|marked|chosen)\s+character\s+(?:gains?|has)\s+(?:an?\s+)?aura\s+(\d+)\b[^.]*\bwhile marked\b/i.exec(plainText(own));
  if (!m) return;
  const td = tokenOfActor(effect.parent);
  const scene = td?.parent;
  if (!scene) { _log(`${item.name}: no token for ${effect.parent?.name}, no aura on the map`); return; }
  const { placeAuraOnToken, aurasInText } = await import("./area-templates.mjs");
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
  // The other sizes an unlocked text offers: Talent I "increase the area to 3"; the mastery, if it says one.
  const extra = [
    (s.talentSelected ?? 0) === 1 ? s.talent1 : "", (s.talentSelected ?? 0) === 2 ? s.talent2 : "", s.masteryUnlocked ? s.mastery : "",
  ].filter(t => typeof t === "string" && t.trim());
  const sizes = [...new Set([Number(m[1]), ...extra.flatMap(t => aurasInText(t, { resize: true }).map(a => a.size))])].filter(n => n > 0);
  let size = sizes[0];
  if (sizes.length > 1) {
    try {
      size = await foundry.applications.api.DialogV2.wait({
        window: { title: `${item.name} — aura` },
        content: `<p><strong>${esc(td.name)}</strong> is marked and gains an aura. Which size?</p>${extra.map(t => `<p><small>${esc(plainText(t))}</small></p>`).join("")}`,
        buttons: sizes.map((n, i) => ({ action: String(n), label: `Aura ${n}`, default: i === 0, callback: () => n })),
        rejectClose: false,
      }) ?? sizes[0];
    } catch { size = sizes[0]; }
  }
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

  Hooks.on("renderChatMessageHTML", (_message, html) => {
    for (const btn of html.querySelectorAll('[data-action="endFollowMark"], [data-action="detonateFollowMark"]')) {
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
          else await endFollowMark(doc);
        } catch (err) { console.warn("[ICON | FollowMarks] button failed", err); return; }
        if (!tpl() || btn.dataset.action === "endFollowMark") off("Ended");
      });
    }
  });
}
