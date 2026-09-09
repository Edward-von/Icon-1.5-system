/**
 * EncounterDesigner — GM tool to build a balanced ICON 1.5 encounter.
 *
 * Rules (ICON 1.5 p.292 "Making foes and balancing encounters"):
 *   • Budget = number of players + 1 points.
 *   • A mob is worth 1, a regular foe 1, an elite 2, a Legend the entire budget.
 *   • Balance up/down by adding or removing 1–2 points.
 *   • Reserves: extra 2–3 points that enter at the end of round 2 or 3 and act
 *     from the following round.
 *   • "One fight balance rule": points = 2 × players; normal budget on the map,
 *     half the reserves at the end of round 2, the rest at the end of round 3.
 *   • Elite template (p.299): 2 turns, double HP, costs 2 points. Stacks with
 *     other templates; foes that are already Elite (Jotunn, p.448) stay Elite.
 *   • Mobs (p.298): 2 members per player, 2 hits per member.
 *   • Legends (p.298): 50 HP per player (minimum 100) → baseline × players / 2.
 *
 * The designer is a singleton ApplicationV2 with five Handlebars parts, so the
 * roster (400 rows, filtered client-side) is not re-rendered when the party or
 * the picks change. State lives on `this.enc` (not `this.state`: ApplicationV2 reserves that name for its render state); the templates only display it.
 *
 * Output: a whispered chat card (budget breakdown), world actors in an
 * "Encounter: <name>" folder, or a full deploy (actors + tokens on the current
 * scene + combatants). Reserves are placed as hidden tokens and are NOT added to
 * the combat; the chat card has a "Reveal reserves" button for that moment.
 */
import { FOE_CLASS_LABELS } from "../data/actor/FoeData.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const _log = (...a) => console.debug("[ICON | EncounterDesigner]", ...a);

const FOES_PACK    = "icon-system.foes";
const LEGENDS_PACK = "icon-system.foes-legend";
const DRAFTS_SETTING = "encounterDrafts";
const TPL = "systems/icon-system/templates/apps/encounter/";

/** Extra index fields we need from the actor packs (beyond name/img/folder). */
const INDEX_FIELDS = [
  "system.foeClass", "system.isElite", "system.faction", "system.chapter",
  "system.size", "system.hp", "system.traits", "system.phases",
];

/** Faction order used for the filter dropdown (book order, p.314+). */
const FACTION_ORDER = [
  "Basic Jobs", "Elite Foes", "Basic Legends", "Folk", "Relict", "Ruin Beast", "Scavenger",
  "Imperial", "Demon", "Lowlander", "Jotunn", "Hob",
];

/** Elite template trait text (p.299) added to foes upgraded by the designer. */
const ELITE_TRAIT = {
  name: "Elite",
  description: "<p>This foe takes 2 turns. Double HP for the foe. (Elite template, ICON 1.5 p.299 — costs 2 points in the encounter budget.)</p>",
};

/* -------------------------------------------------- */
/*  Budget maths (pure functions, also used by tests)  */
/* -------------------------------------------------- */

/** Points a pick costs. Legends are worth the whole budget (p.292). */
export function pickCost(pick, budget) {
  if (pick.type === "legend") return Math.max(budget, 1);
  const each = pick.cls === "mob" ? 1 : (pick.elite ? 2 : 1);
  return each * (pick.qty ?? 1);
}

/** Turns per round a pick takes (p.298-299). */
export function pickTurns(pick, players) {
  if (pick.type === "legend") return Math.max(players, 2);
  const each = pick.cls === "mob" ? 1 : (pick.elite ? 2 : 1);
  return each * (pick.qty ?? 1);
}

/** Base budget for a party (p.292). */
export function baseBudget(players, oneFight) {
  if (players <= 0) return 0;
  return oneFight ? players * 2 : players + 1;
}

/* -------------------------------------------------- */
/*  Application                                        */
/* -------------------------------------------------- */

export class EncounterDesigner extends HandlebarsApplicationMixin(ApplicationV2) {

  static #instance = null;

  /** Open (or focus) the singleton. GM only. */
  static open() {
    if (!game.user.isGM) {
      ui.notifications.warn("The Encounter Designer is a GM tool.");
      return null;
    }
    const app = (EncounterDesigner.#instance ??= new EncounterDesigner());
    if (app.rendered) { app.bringToFront(); if (app.minimized) app.maximize(); }
    else app.render({ force: true });
    return app;
  }

  constructor(options = {}) {
    super(options);
    this.enc = EncounterDesigner.#defaultState();
    this._roster = null;      // [{uuid,name,type,cls,clsLabel,faction,chapter,isElite,size,hpMax,traits,img,src}]
    this._pcs    = null;      // [{id,name,img,level,chapter,cls}]
    this._busy   = false;     // true while creating actors / deploying
  }

  static #defaultState() {
    return {
      name:       "",
      partyIds:   null,          // null → initialise from the scene on first prepare
      oneFight:   false,
      adjust:     0,
      chapterCap: 0,             // 0 = auto (highest chapter in the party)
      filters:    { search: "", faction: "", cls: "", src: "pack", allChapters: false },
      picks:      [],
      addParty:   true,          // deploy: add the party's scene tokens to the combat
    };
  }

