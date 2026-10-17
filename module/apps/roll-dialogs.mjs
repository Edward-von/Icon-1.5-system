/**
 * roll-dialogs.mjs — Attack roll and Damage roll dialogs.
 *
 * Same visual language as the sheets and the wizards ("Ink & Gold ×
 * Tactics"): a class-coloured band with the portrait, the ability name and
 * its tags, a target card fed by the user's current targets (DEF / ARM / HP),
 * the auto-applied modifiers as chips, steppers for boons & curses, outcome
 * as a segmented control, mitigation as toggle chips and a live preview line.
 *
 * Shared by PCs, foes and legends. Return shapes are unchanged from the old
 * prompts so the roll code (combatRoll / postAbilityDamageCard) is untouched:
 *   promptAttackMods → { boons, curses, defense, critAt, exceedAt, attackTargetId,
 *                        targetIds, evasion: { tokenId: boolean } } | null
 *   promptDamageMods → { outcome, targetName, targetIds, attackTargetId,
 *                        bonusDice, vulnerable, resistance, weakened, hatred,
 *                        useCombo, other, instances } | null
 *   (`other`: { mult, flat, fray, area, label } for the "Other" outcome, else null;
 *    `instances`: how many separate times the rolled damage is dealt, p.92)
 *   With `free: true` the damage dialog opens on the "Other" panel alone (the
 *   PC sheet's Damage Utility): no ability, just dice / fixed / fray / area.
 */
import { getActorStatusMods, getTagRollMods } from "../combat/status-modifiers.mjs";
import { hatredDamageHint } from "../combat/marks.mjs";
import { defenseChipsHtml, defenseProfile, ignoresEvasion, attackIgnores, evasionThreshold, hasSureEvasion } from "../combat/defenses.mjs";
import { escapeHTML as esc } from "../helpers/enrich.mjs";
import { IconActor } from "../actor/IconActor.mjs";
import { areaFromTags } from "../canvas/area-templates.mjs";
import { attackThresholds } from "../combat/crit-thresholds.mjs";

const _log = (...a) => console.debug("[ICON | roll-dialogs]", ...a);

// The attack target picked in the last attack dialog, per attacker and
// ability, so the damage dialog that follows starts on the same token instead
// of treating every token in the area as the one that was attacked (p.117).
const _lastAttackTarget = new Map();
const _attackKey = (actor, ab) => `${actor?.uuid ?? ""}|${String(ab?.name ?? "").replace(/ \(Combo\)$/, "")}`;

// A new area of the ability on the map (placed by hand, or by the attack that
// is about to pick its target: the pick comes after the placement) forgets the
// target picked for the earlier area, so Show in Chat / the damage dialog do
// not start on a token chosen for a different area. The pits' explosion is
// not the ability's own area (its attack target stays).
Hooks.on("createMeasuredTemplate", (doc, _options, userId) => {
  const f = doc.flags?.["icon-system"];
  if (userId !== game.userId || !f?.cells || f.pitBlast || !f.actorUuid) return;
  _lastAttackTarget.delete(_attackKey({ uuid: f.actorUuid }, { name: f.abilityName }));
});

/* -------------------------------------------------- */
/*  Shared pieces                                      */
/* -------------------------------------------------- */

/** CSS class that colours the band: PC → primary job class, NPC → npc red. */
function _bandClass(actor) {
  if (actor?.type === "icon") {
    const jobs = actor.system?.combat?.jobs ?? [];
    const primary = jobs.find(j => j.primary) ?? jobs[0];
    return `icon-class--${String(primary?.class ?? "stalwart").toLowerCase()}`;
  }
  return "icon-roll-hero--npc";
}

/** The user's current targets with the numbers the dialogs show. */
function _targets() {
  return Array.from(game.user?.targets ?? []).filter(t => t.actor).map(t => {
    const s = t.actor.system ?? {};
    return {
      id:      t.id,
      name:    t.name,
      actor:   t.actor,
      img:     t.actor.img ?? t.document?.texture?.src ?? "",
      defense: s.combat?.defense ?? s.defense ?? null,
      armor:   s.combat?.armor ?? s.armor ?? 0,
      hp:      s.combat?.hp?.value ?? s.hp?.value ?? null,
      hpMax:   s.combat?.hp?.max ?? s.hp?.max ?? null,
      // Defensive statuses / traits of the target (defenses.mjs)
      defense_: defenseProfile(t.actor),
      defChips: defenseChipsHtml(t.actor),
      // Evasion threshold / Rigoletto Aspect of the target, also used when the
      // attacker ticks "Defender has evasion" by hand (Curse of Chaos, p.149).
      evThreshold: evasionThreshold(t.actor),
      evSure:  hasSureEvasion(t.actor),
      // The stance the target is in, if any — it usually says what they are
      // about to do, and it was only visible on their own sheet until now.
      stance:  IconActor.stanceOf(t.actor),
    };
  });
}

/** Elevation difference vs targets → boons (higher) or curses (lower), p.89. */
function _elevationMods(actor, targets) {
  const readEl = (a, tok) => a?.getFlag?.("icon-system", "elevation") ?? tok?.document?.elevation ?? 0;
  const sourceToken = canvas?.tokens?.controlled?.find(t => t.actor?.id === actor?.id) ?? actor?.getActiveTokens?.(false, false)?.[0] ?? null;
  if (!targets.length) return { boons: 0, curses: 0, note: "" };
  const srcEl = readEl(actor, sourceToken);
  const diffs = targets.map(t => srcEl - readEl(canvas.tokens.get(t.id)?.actor, canvas.tokens.get(t.id)));
  const worst = Math.min(...diffs), best = Math.max(...diffs);
  if (worst < 0) return { boons: 0, curses: -worst, note: `Height disadvantage Δ${-worst}: +${-worst} curse${-worst > 1 ? "s" : ""}` };
  if (best > 0)  return { boons: best, curses: 0, note: `Height advantage Δ${best}: +${best} boon${best > 1 ? "s" : ""}` };
  return { boons: 0, curses: 0, note: "" };
}

