# TODO — backlog feedback Maar (compilato 7 settembre 2026)

Fonte: messaggi Discord di Maar del 5–7 settembre 2026. Questo file è la **fonte di verità** tra una
sessione e l'altra: ogni sessione fa un blocco, spunta le voci, aggiorna il CHANGELOG e committa.

Come lavorare una sessione:
1. Sessione nuova (`/clear`), prompt: "Leggi TODO.md e fai la sessione N".
2. Fare SOLO il blocco indicato. Se qualcosa esce dal blocco → aggiungerlo qui, non farlo.
3. Fine sessione: **compilare `PLAYTEST.md`** con i test del blocco (NON eseguirli: il playtest è una sessione
   separata con Claude in Chrome), voce in CHANGELOG.md, deploy, commit, spuntare le caselle qui.
   Ogni blocco qui sotto sottintende la voce "[ ] compilare PLAYTEST.md".
4. **Ogni modifica fatta va segnata in `PLAYTEST.md`**, anche se non è una voce di questo file (fix
   laterali, ritocchi emersi lavorando): niente cambia nel sistema senza una riga di test corrispondente.

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
- [x] Passata sui dati del pack `jobs`: compilare "Tags when unlocked" per le altre abilità i cui talenti/mastery
      cambiano range/area/tag (script: `icon-compendium-audit/tag-overrides/apply-tag-overrides.mjs`). (M)
- [x] `templates/actor/legend-actions.hbs` non è usato da nessuna sheet (LegendSheet usa `legend-combat.hbs`):
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
- [x] Famiglia Battle Demon (Battle, Starving, Gaping, Nail, Horn Demon) è classificata Leader nel pack
      `foes`, come lo era l'Armor Demon; nel PDF (p.407-408) sono varianti per capitolo dello stesso
      Battle Demon, che non ha classe scritta. Chiedere a Maar se vanno tutti Heavy. (S)

## Sessione 4 — Abilità: power die + formattazione (M+L) — FATTA (infrastruttura) il 7 settembre 2026

- [x] "Power die" generico sulle abilità che ne hanno uno proprio (Odinforce ecc.): campo tracciabile
      sull'abilità stessa. (M — campo `powerDie` su abilità e trait, widget nel pannello, 12 item del pack
      `jobs` compilati via `icon-compendium-audit/session4/set-power-dice.mjs`)
- [x] Riformattazione abilità da combattimento: ordine top→bottom chiaro, keyword in grassetto/link
      con tooltip — **infrastruttura** fatta (parser dei blocchi "Label:" + tooltip sulle keyword nel testo).
- [x] **Sessione 4b — passata sui dati** (FATTA il 9 settembre 2026): correggere le abilità formattate male usando il report
      `icon-compendium-audit/session4/format-report.md` (etichette minuscole, etichette sconosciute, testi
      senza blocchi). Aggiungere alla lista `SECTION_LABELS` in `module/helpers/enrich.mjs` le etichette
      legittime che mancano. Rifinire la lista keyword in `module/helpers/keywords.mjs` sui falsi positivi
      visti nel playtest. (L)
- [x] Gran Reversa: Talent I porta il power die a d6 con 6 cariche → oggi si cambia a mano nella scheda
      dell'abilità; valutare override del die per talento come per i tag. (S — campi "Power die when unlocked",
      fatto il 9 settembre 2026 in Sessione 4b; anche Crimson Bloom mastery)

## Sessione 5 — Level Up / First-time setup UI (L) — FATTA il 7 settembre 2026

- [x] Rework dei dialog `LevelUpDialog` / `CharacterCreationDialog` allo stile del resto della scheda. (L —
      chrome condiviso `.icon-wizard`: banda di classe con ritratto, rail degli step, card opzione, allocatore
      dei punti, footer sticky; logica di submit invariata)

## Sessione 6+ — Template Blast/Line/Arc (XL) — FATTA (prima versione) il 9 settembre 2026

- [x] Prompt al tiro per piazzare il template (MeasuredTemplate) e auto-target dei token dentro.
      Maar suggerisce di guardare il modulo Lancer. Rivalutato da "mid" a XL: serve integrazione con
      MeasuredTemplate, forme Arc non native, targeting cross-client. (Fatto: `module/canvas/area-templates.mjs`,
      bottone 📐 su PG/Foe/Legend, ⚔ piazza o riusa il template, card con "🗑 area", cleanup a fine combat.)

Emerso dalla Sessione 6 (da fare in un blocco futuro):
- [x] Line con larghezza ("Line 4, width 2"), Arc/Line del Combo (es. Death Blossom combo → Arc 4) e le aree
      "Charge: Large Blast" non sono lette dai tag: oggi si piazza il pattern base. (M)
- [x] Aura X come template persistente attorno al token che si sposta con lui. (M)
- [ ] Rimuovere automaticamente i template a inizio del turno successivo dell'attore (oggi restano finché
      🗑 area / End encounter). Chiedere a Maar se preferisce così. (S)

