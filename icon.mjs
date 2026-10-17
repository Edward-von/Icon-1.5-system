/**
 * icon.mjs — Entry point for ICON 1.5 Foundry VTT v13 system.
 */

/* -------------------------------------------------- */
/*  Config                                             */
/* -------------------------------------------------- */
import { ICON } from "./module/config.mjs";

/* -------------------------------------------------- */
/*  Data Models — Actors                               */
/* -------------------------------------------------- */
import { IconData   } from "./module/data/actor/IconData.mjs";
import { SummonData } from "./module/data/actor/SummonData.mjs";
import { ClockData } from "./module/data/actor/ClockData.mjs";
import { FoeData    } from "./module/data/actor/FoeData.mjs";
import { LegendData } from "./module/data/actor/LegendData.mjs";

/* -------------------------------------------------- */
/*  Data Models — Items                                */
/* -------------------------------------------------- */
import { AbilityData    } from "./module/data/item/AbilityData.mjs";
import { LimitBreakData } from "./module/data/item/LimitBreakData.mjs";
import { TraitData      } from "./module/data/item/TraitData.mjs";
import { RelicData      } from "./module/data/item/RelicData.mjs";
import { BondData       } from "./module/data/item/BondData.mjs";
import { BondPowerData  } from "./module/data/item/BondPowerData.mjs";
import { GearKitData    } from "./module/data/item/GearKitData.mjs";
import { TrophyData     } from "./module/data/item/TrophyData.mjs";
import { FoeAbilityData } from "./module/data/item/FoeAbilityData.mjs";
import { JobTemplateData } from "./module/data/item/JobTemplateData.mjs";
import { FoeTemplateData } from "./module/data/item/FoeTemplateData.mjs";

/* -------------------------------------------------- */
/*  Actor & Item Documents                             */
/* -------------------------------------------------- */
import { IconActor } from "./module/actor/IconActor.mjs";
import { IconItem  } from "./module/item/IconItem.mjs";

/* -------------------------------------------------- */
/*  Sheets                                             */
/* -------------------------------------------------- */
import { IconSheet    } from "./module/actor/sheets/IconSheet.mjs";
import { SummonSheet  } from "./module/actor/sheets/SummonSheet.mjs";
import { ClockSheet   } from "./module/actor/sheets/ClockSheet.mjs";
import { FoeSheet     } from "./module/actor/sheets/FoeSheet.mjs";
import { LegendSheet  } from "./module/actor/sheets/LegendSheet.mjs";
import { IconItemSheet } from "./module/item/IconItemSheet.mjs";

/* -------------------------------------------------- */
/*  Combat                                             */
/* -------------------------------------------------- */
import { IconCombat, IconCombatant, registerCombatHooks } from "./module/combat/IconCombat.mjs";
import { IconCombatTracker } from "./module/combat/IconCombatTracker.mjs";

/* -------------------------------------------------- */
/*  Dice                                               */
/* -------------------------------------------------- */
import { narrativeRoll, combatRoll, saveRoll, damageRoll } from "./module/dice/rolls.mjs";

/* -------------------------------------------------- */
/*  Combat utilities (damage, status, vigor, wounds)  */
/* -------------------------------------------------- */
import { applyDamagePipeline, applyDamageToActor, addVigor, clearVigor,
         applyWound, recoverAction, postCombatHeal } from "./module/combat/damage.mjs";
import { registerStatuses, applyStatus, removeStatus,
         toggleOngoing, hasStatus }                 from "./module/combat/statuses.mjs";

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */
import { registerHandlebarsHelpers } from "./module/helpers/handlebars.mjs";

/* -------------------------------------------------- */
/*  Data migrations                                    */
/* -------------------------------------------------- */
import { registerMigrationSettings, runMigrations, syncWorldMacros } from "./module/migrations.mjs";

/* -------------------------------------------------- */
/*  Onboarding                                         */
/* -------------------------------------------------- */
import { showWelcomeGuide } from "./module/apps/welcome.mjs";
import { registerUpdateNoticeSetting, showUpdateNotice } from "./module/apps/update-notice.mjs";
import { EncounterDesigner } from "./module/apps/EncounterDesigner.mjs";
import { showReferenceGuide, registerQuickGuidePromptSetting, promptQuickGuide } from "./module/apps/reference.mjs";
import { registerIconTours, startIconTour } from "./module/apps/tours.mjs";

/* -------------------------------------------------- */
/*  Token status HUD (PF2e-style selected-token panel) */
/* -------------------------------------------------- */
import { registerTokenStatusHud } from "./module/apps/token-status-hud.mjs";
import { registerTrackerStatuses } from "./module/combat/tracker-statuses.mjs";

/* -------------------------------------------------- */
/*  Canvas — Blast / Line / Arc / Burst templates      */
/* -------------------------------------------------- */
import { registerAreaTemplates, placeAreaTemplate, areaFromTags,
         deleteAreaTemplates } from "./module/canvas/area-templates.mjs";

/* -------------------------------------------------- */
/*  Hatred of X + ability marks                        */
/* -------------------------------------------------- */
import { registerMarkHooks, applyHatred, applyMark, removeMark } from "./module/combat/marks.mjs";
import { registerFoeSummonHooks } from "./module/actor/foe-summons.mjs";
import { registerSummonImageHook } from "./module/helpers/summon-images.mjs";
import { loadSummonIndex } from "./module/helpers/summons.mjs";
import { registerClockTokenHooks } from "./module/canvas/clock-tokens.mjs";
import { registerMapObjectHooks, objectPierceAgainst } from "./module/canvas/map-objects.mjs";
import { registerWaterspout } from "./module/canvas/waterspout.mjs";
import { registerTerrainSpaceHooks } from "./module/canvas/terrain-spaces.mjs";
import { registerAreaMotion } from "./module/canvas/area-motion.mjs";
import { registerFollowMarks } from "./module/canvas/follow-marks.mjs";
import { registerGreatWheel } from "./module/combat/great-wheel.mjs";
import { registerWheelOfFate, buttonUsed, markDone } from "./module/combat/wheel-of-fate.mjs";
import { parseInflictedStatuses, abilityStatusEntries, npcActionStatusEntries, statusBlockHtml } from "./module/combat/ability-statuses.mjs";
import { bindInflictButtons, inflictStatus, decorateInflictCard, onInflictUsedUpdate } from "./module/combat/inflict-status.mjs";
import { rollGamble, bendFate } from "./module/combat/gamble.mjs";
import { damageMitigation, defenseChipsHtml, rollEvasion, defenseProfile } from "./module/combat/defenses.mjs";
import { decorateDamageInterrupts, bindInterruptVigorButtons, decorateAttackInterrupts } from "./module/combat/damage-interrupts.mjs";
import { injectCardMods, cardModsFor } from "./module/combat/damage-card-mods.mjs";

