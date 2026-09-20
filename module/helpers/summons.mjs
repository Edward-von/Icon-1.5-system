/**
 * summons.mjs — the summons an ability puts on the table.
 *
 * The `summons` compendium holds one actor per creature a job can summon
 * (Salt Sprite, Wild Card, Bomb, Beast, Shadow, Thrall, Plant…), and the
 * abilities name them in their rules text ("summon a salt sprite in any space
 * in range 2 from them", p.233). Matching the two lets the ability panel offer
 * the creature directly, so nobody has to go hunting in the compendium.
 *
 * The index is read once per session and cached; the pack is small (12 actors).
 */

const _log = (...a) => console.debug("[ICON | Summons]", ...a);
const PACK = "icon-system.summons";

/** @type {Array<{uuid:string, name:string, img:string, job:string}>|null} */
let _index = null;

/** Load (once) the summons pack index. Returns [] when the pack is missing. */
export async function loadSummonIndex() {
  if (_index) return _index;
  const pack = game.packs?.get(PACK);
  if (!pack) { console.warn(`ICON 1.5 | summons pack "${PACK}" not found`); _index = []; return _index; }
  try {
    const idx = await pack.getIndex({ fields: ["system.sourceAbilityName"] });
    _index = idx.map(e => ({
      uuid: e.uuid ?? `Compendium.${pack.collection}.Actor.${e._id}`,
      name: e.name,
      img:  e.img ?? "icons/svg/mystery-man.svg",
      job:  e.system?.sourceAbilityName ?? "",
    }));
    _log(`index loaded: ${_index.length} summon(s)`);
  } catch (err) {
    console.error("ICON 1.5 | could not read the summons pack index", err);
    _index = [];
  }
  return _index;
}

/** The cached index without loading it (for synchronous contexts). */
export function summonIndex() { return _index ?? []; }

/**
 * The summons an ability's text names, for its own job first.
 *
 * Matching is by name against the pack, so an ability that merely says
 * "summon" with no creature (Waterspout's own spout, Aethershard's object)
 * offers nothing — better than guessing at something that isn't in the pack.
 *
 * @param {object} system     the ability's system data
 * @param {string} [jobName]  the character's job, to prefer its own summons
 * @returns {Array<{uuid:string, name:string, img:string}>}
 */
export function summonsForAbility(system, jobName = "") {
  const index = summonIndex();
  if (!index.length) return [];
  const s = system ?? {};
  const text = [s.description, s.hitEffect, s.missEffect, s.areaEffect, s.comboEffect,
                s.talent1, s.talent2, s.mastery]
    .map(v => String(v ?? "")).join(" ").replace(/<[^>]+>/g, " ").toLowerCase();
  if (!text.trim()) return [];
  const job = String(jobName || s.jobName || "").toLowerCase();
  const out = [];
  for (const entry of index) {
    const name = entry.name.toLowerCase();
    // Word-boundary match so "plant" doesn't fire on "implanted".
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`, "i");
    if (!re.test(text)) continue;
    // A summon belonging to another job is only offered when this ability is
    // that job's (Mist Strider, a Warden ability, summons a Shade's Shadow).
    if (entry.job && job && entry.job.toLowerCase() !== job && !text.includes(name)) continue;
    out.push({ uuid: entry.uuid, name: entry.name, img: entry.img });
  }
  return out;
}
