/**
 * tours.mjs — Guided tours of the ICON 1.5 system (Foundry's built-in Tour
 * framework, Settings → Tours).
 *
 * The steps live in /tours/*.json, one file per tour, in the same format as
 * Foundry's own tours (resources/app/public/tours). A step is shown as a
 * tooltip next to the element matched by `selector`, or centred on screen when
 * `selector` is empty. Each "\n" in `content` starts a new paragraph.
 *
 * IconTour adds a few step keys on top of the core ones:
 *   sidebarTab  open the sidebar on that tab ("actors", "combat", "chat", ...)
 *   control     activate a scene control group ("tokens") before the step
 *   sheetTab    open the tour's character sheet on that tab; `selector` is
 *               then looked up inside the sheet
 *   fallback    selector to highlight when `selector` matches nothing (an
 *               empty combat, a character without a Limit Break, ...)
 * A step whose target is missing and has no usable fallback is shown centred
 * instead of aborting the tour.
 */

const _log = (...a) => console.debug("[ICON | Tours]", ...a);

const NAMESPACE = "icon-system";

/** Tours registered by the system, in the order they appear in Settings → Tours. */
const TOURS = [
  { id: "welcome",         file: "welcome.json" },
  { id: "character-sheet", file: "character-sheet.json", requiresCharacter: true },
  { id: "combat",          file: "combat.json" },
];

/**
 * The PC the sheet tour walks through: the user's assigned character, else the
 * first player character they own (for the GM, the first one in the world).
 * @returns {Actor|null}
 */
function tourCharacter() {
  const own = game.user.character;
  if (own?.type === "icon" && own.isOwner) return own;
  return game.actors.find(a => a.type === "icon" && a.isOwner) ?? null;
}

export class IconTour extends foundry.nue.Tour {

  /** Set on tours that need a player character (the sheet tour). */
  requiresCharacter = false;

  /** The character sheet opened by `sheetTab` steps. */
  #sheet = null;

  /** True while the current step is being shown centred because its target is missing. */
  #centred = false;

  /** @override */
  get canStart() {
    return !this.requiresCharacter || !!tourCharacter();
  }

  /** @override */
  async start() {
    if (this.requiresCharacter && !tourCharacter()) {
      ui.notifications.warn("Create a player character first (Actors tab → Create Actor → Player Character), then start this tour again.");
      return;
    }
    game.togglePause(false);
    return super.start();
  }

  /** @override */
  async _preStep() {
    await super._preStep();
    const step = this.currentStep;

    if (step.sidebarTab) {
      ui.sidebar?.expand?.();
      await ui[step.sidebarTab]?.activate?.();
    }

    if (step.control && canvas.scene) {
      ui.controls.activate({ control: step.control, tool: step.tool });
    }

    if (step.sheetTab) {
      const actor = tourCharacter();
      if (actor) {
        this.#sheet = actor.sheet;
        if (!this.#sheet.rendered) await this.#sheet.render({ force: true });
        this.#sheet.bringToFront?.();
        if (this.#sheet.tabGroups?.primary !== step.sheetTab) this.#sheet.changeTab(step.sheetTab, "primary");
      }
    }

    // Let the DOM settle (sidebar slide, sheet render) before measuring the target.
    await new Promise(r => setTimeout(r, 150));
  }

  /**
   * Look the selector up inside the open sheet for sheet steps, fall back to
   * `step.fallback`, and as a last resort show the step centred.
   * @override
   */
  _getTargetElement(selector) {
    const step = this.currentStep;
    const root = (step.sheetTab && this.#sheet?.element) ? this.#sheet.element : document;
    // getClientRects is empty for display:none (closed sidebar tabs), but not for fixed panels.
    const visible = el => !!el && el.getClientRects().length > 0;
    let el = root.querySelector(selector);
    if (!visible(el) && step.fallback) el = root.querySelector(step.fallback) ?? document.querySelector(step.fallback);
    if (visible(el)) return el;
    _log(`step "${step.id}": no visible target for "${selector}", showing it centred`);
    this.#centred = true;
    return null;
  }

  /**
   * A step whose target is missing is rendered like a selector-less step
   * (centred), instead of the core behaviour of throwing and ending the tour.
   * @override
   */
  async _renderStep() {
    if (!this.#centred) return super._renderStep();
    const step = this.currentStep;
    const selector = step.selector;
    step.selector = "";
    try { await super._renderStep(); }
    finally { step.selector = selector; }
  }

  /** @override */
  async _postStep() {
    // The core teardown removes the centred box only for selector-less steps.
    if (this.#centred && this.targetElement?.classList.contains("tour-center-step")) {
      this.targetElement.remove();
    }
    this.#centred = false;
    return super._postStep();
  }
}

/**
 * Register the system's tours. Called from the `setup` hook; a broken tour
 * file is logged and skipped, it never blocks the others.
 */
export async function registerIconTours() {
  for (const { id, file, requiresCharacter } of TOURS) {
    try {
      const tour = await IconTour.fromJSON(`systems/${NAMESPACE}/tours/${file}`);
      tour.requiresCharacter = !!requiresCharacter;
      game.tours.register(NAMESPACE, id, tour);
    } catch (err) {
      console.error(`ICON 1.5 | Tour "${id}" failed to register:`, err);
    }
  }
}

/** Start one of the system's tours by id ("welcome", "character-sheet", "combat"). */
export function startIconTour(id = "welcome") {
  const tour = game.tours.get(`${NAMESPACE}.${id}`);
  if (!tour) return ui.notifications.warn(`Tour "${id}" is not available.`);
  if (foundry.nue.Tour.tourInProgress) foundry.nue.Tour.activeTour.exit();
  return tour.reset().then(() => tour.start());
}
