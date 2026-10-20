/**
 * inflict-status.mjs — The click side of the "Inflict" block on chat cards
 * (ability-statuses.mjs renders the buttons).
 *
 * Pressing a status button on a card:
 *   1. resolves the target (the row's actor, or the user's current targets
 *      for the "Current targets" row);
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
import { applyHatred, promptHatredTarget } from "./marks.mjs";
import { expiryFromUntil } from "./status-expiry.mjs";
import { gainPcVigilance } from "./tracker-statuses.mjs";
import { saveRoll } from "../dice/rolls.mjs";
import { postAbilityDamageCard, cureCharacter } from "./damage.mjs";
import { escapeHTML } from "../helpers/enrich.mjs";
import { askOwner, registerPromptResponder } from "./remote-prompt.mjs";

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

  // One save, two outcomes (ability-statuses.mjs pairSaveOutcomes).
  let pair = null;
  if (d.pair) {
    try { pair = JSON.parse(d.pair); }
    catch (err) { console.warn("[ICON | InflictStatus] bad save-pair data on the button", err); }
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
    until:       d.until || "",
    eliteExtra:  Number(d.eliteExtra) || 0,
    saveDamage,
    pair,
    source,
  };

  btn.disabled = true;
  const shared = _sharedKeyOf(btn);
  const results = [];
  for (const t of targets) {
    _log(`"${spec.abilityName}" [${spec.kind}] → ${spec.statusId || spec.label}${spec.ongoing ? "+" : ""} [${spec.when}] on ${t.actor.name}${saveDamage ? ` + damage ${saveDamage.label}` : ""}`);
    results.push(await inflictStatus({ ...spec, target: t.actor, targetTokenId: t.tokenId }));
  }

  // Feedback: a per-target row locks after use; the "current targets" row stays usable.
  const r = results[0];
  if (!d.targetUuid || !r) { btn.disabled = false; return; }
  const state = {
    text: spec.kind === "save-damage" ? (r.success ? "✓ saved" : "✓ failed — damage rolled")
        : r.relayed ? "→ GM" : r.applied ? `✓ ${r.appliedLabel ?? `${spec.label}${spec.ongoing ? "+" : ""}`}` : "✓ saved",
    resisted: !r.applied,
  };
  _showUsed(btn, state);
  await _shareUsed(shared, state);
}

/* -------------------------------------------------- */
/*  Shared "used" state: attack card + damage card     */
/* -------------------------------------------------- */

// The Inflict block of an attack / auto-hit card (attack.roll flag) shows on
// the damage card of the same use too (damage.inflictFrom flag, damage.mjs).
// A button used on either card is used on both: the state is kept on the
// attack card's flags (inflictUsed: { "<block>-<button>": {text, resisted} }).
const INFLICT_BLOCK = ".icon-chat-statuses:not(.icon-chat-statuses--gain):not(.icon-chat-statuses--notes)";
const KEY_RE = /^\d+-\d+$/;

/** "<block>-<button>" keys on the status buttons of a card's content. */
function _keyButtons(root) {
  root.querySelectorAll(".icon-chat-statuses").forEach((block, b) =>
    block.querySelectorAll('[data-action="inflictStatus"]').forEach((btn, i) => { btn.dataset.inflictKey = `${b}-${i}`; }));
}

function _showUsed(btn, state) {
  btn.textContent = String(state?.text ?? "✓");
  btn.classList.add(state?.resisted ? "icon-chat-btn--resisted" : "icon-chat-btn--done");
  btn.disabled = true;
}

/** Lock the buttons already used, from the attack card's flag, under `root`. */
function _markUsed(root, attackMessage) {
  const used = attackMessage?.flags?.["icon-system"]?.inflictUsed;
  if (!used || typeof used !== "object") return;
  for (const [key, state] of Object.entries(used)) {
    if (!KEY_RE.test(key)) continue;
    root.querySelectorAll(`[data-inflict-msg="${attackMessage.id}"] [data-inflict-key="${key}"]`).forEach(b => _showUsed(b, state));
  }
}

