/**
 * CharacterCreationDialog — ApplicationV2 wizard for level-0 ICON PCs.
 *
 * Implements the rules from p. 241:
 *   - Choose a Kin type
 *   - Choose a Culture
 *   - Choose a Bond (gets +2 dots in one of the bond's primary actions)
 *   - Gain 4 extra +1 dots to distribute across any actions
 *   - Cap: no action above rating 3 at level 0
 *   - Choose a Bond Power (filtered by chosen bond)
 *
 * On submit, writes everything to the actor in a single transaction.
 */
import { buildClassTraitDocs } from "../helpers/classes.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const _log = (...args) => console.debug("[ICON | CharCreationDialog]", ...args);

const L0_MAX_RATING      = 3;
const DISTRIBUTION_DOTS  = 4;
const STARTING_ABILITIES = 2;

export class CharacterCreationDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(actor, options = {}) {
    super(options);
    this.actor     = actor;
    this._bonds    = [];
    this._powers   = [];
    this._jobs     = [];
    this._abilities = [];
  }

  static DEFAULT_OPTIONS = {
    classes: ["icon", "character-creation-dialog"],
    position: { width: 620, height: 720 },
    tag: "form",
    form: {
      handler: CharacterCreationDialog.#onSubmit,
      closeOnSubmit: false,
    },
    actions: {
      cancel: CharacterCreationDialog.#onCancel,
    },
    window: {
      title:     "Character Creation",
      icon:      "fa-solid fa-user-plus",
      resizable: true,
    },
  };

  static PARTS = {
    form: { template: "systems/icon-system/templates/apps/character-creation.hbs", scrollable: [""] },
  };

  get title() { return `Character Creation — ${this.actor.name}`; }

  async _prepareContext(options) {
    _log(`_prepareContext — actor: "${this.actor.name}"`);

    await this._loadBonds();
    await this._loadBondPowers();
    await this._loadJobTemplates();
    await this._loadStartingAbilities();

    const sys = this.actor.system;

    const kinTypes = Object.entries(CONFIG.ICON.kinTypes).map(([key, labelKey]) => ({
      key, label: game.i18n.localize(labelKey) ?? key,
    }));
    const cultures = Object.entries(CONFIG.ICON.cultures).map(([key, labelKey]) => ({
      key, label: game.i18n.localize(labelKey) ?? key,
    }));
    const actions = Object.entries(CONFIG.ICON.actions).map(([key, labelKey]) => ({
      key, label: game.i18n.localize(labelKey) ?? key,
    }));

    return {
      actor:            this.actor,
      current: {
        kintype: sys.biography.kintype ?? "",
        culture: sys.biography.culture ?? "",
        bond:    sys.narrative.bond    ?? "",
      },
      kinTypes,
      cultures,
      actions,
      bonds:            this._bonds,
      bondPowers:       this._powers,
      jobs:             this._jobs,
      abilities:        this._abilities,
      distributionSlots: Array.from({ length: DISTRIBUTION_DOTS }, (_, i) => i + 1),
      maxRating:        L0_MAX_RATING,
      startingAbilities: STARTING_ABILITIES,
    };
  }

  async _loadBonds() {
    const pack = game.packs.get("icon-system.bonds");
    if (!pack) { _log(`WARN: compendium "icon-system.bonds" not found`); return; }
    const items = await pack.getDocuments();
    this._bonds = items
      .filter(i => i.type === "bond")
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(i => ({
        uuid:           i.uuid,
        name:           i.name,
        primaryActions: Array.isArray(i.system?.primaryActions) ? i.system.primaryActions : [],
        primaryActionsCsv: (i.system?.primaryActions ?? []).join(","),
        effortMax:      i.system?.effortMax ?? 3,
      }));
    _log(`loaded ${this._bonds.length} bonds`);
  }

  async _loadBondPowers() {
    const pack = game.packs.get("icon-system.bond-powers");
    if (!pack) { _log(`WARN: compendium "icon-system.bond-powers" not found`); return; }
    const items = await pack.getDocuments();
    this._powers = items
      .filter(i => i.type === "bond-power")
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(i => ({
        uuid:     i.uuid,
        name:     i.name,
        bondName: (i.system?.bondName ?? "").trim().toLowerCase(),
      }));
    _log(`loaded ${this._powers.length} bond powers`);
  }

  async _loadJobTemplates() {
    const pack = game.packs.get("icon-system.jobs");
    if (!pack) { _log(`WARN: compendium "icon-system.jobs" not found`); return; }
    const items = await pack.getDocuments();
    this._jobs = items
      .filter(i => i.type === "job-template")
      .sort((a, b) => (a.system?.class ?? "").localeCompare(b.system?.class ?? "") || a.name.localeCompare(b.name))
      .map(i => ({
        uuid:    i.uuid,
        name:    i.name,
        class:   i.system?.class ?? "",
        jobName: i.system?.jobName ?? "",
      }));
    _log(`loaded ${this._jobs.length} job templates`);
  }

  async _loadStartingAbilities() {
    const pack = game.packs.get("icon-system.jobs");
    if (!pack) { _log(`WARN: compendium "icon-system.jobs" not found`); return; }
    const items = await pack.getDocuments();
    // Level 0 PCs have chapter 1 → only chapter-1 abilities are available.
    this._abilities = items
      .filter(i => i.type === "ability")
      .filter(i => (i.system?.chapter ?? 1) === 1)
      .sort((a, b) =>
        (a.system?.jobName ?? "").localeCompare(b.system?.jobName ?? "") ||
        a.name.localeCompare(b.name),
      )
      .map(i => ({
        uuid:    i.uuid,
        name:    i.name,
        class:   i.system?.class ?? "",
        jobName: i.system?.jobName ?? "",
        cost:    i.system?.cost ?? "",
      }));
    _log(`loaded ${this._abilities.length} chapter-1 abilities`);
  }

  /* -------------------------------------------------- */
  /*  Render hooks                                       */
  /* -------------------------------------------------- */

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;

    const bondSelect      = html.querySelector('[name="bondUuid"]');
    const primaryOptions  = html.querySelectorAll(".icon-cc__primary-option");
    const bondPowerSelect = html.querySelector('[name="bondPowerUuid"]');
    const bondPowerOptions = bondPowerSelect?.querySelectorAll("option[data-bond]") ?? [];

    const syncFromBond = () => {
      const selected = bondSelect?.selectedOptions?.[0];
      const bondName = (selected?.dataset?.name ?? "").toLowerCase();
      const actionsAllowed = (selected?.dataset?.actions ?? "").split(",").filter(Boolean);
      _log(`bond changed — "${bondName}" | primary actions: ${actionsAllowed.join("/")}`);

      // Show only allowed primary-action radios
      primaryOptions.forEach(opt => {
        const key = opt.dataset.action;
        const show = actionsAllowed.includes(key);
        opt.style.display = show ? "" : "none";
        const input = opt.querySelector("input");
        if (input && !show) input.checked = false;
      });
      // Pre-select first allowed option
      const firstAllowed = Array.from(primaryOptions)
        .find(opt => actionsAllowed.includes(opt.dataset.action));
      if (firstAllowed) firstAllowed.querySelector("input").checked = true;

      // Filter bond powers by bond name
      bondPowerOptions.forEach(opt => {
        const bn = (opt.dataset.bond ?? "").toLowerCase();
        const show = !bondName || !bn || bn === bondName;
        opt.hidden = !show;
        if (!show && opt.selected) {
          opt.selected = false;
          if (bondPowerSelect) bondPowerSelect.selectedIndex = 0;
        }
      });
    };

    bondSelect?.addEventListener("change", syncFromBond);
    // Initial sync (triggers in case a bond is already selected)
    if (bondSelect?.value) syncFromBond();
    else primaryOptions.forEach(o => o.style.display = "none");

    /* ---------- Job → Ability filter ---------- */
    const jobSelect    = html.querySelector('[name="jobUuid"]');
    const abilityRows  = html.querySelectorAll(".icon-cc__ability-row");

    const syncFromJob = () => {
      const selected = jobSelect?.selectedOptions?.[0];
      const jobName  = (selected?.dataset?.jobname ?? "").toLowerCase();
      _log(`job changed — "${jobName}"`);

      abilityRows.forEach(row => {
        const rowJob = (row.dataset.jobname ?? "").toLowerCase();
        const show = !jobName || rowJob === jobName;
        row.hidden = !show;
        if (!show) {
          const input = row.querySelector("input[type='checkbox']");
          if (input) input.checked = false;
        }
      });
    };

    jobSelect?.addEventListener("change", syncFromJob);
    if (jobSelect?.value) syncFromJob();
    else abilityRows.forEach(r => r.hidden = true);

    /* ---------- Enforce max 2 ability checkboxes ---------- */
    const abilityChecks = html.querySelectorAll('input[name="abilityPick"]');
    abilityChecks.forEach(cb => {
      cb.addEventListener("change", () => {
        const checked = html.querySelectorAll('input[name="abilityPick"]:checked');
        if (checked.length > STARTING_ABILITIES) {
          cb.checked = false;
          ui.notifications.warn(`You can only pick ${STARTING_ABILITIES} starting abilities.`);
        }
      });
    });
  }

  /* -------------------------------------------------- */
  /*  Submit                                             */
  /* -------------------------------------------------- */

  static async #onSubmit(event, form, formData) {
    const data   = formData.object;
    const dialog = this;
    const actor  = dialog.actor;
    _log(`submit — form:`, data);

    // --- Validate ---
    const errors = [];
    if (!data.kintype)       errors.push("Choose a Kin type.");
    if (!data.culture)       errors.push("Choose a Culture.");
    if (!data.bondUuid)      errors.push("Choose a Bond.");
    if (!data.primaryAction) errors.push("Choose the primary action for your Bond.");
    if (!data.jobUuid)       errors.push("Choose a starting Job.");

    const distribution = [];
    for (let i = 1; i <= DISTRIBUTION_DOTS; i++) {
      const v = data[`distribution${i}`];
      if (!v) errors.push(`Assign extra dot #${i}.`);
      else distribution.push(v);
    }
    if (!data.bondPowerUuid) errors.push("Choose a Bond Power.");

    // Ability picks — normalize array/string/undefined, then require exactly STARTING_ABILITIES
    const abilityPicks = [];
    const rawAbility = data.abilityPick;
    if (Array.isArray(rawAbility)) abilityPicks.push(...rawAbility.filter(Boolean));
    else if (typeof rawAbility === "string" && rawAbility) abilityPicks.push(rawAbility);
    if (abilityPicks.length !== STARTING_ABILITIES) {
      errors.push(`Pick exactly ${STARTING_ABILITIES} starting abilities (picked ${abilityPicks.length}).`);
    }

    // Simulate final action ratings and enforce the L0 cap (rating 3)
    const baseActions = actor.system.narrative.actions;
    const finalActions = { ...baseActions };
    if (data.primaryAction) finalActions[data.primaryAction] = (finalActions[data.primaryAction] ?? 0) + 2;
    for (const key of distribution) finalActions[key] = (finalActions[key] ?? 0) + 1;

    const overCap = Object.entries(finalActions).filter(([, v]) => v > L0_MAX_RATING);
    if (overCap.length) {
      errors.push(`Actions over cap (${L0_MAX_RATING}): ${overCap.map(([k, v]) => `${k}=${v}`).join(", ")}`);
    }

    if (errors.length) {
      _log(`submit blocked — errors:`, errors);
      ui.notifications.error("Character creation: " + errors.join(" "));
      return;
    }

    // --- Resolve bond + job templates ---
    const bondItem = await fromUuid(data.bondUuid);
    if (!bondItem) { ui.notifications.error(`Could not load bond item.`); return; }
    const bondSys = bondItem.system ?? {};

    const jobItem = await fromUuid(data.jobUuid);
    if (!jobItem) { ui.notifications.error(`Could not load job template.`); return; }
    const jobSys = jobItem.system ?? {};
    const jobBaseStats = jobSys.baseStats ?? {};
    const jobClass = jobSys.class ?? "stalwart";
    const jobDisplayName = jobSys.jobName || jobItem.name;

    // --- Build actor update ---
    const vit = jobBaseStats.vit ?? actor.system.combat.vit ?? 10;
    const hpMax = vit * 4;

    const updates = {
      "system.biography.kintype":    data.kintype,
      "system.biography.culture":    data.culture,
      "system.biography.ideals":     Array.isArray(bondSys.ideals) ? bondSys.ideals : [],
      "system.narrative.bond":       bondItem.name,
      "system.narrative.effort.max": bondSys.effortMax ?? 3,
      "system.narrative.effort.value": bondSys.effortMax ?? 3,
      // Apply job template's base stats to combat block
      "system.combat.vit":        vit,
      "system.combat.defense":    jobBaseStats.defense   ?? actor.system.combat.defense,
      "system.combat.speed":      jobBaseStats.speed     ?? actor.system.combat.speed,
      "system.combat.fray":       jobBaseStats.fray      ?? actor.system.combat.fray,
      "system.combat.damagedie":  jobBaseStats.damagedie ?? actor.system.combat.damagedie,
      "system.combat.armor":      jobBaseStats.armor     ?? actor.system.combat.armor,
      "system.combat.hp.max":     hpMax,
      "system.combat.hp.value":   hpMax,
      "system.combat.vigor.max":  vit,
      // Level 0 starter AP = 2 (the two starting abilities)
      "system.combat.apTotal":    (actor.system.combat.apTotal ?? 0) + 2,
      // Make this the primary job
      "system.combat.jobs": [{
        name:         jobDisplayName,
        class:        jobClass,
        primary:      true,
        templateUuid: jobItem.uuid,
      }],
    };
    for (const [key, val] of Object.entries(finalActions)) {
      if (val !== baseActions[key]) updates[`system.narrative.actions.${key}`] = val;
    }

    _log(`applying updates:`, updates);
    await actor.update(updates);

    // --- Build embed list ---
    const toEmbed = [];

    // Bond item itself — embedded so the Narrative tab bond slot shows it.
    toEmbed.push(bondItem.toObject());

    // Bond power
    const powerItem = await fromUuid(data.bondPowerUuid);
    if (powerItem) {
      _log(`embedding bond power: "${powerItem.name}"`);
      toEmbed.push(powerItem.toObject());
    }

    // Class-level traits (e.g. Stalwart's Armor 2 / Fortify, Vagabond's Dodge, etc.)
    for (const doc of buildClassTraitDocs(jobClass)) toEmbed.push(doc);

    // Job template traits → trait items (preserving chapter)
    if (Array.isArray(jobSys.traits)) {
      for (const t of jobSys.traits) {
        if (!t?.name && !t?.description) continue;
        toEmbed.push({
          type: "trait",
          name: t.name || `${jobDisplayName} trait`,
          system: {
            jobName:     jobDisplayName,
            class:       jobClass,
            source:      "job",
            passive:     true,
            chapter:     Number(t.chapter) || 1,
            description: t.description ?? "",
          },
        });
      }
    }

    // Job template limit break → limit-break item
    if (jobSys.limitBreak?.name) {
      toEmbed.push({
        type: "limit-break",
        name: jobSys.limitBreak.name,
        system: {
          jobName:     jobDisplayName,
          class:       jobClass,
          resolveCost: jobSys.limitBreak.resolveCost ?? 2,
          cost:        jobSys.limitBreak.cost ?? "1action",
          effect:      jobSys.limitBreak.effect ?? "",
          ultimate:    jobSys.limitBreak.ultimate ?? "",
        },
      });
    }

    // Starting abilities
    for (const uuid of abilityPicks) {
      const it = await fromUuid(uuid);
      if (it) toEmbed.push(it.toObject());
    }

    if (toEmbed.length) {
      _log(`embedding ${toEmbed.length} items (bond power + ${jobSys.traits?.length ?? 0} traits + ${jobSys.limitBreak?.name ? 1 : 0} LB + ${abilityPicks.length} abilities)`);
      await actor.createEmbeddedDocuments("Item", toEmbed);
    }

    ui.notifications.info(`${actor.name} — character setup complete.`);
    dialog.close();
  }

  static async #onCancel(event, target) {
    _log(`cancel`);
    this.close();
  }
}
