/**
 * foe-templates.mjs — putting a Foe Template (item type "foe-template") on a
 * Foe, and taking it off again.
 *
 * A template adds traits / actions / interrupts / round actions and may change
 * some fields (faction, class and statline for a job, Elite and size for the
 * Jotunn, HP for Titan Armament). Everything it does is written down in the
 * foe's `system.templates` entry:
 *   added   — names of the blocks it added (blocks the foe already had by that
 *             name are skipped, so the Wight job and the Relict faction don't
 *             both add Legion of the Dead);
 *   removed — the old class's baseline traits / Diaga that a class change took
 *             off (Guard on a Heavy that becomes a Wraith);
 *   prev    — each field it changed, as { from, to }.
 * Taking it off undoes exactly that. A field is only put back if it still
 * holds the value the template set, so a later edit by hand (or by another
 * template) is not overwritten.
 *
 * Templates sharing a slot are exclusive: one faction, one culture, one job;
 * the "special" ones (Imperial Officer, Titan Armament) each have their own
 * slot and stack with the rest (p.387: "This template stacks with other
 * templates"). Dropping a second template in a taken slot asks first, then
 * replaces the old one.
 */
import { CLASS_BASELINE, getFoeBaseStats } from "../data/actor/FoeData.mjs";

const _log = (...a) => console.debug("[ICON | FoeTemplates]", ...a);

const BLOCK_TYPES = ["traits", "actions", "interrupts", "roundActions"];
const SCALARS = ["foeClass", "isElite", "faction", "chapter", "size", "vit", "defense", "speed", "fray", "armor", "damagedie"];
const { getProperty, setProperty, deepClone } = foundry.utils;

/** The exclusivity slot of a template item. */
export const templateSlot = item => item.system.kind === "special" ? `special:${item.name}` : item.system.kind;

const KIND_LABEL = { faction: "faction", culture: "Great Culture", job: "job", special: "special" };

/** Mutable copy of everything a template can touch. */
function workingCopy(actor) {
  const s = actor.system;
  const work = { hp: { value: s.hp.value, max: s.hp.max }, mob: { ...s.mob }, templates: deepClone(s.templates ?? []) };
  for (const k of SCALARS) work[k] = s[k];
  for (const t of BLOCK_TYPES) work[t] = deepClone(s[t] ?? []);
  return work;
}

/** The update that writes a working copy back. */
function toUpdate(work) {
  const u = {};
  for (const k of [...SCALARS, ...BLOCK_TYPES, "hp", "mob", "templates"]) u[`system.${k}`] = work[k];
  return u;
}

const sameName = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

/** Undo one applied template on a working copy. */
function undo(work, entry) {
  for (const t of BLOCK_TYPES) {
    for (const name of entry.added?.[t] ?? []) {
      // Last match: if the foe had a same-named block of its own, it came first.
      const i = work[t].findLastIndex(b => sameName(b.name, name));
      if (i >= 0) work[t].splice(i, 1);
    }
  }
  for (const t of ["traits", "actions"]) {
    for (const block of entry.removed?.[t] ?? []) {
      if (!work[t].some(b => sameName(b.name, block.name))) work[t].push(block);
    }
  }
  for (const [key, { from, to }] of Object.entries(entry.prev ?? {})) {
    const path = key.replaceAll("/", ".");
    if (getProperty(work, path) === to) setProperty(work, path, from);
    else _log(`undo "${entry.name}" — ${path} left at ${getProperty(work, path)} (changed since: template set ${to})`);
  }
}

