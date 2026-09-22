/**
 * ClockSheet — ApplicationV2 sheet for a board of campaign clocks
 * (actor type "clock", ClockData).
 *
 * A GM tool: quests, threats, projects, anything that fills up over time
 * (pp.140-145). Clicking a segment sets the clock to it, clicking the segment
 * a clock is already on steps it back by one — the same gesture as the burden
 * and ambition clocks on a character sheet, so it behaves the way the table
 * already expects.
 *
 * A clock marked "secret" is hidden from everyone but the GM, so one board can
 * hold what the players track and what they don't.
 */
import { enrichHTML } from "../../helpers/enrich.mjs";
import { REFERENCE_CONTROL, onShowReferenceControl } from "../../apps/reference.mjs";
import { BaseActorSheet } from "./BaseActorSheet.mjs";
import { CLOCK_SIZES } from "../../data/actor/ClockData.mjs";

const _log = (...args) => console.debug("[ICON | ClockSheet]", ...args);

export class ClockSheet extends BaseActorSheet {

  static DEFAULT_OPTIONS = {
    classes: ["icon", "sheet", "actor", "clock-sheet"],
    position: { width: 520, height: 560 },
    window:   { resizable: true, controls: [REFERENCE_CONTROL] },
    actions: {
      showReference:  onShowReferenceControl,
      addClock:       ClockSheet.#onAddClock,
      removeClock:    ClockSheet.#onRemoveClock,
      setClockValue:  ClockSheet.#onSetClockValue,
      adjustClock:    ClockSheet.#onAdjustClock,
      toggleSecret:   ClockSheet.#onToggleSecret,
      postClock:      ClockSheet.#onPostClock,
    },
    form: { submitOnChange: true },
  };

  static PARTS = {
    main: { template: "systems/icon-system/templates/actor/clock-sheet.hbs", scrollable: [""] },
  };

  get title() { return this.document.name; }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor   = this.document;
    const isGM    = game.user.isGM;

    context.actor      = actor;
    context.system     = actor.system;
    context.isEditable = this.isEditable;
    context.isGM       = isGM;
    context.enrichedNotes = await enrichHTML(actor.system.notes ?? "");

    // Segments carry their own index so the template stays a flat loop, and a
    // secret clock never reaches a player's browser at all.
    context.clocks = (actor.system.clocks ?? []).map((c, i) => ({
      ...c, i,
      hidden:   !!c.secret && !isGM,
      full:     c.max > 0 && c.value >= c.max,
      percent:  c.max > 0 ? Math.round((Math.min(c.value, c.max) / c.max) * 100) : 0,
      segments: Array.from({ length: c.max }, (_, k) => ({ n: k + 1, on: k + 1 <= c.value })),
      // The size dropdown must be able to show a size the board already holds,
      // or picking any other field would silently rewrite it to the first
      // option. The schema allows 1-24; CLOCK_SIZES is only the book's list.
      sizes:    CLOCK_SIZES.includes(c.max) ? CLOCK_SIZES : [...CLOCK_SIZES, c.max].sort((a, b) => a - b),
    })).filter(c => !c.hidden);

