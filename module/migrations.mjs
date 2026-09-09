/**
 * migrations.mjs — World data migration framework for ICON 1.5.
 *
 * Foundry persists documents with whatever schema they were created under;
 * DataModel only adds defaults for NEW fields. Renames, moves, or semantic
 * changes to existing fields need an explicit migration or old documents
 * keep stale data forever.
 *
 * HOW TO ADD A MIGRATION:
 *   1. Bump CURRENT_SCHEMA_VERSION (integers, +1 per breaking change).
 *   2. Add MIGRATIONS[<new version>] = async () => { ... } that transforms
 *      every affected world document. Use migrateWorldDocuments() for the
 *      common per-actor/per-item sweep.
 *   3. Migrations must be idempotent — they may run again if a world is
 *      restored from a backup taken mid-migration.
 *
 * System compendium packs are NOT migrated here: they ship already at the
 * current schema. World-side compendia created by the GM are swept too.
 */

const SYSTEM_ID = "icon-system";
const SETTING   = "schemaVersion";

/** Bump this when a schema change needs a data migration. */
export const CURRENT_SCHEMA_VERSION = 5;

/**
 * Registry of migration steps, keyed by the version they migrate TO.
 * Version 1 is the baseline (schema as of system v1.0.0) — no step needed.
 *
 * Example for a future change:
 *   2: async () => {
 *     await migrateWorldDocuments({
 *       actor: (actor) => actor.type === "icon"
 *         ? { "system.combat.newField": actor.system.oldField ?? 0 }
 *         : null,
 *     });
 *   },
 */
const MIGRATIONS = {
  /* 2 — Secondary-class Gambit traits. Until 2026-08-29 TraitData.source
   * rejected "gambit", so PCs with a secondary job of another class never
   * received that class's Gambit trait. Embed the missing ones. */
  2: async () => {
    const { ensureClassGambits } = await import("./helpers/classes.mjs");
    for (const actor of game.actors) {
      if (actor.type !== "icon") continue;
      const created = await ensureClassGambits(actor);
      if (created.length) console.log(`ICON 1.5 | Migration 2: embedded ${created.length} gambit trait(s) on "${actor.name}"`);
    }
  },

  /* 3 — Token HP bars. Actors created before the preCreateActor hook (and
   * tokens already placed on scenes) have no bar1 attribute, so no HP bar
   * shows on the map. Same defaults as the hook: PCs → combat.hp always
   * visible; NPCs → hp, owner only. Intangible summons keep no bar. */
  3: async () => {
    const barFor = type => ({
      attribute:   type === "icon" ? "combat.hp" : "hp",
      displayBars: type === "icon" ? CONST.TOKEN_DISPLAY_MODES.ALWAYS : CONST.TOKEN_DISPLAY_MODES.OWNER,
    });
    let actors = 0, tokens = 0;
    for (const actor of game.actors) {
      if (actor.type === "summon" && actor.system?.intangible) continue;
      if (actor.prototypeToken?.bar1?.attribute) continue;
      const { attribute, displayBars } = barFor(actor.type);
      await actor.update({ "prototypeToken.bar1.attribute": attribute, "prototypeToken.displayBars": displayBars });
      actors++;
    }
    for (const scene of game.scenes) {
      const updates = [];
      for (const tok of scene.tokens) {
        const type = tok.actor?.type;
        if (!type || tok.bar1?.attribute) continue;
        if (type === "summon" && tok.actor?.system?.intangible) continue;
        const { attribute, displayBars } = barFor(type);
        updates.push({ _id: tok.id, "bar1.attribute": attribute, displayBars });
      }
      if (updates.length) { await scene.updateEmbeddedDocuments("Token", updates); tokens += updates.length; }
    }
    console.log(`ICON 1.5 | Migration 3: HP bars set on ${actors} actor(s) and ${tokens} placed token(s)`);
  },

  /* 4 — "Rush X" is a keyword, not a Stalwart class trait (Maar, Sept 2026).
   * Removed from CLASS_INFO.stalwart.traits; delete the trait items the
   * system had embedded on existing PCs (source "class", so player-made
   * traits with the same name are left alone). */
  4: async () => {
    for (const actor of game.actors) {
      if (actor.type !== "icon") continue;
      const ids = actor.items
        .filter(i => i.type === "trait" && i.system?.source === "class" && /^rush/i.test(i.name ?? ""))
        .map(i => i.id);
      if (!ids.length) continue;
      await actor.deleteEmbeddedDocuments("Item", ids);
      console.log(`ICON 1.5 | Migration 4: removed ${ids.length} "Rush X" class trait(s) from "${actor.name}"`);
    }
  },

  /* 5 — Migration 4 left "Rush X" on at least one PC of the live world (schema
   * was already at 4 when the playtest of 9 Sept 2026 looked): remove the
   * trait again, this time by exact name whatever its `source`. */
  5: async () => {
    for (const actor of game.actors) {
      if (actor.type !== "icon") continue;
      const ids = actor.items.filter(i => i.type === "trait" && /^rush x$/i.test((i.name ?? "").trim())).map(i => i.id);
      if (!ids.length) continue;
      await actor.deleteEmbeddedDocuments("Item", ids);
      console.log(`ICON 1.5 | Migration 5: removed ${ids.length} "Rush X" trait(s) from "${actor.name}"`);
    }
  },
};

