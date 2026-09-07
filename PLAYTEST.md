# PLAYTEST — cose da provare in Foundry (sessione separata, con Claude in Chrome)

Ogni sessione di sviluppo aggiunge qui i suoi test **senza eseguirli**. Una sessione di playtest
dedicata (Foundry aperto, Claude in Chrome sul mondo di test) li esegue, spunta le caselle e riporta
i bug in `TODO.md`. Prerequisito: build deployata in `%LOCALAPPDATA%\FoundryVTT\Data\systems\icon-system`
(ogni sessione la copia a fine lavoro) e F5 nel mondo.

Setup consigliato per il mondo di test: 2 PG (uno Stalwart Demon Slayer con Draken Cross equipaggiato,
uno di un'altra classe), un Foe Heavy importato dal compendio (es. Warrior), l'Armor Demon, il Legend
"Dread Lords", e un combat con tutti dentro.

---

## Sessione 1 (7 settembre 2026) — tag NPC, cap Aether, conferma End Encounter

- [ ] **Tag delle action NPC sopravvivono all'editing**: apri un Foe con action taggate (es. Warrior,
      Cleave ha "true strike"); cambia HP, poi Vigor, poi il nome, poi la classe nel dropdown → i chip dei
      tag restano su tutte le action. Stesso test su un Legend (action, trait, interrupt).
- [ ] **PG: jobs e burden non perdono dati**: su una scheda PG con 2 job e un burden con clock
      parzialmente pieno, cambia un campo qualsiasi della testata → job secondario e segmenti del clock
      invariati.
- [ ] **Aether max 6**: PG Wright, premi + sull'Aether oltre 6 → resta 6 e compare l'avviso; − funziona
      fino a 0.
- [ ] **End Encounter**: con un PG ferito, premi "End encounter" nel tracker e rispondi **No** → gli HP
      restano feriti e il combat resta aperto. Ripeti con **Sì** → HP ricaricati, vigor azzerato, combat
      chiuso.

## Sessione 2 (7 settembre 2026) — chat NPC, tag Draken Cross, Party Resolve

- [ ] **Round Action in chat**: scheda Legend (Dread Lords), 💬 accanto a una Round Action → card in chat
      con nome, badge "Round Action — Round N+" ed effetto. Stesso bottone sulle Round Action di un Foe.
- [ ] **Azioni Legend senza tiro in chat**: Dread Lords → 💬 su "Dread March" (free action, nessun attacco)
      → card con descrizione. Verifica che ⚔/💥 compaiano ancora solo sulle azioni con attacco/danno.