/** Tags as chips (accepts raw strings or {raw,label} objects). */
function _tagChips(tags) {
  return (tags ?? []).map(t => {
    const label = t?.label ?? String(t ?? "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return label ? `<span class="icon-tag icon-tag--small">${esc(label)}</span>` : "";
  }).join("");
}

function _hero({ actor, kicker, title, cost, tags, dieLabel, dieSub }) {
  return `
    <header class="icon-roll-hero ${_bandClass(actor)}">
      <div class="icon-roll-hero__notch"><img src="${esc(actor?.img ?? "")}" alt=""></div>
      <div class="icon-roll-hero__identity">
        <span class="icon-roll-hero__kicker">${esc(kicker)}</span>
        <h2 class="icon-roll-hero__title">${esc(title)}</h2>
        <div class="icon-roll-hero__meta">
          ${cost ? `<span class="icon-badge">${esc(cost)}</span>` : ""}
          ${_tagChips(tags)}
        </div>
      </div>
      <div class="icon-roll-hero__die">
        <span class="icon-roll-hero__die-value">${esc(dieLabel)}</span>
        ${dieSub ? `<span class="icon-roll-hero__die-label">${esc(dieSub)}</span>` : ""}
      </div>
    </header>`;
}

/**
 * The target card. One row per targeted token, each with a ✕ that drops it
 * from the roll (and untargets it on the map).
 *
 * ICON area attacks hit ONE attack target and cover the others with the area
 * effect (p.117), so when several tokens are targeted the rows carry a radio:
 * the picked one gives the Defense to beat and is the only one that rolls
 * Evasion, the others are labelled "area".
 */
function _targetCard(targets, { showDefense = true, pickAttackTarget = false, areaLabel = "", pickedId = "", pickHint = "", evasionToggle = false } = {}) {
  if (!targets.length) {
    return `
      <section class="icon-roll-card icon-roll-card--targets icon-roll-card--empty">
        <h4 class="icon-roll-card__title"><i class='fa-solid fa-crosshairs'></i> Target</h4>
        <p class="icon-roll-card__hint">No token targeted — hover a token and press <kbd>T</kbd> (Shift+T for several), or fill the numbers by hand below.</p>
      </section>`;
  }
  const pick = pickAttackTarget && targets.length > 1;
  const hint = pick
    ? `<small>${areaLabel ? `${esc(areaLabel)} — ` : ""}${esc(pickHint || "pick the attack target, the others only take the area effect")}</small>`
    : (targets.length > 1 && showDefense ? `<small>lowest DEF is used</small>` : "");
  return `
    <section class="icon-roll-card icon-roll-card--targets" data-pick="${pick ? "1" : ""}">
      <h4 class="icon-roll-card__title"><i class='fa-solid fa-crosshairs'></i> Target${targets.length > 1 ? "s" : ""} ${hint}</h4>
      <ul class="icon-roll-targets">
        ${targets.map((t, i) => `
          <li class="icon-roll-target" data-token-id="${esc(t.id)}" data-name="${esc(t.name)}"
              data-defense="${t.defense ?? ""}"
              data-evasion="${t.defense_?.evasion ? (t.defense_.sureEvasion ? "sure" : String(t.defense_.evasionThreshold ?? 4)) : ""}"
              data-ev-threshold="${t.evThreshold ?? 4}" data-ev-sure="${t.evSure ? "1" : ""}">
            ${pick ? `<label class="icon-roll-target__pick" title="Attack target — the one you roll the d20 against">
                        <input type="radio" name="attackTarget" value="${esc(t.id)}"${(targets.some(x => x.id === pickedId) ? t.id === pickedId : i === 0) ? " checked" : ""}>
                      </label>` : ""}
            <img src="${esc(t.img)}" alt="">
            <span class="icon-roll-target__name">${esc(t.name)}</span>
            ${pick ? `<span class="icon-roll-target__role">area</span>` : ""}
            <span class="icon-roll-target__stats">
              ${showDefense && t.defense != null ? `<span title="Defense">DEF <b>${t.defense}</b></span>` : ""}
              <span title="Armor (subtracted when the damage is applied)">ARM <b>${t.armor ?? 0}</b></span>
              ${t.hp != null ? `<span title="Hit points">HP <b>${t.hp}</b>${t.hpMax != null ? `/${t.hpMax}` : ""}</span>` : ""}
              ${t.stance ? `<span class="icon-roll-target__stance" title="Stance(s) the target is in"><i class='fa-solid fa-yin-yang'></i> ${esc(t.stance)}</span>` : ""}
            </span>
            ${t.defChips ? `<span class="icon-roll-target__defs">${t.defChips}</span>` : ""}
            ${evasionToggle ? `<label class="icon-roll-target__evasion" title="Evasion (p.146): roll a d6 when targeted by an attack; on a ${t.evThreshold ?? 4}+ the attack misses. Ticked by itself when the target has Evasion; tick it by hand for conditional evasion (e.g. Curse of Chaos, p.149: evasion against characters 3 or more spaces away).">
                <input type="checkbox" data-evasion-toggle${t.defense_?.evasion ? " checked" : ""}> Defender has evasion</label>` : ""}
            <button type="button" class="icon-btn icon-btn--remove icon-btn--inline icon-roll-target__drop"
                    data-drop="${esc(t.id)}" title="Drop this target from the roll (also untargets it on the map)">✕</button>
          </li>`).join("")}
      </ul>
    </section>`;
}

/**
 * Wire the ✕ buttons and the attack-target radios of a target card.
 * `onChange({ attackTargetId, rows })` runs after every change so the caller
 * can refresh the Defense field and the Evasion note.
 */
function _wireTargetCard(root, onChange) {
  const card = root.querySelector(".icon-roll-card--targets");
  if (!card) return;
  const rows = () => Array.from(card.querySelectorAll(".icon-roll-target"));
  const fire = () => {
    const list = rows();
    const picked = card.querySelector('input[name="attackTarget"]:checked')?.value ?? list[0]?.dataset.tokenId ?? "";
    list.forEach(r => r.classList.toggle("icon-roll-target--attack", r.dataset.tokenId === picked));
    onChange({ attackTargetId: picked, rows: list });
  };
  card.addEventListener("click", ev => {
    const drop = ev.target.closest("[data-drop]");
    if (!drop) return;
    ev.preventDefault();
    const row = drop.closest(".icon-roll-target");
    const wasPicked = row?.querySelector('input[name="attackTarget"]')?.checked;
    // Untarget on the map too, so the roll and the damage card agree with the dialog.
    const token = canvas?.tokens?.get(row?.dataset.tokenId);
    try { token?.setTarget(false, { releaseOthers: false }); }
    catch (err) { console.warn("[ICON | roll-dialogs] could not untarget", err); }
    row?.remove();
    const left = rows();
    if (wasPicked && left.length) {
      const radio = left[0].querySelector('input[name="attackTarget"]');
      if (radio) radio.checked = true;
    }
    if (!left.length) card.classList.add("icon-roll-card--empty");
    fire();
  });
  card.addEventListener("change", ev => { if (ev.target.name === "attackTarget" || ev.target.matches?.("[data-evasion-toggle]")) fire(); });
  fire();
}

function _stepper({ name, label, hint, value, min = 0, max = 9 }) {
  return `
    <div class="icon-roll-stepper">
      <label for="icon-roll-${name}">${label}${hint ? `<small>${hint}</small>` : ""}</label>
      <div class="icon-roll-stepper__ctl">
        <button type="button" class="icon-roll-stepper__btn" data-step="-1" data-for="${name}" aria-label="−1">−</button>
        <input type="number" id="icon-roll-${name}" name="${name}" value="${value}" min="${min}" max="${max}">
        <button type="button" class="icon-roll-stepper__btn" data-step="1" data-for="${name}" aria-label="+1">+</button>
      </div>
    </div>`;
}

/** Wire steppers + a live preview; runs once, on the dialog that owns `rootSel`. */
function _onDialogRender(rootSel, fn) {
  const id = Hooks.on("renderDialogV2", (app, html) => {
    const root = html.querySelector(rootSel);
    if (!root) return;
    Hooks.off("renderDialogV2", id);
    root.querySelectorAll(".icon-roll-stepper__btn").forEach(btn => btn.addEventListener("click", () => {
      const input = root.querySelector(`input[name="${btn.dataset.for}"]`);
      if (!input) return;
      const next = (Number(input.value) || 0) + Number(btn.dataset.step);
      input.value = Math.max(Number(input.min) || 0, Math.min(Number(input.max) || 99, next));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }));
    try { fn(root, app); } catch (err) { console.warn("[ICON | roll-dialogs] preview wiring failed", err); }
  });
}

const DIALOG_OPTS = { classes: ["icon-roll-window"], position: { width: 460 } };

/* -------------------------------------------------- */
/*  Attack roll                                        */
/* -------------------------------------------------- */

/**
 * Attack-roll dialog. `ab` needs { name, cost?, tags? }; `actor` is the
 * attacker. Boons/curses are pre-filled from the attacker's statuses and
 * the elevation difference; Defense from the lowest targeted token.
 * @returns {Promise<{boons:number, curses:number, defense:number|null}|null>}
 */
export async function promptAttackMods(ab, actor, { modsActor = null, area = null } = {}) {
  // `modsActor`: whose statuses give the automatic boons / curses (a summon uses its summoner's).
  // `area`: the area placed for this attack — with one on the table the extra
  // tokens are in the area, not attack targets, so the dialog asks which one
  // the d20 is rolled against (p.117).
  const auto    = getActorStatusMods(modsActor ?? actor);
  // Boons / curses the ability itself carries ("+1 boon" in its tag line, p.12):
  // Strafe Shot, Soul Shot, Apex, Diablo… and the NPC actions tagged boon-N.
  const fromTags = getTagRollMods(ab.tags ?? []);
  const targets = _targets();
  const elev    = _elevationMods(actor, targets);
  const pick    = !!area && targets.length > 1;
  // Attack target: the picked one with an area, otherwise the lowest DEF as before.
  const defenses = targets.map(t => t.defense).filter(d => d != null);
  const autoDefense = pick ? (targets[0]?.defense ?? "") : (defenses.length ? Math.min(...defenses) : "");
  const boons  = (auto.boons  ?? 0) + elev.boons  + fromTags.boons;
  const curses = (auto.curses ?? 0) + elev.curses + fromTags.curses;
  const notes  = [...fromTags.notes, ...(auto.notes ?? []), elev.note].filter(Boolean);

  // The attack's own "true strike" / "unerring" tag counts as much as the status (p.117).
  const ignoredEvasion = ignoresEvasion(actor, ab.tags ?? []);
  // Evasion (p.146): rolled automatically with the attack, one d6 per target
  // that has it — tell the attacker up front. Rebuilt in the browser when the
  // attack target changes, so the chip is a placeholder here.
  // Each evader is { name, sure, threshold }; in the browser the row's
  // "Defender has evasion" box decides who is one (ticked from the status).
  const evaders = (pick ? targets.slice(0, 1) : targets).filter(t => t.defense_?.evasion)
    .map(t => ({ name: t.name, sure: t.defense_.sureEvasion, threshold: t.defense_.evasionThreshold }));
  const evasionNote = (list) => !list.length ? "" : (ignoredEvasion
    ? `${ignoredEvasion}: ignores Evasion (${list.map(t => t.name).join(", ")})`
    : `Evasion: ${list.map(t => t.sure
        ? `${t.name} evades automatically (Rigoletto Aspect, this turn)`
        : `${t.name} rolls 1d6 (${t.threshold}+ = miss)`).join(", ")} before the attack`);
  // Crit / exceed thresholds (crit-thresholds.mjs): 20+ / 15+ unless Soulfire
  // or Arenheir move them; the player can still change them by hand.
  const thr = attackThresholds(actor);
  const evasionChip = `<span class="icon-roll-auto__chip" data-role="evasion" title="Applied automatically from the ability, the statuses and the elevation"${evaders.length ? "" : " hidden"}>${esc(evasionNote(evaders))}</span>`;

  const content = `
    <div class="icon-roll-dialog icon-roll-dialog--attack">
      ${_hero({ actor, kicker: "Attack roll · d20 + boons − curses", title: ab.name ?? "Attack", cost: ab.cost, tags: ab.tags, dieLabel: "d20", dieSub: `crit ${thr.crit}+ · exceed ${thr.exceed}+` })}
      <div class="icon-roll-body">
        ${_targetCard(targets, { pickAttackTarget: pick, areaLabel: area?.label ?? "", evasionToggle: true })}
        <section class="icon-roll-card">
          <h4 class="icon-roll-card__title">Modifiers</h4>
          <div class="icon-roll-auto"${notes.length || evaders.length ? "" : " hidden"}>${notes.map(n => `<span class="icon-roll-auto__chip" title="Applied automatically from the ability, the statuses and the elevation">${esc(n)}</span>`).join("")}${evasionChip}</div>
          <p class="icon-roll-card__hint" data-role="no-mods"${notes.length || evaders.length ? " hidden" : ""}>No automatic modifiers (ability tags, statuses, height).</p>
          <div class="icon-roll-steppers">
            ${_stepper({ name: "boons",  label: "Boons",  hint: "+1d6 each, keep the highest, added to the d20", value: boons })}
            ${_stepper({ name: "curses", label: "Curses", hint: "+1d6 each, keep the highest, subtracted", value: curses })}
            <div class="icon-roll-stepper icon-roll-stepper--defense">
              <label for="icon-roll-defense">Target Defense<small>hit when d20 + mods ≥ DEF</small></label>
              <div class="icon-roll-stepper__ctl">
                <button type="button" class="icon-roll-stepper__btn" data-step="-1" data-for="defense" aria-label="−1">−</button>
                <input type="number" id="icon-roll-defense" name="defense" value="${autoDefense}" min="0" max="30" placeholder="—">
                <button type="button" class="icon-roll-stepper__btn" data-step="1" data-for="defense" aria-label="+1">+</button>
              </div>
            </div>
            ${_stepper({ name: "critAt",   label: "Crit on",   hint: "total needed for a critical hit (normally 20+)", value: thr.crit,   min: 1, max: 30 })}
            ${_stepper({ name: "exceedAt", label: "Exceed on", hint: "total needed to exceed (normally 15+)",           value: thr.exceed, min: 1, max: 30 })}
          </div>
          ${thr.sources.length ? `<p class="icon-roll-card__hint" data-role="thresholds">${thr.sources.map(esc).join(" · ")}</p>` : ""}
          <div class="icon-roll-preview"><span class="icon-roll-preview__formula"></span><span class="icon-roll-preview__note"></span></div>
        </section>
      </div>
    </div>`;

  _onDialogRender(".icon-roll-dialog--attack", root => {
    const f = root.closest("form") ?? root;
    const b = f.querySelector('input[name="boons"]'), c = f.querySelector('input[name="curses"]'), d = f.querySelector('input[name="defense"]');
    const formula = root.querySelector(".icon-roll-preview__formula"), note = root.querySelector(".icon-roll-preview__note");
    const update = () => {
      const net = (Number(b.value) || 0) - (Number(c.value) || 0);
      const def = d.value === "" ? null : Number(d.value);
      let txt = "1d20";
      if (net > 0) txt += ` + best of ${net}d6`;
      if (net < 0) txt += ` − best of ${-net}d6`;
      if (def != null) txt += ` vs DEF ${def}`;
      formula.textContent = txt;
      note.textContent = def != null
        ? (net > 0 ? `Net +${net} boon${net > 1 ? "s" : ""}: you need ${def} or more after the bonus die.` : net < 0 ? `Net ${net} curse${net < -1 ? "s" : ""}: you need ${def} or more after the penalty die.` : `You need ${def} or more on the d20.`)
        : "No Defense: the card shows the total, compare it by hand.";
    };
    [b, c, d].forEach(el => el.addEventListener("input", update));
    // The hero's "crit N+ · exceed N+" follows the threshold steppers.
    const ct = f.querySelector('input[name="critAt"]'), et = f.querySelector('input[name="exceedAt"]');
    const dieSub = root.querySelector(".icon-roll-hero__die-label");
    const updateThr = () => { if (dieSub) dieSub.textContent = `crit ${Number(ct.value) || thr.crit}+ · exceed ${Number(et.value) || thr.exceed}+`; };
    [ct, et].forEach(el => el?.addEventListener("input", updateThr));

    // Dropping a target with ✕ or picking another attack target rewrites the
    // Defense to beat and the Evasion note: only the attack target rolls it.
    let defenseTouched = false;
    d.addEventListener("input", () => { defenseTouched = true; });
    const evasionChipEl = root.querySelector('[data-role="evasion"]');
    _wireTargetCard(root, ({ attackTargetId, rows }) => {
      const attackRow = rows.find(r => r.dataset.tokenId === attackTargetId);
      if (!defenseTouched) {
        const defs = (pick ? [attackRow] : rows).map(r => r?.dataset.defense).filter(v => v);
        d.value = defs.length ? Math.min(...defs.map(Number)) : "";
      }
      if (evasionChipEl) {
        const evading = (pick ? [attackRow] : rows).filter(r => r?.querySelector("[data-evasion-toggle]")?.checked);
        const list = evading.map(r => ({ name: r.dataset.name, sure: r.dataset.evSure === "1", threshold: Number(r.dataset.evThreshold) || 4 }));
        const text = evasionNote(list);
        evasionChipEl.hidden = !text;
        evasionChipEl.textContent = text ? `${text}` : "";
        // The chips box may have started empty (no statuses, no evader).
        const box = evasionChipEl.parentElement;
        const anyChip = !!text || !!box?.querySelector(".icon-roll-auto__chip:not([hidden]):not([data-role='evasion'])");
        if (box) box.hidden = !anyChip;
        const noMods = root.querySelector('[data-role="no-mods"]');
        if (noMods) noMods.hidden = anyChip;
      }
      update();
    });
    update();
  });

  try {
    return await foundry.applications.api.DialogV2.prompt({
      ...DIALOG_OPTS,
      window: { title: `Attack — ${ab.name ?? "Attack"}` },
      content,
      ok: {
        label: "Roll Attack", icon: "fa-solid fa-hand-fist",
        callback: (_e, button) => {
          const f = button.form;
          const defenseVal = f.elements.defense?.value;
          // Targets still listed when the dialog was confirmed (the ✕ removes
          // the row and untargets the token) and which of them takes the attack.
          const rows = Array.from(f.querySelectorAll(".icon-roll-target"));
          const attackTargetId = f.querySelector('input[name="attackTarget"]:checked')?.value
                              ?? rows[0]?.dataset.tokenId ?? "";
          // Remembered only when there was a choice to make (an area on the table).
          if (f.querySelector('input[name="attackTarget"]')) _lastAttackTarget.set(_attackKey(actor, ab), attackTargetId);
          else _lastAttackTarget.delete(_attackKey(actor, ab));
          return {
            boons:   Math.max(0, Number(f.elements.boons?.value)  || 0),
            curses:  Math.max(0, Number(f.elements.curses?.value) || 0),
            defense: defenseVal !== "" && defenseVal != null ? Number(defenseVal) : null,
            critAt:   Math.max(1, Number(f.elements.critAt?.value)   || thr.crit),
            exceedAt: Math.max(1, Number(f.elements.exceedAt?.value) || thr.exceed),
            attackTargetId,
            targetIds: rows.map(r => r.dataset.tokenId),
            // "Defender has evasion" per target token: rollEvasion uses it in
            // place of the Evasion status (conditional evasion, p.149).
            evasion: Object.fromEntries(rows.filter(r => r.querySelector("[data-evasion-toggle]"))
              .map(r => [r.dataset.tokenId, !!r.querySelector("[data-evasion-toggle]").checked])),
          };
        },
      },
      rejectClose: false,
    });
  } catch (err) { _log("attack dialog closed", err); return null; }
}

/**
 * Remember (or forget, with "") the attack target of an attack that had no
 * attack dialog (an auto-hit), so the damage dialog starts on it as well.
 */
export function rememberAttackTarget(actor, ab, tokenId) {
  if (tokenId) _lastAttackTarget.set(_attackKey(actor, ab), tokenId);
  else _lastAttackTarget.delete(_attackKey(actor, ab));
}

/** The attack target last picked for this attacker and ability ("" when none). */
export function rememberedAttackTarget(actor, ab) {
  return _lastAttackTarget.get(_attackKey(actor, ab)) ?? "";
}

/**
 * An auto-hit area attack has no attack dialog, but still one attack target
 * (p.97: "For a character in the attack space … apply the attack part of your
 * ability instead of the area effect"). Asked here when the area does not fix
 * it (a Line / Arc: "the attack space is any character in the area"), with the
 * user's current targets. Remembers the pick for the damage dialog.
 * @returns {Promise<string|null>} token id, "" when no choice was needed, null when closed
 */
export async function promptAttackTarget(ab, actor, { areaLabel = "" } = {}) {
  const targets = _targets();
  if (targets.length < 2) return "";
  const content = `
    <div class="icon-roll-dialog icon-roll-dialog--pick-target">
      ${_hero({ actor, kicker: "Auto-hit · attack target", title: ab.name ?? "Attack", cost: ab.cost, tags: ab.tags, dieLabel: "—", dieSub: "no attack roll" })}
      <div class="icon-roll-body">
        ${_targetCard(targets, { showDefense: false, pickAttackTarget: true, areaLabel, pickedId: rememberedAttackTarget(actor, ab),
             pickHint: "pick the attack target (attack part of the ability), the others only take the area effect" })}
      </div>
    </div>`;
  _onDialogRender(".icon-roll-dialog--pick-target", root => _wireTargetCard(root, () => {}));
  try {
    const picked = await foundry.applications.api.DialogV2.prompt({
      ...DIALOG_OPTS,
      window: { title: `Attack target — ${ab.name ?? "Attack"}` },
      content,
      ok: {
        label: "Confirm", icon: "fa-solid fa-crosshairs",
        callback: (_e, button) => {
          const f = button.form;
          return f.querySelector('input[name="attackTarget"]:checked')?.value
              ?? f.querySelector(".icon-roll-target")?.dataset.tokenId ?? "";
        },
      },
      rejectClose: false,
    });
    if (picked == null) return null;
    rememberAttackTarget(actor, ab, picked);
    return picked;
  } catch (err) { _log("attack target dialog closed", err); return null; }
}

/* -------------------------------------------------- */
/*  Damage roll                                        */
/* -------------------------------------------------- */

/**
 * Damage-roll dialog. `ab` needs { name, parsed, parsedCombo?, isAutoHit? };
 * `combat` needs { damagedie, fray }; `opts.actor` (the attacker) enables the
 * Hatred hint, `opts.comboDefault` pre-ticks the combo version, `opts.free`
 * hides the outcome choice and keeps only the free "Other" panel, with a
 * source label for the card (Damage Utility on the PC sheet).
 * @returns {Promise<object|null>}  see file header
 */
export async function promptDamageMods(ab, combat, { comboDefault = false, actor = null, free = false } = {}) {
  const p   = ab.parsed ?? { hit: {}, miss: {}, area: {} };
  const die = combat?.damagedie ?? "d6";
  const fray = Number(combat?.fray ?? 0);
  const targets = _targets();
  const hatred  = actor ? hatredDamageHint(actor) : { active: false };
  // Cover / Resistance are halved automatically when the target presses Apply
  // (p.92: "determined when and where damage is applied"); the checkbox below
  // is for targets without the status. Ticking it marks the roll as already
  // halved so Apply won't halve twice.
  const autoHalf = targets.filter(t => t.defense_?.cover || t.defense_?.resistance).map(t => t.name);
  const dodgers  = targets.filter(t => t.defense_?.dodge).map(t => t.name);
  // True Strike / Unerring from the attack's tags or the attacker's status:
  // start ticked, so Apply ignores Dodge / Cover / Aetherwall without the
  // player having to remember (the checkbox can still be unticked).
  const ignores = attackIgnores(actor, ab.tags ?? []);
  const whyTick = (r, name) => r === "tag" ? "from the ability's tag" : r === "status" ? `from your ${name} status` : "";

  // Finishing Blow (Vagabond): the block triggers when the ability targets a
  // bloodied foe — at or under 50% HP (p.104). When its text grants bonus
  // damage, that is one extra die kept at the highest (p.117), so the dialog
  // opens with the die already in and says where it came from.
  const bloodied = targets.filter(t => t.hp != null && t.hpMax > 0 && t.hp <= t.hpMax / 2);
  const fbBlock  = (ab.blocks ?? []).find(b => /finishing blow/i.test(String(b.label ?? "")));
  const fbText   = String(fbBlock?.text ?? "").replace(/<[^>]*>/g, " ");
  const fbBonus  = fbBlock && bloodied.length && /bonus damage/i.test(fbText) ? 1 : 0;
  const fbNote   = !fbBlock || !bloodied.length ? ""
    : `Finishing Blow: ${bloodied.map(t => t.name).join(", ")} ${bloodied.length > 1 ? "are" : "is"} bloodied${fbBonus ? " — +1 bonus die added" : " — the block triggers"}`;

  // The armed Infuse version's own bonus damage (MAGNACRYO: "bonus damage for
  // every two aether spent", see infusedAbilityDamage): one die per instance.
  const infBonus = Math.max(0, Number(p.bonusDice) || 0);
  const infNote  = infBonus ? `${p.version?.name || "Infuse"}: +${infBonus} bonus ${infBonus > 1 ? "dice" : "die"} from the Aether spent` : "";

  const chunkFormula = (c) => {
    const parts = [];
    if (c?.mult > 0) parts.push(`${c.mult}[${die}]`);
    if (c?.fray)     parts.push(`fray ${fray}`);
    if (c?.flat)     parts.push(`${c.flat} flat`);
    return parts.join(" + ");
  };
  // Damage lines read from the selected talent / unlocked mastery (ability-damage.mjs).
  // Plus the combo version's own extra damage (Succubus's 3 damage to the
  // marked characters, p.164), listed as "Combo — <name>".
  // The combo's lines are shown only while the combo version is rolled.
  const baseExtras = Array.isArray(p.extras) ? p.extras : [];
  const extras = [...baseExtras, ...(ab.parsedCombo?.comboExtras ?? [])];
  const isComboExtra = (i) => i >= baseExtras.length;
  // ...and a base block the combo replaces ("Instead of the mark") is hidden then.
  const replaced = ab.parsedCombo?.replacesBlocks ?? [];
  const isReplaced = (i) => !isComboExtra(i) && replaced.includes(String(extras[i].source ?? "").split(" — ")[0].toLowerCase());
  const typeWord = (t) => t === "divine" ? " divine" : t === "piercing" ? " piercing" : "";
  // "Hit (no damage)" only where a hit can happen: an attack (its target may
  // take only the hit's statuses while the rest of the area takes damage), or
  // an ability with no other damage to offer. A non-attack whose damage is
  // all in its Area effect (Dragon Dive p.218, Bifröst p.226) opens on Area.
  const deals = (c) => !!(c?.mult > 0 || c?.flat > 0 || c?.fray);
  const showHit = deals(p.hit) || deals(ab.parsedCombo?.hit) || !!(ab.isAttack ?? p.isAttack)
               || !(deals(p.miss) || deals(p.area));
  const outcomes = [
    { value: "hit",  label: "Hit",  formula: chunkFormula(p.hit) || "no damage", show: showHit },
    { value: "crit", label: "Crit", formula: p.hit?.mult > 0 ? `${p.hit.mult + 1}[${die}]${p.hit.fray ? ` + fray ${fray}` : ""}` : "", show: p.hit?.mult > 0 },
    { value: "miss", label: "Miss", formula: chunkFormula(p.miss), show: !!(p.miss?.fray || p.miss?.flat > 0 || p.miss?.mult > 0) },
    { value: "area", label: "Area", formula: chunkFormula(p.area), show: !!(p.area?.mult > 0 || p.area?.flat > 0 || p.area?.fray) },
    // Damage the outcomes above don't cover — a mastery's or talent's own
    // damage (Harvest Moon p.186, Dark Wind Devil Blade p.128) or anything
    // else the table needs: dice / fray / fixed amount typed in the panel below.
    { value: "other", label: "Other", formula: extras.length ? "mastery / talent / free" : "free amount", show: true },
  ].filter(o => o.show && (!free || o.value === "other"));

  // Area attack (p.117): only the token in the attack space takes the hit /
  // miss damage, the rest of the area takes the area effect. Several targets
  // on an ability with an area → the dialog asks which one was attacked,
  // starting on the token picked in the attack dialog.
  const remembered = _lastAttackTarget.get(_attackKey(actor, ab)) ?? "";
  const areaTag = areaFromTags(ab.tags ?? []);
  const hasArea = (!!areaTag && areaTag.kind !== "aura") || !!(p.area?.mult > 0 || p.area?.flat > 0 || p.area?.fray)
               || targets.some(t => t.id === remembered);
  const pickTarget = hasArea && targets.length > 1;
  const areaDealsDamage = (c) => !!(c?.area?.mult > 0 || c?.area?.flat > 0 || c?.area?.fray);
  const pickHint = areaDealsDamage(p)
    ? "Hit / Crit / Miss go to the attack target, the others get a separate Area roll"
    : "Hit / Crit / Miss go to the attack target only (the area deals no damage)";

  const pc = ab.parsedCombo;
  const comboFormula = pc?.dealsDamage ? (chunkFormula(pc.hit) || chunkFormula(pc.area) || "see card") : null;

  const content = `
    <div class="icon-roll-dialog icon-roll-dialog--damage">
      ${_hero({ actor, kicker: free ? "Free damage · no ability" : `Damage roll${ab.isAutoHit ? " · auto-hit" : ""}`, title: ab.name ?? "Damage", cost: ab.cost, tags: ab.tags, dieLabel: `[D] ${die}`, dieSub: `fray ${fray}` })}
      <div class="icon-roll-body">
        ${_targetCard(targets, { showDefense: false, pickAttackTarget: pickTarget, areaLabel: areaTag?.label ?? "", pickedId: remembered, pickHint })}
        <section class="icon-roll-card">
          <h4 class="icon-roll-card__title">${free ? "Damage" : "Outcome"}</h4>
          ${free ? `<input type="radio" name="outcome" value="other" checked hidden>` : `<div class="icon-roll-seg">
            ${outcomes.map((o, i) => `
              <label class="icon-roll-seg__opt">
                <input type="radio" name="outcome" value="${o.value}" ${i === 0 ? "checked" : ""}>
                <span class="icon-roll-seg__label">${o.label}<small>${esc(o.formula)}</small></span>
              </label>`).join("")}
          </div>`}
          ${comboFormula ? `
            <label class="icon-roll-chip icon-roll-chip--combo" title="Roll the combo version's damage instead of the base ability's.">
              <input type="checkbox" name="useCombo" ${comboDefault ? "checked" : ""}><span><i class='fa-solid fa-bolt'></i> Combo version <small>${esc(comboFormula)}</small></span>
            </label>` : ""}
          ${ab.reroll ? `
            <label class="icon-roll-chip" title="Ticked: the same use rolled again, the infused version stays and no Aether is spent. Unticked: a new use of the ability, the base version (the Aether pays for one use, p.204). Changing it reopens the dialog on that version.">
              <input type="checkbox" name="sameUse" ${ab.reroll.sameUse ? "checked" : ""}><span><i class='fa-solid fa-rotate'></i> Reroll (same use) <small>${ab.reroll.sameUse ? "infused version" : "new use: base version"}</small></span>
            </label>` : ""}
          <div class="icon-roll-other" data-other-panel hidden>
            ${free ? `<label class="icon-roll-other__label">Source <small>optional, shown on the card</small>
              <input type="text" name="otherLabel" placeholder="Counter, hazard, mastery…" maxlength="60">
            </label>` : ""}
            ${extras.length ? `<div class="icon-roll-chips" data-other-chips>
              ${extras.map((x, i) => `
                <label class="icon-roll-chip" title="${esc(`${x.source}: ${x.text}`)}"${isComboExtra(i) ? " data-combo-chip" : isReplaced(i) ? " data-combo-replaced" : ""}>
                  <input type="radio" name="otherPick" value="${i}"><span>${esc(x.source)} <small>${esc(chunkFormula(x))}${typeWord(x.type)}${x.unerring ? " unerring" : ""}${x.times > 1 ? ` ×${x.times}` : ""}${x.area ? " · area" : ""}</small></span>
                </label>`).join("")}
            </div>` : ""}
            <div class="icon-roll-steppers">
              ${_stepper({ name: "otherDice", label: "Dice", hint: `[D] rolled for this damage ([D] = ${die})`, value: 0, max: 5 })}
              ${_stepper({ name: "otherFlat", label: "Fixed damage", hint: "a fixed amount (\"2 divine damage\")", value: 0, max: 30 })}
            </div>
            <div class="icon-roll-chips">
              <label class="icon-roll-chip"><input type="checkbox" name="otherFray"><span>+ Fray <small>${fray}</small></span></label>
              <label class="icon-roll-chip" title="Area effect damage: Dodge makes the target immune to it (p.144) unless True Strike is ticked."><input type="checkbox" name="otherArea"><span>Area effect <small>Dodge applies</small></span></label>
            </div>
          </div>
        </section>
        <section class="icon-roll-card">
          <h4 class="icon-roll-card__title">Modifiers</h4>
          <div class="icon-roll-steppers">
            ${_stepper({ name: "bonusDice", label: "Bonus dice", hint: "extra [D] added to the pool, keep the highest N", value: fbBonus + infBonus, max: 5 })}
            ${_stepper({ name: "flatBonus", label: "Flat damage", hint: "a fixed amount added after the dice (Harden, blessings, one-off effects)", value: 0, max: 30 })}
            ${_stepper({ name: "instances", label: "Instances ×N", hint: "the same damage dealt N separate times (\"3 damage, three times\", p.92): armor, vulnerable and weakened count on each", value: Math.max(1, p.hit?.times ?? 1), min: 1, max: 10 })}
          </div>
          <div class="icon-roll-chips">
            <label class="icon-roll-chip"><input type="checkbox" name="vulnerable"><span>Vulnerable <small>+1</small></span></label>
            <label class="icon-roll-chip" title="${autoHalf.length ? `Applied automatically on Apply for ${esc(autoHalf.join(", "))} — tick only for a target WITHOUT the status` : "Half damage. Tick for a target in cover / with resistance that has no status set; otherwise it is applied automatically on Apply"}"><input type="checkbox" name="resistance"><span>Resistance / Cover <small>½${autoHalf.length ? " · auto on Apply" : ""}</small></span></label>
            <label class="icon-roll-chip"><input type="checkbox" name="weakened"><span>Weakened <small>−2</small></span></label>
            <label class="icon-roll-chip icon-roll-chip--type" title="Pierce (p.104): damage cannot be reduced by armor or weakened."><input type="checkbox" name="pierce"><span>Pierce <small>no armor</small></span></label>
            <label class="icon-roll-chip icon-roll-chip--type" title="Divine (p.104): damage cannot be reduced, mitigated or negated in any way except immunity — ignores armor, weakened, resistance and defiance, and bypasses vigor."><input type="checkbox" name="divine"><span>Divine <small>nothing reduces it</small></span></label>
            <label class="icon-roll-chip icon-roll-chip--type" title="True Strike (p.104): ignores dodge, blind, evasion and stealth. On the damage card it stops Dodge cancelling a Miss / Area result."><input type="checkbox" name="trueStrike" ${ignores.trueStrike ? "checked" : ""}><span>True Strike <small>${ignores.trueStrike ? esc(whyTick(ignores.trueStrike, "True Strike")) : "ignores Dodge"}</small></span></label>
            <label class="icon-roll-chip icon-roll-chip--type" title="Unerring (p.104): ignores cover and aetherwall. On Apply neither the target's Cover nor its Aetherwall halves the damage."><input type="checkbox" name="unerring" ${ignores.unerring ? "checked" : ""}><span>Unerring <small>${ignores.unerring ? esc(whyTick(ignores.unerring, "Unerring")) : "ignores Cover / Aetherwall"}</small></span></label>
            ${hatred.active ? `<label class="icon-roll-chip icon-roll-chip--hatred" title="${esc(hatred.note)}"><input type="checkbox" name="hatred" ${hatred.halve ? "checked" : ""}><span>Hatred of ${esc(hatred.name)} <small>½ vs others</small></span></label>` : ""}
          </div>
          ${hatred.active || autoHalf.length || dodgers.length || fbNote || infNote ? `<div class="icon-roll-auto">
            ${infNote ? `<span class="icon-roll-auto__chip" title="Bonus damage: roll one more [D] for each instance and keep the highest (p.102).">${esc(infNote)}</span>` : ""}
            ${fbNote ? `<span class="icon-roll-auto__chip" title="Finishing Blow (Vagabond): triggers when the attack targets a Bloodied foe — at or under 50% HP (p.104).">${esc(fbNote)}</span>` : ""}
            ${hatred.active ? `<span class="icon-roll-auto__chip"><i class='fa-solid fa-triangle-exclamation'></i> ${esc(hatred.note)}</span>` : ""}
            ${autoHalf.length ? `<span class="icon-roll-auto__chip" title="Cover / Resistance: half damage, applied when the damage is applied (p.92)">½ on Apply: ${esc(autoHalf.join(", "))} (Cover / Resistance)</span>` : ""}
            ${dodgers.length ? `<span class="icon-roll-auto__chip" data-dodge-note title="Dodge: immune to damage from missed attacks, successful saves and area effects (p.144)">Dodge: ${esc(dodgers.join(", "))} — no damage from Miss / Area</span>` : ""}
          </div>` : ""}
          <div class="icon-roll-preview"><span class="icon-roll-preview__formula"></span><span class="icon-roll-preview__note">Armor, Cover and Resistance are applied when the target presses Apply.</span></div>
        </section>
      </div>
    </div>`;

  _onDialogRender(".icon-roll-dialog--damage", root => {
    const f = root.closest("form") ?? root;
    const formula = root.querySelector(".icon-roll-preview__formula");
    const otherPanel = root.querySelector("[data-other-panel]");
    // "Other": the chunk is whatever the panel says (dice / fixed / fray).
    const otherChunk = () => ({
      mult: Math.max(0, Number(f.elements.otherDice?.value) || 0),
      flat: Math.max(0, Number(f.elements.otherFlat?.value) || 0),
      fray: !!f.elements.otherFray?.checked,
      area: !!f.elements.otherArea?.checked,
    });
    const update = () => {
      const outcome = f.querySelector('input[name="outcome"]:checked')?.value ?? "hit";
      const useCombo = !!f.elements.useCombo?.checked && !!pc;
      const src = useCombo ? pc : p;
      const chunk = outcome === "other" ? otherChunk()
                  : outcome === "miss" ? src.miss : outcome === "area" ? src.area : src.hit;
      if (otherPanel) otherPanel.hidden = outcome !== "other";
      let mult = chunk?.mult ?? 0; if (outcome === "crit") mult = Math.max(1, mult) + 1;
      const bonus = Number(f.elements.bonusDice?.value) || 0;
      const parts = [];
      if (mult > 0) parts.push(bonus > 0 ? `roll ${mult + bonus}${die}, keep ${mult}` : `${mult}[${die}]`);
      else if (bonus > 0) parts.push(`best of ${bonus}${die}`);
      if (chunk?.fray) parts.push(`fray ${fray}`);
      if (chunk?.flat) parts.push(`${chunk.flat}`);
      const flat = Number(f.elements.flatBonus?.value) || 0;
      if (flat > 0) parts.push(`${flat} flat`);
      let txt = parts.join(" + ") || "no damage";
      const tail = [];
      if (f.elements.vulnerable?.checked) tail.push("+1 vulnerable");
      if (f.elements.resistance?.checked) tail.push("½ resistance");
      if (f.elements.hatred?.checked)     tail.push("½ hatred");
      if (f.elements.weakened?.checked)   tail.push("−2 weakened");
      if (f.elements.divine?.checked)      tail.push("divine — nothing reduces it");
      else if (f.elements.pierce?.checked) tail.push("pierce — ignores armor");
      if (tail.length) txt += `  →  ${tail.join(", ")}`;
      // Repeated damage (p.92): rolled once, dealt N times; the modifiers
      // above count once per instance (vulnerable p.109, armor / weakened p.92).
      const times = Math.max(1, Number(f.elements.instances?.value) || 1);
      if (times > 1) txt = `(${txt}) × ${times} instances`;
      formula.textContent = txt;
      // The Dodge reminder only matters for the outcomes Dodge cancels (Miss / Area).
      const dodgeNote = root.querySelector("[data-dodge-note]");
      if (dodgeNote) dodgeNote.hidden = !(outcome === "miss" || outcome === "area" || (outcome === "other" && chunk.area));
    };
    // Divine / Pierce follow the damage type written in the text of the
    // chosen outcome ("take 1 divine damage", Gentleness p.179): set when the
    // dialog opens and when the outcome or the combo version changes. A
    // manual tick stays until one of those changes.
    const syncType = () => {
      const outcome = f.querySelector('input[name="outcome"]:checked')?.value ?? "hit";
      const src = (!!f.elements.useCombo?.checked && !!pc) ? pc : p;
      const picked = extras[Number(f.querySelector('input[name="otherPick"]:checked')?.value)];
      const type = (outcome === "other" ? picked
                  : outcome === "miss" ? src.miss : outcome === "area" ? src.area : src.hit)?.type ?? "";
      if (f.elements.divine) f.elements.divine.checked = type === "divine";
      if (f.elements.pierce) f.elements.pierce.checked = type === "piercing";
      // "2 unerring damage" (Astral Chain's Mark p.156) ticks Unerring; the
      // other outcomes go back to the tag / status default.
      if (f.elements.unerring) f.elements.unerring.checked = !!ignores.unerring || (outcome === "other" && !!picked?.unerring);
      // Same for the number of instances written in the text ("three times").
      const chunk = outcome === "other" ? picked
                  : outcome === "miss" ? src.miss : outcome === "area" ? src.area : src.hit;
      if (f.elements.instances) f.elements.instances.value = Math.max(1, chunk?.times ?? 1);
    };
    // A mastery / talent line under "Other" fills the panel with its amount,
    // type and area; the fields stay editable afterwards.
    const fillOther = () => {
      const x = extras[Number(f.querySelector('input[name="otherPick"]:checked')?.value)];
      if (!x) return;
      f.elements.otherDice.value = x.mult || 0;
      f.elements.otherFlat.value = x.flat || 0;
      f.elements.otherFray.checked = !!x.fray;
      f.elements.otherArea.checked = !!x.area;
    };
    // The combo's own lines ("Combo — Succubus") only while the combo version
    // is rolled: the "Combo version" box, or the combo state when there is no box.
    const syncComboChips = () => {
      const on = f.elements.useCombo ? !!f.elements.useCombo.checked : comboDefault;
      // style.display, not `hidden`: the chip's CSS display would override it.
      // The base block the combo replaces ("Instead of the mark") the other way round.
      root.querySelectorAll("[data-combo-chip], [data-combo-replaced]").forEach(l => {
        const show = l.hasAttribute("data-combo-chip") ? on : !on;
        l.style.display = show ? "" : "none";
        const r = l.querySelector('input[name="otherPick"]');
        if (!show && r?.checked) r.checked = false;
      });
      const box = root.querySelector("[data-other-chips]");
      if (box) box.style.display = Array.from(box.children).some(l => l.style.display !== "none") ? "" : "none";
    };
    f.elements.useCombo?.addEventListener("change", syncComboChips);
    f.querySelectorAll('input[name="otherPick"]').forEach(el => el.addEventListener("change", fillOther));
    f.querySelectorAll('input[name="outcome"], input[name="useCombo"], input[name="otherPick"]').forEach(el => el.addEventListener("change", syncType));
    f.querySelectorAll('input').forEach(el => el.addEventListener("input", update));
    f.querySelectorAll('input').forEach(el => el.addEventListener("change", update));
    // ✕ drops a target from this roll (and untargets it on the map); the
    // radios move the attack target. Neither changes the formula.
    _wireTargetCard(root, () => {});
    // "Reroll (same use)" changes which version is rolled: the caller reopens the dialog on it.
    f.elements.sameUse?.addEventListener("change", () => {
      f.dataset.rerollSwitch = "1";
      f.querySelector('button[data-action="ok"]')?.click();
    });
    syncComboChips();
    syncType();
    update();
  });

  try {
    return await foundry.applications.api.DialogV2.prompt({
      ...DIALOG_OPTS,
      window: { title: `Damage — ${ab.name ?? "Damage"}` },
      content,
      ok: {
        label: "Roll Damage", icon: "fa-solid fa-burst",
        callback: (_e, button) => {
          const f = button.form;
          // Only the rows still listed get an Apply button on the card.
          const rows = Array.from(f.querySelectorAll(".icon-roll-target"));
          const targetIds = rows.map(r => r.dataset.tokenId);
          const attackTargetId = f.querySelector('input[name="attackTarget"]:checked')?.value ?? "";
          const outcome = f.querySelector('input[name="outcome"]:checked')?.value ?? "hit";
          const picked = extras[Number(f.querySelector('input[name="otherPick"]:checked')?.value)];
          return {
            outcome,
            // "Other" outcome: the damage typed in its panel, and a label for the card.
            other: outcome !== "other" ? null : {
              mult:  Math.max(0, Number(f.elements.otherDice?.value) || 0),
              flat:  Math.max(0, Number(f.elements.otherFlat?.value) || 0),
              fray:  !!f.elements.otherFray?.checked,
              area:  !!f.elements.otherArea?.checked,
              label: picked ? picked.source : String(f.elements.otherLabel?.value ?? "").trim(),
            },
            targetName: rows.map(r => r.dataset.name).join(", "),
            targetIds,
            attackTargetId,
            bonusDice:  Math.max(0, Number(f.elements.bonusDice?.value) || 0),
            vulnerable: !!f.elements.vulnerable?.checked,
            resistance: !!f.elements.resistance?.checked,
            weakened:   !!f.elements.weakened?.checked,
            hatred:     !!f.elements.hatred?.checked,
            useCombo:   !!f.elements.useCombo?.checked,
            flatBonus:  Math.max(0, Number(f.elements.flatBonus?.value) || 0),
            instances:  Math.min(10, Math.max(1, Math.floor(Number(f.elements.instances?.value) || 1))),
            pierce:     !!f.elements.pierce?.checked,
            divine:     !!f.elements.divine?.checked,
            trueStrike: !!f.elements.trueStrike?.checked,
            unerring:   !!f.elements.unerring?.checked,
            sameUse:      !!f.elements.sameUse?.checked,
            rerollSwitch: f.dataset.rerollSwitch === "1",
          };
        },
      },
      rejectClose: false,
    });
  } catch (err) { _log("damage dialog closed", err); return null; }
}

/* -------------------------------------------------- */
/*  Gamble                                             */
/* -------------------------------------------------- */

/**
 * Gamble dialog (p.148: "Roll 1d6, then trigger an effect on a certain result
 * or higher"). Extra dice can be added or taken away on the spot — Riposte's
 * Dire Parry rolls one more d6 per Vigilance charge spent, its Talent I one
 * more for sacrifice 2 (p.142) — and only the HIGHEST die counts, as with
 * Vigilance (p.105). The result can also be set instead of rolled: the Fool's
 * Stacked Die makes it 6 (p.149); Silver Rabbit III, the Golden Mask and the
 * Seer's Bend Fate let a number of your choice stand (pp.199, 250, 340).
 *
 * `vigilance`: charges the actor holds when the ability spends them on the
 * gamble (0 = no field). `stacked`: Stacked Dice held (0 = no option).
 * @returns {Promise<{dice:number, vigilance:number, mode:"roll"|"stacked"|"set", value:number}|null>}
 */
export async function promptGamble(ab, actor, { vigilance = 0, stacked = 0 } = {}) {
  const content = `
    <div class="icon-roll-dialog icon-roll-dialog--gamble">
      ${_hero({ actor, kicker: "Gamble · only the highest die counts", title: ab.name ?? "Gamble", cost: ab.cost, tags: ab.tags, dieLabel: "d6", dieSub: "highest die" })}
      <div class="icon-roll-body">
        <section class="icon-roll-card">
          <h4 class="icon-roll-card__title">Dice</h4>
          <div class="icon-roll-steppers">
            ${_stepper({ name: "dice", label: "Dice", hint: "1d6 by default; add the extra dice the ability, a talent or a relic gives you (sacrifice 2, …), or take some away", value: 1, min: 1, max: 10 })}
            ${vigilance > 0 ? _stepper({ name: "vigilance", label: "Vigilance charges spent", hint: `+1d6 each, taken off your tracker (you hold ${vigilance})`, value: 0, min: 0, max: vigilance }) : ""}
          </div>
        </section>
        <section class="icon-roll-card">
          <h4 class="icon-roll-card__title">Result</h4>
          <div class="icon-roll-seg">
            <label class="icon-roll-seg__opt">
              <input type="radio" name="mode" value="roll" checked>
              <span class="icon-roll-seg__label">Roll<small>keep the highest</small></span>
            </label>
            ${stacked > 0 ? `
            <label class="icon-roll-seg__opt" title="Stack Dice (Fool, p.149): the gamble result becomes 6, consuming the die">
              <input type="radio" name="mode" value="stacked">
              <span class="icon-roll-seg__label">Stacked Die<small>result 6 · spends 1 of ${stacked}</small></span>
            </label>` : ""}
            <label class="icon-roll-seg__opt" title="An effect that lets you pick the number: Silver Rabbit III (any number from 1 to 6), Golden Mask, Bend Fate (choose any result)">
              <input type="radio" name="mode" value="set">
              <span class="icon-roll-seg__label">Set the number<small>no roll</small></span>
            </label>
          </div>
          <div class="icon-roll-steppers" data-role="set-value" style="display:none">
            ${_stepper({ name: "setValue", label: "Number", hint: "the gamble result you choose", value: 6, min: 1, max: 6 })}
          </div>
          <div class="icon-roll-preview"><span class="icon-roll-preview__formula"></span><span class="icon-roll-preview__note"></span></div>
        </section>
      </div>
    </div>`;

  _onDialogRender(".icon-roll-dialog--gamble", root => {
    const f = root.closest("form") ?? root;
    const formula = root.querySelector(".icon-roll-preview__formula"), note = root.querySelector(".icon-roll-preview__note");
    const setBox = root.querySelector('[data-role="set-value"]');
    const update = () => {
      const mode = f.querySelector('input[name="mode"]:checked')?.value ?? "roll";
      const n = Math.max(1, Number(f.elements.dice?.value) || 1) + Math.max(0, Number(f.elements.vigilance?.value) || 0);
      setBox.style.display = mode === "set" ? "" : "none";
      if (mode === "stacked") { formula.textContent = "Result 6"; note.textContent = "No roll: the Stacked Die makes it 6."; }
      else if (mode === "set") { formula.textContent = `Result ${Number(f.elements.setValue?.value) || 6}`; note.textContent = "No roll: the number you chose stands."; }
      else {
        formula.textContent = n > 1 ? `${n}d6, keep the highest` : "1d6";
        note.textContent = n > 1 ? "The dice don't add up: only the highest one is the gamble result." : "";
      }
    };
    f.addEventListener("input", update);
    f.addEventListener("change", update);
    update();
  });

  try {
    return await foundry.applications.api.DialogV2.prompt({
      ...DIALOG_OPTS,
      window: { title: `Gamble — ${ab.name ?? "Gamble"}` },
      content,
      ok: {
        label: "Gamble", icon: "fa-solid fa-dice",
        callback: (_e, button) => {
          const f = button.form;
          const mode = f.querySelector('input[name="mode"]:checked')?.value ?? "roll";
          return {
            dice:      Math.min(10, Math.max(1, Math.floor(Number(f.elements.dice?.value) || 1))),
            vigilance: Math.min(vigilance, Math.max(0, Math.floor(Number(f.elements.vigilance?.value) || 0))),
            mode:      ["roll", "stacked", "set"].includes(mode) ? mode : "roll",
            value:     Math.min(6, Math.max(1, Math.floor(Number(f.elements.setValue?.value) || 6))),
          };
        },
      },
      rejectClose: false,
    });
  } catch (err) { _log("gamble dialog closed", err); return null; }
}