/** Register the world-scoped schema version setting. Call from the init hook. */
export function registerMigrationSettings() {
  game.settings.register(SYSTEM_ID, SETTING, {
    name:    "Schema version",
    scope:   "world",
    config:  false,
    type:    Number,
    default: 0,
  });
}

/**
 * Run any pending migrations. Call from the ready hook — GM client only
 * (players lack permission to update other users' actors).
 */
export async function runMigrations() {
  if (!game.user.isGM) return;

  const stored = game.settings.get(SYSTEM_ID, SETTING) ?? 0;
  if (stored >= CURRENT_SCHEMA_VERSION) return;

  /* A brand-new world (no system documents yet) has nothing to migrate —
   * just stamp it with the current version. */
  const hasDocuments = game.actors.size > 0 || game.items.size > 0;
  if (stored === 0 && !hasDocuments) {
    await game.settings.set(SYSTEM_ID, SETTING, CURRENT_SCHEMA_VERSION);
    return;
  }

  ui.notifications.info(`ICON 1.5 — migrating world data (schema ${stored} → ${CURRENT_SCHEMA_VERSION})… don't close the world.`);
  console.log(`ICON 1.5 | Migrating world data: schema ${stored} → ${CURRENT_SCHEMA_VERSION}`);

  for (let v = stored + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) {
      await game.settings.set(SYSTEM_ID, SETTING, v);
      continue;
    }
    try {
      await step();
      await game.settings.set(SYSTEM_ID, SETTING, v);
      console.log(`ICON 1.5 | Migration to schema ${v} complete`);
    } catch (err) {
      console.error(`ICON 1.5 | Migration to schema ${v} FAILED — stopping. World is still at schema ${v - 1}.`, err);
      ui.notifications.error(`ICON 1.5 — data migration to schema ${v} failed. Check the console (F12) and report the error before continuing to play.`, { permanent: true });
      return;
    }
  }

  ui.notifications.info("ICON 1.5 — world data migration complete.");
}

/* ================================================== */
/*  Sweep helpers                                      */
/* ================================================== */

/**
 * Apply per-document update functions to every world actor, world item, and
 * every document inside unlocked world-scoped compendia of the matching type.
 *
 * Each mapper receives a document and returns an update object (falsy = skip).
 * Embedded items on actors are passed to the `item` mapper too.
 *
 * @param {object}   mappers
 * @param {Function} [mappers.actor]  (actor) => updateData | null
 * @param {Function} [mappers.item]   (item)  => updateData | null
 */
export async function migrateWorldDocuments({ actor: actorFn, item: itemFn } = {}) {
  /* --- World actors (and their embedded items) --- */
  for (const actor of game.actors) {
    await migrateSingleActor(actor, actorFn, itemFn);
  }

  /* --- World items --- */
  if (itemFn) {
    for (const item of game.items) {
      const update = itemFn(item);
      if (update) await item.update(update);
    }
  }

  /* --- World compendia (GM-created packs; skip locked and system packs) --- */
  for (const pack of game.packs) {
    if (pack.metadata.packageType !== "world" || pack.locked) continue;
    if (pack.documentName === "Actor" && actorFn) {
      const docs = await pack.getDocuments();
      for (const doc of docs) await migrateSingleActor(doc, actorFn, itemFn);
    } else if (pack.documentName === "Item" && itemFn) {
      const docs = await pack.getDocuments();
      for (const doc of docs) {
        const update = itemFn(doc);
        if (update) await doc.update(update);
      }
    }
  }
}

async function migrateSingleActor(actor, actorFn, itemFn) {
  if (actorFn) {
    const update = actorFn(actor);
    if (update) await actor.update(update);
  }
  if (itemFn) {
    const itemUpdates = [];
    for (const item of actor.items) {
      const update = itemFn(item);
      if (update) itemUpdates.push({ _id: item.id, ...update });
    }
    if (itemUpdates.length) await actor.updateEmbeddedDocuments("Item", itemUpdates);
  }
}