    _log(`_prepareContext — "${actor.name}" | ${context.clocks.length} clock(s) shown`);
    return context;
  }

  /**
   * Keep the clocks a viewer cannot see.
   *
   * A secret clock is not rendered for a player, so their form carries a gap —
   * `{0: …, 2: …}` for a board of three. ArrayField casts that to a
   * two-element array, so the hidden clock is deleted and everything after it
   * shifts up a place: the GM's secret clock disappears the moment a player
   * with edit rights renames the board. Start from what is stored and overlay
   * only the indices the form actually sent.
   * @override
   */
  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData);
    const sub = submitData?.system;
    if (!sub || sub.clocks === undefined || sub.clocks === null) return submitData;

    const live = this.document.system.toObject().clocks ?? [];
    const rebuilt = foundry.utils.deepClone(live);
    let overlaid = 0;
    for (const [k, el] of Object.entries(sub.clocks)) {
      const i = Number(k);
      if (!Number.isInteger(i) || !rebuilt[i] || foundry.utils.getType(el) !== "Object") continue;
      rebuilt[i] = foundry.utils.mergeObject(rebuilt[i], el, { inplace: false });
      overlaid++;
    }
    if (overlaid < live.length) this._log(`_processFormData — form carried ${overlaid} of ${live.length} clock(s); the rest kept as stored`);
    sub.clocks = rebuilt;
    return submitData;
  }

  /* -------------------------------------------------- */
  /*  Actions                                            */
  /* -------------------------------------------------- */

  /** Write the whole array back (ArrayField is replaced wholesale on update). */
  async #writeClocks(clocks) {
    await this.document.update({ "system.clocks": clocks });
  }

  #clocks() { return foundry.utils.deepClone(this.document.system.clocks ?? []); }

  static async #onAddClock(event) {
    event.preventDefault();
    const clocks = this.#clocks();
    clocks.push({ name: "New clock", value: 0, max: 6, color: "#c8961c", note: "", secret: false });
    _log(`addClock — now ${clocks.length}`);
    await this.#writeClocks(clocks);
  }

  static async #onRemoveClock(event, target) {
    event.preventDefault();
    const i = Number(target.dataset.index);
    const clocks = this.#clocks();
    if (!clocks[i]) return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Remove clock" },
      content: `<p>Remove <strong>${foundry.utils.escapeHTML(clocks[i].name || "this clock")}</strong>?</p>`,
    });
    if (!ok) return;
    clocks.splice(i, 1);
    await this.#writeClocks(clocks);
  }

  /** Click a segment: set the clock to it, or step back one when it's already there. */
  static async #onSetClockValue(event, target) {
    event.preventDefault();
    const i   = Number(target.dataset.index);
    const seg = Number(target.dataset.segment);
    const clocks = this.#clocks();
    const clock = clocks[i];
    if (!clock) return;
    const next = clock.value === seg ? seg - 1 : seg;
    clock.value = Math.max(0, Math.min(next, clock.max));
    _log(`setClockValue — "${clock.name}" → ${clock.value}/${clock.max}`);
    await this.#writeClocks(clocks);
  }

  static async #onAdjustClock(event, target) {
    event.preventDefault();
    const i = Number(target.dataset.index);
    const d = Number(target.dataset.delta) || 0;
    const clocks = this.#clocks();
    const clock = clocks[i];
    if (!clock) return;
    clock.value = Math.max(0, Math.min(clock.value + d, clock.max));
    await this.#writeClocks(clocks);
  }

  static async #onToggleSecret(event, target) {
    event.preventDefault();
    const i = Number(target.dataset.index);
    const clocks = this.#clocks();
    if (!clocks[i]) return;
    clocks[i].secret = !clocks[i].secret;
    await this.#writeClocks(clocks);
  }

  /** Post a clock to chat so the table sees where it stands. */
  static async #onPostClock(event, target) {
    event.preventDefault();
    const i = Number(target.dataset.index);
    const clock = (this.document.system.clocks ?? [])[i];
    if (!clock) return;
    const esc = foundry.utils.escapeHTML;
    const segs = Array.from({ length: clock.max }, (_, k) =>
      `<span class="icon-clock-seg${k + 1 <= clock.value ? " icon-clock-seg--filled" : ""}" style="--clock-color:${esc(clock.color)}"></span>`).join("");
    const full = clock.value >= clock.max;
    await ChatMessage.create({
      speaker: { alias: this.document.name },
      content: `<div class="icon-chat-card icon-chat-card--clock">
          <div class="icon-chat-card__title">${esc(clock.name || "Clock")} — ${clock.value}/${clock.max}</div>
          <div class="icon-clock-row">${segs}</div>
          ${clock.note ? `<div class="icon-chat-card__desc">${esc(clock.note)}</div>` : ""}
          ${full ? `<div class="icon-chat-card__desc"><strong>The clock is full.</strong></div>` : ""}
        </div>`,
      whisper: clock.secret ? ChatMessage.getWhisperRecipients("GM").map(u => u.id) : [],
    });
    _log(`postClock — "${clock.name}" ${clock.value}/${clock.max}${clock.secret ? " (whispered to the GM)" : ""}`);
  }
}
