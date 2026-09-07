/**
 * BaseActorSheet — shared ApplicationV2 base class for all four actor sheets
 * (Icon / Foe / Legend / Summon).
 *
 * Owns the listener wiring that used to be copy-pasted into every sheet's
 * _onRender: the once-per-element drop binding, the portrait FilePicker, and
 * the right-click handlers for elevation, stackable status charges and
 * ongoing-status cycling. All bindings are guarded per element because
 * `this.element` persists across re-renders in ApplicationV2 — rebinding on
 * every render would stack N duplicate listeners.
 */
import { applyStatus, removeStatus, hasStatus,
         adjustStatusCharges, cycleOngoingStatus } from "../../combat/statuses.mjs";
import { mergeLiveArrayElements } from "../../helpers/form-arrays.mjs";

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

export class BaseActorSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {

  _log(...args) {
    console.debug(`[ICON | ${this.constructor.name}]`, ...args);
  }

  _onRender(context, options) {
    super._onRender(context, options);
    for (const [group, tabId] of Object.entries(this.tabGroups)) {
      this.changeTab(tabId, group, { initial: true });
    }
    this.#bindSharedListeners();
  }

  /* -------------------------------------------------- */
  /*  Re-render state preservation                       */
  /* -------------------------------------------------- */

  /**
   * Keep `<details>` open/closed state across re-renders. Core's
   * `Combat#_onUpdate` → `updateCombatantActors()` re-renders every
   * combatant's sheet on each turn change, and `submitOnChange` re-renders on
   * every form edit — without this, every collapsible (Basic Actions, class
   * rules, bond details, foe "Edit Effects"…) snapped shut whenever anyone
   * ended their turn. Keyed by `data-details-key` when present, otherwise by
   * position within the part.
   * @override
   */
  _preSyncPartState(partId, newElement, priorElement, state) {
    super._preSyncPartState(partId, newElement, priorElement, state);
    state.openDetails = Array.from(priorElement.querySelectorAll("details")).map((d, i) => ({
      key:  d.dataset.detailsKey ?? String(i),
      open: d.open,
    }));
  }

  /** @override */
  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);
    if (!state.openDetails?.length) return;
    const byKey = new Map(state.openDetails.map(s => [s.key, s.open]));
    newElement.querySelectorAll("details").forEach((d, i) => {
      const key = d.dataset.detailsKey ?? String(i);
      if (byKey.has(key)) d.open = byKey.get(key);
    });
  }

  /**
   * Drop handler hook — subclasses override with their own routing.
   * The base class binds it ONCE per element; subclasses keep their own
   * re-entry guard (_dropInProgress) where they need one.
   */
  async _onDropSheet(event) {}

  /* -------------------------------------------------- */
  /*  Form submission — protect partially-rendered arrays */
  /* -------------------------------------------------- */

  /**
   * Merge every submitted array element onto its live counterpart BEFORE the
   * clean step in _prepareSubmitData, so element fields with no form input
   * (foe action tags, burden clock values, primary-job flag…) survive the
   * submit instead of being reset to their schema initial. See
   * helpers/form-arrays.mjs for the full story.
   * @override
   */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData);
    const schema = this.document.system?.schema;
    const sub    = submitData?.system;
    if (schema && sub) {
      const merged = mergeLiveArrayElements(schema, sub, this.document.system.toObject());
      if (merged.length) this._log(`_processFormData — merged live data into array elements: ${merged.join(", ")}`);
    }
    return submitData;
  }

  #bindSharedListeners() {
    const html = this.element;

    // Global drop handler — bind ONCE per element (persists across re-renders).
    if (!html.dataset.iconDropBound) {
      html.dataset.iconDropBound = "true";
      html.addEventListener("dragover", ev => ev.preventDefault());
      html.addEventListener("drop",     ev => this._onDropSheet(ev));
    }

    // Portrait img picker — V2 sheets don't auto-bind data-edit="img" the way
    // V1 did, so wire a click handler that opens FilePicker on the IMG element.
    html.querySelectorAll('img[data-edit="img"]').forEach(img => {
      if (img.dataset.iconImgBound) return;
      img.dataset.iconImgBound = "true";
      img.style.cursor = "pointer";
      img.addEventListener("click", ev => {
        if (!this.isEditable) return;
        ev.preventDefault();
        new foundry.applications.apps.FilePicker.implementation({
          type: "image",
          current: this.document.img,
          callback: path => {
            this._log(`portrait — picked: "${path}"`);
            this.document.update({ img: path });
          },
          top:  this.position.top + 40,
          left: this.position.left + 10,
        }).browse();
      });
    });

    // Elevation button (Conditions tab) — V2 actions only fire on click,
    // so wire the contextmenu (right-click) handler manually to decrement.
    html.querySelectorAll('button[data-action="adjustElevation"]').forEach(btn => {
      if (btn.dataset.iconCtxBound) return;
      btn.dataset.iconCtxBound = "true";
      btn.addEventListener("contextmenu", async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!this.isEditable) return;
        const actor = this.document;
        const current = actor.getFlag("icon-system", "elevation") ?? 0;
        const next = current - 1;
        this._log(`adjustElevation (right-click) — actor: "${actor.name}" | ${current} → ${next}`);
        await actor.setFlag("icon-system", "elevation", next);
        if (next !== 0 && !hasStatus(actor, "elevation")) {
          await applyStatus(actor, "elevation");
        } else if (next === 0 && hasStatus(actor, "elevation")) {
          await removeStatus(actor, "elevation");
        }
      });
    });

    // Stackable-status buttons (Blessed, Power Die, Vigilance) — right-click decrements.
    html.querySelectorAll('button[data-action="adjustStatusCharges"]').forEach(btn => {
      if (btn.dataset.iconCtxBound) return;
      btn.dataset.iconCtxBound = "true";
      btn.addEventListener("contextmenu", async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!this.isEditable) return;
        const statusId = btn.dataset.statusId;
        if (!statusId) return;
        const next = await adjustStatusCharges(this.document, statusId, -1);
        this._log(`adjustStatusCharges (right-click) — "${statusId}" → ${next}`);
      });
    });

    // Regular status toggles — right-click applies the + (ongoing) version.
    html.querySelectorAll('button[data-action="toggleStatus"]').forEach(btn => {
      if (btn.dataset.iconCtxBound) return;
      btn.dataset.iconCtxBound = "true";
      btn.addEventListener("contextmenu", async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!this.isEditable) return;
        const statusId = btn.dataset.statusId;
        if (!statusId) return;
        const state = await cycleOngoingStatus(this.document, statusId);
        this._log(`cycleOngoingStatus (right-click) — "${statusId}" → ${state}`);
      });
    });
  }
}