## Sessione 7 — Pulizia residui (M+S+M+S) — FATTA il 9 settembre 2026

Raggruppa le voci "emerso dalla Sessione N" qui sopra.
- [x] Passata "Tags when unlocked" sul pack `jobs` (talenti/mastery che cambiano range, area, tag in modo
      permanente o "at round 4+"): script `icon-compendium-audit/tag-overrides/apply-tag-overrides.mjs`. (M)
- [x] Rimuovere `templates/actor/legend-actions.hbs` (inutilizzato). (S)
- [x] Template di area, varianti: Line con `width-N` (Abomination, Hellhound), aree del Combo/Charge/talento
      sbloccato lette dal testo (Death Blossom combo → Arc 4, Pandaemonium Charge → Large Blast) con scelta al
      click su 📐; Aura X come template che segue il token. (M)
- [x] Tooltip per i tag `width-N`, `interrupt-N`, `no-max-range`, `melee`. (S)

Decisi con Edoardo il 9 settembre 2026:
- [x] Battle Demon e famiglia (Starving, Gaping, Nail, Horn): il manuale non dà classi ai demoni (pp.406-427,
      nessuna intestazione Heavy/Skirmisher); si segue Maar → tutti Heavy come l'Armor Demon
      (`icon-compendium-audit/session7/battle-demons-heavy.mjs`).
- [x] Template di area: si tolgono a mano (🗑 area / End encounter), nessuna rimozione automatica.

## Sessione 8 — Hatred / Mark (M) — FATTA il 9 settembre 2026

- [x] **Hatred "verso X"**: applicando Hatred (tab Conditions, macro `game.icon.applyStatus`) si sceglie il
      bersaglio tra i token della scena (o un nome libero) → effetto "Hatred of X"; finisce da solo a fine turno
      (p.104) invece del save; il dialog del danno propone "Hatred (½ vs others)" già spuntato se il target
      non è X. (`module/combat/marks.mjs`)
- [x] **Mark per abilità con testo**: bottone 🎯 sulle abilità/azioni con tag `mark` → un effetto "Marked —
      Abilità (Marcatore)" sul token bersagliato, con il testo del blocco "Mark:"; un mark per abilità, uno per
      coppia marcatore→bersaglio (il nuovo sostituisce il vecchio, p.103); chip sul pannello del marcatore,
      lista "Marks on this character" nella tab Conditions e righe nell'HUD del token con ✕; i mark cadono
      quando il marcatore va a 0 HP e a fine combat. I giocatori senza permessi sul bersaglio passano dal GM
      (socket).

## Playtest del 9 settembre 2026 — FATTO (vedi PLAYTEST.md, "Esito playtest")

- [x] 9 bug trovati e corretti nella stessa giornata (tab impilate, targeting v13, click sul ControlIcon, aura,
      keyword lookup, chip dei mark, testo mark, Rush X → migrazione 5, costo grezzo). Zip nuovo per Maar.
- [x] Ri-verifica dei 9 fix sulla build `4f7132d` caricata sul server: tutti confermati (9 settembre, sera).
- [x] Playtest esplorativo (9 settembre, sera): 4 fix (crash `combatants.every`, Hatred senza bersaglio, "+" nell'HUD,
      bottoni "▶ Take turn" per i giocatori). Vedi PLAYTEST.md.
- [x] **Pip del tracker invisibili per tutti** (fuori dalla sidebar): corretto via CSS il 9 settembre sera, con
      "Round {round}" nell'intestazione (helper `localize`).
- [x] **Giocatori e turno**: verificato da client Player il 9 settembre sera: "▶ Take turn" attiva, "■ End turn" chiude.
- [x] **Socket di sistema mancante** (`"socket": true` in system.json): nessun relay giocatore→GM funzionava. Corretto,
      versione 1.1.0; richiede riavvio di Foundry dopo il deploy.
- [x] Riprovato dopo il riavvio (9 settembre sera): mark da Player, Apply Damage da Player, Party Resolve da Player → tutti
      arrivano al GM. Manca solo la richiesta di attivazione NPC da Player (avviso al GM), da provare con Maar.
- [x] (vecchia voce) **Giocatori e turno**: far confermare a Maar (o a un giocatore) che con la build nuova sulla propria riga del
      tracker compaiano "▶ Take turn" / "■ End turn" e che il click attivi davvero il turno (l'update di `turn` da
      parte di un player è permesso da Foundry v13, ma non è stato provato con un secondo client). Se non
      funziona: relay al GM via socket anche per il proprio combattente.
- [x] Residui provati il 9 settembre sera: secondo client (relay), scena gridless (avviso), Shift+rotella della Line
      larga, wizard di creazione completo, reset dei power die a fine combat, dialog danno senza bersaglio e Legend.
