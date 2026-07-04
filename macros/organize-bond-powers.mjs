/**
 * organize-bond-powers.mjs — one-shot macro.
 *
 * Creates one folder per bond inside the `icon-system.bond-powers` compendium
 * and moves each bond-power item into its matching folder, based on
 * `item.system.bondName`.
 *
 * Run once from a Foundry world macro (or paste into the browser console
 * while connected as GM).
 */

const PACK_ID = "icon-system.bond-powers";

const BOND_LABELS = {
  pathfinder: "Pathfinder",
  seeker:     "Seeker",
  mighty:     "Mighty",
  wolf:       "Wolf",
  harlequin:  "Harlequin",
  highborn:   "Highborn",
  mender:     "Mender",
  brave:      "Brave",
  broker:     "Broker",
  elder:      "Elder",
  outsider:   "Outsider",
  dreamer:    "Dreamer",
};

const pack = game.packs.get(PACK_ID);
if (!pack) {
  ui.notifications.error(`Pack "${PACK_ID}" not found.`);
  return;
}

// Unlock the pack so we can modify it
const wasLocked = pack.locked;
if (wasLocked) await pack.configure({ locked: false });

try {
  // 1. Load every item in the pack
  const items = await pack.getDocuments();
  console.log(`[ICON | organize-bond-powers] loaded ${items.length} items from "${PACK_ID}"`);

  // 2. Load existing folders and index them by lowercase name
  const existingFolders = new Map();
  for (const f of pack.folders) existingFolders.set(f.name.toLowerCase(), f);

  // 3. Ensure a folder exists for every bond — create missing ones in one batch
  const toCreate = [];
  for (const label of Object.values(BOND_LABELS)) {
    if (!existingFolders.has(label.toLowerCase())) {
      toCreate.push({ name: label, type: "Item", sorting: "a" });
    }
  }
  if (toCreate.length) {
    const created = await Folder.createDocuments(toCreate, { pack: PACK_ID });
    for (const f of created) existingFolders.set(f.name.toLowerCase(), f);
    console.log(`[ICON | organize-bond-powers] created ${created.length} folders`);
  }

  // 4. Build bondName → folder-id lookup (accept both "pathfinder" and "Pathfinder")
  const folderByBond = new Map();
  for (const [key, label] of Object.entries(BOND_LABELS)) {
    const folder = existingFolders.get(label.toLowerCase());
    if (!folder) continue;
    folderByBond.set(key, folder.id);
    folderByBond.set(label.toLowerCase(), folder.id);
  }

  // 5. Build update list: each item → its target folder
  const updates = [];
  const skipped = [];
  for (const item of items) {
    const raw = (item.system?.bondName ?? "").trim().toLowerCase();
    if (!raw) { skipped.push({ id: item.id, name: item.name, reason: "empty bondName" }); continue; }
    const folderId = folderByBond.get(raw);
    if (!folderId) { skipped.push({ id: item.id, name: item.name, reason: `unknown bond "${raw}"` }); continue; }
    if (item.folder?.id === folderId) continue; // already in the right folder
    updates.push({ _id: item.id, folder: folderId });
  }

  // 6. Apply updates in a single batch
  if (updates.length) {
    await Item.updateDocuments(updates, { pack: PACK_ID });
    console.log(`[ICON | organize-bond-powers] moved ${updates.length} items into folders`);
  } else {
    console.log(`[ICON | organize-bond-powers] no items needed moving`);
  }

  if (skipped.length) {
    console.warn(`[ICON | organize-bond-powers] skipped ${skipped.length} items:`, skipped);
  }

  ui.notifications.info(`Bond Powers organized — ${updates.length} moved, ${skipped.length} skipped.`);
} finally {
  if (wasLocked) await pack.configure({ locked: true });
}
