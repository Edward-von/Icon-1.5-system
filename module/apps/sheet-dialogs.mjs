/**
 * sheet-dialogs.mjs — DialogV2 prompts used by the PC sheet.
 *
 * Extracted from IconSheet.mjs: these are self-contained prompt functions
 * (no sheet state), kept together so the god-file shrinks and the dialogs
 * can be reused or tested on their own.
 */
import { getActorStatusMods } from "../combat/status-modifiers.mjs";
import { hatredDamageHint } from "../combat/marks.mjs";
import { escapeHTML } from "../helpers/enrich.mjs";

const _log = (...args) => console.debug("[ICON | sheet-dialogs]", ...args);

/**
 * Narrative-roll dialog: boons / curses / push effort (+ roll type when the
 * difficulty-variants house rule is on). Returns
 * `{ rollType, boons, curses, pushEffort }` or `null` if the user cancels.
 *
 * The dialog shows a live preview of the effective dice pool and warns
 * when boons/curses exceed the net cap.
 */
export async function promptNarrativeRoll({ label, rating, effort }) {
  const canPush = effort.value > 0;
  const difficultyHouseRule = game.settings.get("icon-system", "hrNarrativeDifficultyVariants");
  const rollTypeRow = difficultyHouseRule ? `
      <div class="icon-roll-dialog__row">
        <label for="iconRollType">Roll Type</label>
        <select id="iconRollType" name="rollType">
          <option value="standard" selected>Standard  (1-3 fail / 4-5 partial / 6 success)</option>
          <option value="heroic">Heroic  (1-4 fail / 5 partial / 6 success)</option>
          <option value="routine">Routine  (1-2 fail / 3-4 partial / 5-6 success)</option>
        </select>
      </div>
  ` : `
      <input type="hidden" name="rollType" value="standard">
  `;
  const content = `
    <form class="icon-roll-dialog">
      <p>Rolling <strong>${label}</strong> — rating <strong>${rating}</strong>.</p>
      ${rollTypeRow}
      <div class="icon-roll-dialog__row">
        <label for="iconBoons">Boons <small>(+1d6 each)</small></label>
        <input type="number" id="iconBoons" name="boons" value="0" min="0" max="5">
      </div>
      <div class="icon-roll-dialog__row">
        <label for="iconCurses">Curses <small>(−1d6 each)</small></label>
        <input type="number" id="iconCurses" name="curses" value="0" min="0" max="5">
      </div>
      <div class="icon-roll-dialog__row icon-roll-dialog__row--check">
        <label>
          <input type="checkbox" name="pushEffort" ${canPush ? "" : "disabled"}>
          Push Effort (−1 effort, +1 boon)
          <small>${canPush ? `Current effort: ${effort.value}/${effort.max}` : "No effort available"}</small>
        </label>
      </div>
      <div class="icon-roll-dialog__preview" data-rating="${rating}">
        <div class="icon-roll-dialog__pool"></div>
        <div class="icon-roll-dialog__thresholds"></div>
        <div class="icon-roll-dialog__warn"></div>
        <div class="icon-roll-dialog__note">
          <small>Boons and curses cap at <strong>±2</strong> net. Push Effort adds an extra die <strong>on top</strong> of the cap.</small>
        </div>
      </div>
    </form>
  `;

  // Thresholds by roll type — kept in sync with ROLL_THRESHOLDS in rolls.mjs.
  const THRESHOLDS = {
    standard: { success: 6, partial: 4, desc: "1-3 fail / 4-5 partial / 6 success" },
    heroic:   { success: 6, partial: 5, desc: "1-4 fail / 5 partial / 6 success" },
    routine:  { success: 5, partial: 3, desc: "1-2 fail / 3-4 partial / 5-6 success" },
  };

  // Hook the next DialogV2 render to wire up the live preview — fires once.
  Hooks.once("renderDialogV2", (app, html) => {
    const form = html.querySelector("form.icon-roll-dialog");
    if (!form) return;

    const typeEl     = form.elements.rollType;
    const boonsEl    = form.elements.boons;
    const cursesEl   = form.elements.curses;
    const pushEl     = form.elements.pushEffort;
    const poolEl     = form.querySelector(".icon-roll-dialog__pool");
    const threshEl   = form.querySelector(".icon-roll-dialog__thresholds");
    const warnEl     = form.querySelector(".icon-roll-dialog__warn");

    const update = () => {
      const rollType  = typeEl?.value || "standard";
      const t         = THRESHOLDS[rollType] ?? THRESHOLDS.standard;
      const rawBoons  = Math.max(0, Number(boonsEl.value)  || 0);
      const rawCurses = Math.max(0, Number(cursesEl.value) || 0);
      const pushBonus = pushEl?.checked ? 1 : 0;
      // Boons/curses cap to ±cap net; push is added on top as bonus die.
      const cap       = CONFIG.ICON?.rules?.boonCurseCap ?? 2;
      const netRaw    = rawBoons - rawCurses;
      const netCapped = Math.max(-cap, Math.min(cap, netRaw));
      const effectivePool = Math.max(0, rating + netCapped + pushBonus);
      const isLowest  = effectivePool === 0;

      const netLabel  = netCapped > 0 ? `+${netCapped}` : `${netCapped}`;
      const pushLabel = pushBonus ? ` +1 <span class="icon-roll-dialog__push">push</span>` : "";
      poolEl.innerHTML = isLowest
        ? `<strong>Effective pool:</strong> 2d6 pick lowest <em>(rating ${rating} ${netLabel}${pushLabel} = 0)</em>`
        : `<strong>Effective pool:</strong> ${effectivePool}d6 pick highest <em>(rating ${rating} ${netLabel}${pushLabel})</em>`;

      threshEl.innerHTML = `<strong>${rollType[0].toUpperCase()}${rollType.slice(1)} thresholds:</strong> ${t.desc}`;

      // Warn when boons/curses exceed the cap (push is separate and always works).
      const warnings = [];
      if (netRaw > cap) {
        warnings.push(`⚠ Net would be +${netRaw}, capped at +${cap}. Extra boons wasted.`);
      } else if (netRaw < -cap) {
        warnings.push(`⚠ Net would be ${netRaw}, capped at −${cap}. Extra curses wasted.`);
      }
      warnEl.innerHTML = warnings.map(w => `<div>${w}</div>`).join("");
    };

    typeEl  ?.addEventListener("change", update);
    boonsEl  .addEventListener("input",  update);
    cursesEl .addEventListener("input",  update);
    pushEl  ?.addEventListener("change", update);
    update();
  });

  try {
    return await foundry.applications.api.DialogV2.prompt({
      window: { title: `Narrative Roll — ${label}` },
      content,
      modal: true,
      rejectClose: false,
      ok: {
        label: "🎲 Roll",
        callback: (event, button) => {
          const form = button.form;
          return {
            rollType:   form.elements.rollType?.value || "standard",
            boons:      Math.max(0, Number(form.elements.boons.value)  || 0),
            curses:     Math.max(0, Number(form.elements.curses.value) || 0),
            pushEffort: !!form.elements.pushEffort?.checked,
          };
        },
      },
    });
  } catch {
    return null;
  }
}