/* ================================================== */
/*  init                                              */
/* ================================================== */

Hooks.once("init", () => {
  console.log("ICON 1.5 | Initialising system");

  // ---- Rules toggles ----
  // Party Resolve +1 per round is RAW (manual p.99: "Party Resolve goes up by
  // 1 at the start of each round in combat"), so it is ON by default; the
  // setting key keeps its historical "hr" name so existing worlds keep their
  // stored choice.
  game.settings.register("icon-system", "hrPartyResolveAutoIncrement", {
    name: "Party Resolve +1 at the start of each round (RAW, p.99)",
    hint: "Party Resolve increases by 1 at the start of every combat round and is synced to every PC sheet. Turn off only if your table tracks it by hand.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // Dust for extra Burden segments is RAW too (p.42, Heal Burdens: "2 dust will
  // buy you 1 segment"; p.242 lists it again), so it is ON by default; the key
  // keeps its historical "hr" name so existing worlds keep their stored choice.
  game.settings.register("icon-system", "hrInterludeDustHealing", {
    name: "Dust to heal Burdens during an Interlude (RAW, p.42)",
    hint: "During an Interlude PCs may spend 2 Dust for each extra Burden segment healed, beyond the base 3. The Interlude macro asks how many. Turn off only if your table doesn't use it.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // ---- House rules (opt-in) ----
  // Off by default: divergences from the ICON 1.5 RAW manual.
  // Enabled by the GM in Configure Settings → System Settings.
  game.settings.register("icon-system", "hrNarrativeDifficultyVariants", {
    name: "House Rule — Heroic / Routine narrative difficulties",
    hint: "If enabled, the narrative-roll prompt lets you choose between Standard, Heroic (harder) and Routine (easier). House rule: the RAW manual only provides the Standard difficulty.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  // World data schema version — drives the migration framework (migrations.mjs).
  registerMigrationSettings();
  registerUpdateNoticeSetting();
  registerQuickGuidePromptSetting();

  // First-launch onboarding guide — shown once per user (client-scoped flag).
  game.settings.register("icon-system", "welcomeShown", {
    name:   "Welcome guide shown",
    scope:  "client",
    config: false,
    type:   Boolean,
    default: false,
  });

  // Encounter Designer — saved encounters (GM only, world-scoped, keyed by name).
  game.settings.register("icon-system", "encounterDrafts", {
    name:   "Saved encounters (Encounter Designer)",
    scope:  "world",
    config: false,
    type:   Object,
    default: {},
  });

  // Expose config
  CONFIG.ICON = ICON;

  // ---- Combat document class ----
  CONFIG.Combat.documentClass    = IconCombat;
  CONFIG.Combatant.documentClass = IconCombatant;
  CONFIG.ui.combat               = IconCombatTracker;

  // ---- Document classes ----
  CONFIG.Actor.documentClass = IconActor;
  CONFIG.Item.documentClass  = IconItem;

  // ---- Data models — Actors ----
  CONFIG.Actor.dataModels = {
    icon:   IconData,
    summon: SummonData,
    foe:    FoeData,
    legend: LegendData,
    clock:  ClockData,
  };

  // ---- Token resource bars ----
  // Which attributes the token-config "bar" dropdowns offer per actor type.
  // PCs keep combat stats under system.combat; foes/legends/summons at top level.
  CONFIG.Actor.trackableAttributes = {
    icon:   { bar: ["combat.hp", "combat.vigor"], value: [] },
    foe:    { bar: ["hp", "vigor"], value: [] },
    legend: { bar: ["hp", "vigor"], value: [] },
    summon: { bar: ["hp"], value: [] },
  };

  // ---- Data models — Items ----
  CONFIG.Item.dataModels = {
    "ability":     AbilityData,
    "limit-break": LimitBreakData,
    "trait":       TraitData,
    "relic":       RelicData,
    "bond":        BondData,
    "bond-power":  BondPowerData,
    "gear-kit":    GearKitData,
    "trophy":      TrophyData,
    "foe-ability":  FoeAbilityData,
    "job-template": JobTemplateData,
    "foe-template": FoeTemplateData,
  };

  // ---- Register sheets ----
  foundry.documents.collections.Actors.registerSheet("icon-system", IconSheet,   { types: ["icon"],    makeDefault: true });
  foundry.documents.collections.Actors.registerSheet("icon-system", FoeSheet,    { types: ["foe"],     makeDefault: true });
  foundry.documents.collections.Actors.registerSheet("icon-system", LegendSheet, { types: ["legend"],  makeDefault: true });
  foundry.documents.collections.Actors.registerSheet("icon-system", SummonSheet, { types: ["summon"],  makeDefault: true });
  foundry.documents.collections.Actors.registerSheet("icon-system", ClockSheet,  { types: ["clock"],   makeDefault: true });
  foundry.documents.collections.Items.registerSheet("icon-system",  IconItemSheet, { makeDefault: true });

  // ---- Status effects ----
  registerStatuses();

  // ---- Area templates (MeasuredTemplate subclass drawing ICON cell sets) ----
  registerAreaTemplates();

  // ---- Marks end when their marker is defeated ----
  registerMarkHooks();

  // ---- Foe / legend summons dragged from the sheet onto the canvas ----
  registerFoeSummonHooks();
  registerSummonImageHook();

  // ---- Campaign clocks dragged from the clock board onto the canvas ----
  registerClockTokenHooks();

  // ---- Objects a PC's ability / trait creates, dragged from the sheet onto the canvas (R33a) ----
  registerMapObjectHooks();

  // ---- Terrain spaces a PC's ability / trait marks: pits, dangerous / difficult terrain, named marks (R33b) ----
  registerTerrainSpaceHooks();

  // ---- Terrain-effect areas that move or grow: Tsunami, Waterspout, Bifröst Talent II, Shift + arrows (R33c) ----
  registerAreaMotion();
  // ---- Waterspout: characters sucked in (hidden) and spat out at the end of the creator's turn (p.235) ----
  registerWaterspout();

  // ---- Terrain marks put on a character, following them: Polaris Talent I, Amico, Waking Void (R33d) ----
  registerFollowMarks();

  // ---- Seer's cards: the Great Wheel effect of each card on Foundry's Cards sheets (R36, p.199) ----
  registerGreatWheel();
  // Seer's deck through the combat: draw up to 5, Skein, hand limit 7, reshuffle (p.199)
  registerWheelOfFate();

  // ---- Combat hooks (turn automation, tracker UI) ----
  registerCombatHooks();

  // ---- Handlebars helpers ----
  registerHandlebarsHelpers();

  // ---- Global API for macros ----
  game.icon = {
    narrativeRoll,
    combatRoll,
    saveRoll,
    damageRoll,
    applyDamagePipeline,
    applyDamageToActor,
    // Defensive automation (defenses.mjs): Evasion d6, Dodge / Cover / Resistance
    rollEvasion,
    defenseProfile,
    damageMitigation,
    addVigor,
    clearVigor,
    applyWound,
    recoverAction,
    postCombatHeal,
    applyStatus,
    removeStatus,
    toggleOngoing,
    hasStatus,
    IconCombat,
    showWelcomeGuide,
    showReferenceGuide,
    startTour: startIconTour,
    placeAreaTemplate,
    areaFromTags,
    deleteAreaTemplates,
    applyHatred,
    applyMark,
    removeMark,
    // Session 11 — inflicted statuses read from ability text
    parseInflictedStatuses,
    abilityStatusEntries,
    npcActionStatusEntries,
    statusBlockHtml,
    inflictStatus,
    openEncounterDesigner: () => EncounterDesigner.open(),
    EncounterDesigner,
  };

  console.log("ICON 1.5 | System initialised");
});

/* ================================================== */
/*  ready                                             */
/* ================================================== */

/* ----------------------------------------------------------------
 * preCreateActor: lock token rotation by default for new actors.
 * ICON tokens shouldn't rotate when moved — facing isn't a tactical
 * resource in this system. Existing actors must be updated manually
 * (right-click token → Configure → lock rotation).
 * ---------------------------------------------------------------- */
Hooks.on("preCreateActor", (doc, data /*, options, userId */) => {
  try {
    const updates = { "prototypeToken.lockRotation": true };
    // Default HP bar on tokens (player feedback: read HP without opening the
    // sheet). PC bars are visible to everyone; NPC bars to the owner (GM)
    // only. Skipped when the creator already configured a bar (e.g. actors
    // imported from a compendium that set their own).
    if (!data?.prototypeToken?.bar1?.attribute) {
      updates["prototypeToken.bar1.attribute"] = doc.type === "icon" ? "combat.hp" : "hp";
      updates["prototypeToken.displayBars"] = doc.type === "icon"
        ? CONST.TOKEN_DISPLAY_MODES.ALWAYS
        : CONST.TOKEN_DISPLAY_MODES.OWNER;
    }
    doc.updateSource(updates);
  } catch (err) {
    console.warn("ICON 1.5 | preCreateActor token defaults failed:", err);
  }
});

/* ----------------------------------------------------------------
 * preCreateToken: also lock rotation on every token placed on a scene,
 * regardless of the prototype settings. Belt-and-suspenders for actors
 * that were created before the prototype hook was installed.
 * ---------------------------------------------------------------- */
Hooks.on("preCreateToken", (doc, data /*, options, userId */) => {
  try {
    doc.updateSource({ lockRotation: true });
  } catch (err) {
    console.warn("ICON 1.5 | preCreateToken lockRotation failed:", err);
  }
});

Hooks.once("ready", async () => {
  console.log("ICON 1.5 | Ready");

  /* Migrate world data first, before anything else touches documents. */
  try {
    await runMigrations();
  } catch (err) {
    console.error("ICON 1.5 | Data migration failed:", err);
  }

  /* The summons pack index: the rule-keyword tooltips read it to tell "summon a
   * shadow" (a summon) from "summon a massive flock" (Morrigan, not one). Not
   * awaited; until it is read every "summon" keeps its tooltip. */
  loadSummonIndex();

  /* Macros dragged into the world are copies and never update by themselves —
   * refresh the ones that came from our compendium, once per system version. */
  try {
    await syncWorldMacros();
  } catch (err) {
    console.error("ICON 1.5 | Macro sync failed:", err);
  }

  /* Compendium copies in the world don't update: after a system update, tell
   * the GM to re-import foes / legends / items (once per version). Not awaited,
   * so the dialog doesn't hold up the rest of the ready hook. */
  showUpdateNotice().catch(err => console.error("ICON 1.5 | Update notice failed:", err));

  /* Selected-token status panel (top-right, PF2e-style). */
  try {
    registerTokenStatusHud();
    registerTrackerStatuses();
  } catch (err) {
    console.warn("ICON 1.5 | Token status HUD failed to register:", err);
  }

  /* The blocks below are defensive workarounds for bugs in Foundry v13's
   * Notifications / CombatTracker / token-HUD combat-toggle pipeline. They are
   * written to be harmless no-ops when the underlying bug is absent: each one
   * either acts only on a specific error string or guards for a missing method.
   * On v14+ they should be re-verified and removed once combat start, the token
   * HUD combat toggle, and notifications are confirmed working without them. */
  if ((game.release?.generation ?? 0) >= 14) {
    console.debug("ICON 1.5 | Foundry v14+ detected — the v13 compatibility shims in the ready hook are candidates for removal after a smoke test (combat toggle, notifications, tracker hover).");
  }

  /* First-launch onboarding: show the "how to build a character" guide once
   * per user. The flag is client-scoped, so every GM and player sees it on
   * their first load and never again automatically; it can be reopened any
   * time from the Character Management section of the PC sheet. */
  try {
    const firstLaunch = !game.settings.get("icon-system", "welcomeShown");
    if (firstLaunch) {
      showWelcomeGuide();
      await game.settings.set("icon-system", "welcomeShown", true);
    }
    /* Once per system version, every user is asked whether to open the Quick
     * Guide. On a first launch the welcome guide (which has its own Quick
     * Guide button) is already up, so the version is only recorded. */
    promptQuickGuide({ stampOnly: firstLaunch })
      .catch(err => console.warn("ICON 1.5 | Quick Guide prompt failed:", err));
  } catch (err) {
    console.warn("ICON 1.5 | Welcome guide failed:", err);
  }

  /* --------------------------------------------------------------
   * Monkey-patch ui.notifications.warn/info/error to swallow internal
   * formatter errors. Foundry v13 has a bug where the Notifications
   * class's internal #fetch throws "Cannot convert undefined or null
   * to object" when destructuring malformed data — this surfaces as
   * a cryptic console error during #onToggleCombat and other flows
   * even when the underlying operation succeeds. We wrap the three
   * notification methods so exceptions from the formatter are logged
   * quietly instead of propagating up the call stack.
   * -------------------------------------------------------------- */
  if (ui?.notifications) {
    for (const method of ["warn", "info", "error"]) {
      const original = ui.notifications[method]?.bind(ui.notifications);
      if (!original) continue;
      ui.notifications[method] = function(...args) {
        const swallow = (err) => {
          console.debug(`ICON 1.5 | Suppressed notifications.${method} error:`, err?.message || err, "args:", args);
          return null;
        };
        try {
          const result = original(...args);
          // Handle both sync throws AND async rejections from core's buggy
          // #fetch pipeline in Foundry v13's Notifications class.
          if (result && typeof result.catch === "function") {
            return result.catch(swallow);
          }
          return result;
        } catch (err) {
          return swallow(err);
        }
      };
    }
  }

  /* --------------------------------------------------------------
   * Global unhandled-rejection catcher for the "Cannot convert
   * undefined or null to object" errors originating from Foundry
   * core's Notifications #fetch. Prevents the cryptic red console
   * error when core's notification path rejects without being awaited.
   * -------------------------------------------------------------- */
  window.addEventListener("unhandledrejection", (ev) => {
    const msg = ev.reason?.message || String(ev.reason || "");
    if (msg.includes("Cannot convert undefined or null to object")) {
      console.debug("ICON 1.5 | Swallowed core notification rejection:", ev.reason);
      ev.preventDefault();
    }
  });

  /* --------------------------------------------------------------
   * Patch CombatTracker hover handlers. Foundry v13's
   * _onCombatantHoverIn/Out read `combatant.token.object` without a
   * null guard — when a combat still holds a combatant whose token
   * no longer exists on the current scene (stale combat, scene
   * switch, deleted token), hovering a row throws
   * "Cannot read properties of undefined (reading 'token')".
   * We wrap both handlers to swallow the error silently.
   * -------------------------------------------------------------- */
  try {
    const Tracker = foundry.applications.sidebar.tabs.CombatTracker;
    for (const method of ["_onCombatantHoverIn", "_onCombatantHoverOut"]) {
      const original = Tracker?.prototype?.[method];
      if (typeof original !== "function") continue;
      Tracker.prototype[method] = function(...args) {
        try {
          return original.apply(this, args);
        } catch (err) {
          console.debug(`ICON 1.5 | Suppressed CombatTracker.${method} error:`, err?.message || err);
          return null;
        }
      };
    }
  } catch (err) {
    console.warn("ICON 1.5 | Could not patch CombatTracker hover handlers:", err);
  }

  /* --------------------------------------------------------------
   * Override the token HUD "Toggle Combat State" button.
   *
   * Foundry v13 core's #onToggleCombat pipeline triggers a bug in
   * Notifications#fetch ("Cannot convert undefined or null to
   * object") that aborts the flow mid-execution, leaving the combat
   * tracker empty. Since #onToggleCombat is a private method we
   * can't patch it directly — instead we replace the click handler
   * on the HUD button with our own implementation that creates
   * the combat + combatants cleanly.
   * -------------------------------------------------------------- */
  Hooks.on("renderTokenHUD", (hud, html /*, data */) => {
    try {
      const root = html instanceof HTMLElement ? html : html?.[0];
      if (!root) return;
      const btn = root.querySelector('[data-action="combat"]')
               ?? root.querySelector('.control-icon.combat');
      if (!btn) return;

      // Clone-replace strips core's click listeners
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);

      fresh.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        try {
          await iconToggleCombatForHUD(hud);
        } catch (err) {
          console.error("ICON 1.5 | iconToggleCombatForHUD failed:", err);
          ui.notifications.error(`Toggle combat failed: ${err.message}. See console.`);
        }
      });
    } catch (err) {
      console.error("ICON 1.5 | Error wiring token HUD combat button:", err);
    }
  });

  /* Expose a manual migration on the global API. The automatic version was
   * disabled because it could leave tokens in a state Foundry's internal
   * #onToggleCombat couldn't handle, producing a cryptic
   * "Cannot convert undefined or null to object" error.
   *
   * Run from the GM console:
   *   await game.icon.linkAllTokens();
   */
  game.icon = game.icon ?? {};

  /** Delete all existing Combat encounters (useful when a combat is stuck). */
  game.icon.resetCombats = async function() {
    if (!game.user.isGM) { ui.notifications.warn("GM only."); return; }
    const all = [...game.combats];
    for (const c of all) {
      try { await c.delete(); } catch (err) {
        console.error(`ICON 1.5 | Failed to delete combat ${c.id}:`, err);
      }
    }
    ui.notifications.info(`ICON 1.5 — deleted ${all.length} combat${all.length !== 1 ? "s" : ""}.`);
  };

  game.icon.linkAllTokens = async function() {
    if (!game.user.isGM) {
      ui.notifications.warn("Only the GM can run this migration.");
      return;
    }

    let actorsFixed = 0;
    for (const actor of game.actors) {
      if (actor.prototypeToken?.actorLink !== true) {
        try {
          await actor.update({ "prototypeToken.actorLink": true });
          actorsFixed++;
        } catch (err) {
          console.error(`ICON 1.5 | Failed to link prototype for "${actor.name}":`, err);
        }
      }
    }

    let tokensFixed = 0;
    for (const scene of game.scenes) {
      const unlinked = scene.tokens.filter(t =>
        t.actorLink !== true &&
        t.actorId &&
        game.actors.has(t.actorId)       // skip tokens with dangling actor refs
      );
      if (!unlinked.length) continue;
      const updates = unlinked.map(t => ({ _id: t.id, actorLink: true }));
      try {
        await scene.updateEmbeddedDocuments("Token", updates);
        tokensFixed += unlinked.length;
      } catch (err) {
        console.error(`ICON 1.5 | Failed to link tokens on scene "${scene.name}":`, err);
      }
    }

    const msg = `ICON 1.5 — linkAllTokens: ${actorsFixed} actor prototype${actorsFixed !== 1 ? "s" : ""}, ${tokensFixed} placed token${tokensFixed !== 1 ? "s" : ""} updated.`;
    console.log(`ICON 1.5 | ${msg}`);
    ui.notifications.info(msg);
  };

  /**
   * Retrofit the default HP bar onto existing actors and placed tokens.
   * New actors get it automatically (preCreateActor hook); this migrates a
   * world created before that. Run from the GM console:
   *   await game.icon.enableTokenBars();
   */
  game.icon.enableTokenBars = async function() {
    if (!game.user.isGM) {
      ui.notifications.warn("Only the GM can run this migration.");
      return;
    }
    const barFor = type => ({
      attribute:   type === "icon" ? "combat.hp" : "hp",
      displayBars: type === "icon"
        ? CONST.TOKEN_DISPLAY_MODES.ALWAYS
        : CONST.TOKEN_DISPLAY_MODES.OWNER,
    });

    let actorsFixed = 0;
    for (const actor of game.actors) {
      if (actor.prototypeToken?.bar1?.attribute) continue;
      const { attribute, displayBars } = barFor(actor.type);
      try {
        await actor.update({
          "prototypeToken.bar1.attribute": attribute,
          "prototypeToken.displayBars":    displayBars,
        });
        actorsFixed++;
      } catch (err) {
        console.error(`ICON 1.5 | Failed to set HP bar for "${actor.name}":`, err);
      }
    }

    let tokensFixed = 0;
    for (const scene of game.scenes) {
      const missing = scene.tokens.filter(t => !t.bar1?.attribute && t.actor);
      if (!missing.length) continue;
      const updates = missing.map(t => {
        const { attribute, displayBars } = barFor(t.actor.type);
        return { _id: t.id, "bar1.attribute": attribute, displayBars };
      });
      try {
        await scene.updateEmbeddedDocuments("Token", updates);
        tokensFixed += missing.length;
      } catch (err) {
        console.error(`ICON 1.5 | Failed to set HP bars on scene "${scene.name}":`, err);
      }
    }

    const msg = `ICON 1.5 — enableTokenBars: ${actorsFixed} actor prototype${actorsFixed !== 1 ? "s" : ""}, ${tokensFixed} placed token${tokensFixed !== 1 ? "s" : ""} updated.`;
    console.log(`ICON 1.5 | ${msg}`);
    ui.notifications.info(msg);
  };
});

/* ================================================== */
/*  Token HUD — custom toggle combat                   */
/* ================================================== */

/**
 * Replacement for Foundry core's token HUD combat-toggle flow.
 * Bypasses the buggy Notifications#fetch path by doing the combat
 * and combatant creation directly.
 *
 * Behavior: toggles every currently-controlled token. If none are
 * controlled, toggles the token the HUD is attached to. Creates a
 * Combat for the active scene if none exists.
 */
async function iconToggleCombatForHUD(hud) {
  const scene = canvas.scene;
  if (!scene) {
    ui.notifications.warn("No active scene.");
    return;
  }

  /* --- Collect target tokens --- */
  const controlled = canvas.tokens?.controlled ?? [];
  const hudToken   = hud?.object;
  const targets    = controlled.length ? controlled : (hudToken ? [hudToken] : []);
  if (!targets.length) {
    ui.notifications.warn("No tokens selected.");
    return;
  }

  /* --- Get or create a Combat on this scene --- */
  let combat = game.combats.find(c => c.scene?.id === scene.id);
  if (!combat) {
    combat = await Combat.create({ scene: scene.id, active: true });
    if (!combat) {
      ui.notifications.error("Failed to create combat.");
      return;
    }
  }
  if (!combat.active) {
    try { await combat.activate(); } catch (err) {
      console.warn("ICON 1.5 | Could not activate combat:", err);
    }
  }

  /* --- Ensure combat.previous is an object, not null ---
   * Foundry v13 core's Combat#recordPreviousState runs
   * `Object.assign(this.previous, {...})` when combatants are added.
   * On a freshly-created Combat document, `this.previous` can be null,
   * which makes Object.assign throw "Cannot convert undefined or null
   * to object" and aborts the combatant creation transaction.
   * We seed it to a valid empty state before touching combatants. */
  if (combat.previous == null) {
    combat.previous = { round: null, turn: null, tokenId: null, combatantId: null };
  }

  /* --- Partition targets: add new, remove existing --- */
  const toAdd    = [];
  const toRemove = [];
  for (const t of targets) {
    const existing = combat.combatants.find(c =>
      c.tokenId === t.id && c.sceneId === scene.id
    );
    if (existing) {
      toRemove.push(existing.id);
      continue;
    }
    if (!t.actor) {
      console.warn(`ICON 1.5 | Skipping token "${t.name}" — no actor.`);
      continue;
    }
    toAdd.push({
      tokenId: t.id,
      sceneId: scene.id,
      actorId: t.actor.id,
      hidden:  t.document.hidden ?? false,
    });
  }

  if (toRemove.length) {
    await combat.deleteEmbeddedDocuments("Combatant", toRemove);
  }
  if (toAdd.length) {
    await combat.createEmbeddedDocuments("Combatant", toAdd);
  }
}

/* ================================================== */
/*  Chat card actions — Apply Damage from damage-card  */
/* ================================================== */

/**
 * Wire up the "Apply Damage" buttons on damage-card chat messages.
 * Foundry v13 exposes `renderChatMessageHTML` which passes the HTMLElement
 * of the rendered message. We delegate clicks on any `[data-action="applyDamage"]`
 * button inside the card.
 */
Hooks.on("renderChatMessageHTML", (message, html /*, data */) => {
  // What interrupts changed on this card (R35b): extra rows for characters who
  // now take the damage too, chips for resistance / HP floors. First, so the
  // added rows' buttons are bound below like the others.
  try { injectCardMods(message, html); }
  catch (err) { console.warn("ICON 1.5 | damage-card changes failed:", err); }
  const buttons = html.querySelectorAll('[data-action="applyDamage"]');
  if (!buttons.length) return;

  // Card-level facts the defensive automation needs (defenses.mjs).
  const dmgFlags     = message?.flags?.["icon-system"]?.damage ?? {};
  const outcome      = dmgFlags.outcome ?? "hit";
  const halvedOnRoll = !!dmgFlags.halvedOnRoll;
  // Damage types ticked on the roll (p.104): they switch off some of the
  // target's defences when the damage is applied.
  const trueStrike   = !!dmgFlags.trueStrike;
  const unerring     = !!dmgFlags.unerring;
  // Who threw it: Aetherwall only halves attacks from beyond range 2 (p.298),
  // so the attacker's token has to be known when the damage is applied.
  let attackerActor = null;
  try { attackerActor = dmgFlags.sourceActorUuid ? fromUuidSync(dmgFlags.sourceActorUuid) : null; } catch { attackerActor = null; }

  // R33a5: Aethershard Talent II (p.210), "Your abilities gain pierce against characters adjacent to
  // Aethershards": per target, read on render and again on Apply (the card's own Pierce is for everyone).
  const cardPierce = !!html.querySelector('[data-action="applyDamage"][data-pierce="true"]');
  const shardPierce = (tokenId) => (!cardPierce && attackerActor && tokenId) ? objectPierceAgainst(attackerActor, tokenId) : null;
  const shardPierceChip = (row) => {
    const p = shardPierce(row.dataset.tokenId);
    const back = Number(dmgFlags.weakened) || 0;
    return p ? `<span class="icon-def-chip icon-def-chip--trait icon-def-chip--on" title="${foundry.utils.escapeHTML(`${p.source} (p.210): adjacent to the ${p.name}, this damage pierces — the target's Armor is ignored on Apply${back ? `, and the Weakened −${back} comes back: pierce "cannot be reduced by armor or weakened" (p.104)` : ""}.`)}">Pierce (${foundry.utils.escapeHTML(p.name)})${back ? ` +${back}` : ""}</span>` : "";
  };

  // Defensive chips on each target row (Dodge / Cover ½ / Resistance ½ …),
  // read from the target's CURRENT statuses — cover is determined when the
  // damage is applied (p.92), so the row is re-evaluated at every render.
  html.querySelectorAll('.icon-chat-card__target-row[data-actor-uuid]').forEach(row => {
    if (row.dataset.iconDefChips) return;
    row.dataset.iconDefChips = "true";
    let actor = null;
    try { actor = fromUuidSync(row.dataset.actorUuid); } catch { actor = null; }
    if (!actor) return;
    const chips = defenseChipsHtml(actor, {
      outcome, halvedOnRoll, compact: true, trueStrike, unerring,
      tokenId: row.dataset.tokenId ?? null, attacker: attackerActor,
    }) + shardPierceChip(row);
    if (!chips) return;
    const holder = document.createElement("span");
    holder.className = "icon-chat-card__target-defs";
    holder.innerHTML = chips;
    const firstBtn = row.querySelector("button");
    firstBtn ? row.insertBefore(holder, firstBtn) : row.appendChild(holder);
  });

  // Interrupts this damage triggers (R35): buttons under each target row for
  // the characters this user plays (damage-interrupts.mjs).
  try { decorateDamageInterrupts(message, html); }
  catch (err) { console.warn("ICON 1.5 | damage-card interrupts failed:", err); }

  buttons.forEach(btn => {
    if (btn.dataset.iconBound) return;
    btn.dataset.iconBound = "true";
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      const uuid   = btn.dataset.actorUuid;
      let   amount = Number(btn.dataset.amount) || 0;
      // Repeated damage ("3 damage, three times", p.92): the same amount is
      // applied as separate instances, so armor (p.92) and the ½ come off each.
      const instances = Math.min(10, Math.max(1, Math.floor(Number(btn.dataset.instances) || 1)));
      let   half   = btn.dataset.half === "true";
      const ownPierce = btn.dataset.pierce !== "true" && !!shardPierce(btn.dataset.tokenId);
      const pierce = btn.dataset.pierce === "true" || ownPierce;
      // Pierce "cannot be reduced by armor or weakened" (p.104): the card took
      // Weakened off for everyone; a target pierced only here gets it back.
      if (ownPierce) amount += Number(dmgFlags.weakened) || 0;
      // Divine (p.104): can't be reduced, mitigated or negated in any way
      // except immunity — so no armor, no Cover / Resistance halving (not
      // even the ½ button) and it "bypasses vigor".
      const divine = btn.dataset.divine === "true";
      if (divine) half = false;
      let   halfReason = half ? "manual ½" : "";

      if (!uuid || amount <= 0) return;

      const actor = await fromUuid(uuid);
      if (!actor) {
        ui.notifications.error(`Could not find target actor for damage application.`);
        return;
      }

      // Defensive automation on the full "Apply" button (the ½ button stays a
      // manual override): Dodge → no damage from a Miss / Area card; Cover or
      // Resistance → ½ once, unless the roll was already halved.
      if (!half && !divine) {
        const mit = damageMitigation(actor, {
          outcome, halvedOnRoll, trueStrike, unerring,
          attacker: attackerActor, targetTokenId: btn.dataset.tokenId ?? null,
        });
        if (mit.immune) {
          await ChatMessage.create({
            speaker: { alias: "Damage Applied" },
            content: `<div class="icon-chat-card icon-chat-card--apply icon-chat-card--dodged">
                        <strong>${foundry.utils.escapeHTML(actor.name)}</strong>: no damage
                        <br><small>${foundry.utils.escapeHTML(mit.immuneReason)} (p.144)</small>
                      </div>`,
          });
          btn.disabled = true;
          btn.textContent = "✓ Dodged";
          btn.style.opacity = "0.5";
          return;
        }
        if (mit.half) { half = true; halfReason = mit.halfReason; }
      }

      // What an interrupt changed for this character on the card (R35b,
      // damage-card-mods.mjs): resistance halves once, together with Cover /
      // Resistance, never divine damage (p.104) or a roll already halved.
      const mods = cardModsFor(message, uuid);
      if (mods.half && !half && !halvedOnRoll && !divine) { half = true; halfReason = mods.halfReason; }
      // Immunity (Grace of the Spirits, R35c) is the one thing divine damage
      // doesn't get past (p.104): no damage, on either button.
      if (mods.immune) {
        await ChatMessage.create({
          speaker: { alias: "Damage Applied" },
          content: `<div class="icon-chat-card icon-chat-card--apply icon-chat-card--dodged">
                      <strong>${foundry.utils.escapeHTML(actor.name)}</strong>: no damage
                      <br><small>Immune: ${foundry.utils.escapeHTML(mods.immuneReason)}</small>
                    </div>`,
        });
        btn.disabled = true;
        btn.textContent = "✓ Immune";
        btn.style.opacity = "0.5";
        return;
      }

      // All deduction rules (armor before ½, mob hits, vigor before HP, wound
      // on a PC reaching 0) live in applyDamageToActor — the same code path
      // used by applyDamagePipeline and the GM socket relay.
      let result;
      const results = [];
      try {
        for (let i = 0; i < instances; i++) {
          result = await applyDamageToActor(actor, amount, {
            applyArmor:  !pierce && !divine,
            half,
            halfReason,
            ignoreVigor: divine,
            chatConfirm: instances === 1,
            minHp:       mods.minHp,
            minHpReason: mods.minHpReason,
            // "as if by armor" (Heartfire): only where armor counts, so not pierce / divine
            extraArmor:  mods.reduce,
            extraArmorReason: mods.reduceReason,
          });
          if (!result?.ok) break;
          results.push(result);
          // A defeated PC (wound) or a foe / mob at 0 takes no further instances.
          if (result.woundApplied || result.fallen || (!result.relayed && !result.isMob && result.hpAfter === 0)) break;
        }
      } catch (err) {
        console.error("ICON 1.5 | Apply Damage failed:", err);
        ui.notifications.error(`Failed to apply damage to "${actor.name}".`);
        return;
      }
      if (!results.length) return;
      if (instances > 1) {
        // One summary note for all the instances instead of one per instance.
        result = { ...results[0], applied: results.reduce((a, r) => a + (r.applied ?? 0), 0) };
        if (!result.relayed) {
          const esc = foundry.utils.escapeHTML;
          const each = results.map(r => r.isMob ? "1 hit" : String(r.applied)).join(" + ");
          const last = results[results.length - 1];
          const after = last.isMob ? `hits ${results[0].mob?.hitsBefore ?? "?"} → ${last.mob?.hitsAfter ?? "?"}`
                                   : `HP ${results[0].hpBefore} → ${last.hpAfter}`;
          const armorBlocked = results.reduce((a, r) => a + (r.armorBlocked ?? 0), 0);
          const vigor = results.reduce((a, r) => a + (r.vigorAbsorbed ?? 0), 0);
          const notes = [`${results.length} of ${instances} instances: ${each}`];
          if (armorBlocked > 0) notes.push(`${armorBlocked} blocked by Armor`);
          if (half) notes.push(halfReason && halfReason !== "manual ½" ? `each halved (${esc(halfReason)})` : "each halved");
          if (vigor > 0) notes.push(`${vigor} absorbed by Vigor`);
          if (results.length < instances) notes.push("stopped: the target is down");
          await ChatMessage.create({
            speaker: { alias: "Damage Applied" },
            content: `<div class="icon-chat-card icon-chat-card--apply">
                        <strong>${esc(actor.name)}</strong>: <strong>${last.isMob ? `${results.length} hit${results.length > 1 ? "s" : ""}` : result.applied}</strong> damage applied
                        <br><small>${notes.join(", ")} — ${after}</small>
                      </div>`,
          });
        }
      }

      // Visual feedback on the button
      btn.disabled = true;
      btn.textContent = result.relayed ? "→ Sent to GM"
                      : result.isMob   ? `✓ −${results.length} hit${results.length > 1 ? "s" : ""}`
                      : `✓ Applied ${result.applied}${half && halfReason && halfReason !== "manual ½" ? ` (½ ${halfReason})` : ""}`;
      btn.style.opacity = "0.5";
    });
  });
});

/**
 * "Inflict" block on attack / ability / foe-action cards: a button per status
 * the text inflicts, per target — save roll (10+) first when the text asks
 * for one, then applyStatus (or a relay to the GM). See inflict-status.mjs.
 */
Hooks.on("renderChatMessageHTML", (message, html /*, data */) => {
  // The attack card's Inflict block also on the damage card that follows it,
  // with the used buttons locked on both (before binding: the copy needs it).
  try { decorateInflictCard(message, html); }
  catch (err) { console.warn("ICON 1.5 | linked inflict buttons failed:", err); }
  bindInflictButtons(html);
  // "Heroic: Gain vigor 4" on an interrupt posted from a damage card (Righteous Disdain).
  bindInterruptVigorButtons(message, html);
});

Hooks.on("updateChatMessage", (message, changed) => onInflictUsedUpdate(message, changed));

/**
 * "When targeted" interrupts on attack cards (R35): Aether Deflection, Endless
 * Battlement's Heroic Intervention, the foes' "is targeted by an attack" — the
 * same buttons, uses and posted card as the damage card's (damage-interrupts.mjs).
 */
Hooks.on("renderChatMessageHTML", (message, html /*, data */) => {
  try { decorateAttackInterrupts(message, html); }
  catch (err) { console.warn("ICON 1.5 | attack-card interrupts failed:", err); }
});

/**
 * "Gamble" button on an ability's Show in Chat card (combat/gamble.mjs, R25):
 * opens the gamble dialog for the card's character. Only its owners can use
 * it (the roll may spend Vigilance or a Stacked Die from their sheet).
 */
Hooks.on("renderChatMessageHTML", (message, html /*, data */) => {
  html.querySelectorAll('[data-action="gambleAbility"]').forEach(btn => {
    if (btn.dataset.iconBound) return;
    btn.dataset.iconBound = "true";
    let actor = null;
    try { actor = fromUuidSync(btn.dataset.actorUuid); } catch { actor = null; }
    if (!actor?.isOwner) { btn.disabled = true; btn.title = "Only the owner of this character can gamble with it"; return; }
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      await rollGamble(actor, actor.items.get(btn.dataset.itemId));
    });
  });
  // Bend Fate (Seer, p.199) on a gamble card: discard cards for extra dice. One use per card.
  html.querySelectorAll('[data-action="bendFate"]').forEach(btn => {
    if (btn.dataset.iconBound) return;
    btn.dataset.iconBound = "true";
    let actor = null;
    try { actor = fromUuidSync(btn.dataset.actorUuid); } catch { actor = null; }
    if (!actor?.isOwner) { btn.disabled = true; btn.title = "Only the Seer's owner can bend fate"; return; }
    if (buttonUsed(actor, message, "bend")) markDone(btn);
    btn.addEventListener("click", (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      bendFate(message, btn).catch(err => console.error("ICON 1.5 | Bend Fate failed", err));
    });
  });
});

