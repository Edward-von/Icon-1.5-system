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
 *   settingsTab open Configure Settings on that category ("system" for the
 *               ICON 1.5 settings); `selector` is then looked up inside it
 *   actorType   open the sheet of a world actor of that type ("foe",
 *               "legend", "clock"), on `sheetTab` if given; `selector` is
 *               then looked up inside it. No such actor → centred step
 *   openApp     open a system window ("encounter-designer"); `selector` is
 *               then looked up inside it. "character-creation" and "level-up"
 *               open the wizard / level-up dialog of the tour's character as a
 *               preview that saves nothing (option iconTour), closed at the end
 *               "quick-guide" opens the Quick Guide on the tab `guideTab`
 *   stage       with openApp "level-up": show stage 1 (benefits) or 2 (picks)
 *   wizardStep  scroll a wizard to its step of that data-step ("bond", "job"…)
 *   openHand    open the card hand of a Seer (the tour's character if it is
 *               one), else the first hand the user owns; `selector` is then
 *               looked up inside it. No hand → centred step
 *   fallback    selector to highlight when `selector` matches nothing (an
 *               empty combat, a character without a Limit Break, ...)
 * A step whose target is missing and has no usable fallback is shown centred
 * instead of aborting the tour.
 */

import { isSeer, seerHand } from "../combat/wheel-of-fate.mjs";
import { LevelUpDialog } from "./LevelUpDialog.mjs";
import { CharacterCreationDialog } from "./CharacterCreationDialog.mjs";
import { showReferenceGuide } from "./reference.mjs";

const _log = (...a) => console.debug("[ICON | Tours]", ...a);

const NAMESPACE = "icon-system";

/** Tours registered by the system, in the order they appear in Settings → Tours. */
const TOURS = [
  { id: "welcome",         file: "welcome.json" },
  { id: "character-sheet", file: "character-sheet.json", requiresCharacter: true },
  { id: "character-building", file: "character-building.json", requiresCharacter: true },
  { id: "combat",          file: "combat.json" },
  { id: "on-the-map",      file: "on-the-map.json" },
  { id: "narrative",       file: "narrative.json" },
  { id: "stalwart",        file: "stalwart.json",  actorClass: "stalwart" },
  { id: "vagabond",        file: "vagabond.json",  actorClass: "vagabond" },
  { id: "mendicant",       file: "mendicant.json", actorClass: "mendicant" },
  { id: "seer",            file: "seer.json" },
  { id: "wright",          file: "wright.json",    actorClass: "wright" },
  { id: "house-rules",     file: "house-rules.json" },
  { id: "gm-tools",        file: "gm-tools.json" },
];

/** Class of a PC's primary job ("stalwart", "vagabond", "mendicant", "wright"), or "". */
function primaryClass(actor) {
  const jobs = actor?.system?.combat?.jobs ?? [];
  const primary = jobs.find(j => j.primary) ?? (jobs.length === 1 ? jobs[0] : null);
  return String(primary?.class ?? "").toLowerCase();
}

/**
 * The PC the sheet tour walks through: the user's assigned character, else the
 * first player character they own (for the GM, the first one in the world).
 * With `cls`, only a character whose primary job is of that class.
 * @returns {Actor|null}
 */
function tourCharacter(cls = null) {
  const fits = a => a?.type === "icon" && a.isOwner && (!cls || primaryClass(a) === cls);
  const own = game.user.character;
  if (fits(own)) return own;
  return game.actors.find(fits) ?? null;
}

/**
 * A world actor of `type` for the GM tour: an open sheet first, else (for
 * foes and legends) one with actions to show, else the first by name.
 * @returns {Actor|null}
 */
function tourActor(type) {
  const all = game.actors.filter(a => a.type === type && a.isOwner).sort((a, b) => a.name.localeCompare(b.name));
  return all.find(a => a.sheet?.rendered)
      ?? all.find(a => (a.system.actions?.length ?? 0) > 0)
      ?? all[0] ?? null;
}

export class IconTour extends foundry.nue.Tour {

  /** Set on tours that need a player character (the sheet tour). */
  requiresCharacter = false;

  /** Set on the class tours: their sheet steps open a character of this class. */
  actorClass = null;

  /** The window the current step looks its selector up in (character sheet or settings). */
  #app = null;

  /** True while the current step is being shown centred because its target is missing. */
  #centred = false;

  /** Wizard / level-up previews this tour opened, closed when it ends. */
  #previews = new Set();

  /** @override */
  get canStart() {
    return !this.requiresCharacter || !!tourCharacter();
  }