/** Minimal dialog for attack-roll modifiers. Pre-fills boons/curses from
 *  any active statuses on the actor (Dazed → +1 curse, etc.) and the target
 *  defense from the currently-targeted token, then shows a transparent
 *  breakdown so the player knows where the numbers came from. */
export async function promptAttackMods(ab, actor) {
  const auto = getActorStatusMods(actor);
  // Auto-detect target defense: if exactly one token is targeted, use its
  // defense. Multiple targets → use the lowest (most permissive). PCs use
  // system.combat.defense; foes/legends use system.defense.
  const targets = Array.from(game.user?.targets ?? []);
  let autoDefense = "";
  let targetNote = "";
  if (targets.length > 0) {
    const defenses = targets.map(t => {
      const a = t.actor;
      return a?.system?.combat?.defense ?? a?.system?.defense ?? null;
    }).filter(d => d != null);
    if (defenses.length) {
      autoDefense = Math.min(...defenses);
      const names = targets.map(t => t.actor?.name ?? "?").join(", ");
      targetNote = `<p style="margin:0;font-size:.85em;color:#7fb2ff;border-left:3px solid #7fb2ff;padding-left:6px">🎯 Target: ${names} (DEF ${autoDefense})</p>`;
    }
  }

  // Auto-detect elevation difference (manual p.89):
  //   • Attacker HIGHER than target → +1 boon per level (height advantage)
  //   • Attacker LOWER  than target → +1 curse per level (height disadvantage)
  // Reads `flags.icon-system.elevation` from each actor (set via the
  // Conditions tab elevation button). Falls back to `token.elevation` if
  // the flag is missing, so existing tokens with elevation set still work.
  const readEl = (a, tok) => a?.getFlag?.("icon-system", "elevation")
                            ?? tok?.document?.elevation
                            ?? 0;
  const sourceToken = canvas?.tokens?.controlled?.find(t => t.actor?.id === actor.id)
                   ?? actor.getActiveTokens?.()?.[0]
                   ?? null;
  let elevationBoons  = 0;
  let elevationCurses = 0;
  let elevationNote = "";
  if (targets.length > 0) {
    const srcEl = readEl(actor, sourceToken);
    const elDiffs = targets.map(t => srcEl - readEl(t.actor, t));
    const worstDiff = Math.min(...elDiffs);
    const bestDiff  = Math.max(...elDiffs);
    if (worstDiff < 0) {
      elevationCurses = Math.abs(worstDiff);
      elevationNote = `Height disadvantage Δ${elevationCurses}: +${elevationCurses} curse${elevationCurses > 1 ? "s" : ""}`;
    } else if (bestDiff > 0) {
      elevationBoons = bestDiff;
      elevationNote = `Height advantage Δ${elevationBoons}: +${elevationBoons} boon${elevationBoons > 1 ? "s" : ""}`;
    }
  }

  const totalBoons  = auto.boons  + elevationBoons;
  const totalCurses = auto.curses + elevationCurses;
  const allNotes = [...auto.notes];
  if (elevationNote) allNotes.push(elevationNote);
  const noteHtml = allNotes.length
    ? `<p style="margin:0;font-size:.85em;color:#c4a64f;border-left:3px solid #c4a64f;padding-left:6px">⚠ Auto-applied: ${allNotes.join(" • ")}</p>`
    : "";
  const content = `
    <div style="display:flex; flex-direction:column; gap:6px; padding:4px 0">
      <p style="margin:0"><strong>${ab.name}</strong> — ${ab.cost}</p>
      ${targetNote}
      ${noteHtml}
      <label>Boons:  <input type="number" name="boons" value="${totalBoons}" min="0" max="9" style="width:60px"></label>
      <label>Curses: <input type="number" name="curses" value="${totalCurses}" min="0" max="9" style="width:60px"></label>
      <label>Target Defense: <input type="number" name="defense" value="${autoDefense}" min="0" placeholder="(optional)" style="width:80px"></label>
    </div>
  `;
  try {
    return await foundry.applications.api.DialogV2.prompt({
      window:   { title: `Attack: ${ab.name}` },
      content,
      ok: {
        label: "Roll Attack",
        callback: (_e, button, dialog) => {
          const root = button?.form ?? dialog?.element ?? dialog;
          const defenseVal = root.querySelector('input[name="defense"]')?.value;
          return {
            boons:   Number(root.querySelector('input[name="boons"]')?.value ?? 0),
            curses:  Number(root.querySelector('input[name="curses"]')?.value ?? 0),
            defense: defenseVal ? Number(defenseVal) : null,
          };
        },
      },
      rejectClose: false,
    });
  } catch { return null; }
}

