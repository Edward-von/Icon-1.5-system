/**
 * sheet-dialogs.mjs — DialogV2 prompts used by the PC sheet.
 *
 * Extracted from IconSheet.mjs: these are self-contained prompt functions
 * (no sheet state), kept together so the god-file shrinks and the dialogs
 * can be reused or tested on their own.
 */
import { getActorStatusMods } from "../combat/status-modifiers.mjs";

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

/* Attack / Damage dialogs live in roll-dialogs.mjs (redesigned 9 Sept 2026);
 * re-exported here so the sheets keep importing them from one place. */
export { promptAttackMods, promptDamageMods } from "./roll-dialogs.mjs";

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
