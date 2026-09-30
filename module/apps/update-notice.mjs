/**
 * update-notice.mjs — after a system update, tell the GM to re-import what
 * came from the compendiums.
 *
 * Anything dragged out of a compendium is a copy: a foe, legend, summon or
 * item in the world keeps the data it had the day it was imported, so a fix
 * or a new feature shipped in the packs (a foe's corrected class, its
 * summons, a template, a rewritten ability) never reaches it. Macros are the
 * exception: syncWorldMacros (migrations.mjs) refreshes the ones that came
 * from our compendium. Everything else has to be imported again, and the GM
 * has no way to know that unless told.
 *
 * Shown once per system version, GM only, after migrations and the macro
 * sync. A brand-new world (nothing imported yet) is only stamped.
 */

const _log = (...a) => console.debug("[ICON | UpdateNotice]", ...a);
const SYSTEM_ID = "icon-system";
const SETTING   = "updateNoticeVersion";

/** Register the world setting holding the last version the notice was shown for. Call from init. */
export function registerUpdateNoticeSetting() {
  game.settings.register(SYSTEM_ID, SETTING, {
    name:    "Update notice shown for version",
    scope:   "world",
    config:  false,
    type:    String,
    default: "",
  });
}

/** Show the notice if the system version changed since the last time. Call from ready. */
export async function showUpdateNotice() {
  if (!game.user.isGM) return;
  const version = game.system.version ?? "";
  const seen = game.settings.get(SYSTEM_ID, SETTING) ?? "";
  _log(`version ${version} | last notice for: "${seen || "(never)"}"`);
  if (seen === version) return;

  const hasImports = game.actors.size > 0 || game.items.size > 0;
  if (!seen && !hasImports) { await game.settings.set(SYSTEM_ID, SETTING, version); return; }

  const content = `
    <div class="icon-update-notice">
      <p><strong>ICON 1.5 has been updated</strong> ${seen ? `from <strong>${seen}</strong> ` : ""}to <strong>${version}</strong>.</p>
      <p>Foes, legends, summons and items you dragged out of the compendiums are <em>copies</em>: they keep the data
        they had when you imported them. Fixes and new features in the compendiums (corrected foes, summons on the
        foe sheets, foe templates, rewritten abilities…) do <strong>not</strong> reach those copies.</p>
      <p>To get them, <strong>import again from the compendiums</strong> what you use in play:</p>
      <ul>
        <li><strong>Foes</strong> and <strong>Legends</strong> — delete or rename the old world copy, then drag in the new one.</li>
        <li><strong>Items</strong> (Foe Abilities, Foe Templates, Jobs, Bonds, Relics, Gear Kits…) — same.</li>
        <li><strong>Macros</strong> — the ones that came from the ICON Macros compendium have already been updated
          automatically; a macro you copied by hand or edited yourself should be re-imported.</li>
      </ul>
      <p class="icon-update-notice__note">Player characters can't be re-imported and don't need to be: when an update
        changes their data, the system migrates them itself. Tokens already on a scene belong to the old copy —
        replace them after re-importing. What changed is listed in the system's CHANGELOG.</p>
    </div>`;

  await foundry.applications.api.DialogV2.prompt({
    window:   { title: `ICON 1.5 updated to ${version}`, icon: "fa-solid fa-arrows-rotate" },
    position: { width: 520 },
    content,
    ok: { label: "Got it" },
    rejectClose: false,
  });
  await game.settings.set(SYSTEM_ID, SETTING, version);
  _log(`notice acknowledged for ${version}`);
}