/** Minimal dialog for damage-roll modifiers. */
export async function promptDamageMods(ab, combat, { comboDefault = false, actor = null } = {}) {
  const p = ab.parsed ?? { hit: {}, miss: {}, area: {} };
  // Hatred of X (p.104): half damage against anyone but X. Pre-ticked when the
  // current targets include someone else; the note explains the pick.
  const hatred = actor ? hatredDamageHint(actor) : { active: false };
  const hatredRow  = hatred.active
    ? `<label title="Hatred of ${escapeHTML(hatred.name)}: deal half damage to all foes other than ${escapeHTML(hatred.name)} (p.104)."><input type="checkbox" name="hatred" ${hatred.halve ? "checked" : ""}> Hatred (½ vs others)</label>`
    : "";
  const hatredNote = hatred.active
    ? `<p style="margin:0;font-size:.85em;color:#c4a64f;border-left:3px solid #c4a64f;padding-left:6px">⚠ ${escapeHTML(hatred.note)}</p>`
    : "";
  // Build human-readable formula strings from parsed data
  const fmtChunk = (c, label) => {
    const parts = [];
    if (c.mult > 0) parts.push(`${c.mult}[${combat.damagedie}]`);
    if (c.fray)     parts.push(`fray (${combat.fray})`);
    if (c.flat)     parts.push(`${c.flat} flat`);
    return parts.length ? `${label}: ${parts.join(" + ")}` : null;
  };
  const hitLabel  = fmtChunk(p.hit, "Hit")   || "Hit: (no damage)";
  const critLabel = p.hit.mult > 0 ? `Crit: ${p.hit.mult + 1}[${combat.damagedie}]${p.hit.fray ? ` + fray (${combat.fray})` : ""}` : "Crit: (no damage)";
  const missLabel = fmtChunk(p.miss, "Miss") || "Miss: (no damage)";
  const areaLabel = fmtChunk(p.area, "Area") || null;

  // Combo version, when the ability has one that deals damage: an explicit
  // checkbox so the roll uses the combo formula instead of the base one.
  const pc = ab.parsedCombo;
  const comboHitLabel = pc?.dealsDamage
    ? (fmtChunk(pc.hit, "hit") || fmtChunk(pc.area, "area") || "see card")
    : null;
  const comboRow = comboHitLabel ? `
      <label title="Roll the combo version's damage instead of the base ability's.">
        <input type="checkbox" name="useCombo" ${comboDefault ? "checked" : ""}>
        <strong>Combo version</strong> (${comboHitLabel})
      </label>` : "";

  const content = `
    <div style="display:flex; flex-direction:column; gap:6px; padding:4px 0">
      <p style="margin:0"><strong>${ab.name}</strong>${ab.isAutoHit ? ' <span class="icon-badge icon-badge--primary">Auto-hit</span>' : ""}</p>
      <label>Outcome:
        <select name="outcome">
          <option value="hit"  selected>${hitLabel}</option>
          ${p.hit.mult > 0 ? `<option value="crit">${critLabel}</option>` : ""}
          ${missLabel !== "Miss: (no damage)" ? `<option value="miss">${missLabel}</option>` : ""}
          ${areaLabel ? `<option value="area">${areaLabel}</option>` : ""}
        </select>
      </label>
      ${comboRow}
      <label>Target name: <input type="text" name="targetName" value="" style="width:140px"></label>
      <div style="display:flex; gap:10px; flex-wrap:wrap">
        <label title="Extra [D] dice added to the pool. Top N are summed where N = base dice count.">
          Bonus Damage: <input type="number" name="bonusDice" value="0" min="0" max="5" style="width:50px">
        </label>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap">
        <label><input type="checkbox" name="vulnerable"> Vulnerable (+1)</label>
        <label><input type="checkbox" name="resistance"> Resistance (½)</label>
        <label><input type="checkbox" name="weakened"> Weakened (−2)</label>
        ${hatredRow}
      </div>
      ${hatredNote}
      <p style="margin:2px 0 0; font-size:0.76em; color:var(--ic-text-dim); line-height:1.4">
        <em>Bonus Damage:</em> add K extra [D] to the pool, then sum the top N
        (where N = base dice count). Example: 2[D] + 1 bonus → roll 3 dice, sum the 2 highest.
      </p>
    </div>
  `;
  try {
    return await foundry.applications.api.DialogV2.prompt({
      window:   { title: `Damage: ${ab.name}` },
      content,
      ok: {
        label: "Roll Damage",
        callback: (_e, button, dialog) => {
          const root = button?.form ?? dialog?.element ?? dialog;
          return {
            outcome:    root.querySelector('select[name="outcome"]')?.value ?? "hit",
            targetName: root.querySelector('input[name="targetName"]')?.value ?? "",
            bonusDice:  Number(root.querySelector('input[name="bonusDice"]')?.value ?? 0),
            vulnerable: !!root.querySelector('input[name="vulnerable"]')?.checked,
            resistance: !!root.querySelector('input[name="resistance"]')?.checked,
            weakened:   !!root.querySelector('input[name="weakened"]')?.checked,
            hatred:     !!root.querySelector('input[name="hatred"]')?.checked,
            useCombo:   !!root.querySelector('input[name="useCombo"]')?.checked,
          };
        },
      },
      rejectClose: false,
    });
  } catch { return null; }
}