  /** @override */
  async start() {
    // Settings → Tours already hides GM-only tours from players; this covers game.icon.startTour().
    if (this.config.restricted && !game.user.isGM) {
      ui.notifications.warn("This tour is for the GM only.");
      return;
    }
    if (this.requiresCharacter && !tourCharacter()) {
      ui.notifications.warn("Create a player character first (Actors tab → Create Actor → Player Character), then start this tour again.");
      return;
    }
    // The sheet tour suggests the class tour of the character it showed.
    if (this.id === "character-sheet") {
      this._baseSuggestions ??= [...(this.config.suggestedNextTours ?? [])];
      const cls = primaryClass(tourCharacter());
      const own = cls && game.tours.get(`${NAMESPACE}.${cls}`) ? [`${NAMESPACE}.${cls}`] : [];
      this.config.suggestedNextTours = [...own, ...this._baseSuggestions];
    }
    if (this.actorClass && !tourCharacter(this.actorClass)) {
      const cls = this.actorClass.charAt(0).toUpperCase() + this.actorClass.slice(1);
      ui.notifications.info(`You have no ${cls} character, so the steps about the sheet are shown in the middle of the screen.`);
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

    this.#app = null;
    if (step.actorType) {
      const sheet = tourActor(step.actorType)?.sheet;
      if (sheet) this.#app = await this.#openOnTab(sheet, step.sheetTab, "primary");
    }
    else if (step.openApp === "encounter-designer") {
      const app = game.icon?.openEncounterDesigner?.();
      // The designer loads the compendium roster before its first paint.
      for (let i = 0; app && !app.rendered && i < 40; i++) await new Promise(r => setTimeout(r, 100));
      this.#app = app ?? null;
    }
    else if (step.openApp === "quick-guide") {
      this.#app = (await showReferenceGuide({ tab: step.guideTab })) ?? foundry.applications.instances.get("icon-quick-guide") ?? null;
    }
    else if (step.openApp === "character-creation" || step.openApp === "level-up") {
      this.#app = await this.#openPreview(step);
    }
    else if (step.openHand) {
      const seer = [tourCharacter(), ...game.actors].find(a => a && isSeer(a) && a.isOwner && seerHand(a));
      const hand = seer ? seerHand(seer) : game.cards.find(c => c.type === "hand" && c.isOwner);
      if (hand) this.#app = await this.#openOnTab(hand.sheet, null, null);
    }
    else if (step.sheetTab) {
      const sheet = tourCharacter(this.actorClass)?.sheet;
      if (sheet) this.#app = await this.#openOnTab(sheet, step.sheetTab, "primary");
    }
    else if (step.settingsTab) {
      this.#app = await this.#openOnTab(game.settings.sheet, step.settingsTab, "categories");
    }

    // Let the DOM settle (sidebar slide, sheet render) before measuring the target.
    await new Promise(r => setTimeout(r, 150));
  }

  /**
   * Open the tour character's setup wizard or level-up dialog as a preview
   * (it saves nothing, see the iconTour option), reusing the one this tour
   * already opened. Opening either one only reads the actor.
   * @returns {Promise<foundry.applications.api.ApplicationV2|null>}
   */
  async #openPreview(step) {
    const actor = tourCharacter(this.actorClass);
    if (!actor) return null;
    const Cls = step.openApp === "level-up" ? LevelUpDialog : CharacterCreationDialog;
    let app = [...this.#previews].find(a => a instanceof Cls && a.actor === actor);
    if (!app) {
      app = new Cls(actor, { iconTour: true });
      this.#previews.add(app);
    }
    if (step.stage && app instanceof LevelUpDialog && app._stage !== step.stage) {
      if (app.rendered) app._captureForm?.();
      app._stage = step.stage;
    }
    await app.render({ force: true });
    app.bringToFront?.();
    if (step.wizardStep) app.element?.querySelector(`.icon-wizard__step[data-step="${step.wizardStep}"]`)?.scrollIntoView({ block: "start" });
    return app;
  }

  /** Close the previews this tour opened. */
  async #closePreviews() {
    for (const app of this.#previews) { try { await app.close(); } catch { /* already closed */ } }
    this.#previews.clear();
  }

  /** @override */
  exit() {
    this.#closePreviews();
    return super.exit();
  }

  /** @override */
  async complete() {
    await this.#closePreviews();
    return super.complete();
  }

  /**
   * Render an application (if closed), bring it to the front and switch it to a tab.
   * @returns {Promise<foundry.applications.api.ApplicationV2>}
   */
  async #openOnTab(app, tab, group) {
    if (!app.rendered) await app.render({ force: true });
    app.bringToFront?.();
    if (tab && app.tabGroups?.[group] !== tab) app.changeTab(tab, group);
    return app;
  }

  /**
   * Look the selector up inside the open sheet or settings window for sheet steps, fall back to
   * `step.fallback`, and as a last resort show the step centred.
   * @override
   */
  _getTargetElement(selector) {
    const step = this.currentStep;
    const root = this.#app?.element ?? document;
    // getClientRects is empty for display:none (closed sidebar tabs), but not for fixed panels.
    const visible = el => !!el && el.getClientRects().length > 0;
    // First visible match: a chip inside a closed ability panel comes before the one in the open panel.
    // The window itself counts too ("#icon-quick-guide" with the Quick Guide open).
    const firstVisible = (r, sel) => [...(r.matches?.(sel) ? [r] : []), ...r.querySelectorAll(sel)].find(visible) ?? null;
    let el = firstVisible(root, selector);
    if (!el && step.fallback) el = firstVisible(root, step.fallback) ?? firstVisible(document, step.fallback);
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
  for (const { id, file, requiresCharacter, actorClass } of TOURS) {
    try {
      const tour = await IconTour.fromJSON(`systems/${NAMESPACE}/tours/${file}`);
      tour.requiresCharacter = !!requiresCharacter;
      tour.actorClass = actorClass ?? null;
      game.tours.register(NAMESPACE, id, tour);
    } catch (err) {
      console.error(`ICON 1.5 | Tour "${id}" failed to register:`, err);
    }
  }
}

/** Start one of the system's tours by id ("welcome", "character-sheet", "character-building", "combat", "on-the-map", "narrative", "stalwart", "vagabond", "mendicant", "seer", "wright", "house-rules", "gm-tools"). */
export function startIconTour(id = "welcome") {
  const tour = game.tours.get(`${NAMESPACE}.${id}`);
  if (!tour) return ui.notifications.warn(`Tour "${id}" is not available.`);
  if (foundry.nue.Tour.tourInProgress) foundry.nue.Tour.activeTour.exit();
  return tour.reset().then(() => tour.start());
}
