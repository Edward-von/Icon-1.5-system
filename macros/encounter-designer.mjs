/**
 * encounter-designer.mjs — ICON 1.5 Encounter Designer launcher.
 *
 * Opens the GM tool that builds a balanced encounter (ICON 1.5 p.292):
 * pick the PCs, get the suggested budget, draw foes from the factions,
 * toggle Elite, hold reserves, then post to chat / create actors / deploy
 * tokens on the current scene. The same tool is behind the "Encounter"
 * button at the top of the Actors sidebar.
 */
if (!game.user.isGM) {
  ui.notifications.warn("The Encounter Designer is a GM tool.");
} else if (typeof game.icon?.openEncounterDesigner !== "function") {
  ui.notifications.error("Encounter Designer not available — update the ICON system (1.2.0+).");
} else {
  game.icon.openEncounterDesigner();
}