  static DEFAULT_OPTIONS = {
    id: "icon-encounter-designer",
    classes: ["icon", "encounter-designer"],
    position: { width: 940, height: 800 },
    window: {
      title:     "Encounter Designer",
      icon:      "fa-solid fa-chess-knight",
      resizable: true,
    },
    actions: {
      togglePc:       EncounterDesigner.#onTogglePc,
      partyAll:       EncounterDesigner.#onPartyAll,
      partyScene:     EncounterDesigner.#onPartyScene,
      adjust:         EncounterDesigner.#onAdjust,
      addPick:        EncounterDesigner.#onAddPick,
      incPick:        EncounterDesigner.#onIncPick,
      decPick:        EncounterDesigner.#onDecPick,
      removePick:     EncounterDesigner.#onRemovePick,
      toggleElite:    EncounterDesigner.#onToggleElite,
      randomFill:     EncounterDesigner.#onRandomFill,
      clearPicks:     EncounterDesigner.#onClearPicks,
      clearFilters:   EncounterDesigner.#onClearFilters,
      reloadRoster:   EncounterDesigner.#onReloadRoster,
      openSource:     EncounterDesigner.#onOpenSource,
      postChat:       EncounterDesigner.#onPostChat,
      createActors:   EncounterDesigner.#onCreateActors,
      deploy:         EncounterDesigner.#onDeploy,
      saveDraft:      EncounterDesigner.#onSaveDraft,
      loadDraft:      EncounterDesigner.#onLoadDraft,
      deleteDraft:    EncounterDesigner.#onDeleteDraft,
      newEncounter:   EncounterDesigner.#onNewEncounter,
    },
  };

  static PARTS = {
    hero:      { template: `${TPL}hero.hbs` },
    party:     { template: `${TPL}party.hbs` },
    roster:    { template: `${TPL}roster.hbs` },
    encounter: { template: `${TPL}encounter.hbs` },
    footer:    { template: `${TPL}footer.hbs` },
  };

  /* -------------------------------------------------- */
  /*  Data loading                                       */
  /* -------------------------------------------------- */