/** Apply a template item to a working copy; returns the new `system.templates` entry. */
function apply(work, item) {
  const t = item.system;
  const entry = { slot: templateSlot(item), kind: t.kind, name: item.name, uuid: item.uuid,
                  added: {}, removed: {}, prev: {} };
  // prev is keyed "hp/max", not "hp.max": a dotted key inside the stored
  // object would be read back as a nested path by the update.
  const set = (path, value) => {
    const from = getProperty(work, path);
    if (from === value) return;
    const key = path.replaceAll(".", "/");
    if (!(key in entry.prev)) entry.prev[key] = { from, to: value };
    else entry.prev[key].to = value;
    setProperty(work, path, value);
  };

  // Job: class first — the old class's baseline traits / Diaga go (p.298).
  if (t.foeClass && t.foeClass !== work.foeClass) {
    const old = CLASS_BASELINE[work.foeClass] ?? { traits: [], actions: [] };
    for (const [type, names] of [["traits", old.traits], ["actions", old.actions]]) {
      const keep = [];
      for (const b of work[type]) {
        if (names.some(n => sameName(n, b.name))) (entry.removed[type] ??= []).push(b);
        else keep.push(b);
      }
      work[type] = keep;
    }
    set("foeClass", t.foeClass);
    // A job template always carries its statline; if one doesn't, fall back to the class's.
    if (t.stats?.vit == null) {
      const base = getFoeBaseStats(t.foeClass, work.isElite);
      for (const k of ["vit", "defense", "speed", "fray", "armor", "damagedie"]) set(k, base[k]);
      set("hp.max", base.hp.max);
    }
    if (t.foeClass === "mob" && !work.mob?.members) { set("mob.members", 6); set("mob.hitsRemaining", 12); }
  }
  const st = t.stats ?? {};
  for (const k of ["vit", "defense", "speed", "fray", "armor", "size", "chapter"]) if (st[k] != null) set(k, st[k]);
  if (st.damagedie) set("damagedie", st.damagedie);
  if (st.isElite != null) set("isElite", !!st.isElite);
  if (st.hp != null) set("hp.max", st.hp);

  if (t.faction) set("faction", t.faction);

  // Legacy of the Titans (p.448): "Elite … Double HP if upgrading from a normal foe."
  if (t.makeElite && !work.isElite && work.foeClass !== "mob") {
    set("isElite", true);
    set("hp.max", work.hp.max * 2);
  }
  // Titanblood: "Increase size to 2 if not already 2."
  if (t.minSize && (work.size ?? 1) < t.minSize) set("size", t.minSize);
  // Titan Armament: "they have 50% more hp".
  if (t.hpMultiplier && t.hpMultiplier !== 1) set("hp.max", Math.round(work.hp.max * t.hpMultiplier));

  if ("hp/max" in entry.prev) set("hp.value", work.hp.max);

  for (const type of BLOCK_TYPES) {
    for (const block of t[type] ?? []) {
      if (work[type].some(b => sameName(b.name, block.name))) continue;
      work[type].push(deepClone(block));
      (entry.added[type] ??= []).push(block.name);
    }
  }
  return entry;
}

/**
 * Drop handler: apply `item` (a foe-template) to `actor` (a foe), asking first
 * when a template already sits in the same slot.
 */
export async function applyFoeTemplate(actor, item) {
  const slot = templateSlot(item);
  const work = workingCopy(actor);
  const existing = work.templates.findIndex(e => e.slot === slot);
  _log(`apply — "${item.name}" (${slot}) on "${actor.name}" | slot taken by: ${existing >= 0 ? `"${work.templates[existing].name}"` : "(none)"}`);

  if (existing >= 0) {
    const old = work.templates[existing];
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Replace template?" },
      content: `<p><strong>${actor.name}</strong> already has the ${KIND_LABEL[old.kind] ?? old.kind} template
                <strong>${old.name}</strong>.</p><p>Replace it with <strong>${item.name}</strong>? What
                ${old.name} added comes off first.</p>`,
      rejectClose: false,
    });
    if (!ok) { _log(`apply — cancelled by the user`); return false; }
    undo(work, old);
    work.templates.splice(existing, 1);
  }

  const entry = apply(work, item);
  work.templates.push(entry);
  await actor.update(toUpdate(work));

  const n = BLOCK_TYPES.reduce((sum, t) => sum + (entry.added[t]?.length ?? 0), 0);
  const changed = Object.keys(entry.prev).filter(p => p !== "hp/value");
  _log(`apply — done | added ${n} block(s) | changed: ${changed.join(", ") || "(nothing)"}`, entry);
  ui.notifications.info(`${item.name} applied to ${actor.name}: ${n} trait(s)/action(s) added` +
                        (changed.length ? `, ${changed.length} field(s) changed.` : "."));
  return true;
}

/** ✕ on an applied-template chip: undo it and forget it. */
export async function removeFoeTemplate(actor, index) {
  const work = workingCopy(actor);
  const entry = work.templates[index];
  if (!entry) return;
  _log(`remove — "${entry.name}" from "${actor.name}"`);
  undo(work, entry);
  work.templates.splice(index, 1);
  await actor.update(toUpdate(work));
  ui.notifications.info(`${entry.name} removed from ${actor.name}.`);
}
