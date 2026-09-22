/**
 * migrations.mjs — World data migration framework for ICON 1.5.
 *
 * Foundry persists documents with whatever schema they were created under;
 * DataModel only adds defaults for NEW fields. Renames, moves, or semantic
 * changes to existing fields need an explicit migration or old documents
 * keep stale data forever.
 *
 * HOW TO ADD A MIGRATION:
 *   1. Bump CURRENT_SCHEMA_VERSION (integers, +1 per breaking change).
 *   2. Add MIGRATIONS[<new version>] = async () => { ... } that transforms
 *      every affected world document. Use migrateWorldDocuments() for the
 *      common per-actor/per-item sweep.
 *   3. Migrations must be idempotent — they may run again if a world is
 *      restored from a backup taken mid-migration.
 *
 * System compendium packs are NOT migrated here: they ship already at the
 * current schema. World-side compendia created by the GM are swept too.
 */

import { expectedApTotal, expectedSkillRanksFromLevels,
         STARTING_ACTION_DOTS } from "./helpers/advancement.mjs";

const SYSTEM_ID = "icon-system";
const SETTING   = "schemaVersion";
const MACRO_SETTING = "macroSyncVersion";

/** Bump this when a schema change needs a data migration. */
export const CURRENT_SCHEMA_VERSION = 16;

/**
 * Registry of migration steps, keyed by the version they migrate TO.
 * Version 1 is the baseline (schema as of system v1.0.0) — no step needed.
 *
 * Example for a future change:
 *   2: async () => {
 *     await migrateWorldDocuments({
 *       actor: (actor) => actor.type === "icon"
 *         ? { "system.combat.newField": actor.system.oldField ?? 0 }
 *         : null,
 *     });
 *   },
 */
/**
 * Abilities whose rules blocks the book prints in a different order than the
 * system's default (helpers/ability-blocks.mjs). Same values as the jobs pack;
 * produced by icon-compendium-audit/block-order/report-block-order.mjs.
 */
const BLOCK_ORDER_BY_NAME = {
  "Apex": "hit, miss, area, sections, finish, charge, heroic, exceed, collide, slay, crit, comeback",
  "Astral Chain": "hit, miss, area, sections, charge, heroic, finish, exceed, collide, slay, crit, comeback",
  "Battering Ram": "hit, miss, area, sections, charge, collide, heroic, exceed, slay, crit, finish, comeback",
  "Bio": "effect, hit, miss, area, charge, infuse 3",
  "Blackstar": "hit, miss, area, sections, charge, heroic, comeback, exceed, collide, slay, crit, finish",
  "Bleak Mercy": "hit, miss, area, sections, charge, slay, heroic, exceed, collide, crit, finish, comeback",
  "Blitz": "effect, hit, miss, effect, slay or infuse 3",
  "Catapult": "hit, miss, area, sections, charge, collide, heroic, exceed, slay, crit, finish, comeback",
  "Cavaliere": "effect, hit, miss, effect, finish, slay, area, sections, charge, heroic, exceed, collide, crit, comeback",
  "Circle the Oak": "effect, hit, miss, effect, finish, charge, area, sections, heroic, exceed, collide, slay, crit, comeback",
  "Cryo": "effect, hit, area, effect",
  "Dark Knight": "stance, heroic, refresh",
  "Death": "area effect, hit, area, finish, slay, special effect, miss, sections, charge, heroic, exceed, collide, crit, comeback",
  "Demon Cutter": "hit, miss, effect, area, charge",
  "Diablo": "hit, miss, area, sections, charge, heroic, exceed, collide, finish, slay, crit, comeback",
  "Drifting Leaf": "hit, miss, effect, area, effect",
  "Geo": "hit, miss, area, charge, infuse 4",
  "Gigaton Whip": "hit, miss, effect, collide, exceed, heroic, area, sections, charge, slay, crit, finish, comeback",
  "God Hand": "effect, hit, miss, effect, exceed",
  "Great Giorgios": "hit, miss, area, sections, charge, collide, heroic, exceed, slay, crit, finish, comeback",
  "Gust": "terrain effect, collide, infuse 4",
  "Gwynt": "hit, miss, area, sections, finish, charge, heroic, exceed, collide, slay, crit, comeback",
  "Heracule": "hit, miss, area, sections, charge, collide, heroic, exceed, slay, crit, finish, comeback",
  "Implode": "effect, comeback, infuse 4",
  "Lance": "hit, miss, effect, area, effect, comeback, exceed, infuse 3",
  "Low Blow": "effect, hit, miss, effect, slay, heroic, area, sections, charge, exceed, collide, crit, finish, comeback",
  "Massive Overhead": "hit, miss, area, sections, charge, comeback, heroic, exceed, collide, slay, crit, finish",
  "Matsuri": "effect, hit, miss, exceed",
  "Nothung": "effect, hit, miss, area, effect, slay or infuse 3",
  "Open the Gates": "effect, hit, miss, exceed",
  "Pyre": "hit, miss, area, comeback, exceed, infuse 3",
  "Pyroclast": "effect, comeback, infuse 3",
  "Quaking Palm": "hit, miss, effect, effect, charge, infuse 3",
  "Realignment": "effect, charge, infuse 2",
  "Revenge": "hit, miss, area, sections, charge, slay, heroic, exceed, collide, crit, finish, comeback",
  "Rime": "hit, miss, area, effect, collide, infuse 3",
  "Rook": "hit, miss, effect, effect, collide, heroic",
  "Showdown": "effect, finish, special",
  "Sidhe": "hit, miss, area, sections, finish, charge, heroic, exceed, collide, slay, crit, comeback",
  "Sleight of Hand": "hit, effect, area, effect, summon effect",
  "Soul Blade": "stance, heroic, refresh",
  "Soul Shot": "hit, miss, effect, area, finish, exceed, sections, charge, heroic, collide, slay, crit, comeback",
  "Stampede": "hit, miss, area, sections, collide, charge, heroic, exceed, slay, crit, finish, comeback",
  "Strafe Shot": "effect, hit, miss, effect, effect, finish, exceed, area, sections, charge, heroic, collide, slay, crit, comeback",
  "Strongarm": "effect, effect, collide, heroic",
  "Takedown": "hit, miss, area, sections, charge, exceed, heroic, collide, slay, crit, finish, comeback",
  "Tsunami": "terrain effect, collide, infuse 1",
  "Umbra": "effect, hit, miss, effect, finish",
  "Upheaval": "hit, miss, area, sections, charge, comeback, heroic, exceed, collide, slay, crit, finish",
  "Valiant": "hit, miss, area, sections, charge, collide, heroic, exceed, slay, crit, finish, comeback",
  "Valkyrie": "effect, hit, miss, effect, exceed, heroic, area, sections, charge, collide, slay, crit, finish, comeback",
};

