/**
 * populate-legend-damage.mjs — one-shot migration that populates the
 * explicit damage fields on every legend action, by parsing the existing
 * hit/miss/area/description free-text. Uses the same `_parseAbilityDamage`
 * function the sheet uses to decide whether to show the Damage button.
 *
 * Fields it writes (per action):
 *   - damageMode      : "none" | "hit" | "hit-miss"
 *   - damageHitDice   : number of [D] dice on hit
 *   - damageHitFray   : whether fray is added on hit
 *   - damageMissDice  : number of [D] dice on miss (hit-miss mode only)
 *   - damageMissFray  : whether fray is added on miss (hit-miss mode only)
 *
 * Conservative rule: only sets a non-"none" mode when the parsed damage is
 * fully expressible as dice+fray (no flat N-damage component). Actions whose
 * damage is partially or entirely flat ("2 piercing damage") are left at
 * "none" so the text-parsing fallback keeps showing the Damage button.
 *
 * HOW TO RUN
 * ----------
 * 1. Foundry sidebar → Macros → create a "Script" macro.
 * 2. Paste the entire body of this file, save, run.
 * 3. Watch chat / console for the report.
 *
 * Safe to re-run: recomputes from the current text each time, and only
 * overwrites actions whose current fields differ from the computed ones.
 */

const { parseAbilityDamage: _parseAbilityDamage } = await import(
  `/systems/icon-system/module/combat/ability-damage.mjs?t=${Date.now()}`
);

const PACK_ID = "icon-system.legends";

/** Compute new damage-* fields from an action. Returns null when nothing
 *  should be written (either no damage at all, or only flat damage). */
function computeDamageFields(action) {
  const parsed = _parseAbilityDamage(action);
  const hit  = parsed.hit;
  const miss = parsed.miss;

  // Skip if the hit chunk has flat damage — we can't express it with the
  // structured schema; leave mode "none" so the text-parser keeps handling it.
  if (hit.flat > 0 || miss.flat > 0) return null;

  const hitHasDmg  = hit.mult  > 0 || hit.fray;
  const missHasDmg = miss.mult > 0 || miss.fray;

  if (!hitHasDmg && !missHasDmg) return null; // no damage at all → keep "none"

  if (hitHasDmg && missHasDmg) {
    return {
      damageMode:     "hit-miss",
      damageHitDice:  hit.mult,
      damageHitFray:  hit.fray,
      damageMissDice: miss.mult,
      damageMissFray: miss.fray,
    };
  }
  if (hitHasDmg) {
    return {
      damageMode:     "hit",
      damageHitDice:  hit.mult,
      damageHitFray:  hit.fray,
      damageMissDice: 0,
      damageMissFray: false,
    };
  }
  // Miss-only damage is unusual (fray on miss without a hit chunk) — model
  // it as hit-miss with a zero hit chunk so the Damage dialog exposes Miss.
  return {
    damageMode:     "hit-miss",
    damageHitDice:  0,
    damageHitFray:  false,
    damageMissDice: miss.mult,
    damageMissFray: miss.fray,
  };
}

/** Returns true when the computed fields differ from what's stored. */
function needsUpdate(action, fresh) {
  const current = {
    damageMode:     action.damageMode     ?? "none",
    damageHitDice:  action.damageHitDice  ?? 0,
    damageHitFray:  !!action.damageHitFray,
    damageMissDice: action.damageMissDice ?? 0,
    damageMissFray: !!action.damageMissFray,
  };
  return current.damageMode     !== fresh.damageMode
      || current.damageHitDice  !== fresh.damageHitDice
      || current.damageHitFray  !== fresh.damageHitFray
      || current.damageMissDice !== fresh.damageMissDice
      || current.damageMissFray !== fresh.damageMissFray;
}

/** Process one legend actor; returns {changed, actions: [{name, mode}]}. */
async function processLegend(doc) {
  const actions = foundry.utils.deepClone(doc.system.actions ?? []);
  let changed = 0;
  const report = [];

  for (const action of actions) {
    const fresh = computeDamageFields(action);
    if (!fresh) continue;
    if (!needsUpdate(action, fresh)) continue;

    action.damageMode     = fresh.damageMode;
    action.damageHitDice  = fresh.damageHitDice;
    action.damageHitFray  = fresh.damageHitFray;
    action.damageMissDice = fresh.damageMissDice;
    action.damageMissFray = fresh.damageMissFray;
    changed++;
    report.push(`  • ${action.name || "(unnamed)"} → ${fresh.damageMode}`
      + ` (hit ${fresh.damageHitDice}[D]${fresh.damageHitFray ? "+fray" : ""}`
      + (fresh.damageMode === "hit-miss"
          ? `, miss ${fresh.damageMissDice}[D]${fresh.damageMissFray ? "+fray" : ""}`
          : "")
      + ")");
  }

  if (changed > 0) {
    await doc.update({ "system.actions": actions });
  }
  return { changed, report };
}

const log = [];
let totalActions = 0;
let totalLegends = 0;

/* --- 1. World legends --- */
const worldLegends = (game.actors ?? []).filter(a => a.type === "legend");
for (const a of worldLegends) {
  const { changed, report } = await processLegend(a);
  if (changed > 0) {
    totalLegends++;
    totalActions += changed;
    log.push(`✓ [world] ${a.name} — ${changed} action(s)`);
    log.push(...report);
  }
}

/* --- 2. Compendium legends --- */
const pack = game.packs.get(PACK_ID);
if (pack) {
  const wasLocked = pack.locked;
  if (wasLocked) await pack.configure({ locked: false });
  try {
    const docs = await pack.getDocuments();
    for (const a of docs) {
      if (a.type !== "legend") continue;
      const { changed, report } = await processLegend(a);
      if (changed > 0) {
        totalLegends++;
        totalActions += changed;
        log.push(`✓ [pack] ${a.name} — ${changed} action(s)`);
        log.push(...report);
      }
    }
  } finally {
    if (wasLocked) await pack.configure({ locked: true });
  }
} else {
  log.push(`⚠ pack "${PACK_ID}" not found — compendium skipped`);
}

const summary = `Updated ${totalActions} action(s) across ${totalLegends} legend(s).`;
console.log(`[populate-legend-damage] ${summary}`);
for (const line of log) console.log(line);

ChatMessage.create({
  speaker: { alias: "Legend Damage Migration" },
  content: `<div style="padding:6px 10px;border-left:3px solid #c8961c;background:rgba(200,150,28,.08)">
    <strong>Legend damage populated.</strong><br>${summary}
    <details><summary>Details</summary><pre style="font-size:.8em">${log.join("\n")}</pre></details>
  </div>`,
});
