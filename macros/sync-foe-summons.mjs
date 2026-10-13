/**
 * sync-foe-summons.mjs — ICON 1.5: copy summons onto foes already in the world
 *
 * Foes and legends imported before version 1.8.0 have no "Summons & Objects"
 * section: a foe already in the world is not updated when the compendium is.
 * This macro looks up every foe and legend of the world in the Foes and
 * Legends compendiums by name and copies the summons the compendium copy has
 * when the world copy has none. Nothing else on the actor changes, and an
 * actor whose summons were already edited by hand is left alone.
 */

(async () => {
  if (!game.user.isGM) { ui.notifications.warn("Copy foe summons: GM only."); return; }

  // name|type → summons, from the compendium copies that have any
  const fromPacks = new Map();
  for (const id of ["icon-system.foes", "icon-system.foes-legend"]) {
    const pack = game.packs.get(id);
    if (!pack) continue;
    const index = await pack.getIndex({ fields: ["system.summons"] });
    for (const e of index) {
      const summons = e.system?.summons ?? [];
      if (summons.length) fromPacks.set(`${e.name.trim().toLowerCase()}|${e.type}`, summons);
    }
  }

  const todo = game.actors.filter(a => (a.type === "foe" || a.type === "legend")
    && !(a.system?.summons ?? []).length
    && fromPacks.has(`${a.name.trim().toLowerCase()}|${a.type}`));

  if (!todo.length) {
    ui.notifications.info("Copy foe summons: every foe and legend in the world already has its summons (or has none in the compendium).");
    return;
  }

  const list = todo.map(a => `<li>${foundry.utils.escapeHTML(a.name)} — ${fromPacks.get(`${a.name.trim().toLowerCase()}|${a.type}`).map(s => foundry.utils.escapeHTML(s.name)).join(", ")}</li>`).join("");
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: "Copy foe summons" },
    content: `<p>These foes and legends get the summons of their compendium copy:</p><ul style="max-height:50vh;overflow-y:auto">${list}</ul>`,
    rejectClose: false,
  });
  if (!ok) return;

  for (const a of todo) {
    const summons = foundry.utils.deepClone(fromPacks.get(`${a.name.trim().toLowerCase()}|${a.type}`));
    await a.update({ "system.summons": summons });
  }
  ui.notifications.info(`Copy foe summons: ${todo.length} foe${todo.length === 1 ? "" : "s"} updated.`);
})();
