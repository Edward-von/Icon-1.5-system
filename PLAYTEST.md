# PLAYTEST — cose da provare in Foundry (sessione separata, in una sessione dedicata)

Ogni sessione di sviluppo aggiunge qui i suoi test **senza eseguirli**. Una sessione di playtest
dedicata (Foundry aperto sul mondo di test) li esegue, spunta le caselle e riporta
i bug in `TODO.md`. Prerequisito: build deployata in `%LOCALAPPDATA%\FoundryVTT\Data\systems\icon-system`
(ogni sessione la copia a fine lavoro) e F5 nel mondo.

Setup consigliato per il mondo di test: 2 PG (uno Stalwart Demon Slayer con Draken Cross equipaggiato,
uno di un'altra classe), un Foe Heavy importato dal compendio (es. Warrior), l'Armor Demon, il Legend
"Dread Lords", e un combat con tutti dentro.

---

## Esito playtest del 9 settembre 2026 (mondo Jade Regent su foundry.codrillo.it, scena "test")

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

**Segnalazione di Edoardo dal tracker (stessa sera)**: "il PC picks next ma non ho modo di far andare un player" →
i pip erano renderizzati ma fuori dalla sidebar (colonna del nome troppo larga, riga larga 300 px con i pip a
x+296). Corretto via CSS (nome con ellissi, controlli a capo, pip non comprimibili); verificato che il click sul pip
attivi Asteria e "■" chiuda il turno. Nello stesso giro corretto "Round {round}" nell'intestazione (helper
`localize` senza parametri).
- [ ] Da riprovare con la build nuova: tracker con 5+ combattenti (Field Battlemap) → i pip si vedono su ogni riga
      senza scroll orizzontale; lato giocatore compaiono "▶ Take turn" / "■ End turn".

Note per il prossimo playtest in una sessione dedicata: dopo `scene.activate()` ripetuti `game.user.viewedScene`
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
- [x] **PG: jobs e burden non perdono dati**: su una scheda PG con 2 job e un burden con clock
      parzialmente pieno, cambia un campo qualsiasi della testata → job secondario e segmenti del clock
      invariati. ✓ 11 set: copia di Hiroshi (Demon Slayer + Knave) con un burden 3/6, nome cambiato dal form → job e clock invariati
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
- [x] **+1 a inizio round**: passa al round successivo → Party Resolve +1 (setting "Party Resolve +1 at
      the start of each round" ON di default in Configure Settings → System Settings). ✓ 11 set: con l'opzione accesa 0 → 1 → 2 al cambio round. ATTENZIONE: sul mondo di Maar `hrPartyResolveAutoIncrement` è SPENTA (è una house rule, default off): se la vuole va accesa in Configure Settings

## Sessione 3 (7 settembre 2026) — dati compendium, Rampart/Guard, cartelle

- [x] **Armor Demon**: importalo di nuovo dal compendio Foes (cartella Demon › Heavy) → classe Heavy,
      VIT 10 / Def 6 / Fray 4 / d6 / Armor 2, trait Guard presente oltre a Sturdy.
- [x] **Guard → Armor 2**: importa un Heavy qualsiasi (Warrior) → Armor 2. Tira un danno contro di lui
      e premi "Apply Damage" → "2 blocked by Armor". Atrophic Grave (Relict › Heavy) resta Armor 0.
      Nuovo Foe creato da zero → Armor 2 (default Heavy); cambia classe e premi "Apply base stats" →
      Skirmisher/Leader/Artillery tornano a 0. ✓ 10-11 set: Warrior importato → ARM 2 e ogni Apply dice "2 blocked by Armor"; Atrophic Grave e Foe creato da zero non provati
- [x] **Rush X sparito** (✓ 9 set sera: migrazione 5 eseguita sul server, nessun PG ha più Rush X): apri un PG Stalwart esistente → dopo la migrazione (console: "Migration 4")
      il trait "Rush X" non c'è più; restano Armor 2 e Fortify con i pip Vigilance. Crea un nuovo PG
      Stalwart dal wizard → niente Rush X; "Rush X" compare nel dropdown delle regole di classe.
      ✗ 9 set: il PG Hiroshi ha ancora il trait "Rush X" (schema già a 4) → migrazione 5 lo rimuove per nome
- [x] **Cartelle nei compendi**: apri Bond Powers (cartelle per Bond), Gear Kits (per Bond, Adventurer's
      Kit alla radice), Relics (Attack / Round / Gambit Invoke), Foes (Fazione › Classe), Legends
      (Fazione). Drag di un documento da una sottocartella sul canvas/sidebar funziona.

## Sessione 4 (7 settembre 2026) — power die sulle abilità, formattazione abilità

- [x] **Power die su Odinforce**: PG Spellblade con Odinforce importato **dopo** questa build (o con "Power
      die: d6, starts at 3" impostato a mano nella scheda dell'abilità). Nel pannello dell'abilità compare
      "🎲 Power die d6" con il bottone "Set out at 3" → click → mostra 3 con −/+, 🎲 e Discard. + oltre 6
      resta a 6 con avviso; − fino a 0 → "discarded" e torna il bottone Set out. 🎲 tira 1d6 in chat con il
      nome dell'abilità e i tick. ✓ 11 set (Odinforce dal pack: d6, starts at 3; + si ferma a 6 senza avviso visibile; − fino a 0 → torna "Set out at 3")
- [x] **Power die su un trait**: Sealer con Godly Smite → stesso widget sulla card del trait (d6, starts at 1). ✓ 11 set (Godly Smite dal pack: "Set out at 1" sulla card del trait)
- [x] **Card in chat**: con il die attivo, 💬 Show in Chat mostra il badge "🎲 d6: N" nella testata. ✓ 11 set ("🎲 d6: 6" nella testata)
- [x] **Reset a fine combat**: die attivo, "End encounter" → Sì → il die torna non attivo.
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
- [x] **Scheda item**: abilità e trait hanno la riga "Power die / starts at / current" e salvano. ✓ 9 set (giro esplorativo: la scheda item salva "Power die when unlocked")

## Sessione 5 (7 settembre 2026) — Level Up e Character Creation nello stile della scheda

- [x] **Character Creation, aspetto**: nuovo PG vuoto → "Character Setup Wizard". Banda diagonale in
      alto con ritratto nella tacca, nome in IM Fell, "Level 0 · Ch 1"; rail dei 7 step sotto la banda;
      ogni step è una card con numero e titolo. Ridimensiona la finestra: niente scroll orizzontale, footer
      "Finalize" resta visibile in basso.
- [x] **CC, Bond → Primary → Power**: scegli un Bond (card) → nel banner compare il badge del bond, lo step 3
      mostra solo le azioni primarie del bond (pill) con la prima già selezionata, lo step 5 mostra solo i
      power di quel bond (card con descrizione). Cambia bond → tutto si aggiorna e le scelte vecchie si
      azzerano.
- [x] **CC, Extra Dots**: nello step 4 la riga dell'azione primaria è dorata con 2 pallini pieni. Premi +
      su alcune azioni: contatore "N left" scende, a 0 diventa pieno e i + si disabilitano; non si supera
      rating 3 (il + si disabilita); − restituisce il punto. Rail e card dello step diventano oro quando
      i 4 punti sono spesi.
- [x] **CC, Job → banda e abilità**: scegli un Job (card con striscia del colore di classe) → la banda
      cambia colore (rosso Stalwart, ecc.), il nome del job compare nel banner, lo step 7 mostra solo le
      abilità ch.1 di quel job (card con costo, tag, prima frase). Selezionane 2: contatore "2 / 2" e le
      altre card si disabilitano; deselezionane una → si riabilitano.
- [x] **CC, Finalize**: con tutti i 7 step in oro (summary "All set") premi Finalize → scheda compilata
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
- [x] **Senza token / griglia**: PG senza token sulla scena → 📐 avvisa e non fa nulla; ⚔ tira normalmente.
      Scena gridless o esagonale → avviso "square grid". ✓ 9 set (giro esplorativo: scena senza griglia → avviso); il caso "PG senza token" non provato
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
- [x] **🎯 Mark sulle azioni NPC**: Foe con un'azione taggata mark (es. Snork "Intimidate", o aggiungi il tag
      "mark" a un'azione) → bottone "🎯 Mark" nella riga dell'azione; funziona come sopra con il testo
      dell'azione. Legend: icona 🎯 accanto al d20. ✓ 9 set (giro esplorativo: foe che marca un PG dalla scheda del token, mark su due token dello stesso foe)
- [x] **Giocatore senza permessi**: come utente Player, targetta un Foe del GM e premi 🎯 → notifica "Mark sent
      to the GM…", e (con il GM connesso) il mark compare sul Foe; ✕ dal chip del giocatore lo toglie via GM.
- [x] **Marked generico intatto**: il bottone stackable "Marked: N" nella griglia Negative funziona ancora
      (+1/−1) e non tocca i mark specifici.

## Restyle dei dialog di tiro (9 settembre 2026, sera)

Verificato sul server il 9 settembre sera (build fe0aea6): attacco con Dazed+dislivello (chip, stepper, anteprima, card
"12 vs DEF 8 HIT"), danno con Crit + Resistance (card "2[d8]: [8,7] 15 + fray 4, ½ → 9"), Foe Cleave con banda rossa e
malus dislivello. Non provato: Legend (stesso codice del Foe) e il caso senza bersaglio.

- [x] **Attack dialog**: PG con un token nemico targettato, ⚔ su un'abilità → banda del colore della classe con
      ritratto e nome dell'abilità, badge costo e chip dei tag, "d20" a destra; card 🎯 con ritratto/nome/DEF/ARM/HP
      del bersaglio; chip "⚙ Dazed: +1 curse" se ha Dazed e "⚙ Height advantage" se ha elevation; stepper −/+ per
      Boons e Curses (non scendono sotto 0); Defense precompilata; l'anteprima cambia mentre modifichi
      ("1d20 + best of 1d6 vs DEF 6"). "⚔ Roll Attack" in oro; la card in chat è uguale a prima.
- [x] **Damage dialog**: 💥 → segmenti Hit / Crit / Miss / Area con la formula; click su Crit → anteprima con un dado
      in più; chip Vulnerable/Resistance/Weakened attivabili (oro quando attivi); con Hatred attivo il chip rosso
      "Hatred of X ½" già acceso se il bersaglio non è X; bonus dice con stepper → anteprima "roll 3d8, keep 2".
      "💥 Roll Damage" → card con gli step giusti e il nome del bersaglio targettato.
- [x] **Foe e Legend**: ⚔ e 💥 sulle azioni aprono gli stessi dialog con la banda rossa NPC e il ritratto del foe;
      il dado mostra il [D] del foe (d6) / della legend (d8) e il suo fray.
- [x] **Senza bersaglio**: card tratteggiata "No token targeted — hover a token and press T", Defense vuota,
      anteprima "No Defense: the card shows the total".

## Relay giocatore → GM (9 settembre 2026, sera, dopo il riavvio con socket attivo)

Verificato con GM e Player collegati insieme (due tab, build 1.1.0): 🎯 mark di Esther su Sikutsu → "Mark sent to the
GM" e il GM crea l'effetto con la card in chat; "Apply" sulla card del danno da Player → "→ Sent to GM" e HP 27 → 21;
"+" del Party Resolve dal tracker come Player → 0 → 1 sul combat e sui PG. Dati di prova poi ripristinati.
- [x] Mark relay, Apply Damage relay, Party Resolve relay.
- [ ] Da riprovare con Maar: richiesta di attivazione di un NPC da Player (chevron → avviso al GM con suono).

## Residui piccoli (9 settembre 2026, sera) — FATTI

Provati dalla tab GM con copie TEST: Shift+rotella sposta la colonna extra della Line larga (cols 6-7 → 7-8) senza
zoom e la rotella normale ruota; wizard di creazione completato via DOM (kin, culture, bond Mighty, primaria Sneak,
4 punti, potere, job Chanter, 2 abilità, Finalize → PG con bond, potere, trait di classe, LB e abilità); power die di
Odinforce 3 → 0 con End Encounter; dialog danno senza bersaglio (card tratteggiata "No token targeted…"); dialog
danno del Legend (Earth Breaker, banda rossa, [D] d8, fray 3).
Trovato e corretto: "End encounter" puliva i template della scena **visualizzata** invece di quella del combat; il
Finalize del wizard accettava abilità di un job diverso se spuntate via DOM (le card nascoste): ora le rifiuta.

## Sessione 9 (9 settembre 2026) — Relic integration: reminder sulle abilità e Invoke (Attack, N+)

**Esito del playtest del 9 settembre 2026 (sera, sul mondo Jade Regent, scena "test", build 1.3.0)**:
provato con una copia "TEST Asteria" (Blitz, Odinforce, Atherwand, Sturmreiten) e le reliquie Byrax, Ape God, Ruin,
Esper, Skipjack, Conquering King, Paleblood, Arenheir dal pack; tutto cancellato a fine prova. Tutto ok: reminder per
rango (Byrax I → III → Aspect → rimossa), Ruin/Skipjack/Conquering King sulle abilità giuste, Esper II "Range of cure
effects +2" su un testo con "cure", card 💬 con le righe ✦, Invoke Ape God spento su 7/4/3/13/6 e acceso su un 17
grezzo con "Stun your attack target.", soglie Aspect (Paleblood 12+, Conquering King una riga 15+), attacco base con
Invoke + Ruin + Skipjack, round 5 → "Round 5: this ability deals bonus damage (Round 5+)" e Arenheir III "exceed on
12+, crit on 17+", round 3 → "exceed on 13+, crit on 18+". Non provata la card Auto-hit (nessuna abilità autohit sul PG).

Prerequisito: un PG con reliquie dal compendio Relics (drop sulla tab Relics). Suggeriti: **Byrax** (stance),
**Ape God** (Invoke Attack 17+), **Ruin** (attacchi), **Esper** o **Mercy** (cure), **Skipjack** (range +1),
**Conquering King** (round). I rank si alzano dalla tab Relics (↑ Upgrade, serve Dust: mettere Dust a 30 nel
Narrative per provare). Le reliquie NON sono automazione: sono righe di promemoria, i numeri non cambiano.

- [x] **Reminder sul pannello abilità**: PG con Byrax rango I e un'abilità con tag `stance` (es. un Colossus,
      o aggiungi il tag "stance" a un'abilità) → nel pannello dell'abilità, dopo Talent/Mastery e prima del
      blocco COMBO, la riga viola "✦ Byrax I: Whenever you refresh this stance, dash 1." (hover sull'etichetta →
      tooltip "From the relic Byrax (rank I)"). Un'abilità senza tag stance NON ha la riga.
- [x] **Rango che cambia i reminder**: porta Byrax a rango III → sulla stessa stance compaiono anche "Byrax III:
      On the first turn of combat, you may take this stance as a free action" (solo se costa 1 action o free) e,
      ad Aspect, "Byrax Aspect: You can hold one more stance than normal". Togli la reliquia (×) → righe sparite.
- [x] **Reminder per attacchi / cure / range**: con Ruin I ogni abilità d'attacco ha "✦ Ruin I: Once per attack,
      trade 1 boon for bonus damage." (abilità non-attacco: niente). Con Esper II un'abilità che dice "cure" ha
      "Range of cure effects +2". Con Skipjack I un'abilità con tag `range-4` mostra "Range 5 (listed range +1)".
- [x] **Card in chat**: 💬 Show in Chat sull'abilità → le stesse righe ✦ in fondo alla card (anche in modalità
      COMBO). Anche i Foe/Legend restano senza righe (le reliquie sono solo dei PG).
- [x] **Invoke (Attack, N+) sul tiro d'attacco**: PG con Ape God I, ⚔ su un attacco → nella card del tiro, sotto
      HIT/MISS, la riga "Invoke — Ape God I (17+ · d20 N)": se il d20 GREZZO (non il totale con i boon) è ≥ 17 è
      accesa in oro con "✦ Invoke" e "Stun your attack target."; altrimenti grigia con "not triggered". Ripeti
      finché escono entrambi i casi. Con Ape God ad Aspect, quando scatta, in corsivo la nota dell'Aspect (bonus
      damage, shove…). Con due reliquie Invoke Attack (es. + Gloam 14+) → due righe.
