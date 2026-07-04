/**
 * token-status-hud.mjs — PF2e-style status panel.
 *
 * When a token is selected, shows that token's active ICON status effects in a
 * large, readable panel anchored to the top-right of the screen (left of the
 * sidebar). Updates live as statuses are applied/removed and as stackable
 * charges (Blessed / Power Die / Vigilance) or Elevation change. Hidden when
 * nothing is selected or the selected token has no statuses.
 *
 * For tokens the current user OWNS (GM owns all), each row is interactive:
 *   • +/−  adjust stackable charges (Blessed/Power Die/Vigilance) and Elevation
 *   • ×    remove the status entirely
 */

import {
  ICON_STATUSES, STACKABLE_STATUSES, getStatusCharges,
  setStatusCharges, adjustStatusCharges, applyStatus, removeStatus, hasStatus,
} from "../combat/statuses.mjs";
import { escapeHTML } from "../helpers/enrich.mjs";

const PANEL_ID = "icon-token-status-hud";

/** A status is adjustable (has a +/− count) if it stacks or is Elevation. */
function _isAdjustable(id) {
  return STACKABLE_STATUSES.has(id) || id === "elevation";
}

/** The actor of the most-recently controlled token (or null). */
function _controlledActor() {
  const tokens = canvas?.tokens?.controlled ?? [];
  if (!tokens.length) return null;
  return tokens[tokens.length - 1]?.actor ?? null;
}

/** Active ICON statuses on an actor, with a count for stackable / elevation. */
function _statusesFor(actor) {
  if (!actor?.statuses) return [];
  const out = [];
  for (const def of ICON_STATUSES) {
    if (!actor.statuses.has(def.id)) continue;
    let count = 0;
    if (STACKABLE_STATUSES.has(def.id))   count = getStatusCharges(actor, def.id);
    else if (def.id === "elevation")      count = actor.getFlag("icon-system", "elevation") ?? 0;
    out.push({ id: def.id, name: def.name, img: def.img, count, adjustable: _isAdjustable(def.id) });
  }
  return out;
}

/* -------------------------------------------------- */
/*  Mutators (only run for owners)                     */
/* -------------------------------------------------- */

/** Set elevation to an exact value, syncing the elevation status effect. */
async function _setElevation(actor, value) {
  await actor.setFlag("icon-system", "elevation", value);
  if (value !== 0 && !hasStatus(actor, "elevation"))      await applyStatus(actor, "elevation");
  else if (value === 0 && hasStatus(actor, "elevation"))  await removeStatus(actor, "elevation");
}

/* -------------------------------------------------- */
/*  Panel element + delegated clicks                   */
/* -------------------------------------------------- */

/** Get (creating if needed) the panel element appended to the document body. */
function _ensurePanel() {
  let el = document.getElementById(PANEL_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = PANEL_ID;
    el.className = "icon-token-status-hud";
    el.addEventListener("click", _onPanelClick);
    el.addEventListener("contextmenu", _onPanelClick);
    document.body.appendChild(el);
  }
  return el;
}

/** Handle +/−/× on a status row. */
async function _onPanelClick(ev) {
  const btn = ev.target.closest("button[data-act]");
  if (!btn) return;
  ev.preventDefault();
  ev.stopPropagation();

  const row      = btn.closest("[data-status-id]");
  const statusId = row?.dataset.statusId;
  const actor    = _controlledActor();
  if (!actor || !statusId || !actor.isOwner) return;

  const act       = btn.dataset.act;
  const stackable = STACKABLE_STATUSES.has(statusId);
  const elevation = statusId === "elevation";

  try {
    if (act === "remove") {
      if (stackable)      await setStatusCharges(actor, statusId, 0);
      else if (elevation) await _setElevation(actor, 0);
      else                await removeStatus(actor, statusId);
    } else if (act === "inc") {
      if (stackable)      await adjustStatusCharges(actor, statusId, 1);
      else if (elevation) await _setElevation(actor, (actor.getFlag("icon-system", "elevation") ?? 0) + 1);
    } else if (act === "dec") {
      if (stackable)      await adjustStatusCharges(actor, statusId, -1);
      else if (elevation) await _setElevation(actor, (actor.getFlag("icon-system", "elevation") ?? 0) - 1);
    }
  } catch (err) {
    console.error("ICON 1.5 | Token status HUD action failed:", err);
  }
}

/** Re-render the panel for the currently controlled token. */
export function renderTokenStatusHud() {
  const el = _ensurePanel();
  const actor    = _controlledActor();
  const statuses = _statusesFor(actor);

  if (!actor || !statuses.length) {
    el.classList.remove("active");
    el.innerHTML = "";
    return;
  }

  const interactive = !!actor.isOwner;
  el.classList.toggle("interactive", interactive);
  el.classList.add("active");

  el.innerHTML = `
    <div class="icon-token-status-hud__title">${escapeHTML(actor.name)}</div>
    <div class="icon-token-status-hud__list">
      ${statuses.map(s => {
        const controls = interactive ? `
          <span class="icon-token-status-hud__controls">
            ${s.adjustable ? `
              <button type="button" data-act="dec" title="Decrease">−</button>
              <button type="button" data-act="inc" title="Increase">+</button>` : ""}
            <button type="button" data-act="remove" title="Remove ${escapeHTML(s.name)}">×</button>
          </span>` : "";
        const count = s.adjustable ? `<span class="icon-token-status-hud__count">${s.count}</span>` : "";
        return `
          <div class="icon-token-status-hud__item" data-status-id="${s.id}">
            <img src="${s.img}" alt="">
            <span class="icon-token-status-hud__name">${escapeHTML(s.name)}</span>
            ${count}
            ${controls}
          </div>`;
      }).join("")}
    </div>
  `;
}

/** Register the hooks that keep the panel in sync. Call once at ready. */
export function registerTokenStatusHud() {
  Hooks.on("controlToken", () => renderTokenStatusHud());
  Hooks.on("canvasReady",  () => renderTokenStatusHud());
  Hooks.on("deleteToken",  () => renderTokenStatusHud());

  // Status effects are ActiveEffects on the actor — refresh when the controlled
  // actor's effects change.
  for (const hook of ["createActiveEffect", "deleteActiveEffect", "updateActiveEffect"]) {
    Hooks.on(hook, (effect) => {
      if (effect?.parent === _controlledActor()) renderTokenStatusHud();
    });
  }

  // Stackable charges + elevation live on actor flags.
  Hooks.on("updateActor", (actor) => {
    if (actor === _controlledActor()) renderTokenStatusHud();
  });
}