/** The attack card and key a button's use is kept under ({messageId, key}, or null). */
function _sharedKeyOf(btn) {
  const messageId = btn.closest?.("[data-inflict-msg]")?.dataset.inflictMsg ?? "";
  const key = btn.dataset.inflictKey ?? "";
  return messageId && KEY_RE.test(key) ? { messageId, key } : null;
}

/** Show the use on every copy of the button, and keep it on the attack card (or ask the GM to). */
async function _shareUsed(shared, state) {
  if (!shared) return;
  const { messageId, key } = shared;
  document.querySelectorAll(`[data-inflict-msg="${messageId}"] [data-inflict-key="${key}"]`).forEach(b => _showUsed(b, state));
  const message = game.messages?.get(messageId);
  if (!message) return;
  if (message.isOwner) {
    await message.update({ [`flags.icon-system.inflictUsed.${key}`]: state });
    return;
  }
  if (!game.users.activeGM) return;
  game.socket.emit(SOCKET, { type: "inflictUsed", messageId, key, state });
}

/** GM side of _shareUsed for a player who didn't post the attack card. */
export async function handleInflictUsedSocket(data) {
  const message = game.messages?.get(data?.messageId ?? "");
  const key = String(data?.key ?? "");
  if (!message?.flags?.["icon-system"]?.attack?.roll || !KEY_RE.test(key)) return;
  await message.update({ [`flags.icon-system.inflictUsed.${key}`]: { text: String(data.state?.text ?? "✓").slice(0, 80), resisted: !!data.state?.resisted } });
}

/**
 * Before binding a rendered card: an attack / auto-hit card gets its buttons
 * keyed and the used ones locked; a damage card that follows one gets a copy
 * of its Inflict block (same rows, same Hit / Miss / Exceed dimming), locked
 * where already used. Cards without these flags (older ones included) are
 * left as they are.
 */
export function decorateInflictCard(message, html) {
  const f = message?.flags?.["icon-system"];
  if (!f || !html?.querySelector) return;
  if (f.attack?.roll) {
    _keyButtons(html);
    html.querySelectorAll(".icon-chat-statuses").forEach(b => { b.dataset.inflictMsg = message.id; });
    _markUsed(html, message);
    return;
  }
  const attack = f.damage?.inflictFrom ? game.messages?.get(f.damage.inflictFrom) : null;
  if (!attack) return;
  const tpl = document.createElement("template");
  tpl.innerHTML = attack.content ?? "";
  _keyButtons(tpl.content);
  const block = tpl.content.querySelector(INFLICT_BLOCK);
  const card = html.querySelector(".icon-chat-card--damage");
  if (!block || !card) return;
  block.dataset.inflictMsg = attack.id;
  block.classList.add("icon-chat-statuses--linked");
  block.querySelector(".icon-chat-statuses__note")?.insertAdjacentHTML("afterbegin", "same buttons as the attack card · ");
  card.append(block);
  _markUsed(html, attack);
}

