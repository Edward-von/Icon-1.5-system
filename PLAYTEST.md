# PLAYTEST — cose da provare in Foundry (sessione separata, con Claude in Chrome)

Ogni sessione di sviluppo aggiunge qui i suoi test **senza eseguirli**. Una sessione di playtest
dedicata (Foundry aperto, Claude in Chrome sul mondo di test) li esegue, spunta le caselle e riporta
i bug in `TODO.md`. Prerequisito: build deployata in `%LOCALAPPDATA%\FoundryVTT\Data\systems\icon-system`
(ogni sessione la copia a fine lavoro) e F5 nel mondo.

Setup consigliato per il mondo di test: 2 PG (uno Stalwart Demon Slayer con Draken Cross equipaggiato,
uno di un'altra classe), un Foe Heavy importato dal compendio (es. Warrior), l'Armor Demon, il Legend
"Dread Lords", e un combat con tutti dentro.

---

## Esito playtest del 9 settembre 2026 (Claude in Chrome, mondo Jade Regent su foundry.codrillo.it, scena "test")

Provato con copie "TEST" dei PG e foe importati dal compendio, poi cancellate; il combat reale della Field
Battlemap non è stato toccato. Le caselle spuntate qui sotto sono quelle verificate; quelle vuote non sono state
provate (secondo client, scena gridless, relay giocatore, alcune interazioni dei wizard).

Bug trovati e corretti nella build successiva (`f284e00` → fix del 9 settembre):
- **Tutte le tab delle schede erano impilate** (Narrative + Combat + Conditions… una sotto l'altra): il reset
  CSS dei part AppV2 batteva la regola che nasconde le tab (pre-esistente dal 30 agosto). Regola più specifica.
- **`game.user.updateTokenTargets` non esiste in v13** → il piazzamento dei template creava il template ma
  esplodeva prima di targettare. Ora `Token#setTarget`.
- **Click di piazzamento ingoiato dal ControlIcon di un template già sulla mappa** (Line del Hellhound sopra
  l'origine di un altro template) → listener in fase di cattura + stopPropagation.
- **Aura che non seguiva il token**: nell'hook `updateToken` di v13 `tokenDoc.x` è ancora il valore vecchio → si
  legge `changed.x/y`.
- **Keyword "take a wound" / "ongoing status" non evidenziate** (la lookup interna testava la regex con
  lookbehind/lookahead sulla sola parola) → campo `lookup`.
- **Chip "🎯 Bersaglio" sul pannello del marcatore** compariva solo al re-render → la scheda del marcatore si
  ri-renderizza dopo mark/rimozione.
- **Testo del mark** per etichette tipo "End your turn and Mark:" → si prende il blocco la cui etichetta finisce
  con "Mark".
- **"Rush X" ancora sul PG Hiroshi** nonostante lo schema 4 → migrazione 5 (per nome).
- **Costo "2actions" grezzo** nei badge e nella card d'attacco → "2 Actions" / "Interrupt 1".

**Ri-verifica del 9 settembre 2026 (sera), build `4f7132d` caricata sul server**: tutti e 9 i fix confermati sul mondo
di Maar senza toppe in pagina — migrazione 4→5 eseguita all'apertura (nessun PG ha più "Rush X"), tab delle schede
nascoste correttamente, costi "1 Action / 2 Actions / Interrupt 1", chip "🎯 Bersaglio" immediato e testo del mark
dal blocco giusto, keyword "wound"/"ongoing" evidenziate, Small Blast piazzato con Warrior targettato, click sopra
il ControlIcon del template precedente accettato (sostituzione), Aura che segue il token (+2 colonne, +1 riga).

**Playtest esplorativo del 9 settembre 2026 (sera, "il primo cliente va in bagno")** — percorsi laterali, non da
checklist. Verificato ok: mark su due token dello stesso foe (attore linkato condiviso), foe che marca un PG dalla
scheda del token, scheda item che salva "Power die when unlocked", cambio classe del Foe + "Apply base stats" senza
perdere i tag delle action, "Apply Damage" dalla card (HP 28 → 20), mark orfano (marcatore cancellato) ancora
rimovibile dalla tab Conditions, 💬 Show in Chat delle abilità, tag `line` senza numero → dialog della lunghezza,
HUD con status ongoing+ ed elevation, "+" del Party Resolve dal tracker sincronizzato sul PG, scena senza griglia →
avviso, Level Up completo (6 → 7, XP azzerati, card in chat). Trovati e corretti:
- crash `combat.combatants.every is not a function` nell'avviso "tutte le attivazioni spese" a fine round
  (le Collection di Foundry non hanno `every`);
- Hatred applicato senza bersaglio (dal HUD core dei token) mostrava "Hatred of ?" nel dialog del danno e
  pre-spuntava il ½: ora non pre-spunta e spiega di applicarlo dalla tab Conditions;
- l'HUD del token non distingueva gli status ongoing "+";
- segnalazione di Edoardo "i giocatori non hanno pulsanti per prendere il turno": i pip sono renderizzati anche
  per i non-GM (verificato emulando un utente Player lato client) ma sono chevron di 16×10 px senza etichetta.
  Ora sulla riga del proprio combattente i giocatori vedono "▶ Take turn" e, quando attivi, "■ End turn".
  **Da confermare con un giocatore vero** (serve un secondo client).

Note per il prossimo playtest con Claude in Chrome: dopo `scene.activate()` ripetuti `game.user.viewedScene`
può restare null e i target (T, `setTarget`) vengono ignorati in silenzio → riallineare con
`game.user.viewedScene = canvas.scene.id`; non chiudere "tutte le applicazioni" con `foundry.applications.instances`
(chiude anche la sidebar e la chat sparisce dal DOM); usare la scena `test` **attivata**, non solo vista, perché
il tracker mostra il combat della scena attiva.

Da segnalare a Maar: le scene della campagna (Enganoka) sono **senza griglia** (grid type 0); i template di
area chiedono una griglia quadrata e sulle scene gridless mostrano un avviso. Il modulo Bar Brawl dà un errore
suo su `createCombatant` (non nostro).

## Sessione 1 (7 settembre 2026) — tag NPC, cap Aether, conferma End Encounter

- [x] **Tag delle action NPC sopravvivono all'editing**: apri un Foe con action taggate (es. Warrior,
      Cleave ha "true strike"); cambia HP, poi Vigor, poi il nome, poi la classe nel dropdown → i chip dei
      tag restano su tutte le action. Stesso test su un Legend (action, trait, interrupt).
- [ ] **PG: jobs e burden non perdono dati**: su una scheda PG con 2 job e un burden con clock
      parzialmente pieno, cambia un campo qualsiasi della testata → job secondario e segmenti del clock
      invariati.
- [x] **Aether max 6**: PG Wright, premi + sull'Aether oltre 6 → resta 6 e compare l'avviso; − funziona
      fino a 0.
- [x] **End Encounter**: con un PG ferito, premi "End encounter" nel tracker e rispondi **No** → gli HP
      restano feriti e il combat resta aperto. Ripeti con **Sì** → HP ricaricati, vigor azzerato, combat
      chiuso.

## Sessione 2 (7 settembre 2026) — chat NPC, tag Draken Cross, Party Resolve

- [x] **Round Action in chat**: scheda Legend (Dread Lords), 💬 accanto a una Round Action → card in chat
      con nome, badge "Round Action — Round N+" ed effetto. Stesso bottone sulle Round Action di un Foe.
- [x] **Azioni Legend senza tiro in chat**: Dread Lords → 💬 su "Dread March" (free action, nessun attacco)
      → card con descrizione. Verifica che ⚔/💥 compaiano ancora solo sulle azioni con attacco/danno.
- [x] **Draken Cross Talent II**: PG con Draken Cross importato **dopo** questa build (o con
      `attack, range-5, medium-blast` scritto a mano nel campo "Tags when unlocked" del Talent II sulla
      scheda dell'abilità). Nel pannello dell'abilità scegli Talent II → i chip diventano "Range 5" e
      "Medium Blast" in oro; hover → tooltip "From Talent II: Charge: …". Torna a "none" → tag normali.
      Controlla anche la card 💬 Show in Chat e la card del tiro d'attacco.
- [x] **Party Resolve sincronizzato**: combat con 2 PG avviato. (a) Nel banner del tracker premi + due
      volte → "Party Resolve ⚡2" e i badge ⚡p+P di entrambi i PG mostrano party 2; apri le due schede →
      campo Party Resolve = 2. (b) Su un PG premi "Use Limit Break" (costo ≥ 2) → il banner e l'altro PG
      scendono. (c) Modifica a mano il campo Party Resolve su una scheda → banner e altro PG seguono.
      (d) Come giocatore (secondo client o utente non-GM) premi + nel banner → funziona via GM.
- [ ] **+1 a inizio round**: passa al round successivo → Party Resolve +1 (setting "Party Resolve +1 at
      the start of each round" ON di default in Configure Settings → System Settings).

## Sessione 3 (7 settembre 2026) — dati compendium, Rampart/Guard, cartelle

- [x] **Armor Demon**: importalo di nuovo dal compendio Foes (cartella Demon › Heavy) → classe Heavy,
      VIT 10 / Def 6 / Fray 4 / d6 / Armor 2, trait Guard presente oltre a Sturdy.
- [ ] **Guard → Armor 2**: importa un Heavy qualsiasi (Warrior) → Armor 2. Tira un danno contro di lui
      e premi "Apply Damage" → "2 blocked by Armor". Atrophic Grave (Relict › Heavy) resta Armor 0.
      Nuovo Foe creato da zero → Armor 2 (default Heavy); cambia classe e premi "Apply base stats" →
      Skirmisher/Leader/Artillery tornano a 0.
- [✗] **Rush X sparito**: apri un PG Stalwart esistente → dopo la migrazione (console: "Migration 4")
      il trait "Rush X" non c'è più; restano Armor 2 e Fortify con i pip Vigilance. Crea un nuovo PG
      Stalwart dal wizard → niente Rush X; "Rush X" compare nel dropdown delle regole di classe.
      ✗ 9 set: il PG Hiroshi ha ancora il trait "Rush X" (schema già a 4) → migrazione 5 lo rimuove per nome
- [x] **Cartelle nei compendi**: apri Bond Powers (cartelle per Bond), Gear Kits (per Bond, Adventurer's
      Kit alla radice), Relics (Attack / Round / Gambit Invoke), Foes (Fazione › Classe), Legends
      (Fazione). Drag di un documento da una sottocartella sul canvas/sidebar funziona.

## Sessione 4 (7 settembre 2026) — power die sulle abilità, formattazione abilità

- [ ] **Power die su Odinforce**: PG Spellblade con Odinforce importato **dopo** questa build (o con "Power
      die: d6, starts at 3" impostato a mano nella scheda dell'abilità). Nel pannello dell'abilità compare
      "🎲 Power die d6" con il bottone "Set out at 3" → click → mostra 3 con −/+, 🎲 e Discard. + oltre 6
      resta a 6 con avviso; − fino a 0 → "discarded" e torna il bottone Set out. 🎲 tira 1d6 in chat con il
      nome dell'abilità e i tick.
- [ ] **Power die su un trait**: Sealer con Godly Smite → stesso widget sulla card del trait (d6, starts at 1).
- [ ] **Card in chat**: con il die attivo, 💬 Show in Chat mostra il badge "🎲 d6: N" nella testata.
- [ ] **Reset a fine combat**: die attivo, "End encounter" → Sì → il die torna non attivo.
- [x] **Blocchi delle abilità**: apri Gran Reversa (Seer) o Soul Blade: il testo è diviso in righe
      "Stance:", "Interrupt 1:", "Effect:", "Refresh:" con etichetta in oro e barra a sinistra; il flavour è
      in corsivo. Draken Cross (attacco): Hit → Miss → Area → Effect. Un'abilità non-attacco con Area
      (es. Comet): blocchi prima, Area dopo. Card 💬 in chat: stesso ordine e ora mostra anche Trigger ed
      Effect (prima mancavano).
- [x] **Keyword con tooltip**: nel testo di un'abilità le parole come "slashed", "weakened", "rush 1",
      "true strike", "gamble", "bloodied" sono sottolineate a puntini (gli status in oro); hover → tooltip
      con la regola del glossario. Vale anche per trait, action dei Foe e card in chat. Controlla che non
      ci siano falsi positivi evidenti (es. "cover" usato in senso comune) e che i link/inline roll di
      Foundry funzionino ancora.
- [ ] **Scheda item**: abilità e trait hanno la riga "Power die / starts at / current" e salvano.

## Sessione 5 (7 settembre 2026) — Level Up e Character Creation nello stile della scheda

- [x] **Character Creation, aspetto**: nuovo PG vuoto → "Character Setup Wizard". Banda diagonale in
      alto con ritratto nella tacca, nome in IM Fell, "Level 0 · Ch 1"; rail dei 7 step sotto la banda;
      ogni step è una card con numero e titolo. Ridimensiona la finestra: niente scroll orizzontale, footer
      "Finalize" resta visibile in basso.
- [ ] **CC, Bond → Primary → Power**: scegli un Bond (card) → nel banner compare il badge del bond, lo step 3
      mostra solo le azioni primarie del bond (pill) con la prima già selezionata, lo step 5 mostra solo i
      power di quel bond (card con descrizione). Cambia bond → tutto si aggiorna e le scelte vecchie si
      azzerano.
- [ ] **CC, Extra Dots**: nello step 4 la riga dell'azione primaria è dorata con 2 pallini pieni. Premi +
      su alcune azioni: contatore "N left" scende, a 0 diventa pieno e i + si disabilitano; non si supera
      rating 3 (il + si disabilita); − restituisce il punto. Rail e card dello step diventano oro quando
      i 4 punti sono spesi.
- [ ] **CC, Job → banda e abilità**: scegli un Job (card con striscia del colore di classe) → la banda
      cambia colore (rosso Stalwart, ecc.), il nome del job compare nel banner, lo step 7 mostra solo le
      abilità ch.1 di quel job (card con costo, tag, prima frase). Selezionane 2: contatore "2 / 2" e le
      altre card si disabilitano; deselezionane una → si riabilitano.
- [ ] **CC, Finalize**: con tutti i 7 step in oro (summary "All set") premi Finalize → scheda compilata
      come prima: kin/culture, bond, azioni (primaria 2 + 4 punti), bond power, job con stat/trait/LB,
      2 abilità. Prova anche a premere Finalize con uno step incompleto → messaggio di errore chiaro.
- [x] **Level Up, stage 1**: PG con 15 XP → "Level Up". Banda del colore della classe primaria con
      "N → N+1", chip dei job nella banda, rail "1 Benefits & paths / 2 Your picks". I benefici sono card
      "grant". A L4/L8: le due card "New Job / +1 Mastery" e "Bond Power / Improve 2 Actions"; scegliendo
      "+1 Mastery" la griglia dei job sparisce, con "New Job" ricompare e si può scegliere il job (card).
- [x] **Level Up, stage 2**: "Next" → recap dorato con bottone "← Change" che torna allo stage 1 tenendo
      le scelte. Abilità come card (★ quelle della classe primaria); contatore "AP N left" che scende
      anche scegliendo un Talent; a 0 le card non selezionate si disabilitano. Mastery/Relic/Bond Power
      come card con descrizione. Footer: riepilogo "x/y AP · mastery picked …". "Confirm Level Up" applica
      tutto come prima (livello, AP, item embeddati, messaggio in chat).

## Sessione 4b (9 settembre 2026) — passata sui testi delle abilità, power die per talento, keyword

- [x] **Testi ripristinati (pack Jobs, re-import)**: importa Circle the Oak, Party Favor, Deus Ex Machina,
      Harrow, Exorcism → il flavour in corsivo c'è (prima partivano subito dal blocco). Spirit Shrine: flavour
      + blocchi "Effect:" e "Object Effect:". Assassinate (Shade): flavour + "Effect:".
- [x] **Etichette "End your turn and…"**: apri Eclipse, Morrigan, Six Hells Trigram, Intimidate, Aria → il
      testo è diviso in un blocco con etichetta in oro "End your turn and create a Terrain Effect" / "End your
      turn and gain Delay" / "End your turn and Mark" (+ gli altri blocchi). Le etichette lunghe restano
      leggibili (minuscole nelle parole di mezzo).
- [x] **Gran Reversa, Talent I → d6**: PG Seer con Gran Reversa importata dopo questa build. Senza talento il
      widget dice "Power die d4 · Set out at 4"; scegli Talent I nel pannello → "Power die d6 · Set out at 6",
      il + si ferma a 6. Torna a "none" → d4. Nella scheda dell'abilità, sotto Talent 1, c'è il campo "Power
      die when unlocked" = "d6 starting at 6" (vuoto su Talent 2 / Mastery).
- [x] **Crimson Bloom, Mastery → parte da 3**: Harvester con Crimson Bloom; spunta la mastery → "Set out at 3".
- [x] **Keyword, falsi positivi tolti**: Strongarm (Knave) → "counter clockwise" NON è evidenziato; Valiant
      Talent II → è evidenziato solo "hatred of you" (non "…after this ability resolves"); Gran Reversa flavour
      "wounds heal instantly" NON evidenziato, Phoenix Rage "take a wound" sì; trait "Static charge" di un
      Legend → "ongoing effects" NON evidenziato.

## Sessione 6 (9 settembre 2026) — template Blast / Line / Arc / Burst con auto-target

Prerequisito: scena con griglia quadrata, token del PG e 2-3 token nemici; il giocatore ha il permesso
"Create Measured Template" (default sì).

- [x] **Bottone 📐**: nel pannello di un'abilità con tag di area (Draken Cross con Talent II = Medium Blast,
      Comet = Line, Harvest = Arc 6, Death Blossom = Burst 1) compare "📐 Medium Blast" ecc. Le abilità senza
      area non lo hanno. Stesso bottone sulle action dei Foe (Warrior "Cleave"? cerca un'azione con line/blast)
      e sui Legend (icona 📐 accanto al d20).
- [x] **Blast**: premi 📐 su un Medium Blast → attorno al token compare l'alone blu del range; il 3×3 arancione
      segue il mouse; fuori range è sbiadito e il click avvisa; click dentro → template sul canvas con
      contorno, testo "Medium Blast · Nome", i token dentro diventano target (mirini), notifica con i nomi.
      Small Blast = croce di 5, Large Blast = 5×5 senza angoli. Il layer torna ai token e il token resta
      selezionato.
- [x] **Line**: Comet/Demon Cutter (line 3 senza range) → l'alone del range è solo la corona adiacente; la
      linea parte dalla casella sotto il mouse e punta via dal token; rotella del mouse la ruota di 90° senza
      zoomare la mappa; Esc o tasto destro annulla (niente template, nessun target).
- [x] **Arc**: Harvest (Arc 6) → clic per ogni casella: la prima deve essere adiacente/in range, le seguenti
      ortogonali all'ultima, non sovrapposte, mai sul proprio token (avviso se sbagli); al 6° click il
      template si chiude; Invio o tasto destro chiude prima con le caselle già dipinte.
- [x] **Burst**: Death Blossom (Burst 1) → quadrato 3×3 centrato sul mouse; i target ESCLUDONO il proprio
      token. Un'azione "burst 2 (self)" di un Foe/Legend → nessun clic, template subito attorno al token.
- [x] **⚔ Attack Roll su abilità di area**: con nessun template sulla mappa, ⚔ chiede prima il piazzamento,
      poi apre il dialog boons/curses con "🎯 Target: …" già compilato dai token nell'area; la card in chat ha
      la riga "📐 Medium Blast  Nome1, Nome2  [🗑 area]". Annullando il piazzamento (Esc) non si tira. Un
      secondo ⚔ sulla stessa abilità riusa il template esistente (sposta un token dentro/fuori → i target
      cambiano). Pandaemonium (autohit + blast) → piazzamento, poi card Auto-hit con la riga 📐.
- [x] **🗑 area in chat**: il bottone toglie il template dalla mappa; per un altro utente non autore è
      disabilitato; dopo la rimozione un nuovo render della card lo mostra disabilitato.
- [x] **Sostituzione**: 📐 due volte sulla stessa abilità → resta un solo template (il vecchio sparisce).
      Due abilità diverse → due template.
- [x] **Fine combat**: con template sulla mappa, "End encounter" → Sì → i template ICON spariscono (i
      template "core" disegnati con lo strumento di Foundry restano).
- [ ] **Senza token / griglia**: PG senza token sulla scena → 📐 avvisa e non fa nulla; ⚔ tira normalmente.
      Scena gridless o esagonale → avviso "square grid".
- [ ] **Secondo client**: il giocatore piazza un'area → il GM la vede identica (stesse caselle, colore,
      testo) e vede i mirini dei target del giocatore.
- [ ] **Template core intatti**: gli strumenti Cerchio/Cono/Rettangolo/Raggio di Foundry funzionano come prima.

## Sessione 7 (9 settembre 2026) — pulizia residui: tag override, varianti di area, Aura, larghezza Line

- [x] **Tag override dal pack (re-import)**: Umbra (Shade) importata dopo questa build → spunta la Mastery →
      chip "Range 6" e "Unerring" in oro con tooltip "From Mastery: Devil Frog Technique…"; Harvest Talent II →
      "Range 2" in oro; Valkyrie Talent I → "Range 4"; Sturmreiten Mastery → "Arc 5" (e 📐 offre Arc 5);
      Endless Battlement Mastery → "No Max Range", "Interrupt 2" con tooltip. Le abilità con condizione
      "round 4+" (Soul Shot Talent II → Line 6) mostrano la condizione nel tooltip del chip.
- [x] **Tooltip dei tag nuovi**: chip "Width 2" (Abomination / Hellhound nel pack Foes), "Interrupt 3"
      (Catapult mastery), "No Max Range", "Melee" (Bleak Mercy) → hover mostra la regola.
- [x] **📐 con varianti**: Death Blossom (combo con "Area becomes Arc 4") → il click su 📐 apre un dialog con
      "Burst 1" e "Combo: Arc 4" (+ "Combo: Arc 8"); Pandaemonium → "Medium Blast" e "Charge: Large Blast";
      Wicked Sheath con Talent II → compare "Talent II: Line 4". Un'abilità con un solo pattern non chiede
      nulla. Il dialog chiuso con X non piazza niente.
- [x] **Line con larghezza**: Foe Hellhound, azione "Hellish Breath" (line-4, width-2) → 📐 "Line 4 (width 2)":
      l'anteprima è larga 2; Shift+rotella sposta la colonna extra dall'altro lato; rotella normale ruota.
      Abomination "Scouring beam" (line 10 width 2) idem.
- [x] **Aura che segue il token**: Gran Reversa (aura-2) → nel pannello c'è "📐 Aura 2"; click → nessun
      piazzamento, template oro 5×5 attorno al token con testo "Aura 2 · Gran Reversa", nessun target. Muovi
      il token (come GM, o come giocatore con un GM connesso) → il template si sposta con lui. Con un token
      di taglia 2 l'aura è 6×6. ⚔ Attack Roll su un'abilità che ha SOLO l'aura non chiede piazzamenti.
      "End encounter" toglie anche le aure.
- [x] **Template inutilizzato rimosso**: la scheda Legend si apre e la tab combat funziona come prima
      (`legend-actions.hbs` non esiste più).
- [x] **Battle Demon Heavy**: compendio Foes → cartella Demon › Heavy contiene Armor, Battle, Starving, Gaping,
      Nail e Horn Demon; importa il Battle Demon → classe Heavy, VIT 10 / Def 6 / Fray 4 / Armor 2, trait Guard
      + Engorge. La cartella Demon › Leader non li contiene più.

## Sessione 8 (9 settembre 2026) — Hatred "of X" e Mark per abilità

Prerequisito: scena con il token del PG (es. Knave con Intimidate, o Shade con Harrow), 2 token nemici, combat avviato.

- [x] **Hatred "of X" dalla tab Conditions**: sulla scheda di un Foe (o del PG) clicca "Hatred" → dialog "Hatred
      of…" con la lista dei token della scena (il token targettato è preselezionato con 🎯) e un campo nome
      libero. Scegli un token → il bottone diventa "Hatred of Nome" attivo, l'icona compare sul token, in chat
      "X gains Hatred of Nome". Annulla il dialog → nessun effetto applicato. Clic di nuovo → rimosso.
- [x] **Hatred nell'HUD e con nome libero**: seleziona il token → il pannello status a destra dice "Hatred of
      Nome". Riapplica scegliendo "— other —" e scrivendo "the demon" → "Hatred of the demon".
- [x] **Hatred finisce a fine turno**: il PG con Hatred attivo chiude il proprio turno nel tracker → in chat
      "…'s Hatred of Nome ends (end of turn)", effetto sparito, NESSUN tiro di save per Hatred (gli altri
      status tirano il save come prima).
- [x] **Hatred nel dialog del danno**: PG con Hatred of Goblin. Targetta il Warrior e premi 💥 su un'abilità →
      nel dialog compare la riga "Hatred (½ vs others)" GIÀ spuntata e la nota "Hatred of Goblin: Warrior is
      not your hated foe → half damage"; la card del danno ha lo step "Hatred (½ — not the hated foe)".
      Targetta il Goblin → casella NON spuntata, nota "attacking Goblin → full damage". Nessun target → casella
      vuota con la nota "tick if this isn't Goblin".
- [x] **🎯 Mark target (PG)**: pannello di Harrow (Shade) o Intimidate (Knave) → c'è "🎯 Mark target" (assente
      su abilità senza tag mark). Senza target → avviso "Target exactly one token". Targetta un nemico e premi
      🎯 → in chat "🎯 PG marks Nemico — Harrow" con il testo del blocco "Mark:"; sul pannello compare il chip
      "🎯 Nemico ✕"; sul token nemico l'icona del mark; nella tab Conditions del nemico la sezione "Marks on
      this character" elenca "Harrow from PG" con il testo e "✕ End mark"; nell'HUD del token nemico c'è la
      riga "Harrow (PG)" con ✕ (hover mostra il testo).
- [x] **Un mark per abilità / uno per coppia**: marca il nemico A, poi targetta B e ripremi 🎯 → il mark passa
      a B (A non ce l'ha più, chip aggiornato). Con due abilità mark diverse (Harrow + Nightmare?) sullo stesso
      bersaglio dallo stesso PG → resta solo l'ultima. Due PG diversi marcano lo stesso nemico → due mark.
- [x] **Rimozione**: ✕ sul chip, "✕ End mark" nella tab Conditions, × nell'HUD → il mark sparisce ovunque con
      messaggio in chat. Porta il marcatore a 0 HP → i suoi mark cadono ("N marks from PG end (PG is
      defeated)"). "End encounter" → Sì → spariscono mark e Hatred di tutti.
- [ ] **🎯 Mark sulle azioni NPC**: Foe con un'azione taggata mark (es. Snork "Intimidate", o aggiungi il tag
      "mark" a un'azione) → bottone "🎯 Mark" nella riga dell'azione; funziona come sopra con il testo
      dell'azione. Legend: icona 🎯 accanto al d20.
- [ ] **Giocatore senza permessi**: come utente Player, targetta un Foe del GM e premi 🎯 → notifica "Mark sent
      to the GM…", e (con il GM connesso) il mark compare sul Foe; ✕ dal chip del giocatore lo toglie via GM.
- [x] **Marked generico intatto**: il bottone stackable "Marked: N" nella griglia Negative funziona ancora
      (+1/−1) e non tocca i mark specifici.

## Ancora da verificare con Maar (round 4, 30 agosto)

- [ ] Dropdown `<details>` delle schede PG restano aperti al cambio turno.
- [ ] Burden/Ambition: click sui segmenti e +1 avanzano il clock giusto.
- [ ] Heave-Ho mostra il Trigger; Draken Cross mostra Effect dopo Area.
- [ ] Pannello status del token non copre le tab della sidebar.
- [ ] Badge "Range N" sugli attacchi base; Aether si azzera a fine combat.