  /** Load the roster (pack indexes + world foes/legends). Cached per app instance. */
  async _loadRoster(force = false) {
    if (this._roster && !force) return this._roster;
    const out = [];

    for (const [packId, type] of [[FOES_PACK, "foe"], [LEGENDS_PACK, "legend"]]) {
      const pack = game.packs.get(packId);
      if (!pack) { console.warn(`ICON 1.5 | Encounter Designer: pack ${packId} not found`); continue; }
      let index;
      try { index = await pack.getIndex({ fields: INDEX_FIELDS }); }
      catch (err) { console.error(`ICON 1.5 | Encounter Designer: index of ${packId} failed`, err); continue; }
      const folderName = id => pack.folders?.get(id)?.name ?? "";
      for (const e of index) {
        if (e.type !== type) continue;
        out.push(this.#rosterEntry(e, type, "pack", e.uuid ?? `Compendium.${pack.collection}.Actor.${e._id}`, folderName(e.folder)));
      }
    }

    for (const a of game.actors) {
      if (a.type !== "foe" && a.type !== "legend") continue;
      // Skip actors the designer itself created (they live in "Encounter:" folders).
      if (a.getFlag("icon-system", "encounter")) continue;
      out.push(this.#rosterEntry(a, a.type, "world", a.uuid, a.folder?.name ?? ""));
    }

    out.sort((a, b) => a.name.localeCompare(b.name));
    this._roster = out;
    _log(`roster loaded: ${out.length} entries (${out.filter(r => r.src === "pack").length} pack, ${out.filter(r => r.src === "world").length} world)`);
    return out;
  }

  /** Normalise an index entry or a world actor into a roster row. */
  #rosterEntry(e, type, src, uuid, folderName) {
    const sys = e.system ?? {};
    const cls = type === "legend" ? "legend" : (sys.foeClass ?? "heavy");
    const faction = sys.faction || folderName || (type === "legend" ? "Legends" : "Unknown");
    const traits = (sys.traits ?? []).map(t => t.name).filter(Boolean);
    return {
      uuid, type, src, cls,
      key:      uuid,
      name:     e.name,
      img:      e.img ?? "icons/svg/mystery-man.svg",
      clsLabel: type === "legend" ? "Legend" : (FOE_CLASS_LABELS[cls] ?? cls),
      faction,
      chapter:  Number(sys.chapter ?? 1) || 1,
      isElite:  type === "legend" ? false : !!sys.isElite,
      size:     Number(sys.size ?? 1) || 1,
      hpMax:    Number(sys.hp?.max ?? 0) || 0,
      traits,
      traitsText: traits.join(", "),
      costLabel: type === "legend" ? "all" : (sys.isElite ? "2" : "1"),
      searchText: [e.name, faction, type === "legend" ? "Legend" : (FOE_CLASS_LABELS[cls] ?? cls), ...traits].join(" ").toLowerCase(),
      phases:   type === "legend" ? (sys.phases?.length ?? 0) : 0,
    };
  }

  /** PCs of the world with the info shown in the party step. */
  _loadPcs() {
    this._pcs = game.actors.filter(a => a.type === "icon").map(a => {
      const c = a.system.combat ?? {};
      const primary = (c.jobs ?? []).find(j => j.primary) ?? (c.jobs ?? [])[0];
      return {
        id: a.id, name: a.name, img: a.img,
        level: c.level ?? 0, chapter: c.chapter ?? 1,
        cls: primary?.class ?? "", job: primary?.name ?? "",
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
    return this._pcs;
  }

  /** Ids of the PCs that have a token on the current scene. */
  #scenePcIds() {
    const scene = canvas?.scene ?? game.scenes?.active;
    const ids = new Set();
    for (const t of scene?.tokens ?? []) if (t.actor?.type === "icon") ids.add(t.actor.id);
    return ids;
  }

  /* -------------------------------------------------- */
  /*  Derived values                                     */
  /* -------------------------------------------------- */

  get players() { return this.enc.partyIds?.size ?? 0; }

  /** Highest chapter among the selected PCs (min 1), or the manual cap. */
  get chapterCap() {
    if (this.enc.chapterCap) return this.enc.chapterCap;
    let cap = 1;
    for (const pc of this._pcs ?? []) if (this.enc.partyIds?.has(pc.id)) cap = Math.max(cap, pc.chapter ?? 1);
    return cap;
  }

  get budget() { return Math.max(0, baseBudget(this.players, this.enc.oneFight) + this.enc.adjust); }

  /** Totals for the current picks. */
  get totals() {
    const budget = this.budget;
    let spent = 0, onMap = 0, reserve = 0, npcTurns = 0, bodies = 0;
    for (const p of this.enc.picks) {
      const cost = pickCost(p, budget);
      spent += cost;
      if (p.reserve) reserve += cost; else onMap += cost;
      npcTurns += pickTurns(p, this.players);
      bodies += p.type === "legend" ? 1 : p.qty;
    }
    return { budget, spent, onMap, reserve, remaining: budget - spent, npcTurns, pcTurns: this.players, bodies,
             over: spent > budget, overBy: Math.max(0, spent - budget), full: spent === budget && budget > 0 };
  }

  /* -------------------------------------------------- */
  /*  Context                                            */
  /* -------------------------------------------------- */

  async _prepareContext(options) {
    await this._loadRoster();
    this._loadPcs();
    if (this.enc.partyIds === null) {
      const onScene = this.#scenePcIds();
      this.enc.partyIds = onScene.size ? onScene : new Set(this._pcs.map(p => p.id));
    }
    // Drop PCs that no longer exist.
    for (const id of [...this.enc.partyIds]) if (!this._pcs.some(p => p.id === id)) this.enc.partyIds.delete(id);

    const totals = this.totals;
    const cap    = this.chapterCap;
    const budget = totals.budget;

    const factions = [...new Set(this._roster.map(r => r.faction))]
      .sort((a, b) => {
        const ia = FACTION_ORDER.indexOf(a), ib = FACTION_ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
      });
    const worldCount = this._roster.filter(r => r.src === "world").length;

    const picks = this.enc.picks.map(p => {
      const cost  = pickCost(p, budget);
      const turns = pickTurns(p, this.players);
      const isMob = p.cls === "mob";
      return {
        ...p, cost, turns, isMob,
        isLegend:   p.type === "legend",
        eliteLocked: p.baseElite || isMob || p.type === "legend",
        hpShown:    p.type === "legend"
          ? Math.round((p.hpMax || 100) * Math.max(this.players, 2) / 2)
          : (p.elite && !p.baseElite ? p.hpMax * 2 : p.hpMax),
        mobMembers: isMob ? Math.max(this.players, 1) * 2 : 0,
        reserveLabel: p.reserve ? `Reserve · end of round ${p.reserve}` : "",
      };
    });

    const drafts = Object.keys(game.settings.get("icon-system", DRAFTS_SETTING) ?? {}).sort();

    return {
      state:    this.enc,
      name:     this.enc.name,
      players:  this.players,
      budget,
      base:     baseBudget(this.players, this.enc.oneFight),
      totals,
      cap,
      capAuto:  !this.enc.chapterCap,
      pcs:      this._pcs.map(pc => ({ ...pc, selected: this.enc.partyIds.has(pc.id) })),
      roster:   this._roster,
      rosterCount: this._roster.length,
      worldCount,
      factions,
      classes:  [
        { value: "heavy", label: "Heavy" }, { value: "skirmisher", label: "Skirmisher" },
        { value: "leader", label: "Leader" }, { value: "artillery", label: "Artillery" },
        { value: "mob", label: "Mob" }, { value: "legend", label: "Legend" },
      ],
      filters:  this.enc.filters,
      picks,
      hasPicks: picks.length > 0,
      hasLegend: picks.some(p => p.isLegend),
      drafts,
      hasDrafts: drafts.length > 0,
      busy:     this._busy,
      canDeploy: !!canvas?.scene && picks.length > 0 && !this._busy,
      sceneName: canvas?.scene?.name ?? "",
      addParty: this.enc.addParty,
    };
  }

  /* -------------------------------------------------- */
  /*  Rendering / listeners                              */
  /* -------------------------------------------------- */

  /** Re-render only the parts that depend on the party / picks. */
  #refresh(parts = ["hero", "party", "encounter", "footer"]) {
    return this.render({ parts });
  }

  _attachPartListeners(partId, element, options) {
    super._attachPartListeners(partId, element, options);
    switch (partId) {
      case "party":     this.#bindParty(element);     break;
      case "roster":    this.#bindRoster(element);    break;
      case "encounter": this.#bindEncounter(element); break;
      case "footer":    this.#bindFooter(element);    break;
    }
  }

  #bindParty(el) {
    el.addEventListener("change", ev => {
      const t = ev.target;
      if (t.name === "oneFight") { this.enc.oneFight = !!t.checked; this.#refresh(); }
      else if (t.name === "chapterCap") {
        this.enc.chapterCap = Number(t.value) || 0;
        this.#refresh(["hero", "party", "encounter", "footer"]);
        this.#applyRosterFilter();
      }
    });
  }

  #bindRoster(el) {
    const search = el.querySelector('[name="search"]');
    search?.addEventListener("input", () => {
      this.enc.filters.search = search.value;
      this.#applyRosterFilter();
    });
    el.addEventListener("change", ev => {
      const t = ev.target;
      if (t.name === "faction")     this.enc.filters.faction = t.value;
      else if (t.name === "cls")    this.enc.filters.cls = t.value;
      else if (t.name === "src")    this.enc.filters.src = t.value;
      else if (t.name === "allChapters") this.enc.filters.allChapters = !!t.checked;
      else return;
      this.#applyRosterFilter();
    });
    // Double-click on a row adds it too.
    el.addEventListener("dblclick", ev => {
      const row = ev.target.closest("[data-key]");
      if (row && !ev.target.closest("button")) this.#addPick(row.dataset.key);
    });
    this.#applyRosterFilter(el);
  }

  #bindEncounter(el) {
    el.addEventListener("change", ev => {
      const t = ev.target;
      const row = t.closest("[data-index]");
      if (!row) return;
      const pick = this.enc.picks[Number(row.dataset.index)];
      if (!pick) return;
      if (t.name === "reserve") { pick.reserve = Number(t.value) || 0; this.#refresh(["hero", "encounter", "footer"]); }
      else if (t.name === "qty") {
        pick.qty = Math.max(1, Math.min(20, Number(t.value) || 1));
        this.#refresh(["hero", "encounter", "footer"]);
      }
    });
  }

  #bindFooter(el) {
    const name = el.querySelector('[name="encounterName"]');
    name?.addEventListener("input", () => {
      this.enc.name = name.value;
      const title = this.element?.querySelector('[data-role="hero-title"]');
      if (title) title.textContent = name.value.trim() || "New encounter";
    });
    el.addEventListener("change", ev => {
      if (ev.target.name === "addParty") this.enc.addParty = !!ev.target.checked;
    });
  }

