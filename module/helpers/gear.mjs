/**
 * gear.mjs — Gear kits and loose gear on a PC (p.35 and the bond sheets).
 *
 * Rules, all from the book:
 *  - Every character always has the basic adventurer's kit (p.35); the Elder
 *    has a weathered version of it (p.74), the Outsider only the outsider's
 *    kit (p.76), the Highborn has none (p.66).
 *  - At the start of an expedition you pick one kit from your bond to carry
 *    (p.35); the Highborn picks a combo of two (p.66).
 *  - Instead of a kit you can take any three items from your bond's kits as a
 *    custom kit (p.35); the Highborn takes five (p.66).
 *  - Used up or lost gear comes back on the next expedition (p.35).
 *  - Loose gear: keep any amount, take two on an expedition (p.36); the
 *    Outsider takes four (p.76), and their Resourceful power one more (p.77).
 */

const _log = (...a) => console.debug("[ICON | Gear]", ...a);

const KIT_PACK = "icon-system.gear-kits";

/** What a bond allows: base kit, kits carried, custom kit size, loose gear. */
export function bondGearRules(bondName) {
  const b = String(bondName ?? "").trim().toLowerCase();
  if (b === "highborn") return { base: null,         carry: 2, customItems: 5, looseGear: 2 };
  if (b === "outsider") return { base: "outsider",   carry: 0, customItems: 0, looseGear: 4 };
  if (b === "elder")    return { base: "weathered",  carry: 1, customItems: 3, looseGear: 2 };
  return                       { base: "adventurer", carry: 1, customItems: 3, looseGear: 2 };
}

/** The bond's name on a PC: the embedded bond item, else the old text field. */
export function bondNameOf(actor) {
  return actor?.items?.find(i => i.type === "bond")?.name ?? actor?.system?.narrative?.bond ?? "";
}

/** Loose gear a character can take on an expedition (+1 for Resourceful). */
export function looseGearLimit(actor) {
  const rules = bondGearRules(bondNameOf(actor));
  const resourceful = actor?.items?.some(i => i.type === "bond-power" && /^resourceful$/i.test(i.name ?? ""));
  return rules.looseGear + (resourceful ? 1 : 0);
}

/** Every kit in the Gear Kits compendium. */
export async function compendiumKits() {
  const pack = game.packs.get(KIT_PACK);
  if (!pack) return [];
  try { return await pack.getDocuments(); } catch (err) { console.warn("[ICON | Gear] could not read the Gear Kits compendium", err); return []; }
}

/**
 * The kits a bond starts with: its base kit (marked `always`) and its own
 * kits, as item data ready to embed.
 * @returns {Promise<object[]>}
 */
export async function bondKitData(bondName) {
  const rules = bondGearRules(bondName);
  const b = String(bondName ?? "").trim().toLowerCase();
  const docs = await compendiumKits();
  const out = [];
  for (const d of docs) {
    const kitBond = String(d.system?.bondName ?? "").trim().toLowerCase();
    let always = false;
    if (rules.base === "adventurer" && d.system?.isAdventurersKit && !kitBond) always = true;
    else if (rules.base === "weathered" && d.system?.isAdventurersKit && kitBond === b) always = true;
    else if (rules.base === "outsider" && kitBond === b) always = true;
    else if (kitBond !== b || d.system?.isAdventurersKit) continue;
    const data = d.toObject();
    delete data._id;
    data.system.always = always;
    data.system.carried = false;
    data.system.used = [];
    out.push(data);
  }
  return out;
}

/**
 * Embed the bond's kits the character doesn't have yet (matched by name).
 * When exactly one bond kit can be carried and there's only one, it's carried.
 * @returns {Promise<number>} kits added
 */
export async function addBondKits(actor, bondName = bondNameOf(actor)) {
  if (!actor || !bondName) return 0;
  const have = new Set(actor.items.filter(i => i.type === "gear-kit").map(i => i.name));
  const data = (await bondKitData(bondName)).filter(d => !have.has(d.name));
  if (!data.length) return 0;
  await actor.createEmbeddedDocuments("Item", data);
  _log(`addBondKits — "${actor.name}" (${bondName}): ${data.map(d => d.name).join(", ")}`);
  return data.length;
}

/** Item names of the bond's kits (for a custom kit), without duplicates. */
export async function bondKitItems(actor) {
  const b = bondNameOf(actor).trim().toLowerCase();
  const fromSheet = actor.items.filter(i => i.type === "gear-kit" && !i.system.custom && !i.system.always);
  const fromPack = (await compendiumKits()).filter(d =>
    String(d.system?.bondName ?? "").trim().toLowerCase() === b && !d.system?.isAdventurersKit);
  const groups = new Map();
  for (const k of [...fromSheet, ...fromPack]) {
    if (groups.has(k.name)) continue;
    groups.set(k.name, (k.system?.items ?? []).filter(Boolean));
  }
  return [...groups].map(([kit, items]) => ({ kit, items }));
}
