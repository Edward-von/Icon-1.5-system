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
import { applyStatus, removeStatus, hasStatus, getStatusCharges,
         adjustStatusCharges, cycleOngoingStatus, saveableStatusEffects } from "../../combat/statuses.mjs";
import { saveRoll } from "../../dice/rolls.mjs";
import { mergeLiveArrayElements } from "../../helpers/form-arrays.mjs";

const { HandlebarsApplicationMixin, DocumentSheetV2 } = foundry.applications.api;

export class BaseActorSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {

  /** Actions every sheet gets. Subclasses list `rollSave: BaseActorSheet.onRollSave`
   *  in their own DEFAULT_OPTIONS as well, so the button works whether or not
   *  ApplicationV2 merges the base class's options. */
  static DEFAULT_OPTIONS = {
    actions: {
      rollSave: BaseActorSheet.onRollSave,
    },
  };

  _log(...args) {
    console.debug(`[ICON | ${this.constructor.name}]`, ...args);
  }

  /* -------------------------------------------------- */
  /*  Saves                                              */
  /* -------------------------------------------------- */

  /** The statuses on this actor that a save can still clear (p.94). */
  _saveableStatuses() {
    return saveableStatusEffects(this.document).map(e => ({
      uuid: e.uuid,
      name: e.name,
      img:  e.img,
      id:   e.statuses?.first?.() ?? e.getFlag("core", "statusId") ?? "",
    }));
  }

  /**
   * Roll a save (1d20 + boons − curses, 10+ succeeds, p.94). Shared by every
   * sheet: a foe or a legend saves exactly like a character, and the button on
   * the Conditions tab passes the status it is rolling against
   * (`data-effect-uuid`), so a successful save removes it. The generic button
   * (no uuid) asks which status by hand.
   */
  static async onRollSave(event, target) {
    event?.stopPropagation?.();
    const actor = this.document;
    const list  = this._saveableStatuses();
    const picked = target?.dataset?.effectUuid
      ? list.find(s => s.uuid === target.dataset.effectUuid)
      : null;

    const blessings = getStatusCharges(actor, "blessed");
    const options = list.map(s => `<option value="${s.uuid}"${picked?.uuid === s.uuid ? " selected" : ""}>${s.name}</option>`).join("");
    const content = `
      <div class="icon-save-dialog">
        ${list.length
          ? `<label>Status <select name="effectUuid">${options}<option value="">— other (type it) —</option></select></label>`
          : `<p class="notes">No status on ${actor.name} can be saved against right now — type one below to roll anyway.</p>`}
        <label>Or a status by name <input type="text" name="statusLabel" value="${picked ? "" : "status"}" placeholder="status"></label>
        <label><input type="checkbox" name="ongoing"> Ongoing + (automatic failure)</label>
        ${blessings > 0
          ? `<label><input type="checkbox" name="useBlessing"> Spend a Blessed charge for +1 boon (${blessings} left)</label>`
          : `<p class="notes">Not blessed.</p>`}
        <div class="icon-save-dialog__mods">
          <label>Boons <input type="number" name="boons" value="0" min="0" max="9"></label>
          <label>Curses <input type="number" name="curses" value="0" min="0" max="9"></label>
        </div>
      </div>`;

    let result;
    try {
      result = await foundry.applications.api.DialogV2.prompt({
        window: { title: `Save — ${actor.name}` },
        content,
        ok: {
          label: "🎲 Roll Save",
          callback: (_e, button, dialog) => {
            const root = button?.form ?? dialog?.element ?? dialog;
            const q = (n) => root.querySelector(`[name="${n}"]`);
            return {
              effectUuid:  q("effectUuid")?.value ?? "",
              statusLabel: q("statusLabel")?.value?.trim() ?? "",
              ongoing:     !!q("ongoing")?.checked,
              useBlessing: !!q("useBlessing")?.checked,
              boons:       Math.max(0, Number(q("boons")?.value) || 0),
              curses:      Math.max(0, Number(q("curses")?.value) || 0),
            };
          },
        },
        rejectClose: false,
      });
    } catch { return; }
    if (!result) return;

    const effect = result.effectUuid ? list.find(s => s.uuid === result.effectUuid) : null;
    const label  = effect?.name || result.statusLabel || "status";

    let boons = result.boons, boonNote = "";
    if (result.useBlessing && blessings > 0) {
      boons += 1;
      boonNote = "blessing";
      await adjustStatusCharges(actor, "blessed", -1);   // clears Blessed at 0
    }

    this._log(`rollSave — "${label}" | ongoing: ${result.ongoing} | boons: ${boons} | curses: ${result.curses}`);
    const { success } = await saveRoll({
      statusLabel: label,
      ongoing:     result.ongoing,
      boons, boonNote,
      curses:      result.curses,
      actor,
    });

    // A successful save clears the status it was rolled against.
    if (success && effect?.uuid && !result.ongoing) {
      try { await (await fromUuid(effect.uuid))?.delete(); }
      catch (err) { console.warn("[ICON | BaseActorSheet] could not remove the saved status", err); }
    }
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
   *
   * The same goes for panels that aren't `<details>` but are shown/hidden by
   * our own JS (the equipped-ability preview opened by clicking a slot): the
   * template always re-renders them with the `hidden` attribute, so their
   * open state has to be carried over too. Those carry a stable
   * `data-toggle-key`; anything without one is left alone.
   * @override
   */
  _preSyncPartState(partId, newElement, priorElement, state) {
    super._preSyncPartState(partId, newElement, priorElement, state);
    state.openDetails = Array.from(priorElement.querySelectorAll("details")).map((d, i) => ({
      key:  d.dataset.detailsKey ?? String(i),
      open: d.open,
    }));
    state.togglePanels = Array.from(priorElement.querySelectorAll("[data-toggle-key]")).map(el => ({
      key:    el.dataset.toggleKey,
      hidden: el.hidden,
    }));
  }

  /** @override */
  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);
    if (state.openDetails?.length) {
      const byKey = new Map(state.openDetails.map(s => [s.key, s.open]));
      newElement.querySelectorAll("details").forEach((d, i) => {
        const key = d.dataset.detailsKey ?? String(i);
        if (byKey.has(key)) d.open = byKey.get(key);
      });
    }
    if (state.togglePanels?.length) {
      const byKey = new Map(state.togglePanels.map(s => [s.key, s.hidden]));
      newElement.querySelectorAll("[data-toggle-key]").forEach(el => {
        const key = el.dataset.toggleKey;
        if (byKey.has(key)) el.hidden = byKey.get(key);
      });
    }
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
      // Summon chips: dragging one onto the canvas drops the compendium actor
      // there, which is how Foundry places a token. Delegated, so the chips of
      // every re-render are covered by this single listener.
      html.addEventListener("dragstart", ev => {
        const chip = ev.target?.closest?.("[data-summon-uuid]");
        if (!chip) return;
        ev.dataTransfer?.setData("text/plain", JSON.stringify({
          type: "Actor", uuid: chip.dataset.summonUuid,
        }));
        ev.dataTransfer.effectAllowed = "copy";
        this._log?.(`summon drag — "${chip.dataset.summonName}"`);
      });
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
