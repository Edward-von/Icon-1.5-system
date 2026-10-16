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

// Rules text an ability's summons are read from: every block of the ability,
// not only the main effect (Umbra's "Finishing Blow: Summon a shadow adjacent
// to your target", p.162).
const TEXT_FIELDS = ["description", "hitEffect", "missEffect", "areaEffect", "chargeEffect",
  "heroicEffect", "exceedEffect", "collideEffect", "slayEffect", "critEffect",
  "finishingBlowEffect", "comebackEffect", "comboEffect", "talent1", "talent2", "mastery"];

// Verbs that put a creature on the table, right before its name with only a
// count or an article between: "summon a shadow", "summon +1 more beasts",
// "create a plant", "leave a bomb", "becoming a beast summon", thralls that
// "turn into plants" (p.183). A name used any other way ("consume a
// shadow", "shadows in range 2", "Shadow Play", "a massive flock of winged
// beasts") is only talk about the creature, not a summon of it.
const CREATE_VERB = String.raw`(?:summon(?:s|ed|ing)?|creat(?:e|es|ed|ing)|leav(?:e|es|ing)|left|plac(?:e|es|ed|ing)|becom(?:e|es|ing)|(?:collaps(?:e|es|ed|ing)|turn(?:s|ed|ing)?|transform(?:s|ed|ing)?)\s+into)`;
const COUNT = String.raw`(?:(?:a|an|one|two|three|four|\+?\d+|more|another|additional|extra|new|real|regular|single)\s+)*`;
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The summons a piece of rules text creates, out of a summons index.
 * Pure (no Foundry globals), so the compendium can be checked from Node.
 *
 * @param {object} system     the ability's system data
 * @param {string} jobName    the character's job
 * @param {Array<{name:string, job:string}>} index
 */
export function matchSummons(system, jobName, index) {
  const s = system ?? {};
  const text = TEXT_FIELDS.map(k => String(s[k] ?? "")).join(" ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").toLowerCase();
  if (!text.trim()) return [];
  const job = String(jobName || s.jobName || "").toLowerCase();
  const out = [];
  for (const entry of index) {
    // A summon belonging to another job is never offered: in the jobs pack
    // every real summon is its own job's, and the cross-job hits are just
    // words (Raging Wolf's "Beast Within", Blackstar's "Great Spirit Bomb").
    // Abilities without a job still match.
    if (entry.job && job && entry.job.toLowerCase() !== job) continue;
    // Word boundaries so "plant" doesn't fire on "implanted".
    const re = new RegExp(String.raw`\b${CREATE_VERB}\s+${COUNT}${esc(entry.name.toLowerCase())}s?\b`, "i");
    if (!re.test(text)) continue;
    out.push(entry);
  }
  return out;
}

/**
 * The summons an ability creates, for its own job.
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
  return matchSummons(system, jobName, index).map(e => ({ uuid: e.uuid, name: e.name, img: e.img }));
}

/**
 * The summons a trait creates: Beast Master (p.168), Selkie (p.232), Bound
 * Spirit (p.155), Cheap Trick "leave a bomb in an adjacent space" (p.149),
 * Darkside "you may leave a shadow" (p.161).
 *
 * Same verb rule as the abilities, plus one for the traits that carry the
 * creature's stat block: they name it once with a pronoun or a short name
 * ("summon it in range 3", "place your seraph in range 2") and then give its
 * profile as "<Name> — Size 1, …". A stat block and a verb that puts a
 * creature in play (summon, place, create, leave) is a summon of it. The
 * whole name must open the block: "Beast" is not the tail of "Great Beast —
 * Size".
 * Pure (no Foundry globals), so the compendium can be checked from Node.
 */
export function matchTraitSummons(system, jobName, index) {
  const out = matchSummons(system, jobName, index);
  const text = String(system?.description ?? "")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").toLowerCase();
  if (!new RegExp(String.raw`\b(?:summon(?:s|ed)?|plac(?:e|es|ed)|creat(?:e|es|ed)|leav(?:e|es))\b`).test(text)) return out;
  const job = String(jobName || system?.jobName || "").toLowerCase();
  for (const entry of index) {
    if (out.includes(entry)) continue;
    if (entry.job && job && entry.job.toLowerCase() !== job) continue;
    const block = new RegExp(String.raw`(?<![a-z]\s)\b${esc(entry.name.toLowerCase())}\s*[—–-]+\s*size\b`, "i");
    if (block.test(text)) out.push(entry);
  }
  return out;
}

/** The summons a trait creates, for its own job (see matchTraitSummons). */
export function summonsForTrait(system, jobName = "") {
  const index = summonIndex();
  if (!index.length) return [];
  return matchTraitSummons(system, jobName, index).map(e => ({ uuid: e.uuid, name: e.name, img: e.img }));
}
