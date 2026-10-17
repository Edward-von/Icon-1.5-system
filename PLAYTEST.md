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

## Esito playtest locale del 1 ottobre 2026 (Foundry locale, mondo "test", build 1.12.0)

Richiesto da Edoardo in locale invece che sul server. Eseguite le prove dalla 1.6.2 alla 1.12.0 come GM ("Gamemaster" 2),
con attori ZzT temporanei, una scena e un combat di prova; tutto cancellato alla fine e il combat del mondo rimesso attivo.
Le voci spuntate qui sotto sono passate. Restano aperte quelle che chiedono un giocatore collegato o un mondo diverso:
giocatore senza permessi sui template / summon / orologi, tour visti da giocatore, Junk Golem col [D] del foe, popup e
avviso al vero cambio di versione (Foundry va riavviato per leggere la 1.12.0: in locale diceva ancora 1.11.0), macro
cambio di lavoro al passo 1 del level up. Fatte dopo, su richiesta di Edoardo: macro Interlude (copia di tutti i PG prima,
ripristinati identici dopo: HP pieni, ferite / strain / vigor / Resolve a 0, Effort pieno, status tolti, Burden 0/6 → 4/6
con 1 segmento comprato a 2 Dust) e nuova abilità con l'AP avanzato (PG con 5 abilità, livello 5 → 6: accettata, 0 AP
liberi). Nota: il PG "Actor" del mondo locale non rispetta la regola di classe (primaria Enochian, abilità quasi tutte
Stalwart), quindi il level up lo rifiuta: è la regola, non un difetto.

Difetti trovati e corretti durante il playtest (dettagli nel CHANGELOG 1.12.0):
- [x] Template di fazione e cultura rifiutati ("foeClass: may not be a blank string") → si applicano.
- [x] Il token non seguiva la taglia del foe (template Bouncer / Jotunn, campo Size) → prototipo e token sulle scene seguono.
- [x] Carta del danno con "Aetherwall ½" / "Cover ½" / Dodge accesi anche con Unerring / True Strike → mostrati come "ignored".
- [x] Dimezzamenti arrotondati per difetto (Resistance, Cover, Aetherwall, Pacified, Hatred) → per eccesso (p.86, esempio p.106).
- [x] (trovato registrando le clip) L'aura non seguiva il token se il GM attivo guardava un'altra scena → la segue (verificato col
      client di Edoardo su "test").

## Debug del 30 settembre 2026 — classi dei foe e compendio riordinato (versione 1.6.2)

Solo compendi: i foe già importati nel mondo NON cambiano. Provare sempre importando una copia nuova dal
compendio (poi cancellarla).

- [x] **Cartelle del compendio Foes**: aprendo il compendio ogni fazione (Relict, Hob, Jotunn…) ha le cartelle
      Artillery / Heavy / Leader / Skirmisher / Mobs / Uniques, e dentro Uniques la sottocartella Elites. Folk ha
      solo Mobs e Uniques; Lowlander ha in più "Legend Adds" (Cultist, Vile Darter, Giant Insect, Lesser Clot).
      Basic Jobs ha "Mobs" al posto di "Mob". Nessuna cartella vuota.
- [x] **Wight → Heavy**: importare Wight (Relict / Heavy) → classe Heavy, Defense 6, Fray 4, [D] d6, Armor 2,
      HP 40; tratto Guard presente; azione Diaga assente. Stesso controllo veloce su Tomb Guard o Legionary.
- [x] **Wraith → Artillery**: importare Wraith o Chain Wraith (Relict / Artillery) → classe Artillery, VIT 8,
      HP 32, Defense 7, [D] d8; tratti Slip e Aetherwall; niente Diaga.
- [x] **Unique Elite con HP stampato**: Arkitek (Relict / Uniques / Elites) → Leader, Elite, VIT 10, **HP 64**
      (non 80), Diaga presente, Guard assente. Kinfisher (Ruin Beast / Uniques / Elites) → Heavy, Elite, HP 64,
      Guard. Megacrab (Ruin Beast / Uniques) → Heavy con **Armor 10**.
- [x] **Diventati Elite**: Atrophic Grave (Relict / Uniques / Elites) e Churn Baron (Scavenger / Uniques / Elites)
      → Elite spuntato, HP 80, due attivazioni nel tracker quando entrano in combattimento.
- [x] **Mob nuovi**: Goons (Scavenger / Mobs) e Villager (Folk / Mobs) → classe Mob, la scheda mostra il
      contatore dei membri al posto degli HP, tratto Mob; Goons senza Slip/Aetherwall, Villager senza Diaga.
- [x] **Non più mob**: Red Worm (Ruin Beast / Artillery) e Shinobi (Folk / Uniques) → HP normali (32 e 28),
      nessun contatore membri, tratto Mob assente.
- [x] **Fedeli del Fetid Idol**: Cultist → Skirmisher con HP 15, Defense 10, **[D] d8 e Fray 3** (quelli
      dell'idolo, p.440); Vile Darter → Artillery HP 15; Giant Insect → Heavy HP 20.
- [x] **Rimossi dal compendio Foes**: cercando "Automaton", "Munition", "Reticle", "Torpedo", "Soul Fragment",
      "Lord", "Guilder", "Islander", "Leggio" nel compendio Foes non esce niente. Nel compendio Legends
      Veridian Weapon, Azurian Weapon, Crimson Weapon, Arkenlich e Dread Lords ci sono ancora e descrivono i loro
      summon / Lord.
- [x] **Foe Abilities allineato**: nel compendio Foe Abilities esiste "Wight — Guard" e non esiste più
      "Wight — Diaga"; non esiste nessuna voce "Torpedo — …" o "Guilder — …"; esistono ancora
      "Faction: Folk — Great Culture: Strive (Guilder)" e le altre Great Culture.
- [x] **Encounter Designer**: il roster mostra Wight come Heavy e Wraith come Artillery; filtrando per classe
      "Mob" compaiono Goons e Villager; il totale dei foe da compendio scende (362 invece di 376).
- [ ] **Mondo non toccato**: un Wight già importato nel mondo prima dell'aggiornamento resta Leader (normale:
      le correzioni ai compendi valgono solo per i nuovi import).

## Template da trascinare sui foe (30 settembre 2026, versione 1.7.0)

Usare una copia nuova di un foe base (compendio Foes → Basic Jobs, es. Brute), poi cancellarla.

- [x] **Compendio**: nella barra dei compendi c'è "Foe Templates". Dentro, una cartella per fazione; in ogni
      fazione il template di fazione, e le sottocartelle Artillery / Heavy / Leader / Skirmisher con i job.
      Folk ha il template Folk e la sottocartella Great Cultures (6); Imperial ha anche Imperial Officer,
      Jotunn anche Titan Armament.
- [x] **Scheda del template**: aprendo "Wight" si vede "Faction job · Relict · Heavy · p.325", la riga delle
      statistiche (VIT 10, HP 40, DEF 6…) e l'elenco di tratti e azioni con il loro testo. Aprendo "Relict" si
      vedono Monsters e Legion of the Dead.
- [x] **Template di fazione**: trascinare "Relict" sulla scheda del Brute → notifica "Relict applied…", nella
      riga Templates del Foe Builder compare il gettone "FACTION Relict", la tendina Faction dice Relict, tra i
      tratti ci sono Monsters e Legion of the Dead. Statistiche invariate.
- [x] **Togliere**: ✕ sul gettone Relict → i due tratti spariscono, la fazione torna com'era, il gettone sparisce.
- [x] **Template di job**: trascinare "Wraith" (Relict / Artillery) sul Brute → classe Artillery, VIT 8, HP 32,
      DEF 7, [D] d8, Armor 0; Guard sparisce; compaiono Phasing, Flying, Legion of the Dead, Slip, Aetherwall e le
      azioni Unstable Charge, Chain Lightning, Soul Spark; le azioni del Brute restano. ✕ → torna Heavy con
      Guard, HP 40, come prima.
