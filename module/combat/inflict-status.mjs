/**
 * inflict-status.mjs — The click side of the "Inflict" block on chat cards
 * (ability-statuses.mjs renders the buttons).
 *
 * Pressing a status button on a card:
 *   1. resolves the target (the row's actor, or the user's current targets
 *      for the "🎯 Current targets" row);
 *   2. when the text asks for a save ("must save or be stunned"), opens a
 *      small dialog for the save (boons / curses pre-filled from the text,
 *      a Blessed charge, "Bloodied foes fail the save", or "already rolled")
 *      and rolls it with saveRoll — d20 + boons − curses, 10+ (p.94);
 *   3. applies the status through applyStatus (statuses.mjs) — Hatred goes
 *      through applyHatred so it is "Hatred of <the attacker>" (p.104);
 *   4. players who don't own the target relay the application to the active
 *      GM over the system socket, the same way marks do (marks.mjs).
 */
import { applyStatus, hasStatus, getStatusCharges, adjustStatusCharges, toggleOngoing } from "./statuses.mjs";
import { applyHatred } from "./marks.mjs";
import { saveRoll } from "../dice/rolls.mjs";
import { postAbilityDamageCard } from "./damage.mjs";
import { escapeHTML } from "../helpers/enrich.mjs";

const _log = (...a) => console.debug("[ICON | InflictStatus]", ...a);
const SOCKET = "system.icon-system";

/* -------------------------------------------------- */
/*  Chat card binding                                  */
/* -------------------------------------------------- */

/** Bind the "Inflict" buttons of a rendered chat message (once per element). */
export function bindInflictButtons(html) {
  const buttons = html.querySelectorAll?.('[data-action="inflictStatus"]') ?? [];
  buttons.forEach(btn => {
    if (btn.dataset.iconBound) return;
    btn.dataset.iconBound = "true";
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      try { await _onInflictClick(btn); }
      catch (err) { console.error("ICON 1.5 | inflict status failed:", err); ui.notifications.error("Applying the status failed (see console)."); btn.disabled = false; }
    });
  });
}

async function _onInflictClick(btn) {
  const d = btn.dataset;
  const source = d.sourceUuid ? await fromUuid(d.sourceUuid) : null;
  let targets;
  if (d.targetUuid) {
    const actor = await fromUuid(d.targetUuid);
    targets = actor ? [{ actor, tokenId: d.targetToken || null }] : [];
    if (!actor) { ui.notifications.warn("The target of this card no longer exists."); return; }
  } else {
    targets = Array.from(game.user?.targets ?? []).filter(t => t.actor).map(t => ({ actor: t.actor, tokenId: t.id }));
    if (!targets.length) { ui.notifications.warn("Target a token first (hover it and press T), then click the status again."); return; }
  }

  // Damage tied to the save (ability-statuses.mjs: "must save or take 2[D]+fray,
  // or [D]+fray on a successful save"), rolled after the save from the same click.
  let saveDamage = null;
  if (d.dmgFail) {
    try { saveDamage = { fail: JSON.parse(d.dmgFail), success: d.dmgSuccess && d.dmgSuccess !== "null" ? JSON.parse(d.dmgSuccess) : null, label: d.dmgLabel || "" }; }
    catch (err) { console.warn("[ICON | InflictStatus] bad damage data on the button", err); }
  }

  const spec = {
    kind:        d.kind || "inflict",          // "inflict" | "gain" | "save-damage"
    statusId:    d.statusId,
    label:       d.label || d.statusId,
    ongoing:     d.ongoing === "true",
    when:        d.when || "always",
    section:     d.section || "",
    sentence:    d.sentence || "",
    abilityName: d.ability || "",
    saveBoons:   Number(d.saveBoons) || 0,
    saveCurses:  Number(d.saveCurses) || 0,
    autoFailIf:  d.autoFail || "",
    sourceTokenId: d.sourceToken || "",
    saveDamage,
    source,
  };

  btn.disabled = true;
  const results = [];
  for (const t of targets) {
    _log(`"${spec.abilityName}" [${spec.kind}] → ${spec.statusId || spec.label}${spec.ongoing ? "+" : ""} [${spec.when}] on ${t.actor.name}${saveDamage ? ` + damage ${saveDamage.label}` : ""}`);
    results.push(await inflictStatus({ ...spec, target: t.actor, targetTokenId: t.tokenId }));
  }

  // Feedback: a per-target row locks after use; the "current targets" row stays usable.
  const r = results[0];
  if (!d.targetUuid || !r) { btn.disabled = false; return; }
  btn.textContent = spec.kind === "save-damage" ? (r.success ? "✓ saved" : "✓ failed — damage rolled")
                  : r.relayed ? "→ GM" : r.applied ? `✓ ${spec.label}${spec.ongoing ? "+" : ""}` : "✓ saved";
  btn.classList.add(r.applied ? "icon-chat-btn--done" : "icon-chat-btn--resisted");
  btn.disabled = true;
}