/**
 * Prompt the player for talent / mastery configuration when equipping an
 * ability via drag-drop. Returns:
 *   { talent: 0|1|2, mastered: boolean }
 * or null if the user cancelled the dialog.
 *
 * If the ability has no talents or mastery text, the dialog is skipped and
 * default values are returned.
 */
export async function promptAbilityConfig(item) {
  const s = item.system ?? {};
  const hasT1 = !!(s.talent1 && s.talent1.trim());
  const hasT2 = !!(s.talent2 && s.talent2.trim());
  const hasM  = !!(s.mastery && s.mastery.trim());

  // Nothing to configure — return defaults immediately
  if (!hasT1 && !hasT2 && !hasM) {
    return { talent: 0, mastered: false };
  }

  const parts = [];
  parts.push(`<div class="icon-ability-config-dialog">`);
  parts.push(`<p>Configure how <strong>${item.name}</strong> is unlocked on this character.</p>`);

  if (hasT1 || hasT2) {
    parts.push(`<h4 style="margin:8px 0 4px; color:var(--ic-gold-bright,#e8b828)">Talent <small>(mutually exclusive)</small></h4>`);
    parts.push(`<label style="display:block; margin:4px 0"><input type="radio" name="talent" value="0" checked> <em>None — no talent unlocked</em></label>`);
    if (hasT1) parts.push(`<label style="display:block; margin:4px 0"><input type="radio" name="talent" value="1"> <strong>Talent I:</strong> ${s.talent1}</label>`);
    if (hasT2) parts.push(`<label style="display:block; margin:4px 0"><input type="radio" name="talent" value="2"> <strong>Talent II:</strong> ${s.talent2}</label>`);
  }

  if (hasM) {
    parts.push(`<h4 style="margin:8px 0 4px; color:var(--ic-gold-bright,#e8b828)">Mastery</h4>`);
    parts.push(`<label style="display:block; margin:4px 0"><input type="checkbox" name="mastered"> <strong>★ Mastery unlocked:</strong> ${s.mastery}</label>`);
  }

  parts.push(`</div>`);

  try {
    const result = await foundry.applications.api.DialogV2.prompt({
      window:  { title: `Equip: ${item.name}` },
      position: { width: 520 },
      content:  parts.join(""),
      ok: {
        label: "Equip",
        callback: (_event, button, dialog) => {
          const root = button?.form ?? dialog?.element ?? dialog;
          const talentEl   = root?.querySelector?.('input[name="talent"]:checked');
          const masteredEl = root?.querySelector?.('input[name="mastered"]');
          return {
            talent:   Number(talentEl?.value ?? 0),
            mastered: !!masteredEl?.checked,
          };
        },
      },
      rejectClose: false,
    });
    return result ?? null;
  } catch (err) {
    _log(`promptAbilityConfig — dialog error:`, err);
    return null;
  }
}
