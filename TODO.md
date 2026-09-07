# TODO — backlog feedback Maar (compilato 7 settembre 2026)

Fonte: messaggi Discord di Maar del 5–7 settembre 2026. Questo file è la **fonte di verità** tra una
sessione e l'altra: ogni sessione fa un blocco, spunta le voci, aggiorna il CHANGELOG e committa.

Come lavorare una sessione:
1. Sessione nuova (`/clear`), prompt: "Leggi TODO.md e fai la sessione N".
2. Fare SOLO il blocco indicato. Se qualcosa esce dal blocco → aggiungerlo qui, non farlo.
3. Fine sessione: **compilare `PLAYTEST.md`** con i test del blocco (NON eseguirli: il playtest è una sessione
   separata con Claude in Chrome), voce in CHANGELOG.md, deploy, commit, spuntare le caselle qui.
   Ogni blocco qui sotto sottintende la voce "[ ] compilare PLAYTEST.md".

Legenda difficoltà: S = poche righe · M = mezza sessione · L = una sessione · XL = più sessioni.

---

## ⚠️ Già fatto nel round 4 (commit e87b2d8, 30 agosto) — da VERIFICARE con Maar

Maar li elenca ancora come bug il 5 settembre: o usa una build vecchia, o il fix non copre il suo caso.
Prima di riaprirli, chiedere a Maar di aggiornare e riprovare.

- [ ] Dropdown delle schede PG che si chiudono a ogni fine turno (fix: stato `<details>` preservato)
- [ ] Interrupt NPC non stampabili in chat (fix: bottone 💬 sugli interrupt Foe/Legend)
- [ ] Burden/Ambition non avanzano cliccando le caselle o +1 (fix: lookup block-param nel `#each`)
- [ ] Heave-Ho senza trigger (fix: split Trigger/Effect)
- [ ] Draken Cross: effetto nel posto sbagliato (fix: Effect dopo Area per gli attacchi) — il pezzo
      "talento → tag Medium Blast" è fatto in Sessione 2
- [ ] Overlay status sopra le tab della sidebar (fix: HUD ancorato alla sidebar reale)
- [ ] Range degli attacchi base come promemoria (fix: badge "Range N")
- [ ] Testo Aether "persists across combats" (fix: reset a fine combat + testo corretto)

---

## Sessione 1 — Bug urgente + piccoli fix logici (S+S+S) — FATTA il 7 settembre 2026

- [x] **NPC: modificare qualsiasi campo della riga alta (HP, Vigor, nome, size, chapter, elite, fazione,
      classe) cancella tutti i tag di tutte le abilità equipaggiate.** (S, ma URGENTE)
      Diagnosi già fatta: `system.actions` è un `ArrayField` di oggetti; `templates/actor/foe-main.hbs`
      rende `name/cost/description/hitEffect/missEffect/areaEffect` come input con `name="system.actions.N.x"`
      ma i **tag sono solo chip, non input**. A ogni submit del form Foundry ricostruisce l'intero array
      dal form → ogni action arriva senza `tags` → l'ArrayField li rimpiazza con `[]`.
      Fix in `FoeSheet._prepareSubmitData` (module/actor/sheets/FoeSheet.mjs:186): fondere le action
      inviate con quelle esistenti (`this.document.system.actions[i]`) prima di restituire, oppure
      togliere i `name=` dagli input delle action e aggiornarle con update espliciti. Controllare che
      lo stesso pattern non colpisca anche `traits`/`interrupts` e la LegendSheet.
- [x] **Aether die sopra 6**: cap a 6 (è un power die, max 6). (S)
- [x] **"End encounter" ricarica gli HP PRIMA della conferma**: spostare il refill dopo il dialog di
      conferma. (S)

## Sessione 2 — Chat e tracker (S+M+S+M) — FATTA il 7 settembre 2026

- [x] Round Actions dei Legend non stampabili in chat. (S — stesso pattern del bottone 💬 degli interrupt)
- [x] Abilità senza tiro (es. Dread March dei Dread Lords) non stampabili in chat. (M — era la scheda Legend:
      le azioni non avevano il 💬, solo ⚔/💥 condizionali)
- [x] Draken Cross: selezionando la mastery il tag non diventa "Medium Blast". (S — in realtà è il Talent II;
      fatto con campi "Tags when unlocked" per Talent I/II/Mastery su ogni abilità)
- [x] Party Resolve dal tracker: non usabile se si sta usando un Limit Break, e le modifiche non si
      riflettono sulle schede PG. (M)

Emerso dalla Sessione 2 (da fare in un blocco futuro):
- [ ] Passata sui dati del pack `jobs`: compilare "Tags when unlocked" per le altre abilità i cui talenti/mastery
      cambiano range/area/tag (script: `icon-compendium-audit/tag-overrides/apply-tag-overrides.mjs`). (M)