/**
 * Tags the combo version of an ability uses when it changes them (Hades gains
 * True Strike and Medium Blast, The Hook gains range 2…). Same values as the
 * jobs pack; see icon-compendium-audit/combo-tags/apply-combo-tags.mjs.
 */
const COMBO_TAGS_BY_NAME = {
  "Sow": "attack, range-4, mark, pierce, combo",
  "Low Blow": "attack, range-2, true-strike, combo",
  "Incubus": "attack, +1-boon, combo",
  "Death Blossom": "attack, arc-4, unerring, combo",
  "Revenge": "attack, true-strike, combo",
  "Felicity": "range-5, combo",
  "Holy": "attack, range-5, medium-blast, true-strike, autohit, combo",
  "Justice": "interrupt-1, gamble, combo",
  "Astra": "attack, range-5, medium-blast, autohit, combo",
  "God Hand": "attack, +1-boon, combo",
};

const MIGRATIONS = {
  /* 2 — Secondary-class Gambit traits. Until 2026-08-29 TraitData.source
   * rejected "gambit", so PCs with a secondary job of another class never
   * received that class's Gambit trait. Embed the missing ones. */
  2: async () => {
    const { ensureClassGambits } = await import("./helpers/classes.mjs");
    for (const actor of game.actors) {
      if (actor.type !== "icon") continue;
      const created = await ensureClassGambits(actor);
      if (created.length) console.log(`ICON 1.5 | Migration 2: embedded ${created.length} gambit trait(s) on "${actor.name}"`);
    }
  },

  /* 3 — Token HP bars. Actors created before the preCreateActor hook (and
   * tokens already placed on scenes) have no bar1 attribute, so no HP bar
   * shows on the map. Same defaults as the hook: PCs → combat.hp always
   * visible; NPCs → hp, owner only. Intangible summons keep no bar. */
  3: async () => {
    const barFor = type => ({
      attribute:   type === "icon" ? "combat.hp" : "hp",
      displayBars: type === "icon" ? CONST.TOKEN_DISPLAY_MODES.ALWAYS : CONST.TOKEN_DISPLAY_MODES.OWNER,
    });
    let actors = 0, tokens = 0;
    for (const actor of game.actors) {
      if (actor.type === "summon" && actor.system?.intangible) continue;
      if (actor.prototypeToken?.bar1?.attribute) continue;
      const { attribute, displayBars } = barFor(actor.type);
      await actor.update({ "prototypeToken.bar1.attribute": attribute, "prototypeToken.displayBars": displayBars });
      actors++;
    }
    for (const scene of game.scenes) {
      const updates = [];
      for (const tok of scene.tokens) {
        const type = tok.actor?.type;
        if (!type || tok.bar1?.attribute) continue;
        if (type === "summon" && tok.actor?.system?.intangible) continue;
        const { attribute, displayBars } = barFor(type);
        updates.push({ _id: tok.id, "bar1.attribute": attribute, displayBars });
      }
      if (updates.length) { await scene.updateEmbeddedDocuments("Token", updates); tokens += updates.length; }
    }
    console.log(`ICON 1.5 | Migration 3: HP bars set on ${actors} actor(s) and ${tokens} placed token(s)`);
  },

  /* 4 — "Rush X" is a keyword, not a Stalwart class trait (Maar, Sept 2026).
   * Removed from CLASS_INFO.stalwart.traits; delete the trait items the
   * system had embedded on existing PCs (source "class", so player-made
   * traits with the same name are left alone). */
  4: async () => {
    for (const actor of game.actors) {
      if (actor.type !== "icon") continue;
      const ids = actor.items
        .filter(i => i.type === "trait" && i.system?.source === "class" && /^rush\b/i.test(i.name ?? ""))
        .map(i => i.id);
      if (!ids.length) continue;
      await actor.deleteEmbeddedDocuments("Item", ids);
      console.log(`ICON 1.5 | Migration 4: removed ${ids.length} "Rush X" class trait(s) from "${actor.name}"`);
    }
  },

  /* 5 — Migration 4 left "Rush X" on at least one PC of the live world (schema
   * was already at 4 when the playtest of 9 Sept 2026 looked): remove the
   * trait again, this time by exact name whatever its `source`. */
  5: async () => {
    for (const actor of game.actors) {
      if (actor.type !== "icon") continue;
      const ids = actor.items.filter(i => i.type === "trait" && /^rush x$/i.test((i.name ?? "").trim())).map(i => i.id);
      if (!ids.length) continue;
      await actor.deleteEmbeddedDocuments("Item", ids);
      console.log(`ICON 1.5 | Migration 5: removed ${ids.length} "Rush X" trait(s) from "${actor.name}"`);
    }
  },

  /* 6 — Reading order of the rules blocks (system.blockOrder, new in this
   * version). The jobs pack carries it, but the abilities on existing
   * characters are copies made before the field existed: match them by name so
   * "Effect: Teleport 2" goes back above the attack line on the PCs already in
   * play. Only fills an empty value — a hand-edited order is left alone. */
  6: async () => {
    const apply = async (items, owner) => {
      const updates = [];
      for (const item of items) {
        if (item.type !== "ability") continue;
        if ((item.system?.blockOrder ?? "").trim()) continue;
        const order = BLOCK_ORDER_BY_NAME[(item.name ?? "").trim()];
        if (order) updates.push({ _id: item.id, "system.blockOrder": order });
      }
      if (!updates.length) return;
      await owner.updateEmbeddedDocuments("Item", updates);
      console.log(`ICON 1.5 | Migration 6: block order set on ${updates.length} ability(ies) of "${owner.name}"`);
    };
    for (const actor of game.actors) await apply(actor.items, actor);
    // World items (abilities dragged into the sidebar) update one by one.
    for (const item of game.items) {
      if (item.type !== "ability" || (item.system?.blockOrder ?? "").trim()) continue;
      const order = BLOCK_ORDER_BY_NAME[(item.name ?? "").trim()];
      if (order) await item.update({ "system.blockOrder": order });
    }
  },

  /* 7 — Missing limit breaks. "free" wasn't among the allowed costs of a
   * limit-break item, so Death Sentence (Harvester), Elemental (Stormbender)
   * and High Prophecy (Seer) failed validation and were never created: those
   * characters have no limit break at all. The cost is allowed now — put the
   * missing item back from the job template. */
  7: async () => {
    const pack = game.packs.get("icon-system.jobs");
    if (!pack) return;
    let templates = null;                       // loaded once, only if needed
    for (const actor of game.actors) {
      if (actor.type !== "icon") continue;
      if (actor.items.some(i => i.type === "limit-break")) continue;
      const jobs = actor.system?.combat?.jobs ?? [];
      const primary = jobs.find(j => j.primary) ?? jobs[0];
      if (!primary?.name) continue;

      let tpl = null;
      if (primary.templateUuid) { try { tpl = await fromUuid(primary.templateUuid); } catch { tpl = null; } }
      if (!tpl) {
        templates ??= await pack.getDocuments();
        tpl = templates.find(d => d.type === "job-template" && d.system?.jobName === primary.name);
      }
      const lb = tpl?.system?.limitBreak;
      if (!lb?.name) continue;

      await actor.createEmbeddedDocuments("Item", [{
        type: "limit-break",
        name: lb.name,
        system: {
          jobName:     primary.name,
          class:       primary.class ?? tpl.system?.class ?? "stalwart",
          resolveCost: lb.resolveCost ?? 2,
          cost:        lb.cost ?? "1action",
          effect:      lb.effect ?? "",
          ultimate:    lb.ultimate ?? "",
        },
      }]);
      console.log(`ICON 1.5 | Migration 7: restored the limit break "${lb.name}" on "${actor.name}" (${primary.name})`);
    }
  },
  /* 8 — Tags of the combo version (system.comboTags, new in this version).
   * Same story as migration 6: the pack carries them, the copies already on
   * characters don't, so the combo of Holy / Death Blossom / Astra… kept
   * showing the base tags and placing the base area. */
  8: async () => {
    for (const actor of game.actors) {
      const updates = [];
      for (const item of actor.items) {
        if (item.type !== "ability") continue;
        if ((item.system?.comboTags ?? "").trim()) continue;
        const tags = COMBO_TAGS_BY_NAME[(item.name ?? "").trim()];
        if (tags) updates.push({ _id: item.id, "system.comboTags": tags });
      }
      if (!updates.length) continue;
      await actor.updateEmbeddedDocuments("Item", updates);
      console.log(`ICON 1.5 | Migration 8: combo tags set on ${updates.length} ability(ies) of "${actor.name}"`);
    }
    for (const item of game.items) {
      if (item.type !== "ability" || (item.system?.comboTags ?? "").trim()) continue;
      const tags = COMBO_TAGS_BY_NAME[(item.name ?? "").trim()];
      if (tags) await item.update({ "system.comboTags": tags });
    }
  },

  /* 9 — The Lowlander "Butcher" was Artillery in the foes pack and is a Heavy
   * (p.430: a Chapter 1+ variant of the Slab; the page gives no class, the
   * pack had inferred one). Foes already dragged into a world are independent
   * copies and never see a pack fix, so give them the p.298 Heavy line here.
   * Only a Butcher still carrying the untouched Artillery baseline is changed:
   * anything a GM re-statted keeps its numbers. */
  9: async () => {
    const ARTILLERY = { foeClass: "artillery", vit: 8, defense: 7, fray: 3, damagedie: "d8", armor: 0 };
    const HEAVY     = { foeClass: "heavy",     vit: 10, defense: 6, fray: 4, damagedie: "d6", armor: 2, hp: 40 };
    const GUARD = { name: "Guard", description: "<p>Has Rampart. Reduce all damage to self and allies in orthogonal spaces by 2, as if by armor.</p>" };

    const fix = async (actor) => {
      const s = actor.system ?? {};
      if (actor.type !== "foe" || (actor.name ?? "").trim() !== "Butcher") return false;
      const stock = Object.entries(ARTILLERY).every(([k, v]) => s[k] === v)
                 && (s.hp?.max ?? 0) === 32 && !s.isElite;
      if (!stock) return false;
      const traits = (s.traits ?? []).filter(t => t.name !== "Slip" && t.name !== "Aetherwall");
      if (!traits.some(t => t.name === GUARD.name)) {
        const at = traits.findIndex(t => t.name === "Defiance");
        traits.splice(at >= 0 ? at + 1 : 0, 0, { ...GUARD });
      }
      await actor.update({
        "system.foeClass":  HEAVY.foeClass,
        "system.vit":       HEAVY.vit,
        "system.defense":   HEAVY.defense,
        "system.fray":      HEAVY.fray,
        "system.damagedie": HEAVY.damagedie,
        "system.armor":     HEAVY.armor,
        "system.hp":        { value: HEAVY.hp, max: HEAVY.hp },
        "system.traits":    traits,
      });
      return true;
    };

    let n = 0;
    for (const actor of game.actors) if (await fix(actor)) n++;
    // Unlinked tokens carry their own copy of the actor.
    for (const scene of game.scenes) {
      for (const token of scene.tokens) {
        if (token.actorLink || !token.actor) continue;
        if (await fix(token.actor)) n++;
      }
    }
    if (n) console.log(`ICON 1.5 | Migration 9: ${n} "Butcher" foe(s) re-statted from Artillery to Heavy (p.298)`);
  },

  /* 10 — The Stormbender's "Summons" box (p.232: what a Salt Sprite is and how
   * many you may have) had been swept into the text of two of its abilities by
   * the PDF extraction: the whole box into Rime, the creature's stat line into
   * Geyser. Neither page prints it — the box belongs to the job page, and its
   * rules already live on the "Salt Sprite" actor of the summons pack. Copies
   * of the abilities on existing characters keep the stray text, so strip it
   * here as well. A description someone edited by hand no longer matches the
   * block and is left alone. */
  10: async () => {
    const BLOCK = /(?:\s*Salt Sprites can be summoned in range 2[\s\S]*?)?\s*Salt Sprite — Size 1, intangible, immobile\.[\s\S]*?Then, remove the sprite\.\s*/;
    const strip = (text) => String(text ?? "")
      .replace(BLOCK, " ")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\s+\n/g, "\n")
      .trim();

    const fixItem = (item) => {
      if (item.type !== "ability") return null;
      const desc = item.system?.description ?? "";
      if (!BLOCK.test(desc)) return null;
      return { _id: item.id, "system.description": strip(desc) };
    };

    let n = 0;
    for (const actor of game.actors) {
      const updates = actor.items.map(fixItem).filter(Boolean);
      if (!updates.length) continue;
      await actor.updateEmbeddedDocuments("Item", updates);
      n += updates.length;
      console.log(`ICON 1.5 | Migration 10: Salt Sprite box removed from ${updates.length} ability(ies) of "${actor.name}"`);
    }
    for (const item of game.items) {
      const update = fixItem(item);
      if (!update) continue;
      await item.update({ "system.description": update["system.description"] });
      n++;
    }
    if (n) console.log(`ICON 1.5 | Migration 10: ${n} ability description(s) cleaned (p.232 Summons box)`);
  },

  /* 11 — Tsunami (Stormbender, p.233). Its description was one run-on
   * paragraph, which broke three ways: "Infuse 1: STORMLASH — Free Action: …"
   * lost Stormlash's rules to a block of its own (because "Free Action:" is a
   * block label), "Collide:" was written both in the text and in the
   * collideEffect field so it printed twice, and the sentence after it in the
   * book ("All your Tsunamis disappear…", a rule of the ability, not of the
   * collide) hung off the Collide block. Copies on characters keep the old
   * text, so rewrite them to the pack's wording — only the ones that still
   * carry the broken Stormlash line, so a hand-edited copy is left alone. */
  11: async () => {
    const MARKER = /Infuse 1:\s*STORMLASH\s*—\s*Free Action:/i;
    const DESCRIPTION =
      "The stormbenders can ride swells of water as easily as any terrestrial steed. For those not as gifted, the experience is less pleasant. " +
      "Terrain effect: Create a huge swell of elemental water. The area is a medium blast terrain effect that is difficult and dangerous terrain that you may place anywhere as long as its edge is adjacent to an edge of the map. " +
      "When you use this ability, choose another edge of the map. When you use this ability, and at the start of your turns, your tsunami moves 4 spaces in a straight line towards that edge. When a space of the tsunami would move off the map, the effect ends. " +
      "Any non-flying characters in Tsunami when it moves are dragged with it, shoving them. If they are blocked by obstructions, they collide which could cause Tsunami to move on without them. " +
      "All your Tsunamis disappear if you use this ability again, or they reach an edge of the map. " +
      "Infuse 1: STORMLASH (Free Action) — Choose an edge of the map. Your active tsunamis move 2 spaces in that direction.";
    const BLOCK_ORDER = "terrain effect, collide, infuse 1";

    const fixItem = (item) => {
      if (item.type !== "ability" || (item.name ?? "").trim() !== "Tsunami") return null;
      if (!MARKER.test(item.system?.description ?? "")) return null;
      return { _id: item.id, "system.description": DESCRIPTION, "system.blockOrder": BLOCK_ORDER };
    };

    let n = 0;
    for (const actor of game.actors) {
      const updates = actor.items.map(fixItem).filter(Boolean);
      if (!updates.length) continue;
      await actor.updateEmbeddedDocuments("Item", updates);
      n += updates.length;
      console.log(`ICON 1.5 | Migration 11: Tsunami rewritten on "${actor.name}"`);
    }
    for (const item of game.items) {
      const update = fixItem(item);
      if (!update) continue;
      await item.update({ "system.description": DESCRIPTION, "system.blockOrder": BLOCK_ORDER });
      n++;
    }
    if (n) console.log(`ICON 1.5 | Migration 11: ${n} copy/copies of Tsunami brought to the p.233 text`);
  },

  /* 12 — The halfway XP bonus was granted at every level, including level 0.
   * The book gives it "at level 1 and higher" (p.112), so a character that
   * crossed 7 xp before their first level up was handed an ability point they
   * should not have, and every AP total after that reads one too high.
   * Characters still at level 0 can be corrected: take the point back and
   * clear the flag. Once they have levelled up the flag is reset by the level
   * up itself, so there is no way to tell — those totals stay as they are and
   * the GM can adjust AP Total by hand on the Notes tab. */
  12: async () => {
    let n = 0;
    for (const actor of game.actors) {
      if (actor.type !== "icon") continue;
      const c = actor.system.combat ?? {};
      if ((c.level ?? 0) !== 0) continue;
      if (!(actor.system.narrative?.xp?.halfwayBonusClaimed ?? false)) continue;
      const apTotal = Math.max(0, (c.apTotal ?? 0) - 1);
      await actor.update({
        "system.combat.apTotal": apTotal,
        "system.narrative.xp.halfwayBonusClaimed": false,
      });
      n++;
      console.log(`ICON 1.5 | Migration 12: "${actor.name}" is level 0 — halfway AP taken back (AP total ${c.apTotal ?? 0} → ${apTotal})`);
    }
    if (n) ui.notifications.info(`ICON 1.5 — ${n} level-0 character(s) had the halfway +1 AP removed (it starts at level 1, p.112).`);
  },

  /* 13 — Merged block labels. When two blocks share the same text the sheet
   * prints one line, and the order came from the system's default: "Heroic or
   * Collide" where Battering Ram prints "Collide or Heroic" (p.122), "Exceed
   * or Finishing Blow" where Strafe Shot prints "Finishing blow or Exceed"
   * (p.155). The book's order is per ability, so the pack now pins it in
   * `blockOrder` for the 25 abilities concerned — and the copies on characters
   * need the same. Each entry is [what migration 6 wrote, the corrected
   * value]: a copy holding neither is one someone edited, and is left alone.
   * Blitz also loses the slayEffect that duplicated its own "Slay or Infuse 3"
   * block (p.225). */
  13: async () => {
    /** name → [the value migration 6 wrote (or ""), the corrected one]. */
    const BLOCK_ORDER_FIX = {
      "Apex": ["", "hit, miss, area, sections, finish, charge, heroic, exceed, collide, slay, crit, comeback"],
      "Astral Chain": ["", "hit, miss, area, sections, charge, heroic, finish, exceed, collide, slay, crit, comeback"],
      "Battering Ram": ["", "hit, miss, area, sections, charge, collide, heroic, exceed, slay, crit, finish, comeback"],
      "Blackstar": ["", "hit, miss, area, sections, charge, heroic, comeback, exceed, collide, slay, crit, finish"],
      "Bleak Mercy": ["", "hit, miss, area, sections, charge, slay, heroic, exceed, collide, crit, finish, comeback"],
      "Catapult": ["", "hit, miss, area, sections, charge, collide, heroic, exceed, slay, crit, finish, comeback"],
      "Cavaliere": ["effect, hit, miss, effect, slay", "effect, hit, miss, effect, finish, slay, area, sections, charge, heroic, exceed, collide, crit, comeback"],
      "Circle the Oak": ["effect, hit, miss, effect, charge", "effect, hit, miss, effect, finish, charge, area, sections, heroic, exceed, collide, slay, crit, comeback"],
      "Death": ["area effect, hit, area, slay, finish, special effect", "area effect, hit, area, finish, slay, special effect, miss, sections, charge, heroic, exceed, collide, crit, comeback"],
      "Diablo": ["", "hit, miss, area, sections, charge, heroic, exceed, collide, finish, slay, crit, comeback"],
      "Gigaton Whip": ["hit, miss, effect, collide, heroic", "hit, miss, effect, collide, exceed, heroic, area, sections, charge, slay, crit, finish, comeback"],
      "Great Giorgios": ["", "hit, miss, area, sections, charge, collide, heroic, exceed, slay, crit, finish, comeback"],
      "Gwynt": ["", "hit, miss, area, sections, finish, charge, heroic, exceed, collide, slay, crit, comeback"],
      "Heracule": ["", "hit, miss, area, sections, charge, collide, heroic, exceed, slay, crit, finish, comeback"],
      "Low Blow": ["effect, hit, miss, effect, heroic", "effect, hit, miss, effect, slay, heroic, area, sections, charge, exceed, collide, crit, finish, comeback"],
      "Massive Overhead": ["", "hit, miss, area, sections, charge, comeback, heroic, exceed, collide, slay, crit, finish"],
      "Revenge": ["", "hit, miss, area, sections, charge, slay, heroic, exceed, collide, crit, finish, comeback"],
      "Sidhe": ["", "hit, miss, area, sections, finish, charge, heroic, exceed, collide, slay, crit, comeback"],
      "Soul Shot": ["hit, miss, effect, area, exceed", "hit, miss, effect, area, finish, exceed, sections, charge, heroic, collide, slay, crit, comeback"],
      "Stampede": ["", "hit, miss, area, sections, collide, charge, heroic, exceed, slay, crit, finish, comeback"],
      "Strafe Shot": ["effect, hit, miss, effect, effect, exceed", "effect, hit, miss, effect, effect, finish, exceed, area, sections, charge, heroic, collide, slay, crit, comeback"],
      "Takedown": ["", "hit, miss, area, sections, charge, exceed, heroic, collide, slay, crit, finish, comeback"],
      "Upheaval": ["", "hit, miss, area, sections, charge, comeback, heroic, exceed, collide, slay, crit, finish"],
      "Valiant": ["", "hit, miss, area, sections, charge, collide, heroic, exceed, slay, crit, finish, comeback"],
      "Valkyrie": ["effect, hit, miss, effect, heroic", "effect, hit, miss, effect, exceed, heroic, area, sections, charge, collide, slay, crit, finish, comeback"],
    };

    const fixItem = (item) => {
      if (item.type !== "ability") return null;
      const name = (item.name ?? "").trim();
      const s = item.system ?? {};
      const update = { _id: item.id };
      let touched = false;

      const pair = BLOCK_ORDER_FIX[name];
      if (pair) {
        const [was, now] = pair;
        const cur = String(s.blockOrder ?? "");
        if (cur !== now && (cur === "" || cur === was)) { update["system.blockOrder"] = now; touched = true; }
      }
      if (name === "Blitz" && /GRAN BLITZ/i.test(String(s.slayEffect ?? ""))) {
        update["system.slayEffect"] = "";
        touched = true;
      }
      return touched ? update : null;
    };

    let n = 0;
    for (const actor of game.actors) {
      const updates = actor.items.map(fixItem).filter(Boolean);
      if (!updates.length) continue;
      await actor.updateEmbeddedDocuments("Item", updates);
      n += updates.length;
      console.log(`ICON 1.5 | Migration 13: block layout fixed on ${updates.length} ability(ies) of "${actor.name}"`);
    }
    for (const item of game.items) {
      const update = fixItem(item);
      if (!update) continue;
      const { _id, ...data } = update;
      await item.update(data);
      n++;
    }
    if (n) console.log(`ICON 1.5 | Migration 13: ${n} ability copy/copies brought to the book's block layout`);
  },

  /* 14 — The rest of the misplaced "Summons" boxes and the duplicated trigger
   * blocks, for the copies that live on characters.
   *
   * Four job TRAITS had their job's Summons sidebar glued to the end of them
   * (Shade "Darkside" + shadows, Warden "Beast Master" + beasts, Fool "Cheap
   * Trick" + bombs, Harvester "Gardener of Kin" + thralls/plants): the same
   * extraction fault migration 10 cleaned off Rime and Geyser. The creatures
   * themselves are in the summons pack, so only the stray copy goes.
   *
   * Five abilities also printed a trigger twice, once from its field and once
   * from a sentence in the description (Terraforming, Helix Heel, Aethershard,
   * Blazing Bond — field keeps the book's wording; Nothung — the description
   * keeps the compound "Slay or Infuse 3" label and the field is cleared). */
  14: async () => {
    /** trait name → where its job's Summons box starts. */
    const BOX = {
      "Darkside":        "Many shade abilities summon shadows",
      "Beast Master":    "Many warden abilities summon beasts",
      "Cheap Trick":     "Many fool abilities summon bombs",
      "Gardener of Kin": "Many harvester abilities summon thralls",
    };
    /** ability name → [field, the book's text, the sentence to drop] ("" = clear the field). */
    const DUPES = {
      "Terraforming": ["system.chargeEffect",   "Choose four effects.",               "Charge: Choose four effects."],
      "Helix Heel":   ["system.chargeEffect",   "Shatter any foe damaged by this ability.", "Charge: Shatter any foe damaged by this ability."],
      "Aethershard":  ["system.comebackEffect", "Reduce sacrifice to 1.",             "Comeback: Reduce sacrifice to 1."],
      "Blazing Bond": ["system.comebackEffect", "Reduce partner sacrifice to 1.",     "Comeback: Reduce partner sacrifice to 1."],
      "Nothung":      ["system.slayEffect",     "",                                   ""],
    };

    const fixItem = (item) => {
      const name = (item.name ?? "").trim();
      const s = item.system ?? {};

      if (item.type === "trait" && BOX[name]) {
        const desc = String(s.description ?? "");
        const i = desc.indexOf(BOX[name]);
        if (i < 0) return null;
        return { _id: item.id, "system.description": desc.slice(0, i).replace(/\s{2,}/g, " ").trim() };
      }

      if (item.type === "ability" && DUPES[name]) {
        const [field, text, sentence] = DUPES[name];
        const update = { _id: item.id };
        let touched = false;
        const key = field.replace(/^system\./, "");
        if (text === "") {
          if (String(s[key] ?? "").trim()) { update[field] = ""; touched = true; }
        } else if (s[key] !== text && String(s[key] ?? "").trim()) {
          update[field] = text; touched = true;
        }
        const desc = String(s.description ?? "");
        if (sentence && desc.includes(sentence)) {
          update["system.description"] = desc.replace(sentence, "").replace(/\s{2,}/g, " ").trim();
          touched = true;
        }
        return touched ? update : null;
      }
      return null;
    };

    let n = 0;
    for (const actor of game.actors) {
      const updates = actor.items.map(fixItem).filter(Boolean);
      if (!updates.length) continue;
      await actor.updateEmbeddedDocuments("Item", updates);
      n += updates.length;
      console.log(`ICON 1.5 | Migration 14: ${updates.length} trait(s)/ability(ies) cleaned on "${actor.name}"`);
    }
    for (const item of game.items) {
      const update = fixItem(item);
      if (!update) continue;
      const { _id, ...data } = update;
      await item.update(data);
      n++;
    }
    if (n) console.log(`ICON 1.5 | Migration 14: ${n} copy/copies cleaned (Summons boxes, duplicated triggers)`);
  },

  /* 15 — The other half of migration 12. The halfway XP bonus used to be
   * granted at level 0 too, which the book does not do ("At level 1 and
   * higher, once you hit 7 xp, you gain an ability point", p.112, repeated in
   * the advancement rules on p.240). Migration 12 could only give that point
   * back to characters still sitting at level 0, because a level up clears
   * `halfwayBonusClaimed` and with it the only trace of the mistake. Everyone
   * who had already levelled kept an ability point they never earned, which is
   * the "every level except 0 is one too high" Edoardo is still seeing.
   *
   * The trace is gone, but the right number is not: a character's AP total is
   * the sum of things this system granted, so it can be rebuilt.
   *   2   the pair the character creation wizard hands out for the two
   *       starting abilities (p.241: level 0 picks a job and two abilities —
   *       the system charges 1 AP per known ability, so it pre-pays them)
   *   +   the table on p.241, via LEVEL_BENEFITS: +2 at level 1, +1 at 5, +1 at 11
   *   +   2 per extra job, i.e. each level 4 / 8 fork where the player took
   *       "new job and two bonus ap" instead of the mastery point — the job
   *       is in `system.combat.jobs`, so it counts itself
   *   +   one halfway point per level already completed (levels 1..L-1), plus
   *       the current level's if it has been claimed
   * A character carrying exactly one more than that has the phantom point and
   * loses it. Anything else — a GM who already corrected the sheet by hand
   * after migration 12 said to, a hand-built character, AP given as a reward,
   * a level set by hand rather than earned — does not match, and is left
   * alone and reported in the console rather than guessed at. Being wrong in
   * the safe direction matters more here than catching every case. */
  15: async () => {
    let fixed = 0;
    const skipped = [];
    for (const actor of game.actors) {
      if (actor.type !== "icon") continue;
      const c = actor.system.combat ?? {};
      const level = c.level ?? 0;
      if (level < 1) continue;                          // migration 12's job
      const apTotal  = c.apTotal ?? 0;
      const expected = expectedApTotal(actor);
      if (apTotal === expected + 1) {
        await actor.update({ "system.combat.apTotal": apTotal - 1 });
        fixed++;
        console.log(`ICON 1.5 | Migration 15: "${actor.name}" (level ${level}) — halfway AP of level 0 taken back (AP total ${apTotal} → ${apTotal - 1})`);
      } else if (apTotal !== expected) {
        skipped.push(`${actor.name} (level ${level}): AP total ${apTotal}, expected ${expected}`);
      }
    }
    if (fixed) ui.notifications.info(`ICON 1.5 — ${fixed} character(s) gave back the level-0 halfway AP (it starts at level 1, p.112).`);
    if (skipped.length) {
      console.warn(`ICON 1.5 | Migration 15: ${skipped.length} character(s) left alone — their AP total does not match what the system granted, so check the Notes tab by hand:\n  ${skipped.join("\n  ")}`);
      ui.notifications.warn(`ICON 1.5 — ${skipped.length} character(s) have an AP total the system cannot account for and were left untouched: see the console (F12) and check AP Total on their Notes tab.`);
    }
  },

  /* 16 — Skill Ranks stuck at "OVER".
   *
   * The Skill Rank counter compares the dots on the ten narrative actions
   * against `system.combat.skillRanksTotal` plus the six of character creation
   * (the bond's +2 and the 4 to spread, p.46). But that field is a running
   * total that only LevelUpDialog ever adds to, so it reflects the level ups
   * taken *inside this system* rather than the character's level. A sheet that
   * arrived any other way — imported from another world, built by hand before
   * the wizard existed, or a level typed straight into the field — is stuck at
   * whatever it was when it arrived, usually zero, and reads "⚠ OVER" for ever
   * no matter how few dots the player actually spends.
   *
   * The advancement table (p.241) says how many improvements a level is worth,
   * and expectedSkillRanksFromLevels() reads the level 4 / 8 "bond power or
   * two actions" fork off the bond powers on the sheet. Raise the field to
   * that; never lower it, because a GM may have granted dots on purpose and a
   * fork read the cautious way costs the player nothing. */
  16: async () => {
    let n = 0;
    const generous = [];
    for (const actor of game.actors) {
      if (actor.type !== "icon") continue;
      const stored = actor.system.combat?.skillRanksTotal ?? 0;
      const earned = expectedSkillRanksFromLevels(actor);
      if (stored < earned) {
        await actor.update({ "system.combat.skillRanksTotal": earned });
        n++;
        console.log(`ICON 1.5 | Migration 16: "${actor.name}" (level ${actor.system.combat?.level ?? 0}) — Skill Ranks from level ups ${stored} → ${earned} (pool ${STARTING_ACTION_DOTS + earned} with the ${STARTING_ACTION_DOTS} from creation)`);
      } else if (stored > earned) {
        generous.push(`${actor.name} (level ${actor.system.combat?.level ?? 0}): field ${stored}, table grants ${earned}`);
      }
    }
    if (n) ui.notifications.info(`ICON 1.5 — ${n} character(s) had their Skill Rank pool brought up to their level (p.241).`);
    if (generous.length) {
      console.log(`ICON 1.5 | Migration 16: ${generous.length} character(s) hold more Skill Ranks than the table grants and were left as they are:\n  ${generous.join("\n  ")}`);
    }
  },
};