/**
 * "Remove area" button on attack cards: removes the Blast / Line / Arc /
 * Burst template the roll was made with (author or GM only — others just get
 * a disabled button). Once the area is gone — from this button, Delete on the
 * map or the end of the turn — the button goes away and the line says so
 * (Maar: it stayed there, small, after the area was removed).
 */
function _markAreaRemoved(btn) {
  const row = btn.closest(".icon-chat-card__area");
  row?.classList.add("icon-chat-card__area--removed");
  btn.replaceWith(Object.assign(document.createElement("span"), { className: "icon-chat-card__area-gone", textContent: "area removed" }));
}

Hooks.on("renderChatMessageHTML", (message, html /*, data */) => {
  const buttons = html.querySelectorAll('[data-action="removeAreaTemplate"]');
  if (!buttons.length) return;
  buttons.forEach(btn => {
    if (btn.dataset.iconBound) return;
    btn.dataset.iconBound = "true";
    const scene = game.scenes?.get(btn.dataset.sceneId);
    const doc   = scene?.templates?.get(btn.dataset.templateId);
    if (!doc) { _markAreaRemoved(btn); return; }
    if (!(doc.isOwner || game.user.isGM)) { btn.disabled = true; btn.title = "Only the placer or the GM can remove it"; btn.style.opacity = "0.5"; return; }
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      try { await doc.delete(); } catch (err) { console.warn("ICON 1.5 | area template removal failed", err); return; }
    });
  });
});

