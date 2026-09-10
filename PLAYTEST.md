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

**Segnalazione di Edoardo dal tracker (stessa sera)**: "il PC picks next ma non ho modo di far andare un player" →
i pip erano renderizzati ma fuori dalla sidebar (colonna del nome troppo larga, riga larga 300 px con i pip a
x+296). Corretto via CSS (nome con ellissi, controlli a capo, pip non comprimibili); verificato che il click sul pip
attivi Asteria e "■" chiuda il turno. Nello stesso giro corretto "Round {round}" nell'intestazione (helper
`localize` senza parametri).
- [ ] Da riprovare con la build nuova: tracker con 5+ combattenti (Field Battlemap) → i pip si vedono su ogni riga
      senza scroll orizzontale; lato giocatore compaiono "▶ Take turn" / "■ End turn".

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
- [ ] **Scheda item**: abilità e trait hanno la riga "Power die / starts at / current" e salvano.

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

**Esito del playtest del 9 settembre 2026 (sera, Claude in Chrome sul mondo Jade Regent, scena "test", build 1.3.0)**:
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
- [ ] **Auto-hit e attacco base** (attacco base OK; auto-hit non provato): un'abilità auto-hit (tag `autohit`) con Ape God → nella card "Auto-hit" compare
      comunque la riga Invoke con un d20 tirato e la nota "1d20 rolled only to check the relic invoke (p.245)".
      ⚔ sull'attacco base (Basic/Heavy) → riga Invoke e reminder da attacco (es. Ruin I) presenti.
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

**Esito del playtest del 9 settembre 2026 (sera, Claude in Chrome sul mondo Jade Regent, scena "test", build 1.3.0)**:
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
- [ ] **Relay giocatore → GM**: da un client Player, card del proprio PG con un foe (non posseduto) targettato →
      click "Dazed" → avviso "sent to the GM", bottone "→ GM"; sul client GM il foe riceve lo status e la card
      "is now Dazed". Il tiro del save avviene sul client del giocatore. Con Hatred: passa dal relay dei mark.
- [ ] **Nessun errore in console** aprendo card vecchie (senza blocco), cliccando bottoni su una card il cui
      bersaglio è stato cancellato (avviso "no longer exists"), e con Dice So Nice attivo (il d20 del save
      viene animato).
- [x] **Regressioni**: card d'attacco senza status (Basic Attack) invariata; save di fine turno del tracker
      (rollEndOfTurnSaves) ancora con "Saved! X cleared." / "Failed — X persists."; mark 🎯 e Hatred dalla tab
      Conditions come prima.

## Esito playtest del 10 settembre 2026 (Claude in Chrome, mondo Jade Regent su foundry.codrillo.it, build 1.5.0)

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
- [✗] **True Strike**: metti True Strike sull'attaccante → il dialog dice "True Strike: ignores Evasion (Warrior)"
      e la card mostra "Evasion ignored — attacker has True Strike (p.117)" senza d6. Lo stesso con Unerring. ✗ 10 set: OK con lo STATUS True Strike sull'attaccante; il TAG `true strike` dell'abilità/azione (Demon Cutter, Cleave, Brutal Strike) NON ignora l'Evasion → TODO Sessione 14
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
- [✗] **"Applies to"**: sotto ogni reliquia della tab Relics la riga "Applies to: <abilità>" con le abilità
      equipaggiate che hanno una riga ✦ di quella reliquia (es. Byrax I → le stance). Reliquia senza abilità toccate →
      niente riga. ✗ 10 set: la riga non compare MAI (Paleblood I ha la riga ✦ su Revenge ma nessun "Applies to") → TODO Sessione 14

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
- [✗] **Danno sul save (senza status)**: Jotunn "Titanfall" ("must save or take 6 damage, or 3 on a successful save")
      → bottone rosso "🎲 💥 6 / 3 on a successful save"; click → save → card del danno 6 (fallito) o 3 (riuscito),
      bottone "✓ failed — damage rolled" / "✓ saved". "take [D]+fray twice" → due card (1/2, 2/2). ✗ 10 set: il bottone c'è e funziona su una AZIONE con quel testo, ma Titanfall del Jotunn è un TRAIT e la card dei trait non ha il blocco → TODO Sessione 14
- [x] **Dodge sul save riuscito**: bersaglio con Dodge che supera il save → sulla card "Successful save" la riga ha
      "Dodge — immune"; Apply → "no damage — Dodge — immune to damage from successful saves". Sul save fallito il
      danno passa normalmente.
- [x] **Summon**: azione di un summon con save+danno → [D]/fray presi dal summoner. ✓ 10 set (summon TEST con summoner = PG: d8 + fray 4 del summoner)

**Difese follow-up (Sessione 12)**
- [x] **Rigoletto II**: PG con Evasion e Rigoletto II che evade → nel blocco Evasion la riga "✦ Rigoletto II (