/* -------------------------------------------------- */
/*  Damage after a save                                */
/* -------------------------------------------------- */

/** [D] / fray of the acting character (summons use their summoner's). */
function _damageStats(actor) {
  let a = actor;
  if (a?.type === "summon" && a.system?.summonerActorId) a = game.actors?.get(a.system.summonerActorId) ?? a;
  const s = a?.system ?? {};
  return { damagedie: s.combat?.damagedie ?? s.damagedie ?? "d6", fray: Number(s.combat?.fray ?? s.fray ?? 0) };
}

/**
 * Post the damage card(s) that follow a save: the failed-save damage or the
 * reduced successful-save damage, with an Apply button for that target only.
 * A target with Dodge takes no damage from a successful save (defenses.mjs,
 * on the Apply button).
 */
export async function postSaveDamage({ source, target, targetTokenId = "", abilityName = "", saveDamage, success }) {
  if (!source || !target || !saveDamage) return;
  const chunk = success ? saveDamage.success : saveDamage.fail;
  if (!chunk?.deals) {
    await _chat(target, `<strong>${escapeHTML(target.name)}</strong> takes no damage <small>— ${escapeHTML(abilityName || "effect")}, successful save</small>`);
    return;
  }
  const { damagedie, fray } = _damageStats(source);
  const times = Math.max(1, Number(chunk.times) || 1);
  const targets = [{ tokenId: targetTokenId || target.getActiveTokens?.()?.[0]?.id || "", actorUuid: target.uuid, actor: target }];
  for (let i = 0; i < times; i++) {
    await postAbilityDamageCard(source, {
      parsed:      { hit: { mult: chunk.mult, fray: chunk.fray, flat: chunk.flat }, miss: { mult: 0, fray: false, flat: 0 }, area: { mult: 0, fray: false, flat: 0 } },
      outcome:     success ? "save-success" : "save-fail",
      damagedie, fray,
      abilityName: `${abilityName || "Effect"}${times > 1 ? ` (${i + 1}/${times})` : ""}`,
      targetName:  target.name,
      targetsOverride: targets,
    });
  }
}

/* -------------------------------------------------- */
/*  Inflict one status on one target                   */
/* -------------------------------------------------- */

/**
 * Save (if the text asks for one) and apply.
 * @returns {Promise<{applied: boolean, success: boolean|null, relayed: boolean}|null>} null = cancelled
 */
export async function inflictStatus({ target, source, statusId, label, ongoing = false, when = "always", sentence = "", abilityName = "", saveBoons = 0, saveCurses = 0, autoFailIf = "", sourceTokenId = "", kind = "inflict", saveDamage = null, targetTokenId = "" }) {
  if (!target) return null;
  if (!statusId && kind !== "save-damage") return null;
  const fullLabel = `${label}${ongoing ? "+" : ""}`;

  // "Gain": the user (or the targeted allies) gets the status, no save.
  if (kind === "gain") {
    const res = await _apply({ target, source, statusId, ongoing, label: fullLabel, abilityName, sourceTokenId, note: "", gain: true });
    return res ? { ...res, success: null } : null;
  }

  if (when === "always" && kind !== "save-damage") {
    const res = await _apply({ target, source, statusId, ongoing, label: fullLabel, abilityName, sourceTokenId, note: "" });
    return res ? { ...res, success: null } : null;
  }

  const prompt = await _promptSave({ target, source, label: kind === "save-damage" ? `damage (${saveDamage?.label ?? ""})` : fullLabel, when, sentence, abilityName, saveBoons, saveCurses, autoFailIf });
  if (!prompt) return null;

  let success, rolled = false, total = null, note = "";
  if (prompt.mode === "roll") {
    let boons = prompt.boons, boonNote = "";
    if (prompt.blessing) {
      try { await adjustStatusCharges(target, "blessed", -1); boons += 1; boonNote = "blessing"; }
      catch (err) { console.warn("[ICON | InflictStatus] could not spend the Blessed charge", err); }
    }
    const r = await saveRoll({
      statusLabel: fullLabel,
      boons, curses: prompt.curses, boonNote,
      actor: target,
      subtitle: `${abilityName ? `${abilityName} — ` : ""}${source?.name ?? "?"} → ${target.name}`,
      successText: when === "success" ? `Saved — ${fullLabel} applies on a successful save.` : `Saved! ${fullLabel} avoided.`,
      failureText: when === "success" ? `Failed — the failed-save outcome applies instead (see the ability text).` : `Failed — ${fullLabel} applied.`,
    });
    success = r.success; total = r.total; rolled = true;
    note = `save ${total}`;
  } else {
    success = prompt.mode === "success";
    note = prompt.autoFail ? `automatic failure (${prompt.autoFail})` : (success ? "successful save" : "failed save");
  }

  // Damage tied to this save: the failed-save damage, or the reduced damage of
  // a successful save (Dodge cancels the latter on Apply).
  const damageAfter = async () => {
    if (!saveDamage) return;
    try { await postSaveDamage({ source, target, targetTokenId, abilityName, saveDamage, success }); }
    catch (err) { console.error("[ICON | InflictStatus] save damage failed", err); ui.notifications.error("Rolling the save damage failed (see console)."); }
  };

  if (kind === "save-damage") {
    await damageAfter();
    return { applied: !success, success, relayed: false };
  }

  const applied = when === "success" ? success : !success;
  if (!applied) {
    if (!rolled) await _chat(target, `<strong>${escapeHTML(target.name)}</strong> ${success ? "saves against" : "fails the save, but"} <strong>${escapeHTML(fullLabel)}</strong> ${success ? "" : "only applies on a successful save"} <small>— ${escapeHTML(abilityName || "effect")}${source ? ` (${escapeHTML(source.name)})` : ""}, ${escapeHTML(note)}</small>`);
    await damageAfter();
    return { applied: false, success, relayed: false };
  }
  const res = await _apply({ target, source, statusId, ongoing, label: fullLabel, abilityName, sourceTokenId, note });
  await damageAfter();
  return res ? { ...res, success } : null;
}

