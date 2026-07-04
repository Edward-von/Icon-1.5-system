/**
 * populate-legends.mjs — one-shot migration that seeds the system's
 * `icon-system.legends` compendium with the canonical text from the
 * ICON 1.5 manual.
 *
 * HOW TO RUN
 * ----------
 * 1. In Foundry, open the Macros directory (sidebar → Macros).
 * 2. Create a new "Script" macro, give it any name.
 * 3. Paste the entire body of this file into the macro and save.
 * 4. Click the macro to run it. Watch the chat / console for results.
 *
 * The script will:
 *   - Unlock the legends compendium temporarily
 *   - For every legend whose name matches a key in LEGEND_DATA, apply
 *     description, tactics, traits, phases, actions, interrupts, and
 *     round actions from the dictionary
 *   - Re-lock the compendium when done
 *
 * Re-running is safe: each run overwrites with the latest dictionary
 * data. Legends in the pack that are NOT in the dictionary are skipped.
 */

// Dynamic import with a cache-buster query so re-running picks up edits to
// legend-data.mjs without needing to reload Foundry.
const { LEGEND_DATA } = await import(`/systems/icon-system/macros/legend-data.mjs?t=${Date.now()}`);

const PACK_ID = "icon-system.legends";

const pack = game.packs.get(PACK_ID);
if (!pack) {
  ui.notifications.error(`Pack "${PACK_ID}" not found.`);
  throw new Error(`pack not found: ${PACK_ID}`);
}

const wasLocked = pack.locked;
if (wasLocked) {
  await pack.configure({ locked: false });
  console.log(`[populate-legends] unlocked pack ${PACK_ID}`);
}

try {
  const docs = await pack.getDocuments();
  console.log(`[populate-legends] loaded ${docs.length} legends from pack`);

  let updated = 0;
  let skipped = 0;
  const log = [];

  for (const doc of docs) {
    const key = doc.name?.trim();
    const data = LEGEND_DATA[key];
    if (!data) {
      skipped++;
      log.push(`⏭ Skipped (no data): ${key}`);
      continue;
    }

    const update = { _id: doc.id };
    const sysUpdate = {};

    if (data.description != null) sysUpdate.description = data.description;
    if (data.tactics     != null) sysUpdate.tactics     = data.tactics;
    if (data.lore        != null) sysUpdate.lore        = data.lore;
    if (data.loot        != null) sysUpdate.loot        = data.loot;
    if (data.size        != null) sysUpdate.size        = data.size;

    // Replace arrays wholesale — simpler than diffing, and safe because
    // we are writing the canonical manual text. The data MUST match the
    // schema in module/data/actor/LegendData.mjs.
    if (Array.isArray(data.traits))       sysUpdate.traits       = data.traits;
    if (Array.isArray(data.actions))      sysUpdate.actions      = data.actions;
    if (Array.isArray(data.interrupts))   sysUpdate.interrupts   = data.interrupts;
    if (Array.isArray(data.roundActions)) sysUpdate.roundActions = data.roundActions;
    if (Array.isArray(data.phases))       sysUpdate.phases       = data.phases;

    update.system = sysUpdate;
    await doc.update(update, { pack: PACK_ID, diff: false, recursive: false });
    updated++;
    log.push(`✓ Updated: ${key}`);
  }

  console.log(`[populate-legends] updated ${updated} | skipped ${skipped}`);
  for (const line of log) console.log(line);

  ChatMessage.create({
    speaker: { alias: "Legend Migration" },
    content: `<div style="padding:6px 10px;border-left:3px solid #c8961c;background:rgba(200,150,28,.08)">
      <strong>Legend pack populated.</strong><br>
      Updated <strong>${updated}</strong> · Skipped <strong>${skipped}</strong><br>
      <details><summary>Details</summary><pre style="font-size:.8em">${log.join("\n")}</pre></details>
    </div>`,
  });
} finally {
  if (wasLocked) {
    await pack.configure({ locked: true });
    console.log(`[populate-legends] re-locked pack ${PACK_ID}`);
  }
}
