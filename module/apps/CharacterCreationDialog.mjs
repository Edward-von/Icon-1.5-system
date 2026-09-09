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
import { buildBondKitsNote } from "../helpers/advancement.mjs";
import { formatTag } from "../helpers/rule-tooltips.mjs";
import { parseAbilitySections, escapeHTML } from "../helpers/enrich.mjs";

/** Plain-text, trimmed excerpt of a rich-text field (for option cards). */
function _excerpt(html, max = 150) {
  const t = String(html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : t;
}

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
    position: { width: 740, height: 780 },
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
        uuid:        i.uuid,
        name:        i.name,
        bondName:    (i.system?.bondName ?? "").trim().toLowerCase(),
        description: _excerpt(i.system?.description, 160),
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
        tags:    (i.system?.tags ?? []).map(formatTag).filter(Boolean).map(t => t.label),
        flavor:  _excerpt(parseAbilitySections(i.system?.description).flavor, 110),
      }));
    _log(`loaded ${this._abilities.length} chapter-1 abilities`);
  }

  /* -------------------------------------------------- */
  /*  Render hooks                                       */
  /* -------------------------------------------------- */

  /**
   * Wire the wizard. The whole part is re-rendered by AppV2 on each render,
   * so every listener is bound fresh here (no duplicates). Everything the
   * submit handler reads is still a plain form field: the option cards are
   * labels around hidden radios/checkboxes, and the dot allocator writes the
   * `distribution1..N` hidden inputs.
   */
  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;
    const $  = (sel) => html.querySelector(sel);
    const $$ = (sel) => Array.from(html.querySelectorAll(sel));

    const hero      = $('[data-role="hero"]');
    const heroJob   = $('[data-role="hero-job"]');
    const heroBond  = $('[data-role="hero-bond"]');
    const steps     = $$(".icon-wizard__step");
    const railSteps = $$('[data-role="rail"] .icon-wizard__rail-step');

    /* ---------- Bond → primary actions + bond powers ---------- */
    const primaryCards = $$('[data-role="primary-grid"] .icon-option');
    const powerCards   = $$('[data-role="power-grid"] .icon-option');
    const checkedBond  = () => $('input[name="bondUuid"]:checked');

    const syncFromBond = () => {
      const sel      = checkedBond();
      const bondName = (sel?.dataset?.name ?? "").toLowerCase();
      const allowed  = (sel?.dataset?.actions ?? "").split(",").filter(Boolean);
      _log(`bond changed — "${bondName}" | primary actions: ${allowed.join("/")}`);

      primaryCards.forEach(card => {
        const show = allowed.includes(card.dataset.actionKey);
        card.hidden = !show;
        if (!show) card.querySelector("input").checked = false;
      });
      if (allowed.length && !$('input[name="primaryAction"]:checked')) {
        primaryCards.find(c => !c.hidden)?.querySelector("input")?.click();
      }
      $('[data-role="primary-empty"]').hidden = allowed.length > 0;

      let visiblePowers = 0;
      powerCards.forEach(card => {
        const bn   = (card.dataset.bond ?? "").toLowerCase();
        const show = !!bondName && (!bn || bn === bondName);
        card.hidden = !show;
        if (!show) card.querySelector("input").checked = false;
        if (show) visiblePowers++;
      });
      $('[data-role="power-empty"]').hidden = visiblePowers > 0;

      if (heroBond) { heroBond.textContent = sel?.dataset?.name ?? ""; heroBond.hidden = !sel; }
      syncDots();
    };

    /* ---------- Dot allocator (step 4) ---------- */
    const rows        = $$('[data-role="allocator"] .icon-dots-row');
    const distInputs  = $$('input[data-role="distribution"]');
    const dotsCounter = $('[data-role="dots-counter"]');
    const base        = this.actor.system.narrative.actions ?? {};
    const alloc       = {};                         // action key → extra dots picked here
    const totalAlloc  = () => Object.values(alloc).reduce((a, b) => a + b, 0);
    const ratingOf    = (key) => (base[key] ?? 0) + (key === $('input[name="primaryAction"]:checked')?.value ? 2 : 0) + (alloc[key] ?? 0);

    const syncDots = () => {
      const primary = $('input[name="primaryAction"]:checked')?.value;
      const left    = DISTRIBUTION_DOTS - totalAlloc();
      for (const row of rows) {
        const key    = row.dataset.actionKey;
        const rating = ratingOf(key);
        const extra  = alloc[key] ?? 0;
        row.classList.toggle("icon-dots-row--primary", key === primary);
        row.querySelectorAll(".icon-dot").forEach(dot => {
          const i = Number(dot.dataset.i);
          dot.classList.toggle("base",   i <= rating - extra);
          dot.classList.toggle("alloc",  i > rating - extra && i <= rating);
          dot.classList.toggle("capped", i > L0_MAX_RATING);
        });
        row.querySelector('[data-role="dot-plus"]').disabled  = left <= 0 || rating >= L0_MAX_RATING;
        row.querySelector('[data-role="dot-minus"]').disabled = extra <= 0;
      }
      // Hidden inputs: one action key per dot, in allocation order
      const keys = Object.entries(alloc).flatMap(([k, n]) => Array(n).fill(k));
      distInputs.forEach((inp, i) => { inp.value = keys[i] ?? ""; });
      if (dotsCounter) {
        dotsCounter.textContent = left > 0 ? `${left} left` : "all spent";
        dotsCounter.classList.toggle("icon-wizard__counter--full", left === 0);
      }
      refreshProgress();
    };

    for (const row of rows) {
      const key = row.dataset.actionKey;
      row.querySelector('[data-role="dot-plus"]').addEventListener("click", () => {
        if (totalAlloc() >= DISTRIBUTION_DOTS || ratingOf(key) >= L0_MAX_RATING) return;
        alloc[key] = (alloc[key] ?? 0) + 1; syncDots();
      });
      row.querySelector('[data-role="dot-minus"]').addEventListener("click", () => {
        if (!alloc[key]) return;
        alloc[key] -= 1; if (!alloc[key]) delete alloc[key]; syncDots();
      });
    }

    /* ---------- Job → hero colour + abilities ---------- */
    const abilityCards   = $$('[data-role="ability-grid"] .icon-option');
    const abilityCounter = $('[data-role="ability-counter"]');
    const CLASSES = ["stalwart", "vagabond", "mendicant", "wright"];

    const syncFromJob = () => {
      const sel     = $('input[name="jobUuid"]:checked');
      const jobName = (sel?.dataset?.jobname ?? "").toLowerCase();
      const cls     = sel?.dataset?.class ?? "";
      _log(`job changed — "${jobName}" (${cls})`);

      if (hero) { CLASSES.forEach(c => hero.classList.remove(`icon-class--${c}`)); if (cls) hero.classList.add(`icon-class--${cls}`); }
      if (heroJob) {
        heroJob.innerHTML = sel ? `${escapeHTML(sel.dataset.jobname)}<small>${escapeHTML(cls)}</small>` : "";
        heroJob.hidden = !sel;
      }
      let visible = 0;
      abilityCards.forEach(card => {
        const show = !!jobName && (card.dataset.jobname ?? "").toLowerCase() === jobName;
        card.hidden = !show;
        if (!show) card.querySelector("input").checked = false;
        if (show) visible++;
      });
      $('[data-role="ability-empty"]').hidden = visible > 0;
      syncAbilities();
    };

    const syncAbilities = () => {
      const picked = $$('input[name="abilityPick"]:checked').length;
      abilityCards.forEach(card => {
        const input = card.querySelector("input");
        input.disabled = !input.checked && picked >= STARTING_ABILITIES;
      });
      if (abilityCounter) {
        abilityCounter.textContent = `${picked} / ${STARTING_ABILITIES}`;
        abilityCounter.classList.toggle("icon-wizard__counter--full", picked === STARTING_ABILITIES);
      }
      refreshProgress();
    };

    /* ---------- Progress rail + footer summary ---------- */
    const stepDone = {
      kin:       () => !!$('[name="kintype"]')?.value && !!$('[name="culture"]')?.value,
      bond:      () => !!checkedBond(),
      primary:   () => !!$('input[name="primaryAction"]:checked'),
      dots:      () => totalAlloc() === DISTRIBUTION_DOTS,
      power:     () => !!$('input[name="bondPowerUuid"]:checked'),
      job:       () => !!$('input[name="jobUuid"]:checked'),
      abilities: () => $$('input[name="abilityPick"]:checked').length === STARTING_ABILITIES,
    };
    const refreshProgress = () => {
      let done = 0;
      for (const step of steps) {
        const ok = !!stepDone[step.dataset.step]?.();
        step.classList.toggle("icon-wizard__step--done", ok);
        railSteps.find(r => r.dataset.step === step.dataset.step)?.classList.toggle("icon-wizard__rail-step--done", ok);
        if (ok) done++;
      }
      const summary = $('[data-role="summary"]');
      if (summary) summary.innerHTML = done === steps.length
        ? `<strong>All set.</strong> Finalize to write everything on the sheet.`
        : `<strong>${done} / ${steps.length}</strong> steps done`;
    };

    railSteps.forEach(r => r.addEventListener("click", () => {
      steps.find(s => s.dataset.step === r.dataset.step)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));

    /* ---------- Bind (on the part root, which is replaced on every render) ---------- */
    (html.querySelector(".icon-wizard") ?? html).addEventListener("change", ev => {
      const name = ev.target?.name ?? "";
      if (name === "bondUuid")             syncFromBond();
      else if (name === "primaryAction")   syncDots();
      else if (name === "jobUuid")         syncFromJob();
      else if (name === "abilityPick")     syncAbilities();
      else                                 refreshProgress();
    });

    syncFromBond();
    syncFromJob();
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
    // The picks must belong to the chosen job: the cards of the other jobs are
    // hidden, but a ticked hidden input would still be submitted.
    if (data.jobUuid && abilityPicks.length) {
      const job = await fromUuid(data.jobUuid);
      const jobName = String(job?.system?.jobName ?? job?.name ?? "").toLowerCase();
      for (const uuid of abilityPicks) {
        const ab = await fromUuid(uuid);
        const abJob = String(ab?.system?.jobName ?? "").toLowerCase();
        if (jobName && abJob && abJob !== jobName) errors.push(`"${ab.name}" is a ${ab.system.jobName} ability: pick abilities of your job.`);
      }
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

    // List the bond's baseline equipment kits in the Notes tab so a fresh
    // character can pick one without digging through the Gear Kits compendium.
    const kitsBlock = await buildBondKitsNote(bondItem.name);
    const notes     = actor.system.biography?.notes ?? "";
    if (kitsBlock && !notes.includes(`Kits (${bondItem.name})`)) {
      updates["system.biography.notes"] = `${notes ? `${notes}\n\n` : ""}${kitsBlock}`;
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