// The area is gone (any way): every card that offered to remove it, in the
// chat log and in popped-out chat windows, drops its button.
Hooks.on("deleteMeasuredTemplate", (doc) => {
  for (const btn of document.querySelectorAll(`[data-action="removeAreaTemplate"][data-template-id="${doc.id}"]`)) _markAreaRemoved(btn);
});

/* ================================================== */
/*  Encounter Designer — sidebar button + chat card   */
/* ================================================== */

/**
 * "Encounter" button in the header of the Actors sidebar (GM only). The
 * directory is re-rendered often, so the button is only added when missing.
 */
Hooks.on("renderActorDirectory", (app, html /*, data */) => {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  const actions = root.querySelector(".header-actions") ?? root.querySelector(".directory-header");
  if (!actions || actions.querySelector(".icon-encounter-launch")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "icon-encounter-launch";
  btn.title = "Encounter Designer — budget, roster, Elite, reserves (ICON 1.5 p.292)";
  btn.innerHTML = '<i class="fa-solid fa-chess-knight"></i> Encounter';
  btn.addEventListener("click", ev => { ev.preventDefault(); EncounterDesigner.open(); });
  actions.appendChild(btn);
});

/* ================================================== */
/*  Typing in popped-out windows (PopOut! module)     */
/* ================================================== */

/**
 * PopOut! forwards every keydown/keyup of a popped-out window to Foundry's
 * keybindings. Foundry decides "the user is typing" from the MAIN window's
 * focused element, so while typing in a popped-out field the keys still fire
 * their bindings and get swallowed: 1–0 run hotbar macros, so numbers can't
 * be typed. Keys pressed inside an editable field of a popped-out window stop
 * at the application, as they would in the main window.
 */
Hooks.on("renderApplicationV2", (app, element) => {
  if (!(element instanceof HTMLElement) || element.dataset.iconKeyGuard) return;
  element.dataset.iconKeyGuard = "1";
  const guard = ev => {
    if (ev.target?.ownerDocument === document) return;          // not popped out
    const t = ev.target;
    const editable = ["INPUT", "SELECT", "TEXTAREA"].includes(t?.tagName) || t?.isContentEditable;
    if (editable && ev.key !== "Escape") ev.stopPropagation();
  };
  element.addEventListener("keydown", guard);
  element.addEventListener("keyup", guard);
});

/**
 * "Reveal reserves" on the encounter chat card: un-hide the reserve tokens and
 * add them to the scene's combat (GM only).
 */
Hooks.on("renderChatMessageHTML", (message, html /*, data */) => {
  const buttons = html.querySelectorAll('[data-action="revealReserves"]');
  if (!buttons.length) return;
  buttons.forEach(btn => {
    if (btn.dataset.iconBound) return;
    btn.dataset.iconBound = "true";
    if (!game.user.isGM) { btn.disabled = true; btn.style.opacity = "0.5"; return; }
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      const ids = (btn.dataset.tokenIds ?? "").split(",").filter(Boolean);
      let n = 0;
      try { n = await EncounterDesigner.revealReserves(btn.dataset.sceneId, ids); }
      catch (err) { console.error("ICON 1.5 | Reveal reserves failed:", err); ui.notifications.error("Revealing the reserves failed (see console)."); return; }
      if (!n) return;
      btn.disabled = true; btn.textContent = `✓ ${n} revealed`; btn.style.opacity = "0.5";
    });
  });
});