/** Register the world-scoped schema version setting. Call from the init hook. */
export function registerMigrationSettings() {
  game.settings.register(SYSTEM_ID, SETTING, {
    name:    "Schema version",
    scope:   "world",
    config:  false,
    type:    Number,
    default: 0,
  });
  game.settings.register(SYSTEM_ID, MACRO_SETTING, {
    name:    "Macros synced from system version",
    scope:   "world",
    config:  false,
    type:    String,
    default: "",
  });
}

/**
 * Re-copy the system macros into the world.
 *
 * Dragging a macro out of the compendium makes an independent copy: it keeps
 * the code it had that day forever. Maar's world still had the very first
 * build's "Award Session XP", which is why one XP card said "LEVEL UP
 * DISPONIBILE" (Italian, v1.0.0) and the next one "LEVEL UP AVAILABLE" — two
 * copies of the same macro, one stale.
 *
 * Runs once per system version, on the GM's client. Only macros that came
 * from our compendium are touched (Foundry records the source on import); a
 * macro someone wrote themselves is left alone even if it shares the name.
 */
export async function syncWorldMacros() {
  if (!game.user.isGM) return;
  const done = game.settings.get(SYSTEM_ID, MACRO_SETTING) ?? "";
  const version = game.system.version ?? "";
  if (done === version) return;

  const pack = game.packs.get("icon-system.macros");
  if (!pack) return;
  const source = new Map((await pack.getDocuments()).map(d => [d.name, d]));

  let updated = 0;
  for (const macro of game.macros) {
    const from = macro._stats?.compendiumSource ?? macro.getFlag("core", "sourceId") ?? "";
    const src  = source.get(macro.name);
    if (!src) continue;
    // Copies made by older builds may have lost the import source, so a macro
    // that carries our own markers in its code counts as ours too.
    const fromOurPack = String(from).startsWith("Compendium.icon-system.macros")
                     || /icon-macro-|game\.icon\.|systems\/icon-system\//.test(macro.command ?? "");
    if (!fromOurPack) continue;
    if (macro.type !== src.type || (macro.command ?? "") === (src.command ?? "")) continue;
    await macro.update({ command: src.command, img: src.img ?? macro.img });
    updated++;
    console.log(`ICON 1.5 | Macro sync: "${macro.name}" updated from the compendium`);
  }
  if (updated) ui.notifications.info(`ICON 1.5 — ${updated} macro(s) updated to the version shipped with the system.`);
  await game.settings.set(SYSTEM_ID, MACRO_SETTING, version);
}