- [x] **Soglia abbassata dall'Aspect**: Paleblood a rango Aspect → la riga dice "Paleblood II (Aspect) (12+ …)"
      invece di 16+. Conquering King ad Aspect → UNA sola riga "Conquering King III (Aspect) (15+ …)", non due.
- [x] **Auto-hit e attacco base** (attacco base OK; auto-hit non provato): un'abilità auto-hit (tag `autohit`) con Ape God → nella card "Auto-hit" compare
      comunque la riga Invoke con un d20 tirato e la nota "1d20 rolled only to check the relic invoke (p.245)".
      ⚔ sull'attacco base (Basic/Heavy) → riga Invoke e reminder da attacco (es. Ruin I) presenti. ✓ 11 set: TEST Autohit con Ape God I → card "Auto-hit" con "✦ Invoke — Ape God I (17+ · d20 17): Stun your attack target" acceso e spento con 4/10/15; nota "1d20 rolled only to check the relic invoke"
- [x] **Reminder legati al round**: Conquering King I, combat NON avviato → sul pannello "Round 5+: this ability
      deals bonus damage" (sempre visibile); sulla card del tiro d'attacco la riga NON c'è finché il combat non
      è al round 5; al round 5+ compare "Round 5: this ability deals bonus damage (Round 5+)". Arenheir III al
      round 3 → "Round 3: exceed on 13+, crit on 18+".
- [x] **Nessun errore in console** aprendo la scheda di un PG senza reliquie, di un PG con reliquie rinominate
      (es. "Byrax (Edo)": nessuna riga, nessun crash), e tirando un attacco da Foe/Legend/Summon (card invariata).

## Sessione 10 (9 settembre 2026) — Encounter Designer

**Esito del playtest del 9 settembre 2026 (sera, stessa sessione)**: **bug bloccante trovato e corretto**: il designer
non si apriva affatto (`Cannot set property state of ApplicationV2 which has only a getter`: `this.state` è riservato
in AppV2 → rinominato `this.enc`); provato con una toppa in pagina, poi fix nel codice. Verificato ok: party
preselezionato dai token in scena, toggle PG / On scene / All, budget = giocatori + 1, one-fight 2 × giocatori,
Adjust, Chapter cap (351 → 285 con Ch1, 404 con "Higher chapters"), filtri fazione/classe/sorgente (World = 1,
Both = 352), ricerca senza perdere il focus, "+" e doppio click (qty, turni, banda), −, Elite (80 HP, 2 turni, 2 pt,
disabilitato su Jotunn/Legend/Mob, mob "6 members"), Legend = tutto il budget + secondo Legend rifiutato + over
budget, riserva R2 (riga tratteggiata, "7 on map · 4 in reserve"), Random fill Folk per esattamente 3 punti e avviso
a budget pieno, Save/New/Load/✕ con conferma, card sussurrata ai due GM, 📥 4 attori in "Encounter: Prova" con flag,
🗺 Deploy (4 token, 1 nascosto, combat con i PG in scena), 👁 Reveal reserves (Cook visibile e nel tracker, "✓ 1
revealed"), chiudi/riapri = stessa istanza. Altri due difetti corretti: dopo "Clear" il campo di ricerca restava
scritto (AppV2 conserva il valore del campo a fuoco) e la riga dell'encounter schiacciava il nome a una lettera
(ora i controlli vanno a capo). Note: i token creati sono **linkati** (IconActor linka ogni nuovo attore; con un attore
per corpo va bene) → aspettativa "non linkato" corretta; nel pack il Nilfling (Jotunn) non è Elite (TODO); la scena
"test" ha token doppi dei PG, per cui "+ party" li aggiunge tutti (corretto). Non provati: client Player, resize.

Prerequisito: GM, un mondo con 2-3 PG (almeno uno con token sulla scena aperta), scena con griglia. Il designer
si apre dal bottone **"♞ Encounter"** in cima alla sidebar Actors, dalla macro "ICON: Encounter Designer" nel
compendio Macros, o da console con `game.icon.openEncounterDesigner()`. Regole: ICON 1.5 p.292 (budget =
giocatori + 1; mob 1, foe 1, elite 2, Legend = tutto il budget), p.298 (mob: 2 membri/giocatore; Legend: 50 HP
per giocatore, min 100), p.299 (template Elite: 2 turni, HP ×2, 2 punti).

- [x] **Apertura e party**: bottone "Encounter" visibile solo al GM (da client Player: assente; macro → avviso).
      All'apertura sono selezionati i PG che hanno un token sulla scena corrente (se nessuno: tutti); con 3 PG
      la banda dice "0 / 4 points", "3 players", "Chapter ≤ N" con N = capitolo più alto del party.
      Click su un PG lo toglie/aggiunge → budget aggiornato subito. "On scene" / "All" cambiano la selezione.
- [x] **Regole del budget**: spunta "One-fight rule" → budget 2 × giocatori (3 PG: 6) e la banda dice "· one fight";
      "Adjust" −/+ cambia il totale (3 PG, +1 → 5); "Chapter cap" a "Chapter 1" nasconde nel roster i foe Ch2/Ch3
      (es. Abomination Ch2 sparisce), "Higher chapters" li rimostra.
- [x] **Roster**: con i filtri a zero e sorgente "Compendium" il contatore dice "404 shown" (376 foe + 28 legend);
      filtro Faction "Jotunn" → solo Jotunn, tutti con badge Elite e costo 2; Class "Mob" → i 13 mob;
      cercando "guard" mentre si digita il campo NON perde il focus e il contatore scende; sorgente "World" mostra
      i foe già importati nel mondo (badge "world"), "Both" entrambi; ↻ ricarica; "Clear" azzera i filtri.
      👁 apre la scheda del foe del compendio (sola lettura).
- [x] **Aggiungere**: "+" su Warrior → riga in "Encounter" con "Heavy · Folk · Ch1 · 40 HP · 1 turn/round", costo 1,
      banda "1 / 4"; di nuovo "+" (o doppio click sulla riga del roster) → quantità 2, costo 2. Il roster NON
      scorre in cima quando si aggiunge (solo party/encounter/banda si ri-renderizzano). −/+ e il campo numerico
      cambiano la quantità; − a 1 rimuove la riga; ✕ rimuove; "Clear" svuota tutto.
- [x] **Elite**: bottone "Elite" sul Warrior → oro, "80 HP", "2 turns/round", costo 2 per corpo (×2 → 4, banda
      "4 / 4" in oro e bordo del blocco dorato). Su un Jotunn (es. Aetnir) il bottone è già acceso e disabilitato
      (tooltip "Always Elite"); su un Mob disabilitato ("Mobs can't…"); con 3 PG il mob dice "6 members".
- [x] **Legend**: "+" su Dread Lords → costo = budget (4), "3 turns/round · scaled for 3 players", HP 150; il
      suggerimento "A Legend is worth the whole budget" compare; un secondo Legend è rifiutato con avviso.
      Aggiungendo altro si va over budget: contatore rosso, bordo rosso, "Over budget by N".
- [x] **Riserve**: select "Reserve · R2" su una riga → riga tratteggiata, "Reserve · end of round 2" nella riga e
      "X on map · Y in reserve" nella banda; il totale conta anche le riserve.
- [x] **🎲 Random fill**: filtro Faction "Folk", budget 4 con 1 punto già speso → il riempimento aggiunge foe
      Folk per esattamente 3 punti (niente Legend; un elite solo se restano ≥ 2 punti); con budget pieno → avviso.
- [x] **Salvataggi**: senza nome "Save" avvisa; con nome "Prova" → compare nel menu; "New" azzera picks/nome
      tenendo il party; "Load" ripristina picks, riserve, elite e nome; F5 → il salvataggio c'è ancora (world
      setting); "✕" chiede conferma e cancella.
- [x] **💬 Chat**: card "Encounter Designer" sussurrata ai GM (il Player non la vede) con "N / M points", elenco
      "On the map" con qty × nome, classe, Elite, turni e costo; sezione "Reserve" con "enters at the end of
      round 2"; footer con la formula.
- [x] **📥 Actors**: crea la cartella Actors "Encounter: Prova" (rosso scuro) con un attore per corpo ("Warrior 1",
      "Warrior 2"); il Warrior elite ha Elite spuntato, HP 80/80 e il trait "Elite" in cima; il mob ha 6 membri
      e 12 hit; il Legend ha playerScale 3 e HP 150/150; token prototipo ostile (linkato: un attore per corpo). Card in chat con
      "Actors in folder …". Gli attori creati NON compaiono nel roster "World" (flag encounter).
- [x] **🗺 Deploy**: con nessuna scena aperta il bottone è disabilitato (tooltip "Open a scene first"); over budget
      → dialog di conferma. Con una scena con griglia: token disposti in file vicino al centro della vista
      (i size 2 occupano due celle, seconda fila separata), combat creato/aggiornato con i foe "On map" e — se
      "+ party" è spuntato — i token dei PG selezionati presenti sulla scena (non duplicati se già dentro); i
      token in riserva sono NASCOSTI e NON nel combat; avviso "Deployed N token(s) (K hidden in reserve)".
- [x] **Reveal reserves**: sulla card del deploy il bottone "👁 Reveal reserves & add to combat" (solo GM:
      il Player lo vede disabilitato) → i token nascosti diventano visibili e finiscono nel tracker, bottone
      "✓ K revealed" disabilitato; ripremuto non duplica; se i token sono stati cancellati → avviso.
- [x] **Robustezza**: nessun errore in console aprendo/chiudendo/riaprendo il designer (riapertura = stessa
      finestra portata in primo piano), ridimensionando la finestra (roster e picks scorrono dentro le proprie
      liste, footer sempre visibile), con un mondo senza PG ("No player characters…"), su scena senza griglia
      (i token vengono comunque piazzati).

## Sessione 11 (9 settembre 2026) — Status inflitti dal testo: blocco "Inflict" sulle card, save 10+

**Esito del playtest del 9 settembre 2026 (sera, sul mondo Jade Regent, scena "test", build 1.3.0)**:
provato con copie "TEST" di Hiroshi, Caienna (+ Implode dal pack), Brawler, Armor Demon, Underboss, Hessian e Farmer,
poi cancellate insieme a combat, token, cartella e 16 messaggi; la Field Battlemap non è stata toccata. Nessun errore
in console. Le caselle spuntate sono verificate; le altre non sono state provate (relay da un secondo client, card
Auto-hit, interrupt/round action, Dice So Nice, bottone "+" ongoing da testo, "+1 curse" dal testo — verificato solo
offline). Unico difetto: il simbolo "⚄" non esiste nel font della chat e appariva come un quadratino → sostituito
con 🎲 (fix nella build successiva).

Prerequisito: un PG con abilità che infliggono status (es. Demon Slayer: Demon Cutter "Attack target is slashed";
Enochian: Implode "must save or be stunned"; Knave: Low Blow / Dark Knight per Hatred), un Foe con azioni simili
(Brawler "Haymaker": "must save or take [D]+fray and become stunned, or just fray damage on a successful save";
Armor Demon "Aura of Slaughter": "must save or gain hatred of the demon. Bloodied foes fail the save"; Underboss
"Swindle": "Foes can pass a save to avoid this effect, but are pacified on a successful save"), token sulla scena,
combat aperto. Regole: p.94 (save = 1d20, 10+), p.104 (Hatred of X), p.108.

- [x] **Blocco "Inflict" sulla card d'attacco**: targetta il Warrior (T), ⚔ su Demon Cutter → sotto Hit/Miss
      compare "INFLICT — click to apply · 🎲 = save first (10+)" con una riga "Warrior" e il bottone "Slashed"
      etichettato con il blocco di provenienza ("Effect"). Con due token targettati → due righe. Senza target →
      una riga tratteggiata "🎯 Current targets".
- [x] **Esito che attenua i gruppi**: su un'abilità con "Hit: … dazed" e "Exceed: … stunned" (o un foe con
      "Exceed: Foe is also stunned", es. Hessian Long Rifle) un tiro sotto 15 mostra il gruppo Exceed sbiadito e
      tratteggiato (tooltip "Not triggered by this roll"), ma ancora cliccabile; un miss sbiadisce il gruppo Hit.
      Senza Defense inserita (isHit ignoto) niente è sbiadito.
- [x] **Applicazione diretta**: click su "Slashed" → il Warrior ha l'effetto Slashed (icona sul token, tab
      Conditions), card blu in chat "Warrior is now Slashed — Demon Cutter (Hiroshi)", il bottone diventa
      "✓ Slashed" verde e disabilitato. Un secondo click sulla stessa card non è possibile; con un'altra card lo
      stesso status non viene duplicato ("is already Slashed").
- [x] **Save (🎲)**: Foe Brawler, ⚔ su Haymaker con un PG targettato → bottone "🎲 Stunned" viola. Click → dialog
      "Save vs Stunned — <PG>" con la frase del testo, boons/curses a 0, select "Roll 1d20 now". Save → card
      "Save vs Stunned" con sottotitolo "Haymaker — Brawler → <PG>", totale vs 10: con 10+ "Saved! Stunned
      avoided." e bottone "✓ saved"; con 9- "Failed — Stunned applied." + card "is now Stunned … save 7" e lo
      status sul PG.
