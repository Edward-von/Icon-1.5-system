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
import { FoeAbilityData } from "./module/data/item/FoeAbilityData.mjs";
import { JobTemplateData } from "./module/data/item/JobTemplateData.mjs";

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
import { registerMigrationSettings, runMigrations } from "./module/migrations.mjs";

/* -------------------------------------------------- */
/*  Onboarding                                         */
/* -------------------------------------------------- */
import { showWelcomeGuide } from "./module/apps/welcome.mjs";
import { EncounterDesigner } from "./module/apps/EncounterDesigner.mjs";
import { showReferenceGuide } from "./module/apps/reference.mjs";

/* -------------------------------------------------- */
/*  Token status HUD (PF2e-style selected-token panel) */
/* -------------------------------------------------- */
import { registerTokenStatusHud } from "./module/apps/token-status-hud.mjs";

/* -------------------------------------------------- */
/*  Canvas — Blast / Line / Arc / Burst templates      */
/* -------------------------------------------------- */
import { registerAreaTemplates, placeAreaTemplate, areaFromTags,
         deleteAreaTemplates } from "./module/canvas/area-templates.mjs";

/* -------------------------------------------------- */
/*  Hatred of X + ability marks                        */
/* -------------------------------------------------- */
import { registerMarkHooks, applyHatred, applyMark, removeMark } from "./module/combat/marks.mjs";
import { parseInflictedStatuses, abilityStatusEntries, npcActionStatusEntries, statusBlockHtml } from "./module/combat/ability-statuses.mjs";
import { bindInflictButtons, inflictStatus } from "./module/combat/inflict-status.mjs";

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

  // ---- House rules (opt-in) ----
  // Off by default: divergences from the ICON 1.5 RAW manual.
  // Enabled by the GM in Configure Settings → System Settings.
  game.settings.register("icon-system", "hrInterludeDustHealing", {
    name: "House Rule — Dust to heal Burdens during an Interlude",
    hint: "If enabled, during an Interlude PCs may spend 2 Dust for each extra Burden segment healed (beyond the base 3). House rule: in RAW, spending Dust per segment exists only for Ambition clocks, not Burdens.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });
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
    "foe-ability":  FoeAbilityData,
    "job-template": JobTemplateData,
  };

  // ---- Register sheets ----
  foundry.documents.collections.Actors.registerSheet("icon-system", IconSheet,   { types: ["icon"],    makeDefault: true });
  foundry.documents.collections.Actors.registerSheet("icon-system", FoeSheet,    { types: ["foe"],     makeDefault: true });
  foundry.documents.collections.Actors.registerSheet("icon-system", LegendSheet, { types: ["legend"],  makeDefault: true });
  foundry.documents.collections.Actors.registerSheet("icon-system", SummonSheet, { types: ["summon"],  makeDefault: true });
  foundry.documents.collections.Items.registerSheet("icon-system",  IconItemSheet, { makeDefault: true });

  // ---- Status effects ----
  registerStatuses();

  // ---- Area templates (MeasuredTemplate subclass drawing ICON cell sets) ----
  registerAreaTemplates();

  // ---- Marks end when their marker is defeated ----
  registerMarkHooks();

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

  /* Selected-token status panel (top-right, PF2e-style). */
  try {
    registerTokenStatusHud();
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
    if (!game.settings.get("icon-system", "welcomeShown")) {
      showWelcomeGuide();
      await game.settings.set("icon-system", "welcomeShown", true);
    }
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
  const buttons = html.querySelectorAll('[data-action="applyDamage"]');
  if (!buttons.length) return;

  buttons.forEach(btn => {
    if (btn.dataset.iconBound) return;
    btn.dataset.iconBound = "true";
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      const uuid   = btn.dataset.actorUuid;
      const amount = Number(btn.dataset.amount) || 0;
      const half   = btn.dataset.half === "true";
      const pierce = btn.dataset.pierce === "true";

      if (!uuid || amount <= 0) return;

      const actor = await fromUuid(uuid);
      if (!actor) {
        ui.notifications.error(`Could not find target actor for damage application.`);
        return;
      }

      // All deduction rules (armor before ½, mob hits, vigor before HP, wound
      // on a PC reaching 0) live in applyDamageToActor — the same code path
      // used by applyDamagePipeline and the GM socket relay.
      let result;
      try {
        result = await applyDamageToActor(actor, amount, {
          applyArmor:  !pierce,
          half,
          chatConfirm: true,
        });
      } catch (err) {
        console.error("ICON 1.5 | Apply Damage failed:", err);
        ui.notifications.error(`Failed to apply damage to "${actor.name}".`);
        return;
      }
      if (!result?.ok) return;

      // Visual feedback on the button
      btn.disabled = true;
      btn.textContent = result.relayed ? "→ Sent to GM"
                      : result.isMob   ? "✓ −1 hit"
                      : `✓ Applied ${result.applied}`;
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
  bindInflictButtons(html);
});

/**
 * "🗑 area" button on attack cards: removes the Blast / Line / Arc / Burst
 * template the roll was made with (author or GM only — others just get a
 * disabled button).
 */
Hooks.on("renderChatMessageHTML", (message, html /*, data */) => {
  const buttons = html.querySelectorAll('[data-action="removeAreaTemplate"]');
  if (!buttons.length) return;
  buttons.forEach(btn => {
    if (btn.dataset.iconBound) return;
    btn.dataset.iconBound = "true";
    const scene = game.scenes?.get(btn.dataset.sceneId);
    const doc   = scene?.templates?.get(btn.dataset.templateId);
    if (!doc) { btn.disabled = true; btn.title = "Template already removed"; btn.style.opacity = "0.5"; return; }
    if (!(doc.isOwner || game.user.isGM)) { btn.disabled = true; btn.title = "Only the placer or the GM can remove it"; btn.style.opacity = "0.5"; return; }
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      try { await doc.delete(); } catch (err) { console.warn("ICON 1.5 | area template removal failed", err); return; }
      btn.disabled = true; btn.textContent = "✓ removed"; btn.style.opacity = "0.5";
    });
  });
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

/* ================================================== */
/*  setup — Sheets + Pre-load templates               */
/* ================================================== */

Hooks.once("setup", async () => {

  // ---- Pre-load templates ----
  const templates = [
    // Actor — Icon
    "systems/icon-system/templates/actor/icon-header.hbs",
    "systems/icon-system/templates/actor/icon-narrative.hbs",
    "systems/icon-system/templates/actor/icon-combat.hbs",
    "systems/icon-system/templates/actor/icon-relics.hbs",
    "systems/icon-system/templates/actor/icon-notes.hbs",
    // Actor — Foe
    "systems/icon-system/templates/actor/foe-header.hbs",
    "systems/icon-system/templates/actor/foe-main.hbs",
    "systems/icon-system/templates/actor/foe-notes.hbs",
    // Actor — Legend
    "systems/icon-system/templates/actor/legend-header.hbs",
    "systems/icon-system/templates/actor/legend-combat.hbs",
    "systems/icon-system/templates/actor/legend-notes.hbs",
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
    "systems/icon-system/templates/chat/relic-card.hbs",
    "systems/icon-system/templates/chat/bond-power-card.hbs",
    "systems/icon-system/templates/chat/bond-card.hbs",
    "systems/icon-system/templates/chat/foe-action-card.hbs",
    "systems/icon-system/templates/chat/encounter-card.hbs",
  ];
  await foundry.applications.handlebars.loadTemplates(templates);
  console.log("ICON 1.5 | Templates loaded");
});