- [ ] Maar: le scene della campagna (Enganoka) sono senza griglia → i template di area non funzionano lì.
      Chiedere se vuole una griglia quadrata sulle mappe di combattimento (Field Battlemap ce l'ha).

## Sessione 9+ — Wishlist alta (una per volta, in quest'ordine)

- [x] **Hatred / Mark**: mark specifici per abilità con testo, Hatred "verso X". (M — Sessione 8) ← il più abbordabile
      degli "alti": si può fare partendo dal registro status esistente (`module/combat/statuses.mjs`).
- [x] **Relic integration** (FATTA il 9 settembre 2026, Sessione 9): quando una reliquia modifica un'abilità,
      riga "✦ Byrax I: Whenever you refresh this stance, dash 1" sul pannello dell'abilità e sulla card in chat
      (tabella reliquia→rango→condizione→testo in `module/combat/relic-reminders.mjs`, 40 reliquie del pack);
      sul tiro d'attacco il check "Invoke (Attack, N+)" sul d20 grezzo (p.245) con l'effetto acceso/spento, anche
      per gli auto-hit (d20 tirato solo per l'invoke) e gli attacchi base; reminder legati al round (Conquering
      King, Domain/Skipjack Aspect, Arenheir III) sulla card solo quando il round è raggiunto.
      Emerso (da fare in un blocco futuro):
      - [ ] Invoke **Gambit** delle reliquie (Byrax II, Hermes, Sleipnir, Mistborn…): bottone "Invoke" sulla tab
            Relics con conteggio "usato questo combat" e card in chat; oggi si leggono solo. (M)
      - [ ] Reliquie con effetti "a inizio/fine turno" (Apophis I, Erenbrass, Storm Lord I, Trollhide I/II,
            Mistborn III): promemoria in chat al cambio turno del tracker. (S/M)
      - [ ] Tab Relics: elencare sotto ogni reliquia le abilità equipaggiate che tocca (inverso dei reminder). (S)
- [x] **Encounter Designer** (FATTA il 9 settembre 2026, Sessione 10): scegli i PG, budget suggerito, pesca da
      fazioni/roster, toggle elite. Finestra GM `module/apps/EncounterDesigner.mjs` (bottone "Encounter" nella
      sidebar Actors, macro, `game.icon.openEncounterDesigner()`): party → budget p.292 (+ one-fight rule,
      aggiustamento, cap di capitolo), roster filtrato (376 foe + 28 legend + foe del mondo), Elite/riserve/
      quantità, 🎲 Random fill, salvataggi, uscite 💬 chat / 📥 attori in cartella / 🗺 deploy token + combat con
      riserve nascoste e "Reveal reserves" dalla card.
      Emerso (da fare in un blocco futuro):
      - [ ] **Titan Armament** dei Jotunn (p.448: +1 punto, +50% HP, un turno in più) come opzione per riga. (S)
      - [ ] **Riserve automatiche**: a fine round 2/3 il tracker propone "Reveal reserves" (oggi solo dal bottone
            sulla card in chat). (S/M)
      - [ ] Deploy con "riusa gli attori del mondo" (oggi i foe presi dalla sorgente World vengono comunque
            copiati in un nuovo attore per corpo). Chiedere a Maar se serve. (S)
      - [ ] Token dei foe: tutto il pack usa `mystery-man.svg`; se Maar vuole icone per classe/fazione, serve una
            passata sul pack (`img` + `prototypeToken.texture`). (M, dati)
- [x] **Automazione effetti/save** offensiva (FATTA il 9 settembre 2026, Sessione 11): parser degli status
      inflitti dal testo (`module/combat/ability-statuses.mjs`), blocco "Inflict" con un bottone per status e
      per bersaglio sulle card d'attacco / auto-hit / 💬 (PG, Foe, Legend, Summon), save 1d20 10+ con boons/curses
      dal testo, Blessed, "Bloodied foes fail the save", "already rolled"; `applyStatus` / `applyHatred`, relay al GM
      via socket (`module/combat/inflict-status.mjs`). Versione 1.3.0.
      Emerso (da fare in un blocco futuro):
      - [ ] Danni "on a failed save" ("must save or take 2[D]+fray, or [D]+fray on a successful save"): oggi solo
            il testo; collegare l'esito del save al dialog del danno (outcome "save failed / passed"). (M)
      - [ ] Effetti non-status letti dal testo ("shoved 2", "unable to attack until the end of their next turn",
            "+1 curse on all attacks and saves"): promemoria sulla card o effetto generico con durata. (L)
      - [ ] Falso positivo noto: Freelancer "Showdown" ("Choose a foe in range 3 and become immobile" = se stessi)
            mostra un bottone Immobile. Regola per l'imperativo senza soggetto. (S)
      - [ ] Status positivi su di sé / alleati ("you gain evasion", "allies gain sturdy") come bottone "Gain" sulla
            card (versione difensiva del blocco Inflict). (M)
- [ ] **Automazione difensiva** (Evasion, Cover ½ danno, Dodge). (XL, dipende dalla precedente)

---

## Note di setup (facoltative, una tantum)

- [x] Creare un `CLAUDE.md` con le convenzioni del progetto (Foundry v13 AppV2, CHANGELOG in italiano,
      dove stanno gli script di build dei pack, come si testa) → ogni sessione nuova parte informata.