/* -------------------------------------------------- */
/*  Save dialog                                        */
/* -------------------------------------------------- */

function _isBloodied(actor) {
  if (hasStatus(actor, "bloodied")) return true;
  const hp = actor.system?.combat?.hp ?? actor.system?.hp;
  if (!hp || hp.value == null || !hp.max) return false;
  const threshold = hp.bloodied ?? Math.ceil(hp.max / 2);
  return hp.value <= threshold;
}

async function _promptSave({ target, source, label, when, sentence, abilityName, saveBoons, saveCurses, autoFailIf }) {
  const canEditTarget = target.isOwner || game.user.isGM;
  const blessings = canEditTarget ? getStatusCharges(target, "blessed") : 0;
  const autoFailNow = autoFailIf && (autoFailIf === "bloodied" ? _isBloodied(target) : hasStatus(target, autoFailIf));
  const modNotes = [saveCurses ? `+${saveCurses} curse${saveCurses > 1 ? "s" : ""} from the ability text` : "", saveBoons ? `+${saveBoons} boon${saveBoons > 1 ? "s" : ""} from the ability text` : ""].filter(Boolean);

  const content = `
    <div class="icon-inflict-dialog">
      <p class="icon-inflict-dialog__lead"><strong>${escapeHTML(target.name)}</strong> saves vs <strong>${escapeHTML(label)}</strong>
        <small>— ${escapeHTML(abilityName || "effect")}${source ? ` (${escapeHTML(source.name)})` : ""}</small></p>
      ${sentence ? `<p class="icon-inflict-dialog__rule">“${escapeHTML(sentence)}”</p>` : ""}
      <p class="icon-inflict-dialog__hint">${when === "success"
        ? `1d20 + boons − curses. <strong>10+</strong> = successful save: here <strong>${escapeHTML(label)}</strong> is the successful-save outcome (the failed save has the harsher effect in the text).`
        : `1d20 + boons − curses. <strong>10+</strong> avoids <strong>${escapeHTML(label)}</strong>.`}</p>
      ${autoFailIf ? `<label class="icon-inflict-dialog__check"><input type="checkbox" name="autofail" ${autoFailNow ? "checked" : ""}> Automatic failure — the text says <em>${escapeHTML(autoFailIf)}</em> characters fail this save${autoFailNow ? ` (${escapeHTML(target.name)} is ${escapeHTML(autoFailIf)})` : ""}</label>` : ""}
      <div class="icon-inflict-dialog__mods">
        <label>Boons <input type="number" name="boons" value="${saveBoons}" min="0" max="9"></label>
        <label>Curses <input type="number" name="curses" value="${saveCurses}" min="0" max="9"></label>
      </div>
      ${modNotes.length ? `<p class="icon-inflict-dialog__note">⚙ ${modNotes.map(escapeHTML).join(" · ")}</p>` : ""}
      ${blessings > 0 ? `<label class="icon-inflict-dialog__check"><input type="checkbox" name="blessing"> Spend a Blessed charge for +1 boon (${blessings} left)</label>` : ""}
      <label class="icon-inflict-dialog__mode">Result
        <select name="mode">
          <option value="roll">Roll 1d20 now</option>
          <option value="fail">Already rolled — failed</option>
          <option value="success">Already rolled — succeeded</option>
        </select></label>
    </div>`;

  try {
    return await foundry.applications.api.DialogV2.prompt({
      window: { title: `Save vs ${label} — ${target.name}` },
      content,
      ok: {
        label: "Save",
        icon: "fa-solid fa-dice-d20",
        callback: (_e, button, dialog) => {
          const root = button?.form ?? dialog?.element ?? dialog;
          const q = (n) => root.querySelector(`[name="${n}"]`);
          const autoFail = !!q("autofail")?.checked;
          const mode = autoFail ? "fail" : (q("mode")?.value || "roll");
          return {
            mode,
            autoFail: autoFail ? autoFailIf : "",
            boons:    Math.max(0, Number(q("boons")?.value) || 0),
            curses:   Math.max(0, Number(q("curses")?.value) || 0),
            blessing: !!q("blessing")?.checked,
          };
        },
      },
      rejectClose: false,
    });
  } catch { return null; }
}

