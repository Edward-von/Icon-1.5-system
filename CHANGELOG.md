# Changelog — ICON 1.5 (sistema Foundry VTT)

## 9 settembre 2026 — Sessione 11: status inflitti letti dal testo, blocco "Inflict" sulle card, save 10+ (versione 1.3.0)

- **Infliggere uno status voleva dire leggere il testo, aprire la scheda del bersaglio e cliccare nella tab
  Conditions, tirando il save a mano** (wishlist Maar: "automazione effetti/save offensiva"): nuovo parser
  `module/combat/ability-statuses.mjs` che legge dal testo di abilità PG, action/interrupt/round action di Foe e
  Legend e azioni dei summon gli status negativi da infliggere ("[D]+fray and foe is dazed", "must save or be
  stunned", "become blinded+", "gain hatred of you") e da quale blocco vengono (Hit, Miss, Effect, Collide,
  Exceed, Chapter 2+, Talent I…). Riconosce le forme del manuale sui save: "save or …" (applicato se il save
  fallisce), "… on a successful save" (applicato se riesce, p.es. Swindle), "Foes can pass a save to avoid this
  effect", "+1 curse on the save", "Bloodied foes fail the save", il "+" degli ongoing. Ignora gli usi come
  aggettivo o condizione ("Dazed foes take fray damage", "against weakened or slashed foes", "if the target is
  stunned", "immune to…"), gli status su se stessi ("you are pacified", "the Cantrix is immobile") e sugli
  alleati, le righe delle statistiche dei summon. Verificato offline (Node) su 32 frasi campione e sull'intero
  corpus dei pack (1477 testi con status su 6257; script in `icon-compendium-audit/session11/`).
- **Blocco "Inflict" sulle card in chat**: card del tiro d'attacco (PG, Foe, Legend, Summon), card "Auto-hit",
  card 💬 delle abilità PG e delle action/interrupt/round action NPC. Una riga per token targettato (o "🎯 Current
  targets" se non c'era nessun target: applica a chi è targettato al momento del click), un bottone per status
  raggruppato per blocco di origine; sulla card d'attacco i gruppi degli esiti non raggiunti (Miss su un hit,
  Exceed sotto 15, Crit) restano cliccabili ma sbiaditi. "⚄" segna gli status con save, il bordo doppio quelli
  che si applicano su un save riuscito, il bordo oro gli ongoing "+". Talent/Mastery solo se sbloccati; con il
  Combo armato si legge il testo Combo.
- **Click → save → applica** (`module/combat/inflict-status.mjs`): senza save applica subito via `applyStatus`
  (già presente → "is already X", oppure upgrade a ongoing se il testo dice "+"); con save apre un dialog con la
  frase del testo, boons/curses (precompilati dal testo), una carica Blessed del bersaglio (+1 boon, consumata),
  la spunta "Automatic failure" già attiva quando il bersaglio è bloodied/… e il testo lo dice, e "Already
  rolled — failed/succeeded" per chi ha già tirato. Il save usa `saveRoll` (1d20 + boons − curses, 10+, p.94) con
  sottotitolo "Abilità — attaccante → bersaglio" e testi "Saved! X avoided." / "Failed — X applied." (quelli di
  fine turno restano "cleared / persists"). Hatred passa da `applyHatred` → "Hatred of <attaccante>" (p.104).
  Card blu "X is now Dazed — Haymaker (Brawler), save 7" e bottone "✓ Dazed" / "✓ saved" / "→ GM".
- **Giocatori senza permessi sul bersaglio**: il tiro avviene sul loro client, l'applicazione viene inoltrata al
  GM attivo via socket (`type: "inflictStatus"`, stesso canale dei mark; Hatred usa il relay dei mark).
- API per le macro: `game.icon.parseInflictedStatuses / abilityStatusEntries / npcActionStatusEntries /
  statusBlockHtml / inflictStatus`. Versione 1.3.0.
- Noto (accettato): "Showdown" del Freelancer ("Choose a foe in range 3 and become immobile", riferito a sé)
  mostra un bottone Immobile di troppo; i danni "on a failed save" restano manuali (pipeline del danno).

## 9 settembre 2026 — Sessione 10: Encounter Designer (versione 1.2.0)

- **Preparare un incontro voleva dire contare a mano i punti del p.292 e importare i foe uno a uno dal compendio**
  (wishlist Maar: "scegli i PG, budget suggerito, pesca da fazioni/roster, toggle elite"): nuova finestra GM
  **Encounter Designer** (`module/apps/EncounterDesigner.mjs`, template in `templates/apps/encounter/`), aperta
  dal bottone "♞ Encounter" in cima alla sidebar Actors, dalla macro "ICON: Encounter Designer" (pack `macros`) o
  da `game.icon.openEncounterDesigner()`.
- **Party e budget**: si scelgono i PG (preselezionati quelli con token sulla scena) → budget = giocatori + 1
  (p.292), con la "one-fight rule" (2 × giocatori, resto in riserva), l'aggiustamento ±1-2 punti e il cap di
  capitolo (auto = capitolo più alto del party) che nasconde i foe delle varianti Ch2+/Ch3+. La banda mostra
  punti spesi / budget e i turni NPC contro i turni PG (l'action economy del p.292).
- **Roster**: tutti i 376 foe e 28 legend del compendio (più i foe già importati nel mondo) filtrati sul client per
  fazione, classe, capitolo, sorgente e testo (nome, fazione, trait) senza ri-render, quindi la ricerca non perde
  il focus. Costo in punti su ogni riga, 👁 per aprire la scheda, "+" o doppio click per aggiungere.
- **Incontro**: quantità per riga, bottone **Elite** (p.299: costo 2, HP ×2, 2 turni; bloccato sui Jotunn già
  Elite, sui mob e sui Legend), riserva "end of round 2/3", Legend = tutto il budget (uno solo), avvisi over
  budget. **🎲 Random fill** riempie i punti rimasti pescando a caso dalle righe visibili del roster (prima si
  filtra la fazione). Salvataggi per nome in un world setting (Save / Load / ✕ / New).
- **Uscite**: 💬 card sussurrata ai GM con la ripartizione; 📥 attori in una cartella "Encounter: <nome>" con un
  attore per corpo ("Warrior 1", "Warrior 2"), template Elite applicato (HP ×2, trait "Elite"), membri del mob =
  2 × giocatori (p.298) e HP del Legend scalati sui giocatori (50/giocatore, min 100); 🗺 Deploy = attori + token
  disposti in file al centro della vista + combat della scena con i foe "on map" (e i token del party, opzione
  "+ party"). Le riserve sono token nascosti fuori dal combat: il bottone "👁 Reveal reserves" sulla card li
  scopre e li mette nel tracker al momento giusto.
- Verificato offline (Node): formule del budget sugli esempi del p.292 (3 giocatori → 4 foe, 1 elite + 2 foe,
  1 legend) e compilazione dei sei template Handlebars. Emerso, in `TODO.md`: Titan Armament (+1 punto) come
  opzione sui Jotunn, riserve automatiche a fine round dal tracker.

## 9 settembre 2026 — Sessione 9: Relic integration (reminder sulle abilità, Invoke sugli attacchi)

- **Le reliquie stavano solo nella tab Relics e ci si dimenticava di applicarle** (wishlist Maar: "Byrax I →
  Whenever you refresh this stance, Dash 1"): nuovo modulo `module/combat/relic-reminders.mjs` con una tabella
  reliquia → rango → condizione → testo per tutte le 40 reliquie del pack. Sul pannello di ogni abilità (tab
  Combat) e sulla card 💬 in chat compaiono righe viola "✦ Byrax I: Whenever you refresh this stance, dash 1",
  solo per i ranghi sbloccati (`currentRank`) e solo sulle abilità che c'entrano (tag `stance`, attacchi, testo
  con "cure"/"shove"/"delay"/"teleport", blocco Charge/Slay/Exceed, versione Combo, range ≥ 3…). Alcuni testi
  cambiano col rango (Dominus I dash 2 → 4 al III, Huntress "you marked" → "any marked" ad Aspect, Skipjack I
  "Range N+1" calcolato dal tag).
- **Invoke (Attack, N+) sul tiro d'attacco** (p.245: conta il d20 grezzo, non il totale): la card del tiro mostra
  una riga per ogni reliquia con un Invoke d'attacco sbloccato, accesa in oro con l'effetto se il d20 raggiunge
  la soglia, grigia "not triggered" altrimenti. Le soglie abbassate dall'Aspect (Paleblood 16+ → 12+, Conquering
  King 18+ → 15+) vengono lette dal testo "becomes (Attack, N+)"; le note dell'Aspect di Ape God / Scheherezade /
  Silver Rabbit si aggiungono in corsivo quando scatta. Gli attacchi auto-hit tirano comunque 1d20 solo per il
  check (come dice il manuale) e gli attacchi base hanno le stesse righe.
- **Reminder legati al round** (Conquering King I/II, Domain e Skipjack Aspect, Arenheir III): sul pannello sono
  sempre visibili col prefisso "Round 5+"; sulla card del tiro compaiono solo quando il combat è a quel round,
  con il valore corrente ("Round 3: exceed on 13+, crit on 18+").
- Tutto è promemoria, niente automazione: i numeri di tiro e danno non cambiano. Foe, Legend e Summon non hanno
  reliquie → card invariate. Verificato offline (Node) su tutti i 40 relic del pack: 18 Invoke d'attacco letti
  correttamente ad Aspect, nessuna chiave della tabella fuori dal pack.
- Emerso, in `TODO.md`: Invoke Gambit con bottone e conteggio, promemoria di inizio/fine turno, elenco delle
  abilità toccate sotto ogni reliquia.

## 9 settembre 2026 — Residui del playtest: 2 fix

- **End encounter puliva i template della scena visualizzata**, non di quella del combat: se il GM guardava un'altra
  scena, spariva la roba sbagliata. Ora usa la scena del combat.
- **Wizard di creazione**: al Finalize le abilità scelte devono appartenere al job scelto (le card degli altri job sono
  nascoste, ma via DOM si potevano spuntare). Ora un errore chiaro invece di un PG incoerente.
- Verificati: Shift+rotella per il lato della Line larga, wizard di creazione completo, reset dei power die a fine
  combat, dialog danno senza bersaglio e sul Legend.

## 9 settembre 2026 — Socket di sistema mai attivato: i relay giocatore → GM non hanno mai funzionato

- **`system.json` non aveva `"socket": true`**: Foundry non inoltrava i messaggi `system.icon-system`, quindi tutto ciò
  che un giocatore manda al GM (Apply Damage su un token non suo, Party Resolve dal tracker, richiesta di
  attivazione, mark e Hatred su token del GM) arrivava alla notifica "sent to the GM" e poi nel vuoto. Trovato
  provando da un client Player con il GM collegato. Aggiunto `"socket": true`; versione del sistema → **1.1.0**.
  **Serve un riavvio di Foundry** (o Return to Setup e riapertura del mondo) perché il manifest venga riletto.
- **"▶ Take turn" mostrato come chevron** sul client Player: una regola più specifica del CSS dei pip lo
  riportava a 16×10 px senza testo. Regola dedicata con la stessa specificità.
- **Chip del mark sul client del marcatore**: quando il GM crea o toglie un mark per conto di un giocatore, la scheda
  del giocatore si aggiorna da sola (hook su create/deleteActiveEffect).
- Verificato con socket attivo, GM e Player insieme: mark, Apply Damage e Party Resolve da Player arrivano al GM.
- Verificato da Player: "▶ Take turn" attiva il turno e "■ End turn" lo chiude (permesso da Foundry v13 per il
  proprietario del combattente), dialog d'attacco con la DEF del bersaglio, target card.

## 9 settembre 2026 — Restyle dei dialog di Attack Roll e Damage Roll

- **Nuovo modulo `module/apps/roll-dialogs.mjs`**, condiviso da PG, Foe e Legend (prima ognuno aveva la sua copia
  con input inline senza stile): banda diagonale del colore della classe (rosso per gli NPC) con ritratto, nome
  dell'abilità, badge del costo e chip dei tag, e a destra il dado ("d20 · crit 20+ · exceed 15+", oppure
  "[D] d8 · fray 4").