/** An attack card's used buttons changed: lock them on the damage cards showing its block. */
export function onInflictUsedUpdate(message, changed) {
  if (!foundry.utils.hasProperty(changed ?? {}, "flags.icon-system.inflictUsed")) return;
  _markUsed(document, message);
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
  // "3 piercing damage per minion in the area, up to a maximum of six times"
  // (Assault Wave p.312): how many times is the table's count, asked here and
  // capped at the ceiling. Each instance is applied on its own (p.92).
  let instances = 1;
  if (chunk.per || chunk.maxTimes) {
    const cap = Math.min(10, Number(chunk.maxTimes) || 10);
    let n = null;
    try {
      n = await foundry.applications.api.DialogV2.prompt({
        window: { title: `How many times? — ${abilityName || "Effect"}` },
        content: `<label style="display:block">${chunk.per ? `How many ${escapeHTML(chunk.per.replace(/y$/, "ie"))}s count for <strong>${escapeHTML(target.name)}</strong>?` : `How many times does <strong>${escapeHTML(target.name)}</strong> take the damage?`}
          ${chunk.maxTimes ? `<small>(up to a maximum of ${chunk.maxTimes} times)</small>` : ""}
          <input type="number" name="n" value="1" min="0" max="${cap}" style="width:100%" autofocus></label>`,
        ok: { label: "Roll damage", callback: (_e, button) => Number(button.form?.elements?.n?.value) },
        rejectClose: false,
      });
    } catch { n = null; }
    if (n === null || n === undefined || Number.isNaN(n)) return;
    instances = Math.min(cap, Math.max(0, Math.floor(n)));
    if (!instances) {
      await _chat(target, `<strong>${escapeHTML(target.name)}</strong> takes no damage <small>— ${escapeHTML(abilityName || "effect")}, count 0</small>`);
      return;
    }
  }
  const targets = [{ tokenId: targetTokenId || target.getActiveTokens?.()?.[0]?.id || "", actorUuid: target.uuid, actor: target }];
  // "X damage, twice" (p.92): "roll [D] once, then apply the total damage
  // three separate times" - one card, one roll, the repeats as instances.
  await postAbilityDamageCard(source, {
    parsed:      { hit: { mult: chunk.mult, fray: chunk.fray, flat: chunk.flat }, miss: { mult: 0, fray: false, flat: 0 }, area: { mult: 0, fray: false, flat: 0 } },
    outcome:     success ? "save-success" : "save-fail",
    damagedie, fray,
    // Damage type written in the save text ("3 piercing damage", p.104).
    pierce: chunk.type === "piercing", divine: chunk.type === "divine",
    // Weakened (p.104): "All damage dealt reduced by 2" - the acting
    // character's, as the sheets pass it (pierce / divine skip it).
    weakened: hasStatus(source, "weakened"),
    instances: instances * times,
    abilityName: abilityName || "Effect",
    targetName:  target.name,
    targetsOverride: targets,
  });
}

/* -------------------------------------------------- */
/*  Inflict one status on one target                   */
/* -------------------------------------------------- */

/**
 * Save (if the text asks for one) and apply.
 * @returns {Promise<{applied: boolean, success: boolean|null, relayed: boolean}|null>} null = cancelled
 */