- [ ] `templates/actor/legend-actions.hbs` non è usato da nessuna sheet (LegendSheet usa `legend-combat.hbs`):
      rimuoverlo. (S)

## Sessione 3 — Dati compendium + Rampart (S+S+S+M) — FATTA il 7 settembre 2026

- [x] Armor Demon segnato Leader invece di Heavy. (S — pack `foes`)
- [x] "Rush X" listato come Trait con Vigilance Die tracciabile sugli Stalwart: non esiste come abilità,
      Rush è solo parte di alcune abilità. Rimuovere il trait. (S — era in `module/helpers/classes.mjs`,
      non nel pack; migrazione 4 lo toglie dai PG esistenti)
- [x] NPC Rampart: gli Heavy non hanno Armor 2 e Rampart di fatto lo dà. Far dare +2 Armor al trait
      Rampart (o metterlo nelle stat base Heavy, verificare le 1-2 eccezioni che lo tolgono). (S/M —
      il trait di classe è "Guard" p.298; armor 2 a tutti i foe con Guard, base Heavy = armor 2)
- [x] Compendium in cartelle come Jobs/Foe Abilities: Bond Powers, Foes, Legends, Gear Kits, Relics.
      (M — script `icon-compendium-audit/session3/add-pack-folders.mjs`)

Emerso dalla Sessione 3 (da fare in un blocco futuro):
- [ ] Famiglia Battle Demon (Battle, Starving, Gaping, Nail, Horn Demon) è classificata Leader nel pack
      `foes`, come lo era l'Armor Demon; nel PDF (p.407-408) sono varianti per capitolo dello stesso
      Battle Demon, che non ha classe scritta. Chiedere a Maar se vanno tutti Heavy. (S)

## Sessione 4 — Abilità: power die + formattazione (M+L) — FATTA (infrastruttura) il 7 settembre 2026

- [x] "Power die" generico sulle abilità che ne hanno uno proprio (Odinforce ecc.): campo tracciabile
      sull'abilità stessa. (M — campo `powerDie` su abilità e trait, widget nel pannello, 12 item del pack
      `jobs` compilati via `icon-compendium-audit/session4/set-power-dice.mjs`)
- [x] Riformattazione abilità da combattimento: ordine top→bottom chiaro, keyword in grassetto/link
      con tooltip — **infrastruttura** fatta (parser dei blocchi "Label:" + tooltip sulle keyword nel testo).
- [ ] **Sessione 4b — passata sui dati**: correggere le abilità formattate male usando il report
      `icon-compendium-audit/session4/format-report.md` (etichette minuscole, etichette sconosciute, testi
      senza blocchi). Aggiungere alla lista `SECTION_LABELS` in `module/helpers/enrich.mjs` le etichette
      legittime che mancano. Rifinire la lista keyword in `module/helpers/keywords.mjs` sui falsi positivi
      visti nel playtest. (L)
- [ ] Gran Reversa: Talent I porta il power die a d6 con 6 cariche → oggi si cambia a mano nella scheda
      dell'abilità; valutare override del die per talento come per i tag. (S)

## Sessione 5 — Level Up / First-time setup UI (L)

- [ ] Rework dei dialog `LevelUpDialog` / `CharacterCreationDialog` allo stile del resto della scheda. (L)

## Sessione 6+ — Template Blast/Line/Arc (XL)

- [ ] Prompt al tiro per piazzare il template (MeasuredTemplate) e auto-target dei token dentro.
      Maar suggerisce di guardare il modulo Lancer. Rivalutato da "mid" a XL: serve integrazione con
      MeasuredTemplate, forme Arc non native, targeting cross-client.

## Wishlist alta (una per volta, solo dopo i blocchi sopra)

- [ ] **Hatred / Mark**: mark specifici per abilità con testo, Hatred "verso X". (M) ← il più abbordabile
      degli "alti": si può fare partendo dal registro status esistente (`module/combat/statuses.mjs`).
- [ ] **Relic integration**: quando una reliquia modifica un'abilità, aggiungere reminder text
      (es. Byrax 1 → "Whenever you refresh this stance, Dash 1"). (L/XL — serve prima una tabella dati
      reliquia→trigger→testo)
- [ ] **Encounter Designer**: scegli i PG, budget suggerito, pesca da fazioni/roster, toggle elite. (L/XL)
- [ ] **Automazione effetti/save** offensiva (applica status al target, tira il save con bonus). (XL)
- [ ] **Automazione difensiva** (Evasion, Cover ½ danno, Dodge). (XL, dipende dalla precedente)

---

## Note di setup (facoltative, una tantum)

- [x] Creare un `CLAUDE.md` con le convenzioni del progetto (Foundry v13 AppV2, CHANGELOG in italiano,
      dove stanno gli script di build dei pack, come si testa) → ogni sessione nuova parte informata.