- [x] **Sostituzione con conferma**: Folk + "Guilder" sul Brute (compare l'azione Strive), poi trascinare
      "Leggio" → finestra "Replace template?" che nomina Guilder. Confermando: Strive sparisce, compare
      Acrobatics, i gettoni sono Folk e Leggio. Ripetendo con "Islander" e premendo annulla, non cambia niente.
- [x] **Niente doppioni**: sul Brute pulito trascinare "Wight" e poi "Relict" → Legion of the Dead c'è una
      sola volta (Relict aggiunge solo Monsters). Poi trascinare "Wraith" → chiede di sostituire Wight;
      confermando, Legion of the Dead c'è ancora una volta sola.
- [x] **Jotunn**: trascinare "Jotunn" sul Brute → Elite spuntato, HP da 40 a 80, taglia 2, tratti Kin,
      Titanblood, Titanfall. Poi "Titan Armament" → HP 120. Togliere Titan Armament → 80; togliere Jotunn →
      40, non Elite, taglia com'era.
- [x] **Speciali che si sommano**: Imperial + Imperial Officer sullo stesso foe → nessuna richiesta di
      sostituzione, due gettoni, tratti Promotion e Imperial Command Aura.
- [x] **Click sul nome del gettone**: apre l'item del template dal compendio.
- [ ] **Giocatore senza permessi**: con una scheda in sola lettura il drop non fa niente e non c'è la ✕.

- [x] **Tendina Faction (fix)**: importare dal compendio un foe qualsiasi (es. Wight) → la tendina Faction dice
      "Relict", non "—". Cambiare un altro campo (es. Chapter) e riaprire → la fazione è ancora Relict. Un foe dei
      Basic Jobs mostra "Basic Jobs" come voce della tendina. Un foe con la vecchia chiave (fazione scelta con la
      tendina prima di oggi, es. "relict") mostra Relict e al salvataggio diventa "Relict". Stesso controllo sulla
      scheda di una Legend.
- [x] **Encounter Designer**: il filtro fazione non ha più voci doppie tipo "relict" e "Relict" per i foe
      sistemati come sopra.

## Summon dei foe sulla loro scheda (30 settembre 2026, versione 1.8.0)

Da provare come GM su una scena con griglia, con foe importati di nuovo dal compendio (poi cancellarli insieme
alla cartella "Foe Summons").

- [x] **Sezione sulla scheda**: importare Wraith (Relict / Artillery) → in fondo alla tab Stats & Abilities c'è
      "Summons & Objects" con Soul Spark: gettone "⤓ Soul Spark", riga "Summon, size 1, intangible · p.329", testo
      delle regole. Un foe senza summon (es. Wight) non ha la sezione.
- [x] **Varianti**: Arc Spectre, Chain Wraith, Rift Wraith, Abomination, Blasphemy hanno anche loro Soul Spark.
- [x] **Trascinare sulla mappa**: dal gettone di Soul Spark trascinare sulla scena → compare un token Soul Spark
      dove si è lasciato il mouse, allineato alla griglia; nella barra degli attori c'è la cartella "Foe Summons"
      con l'attore Soul Spark. Notifica "Soul Spark placed (Wraith)".
- [x] **Più copie**: trascinare altre due volte → tre token, un solo attore nella cartella.
- [x] **Scheda del summon**: aprire il token → scheda Summon con Summoner = Wraith, testo dell'effetto, intangibile.
      Per un summon con azione (es. Junk Golem dell'Hoarder, o Combat Automaton della Veridian Weapon) il tiro di
      danno usa il [D] e il fray del foe.
- [x] **HP propri**: Combat Automaton (Veridian Weapon, legend) → token con barra HP 5/5, difesa 5; danneggiarne uno
      non tocca gli altri.
- [x] **Taglia**: Everforge (Keeper of the Eldflame) → token 2×2.
- [x] **Oggetti**: Temple Bell (Bell Warden) e Cauldron (Troll) compaiono come oggetti (bordo dorato nella sezione),
      velocità 0 sulla scheda del token.
- [x] **Legend**: sulla Majesty Demon, tab Combat, ci sono i cinque summon della corte (Sycophant, Scepter Bearer,
      Shrouded Lady, Maiden, Flagellant Knight) con HP e difesa del libro.
- [x] **💬**: il bottone chat sul summon manda in chat nome, riga descrittiva e regole, con il foe come speaker.
- [ ] **Giocatore**: un giocatore che trascina il gettone (se vede la scheda) riceve "Only the GM can place a foe's
      summons." e non si crea niente.
- [x] **Casi fissati a mano**: lo Shopkeep ha solo "Shop" (non Bomb né Mushroom); gli Hob con "Snatch Memory" non
      hanno il summon Memory; Battle Wagon e Azurian Weapon hanno ognuno il suo Torpedo (testi diversi).
- [x] **Job template con summon**: trascinare il template "Wraith" su un Brute → compare la sezione con Soul Spark;
      ✕ sul template → la sezione sparisce.

## Token della taglia giusta (30 settembre 2026, versione 1.8.1)

- [x] **Jotunn**: importare Troll (Jotunn / Leader) e trascinarlo sulla scena → token di 2×2 caselle. Stessa cosa
      per un Jotunn unico (es. Bale Troll).
- [x] **Bouncer**: importare Bouncer (Scavenger) → Size 2 nell'intestazione della scheda, token 2×2.
- [x] **Scrapper**: importare Scrapper (Scavenger / Heavy) → Size 1, token di una casella.
- [x] **Job template**: trascinare il template "Bouncer" su un foe di taglia 1 → la taglia diventa 2.

## Titan Armament completo, Foe Abilities senza doppioni, avviso di aggiornamento (30 settembre 2026, versione 1.8.2)

- [ ] **Avviso di aggiornamento**: al primo avvio del mondo di Maar con la 1.8.2, il GM vede "ICON 1.5 updated to
      1.8.2" con la spiegazione di reimportare foe, legend e item (e che le macro si aggiornano da sole). "Got it"
      la chiude; ricaricando (F5) non ricompare. Un giocatore connesso non la vede.
- [ ] **Mondo nuovo**: creando un mondo vuoto con il sistema, l'avviso non compare (compare la guida di benvenuto).

- [x] **Terzo turno**: importare un Jotunn Elite (es. Troll), trascinarci sopra il template "Titan Armament" →
      HP ×1.5; metterlo in combattimento e passare al round successivo → nel tracker ha 3 attivazioni invece di 2.
      Togliere il template (✕) e passare al round dopo → di nuovo 2. La scheda del template mostra
      "+1 turn a round".
- [x] **Foe Abilities**: nel compendio non c'è più nessuna voce che inizia con "Faction:"; ci sono ancora
      "Heavy (class) — Guard" e le altre voci "(class)", e "Universal Template — Elite". Le stesse regole di
      fazione si trovano nel compendio Foe Templates.

## AP avanzati spendibili al level up (30 settembre 2026, versione 1.8.3)

- [x] **Caso di Maar**: PG di livello ≥1 con 1 AP libero (preso a metà barra e non speso; tab Notes "(1 free)"),
      portarlo a 15 XP e fare Level Up verso un livello che non dà AP (es. 2, 3, 6) → nel passo 2 spuntare una
      abilità nuova → Confirm **accetta**, l'abilità è sulla scheda, la tab Notes dice "(0 free)".
- [x] **Talento con l'AP avanzato**: stesso caso ma scegliendo un Talento invece dell'abilità → accetta.
- [x] **Ancora bloccato se si esagera**: con 1 AP avanzato e 0 dal livello, spuntare due abilità → errore "…only have
      1 AP to spend (0 from this level + 1 carried over)" e il level up non avviene.
- [x] **Livello che dà AP**: livello 5 (+1 AP) con 1 avanzato → si possono prendere 2 abilità, non 3.

## Unerring che ignora davvero Aetherwall (30 settembre 2026, versione 1.8.4)

Bersaglio: un foe Artillery (Aetherwall) con il token a **più di 2 caselle** dall'attaccante.

- [x] **Status Unerring sull'attaccante**: dare lo status Unerring al PG (tab Conditions), tirare il danno di un
      attacco qualsiasi → nel dialog la casella "Unerring" è già spuntata con scritto "from your Unerring status";
      sulla card niente chip "Aetherwall ½" e Apply toglie il danno pieno.
- [ ] **Tag unerring**: un'abilità con il tag unerring (es. Death Blossom) senza lo status → casella spuntata "from
      the ability's tag", danno pieno.
- [x] **Senza Unerring**: stesso attacco senza tag né status → casella vuota, "Aetherwall ½" come prima.
- [x] **Casella tolta a mano con lo status attivo**: togliere la spunta nel dialog → il danno resta pieno lo stesso
      (lo status vale comunque).
- [x] **True Strike**: status True Strike sull'attaccante contro un bersaglio con Dodge, risultato Miss → casella
      "True Strike" già spuntata, Dodge non annulla il danno.
- [x] **Foe e Legend**: stesso controllo tirando il danno dalla scheda di un foe con lo status Unerring contro un PG
      Wright (Aetherwall).

## Orologi sulla mappa (30 settembre 2026, versione 1.9.0)

Da provare come GM con un secondo client giocatore collegato. Prima: F5, la migrazione 17 dà un id agli orologi
esistenti (in console "Migration 17: N clock(s) given a stable id" se ce n'erano).

- [x] **Gettone sul foglio**: aprire una lavagna orologi → ogni orologio ha "⤓ Map" accanto a "N/M". Il giocatore
      non lo vede.
- [x] **Trascinare**: trascinare "⤓ Map" sulla scena → compare un token 2×2 con il disco a spicchi (tanti quanti i
      segmenti), i segmenti pieni nel colore dell'orologio, "N/M" al centro, il nome sotto.
- [x] **Aggiornamento dal vivo**: con il foglio aperto cliccare un segmento, poi "+" e "−" → il disco sulla mappa
      cambia subito, anche sullo schermo del giocatore. Riempiendolo tutto il bordo diventa più acceso.
- [x] **Taglia e colore**: cambiare la taglia (4 → 8) e il colore sul foglio → il disco ha 8 spicchi e il nuovo
      colore.
- [x] **Nome**: rinominare l'orologio → il nome sotto il token cambia.
- [x] **Segreto**: 🙈 sull'orologio → il token diventa nascosto (semitrasparente per il GM, invisibile al
      giocatore); 👁 → torna visibile. Un orologio già segreto trascinato sulla mappa nasce nascosto.
- [x] **Più token / più scene**: due token dello stesso orologio, uno per scena → entrambi seguono il foglio.
- [x] **Togliere l'orologio**: ✕ sull'orologio nel foglio e conferma → i suoi token spariscono da tutte le scene;
      gli altri orologi e i loro token restano giusti (niente scambi di orologio).
- [x] **Doppio clic** sul token → si apre la lavagna degli orologi.
- [x] **Nessun pannello status**: selezionando il token orologio non compare il pannello degli status in alto a
      destra.
- [ ] **Giocatore che trascina**: se un giocatore riesce a trascinare (non dovrebbe vedere il gettone) → avviso
      "Only the GM can place a clock on the map."
- [ ] **Tab della scheda (richiesta di Maar)**: già fatto nella 1.6.1 — verificare che Maar abbia almeno quella build
      (le tab sono scatolette separate, l'attiva dorata).

## Tab separate davvero, nomi dei tipi (30 settembre 2026, versione 1.9.1)

- [x] **Tab in scatolette** (verificato da Edoardo in locale il 30 settembre): scheda PG → le cinque tab sono riquadri
      separati allineati a sinistra, l'attiva dorata.
- [x] **Nessuna sovrapposizione con la banda**: la parte alta delle scatolette non è tagliata dalla banda colorata
      dell'intestazione del PG (provare con una classe dal colore chiaro).
- [x] **Foe, Legend, oggetti**: stesse tab a scatoletta.
- [x] **Create Actor**: il menu dei tipi mostra "Clock Board", "Player Character", "Foe", "Legend", "Summon";
      Create Item mostra "Foe Template", "Foe Ability", ecc.

## Tour guidati (1 ottobre 2026, versione 1.10.0)

- [x] **Elenco**: Settings → Tours mostra una sezione "ICON 1.5" con quattro tour per il GM (First Steps, The
      Character Sheet, Combat, House Rules) e tre per i giocatori; console senza errori `Tour "..." failed to register`.
- [x] **First Steps** da GM: tutti i 9 passi; il libro 📖 nei controlli token viene evidenziato, la sidebar si
      apre da sola su Actors, Compendium, Combat, Chat; il passo "Encounter Designer" evidenzia il bottone.
- [ ] **First Steps** da giocatore: i passi "Encounter Designer" e "House rules" non compaiono (7 passi invece di 9).
- [ ] **First Steps** con la sidebar chiusa e senza scena attiva: nessun passo blocca il tour (quelli senza
      bersaglio compaiono al centro dello schermo).
- [ ] **The Character Sheet** in un mondo senza PG: il tour non si avvia (bottone non attivo o avviso "Create a
      player character first").
- [x] **The Character Sheet** con un PG: la scheda si apre da sola e cambia tab (Narrative → Combat → Conditions →
      Relics → Notes); ogni passo evidenzia la sezione giusta, anche dopo uno scroll lungo nella tab Combat.
- [x] **The Character Sheet** con un PG senza Limit Break: il passo "Limit Break and Resolve" evidenzia la riga
      Resolve invece di fermarsi.
- [ ] **Combat** senza combat attivo: i passi del tracker evidenziano la tab Combat intera, il passo degli status
      compare al centro; con un combat iniziato evidenziano banner, pallini delle attivazioni e "⏸ Slow".
- [ ] **Tasti ← →** per avanzare/indietreggiare, **✕** per uscire; "Resume" riprende dal passo lasciato.
- [x] **Fine First Steps**: Foundry propone di continuare con il tour della scheda.
- [ ] **Guida di benvenuto** (❔ Guide in Notes → Character Management): bottone **Take the tour** avvia First Steps;
      **Got it** chiude come prima.
- [ ] **Macro/console**: `game.icon.startTour("combat")` riparte da capo il tour Combat.
- [x] **House Rules** da GM: si apre Configure Settings direttamente sulla sezione ICON 1.5; i passi evidenziano
      una per una le tre impostazioni (Party Resolve +1, Dust to heal Burdens, Heroic / Routine).
- [ ] **House Rules** con Configure Settings già aperto su un'altra sezione (es. Core): il tour passa da solo a
      ICON 1.5.
- [ ] **House Rules** da giocatore: non compare in Settings → Tours; `game.icon.startTour("house-rules")` mostra
      l'avviso "This tour is for the GM only."
- [x] **First Steps** da GM: il passo "House rules" sta prima di "Next steps" e rimanda al tour House Rules.

## Quick Guide: aree, FAQ, bottone (1 ottobre 2026, versione 1.11.0)

- [x] **Bottone sulla scheda PG**: "Quick Guide" in alto a destra nella banda colorata, sopra il numero del livello,
      leggibile con ogni colore di classe; clic → si apre la finestra "ICON 1.5 — Quick Guide". Non sposta né taglia
      il livello.
- [x] **Altri accessi**: il 📖 nei controlli token e il menu ⋮ di Foe / Legend / Summon / Clock aprono la stessa
      finestra; in Notes il bottone si chiama "📖 Quick Guide".
- [x] **Schede**: Turn / Areas / Glossary / FAQ mostrano una sezione alla volta, la scheda attiva è dorata, la
      finestra non cambia altezza passando dall'una all'altra; cliccare una scheda con del testo nella ricerca la
      svuota.
- [x] **Ultima scheda**: chiudere la guida su FAQ e riaprirla (dalla scheda PG o dal 📖) → si riapre su FAQ.
- [x] **Macro**: `game.icon.showReferenceGuide({ tab: "areas" })` apre direttamente le aree.
- [x] **Grafica come le schede**: banda diagonale dorata con "Quick Guide", sottotitolo e casella di ricerca; sotto,
      le linguette con lo stesso aspetto di quelle della scheda PG/Foe; contenuti in riquadri. Finestra
      ridimensionabile; con la guida già aperta, il 📖 la porta davanti (non ne apre una seconda) e cambia scheda se
      chiamata da macro con `{ tab }`.
- [x] **Ricerca**: scrivendo, le linguette si spengono e restano solo i riquadri con risultati (glossario e FAQ
      insieme); svuotando si torna alla linguetta di prima; cliccare una linguetta durante la ricerca la svuota.
- [x] **Popup a ogni aggiornamento**: dopo l'update, primo F5 → "ICON 1.5 — version X" con "Open the Quick Guide" /
      "Not now"; Open apre la guida su Turn; al secondo F5 il popup non esce più. Da provare anche come giocatore
      (ognuno lo vede una volta). Mondo/utente nuovo: esce solo il benvenuto, con il bottone "Quick Guide" che apre
      la guida.
- [~] (superata: i disegni sono diventati le clip registrate) **Disegni presenti** (fix del 1 ottobre pomeriggio): in Areas ogni riquadro ha la sua griglia disegnata tra
      il titolo e il testo (prima c'erano solo titolo e testo).
- [~] (superata: i disegni sono diventati le clip registrate) **Propagazione**: ogni area parte dall'origine (casella d'attacco per i Blast e il Burst target, il PG per i
      Burst self e l'Aura, la casella accanto al PG per Line e Arc) e si allarga a onde; accensione secca, niente
      dissolvenze; tutta l'area si spegne nello stesso istante, breve pausa a griglia vuota, poi ricomincia. Colori
      opachi, non fluo.
- [~] (superata: i disegni sono diventati le clip registrate) **Aree**: 11 riquadri (Small, Medium, Large Blast; Burst 1 target; Burst 1 e 2 self; Line 5; Arc 3, 4, 5;
      Aura 2) disposti in griglia senza scroll orizzontale; caselle che si accendono in sequenza e ricominciano;
      la casella d'attacco dei Blast e del Burst target è evidenziata; il Large Blast è una croce di 13 caselle
      come a p.98, non un quadrato.
- [~] (superata: i disegni sono diventati le clip registrate) **Aree, confronto con la mappa**: piazzare in una scena un Medium Blast e un Burst 1 (self) da un'abilità e
      confrontare con i disegni (stessa forma, stesso colore).
- [~] (superata: i disegni sono diventati le clip registrate) **Animazioni ridotte** (Windows: Impostazioni → Accessibilità → Effetti visivi → Effetti di animazione spenti):
      le caselle sono ferme e tutte visibili.
- [x] **Ricerca**: da qualsiasi scheda, "summon" mostra insieme le righe del glossario e la FAQ sui summon (nessuna
      scheda accesa); "armor" idem; "zzz" mostra "Nothing matches your search."; svuotando la ricerca si torna
      alla scheda di prima, con tutte le righe.
- [x] **FAQ**: 11 domande in fondo, ognuna con la pagina citata; le virgolette nelle domande si vedono bene.
- [x] **Tooltip delle parole chiave** sulle schede (glossario) funzionano come prima.
- [x] **Tour**: First Steps, passo "Quick Guide" con il testo nuovo; The Character Sheet, passo "Quick Guide" che
      evidenzia il bottone.

## Mark, level up, tour GM, aree a tempo (1 ottobre 2026, versione 1.12.0)

- [x] **Dust sui Burden**: Configure Settings → ICON 1.5, la voce si chiama "Dust to heal Burdens during an
      Interlude (RAW, p.42)" ed è spuntata in un mondo nuovo; la macro Interlude chiede quanti segmenti in più.
      Tour House Rules: il passo Dust dice che non è una house rule.
- [x] **Mark che si impilano**: Royal Guard, target su un PG, 🎯 Mark su Battalion of Limbs due volte → in chat
      "now has 2 stacks"; chip "🎯 Nome ×2" sulla scheda del Royal Guard; nella scheda del PG, Conditions →
      "Battalion of Limbs ×2"; ✕ lo toglie tutto. Un mark normale (senza "stacks") rifatto sullo stesso
      bersaglio resta uno solo, come prima.
- [x] **Level up ← Back**: al passo 2 scegliere azioni, un'abilità, un talento, relic / bond power → ← Back →
      Next → tutto è ancora scelto, contatore AP e riepilogo giusti. Cambiando lavoro al passo 1, le abilità del
      lavoro vecchio non restano spuntate.
- [x] **Tour Foes & Encounters** (GM): Settings → Tours → parte; apre scheda foe, poi legend, poi Encounter
      Designer, poi Clock Board, ogni fumetto accanto alla parte giusta. Mondo senza legend o senza Clock Board:
      quei passi compaiono al centro, il tour non si interrompe. Non compare ai giocatori.
- [x] **Aree a tempo**: combat iniziato, un PG piazza un Blast (📐 o attacco) → passa il turno agli altri → al
      suo turno successivo l'area sparisce. Un'aura (stance con Aura) e un'abilità "terrain effect" (es. Tsunami)
      restano. Due goblin uguali: l'area del primo non sparisce al turno del secondo. ⏪ indietro di un turno:
      nessuna area cancellata.

- [x] **Clip delle aree nella guida**: Quick Guide → Areas, 11 riquadri con la registrazione in loop (Small /
      Medium / Large Blast, Burst 1 target, Burst 1 e 2 self, Line 5, Arc 3 / 4 / 5, Aura 2), testo sotto ognuna,
      tre per riga. Con "riduci animazioni" del sistema operativo: clip ferme con i comandi del player.
- [x] **Aura con il GM su un'altra scena**: GM su scena A, giocatore su scena B con un'aura piazzata → il
      giocatore muove il token → l'aura lo segue.

- [x] **Ricerca PG nell'Encounter Designer** (mondo con più di 6 PG): scrivere parte di un nome o di un lavoro →
      restano i PG che corrispondono più quelli già nel party; cliccare un PG non svuota la ricerca; testo che
      non trova niente → "No PC matches the search" solo se nessuno è nel party. Con 6 PG o meno la casella non c'è.

- [x] **Template di fazione e cultura**: trascinare "Folk" e poi "Yeokin" da Foe Templates su un foe → arrivano i
      tratti Kin e Camaraderie e i due chip; ✕ su un chip toglie il suo tratto. Nessun errore in console.
- [x] **Promemoria Great Culture**: foe con fazione Folk e nessuna cultura → riquadro "Folk foe without a Great
      Culture" sotto i template; applicata una cultura sparisce; foe di altre fazioni non lo mostrano.

## Quick Guide, aree per famiglia (1 ottobre 2026, versione 1.12.1)

- [x] **Titoletti**: Quick Guide → Areas: le clip sono sotto cinque titoletti Blast / Burst / Line / Arc / Aura,
      nell'ordine; la legenda in alto e la nota in fondo ci sono ancora.
- [x] **Didascalie**: le tre Burst dicono che lo spazio centrale è origin e attack space; i tre Blast dicono "origin
      and attack space"; Line e Arc dicono che l'attack space è un personaggio qualunque nell'area.
- [x] **Riga origin/attack space**: sotto ogni titoletto (Blast, Burst, Line, Arc, Aura) c'è una riga con bordo oro
      prima delle clip; Burst dice "Origin and attack space: the central space — …"; si legge anche in tema chiaro. — *2 ottobre: tema chiaro non provato.*
- [x] **Line 4, range 3**: nuova clip sotto Line, parte a qualche casella dal PG dentro il range blu e gira in loop
      come le altre. Con "riduci animazioni": ferma con i comandi del player. — *2 ottobre: "riduci animazioni" non provato.*
- [x] **Movimento tutto in una volta**: Quick Guide → Turn → riquadro Limits: ultima riga "Your standard move is
      taken all at once…" con il rimando a p.88.

## Emerso R49 — Dulce Purgatorio fa esplodere tutti i pit del campo (17 ottobre 2026, versione 1.15.96)

Setup: solo codice (F5 basta).

- [ ] PG con Pandaemonium e Mastery DULCE PURGATORIO sbloccata, due o tre pit sulla scena, alcuni lontani dall'area:
      "Medium Blast (on pits)" mette una Medium Blast su ognuno, e l'etichetta dice "× N" col numero giusto.
- [ ] Stessa prova senza aver piazzato prima l'area di Pandaemonium: le esplosioni partono lo stesso, senza l'avviso
      "place this ability's area first".
- [ ] Nessun pit sulla scena, con la Mastery: avviso "No pit on the battlefield: nothing explodes."
- [ ] Mastery non sbloccata: esplodono solo i pit dentro l'area, e senza area compare ancora l'avviso di piazzarla
      prima.
- [ ] Holy (Talent I): continua a far esplodere solo i pit dentro l'area.

## Emerso R41 — Il bersaglio d'attacco segue l'area, non solo il nome dell'azione (17 ottobre 2026, versione 1.15.95)

Setup: solo codice (F5 basta).

- [ ] PG, abilità d'attacco con area Line o Arc e 2+ token dentro: Roll Attack, scegli il bersaglio B nella finestra.
      Show in Chat: B ha i bottoni della parte d'attacco, gli altri quelli dell'area.
- [ ] Stessa abilità: ripiazza l'area a mano col bottone dell'area (B resta tra i bersagli), poi Show in Chat: nessun
      token è indicato come bersaglio d'attacco, tutti hanno tutti i bottoni.
- [ ] Stessa prova con un foe e con una legend (azione d'attacco ad area): stesso risultato.
- [ ] Tiro d'attacco che piazza lui l'area (nessuna area prima) con 2+ token, scegli B: finestra del danno e Show in
      Chat partono da B.
- [ ] Auto-hit ad area Line con 2+ token: la finestra chiede il bersaglio, scegli B, e il danno parte da B.
- [ ] Tiro d'attacco con l'area già sulla mappa (riusata): il bersaglio scelto prima viene ancora proposto.
- [ ] Holy Talent I o PURGATORIO: dopo l'attacco, piazza "Medium Blast (on pits)": Show in Chat tiene il bersaglio
      d'attacco scelto prima.

## Emerso R39 — Split Heaven and Hell e Lycanthropy con le parole del libro (17 ottobre 2026, versione 1.15.94)

Setup: pack jobs cambiato (copia con Foundry chiuso), poi apri il mondo: la migrazione 34 parte da sola.

- [ ] Compendio Jobs → Split Heaven and Hell: "depending on their distance on the line from you:" e, in Divine Delay,
      "increase the width of the line by 1 space, to a maximum of 3 width, and its length by 3 spaces" (p.127).
- [ ] Compendio Jobs → Lycanthropy: secondo punto "abilities, summons, or actions (including this one!) may be
      increased by +1, and grant phasing while moving" (p.168).
- [ ] Template Demon Slayer e Warden: il Limit Break mostra lo stesso testo corretto.
- [ ] Mondo con un PG Knight/Demon Slayer o Warden creato prima: dopo l'aggiornamento il suo Limit Break dice le frasi
      nuove; in console "Migration 34: N limit break(s) …". Un Limit Break modificato a mano senza le frasi vecchie
      resta com'è.

## Emerso R49 — I pit esplodono dall'area: Holy Talent I e Purgatorio (17 ottobre 2026, versione 1.15.93)

Setup: solo codice (F5 basta).

- [ ] Personaggio con Holy e Talent I scelto, Hades armato: tira l'attacco (Medium Blast) e crea il pit sotto il
      bersaglio con il chip "Pit"; mettine un altro a mano dentro l'area. Bottone dell'area → "Talent I: Medium Blast
      (on pits)": compare un solo template "Medium Blast (on pits) × 2" con una Medium Blast centrata su ciascun pit,
      e l'area di Hades resta sulla mappa.
- [ ] Un token che sta in tutte e due le esplosioni è bersagliato una volta sola; il messaggio "… placed — X, Y in the
      area" lo nomina una volta.
- [ ] Un pit fuori dall'area di Hades non esplode.
- [ ] Nessun pit dentro l'area: avviso "No pit inside this ability's area: nothing explodes." e nessun template.
- [ ] Area dell'abilità non ancora sulla mappa: avviso "place this ability's area first…" e non succede nulla.
- [ ] Ripeti l'esplosione: quella vecchia viene sostituita, l'area dell'abilità e i pit restano.
- [ ] Pandaemonium con la combo Purgatorio armata: stessa prova con "Combo: Medium Blast (on pits)".
- [ ] Tiro d'attacco di Hades o di Purgatorio senza area sulla mappa: la scelta dell'area non propone "(on pits)" e
      l'attacco piazza la sua Medium Blast come prima.
- [ ] Al turno successivo dell'utente l'esplosione sparisce come un'area normale, e i pit restano.

## Emerso R38b — L'infusione si consuma con l'uso dell'abilità (17 ottobre 2026, versione 1.15.92)

Setup: solo codice (F5 basta).

- [ ] Wright in combattimento: Infuse su un'abilità d'attacco (es. Pyro, Infuse 3), poi Attack Roll, Damage Roll e
      area: card, danno e area mostrano tutti la versione infusa; l'Aether scende una volta sola.
- [ ] Nello stesso turno, di nuovo Attack Roll sulla stessa abilità: esce la versione base e il pannello non mostra
      più l'infusione armata.
- [ ] Show in Chat e poi Attack Roll sulla stessa abilità infusa: entrambi infusi (sono lo stesso uso); un secondo
      Show in Chat esce base.
- [ ] Abilità auto-hit infusa: il danno concatenato all'auto-hit è infuso.
- [ ] Infusione usata, poi fine turno: al turno dopo l'abilità esce base e il pannello non la mostra armata.
- [ ] Infusione armata ma non ancora usata: premere di nuovo il pulsante rimborsa l'Aether (come prima). Dopo il tiro
      d'attacco, premerlo dà "infusion already used, the Aether stays spent" e l'Aether non torna.
- [ ] Inner Furnace: annullare dopo l'uso non restituisce gli hp sacrificati.
- [ ] Limit Break infuso (Gigaflare, TETRAFLARE): Use Limit Break e Damage Roll infusi; un secondo Use Limit Break
      esce base e costa il resolve base.
- [ ] Annullare il dialog del danno, poi rifare Damage Roll: resta infuso (il dialog annullato non conta).
- [ ] Infusione con oggetto o terreno (Volcanic Geyser, Pyrospire): piazzare l'oggetto la consuma ancora come prima.
- [ ] Fine combattimento con infusione armata: sparisce senza rimborso (come prima).

## Emerso R46 — Il danno aggiunto dalle versioni Infuse delle abilità compare in Other (17 ottobre 2026, versione 1.15.91)

Setup: solo codice (F5 basta).

- [ ] Rime con la Mastery sbloccata: Damage Roll senza infusione → in Other non c'è MAGNARIME. Arma Infuse X con 4
      Aether, poi Damage Roll → in Other c'è "Infuse X — MAGNARIME (4 Aether)" con 1 piercing e Instances 2. Con 1
      Aether la scelta non compare.
- [ ] Dragon Dive: arma BOULDER KICK, poi Damage Roll → in Other c'è "Infuse 3 — BOULDER KICK", 2 piercing, Instances
      2. Area resta 2 piercing.
- [ ] Soul Burn: arma INCANDIUS, poi Damage Roll → in Other c'è "Infuse 4 — INCANDIUS", 1 piercing.
- [ ] Nothung: nel pannello c'è il bottone "Slay or Infuse 3": spende 3 Aether, si arma e un secondo clic restituisce
      l'Aether. Anche senza nulla armato, in Other c'è "Slay or Infuse 3 — GRAM", 1 piercing, Instances 2.
- [ ] Nothung con EXCALIBUR sbloccata: la scelta GRAM in Other parte con Divine spuntato al posto di Pierce.
- [ ] Pyre con MAGNAPYRE armato e Lance con GREAT SPIRIT LANCE armato: in Other ci sono le esplosioni da 2 piercing
      (per Lance anche "twice instead", Instances 2).
- [ ] Blitz, Rampant Nail, Bifröst e Drifting Leaf hanno il bottone Infuse sul loro blocco "Slay or Infuse" / "Infuse
      3 or Slay". Show in Chat senza nulla armato mostra quel blocco aperto come prima.
- [ ] Non regressione R40: Succubus con la combo di Incubus ha ancora [D]+fray su Hit e il chip "Combo — Succubus" in
      Other.

## Emerso R37 — Card del Limit Break: niente bottoni di status doppi con l'Infuse armato (17 ottobre 2026, versione 1.15.90)

Setup: solo codice (F5 basta).

- [ ] Gigaflare, capitolo 1 o 2, TETRAFLARE armato: "Use Limit Break" crea la card con il blocco TETRAFLARE e scala il
      resolve come prima; nessun bottone di status.
- [ ] Gigaflare, capitolo 3, METEOR armato: la card mostra "Gigaflare — METEOR", scala 6 resolve, l'Ultimate e il
      blocco METEOR ci sono; nessun bottone di status.
- [ ] Gran Levincross, capitolo 3, prima RAGNARÖK e poi GÖTTERDÄMMERUNG armati: la card esce senza errori in console e
      il resolve scala come prima.
- [ ] Limit break fatto a mano, capitolo 3. Effetto: `Effect: Deal [D]+fray damage to a foe in range 5.` e a capo
      `Infuse 3: FOO — The foe is dazed.`. Ultimate: `BAR — Infuse 6: 4 resolve. The foe is weakened.`. Con BAR
      armato, "weakened" ha una sola serie di bottoni e "dazed" una sola.
- [ ] Un limit break con status nell'effetto e nessun Infuse armato (es. Mock): i bottoni di status ci sono come
      prima.

## Emerso R33a3 — Aethershard: torna il testo del libro (17 ottobre 2026, versione 1.15.89)

Setup: pack aggiornato (deploy con Foundry chiuso) + migrazione 33 (parte da sola al caricamento del mondo, da GM).

- [ ] **Compendio**: Jobs → Aethershard (Enochian) → il Summon Effect dice "…the ability resonates with the shards,
      dealing 2 piercing damage as an area effect, once, to all characters in the area for every one of your
      Aethershards caught in the same ability. Then destroy all Aethershards activated this way and gain 1 Aether."
- [ ] **Copia già sulla scheda**: un PG Enochian che aveva Aethershard prima dell'aggiornamento → dopo il caricamento
      del mondo (console: "Migration 33: N copy/copies of Aethershard…") la scheda mostra lo stesso testo.
- [ ] **Shard presi da un'area**: piazzare un Aethershard, poi un'area di un'altra abilità che lo include → il dialog
      "Aethershard caught" chiede ancora "Deal 2 piercing damage × 1 = 2 … and gain 1 Aether"; su Resonate lo shard
      sparisce, l'Aether sale di 1 e parte la card del danno.

## Emerso R41 — Show in Chat delle azioni foe / legend divide le righe di un'area (17 ottobre 2026, versione 1.15.88)

Setup: solo codice (F5 basta).

- [ ] Foe con un'azione d'attacco Blast che infligge uno status in parte sul colpo e in parte sull'area. Piazza il
      Blast con il token A al centro e B, C nell'area, bersaglia tutti e tre e premi Show in Chat: A è "(attack
      target)" con i bottoni della parte d'attacco; B e C sono "(area)" con solo quelli dell'area.
- [ ] Stessa prova con una legend: stesso risultato.
- [ ] Azione Line / Arc: tira l'attacco e scegli B come bersaglio nel dialog, poi Show in Chat con l'area ancora sulla
      mappa: B è il bersaglio d'attacco, gli altri sono area.
- [ ] Line / Arc piazzata a mano (bottone area, senza tirare l'attacco), poi Show in Chat: nessuna divisione, tutti i
      bottoni con le etichette "attack target only".
- [ ] Con l'area cancellata dalla mappa, Show in Chat non divide nulla, come prima.
- [ ] Show in Chat di tratti, interrupt e round action del foe / legend: card come prima.
- [ ] Un solo token bersagliato: card come prima, senza etichette "(attack target)" / "(area)".

## Emerso R55 — Helix Heel: tornano le tre parole del libro (17 ottobre 2026, versione 1.15.87)

Setup: pack aggiornato (deploy con Foundry chiuso) + migrazione 32 (parte da sola al caricamento del mondo, da GM).

- [ ] **Compendio**: Jobs → Helix Heel (Geomancer) → il secondo Effect dice "…you can keep extending the line by 3
      spaces this way each time, but can only extend it once per object."
- [ ] **Copia già sulla scheda**: un PG Geomancer che aveva Helix Heel prima dell'aggiornamento → dopo il caricamento
      del mondo (console: "Migration 32: N copy/copies of Helix Heel…") la scheda mostra lo stesso testo. Il resto
      dell'abilità (Effect iniziale, bottone line 3, Charge) è invariato.

## Emerso R41 — Card Auto-hit e Show in Chat sanno chi è il bersaglio d'attacco di un'area (17 ottobre 2026, versione 1.15.86)

Setup: solo codice (F5 basta).

- [ ] **Auto-hit con Blast**: un'abilità auto-hit con Blast e uno status nell'Hit/Effect (es. Holy o Astra con il
      combo token), Blast piazzato con un foe al centro e altri due dentro → nessun dialog in più. Nella card la riga
      dell'area dice "attack: <centro> · area: …". Nell'Inflict il foe al centro viene per primo con "(attack target)"
      e i bottoni dell'attacco, gli altri hanno "(area)" e solo il blocco Area. Il dialog del danno che segue ha già
      il token al centro come bersaglio d'attacco.
- [ ] **Auto-hit con Blast, centro vuoto o Line**: con lo spazio centrale vuoto (o un'auto-hit con Line) e due o più
      token dentro → si apre il dialog "Attack target — <abilità>" con un radio per token. Conferma → la card divide
      le righe sul token scelto. Chiudere il dialog annulla l'attacco: niente card, niente danno.
- [ ] **Auto-hit con un solo token o senza area**: nessun dialog, card come prima.
- [ ] **Show in Chat con l'area sulla mappa**: dopo l'auto-hit (o il tiro d'attacco) con l'area ancora piazzata, Show
      in Chat della stessa abilità → righe divise come sulla card d'attacco. Senza area sulla mappa e con più bersagli
      → tutti i bottoni a tutti, con le etichette "attack target only" come prima. Abilità non d'attacco: invariata.

## Emerso R42 — Wish, mastery: Unstoppable all'alleato, non a te (17 ottobre 2026, versione 1.15.85)

Setup: solo codice (F5 basta).

- [ ] PG Seer con Wish, mastery sbloccata, un alleato sulla mappa. Show in Chat → riquadro Gain, gruppo "Mastery": due
      bottoni per gli alleati, "Defiance" senza durata e "Unstoppable" con "until the end of their next turn". Nessun
      Unstoppable su di te.
- [ ] Targettare l'alleato → clic su Unstoppable → l'alleato ha Unstoppable che scade alla fine del suo turno
      successivo; clic su Defiance → l'alleato ha Defiance senza scadenza.
- [ ] Con la mastery bloccata i due bottoni non compaiono.
- [ ] Non regressione R42: Shadow Play Talent II (Evasion agli alleati) e Blazing Bond Talent II (Defiance a te e
      all'alleato) come prima.

## Emerso R49 — Aria: la blast cresciuta resta centrata su di te (17 ottobre 2026, versione 1.15.84)

Setup: solo codice (F5 basta).

- [ ] Un PG Chanter con Aria, il suo token in scena, due o tre token intorno. Bottone area di Aria: il dialogo offre
      Small Blast (self), Medium Blast (self) e Large Blast (self).
- [ ] Scegli Medium Blast (self): l'area compare subito centrata sul token del Chanter (niente clic sulla mappa); la
      notifica elenca chi è dentro.
- [ ] Ripeti con Large Blast (self): stessa cosa, area più grande, sempre centrata sul Chanter; la Medium di prima
      viene sostituita.
- [ ] Small Blast (self) funziona ancora come prima.
- [ ] Controllo: un'area a distanza che cresce con la Charge (es. Pandaemonium "Charge: Increase area to Large Blast")
      si piazza ancora a mano nella sua portata.

## Emerso R40 — Il danno di Succubus resta [D]+fray su Hit, i 3 danni ai marcati vanno sotto Other (17 ottobre 2026, versione 1.15.83)

Setup: solo codice (F5 basta).

- [ ] PG con Incubus (Shade). Combo token pieno (combo armata), un foe bersagliato, Damage Roll su Incubus: "Combo
      version" spuntato, la riga sotto dice [D] + fray (non "3 flat"); Hit = [D]+fray, Miss = fray.
- [ ] Nello stesso dialogo scegliere **Other**: c'è il chip "Combo — Succubus" con "3 flat". Cliccarlo: Fixed damage =
      3, Dice 0, niente Fray, niente Area. Roll Damage: la card dice 3 danni con l'etichetta della combo.
- [ ] Senza combo token: Damage Roll su Incubus dà [D]+fray su Hit come prima.
- [ ] Controllo che il resto non cambi: Death Blossom con Flying Sleeves armata tira ancora 2[D]+fray su Hit; Holy →
      Hades resta auto-hit con fray su Hit e su Area; Pandaemonium → Purgatorio uguale a prima.

## Emerso R37 — L'Ultimate dei Limit Break compare su scheda e card (17 ottobre 2026, versione 1.15.82)

Setup: solo codice (F5 basta).

- [ ] PG al capitolo 1 con un Limit Break dal compendio (es. Helion del Bastion): nel riquadro Limit Break della tab
      Combat, sotto l'Effect, c'è un blocco "Ultimate" con il testo di Perfect Helion, sbiadito e con il lucchetto
      "Chapter 3".
- [ ] Stesso PG, "Use Limit Break": la card in chat mostra solo l'Effect, senza Ultimate.
- [ ] Porta il PG al capitolo 3: il blocco Ultimate sulla scheda non è più sbiadito e il lucchetto sparisce.
- [ ] Al capitolo 3, "Use Limit Break": la card mostra l'Effect e sotto il blocco "Ultimate" con il testo. Se
      l'Ultimate nomina degli status (es. Dread Mock del Mock), compaiono i bottoni nel gruppo "Ultimate", oltre a
      quelli dell'Effect.
- [ ] Al capitolo 3, Wright con Infuse armato (es. Meteor): la card mostra Effect, Ultimate, poi la riga dell'Infuse;
      la Resolve scalata è quella dell'Infuse.
- [ ] Un Limit Break con il campo Ultimate vuoto (item fatto a mano): sulla scheda non compare nessun blocco Ultimate
      vuoto, e la card resta come prima.
- [ ] Il Damage Roll non cambia: al capitolo 3 propone ancora il danno dell'Ultimate sotto Other, al capitolo 1 no.

## Emerso R38b — L'infusione armata non sopravvive al combattimento (17 ottobre 2026, versione 1.15.81)

Setup: solo codice (F5 basta).

- [ ] Wright in combattimento con almeno 3 Aether: premi un tasto Infuse di un'abilità (es. "Infuse 3") senza tirarla
      → il tasto appare armato e l'Aether scende.
- [ ] "End Encounter" → conferma "Sì" → Aether a 0; sulla scheda nessuna infusione resta armata e la card
      dell'abilità, se la usi, è quella base.
- [ ] Nuovo combattimento, usa la stessa abilità: nella card non compare la versione infusa.
- [ ] Ripeti con un'infusione del Limit Break (es. TETRAFLARE): dopo "End Encounter" il pannello del Limit Break non
      la mostra più armata.
- [ ] Con Inner Furnace: arma un'infusione sacrificando gli hp, poi "End Encounter": gli hp sacrificati NON tornano e
      nessun messaggio dice "Aether returned".
- [ ] Controprova: arma un'infusione e premi di nuovo il tasto prima di finire il combattimento: l'annullamento
      rimborsa ancora Aether e hp (R64).
- [ ] "End Encounter" → "No": l'infusione resta armata.

## Emerso R48 — L'aura di Fulminate finisce con il mark (17 ottobre 2026, versione 1.15.80)

Setup: solo codice (F5 basta).

- [ ] PG con Fulminate, due foe sulla scena. Bersaglia il foe A → Mark: compare "Marked — Fulminate" su A. Con A
      ancora bersagliato, bottone area di Fulminate → Aura 2: l'aura va attorno ad A e lo segue quando si muove.
- [ ] Togli il mark dalla ✕ sulla scheda del PG: l'aura attorno ad A sparisce dalla mappa insieme al mark.
- [ ] Marca di nuovo A e rimetti l'aura. Ora bersaglia B → Mark con Fulminate: il mark passa a B e l'aura attorno ad A
      sparisce (quella di B si piazza a mano con il bottone area).
- [ ] Mark + aura su A, poi porta il PG a 0 hp: il mark finisce e l'aura sparisce.
- [ ] Mark + aura su A, poi fine del combattimento: anche qui l'aura sparisce con il mark.
- [ ] Con i talenti attivi, scegli "Aura 3" o "Aura 1": stesso comportamento.
- [ ] Da giocatore (non GM), con un GM connesso: il mark si toglie via GM e l'aura sparisce lo stesso.
- [ ] Non deve cambiare niente: un'aura propria (es. Phantom Bolts Aura 2 attorno a sé) o l'aura di Endless Battlement
      data a un alleato restano dove sono quando si toglie un mark qualsiasi.

## Emerso R62 — Avvio del combat senza promemoria "End of round 0" (17 ottobre 2026, versione 1.15.79)

Setup: solo codice (F5 basta).

- [ ] Un PG con la relic Paleblood (rango I) entra in un combat, poi Begin Combat: in chat NON compare nessuna card
      "End of round 0" né "Tick the Paleblood die up by 1".
- [ ] Sempre all'avvio, il promemoria di round R62 del round 1 compare come prima (se nel combat qualcosa si attiva al
      round 1).
- [ ] Si spendono tutte le attivazioni e si passa al round 2: compare "End of round 1" con il promemoria Paleblood,
      una volta sola, insieme al promemoria R62 del round 2.
- [ ] Round 2 → 3: compare "End of round 2". Con Previous Round non compare nessun promemoria di fine round.
- [ ] Riserve dell'Encounter Designer previste a fine round 2: al passaggio al round 3 arriva al GM "Reserves due —
      end of round 2"; all'avvio del combat non arriva nessuna card delle riserve.
- [ ] Nel round 1, quando si attiva il primo PG, "Start of turn" e "First turn of combat" compaiono come prima.

## Emerso R33b — Il clic destro che chiude la scelta di uno spazio non apre più l'HUD del token (17 ottobre 2026, versione 1.15.78)

Setup: solo codice (F5 basta).

- [ ] Su una mappa con due portali, porta un token accanto a un portale e avvia "Teleport here". Con gli spazi
      evidenziati, clic destro **sopra un token**: la scelta si chiude senza spostare nessuno e l'HUD del token
      **non** si apre.
- [ ] Stessa prova con "Erupt" e con "Move" dello shard: come sopra.
- [ ] Avvia di nuovo la scelta e chiudila con Esc: si chiude come prima.
- [ ] Clic sinistro su uno spazio evidenziato: l'oggetto o il token va lì come prima; su uno spazio non evidenziato
      compare ancora "Pick one of the highlighted spaces".
- [ ] Fuori da qualsiasi scelta, clic destro su un token: l'HUD si apre normalmente.

## Emerso su R39 — testi dei Limit Break come nel libro (17 ottobre 2026, versione 1.15.77)

Setup: deploy con Foundry chiuso (cambia il compendio Jobs). Tre PG che hanno già da prima di questa versione i Limit
Break Split Heaven and Hell (Demon Slayer), Paradiso (Freelancer) e Lycanthropy (Warden).

- [ ] **Migrazione**: all'apertura del mondo (GM) compare l'avviso di migrazione; in console "Migration 31: 3 limit
      break(s) now match the book…" (più le copie nella sidebar, se ce ne sono).
- [ ] **Split Heaven and Hell** (p.127): pannello del Limit Break → sotto "Sever Divine Thread" le tre distanze sono
      tre righe rientrate con "◦" ("1 space: 100% of max hp", "2-4 spaces: 50% of max hp", "5+ spaces: 25% of max hp"),
      poi "Divine Cancel" e "Divine Delay" tornano a filo come opzioni "•"; "Legend characters…" è un paragrafo sotto.
      Uguale nella card "Use Limit Break" e nella sheet dell'item.
- [ ] **Paradiso** (p.155): il blocco **Aura:** dice "You gain an aura of supernatural accuracy, charging your weapons
      and the weapons of your allies with aether."; "You gain Aura 2 until the end of your next turn…" è il paragrafo
      sotto. Il bottone area propone ancora Aura 2.
- [ ] **Lycanthropy** (p.168): il testo di colore finisce con "…pours into you, granting you massively increased speed
      and power."; i tre "•" del dash restano righe come prima.
- [ ] **Copia nuova**: trascina il job Demon Slayer (o il Limit Break) dal compendio Jobs su un PG nuovo → stesso testo.
- [ ] **Altri elenchi invariati**: Eclipse, Raging Wolf, March of the Saints mostrano le righe "•" come prima.

## R64 — Infuse più economico: Conqueror's Edge e Inner Furnace (17 ottobre 2026, versione 1.15.76)

Setup: solo codice (F5 basta). Un PG Wright Spellblade (tratto Conqueror's Edge) e un PG Wright Enochian (tratto Inner
Furnace) con Aether 6, i loro token sulla scena, un foe ostile, un combat avviato.

- [ ] **Senza tratti**: un Wright qualsiasi preme "Infuse 3" → paga 3 come prima, nessun dialog, nessuna riga in più.
- [ ] **Conqueror's Edge, foe vicino**: foe a 2 spazi dallo Spellblade → "Infuse 3" toglie 2 Aether; la card dice
      "2 Aether spent" e sotto "Conqueror's Edge: −1, a foe is in range 2".
- [ ] **Conqueror's Edge, foe lontano**: foe a 3+ spazi (o nessun token del PG sulla scena) → paga 3.
- [ ] **Inner Furnace**: l'Enochian preme "Infuse 3" → dialog con "Sacrifice N hp" (N = VIT, 25% degli hp massimi) e
      "Pay 3 Aether". Sacrifice → Aether −1, hp −N, la card dice "Inner Furnace: −2, sacrificed N hp".
- [ ] **Una volta per round**: nello stesso round un altro Infuse non mostra il dialog e paga pieno; al round dopo torna.
- [ ] **Pay Aether**: scegliendo "Pay 3 Aether" paga 3, gli hp restano, e il dialog si può riavere nello stesso round.
- [ ] **Hp bassi**: con 3 hp e VIT 10 → dopo il sacrificio hp 1, non 0, e nessun wound.
- [ ] **Poco Aether**: Aether 1, "Infuse 3" → il dialog compare e avvisa che senza sacrificio non basta; Sacrifice →
      paga 1; "Pay 3 Aether" → avviso "needs 3 Aether", niente pagato.
- [ ] **Chiudere il dialog** con la ✕ → nessun Aether né hp tolti, nessuna card.
- [ ] **Annullare**: dopo un Infuse con Inner Furnace ripremi il bottone armato → tornano Aether e hp, e al prossimo
      Infuse nello stesso round il dialog ricompare.
- [ ] **Entrambi i tratti** (aggiungi a mano Conqueror's Edge all'Enochian), foe in range 2: "Infuse 3" con Sacrifice
      → paga 0, con le due righe in card.
- [ ] **Infuse X** (es. Ätherwand) con i tratti → chiede quanto, paga esattamente quello, nessuno sconto né dialog.
- [ ] **Limit Break**: "Infuse 6" di Gigaflare con Conqueror's Edge e foe vicino → paga 5.

## R63 — Soglie di crit / exceed variabili: Soulfire, Arenheir, a mano (17 ottobre 2026, versione 1.15.75)

Setup: solo codice (F5 basta). Un PG Enochian con il tratto Soulfire, un PG con la relic Arenheir (rank III, poi
Aspect), un foe bersaglio, un combat avviato.

- [ ] **Default**: un PG qualsiasi attacca → nel dialog l'intestazione dice "crit 20+ · exceed 15+", i due nuovi
      stepper "Crit on" 20 e "Exceed on" 15, nessuna riga di fonti sotto; la card in chat è come prima ("Exceed (15+)").
- [ ] **Soulfire bloodied**: PG Enochian sopra il 50% HP → 20 / 15. Portalo a metà HP o meno → il dialog propone 18 /
      13 e sotto gli stepper "Soulfire (bloodied): crit 18+, exceed 13+". Un totale di 13 attiva l'Exceed (riquadro
      "Exceed (13+)"), un 18 è CRITICAL HIT; accanto al totale "crit 18+ · exceed 13+".
- [ ] **Soulfire a 1 HP**: HP a 1 → 15 / 10 con la riga "Soulfire (1 hp)".
- [ ] **Arenheir III**: rank III sbloccato, round 1 → 19 / 14 con "Arenheir III (round 1): −1"; round 3 → 18 / 13;
      round 5 → 17 / 12. Fuori combat → 19 / 14.
- [ ] **Soulfire + Arenheir**: Enochian bloodied con Arenheir III al round 3 → 16 / 11 (18 / 13 di Soulfire, −2).
- [ ] **Arenheir Aspect**: Aspect sbloccato, round 1 → 19 / 14. Fai un critico (alza a mano "Crit on" o tira finché
      esce): all'attacco dopo il dialog propone crit 18 (exceed resta 14) con la riga "Arenheir Aspect (1 crit this
      combat)". Più critici abbassano ancora, mai sotto 15. Un nuovo combat riparte da zero.
- [ ] **A mano**: cambia "Crit on" / "Exceed on" nel dialog → l'intestazione si aggiorna, la card usa i valori scelti.
- [ ] **Foe / Legend / Summon**: il loro dialog d'attacco ha gli stessi stepper (20 / 15) e si possono cambiare.

## R52 — Chronotemper senza l'etichetta "Power Die" (17 ottobre 2026, versione 1.15.74)

Setup: deploy con Foundry chiuso (cambia il compendio Jobs), poi un PG Fool di capitolo 3 che ha già Chronotemper sulla
scheda da prima di questa versione.

- [ ] **Migrazione**: all'apertura del mondo (GM) compare l'avviso di migrazione; in console "Migration 30: "power-die"
      tag removed from … copy/copies of Chronotemper".
- [ ] **Scheda, copia vecchia**: tab Combat, pannello di Chronotemper: tra i tag c'è solo "Mark", niente "Power Die";
      nessun contatore di dado comparso o sparito.
- [ ] **Copia nuova dal compendio**: trascina Chronotemper dal compendio Jobs su un PG → solo il tag "Mark".
- [ ] **Chat**: 💬 Show in Chat → la card mostra solo "Mark"; il mark e l'interrupt Cheat Time funzionano come prima.
- [ ] **Altre abilità con power die invariate**: un'abilità che usa davvero un power die (es. una con contatore sulla
      scheda) ha ancora il tag "Power Die" e il suo contatore.

## R47b — Sturmreiten Talent II, seconda Line 3 (17 ottobre 2026, versione 1.15.73)

Setup: scena a griglia quadrata, un PG Spellblade con Sturmreiten (capitolo 2) e il Talent II scelto, qualche foe sparso
attorno al PG.

- [ ] **Domanda dopo la prima Line**: bottone area di Sturmreiten → piazza la Line 3 → si apre "Sturmreiten — another
      Line 3?" con il testo del Talent II e i bottoni From the first space / From the last space / No extension.
- [ ] **Dal primo spazio**: From the first space → caselle evidenziate accanto al primo spazio della Line (non quella
      dentro la Line); si clicca una di esse e la seconda Line 3 parte da lì, allontanandosi dal primo spazio.
      Anche la direzione opposta alla prima Line (prolungamento all'indietro) è permessa.
- [ ] **Dall'ultimo spazio**: From the last space → solo le due caselle ai lati dell'ultimo spazio (la stessa direzione
      della prima Line e quella che torna indietro sono escluse); cliccandone un'altra compare l'avviso.
- [ ] **Rotella**: durante la seconda Line, girarla con la rotella → la preview diventa chiara e il clic dà l'avviso "The
      extra Line 3 goes away from …"; rimessa nella direzione giusta si piazza.
- [ ] **Un solo template**: alla fine sulla mappa c'è un solo template con le due Line unite (bordo unico), la notifica
      dice "Line 3 + Line 3 placed — …" e sono targettati i personaggi di entrambe le Line.
- [ ] **No / Esc**: "No extension" o Esc durante la seconda Line → resta solo la prima Line, targettata come prima.
- [ ] **Comeback**: PG non bloodied → nella domanda c'è la riga "Comeback: you are not bloodied…" e il bottone di default
      è No extension; da bloodied la riga sparisce e il default è From the first space.
- [ ] **Senza talento**: tolto il Talent II, Sturmreiten piazza la Line 3 senza nessuna domanda; con la mastery
      (Arc 5) nessuna domanda.
- [ ] **Altre Line invariate**: un'altra abilità con una Line (es. Helix Heel, Ätherwand) si piazza come prima.

## R34 — Open the Gates: lo Special davanti alle due versioni (16 ottobre 2026, versione 1.15.72)

Setup: deploy con Foundry chiuso (cambia il compendio Jobs), poi un PG Sealer di capitolo 3 che ha già Open the Gates
sulla scheda da prima di questa versione, e un PG Sealer nuovo.

- [ ] **Migrazione**: all'apertura del mondo (GM) compare l'avviso di migrazione; in console "Migration 29: … Open the
      Gates given the "Special:" in front of both versions".
- [ ] **Scheda, copia vecchia**: tab Combat, pannello di Open the Gates: sotto il corsivo, prima riga **Special** ("This
      attack gains +1 boon, cannot miss…"), poi Effect (Teleport 1), Hit, Miss, Exceed. Dopo l'Exceed non c'è più niente
      (a parte talenti / mastery / combo).
- [ ] **Copia nuova dal compendio**: trascina Open the Gates dal compendio Jobs su un PG → stessi blocchi, stesso ordine.
- [ ] **Chat, versione base**: 💬 Show in Chat → la card ha lo stesso ordine (Special in cima).
- [ ] **Chat, versione combo**: con un combo token, arma la combo e Show in Chat → la card di Center the Temple ha in cima
      lo Special, poi Effect (Teleport spaces equal to the round number…), Hit, Miss, Exceed della combo; niente
      "Teleport 1" né "pacified" della base.
- [ ] **Attacco**: il tiro d'attacco e il danno di entrambe le versioni funzionano come prima.
- [ ] **Altre combo invariate**: God Hand / Devil Hand e Reap con la combo armata → card come prima (nessun blocco della
      base in più).
- [ ] **Raging Wolf invariato**: Special, Comeback, Heroic, Special come prima.

## R33d — Segni che seguono un personaggio (16 ottobre 2026, versione 1.15.71)

Setup: scena a griglia quadrata, GM + giocatore connessi, due foe (ostili) e un PG alleato, un combat con tutti dentro.
PG del giocatore: Seer con Polaris (Talent I scelto), Fool con Party Favor (mastery AMICO sbloccata), Enochian con
Implode (mastery WAKING VOID sbloccata). Solo JS: F5 dopo il deploy.

- [ ] **Chip che chiede**: Polaris con Talent I → clic su "Polaris · 1" → finestra "On a space / On a character" con la
      frase del talento. Con un foe targettato il secondo bottone dice "On <nome>". Senza Talent I nessuna domanda (come
      prima). Stessa cosa per "Mine · 1" con AMICO e "Implode · 1" con WAKING VOID.
- [ ] **On a space**: sceglie lo spazio come in R33b (nessun cambiamento).
- [ ] **On <foe>**: dal giocatore → il foe riceve "Marked — Polaris (<PG>)", sulle sue caselle appare lo spazio viola
      "Polaris (mark)" e una card con la regola, "Polaris spaces active: N" ed **End mark**. Senza target o con due target:
      avviso "target exactly one character", niente creato.
- [ ] **Segue il token**: spostare il foe marcato → lo spazio si sposta con lui; nessuna domanda di dangerous terrain né
      card "enters". Token 2×2: lo spazio copre tutte e quattro le caselle.
- [ ] **Conteggio Polaris**: un Polaris su uno spazio e uno sul foe → la card dice 2 spaces active. Rimettere Polaris sul
      personaggio su un altro foe → il primo mark e il suo spazio spariscono (uno solo sul personaggio).
- [ ] **Mark e spazio insieme**: ✕ sul chip del mark nella scheda del PG → lo spazio sparisce. Rimettere il mark, poi
      selezionare lo spazio sul layer dei template e Canc (GM) → il mark sul foe finisce ("The mark … ends"). End mark sulla
      card (dal giocatore) → spariscono tutti e due. Tasto destro sul chip "Polaris · 1" (GM) → tolti anche quelli sul foe.
- [ ] **Bottone Mark**: Polaris Talent I o Party Favor con AMICO → il bottone Mark della scheda col foe targettato mette
      anche lo spazio sul foe.
- [ ] **Creatore sconfitto**: PG con Polaris sul foe → portare il PG a 0 hp → il mark finisce (card di marks.mjs) e lo spazio
      sparisce. Con WAKING VOID (tracker) lo spazio di Implode resta.
- [ ] **Un mark per personaggio**: Polaris sul foe, poi dallo stesso PG un'altra abilità con Mark sullo stesso foe → il
      mark Polaris viene sostituito e il suo spazio sparisce.
- [ ] **AMICO**: Party Favor sul foe A → fine del turno del Fool: nessuna card. Fine del turno di qualcun altro → card
      sussurrata (solo GM e giocatore del Fool) con **Detonate** ed End mark. Detonate → finestra del gamble; chiusa senza
      tirare → niente. Tirato → card del gamble, Medium Blast centrata sul foe A (targetta chi c'è dentro), mark e spazio
      spariscono; il bottone si spegne.
- [ ] **WAKING VOID**: Implode sul foe B → card con la frase "doesn't stun the center character" → portare il foe B a 0 hp →
      card "<foe B> is defeated. If that character is defeated, Implode immediately activates." con il testo di Implode e
      "Done: end it" (toglie lo spazio e il tracker).
- [ ] **Fine combat / token cancellato**: fine combat → i mark spariscono e con loro gli spazi. Cancellare il token di un foe
      marcato → il suo spazio sparisce. Nessun errore in console.

## R33c — Aree terrain effect che durano, si muovono o crescono (16 ottobre 2026, versione 1.15.70)

Setup: scena a griglia quadrata, GM + giocatore connessi, un foe (ostile) e un PG alleato sulla scena, un combat con
tutti dentro. PG: Stormbender con Tsunami, Waterspout e Gust (mastery NORTHSOUL in una prova), Spellblade con Bifröst
(Talent II in una prova) e Blitz (mastery GUNGNIR), Warden con Mist Strider e Morrigan (mastery DARK WING), Shade con
Nocturne, Freelancer con Showdown (mastery QUENCH), Geomancer con Bio (mastery MAGNABIO), Harvester con Blood Grove, un
Ätherwand con Talent II. Solo JS: F5 dopo il deploy.

- [ ] **Aree dei talenti / mastery**: Morrigan con DARK WING sbloccata → bottone area "Small Blast"; piazzata in range 3 resta
      a inizio del turno dopo. Blitz con GUNGNIR → "Small Blast" (range 3), resta. Showdown con QUENCH → "Small Blast" va
      da sola centrata sul PG (nessun clic) e resta. Senza mastery sbloccata quei bottoni non ci sono.
- [ ] **Non più tutto "lasting"**: Bio con MAGNABIO sbloccata ma non armata → la Small Blast dell'attacco sparisce a inizio
      del turno dopo (prima restava). Land Waster con la mastery Ajax: la Burst 1 sparisce anch'essa. Con MAGNABIO armata,
      "Medium Blast" resta, "Large Blast" no.
- [ ] **Dangerous dell'area**: trascinare il foe dentro l'area di DARK WING → domanda "Dangerous terrain — Take 2 damage";
      trascinarci il PG alleato → nessuna domanda ("for foes"). Tsunami: dentro o fuori chiunque → domanda (difficult e
      dangerous); di nuovo nello stesso turno → nessuna domanda. GUNGNIR, MAGNABIO (Medium Blast): domanda per tutti. Nocturne
      (shadow clouds): nessuna domanda (difficult, non dangerous).
- [ ] **Promemoria all'entrata**: Gust (Line 3) → trascinare un personaggio dentro → card "enters the Terrain (Gust)" con la
      frase "Characters that enter any end space …" e Remove. Bifröst → un alleato che entra ha la card ("Yourself and
      allies …"), un foe no.
- [ ] **Più aree insieme**: Gust con NORTHSOUL: secondo piazzamento → domanda "Add another (2 of 3) / Replace them"; Add →
      due Line sulla mappa; al quarto "Add (removes the oldest)" toglie la prima. Senza NORTHSOUL: sostituisce senza
      domanda come prima. Mist Strider ("Create a second cloud"): "Add another (2 of 2)". Bifröst (HEIMDALL): lo stesso.
      Chiudere la domanda con la X → niente piazzato, niente tolto.
- [ ] **Tsunami, il bordo**: piazzarla (Alt per metterla lontano dal PG, contro un bordo) → domanda "which edge?" (Top /
      Bottom / Left / Right); scelto Bottom → card "placed: it moves now, and at the start of your turns" con "Move 4 toward
      the bottom edge" e le quattro frecce di STORMLASH. Move 4 → l'area scende di 4 caselle, il bottone diventa grigio,
      card "moves 4 spaces toward the bottom edge". Chiudere la domanda del bordo → la card ha i quattro bottoni del bordo
      da scegliere.
- [ ] **Tsunami, chi c'è dentro**: con un token dentro, Move → card "In it when it moved: …" con la frase del libro e "Drag
      them with it"; il clic apre la lista con le caselle spuntate; "Drag them" li sposta delle stesse caselle; un giocatore
      che non possiede il foe riceve "Ask the GM". Senza il clic nessun token si muove. Dopo il trascinamento nessuna domanda
      di dangerous (restano dentro).
- [ ] **Tsunami, bordo della mappa**: muovere finché uno spazio uscirebbe → domanda "edge of the map … Remove it?"; Remove la
      toglie, Keep la lascia dov'è. Con Talent I: la card del movimento ricorda "creates a pit in its center space …".
- [ ] **Tsunami a inizio turno**: Next turn fino al turno dello Stormbender → card "Start of …'s turn — areas" con Move 4 (dal
      GM attivo, una sola card con due GM). Con LEGENDARY STORM sbloccata e round 4+: bottoni 1, 2, 3, 4 al posto di Move 4.
      STORMLASH (frecce nella card del piazzamento): muove di 2 tutte le Tsunami dello stesso PG.
- [ ] **Shift + frecce**: mouse sopra un'area che resta (Tsunami, Gust, un pit, una mote) → Shift + freccia la sposta di 1
      casella, avviso "moved 1 down"; la domanda di dangerous scatta poi per chi entra / esce dalla nuova posizione. Con il
      mouse fuori dalla mappa, su una scheda, o in un campo di testo, Shift + freccia fa quello di sempre. Un giocatore non può
      muovere l'area di un altro. Durante il piazzamento di un'area non fa niente.
- [ ] **Waterspout**: chip "Waterspout · 1" sull'abilità → un clic su uno spazio → casella viola "Waterspout", card con
      "difficult terrain: +1 movement to exit". A inizio turno dello Stormbender: card con "Once during your turn, you may move
      the waterspout 1 space" e quattro frecce; una freccia lo sposta di 1 e le altre diventano grigie. Con Talent II una
      seconda riga di frecce da 3. Con HURRICANE sbloccata e round 4+: "Grow to Small Blast" → la casella diventa una croce di
      5 con etichetta "Waterspout · Dangerous & difficult"; entrarci chiede i 2 danni.
- [ ] **Ätherwand Talent II**: a inizio turno del PG card con "At the start of your turn, you can move the area 1 space" e
      le frecce.
- [ ] **Bifröst Talent II**: area piazzata, fine del round (Next round) → card "End of round N — Bifröst" con la frase, "When
      they grow, deal 1 piercing damage …" e "Add 2 spaces": il clic fa cliccare 2 caselle adiacenti all'area, che si
      aggiungono; card "the area grows by 2 spaces". All'avvio del combat (round 1) nessuna card. Senza Talent II nessuna card.
- [ ] **Blood Grove ancora**: "Area +2" (Talent II) trova ancora l'area piazzata (ora ha il flag terrain "Dangerous (foes)")
      e la estende; un foe che ci entra riceve la domanda dei 2 danni, un alleato no.

## R33b — Spazi di terreno: pit, dangerous, difficult, segni con nome (16 ottobre 2026, versione 1.15.69)

Setup: scena a griglia quadrata, GM + giocatore connessi, un foe (ostile) e un PG alleato sulla scena. PG: Geomancer con
Terraforming, Stormbender con Rime (mastery MAGNARIME in una prova) e Deepwrath, Chanter con Symphony, Fool con Party Favor,
Enochian con Elden Rune e Pyroclast (Talent I in una prova, mastery MAGMOTIC in un'altra), Demon Slayer con Gates of Hell
(mastery sbloccata), Seer con Eclipse e Polaris, Harvester con Blood Grove (Talent II), Wright con Geyser. Solo JS, template
e CSS: F5 dopo il deploy.

- [ ] **Chip**: Terraforming mostra "Pit · 2" (marrone) e "Difficult · 3" (verde oliva); Pyroclast con Talent I "Dangerous · 2"
      (rosso), con MAGMOTIC "Dangerous pit · 1"; Eclipse "Brand · 1" e "Dangerous · any"; Symphony "Mote · 4" e "Pit · 1";
      Polaris "Polaris · 1", Implode "Implode · 1". Senza talento scelto / mastery bloccata i loro chip non ci sono. Mouse
      sopra un chip → didascalia con la fonte, cosa fa e la frase del libro.
- [ ] **Piazzare**: clic su "Pit · 2" → avviso "Click up to 2 spaces"; un clic illumina lo spazio, un secondo clic sullo stesso
      lo toglie; al secondo spazio finisce da solo → due caselle marroni con "Pit · Terraforming", card "Terraforming: 2 ×
      Pit" con "Remove all". "Dangerous · any": si clicca quanto serve, Invio o clic destro finisce; Esc → niente creato.
      Clic destro durante la scelta su un token: non si apre l'HUD.
- [ ] **Da giocatore**: stesso piazzamento con l'utente giocatore (proprietario del PG) → gli spazi compaiono anche per il GM.
- [ ] **Togliere**: tasto destro sul chip → "Remove the 2 pit spaces of Terraforming?" → spariscono; "Remove all" sulla card →
      spariscono, il bottone si spegne; layer dei template di Foundry → selezione di uno spazio e Canc → sparisce solo quello.
      Un template normale (area d'attacco) non viene toccato.
- [ ] **Restano**: gli spazi non spariscono all'inizio del turno successivo del PG (le aree d'attacco sì).
- [ ] **Dangerous terrain**: trascina il foe dentro uno spazio dangerous → domanda "Dangerous terrain … Take 2 piercing
      damage, ignoring armor and vigor?"; "Take 2 damage" → card "Damage Applied", 2 hp in meno anche col vigor pieno e
      l'armatura. In combattimento, nello stesso turno, uscire o entrare in un altro spazio dangerous non chiede più; al turno
      dopo chiede di nuovo. "Not this time" → niente danno. Da giocatore su un foe che non possiede: il danno passa dal GM.
- [ ] **Only for foes**: Gates of Hell mastery → "Afterimage · 1" (solo spazi liberi: su un token → avviso). Un alleato che ci
      entra: nessuna domanda; un foe: la domanda del dangerous.
- [ ] **Mote**: Symphony → "Mote · 4": uno spazio accanto a una mote già messa → avviso "can't be adjacent"; su un token →
      avviso "isn't free". Un personaggio trascinato su una mote → card "<nome> enters the Mote (Symphony)" con la frase
      "Any character that enters an affected space … detonates the mote …" e Remove. Un personaggio che inizia il turno su una
      mote → card "Start of <nome>'s turn" (una sola, dal GM).
- [ ] **Mine**: Party Favor → "Mine · 1" su uno spazio libero; un personaggio ci entra → card con "When any character enters
      the space, the mine explodes …" e la tabella del gamble; Remove la toglie.
- [ ] **Elden Rune**: clic sul chip → la runa compare da sola sotto il token del PG, senza clic sulla mappa. Un alleato che ci
      entra: niente; un foe che entra o esce → card "A foe can scrub out an Elden Rune …".
- [ ] **Replace**: un'abilità con "lasts until this ability is used again" che crea spazi (se non ce n'è nessuna nel gruppo,
      saltare) → al secondo uso "Replace / Keep both".
- [ ] **Infuse**: Rime senza Infuse → nessun chip pit; Infuse 3 DAGON armato → "Pit · 1" (fonte "Dagon"); piazzato → l'Infuse
      non è più armato. Con MAGNARIME sbloccata → "Pit · any".
- [ ] **Blood Grove**: Talent II → chip "Area +2". Senza l'area sulla mappa → avviso "Place the area of Blood Grove first". Con
      la medium blast piazzata: clic su uno spazio non adiacente → avviso; due spazi adiacenti (il secondo può essere accanto al
      primo nuovo) → l'area cresce, card "the area grows by 2 spaces (11 in all)".
- [ ] **Volcanic Geyser**: Erupt con "Place them now" e un foe nella medium blast → dopo averlo piazzato, domanda "Volcanic
      Geyser — dangerous terrain: mark a dangerous space under <foe>?" → "Mark" → spazio rosso dove è atterrato, card con
      Remove. Un alleato piazzato non lo riceve. Erupt senza "Place them now" → nessuna domanda.
- [ ] **Tratto**: un tratto con uno spazio nel testo (se il PG ne ha uno) mostra il chip nella riga del tratto; tratto di un
      capitolo non sbloccato → niente chip.

## R33a4 — Oggetti e movimento: Underway, Comet, Megamushroom, Geyser, pile con personaggi sopra, Aethershard (16 ottobre 2026, versione 1.15.68)

Setup: come R33a3 (scena a griglia quadrata, GM + giocatore connessi). PG: Harvester con Underway (mastery Bale Portal
sbloccata in una prova), Demon Slayer con Comet, Harvester con Fairy Ring (mastery), Wright con Geyser (mastery GREAT
GEYSER in una prova), Enochian con Aethershard (Talent I in una prova, mastery AETHERSHIFT in un'altra) e Pyroclast.
Un foe sulla scena. Solo JS e template: F5 dopo il deploy.

- [ ] **Underway, dalla scheda**: piazza due portali lontani. Metti il PG accanto al primo, selezionalo, apri la scheda del
      secondo → "Teleport here" → spazi verdi liberi attorno al secondo portale; clic su uno → il token ci va senza
      animazione, card "<PG> teleports through the Underway (free action, p.168)". Clic su uno spazio non verde → avviso,
      la scelta resta aperta; Esc o clic destro → non si muove niente. PG non adiacente al primo portale → avviso (per il
      GM: domanda "Teleport anyway?").
- [ ] **Underway, al movimento**: trascina un PG (non un foe) accanto a un portale → domanda "Underway — teleport?";
      "Teleport" → spazi verdi attorno all'altro portale (o agli altri), clic → il PG ci va; "Not now" → resta. Spostarsi
      tra due spazi già accanto allo stesso portale non chiede di nuovo. Il foe trascinato accanto non chiede niente.
- [ ] **Bale Portal**: mastery sbloccata, il foe finisce il turno accanto a un portale → card "End of <foe>'s turn … Bale
      Portal … save to avoid it, bloodied foes fail; once a round". Il GM seleziona il foe, apre l'altro portale →
      "Teleport here" → il suggerimento ricorda il save. Senza mastery nessuna riga, e un giocatore non può teletrasportare
      un foe (avviso).
- [ ] **Comet, rampart**: lancia la Thrown Weapon → attorno al token compare un'aura 1 "Rampart — Thrown Weapon (Comet)" che
      lo segue; la scheda dice "Spaces adjacent to it have rampart … (p.104)". Pick up → l'aura sparisce con l'oggetto.
- [ ] **Comet, raccolta al movimento**: trascina il Demon Slayer in uno spazio accanto all'arma → "Thrown Weapon — pick up?"
      "<PG> entered a space adjacent …"; "Pick up" → l'oggetto sparisce (da giocatore passando dal GM). Allontanandosi da uno
      spazio adjacente → "left a space adjacent". Un altro PG o un foe accanto → nessuna domanda. A inizio turno del Demon
      Slayer accanto all'arma → card "Start of <PG>'s turn … can pick it up".
- [ ] **Megamushroom**: trascina un PG (o un alleato) sullo spazio del Megamushroom → domanda "pick up its blessing token?";
      "Pick up blessing" → +1 Blessed a quel PG, card, la scheda dice "picked up"; entrando di nuovo non chiede più. Un foe
      sullo spazio → nessuna domanda.
- [ ] **Geyser, eruzione guidata**: un PG sul geyser → "Erupt" → finestra con "Removed and placed: <PG>", due caselle
      ("Place them now …", "Then summon a Salt Sprite in its space"). "Erupt" → card, poi spazi verdi a 1-2 dal PG; clic →
      il PG ci va (a elevazione 0 se stava sul geyser); il geyser sparisce; un Salt Sprite compare nello spazio del geyser
      (attore del mondo riusato se c'è già). Caselle tolte → come prima (target, Salt Sprite a mano). "Cancel" → niente.
      Con GREAT GEYSER: un alleato ha spazi fino a 3, un foe fino a 2. Da giocatore con un foe sul geyser: il foe viene
      spostato dal GM (socket). Volcanic Geyser: uno dopo l'altro tutti quelli nella medium blast; Esc ne salta uno.
- [ ] **Geyser, inizio / fine turno**: un personaggio inizia o finisce il turno sul geyser → card "… starts/ends their turn on
      the Geyser: <PG> can make it erupt".
- [ ] **In piedi su una pila**: un PG su un Boulder (elevazione 1 messa a mano). Scheda del boulder: + → il PG va a 2; − → torna
      a 1; Remove → il PG scende a 0. Un PG in volo a elevazione 3 sullo stesso spazio non cambia. Geyser Talent I che cresce
      a inizio turno: il PG sopra sale con lui. Da giocatore con un foe sopra: il foe viene alzato dal GM.
- [ ] **Pyroclast, "pushing them up"**: trascina "Magma Spire · H1" sullo spazio di un personaggio → il token dello spire e il
      personaggio a elevazione 1, avviso "… lifting <nome>". Pyrospire (Infuse) → elevazione 3.
- [ ] **Aethershard Talent I**: Talent I scelto, uno shard sulla mappa: scheda dello shard → "Move" → spazi verdi fino a 2;
      clic → lo shard si sposta (la pila si riassesta come prima). Spendi Aether dalla scheda (es. un Infuse) → avviso
      "spent Aether — Talent I: you can first move one of your aethershards up to range 2". Senza Talent I né bottone né avviso.
- [ ] **AETHERSHIFT**: mastery sbloccata, l'Enochian finisce il turno accanto a uno shard → status Phasing, card "… gains
      phasing until the end of your next turn. The spaces of objects cost …"; Phasing finisce alla fine del suo turno dopo.
      Iniziando il turno accanto → Phasing che dura fino alla fine del turno seguente (non di quello in corso).
- [ ] **Regressione**: trascinare token lontano dagli oggetti non chiede niente; pile, aure, Erupt senza caselle, Resonate degli
      Aethershard e Pick up come in R33a3; due GM connessi → le card di inizio / fine turno escono una volta sola.

## R33a3 — Aethershard nelle aree, eruzione del Geyser, Megamushroom, pilastro, scheda dalla barra laterale (16 ottobre 2026, versione 1.15.67)

Setup: come R33a2 (scena a griglia quadrata, GM + giocatore). PG: Enochian con Aethershard e un'abilità con un'area
(Aether almeno 0-4, non 6), Wright con Geyser (Talent I scelto in una prova), Harvester con Fairy Ring (mastery sbloccata),
un PG con Upheaval (mastery sbloccata), Geomancer con Helix Heel. Solo JS, template e CSS: F5 dopo il deploy.

- [ ] **Aethershard nell'area**: piazza due Aethershard, poi un'area dell'Enochian che ne copre uno e un foe → finestra
      "Aethershard caught": "1 of your aethershards … 2 piercing damage × 1 = 2". "Resonate" → lo shard sparisce, l'Aether
      sale di 1 (non oltre 6), card del danno "… — 1 Aethershard damage (area)" con 2 piercing e Apply per il foe (niente
      riga per gli oggetti), card "1 Aethershard resonate". Con due shard nell'area → 2 × 2 = 4, tutti e due tolti, Aether +1.
- [ ] **Aethershard, casi limite**: "Not this time" → shard restano, nessun danno. Area di un altro PG sopra lo shard →
      nessuna domanda ("your Aethershards"). Con Bonus Damage sull'Enochian la card degli shard non lo consuma. Da
      giocatore: lo shard viene tolto dal GM (socket).
- [ ] **Geyser, eruzione**: piazza un Geyser, metti un PG sopra (stesso spazio). Scheda del geyser → bottone "Erupt" → card
      "Geyser erupts": "Removed and placed one or two spaces away: <PG> (on the geyser)", "Then summon a Salt Sprite in its
      space"; il PG è targettato e il geyser sparisce. Con la mastery sbloccata c'è anche la riga "Mastery: GREAT GEYSER …".
- [ ] **Volcanic Geyser, eruzione**: con l'Infuse armato piazza il Volcanic Geyser, personaggi a 1-2 spazi → "Erupt" →
      tutti quelli nella medium blast attorno, più la riga "Create dangerous terrain under the foes placed".
- [ ] **Geyser Talent I**: Talent I scelto, geyser height 1 sulla mappa, combat avviato → all'inizio del turno del Wright
      il geyser diventa height 2 (nome del token "Geyser (height 2)") e card "Start of <PG>'s turn: Geyser → height 2". A
      height 3 (o in una pila già alta 3) non cresce più. Senza Talent I non succede niente. Tornare indietro di un turno
      non lo fa crescere.
- [ ] **Megamushroom**: trascina "Megamushroom · H1" (mastery di Fairy Ring) → scheda: "Blessing token: on it", nota "Counts as a
      plant (p.184) …", bottone "Pick up blessing". Seleziona il token di un PG e premi → il PG ha 1 Blessed in più,
      card in chat, la scheda dice "picked up" e il bottone sparisce; l'oggetto resta. Senza token selezionato e senza
      personaggio assegnato → avviso.
- [ ] **Upheaval, pilastro**: mastery sbloccata → oltre a "Boulder · H1" c'è il chip "Pillar · H2"; trascinato diventa
      "Pillar (height 2)". Mastery non sbloccata → niente chip Pillar.
- [ ] **Helix Heel**: bottone area → scelta tra "Line 3" e "Text: Burst 1 (on object)". Con il token di un Boulder targettato
      la Burst 1 va da sola attorno al boulder. L'attacco / il tiro di Helix Heel non offre la Burst come area d'attacco.
- [ ] **Scheda dalla barra laterale**: Actors → cartella "Map Objects" → apri lo Shrine → niente − / + né Remove, badge
      "Height 1 (as placed)", "on this scene: height 2, height 1 on height 1" (le copie sulla scena) o "none on this scene",
      e la nota "This is the template … Double-click a token …". Il doppio clic sul token mostra come prima l'altezza vera.
- [ ] **Regressione**: Pyroclast non mostra "Erupt" sul Magma Spire; Shrine, Comet (Pick up), pile e aure come in R33a2.

## R33a2 — Effetti degli oggetti, pile, aree sugli oggetti (16 ottobre 2026, versione 1.15.66)

Setup: come R33a (scena a griglia quadrata, GM + giocatore). PG del giocatore: Sealer con Spirit Shrine (prova anche con
Talent I scelto e mastery sbloccata), Demon Slayer con Comet e un attacco qualunque, Wright Stormbender con Geyser,
Enochian con Pyroclast, Geomancer con Geo. Aether del Wright almeno 3. Solo JS, template e CSS: F5 dopo il deploy.
Nota: il test "Pyroclast / Geyser" di R33a cambia (i chip delle versioni Infuse ora si vedono solo con l'Infuse armato).

- [ ] **Object Effect sulla scheda**: piazza lo Shrine, doppio clic sul token → in cima una sezione "Object Effect" con
      "total height 1", la lista 1 / 2 / 3+ con la riga 1 accesa (cover e +1 boon) e le altre spente; sotto, il testo
      dello Shrine (da "Effect: Create a shrine…" a "…have evasion") con le keyword evidenziate. Con Talent I scelto c'è
      la riga "Talent I: If you or an ally ends their turn inside the Shrine's aura…".
- [ ] **Shrine per altezza totale**: + sulla scheda → "total height 2", righe 1 e 2 accese. Metti lo Shrine sopra un
      Boulder di Geo (height 1) → "height 1 on height 1 — total height 2". Con totale 3 → anche "3+" accesa.
- [ ] **Spirit Patronage**: mastery dello Shrine sbloccata → riga "Mastery: height N → 2 divine damage ×N", N = altezza
      dello Shrine (non quella della pila).
- [ ] **Chat**: bottone "Chat" sulla scheda dell'oggetto → card col cubo, altezza, testo, righe accese / "(not yet)".
- [ ] **Comet, non attaccare**: piazza "Thrown Weapon · H1" → sulla scheda dell'oggetto riga arancione "… cannot
      attack" e bottone "Pick up". Tira un attacco del Demon Slayer → domanda "you cannot attack": Cancel ferma il tiro,
      "Roll anyway" lo fa. Talent II scelto → riga "Talent II: … adjacent to your weapon gain 2 vigor".
- [ ] **Pick up (giocatore)**: il giocatore preme "Pick up" → la scheda si chiude e il GM toglie il token. Di nuovo un
      attacco → nessuna domanda. Su un Boulder il bottone dice "Remove".
- [ ] **Pila che scende**: tre Boulder impilati (elevazione 0 / 1 / 2). Togli (Remove o Canc) quello in basso → gli altri
      due scendono a 0 e 1. Trascina via quello in basso di una pila di due → quello sopra scende a 0; trascinalo sopra
      un altro Boulder → la sua elevazione diventa 1.
- [ ] **Infuse armato**: Geyser senza Infuse → solo il chip "Geyser · H1". Arma "Infuse 3: VOLCANIC GEYSER" → compare
      "Volcanic Geyser · H1"; trascinalo → token piazzato e l'infusione non è più armata (il chip sparisce). Uguale per
      Pyroclast ("Magma Spire · H3" solo con PYROSPIRE armato).
- [ ] **Area sull'oggetto**: con un Volcanic Geyser sulla mappa, targetta il suo token (T), poi bottone area di Geyser →
      "Medium Blast (on object)" → la blast va da sola centrata sul geyser (niente clic). Senza target → avviso "target
      the object's token" e si piazza a mano come prima.
- [ ] **Regressione aree**: un'area "centered on them" su un personaggio (Death, Slay) va ancora sul bersaglio; una
      normale Medium Blast di un attacco si piazza come prima.

## R33a — Oggetti sulla mappa (16 ottobre 2026, versione 1.15.65)

Setup: una scena a griglia quadrata, un GM e un giocatore connessi. PG del giocatore: Sealer con Spirit Shrine, Wright
Geomancer con Geo, Terraforming e il tratto Stone Double, Warden con Underway, Mendicant Harvester con Fairy Ring
(mastery bloccata). Token del PG sulla scena. Solo JS e template: F5 dopo il deploy.

- [ ] **Chip**: pannello di Spirit Shrine → accanto ai bottoni c'è un chip col cubo "Shrine · H1" (tooltip: height 1,
      Aura 2 che lo segue). Geo "Boulder · H1", Terraforming "Boulder · H1", Underway "Underway · H1", tratto Stone
      Double "Statue · H1" nella riga del tratto. Fairy Ring senza chip finché la mastery è bloccata; sbloccata → chip
      "Megamushroom · H1".
- [ ] **Piazzare (giocatore)**: il giocatore trascina "Boulder · H1" sulla mappa → messaggio "sent to the GM", poi il
      token "Boulder (height 1)" compare nello spazio del drop, col nome sempre visibile; il giocatore lo può muovere.
      Nella cartella attori "Map Objects" c'è l'attore Boulder.
- [ ] **Scheda dell'oggetto**: doppio clic sul token → badge "Object", "Height 1" con − / +, "Immune"; la sezione "Object
      Rules" mostra il testo da cui viene; niente Speed né Summon Action. + → "Height 2" e il token diventa "Boulder
      (height 2)"; a 3 il + è spento.
- [ ] **Impilare**: un secondo Boulder sullo stesso spazio del primo (height 1) → va sopra, elevazione 1. Alza il primo a
      2 → l'oggetto sopra sale a elevazione 2. Un terzo Boulder lì (totale 4) → avviso "can't be past height 3 (p.95)"
      e nessun token.
- [ ] **Underway**: trascina il portale → piazzato. Trascinalo di nuovo → domanda "replace?": "Keep both" → due portali.
      Un portale su un altro oggetto → avviso "can't be stacked". Terza volta, "Replace" → resta solo il nuovo.
- [ ] **Shrine con aura**: trascina "Shrine · H1" → token "Shrine (height 1)" con un'Aura 2 attorno, nel colore del PG.
      Muovi il santuario → l'aura lo segue. Cancella il token → l'aura sparisce.
- [ ] **Shrine riusata**: trascina di nuovo lo Shrine → domanda "replace?"; "Replace" → il vecchio santuario e la sua
      aura spariscono, resta il nuovo.
- [ ] **Distruttibile (GM)**: sulla scheda di un oggetto il GM vede "Make destructible" (il giocatore no) → badge
      "Destructible — 10 hp", campi HP/Defense, barra HP sul token. "Make immune" lo riporta come prima.
- [ ] **Aree**: piazza una Medium Blast di un attacco sopra un oggetto immune → l'oggetto NON è tra i bersagli; reso
      distruttibile, sì.
- [ ] **Creatore sconfitto**: porta il PG a 0 hp / sconfitto → gli oggetti restano sulla mappa.
- [ ] **Pyroclast / Geyser**: un PG Enochian con Pyroclast ha due chip "Magma Spire · H1" e "Magma Spire · H3"
      (Pyrospire); uno Stormbender con Geyser ha "Geyser · H1" e "Volcanic Geyser · H1".

## Regex rotte di R39 e R59 (16 ottobre 2026, versione 1.15.64)

Prima di provare: in un mondo con schema vecchio (ultimo deploy 1.15.2), un PG con il Limit Break Gran Levincross o
Death Sentence preso **prima** dell'aggiornamento. Solo JS: F5 dopo il deploy.

- [ ] **Migrazione 25**: al caricamento (GM) la console dice "Migration 25" con un numero > 0; il Limit Break del PG
      ora ha "Effect:" e i capoversi come nel compendio (test R39 più sotto).
- [ ] **Regain di Aether Deflection**: rifai i test R59 su Aether Deflection: il bottone "Regain (2 Aether)" compare
      sul tratto, è spento con meno di 2 Aether e, premuto, toglie 2 Aether e scrive in chat.
- [ ] **Stormlash** (controllo che non si sia rotto niente): Infuse 1 di Tsunami speso subito, senza restare armato.

## R62 — Promemoria "round N or later" a inizio round (16 ottobre 2026, versione 1.15.63)

Setup: un combat con un PG Wright Spellblade con Drifting Leaf (mastery GREAT CYCLONE sbloccata) e il tratto Storm
Hilt Rage, un PG Stalwart con Massive Overhead (mastery bloccata), un foe importato con un'azione "At round 3+" (es.
Junk Mage, Sniper o Barkeep), e un secondo token dello stesso foe. Solo JS: F5 dopo il deploy.

- [ ] **Round 1–2**: Begin Combat e Next Round fino al round 2 → nessuna card "Round 1" / "Round 2" (non c'è niente che
      si accenda lì).
- [ ] **Round 3, foe**: Next Round → card "Round 3" sussurrata al GM (badge "foes") con UNA riga del foe (non due per i
      due token): "Junk Mage — … (now active): Round 3+: deals bonus damage…". Un giocatore non la vede.
- [ ] **Round 4, PG**: Next Round → card pubblica "Round 4" (badge "round") con "Drifting Leaf (Mastery: GREAT
      CYCLONE) (now active): At round 4 or later, Drifting Leaf's infuse is always active.", senza il nome della mastery
      ripetuto nel testo; NESSUNA riga di Massive Overhead (mastery bloccata). In un combat nuovo, con la mastery
      sbloccata, la riga di Massive Overhead c'è.
- [ ] **Round 5, tratto**: Next Round → card "Round 5" con "Storm Hilt Rage: At the start of round 5 and for the rest
      of combat…". Al round 6 niente righe dei PG.
- [ ] **Indietro e avanti**: Previous Round dal 5 al 4, poi Next Round → la card del round 5 NON esce di nuovo.
- [ ] **Due GM**: con un secondo GM (o assistente) connesso, al nuovo round esce una sola card per pubblico.
- [ ] **Talento**: PG Wright con Cryo e il talento I scelto → al round 4 "Cryo (Talent I) (now active): At round 4 or
      later, this ability generates +1 Aether when used."; col talento II scelto, solo la riga del II.
- [ ] **Relic**: PG con Conquering King al rank I → al round 5 "Conquering King I (now active): Invoke (Round 5+): All
      abilities deal bonus damage."; al round 7 niente, finché non è al rank II.
- [ ] **Legend**: Dread Lords in combat → al round 3 e al round 6 la card al GM nomina Eternal Imperium; al 4 e al 5 no.
- [ ] **Sconfitto**: un foe segnato defeated prima del round 3 non dà righe.

## R61 — Interrupt concessi in chat da soli (16 ottobre 2026, versione 1.15.62)

Setup: un PG Fool con Chronotemper, un PG Wright Spellblade con Drifting Leaf, un PG con Fairy Ring (Harvester) o
Riposte (Knave). È JS + template: F5 dopo il deploy.

- [ ] **Chronotemper, intestazione**: anteprima dell'abilità nella tab Combat → il blocco Mark finisce con "…use the
      following interrupt:" (senza "Cheat Time — Interrupt 1." appeso) e sotto c'è il blocco "Cheat Time — Interrupt 1:
      Trigger: The start or end of any turn other than yours." con accanto il bottone col fumetto; poi Effect.
- [ ] **Chronotemper, card**: clic sul fumetto → card "Chronotemper" con sotto "Interrupt 1: Cheat Time", badge Fool /
      Ch / Interrupt 1, righe Trigger ed Effect; nessuna riga Mastery con la mastery bloccata.
- [ ] **Chronotemper con la mastery**: sblocca Revolution → la stessa card ha in fondo "★ Mastery: Revolution: You can
      take this interrupt three times a round…".
- [ ] **Drifting Leaf**: fumetto accanto a "LEAF ON THE WIND — Interrupt 2" → card con sotto "Interrupt 2: Leaf on the
      Wind", Trigger, Effect, "Infuse 3 or Slay: PHANTOM BLADE — …"; con il talento I scelto c'è anche "Talent I: …its
      interrupt deals 1 piercing damage twice…", con la mastery sbloccata "★ Mastery: GREAT CYCLONE …".
- [ ] **Fairy Ring / Riposte**: il blocco "Spirit Away — Interrupt 2" (o "Dire Parry — Interrupt 1") ha il fumetto e
      la card ha Trigger ed Effect giusti; Riposte con la mastery aggiunge "Strong Left".
- [ ] **Show in Chat invariato**: Show in Chat di Chronotemper → stessi blocchi della scheda ("Cheat Time — Interrupt
      1: Trigger: …"), nessun bottone fumetto nella card.
- [ ] **Abilità senza interrupt concesso**: le altre abilità non hanno fumetti nuovi; i fumetti di mastery e talento di
      R31 funzionano come prima.


Setup: un PG Wright Geomancer con Bio (mastery sbloccata) e Quaking Palm, un Wright Enochian con Pyre e Lance (mastery
sbloccata), almeno 6 Aether; un foe come bersaglio. È JS + template + CSS: F5 dopo il deploy.

- [ ] **Bio senza niente armato**: Show in Chat → la card ha Effect / Hit / Miss or Area / Charge, poi due righe blu
      chiuse "Infuse 3: BIOTIC" e "Infuse 6 (Mastery): MAGNABIO"; NON c'è più la riga "★ Mastery" col testo di Magnabio.
      Clic su una riga → si apre e mostra il suo testo; riclic → si chiude.
- [ ] **MAGNABIO aperta**: dentro c'è "2 actions, Attack, Range 8, Large Blast." in cima, poi blocchi separati Hit /
      Miss / Area / Terrain Effect, e "Benefits from Bio talents." in corsivo in fondo.
- [ ] **Bio con BIOTIC armato**: Infuse 3 sulla scheda → nel messaggio "infuses" il testo è etichettato come una card.
      Show in Chat → titolo "Bio — BIOTIC", in cima un blocco aperto "Infused — Infuse 3: BIOTIC", sotto i blocchi
      della base aperti, in fondo la riga chiusa di MAGNABIO.
- [ ] **Bio con MAGNABIO armato**: Infuse 6 → Show in Chat → titolo "Bio — MAGNABIO", blocco aperto della versione con
      Hit / Miss / Area / Terrain Effect; la base è chiusa in una riga "Base version: Bio"; BIOTIC chiusa.
- [ ] **Attacco con MAGNABIO armato**: Attack Roll di Bio sul foe → titolo "Bio — MAGNABIO", Hit "2[D]+fray." e Miss
      "[D]+fray." (non quelli della base), sopra righe blu con l'icona della bacchetta (riga del costo, Area, Terrain
      Effect, "Benefits from Bio talents.").
- [ ] **Attacco senza niente armato**: Attack Roll di Bio → card come prima (Hit / Miss della base, nessuna riga blu).
- [ ] **Pyre / Magnapyre**: con la mastery, Show in Chat di Pyre senza armare → righe chiuse PYROTIC e MAGNAPYRE;
      aperta MAGNAPYRE mostra due "Effect:" separati e "Comeback or Exceed:" come blocchi propri.
- [ ] **Lance / Great Spirit Lance**: Show in Chat → riga chiusa "Infuse 6 (Mastery): GREAT SPIRIT LANCE" con Hit / Miss /
      Area etichettati.
- [ ] **Quaking Palm**: Show in Chat → il "Collide: Foe must save or be stunned." non è più tra i blocchi della base ma
      dentro la riga chiusa "Infuse 3: PRIMAL BURST".
- [ ] **Tsunami**: Show in Chat → riga chiusa "Infuse 1: STORMLASH (Free Action)"; il bottone Infuse 1 funziona come
      in 1.15.60 (spende e posta subito).
- [ ] **Abilità senza Infuse**: Show in Chat di un'abilità qualsiasi di un altro job (e di una con combo) → card
      identica a prima.
- [ ] **Tema chiaro**: le righe blu e il blocco "Infused" si leggono anche in tema chiaro.

## R59 — Aether senza attacco: Stormlash e Aether Deflection (16 ottobre 2026, versione 1.15.60)

Setup: un PG Wright Stormbender con Tsunami e un PG Wright Spellblade (tratto Aether Deflection), entrambi con qualche
Aether. È JS + template: F5 dopo il deploy.

- [ ] **Stormlash**: con 3 Aether clicca "Infuse 1" su Tsunami → Aether a 2, in chat "<nome> uses the infusion of
      Tsunami — STORMLASH" con "Infuse 1: 1 Aether spent (2 left)" e il testo; il bottone NON diventa "armed".
- [ ] **Stormlash due volte**: ricliccalo → scala un altro Aether (non lo restituisce) e posta di nuovo.
- [ ] **Con un'altra infusione armata**: arma l'Infuse 3 di Rime (DAGON), poi clicca Stormlash → l'Aether di Dagon non
      torna indietro e Rime resta "armed".
- [ ] **Senza Aether**: a 0 Aether clicca Stormlash → avviso "Infuse 1 needs 1 Aether", nessun messaggio in chat.
- [ ] **Altre infusioni invariate**: Infuse 3 di Rime si arma come prima (bottone "armed", ricliccare restituisce
      l'Aether, tirando Rime la versione si consuma).
- [ ] **Aether Deflection**: nella riga del tratto c'è "Aether N" e il bottone "Regain (2 Aether)"; con 3 Aether
      cliccalo → Aether a 1, in chat "<nome> spends 2 Aether to regain the use of Aether Deflection (1 Aether left)".
- [ ] **Aether insufficiente**: con 1 Aether il bottone è spento; su una scheda di un altro giocatore (solo
      osservatore) è spento.

## R58 — Casella "Defender has evasion" nella finestra dell'attacco (16 ottobre 2026, versione 1.15.59)

Setup: un PG che attacca, un Foe senza Evasion e un PG Fool (tratto Curse of Chaos) come bersagli; un secondo foe con lo
status Evasion. È JS + CSS: F5 dopo il deploy.

- [ ] **Casella spenta**: targetta il foe senza Evasion e attacca → nella riga del bersaglio c'è "Defender has evasion"
      non spuntata; nessuna nota Evasion sotto Modifiers; la card d'attacco non ha il blocco Evasion.
- [ ] **Casella spuntata a mano**: stesso attacco, spunta la casella → sotto Modifiers compare "Evasion: <nome> rolls
      1d6 (4+ = miss) before the attack"; tira → la card ha il blocco Evasion con il d6 e "(set in the attack dialog)";
      con 4+ l'attacco è mancato e il bersaglio è attenuato in "Inflict".
- [ ] **Curse of Chaos**: un foe attacca il PG Fool da 3+ caselle → spunta la casella, stesso comportamento.
- [ ] **Spuntata da sola**: targetta il foe con lo status Evasion → casella già spuntata; togli la spunta → la nota
      sparisce e il tiro non fa il d6 d'Evasion.
- [ ] **True Strike**: abilità con tag True Strike, casella spuntata → nota "True Strike (tag): ignores Evasion", la card
      dice "Evasion ignored".
- [ ] **Area**: attacco ad area con 2+ bersagli → la casella c'è solo sulla riga del bersaglio d'attacco (radio); cambiando
      il radio la casella passa all'altro e la nota si aggiorna.
- [ ] **Finestra del danno**: la finestra del tiro di danno NON ha la casella.

## R57 — Stack Dice: bottone Use (16 ottobre 2026, versione 1.15.58)

Setup: PG Fool con il tratto Stack Dice (uno al capitolo 3 per avere 2 dadi). È template + JS: F5 dopo il deploy.

- [ ] **Bottone**: tab Combat, tratto Stack Dice: accanto ai pallini c'è **Use**; con "0/1" è spento (grigio, non
      cliccabile).
- [ ] **Uso**: accendi un dado ("1/1"), clicca Use → la scheda torna a "0/1" e in chat c'è "<PG> uses a Stacked Die: the
      gamble result is 6 (Stack Dice, p.149)" a nome del PG; Use torna spento.
- [ ] **Capitolo 3**: con "2/2" Use → "1/2", di nuovo Use → "0/2"; due messaggi in chat.
- [ ] **Niente doppio scalo**: con "1/1" usa la finestra Gamble di un'abilità e scegli "Stacked Die" → risultato 6 e
      scheda a "0/1" (una sola volta); nessun messaggio extra di Use.
- [ ] **Player senza permessi**: sulla scheda di un PG altrui (solo osservatore) Use è spento.

## R56 — Track target su Quaking Palm, Sidhe e Dark Sliver (16 ottobre 2026, versione 1.15.57)

Setup: un PG Geomancer con Quaking Palm, un PG Warden con Sidhe, un PG Harvester con Dark Sliver; un PG Sealer con
Grand Banishment; due foe sulla mappa.

- [ ] **Bottone**: nel pannello di Quaking Palm, di Sidhe e di Dark Sliver c'è **Track target**; su Grand Banishment
      c'è ancora.
- [ ] **Track**: targettare il foe A, Track target su Quaking Palm → in chat "<PG> tracks <A> — Quaking Palm (a
      reminder, not a mark)"; chip "A ✕" sotto l'abilità; nel tab Conditions di A la riga "Tracked: Quaking Palm"; nel
      pannello status del token di A "Tracked: Quaking Palm (<PG>)". ✕ sul chip → segno tolto.
- [ ] **Niente bottone sulle durate**: Wish (Seer), Geyser (Stormbender), Realignment (Geomancer) e Mock (Knave), che
      dicono solo "until the end of their next turn", NON hanno Track target.
- [ ] **Mark invariati**: un'abilità con Mark (es. Divine Aegis) ha solo Mark target, niente Track.

## R55 — Helix Heel: la prima riga è un Effect (16 ottobre 2026, versione 1.15.56)

Setup: deploy con Foundry chiuso (cambia il compendio Jobs), poi un PG Geomancer che ha già Helix Heel sulla scheda da
prima di questa versione, e un PG Geomancer nuovo.

- [ ] **Migrazione**: all'apertura del mondo (GM) compare l'avviso di migrazione; in console "Migration 28: … Helix Heel
      given the p.219 "Effect:" label".
- [ ] **Scheda, copia vecchia**: tab Combat, pannello di Helix Heel: niente riga in corsivo; tre blocchi Effect ("Release
      a shockwave in a line 3 area effect, dealing 2 piercing damage to all foes.", "If an object is in the end space…",
      "Then, all objects this line passed through resonate…"), poi Charge. "line 3", "piercing" ecc. hanno il tooltip.
- [ ] **Copia nuova dal compendio**: trascina Helix Heel dal compendio Jobs su un PG → stessi blocchi.
- [ ] **Chat**: 💬 Show in Chat / uso dell'abilità → la card mostra gli stessi tre Effect, senza corsivo in cima.
- [ ] **Area e danno**: il bottone area piazza una Line 3 come prima; il tiro del danno propone 2 piercing damage.
- [ ] **Massive Overhead invariato**: apre ancora con Effect ("End your turn…"), come dopo R8.

## R54 — Eye of the Storm: Special, Area, Effect (16 ottobre 2026, versione 1.15.55)

Setup: deploy con Foundry chiuso (cambia il compendio Jobs), poi un PG Stormbender al capitolo 3 che ha già Eye of the
Storm sulla scheda da prima di questa versione, e un PG Stormbender nuovo.

- [ ] **Migrazione**: all'apertura del mondo (GM) compare l'avviso di migrazione; in console "Migration 27: … Eye of
      the Storm given the p.236 Special / Area / Effect blocks".
- [ ] **Scheda, copia vecchia**: tab Combat, pannello di Eye of the Storm: in corsivo solo "A storm of vigorous thunder
      … the center remains calm."; poi Special ("This attack has no attack space. Instead, the attack space is clear
      and exempt from this area."), poi Area ("[D]"), poi Effect ("If an ally is in the center space, they may fly 4
      …"), poi Infuse 3: AEONCLOUD. Nell'Effect le parole chiave (es. "vulnerable") hanno il tooltip.
- [ ] **Copia nuova dal compendio**: trascina Eye of the Storm dal compendio Jobs su un PG → stesso ordine e stesse
      etichette.
- [ ] **Chat**: 💬 Show in Chat / uso dell'abilità → la card ha lo stesso ordine Special → Area → Effect → Infuse 3.
- [ ] **Danno**: tiro del danno dell'area → [D] come prima; con Infuse 3 (Aeoncloud) → [D]+fray e large blast.
- [ ] **Altre abilità invariate**: Heave-Ho (Effect prima dell'Area) e Comet (Area prima dell'Effect) come prima.

## R53 — Heave-Ho: l'Effect prima dell'Area (16 ottobre 2026, versione 1.15.54)

Setup: deploy con Foundry chiuso (cambia il compendio Jobs), poi un PG Stormbender che ha già Heave-Ho sulla scheda da
prima di questa versione, e un PG Stormbender nuovo.

- [ ] **Migrazione**: all'apertura del mondo (GM) compare l'avviso di migrazione; in console "Migration 26: … Heave-Ho
      now show Effect before Area".
- [ ] **Scheda, copia vecchia**: tab Combat, pannello di Heave-Ho: Trigger in alto, poi Effect ("After the triggering
      ability resolves, create a crashing wave …"), poi Area ("Characters caught in the area are shoved 1 …"), poi
      Collide ("Summon a salt sprite").
- [ ] **Copia nuova dal compendio**: trascina Heave-Ho dal compendio Jobs su un PG → stesso ordine.
- [ ] **Chat**: 💬 Show in Chat / uso dell'abilità → la card ha lo stesso ordine Effect → Area → Collide.
- [ ] **Altre abilità invariate**: Comet (Area prima dell'Effect, p.128) e Draken Cross come prima.

## R51 — Stack Dice: il secondo dado al capitolo 3 (16 ottobre 2026, versione 1.15.53)

Setup: PG Fool al capitolo 3 (tratto Death's Apprentice sbloccato) e un PG Fool al capitolo 1 o 2. È solo un template:
F5 dopo il deploy.

- [ ] **Capitolo 3**: tab Combat, tratto Stack Dice: "Stacked Dice 0/2" con due dadi. Click sul secondo → "2/2",
      entrambi accesi; click sul primo → "1/2"; click sul primo acceso (l'ultimo) → "0/2".
- [ ] **Gamble con 2 dadi**: con 2/2 apri la finestra del gamble e usa lo Stacked Die → il risultato è 6 e la scheda
      torna a "1/2".
- [ ] **Capitolo 1-2**: un solo dado, "0/1" → "1/1" → "0/1" come prima.

## R50 — Keyword "summon" sul verbo e nomi delle combo (16 ottobre 2026, versione 1.15.52)

Setup: PG di prova (Warden e Shade) con Morrigan, Death Blossom (combo), Umbra, Dark Sliver (mastery sbloccata),
Geyser e Massive Overhead (mastery sbloccata), dal compendio Jobs o già sulla scheda (è solo codice). F5 dopo il deploy.

- [ ] **Morrigan** (anteprima abilità e Show in Chat): "you summon a massive flock" senza tooltip sulla parola summon;
      "allied summons in range" con il tooltip Summon; il Collide "Summon a beast" con il tooltip.
- [ ] **Death Blossom**, riquadro combo: "Flying Sleeves:" senza tooltip su Flying; "allied summon in the area" con
      il tooltip. Stessa cosa aprendo la scheda item dal compendio.
- [ ] **Umbra** (Finishing Blow "Summon a shadow"), **Dark Sliver** (mastery "summon a mote of life", e "summon a plant"
      nella descrizione): tooltip Summon presente come prima.
- [ ] **Geyser** ("Summon a height 1 geyser object"): niente tooltip Summon sul verbo (il chip del tag "summon" resta).
- [ ] **Massive Overhead**: mastery "Blood Rush:" senza tooltip su Rush; il bottone 💬 della mastery in chat uguale.
- [ ] **Non devono cambiare**: un foe che evoca (es. Arachnid Demon, "Chaos Cocoon") e un trofeo (Soul Gem, "summon 3
      Relict Husks") tengono il tooltip su summon; un talento che inizia con "Slay:" o "Comeback:" ha ancora il tooltip
      sull'etichetta.

## R49 — Aree di Slay, Finishing Blow, Exceed e Collide; aree "centered on them" (16 ottobre 2026, versione 1.15.51)

Setup: PG di prova con Death (Fool), Soul Shot, Matsuri, Gust, God Hand (mastery sbloccata), Ace (Talent I), Aria,
Elden Rune (mastery sbloccata) ed Eye of the Storm, dal compendio Jobs o già sulla scheda (è solo codice); il token del
PG sulla mappa, due foe e un alleato.

- [ ] **Death**: bottone area → "which area?" con "Line 6" e "Slay / Finishing Blow: Large Blast (target)".
      Bersagliare (T) un foe e scegliere la Large Blast → l'area compare centrata sul foe, senza clic, con i personaggi
      dentro bersagliati. Senza bersaglio (o con due) → avviso "This area is centered on a character…" e piazzamento a
      mano (Alt toglie il limite del range).
- [ ] **Death, Attack Roll**: il tiro d'attacco piazza solo la Line 6 (non chiede "which area?" e non propone la Large
      Blast dello Slay).
- [ ] **Soul Shot**: bottone area → "Line 3", "Exceed / Finishing Blow: Large Blast (target)" (e con Talent II "Line 6").
- [ ] **Matsuri**: ora c'è il bottone area "Large Blast (target)" (Exceed, "centered on your foe"): centrata sul foe
      bersagliato.
- [ ] **Gust**: bottone area → "Line 3" e "Collide: Burst 1 (target)": il Burst 1 va attorno al personaggio bersagliato
      (lui compreso).
- [ ] **Aria**: bottone area → "Small Blast (self)" centrata sul PG senza clic; "Medium Blast" / "Large Blast" si
      piazzano a mano come prima.
- [ ] **God Hand / Ace (Talent I) / Exorcism (Talent II)**: la blast "centered on them" ha "(target)" nel nome e va sul
      token bersagliato.
- [ ] **Token grande**: con un foe 2×2 bersagliato, la Large Blast di Death chiede di cliccare uno dei suoi spazi come
      centro (fuori → avviso "The centre space …").
- [ ] **Elden Rune** con la mastery: "Mastery: Small Blast" si piazza cliccando lo spazio del PG (la runa è sotto di
      te), come prima. **Eye of the Storm**: la mastery crea un oggetto (aethercloud, resta in R33); con AEONCLOUD armato
      il bottone offre la Large Blast (R47).
- [ ] **Non devono cambiare**: Holy Talent I e Pandaemonium combo (blast "centered on" pit: a mano), Geyser (a mano),
      Land Waster (ora "Heroic: Burst 2 (target)", a mano come prima), Rook, Fulminate.

## R48 — Aure scritte nel testo: in alternativa, sul personaggio marcato, attorno a un terrain effect (16 ottobre 2026, versione 1.15.50)

Setup: PG di prova con Warding Bolts (Freelancer, mastery sbloccata), Fulminate e Rampant Nail (Spellblade), Rook e
Land Waster (Bastion), dal compendio Jobs o già sulla scheda (è solo codice); il token del PG sulla mappa, un alleato e
un foe.

- [ ] **Warding Bolts, Phantom Bolts**: bottone area → "which area?" con "Text: Small Blast" e "Mastery: Aura 2".
      Scegliendo l'Aura 2 compare attorno al PG senza clic, lo segue quando si muove, non scade al turno dopo. Senza
      la mastery sbloccata: piazza direttamente la Small Blast, come prima.
- [ ] **Fulminate**: ora c'è il bottone area (Aura 2). Bersagliare (T) il foe e premerlo → l'Aura 2 è attorno al foe e
      lo segue; senza bersaglio → avviso "target that character's token…" e aura attorno al PG. Foe a più di 6 spazi →
      avviso "beyond range 6".
- [ ] **Fulminate con i talenti**: con Talent I scelto la finestra offre anche "Talent I: Aura 3"; con Talent II
      "Talent II: Aura 1". Mouse sopra l'aura piazzata, + / − la allargano o restringono.
- [ ] **Rampant Nail**: bottone area → "Aura 2 (terrain effect)": si muove un'anteprima 5×5, il range 3 è in blu; il
      clic con il centro fuori dal range dà l'avviso "The centre space … within range 3"; dentro il range l'aura resta
      ferma lì, anche dopo l'inizio del turno successivo e se il PG si muove. Usarla di nuovo sostituisce la prima. Con
      Talent I scelto la finestra offre anche "Talent I: Small Blast". Mouse sopra e + / −: non cambia (non è un'aura
      su un token).
- [ ] **Rook, Heroic**: bottone area → "which area?" con "Aura 1" e "Heroic: Aura 2"; entrambe attorno al PG e con la
      scadenza "until the end of your next turn".
- [ ] **Land Waster**: bottone area / Attack Roll → scelta tra "Burst 1" e "Heroic: Burst 2 (target)".
- [ ] **Non devono cambiare**: Endless Battlement (Aura 1 sull'alleato), Dervish con Talent I (una sola Aura 1, non
      due), Gentleness, Spirit Shrine (nessun bottone area).

## R47 — Le aree degli Infuse X crescono con l'Aether speso (16 ottobre 2026, versione 1.15.49)

Setup: PG di prova Wright con Ätherwand (Spellblade) e Rime (Stormbender), dal compendio Jobs o già sulla scheda (è
solo codice); Aether a 6; il token del PG sulla mappa e un foe.

- [ ] **Ätherwand senza Infuse**: bottone area → piazza direttamente la Line 3 (range 4), come prima.
- [ ] **Ätherwand, ÄTHERSTURM**: Infuse X con 2 Aether → bottone area → finestra "which area?" con prima "Infuse X (2
      Aether): Line 5", poi "Text: Line 3". Scegliendo la prima la linea è lunga 5. Con 5 Aether la linea è Line 6
      (massimo +3).
- [ ] **Rime senza mastery armata**: mastery sbloccata ma MAGNARIME non armata → bottone area: solo Line 6, nessun
      "Mastery: Arc 4".
- [ ] **Rime, MAGNARIME**: Infuse X con 2 Aether → bottone area: prima scelta "Infuse X (2 Aether): Arc 6" (range 6),
      poi Line 6. Con 4 Aether: Arc 8. Anche l'Attack Roll, senza area già sulla mappa, propone la stessa scelta.
- [ ] **Forme fisse (non devono cambiare)**: Bio con BIOTIC armato offre "Infuse 3: Medium Blast" (range 8) come
      prima scelta e la Small Blast base subito dopo; Cryo con CRYOTIC piazza la Line 8 come prima.

## R46 — Il tiro del danno legge la versione Infuse armata (16 ottobre 2026, versione 1.15.48)

Setup: PG di prova Wright con Cryo (Stormbender), Bio e Geo (Geomancer), Eye of the Storm e Nothung (Spellblade), dal
compendio Jobs o già sulla scheda (è solo codice); Aether a 6; un foe sulla mappa come bersaglio.

- [ ] **Cryo, CRYOTIC**: Infuse 3 → Damage: Hit "fray", Area "fray" (non più 1). Il titolo della card è "Cryo —
      CRYOTIC". Disarmato di nuovo (secondo click, Aether restituito) il tiro torna a 1.
- [ ] **Cryo, MAGNACRYO**: mastery sbloccata, Infuse X con 4 Aether → il bottone dice Attack Roll (non Auto-Hit);
      Damage: Hit 2[D]+fray, Miss [D]+fray, Area [D]+fray, Bonus dice già a 2 con la nota "MAGNACRYO: +2 bonus dice
      from the Aether spent". Con 3 Aether i dadi bonus sono 1.
- [ ] **Bio, MAGNABIO**: mastery sbloccata, Infuse 6 → Hit 2[D]+fray, Miss [D]+fray, Area [D]+fray. Con BIOTIC
      (Infuse 3) il danno resta quello base ([D]+fray / fray / fray).
- [ ] **Geo, MAGNAGEO**: Infuse 6 → Area [D]+fray (non solo fray), Miss [D]+fray.
- [ ] **Eye of the Storm, AEONCLOUD**: Infuse 3 → Area [D]+fray (base [D]).
- [ ] **Nothung, EXCALIBUR**: mastery sbloccata e Talent I scelto → Damage → Other: il chip del Talent I dice "1
      divine"; sceglierlo spunta Divine (non Pierce). Senza mastery dice "1 piercing" e spunta Pierce.
- [ ] **Non deve cambiare**: un'abilità senza Infuse armato tira come prima; un Limit Break con Infuse armato
      (Gigaflare, Tetraflare) tira come in R38b.

## R45 — Niente "Hit (no damage)" sulle abilità che danneggiano solo con l'area (16 ottobre 2026, versione 1.15.47)

Setup: PG di prova Geomancer con Dragon Dive e Spellblade con Bifröst (dal compendio Jobs o già sulla scheda: è solo
codice); un foe con Blunderbuss (Trooper) e uno con un attacco normale; qualche token sulla mappa.

- [ ] **Dragon Dive**: bottone Damage → la finestra non ha la scelta Hit; parte selezionata Area (2 piercing), poi
      Other. Il tiro fa 2 danni piercing.
- [ ] **Bifröst**: come sopra, Area 2 piercing, nessuna Hit.
- [ ] **Comet / Justice / Chaos Tarot**: niente Hit, solo Area (e Other).
- [ ] **Trooper, Blunderbuss**: Damage dalla scheda del foe → niente Hit, Area 2.
- [ ] **Attacchi (non devono cambiare)**: un attacco normale del PG (es. con Hit [D]+fray) e un attacco del foe hanno
      ancora Hit / Crit / Miss come prima; un attacco ad area con il colpo senza danno mostra ancora "Hit (no damage)".
- [ ] **Damage Utility (non deve cambiare)**: il tiro libero dalla scheda del PG mostra solo il pannello Other.

## R44 — Summon sui tratti che lo creano (16 ottobre 2026, versione 1.15.46)

Setup: PG di prova Freelancer con Bound Spirit, Warden con Beast Master, Stormbender con Selkie, Fool con Cheap Trick,
Shade con Darkside, Meld e Umbral Soul (dal compendio Jobs o già sulla scheda: è solo codice). Il chip compare
nell'intestazione del tratto, nella tab dei tratti.

- [ ] **Bound Spirit**: chip Astral Seraph; trascinarlo sulla mappa crea il token del seraph.
- [ ] **Beast Master**: chip Great Beast, nessun chip Beast.
- [ ] **Selkie**: chip Selkie; trascinarlo sulla mappa crea il token.
- [ ] **Cheap Trick**: chip Bomb.
- [ ] **Darkside**: chip Shadow.
- [ ] **Meld / Umbral Soul**: nessun chip.
- [ ] **Tratto bloccato**: un tratto di capitolo più alto di quello del PG (lucchetto "Locked") non mostra il chip.
- [ ] **Abilità (non devono cambiare)**: Umbra ha ancora il chip Shadow, Cavaliere il chip Bomb (R43).

## R43 — Summon solo sulle abilità che lo creano (16 ottobre 2026, versione 1.15.45)

Setup: PG di prova Shade con Harrow, Shadow Play, Umbra, Umbral Echo; un Harvester con Harvest; un Fool con Cavaliere
(dal compendio Jobs o già sulla scheda: è solo codice). Il summon compare come chip trascinabile nel pannello
dell'abilità e nella card di Show in Chat.

- [ ] **Harrow**: nessun chip Shadow (pannello e card), con qualunque talento scelto.
- [ ] **Shadow Play**: nessun chip Shadow.
- [ ] **Umbra**: chip Shadow presente (dal Finishing Blow); trascinarlo sulla mappa crea il token.
- [ ] **Umbral Echo**: chip Shadow presente.
- [ ] **Harvest**: chip Thrall, nessun chip Plant.
- [ ] **Cavaliere**: chip Bomb.
- [ ] **Non devono cambiare**: Nightmare (Shadow), Gravebirth (Plant e Thrall), Chaos Tarot (Wild Card e Master Card),
      Raging Wolf ancora senza Beast (R7).

## R42b — Inflict per gli status dati a chi "finisce il turno" in un'area (16 ottobre 2026, versione 1.15.44)

Setup: PG di prova con Mist Strider e Ätherwand (dal compendio Jobs o già sulla scheda: è solo codice); un foe sulla
mappa.

- [ ] **Mist Strider, mastery**: sbloccare la mastery → Show in Chat → riquadro Inflict, gruppo "River Guardians":
      bottone Dazed. Resta il Blinded del Terrain effect.
- [ ] **Mist Strider senza mastery**: il Dazed non compare.
- [ ] **Ätherwand**: Show in Chat → riquadro Inflict, gruppo "Terrain Effect": bottone Shattered.
- [ ] **Abilità che tolgono uno status (non devono cambiare)**: un'abilità con "ends" / "removes" uno status (es. una
      cura) non propone l'Inflict di quello status.

## R42 — Gain dei talenti con "one of them" e "Grant you and your ally" (16 ottobre 2026, versione 1.15.43)

Setup: PG di prova Shade con Shadow Play ed Enochian con Blazing Bond (vanno bene anche quelli già sulla scheda: è solo
codice); un alleato sulla mappa.

- [ ] **Shadow Play, Talent II**: scegliere il Talent II → Show in Chat → riquadro Gain: bottone "Gain Evasion" per gli
      alleati, con la durata "until the start of their next turn"; restano Stealth (alleati) e Dazed (foe) dell'Effect.
- [ ] **Shadow Play, Talent I**: con il Talent I scelto l'Evasion non compare.
- [ ] **Blazing Bond, Talent II**: scegliere il Talent II → Show in Chat → bottoni Gain Defiance su di te e
      sull'alleato (gruppo "Comeback").
- [ ] **Crimson Bloom / Divine Aegis**: Talent I di Crimson Bloom, Talent II di Divine Aegis → Gain Defiance per
      l'alleato.
- [ ] **Intimidate (non deve cambiare, R18)**: mastery sbloccata → ancora "Gain Unstoppable" su di te.

## R41 — Inflict solo sul bersaglio dell'attacco negli attacchi ad area (16 ottobre 2026, versione 1.15.42)

Setup: PG di prova con Blackstar (Enochian) e Drifting Leaf (dal compendio Jobs: è solo codice, vanno bene anche
quelli già sulla scheda); tre foe vicini sulla mappa.

- [ ] **Blackstar**: Attack → Large Blast piazzato sui tre foe → nel dialog scegliere il foe al centro come bersaglio
      d'attacco → la card d'attacco, riquadro Inflict: prima riga quel foe con "(attack target)" e il bottone
      Shattered; le altre due righe con "(area)" e nessun Shattered.
- [ ] **Drifting Leaf**: Attack → Line 6 su due foe, bersaglio d'attacco il primo → Shattered solo sulla sua riga.
- [ ] **Blocco Area**: un'abilità con status nel blocco Area (Heave-Ho: "Characters caught in the area are shoved 1,
      and foes become vulnerable"; o Chaos Tarot) → Vulnerable / Sealed sulle righe "(area)", non sul bersaglio
      d'attacco.
- [ ] **Frasi per tutti**: Soul Shot con un Exceed (15+) → "Foes inside … are blinded": Blinded su tutte le righe,
      bersaglio d'attacco compreso; il Blinded dell'Effect ("Foe is blinded") solo sul bersaglio d'attacco.
- [ ] **Foe**: un foe con un'azione ad area che dà uno status al bersaglio → stessa divisione sulla card.
- [ ] **Senza area / un solo bersaglio**: attacco normale su un foe → riquadro Inflict come prima, senza le scritte
      "(attack target)" / "(area)".
- [ ] **Show in Chat**: Blackstar → Show in Chat con tre foe bersagliati → bottoni su tutte e tre le righe, il gruppo
      Effect etichettato "Effect · attack target only".

## R40 — Combo "instead of …" che sostituiscono solo una parte della base (16 ottobre 2026, versione 1.15.41)

Setup: PG Shade di prova con Umbra e Incubus (vanno bene anche quelli già sulla scheda: è solo codice), un combo
token; un foe sulla mappa come bersaglio.

- [ ] **Penumbra, Show in Chat**: con la combo di Umbra attiva, Show in Chat → la card si intitola "Penumbra (Umbra
      combo)" e ha un Effect (col segno della combo) "Teleport your foe up to 3 spaces towards you instead of
      teleporting yourself. A foe can save…" al posto di "You may teleport 3 before the attack"; c'è ancora "Effect:
      Your foe is blinded." e il bottone Inflict per Blinded. Nessuna riga "Combo — Penumbra" in cima.
- [ ] **Penumbra, attacco**: con la combo armata, attacco col bersaglio → la card d'attacco elenca l'Effect di
      Penumbra; Hit / Miss sono quelli di Umbra.
- [ ] **Succubus, Show in Chat**: con la combo di Incubus attiva → card "Succubus (Incubus combo)" con "Effect: deal 3
      damage to all characters marked by Incubus, and teleport them 2."; il blocco "Mark: Mark your foe…" non c'è,
      e nemmeno la riga "Combo — Succubus: Instead of the mark, gain…".
- [ ] **Succubus, niente Mark**: con la combo armata il tag Mark sparisce dai chip e non c'è il bottone Mark;
      disarmando la combo tornano tag, bottone e blocco Mark di Incubus.
- [ ] **Altre combo invariate**: The Hook (Low Blow) mostra ancora "Combo — The Hook" in cima con la base sotto;
      Sweet Torment / Indignation sostituiscono l'Effect come prima; Reap (Sow), Devil Hand (God Hand) e Dawn
      (Dervish) come prima.

## R39 — Testo dei Limit Break impaginato come nel libro (16 ottobre 2026, versione 1.15.40)

Setup: PG di prova; uno alla volta i Limit Break dal compendio Jobs (trascinati sulla scheda o dal cambio di job
primario). Per la migrazione: un mondo con un PG che aveva già Gigaflare o March of the Saints prima
dell'aggiornamento.

- [ ] **Gigaflare**: tab Combat → riquadro Limit Break → sotto il nome una riga "Divine, Unerring, True Strike" a sé;
      poi "**Effect:** You summon the eldflame…" (con [D] mostrato col dado del PG) e, a capo, "**Infuse 6:
      TETRAFLARE** Deal … twice instead.". Nessun "Divine, Unerring, True Strike." in testa all'effetto.
- [ ] **Helion / Mock**: la descrizione in corsivo sopra; due paragrafi "**Effect:**" separati (Helion), "**Effect:**"
      e "**Special:**" (Mock).
- [ ] **Elenchi**: Lycanthropy e Split Heaven and Hell mostrano le voci "•" una per riga; March of the Saints mostra
      Stance, Refresh e poi i quattro santi (Parzival, Leon, Angrboda, Farnese) uno per riga col nome in grassetto;
      Elemental mostra "Effect:", "While you are an Elemental:" e tre voci.
- [ ] **Altri blocchi**: Passage to the Afterlife ha "Attack:", "Exceed:", "Effect:" su righe diverse; High Prophecy e
      Paradiso "Aura:"; Death Sentence "Summon:", la riga "Severed Soul — Size 1…", "Summon Effect:" e l'ultima
      riga; Curtain Call ha la tabella 3–5 / 6–7 / 8 spaces una riga ciascuna; Cataclysm due "Effect:" e "Gain Delay:".
- [ ] **Card in chat**: "Use Limit Break" su Gigaflare → la card ha la stessa impaginazione del riquadro (tag, Effect,
      Infuse); con Tetraflare armato c'è ancora la riga dell'infusione sotto.
- [ ] **Scheda oggetto**: aprendo Gigaflare dal compendio (e il job template Enochian, sezione Limit Break) l'Effect è
      impaginato allo stesso modo.
- [ ] **Migrazione 25**: nel mondo con un Gigaflare / March of the Saints già sulla scheda, al primo avvio da GM la
      console dice "Migration 25: N limit break(s)…" e la scheda mostra le nuove righe.
- [ ] **Nulla cambiato nei numeri**: Damage Roll di Gigaflare, Gran Levincross e Cataclysm propone gli stessi danni di
      prima (Cataclysm: Hit [D]+fray, Other le esplosioni e 2[D]+fray); i bottoni area (Cataclysm "Area", Death
      Sentence "Line 4", Elemental "Aura 2") e Infuse funzionano come prima.

## R38b — Versioni Infuse dei Limit Break (16 ottobre 2026, versione 1.15.39)

Setup: PG Wright di prova in un combattimento, con Aether a 6 e Resolve a 8 (personale); uno alla volta i Limit Break
di Enochian (Gigaflare) e Spellblade (Gran Levincross); un foe sulla mappa come bersaglio. Prima al capitolo 1-2,
poi al capitolo 3.

- [ ] **Gigaflare, capitolo 1-2**: tab Combat → riquadro Limit Break → c'è il bottone "Infuse 6 — TETRAFLARE" (non
      quello di Meteor). Cliccandolo l'Aether scende da 6 a 0, in chat esce il messaggio "infuses Gigaflare —
      TETRAFLARE" e il bottone dice "— armed". Ricliccandolo l'Aether torna a 6.
- [ ] **Tetraflare nel danno**: con Tetraflare armato, Damage Roll → la finestra si intitola "Gigaflare — TETRAFLARE"
      e su Hit ha Instances 2, Divine spuntato; la card applica il danno due volte. Senza infusione: Instances 1.
- [ ] **Tetraflare nella card**: con Tetraflare armato, "Use Limit Break" spende 4 Resolve e la card dice "uses
      Gigaflare — TETRAFLARE!" con sotto la riga "Infuse 6 — TETRAFLARE (Limit Break): Deal [D]+fray twice instead.".
- [ ] **Meteor, capitolo 3**: compare anche "Infuse 8 — METEOR"; cliccandolo con 6 Aether esce l'avviso "needs 8
      Aether" e niente viene speso. Damage Roll → in Other c'è "METEOR — Special effect" con 999 divine.
- [ ] **Gran Levincross, capitolo 1-2**: bottone "Slay or Infuse 3 — RAGNARÖK"; Damage Roll → Other propone
      "Slay or Infuse 3 — RAGNARÖK" ([D]+fray divine) anche senza infusione (lo attiva lo Slay).
- [ ] **Götterdämmerung, capitolo 3**: bottone "Infuse 6 — GÖTTERDÄMMERUNG"; armato, Damage Roll → Other propone
      anche 2[D]+fray divine; disarmato non lo propone. Il danno Hit resta [D]+fray (non dice "instead").
- [ ] **Una sola infusione**: con Ragnarök armato, cliccare Götterdämmerung restituisce i 3 Aether di Ragnarök e
      spende i 6 di Götterdämmerung (ne resta armata una sola).
- [ ] **Abilità invariate**: i bottoni Infuse delle abilità del Wright (es. Pyre, "Infuse 3: PYROTIC") funzionano
      come prima.

## R38 — Aura e aree dei Limit Break sulla mappa (16 ottobre 2026, versione 1.15.38)

Setup: PG di prova con il token su una scena a griglia quadrata e, uno alla volta, i Limit Break di Freelancer
(Paradiso), Seer (High Prophecy), Stormbender (Elemental), Harvester (Death Sentence), Geomancer (Cataclysm), Fool
(Curtain Call); un foe sulla mappa.

- [ ] **Paradiso**: tab Combat → riquadro Limit Break → accanto a "Use Limit Break" c'è il bottone "Aura 2".
      Cliccandolo l'aura di 2 caselle compare attorno al token del PG, con il colore delle sue aure; muovendo il token
      l'aura lo segue. Ricliccando il bottone l'aura viene sostituita, non duplicata. A fine del turno successivo del PG
      l'aura sparisce ("until the end of your next turn").
- [ ] **High Prophecy / Elemental**: bottone "Aura 2"; High Prophecy sparisce all'inizio del turno successivo del PG,
      Elemental resta (tutto il combattimento).
- [ ] **Death Sentence**: bottone "Line 4"; si piazza come la Line delle abilità (accanto al PG, + / − e rotella come
      sempre) e targetta i token dentro.
- [ ] **Cataclysm**: bottone "Area"; cliccandolo chiede quale area: "Line (width 3)" o "Effect: Medium Blast". La Line
      chiede la lunghezza e si piazza ovunque sulla mappa (non solo accanto al PG); il Medium Blast si piazza ovunque.
- [ ] **Curtain Call**: bottone "Line", chiede la lunghezza (il risultato del gamble +2) prima di piazzarla.
- [ ] **Senza area**: Gigaflare, Mock, Helion, Passage to the Afterlife non hanno il bottone dell'area.
- [ ] **Resolve**: il bottone dell'area non spende Resolve (la spende solo "Use Limit Break").

## R37 — Tiro del danno dei Limit Break (16 ottobre 2026, versione 1.15.37)

Setup: PG di prova con, uno alla volta, i Limit Break di Enochian (Gigaflare), Sealer (Passage to the Afterlife),
Geomancer (Cataclysm), Knave (Mock), Bastion (Helion); un foe targettato sulla mappa.

- [ ] **Gigaflare**: tab Combat → riquadro Limit Break → accanto a "Use Limit Break" c'è "Damage Roll". Cliccandolo si
      apre la finestra del danno delle abilità con Hit "1[dX] + fray N", Divine, True Strike e Unerring già spuntati,
      Instances 1. Roll Damage → card del danno con il nome "Gigaflare" e il bottone Apply; Apply sul foe ignora
      l'armatura. La Resolve NON viene spesa dal Damage Roll (solo da "Use Limit Break").
- [ ] **Passage to the Afterlife**: Hit "[D] + fray" con Instances 3; Miss mostra "[D] + fray" e passa a Instances 1;
      Other offre "Limit Break" per l'Exceed ([D] + fray, Instances 2) e per i "2 additional divine damage" per
      alleato adiacente (fisso 2, Divine).
- [ ] **Cataclysm**: Hit "[D] + fray" divine; Other offre l'esplosione ([D] + fray, Area effect spuntato) e i 2[D] +
      fray per chi è preso da due o più esplosioni.
- [ ] **Ultimate dal capitolo 3**: con il PG al capitolo 1 o 2, Mock (Knave) non ha il bottone Damage Roll; portato
      al capitolo 3 compare, e Other offre "Ultimate" con + fray e Divine (Dread Mock: "also deals divine fray damage").
      Con Passage to the Afterlife al capitolo 3, Other offre anche "Ultimate" (2 divine, Instances 2).
- [ ] **Senza danno**: Helion, Paradiso, Abyssal Ecstasy, Split Heaven and Hell (danno in % degli hp) non hanno il
      bottone Damage Roll.
- [ ] **Abilità, Divine automatico**: Gentleness (Chanter, "1 divine damage") → Damage Roll dell'abilità apre con
      Divine spuntato (era tornato a non spuntarsi dalla 1.15.28).
- [ ] **Infuse non ancora**: Tetraflare / Meteor (Gigaflare) e Ragnarök / Götterdämmerung (Gran Levincross) non sono
      proposti: restano per R38; intanto si scrivono a mano in Other o con Instances.

## R32 — Dimensione dell'aura con + e − (15 ottobre 2026, versione 1.15.36)

Setup: un PG Chanter con Gentleness e la mastery sbloccata, un PG con un tratto ad aura (es. Shieldmaster); un foe
vicino, scena a griglia quadrata.

- [ ] **Avviso al piazzamento**: piazzare l'aura di Gentleness → l'avviso dice "… Mouse over it and press + or − to
      change its size (1 to 3)."
- [ ] **Allargare**: mouse sopra l'aura (anche con il livello Token attivo), premere + → l'aura passa a 2 caselle
      attorno al token, l'etichetta sulla mappa diventa "Aura 2 · Gentleness", l'avviso mostra "Aura 2 (Gentleness) —
      When you do, foes inside must save or be pacified."
- [ ] **Limiti del testo**: premere ancora + → Aura 3; ancora + → avviso "Aura 3 is already at its maximum (3)" e
      niente cambia; − fino ad Aura 1, poi − → "already at its minimum (1)".
- [ ] **Segue il token**: con l'aura a 3, muovere il token → l'aura lo segue con la nuova dimensione.
- [ ] **Senza limiti nel testo**: l'aura del tratto Shieldmaster va da 1 a 5 con + / −.
- [ ] **Senza mastery**: Gentleness con la mastery NON sbloccata, ripiazzare l'aura → l'avviso non scrive "(1 to 3)"
      e + / − vanno da 1 a 5.
- [ ] **Non interferisce**: con il mouse fuori dall'aura, o sopra una scheda, o scrivendo in un campo di testo
      (chat, scheda), + e − non cambiano nessuna aura; piazzando una Line, + e − cambiano ancora la sua larghezza.
- [ ] **Permessi**: da giocatore, + / − sull'aura di un altro PG non fanno nulla; il GM può cambiare qualsiasi aura.

## R31 — Mastery e talento in chat da soli (15 ottobre 2026, versione 1.15.35)

Setup: un PG Chanter con Symphony, un PG Sealer con Spirit Shrine; un foe sulla mappa.

- [ ] **Bottone solo se sbloccata**: anteprima di Symphony con la mastery NON sbloccata → nessuna riga Mastery, nessun
      bottone; spuntare "Mastery unlocked" → accanto a "Mastery:" compare un piccolo bottone con il fumetto.
- [ ] **Symphony**: clic sul bottone → in chat una card "Symphony" con sotto "Mastery: Crescendo", badge Chanter,
      Ch e "★ Mastery", e solo il testo "CRESCENDO: If you create four or more motes… range 5 as a free action as
      part of ending your turn…", senza Terrain Effect, Charge né talenti.
- [ ] **Spirit Shrine**: mastery sbloccata, clic sul bottone → card "Spirit Shrine" / "Mastery: Spirit Patronage" con
      l'interrupt Grace of the Spirits (Trigger ed Effect) leggibili; keyword con tooltip come nelle altre card.
- [ ] **Talento**: scegliere Talent I su Symphony → bottone accanto a "Talent 1:" ma non accanto a "Talent 2:" (con
      talento "none" nessun bottone sui talenti); clic → card "Symphony" / "Talent I" con solo il testo del talento.
- [ ] **Status**: con un'abilità la cui mastery o talento nomina uno status (es. un talento che "blessed" / "sealed"),
      la card ha i bottoni Inflict / Gain come le altre card.
- [ ] **Niente regressioni**: Show in Chat di Symphony posta ancora la card completa; Dervish con la mastery stampa
      ancora "Dervish + Dawn"; la combo alternativa di Felicity chiede ancora quale combo usare.

## R30 — Track target: un segno che non è un mark (15 ottobre 2026, versione 1.15.34)

Setup: un PG Sealer con Grand Banishment e una qualsiasi abilità con Mark (es. Divine Aegis), un PG Seer con The
Tower; due foe sulla mappa.

- [ ] **Bottone**: nell'anteprima di Grand Banishment e di The Tower c'è **Track target** (icona segnaposto); su
      Divine Aegis (mark) c'è solo Mark target, niente Track; su un'abilità qualunque senza "that foe's turn" (es.
      Sanctify) nessuno dei due.
- [ ] **Senza target / due target**: Track target senza token targettato o con due → avviso "Target exactly one
      token to track it", nessun segno.
- [ ] **Track**: targettare il foe A, Track target su Grand Banishment → in chat "<PG> tracks <A> — Grand
      Banishment (a reminder, not a mark)" col testo; sotto l'abilità compare il chip "A ✕"; nel tab Conditions di A
      la riga "Tracked: Grand Banishment — from <PG>" col testo; nel pannello status del token di A la riga
      "Tracked: Grand Banishment (<PG>)".
- [ ] **The Tower**: Track target su The Tower → il testo del segno contiene "Area Effect: At the end of that foe's
      turn, gamble…".
- [ ] **Non conta come mark**: con A tracciato da Grand Banishment, Mark target di Divine Aegis su A → il segno resta
      e il mark si aggiunge; poi Track target di nuovo su A → il mark di Divine Aegis resta.
- [ ] **Uno per abilità**: Track target di Grand Banishment sul foe B → il segno passa da A a B (chip aggiornato).
- [ ] **Rimozione**: ✕ sul chip (o "End mark" nel tab Conditions di B, o ✕ nel pannello status) → segno tolto, in
      chat "The tracker Grand Banishment on B ends.".
- [ ] **Sconfitta del PG**: PG a 0 HP → i suoi mark finiscono, il segno tracciato resta.
- [ ] **Fine combattimento**: terminare il combattimento → anche i segni tracciati spariscono.
- [ ] **Giocatore senza permessi sul foe**: da giocatore, Track target → "Tracker sent to the GM…" e il segno compare
      (GM connesso).

## R29 — Dervish: base e combo insieme con la mastery (15 ottobre 2026, versione 1.15.33)

Setup: un PG Chanter con Dervish (Mendicant), un alleato sulla mappa e targettato.

- [ ] **Senza mastery niente cambia**: mastery non sbloccata, token spento → Show in Chat posta Dervish normale;
      token acceso → posta "Dawn (Dervish combo)" con il solo Effect di Dawn, e il token si spegne.
- [ ] **Con la mastery, senza token**: sbloccare la mastery, token spento → Show in Chat posta "Dervish + Dawn" con
      badge COMBO: Effect di Dervish (fly 1, whisk), Charge (second ally), poi "Dawn — Effect" (aura 1, +1 boon sui
      save) col fulmine, e la riga ★ Mastery. Il token resta spento.
- [ ] **Con la mastery e il token acceso**: stessa card "Dervish + Dawn"; il token si spegne come per ogni combo.
- [ ] **Scheda**: mastery sbloccata, token acceso → nell'anteprima dell'abilità il testo base di Dervish non è
      barrato (senza mastery lo è).
- [ ] **Le altre combo non cambiano**: con il token acceso, God Hand (Devil Hand) e Sow (Reap) postano ancora solo
      la versione combo, con o senza mastery.

## R28 — Combo alternativa data dalla mastery (15 ottobre 2026, versione 1.15.32)

Setup: un PG Chanter con Felicity, un Harvester con Rot, un Sealer con God Hand (Talent I o II scelto) e Justice; un
foe e un alleato sulla mappa. Token combo acceso col bottone COMBO.

- [ ] **Senza mastery niente cambia**: Felicity con la mastery non sbloccata, token acceso → Show in Chat posta Fleet
      come prima, nessuna finestra.
- [ ] **Felicity, scelta allo Show in Chat**: sbloccare la mastery, token acceso → Show in Chat apre la finestra
      "Felicity — choose the combo" con i bottoni "Fleet" e "Fantasia". Fantasia → card "Fantasia (Felicity combo)"
      con "2 actions." in testa e gli Effect/Special di Fantasia; il token si spegne.
- [ ] **Fleet resta disponibile**: riaccendere il token → Show in Chat chiede di nuovo; Fleet → card "Fleet
      (Felicity combo)" come prima.
- [ ] **Chiudere la finestra annulla**: token acceso, Show in Chat, chiudere la finestra con la X → nessuna card,
      il token resta acceso.
- [ ] **God Hand, attacco**: token acceso, mastery sbloccata, target sul foe → Attack chiede Devil Hand / Fists of
      Heaven And Hell; Fists → card d'attacco "Fists Of Heaven And Hell (God Hand combo)" con +1 boon, Teleport,
      Seal + bless, esplosione da 1 divine, Exceed "Repeat all effects", e il talento scelto (Exceed: evasion o Slay)
      come per Devil Hand. Il tiro di danno subito dopo non chiede di nuovo e usa [D]+fray.
- [ ] **Scelta ricordata**: dopo il punto sopra (token ancora acceso), Show in Chat di God Hand non chiede di nuovo e
      posta Fists; la scheda, con il token acceso, mostra il testo di Fists nella riga Combo.
- [ ] **Justice**: mastery sbloccata, token acceso → Show in Chat chiede Judgement / Gran Judicata; Gran Judicata →
      card con Interrupt 1, Trigger e l'Effect da 4 divine; nessun bottone Gamble (è di Judgement).
- [ ] **Rot, bottone Regrowth**: mastery sbloccata → nel pannello di Rot tre bottoni Mark: "Mark target", "Mark
      target (Regenerate)", "Mark target (Regrowth)". Targettare un alleato → Regrowth mette un mark con il testo di
      Regrowth; la chip mostra "(Regrowth)"; i mark di Rot e Regenerate restano dove sono.
- [ ] **Rot, Show in Chat**: token acceso → scelta Regenerate / Regrowth; Regrowth → card "Regrowth (Rot combo)" con
      il Mark di Regrowth.
- [ ] **Reset**: scelta fatta, poi spegnere e riaccendere il token col bottone → al prossimo uso la finestra torna;
      lo stesso a fine turno (passare il turno) e a fine combattimento.
- [ ] **Altre combo intatte**: un'abilità combo senza combo alternativa (es. Holy → Hades) con il token acceso non
      apre nessuna finestra.

## R27 — Damage Utility sulla scheda PG (15 ottobre 2026, versione 1.15.31)

Setup: un PG con job (dado d10, fray noto) e un foe sulla mappa con un po' di armatura; un secondo foe per l'area.

- [ ] **Riquadro**: tab Combat della scheda PG, in fondo sotto Resolve → riquadro "Damage Utility" con descrizione
      ("[D] = d10") e bottone. Una scheda aperta solo in lettura non mostra il bottone.
- [ ] **Finestra**: bottone → finestra del danno con banda del PG, titolo "Damage Utility", nessuna riga
      Hit/Crit/Miss/Area, subito i campi Source, Dice, Fixed damage, + Fray, Area effect; il campo Dice dice
      "[D] = d10".
- [ ] **Niente danno**: Roll Damage con tutto a zero → avviso "Damage Utility: no damage entered.", nessuna card.
- [ ] **Dadi + fray**: target sul foe (T), Dice 2 + Fray → anteprima "2[d10] + fray N"; Roll Damage → card
      "Damage Utility — Other damage" con 2d10 + fray; Apply toglie l'armatura del foe e scala gli HP.
- [ ] **Source**: scrivere "Counter" in Source, Fixed damage 3 → card "Damage Utility — Counter damage", 3 danni.
- [ ] **Tipi**: Fixed 2 + Divine → Apply ignora l'armatura e il Vigor; Pierce → ignora solo l'armatura.
- [ ] **Istanze**: Fixed 3, Instances ×3 → anteprima "(3) × 3 instances"; Apply applica tre volte con l'armatura
      ogni volta (su un mob, un colpo per istanza).
- [ ] **Area**: due foe targettati, uno con Dodge, Area effect spuntato → il foe con Dodge non prende danno su Apply;
      con True Strike spuntato sì.
- [ ] **Modificatori**: Bonus dice, Vulnerable, Resistance, Weakened funzionano come nella finestra delle abilità.
- [ ] **Senza target**: nessun token targettato → la finestra lo dice; la card viene comunque postata (come i tiri
      delle abilità senza target).
- [ ] **Nessuna regressione**: Damage Roll di un'abilità e degli attacchi base → finestra come prima (righe
      Hit/Crit/Miss/Area/Other, niente campo Source); Other ancora con le righe di talento/mastery; finestra del
      danno di un foe e di una legend invariata.

## R26 — [D] mostrato con il dado del personaggio (15 ottobre 2026, versione 1.15.30)

Setup: un PG con job primario e dado d10 (es. Freelancer) e un'abilità che dice "[D]+fray" e una che dice "2[D]"
(es. un attacco con On hit: 2[D]+fray); un PG nuovo senza job; un foe con un'azione che dice [D].

- [ ] **Anteprima**: tab Combat, aprire l'anteprima dell'abilità → "On hit: 2d10+fray" invece di "2[D]+fray", e
      "d10+fray" dove il testo dice "[D]+fray".
- [ ] **Tooltip**: mouse su "2d10" → tooltip "2[D] = 2d10 (your damage die is d10). Your class damage die …".
- [ ] **Talento / mastery / combo**: un [D] nel talento scelto, nella mastery sbloccata o nel testo combo è
      convertito anche lì.
- [ ] **Show in Chat**: la card in chat mostra "2d10" con lo stesso tooltip.
- [ ] **Card dell'attacco**: Attack Roll dell'abilità → le righe Hit / Miss della card mostrano i dadi veri. Attacco
      base leggero → "d10 + fray", pesante → "2d10 + fray".
- [ ] **Cambio dado**: cambiare il dado del PG (es. a d6) → l'anteprima passa a "2d6"; le card già postate restano
      come erano.
- [ ] **Senza job**: PG senza job → l'anteprima continua a dire "2[D]".
- [ ] **Fuori dalla scheda**: aprire la stessa abilità dalla scheda dell'item o dal compendio → resta "[D]"; azione
      di un foe / legend (anteprima e Show in Chat) → resta "[D]".
- [ ] **Damage roller**: la finestra del danno funziona come prima (dado mostrato, tiro corretto).

## R25 — Bottone Gamble sulle abilità (15 ottobre 2026, versione 1.15.29)

Setup: un PG Knave (Stalwart) con Riposte equipaggiata e qualche carica di Vigilance; un PG Fool (Vagabond) con
un'abilità gamble (es. Spinning Top) e un'abilità con tabella 1-6 se disponibile (es. Chaos Tarot, Monogatari); tab
Combat, anteprima dell'abilità aperta.

- [ ] **Bottone**: Riposte → nell'anteprima c'è il bottone **Gamble** accanto a Show in Chat; un'abilità senza gamble
      (es. Provoke) non lo ha.
- [ ] **Tiro base**: Gamble → la finestra mostra Dice = 1 e "1d6"; Gamble → card in chat con un dado e "gamble result".
- [ ] **Dadi in più**: Dice a 3 con + → anteprima "3d6, keep the highest"; la card mostra 3 dadi, il più alto
      evidenziato in verde, e il risultato è quel dado (non la somma).
- [ ] **Vigilance (Dire Parry)**: con 2 cariche, campo "Vigilance charges spent" presente; metterlo a 2 → si tirano
      Dice + 2 dadi, la card dice "(2 from Vigilance)" e "2 Vigilance charges spent", e il tracker scende di 2. Su
      un'abilità che non parla di Vigilance il campo non c'è.
- [ ] **Stacked Die (Fool)**: con 1 Stacked Die acceso sul tratto Stack Dice → opzione "Stacked Die" presente;
      sceglierla → nessun tiro, risultato 6, il pip del tratto si spegne. Senza Stacked Die l'opzione non c'è.
- [ ] **Set the number**: scegliere "Set the number" → appare il campo Number; impostarlo a 4 → card con risultato 4
      e nessun dado tirato.
- [ ] **Tabella 1-6**: su un'abilità con tabella numerata, Gamble → sotto il risultato la card mostra la riga di quel
      numero.
- [ ] **Card Show in Chat**: Show in Chat di Riposte → la card ha in fondo il bottone dorato Gamble, che apre la stessa
      finestra. Da un altro utente che non possiede il PG il bottone è disattivato.
- [ ] **Dice So Nice** (se attivo): il tiro mostra i dadi 3D; con Stacked Die o numero fissato non parte nessuna
      animazione.

## R24 — Più istanze dello stesso danno nel tiro del danno (15 ottobre 2026, versione 1.15.28)

Setup: un mondo con un PG qualunque e un foe Pepperbox (Skirmisher, p.302, reimportato dal compendio) sulla scena,
più due token bersaglio: uno con Armor 2 (o un PG con armatura) e uno con lo status Vulnerable; un foe mob; tab Combat.

- [ ] **Precompilato dal testo**: dalla scheda del Pepperbox, danno di Riddle → Outcome Hit → Instances ×N vale **3**;
      passare a Miss → torna a **1**; di nuovo Hit → 3. L'anteprima dice "(3 + …) × 3 instances".
- [ ] **Card**: Roll Damage con Hit → la card mostra il danno di una istanza, una riga finale "× 3 instances (each
      applied separately)" e sotto il totale "3 damage, 3 times"; i bottoni dicono "Apply 3 ×3".
- [ ] **Armor per istanza**: Apply sul bersaglio con Armor 2 → applica 1 + 1 + 1 = 3 (non 9 − 2 = 7); una sola nota
      "Damage Applied" con "3 of 3 instances: 1 + 1 + 1, 6 blocked by Armor".
- [ ] **Vulnerable per istanza**: stesso tiro con Vulnerable spuntato nella finestra → la card dice 4 per istanza;
      Apply su un bersaglio senza armor → 12 (4 + 4 + 4), non 10.
- [ ] **Weakened per istanza**: Weakened spuntato → ogni istanza perde 2 (3 → 1, totale 3 su bersaglio senza armor).
- [ ] **½ per istanza**: bottone ½ (o un bersaglio in Cover) → ogni istanza dimezzata a parte, arrotondando per
      eccesso (3 → 2, totale 6); la nota dice "each halved".
- [ ] **Mob**: Apply ×3 su un mob → perde 3 hit, il bottone dice "✓ −3 hits".
- [ ] **Bersaglio che cade**: un foe con pochi HP (es. 4) e Apply ×3 da 3 → si ferma alla seconda istanza; la nota
      dice "2 of 3 instances … stopped: the target is down".
- [ ] **A mano**: danno di un'abilità del PG senza "times" → Instances 1, card e Apply come prima; mettere 2 con il
      − / + → card "× 2 instances", Apply due volte. Il campo non scende sotto 1 né sale sopra 10.
- [ ] **Other**: esito Other, Fixed damage 1, Divine, Instances 3 (Chastise, p.179) → card "1 damage, 3 times",
      Apply ignora l'armor e dà 3.
- [ ] **Giocatore senza permessi**: un giocatore che applica ×3 a un foe → al GM arrivano 3 applicazioni (3 note in
      chat dal lato del GM), il bottone dice "→ Sent to GM".

## R23 — Opzione "Other" nel tiro del danno per il danno delle mastery (15 ottobre 2026, versione 1.15.27)

Setup: un mondo con un PG Harvester con Harvest e un PG Demon Slayer con Draken Cross (vanno bene copie aggiunte prima
dell'aggiornamento), i loro token e due o tre token foe su una scena, uno con lo status Dodge; tab Combat.

- [ ] **Other sempre presente**: bottone del danno di qualunque abilità (anche Light Attack) → nella riga Outcome c'è
      **Other**; sceglierlo apre sotto un pannello con Dice, Fixed damage, + Fray, Area effect; tornare su Hit lo
      chiude.
- [ ] **Harvest**: sbloccare la mastery Harvest Moon → danno di Harvest → Other → c'è la scelta rapida "Mastery
      2 flat piercing · area" (passandoci sopra si legge il testo della mastery); cliccarla → Fixed damage 2, Area
      effect e Pierce spuntati; Roll Damage → card "Harvest — Mastery damage (area)" con 2 danni.
- [ ] **Draken Cross**: sbloccare Dark Wind Devil Blade → Other → scelta rapida "Mastery 2 flat divine · area" → spunta
      Divine; il tiro dà 2. Con Talent I scelto c'è anche "Talent I fray N · area" (fray damage again).
- [ ] **Mastery bloccata**: togliere la mastery → in Other non c'è più la sua scelta rapida (restano i campi liberi).
- [ ] **Campi liberi**: Other senza scelta rapida, Dice 1 + Fray → l'anteprima mostra "1[d…] + fray N" e il tiro
      corrisponde; card "… — Other damage".
- [ ] **Dodge**: Other con Area effect spuntato su un foe con Dodge → al momento di Apply è immune (chip "Dodge —
      immune"); senza Area effect il danno passa.
- [ ] **Hit / Area invariati**: su Harvest, Hit e Area tirano come prima (2[D]+fray e fray), con due foe bersagliati
      la finestra chiede ancora il bersaglio dell'attacco.
- [ ] **Foe / legend**: bottone danno di un'azione foe e di una legend → c'è Other con i soli campi liberi e il tiro
      funziona.
- [ ] **Danno solo da talento**: Rot con Talent II scelto ("take 2 piercing damage") → c'è il bottone Damage Roll e in
      Other c'è la scelta rapida "Talent II 2 flat piercing".

## R22 — Voce FAQ sulle difficoltà dei tiri narrativi (15 ottobre 2026, versione 1.15.26)

Setup: un mondo qualsiasi; aprire la Quick Guide (bottone sulla scheda del PG) → tab FAQ.

- [ ] **Voce presente**: nella sezione Narrative, dopo "What is the difference between 'aid' and 'set up?'", c'è
      "What are the difficulties of a narrative roll? Trivial, risky (standard), heroic?" con la risposta su
      controlled / risky / desperate (p.18), conseguenze e strain 1, 2, 4 (p.29), fortune roll (p.20) ed effetto
      superpowered (pp.18-19).
- [ ] **Ricerca**: nel campo di ricerca della guida scrivere "trivial", poi "heroic", poi "desperate" → la voce resta
      visibile ogni volta.
- [ ] **Aspetto**: i grassetti e gli a capo della risposta si vedono come nelle altre voci, senza tag HTML scritti in
      chiaro.

## R21 — Con la mastery di Dropkick il tiro del danno propone l'Area (15 ottobre 2026, versione 1.15.25)

Setup: un mondo con un PG Colossus (Stalwart) con Dropkick (va bene una copia aggiunta prima dell'aggiornamento), il
suo token e due o tre token foe su una scena; tab Combat.

- [ ] **Mastery sbloccata**: sbloccare Giant Kicker su Dropkick → premere il bottone del danno di Dropkick → nella
      finestra ci sono Hit, Crit e **Area**; Area mostra "fray N" e il tiro esce con la sola fray.
- [ ] **Hit invariato**: nella stessa finestra Hit mostra ancora "1[d…] + fray N".
- [ ] **Bersaglio dell'attacco**: con due o più foe bersagliati la finestra chiede quale è il bersaglio dell'attacco
      ("the others get a separate Area roll").
- [ ] **Mastery bloccata**: togliere la mastery → la finestra torna a Hit e Crit, niente Area.
- [ ] **Altre abilità con la stessa causa**: Sow con Spectral Scythe sbloccata → Area "2 flat", e scegliendo Area si
      spunta Pierce; Upheaval con Talent I scelto → il bottone Damage c'è e Area mostra "2 flat"; senza talento il
      bottone Damage non c'è.
- [ ] **Invariati**: Harvest e Draken Cross con la mastery sbloccata mostrano la stessa Area di prima (Fray); God Hand
      con la mastery sbloccata non ha l'opzione Area.

## R20 — L'Arc 4 della mastery di Sow si piazza dal bersaglio (15 ottobre 2026, versione 1.15.24)

Setup: un mondo con un PG Harvester (Mendicant) con Sow e la mastery Spectral Scythe sbloccata (va bene una copia
aggiunta prima dell'aggiornamento), il suo token e almeno tre token foe/alleati su una scena a griglia quadrata;
tab Combat.

- [ ] **Bottone senza combo**: senza combo token, Sow ha il bottone area "Arc 4".
- [ ] **Bottone con REAP**: prendere il combo token (Sow passa alla versione REAP) → il bottone "Arc 4" c'è ancora.
- [ ] **Arco dal bersaglio**: bersagliare (T) un solo foe a 4 spazi → premere "Arc 4" → il primo spazio si può
      mettere solo accanto al foe bersagliato (anche dalla parte opposta, a 5 spazi dall'Harvester); lo spazio del
      foe e quello dell'Harvester non si possono dipingere; dopo 4 spazi l'arco si chiude e i bersagli diventano i
      token dentro l'arco.
- [ ] **Senza bersaglio**: togliere i bersagli e premere "Arc 4" → avviso "This area is drawn from your target…" e
      l'arco si piazza come prima (primo spazio entro range 4 dall'Harvester). Con due bersagli: stesso avviso.
- [ ] **Il tiro d'attacco tiene il bersaglio**: senza archi sulla mappa, bersagliare un foe e premere l'attacco di
      Sow → nessuna richiesta di piazzare l'arco, la card auto-hit esce e il bersaglio resta il foe scelto.
- [ ] **Mastery bloccata**: togliere la mastery → nessun bottone area su Sow.
- [ ] **Altre aree solo nel testo**: un Ace (o un'altra abilità con l'area solo nel talento, es. Exorcism Talent II)
      con il talento scelto ha il bottone area con la forma del testo (Medium Blast / Large Blast); senza il talento
      scelto non lo ha.
- [ ] **Invariati**: Death Blossom (Burst 1 / con la combo Arc 4 e Arc 8), Flying Sleeves e Draken Cross offrono le
      stesse aree di prima; il tiro d'attacco di Death Blossom piazza ancora l'area.

## R19c — I tratti che danno un'aura hanno il bottone area (15 ottobre 2026, versione 1.15.23)

Setup: un mondo con un PG Bastion (Stalwart) con il tratto Shieldmaster e un PG Stormbender con Pelagic Rage
(vanno bene i tratti già sulle schede), un token di ciascuno su una scena a griglia quadrata; tab Combat.

- [ ] **Bottone su Shieldmaster**: sezione Traits → nell'intestazione di Shieldmaster, accanto al bottone chat, c'è
      un bottone "Aura 1" con lo stesso stile del bottone area delle abilità.
- [ ] **Piazzamento**: premerlo → l'aura 1 compare attorno al token del Bastion, la notifica dice "Aura 1 placed
      around <nome>; it follows the token" (senza durata tra parentesi).
- [ ] **Segue il token**: muovere il Bastion → l'aura si sposta con lui.
- [ ] **Resta tra i turni**: con un combattimento avviato, passare il turno del Bastion e tornare al suo turno →
      l'aura è ancora lì, nessuna card "… ends" in chat.
- [ ] **Ripremere**: premere di nuovo il bottone → la vecchia aura sparisce, ne resta una sola.
- [ ] **Pelagic Rage**: sulla scheda dello Stormbender il tratto ha il bottone "Aura 2" → piazza un'aura 2 attorno al
      suo token (il "round 5" del testo lo decide il giocatore: il bottone c'è sempre).
- [ ] **Tratto bloccato**: con un PG di capitolo più basso di quello del tratto (badge "Locked") → niente bottone.
- [ ] **Altri tratti invariati**: i tratti senza aura (es. Sea Legs, Dash on the Rocks) non hanno il bottone; le aure
      delle abilità (Rook, Endless Battlement sull'alleato) funzionano come prima.

## R19b — L'aura di Endless Battlement va sull'alleato (15 ottobre 2026, versione 1.15.22)

Setup: un mondo con un PG Bastion (Stalwart) con Endless Battlement (va bene una copia aggiunta prima
dell'aggiornamento) e almeno due altri token alleati sulla scena a griglia quadrata; tab Combat; un combattimento
avviato per la durata.

- [ ] **Alleato bersagliato**: bersagliare (T) un alleato entro 4 spazi → bottone area "Aura 1" di Endless
      Battlement → l'aura 1 compare attorno al token dell'alleato, non attorno al Bastion; la notifica dice
      "Aura 1 placed around <alleato>".
- [ ] **L'aura segue l'alleato**: muovere l'alleato → l'aura si sposta con lui; muovere il Bastion → l'aura resta
      ferma sull'alleato.
- [ ] **Durata**: la notifica e il conto alla rovescia sono "until the start of your next turn" del Bastion: all'inizio
      del turno del Bastion arriva in chat la card "… ends" con il bottone Remove area.
- [ ] **Refresh**: bersagliare un altro alleato e ripremere il bottone area → la vecchia aura sparisce, la nuova è
      attorno al nuovo alleato.
- [ ] **Nessun bersaglio**: togliere tutti i target → bottone area → avviso "target that ally's token…" e aura attorno
      al Bastion (come prima).
- [ ] **Più bersagli**: due alleati bersagliati → avviso "target only that ally's token…" e aura attorno al Bastion.
- [ ] **Fuori range**: bersagliare un alleato a più di 4 spazi → avviso "beyond range 4" ma l'aura si piazza sul
      suo token. Con la mastery Perfect Battlement sbloccata l'avviso non compare.
- [ ] **Altre aure invariate**: Rook, Dark Knight (mastery), Gentleness con un alleato bersagliato → l'aura resta
      attorno a chi la usa, nessun avviso.

## R19 — Le aure scritte nel testo danno il tag e l'area (15 ottobre 2026, versione 1.15.21)

Setup: un mondo con un PG Chanter (Mendicant) con Dervish, un PG Knave (Stalwart) con Dark Knight e Bleak Mercy, un
PG Bastion (Stalwart) con Endless Battlement (vanno bene copie aggiunte prima dell'aggiornamento); token sulla scena a
griglia quadrata; tab Combat.

- [ ] **Dervish senza talento**: nessun tag Aura e nessun bottone area (come prima).
- [ ] **Dervish Talent I**: scegliere il Talent I → compare la chip "Aura 1" evidenziata (tooltip "From Talent I: …")
      e il bottone area "Aura 1" → cliccarlo → aura 1 attorno al token di chi la usa, senza domande sulla dimensione,
      con la durata "until the start of your next turn". Con il Talent II non c'è.
- [ ] **Dervish DAWN**: armare la combo → chip "Aura 1" e bottone area; l'aura dura fino alla fine del turno dopo.
- [ ] **Dark Knight**: mastery bloccata → niente aura; sbloccarla → chip "Aura 1" (From Mastery) e bottone area →
      aura 1 attorno al token, senza scadenza.
- [ ] **Bleak Mercy**: senza combo nessuna aura; armare Sweet Torment → chip "Aura 1" (From Combo) e bottone area →
      aura 1 attorno al token; il tiro d'attacco non chiede di scegliere l'aura come area dell'attacco.
- [ ] **Endless Battlement**: il tag mostra "Aura 1" → bottone area → aura 1 piazzata subito, senza chiedere la
      dimensione (resta attorno a chi la usa: lo spostamento sull'alleato è R19b). Con la mastery sbloccata non
      compare la scelta tra "Aura 1" e "Base: Aura".
- [ ] **Altre aure col tag senza numero**: Rook → Aura 1, Strength of the Pack / Nightmare → Aura 2, senza domande.
- [ ] **Aure già a posto**: Gentleness (Aura 1) e Gravebirth (Aura 2) come prima.

## R18 — La mastery di Intimidate propone Unstoppable (15 ottobre 2026, versione 1.15.20)

Setup: un mondo con un PG Knave (Stalwart) con Intimidate (va bene anche una copia aggiunta prima dell'aggiornamento);
almeno un foe sulla scena; tab Combat.

- [ ] **Senza mastery**: Intimidate con la mastery bloccata → usare / Show in Chat → nessun bottone "Gain Unstoppable"
      (le note di rush / shove restano come prima).
- [ ] **Con mastery**: sbloccare la mastery Iron Skull → usare l'abilità → nella card c'è il bottone "Gain Unstoppable"
      (su di sé) con la durata "until the end of your next turn" e la frase della mastery nel tooltip / promemoria.
- [ ] **Applicare**: cliccare il bottone → il PG riceve Unstoppable (icona sul token e nel tab Conditions).
- [ ] **Circle the Oak**: un PG Warden (Vagabond) con Circle the Oak e il Talent II scelto → la card ha il bottone
      "Gain Evasion" (su di sé, until the end of your next turn); con il Talent I non c'è.
- [ ] **Altre abilità**: un'abilità che già dava un "Gain" (es. God Hand col Talent I, "Gain evasion…") lo dà come
      prima.

## R17 — Polaris può marcare un personaggio col Talent I (15 ottobre 2026, versione 1.15.19)

Setup: un mondo con un PG Seer (Mendicant) con Polaris (va bene anche una copia aggiunta prima dell'aggiornamento);
almeno un token di un altro personaggio sulla scena; tab Combat.

- [ ] **Senza talento**: Polaris senza talento scelto → nessun bottone Mark, tag come prima (Range 5, Terrain
      Effect, Gamble).
- [ ] **Talent I**: scegliere il Talent I → compare la chip "Mark" evidenziata (tooltip "From Talent I: You can cause
      one of your Polaris to follow a character…") e il bottone Mark.
- [ ] **Marcare**: bersagliare un token (T) → bottone Mark → il personaggio riceve il mark di Polaris, che compare
      tra i mark dell'abilità e nel tab Conditions; la ✕ lo toglie.
- [ ] **Talent II**: passare al Talent II → la chip Mark e il bottone spariscono.
- [ ] **Con la mastery**: Talent I + mastery Moon Silver Princess sbloccata → ci sono sia "Free Action" sia "Mark" e il
      bottone Mark resta.
- [ ] **Party Favor**: un PG Fool con Party Favor e la mastery Amico sbloccata → chip Mark e bottone Mark presenti;
      senza mastery non ci sono.
- [ ] **Altre abilità con mark**: un'abilità che marca già di suo (es. Sisyphus) ha il bottone Mark come prima.

## R16 — I talenti compaiono nella card dell'attacco (15 ottobre 2026, versione 1.15.18)

Setup: un mondo con un PG Sealer (Mendicant) con God Hand equipaggiata (va bene anche una copia aggiunta prima
dell'aggiornamento); almeno un foe come bersaglio; tab Combat. Per vedere l'Exceed serve un tiro di 15+ (aggiungere
boon se serve).

- [ ] **Base con Talent I**: God Hand con Talent I, senza combo token → attacco con 15+ → nel riquadro "Exceed (15+)"
      c'è "You and allies in range 2 gain 3 vigor." e sotto "Talent I: Gain evasion until the end of your next turn."
- [ ] **Sotto 15**: stesso attacco con un tiro sotto 15 → il riquadro Exceed (con la riga del talento) non compare.
- [ ] **Devil Hand con Talent I**: con il combo token → attacco → titolo "Devil Hand (God Hand combo)"; l'Exceed (15+)
      dice "Repeat the effect." e sotto "Talent I: Gain evasion…". I riquadri viola della combo sono come prima.
- [ ] **Talent II**: passare a Talent II → attacco base e attacco con combo token → in entrambe le card ci sono un
      riquadro "Talent II: Increase teleports to 2" e uno "Slay (Talent II): gain or lose a combo token."
- [ ] **Senza talento**: con nessun talento scelto la card dell'attacco è come prima (nessuna riga "Talent").
- [ ] **Altra abilità**: un'abilità d'attacco qualsiasi con un talento sbloccato (es. uno che dà +1 boon) → la card
      dell'attacco mostra il riquadro "Talent I"/"Talent II" con il testo del talento.
- [ ] **Show in Chat**: la card dello Show in Chat di God Hand / Devil Hand è come prima.

## R15 — Il tiro del danno spunta Divine e Pierce dal testo (15 ottobre 2026, versione 1.15.17)

Setup: un mondo con un PG Chanter (Mendicant) con Gentleness (va bene anche una copia aggiunta prima
dell'aggiornamento); un foe con un'azione a danno piercing (es. Veridian Weapon — Gatling Cannons, o Demolisher —
Battle Roar); tab Combat.

- [ ] **Gentleness**: il bottone del danno di Gentleness apre il dialog con **Divine** già spuntato; l'anteprima dice
      "1 → divine — nothing reduces it".
- [ ] **Si può togliere**: togliendo la spunta a Divine e tirando, la card non tratta il danno come divine.
- [ ] **Piercing**: il tiro del danno dell'azione piercing del foe apre con **Pierce** già spuntato.
- [ ] **Per risultato**: su un'abilità dove solo l'area è divine/piercing (es. Gran Levincross o Helix Heel, se a
      portata), passando da Hit ad Area la spunta segue il risultato scelto.
- [ ] **Danno normale**: un attacco normale (es. [D]+fray) apre con Divine e Pierce vuoti come prima.
- [ ] **Provoke**: il danno di Provoke propone ancora 2 e NON spunta Pierce (il piercing è quello subito, p.142).

## R14 — Provoke propone il danno giusto (15 ottobre 2026, versione 1.15.16)

Setup: un mondo con un PG Knave (Stalwart) con Provoke (va bene anche una copia aggiunta prima dell'aggiornamento) e
almeno un foe adiacente; tab Combat.

- [ ] **Danno proposto**: usando Provoke, il tiro/la card del danno propone 2 danni (non 1) da infliggere ai foe
      adiacenti.
- [ ] **Testo invariato**: sulla scheda e nella card in chat il testo di Provoke dice ancora "each adjacent foe deals 1
      piercing damage to you" e "You then deal 2 damage" (p.142).
- [ ] **Nient'altro cambiato**: un'altra abilità con danno fisso (es. Talent II di Provoke o un'abilità con "deal 2
      damage to them") propone lo stesso danno di prima.

## R13 — Superbolide della Tower fedele al libro (15 ottobre 2026, versione 1.15.15)

Setup: un mondo con un PG Seer (Mendicant) con The Tower aggiunta PRIMA dell'aggiornamento (per la migrazione 24) e
un'altra copia trascinata dal compendio Jobs DOPO; tab Combat.

- [ ] **Migrazione**: al primo avvio dopo l'aggiornamento, in console (F12) compare "Migration 24: … The Tower's
      mastery …" e la copia vecchia ha lo stesso testo di quella nuova.
- [ ] **Testo della mastery**: sulla scheda, nella card in chat (Show in Chat) e nella scheda dell'abilità la mastery
      Superbolide dice "…they take double damage from Eclipse's meteor effect, and the effect also ignores
      defiance." (come a p.203).
- [ ] **Nient'altro cambiato**: Talent I e II, Attack, Area Effect e Terrain effect di The Tower sono come prima;
      usando l'abilità il danno proposto e lo status sealed sono gli stessi di prima.

## R12 — Eclipse e Raging Wolf con gli elenchi a righe (15 ottobre 2026, versione 1.15.14)

Setup: un mondo con un PG Seer (Mendicant) con Eclipse e un PG Colossus (Stalwart) con Raging Wolf, aggiunte PRIMA
dell'aggiornamento (per la migrazione 23) e altre due copie trascinate dal compendio Jobs DOPO; tab Combat.

- [ ] **Migrazione**: al primo avvio dopo l'aggiornamento, in console (F12) compare "Migration 23: … Eclipse / Raging
      Wolf …" e le copie vecchie hanno lo stesso aspetto di quelle nuove.
- [ ] **Eclipse, anteprima sulla scheda**: nel blocco "End your turn and create a Terrain Effect" dopo "…standing in
      that space:" ci sono due righe con il pallino in oro ("If there is, …" e "If there isn't, …"), poi "Then, end
      the effect." a capo, come testo normale e non dentro l'ultima riga.
- [ ] **Raging Wolf, anteprima sulla scheda**: ordine Special (no effect if not bloodied) → Comeback → Heroic →
      Special (defeated); nel Comeback, dopo "…takes place in order.", tre righe con "Bloodied:", "25% or lower:",
      "1 hp or lower:" in grassetto.
- [ ] **Show in Chat**: le card delle due abilità mostrano gli stessi elenchi a righe, senza paragrafi vuoti.
- [ ] **Scheda dell'abilità** (doppio clic): la descrizione di Eclipse e il campo Comeback di Raging Wolf sono a
      righe; aprendo la modifica il testo ha una voce per riga, e salvando senza cambiare niente resta uguale.
- [ ] **Già a capo prima**: il Limit Break Lycanthropy (Warden) e Split Heaven and Hell (Demon Slayer) ora mostrano le
      loro voci "•" una per riga.
- [ ] **Nessun cambiamento altrove**: un foe con "•" scritti in linea (es. Imperial Spy, Relict) e un'abilità senza
      elenco restano come prima; i tooltip delle keyword (sealed, slashed, shove, dangerous terrain) funzionano
      dentro le righe.
- [ ] **Automazioni**: usando Raging Wolf e Eclipse gli status proposti (slashed, sealed) sono gli stessi di prima.

## R11 — Tabelle 1-6 una riga per risultato (15 ottobre 2026, versione 1.15.13)

Setup: un mondo con un PG Chanter (Mendicant) con Monogatari e un PG Seer con Chaos Tarot (anche copie già sulle
schede prima dell'aggiornamento); tab Combat. Un foe Troll (o Hag / Shopkeep / Diviner) sulla scena.

- [ ] **Monogatari, anteprima sulla scheda**: nel blocco Effect, dopo "…once per song.", i sei racconti sono su sei
      righe, numero 1-6 in oro a sinistra, "A Tale of Fury:" ecc. in grassetto; il Charge resta sotto, separato.
- [ ] **Chaos Tarot, anteprima sulla scheda**: l'Area Effect mostra "Gamble, then apply the listed effect in the
      area." e poi sei righe (Card explodes… / teleported 2 / difficult terrain / Bless / Seal / Choose two); la riga
      2 finisce con "teleported 2." senza perdere il numero.
- [ ] **Copie già sulle schede**: stesso aspetto anche per le abilità aggiunte prima dell'aggiornamento (nessuna
      migrazione: è solo la resa).
- [ ] **Show in Chat**: nelle card delle due abilità la tabella è a righe, senza paragrafi vuoti o testo spostato
      fuori dal blocco.
- [ ] **Scheda dell'abilità** (doppio clic su Monogatari): la descrizione mostra la tabella a righe.
- [ ] **Foe**: l'azione Strange Brew del Troll (e Rummage dello Shopkeep: "1 · 10 foot pole:", "2 · Lantern:") è a
      righe sulla scheda del foe e nella card in chat.
- [ ] **Nessun falso positivo**: abilità con numeri nel testo ma senza tabella (es. "Gain aura 1. … shove 2") restano
      testo normale.
- [ ] **Tooltip delle keyword** (es. "Bless", "Seal", "teleported", "difficult terrain") ancora attivi dentro le righe.

## R10 — Sleight of Hand e Chaos Tarot senza il Wild Card ripetuto (15 ottobre 2026, versione 1.15.12)

Setup: un mondo con un PG Seer (Mendicant) che aveva già Sleight of Hand e Chaos Tarot prima dell'aggiornamento, più
un PG a cui si aggiungono ora dal compendio Jobs; tab Combat. Aprire il mondo da GM con la console (F12) aperta.

- [ ] **Migrazione**: in console compare "Migration 22: … copy/copies of Sleight of Hand / Chaos Tarot …" (solo se
      c'erano copie vecchie); riaprendo il mondo non ricompare.
- [ ] **Sleight of Hand, anteprima sulla scheda**: dopo il testo di colore ci sono Attack (auto-hit), "Effect: Your
      foe is pacified.", Area Effect e "Effect: Summon a wild card in range 2 of your foe.", poi talenti e mastery
      (King of Swords). Niente "Wild Card — Size 1, intangible" né "Summon Effect: The card emits…".
- [ ] **Chaos Tarot, anteprima sulla scheda**: Area Effect con la tabella del gamble (1-6), poi "Summon: Then, summon
      a wild card in the area." e basta; niente "When a wild card is summoned, it can be summoned in range 2…" né il
      blocco del Wild Card. Talenti e mastery (Royalty Gold) invariati.
- [ ] **Copia nuova dal compendio**: stesso aspetto delle copie migrate, anche nella scheda dell'abilità (doppio clic).
- [ ] **Show in Chat**: le card delle due abilità mostrano gli stessi blocchi, senza il testo del Wild Card.
- [ ] **Wild Card ancora raggiungibile**: nel pannello di entrambe le abilità c'è ancora il Wild Card da piazzare;
      aprendo l'attore (compendio Summons) si leggono il Summon Effect e le due note (p.200).

## R9 — Fairy Ring: il trigger di Spirit Away al suo posto (15 ottobre 2026, versione 1.15.11)

Setup: un mondo con un PG che aveva già Fairy Ring (Harvester, Mendicant) prima dell'aggiornamento, più un PG a cui
la si aggiunge ora dal compendio Jobs; tab Combat. Aprire il mondo da GM con la console (F12) aperta.

- [ ] **Migrazione**: in console compare "Migration 21: … copy/copies of Fairy Ring …" (solo se c'erano copie
      vecchie); riaprendo il mondo non ricompare.
- [ ] **Anteprima sulla scheda**: niente "Trigger:" in cima; dopo il testo di colore c'è il blocco "Terrain Effect"
      che finisce con "The ring lasts until this ability is used again." (senza "Spirit Away —" in fondo), poi un
      blocco intitolato "Spirit Away — Interrupt 2" con "Trigger: A foe enters or exits the area.", poi "Effect:
      Teleport that foe 2 and seal them…", talenti e mastery.
- [ ] **Tooltip**: passando sull'intestazione "Spirit Away — Interrupt 2" compare la spiegazione degli Interrupt
      (usabile 2 volte per round).
- [ ] **Copia nuova dal compendio**: stesso aspetto della copia migrata; nella scheda dell'abilità (doppio clic) il
      campo "Interrupt Trigger" è vuoto.
- [ ] **Show in Chat**: la card mostra gli stessi blocchi, senza "Trigger:" in cima.
- [ ] **Stesso nome appeso, altre abilità**: Gran Reversa (Stance che finisce con "…gain the following interrupt:",
      poi "Reverse Fate — Interrupt 1") e Drifting Leaf (Effect che finisce con "…until the start of your next
      turn.", poi "LEAF ON THE WIND — Interrupt 2", e in fondo ancora "Infuse 3 or Slay: PHANTOM BLADE").
- [ ] **Area di Fairy Ring**: il bottone dell'area piazza ancora il Burst 2 come prima.

## R8 — Massive Overhead: regole fuori dal testo di colore (15 ottobre 2026, versione 1.15.10)

Setup: un mondo con un PG che aveva già Massive Overhead (Colossus, Stalwart) prima dell'aggiornamento, più un PG
a cui la si aggiunge ora dal compendio Jobs; tab Combat. Aprire il mondo da GM con la console (F12) aperta.

- [ ] **Migrazione**: in console compare "Migration 20: … copy/copies of Massive Overhead …" (solo se c'erano copie
      vecchie); riaprendo il mondo non ricompare.
- [ ] **Anteprima sulla scheda**: niente frase in corsivo; i blocchi di regole sono "Effect: End your turn. Your next
      attack…" e "Special Effect: If your target was already in a pit…", poi Comeback/Heroic, talenti e mastery.
- [ ] **Copia nuova dal compendio**: stesso aspetto della copia migrata.
- [ ] **Show in Chat**: la card mostra gli stessi blocchi, senza testo di colore.
- [ ] **Scheda dell'abilità** (doppio clic): il testo comincia con "Effect:" e le keyword (es. "pit", "exceed") hanno
      il tooltip.
- [ ] **Copia modificata a mano**: se prima di aggiornare si era cambiato il testo di Massive Overhead su un PG, resta
      com'era.

## R7 — nessun summon di un altro job sulle abilità (15 ottobre 2026, versione 1.15.9)

Setup: un PG con Raging Wolf (Colossus, Stalwart), Blackstar (Enochian) e Mist Strider (Warden), più un'abilità che
evoca davvero (Apex o Strength of the Pack del Warden, Carnevale del Fool, Sow del Harvester), tab Combat.

- [ ] **Raging Wolf**: nell'anteprima dell'abilità non compare più il summon "Beast" (né altri summon).
- [ ] **Blackstar**: nessun "Bomb" proposto.
- [ ] **Mist Strider**: propone solo "Beast", non più "Shadow".
- [ ] **Abilità che evocano davvero**: Apex / Strength of the Pack propongono ancora "Beast", Carnevale "Bomb", Sow
      "Thrall"; trascinare il summon sulla mappa funziona come prima.
- [ ] **Show in Chat** di Raging Wolf: nessun summon sulla card.

## R6 — testo di colore delle abilità senza tooltip delle keyword (15 ottobre 2026, versione 1.15.8)

Setup: un PG con Battering Ram (Valiant, Stalwart), Six Hells Trigram e Revenge (da GM si possono aggiungere da
compendio), tab Combat.

- [ ] **Battering Ram**: nell'anteprima dell'abilità la frase in corsivo "…send your target flying." non ha più
      "flying" evidenziato né tooltip; più sotto, nell'Effect, "shoved", "Collide", "slashed" hanno ancora il tooltip.
- [ ] **Six Hells Trigram**: nella frase di colore "summon" non è evidenziato; nei blocchi di regole le keyword
      (summon compreso, se c'è) hanno ancora il tooltip.
- [ ] **Revenge**: "…hands, feet, and armor are ready to retaliate." senza tooltip su "armor".
- [ ] **Show in Chat**: per le tre abilità la card in chat ha la frase di colore senza keyword evidenziate e i blocchi
      di regole con i tooltip come prima.
- [ ] **Scheda dell'abilità**: aprire Battering Ram dal compendio (o dalla scheda, icona di modifica) → nel riquadro
      Description la frase iniziale è senza tooltip, la parte da "Effect:" in poi li ha.
- [ ] **Abilità senza testo di colore** (che comincia subito con "Effect:"): tooltip come prima su tutto il testo.
- [ ] **Abilità con descrizione scritta a mano in HTML** (con paragrafi/grassetti): la scheda dell'abilità la mostra
      come prima, impaginazione intatta.

## R5 — tooltip su Sacrifice, sui Blast e sul costo degli interrupt (15 ottobre 2026, versione 1.15.7)

Setup: un PG con Dropkick, Comet e Catapult (Stalwart; da GM si possono aggiungere da compendio), tab Combat.

- [ ] **Dropkick**: nell'anteprima dell'abilità il tag "Sacrifice" non è più grigio; passandoci sopra compare la regola
      del Sacrifice (p.103). Show in Chat → stesso tag con tooltip nella card.
- [ ] **Comet**: "Medium Blast" non è più grigio e ha il tooltip (3×3, 9 spazi); "Object" e "Range 3" come prima.
- [ ] **Catapult senza mastery**: il badge del costo "Interrupt 1" in cima all'anteprima e alla card in chat ha il
      tooltip della regola degli interrupt; nessun tag "Interrupt" tra i tag.
- [ ] **Catapult con la mastery**: spuntare la mastery → il badge del costo diventa "Interrupt 3", evidenziato, con
      tooltip "From Mastery: Catapult becomes Interrupt 3" + la regola; nessun tag "Interrupt 3" a parte. Stesso nella
      card Show in Chat. Togliendo la mastery torna "Interrupt 1".
- [ ] **Altro interrupt**: un'abilità interrupt qualsiasi di un altro job (es. una con "Interrupt 1" già tra i tag) →
      il numero sta solo sul badge del costo, con il tooltip.
- [ ] **Abilità normali**: un'abilità da 1 o 2 azioni → badge del costo come prima, senza tooltip; tag invariati.
- [ ] **Foe**: un foe con un'azione "Small Blast" o "Medium Blast" o "Terrain Effect" → il tag ha il tooltip.

## R4 — talento e mastery chiesti per ogni abilità trascinata (15 ottobre 2026, versione 1.15.6)

Setup: un PG con meno di sei abilità (capitolo alto, o da GM) e il compendio delle abilità aperto accanto alla scheda,
tab Combat.

- [ ] **Drop su un riquadro**: trascinare un'abilità con talenti (es. Rook) su un riquadro "Drop ability here" → la
      finestra "Equip: …" compare come prima; scegliendo Talent I e la mastery, il riquadro mostra TI e ★.
- [ ] **Drop fuori dai riquadri**: trascinare un'altra abilità con talenti nello spazio tra i riquadri, sul titolo
      della sezione o in un altro punto della scheda → compare la stessa finestra; dopo "Equip" l'abilità va nel primo
      riquadro libero con i badge scelti.
- [ ] **Annulla**: chiudere la finestra con la X → l'abilità NON viene aggiunta.
- [ ] **Tante di fila**: aggiungere 4-5 abilità una dopo l'altra il più velocemente possibile, lasciandole dove
      capita → ognuna chiede talento/mastery; nessuna arriva senza la finestra.
- [ ] **Drop mentre la finestra è aperta**: con la finestra della precedente ancora aperta, lasciare un'altra abilità
      fuori dai riquadri → notifica "The previous item is still being added…", la seconda non viene aggiunta; chiusa la
      prima, rilasciandola funziona.
- [ ] **Abilità senza talenti**: un'abilità senza talenti né mastery (se ce n'è una) o un tratto/reliquia → aggiunti
      subito, nessuna finestra.

## R3 — avviso in chat quando un'aura scade (15 ottobre 2026, versione 1.15.5)

Setup: un PG Stalwart con Rook (aura 1 "until the end of your next turn", p.123) e, se possibile, un PG con Nightmare
o High Prophecy ("until the start of your next turn"); un foe Trooper (Hold the Line!) e un PG con una stance ad aura
(Gran Reversa, Strength of the Pack o Gentleness). Tutti con token sulla scena, un combat attivo.

- [ ] **Rook, piazzata nel proprio turno**: nel turno del PG, bottone area di Rook → l'aura compare, la notifica dice
      "(until the end of your next turn)". Fine di questo turno: nessun messaggio. Fine del turno successivo del PG →
      in chat "<PG>'s Aura 1 (Rook) ends — until the end of your next turn" con il bottone **Remove area**.
- [ ] **Remove area**: il bottone toglie l'aura dalla mappa e la riga diventa "area removed". Se l'aura era già stata
      cancellata a mano, il bottone non c'è e la riga dice "area removed".
- [ ] **L'aura non sparisce da sola**: ignorando il messaggio, l'aura resta sulla mappa, segue ancora il token e non
      ripete il messaggio nei turni dopo.
- [ ] **"Until the start of your next turn"** (Nightmare / High Prophecy): il messaggio arriva all'inizio del turno
      successivo del PG, non alla fine di quello in cui è stata piazzata.
- [ ] **Foe**: nel turno del Trooper, area di Hold the Line! dalla sua scheda → il messaggio arriva all'inizio del suo
      turno successivo ("until the start of its next turn").
- [ ] **Stance**: un'aura da stance (Gran Reversa / Strength of the Pack / Gentleness) non dà mai il messaggio e resta
      come prima.
- [ ] **Combo**: Bleak Mercy con COMBO ON (Sweet Torment, "until the end of your next turn, gain aura 1") → stesso
      comportamento di Rook.
- [ ] **Undo**: tornando indietro di un turno (previous turn) il conteggio non avanza e non arriva nessun messaggio.

## R2 — vigor oltre il massimo (15 ottobre 2026, versione 1.15.4)

Setup: un PG qualunque (annotare la VIT, che è il massimo del vigor), un foe e una legend; un combat attivo.

- [ ] **PG, valore a mano**: nella scheda, "Current Vigor" = VIT + 5 → il valore resta (non torna alla VIT), la scritta
      dice "Vigor VIT+5 / VIT" e le 5 tacche in più sono viola.
- [ ] **Danno sul vigor in più**: con quel vigor, applicare da una card un danno pari a VIT + 3 → tutto assorbito dal
      vigor, gli HP non scendono, restano 2 di vigor.
- [ ] **Recover non abbassa**: con vigor sopra il massimo, Recover (non bloodied) → il vigor resta com'era, non scende
      alla VIT. Da bloodied (surge) idem. Con vigor 0, Recover dà ancora 4 e il surge porta alla VIT come prima.
- [ ] **Regeneration**: bloodied, Regeneration attiva, vigor sopra il massimo → a fine turno il vigor non scende.
- [ ] **Foe e legend**: nel campo Vigor della testata scrivere un valore sopra "/ max" → resta, e un danno lo consuma
      prima degli HP.
- [ ] **Fine combat**: chiudendo il combat il vigor del PG torna a 0 come prima.

## R1 — combo che ereditavano la versione base (15 ottobre 2026, versione 1.15.3)

Setup: un PG Mendicant con le abilità combo citate sotto (Chanter, Harvester, Sealer, Seer); un PG Stalwart Knave con
Bleak Mercy, Revenge e Low Blow; per Death Blossom un PG Vagabond;
un foe da bersagliare. Accendere COMBO ON prima di ogni prova.

- [ ] **Chastise → Charism**: Show in Chat → la card ha solo l'Effect di Charism; niente "Auto hit: Fray", niente
      "Foe is sealed", niente Charge. Nessun bottone Sealed. Il bottone del danno non tira nulla (Charism non fa danno).
- [ ] **Dervish → Dawn** e **Felicity → Fleet**: solo l'Effect della combo, senza Charge e senza il testo della base.
- [ ] **Pandaemonium → Purgatorio**: niente Charge "Increase area to Large Blast"; Hit, Area e i due Effect della combo.
- [ ] **Astra → Fortuna**: card con riga "Combo — Fortuna: Range 5, Medium Blast.", poi Hit "[D]+fray", Area e Summon.
      Il gamble e il testo della base non compaiono. Attack: la card dell'attacco mostra la riga Hit di Fortuna.
- [ ] **Sow → Reap**: niente seal né Mark della base; niente bottone "Mark target" e niente tag Mark nella testata
      della scheda con la combo accesa (con COMBO OFF il Mark di Sow c'è).
- [ ] **Holy → Hades**: niente Charge "Grant 3 vigor"; True Strike e Medium Blast nei tag.
- [ ] **Rot → Regenerate**: il bottone "Mark target (Regenerate)" c'è ancora (la combo ha il suo Mark).
- [ ] **God Hand → Devil Hand**: come prima (Teleport 1, attacco, esplosione, Exceed "Repeat the effect").
- [ ] **Bleak Mercy → Sweet Torment**: Hit e Miss della base restano; l'Effect diventa "until the end of your next turn,
      gain aura 1…" e quello della base ("gains true strike and ignores defiance…") sparisce; niente riga "As above, but".
- [ ] **Revenge → Indignation**: riga "Gains True Strike", Effect sostituito (vigilance + counter), niente "Gain
      unstoppable and counter" della base.
- [ ] **Low Blow → The Hook**: card completa della base più la riga della combo. Sulla scheda, con COMBO ON, il testo
      di Low Blow **non** è barrato.
- [ ] **Barrato sulla scheda**: con COMBO ON, il testo base di Chastise / Felicity / Sow è barrato; quello di Bleak
      Mercy, Revenge, Low Blow, Death Blossom no.
- [ ] **Death Blossom → Flying Sleeves** (controllo che non sia cambiato): Arc 4 in range 2, danno 2[D]+fray.

## Esito playtest della 1.15.1 (13 ottobre 2026, Foundry locale, mondo "test", attori di prova poi cancellati)

Provato da un solo client GM, con PG e foe "TEST" creati per l'occasione e poi cancellati insieme ai messaggi, al
combat, ai token e a un utente "TEST player" creato per la prova dell'Outsider. Il combat di Edoardo (vuoto) è stato
riattivato. Correzioni nella 1.15.2 (vedi CHANGELOG).

**Passati**: avviso di aggiornamento e proposta della guida al primo avvio; compendi (icone e tinte di fazione sui 362
foe e sui token, cartelle Uniques, macro senza emoji); E1 Spite (durata e foe più vicino), Mock su elite (un turno in
più), Dark Knight; E2 scelta dell'area all'attacco e annullo; E3 Domain (Sleight of Hand no, Chaos Tarot sì); E4
regole di Mendicant / Vagabond / Wright senza doppioni; E5 Godly Smite 1→2→3→4 e 0 a fine combat; E6 Outsider; E7
icone dei summon (foe e compendio Summons) e macro Copy Foe Summons; E8 template sulle legend (Titan Armament, ✕,
drop vero, job rifiutato) e Unique Iron Soldat su un foe; E9 trofei a fine combat; E10 usi dei kit; F1 Bless; F2 combo
del Bale Troll (ordine, stesso turno, fuori ordine, chip, reset a fine combat); F3 "Try it on the map"; F4 riga
dell'area e "area removed"; F5 larghezza della Line; FAQ a sezioni e ricerca; emoji sostituite (finestre d'attacco e
danno, card, tracker, scheda, guida, Encounter planner). Dalle build interne: trofei (dopo la correzione), Terrorize /
Hurl Self / Finish Off, regole dello Stalwart, controlli delle risorse sui tratti, Domain su 8 abilità, riquadri
allargabili, Infuse delle Mastery di Lance (Line 10), tracker con due attivazioni, stance multiple con Martial Master,
danno di Death Blossom in combo, God Hand / Devil Hand, Vigilance con 3 cariche, Rot con due Mark, tab Narrative,
tab della scheda, ranghi delle reliquie, scheda clock.

**Non provati** (servono un secondo client o un modulo): summon piazzati da un giocatore co-GM, relay giocatore di
Mock e Bless, due GM collegati (1.16.5), PopOut! (1.17.7), slow turn e "NPC picks next" (1.17.8), danno diviso degli
attacchi ad area (1.16.1), tour guidati.

**Notato, non corretto**: due clic sullo stesso oggetto di un kit nello stesso istante (prima che la scheda si
ridisegni) contano come un uso solo.

## FAQ a sezioni (13 ottobre 2026, versione 1.20.2)

- [ ] Quick Guide → FAQ: tre sezioni (Combat, Narrative, Character sheet); in Combat le domande nuove "Am I my own
      ally?" e "If I gamble with more than one die…", in Narrative "aid and set up" e "second wind".
- [ ] Ricerca "ally", "gamble", "second wind": trova le righe giuste; le sezioni senza risultati spariscono; svuotando
      la ricerca torna la tab di prima.

## Niente emoji (13 ottobre 2026, versione 1.20.1)

- [ ] Scheda PG (tab Combat, Conditions, Notes, Relics), scheda Foe, Legend, Summon, Clock: nessuna emoji; al loro posto
      icone (mirino, dado, fumetto, area, lucchetto, fulmine…) allineate al testo, della stessa misura.
- [ ] Card in chat: attacco (blocchi Inflict / Gain, riga dell'area con "Remove area"), danno (Defeated!), abilità
      (COMBO, power die), trofeo crumbled, carta encounter (Reveal reserves): icone al posto delle emoji.
- [ ] Finestre: Roll Save, Narrative Roll, Attack, Damage → il bottone ha l'icona di Foundry e nessuna emoji; "Hatred
      of…" e "Bless…" scrivono "(targeted)" accanto ai bersagli.
- [ ] Tracker: bottone Slow con le icone pausa / avanti; resolve con il fulmine. Guida rapida (Areas, "Try it on the
      map") e tour (welcome, character sheet, combat, GM tools): icone al posto delle emoji.
- [ ] Macro del compendio (Apply Damage, Award XP, Copy Foe Summons): nessuna emoji.

## Sessioni E + F (13 ottobre 2026, versione 1.20.0) — voci rimaste e resto del documento di Maar

Dopo il deploy: chiudere Foundry prima della copia (cambiano i pack foes, foe-templates, macros).

**E1 — Hatred+ con durata, Hatred guadagnata**
- [ ] **Mock** (limit break del Knave): PG nel suo turno, bersaglio un foe normale → card con Slashed+ / Weakened+ /
      Hatred+ con ⏳; il tooltip dice "ends until the end of their next turn". Applicarli → in chat "…until the end of
      their next turn". Finire il turno del PG: restano. Turno del foe, poi fine turno del foe → spariscono con una riga
      in chat, senza tiro salvezza.
- [ ] **Mock su elite / legend**: stessa prova su un foe Elite → resta un turno in più ("lasts two turns instead").
- [ ] **Spite** (tratto del Knave): 💬 del tratto → la card ha un blocco "Gain" con Hatred+ ⏳. Clic → finestra
      "Hatred of…" con il foe più vicino già scelto e "(closest)"; con due foe alla stessa distanza, la frase "you choose".
      Applicata nel turno del PG: a fine di questo turno resta, a fine del turno dopo sparisce.
- [ ] **Dark Knight** (stance): la card ha "Gain Hatred+" (senza ⏳: resta finché non si toglie, è una stance).
- [ ] **Gain con durata** (controllo di regressione): un'abilità con "gain evasion until the start of your next
      turn" → applicata, sparisce all'inizio del turno successivo del PG.
- [ ] **Hatred normale**: Taunt ("gains hatred of you") → finisce a fine turno del foe come prima.
- [ ] **Relay**: da giocatore, Mock su un foe che non possiede → il GM la applica, con la durata.

**E2 — Attacco ad area senza 📐**
- [ ] Draken Cross con Talent II (più aree possibili): senza aver usato 📐, premere ⚔ → si apre la stessa finestra
      "which area?" del 📐; chiuderla annulla l'attacco. Un'abilità con una sola area → nessuna finestra, come prima.
- [ ] Area già piazzata col 📐 → ⚔ la riusa senza chiedere.

**E3 — Domain**
- [ ] Reliquia Domain equipaggiata: Sleight of Hand non mostra più il promemoria Domain; Chaos Tarot sì (risultato 3:
      "Create two spaces of difficult terrain").

**E4 — Most relevant rules**
- [ ] Scheda di un Vagabond, un Mendicant, un Wright: la lista "Relevant Rules" non è più vuota (Blinded, Dazed,
      Evasion, Stealth, Dash, Teleport, Summon / Sealed, Pacified, Cure, Aura X, Combo, Mark / Shattered, Vulnerable,
      Pierce, Teleport, Flying, terreni, Objects). Un PG multiclasse non ha doppioni (Teleport, Mark, Aura X).

**E5 — Godly Smite**
- [ ] PG Sealer con Godly Smite in un combat: Begin Combat → il dado mantra parte da 1. Next Round → 2, con una riga
      in chat; non supera 6. End Encounter → torna a 0.

**E6 — Outsider**
- [ ] PG Outsider, nel party un PG Mighty e uno Seeker: sezione Loose Gear → "+ From the party's kits" → finestra con
      gli oggetti dei kit Mighty e Seeker raggruppati; sceglierne uno → nuova riga di loose gear, non spuntata.
      Un oggetto già nella lista è grigio. Senza altri bond nel party → messaggio.
- [ ] Il bottone non c'è per gli altri bond.

**E7 — Summon**
- [ ] Trascinare un summon dei foe (es. Soul Spark dell'Abomination) → l'attore e il token hanno un'icona (sole), non
      l'omino grigio. Un oggetto (Bonfire) → fuoco. Trascinare un summon dal compendio Summons (Beast) → zampa.
- [ ] Macro "ICON: Copy Foe Summons" (compendio ICON Macros): un foe importato prima della 1.8.0 senza summon →
      la macro lo elenca, conferma → il foe ha la sezione Summons. Rilanciata → "already has its summons".
- [ ] Giocatore proprietario di un foe (co-GM): trascina il chip di un summon sulla mappa → "sent to the GM", il GM
      lo piazza nel punto giusto. Un giocatore che non possiede il foe → avviso, niente.

**E8 — Template**
- [ ] Legend Jotunn (es. Thannir): trascinare "Titan Armament" da Foe Templates → chip "Special" sotto le statistiche,
      HP ×1.5 e un turno in più; ✕ lo toglie e rimette tutto. Un template job su una legend → avviso, niente cambia.
- [ ] Compendio Foe Templates: ogni fazione ha la cartella "Uniques" (e "Uniques / Elites"), per esempio Imperial /
      Uniques / Iron Soldat. Trascinato su un foe Heavy → diventa l'Iron Soldat (classe, statistiche, azioni).

**E9 — Trofei a fine combat**
- [ ] Trofeo 1/battle con "Used this combat" spuntato e uno "In effect this combat" → End Encounter → si spengono
      tutti e due. Uno "In effect this expedition" resta acceso.

**E10 — Usi dei gear kit**
- [ ] Outsider's Kit: "5 fire stones (hot!)" mostra 5/5; clic → 4/5 con un "−" accanto; 5 clic → barrato; clic sul
      barrato → torna 5/5. "−" ridà un uso.
- [ ] Shift+clic su "Rations" → "How many uses?" → 3 → mostra 3/3 e conta come sopra.
- [ ] "↻ New expedition" → tutti gli usi tornano pieni; la quantità messa a mano (3) resta.
- [ ] Oggetti senza numero: clic → barrato come prima.

**E11 — Icone dei foe**
- [ ] Compendio Foes: ogni foe ha l'icona della sua fazione (Folk villaggio, Relict rovine, Ruin Beast zampa,
      Scavenger sacca, Imperial bandiera, Demon terrore, Lowlander veleno, Jotunn montagna, Hob quercia, Basic Jobs
      combattimento, Elite Foes freccia). Il token sulla mappa ha il colore della fazione (toni spenti).
- [ ] I job template in Foe Templates hanno la stessa icona.

**F1 — Bless del Mendicant**
- [ ] PG Mendicant, tratto Bless: accanto ai contatori c'è "🙏 Bless…" → finestra con i bersagli (🎯 per primi), i
      token amici e i PG → "Give a blessing" → il PG scelto ha una carica Blessed in più, riga in chat.
- [ ] Da giocatore, Bless su un PG di un altro giocatore → passa dal GM.
- [ ] La carica si spende come prima nel tiro salvezza (+1 boon).

**F2 — Combo dei foe**
- [ ] Bale Troll: Storm of Claws ha il chip "Combo 1/2 — next", Boulder Fist è sbiadita. Attacco con Storm of Claws
      → ora Boulder Fist è "next" e Storm of Claws è sbiadita. Damage della stessa azione nello stesso turno non
      cambia niente. Boulder Fist → si torna a Combo 1.
- [ ] Fuori ordine (Boulder Fist quando tocca a Storm of Claws) → avviso, registrato lo stesso. Due parti nello
      stesso turno → avviso "different turns".
- [ ] Clic su un chip "Combo N" → quella parte diventa la prossima (correzione errori). End Encounter → si riparte da 1.
- [ ] Stessa cosa su una legend con combo, e su Atrophic Grave (4 parti).

**F3 — Aree della guida sulla mappa**
- [ ] Quick Guide → Areas: sotto ogni clip "📐 Try it on the map". Con un token selezionato → la guida si riduce, si
      piazza l'area come col 📐 (Small Blast con il raggio 3), poi la guida torna. Senza token selezionato → avviso.

**F4 — Rimozione dell'area**
- [ ] Card d'attacco con area: la riga 📐 è più grande, bottone "🗑 Remove area". Clic → l'area sparisce e il bottone
      diventa "area removed". Togliere l'area col tasto Canc sulla mappa (o a inizio turno) → anche la card si aggiorna,
      anche in una chat staccata.

**F5 — Larghezza della Line**
- [ ] Piazzando una Line: + e − cambiano la larghezza (1–5), l'anteprima si allarga, l'etichetta dice "(width N)".
      Piazzata → il template e la card dicono la larghezza scelta. Su blast / arc i tasti non fanno niente.

## Gear kit (12 ottobre 2026, versione 1.19.0, Sessione D)

- [ ] **Bond nuovo**: PG senza bond → trascinare Pathfinder → nella sezione Gear compaiono Adventurer's Kit
      ("Always", con gli oggetti come bottoni) e Highland, Lowland, Extreme Kit (non portati, elenco in breve).
- [ ] **Portare un kit**: spuntare Highland Kit → diventa "Carried" con gli oggetti come bottoni; spuntare Lowland Kit
      → Highland si toglie da solo (uno alla volta).
- [ ] **Usato / perso**: clic su "Pitons" → barrato; di nuovo → torna. "↻ New expedition" → tutti gli oggetti tornano.
- [ ] **Custom kit**: "+ Custom kit (3 items)" → finestra con gli oggetti dei kit del bond; sceglierne 3 → kit "Custom
      Kit". Sceglierne 2 → avviso, niente kit.
- [ ] **Highborn**: nessun Adventurer's Kit; si possono portare 2 kit insieme (al terzo, avviso); custom da 5.
- [ ] **Elder / Outsider**: Elder ha il Weathered Adventurer's Kit come "Always"; Outsider ha solo l'Outsider's Kit e
      niente "+ Custom kit".
- [ ] **Cambio bond**: trascinare un altro bond → conferma → i kit vecchi spariscono, arrivano i nuovi, il custom
      resta.
- [ ] **Wizard**: creazione di un PG → al passo 5, sotto i poteri, i kit del bond scelto; scegliere un kit → a fine
      wizard la scheda ha i kit e quello scelto è "Carried". Con Outsider il passo dice che c'è solo l'outsider's kit.
- [ ] **Trascinare un kit** dal compendio: si aggiunge (lo stesso kit due volte → messaggio, non si duplica).
- [ ] **PG vecchio**: un PG con il campo kit scritto a mano → "Old kit note: …" con ✕; "+ <bond> kits" aggiunge i kit.
- [ ] **Loose gear**: un PG che aveva 2 loose gear → li ha ancora, spuntati; "+ Gear" ne aggiunge un terzo non
      spuntato; spuntandolo il contatore va a "taken 3/2" in rosso. Outsider con Resourceful → limite 5.
- [ ] **Giocatore**: da giocatore proprietario, spunte e bottoni funzionano.

## Trofei (12 ottobre 2026, versione 1.18.0, Sessione C)

- [ ] **Compendio**: c'è "Trophies" con 10 cartelle (General, Relict, Ruin Beast, Scavenger, Imperial, Demon,
      Lowlander, Jotunn, Hob, The Tower). General ha 20 trofei; aprendone uno si vede la scheda del trofeo (Uses,
      d20, pagina, testo).
- [ ] **Tab**: la scheda del PG ha il tab "Relics & Trophies"; la barra dei tab non va a capo né esce dalla scheda.
- [ ] **Trascinare**: Boots of Speed sulla scheda → compare sotto le reliquie con 6 quadratini pieni, "6/6 uses left".
- [ ] **Use**: clic su Use → 5/6, card in chat con "uses Boots of Speed". − e + cambiano il numero.
- [ ] **Si sbriciola**: Crystal Skull (1 uso) → Use → card "its last use: the trophy crumbles", la scheda mostra
      "💔 Crumbled", il trofeo è sbiadito, niente Use.
- [ ] **Durata**: Frost enchantment (3 combats) → Use → 2/3 e spunta "In effect this combat" accesa; si spegne a mano.
- [ ] **1/battle**: Circlet of Command → badge "1/battle"; Use → "Used this combat" spuntata e Use disattivato;
      togliendo la spunta Use torna attivo.
- [ ] **Unlimited**: Scav Badge → "Unlimited uses", niente − / +; Use manda solo la card.
- [ ] **Tre al massimo**: con 3 trofei, trascinarne un quarto → avviso "already holds three trophies", il trofeo
      viene aggiunto e il contatore "4/3" diventa rosso.
- [ ] **Custom**: "+ Custom trophy" → si apre la scheda di "New trophy"; cambiare nome, Lasts = Expeditions, 2 di 2,
      testo → la scheda del PG si aggiorna.
- [ ] **Giocatore**: da giocatore proprietario del PG, Use e le spunte funzionano.

## Un solo tiro per i due esiti del save (12 ottobre 2026, versione 1.17.10)

- [ ] **Terrorize**: un Ghul usa Terrorize su un PG bersagliato → nella card c'è un solo bottone "🎲 Blind+ / Blind".
- [ ] **Fallito**: clic → tiro fallito → il PG ha Blind+ (con il +, niente save a fine turno); il bottone dice
      "✓ Blind+".
- [ ] **Riuscito**: su un altro PG → tiro riuscito → il PG ha Blind normale; il bottone dice "✓ Blind".
- [ ] **Danno con il save**: Hurl Self (Great Boulder Hob) → un bottone "Stunned / Slashed 💥": un tiro, poi lo
      status giusto e il danno.
- [ ] **Scelta**: Finish Off (Nilfling) → i bottoni restano separati come prima.

## Vigilance nelle regole dello Stalwart (12 ottobre 2026, versione 1.17.9)

- [ ] **Stalwart**: scheda di un PG Stalwart → tab combattimento → aprire "Stalwart — Relevant Rules & Heroics" →
      ci sono Vigilance X, Rampart, Sturdy e True Strike, dopo Rush X.
- [ ] **Multiclasse**: un PG con un job Stalwart e uno di un'altra classe vede le stesse voci, senza doppioni.

## Chi apre il round dopo le slow turn (12 ottobre 2026, versione 1.17.8)

- [ ] **Round 2 dopo una slow turn**: chiudere il round 1 con la slow turn di un PG → Next Round → il tracker dice
      "NPC PICKS NEXT"; il mouse sopra l'indicatore spiega la regola (p.87).
- [ ] **Solo consiglio**: nello stesso momento cliccare il pallino di un PG → il PG agisce normalmente.

## Campi nelle finestre staccate con PopOut! (12 ottobre 2026, versione 1.17.7)

- [ ] **Serve il modulo PopOut!**, con almeno una macro nella barra in basso (slot 1).
- [ ] **Numeri**: staccare la scheda di un PG → nel campo Current Vigor scrivere 12 → il numero viene scritto e
      salvato, la macro dello slot 1 non parte.
- [ ] **Frecce**: nello stesso campo freccia su/giù → il numero cambia, la mappa non scorre.
- [ ] **Testo**: in un riquadro di testo scrivere una parola con W, A, S, D → le lettere vengono scritte.
- [ ] **Finestra principale**: tutto come prima; fuori dai campi le scorciatoie (1–0, frecce) funzionano anche
      nella finestra staccata.

## Controlli delle risorse sui tratti (12 ottobre 2026, versione 1.17.6)

- [ ] **Vagabond**: Skirmisher, Finesse, Dodge, Prowl → nessun bottone combo token. L'interruttore COMBO sopra le
      abilità funziona come prima.
- [ ] **Stalwart**: pips di Vigilance solo su Fortify (non su Armor 2, Heroics, Rush).
- [ ] **Mendicant**: contatore Blessing solo su Bless. **Wright**: Aether e power dice solo su Chain Reaction.

## Domain e abilità che creano terreno (12 ottobre 2026, versione 1.17.5)

- [ ] **Helix Heel**: PG con la reliquia Domain → pannello di Helix Heel → nessun promemoria "place your Domain".
      Lo stesso per Lance.
- [ ] **Terraforming / Geyser**: il promemoria di Domain c'è ancora.
- [ ] **Pyre / Death Blossom**: ("create a pit under…") il promemoria di Domain ora compare.
- [ ] **Midas / Comet**: il promemoria c'è (statua oggetto, arma che diventa oggetto).

## Riquadri allargabili (12 ottobre 2026, versione 1.17.4)

- [ ] **Clock**: scheda di un clock → il riquadro delle note è largo quanto la scheda; trascinando l'angolo in basso a
      destra si stringe e si allarga (fino al bordo della scheda) oltre ad allungarsi.
- [ ] **Foe**: descrizione di un tratto, di un'azione, Tactics → stesso comportamento.
- [ ] **Legend**: tratti e azioni della legend → stesso comportamento (prima solo in verticale).
- [ ] **Bordo**: allargando oltre la scheda il riquadro si ferma al bordo; allargando la finestra il riquadro può
      crescere ancora.

## Infuse delle Mastery (12 ottobre 2026, versione 1.17.3)

- [ ] **Lance con Mastery**: Wright con Lance e "Mastery unlocked" spuntato → sul pannello "✨ Infuse 3" (Volvaga) e
      "✨ Infuse 6 — GREAT SPIRIT LANCE". Con 6 Aether → clic → Aether −6, in chat il testo di Great Spirit Lance; il
      bottone dice "— armed". Riclic → Aether restituito.
- [ ] **Senza Mastery**: togliere la spunta → il bottone di Great Spirit Lance sparisce, Volvaga resta.
- [ ] **Aether insufficiente**: con 4 Aether → avviso "needs 6 Aether".
- [ ] **Infuse X**: Cryo con Mastery → "✨ Infuse X — MAGNACRYO" chiede quanto Aether spendere.
- [ ] **Area**: Great Spirit Lance armata → 📐 offre anche "Line 10".

## Tracker con più turni (12 ottobre 2026, versione 1.17.2)

- [ ] **GM**: un foe con 2 attivazioni → ▶ → la riga è attiva con "■" arancione e UN pip sbiadito; clic sul pip sbiadito →
      non succede niente (tooltip "Turn still to take — end this turn first"). ■ → turno chiuso, il pip torna normale.
- [ ] **Giocatore**: PG con 2 attivazioni → "▶ Take turn" → durante il turno si vede "■ End turn" e un pip sbiadito non
      cliccabile.
- [ ] **Due turni di fila**: ■ e poi ▶ sulla stessa riga → secondo turno, i save di fine turno del primo escono in mezzo.
- [ ] **Un turno solo**: un PG con 1 attivazione → durante il turno solo "■ End turn", come prima.

## Draken Cross e aree dei talenti (12 ottobre 2026, versione 1.17.1)

- [ ] **Talent II scelto**: Draken Cross con Talent II → 📐 → dialog con "Base: Small Blast, range 3" (primo) e
      "Talent II: Medium Blast, range 5"; Medium Blast si piazza fino a 5 caselle, Small Blast fino a 3.
- [ ] **Senza talento**: Draken Cross senza talenti → 📐 piazza subito la Small Blast, nessuna scelta.
- [ ] **Talent I scelto**: nessuna Medium Blast proposta.
- [ ] **Death Blossom**: COMBO ON → 📐 come prima (Arc 4 / Combo: Arc 8), COMBO OFF → Burst 1.
- [ ] **Status dei talenti**: un'abilità con status diversi nei due talenti, Talent II scelto → la card dell'attacco
      non offre gli status del Talent I.

## Più stance insieme (12 ottobre 2026, versione 1.17.0)

- [ ] **Una sola stance**: PG senza Martial Master né Byrax → 🧘 su una stance, poi su un'altra → la prima viene tolta,
      avviso "(one stance at a time, p.103)". Etichetta "Stance" con "active".
- [ ] **Knave**: PG con il tratto Martial Master → etichetta "Stances", 🧘 su due stance → entrambe attive, "2/2"; la
      terza sostituisce la più vecchia con avviso "(2 stances at most)". Il token mostra "Stance: A, B".
- [ ] **Byrax**: reliquia Byrax al rango Aspect (e Martial Master) → massimo 3; al rango III → massimo 2.
- [ ] **Extra**: campo Extra a 2 su un PG senza tratti → massimo 3; il tooltip sull'etichetta dice "1 + +2 extra".
- [ ] **Togliere**: 🧘 su una stance attiva → si toglie solo quella; Clear le toglie tutte e toglie il segnalino.
- [ ] **Vecchio PG**: un personaggio che aveva già una stance la vede ancora attiva dopo l'aggiornamento.
- [ ] **Dialog d'attacco**: bersagliare un PG con due stance → nella card del bersaglio "🧘 A, B".

## Limit break, scelta della Resolve (12 ottobre 2026, versione 1.16.11)

- [ ] **Scelta**: PG con limit break da 2, Resolve personale 2 e Party Resolve 3 → Use → dialog "From party resolve: 0",
      "From personal resolve: 2"; portare la party a 1 → la personale diventa 1. Use → personale 1, party 2; in chat
      "(Resolve: 1 personal + 1 party)".
- [ ] **Limiti del campo**: il numero non scende sotto il minimo necessario (personale 1, costo 2 → party almeno 1) e non
      supera la party disponibile.
- [ ] **Nessuna scelta**: Party Resolve 0 → Use paga dalla personale senza dialog; personale 0 → paga dalla party
      senza dialog.
- [ ] **Annulla**: chiudere il dialog → nessuna Resolve spesa, niente in chat.
- [ ] **Party sincronizzata**: dopo aver speso dalla party, il contatore della Party Resolve nel tracker e sulle schede
      degli altri PG scende uguale.
- [ ] **Resolve insufficiente**: totale minore del costo → avviso "Need N Resolve" come prima.

## Danno delle combo (12 ottobre 2026, versione 1.16.10)

- [ ] **Death Blossom**: un foe bersagliato → 💥 Damage senza combo → dialog con Hit 2[D]+fray, Miss fray, Area fray.
      COMBO ON → 💥 Damage → stesso dialog (prima: "does not deal damage").
- [ ] **Low Blow / Umbra / Revenge** con COMBO ON → il danno si tira con i dadi della versione base.
- [ ] **Astra / Fortuna** con COMBO ON → il danno è [D]+fray (prima 0 dadi), Area fray.
- [ ] **Justice / Judgement** con COMBO ON → il bottone Damage dice che non fa danno (nel manuale Judgement non fa danno).
- [ ] **Devil Hand**: il danno resta [D]+fray.

## Death Blossom, area e range (12 ottobre 2026, versione 1.16.9)

- [ ] **Range della combo**: COMBO ON → Death Blossom → 📐 "Arc 4" → l'arco si piazza fino a 2 caselle dal personaggio
      senza l'avviso "The first space of the arc must be in range"; i tag mostrano anche Range 2.
- [ ] **Base**: COMBO OFF → 📐 "Burst 1" → si piazza un Burst 1 entro range 2, nessuna scelta di archi.
- [ ] **Token speso e dimenticato**: COMBO ON → Show in Chat su Death Blossom (il token va a 0, il pannello resta su
      "Arc 4") → senza tirare il danno, clic su COMBO due volte (ON e poi OFF) → il pannello torna su "Burst 1".
- [ ] **Fine turno**: stessa cosa ma chiudendo il turno del personaggio → al turno dopo Death Blossom è di nuovo base.
- [ ] **Flusso normale**: COMBO ON → Show in Chat → attacco → danno: attacco e danno usano ancora la versione combo.

## Pannello e combo (12 ottobre 2026, versione 1.16.8)

- [ ] **Death Blossom**: PG con Death Blossom, COMBO OFF → bottone "📐 Burst 1"; clic → si piazza subito un Burst 1
      (nessuna scelta). COMBO ON → il pannello si ridisegna: bottone "📐 Arc 4", il tag Arc 4 evidenziato; clic → scelta
      tra Arc 4 e Arc 8 (Combo).
- [ ] **Dopo Show in Chat**: COMBO ON → Show in Chat su Death Blossom (il token si spende) → il pannello resta su "Arc 4"
      fino all'attacco.
- [ ] **Holy / Hades**: COMBO ON → i tag True Strike e Medium Blast evidenziati, bottone "📐 Medium Blast".
- [ ] **Altre abilità senza combo**: niente cambia accendendo o spegnendo COMBO.

## Card delle versioni combo (12 ottobre 2026, versione 1.16.7)

- [ ] **Show in Chat di Devil Hand**: PG con God Hand e combo token → Show in Chat → titolo "Devil Hand" con "God Hand
      combo" sotto, prima riga "⚡ Combo — Devil Hand: +1 boon." con un solo fulmine.
- [ ] **Attacco di Devil Hand**: con il combo token → attacco → titolo "Devil Hand (God Hand combo)"; sopra Hit ci
      sono tre riquadri viola (Combo — Devil Hand: +1 boon, Effect: Teleport 1, Effect: Character explodes…); Hit dice
      solo "[D]+fray", Miss "fray damage"; con 15+ Exceed dice "Repeat the effect" (non più "gain 3 vigor").
- [ ] **Colori**: i riquadri viola restano viola anche su una card Hit (bordo verde sugli altri) e Miss (bordo rosso).
- [ ] **Danno**: la card del danno della combo si chiama "Devil Hand (God Hand combo)".
- [ ] **Combo che aggiunge soltanto**: Low Blow con The Hook → attacco: un riquadro viola "Combo — The Hook: Gains
      range 2 and effect: Shove…", poi Hit / Miss di Low Blow come prima; titolo "The Hook (Low Blow combo)".
- [ ] **Senza combo**: God Hand senza token → card dell'attacco come prima, nessun riquadro viola.

## Status dal verbo e versioni combo (12 ottobre 2026, versione 1.16.6)

- [ ] **God Hand base**: PG Mendicant con God Hand, senza combo token → attacco → nella card c'è il bottone Inflict
      **Sealed**; passando il mouse si legge la frase del manuale ("Seal your foe, then bless…").
- [ ] **Devil Hand**: con il combo token → attacco con God Hand → la card NON offre Sealed (la combo riscrive l'Effect).
- [ ] **Low Blow / The Hook**: con il combo token la card offre ancora Hatred e Slashed della versione base.
- [ ] **Umbra / Penumbra**: con il combo token la card offre Blind; senza combo token come prima.
- [ ] **Revenge / Indignation**: con il combo token niente Unstoppable, resta Counter.
- [ ] **Foe**: Greatsword "Great Slice" → bottone Slashed; un foe con "Ambush" (Aetherachnid, Burrower…) → Dazed;
      Mistral "Sweep of the Wind" → Dazed con il save.
- [ ] **Nessun falso positivo**: Fairy Ring con il talento II → il testo "it doesn't seal them" non aggiunge un secondo
      Sealed; Divine Aegis ("a holy seal") non offre Sealed.

## Due GM collegati (12 ottobre 2026, versione 1.16.5)

Preparazione: due utenti con ruolo Gamemaster (o GM + Assistant GM) collegati allo stesso mondo, in due schede.

- [ ] **Save di fine turno una volta sola**: un foe e un PG con uno status salvabile (es. Weakened) → fine del loro
      turno → in chat UN solo save per status (prima ne uscivano due). Con la Hatred normale: un solo "ends".
- [ ] **Fase delle legend**: una legend che passa alla fase successiva → un solo annuncio in chat.
- [ ] **Start dal GM assistente**: il GM assistente preme Start Combat → la Party Resolve parte da 0 e i promemoria
      "Start of combat" delle reliquie escono una volta.
- [ ] **Un solo GM**: con un GM solo, i save di fine turno escono come prima.

## Vigilance, dado più alto (12 ottobre 2026, versione 1.16.4)

- [ ] **Spend con 3 cariche**: PG Stalwart con Vigilance 3 → Spend → il dialog dice "keep the highest die — the dice
      don't add up" e ha i due usi. Roll con 3 cariche → in chat 3d6 con un solo dado tenuto (gli altri barrati), il
      totale è il dado più alto, flavor "3 charges, highest die: reduce the ally's damage by N (as if with armor)".
      Tracker a 0.
- [ ] **Uso "punish"**: scegliere "A foe breaks adjacency" → flavor "the foe breaking adjacency takes N damage".
- [ ] **Una carica**: Spend con 1 carica → 1d6 normale, senza "highest die".
- [ ] **Tooltip**: passare il mouse su "vigilance" nel testo di un'abilità → dice "keep the highest (the dice don't add
      up)" e "range 2".

## Rot / Regenerate (12 ottobre 2026, versione 1.16.3)

- [ ] **Due bottoni**: PG con Rot (Harvester) → pannello dell'abilità: "🎯 Mark target" e "🎯 Mark target (Regenerate)".
      Le altre abilità con mark hanno solo il primo.
- [ ] **Mark base**: bersagliare un foe → "🎯 Mark target" → in chat il testo di Rot (cannot be cured, +1 curse on saves);
      sul pannello compare il chip col nome del foe.
- [ ] **Mark della combo**: bersagliare un alleato → "🎯 Mark target (Regenerate)" → in chat "Rot (Regenerate)" col testo
      di Regenerate (regeneration, defiance); chip "Alleato (Regenerate)". Il mark di Rot sul foe resta.
- [ ] **Spostare**: Regenerate su un secondo alleato → il primo perde il suo mark Regenerate, il foe tiene Rot.
- [ ] **✕ sul chip** toglie solo quel mark.

## Hatred+ ongoing (12 ottobre 2026, versione 1.16.2)

- [ ] **Hatred+ resta**: un'abilità che infligge "hatred+" → Inflict sul foe → in chat "gains Hatred+ of …
      (ongoing — it doesn't end with the turn)". Fine turno del foe: la Hatred è ancora lì, nessun messaggio "ends".
- [ ] **Hatred normale finisce**: stessa prova con un'abilità che infligge "hatred" senza + → a fine turno del foe in
      chat "Hatred of … ends (end of turn)" e lo status sparisce.
- [ ] **Togliere a mano / fine incontro**: la Hatred+ si toglie dalla tab Conditions; con "End encounter" sparisce.

## Danno degli attacchi ad area (12 ottobre 2026, versione 1.16.1)

Preparazione: un PG Pyromancer o Enochian con un'abilità ad area che fa danno anche come Area effect, e tre foe
sulla scena dentro l'area.

- [ ] **Bersaglio d'attacco nel dialog del danno**: attacco ad area → nel dialog dell'attacco scegliere il secondo foe
      → tirare. Poi 💥 danno: il dialog elenca i tre foe con i pallini, e quello scelto prima è già selezionato.
- [ ] **Hit diviso**: esito Hit → in chat due card: "… — Hit" con il solo bersaglio d'attacco, e "… — Area damage"
      con gli altri due (senza i dadi bonus). Con Miss: Miss al bersaglio d'attacco, Area agli altri.
- [ ] **Area senza danno**: un'abilità ad area il cui Area effect non fa danno → con Hit esce una sola card, col solo
      bersaglio d'attacco; il suggerimento sopra la lista lo dice.
- [ ] **Esito Area scelto a mano**: card unica "Area damage" con tutti i foe rimasti nella lista.
- [ ] **✕ nel dialog del danno**: ✕ su un foe → sparisce dalla lista e non è più bersagliato sulla mappa; la card che
      esce non ha il bottone Apply per lui. Togliendo il bersaglio d'attacco, il pallino passa al primo rimasto.
- [ ] **Attacco singolo**: un'abilità senza area con un solo bersaglio → dialog del danno come prima (niente pallini),
      card con quel bersaglio.
- [ ] **Togliere l'area**: 🗑 area sulla card dell'attacco (o Delete sul template) → i foe che erano dentro non sono più
      bersagliati; il dialog del danno dopo dice "No token targeted". I bersagli fuori dall'area restano.
- [ ] **Foe e Legend**: le stesse prove con un'azione ad area di un foe e di una legend.

## Guida rapida, tab Narrative (9 ottobre 2026, versione 1.16.0)

- [ ] **Tab presente**: aprire la guida → sei tab, "Narrative" (icona piuma) tra Turn e Areas; la barra delle tab sta
      su una riga alla larghezza di default (720px) e poggia sulla linea dorata (fix della 1.15.0).
- [ ] **Contenuto**: sette riquadri con la pagina accanto al titolo; la scala 1-3 / 4-5 / 6 / 6,6 ha quattro colori
      sobri (rosso, ambra, verde, oro); le due tabelle (Risk, More dice) hanno le colonne allineate e il testo va a
      capo nelle celle senza uscire dalla finestra. Restringere la finestra: niente barra di scorrimento orizzontale.
- [ ] **Ricerca**: "aid" → compaiono la riga Aid della tabella e il riquadro "Aid or set up?" (più le righe del
      glossario che lo citano); "second wind", "exhausted", "desperate", "fortune" trovano la loro riga. Svuotare la
      ricerca → si torna alla tab di prima.
- [ ] **Ultima tab ricordata**: chiudere la guida sulla tab Narrative e riaprirla → si riapre su Narrative.
- [ ] **Testi**: confrontare a campione con il manuale (pp.17, 19, 29-30, 34): niente regole inventate.

## Feedback di Maar, Sessione A: tab, riquadri, planner, clock, reliquie (9 ottobre 2026, versione 1.15.0)

- [ ] **Tab della scheda PG**: la linea dorata sotto Narrative/Combat/… corre lungo il fondo delle tab (non le
      taglia più a metà: guardare dentro la tab attiva, non deve vedersi una seconda riga dorata), e la prima tab
      parte allineata al bordo sinistro del contenuto sotto; tra una tab e l'altra un piccolo spazio regolare.
      Provare anche sulle schede Foe e Legend, e su Foundry 13 e 14.
- [ ] **Riquadri di testo a tutta larghezza**: scheda clock, campo Notes → largo quanto la scheda, si allunga
      ancora in verticale trascinando l'angolo. Scheda foe in modalità modifica: tratti, azioni (Description / Hit /
      Miss / Area), interrupt, round action → tutti a tutta larghezza. Dare un'occhiata anche a summon, legend e una
      scheda item: niente riquadri che escono a destra.
- [ ] **Bottoni dell'Encounter planner**: −/+ della party e delle quantità, ✕, Elite, On scene / All, Random fill,
      Load/Save/New, Chat/Actors/Deploy più grandi; la finestra alla misura di default non va a capo in modo strano.
- [ ] **Scheda clock più ariosa**: più spazio tra i clock e tra le righe; il pannello di un clock ha 4 righe: nome +
      conteggio + bottoni, segmenti, "Size" + "Colour", nota.
- [ ] **Colori pronti**: Progress / Danger / Neutral / Mystery → un clic cambia il colore di segmenti e bordo; il
      campione scelto si vede acceso. Il quadratino del selettore accanto dà ancora un colore libero, e dopo un colore
      libero nessun campione resta acceso. Il colore arriva anche al clock sulla mappa (⤓ Map) e alla card 💬.
- [ ] **Clock da giocatore**: con un utente senza diritti di modifica la riga Size/Colour non compare; con diritti
      di modifica compare e funziona. Un clock segreto (🙈) resta invisibile al giocatore e non sparisce quando lui
      cambia qualcosa sulla board.
- [ ] **Ranghi delle reliquie**: tab Relics di un PG con una reliquia al rango I → riga Rank I con bordo dorato, sfondo
      e "✓ Unlocked"; Rank II, III, Aspect sbiaditi con bordo tratteggiato e "🔒 Locked", ma i bottoni Upgrade e
      "+1 Dust" restano ben leggibili. Fare un Upgrade → la riga passa a sbloccata.

## Esito playtest del 2 ottobre 2026 (Foundry locale, mondo "test", attori di prova poi cancellati)

Sezioni 1.12.1, 1.13.0 e 1.14.0: 26 controlli passati, 2 bug trovati e corretti subito (versione 1.14.1, voci qui sotto).
Non provati: il lato giocatore (serve un secondo client), il tema chiaro della guida, "riduci animazioni".

## Correzioni del playtest (2 ottobre 2026, versione 1.14.1)

- [x] **Gain vigilance dalle card**: Gates of Hell → bottoni "Vigilance +1" e "Vigilance +2" (Heroic) oltre a Counter; +1 porta
      il tracker da 0 a 1, +2 da 3 a 5, chat "gains Vigilance +N (now N)". Lettore del testo: 32/32 test, su 9.890 testi
      dei compendi cambiano solo 15 (tutti Stalwart, compare il bottone Vigilance).
- [x] **Nome lungo di un power die**: il nome viene tagliato ma "d12" resta visibile; nome intero nel tooltip.

## Status doppioni nascosti sui PG, token legato ai tracker (2 ottobre 2026, versione 1.14.0)

- [x] **HUD del token, PG**: tasto destro sul token di un PG → tavolozza degli status: niente Vigilance, Power Die, Bonus
      Damage, Marked; Blessed c'è.
- [x] **HUD del token, foe/legend**: Vigilance, Power Die, Bonus Damage ci sono; Marked no.
- [x] **Tab Conditions**: PG senza i quattro status e con la frase d'aiuto che rimanda alla tab Combat; foe e legend
      con Vigilance / Power Die / Bonus Damage, senza Marked.
- [x] **Vigilance sul token**: Stalwart, alza la Vigilance in scheda da 0 a 2 → sul token compare l'icona Vigilance;
      il pannello degli status (token selezionato) dice 2; + e − del pannello cambiano il tracker in scheda; a 0
      l'icona sparisce dal token.
- [x] **Power die sul token**: "+ Die" su un PG qualsiasi → icona Power Die sul token; nel pannello "Power Dice ×N" con
      i nomi nel tooltip, senza +/− né ×; scartato l'ultimo dado l'icona sparisce.
- [x] **Fine combat**: "End encounter" svuota i tracker → le icone Vigilance / Power Die spariscono dai token dei PG.
- [x] **Gain vigilance**: card di un'abilità con "gain vigilance" → bottone Gain sul PG → in chat "gains Vigilance +1
      (now N)", tracker +1 (max 6), nessuno status separato. Da giocatore su un alleato: passa dal GM e funziona uguale. — *2 ottobre: giocatore→GM non provato (serve un secondo client); il bottone mancava per "Gain +1 vigilance" → corretto, vedi 1.14.1.*
- [x] **Bonus Damage su un foe**: messo dalla tab Conditions del foe, il tiro del danno lo aggiunge e lo consuma come prima.
- [x] **Migrazione 19**: un PG che prima dell'aggiornamento aveva Vigilance 3 come status e un Power Die 2 → dopo il
      caricamento (GM) tracker Vigilance 3 e un "Power die d6" a 2; Bonus Damage e Marked tolti; console "Migration 19".
- [x] **Marked vecchio su un foe**: un foe che aveva Marked come status lo vede ancora nella tab Conditions (per
      toglierlo); tolto, non ricompare.

## Power die per tutte le classi, Godly Smite (2 ottobre 2026, versione 1.13.0)

- [x] **Tracker per ogni classe**: tab Combat di un PG Stalwart, uno Vagabond, uno Mendicant e uno Wright → sotto le
      risorse di classe c'è il blocco "Power Dice" con "+ Die"; il Wright ha ancora Aether sopra.
- [x] **Aggiungere**: "+ Die" → dialog con nome, dado (d4–d12), partenza → Save: compare "Nome d8" con i tick giusti.
      Senza nome mostra "Power die". Annulla/chiudi il dialog: non aggiunge niente.
- [x] **Tick e limite**: + fino alla dimensione del dado, poi avviso "already at its maximum"; − fino a 0 → il dado
      sparisce. ✕ lo scarta subito.
- [x] **Rinominare**: clic sul nome → dialog senza "Starting at"; cambiare nome e passare da d8 a d4 con 6 tick →
      tick scendono a 4.
- [x] **Tiro**: 🎲 di un d8 tira 1d8 in chat con nome e tick nella flavor.
- [x] **Più dadi** (caso Knave): tre dadi con nomi diversi stanno in fila e vanno a capo senza uscire dalla scheda. — *2 ottobre: con un nome lungo spariva anche "d12" → corretto, vedi 1.14.1.*
- [x] **Fine combat**: "End encounter" svuota i power dice di tutti i PG.
- [x] **Wright, widget nel tratto di classe**: i dadi mostrano il nome; il 🎲 del singolo dado tira la sua dimensione.
- [x] **Dadi Wright vecchi**: un Wright che aveva già dadi prima dell'aggiornamento li vede come "Power die d6".
- [x] **Godly Smite, PG nuovo**: wizard di creazione con job Sealer → il tratto Godly Smite ha il widget "🎲 Power die
      d6" con "Set out at 1". Uguale trascinando il job template Sealer su una scheda e con "set primary job".
- [x] **Godly Smite, PG esistente**: un Sealer creato prima dell'aggiornamento → al caricamento del mondo (GM) la
      migrazione 18 aggiunge il dado (console: "Migration 18: … power die added to Godly Smite").

## Ancora da verificare con Maar (round 4, 30 agosto)

- [x] Dropdown `<details>` delle schede PG restano aperti al cambio turno.
- [x] Burden/Ambition: click sui segmenti e +1 avanzano il clock giusto.
- [x] Heave-Ho mostra il Trigger; Draken Cross mostra Effect dopo Area.
- [x] Pannello status del token non copre le tab della sidebar.
- [x] Badge "Range N" sugli attacchi base; Aether si azzera a fine combat.