- [x] **Bonus al save**: PG con 2 cariche Blessed (tab Conditions) → nel dialog compare "Spend a Blessed charge
      for +1 boon (2 left)"; spuntato → la card del save mostra "d20 N +K (blessing)" e le cariche scendono a 1.
      Testo con "+1 curse on the save" (es. talento Sisyphus del Seer, o un foe con "foes gain +1 curse on the
      save") → campo Curses precompilato a 1 e nota "⚙ +1 curse from the ability text".
- [x] **"Bloodied foes fail the save"**: Armor Demon, 💬 su Aura of Slaughter con un PG bloodied targettato →
      "🎲 Hatred"; click → nel dialog la spunta "Automatic failure — the text says bloodied characters fail this
      save (<PG> is bloodied)" è già attiva → nessun tiro, il PG guadagna "Hatred of Armor Demon" (card di
      marks.mjs) e a fine del suo turno l'Hatred cade da solo. Con un PG a HP pieni la spunta è disattiva.
- [x] **Status sul successo**: Underboss/Quickfinger "Swindle" ("pacified on a successful save") → bottone
      "🎲 Pacified" con bordo doppio e tooltip "applies on a SUCCESSFUL save"; save riuscito → "Saved — Pacified
      applies on a successful save." e lo status VIENE applicato; fallito → "Failed — the failed-save outcome
      applies instead" e niente Pacified.
- [x] **Già tirato**: nel dialog scegli "Already rolled — failed" → nessun tiro, status applicato con nota
      "failed save"; "Already rolled — succeeded" → chat "saves against …", niente status.
- [x] **Ongoing "+"**: abilità con "blinded+" (es. Mist Strider del Warden, Terror Demon "Terrorize" o un foe
      con "sealed+") → bottone "Blind+" con bordo oro; applicato → effetto ongoing (icona "+", nessun save di
      fine turno). Su un bersaglio che ha già Blind normale → "upgraded to ongoing".
- [x] **Card 💬 (senza tiro)**: PG Enochian, targetta un foe, 💬 su Implode → in fondo alla card "INFLICT" con
      "🎲 Stunned (Effect)"; stesso blocco sulle card 💬 delle action/interrupt/round action di Foe e Legend
      (es. Dread Lords) e sulla card "Auto-hit" delle abilità autohit (The Tower del Seer: "foe is sealed").
      Talent I/II e Mastery compaiono solo se sbloccati sulla scheda dell'abilità; con il Combo armato si legge
      il testo Combo.
- [x] **Niente falsi bottoni**: 💬 su abilità/azioni che NOMINANO uno status senza infliggerlo → nessun blocco
      "Inflict": Farmer "Righteous fist" (solo "bonus damage to weakened foes" + "Collide: Foe is weakened" → solo
      il Collide), Baggoth "Terraslam" ("against weakened or slashed foes"), Cantrix "Chant of investiture"
      ("the Cantrix is immobile" = se stessa), Geyser/Rime dello Stormbender ("Salt Sprite — Size 1, intangible,
      immobile"), Rogue "Wicked Slice" (lista "bloodied, blinded, dazed"), Geryan "Terms" (gli alleati guadagnano
      hatred). Noto e accettato: Freelancer "Showdown" ("become immobile" riferito a sé) mostra un bottone
      Immobile di troppo.
- [x] **Riga "🎯 Current targets"**: card postata senza target → click su un bottone senza token targettato →
      avviso "Target a token first"; con un token targettato → applica; la riga resta usabile (non si disabilita).
- [x] **Relay giocatore → GM**: da un client Player, card del proprio PG con un foe (non posseduto) targettato →
      click "Dazed" → avviso "sent to the GM", bottone "→ GM"; sul client GM il foe riceve lo status e la card
      "is now Dazed". Il tiro del save avviene sul client del giocatore. Con Hatred: passa dal relay dei mark. ✓ 10 set (sera): dal client "edoardo" bottone "🎲 Stunned 💥" sulla card di Haymaker con il Warrior (non posseduto) targettato → save → bottone "→ GM", Stunned applicato dal GM + card del danno
- [x] **Nessun errore in console** aprendo card vecchie (senza blocco), cliccando bottoni su una card il cui
      bersaglio è stato cancellato (avviso "no longer exists"), e con Dice So Nice attivo (il d20 del save
      viene animato). ✓ 11 set: 46 card d'attacco e 27 di danno pre-1.3.0 renderizzate senza errori; Apply su una card il cui attore non esiste più → notifica "Could not find target actor for damage application", nessun crash
- [x] **Regressioni**: card d'attacco senza status (Basic Attack) invariata; save di fine turno del tracker
      (rollEndOfTurnSaves) ancora con "Saved! X cleared." / "Failed — X persists."; mark 🎯 e Hatred dalla tab
      Conditions come prima.

## Esito playtest del 10 settembre 2026 (mondo Jade Regent su foundry.codrillo.it, build 1.5.0)

Il server aveva ancora la 1.3.0: Edoardo ha caricato la 1.5.0 (cartella `Desktop\icon-system` rigenerata) e il
playtest è partito dopo. Scena "test" (attiva, griglia 100 px), combat di prova con copie TEST (PG "TEST Hiroshi"
= Hiroshi + Rigoletto/Hermes/Erenbrass/Paleblood/Byrax + Showdown/Spinning Top/Revenge; "TEST Guard" = Asteria +
Rigoletto III→Aspect/Sleipnir Aspect/Storm Lord; Warrior, Trooper, Rogue, Brawler, Nilfling, Assassin, Skulk dal
compendio; un summon TEST). Tutto cancellato a fine sessione, anche i messaggi in chat; il combat della Field
Battlemap è di nuovo quello attivo. Relay giocatore provato con l'utente "edoardo" in una seconda scheda.

**Sessione 12: 15 caselle su 16 ok**, **Sessione 13: 21 su 23 ok**. Bug trovati (in `TODO.md`, Sessione 14):
- **Tag `true strike` sull'abilità/azione non ignora l'Evasion**: solo lo status True Strike sull'attaccante lo fa.
  Il Warrior con Cleave (true strike) ha fatto tirare il d6 al PG.
- **"Applies to" nella tab Relics non compare mai**: il codice cerca `relicReminders` sugli Item grezzi
  (`context.abilityItems`) invece che sui dettagli (`context.abilityDetails`).