- [ ] **Draken Cross Talent II**: PG con Draken Cross importato **dopo** questa build (o con
      `attack, range-5, medium-blast` scritto a mano nel campo "Tags when unlocked" del Talent II sulla
      scheda dell'abilità). Nel pannello dell'abilità scegli Talent II → i chip diventano "Range 5" e
      "Medium Blast" in oro; hover → tooltip "From Talent II: Charge: …". Torna a "none" → tag normali.
      Controlla anche la card 💬 Show in Chat e la card del tiro d'attacco.
- [ ] **Party Resolve sincronizzato**: combat con 2 PG avviato. (a) Nel banner del tracker premi + due
      volte → "Party Resolve ⚡2" e i badge ⚡p+P di entrambi i PG mostrano party 2; apri le due schede →
      campo Party Resolve = 2. (b) Su un PG premi "Use Limit Break" (costo ≥ 2) → il banner e l'altro PG
      scendono. (c) Modifica a mano il campo Party Resolve su una scheda → banner e altro PG seguono.
      (d) Come giocatore (secondo client o utente non-GM) premi + nel banner → funziona via GM.
- [ ] **+1 a inizio round**: passa al round successivo → Party Resolve +1 (setting "Party Resolve +1 at
      the start of each round" ON di default in Configure Settings → System Settings).

## Sessione 3 (7 settembre 2026) — dati compendium, Rampart/Guard, cartelle

- [ ] **Armor Demon**: importalo di nuovo dal compendio Foes (cartella Demon › Heavy) → classe Heavy,
      VIT 10 / Def 6 / Fray 4 / d6 / Armor 2, trait Guard presente oltre a Sturdy.
- [ ] **Guard → Armor 2**: importa un Heavy qualsiasi (Warrior) → Armor 2. Tira un danno contro di lui
      e premi "Apply Damage" → "2 blocked by Armor". Atrophic Grave (Relict › Heavy) resta Armor 0.
      Nuovo Foe creato da zero → Armor 2 (default Heavy); cambia classe e premi "Apply base stats" →
      Skirmisher/Leader/Artillery tornano a 0.
- [ ] **Rush X sparito**: apri un PG Stalwart esistente → dopo la migrazione (console: "Migration 4")
      il trait "Rush X" non c'è più; restano Armor 2 e Fortify con i pip Vigilance. Crea un nuovo PG
      Stalwart dal wizard → niente Rush X; "Rush X" compare nel dropdown delle regole di classe.
- [ ] **Cartelle nei compendi**: apri Bond Powers (cartelle per Bond), Gear Kits (per Bond, Adventurer's
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
- [ ] **Blocchi delle abilità**: apri Gran Reversa (Seer) o Soul Blade: il testo è diviso in righe
      "Stance:", "Interrupt 1:", "Effect:", "Refresh:" con etichetta in oro e barra a sinistra; il flavour è
      in corsivo. Draken Cross (attacco): Hit → Miss → Area → Effect. Un'abilità non-attacco con Area
      (es. Comet): blocchi prima, Area dopo. Card 💬 in chat: stesso ordine e ora mostra anche Trigger ed
      Effect (prima mancavano).
- [ ] **Keyword con tooltip**: nel testo di un'abilità le parole come "slashed", "weakened", "rush 1",
      "true strike", "gamble", "bloodied" sono sottolineate a puntini (gli status in oro); hover → tooltip
      con la regola del glossario. Vale anche per trait, action dei Foe e card in chat. Controlla che non
      ci siano falsi positivi evidenti (es. "cover" usato in senso comune) e che i link/inline roll di
      Foundry funzionino ancora.
- [ ] **Scheda item**: abilità e trait hanno la riga "Power die / starts at / current" e salvano.

## Sessione 5 (7 settembre 2026) — Level Up e Character Creation nello stile della scheda

- [ ] **Character Creation, aspetto**: nuovo PG vuoto → "Character Setup Wizard". Banda diagonale in
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
- [ ] **Level Up, stage 1**: PG con 15 XP → "Level Up". Banda del colore della classe primaria con
      "N → N+1", chip dei job nella banda, rail "1 Benefits & paths / 2 Your picks". I benefici sono card
      "grant". A L4/L8: le due card "New Job / +1 Mastery" e "Bond Power / Improve 2 Actions"; scegliendo
      "+1 Mastery" la griglia dei job sparisce, con "New Job" ricompare e si può scegliere il job (card).
- [ ] **Level Up, stage 2**: "Next" → recap dorato con bottone "← Change" che torna allo stage 1 tenendo
      le scelte. Abilità come card (★ quelle della classe primaria); contatore "AP N left" che scende
      anche scegliendo un Talent; a 0 le card non selezionate si disabilitano. Mastery/Relic/Bond Power
      come card con descrizione. Footer: riepilogo "x/y AP · mastery picked …". "Confirm Level Up" applica
      tutto come prima (livello, AP, item embeddati, messaggio in chat).

## Ancora da verificare con Maar (round 4, 30 agosto)

- [ ] Dropdown `<details>` delle schede PG restano aperti al cambio turno.
- [ ] Burden/Ambition: click sui segmenti e +1 avanzano il clock giusto.
- [ ] Heave-Ho mostra il Trigger; Draken Cross mostra Effect dopo Area.
- [ ] Pannello status del token non copre le tab della sidebar.
- [ ] Badge "Range N" sugli attacchi base; Aether si azzera a fine combat.