- **Card "🎯 Target"** costruita dai token targettati: ritratto, nome, DEF / ARM / HP; con più bersagli si usa la DEF
  più bassa; senza bersagli un suggerimento ("hover + T").
- **Attack**: i modificatori automatici (status, dislivello) sono chip "⚙", boons e curses hanno gli stepper −/+,
  la Defense è precompilata; riga di anteprima live "1d20 + best of 2d6 vs DEF 6 — you need 6 or more…".
- **Damage**: l'esito è un controllo a segmenti (Hit / Crit / Miss / Area con la formula sotto), la versione Combo è
  un chip viola, le mitigazioni (Vulnerable +1, Resistance ½, Weakened −2, Hatred ½) sono chip attivabili,
  stepper per i bonus dice e anteprima "roll 3d8, keep 2 + fray 4 → ½ resistance". Il nome del bersaglio nella
  card viene dai token targettati (non c'è più il campo di testo).
- Foe e Legend passano ora dagli stessi dialog (anche con l'hint Hatred); i valori restituiti sono invariati,
  quindi `combatRoll` e la card del danno non cambiano.

## 9 settembre 2026 — Tracker: i pip di attivazione erano fuori dalla sidebar; "Round {round}"

- **Nessuno vedeva i pip di attivazione** (segnalazione di Edoardo: "i giocatori non hanno pulsanti per prendere il
  turno", e nemmeno il GM li aveva): i pip venivano renderizzati ma la colonna del nome, con i badge ⚡ e i
  controlli, non si restringeva e li spingeva oltre il bordo destro della sidebar (x = 1274 su una riga larga fino
  a 1278). Ora la colonna del nome può restringersi (nome con ellissi, controlli che vanno a capo) e il blocco dei
  pip non si comprime. Verificato sul combat di prova: click sul pip → Asteria attiva, "■" → turno chiuso.
- **"Round {round}" nell'intestazione del tracker**: il nostro helper Handlebars `localize` sovrascriveva quello di
  Foundry ignorando i parametri (`round=…`). Ora usa `game.i18n.format` quando ci sono parametri.

## 9 settembre 2026 — Playtest esplorativo: 4 fix e bottoni "Take turn" per i giocatori

- **Crash a fine round**: l'avviso "All activations are spent" usava `combat.combatants.every`, che le Collection di
  Foundry non hanno (errore in console a ogni fine turno con nessuno attivo). Ora `!some(...)`.
- **Hatred senza bersaglio** (applicato dal HUD core dei token o da mondi vecchi): il dialog del danno diceva
  "Hatred of ?" e pre-spuntava il ½. Ora non pre-spunta e invita ad applicarlo dalla tab Conditions per scegliere
  di chi; il messaggio di fine turno dice solo "Hatred ends".
- **HUD del token**: gli status ongoing mostrano il "+" anche nel pannello.
- **Tracker per i giocatori**: sulla riga del proprio combattente i pip diventano bottoni con etichetta
  "▶ Take turn" e "■ End turn" (il GM tiene i chevron compatti). Risponde alla segnalazione "i giocatori non hanno
  pulsanti per prendere il turno": i pip c'erano ma erano chevron di 16×10 px senza testo. Da confermare con un
  giocatore vero.

## 9 settembre 2026 — Playtest sul mondo di Maar: 9 fix

Primo playtest reale (Claude in Chrome sul mondo Jade Regent, scena di test con copie dei PG). Tutto il blocco
Hatred/Mark, i template di area e i dati delle sessioni 3-7 funzionano; questi i difetti trovati e corretti:

- **Schede con tutte le tab impilate** (Narrative, Combat, Conditions… una sotto l'altra, pre-esistente dal
  30 agosto): il reset `.icon.sheet [data-application-part]:not(header) { display:block }` aveva specificità più
  alta della regola che nasconde le tab. Aggiunta `.icon.sheet .icon-tab[data-tab]:not(.active) { display:none }`.
- **Template di area: targeting rotto in v13** (`game.user.updateTokenTargets` non esiste più): il template veniva
  creato ma i token non venivano targettati e il flusso si fermava. Ora `Token#setTarget`.
- **Click di piazzamento perso** se sotto il mouse c'era il ControlIcon di un template già sulla mappa: i listener
  di piazzamento sono in fase di cattura e fermano la propagazione del click.
- **Aura che non seguiva il token**: nell'hook `updateToken` di v13 la posizione nuova sta in `changed.x/y`, non
  in `tokenDoc.x`.
- **Keyword "take a wound" e "ongoing status" non evidenziate**: la lookup interna testava le regex con
  lookbehind/lookahead sulla sola parola. Nuovo campo `lookup` per quelle keyword.
- **Mark**: il chip "🎯 Bersaglio ✕" sul pannello del marcatore compariva solo al re-render (ora la scheda del
  marcatore si aggiorna da sola); il testo del mark segue anche etichette come "End your turn and Mark:".
- **"Rush X" ancora sui PG** (migrazione 4 non risultava applicata sul mondo di Maar): migrazione 5 lo rimuove
  per nome. Schema → 5.
- **Costo "2actions" grezzo** nei badge delle abilità, nel dialog d'attacco e nella card: ora "2 Actions",
  "Free Action", "Interrupt 1".
- Nota per Maar: le scene della campagna sono senza griglia; i template di area richiedono una griglia quadrata.

## 9 settembre 2026 — Sessione 8: Hatred "of X" e Mark per abilità (wishlist Maar)

- **Hatred era uno status anonimo con save a fine turno**: il manuale (p.104) lo definisce "Hatred of X: half
  damage to all foes other than X, ends at the end of your turn". Ora applicando Hatred (tab Conditions,
  `game.icon.applyStatus`) un dialog chiede di chi: lista dei token della scena con il target preselezionato,
  oppure un nome libero. L'effetto si chiama "Hatred of X" (scheda, HUD del token, chat), finisce da solo a
  fine turno del personaggio (niente save) e il dialog 💥 Damage propone "Hatred (½ vs others)" già spuntato
  quando il target non è X, con lo step "Hatred (½)" nella card. Nuovo modulo `module/combat/marks.mjs`.
- **Mark era solo un contatore "Marked: N"**: ora ogni abilità/azione con tag `mark` ha il bottone "🎯 Mark
  target" (PG, Foe, Legend): targetta un token e premi → sul bersaglio un effetto "Marked — Abilità
  (Marcatore)" con il testo del blocco "Mark:" (o della descrizione dell'azione), card in chat. Regole p.103
  applicate: un mark per abilità (ri-marcare un altro bersaglio sposta il mark), un mark per coppia
  marcatore→bersaglio (il nuovo sostituisce il vecchio), più marcatori diversi possono coesistere; i mark cadono
  quando il marcatore va a 0 HP e a fine combat. Si vedono come chip "🎯 Bersaglio ✕" sul pannello del
  marcatore, nella sezione "Marks on this character" della tab Conditions del bersaglio (testo + "End mark")
  e come righe nell'HUD del token. Il contatore generico "Marked" resta per i casi a mano.
- **Giocatori senza permessi sul bersaglio**: mark e Hatred passano dal GM attivo via socket (stesso canale
  del "Apply Damage").
- API macro: `game.icon.applyHatred(actor, { name, tokenId })`, `game.icon.applyMark({ source, target,
  abilityKey, abilityName, text })`, `game.icon.removeMark(effectUuid)`.

## 9 settembre 2026 — Sessione 7: tag override dei talenti, varianti di area, Aura, larghezza delle Line

- **"Tags when unlocked" compilati nel pack Jobs** per 21 abilità i cui talenti/mastery cambiano la riga dei tag
  in modo permanente o "at round 4+" (Umbra → Range 6 + Unerring, Harvest → Range 2, Valkyrie → Range 4,
  Sturmreiten → Arc 5, Perseus → Line 5, Endless Battlement → No Max Range + Interrupt 2, Sow → Arc 4, le
  mastery "becomes a free action", ecc.): i chip diventano oro con il testo del talento nel tooltip. Le
  condizioni Charge/Comeback/Sacrifice/Exceed NON sono tag: le legge il bottone 📐 (sotto). Script
  `icon-compendium-audit/tag-overrides/apply-tag-overrides.mjs`; vale per i re-import.
- **📐 con scelta della variante**: prima piazzava solo il pattern dei tag. Ora `areaVariants` legge anche il
  testo del Combo, del Charge e dei talenti/mastery sbloccati ("Area becomes Arc 4", "Increase area to Large
  Blast", "Exceed: Draw a line 4…") e, se c'è più di un pattern, un dialog chiede quale usare (Death Blossom:
  Burst 1 / Combo: Arc 4 / Combo: Arc 8; Pandaemonium: Medium Blast / Charge: Large Blast).
- **Line con larghezza** (tag `width-N`, p.97: "can gain width, adding it on either side"): Hellish Breath e
  Scouring beam ora si piazzano larghe; larghezza dispari centrata, pari con la colonna extra da un lato
  (Shift+rotella la sposta dall'altro).
- **Aura X come template** (tag `aura-N`, o `aura` con richiesta della taglia): "📐 Aura 2" piazza subito un
  quadrato oro attorno al token, senza target, e il template segue il token quando si muove (hook
  `preUpdateToken/updateToken` eseguito dal GM attivo, che può aggiornare i template di tutti). ⚔ ignora le
  aure. Rimosse a fine combat come gli altri template.
- **Tooltip mancanti sui tag** `width-N`, `interrupt-N`, `no-max-range`, `melee`.
- **Rimosso `templates/actor/legend-actions.hbs`**, non usato da nessuna sheet (LegendSheet usa `legend-combat.hbs`).
- **Famiglia Battle Demon → Heavy** (Battle, Starving, Gaping, Nail, Horn Demon; pack `foes` + specchio in
  `foe-abilities`): il manuale non assegna classi ai demoni (pp.406-427), quindi si segue la segnalazione di Maar
  come per l'Armor Demon: stat base Heavy p.298 (VIT 10, Def 6, Fray 4, d6, Armor 2), trait Guard, cartella
  "Demon › Heavy". Vale per i re-import.
- I template di area restano finché si tolgono a mano (🗑 area / End encounter): nessuna rimozione automatica.

## 9 settembre 2026 — Sessione 6: template Blast / Line / Arc / Burst con auto-target

- **Aree di effetto sulla mappa**: prima i tag "medium-blast", "line 4", "arc 6", "burst 2" erano solo chip
  informativi e i target andavano scelti a mano. Ora nel pannello di ogni abilità/azione con un tag di area
  compare il bottone "📐 Medium Blast" (PG, Foe e Legend): il pattern segue il mouse su una griglia evidenziata
  del colore dell'area, con l'alone blu del range attorno al token (o solo la corona adiacente se l'abilità
  non ha range, p.97); click per piazzare, tasto destro/Esc per annullare, rotella per ruotare una Line di
  90°. Le Arc si dipingono una casella alla volta (ortogonali, senza sovrapporsi né passare sul proprio
  token; Invio/tasto destro chiude prima). I Burst "(self)" si piazzano da soli attorno al token. Forme dal
  diagramma p.98: Small Blast = croce di 5, Medium = 3×3, Large = 5×5 senza angoli; Burst X = quadrato di
  raggio X (il range conta le diagonali, p.85).
- **Un template vero di Foundry, visibile a tutti**: l'area è un `MeasuredTemplate` con le caselle salvate nei
  flag; la nuova classe `IconMeasuredTemplate` (`module/canvas/area-templates.mjs`, registrata in `init`)
  disegna contorno, caselle e testo "Medium Blast · Nome" su ogni client; i template classici di Foundry
  restano invariati. I token nelle caselle diventano i target dell'utente (per i Burst il proprio token è
  escluso, p.97). Piazzare di nuovo la stessa abilità sostituisce il template precedente; "End encounter"
  li rimuove tutti.
- **⚔ Attack Roll integrato**: su un'abilità di area l'attacco chiede prima il piazzamento (o riusa il
  template già sulla mappa, rileggendo chi c'è dentro), poi apre il dialog con la Defense del target già
  compilata; la card in chat ha la riga "📐 Medium Blast · nomi dei target" e il bottone "🗑 area" che
  toglie il template (solo autore o GM). Anche gli autohit (Pandaemonium) passano dal piazzamento.
- Macro/API: `game.icon.placeAreaTemplate({ actor, area, abilityName, abilityKey })`,
  `game.icon.areaFromTags(tags)`, `game.icon.deleteAreaTemplates()`.

## 9 settembre 2026 — Sessione 4b: passata sui testi delle abilità, power die per talento, keyword

- **Etichette lunghe del manuale non riconosciute** ("End your turn and create a Terrain Effect:" di Eclipse,
  "End your turn and gain Delay:" di Morrigan/Aria, "…gain Terrain effect:" di Six Hells Trigram, "End your
  turn and Mark:" di Intimidate): finivano nel flavour in corsivo. Ora `parseAbilitySections` le conosce e le
  stampa come blocco; le etichette multi-parola tengono minuscole le parole di mezzo ("While in this Stance").
- **Flavour mancante nel pack Jobs** (Circle the Oak, Party Favor, Deus Ex Machina, Harrow, Exorcism, Spirit
  Shrine, Assassinate): ripristinato dal manuale. Spirit Shrine e Assassinate nel libro non hanno etichetta:
  aggiunto "Effect:" per separare flavour e regole, e per lo Shrine la riga "Object Effect: Aura 2" del libro.
  Script `icon-compendium-audit/session4b/fix-ability-texts.mjs`; vale per i re-import. Le 4 abilità
  d'attacco "senza blocchi" del report (Pandaemonium, Harvest, The Tower, Death Blossom) erano corrette: le
  regole stanno nei campi Hit/Miss/Area.
- **Power die che cambia con talento/mastery** (Gran Reversa Talent I → d6 da 6; Crimson Bloom Mastery →
  parte da 3): prima andava cambiato a mano nella scheda. Nuovi campi "Power die when unlocked" sotto Talent
  1/2/Mastery nella scheda dell'abilità (testo libero tipo "d6 starting at 6"); `powerDieView` applica
  l'override quando l'upgrade è sbloccato, quindi widget, cap del +, "Set out at N" e badge in chat seguono.
- **Keyword, falsi positivi**: "counter clockwise" (Strongarm) evidenziava Counter; "hatred of you after this
  ability resolves…" inghiottiva mezza frase; "wounds heal instantly"/"open wound"/"wounded" evidenziavano
  Wound; "ongoing effects" evidenziava Ongoing (+). Regex ristrette in `module/helpers/keywords.mjs`.
- Report rigenerato: `icon-compendium-audit/session4/format-report.md` (restano solo i casi legittimi:
  tabelle di Monogatari, "The effects:" di Terraforming, Eclipse senza flavour come nel libro).

## 7 settembre 2026 — Sessione 5: Level Up e Character Creation nello stile della scheda

- **Dialog rifatti con lo stesso linguaggio della scheda PG** ("Ink & Gold × Tactics"): banda diagonale nel
  colore della classe con il ritratto nella tacca, nome in IM Fell, blocco livello a destra ("3 → 4",
  "Level 0 · Ch 1"), rail degli step a chevron che si accende man mano, ogni passo come card numerata con
  titolo in display, footer sticky con riepilogo e bottone oro a taglio. CSS condiviso in un unico blocco
  `.icon-wizard*` in `css/icon.css` (rimosso il vecchio CSS delle liste a checkbox).
- **Character Creation**: bond, bond power, job e abilità sono card selezionabili (striscia del colore di
  classe, badge, prima frase del testo) invece di select e checkbox; le azioni primarie del bond sono pill;
  i 4 punti extra si assegnano con un allocatore a pallini (+/−, contatore "N left", cap 3 applicato dal
  vivo, riga dorata per l'azione primaria); scegliendo il job la banda prende il colore della classe e
  compare il nome del job; contatore "2 / 2" sulle abilità con blocco delle altre card. Il rail e le card
  diventano oro quando lo step è completo; il footer dice "N / 7 steps done". Il submit legge gli stessi
  campi di prima (gli input `distribution1..4` sono aggiornati dall'allocatore), quindi la logica di
  scrittura sulla scheda non è cambiata.
- **Level Up**: benefici come card "grant"; i bivi di L4/L8 (New Job / +1 Mastery, Bond Power / 2 Actions)
  sono card, e la scelta del nuovo job è una griglia di card di classe che compare solo con "New Job";
  nello stage 2 recap dorato con "← Change", abilità/mastery/reliquie/bond power come card con descrizione,
  contatore "AP N left" che conta anche i talenti e disabilita le card quando il budget è finito, riepilogo
  live nel footer. Finestre allargate a 740px.

## 7 settembre 2026 — Sessione 4: power die sulle abilità, blocchi e keyword nel testo delle abilità

- **Power die tracciabile sull'abilità** (Odinforce, Soul Blade, Gallows Humor, Exorcism…): prima esisteva
  solo la lista generica "Power Dice" del Wright nelle risorse di classe, scollegata dall'abilità. Ora ogni
  abilità e ogni trait ha un campo "Power die" (d4/d6/d8, "starts at N", valore corrente) nella scheda item,
  e nel pannello dell'abilità sulla scheda PG compare il widget "🎲 Power die dN": "Set out at N", −/+ (mai
  sopra la taglia del dado), 🎲 per tirarlo in chat, Discard; a 0 il dado viene scartato (glossario "Power
  Die"). La card in chat mostra il badge "🎲 d6: N" quando il dado è attivo; a fine combat i dadi si
  azzerano. Nel pack Jobs sono compilati 12 item (Soul Blade, Wicked Sheath, Gran Reversa, Sleight of Hand,
  Umbral Echo, Obsidian Flesh, Crimson Bloom, Odinforce, Rampant Nail, Gallows Humor, Exorcism, Godly Smite);
  per le copie già sui PG basta impostare il dado nella scheda dell'abilità.
- **Testo delle abilità a blocchi, in ordine di lettura**: la descrizione veniva stampata come un unico
  paragrafo, con al massimo un "Effect:" staccato. Ora `parseAbilitySections` riconosce i blocchi del
  manuale ("Effect:", "Stance:", "Mark:", "Refresh:", "Terrain Effect:", "Summon:", "Interrupt N:",
  "Infuse N:", "Special:", "Object:", …) e li stampa uno per riga con etichetta in oro, nell'ordine in cui
  sono scritti; il flavour resta in corsivo; per gli attacchi Hit → Miss → Area → blocchi, per le altre
  abilità blocchi → Area. Stesso ordine nel pannello della scheda PG e nella card 💬 in chat.
- **Card in chat senza Trigger/Effect** (regressione del round 4): dallo split Trigger/Effect la card
  "Show in Chat" stampava solo il flavour e Hit/Miss/Area. Ora stampa Trigger e tutti i blocchi.
- **Keyword con tooltip dentro il testo**: le parole di regola (status come slashed/weakened/stunned,
  rush N, shove N, dash, teleport, true strike, bloodied, gamble, aura N, sacrifice N, cure, bless, boon/curse,
  fray, [D], power die, interrupt N, …) vengono evidenziate in ogni testo arricchito (abilità, trait, azioni
  dei Foe, card in chat) con il tooltip preso dal glossario del Reference (`module/apps/reference.mjs`,
  unica fonte). Status in oro, altre keyword con sottolineatura a puntini (`module/helpers/keywords.mjs`).
- **Passata sui dati rimandata**: `icon-compendium-audit/session4/format-report.md` elenca per ogni abilità
  i blocchi riconosciuti e i casi da sistemare (etichette minuscole, etichette sconosciute, testi senza
  blocchi). È la Sessione 4b in TODO.

## 7 settembre 2026 — Sessione 3: Armor Demon, Rush X, Guard/Armor 2, cartelle nei compendi

- **Armor Demon segnato Leader invece di Heavy**: nel PDF (p.408) è una variante "Chapter 1+" del Battle
  Demon, senza classe scritta; nel pack `foes` era Leader. Ora è Heavy con le stat base p.298 (VIT 10,
  Def 6, Fray 4, d6, Armor 2) e il trait di classe Guard oltre a Sturdy. Vale per i re-import; le copie già
  nel mondo non cambiano.
- **"Rush X" come trait Stalwart con tracker Vigilance**: era nella lista dei trait di classe in
  `module/helpers/classes.mjs` (non nel pack), e ogni trait di classe Stalwart mostra i pip Vigilance.
  Rush è una keyword usata dentro le abilità, non un trait → tolto dai trait di classe e spostato tra le
  regole di classe (dropdown "Rules" nel tab Combat). Migrazione 4: il trait "Rush X" viene cancellato dai
  PG esistenti (solo quello con source "class").
- **Heavy senza Armor 2 / Rampart**: il trait di classe Heavy è Guard (p.298: "Has Rampart. Reduce all
  damage to self and allies in orthogonal spaces by 2, as if by armor"), ma nel pack tutti gli Heavy con
  Guard avevano Armor 0, quindi "Apply Damage" non bloccava nulla. Ora: stat base Heavy = Armor 2
  (anche per i foe nuovi e per "Apply base stats"); nel pack `foes` tutti i 50 foe con il trait Guard
  (Heavy, più Bouncer e Giant Insect) hanno Armor 2; chi "lacks the Guard trait" (Atrophic Grave,
  Battle Beetle, Beast spirit, Ooze) resta a 0; Lord Evictor resta a 2 (l'armor non si somma, p.98).
  Il Legend Dread Lords ("Sturdy, Rampart, Armor 2") passa ad Armor 2.
- **Cartelle nei compendi** (come Jobs / Foe Abilities): Bond Powers e Gear Kits per Bond (Adventurer's
  Kit alla radice), Relics per tipo di Invoke (Attack / Round / Gambit), Foes per Fazione › Classe,
  Legends per Fazione. Colori delle fazioni uguali a Foe Abilities. Script
  `icon-compendium-audit/session3/add-pack-folders.mjs` (idempotente).
- **Nuovo `PLAYTEST.md`**: ogni sessione ci scrive i test da fare, che si eseguono in una sessione di
  playtest separata con Claude in Chrome (contiene già i test delle Sessioni 1, 2 e 3).

## 7 settembre 2026 — Sessione 2: chat NPC, tag Draken Cross, Party Resolve sincronizzato

- **Round Action dei Legend (e dei Foe) non stampabili in chat**: mancava il bottone → nuovo 💬 accanto al
  nome di ogni Round Action (scheda Legend e Foe), che posta una card con nome, "Round Action — Round N+" ed
  effetto (`postNpcRoundActionCard` in `module/helpers/enrich.mjs`).
- **Azioni dei Legend senza tiro (es. Dread March dei Dread Lords) non stampabili in chat**: la scheda Legend
  aveva solo ⚔/💥 (visibili solo se l'azione ha un attacco/danno) e nessun 💬, mentre la scheda Foe lo aveva
  già → aggiunto il 💬 a tutte le azioni del Legend, con o senza tiro; la logica della card è ora condivisa
  (`postNpcActionCard`) tra Foe e Legend.
- **Draken Cross: scegliendo il talento il tag non diventava "Medium Blast"**: nel manuale è il Talent II
  ("Charge: Increase range to 5, and all areas may be increased to medium blasts") — non la mastery — e i tag
  delle abilità erano una lista fissa. Ora ogni abilità ha tre campi opzionali "Tags when unlocked" (Talent I,
  Talent II, Mastery; nella scheda item sotto ogni testo): se compilati, sostituiscono i tag quando quel
  talento/mastery è sbloccato. I tag nuovi appaiono in oro con tooltip "From Talent II: …" (scheda PG, card in
  chat e card del tiro). Draken Cross nel compendio Jobs ha già `Talent II → attack, range-5, medium-blast`
  (script `icon-compendium-audit/tag-overrides/apply-tag-overrides.mjs`). Nota: le copie di Draken Cross già
  importate sui PG non si aggiornano da sole: basta scrivere `attack, range-5, medium-blast` nel campo Talent II
  della scheda dell'abilità (o re-importarla).
- **Party Resolve dal tracker: non spendibile col Limit Break e non riflesso sulle schede PG**: c'erano due
  contatori separati — il flag sul combat (mostrato nel banner del tracker, senza modo di cambiarlo a mano) e
  il campo `resolve.party` di ogni PG (quello che il bottone "Use Limit Break" spende) — e si parlavano solo
  con l'incremento automatico a inizio round. Ora c'è un'unica funzione `IconCombat.setPartyResolve` che
  scrive il flag e allinea tutti i PG del combat: la usano i nuovi bottoni −/+ nel banner "Party Resolve" del
  tracker (anche i giocatori, inoltrati al GM), l'incremento di inizio round, e un hook che intercetta ogni
  modifica al Party Resolve fatta da una scheda PG (Use Limit Break, o editing a mano) e la propaga a combat e
  agli altri PG.
- **Party Resolve +1 a inizio round era segnato come house rule OFF**: è RAW (manuale p.99 "Party Resolve goes
  up by 1 at the start of each round in combat") → il setting è rinominato e ora è ON di default (la chiave
  interna resta la stessa, i mondi che l'avevano cambiato tengono la loro scelta).

## 7 settembre 2026 — Sessione 1: tag NPC cancellati, cap Aether, conferma End Encounter

- **NPC: modificare HP/Vigor/nome/size/classe cancellava i tag di tutte le abilità**: le action dei foe sono un
  `ArrayField` di oggetti e la scheda invia solo alcuni campi di ogni action come input (nome, costo, testi);
  i tag sono chip senza `<input>` → a ogni submit Foundry ricostruiva l'array dal form e la pulizia dei dati
  riempiva i campi mancanti con il valore iniziale (`tags: []`). Fix generico in `BaseActorSheet`
  (`_processFormData` + nuovo helper `module/helpers/form-arrays.mjs`): prima della pulizia, ogni elemento
  inviato viene fuso sopra quello già salvato allo stesso indice, così i campi non renderizzati conservano il
  valore. Copre foe e legend (actions, traits, interrupts) e la scheda PG (jobs, burdens, ambitions), che
  aveva lo stesso problema con un fix parziale scritto a mano, ora rimosso. Verificato con uno script Node
  che usa i DataField veri di Foundry: senza fix i tag spariscono, con il fix restano.
- **Aether sopra 6**: il contatore saliva senza limite → l'Aether è un power die d6 (manuale p.204). Ora
  +/- è bloccato a 0..6 (costante `CONFIG.ICON.rules.aetherMax`), con avviso quando si tenta di superarlo;
  `aether.max` di default passa da 10 a 6 e il promemoria in scheda dice "max 6".
- **End Encounter curava PRIMA della conferma**: il nostro `endCombat` faceva pulizia (vigor, heal post-combat,
  reset risorse di classe) e poi chiamava quello core, che apre il dialog di conferma → anche premendo "No"
  gli HP erano già stati ricaricati. Ora il dialog viene mostrato per primo e la pulizia + cancellazione del
  combat avvengono solo dopo il "Sì".

## 30 agosto 2026 — Feedback round 4 (Maar)

- **Burden/Ambition clock**: i segmenti non si coloravano mai (e il click andava sempre al primo burden):
  dentro l'`#each` annidato `../burden.clock.value` e `../i` sono lookup di contesto, non block-param →
  `undefined`. Ora i segmenti si riempiono e ogni clock risponde al proprio indice.
- **Aether**: si azzera a fine combattimento (manuale p.204 "All Aether disperses at the end of combat");
  il promemoria diceva il contrario. Azzerati a fine combat anche gli Stacked Dice del Fool.
- **Attacchi base**: badge "Range N" (range per classe: Stalwart 3 / Vagabond 4 / Mendicant 5 / Wright 6)
  accanto a Light/Heavy Attack e come tag nella card del tiro.
- **Dropdown che si chiudevano a ogni fine turno**: core ri-renderizza le schede di tutti i combattenti a
  ogni cambio turno; ora lo stato aperto/chiuso dei `<details>` sopravvive ai re-render (tutte le schede).
- **Pannello status del token**: ancorato al bordo sinistro reale della sidebar v13 (prima usava un
  `right` fisso e copriva le tab della sidebar); si riposiziona al collapse/expand e al resize.
- **Abilità**: il testo "Trigger:" e "Effect:" contenuto nella descrizione viene ora separato e
  stampato come nel manuale — Trigger prima di tutto (Heave-Ho non mostrava il trigger), Effect dopo
  Hit/Miss/Area per gli attacchi (Draken Cross) e prima dell'Area per le non-attacco.
- **Interrupt di Foe/Legend**: bottone 💬 per postarli in chat (nome, Interrupt N, Trigger, Effect).
- **Tracker**: le modifiche alle attivazioni persistono anche `max` (un combattente aggiunto a metà
  round aveva il max solo in memoria → conteggio pip sbagliato su altri client / al reload).

## 29 agosto 2026 — Restyle "Ink & Gold × Tactics"

Nuovo look scelto su canvas (mix delle direzioni A e C):
- **Header PG** a taglio diagonale nel colore della classe primaria: ritratto nella tacca scura, nome in
  *IM Fell English*, job primario ★ + secondario, kin/cultura compatti, livello grande a destra.
- **Blocco HP** con barra a 4 segmenti "tagliati" (ferite tratteggiate da destra) e **statistiche in griglia
  accanto** (VIT/DEF/SPD/ARM/FRAY/[D]/Level/Chapter); Vigor a tacche (una per punto).
- Sezioni/card più scure, trait e slot abilità con stripe del colore di classe e titoli in IM Fell.
- **Scheda Foe**: banda diagonale con l'accento della fazione/classe nell'header.
- **Chat**: card con testata scura, totale del tiro in "chip" oro tagliato (viola su crit, grigio su miss),
  danno in chip rosso, bottoni Apply/½ tagliati.
- **Combat tracker**: banner round oro a taglio, pip di attivazione a chevron colorati per fazione.
- Font display caricato da Google Fonts (fallback Palatino/Book Antiqua se offline).
- **Altre schede** (stesso linguaggio): header a banda diagonale per **Legend** (viola), **Summon** (blu),
  **Item** (colore di classe, oro se senza classe); il nome del **Foe** ora sta nella banda accanto al
  ritratto; dialog **Level Up** e **Character Creation** con testata oro e titolo in IM Fell.
  Fix tecnico: gli header che sono "part" AppV2 ricevevano `display:block` dal reset — ora il reset
  esclude gli `<header>` (`:not(header)`), così ogni header part tiene il proprio layout.
- Post-review: hint dei dialog non più neri su fondo scuro (colore scoperto solo nella testata), riga 2
  dell'header foe corretta anche per i mob, niente più gap sotto l'header foe, indicatore di focus sui
  campi nome nelle bande, CSS delle bande consolidato (un solo `.icon-band` con `--band`).

## 29 agosto 2026 (pomeriggio) — Summons compendium, gambit self-heal, barre HP token

- **Nuovo compendium "Summons"** (Actor, tipo summon): i 12 summon dei job PG trascritti a mano
  dal manuale — Bomb (Fool), Astral Seraph (Freelancer), Shadow (Shade), Great Beast + Beast (Warden),
  Thrall + Plant + Severed Soul (Harvester), Wild Card + Master Card (Seer), Selkie + Salt Sprite
  (Stormbender). Regola di evocazione nelle note, Summon Action/Effect nei campi. Trascina il PG sulla
  scheda del summon importato per collegarlo (compare nella sezione Summons del PG).
  Sorgente: `icon-compendium-audit/summons-pack/summons.json` + `build-summons-pack.mjs`.
- **Gambit del secondo job**: nuovo `ensureClassGambits()` condiviso (drop job, level-up, migrazione 2)
  e **self-heal all'apertura della scheda PG** — se manca il Gambit di una classe secondaria viene
  creato subito. Confronto classi case-insensitive (attori vecchi con "Wright" maiuscolo).
- **Barre HP dei token**: migrazione schema 3 imposta `bar1 = hp` (PG: `combat.hp`, sempre visibile;
  NPC: solo owner) su tutti gli attori senza barra **e sui token già piazzati nelle scene**.
  I summon intangibili non hanno HP → nessuna barra (voluto).
- **Colori cartelle del compendium Jobs**: Mendicant era blu e Wright verde (anche le sottocartelle job e
  "Abilities"). Ora Mendicant verde (#27ae60 / job #2ecc71) e Wright blu (#2980b9 / job #3498db).
- Colori classe: alias CSS per classi con iniziale maiuscola nei dati legacy.

## 29 agosto 2026 — Feedback round 3 (8 fix)

- **Doppio click sui trait**: un doppio click sui controlli rapidi dentro il box (pips Vigilance,
  +/− Blessing, dado Stacked…) non apre più la scheda dell'item.
- **Combo token**: la card combo in chat stampa anche il Talento equipaggiato (I/II) e la Mastery.
- **Checkbox Elite** ricentrata nel suo riquadro (glifo Foundry v13 centrato con grid).
- **Trait degli NPC in chat**: bottone 💬 sui trait di foe e legend nella scheda attore, e bottone
  "💬 Chat" nell'header della scheda item *foe-ability* / *trait* (funziona anche dal compendio).
- **Summon**: nuova sezione "Summons" nel tab Combat del PG che elenca i summon collegati
  (summonerActorId) con HP/on scene; click per aprire la scheda.
- **Fool — Stacked Dice**: pip 🎲 direttamente sul trait "Stack Dice" (nuova risorsa
  `classResources.stackedDice`); il cap passa a 2 automaticamente con Death's Apprentice sbloccato.
- **Barra HP a segmenti**: la barra è sempre larga 4×VIT; le ferite anneriscono i quarti da destra
  (come nel manuale) e il riempimento è calcolato sul max base. **Bloodied = 50% del max BASE**
  (`hp.bloodied` = ⌈4·VIT/2⌉, es. VIT 7 + 1 ferita → bloodied a 14, non a 11).
- **Seconda classe → Gambit**: bug root cause — `TraitData.source` non accettava `"gambit"`, quindi
  il trait Gambit falliva la validazione e non veniva mai creato. Aggiunto alla schema; il level-up
  (L4/L8 nuovo job) ora lo aggiunge come il drag-drop; **migrazione schema 2** aggiunge i Gambit
  mancanti ai PG multiclasse esistenti.

## 28 agosto 2026 — Audit completo dei foe e delle legend (fix pass)

Audit manuale di **tutti i 376 foe e le 28 legend** contro il manuale (pp. 288–501), poi
fix pass completo. Findings e script in `icon-compendium-audit/foes-audit/`.

### 🐛 Correzioni di gioco (foes)
- **Template di fazione applicati a tutti i foe** (prima li avevano solo i Demon): Legion
  of the Dead (Relict), Enrage (Ruin Beast), Valuables/Greed/Cut and Run (Scavenger),
  Chain of Command (Imperial), Blightland Survivalists (Lowlander), Legacy of the Titans
  con **size 2** per tutti i Jotunn (Titanblood), Nature Spirits + **Trickery/charge** e
  Spirit Away (Hob).
- **Le varianti ora hanno tutto il kit della base** (154 varianti, 33 famiglie), con i
  testi verbatim della base e gli interrupt separati; classe/statline allineate alla base.
- **10 foe mancanti creati**: Ruin Ape, Bouncer, Feathered Demon, Priest of the Nettle,
  Priest of the Herb, Mayfly spirit, Beast spirit, Cultist, Vile Darter, Giant Insect
  (erano fusi in altri foe). Archon↔Sniper rimessi nella fazione giusta.
- Fix puntuali: Kelpie elite HP 56 · Clot speed 2 · Basilisk Petrification · Color Demon
  Distorted Soul · Great Boulder Lumbering · Greenkeeper Living Root · Geryan Bargain ·
  Watcher Phasing · Horn Demon Regeneration · Crystalline Counter · Mondo Sturdy e
  duplicati rimossi · Judge (4 azioni inventate rimosse) · Sword Master (kit Steam Wright
  rimosso) · Royal Guard Battalion of Limbs completo · Battle Wagon Torpedo completo ·
  Radiance of the Black Sun (ch3) su tutta la famiglia Necrosavant · Starfall sui Tethian
  · Sentinel/Sapper/Diviner (basic jobs) e molti altri.
- Note di capitolo (Chapter 2+/3) rimesse sull'abilità giusta della base; campo
  **chapter** popolato (110 foe).
- **Combo sequenziate** (Wraith, Impaler, Floatfish, Boil Slug, White Beast, Ring Finger,
  Gear Walker…); le azioni del Calderone dei Troll non sono più taggate combo.

### 🐛 Legend
- **Tutte le 28 legend ri-autorate verbatim dal manuale**: tratti, azioni, interrupt,
  round action, fasi con nome e gating (`phaseIndex`), combo, tattiche e trofei. Erano
  riassunte, con abilità tronche o intere sezioni assenti (Chimaera senza le 10 teste,
  Apex senza Might of the Wild, Master mezzo vuoto, Keeper senza armi/armature, ecc.).
- **24 legend avevano `_id` non validi**: Foundry le scartava in migrazione — il pack
  legend non si era mai caricato davvero. Corretto.

### 🐛 Scheda foe/legend
- **Il bottone ⚔ Attack compariva su TUTTE le azioni dei foe** (era la segnalazione di
  Maar): ora compare solo sulle azioni che sono attacchi (tag `attack` o riga "On hit:").
  Stesso fix sulle legend, dove inoltre il bottone 💥 Damage non compariva mai sulle
  azioni senza `damageMode` esplicito.

### ✨ Scheda PG — controlli di classe accanto alla class feature (richiesta Maar)
- Nel tratto di classe (Heroics / Aether / Blessing / Finishing Blow) compaiono ora i
  controlli rapidi della risorsa: **pip di Vigilance + Spend** (Stalwart), **Aether −/+,
  Power Dice con −/+/🎲 e "+ Die" / "🎲 Roll"** (Wright), **Blessing Tokens −/+**
  (Mendicant), **Combo Token** (Vagabond). Il blocco nel tab Combat resta invariato.

### 🔧 Pulizia dati
- ~180 code di scraping rimosse ("Chapter 1+", "335 of 501", intro di altri foe…).
- Testi dei tratti glossario unificati (263 tratti, testo p.104).
- Tag normalizzati (`boon-1`, `per-round-1`, `unerring`…), tag spuri rimossi.
- Attori-oggetto/parti di legend rimossi (10) o ridotti a summon puliti (8).
- Pack `foe-abilities` rigenerato dagli attori (3.917 item, id conservati dove possibile).
- Verificato headless: 404/404 schede si aprono, 0 errori.

**Per i mondi esistenti**: i foe e le legend già trascinati nei mondi NON si aggiornano
da soli — reimportarli dal compendio.

## 24 agosto 2026 (sera) — Audit completo delle ability dei PG

Audit manuale di **tutte le 148 ability, 96 tratti e 16 limit break** dei 16 job,
confrontati pagina per pagina con il manuale (pp. 116–236). Fedeltà dei testi già
ottima; corretti però parecchi problemi strutturali sistematici:

### 🐛 Correzioni di gioco
- **13 interrupt avevano perso la riga "Trigger:"** (Catapult, Perseus, Righteous
  Disdain, Boiling Blood, Sucker Punch, Masquerade, Warding Bolts, Nocturne, Justice,
  Wish, Midas, Sturmreiten, Heave-Ho) — ripristinata dal manuale. Senza, non si sapeva
  QUANDO usarli.
- **Regole delle evocazioni ripristinate**: le sezioni SUMMONS dei job erano andate
  perse — **Bomb** (Fool), **Shadow + Shadow Cloud** (Shade), **Beast** (Warden),
  **Thrall + Plant** (Harvester); completate anche **Wild Card** (Seer) e **Salt
  Sprite** (Stormbender). Ora vivono nel tratto di riferimento del job (visibile in
  scheda) e nelle ability principali; i template job aggiornati di conseguenza.
- **Effetti incondizionati fuori dal campo "On hit"** (~28 ability): le righe
  "Effect:"/"Mark:" del manuale valgono anche se l'attacco manca, ma erano dentro
  l'effetto colpito — la scheda le nascondeva sul miss. Spostate nella descrizione.
- **"Miss:" incastrato nel campo hit** (~16 ability, blocchi Mendicant/Wright):
  separato nei campi corretti — ora la scheda mostra il danno da miss.
- **Effetti da talento mostrati come base** (12 ability): exceed/comeback/slay/charge
  che il manuale dà SOLO con un talento erano anche nei campi base — ripuliti.
- **Testi mancanti reintegrati**: vincoli di Terraforming, clausole di Underway,
  esplosione fissa di Magnapyre, altezza impilata dello Spirit Shrine, "counts as an
  attack" di Split Heaven and Hell, distanza illimitata di Deus Ex Machina e altri.

### 🔧 Pulizia dati
- Rimossi i duplicati-ability dei tratti di capitolo 3 Mendicant (Gran Redempta, Defy
  the Cycle, Great Spirit Festival, Chakravartin) — restano tratti come da manuale, e
  ora sono inclusi nei template job (prima mancavano).
- Placeholder d'authoring eliminati ("[attack]", "(implicit: see description)").
- I template job ora incorporano il **testo completo dei Limit Break** (prima una
  versione riassunta finiva sulla scheda del PG).
- Tag fuorvianti rimossi, dieresi ripristinate (Ätherwand, Bifröst, Ragnarök,
  Götterdämmerung…), tag di testata dei Limit Break (Divine, ecc.) reintegrati nel
  testo, flavor mancanti aggiunti dove certi.

Nota: i PG già creati conservano le copie vecchie delle ability — per riallinearle,
ri-trascina le ability dal compendio (o usa il wizard su un PG nuovo).

## 24 agosto 2026 — Hotfix: schede PG

### 🐛 Correzioni di gioco
- **Le schede dei PG non si aprivano**: il bug colpiva i personaggi **senza job assegnato** — quindi tutti i PG nuovi. Il banner del wizard di creazione (novità dell'8 agosto) aggiungeva un secondo elemento radice al template dell'header, e Foundry lo rifiuta in blocco (*"Template part must render a single HTML element"*). I PG con job già scelti non erano toccati, per questo il bug era sfuggito ai test. Corretto e verificato su tutte le schede: PG nuovi, PG esistenti, foe, legend e summon.
- **Errori di migrazione all'avvio del mondo**: ~2.150 documenti dei compendi risultavano scritti da Foundry "14.360" e a ogni avvio del mondo riempivano il log di errori *"cannot be migrated"* (i compendi funzionavano lo stesso, ma la migrazione lato server veniva saltata). Versioni normalizzate a 13.351 — l'avvio ora è pulito.

### ✨ Novità
- **Barra HP sui token**: i nuovi attori hanno di default la **barra HP sul token** — sempre visibile per i PG, visibile solo al GM per i nemici. Gli HP si possono anche modificare direttamente dall'HUD del token (click destro sul token), senza aprire la scheda. Per i mondi già esistenti: da console GM (F12) `await game.icon.enableTokenBars();` aggiorna in un colpo tutti gli attori e i token già piazzati.

### 📎 Promemoria
- Il **Basic Attack dalla scheda** richiesto è **già presente** nella release dell'8 agosto (tab *Combat* → sezione *Basic Actions*: Light/Heavy Attack con tiro d'attacco e danno, più Recover) — era nella zip che il bug delle schede ha impedito di provare.

---

## 8 agosto 2026 — Secondo giro di feedback

### 🐛 Correzioni di gioco
- **Danno delle abilità Combo (PG)**: il tiro di danno ora può usare la **versione combo** — nel dialogo del danno c'è una spunta *Combo version*, pre-attivata se hai il combo token (o l'hai appena speso mostrando la carta in chat).
- **Combo dei nemici**: come da manuale (p.290) per i foe le combo sono una **sequenza** di azioni, non coppie con token. Le azioni della sequenza ora sono **adiacenti e numerate** (*Combo 1 → Combo 2 → …*) con tooltip della regola. Aggiornati 47 foe e 109 abilità nel compendio.
- **Ideali dei Bond**: i bond hanno **3 ideali** ma la scheda ne mostrava (e ne *salvava*) solo 2 — il terzo veniva cancellato al primo salvataggio. Ora tutti e tre sono visibili e modificabili. Per i PG già colpiti: ri-trascina il bond dal compendio o riscrivi il terzo ideale.
- **Blocco per capitolo**: le ability di capitolo 2+ (es. *Intimidate*) non si possono più trascinare su un PG di capitolo inferiore (il GM può forzare con conferma). Wizard e level-up filtravano già correttamente.
- **Colori delle classi**: Mendicant e Wright erano **invertiti** — ora Mendicant è verde e Wright è blu.

### ✨ Novità
- **Status "Marked"**: nuovo status accumulabile (*Marked: 1/2/3*, click sinistro/destro) con icona a mirino, su schede e token HUD.
- **Banner del wizard**: le schede PG senza job mostrano un richiamo dorato ben visibile al wizard di creazione, su ogni tab.
- **Sezione "Basic Actions"** nel tab Combat (richiudibile): le azioni base di p.85 con pulsanti funzionanti per **Light/Heavy Attack** (attacco + danno) e **Recover** (applica il Vigor).
- **Armatura visibile sulle carte danno**: badge **ARM** per ogni bersaglio e nota "Apply subtracts the target's Armor" (l'armatura veniva già applicata, ma in modo invisibile). La macro *Apply Damage* ha ora l'opzione **Pierce** (ignora armatura).
- **Kit equipaggiamento dei Bond**: applicando un bond (wizard o drag-drop) i suoi kit vengono elencati nelle **Note**; trascinare un kit ne scrive il contenuto.
- **Slow Turn**: chi dichiara il turno lento viene **ordinato in fondo** ai combattenti ancora da attivare, con bordo ambra. I pulsanti di fine turno ora **avvisano** invece di fallire in silenzio.
- **Poteri di Bond per sessione**: la macro di fine sessione (*Award Session XP*) azzera automaticamente gli usi; sistemati 5 poteri a cui mancava il limite (Strike the Road, Reputation, Lost Cat, Rarefied, Ridi Pagliacci ×3).
- **Checkbox Elite**: non deborda più dal riquadro nella scheda foe.

### 📦 Nota distribuzione
- Diversi bug segnalati (caselle Effort, End Turn/Slow Turn, "danno diretto agli HP") erano **già corretti** nelle build successive alla zip in circolazione — questa release riallinea tutto.

---

## 25 giugno 2026 — Correzioni da feedback

### 🐛 Correzioni di gioco
- **Contatore Effort**: il numero mostrato (es. *2/3*) ora corrisponde alle caselle piene. Prima il contatore segnava sempre **uno in meno** delle caselle effettivamente riempite.

### 🎨 Interfaccia
- **Poteri di Bond — usi per sessione**: i poteri con un limite "X/sessione" mostrano ora dei **pallini cliccabili** accanto al nome per tenere il conto degli usi durante la sessione. Aggiunto il pulsante **New Session** (nella sezione Powers) per azzerare tutti i contatori a inizio sessione.
- **Reference rapida** 📖: apre uno **schema del turno** e un **glossario ricercabile** con ~100 definizioni di gioco. Basta digitare un termine (es. *comeback*, *exceed*, *vigor*, *save*, *shove*) per filtrarlo. Copre stat di base, azioni e timing, tutti e 10 i trigger, danni, movimento, statuses, effetti positivi, stati persistenti, risorse e termini narrativi (Effort/Strain/Burden). Disponibile **lato player e lato GM**: dalla barra del titolo (icona 📖) di ogni scheda (PG, Foe, Legend, Summon) e dal pulsante *📖 Reference* nella sezione *Character Management* del PG.

---

## 31 maggio 2026 — Aggiornamento di manutenzione e correzioni

### 🐛 Correzioni di gioco
- **Rigenerazione**: ora funziona anche su **nemici e Legend** (prima solo sui PG) e scatta a **fine turno**, come da manuale.
- **Pacified**: ora **dimezza davvero i danni** inflitti — prima lo status era puramente decorativo.
- **Carta del danno**: mostra **Difesa e HP anche dei bersagli nemici** (prima quei campi restavano vuoti quando un PG colpiva un foe).
- **Recupero post-combattimento**: corretto un caso limite in cui un personaggio esattamente a metà HP non veniva curato.
- Vari ritocchi di robustezza per la **compatibilità con Foundry v14** (tiri, dialoghi, macro).

### 📚 Bestiario e compendi
- **Libreria "Foe Abilities" ripulita**: completate alcune azioni rimaste vuote (riprese dai nemici già corretti) e **rimosse 13 voci vuote/orfane** (residui di vecchi import corrotti). I nemici *giocabili* erano già a posto — questa è pulizia della libreria da cui si trascinano le abilità.
- **Legend**: lo **scaling degli HP in base al numero di giocatori** ora funziona correttamente per tutti i 29 Legend (prima il valore di base non era impostato).
- Verificato il **Fetid Idol**: è corretto così com'è (è un boss-oggetto immobile che combatte tramite worshipper e Round Action, quindi non ha "azioni" normali — è di design).

### 🎨 Interfaccia
- Icone dedicate per **Power Die** ed **Elevation** (prima erano il placeholder con il "?").
- Lo status **Immobile** ora compare correttamente nel gruppo delle **condizioni negative**.
- Aggiunto il job mancante **Sealer** (Mendicant) dove non era ancora elencato.

### 🔧 Sotto il cofano
- Macro **Camp / Interlude / XP / Apply Damage** aggiornate per v14 (dialoghi più moderni).
- Consolidato e ripulito il codice dei tiri di danno e rimosse parti di codice non più usate.

---

**Come aggiornare:** dopo l'update, ricarica il mondo (F5).
**Nota sui nemici:** i foe già presenti nel tuo mondo mantengono le loro copie; le correzioni alla **libreria** valgono per i nemici **re-importati** dal compendio (come già accennato nelle versioni precedenti).
