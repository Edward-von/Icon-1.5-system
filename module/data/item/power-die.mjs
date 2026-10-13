/**
 * power-die.mjs — Shared "power die" sub-schema for abilities and traits.
 *
 * Manual (glossary, "Power Die"): a die set out and ticked up or down
 * depending on certain conditions; each power die is unique to the ability
 * that granted it, typically gained at 1 tick, discarded when it ticks to 0.
 *
 *   faces  0 = this item has no power die; 4 / 6 / 8 = the die it uses
 *   start  ticks it is set out at ("starting at 3")
 *   value  current ticks; 0 = not set out. Never above `faces`.
 *
 * Wright power dice (class resource) stay on the actor; this one lives on
 * the item so the tracker sits next to the ability text (Maar, Sept 2026).
 */
const { SchemaField, NumberField } = foundry.data.fields;

export function powerDieSchema() {
  return new SchemaField({
    faces: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
    start: new NumberField({ required: true, initial: 1, min: 0, integer: true }),
    value: new NumberField({ required: true, initial: 0, min: 0, integer: true }),
  });
}

/**
 * Parse a free-text power-die spec ("d6 starting at 6", "d6 at 3", "d4/1",
 * "d8") into { faces, start }. `start` is null when the text gives none.
 * Returns null when no die size is found.
 * @param {string} spec
 * @returns {{faces:number, start:number|null}|null}
 */
export function parsePowerDieSpec(spec) {
  const m = String(spec ?? "").match(/d\s*(\d+)(?:\D+(\d+))?/i);
  if (!m) return null;
  const faces = Number(m[1]);
  if (![4, 6, 8, 10, 12].includes(faces)) return null;
  return { faces, start: m[2] != null ? Number(m[2]) : null };
}

/**
 * The die an ability currently uses: its own `powerDie` unless an unlocked
 * talent / mastery overrides it (AbilityData.talent1PowerDie etc.; mastery
 * wins over the talent). Returns { faces, start, source } — `source` names
 * the upgrade ("Talent I", "Mastery") or is "" for the base die.
 * @param {object} system  item system data
 */
export function effectivePowerDie(system) {
  const pd = system?.powerDie ?? {};
  let faces = Number(pd.faces ?? 0);
  let start = Number(pd.start ?? 1);
  let source = "";
  const selected = Number(system?.talentSelected ?? 0);
  const layers = [];
  if (selected === 1) layers.push(["Talent I",  system?.talent1PowerDie]);
  if (selected === 2) layers.push(["Talent II", system?.talent2PowerDie]);
  if (system?.masteryUnlocked) layers.push(["Mastery", system?.masteryPowerDie]);
  for (const [name, spec] of layers) {
    const o = parsePowerDieSpec(spec);
    if (!o) continue;
    faces = o.faces;
    if (o.start != null) start = o.start;
    source = name;
  }
  return { faces, start, source };
}

/**
 * Sheet/chat view of an item's power die, or null when the item has none.
 * Applies the talent / mastery override (see effectivePowerDie).
 * @param {object} system  item system data
 */
export function powerDieView(system) {
  const pd = system?.powerDie;
  const { faces, start, source } = effectivePowerDie(system);
  if (!faces) return null;
  const value = Math.min(faces, Math.max(0, Number(pd?.value ?? 0)));
  return { faces, start, value, active: value > 0, atMax: value >= faces, source };
}

/**
 * Job templates carry their traits as plain {name, description, chapter}
 * rows, so a trait embedded from one loses the power die its standalone
 * copy in the `jobs` pack has (Sealer's Godly Smite mantra die). Look each
 * job trait up in that pack by name + job and copy the die across.
 * Mutates and returns `docs` (item creation data).
 * @param {object[]} docs
 */
export async function fillJobTraitPowerDice(docs) {
  const pack = game.packs.get("icon-system.jobs");
  if (!pack) return docs;
  const index = await pack.getIndex({ fields: ["system.jobName", "system.powerDie"] });
  for (const doc of docs) {
    if (doc?.type !== "trait" || doc.system?.source !== "job") continue;
    if (Number(doc.system?.powerDie?.faces ?? 0) > 0) continue;
    const match = index.find(e => e.type === "trait" && e.name === doc.name
      && (e.system?.jobName ?? "") === (doc.system?.jobName ?? "")
      && Number(e.system?.powerDie?.faces ?? 0) > 0);
    if (!match) continue;
    const pd = match.system.powerDie;
    doc.system.powerDie = { faces: pd.faces, start: pd.start ?? 1, value: 0 };
  }
  return docs;
}

/*
 * Power dice the text sets out on its own: "You start combat with a mantra
 * power die, a d6 that starts at 1, and ticks up by 1 at the start of every
 * round, to a maximum of 6" (Sealer's Godly Smite, p.191). Read from the
 * item's text, so any trait or ability written the same way follows.
 */
const STARTS_COMBAT_RE = /\bstart\s+combat\s+with\s+an?\s+[^.]*?\bpower\s+die\b/i;
const TICKS_ROUND_RE   = /\bticks?\s+up\s+by\s+1\s+at\s+the\s+start\s+of\s+(?:every|each)\s+round\b/i;

function _autoDieItems(actor, re) {
  return (actor?.items ?? []).filter(i => Number(i.system?.powerDie?.faces ?? 0) > 0 && re.test(String(i.system?.description ?? "")));
}

/**
 * Combat starts: set out every "you start combat with a … power die" at its
 * starting value. Returns the names of the items it set.
 * @param {Actor} actor
 */
export async function setOutCombatPowerDice(actor) {
  const items = _autoDieItems(actor, STARTS_COMBAT_RE);
  if (!items.length) return [];
  await actor.updateEmbeddedDocuments("Item", items.map(i => {
    const { faces, start } = effectivePowerDie(i.system);
    return { _id: i.id, "system.powerDie.value": Math.min(faces, Math.max(1, start)) };
  }));
  return items.map(i => i.name);
}

/**
 * A new round starts: tick up by 1 (to the die's maximum) every die whose
 * text says so and that is set out. Returns [{ name, value }] of the ticked ones.
 * @param {Actor} actor
 */
export async function tickRoundPowerDice(actor) {
  const items = _autoDieItems(actor, TICKS_ROUND_RE).filter(i => Number(i.system.powerDie.value ?? 0) > 0);
  const out = [];
  const updates = [];
  for (const i of items) {
    const { faces } = effectivePowerDie(i.system);
    const value = Math.min(faces, Number(i.system.powerDie.value) + 1);
    if (value === Number(i.system.powerDie.value)) continue;
    updates.push({ _id: i.id, "system.powerDie.value": value });
    out.push({ name: i.name, value });
  }
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
  return out;
}