/**
 * Run any pending migrations. Call from the ready hook — GM client only
 * (players lack permission to update other users' actors).
 */
export async function runMigrations() {
  if (!game.user.isGM) return;

  const stored = game.settings.get(SYSTEM_ID, SETTING) ?? 0;
  if (stored >= CURRENT_SCHEMA_VERSION) return;

  /* A brand-new world (no system documents yet) has nothing to migrate —
   * just stamp it with the current version. */
  const hasDocuments = game.actors.size > 0 || game.items.size > 0;
  if (stored === 0 && !hasDocuments) {
    await game.settings.set(SYSTEM_ID, SETTING, CURRENT_SCHEMA_VERSION);
    return;
  }

  ui.notifications.info(`ICON 1.5 — migrating world data (schema ${stored} → ${CURRENT_SCHEMA_VERSION})… don't close the world.`);
  console.log(`ICON 1.5 | Migrating world data: schema ${stored} → ${CURRENT_SCHEMA_VERSION}`);

  for (let v = stored + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) {
      await game.settings.set(SYSTEM_ID, SETTING, v);
      continue;
    }
    try {
      await step();
      await game.settings.set(SYSTEM_ID, SETTING, v);
      console.log(`ICON 1.5 | Migration to schema ${v} complete`);
    } catch (err) {
      console.error(`ICON 1.5 | Migration to schema ${v} FAILED — stopping. World is still at schema ${v - 1}.`, err);
      ui.notifications.error(`ICON 1.5 — data migration to schema ${v} failed. Check the console (F12) and report the error before continuing to play.`, { permanent: true });
      return;
    }
  }

  ui.notifications.info("ICON 1.5 — world data migration complete.");
}