/**
 * Rules reference in the scene controls (everyone, not just the GM).
 *
 * The reference used to be reachable only from the "..." menu of a character
 * sheet, where players never look. A Quick Guide button in the token toolbar puts it
 * one click away for everyone, on any scene.
 */
Hooks.on("getSceneControlButtons", (controls) => {
  const tokens = controls.tokens ?? controls.token;
  if (!tokens?.tools) return;
  tokens.tools.iconReference = {
    name:    "iconReference",
    order:   Object.keys(tokens.tools).length + 1,
    title:   "ICON 1.5 — Quick Guide (rules reference)",
    icon:    "fa-solid fa-book",
    button:  true,                    // fires and goes back to the active tool
    visible: true,
    onChange: (event, active) => { if (active !== false) showReferenceGuide(); },
  };
});

/* ================================================== */
/*  setup — Sheets + Pre-load templates               */
/* ================================================== */

Hooks.once("setup", async () => {

  // ---- Guided tours (Settings → Tours) ----
  registerIconTours();

  // ---- Pre-load templates ----
  const templates = [
    // Actor — Icon
    "systems/icon-system/templates/actor/icon-header.hbs",
    "systems/icon-system/templates/actor/icon-narrative.hbs",
    "systems/icon-system/templates/actor/icon-combat.hbs",
    "systems/icon-system/templates/actor/icon-relics.hbs",
    "systems/icon-system/templates/actor/icon-notes.hbs",
    // Actor — Clock board
    "systems/icon-system/templates/actor/clock-sheet.hbs",
    // Actor — Foe
    "systems/icon-system/templates/actor/foe-header.hbs",
    "systems/icon-system/templates/actor/foe-main.hbs",
    "systems/icon-system/templates/actor/foe-notes.hbs",
    // Actor — Legend
    "systems/icon-system/templates/actor/legend-header.hbs",
    "systems/icon-system/templates/actor/legend-combat.hbs",
    "systems/icon-system/templates/actor/legend-notes.hbs",
    // Actor — Foe / Legend summons (partial shared by both sheets)
    "systems/icon-system/templates/actor/npc-summons.hbs",
    // Actor — Summon
    "systems/icon-system/templates/actor/summon-sheet.hbs",
    // Item
    "systems/icon-system/templates/item/item-header.hbs",
    "systems/icon-system/templates/item/item-main.hbs",
    "systems/icon-system/templates/item/item-sheet.hbs",
    // Chat
    "systems/icon-system/templates/chat/narrative-roll.hbs",
    "systems/icon-system/templates/chat/attack-roll.hbs",
    "systems/icon-system/templates/chat/save-roll.hbs",
    "systems/icon-system/templates/chat/damage-card.hbs",
    "systems/icon-system/templates/chat/ability-card.hbs",
    "systems/icon-system/templates/chat/trait-card.hbs",
    "systems/icon-system/templates/chat/great-wheel-card.hbs",
    "systems/icon-system/templates/chat/relic-card.hbs",
    "systems/icon-system/templates/chat/bond-power-card.hbs",
    "systems/icon-system/templates/chat/bond-card.hbs",
    "systems/icon-system/templates/chat/foe-action-card.hbs",
    "systems/icon-system/templates/chat/encounter-card.hbs",
  ];
  await foundry.applications.handlebars.loadTemplates(templates);
  console.log("ICON 1.5 | Templates loaded");
});