- **Card dei trait NPC senza blocco Inflict/Gain/Effects** (💬 su un trait): Titanfall del Jotunn è un trait, quindi
  il bottone "🎲 💥 6 / 3" non è raggiungibile dal pack (provato copiando il testo in un'azione: funziona).
- Cosmetici: etichetta "EVASION" che va a capo nella colonna stretta della chat; d20 mostrato anche con
  "MISS — evaded" (la nota dice "no attack roll"); riga ⚙ del dialog che dice "rolls 1d6 (3+)" con Rigoletto
  Aspect attivo (il chip dice "sure"); riga "⚙ Dodge … from Miss / Area" nel dialog del danno anche con esito Hit;
  "Hold the Line!" dà anche resistance nel testo ma i bottoni Gain sono solo Sturdy e Counter; card del save
  "Damage: 6 / 3 on a successful save avoided."; dialog d'attacco dei summon ancora vecchio stile.

Non provato: Dice So Nice (d6 prima del d20), F5 per il chip Cover su card vecchie, gambit fuori combat e
azzeramento a nuovo combat, Scheherezade / Trollhide / "Start of combat", chip "+1 curse on the save" assente,
condizione non leggibile (solo ⚠), esito "Area" con Dodge, card del danno vecchie (senza flag).

## Sessione 12 (9 settembre 2026) — Automazione difensiva: Evasion, Dodge, Cover / Resistance (versione 1.4.0)

Prerequisito: un PG e un Foe con token sulla scena, combat aperto. Gli status si mettono dalla tab Conditions
(o dall'HUD del token): **Evasion**, **Dodge**, **Cover**, **Resistance**, **True Strike**. Regole: Evasion p.146
(1d6, 4+ = miss, prima del tiro d'attacco), Dodge p.144 (immune al danno da attacchi mancati, save riusciti, area),
Cover p.92 (½ danno, deciso quando il danno viene applicato), True Strike p.117 (ignora dodge, evasion, blind,
stealth). Verificato offline (Node) con attori finti: soglie, Rigoletto (la reliquia dell'evasion: nel pack si chiama così, non "Spinning Top"), True Strike, Dodge su miss/area,
Cover+Resistance una volta sola, "già dimezzato sul tiro".

- [x] **Chip nel dialog d'attacco**: metti Evasion sul Warrior, targettalo e ⚔ su un attacco del PG → nella card
      "🎯 Target" sotto DEF/ARM/HP compare il chip blu "Evasion 4+" e tra i modificatori automatici la riga
      "⚙ Evasion: Warrior rolls 1d6 (4+ = miss) before the attack".
- [x] **Evasion sul tiro**: "⚔ Roll Attack" → nella card in chat, sopra HIT/MISS, il blocco "EVASION — 1d6 per
      target with Evasion" con la riga "Warrior [d6] evaded (4+) — the attack misses them" (verde) oppure "no
      effect (needed 4+)". Con un 4+ il risultato è "MISS — evaded" con la nota "Every target evaded: no attack
      roll…", i blocchi Hit/Exceed/Crit sono sbiaditi, gli Invoke delle reliquie non compaiono e nel blocco
      Inflict la riga del Warrior è sbiadita con "(evaded)". Con Dice So Nice si vede il d6 prima del d20. ✓ 10 set (il d20 resta visibile anche su "MISS — evaded", etichetta EVASION va a capo nella chat stretta: cosmetici, in TODO)
- [x] **Due bersagli, uno solo con Evasion**: targetta Warrior (Evasion) e Archer, tira → il blocco Evasion
      elenca solo il Warrior; se evade, il risultato resta HIT/MISS normale (vale per l'Archer) e solo la riga
      del Warrior nell'Inflict è sbiadita.
- [x] **Rigoletto I** (corretto in Sessione 13: la reliquia dell'evasion nel pack si chiama Rigoletto): PG con Evasion e la reliquia al rango I equipaggiata, targettato da un Foe:
      chip "Evasion 3+" e riga "evaded (3+)" con un 3.
- [x] **True Strike**: metti True Strike sull'attaccante → il dialog dice "True Strike: ignores Evasion (Warrior)"
      e la card mostra "Evasion ignored — attacker has True Strike (p.117)" senza d6. Lo stesso con Unerring. ✗ 10 set: OK con lo STATUS True Strike sull'attaccante; il TAG `true strike` dell'abilità/azione (Demon Cutter, Cleave, Brutal Strike) NON ignora l'Evasion → TODO Sessione 14 → corretto in Sessione 14 (tag dell'abilità/azione), verificato il 10 set sera
- [x] **Auto-hit non passa dall'Evasion**: un'abilità auto-hit contro un bersaglio con Evasion → nessun blocco
      Evasion sulla card Auto-hit (p.113: gli effetti automatici passano).
- [x] **Cover su Apply**: metti Cover sul Warrior, tira il danno (Hit, 7 punti per esempio) → nella card del danno
      la riga del Warrior ha il chip verde "Cover ½"; "Apply 7" → card "Damage Applied … halved (Cover)" con
      HP ridotti della metà dopo l'armatura (es. 7 − ARM 1 = 6 → 3), bottone "✓ Applied 3 (½ Cover)". Il
      bottone "½" a fianco resta manuale (dimezza sempre, senza motivo). ✓ 10 set (7 − ARM 2 = 5 → 2)
- [x] **Niente doppio dimezzamento**: nel dialog del danno spunta "Resistance / Cover ½" (il chip dice "auto on
      Apply" e il riquadro "⚙ ½ on Apply: Warrior") → la card ha già il passo "Resistance (halved)", la riga del
      Warrior mostra "Cover (already ½)" e "Apply" NON dimezza di nuovo.
- [x] **Cover + Resistance**: entrambi sul bersaglio → un solo ½ ("halved (Cover + Resistance (½ once))").
- [x] **Cover deciso al momento**: tira il danno SENZA Cover sul bersaglio, poi metti Cover e riapri la chat
      (scroll o F5) → il chip "Cover ½" compare sulla card già postata e "Apply" dimezza. ✓ 10 set (re-render della card; F5 non provato)
- [x] **Dodge su Miss**: metti Dodge sul Warrior, dialog del danno con esito "Miss" → riquadro "⚙ Dodge: Warrior —
      no damage from Miss / Area"; sulla card la riga ha il chip verde "Dodge — immune"; "Apply" → card "Warrior:
      no damage — Dodge — immune to damage from missed attacks (p.144)", HP invariati, bottone "✓ Dodged".
- [x] **Dodge su Area**: esito "Area" → stesso comportamento ("… from area effects"). Esito "Hit" → chip "Dodge"
      grigio, Apply applica il danno normalmente. ✓ 10 set solo la parte Hit (chip grigio, danno normale); l'esito "Area" non è offerto dal dialog di Revenge, non provato
- [x] **Trait NPC come promemoria**: Foe con un trait che cita evasion/dodge (es. "Slippery: Has Evasion while
      bloodied", Bandit; o "Traits: Dodge") senza lo status → nel dialog il chip oro "⚠ Slippery" con tooltip
      "set the evasion status by hand when it applies"; nessun d6 tirato finché lo status non è messo. ✓ 10 set con la semantica della Sessione 13: Rogue "Slippery" sopra metà HP → nessun chip e nessun d6; sotto → d6 "(Slippery)"
- [x] **Relay giocatore**: da un client Player, "Apply" su un foe in Cover non posseduto → il GM applica
      dimezzando e la card dice "halved (Cover)". ✓ 10 set (utente edoardo, "→ Sent to GM", HP 24 → 23 "halved (Cover)")
- [x] **Regressioni**: attacco senza target con Evasion in giro → nessun blocco; card del danno vecchie (senza
      flag) → Apply come prima; Foe/Legend/Summon che attaccano un PG con Evasion → blocco Evasion anche lì;
      macro `game.icon.rollEvasion`, `defenseProfile`, `damageMitigation` disponibili. ✓ 10 set (no target → nessun blocco; Foe → PG con Evasion ok; macro presenti; card vecchie non provate)

## Sessione 13 (9 settembre 2026) — Tutti i follow-up delle sessioni 9-12 (versione 1.5.0)

Verificato offline (Node): parser su 32 frasi della Sessione 11 (invariate) + 30 nuove (Gain, promemoria, danno-su-save,
Showdown), corpus dei pack (8082 testi: 1697 inflict, 383 gain, 2162 promemoria, 115 danni-su-save), difese e reliquie
(38 controlli: trait condizionali, Rigoletto I/II/III/Aspect, Dodge sul save riuscito, gambit dai 40 testi del pack,
promemoria di turno), template Handlebars compilati e renderizzati con dati finti.

**Relic follow-up (Sessione 9)**
- [x] **Invoke Gambit**: PG con Hermes (o Sleipnir, Byrax II, Mistborn, Chime…) → nella tab Relics, sotto la reliquia,
      il riquadro viola "✦ Invoke Gambit" con il testo del gambit ("I: Free action: Teleport 2."). In combat, click →
      card in chat "✦ Invoke (Gambit) — Hermes I · 1/1 used this combat", il bottone diventa "✦ Invoke Gambit · 1/1"
      disabilitato (tooltip). Fuori combat il click posta la card senza contare ("outside combat — not counted"). ✓ 10 set (fuori combat non provato)
- [x] **Gambit due volte**: Sleipnir con Aspect sbloccato (o Tower of Barbs Aspect, Ironsoul III) → "0/2", si può
      invocare due volte. Un nuovo combat azzera il conteggio (il flag è legato all'id del combat). ✓ 10 set (Sleipnir Aspect 1/2 → 2/2; azzeramento a nuovo combat non provato, il flag porta l'id del combat)
- [x] **Hermes Aspect** riscrive il testo del gambit ("Teleport 1 space, then teleport 1 space…", etichetta "I (Aspect)").
- [x] **Rigoletto Aspect**: click su Invoke Gambit durante il proprio turno → card "Evasion is automatically successful
      … this round"; un Foe che attacca il PG in quel round vede nel blocco Evasion "✦ evaded (Rigoletto Aspect)"
      senza d6 e "Evasion — sure" nel dialog; al round dopo torna il d6. ✓ 10 set (nel dialog la riga ⚙ dice ancora "rolls 1d6 (3+)": cosmetico, in TODO)
- [x] **Promemoria di turno**: PG con Erenbrass I → all'inizio del suo turno (tracker) card "Start of turn ✦ Erenbrass I
      — You may shove an ally 1 space…"; con Erenbrass II anche a fine turno. Storm Lord I / Trollhide I-II → card
      "End of turn". Scheherezade I / Paleblood I → card "Start of combat" quando il combat parte; Paleblood → card
      "End of round N" a ogni cambio round. Byrax III → "First turn of combat" solo al round 1. Un PG senza reliquie
      di questo tipo non riceve card. ✓ 10 set Erenbrass I, Byrax III (solo round 1), Storm Lord I, Paleblood "End of round"; Scheherezade / Trollhide / "Start of combat" non provati
- [x] **"Applies to"**: sotto ogni reliquia della tab Relics la riga "Applies to: <abilità>" con le abilità
      equipaggiate che hanno una riga ✦ di quella reliquia (es. Byrax I → le stance). Reliquia senza abilità toccate →
      niente riga. ✗ 10 set: la riga non compare MAI (Paleblood I ha la riga ✦ su Revenge ma nessun "Applies to") → TODO Sessione 14 → corretto in Sessione 14, verificato il 10 set sera

**Encounter Designer follow-up (Sessione 10)**
- [x] **Titan Armament**: aggiungi un Jotunn (fazione Jotunn, es. Nilfling o Ire Smith) → nella riga compare il bottone
      "Titan" accanto a "Elite" (assente sui non-Jotunn, disabilitato sui mob). Acceso: costo +1, HP ×1.5 nella riga,
      turni +1, card in chat "· Titan Armament". 📥/🗺 → l'attore creato ha il trait "Titan Armament", HP max ×1.5 e,
      nel tracker, un pip in più per round (2 per un foe normale, 3 per un Elite). ✓ 10 set (3 → 4 punti, 28 → 42 HP, 1 → 2 turni, trait + flag sull'attore, 2 pip nel tracker)
- [x] **Riserve proposte dal tracker**: deploy con una riserva "R2"; al passaggio dal round 2 al 3 il GM riceve la card
      sussurrata "Reserves due — end of round 2" con il bottone "👁 Reveal reserves & add to combat" (che rivela e
      aggiunge al combat); tornando indietro e riavanzando la card NON viene ripostata. Riserve "R3" → card al
      passaggio 3 → 4. Senza riserve nascoste → nessuna card.
- [x] **Nilfling**: verificato sul manuale p.449 ("Thinblood: … doesn't have the elite trait like other Jotunn") → il
      pack è corretto, nessuna modifica.

**Inflict follow-up (Sessione 11)**
- [x] **Showdown** (Freelancer): 💬 sulla card non c'è più il bottone "Immobile" nel blocco Inflict; c'è invece il blocco
      "GAIN" con "Immobile <small>until the end of your current turn</small>" (click → lo status va sul PG) e il
      blocco "EFFECTS" con il chip "Dash 2".
- [x] **Gain**: abilità con "gain evasion until the start of your next turn" (Fool/Spinning Top, Knave/Revenge
      "Gain unstoppable and counter…") → blocco GAIN con un bottone per status; click → lo status è sul PG, card blu
      "X is now Evasion". "Allies in range 2 gain sturdy" → bottone "👥 Sturdy" tratteggiato: senza target avvisa,
      con un alleato targettato lo applica a lui. Foe "Hold the Line!" (Trooper) → "👥 Sturdy", "👥 Counter".
- [x] **Effects (promemoria)**: attacco con "shoved 1" / "unable to attack until…" / "+1 curse on all attacks and
      saves" / "gain 2 vigor" / "dash 2" → blocco "EFFECTS — reminders read from the text" con i chip oro; nessun
      bottone, nessun effetto applicato. "+1 curse on the save" NON compare come chip (è già nel save). ✓ 10 set (chip Rush 1 / Dash 2 / Gains 3 vigor; "+1 curse on the save" non provato)
- [x] **Danno sul save (con status)**: Brawler "Haymaker" ("must save or take [D]+fray and become stunned, or just fray
      damage on a successful save") → bottone "🎲 Stunned 💥". Click → dialog del save → fallito: card blu "Stunned"
      + card del danno "Haymaker — Failed save" [D]+fray con Apply solo per quel bersaglio; riuscito: niente status +
      card "Haymaker — Successful save (reduced damage)" con il solo fray.
- [x] **Danno sul save (senza status)**: Jotunn "Titanfall" ("must save or take 6 damage, or 3 on a successful save")
      → bottone rosso "🎲 💥 6 / 3 on a successful save"; click → save → card del danno 6 (fallito) o 3 (riuscito),
      bottone "✓ failed — damage rolled" / "✓ saved". "take [D]+fray twice" → due card (1/2, 2/2). ✗ 10 set: il bottone c'è e funziona su una AZIONE con quel testo, ma Titanfall del Jotunn è un TRAIT e la card dei trait non ha il blocco → TODO Sessione 14 → corretto in Sessione 14 (card dei trait con il blocco), verificato il 10 set sera
- [x] **Dodge sul save riuscito**: bersaglio con Dodge che supera il save → sulla card "Successful save" la riga ha
      "Dodge — immune"; Apply → "no damage — Dodge — immune to damage from successful saves". Sul save fallito il
      danno passa normalmente.
- [x] **Summon**: azione di un summon con save+danno → [D]/fray presi dal summoner. ✓ 10 set (summon TEST con summoner = PG: d8 + fray 4 del summoner)

**Difese follow-up (Sessione 12)**
- [x] **Rigoletto II**: PG con Evasion e Rigoletto II che evade → nel blocco Evasion la riga "✦ Rigoletto II (nome):
      deal 2 damage to <attaccante>". Anche quando evade un alleato entro 2 spazi dal portatore (e non oltre).
- [x] **Rigoletto III**: PG "Guard" con Evasion e Rigoletto III; un alleato SENZA Evasion a 1-2 spazi targettato da un
      Foe → riga "Ally (Rigoletto III of Guard)" con d6 che evade solo con un 6. Un portatore ostile (disposition
      diversa) non copre. Alleato a 3+ spazi → nessun d6. ✓ 10 set (nessun chip nel dialog per l'alleato coperto, solo sulla card)
- [x] **Evasion/Dodge condizionali dei foe**: Bandit "Slippery: Has Evasion while bloodied" → sotto metà HP il chip
      "Evasion 4+ (Slippery)" e il d6 viene tirato senza mettere lo status; sopra metà HP niente chip e niente d6.
      Foe "Nimble: Has evasion unless suffering from a status" → d6 finché non ha status negativi. "Sneak: While in
      stealth, has evasion and dodge" → con Stealth evade e "Dodge (Sneak)" azzera i Miss. Trait "Dodge" puro
      (Vagabond) → Dodge senza status. Condizione non leggibile ("while inside difficult terrain") → solo chip ⚠. ✓ 10 set Rogue/Slippery, Assassin/Nimble, Skulk/Sneak+Dodge; condizione non leggibile non provata
- [x] **Cover dalla mappa**: token adiacente a un muro (o porta chiusa) → chip tratteggiato "Cover? wall" nel dialog
      e sulla riga della card del danno; Apply NON dimezza (è solo un promemoria). Token lontano dai muri o accanto a
      una porta aperta → nessun chip. Con lo status Cover il chip "Cover ½" vince.

- [x] **Regressioni**: card d'attacco senza status/gain/note → invariata; blocco Inflict della Sessione 11 (Demon
      Cutter, Implode, Swindle) come prima; Encounter Designer senza Jotunn → nessun bottone Titan, deploy come prima;
      tab Relics con reliquie senza gambit → nessun riquadro viola; tracker senza PG con reliquie → nessuna card in
      più; nessun errore in console. ✓ 10 set (nessun errore in console; Encounter Designer senza Jotunn → nessun bottone Titan)

## Sessione 14 (10 settembre 2026) — Fix dal playtest del 10 settembre (versione 1.5.1)

Verificato offline (Node): `ignoresEvasion` con tag stringa / etichetta / oggetto, `rollEvasion` senza d6 col tag,
"Hold the Line!" → Sturdy + Counter + Resistance, template trait-card e attack-roll compilati.

**Esito playtest del 10 settembre 2026 (sera, build 1.5.1 sul server di Maar, scena "test", copie TEST poi cancellate): 11/11 ok.**

- [x] **Tag true strike dell'abilità**: Warrior con Evasion targettato, ⚔ su Demon Cutter (tag true strike) → nel dialog
      "⚙ True Strike (tag): ignores Evasion (TEST Warrior)"; sulla card "Evasion ignored — attacker has True Strike (tag)"
      senza d6. Lo stesso dal lato NPC: PG con Evasion, il Warrior usa Cleave (true strike) → nessun d6. Un'abilità
      senza il tag (Revenge) → il d6 viene ancora tirato. Lo status True Strike sull'attaccante funziona come prima.
- [x] **"Applies to" nella tab Relics**: PG con Paleblood I e un'abilità che ha la riga ✦ Paleblood (es. Revenge) → sotto
      la reliquia la riga "Applies to: Revenge …" con un chip per abilità. Byrax I senza stance equipaggiate → niente riga. ✓ (Ungoliant, Conquering King e Paleblood elencano le abilità; Rigoletto e Byrax senza riga)
- [x] **Card dei trait NPC con i blocchi**: Nilfling → 💬 sul trait Titanfall → card con il bottone rosso
      "🎲 💥 6 / 3 on a successful save"; click → save → card del danno 6 (fallito) / 3 (riuscito) con Apply per il solo
      bersaglio. Trooper → 💬 su un trait normale (Guard) → card invariata, senza blocchi vuoti. Legend → 💬 su un trait. ✓ Titanfall → bottone e save; il trait Guard del Trooper mostra un bottone Gain "Rampart" perché il suo testo lo concede (legittimo); trait Size 2 del Legend senza blocchi
- [x] **Card "MISS — evaded"**: la riga del d20 è sbiadita (tooltip "this d20 doesn't count") e la nota dice "the d20
      above doesn't count".
- [x] **Etichetta EVASION**: nella colonna stretta della chat resta su una riga (la nota in corsivo va a capo, non
      l'etichetta).
- [x] **Rigoletto Aspect nel dialog**: PG con Evasion e gambit di Rigoletto Aspect invocato nel suo turno, targettato da
      un Foe → riga "⚙ Evasion: <PG> evades automatically (Rigoletto Aspect, this turn) before the attack". ✓ (con un'azione NPC senza true strike; con Cleave prevale la nota del tag)
- [x] **Riga Dodge nel dialog del danno**: bersaglio con Dodge → la riga "⚙ Dodge: … no damage from Miss / Area" compare
      solo con esito Miss (o Area) selezionato; scegliendo Hit / Crit sparisce, tornando a Miss ricompare.
- [x] **Hold the Line! → Resistance**: 💬 sull'azione del Trooper → nel blocco GAIN i bottoni 👥 Sturdy, 👥 Counter e
      👥 Resistance; con un alleato targettato il click mette Resistance.
- [x] **Testi del save con danno**: Titanfall (trait) → save riuscito: card "Saved — reduced damage (6 / 3 on a successful
      save)."; fallito: "Failed — full damage (…)". Un "must save or take 6 damage" senza danno ridotto → "Saved — no
      damage." Il save di uno status (Haymaker) resta "Saved! Stunned avoided." / "Failed — Stunned applied." ✓ "Saved — reduced damage (…)"; "Failed — full damage" e "Saved — no damage" non esercitati
- [x] **Dialog d'attacco dei summon**: summon con summoner impostato, targetta un foe, ⚔ → dialog nello stile di PG/Foe
      (banda, card 🎯 Target con DEF/ARM/HP e chip difensivi, stepper); i boon/curse automatici vengono dagli status del
      summoner (es. summoner Blind → curse). Senza summoner → dagli status del summon. ✓ stile nuovo con card 🎯 Target; i boon/curse dal summoner non esercitati (Blind non dà curse nel sistema)
- [x] **Regressioni**: attacco PG / Foe / Legend / Summon senza Evasion in giro → card invariate (le card NPC ora mostrano
      i chip dei tag dell'azione, come quelle PG); Inflict / Gain / Effects sulle azioni come prima; nessun errore in
      console. ✓ (le card NPC mostrano i tag grezzi in minuscolo, es. "true-strike": cosmetico, in TODO)

## Debug del 13 settembre 2026 (bug segnalati a voce, build 1.5.1+)

- [ ] **Pannello dell'abilità aperto che si richiude a fine turno**: PG in combat, tab Combat, clic su uno slot
      abilità per aprire il pannello di anteprima; aprire anche "Basic Actions" e un trait. Passare il turno (o
      farlo passare a un altro combattente) → il pannello dell'abilità deve restare aperto esattamente come
      Basic Actions e i trait. Provare anche: pannello aperto + modifica di un campo della scheda (submit →
      re-render) resta aperto; clic sullo stesso slot lo chiude ancora; clic su un altro slot passa all'altra
      abilità; scheda chiusa e riaperta → tutti i pannelli chiusi (comportamento voluto).

- [ ] **Ordine dei blocchi delle abilità (book order)**: PG con Demon Cutter equipaggiata → il pannello e la card 💬
      mostrano `Hit / Miss / Effect / Area / Charge or Heroic` (prima l'Area stava sopra l'Effect). Matsuri (Sealer),
      Bio e Valkyrie → il blocco `Effect:` compare SOPRA la riga d'attacco. Comet (Demon Slayer, senza attacco) →
      `Area` prima di `Effect`. Ebullient / Pyre → una sola riga "Miss or Area" / "Comeback or Exceed" quando i due
      testi sono identici (prima erano due righe uguali). Sleight of Hand → `Hit / Effect (pacified) / Area /
      Effect (summon) / Summon Effect`.
- [ ] **Abilità non toccate**: una qualsiasi delle altre (es. Revenge, Odinforce) rende i blocchi come prima; le card
      dei Foe/Legend e dei summon sono invariate.
- [ ] **Campo "Block Order" nella scheda dell'abilità**: aprire un'abilità → in fondo alla sezione degli effetti c'è
      il campo; scrivere `sections, hit` su un'abilità qualsiasi sposta i blocchi del testo sopra Hit; svuotarlo
      ripristina l'ordine standard; un valore inventato ("pippo") non rompe nulla.
- [ ] **Migrazione 6** (mondo esistente, schema 5 → 6): all'apertura del mondo, le abilità già sulle schede dei PG
      ricevono l'ordine (console: "Migration 6: block order set on N ability(ies)"), senza toccare quelle con un
      ordine scritto a mano. Nota: la copia vecchia di Sleight of Hand tiene il testo nel vecchio ordine (per il
      testo giusto va ritrascinata dal compendio).

- [ ] **Bersagli di un attacco ad area**: PG con un'abilità ad area (Draken Cross, Comet Rain, Geo) e 3 token dentro
      l'area → ⚔ piazza il template e li targetta tutti; nel dialog ogni riga ha la ✕ e i pallini per scegliere il
      bersaglio dell'attacco. Il DEF proposto è quello del bersaglio scelto (non più il più basso dei tre), la nota
      Evasion parla solo di lui, e cambiando pallino cambiano entrambi. La ✕ toglie la riga e de-targetta il token
      sulla mappa. La card in chat dice "attack: X · area: Y, Z".
- [ ] **La selezione non viene più sovrascritta**: dopo aver tolto un bersaglio (✕ o Shift+T sulla mappa), premere di
      nuovo ⚔ sulla stessa abilità NON ri-targetta tutti quelli nell'area; se invece non c'è nessun bersaglio, il
      template ri-targetta come prima. Il bottone 📐 ri-targetta sempre (è un'azione esplicita).
- [ ] **Tiro senza area**: ⚔ su un'abilità ad area, poi Escape / tasto destro per annullare il piazzamento → avviso
      "area not placed" e il dialog d'attacco si apre lo stesso; il tiro parte senza la riga 📐. Annullare il dialog
      non fa partire nulla.
- [ ] **Attacchi senza area**: attacco a bersaglio singolo (PG, Foe, Legend) → nessun pallino, solo la ✕; con più
      bersagli senza area vale ancora il DEF più basso e l'Evasion di tutti, come prima.
- [ ] **Foe e Legend**: stessa prova con un'azione ad area di un Foe (Abomination) e di un Legend.

- [ ] **Blessed sul save automatico di fine turno (serve un secondo client)**: PG di un giocatore con lo status
      Blessed (1+ cariche) e uno status negativo salvabile (es. Stunned); il GM chiude il turno di quel PG → la
      domanda "Spend a Blessed charge?" compare sul client del GIOCATORE, non del GM; il GM vede solo l'avviso
      "waiting for their player…". Rispondendo Sì la carica viene scalata e il save ha +1 boon (nota "blessing" sulla
      card); rispondendo No il save parte liscio.
- [ ] **Fallback**: stesso caso ma con il giocatore disconnesso → la domanda torna al GM come prima. Con un PG senza
      giocatore assegnato (NPC del GM con Blessed) → dialog sul GM. Se il giocatore non risponde entro 90 secondi →
      avviso "didn't answer" e la domanda passa al GM.
- [ ] **Save del blocco Inflict**: il GM preme un bottone rosso "🎲 Stunned" su una card che bersaglia il PG di un
      giocatore → il dialog del save (boons/curses, "Spend a Blessed charge", "Already rolled") si apre sul client del
      giocatore; il tiro e l'applicazione dello status restano dal lato di chi ha premuto. Se il giocatore annulla il
      dialog, non succede niente e il bottone torna cliccabile.
- [ ] **Regressioni socket**: relay già esistenti ancora funzionanti (mark, Apply Damage, Party Resolve da giocatore,
      Inflict da giocatore su un NPC), nessun errore in console su nessuno dei due client.

- [ ] **Limit break dei tre job "Free Action"**: creare un PG Harvester (poi Stormbender e Seer) con il wizard di
      creazione → nessun errore rosso in console ("cost: free is not a valid choice") e nella scheda compare il limit
      break (Death Sentence / Elemental / High Prophecy) con il badge "Free Action". Gli altri job restano invariati
      (1 Action / 2 Actions).
- [ ] **Migrazione 7** (mondo con un Harvester/Stormbender/Seer già creato senza limit break): all'apertura del mondo
      il limit break viene ricreato dal template del job (console: "Migration 7: restored the limit break …"); i PG che
      ce l'hanno già non vengono toccati e non si creano doppioni.
- [ ] **Scheda dell'item limit break**: aprire il limit break → il menu Cost ha anche "Free Action" ed è quello
      selezionato; cambiarlo e rimetterlo non dà errori.

- [ ] **Combo che si aggiungono all'abilità**: PG Knave con Low Blow e il token Combo attivo → 💬 Show in Chat → la
      card mostra TUTTA l'abilità (Effect rush 1, Hit, Miss, Effect slashed, Heroic) più la riga "⚡ Combo — The Hook:
      Gains range 2 and effect: Shove character 1 towards you." Stessa prova con Umbra (Penumbra), Death Blossom
      (Flying Sleeves), Revenge (Indignation), Bleak Mercy (Sweet Torment), Incubus (Succubus).
- [ ] **Combo che riscrivono l'abilità**: Sow (REAP), God Hand (DEVIL HAND), Astra (FORTUNA), Open the Gates
      (CENTER THE TEMPLE), Pandaemonium (PURGATORIO) → i blocchi riscritti dal combo compaiono con ⚡ e il testo della
      versione combo; i blocchi non citati restano quelli base. Nessun blocco duplicato.
- [ ] **Senza combo**: la stessa abilità senza token attivo stampa la card normale, invariata; il token viene
      consumato come prima e il tiro danni propone ancora la versione combo.
- [ ] **Regex riparate (bug latenti trovati strada facendo)**: azione di un Foe senza tag "attack" ma con "on hit" nel
      testo → ora viene riconosciuta come attacco (bottone ⚔ sulla riga); testo "must save or take 2[D]+fray, or fray
      on a successful save" → il blocco Inflict propone il danno ridotto sul save riuscito. Controllare che nessuna
      azione NPC mostri un ⚔ che prima non aveva senza motivo.

- [ ] **Macro vecchie nel mondo ("LEVEL UP DISPONIBILE")**: nel mondo di Maar la macro "ICON: Award Session XP"
      trascinata dalla barra è la copia della v1.0.0 (testo in italiano). All'apertura del mondo con la build nuova la
      macro viene riallineata a quella del compendio (console: "Macro sync: … updated from the compendium", avviso
      "N macro(s) updated"); rilanciandola la card dice "LEVEL UP AVAILABLE" per tutti i PG. La sincronizzazione gira
      una volta sola per versione di sistema: riaprendo il mondo non ripete nulla.
- [ ] **Macro non di sistema**: una macro scritta a mano dall'utente con un nome diverso non viene toccata; le altre
      macro del compendio (Camp, Interlude, Apply Damage, Encounter Designer) continuano a funzionare.

- [ ] **Tag della versione combo**: PG Chanter con Holy equipaggiata e token Combo attivo → sul pannello e sulla card
      i chip diventano "Attack | Range 5 | Medium Blast | True Strike | Autohit | Combo" (i tre nuovi evidenziati come
      upgrade, tooltip "From Combo: …"); senza token tornano "Attack | Range 5 | Combo".
- [ ] **Area che cambia con il combo**: Death Blossom con token attivo → il bottone 📐 e il ⚔ piazzano un **Arc 4**
      (senza token: Burst 1 a range 2). Astra con token → Medium Blast a range 5 invece della Line 5.
- [ ] **Attacco che diventa auto-hit**: Holy / Astra con token attivo → il ⚔ non tira il d20 (card auto-hit); Sow, che
      è auto-hit di base, con il token attivo torna a tirare il d20 (REAP ha "On hit:"). Senza token, comportamento
      invariato.
- [ ] **Tag che spariscono**: Incubus con token attivo → niente bottone 🎯 (Succubus non piazza il mark) e nessun chip
      "Mark"; Felicity con token → niente Mark. Senza token entrambi tornano marcatori.
- [ ] **Campo "Tags of the combo version"**: nella scheda dell'abilità, sotto il testo del combo, si può scrivere la
      lista a mano; svuotandola l'abilità torna a usare i tag base anche in combo.
- [ ] **Migrazione 8**: mondo con PG che hanno già queste abilità → all'apertura i comboTags vengono compilati
      (console "Migration 8: combo tags set on N ability(ies)") senza toccare quelli scritti a mano.

- [ ] **Forma del Large Blast**: abilità con tag large blast (o Charge che la porta a large, es. Pandaemonium) → il
      template piazzato è la croce di 13 caselle del manuale (p.98): 1 al centro, 4 adiacenti, 8 a due passi in croce;
      NON il quadrato 5×5 smussato di prima (21 caselle). Small blast resta 5 caselle, Medium 3×3 = 9.
- [ ] **Bersagli e tooltip**: con il large blast i token presi sono solo quelli dentro la croce (provare con un token
      appena fuori, in diagonale a 2 caselle: prima era dentro, ora è fuori); il tooltip del chip "Large Blast" dice
      "13 spaces (p.98)".

- [ ] **Save dalle schede NPC**: Foe (es. Warrior) con Stunned e Blind addosso → tab Conditions, in cima la sezione
      "Saves" con un bottone 🎲 per status: cliccando 🎲 Stunned esce il dialog (boons/curses, ongoing, Blessed se ha
      cariche), il tiro finisce in chat e con 10+ lo status sparisce dalla scheda e dal token. Stesse prove su un
      Legend e su un Summon (sezione Saves in fondo alla scheda).
- [ ] **Nessuno status**: NPC pulito → la sezione dice "No status to save against right now" e resta il bottone
      "🛡 Save vs…" che chiede il nome a mano (nessuno status viene rimosso).
- [ ] **Status ongoing +**: applicare uno status con il tasto destro (versione +) → NON compare tra i bottoni 🎲
      (non è salvabile); scegliendo "Ongoing +" nel dialog il tiro fallisce automaticamente come prima.
- [ ] **PG invariato**: il bottone 🛡 Save Roll della tab Combat funziona come prima (ora con la tendina degli status
      attivi e i campi boons/curses); con Blessed la carica viene scalata; i save automatici di fine turno del tracker
      non cambiano.

- [ ] **Invoke bloccato sulla card della reliquia**: PG con Riftwalker a rango I → 💬 sulla reliquia → la card NON
      mostra più "11+ / Create a pit space…" (l'invoke è di rango III); portandola a rango III la riga ricompare come
      "Invoke (III): 11+". Stessa prova con Domain (invoke solo con l'Aspect) e Byrax (rango II).
- [ ] **Invoke di rango I**: Ape God a rango I → la card mostra l'invoke come prima ("Invoke (I): 17+"); Mercy ed
      Erenbrass (invoke "passive" che ripete il rango I) restano visibili.
- [ ] **Tab Relics**: sulla scheda l'invoke non ancora sbloccato resta visibile ma sbiadito e barrato, con il chip
      "🔒 Rank III" e il tooltip; una volta raggiunto il rango torna normale.
- [ ] **Regressioni invoke**: il check "Invoke (Attack, N+)" sul tiro d'attacco e il bottone Invoke Gambit continuano
      a comparire solo per i ranghi sbloccati (erano già corretti) e non sono cambiati.

## Debug del 20 settembre 2026 (bug segnalati da Edoardo, build 1.5.1+)

- [ ] **Encounter Designer con tanti PG**: mondo con molti attori di tipo PG (Edoardo ne ha ~40, usa le schede anche
      come segnapunti dei giocatori) → aprire l'Encounter Designer (bottone "Encounter" nella sidebar Actors o
      `game.icon.openEncounterDesigner()`). La lista dei ritratti nel passo 1 "Party" deve fermarsi a circa quattro
      righe e avere la sua barra di scorrimento; il passo 3 "Encounter" (la lista delle scelte) e il footer con i
      bottoni devono restare visibili e leggibili senza che nulla finisca fuori dalla finestra.
- [ ] **La posizione dello scorrimento non salta**: scorrere la lista dei PG fino in fondo e cliccare un ritratto per
      metterlo/toglierlo dalla party → la lista resta dov'era (prima il re-render la riportava in cima). Stessa prova
      cambiando la quantità di un foe nel passo 3: la lista delle scelte non torna in cima.
- [ ] **Finestra ridimensionata**: rimpicciolire la finestra in altezza (trascinando l'angolo) → il passo 3 "Encounter"
      conserva sempre uno spazio minimo e il footer resta attaccato in basso; la lista dei PG si accorcia e scorre
      invece di schiacciare tutto il resto.
- [ ] **Mondo normale invariato**: mondo con 3-5 PG → il passo 1 ha lo stesso aspetto di prima (nessuna barra di
      scorrimento, nessuno spazio vuoto in più), "On scene" / "All" e il conteggio "N PC → budget" funzionano come
      prima, e la lista del roster a destra scorre come prima.

- [ ] **Bottone 🎯 sulle abilità multimark**: NPC con un'azione taggata `multimark` (es. Arkenlich → "Fear",
      Limb Demon → "Control Limbs", Violence Demon → "Ancient Hatred", Deep Snow Aesi → "Biting Cold") → sulla
      scheda l'azione ha il bottone "🎯 Mark" come le azioni `mark` (prima non compariva). Stessa prova su un
      Foe del pack (es. Barghest → "Consume", Wildblood → "Bale Curse").
- [ ] **Il multimark non cancella i mark precedenti**: con la stessa azione multimark marcare il token A, poi il
      token B → restano DUE chip 🎯 sull'azione (A e B) e due effetti "Marked — …" sui due bersagli. Con
      un'azione `mark` normale (es. Wisp → "Playful Pricking") marcare A e poi B → resta solo B, come prima.
- [ ] **Un solo mark per coppia marcatore → bersaglio**: lo stesso NPC marca A con un'azione multimark e poi
      marca A con un'altra azione → sul bersaglio resta un solo mark (regola p.95, invariata).
- [ ] **Il chip del tag si spiega**: passando il mouse sul chip "Multimark" dell'azione esce il tooltip che dice
      che l'abilità tiene più mark insieme.
- [ ] **Mark dei PG invariato**: PG con un'abilità `mark` (Incubus, Sow, Harrow, Astral Chain) → il 🎯 funziona
      come prima, un mark alla volta per abilità; i chip e la lista "Marks on this character" nella tab
      Conditions sono invariati; il relay giocatore → GM funziona ancora (client Player che marca un token non
      suo).
- [ ] **Tag del combo**: PG con Incubus e token Combo attivo → il bottone 🎯 sul pannello dell'abilità sparisce
      (la versione Succubus non piazza il mark); senza token torna. Prima il pannello lo mostrava comunque
      perché leggeva i tag base invece di quelli effettivi.

- [ ] **Pallini cliccabili nel wizard di creazione**: nuovo PG → "Create character", arrivare al passo 4 "Extra
      Dots". Cliccare il 3° pallino di Command → l'azione va a rating 3 in un colpo solo e il contatore passa a
      "1 left" (prima il pallino si illuminava al passaggio del mouse ma non faceva niente).
- [ ] **Click sul pallino più alto = un passo indietro**: con Command a 3, ri-cliccare il 3° pallino → torna a 2
      e il contatore risale (stesso comportamento dei pallini sulla scheda del PG).
- [ ] **I pallini del bond non si possono togliere**: sull'azione primaria (riga dorata, +2 dal bond) cliccare il
      1° o il 2° pallino → restano 2 pallini pieni e gli eventuali dot extra di quella riga tornano disponibili;
      cliccare il 3° la porta a 3.
- [ ] **Cap di livello 0 (p.241)**: il 4° pallino non è cliccabile (cursore "vietato", niente alone al passaggio
      del mouse, tooltip "No action can go past 3 at level 0"); nessuna azione supera 3.
- [ ] **Dot finiti**: spesi tutti e 4 i dot, cliccare il 3° pallino di un'azione vuota → si riempie solo per
      quanti dot restano (zero se non ne resta nessuno) e il contatore resta "all spent"; nessun rating supera
      il totale di 4 dot distribuiti.
- [ ] **+ / − invariati**: i bottoni + e − della riga funzionano come prima e si disabilitano quando non ci sono
      più dot o si è al cap; i campi nascosti `distribution1..4` restano coerenti → completando il wizard il PG
      nasce con i rating giusti sulla scheda.

- [ ] **Level up: dot d'azione obbligatorio**: PG con XP pieni → "Level up" (un livello che dà un'azione da
      migliorare, es. L1, L2, L5, L7) → passo "Improve actions": il contatore dice "1 to pick", il riepilogo in
      basso dice in rosso "1 action improvement to pick" e "Confirm Level Up" NON passa: esce l'errore "1 action
      improvement still to spend…". Scelta l'azione nella tendina, il contatore diventa "all picked", il
      riepilogo torna normale e il level up va a buon fine con il dot davvero applicato sulla scheda.
- [ ] **Bond Power obbligatorio**: stesso livello (L1/L2 danno anche un Bond Power) → confermare senza sceglierne
      uno dà l'errore "Pick a Bond Power before confirming"; scegliendone uno il level up passa. Se il bond non
      ha bond power nel compendio (lista vuota) il level up si conferma lo stesso, senza bloccare.
- [ ] **Fork L4 / L8**: al passo 1 scegliere "Improve 2 Actions" → al passo 2 ci sono due tendine e il contatore
      dice "2 to pick"; riempirne una sola e confermare → errore, il level up non parte. Scegliendo invece "Bond
      Power" al passo 1, le tendine non compaiono e vale il controllo del bond power.
- [ ] **Due dot sulla stessa azione**: L4 con "Improve 2 Actions" e entrambe le tendine su Sneak → Sneak sale di
      2 (comportamento di prima, invariato).
- [ ] **Azioni al massimo**: PG con tutte e 10 le azioni a 4 → la tendina mostra tutte le voci "— MAX" disabilitate
      e il level up si conferma lo stesso (niente blocco impossibile da sbloccare).
- [ ] **Resto del level up invariato**: contatore AP ("AP 2 left" → "AP all spent"), scelta job/mastery/relic,
      talenti e abilità funzionano come prima; annullare il dialog non tocca il PG.

- [ ] **Butcher Heavy nel compendio**: compendio Foes → cartella Lowlander → Butcher: la scheda dice Heavy con
      VIT 10, HP 40, Defense 6, Fray 4, [D] d6, Armor 2, e tra i tratti c'è **Guard** (p.298) al posto di Slip e
      Aetherwall. Defiance e i tre tratti di fazione (Lowlander Toxin, Pit expert, Suddenly!) e le quattro azioni
      (Fury Strikes, Wall of Meat, Mancatcher Bolas, Kidnap) sono rimasti come prima.
- [ ] **Compendio Foe Abilities**: cercando "Butcher —" non ci sono più le voci "Butcher — Slip" e
      "Butcher — Aetherwall"; c'è "Butcher — Guard"; le altre voci del Butcher sono invariate.
- [ ] **Migrazione 9** (mondo esistente, schema 8 → 9): mondo in cui il Butcher era già stato importato → all'apertura
      la console dice "Migration 9: N Butcher foe(s) re-statted from Artillery to Heavy (p.298)" e la scheda
      dell'attore nel mondo mostra i valori Heavy con Guard. Un Butcher a cui il GM ha cambiato a mano anche una
      sola statistica (o reso Elite) NON viene toccato. Riaprendo il mondo la migrazione non rigira.
- [ ] **Resto del pack invariato**: Slab, Mule, Canker, Snork e Slaughterer restano Artillery (scelta di Edoardo del
      20 settembre: si corregge solo il Butcher); gli altri Lowlander (Clot, Boil Slug, Grub…) invariati.
- [ ] **Encounter Designer**: il Butcher compare nel roster come "Heavy" e costa 1 punto (2 da Elite), e un deploy
      lo mette in scena con 40 HP.

- [ ] **Boon del tag sull'attacco (Strafe Shot)**: PG Freelancer con Strafe Shot equipaggiata → ⚔ Attack: il
      dialog parte con **Boons = 1** e il chip "⚙ This ability: +1 boon (tag)"; l'anteprima dice "1d20 + best of
      1d6 vs DEF N". Confermando, la card in chat mostra il d20 più il d6 del boon. Lo stesso su Soul Shot,
      Apex (Warden), Cavaliere e Diablo (Fool), Sidhe (Warden), Incubus e Umbra (Shade), Passage to the
      Afterlife (Sealer, tag scritto `boon-1`).
- [ ] **Si somma agli altri modificatori**: stesso attacco con il PG Dazed (+1 curse) e da una casella più in
      alto del bersaglio (+1 boon) → il dialog mostra i tre chip e i contatori sommati (Boons 2, Curses 1);
      l'anteprima calcola il netto (+1 boon). Togliendo tutto resta solo il boon del tag.
- [ ] **NPC**: Foe con un'azione taggata `boon-1` (es. Aeronaut → "Strafe shot", range 4) → ⚔ sulla scheda del
      foe: dialog con Boons = 1 e lo stesso chip. Un'azione con `curse-2` parte con Curses = 2.
- [ ] **Chip dei tag uniformi**: sul pannello dell'abilità e sulla card in chat il tag si legge "+1 Boon" sia per
      i PG (`+1-boon`) sia per gli NPC (`boon-1`, prima scritto "Boon 1"), col tooltip che spiega la regola
      (p.12) e che il dialog lo compila da solo.
- [ ] **Abilità senza boon invariate**: un attacco qualsiasi senza il tag (es. Cleave) apre il dialog con Boons 0
      e la riga "No automatic modifiers (ability tags, statuses, height)" se non ci sono status o dislivello.
- [ ] **Copie vecchie**: se su un PG la Strafe Shot NON mostra il chip "+1 Boon" fra i tag, quella copia è
      anteriore al tag nel compendio → va ritrascinata dal compendio Jobs (il fix legge i tag, non li aggiunge).

- [ ] **Rime senza il testo del Salt Sprite**: compendio Jobs → Stormbender → Rime: il blocco "Effect:" finisce
      con "…summon a salt sprite in any space in range 2 from them." e subito dopo c'è "Infuse 3: DAGON"; non
      c'è più il paragrafo "Salt Sprites can be summoned in range 2 … Then, remove the sprite." Stessa prova su
      **Geyser** (finisce con "Infuse 3: VOLCANIC GEYSER … dangerous terrain under foes.").
- [ ] **Il resto di Rime intatto**: tag (Attack, Line 6, Summon), hit 2[D]+fray, miss/area fray, collide
      "Summon a Salt Sprite", talenti I e II, mastery MAGNARIME e l'ordine dei blocchi (hit, miss, area, effect,
      collide, infuse 3) sono come prima; la card 💬 e il pannello mostrano gli stessi blocchi senza il paragrafo
      di troppo.
- [ ] **Le regole del Salt Sprite ci sono ancora**: compendio Summons → "Salt Sprite": la scheda mostra Size 1,
      intangible, immobile, il Summon Effect e la nota "Many stormbender abilities summon a Salt Sprite… maximum
      of six active Salt Sprites."
- [ ] **Migrazione 10** (mondo esistente, schema 9 → 10): PG che ha già Rime (o Geyser) sulla scheda → all'apertura
      del mondo la console dice "Migration 10: Salt Sprite box removed from N ability(ies) of …" e il pannello
      dell'abilità non mostra più il paragrafo. Un'abilità il cui testo è stato modificato a mano non viene
      toccata; riaprendo il mondo la migrazione non rigira.

- [ ] **Sealed blocca il blocco Inflict**: dare Sealed al PG (tab Conditions o HUD del token), poi usare
      un'abilità che infligge uno status (es. una con "foe is dazed") → sulla card il blocco Inflict mostra la
      riga rossa "⛔ <nome> è Sealed: a sealed character cannot inflict statuses (p.104)" e cliccando il bottone
      dello status esce l'avviso e **non** viene applicato niente (il bottone resta cliccabile, non si blocca).
- [ ] **Sealed che arriva dopo**: postare la card **prima** di applicare Sealed, poi sealare il PG e cliccare il
      bottone → viene comunque rifiutato (il controllo è al click, non alla stampa della card). Togliendo Sealed
      (save o ✕ nella tab Conditions) lo stesso bottone funziona di nuovo senza ristampare la card.
- [ ] **Quello che Sealed non blocca**: sulla stessa card i bottoni "🎲 💥" del danno legato al save funzionano
      (il danno non è uno status) e il blocco "Gain" (status positivi su sé/alleati) resta utilizzabile; anche il
      bottone 🎯 Mark continua a funzionare (un mark non è uno status, p.95).
- [ ] **NPC e Legend**: stesso giro con un Foe sealato che usa un'azione con Inflict → stessa riga rossa e stesso
      rifiuto. Un NPC non sealato non mostra nessuna riga e funziona come prima.
- [ ] **Giocatore senza permessi**: client Player sealato che clicca uno status su un bersaglio non suo → viene
      fermato sul suo client, senza mandare niente al GM.
- [ ] **Nessuna regressione**: PG non sealato → blocco Inflict identico a prima (save 10+, boons/curses, Blessed,
      "already rolled", relay al GM).

- [ ] **Tsunami, blocchi corretti (p.233)**: PG Stormbender con Tsunami → pannello dell'abilità e card 💬: si
      vedono TRE blocchi in quest'ordine — "Terrain Effect: Create a huge swell… All your Tsunamis disappear if
      you use this ability again, or they reach an edge of the map.", "Collide: Character is shattered.",
      "Infuse 1: STORMLASH (Free Action) — Choose an edge of the map. Your active tsunamis move 2 spaces in that
      direction."
- [ ] **Quello che non c'è più**: Collide compare **una volta sola** (prima era stampato due volte, una dalla
      descrizione e una dal campo); la frase "All your Tsunamis disappear…" NON è più dentro Collide; il blocco
      "Infuse 1" non è più il solo "STORMLASH —" senza testo e non esiste più un blocco "Free Action" separato.
- [ ] **Resto di Tsunami invariato**: costo 2 azioni, tag Terrain Effect, talenti I e II, mastery LEGENDARY STORM
      e il campo Collide nella scheda dell'oggetto sono come prima.
- [ ] **Migrazione 11** (mondo esistente, schema 10 → 11): PG che ha già Tsunami sulla scheda → all'apertura la
      console dice "Migration 11: Tsunami rewritten on …" e il pannello mostra i tre blocchi nuovi. Una copia il
      cui testo è stato modificato a mano (senza più "Infuse 1: STORMLASH — Free Action:") non viene toccata.

- [ ] **Etichette dei blocchi con tooltip**: pannello di un'abilità e card 💬 → passando il mouse su
      "Finishing Blow:", "Comeback:", "Charge:", "Exceed (15+):", "Collide:", "Slay:", "Crit:", "Stance:",
      "Mark:", "Infuse 3:", "Interrupt 2:" esce la regola (Finishing Blow dice "triggers when the attack targets
      a Bloodied foe"); l'etichetta è sottolineata a puntini come le keyword nel testo. "Hit:", "Miss:",
      "Effect:" restano etichette semplici senza tooltip.
- [ ] **Encounter Designer, salvataggio**: dare a un incontro il nome di uno già salvato e premere "Save" →
      esce il dialog "Replace saved encounter" con la data del salvataggio precedente; "Cancel" non tocca nulla
      (il vecchio resta nella tendina), "Replace" sovrascrive e la notifica dice "replaced". Con un nome nuovo
      non chiede niente e dice "saved".
- [ ] **AP a metà barra solo dal livello 1**: PG di livello 0 → portarlo a 7 XP: NON arriva il +1 AP e non
      compare la card in chat (prima arrivava). Lo stesso PG a livello 1 → a 7 XP il +1 AP e la card ci sono
      come prima. Il testo di benvenuto (❔ Guide) dice "From level 1 on…".
- [ ] **Migrazione 12**: mondo con un PG ancora di livello 0 che aveva già preso il bonus → all'apertura la
      console dice "Migration 12: … halfway AP taken back (AP total N → N-1)" e l'avviso in alto lo segnala; un
      PG di livello 1+ non viene toccato.
- [ ] **Skill Ranks non più "OVER"**: PG appena creato col wizard (6 dot spesi: +2 del bond e 4 distribuiti) →
      tab Notes: "Spent 6 / 6 ✓ all spent" con la nota "(6 from creation + 0 from level ups)", niente ⚠ OVER.
      Dopo un level up che dà un'azione da migliorare: "Spent 6 / 7 (1 free)", e spendendo il dot torna "all
      spent". Alzando a mano un'azione oltre il dovuto compare ⚠ OVER come prima.
- [ ] **Template di Tsunami**: PG Stormbender con Tsunami → sul pannello compare il bottone "📐 Medium Blast"
      (prima non c'era) e piazza un medium blast sulla mappa. Stessa prova su Fairy Ring (Burst 2), Blood Grove
      (Medium Blast), Ätherwand (Line 3), Party Favor (Medium Blast), Six Hells Trigram (Burst 2).
- [ ] **Abilità con l'area nei tag invariate**: Draken Cross, Comet Rain, Holy ecc. → il bottone 📐 mostra la
      stessa area di prima e non propone varianti nuove prese dal testo.
- [ ] **Etichette "X or Y" nell'ordine del manuale**: Battering Ram (p.122) → "Collide or Heroic"; Strafe Shot
      (p.155) → "Finishing Blow or Exceed (15+)"; Valiant, Catapult, Heracule, Great Giorgios → "Collide or
      Heroic"; Diablo, Cavaliere, Death → "Finishing Blow or Slay"; Valkyrie, Gigaton Whip, Takedown → "Exceed
      (15+) or Heroic". In tutti i casi la riga resta **una sola** (i due blocchi sono ancora uniti, non stampati
      due volte).
- [ ] **Blitz (p.225)**: il blocco Slay compare una volta sola, come "Slay or Infuse 3: GRAN BLITZ — Repeat the
      first effect."; prima ne comparivano due, il secondo con un testo allungato a mano. Gli altri blocchi
      (Effect / Hit / Miss / Effect) sono invariati.
- [ ] **Cryo (p.233-234)**: i blocchi restano "Effect / Hit (auto hit) / Area / Effect / Effect / Infuse 3" —
      non era da correggere, si vede giusto una volta installata questa build.
- [ ] **Reliquie che guardano i trigger**: un PG con Blitz e una reliquia che cita gli effetti Slay continua a
      vedere il promemoria ✦ sull'abilità (il trigger ora viene letto anche dal testo, non solo dal campo).
- [ ] **Migrazione 13** (schema 12 → 13): mondo con queste abilità già sulle schede → all'apertura la console
      dice "Migration 13: block layout fixed on N ability(ies) of …"; le copie con un "Block Order" scritto a
      mano non vengono toccate; riaprendo il mondo non rigira.

## Richieste del 20 settembre 2026 — primo gruppo (le "piccole")

- [ ] **Macro XP su PG scelti**: lanciare "ICON: Award Session XP" → in cima al dialog c'è la lista dei PG con
      le spunte, tutte attive, e i link "All" / "None". Spuntando un solo PG, l'XP va solo a lui (la card in
      chat elenca solo quello) e i bond power "usati questa sessione" si azzerano solo su di lui. Togliendo
      tutte le spunte, esce l'avviso "no character was ticked" e non succede niente.
- [ ] **Token selezionati**: selezionare sulla mappa i token di due PG e lanciare la macro → solo quei due
      partono spuntati, con la nota "(ticked from the selected tokens)". Senza token selezionati sono tutti
      spuntati come prima.
- [ ] **Macro come giocatore**: un player vede solo i suoi PG nella lista (nessun errore di permessi).
- [ ] **Reference nella barra strumenti**: nella barra a sinistra (strumenti Token) c'è l'icona 📖 "ICON 1.5 —
      Rules Reference": cliccandola si apre il riferimento e lo strumento attivo NON cambia (resta Select).
      Funziona anche per un giocatore, su qualsiasi scena, e il 📖 nel menu "..." della scheda continua a
      funzionare come prima.
- [ ] **Tab della scheda più leggibili**: scheda PG → tra Narrative / Combat / Conditions / Relics / Notes c'è
      una linea di separazione sottile, la tab sotto il mouse si illumina appena e quella attiva ha il suo
      sfondo dorato smussato in alto. Stessa prova sulle schede Foe / Legend / Summon (stesso stile) e con la
      finestra stretta (le tab non si accavallano).
- [ ] **Danno piatto**: ⚔ → 💥 su un'abilità qualsiasi → nel dialog del danno c'è lo stepper "Flat damage";
      mettendo 2 l'anteprima diventa "…+ 2 flat" e la card mostra la riga "Flat bonus 2" nel conteggio. A 0 la
      card è identica a prima. Caso d'uso: Harden del Clot (+2 per round).
- [ ] **Pierce**: spuntando "Pierce" la card dice "Pierce — target Armor ignored" e premendo Apply su un
      bersaglio con Armor 2 non viene sottratto nulla; la spunta "Weakened" non ha più effetto sul totale
      (p.104: né armor né weakened).
- [ ] **Divine**: spuntando "Divine" la card dice "Divine — nothing reduces this damage (p.104)"; su un
      bersaglio con Armor, Cover o Resistance l'Apply applica il danno pieno, e anche il bottone ½ applica il
      totale intero. Le spunte Resistance / Weakened del dialog vengono ignorate.
- [ ] **True Strike**: card con esito Miss (o Area) contro un bersaglio con Dodge → senza la spunta l'Apply dice
      "no damage — Dodge"; con "True Strike" spuntato il danno viene applicato (p.104: ignora dodge).
- [ ] **Unerring**: bersaglio con Cover → senza spunta l'Apply dimezza ("½ Cover"); con "Unerring" spuntato non
      dimezza. Con Resistance invece dimezza lo stesso (Unerring ignora cover, non resistance).
- [ ] **Nessuna regressione sul danno**: senza nessuna delle nuove spunte, dialog e card sono identici a prima
      (bonus dice, Vulnerable, Resistance/Cover ½, Weakened, Hatred, armor sottratto su Apply, Dodge su
      Miss/Area, relay al GM).

## Richieste del 20 settembre 2026 — secondo gruppo (le "medie", parte 1)

- [ ] **AP avanzati al level up**: PG con 1 AP libero (spenderne meno di quelli avuti, es. dopo il bonus di
      metà livello) → al level up, nel passo "New abilities", c'è la riga rossa "You still have 1 AP from
      earlier levels…" e il contatore in alto dice "AP {granted+1} left". Si possono scegliere abilità/talenti
      fino a quel totale; con tutto speso il contatore diventa "AP all spent".
- [ ] **Livello che non dà AP**: PG con AP avanzati che sale a un livello senza AP (es. L2, che dà solo relic
      e narrativa) → il passo delle abilità compare lo stesso, con il solo avanzo come budget. Un PG senza AP
      avanzati a quel livello NON vede il passo (come prima).
- [ ] **Stance dall'abilità**: PG con un'abilità taggata Stance (Dark Knight, Soul Blade, Endless Battlement) →
      sul pannello c'è "🧘 Take stance": cliccandolo il campo Stance della tab Combat si riempie col nome
      dell'abilità, il bottone diventa dorato "🧘 In stance — drop" e sul token compare il marcatore. Ri-cliccando
      si lascia la stance (campo vuoto, marcatore via).
- [ ] **Una stance alla volta (p.104)**: con una stance attiva, prendere quella di un'altra abilità → la prima
      viene sostituita e una notifica dice quale è stata lasciata; sul pannello solo la nuova risulta attiva.
- [ ] **Stance del bersaglio**: attaccare un PG/NPC che è in stance → nel dialog d'attacco (e in quello del
      danno) la riga del bersaglio mostra "🧘 <nome stance>" accanto a DEF/ARM/HP. Bersaglio senza stance: niente
      chip, riga identica a prima.
- [ ] **Finishing Blow automatico**: PG Vagabond con un'abilità che ha il blocco "Finishing Blow: … bonus
      damage" → targettare un foe **bloodied** (≤50% HP) e tirare il danno: il dialog parte con "Bonus dice = 1"
      e il chip "⚙ Finishing Blow: <nome> is bloodied — +1 bonus die added"; la card mostra il dado in più
      ("roll 2d6, keep 1"). Contro un foe non bloodied il dialog parte da 0 e non mostra il chip.
- [ ] **Finishing Blow senza bonus damage**: abilità il cui blocco Finishing Blow fa altro (non "bonus damage")
      → il chip dice solo "the block triggers", senza aggiungere dadi.
- [ ] **Aetherwall automatico**: foe Artillery (ha il tratto Aetherwall) colpito da un attaccante a più di 2
      caselle → sulla card del danno la riga del bersaglio mostra il chip "Aetherwall ½" e premendo Apply il
      danno viene dimezzato con la nota "½ Aetherwall (range N)". Con l'attaccante a 2 caselle o meno non
      succede nulla.
- [ ] **Aetherwall e Unerring**: stesso tiro con la spunta "Unerring" nel dialog del danno → niente dimezzamento
      (p.104: unerring ignora cover e aetherwall). Con un bersaglio che ha anche Cover, Unerring toglie
      entrambi; con Resistance il dimezzamento resta.
- [ ] **Aetherwall solo con i token**: foe Artillery senza token sulla scena (card lanciata da scheda) → nessun
      dimezzamento automatico e nessun chip (non si può misurare la distanza), il bottone ½ resta a mano.

## Richieste del 20 settembre 2026 — terzo gruppo (le ultime cinque)

- [ ] **Summon trascinabili**: PG Stormbender, pannello di Rime o Geyser → c'è il chip "🐾 Salt Sprite";
      trascinandolo sulla mappa nasce il token del Salt Sprite (preso dal compendio Summons). Stessa prova con
      Nightmare/Umbral Echo (Shadow, Shade), Carnevale (Bomb, Fool), Chaos Tarot (Wild Card + Master Card, Seer),
      Stampede (Beast, Warden). Un'abilità che non nomina summon del pack non mostra chip.
- [ ] **Permessi**: un giocatore che NON può creare token trascina un chip → errore di Foundry, niente token, la
      scheda non si rompe.
- [ ] **Colore delle aure**: due PG di classe diversa con un'abilità Aura → le due aure sulla mappa hanno il
      colore della classe (rosso Stalwart, oro Vagabond, verde Mendicant, blu Wright). Nel riquadro Stance della
      tab Combat c'è il selettore "Aura": scegliendo un colore, la prossima aura di quel PG usa quello; ↺ torna al
      colore di classe. Blast/Line/Arc/Burst mantengono i colori di forma di prima.
- [ ] **Scheda Clock**: creare un attore di tipo **Clock** → si apre la lavagna: "+ Clock" aggiunge un orologio
      (nome, taglia 4/6/8/10/12, colore, nota). Cliccando un segmento l'orologio si porta lì; ri-cliccando
      l'ultimo pieno torna indietro di uno; − e + spostano di uno; a pieno compare "FULL" e la card si colora.
      💬 posta l'orologio in chat con i segmenti disegnati.
- [ ] **Clock segreti**: 👁/🙈 (solo GM) nasconde un orologio ai giocatori: aprendo la stessa scheda da un client
      Player quell'orologio non compare, e il suo 💬 arriva solo al GM. Gli altri restano visibili.
- [ ] **Infuse (Wright)**: PG Stormbender con Cryo → sul pannello c'è "✨ Infuse 3"; premendolo servono 3 Aether:
      se ce ne sono abbastanza vengono scalati (il contatore Aether scende), esce la card "✨ … infuses Cryo —
      CRYOTIC" e il bottone resta acceso "✨ Infuse 3 — armed". Ri-premendolo l'Aether torna indietro.
- [ ] **Infuse senza Aether**: con meno Aether del costo l'avviso dice quanti ne servono e non scala nulla.
      Su Ätherwand ("Infuse X") esce il dialog "How much Aether?" con il massimo pari all'Aether disponibile.
- [ ] **Una sola infusione per volta**: armando l'infusione di un'altra abilità, la prima viene rimborsata
      automaticamente e resta accesa solo la nuova.
- [ ] **Area della versione infusa**: con "Infuse 3 — armed" su Cryo, il bottone 📐 propone anche "Line 8
      (Infuse 3)"; su Bio "Medium Blast", su Geo "Arc 8", su Eye of the Storm "Large Blast". Senza infusione
      armata le scelte sono quelle di prima.
- [ ] **Piazzamento fuori range (Alt)**: piazzando un'area, l'avviso dice che tenendo **Alt** si può uscire dal
      raggio consentito; tenendo Alt le caselle fuori raggio diventano valide e il click piazza, rilasciando Alt
      torna il limite. Senza Alt il comportamento è identico a prima.
- [ ] **Wild Card del Seer**: piazzare una o più Wild Card sulla mappa (chip 🐾 o compendio), poi lanciare
      un'abilità ad area di un PG che tocchi lo small blast di una carta → esce il dialog "Wild Card": con "Set it
      off" l'area si allarga fino a coprire la carta, la carta sparisce dalla mappa, in chat arriva la nota, e i
      bersagli contati includono chi si trova nell'area estesa. Con "Leave them" non cambia niente.
- [ ] **Catena di carte**: due carte vicine (a 2 caselle l'una dall'altra) → farne scattare una allarga l'area
      fino a toccare la seconda, che viene inclusa nello stesso dialog e rimossa anche lei. Una carta lontana
      resta sul posto. La Master Card si comporta come una Wild Card.

## Pulizia dati del 20 settembre 2026 (punto 3: cose emerse lavorando)

- [ ] **Trigger stampati una volta sola**: sul pannello (e sulla card 💬) Terraforming mostra un solo "Charge:
      Choose four effects.", Helix Heel un solo "Charge: Shatter any foe damaged by this ability.", Aethershard
      un solo "Comeback: Reduce sacrifice to 1.", Blazing Bond un solo "Comeback: Reduce partner sacrifice to 1."
      e Nothung un solo "Slay or Infuse 3: GRAM — …". Prima ognuno ne stampava due, con testi leggermente
      diversi.
- [ ] **Tratti senza il box dei summon**: scheda PG con Darkside (Shade), Beast Master (Warden), Cheap Trick
      (Fool), Gardener of Kin (Harvester) → il testo del tratto finisce dove lo finisce il manuale (es. Darkside:
      "When you first vacate a space on your turn, you may leave a shadow."), senza il paragrafo su come si
      evocano le shadow/beast/bomb/thrall. Quelle regole restano nel compendio **Summons** (attori Shadow, Beast,
      Bomb, Thrall, Plant). Beast Master tiene il suo Great Beast, che è parte del tratto.
- [ ] **Geo (p.218) e The Tower (p.203)**: il blocco "Terrain Effect:" ora è una riga sua
      (Geo: Hit | Miss or Area | Terrain Effect | Charge | Infuse 4; The Tower: Hit | Area | Terrain Effect) e
      non è più incollato in fondo al blocco Area.
- [ ] **Ordine dei blocchi rimasti**: Raging Wolf (pp.137-138) mostra "Special | Comeback | Heroic | Special"
      come il manuale; Chaos Tarot "Area | Summon | Summon Effect" con la lista 1-6 dentro il blocco Area;
      Drifting Leaf finisce con "Infuse 3 or Slay: PHANTOM BLADE"; Ace (p.157) mostra "End your turn and gain
      Stance" + "Refresh" (prima la prima riga spariva nel testo di apertura). Pandaemonium, Pyre, Lance, Death,
      Dragon Dive, Fairy Ring e Gran Reversa erano già giusti e non devono cambiare.
- [ ] **Bifröst e Rampant Nail**: un solo blocco "Infuse 3 or Slay: HEIMDALL / RUINÖS" (prima ne comparivano due,
      il secondo etichettato solo "Slay").
- [ ] **Refocus non azzera più gli Skill Rank guadagnati**: PG che ha preso almeno un'azione migliorata a un
      level up → ↻ Refocus azzera i pallini delle dieci azioni ma il contatore della tab Notes resta
      "(6 from creation + N from level ups)" con N invariato; prima N tornava a 0.
- [ ] **Area dal testo anche per gli NPC**: foe/legend con un'azione che descrive l'area solo nel testo (senza
      tag blast/line/arc) → sulla riga dell'azione compare il bottone 📐 con la forma letta dal testo e la piazza
      correttamente. Le azioni con il tag mantengono il comportamento di prima.
- [ ] **Chip dei tag NPC leggibili**: card d'attacco di un Foe/Legend → i chip dicono "True Strike", "Line 3",
      "+1 Boon" (prima "true-strike", "line-3", "boon-1") e col mouse sopra mostrano la regola, come sulle card
      dei PG.
- [ ] **Migrazione 14** (schema 13 → 14): mondo esistente → all'apertura la console dice "Migration 14: N
      trait(s)/ability(ies) cleaned on …"; i tratti dei PG perdono il box dei summon e le cinque abilità perdono
      il trigger doppio. Copie modificate a mano non vengono toccate; riaprendo il mondo non rigira.

## Debug del 22 settembre 2026 (bug segnalati da Edoardo, build 1.6.0+)

- [ ] **Butcher nella cartella giusta del compendio**: aprire il compendio **Foes** → cartella `Lowlander` →
      il Butcher sta in `Heavy`, non più in `Artillery`. `Lowlander / Heavy` passa da 3 a 4 foe (Butcher più i
      tre di prima) e `Lowlander / Artillery` da 22 a 21; Slab, Mule, Canker, Snork e Slaughterer restano in
      `Artillery` (è la scelta del 20 settembre: solo il Butcher cambia classe).
- [ ] **Scheda del Butcher invariata**: aprirlo → sempre Heavy, VIT 10, HP 40, Difesa 6, Fray 4, [D] d6,
      Armor 2, tratti Defiance / Guard / Lowlander Toxin / Pit expert / Suddenly! (niente Slip né Aetherwall).
      Il fix di oggi tocca solo dove è archiviato, non i numeri.
- [ ] **Guard del Butcher tra i tratti**: compendio **Foe Abilities** → `Lowlander` → `Traits` contiene
      "Butcher — Guard"; la cartella `Actions` dello stesso Lowlander NON lo contiene più (lì restano Wall of
      Meat, Kidnap, Mancatcher Bolas, Fury Strikes).
- [ ] **Encounter Designer**: aprire l'Encounter Designer, cercare "Butcher" nel roster → la riga lo dà come
      **Heavy** di fazione Lowlander, e il budget lo conta come Heavy. (Legge `system.foeClass`, quindi era già
      giusto prima: serve solo a controllare che lo spostamento di cartella non abbia rotto nulla.)
- [ ] **Import**: trascinare il Butcher dal compendio nel mondo → l'attore arriva con la scheda Heavy e le sue
      abilità. Un Butcher importato **prima** di oggi non cambia (i foe già nel mondo non si aggiornano mai):
      se ce n'è uno vecchio in giro, va reimportato.

- [ ] **Migrazione 15** (schema 14 → 15): aprire un mondo esistente → la console dice `Migration 15: "<nome>"
      (level N) — halfway AP of level 0 taken back (AP total X → X-1)` per ogni PG di livello ≥1 che aveva il
      punto di troppo, più la notifica "N character(s) gave back the level-0 halfway AP". I PG a livello 0 non
      vengono toccati (li aveva già sistemati la migrazione 12). Riaprendo il mondo non rigira.
- [ ] **AP Total giusto sulla tab Notes**: dopo la migrazione, su un PG di livello 1 appena salito il totale è
      **4** (2 della creazione + 2 del livello 1) e non 5; a livello 2 è **5**; a livello 5 con un solo job è
      **9**; con due job (fork "new job" al livello 4) è **11**. Il conteggio "Spent N / M" e "(N free)" si
      aggiornano di conseguenza.
- [ ] **PG lasciati stare**: se un PG ha un AP Total che non torna con i conti (livello messo a mano, AP dati
      dal GM, sheet già corretto a mano dopo la migrazione 12) la console lo elenca con `left alone — their AP
      total does not match what the system granted` e una notifica gialla, **senza** cambiargli i numeri.
- [ ] **Bottone "⚠ one AP too many — fix"**: importare in un mondo già migrato un PG vecchio di livello ≥1 col
      punto di troppo → sulla tab Notes, sotto AP Total, compare il bottone rosso; cliccandolo chiede conferma
      ("has X AP, one more than everything this system grants adds up to") e porta il totale a X-1. Su un PG
      con i conti giusti il bottone **non** deve comparire.
- [ ] **Il bonus di metà barra resta corretto**: PG a livello 0 che passa da 6 a 7 XP → nessun AP, nessuna card
      in chat. Lo stesso PG portato a livello 1 e poi da 6 a 7 XP → +1 AP e la card "has reached the halfway
      mark". (Era già così dal 20 settembre: serve a controllare che la migrazione non abbia toccato la regola.)

- [ ] **Skill Rank non più "OVER" per sempre**: PG importato/costruito a mano (quindi con il campo Skill Ranks
      a 0) di livello ≥1 → la riga "Spent N / M" ora conta anche i dot che il livello concede, non solo i 6
      della creazione. A livello 4 il totale è **10** se al livello 4 ha preso "migliora due azioni", **8** se
      ha preso il bond power. Prima diceva sempre `/ 6` con la bandiera ⚠ OVER.
- [ ] **Migrazione 16** (schema 15 → 16): aprire un mondo esistente → la console dice `Migration 16: "<nome>"
      (level N) — Skill Ranks from level ups X → Y (pool Z with the 6 from creation)` per ogni PG rimasto
      indietro, più la notifica "N character(s) had their Skill Rank pool brought up to their level". Chi ha
      **più** dot di quelli della tabella (dati dal GM apposta) viene lasciato stare e solo elencato in console.
      Riaprendo il mondo non rigira.
- [ ] **Bottone "⚠ behind the level — set to N"**: importare in un mondo già migrato un PG vecchio di livello
      ≥1 col campo Skill Ranks indietro → sulla tab Notes compare il bottone; il dialog spiega livello,
      quanto concede la tabella e quanto c'è nel campo, e conferma porta il campo al valore giusto. Su un PG
      creato e salito di livello dentro il sistema il bottone **non** deve comparire.
- [ ] **Il fork del livello 4/8 letto dai bond power**: due PG di livello 4, uno che al livello 4 ha preso il
      bond power (4 bond power sulla scheda contando quello della creazione) e uno che ha preso le due azioni
      (3 bond power) → il primo mostra `/ 8`, il secondo `/ 10`.
- [ ] **Level up normale invariato**: PG salito di livello con il wizard → il campo cresce di 1 (o di 2 ai
      livelli 4/8 se sceglie le azioni) come prima, il bottone non compare, e i dot spesi nel wizard finiscono
      sulle azioni scelte.
- [ ] **Caso di Edoardo (16 dot a livello 4)**: verificare quanti dot ha davvero quel PG sulla tab Narrative
      (somma delle dieci azioni) e a che livello è. Dopo il fix il totale sarà 8 o 10: se la somma resta 16 il
      ⚠ OVER è **giusto** e sulla scheda ci sono 6 dot di troppo da togliere — 16 è esattamente il massimo di
      un personaggio di livello 12, quindi vale la pena controllare da che scheda è stato copiato.

- [ ] **Testata della scheda Clock leggibile e viva**: creare un attore **Clock** e aprirlo → il nome si legge
      per intero (prima era tagliato a sinistra, "ctor" al posto di "Actor"), sotto c'è "0 clocks", e la banda
      viola sta *dietro* al testo con il taglio diagonale sotto, come sulle schede Foe/Legend/Summon.
      Ridimensionando la finestra non si taglia più niente.
- [ ] **"+ Clock" funziona**: premere **+ Clock** → compare una riga "New clock" 0/6. Prima il bottone era
      dentro la banda, che ha `pointer-events: none`, quindi i click non arrivavano: nessun pulsante della
      testata rispondeva (nemmeno il campo del nome, mentre le Notes più in basso funzionavano).
- [ ] **Nome della lavagna**: cliccare sul nome nella testata, scriverlo e uscire dal campo → il nome
      dell'attore cambia davvero (prima il campo non prendeva nemmeno il fuoco).
- [ ] **Clock segreti non spariscono più**: da GM fare tre orologi e marcare **segreto** quello di mezzo
      (🙈). Dare a un giocatore il permesso **Owner** sull'attore, farsi aprire la scheda da lui e fargli
      cambiare il nome della lavagna o di un orologio → tornando sul client del GM i tre orologi ci sono
      ancora, nello stesso ordine, e quello segreto è ancora segreto. Prima l'orologio nascosto veniva
      cancellato e quelli dopo scalavano di un posto.
- [ ] **Segmenti non cliccabili per chi non può scrivere**: con un giocatore in sola lettura (Observer) i
      segmenti non hanno più la manina né l'effetto al passaggio del mouse, e cliccandoli non succede niente
      (prima sembravano cliccabili e l'aggiornamento veniva rifiutato per permessi).
- [ ] **Taglia fuori elenco**: un orologio con una taglia non standard (es. 24, messa via console) → la
      tendina la mostra tra le altre e cambiando un altro campo la taglia resta 24. Prima tornava a 4.

- [ ] **Tab in scatoletta**: aprire una scheda PG → Narrative / Combat / Conditions / Relics / Notes sono cinque
      riquadri distinti, ognuno con il suo bordo su tutti e quattro i lati, sfondo proprio e 5px di stacco fra
      uno e l'altro. Quella attiva è dorata (bordo oro, riempimento sfumato, testo chiaro, barretta oro sopra).
      Passando il mouse su una inattiva si schiarisce senza spostarsi di un pixel.
- [ ] **Stesso trattamento sulle altre schede**: Foe, Legend e la scheda degli oggetti usano tutte
      `.icon.sheet .tabs`, quindi le loro tab devono avere lo stesso aspetto a scatoletta (prima erano
      allineate come testo corrido anche lì).
- [ ] **Nessuno scatto cambiando tab**: cliccando da una tab all'altra la riga non "salta" in altezza — il
      cappuccio dorato c'è anche sulle inattive, solo trasparente.

- [ ] **AP avanzati, avviso al passo 1**: PG con almeno 1 AP libero (tab Notes: "(N free)") e 15 XP → aprire
      Level Up → **già nel passo 1** compare il riquadro "+N AP still unspent" nella griglia dei guadagni e
      sotto il paragrafo dorato "<nome> has N ability point(s) left over…". Prima l'avviso esisteva solo nel
      passo 2, dentro la sezione delle abilità, quindi non si vedeva aprendo il wizard.
- [ ] **Riepilogo del passo 2**: premendo "Next →" la lista "Level N — your choices" ha la riga "N AP carried
      over from earlier levels — M to spend in total", anche ai livelli che non danno AP di loro (2, 3, 6, 9,
      10, 12). Prima la riga "+N AP to spend" spariva del tutto a quei livelli.
- [ ] **Avviso anche senza abilità da prendere**: PG con 6 abilità equipaggiate (o senza abilità nuove
      disponibili) e AP liberi → nel passo 2 il paragrafo dorato c'è lo stesso, sopra i selettori. Prima stava
      dentro la sezione "New abilities" e spariva con essa.
- [ ] **Colore giusto**: l'avviso è dorato con la barretta a sinistra, non rosso (il rosso è per gli errori
      tipo "hai speso più AP di quelli guadagnati").
- [ ] **Card di metà barra**: PG di livello ≥1 che passa da 6 a 7 XP → la card in chat dice "+1 AP granted" e
      sotto "N ability point(s) unspent — spend on a new ability or a talent from the Combat tab, o keep…".
      Se il PG ha già speso tutto (free 0) la riga in più non compare. A livello 0 non compare nessuna card.
- [ ] **Nessun doppio conteggio**: spendendo gli AP avanzati nel wizard, il contatore "AP N left" scende da
      N+guadagnati e Confirm accetta; il totale sulla tab Notes dopo il level up torna coerente con "Spent/Total".

- [ ] **Aetherwall anche per i PG Wright**: PG di classe Wright (tratto "Aetherwall" sulla tab Combat) con il
      token in scena, colpito da un attaccante a **più di 2 caselle** → sulla card del danno compare il chip
      "Aetherwall ½" e premendo Apply il danno è dimezzato. Prima funzionava solo sui foe Artillery: il
      controllo leggeva `system.traits` (che esiste solo sugli NPC) e la classe del foe, quindi sui PG non
      scattava mai.
- [ ] **Entro range 2 non scatta**: stesso PG con l'attaccante a 2 caselle o meno → niente chip, danno pieno.
      A 3 caselle riparte.
- [ ] **È resistance, non cover**: lo stesso dimezzamento vale anche per un'**area effect** o per un attacco
      in mischia da oltre range 2, non solo per gli attacchi a distanza (p.298 / p.113: "resistance against
      all abilities from characters that are outside of range 2").
- [ ] **Unerring lo ignora**: attacco con il tag **unerring** contro lo stesso PG da oltre range 2 → nessun
      dimezzamento (glossario p.105: "Unerring — Ignores cover and aetherwall").
- [ ] **Mai doppio dimezzamento**: se sulla card del tiro era già spuntato Resistance/Cover, il chip dice
      "Aetherwall (already ½)" e Apply dimezza una volta sola.
- [ ] **Senza token non indovina**: PG Wright senza token in scena (o attaccante senza token) → nessun chip e
      nessun dimezzamento automatico, perché la distanza non è misurabile.

## Ancora da verificare con Maar (round 4, 30 agosto)

- [ ] Dropdown `<details>` delle schede PG restano aperti al cambio turno.
- [ ] Burden/Ambition: click sui segmenti e +1 avanzano il clock giusto.
- [ ] Heave-Ho mostra il Trigger; Draken Cross mostra Effect dopo Area.
- [ ] Pannello status del token non copre le tab della sidebar.
- [ ] Badge "Range N" sugli attacchi base; Aether si azzera a fine combat.