/* -------------------------------------------------- */
/*  Apply (direct or relayed)                          */
/* -------------------------------------------------- */

async function _apply({ target, source, statusId, ongoing, label, abilityName, sourceTokenId, note, gain = false }) {
  const needsRelay = !(target.isOwner || game.user.isGM);

  // Hatred is always "of someone" — the attacker (marks.mjs relays it itself).
  // A "Gain" of Hatred on the user is not a thing the text does.
  if (statusId === "hatred" && !gain) {
    if (!source) { ui.notifications.warn("Hatred needs a source character."); return null; }
    if (needsRelay && !game.users.activeGM) { ui.notifications.warn("No GM is connected — can't apply that right now."); return null; }
    await applyHatred(target, { name: source.name, tokenId: sourceTokenId || null, actorUuid: source.uuid }, { ongoing });
    return { applied: true, relayed: needsRelay };
  }

  if (!needsRelay) {
    await applyStatusDirect({ target, statusId, ongoing, label, abilityName, sourceName: source?.name ?? "", note });
    return { applied: true, relayed: false };
  }
  if (!game.users.activeGM) { ui.notifications.warn("No GM is connected — can't apply that right now."); return null; }
  game.socket.emit(SOCKET, {
    type: "inflictStatus",
    targetUuid: target.uuid, statusId, ongoing, label, abilityName,
    sourceName: source?.name ?? "", note,
  });
  ui.notifications.info(`${label} sent to the GM to apply to "${target.name}".`);
  return { applied: true, relayed: true };
}

/** Apply on a client that owns the target (or the GM), with a chat note. */
export async function applyStatusDirect({ target, statusId, ongoing = false, label = "", abilityName = "", sourceName = "", note = "" }) {
  const already = hasStatus(target, statusId);
  if (already) {
    // Already there: an ongoing (+) version upgrades a normal one, otherwise nothing changes.
    const effect = target.effects.find(e => e.statuses?.has(statusId) || e.getFlag("core", "statusId") === statusId);
    const wasOngoing = effect?.getFlag("icon-system", "ongoing") ?? false;
    if (ongoing && effect && !wasOngoing) await toggleOngoing(effect);
    await _chat(target, `<strong>${escapeHTML(target.name)}</strong> ${ongoing && !wasOngoing ? `is now <strong>${escapeHTML(label)}</strong> (upgraded to ongoing)` : `is already <strong>${escapeHTML(label || statusId)}</strong>`} <small>— ${escapeHTML(abilityName || "effect")}${sourceName ? ` (${escapeHTML(sourceName)})` : ""}${note ? `, ${escapeHTML(note)}` : ""}</small>`);
    return;
  }
  await applyStatus(target, statusId, ongoing);
  await _chat(target, `<strong>${escapeHTML(target.name)}</strong> is now <strong>${escapeHTML(label || statusId)}</strong> <small>— ${escapeHTML(abilityName || "effect")}${sourceName ? ` (${escapeHTML(sourceName)})` : ""}${note ? `, ${escapeHTML(note)}` : ""}</small>`);
}

/** GM side of the relay (called from the IconCombat socket handler). */
export async function handleInflictSocket(data) {
  if (data?.type !== "inflictStatus") return;
  const target = await fromUuid(data.targetUuid ?? "");
  if (!target) return;
  await applyStatusDirect({
    target, statusId: data.statusId, ongoing: !!data.ongoing, label: data.label ?? "",
    abilityName: data.abilityName ?? "", sourceName: data.sourceName ?? "", note: data.note ?? "",
  });
}

async function _chat(actor, html) {
  try {
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="icon-chat-card icon-chat-card--status-applied">${html}</div>` });
  } catch (err) { console.warn("[ICON | InflictStatus] chat failed", err); }
}