/* ================================================== */
/*  Sweep helpers                                      */
/* ================================================== */

/**
 * Apply per-document update functions to every world actor, world item, and
 * every document inside unlocked world-scoped compendia of the matching type.
 *
 * Each mapper receives a document and returns an update object (falsy = skip).
 * Embedded items on actors are passed to the `item` mapper too.
 *
 * @param {object}   mappers
 * @param {Function} [mappers.actor]  (actor) => updateData | null
 * @param {Function} [mappers.item]   (item)  => updateData | null
 */
export async function migrateWorldDocuments({ actor: actorFn, item: itemFn } = {}) {
  /* --- World actors (and their embedded items) --- */
  for (const actor of game.actors) {
    await migrateSingleActor(actor, actorFn, itemFn);
  }

  /* --- World items --- */
  if (itemFn) {
    for (const item of game.items) {
      const update = itemFn(item);
      if (update) await item.update(update);
    }
  }

  /* --- World compendia (GM-created packs; skip locked and system packs) --- */
  for (const pack of game.packs) {
    if (pack.metadata.packageType !== "world" || pack.locked) continue;
    if (pack.documentName === "Actor" && actorFn) {
      const docs = await pack.getDocuments();
      for (const doc of docs) await migrateSingleActor(doc, actorFn, itemFn);
    } else if (pack.documentName === "Item" && itemFn) {
      const docs = await pack.getDocuments();
      for (const doc of docs) {
        const update = itemFn(doc);
        if (update) await doc.update(update);
      }
    }
  }
}

async function migrateSingleActor(actor, actorFn, itemFn) {
  if (actorFn) {
    const update = actorFn(actor);
    if (update) await actor.update(update);
  }
  if (itemFn) {
    const itemUpdates = [];
    for (const item of actor.items) {
      const update = itemFn(item);
      if (update) itemUpdates.push({ _id: item.id, ...update });
    }
    if (itemUpdates.length) await actor.updateEmbeddedDocuments("Item", itemUpdates);
  }
}