export async function inflictStatus({ target, source, statusId, label, ongoing = false, when = "always", sentence = "", abilityName = "", saveBoons = 0, saveCurses = 0, autoFailIf = "", sourceTokenId = "", kind = "inflict", saveDamage = null, targetTokenId = "", pair = null, until = "", eliteExtra = 0 }) {
  if (!target) return null;
  if (!statusId && kind !== "save-damage") return null;
  const fullLabel = `${label}${ongoing ? "+" : ""}`;

  // Sealed (p.104): "Character cannot inflict statuses." Checked here, at the
  // click, rather than when the card is built: the seal can land (or be saved
  // against) after the card is in the log. It stops a status going ONTO a
  // target; the damage tied to a save is damage, not a status, and "Gain" is
  // the user or their allies getting something, not inflicting it.
  if (kind === "inflict" && source && hasStatus(source, "sealed")) {
    ui.notifications.warn(`${source.name} is Sealed: a sealed character cannot inflict statuses (p.104).`);
    _log(`BLOCKED — "${abilityName}" → ${fullLabel} on ${target.name}: ${source.name} is Sealed`);
    return null;
  }

  // "Gain": the user (or the targeted allies) gets the status, no save.
  if (kind === "gain") {
    const res = await _apply({ target, source, statusId, ongoing, label: fullLabel, abilityName, sourceTokenId, note: "", gain: true, until, eliteExtra });
    return res ? { ...res, success: null } : null;
  }

  if (when === "always" && kind !== "save-damage") {
    const res = await _apply({ target, source, statusId, ongoing, label: fullLabel, abilityName, sourceTokenId, note: "", until, eliteExtra });
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
      successText: kind === "save-damage"
        ? (saveDamage?.success?.deals ? `Saved — reduced damage (${saveDamage?.label ?? ""}).` : `Saved — no damage.`)
        : pair ? `Saved — ${_pairLabel(pair.success)} instead.`
        : when === "success" ? `Saved — ${fullLabel} applies on a successful save.` : `Saved! ${fullLabel} avoided.`,
      failureText: kind === "save-damage"
        ? `Failed — full damage (${saveDamage?.label ?? ""}).`
        : pair ? `Failed — ${_pairLabel(pair.fail)} applied.`
        : when === "success" ? `Failed — the failed-save outcome applies instead (see the ability text).` : `Failed — ${fullLabel} applied.`,
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

  // One save, two outcomes: the result picks which statuses land.
  if (pair) {
    const list = (success ? pair.success : pair.fail) ?? [];
    let res = null;
    for (const st of list) {
      const r = await _apply({ target, source, statusId: st.id, ongoing: !!st.ongoing, label: `${st.label}${st.ongoing ? "+" : ""}`, abilityName, sourceTokenId, note, until, eliteExtra });
      if (r) res = res ? { ...res, relayed: res.relayed || r.relayed } : r;
    }
    await damageAfter();
    return res ? { ...res, success, appliedLabel: _pairLabel(list) } : null;
  }

  const applied = when === "success" ? success : !success;
  if (!applied) {
    if (!rolled) await _chat(target, `<strong>${escapeHTML(target.name)}</strong> ${success ? "saves against" : "fails the save, but"} <strong>${escapeHTML(fullLabel)}</strong> ${success ? "" : "only applies on a successful save"} <small>— ${escapeHTML(abilityName || "effect")}${source ? ` (${escapeHTML(source.name)})` : ""}, ${escapeHTML(note)}</small>`);
    await damageAfter();
    return { applied: false, success, relayed: false };
  }
  const res = await _apply({ target, source, statusId, ongoing, label: fullLabel, abilityName, sourceTokenId, note, until, eliteExtra });
  await damageAfter();
  return res ? { ...res, success } : null;
}

/** "Blind+ + Weakened" — the statuses of one side of a save pair. */
function _pairLabel(list) {
  return (list ?? []).map(st => `${st.label}${st.ongoing ? "+" : ""}`).join(" + ");
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

/**
 * Ask for the save. The character's own player answers it when they are
 * connected — the Blessed charge is theirs to spend and the roll is theirs to
 * make — and the click's client only asks locally when nobody owns the
 * target, they are offline, or they don't answer in time.
 */
async function _promptSave(args) {
  const { target } = args;
  const remote = await askOwner(target, {
    kind: "save",
    payload: {
      targetUuid:  target.uuid,
      sourceName:  args.source?.name ?? "",
      label:       args.label,
      when:        args.when,
      sentence:    args.sentence,
      abilityName: args.abilityName,
      saveBoons:   args.saveBoons,
      saveCurses:  args.saveCurses,
      autoFailIf:  args.autoFailIf,
    },
    waitingNote: `${target.name} saves vs ${args.label} — waiting for their player…`,
  });
  if (remote.answered) return remote.result ?? null;   // null = they cancelled
  return _saveDialog(args);
}

// The player's side: same dialog, on the client that owns the character.
registerPromptResponder("save", async (payload) => {
  const target = await fromUuid(payload.targetUuid ?? "");
  if (!target) return null;
  return _saveDialog({
    target,
    source:      payload.sourceName ? { name: payload.sourceName } : null,
    label:       payload.label ?? "",
    when:        payload.when ?? "always",
    sentence:    payload.sentence ?? "",
    abilityName: payload.abilityName ?? "",
    saveBoons:   Number(payload.saveBoons) || 0,
    saveCurses:  Number(payload.saveCurses) || 0,
    autoFailIf:  payload.autoFailIf ?? "",
  });
});

async function _saveDialog({ target, source, label, when, sentence, abilityName, saveBoons, saveCurses, autoFailIf }) {
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
      ${modNotes.length ? `<p class="icon-inflict-dialog__note">${modNotes.map(escapeHTML).join(" · ")}</p>` : ""}
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

async function _apply({ target, source, statusId, ongoing, label, abilityName, sourceTokenId, note, gain = false, until = "", eliteExtra = 0 }) {
  const needsRelay = !(target.isOwner || game.user.isGM);
  // "until the end of their next turn" → a countdown on the effect (status-expiry.mjs).
  const expiry = until ? expiryFromUntil(until, { target, source, eliteExtra }) : null;

  // Hatred is always "of someone" — the attacker (marks.mjs relays it itself).
  if (statusId === "hatred" && !gain) {
    if (!source) { ui.notifications.warn("Hatred needs a source character."); return null; }
    if (needsRelay && !game.users.activeGM) { ui.notifications.warn("No GM is connected — can't apply that right now."); return null; }
    await applyHatred(target, { name: source.name, tokenId: sourceTokenId || null, actorUuid: source.uuid }, { ongoing, expiry });
    return { applied: true, relayed: needsRelay };
  }
  // Hatred GAINED by the user (Spite, Dark Knight: "gain hatred+ of the closest
  // foe to you"): ask of whom, with the closest foe on the map pre-selected.
  if (statusId === "hatred" && gain) {
    const hated = await promptHatredTarget(target, { closest: true, until: expiry?.text ?? (ongoing ? "ongoing: it doesn't end with the turn" : "") });
    if (!hated) return null;
    await applyHatred(target, hated, { ongoing, expiry });
    return { applied: true, relayed: needsRelay };
  }

  if (!needsRelay) {
    await applyStatusDirect({ target, statusId, ongoing, label, abilityName, sourceName: source?.name ?? "", note, expiry });
    return { applied: true, relayed: false };
  }
  if (!game.users.activeGM) { ui.notifications.warn("No GM is connected — can't apply that right now."); return null; }
  game.socket.emit(SOCKET, {
    type: "inflictStatus",
    targetUuid: target.uuid, statusId, ongoing, label, abilityName,
    sourceName: source?.name ?? "", note, expiry,
  });
  ui.notifications.info(`${label} sent to the GM to apply to "${target.name}".`);
  return { applied: true, relayed: true };
}

/** Apply on a client that owns the target (or the GM), with a chat note. */
export async function applyStatusDirect({ target, statusId, ongoing = false, label = "", abilityName = "", sourceName = "", note = "", expiry = null, remove = 0 }) {
  // Cure (the "Cure" Gain button, ability-statuses.mjs): vigor, then a save against each status (p.85).
  if (statusId === "cure") {
    await cureCharacter(target, { abilityName, sourceName });
    return;
  }
  // P28: an unlinked token (a mote of life, a plant) goes by its token's name, as the card's speaker does.
  const who = target?.token?.name || target?.name || "";
  // Blessings taken away (Symphony "Remove up to four blessings from characters anywhere", p.178): one charge each.
  if (statusId === "blessed" && remove > 0) {
    const had = getStatusCharges(target, "blessed");
    const next = await adjustStatusCharges(target, "blessed", -Math.min(remove, had));
    await _chat(target, `<strong>${escapeHTML(who)}</strong> loses <strong>${had - next}</strong> blessing${had - next === 1 ? "" : "s"} (now ${next}) <small>— ${escapeHTML(abilityName || "effect")}${sourceName ? ` (${escapeHTML(sourceName)})` : ""}</small>`);
    return;
  }
  // A blessing is a token: each one given is one more Blessed charge (p.172),
  // spent for +1 boon on a save.
  if (statusId === "blessed") {
    const next = await adjustStatusCharges(target, "blessed", 1);
    await _chat(target, `<strong>${escapeHTML(who)}</strong> gains a <strong>blessing</strong> (now ${next}) <small>— ${escapeHTML(abilityName || "effect")}${sourceName ? ` (${escapeHTML(sourceName)})` : ""}</small>`);
    return;
  }
  // A PC keeps Vigilance on the Stalwart tracker ("gain vigilance +1"): add a
  // charge there; the token status follows the tracker (tracker-statuses.mjs).
  if (target?.type === "icon" && statusId === "vigilance") {
    const amount = Number(/\+(\d+)/.exec(label)?.[1] ?? 1);   // "Vigilance +2" from the ability text
    const next = await gainPcVigilance(target, amount);
    await _chat(target, `<strong>${escapeHTML(who)}</strong> gains <strong>Vigilance +${amount}</strong> (now ${next}) <small>— ${escapeHTML(abilityName || "effect")}${sourceName ? ` (${escapeHTML(sourceName)})` : ""}${note ? `, ${escapeHTML(note)}` : ""}</small>`);
    return;
  }
  const already = hasStatus(target, statusId);
  if (already) {
    // Already there: an ongoing (+) version upgrades a normal one, otherwise nothing changes.
    const effect = target.effects.find(e => e.statuses?.has(statusId) || e.getFlag("core", "statusId") === statusId);
    const wasOngoing = effect?.getFlag("icon-system", "ongoing") ?? false;
    if (ongoing && effect && !wasOngoing) await toggleOngoing(effect);
    if (expiry && effect) await effect.setFlag("icon-system", "expiry", expiry);
    await _chat(target, `<strong>${escapeHTML(who)}</strong> ${ongoing && !wasOngoing ? `is now <strong>${escapeHTML(label)}</strong> (upgraded to ongoing)` : `is already <strong>${escapeHTML(label || statusId)}</strong>`} <small>— ${escapeHTML(abilityName || "effect")}${sourceName ? ` (${escapeHTML(sourceName)})` : ""}${note ? `, ${escapeHTML(note)}` : ""}</small>`);
    return;
  }
  await applyStatus(target, statusId, ongoing, expiry ? { flags: { expiry } } : {});
  await _chat(target, `<strong>${escapeHTML(who)}</strong> is now <strong>${escapeHTML(label || statusId)}</strong>${expiry ? ` ${escapeHTML(expiry.text)}` : ""} <small>— ${escapeHTML(abilityName || "effect")}${sourceName ? ` (${escapeHTML(sourceName)})` : ""}${note ? `, ${escapeHTML(note)}` : ""}</small>`);
}

/**
 * Give a positive status to a character from a sheet button (the Mendicant's
 * Bless): applied here when this client owns the target, otherwise relayed to
 * the active GM like the Gain buttons of the cards.
 */
export function grantStatus({ target, source = null, statusId, label = "", abilityName = "" }) {
  return _apply({ target, source, statusId, ongoing: false, label: label || statusId, abilityName, sourceTokenId: "", note: "", gain: true });
}

/**
 * Take `count` blessings from a character (Symphony, p.178): here when this client owns it, otherwise relayed to the
 * active GM like the Gain buttons. Resolves true when done or sent.
 */
export async function removeBlessings({ target, source = null, count = 1, abilityName = "" }) {
  if (!target || !(count > 0)) return false;
  if (target.isOwner || game.user.isGM) {
    await applyStatusDirect({ target, statusId: "blessed", remove: count, abilityName, sourceName: source?.name ?? "" });
    return true;
  }
  if (!game.users.activeGM) { ui.notifications.warn(`No GM is connected — can't take the blessings of ${target.name} right now.`); return false; }
  game.socket.emit(SOCKET, { type: "inflictStatus", targetUuid: target.uuid, statusId: "blessed", remove: count, abilityName, sourceName: source?.name ?? "" });
  ui.notifications.info(`Sent to the GM: ${target.name} loses ${count} blessing${count === 1 ? "" : "s"}.`);
  return true;
}

/** GM side of the relay (called from the IconCombat socket handler). */
export async function handleInflictSocket(data) {
  if (data?.type !== "inflictStatus") return;
  const target = await fromUuid(data.targetUuid ?? "");
  if (!target) return;
  await applyStatusDirect({
    target, statusId: data.statusId, ongoing: !!data.ongoing, label: data.label ?? "",
    abilityName: data.abilityName ?? "", sourceName: data.sourceName ?? "", note: data.note ?? "",
    expiry: data.expiry ?? null, remove: Math.max(0, Math.min(99, Number(data.remove) || 0)),
  });
}

async function _chat(actor, html) {
  try {
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="icon-chat-card icon-chat-card--status-applied">${html}</div>` });
  } catch (err) { console.warn("[ICON | InflictStatus] chat failed", err); }
}