  /**
   * Client-side roster filter: toggles `hidden` on the rows and updates the
   * "shown" counter. Runs on every filter change without a re-render, so the
   * search box keeps focus and the list keeps its scroll position.
   */
  #applyRosterFilter(root) {
    const el = root ?? this.element?.querySelector('[data-application-part="roster"]');
    if (!el) return;
    const f = this.enc.filters;
    const q = f.search.trim().toLowerCase();
    const cap = this.chapterCap;
    let shown = 0;
    for (const row of el.querySelectorAll("[data-key]")) {
      const d = row.dataset;
      let ok = true;
      if (f.src !== "all" && d.src !== f.src) ok = false;
      if (ok && f.faction && d.faction !== f.faction) ok = false;
      if (ok && f.cls && d.cls !== f.cls) ok = false;
      if (ok && !f.allChapters && Number(d.chapter) > cap) ok = false;
      if (ok && q && !(d.search ?? "").includes(q)) ok = false;
      row.hidden = !ok;
      if (ok) shown++;
    }
    const counter = el.querySelector('[data-role="roster-count"]');
    if (counter) counter.textContent = `${shown} shown`;
    const empty = el.querySelector('[data-role="roster-empty"]');
    if (empty) empty.hidden = shown > 0;
  }

  /** Rows currently visible in the roster (used by Random fill). */
  #visibleRosterEntries() {
    const el = this.element?.querySelector('[data-application-part="roster"]');
    const keys = new Set([...(el?.querySelectorAll("[data-key]:not([hidden])") ?? [])].map(r => r.dataset.key));
    return this._roster.filter(r => keys.has(r.key));
  }

  /* -------------------------------------------------- */
  /*  Pick helpers                                       */
  /* -------------------------------------------------- */

  #addPick(key, { silent = false } = {}) {
    const entry = this._roster?.find(r => r.key === key);
    if (!entry) return;
    if (entry.type === "legend" && this.enc.picks.some(p => p.type === "legend")) {
      ui.notifications.warn("One Legend is already worth the whole budget (p.292).");
      return;
    }
    const existing = this.enc.picks.find(p => p.key === key && !p.reserve);
    if (existing && entry.type !== "legend") existing.qty = Math.min(20, existing.qty + 1);
    else {
      this.enc.picks.push({
        key, uuid: entry.uuid, name: entry.name, type: entry.type, cls: entry.cls, clsLabel: entry.clsLabel,
        faction: entry.faction, chapter: entry.chapter, size: entry.size, hpMax: entry.hpMax, img: entry.img,
        src: entry.src, baseElite: entry.isElite, elite: entry.isElite, qty: 1, reserve: 0,
      });
    }
    if (!silent) this.#refresh(["hero", "encounter", "footer"]);
  }

  #pickFromTarget(target) {
    const row = target.closest("[data-index]");
    const i = Number(row?.dataset.index);
    return Number.isInteger(i) ? { i, pick: this.enc.picks[i] } : { i: -1, pick: null };
  }

  /* -------------------------------------------------- */
  /*  Actions                                           */
  /* -------------------------------------------------- */

  static #onTogglePc(event, target) {
    const id = target.dataset.pcId;
    if (!id) return;
    if (this.enc.partyIds.has(id)) this.enc.partyIds.delete(id); else this.enc.partyIds.add(id);
    this.#refresh();
    this.#applyRosterFilter();
  }

  static #onPartyAll() {
    this.enc.partyIds = new Set((this._pcs ?? []).map(p => p.id));
    this.#refresh(); this.#applyRosterFilter();
  }

  static #onPartyScene() {
    const ids = this.#scenePcIds();
    if (!ids.size) { ui.notifications.info("No PC tokens on the current scene."); return; }
    this.enc.partyIds = ids;
    this.#refresh(); this.#applyRosterFilter();
  }

  static #onAdjust(event, target) {
    const d = Number(target.dataset.delta) || 0;
    this.enc.adjust = Math.max(-5, Math.min(10, this.enc.adjust + d));
    this.#refresh();
  }

  static #onAddPick(event, target) {
    const key = target.closest("[data-key]")?.dataset.key;
    if (key) this.#addPick(key);
  }

  static #onIncPick(event, target) {
    const { pick } = this.#pickFromTarget(target);
    if (!pick || pick.type === "legend") return;
    pick.qty = Math.min(20, pick.qty + 1);
    this.#refresh(["hero", "encounter", "footer"]);
  }

  static #onDecPick(event, target) {
    const { i, pick } = this.#pickFromTarget(target);
    if (!pick) return;
    if (pick.qty <= 1 || pick.type === "legend") this.enc.picks.splice(i, 1);
    else pick.qty -= 1;
    this.#refresh(["hero", "encounter", "footer"]);
  }

  static #onRemovePick(event, target) {
    const { i } = this.#pickFromTarget(target);
    if (i >= 0) this.enc.picks.splice(i, 1);
    this.#refresh(["hero", "encounter", "footer"]);
  }

  static #onToggleElite(event, target) {
    const { pick } = this.#pickFromTarget(target);
    if (!pick || pick.baseElite || pick.cls === "mob" || pick.type === "legend") return;
    pick.elite = !pick.elite;
    this.#refresh(["hero", "encounter", "footer"]);
  }

  /**
   * Fill the remaining points with random foes from the rows currently shown
   * in the roster (so the GM filters by faction first, then rolls). Legends
   * are skipped; elites are only drawn while 2+ points remain.
   */
  static #onRandomFill() {
    let remaining = this.totals.remaining;
    if (remaining <= 0) { ui.notifications.info("The budget is already spent — remove something or add points."); return; }
    const pool = this.#visibleRosterEntries().filter(r => r.type !== "legend");
    if (!pool.length) { ui.notifications.warn("No foes match the current roster filters."); return; }
    let guard = 50, added = 0;
    while (remaining > 0 && guard-- > 0) {
      const candidates = pool.filter(r => (r.isElite ? 2 : 1) <= remaining);
      if (!candidates.length) break;
      const entry = candidates[Math.floor(Math.random() * candidates.length)];
      this.#addPick(entry.key, { silent: true });
      remaining -= entry.isElite ? 2 : 1;
      added++;
    }
    _log(`random fill: +${added} foes`);
    this.#refresh(["hero", "encounter", "footer"]);
  }

  static #onClearPicks() {
    this.enc.picks = [];
    this.#refresh(["hero", "encounter", "footer"]);
  }

  static async #onClearFilters() {
    this.enc.filters = { search: "", faction: "", cls: "", src: "pack", allChapters: false };
    await this.render({ parts: ["roster"] });
    // AppV2 restores the focused input's value across the re-render: blank the
    // search box explicitly so the field matches the (cleared) filter.
    const search = this.element?.querySelector('input[name="search"]');
    if (search) search.value = "";
  }

  static async #onReloadRoster() {
    await this._loadRoster(true);
    this.render({ parts: ["roster"] });
  }

  static async #onOpenSource(event, target) {
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    const doc = uuid ? await fromUuid(uuid) : null;
    doc?.sheet?.render(true);
  }

  static #onNewEncounter() {
    const keep = this.enc.partyIds;
    this.enc = EncounterDesigner.#defaultState();
    this.enc.partyIds = keep;
    this.render({ parts: ["hero", "party", "roster", "encounter", "footer"] });
  }

  /* ---------- Drafts (world setting) ---------- */

  static async #onSaveDraft() {
    const name = this.enc.name.trim();
    if (!name) { ui.notifications.warn("Give the encounter a name first (bottom-left field)."); return; }
    const drafts = foundry.utils.deepClone(game.settings.get("icon-system", DRAFTS_SETTING) ?? {});
    drafts[name] = {
      ...this.enc,
      partyIds: [...(this.enc.partyIds ?? [])],
      savedAt: Date.now(),
    };
    await game.settings.set("icon-system", DRAFTS_SETTING, drafts);
    ui.notifications.info(`Encounter "${name}" saved.`);
    this.#refresh(["footer"]);
  }

  static #onLoadDraft(event, target) {
    const sel = target.closest('[data-application-part="footer"]')?.querySelector('[name="draft"]');
    const name = sel?.value;
    const draft = (game.settings.get("icon-system", DRAFTS_SETTING) ?? {})[name];
    if (!draft) { ui.notifications.warn("Pick a saved encounter first."); return; }
    const { savedAt, ...rest } = draft;
    this.enc = { ...EncounterDesigner.#defaultState(), ...foundry.utils.deepClone(rest), partyIds: new Set(rest.partyIds ?? []) };
    // Picks whose source disappeared are dropped with a warning.
    const before = this.enc.picks.length;
    this.enc.picks = this.enc.picks.filter(p => this._roster?.some(r => r.key === p.key));
    if (this.enc.picks.length < before) ui.notifications.warn(`${before - this.enc.picks.length} pick(s) of "${name}" no longer exist and were dropped.`);
    this.render({ parts: ["hero", "party", "roster", "encounter", "footer"] });
  }

  static async #onDeleteDraft(event, target) {
    const sel = target.closest('[data-application-part="footer"]')?.querySelector('[name="draft"]');
    const name = sel?.value;
    if (!name) return;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Delete saved encounter" },
      content: `<p>Delete the saved encounter <strong>${foundry.utils.escapeHTML(name)}</strong>?</p>`,
    });
    if (!ok) return;
    const drafts = foundry.utils.deepClone(game.settings.get("icon-system", DRAFTS_SETTING) ?? {});
    delete drafts[name];
    await game.settings.set("icon-system", DRAFTS_SETTING, drafts);
    this.#refresh(["footer"]);
  }

  /* -------------------------------------------------- */
  /*  Output: chat card                                  */
  /* -------------------------------------------------- */

  /** Build the chat-card context shared by "Post to chat" and the deploy card. */
  #cardContext({ reserveTokens = [], sceneId = "", deployed = false, folderName = "" } = {}) {
    const t = this.totals;
    const rows = this.enc.picks.map(p => ({
      name: p.name, qty: p.type === "legend" ? 1 : p.qty, clsLabel: p.clsLabel, cls: p.cls,
      elite: p.elite, isLegend: p.type === "legend", cost: pickCost(p, t.budget), reserve: p.reserve,
      turns: pickTurns(p, this.players),
    }));
    const party = (this._pcs ?? []).filter(pc => this.enc.partyIds.has(pc.id)).map(pc => pc.name);
    return {
      name: this.enc.name.trim() || "Encounter",
      players: this.players, party,
      budget: t.budget, base: baseBudget(this.players, this.enc.oneFight), adjust: this.enc.adjust,
      oneFight: this.enc.oneFight,
      spent: t.spent, onMap: t.onMap, reserve: t.reserve, over: t.over, overBy: t.overBy, remaining: t.remaining,
      npcTurns: t.npcTurns, pcTurns: t.pcTurns,
      rows, hasReserve: rows.some(r => r.reserve),
      reserveRounds: [...new Set(rows.filter(r => r.reserve).map(r => r.reserve))].sort(),
      reserveTokenIds: reserveTokens.map(td => td.id).join(","),
      sceneId, deployed, folderName,
      chapterCap: this.chapterCap,
    };
  }

  async #postCard(ctx) {
    const renderTpl = foundry.applications.handlebars?.renderTemplate ?? globalThis.renderTemplate;
    const content = await renderTpl("systems/icon-system/templates/chat/encounter-card.hbs", ctx);
    return ChatMessage.create({
      speaker: { alias: "Encounter Designer" },
      content,
      whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
      flags: { "icon-system": { encounterCard: true } },
    });
  }

  static async #onPostChat() {
    if (!this.enc.picks.length) { ui.notifications.warn("Add at least one foe first."); return; }
    await this.#postCard(this.#cardContext());
  }

  /* -------------------------------------------------- */
  /*  Output: actors / deploy                            */
  /* -------------------------------------------------- */

  /**
   * Build the actor data for every pick: one actor per body ("Warrior 1",
   * "Warrior 2"…) so each token tracks its own HP, with the Elite template,
   * mob member count and Legend HP scaling applied for the current party.
   */
  async #buildActorData(folderId) {
    const players = this.players;
    const docs = [];
    for (const p of this.enc.picks) {
      const src = await fromUuid(p.uuid);
      if (!src) { ui.notifications.warn(`"${p.name}" could not be loaded and was skipped.`); continue; }
      const count = p.type === "legend" ? 1 : p.qty;
      for (let i = 0; i < count; i++) {
        const data = src.toObject();
        delete data._id;
        data.folder = folderId;
        data.name = count > 1 ? `${p.name} ${i + 1}` : p.name;
        data.prototypeToken ??= {};
        data.prototypeToken.name = data.name;
        data.prototypeToken.disposition = CONST.TOKEN_DISPOSITIONS.HOSTILE;
        // Linked on purpose: IconActor._preCreate links every new actor's
        // prototype token, and with one actor per body a linked token is the
        // right thing (the sheet and the token share the same HP).
        if (data.prototypeToken.width == null) { data.prototypeToken.width = p.size; data.prototypeToken.height = p.size; }
        const sys = data.system;
        if (p.type === "foe") {
          if (p.elite && !p.baseElite && p.cls !== "mob") {
            sys.isElite = true;
            sys.hp.max = (sys.hp.max || 40) * 2;
            sys.hp.value = sys.hp.max;
            if (!(sys.traits ?? []).some(t => t.name?.toLowerCase() === "elite")) sys.traits = [ELITE_TRAIT, ...(sys.traits ?? [])];
          }
          if (p.cls === "mob") {
            sys.mob.members = Math.max(players, 1) * 2;
            sys.mob.hitsRemaining = sys.mob.members * 2;
          } else {
            sys.hp.value = sys.hp.max;
          }
        } else if (p.type === "legend") {
          const scale = Math.max(players, 2);
          const baseline = sys.hp.baseline || Math.round((sys.hp.max || 100) * 2 / Math.max(sys.playerScale ?? 2, 2));
          sys.hp.baseline = baseline;
          sys.playerScale = scale;
          sys.hp.max = Math.max(1, Math.round(baseline * scale / 2));
          sys.hp.value = sys.hp.max;
        }
        data.flags ??= {};
        data.flags["icon-system"] = { ...(data.flags["icon-system"] ?? {}),
          encounter: { name: this.enc.name.trim() || "Encounter", reserve: p.reserve, source: p.uuid } };
        docs.push({ data, reserve: p.reserve, size: p.size });
      }
    }
    return docs;
  }

  async #createFolder() {
    const label = `Encounter: ${this.enc.name.trim() || "Encounter"}`;
    return Folder.create({ name: label, type: "Actor", color: "#7a1f2e" });
  }

  static async #onCreateActors() {
    if (!this.enc.picks.length) { ui.notifications.warn("Add at least one foe first."); return; }
    if (this._busy) return;
    this._busy = true; this.#refresh(["footer"]);
    try {
      const folder = await this.#createFolder();
      const docs = await this.#buildActorData(folder.id);
      const actors = await Actor.createDocuments(docs.map(d => d.data));
      ui.notifications.info(`${actors.length} actor(s) created in "${folder.name}".`);
      await this.#postCard(this.#cardContext({ folderName: folder.name }));
    } catch (err) {
      console.error("ICON 1.5 | Encounter Designer: create actors failed", err);
      ui.notifications.error("Creating the encounter actors failed (see console).");
    } finally {
      this._busy = false; this.#refresh(["footer"]);
    }
  }

  /**
   * Deploy: actors + tokens on the current scene + combatants. Tokens are laid
   * out in rows around the centre of the current view (the GM drags them into
   * place); reserves are hidden and kept out of the combat until revealed.
   */
  static async #onDeploy() {
    if (!this.enc.picks.length) { ui.notifications.warn("Add at least one foe first."); return; }
    const scene = canvas?.scene;
    if (!scene) { ui.notifications.warn("Open a scene first."); return; }
    if (this._busy) return;
    const t = this.totals;
    if (t.over) {
      const ok = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Over budget" },
        content: `<p>This encounter spends <strong>${t.spent}</strong> points on a budget of <strong>${t.budget}</strong>. Deploy anyway?</p>`,
      });
      if (!ok) return;
    }
    this._busy = true; this.#refresh(["footer"]);
    try {
      const folder = await this.#createFolder();
      const docs   = await this.#buildActorData(folder.id);
      const actors = await Actor.createDocuments(docs.map(d => d.data));

      /* --- Token layout: rows of 6 cells starting at the view centre --- */
      const grid   = scene.grid.size;
      const pivot  = canvas.stage.pivot;
      const origin = canvas.grid.getTopLeftPoint({ x: pivot.x - 3 * grid, y: pivot.y - grid });
      const tokenData = [];
      let col = 0, row = 0;
      for (let i = 0; i < actors.length; i++) {
        const actor = actors[i];
        const meta  = docs[i];
        const size  = Math.max(1, meta.size);
        if (col + size > 6) { col = 0; row += 1; }
        const x = origin.x + col * grid;
        const y = origin.y + row * grid * 2;   // leave a free row between rows (size-2 tokens)
        const td = await actor.getTokenDocument({ x, y, hidden: !!meta.reserve });
        const obj = td.toObject();
        obj.flags ??= {};
        obj.flags["icon-system"] = { ...(obj.flags["icon-system"] ?? {}), encounterReserve: meta.reserve || 0 };
        tokenData.push(obj);
        col += size;
      }
      const tokens = await scene.createEmbeddedDocuments("Token", tokenData);

      /* --- Combat: create/find, add non-reserve foes (+ party tokens) --- */
      const combat = await EncounterDesigner.ensureCombat(scene);
      const toAdd = [];
      for (const tok of tokens) {
        if (tok.getFlag("icon-system", "encounterReserve")) continue;
        toAdd.push({ tokenId: tok.id, sceneId: scene.id, actorId: tok.actorId, hidden: tok.hidden });
      }
      if (this.enc.addParty) {
        for (const tok of scene.tokens) {
          if (tok.actor?.type !== "icon" || !this.enc.partyIds.has(tok.actor.id)) continue;
          if (combat.combatants.some(c => c.tokenId === tok.id)) continue;
          toAdd.push({ tokenId: tok.id, sceneId: scene.id, actorId: tok.actor.id, hidden: tok.hidden });
        }
      }
      if (toAdd.length) await combat.createEmbeddedDocuments("Combatant", toAdd);

      const reserveTokens = tokens.filter(tok => tok.getFlag("icon-system", "encounterReserve"));
      await this.#postCard(this.#cardContext({ reserveTokens, sceneId: scene.id, deployed: true, folderName: folder.name }));
      ui.notifications.info(`Deployed ${tokens.length} token(s) on "${scene.name}"${reserveTokens.length ? ` (${reserveTokens.length} hidden in reserve)` : ""}.`);
    } catch (err) {
      console.error("ICON 1.5 | Encounter Designer: deploy failed", err);
      ui.notifications.error("Deploying the encounter failed (see console).");
    } finally {
      this._busy = false; this.#refresh(["footer"]);
    }
  }

  /** Find or create the Combat of a scene (same shims as the token-HUD toggle in icon.mjs). */
  static async ensureCombat(scene) {
    let combat = game.combats.find(c => c.scene?.id === scene.id);
    if (!combat) combat = await Combat.create({ scene: scene.id, active: true });
    if (!combat) throw new Error("Combat.create returned nothing");
    if (!combat.active) { try { await combat.activate(); } catch (err) { console.warn("ICON 1.5 | Could not activate combat:", err); } }
    // v13: Combat#recordPreviousState does Object.assign(this.previous, …) and
    // `previous` can be null on a fresh document.
    if (combat.previous == null) combat.previous = { round: null, turn: null, tokenId: null, combatantId: null };
    return combat;
  }

  /**
   * "Reveal reserves" from the chat card: un-hide the reserve tokens of a
   * scene and add them to its combat. Called from the renderChatMessageHTML
   * hook in icon.mjs. Returns the number of tokens revealed.
   */
  static async revealReserves(sceneId, tokenIds) {
    const scene = game.scenes.get(sceneId);
    if (!scene) { ui.notifications.warn("The encounter's scene no longer exists."); return 0; }
    const tokens = tokenIds.map(id => scene.tokens.get(id)).filter(Boolean);
    if (!tokens.length) { ui.notifications.warn("The reserve tokens are gone."); return 0; }
    await scene.updateEmbeddedDocuments("Token", tokens.map(t => ({ _id: t.id, hidden: false, "flags.icon-system.encounterReserve": 0 })));
    const combat = await EncounterDesigner.ensureCombat(scene);
    const toAdd = tokens
      .filter(t => !combat.combatants.some(c => c.tokenId === t.id))
      .map(t => ({ tokenId: t.id, sceneId: scene.id, actorId: t.actorId, hidden: false }));
    if (toAdd.length) await combat.createEmbeddedDocuments("Combatant", toAdd);
    return tokens.length;
  }
}
