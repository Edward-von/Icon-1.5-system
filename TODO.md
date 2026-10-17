# TODO — backlog feedback Maar (compilato 7 settembre 2026)

Fonte: messaggi Discord di Maar del 5–7 settembre 2026. Questo file è la **fonte di verità** tra una
sessione e l'altra: ogni sessione fa un blocco, spunta le voci, aggiorna il CHANGELOG e committa.

Come lavorare una sessione:
1. Sessione nuova (`/clear`), prompt: "Leggi TODO.md e fai la sessione N".
2. Fare SOLO il blocco indicato. Se qualcosa esce dal blocco → aggiungerlo qui, non farlo.
3. Fine sessione: **compilare `PLAYTEST.md`** con i test del blocco (NON eseguirli: il playtest è una sessione
   separata in una sessione dedicata), voce in CHANGELOG.md, deploy, commit, spuntare le caselle qui.
   Ogni blocco qui sotto sottintende la voce "[ ] compilare PLAYTEST.md".
4. **Ogni modifica fatta va segnata in `PLAYTEST.md`**, anche se non è una voce di questo file (fix
   laterali, ritocchi emersi lavorando): niente cambia nel sistema senza una riga di test corrispondente.

Legenda difficoltà: S = poche righe · M = mezza sessione · L = una sessione · XL = più sessioni.

---

## Round di debug del 16 ottobre 2026 — documento "16.10.2026.docx"

Versione aggiornata del documento del 15 ottobre: tutto quello che c'era ieri è identico, parola per parola. Le novità
sono la voce **Limit Break** (alta priorità; ieri "None, currently!"), le sezioni **Vagabond** (Fool, Freelancer,
Shade, Warden) e **Wright** (Enochian, Geomancer, Spellblade, Stormbender) di Ability Bugs, e un commento nuovo di Turz Ven
(sulle versioni Infuse, vedi R60). La numerazione continua da R37, perché R33-R36 del round di ieri sono ancora aperti.
La build in cui Maar ha scritto le voci nuove non è nota: le voci "già fatto" sotto vanno verificate sulla 1.15.36 o
successive.

Già fatti o già coperti (nessun punto nuovo, solo da far verificare a Maar):
- Tutte le voci del documento di ieri: R1-R32 fatti (1.15.3-1.15.36); R33-R36 restano da decidere.
- Keyword evidenziate nel testo di colore, fatto in 1.15.8 (R6): Diablo "summons", Incubus "slashed", Ätherwand
  "summon", Fulminate "unstoppable", Nothung "summon", Odinforce "pierce", Rampant Nail "flying", Death Blossom
  "flying sleeves" nel testo di colore (controllato nel compendio: sono tutte prima della prima etichetta di regole). Morrigan
  e il nome della combo di Death Blossom invece no → R50.
- Mist Strider con il summon "shadow" e Blackstar con il "bomb": corretti in 1.15.9 (R7, un'abilità offre solo i summon
  del suo job).
- Pelagic Rage, "No way to give yourself the aura 2": fatto in 1.15.23 (R19c, bottone aura sui tratti).
- Party Favor, la mastery non permette di marcare: fatto in 1.15.19 (R17, cita proprio la mastery di Party Favor).
- Showdown, "indicate the chosen target without it being a mark": fatto in 1.15.34 (R30, Showdown è tra le abilità
  con Track target).
- Gamble di Death e di Spinning Top, anche con lo Stacked Die: fatto in 1.15.29 (R25, la finestra del gamble ha già lo
  Stacked Die del Fool).
- Più istanze dello stesso danno: Assassinate, Gwynt, Dragon Dive, Realignment, Blitz, Nothung, "the usual comment",
  fatto in 1.15.28 (R24). Da verificare che il campo Instances si precompili per ognuno ("twice", "N times", "to a
  maximum of four times" di Nothung probabilmente no: in quel caso si scrive a mano).
- Umbral Echo, "ping just the interrupt part of the mastery talent (Bunshin)": l'interrupt Soul Proxy sta dentro la
  mastery, quindi il bottone chat della mastery (R31, 1.15.35) lo posta già, anche se insieme alla riga "Gain the
  following interrupt". Gli interrupt scritti nel testo base sono un'altra cosa → R61.
- Terrain effect, oggetti e segni da piazzare sulla mappa: aggiunti all'elenco di R33 (round di ieri, da decidere).

### Bug

- [x] **R37. Limit Break che fanno danno senza tiro del danno** (M, bug, alta priorità)
      "several ones that do damage don't have a damage roller attached". Citato Gigaflare ("Also does not have a
      damage roller", Enochian: "[D]+fray divine damage to every character on the battlefield"). Controllare tutti i
      Limit Break dei job che fanno danno (`limit-break`: campi `effect` e `ultimate`) e dare loro il tiro del danno come le
      abilità, con tipo (divine), istanze ("twice", "four times") e [D] del PG.
      (FATTO il 16 ottobre 2026, versione 1.15.37: bottone "Damage Roll" nel riquadro Limit Break quando il testo fa
      danno, con la finestra e la card delle abilità; il primo danno è Hit, le altre frasi con danno (e dal capitolo 3
      quelle dell'Ultimate) sono in Other; tag Divine → danno divino; Instances da "three times". Infuse esclusi (R38).
      Corretto anche il Divine automatico delle abilità, rotto dalla 1.15.28.)
- [x] **R38. Limit Break: effetti speciali non usabili** (M/L, bug, alta priorità)
      "ones with special effects (Paradiso's Aura, Gigaflare's infused version, etc) don't allow the player to utilize
      those functions with the limit break properly." Paradiso (Freelancer, tag `aura`: "You gain Aura 2 until the end of
      your next turn"): manca il bottone aura. Gigaflare: "Limit break cannot currently use its infused variant,
      Tetraflare" ("Infuse 6: TETRAFLARE — Deal [D]+fray twice instead"; anche METEOR, Infuse 8). Probabilmente la card
      dei Limit Break non passa da aree / infuse / Inflict delle abilità. Se aura e infuse risultano due cause diverse,
      dividere il punto.
      (FATTO il 16 ottobre 2026, versione 1.15.38: diviso in due, qui la parte aura / aree. Il riquadro Limit Break non
      aveva il bottone dell'area: ora c'è quando tag o testo danno un'aura o un'area (Paradiso, High Prophecy, Elemental
      Aura 2; Death Sentence Line 4; Split Heaven and Hell Line 5; Curtain Call Line; Cataclysm Line larga 3 o Medium
      Blast, ovunque sulla mappa), piazzata come per le abilità, con la durata dell'aura letta dal testo. Gli Inflict
      c'erano già sulla card di "Use Limit Break". Gli Infuse sono una causa diversa → R38b.)
- [x] **R38b. Limit Break: versioni Infuse** (M, bug, alta priorità; diviso da R38)
      Gigaflare: "Limit break cannot currently use its infused variant, Tetraflare" ("Infuse 6: TETRAFLARE — Deal
      [D]+fray twice instead"; l'Ultimate METEOR, "Infuse 8: 6 resolve. Deal [D]+fray four times instead", con il 999
      divine damage dello "Special effect"); Gran Levincross: "Slay or Infuse 3: RAGNARÖK" e l'Ultimate "GÖTTERDÄMMERUNG
      — Infuse 6" (2[D]+fray divine). Causa diversa dall'aura: il riquadro Limit Break non ha la scelta Infuse delle
      abilità (spesa di Aether, versione armata) e il Damage Roll di R37 non legge le righe "Infuse N:". Da fare: scelta
      della versione Infuse sul Limit Break (Aether speso, testo della versione usata nella card, Instances "twice" /
      "four times" nel Damage Roll).
      (FATTO il 16 ottobre 2026, versione 1.15.39: il riquadro Limit Break ha un bottone Infuse per versione, come le
      abilità (Aether speso, ricliccare lo restituisce; l'Ultimate dal capitolo 3). Armata, "Use Limit Break" ne posta
      il testo e ne paga la Resolve (Meteor 6); il Damage Roll usa il suo danno "instead" (Tetraflare Instances 2,
      Meteor 4) e offre in Other Götterdämmerung (armata), Ragnarök (sempre, c'è lo Slay) e il 999 divine del Special
      effect di Meteor. Meteor costa 8 Aether ma il massimo è 6: vedi Emerso lavorando.)
- [x] **R39. Limit Break: formattazione** (S/M, bug, alta priorità)
      "some of the formatting on them is off". Il documento non dice quali. Guardare tutti i Limit Break (card e scheda)
      e sistemare quelli con blocchi non etichettati o sullo stesso paragrafo (es. Gigaflare ha "Divine, Unerring, True
      Strike." ripetuto in testa all'effetto, già nei tag). Domanda per Maar, se non è evidente: quali Limit Break?
      (FATTO il 16 ottobre 2026, versione 1.15.40: riquadro, card di "Use Limit Break" e scheda oggetto mostravano il
      testo grezzo, senza a capo né etichette. Ora: tag su una riga loro, un paragrafo per blocco con l'etichetta in
      grassetto (Effect, Attack, Aura, Stance, Delay, Infuse…), elenchi "•" una voce per riga, descrizione in corsivo.
      Nel compendio Jobs ripristinati etichette e a capo del libro per Gigaflare, Gran Levincross, Elemental,
      Cataclysm, March of the Saints e Death Sentence; migrazione 25 per le copie sulle schede.)
- [x] **R40. Combo che sostituiscono solo una parte della base** (S/M, bug, continua R1)
      (FATTO il 16 ottobre 2026, versione 1.15.41: "Instead of the mark, gain Effect: …" toglie il blocco Mark e il tag
      Mark (Succubus, p.164); una combo senza blocchi che dice "instead of <verbo>-ing" sostituisce il blocco della
      base su quel verbo (Penumbra, p.162, al posto di "You may teleport 3"). Toccate solo queste due combo.)
      - Umbra / Penumbra: "Combo text does not properly replace specified effect within the ability string when toggled
        on". Penumbra: "Teleport your foe up to 3 spaces towards you instead of teleporting yourself" (sostituisce
        l'Effect "You may teleport 3 before the attack").
      - Incubus / Succubus: "Combo version does not properly clear out the mark text from the print-to-chat box"
        ("Instead of the mark, gain Effect: …"). Assorbe la voce "Emerso lavorando su R1 — Incubus / Succubus".
      R1 riconosce "replace the base effect with"; queste due combo dicono "instead of …". Controllare sul manuale.
- [x] **R41. Inflict su tutti i bersagli dell'area invece che sul solo bersaglio dell'attacco** (S/M, bug)
      (FATTO il 16 ottobre 2026, versione 1.15.42: sulla card d'attacco con un bersaglio d'attacco scelto e altri token
      nell'area, Hit / Miss / Crit / Exceed e le frasi "Attack target is / Foe is / your foe" vanno solo al bersaglio
      d'attacco, il blocco Area solo agli altri, le frasi su tutti ("foes in the area", "foes inside") a tutti; p.94 e p.97.)
      Blackstar: "Shattered effect prompts the user to place shattered on all targets in the area, not just the main
      attack target." Drifting Leaf: "Only the attack target should be prompted for the shatter effect. Inflict currently
      presents all targets in the area." (Drifting Leaf: "Effect: Foe is shattered.")
- [x] **R42. Status del talento non proposti nell'Inflict / Gain** (S/M, bug)
      - Shadow Play Talent II: "one of them can gain evasion until the start of their next turn", niente evasion.
      - Blazing Bond Talent II: niente Defiance.
      - Mist Strider: con la mastery sbloccata il dazed non va nel riquadro Inflict. → diviso in R42b (causa diversa).
      Forse è la stessa lettura del testo di R18 ("also become"): "can gain …" / "one of them". Se le cause sono diverse,
      dividere.
      (FATTO il 16 ottobre 2026, versione 1.15.43: non era la lettura di R18. "one of them" / "they" con gli alleati
      nominati prima nella frase ora dà il Gain agli alleati (Shadow Play Talent II, Evasion), e "Grant both you and
      your ally defiance" dà il Gain a te e all'alleato (Blazing Bond Talent II). Di riflesso anche Crimson Bloom
      Talent I, Divine Aegis Talent II e la mastery di Wish ("they also gain defiance"). Solo codice.)
- [x] **R42b. Mist Strider: il dazed della mastery non va nell'Inflict** (S, bug)
      Mastery River Guardians (p.170): "Foes that start their turn inside the area that end their turn outside of it
      take 2 damage and are dazed." Causa diversa da R42: la lettura scarta lo status perché nella frase c'è "end"
      ("end their turn"), che per il parser vuol dire "togliere uno status" ("ends the dazed"). Va escluso "end(s)
      their / its / your turn" da quella parola.
      (FATTO il 16 ottobre 2026, versione 1.15.44: "end / ends / ended / ending" seguito da "their / its / your / a /
      the turn" non conta più come "togliere uno status". Mist Strider con la mastery propone l'Inflict Dazed; di
      riflesso anche Ätherwand ("Foes that end their turn in the area are shattered", p.226) propone lo Shattered.
      Solo codice.)
- [x] **R43. Summon del proprio job su abilità che non lo creano** (S, bug)
      Harrow: "Currently has a shadow in the ability, despite only consuming them, rather than placing them." Shadow Play:
      "Has the shadow summon in it's ability card, despite not placing shadows." (Harrow Talent II: "consume a shadow"; in
      Shadow Play "shadow" compare solo nel nome della mossa.) Il collegamento per nome di R7 deve ignorare "consume a
      shadow" e simili.
      (FATTO il 16 ottobre 2026, versione 1.15.45: il summon compare solo se il nome segue un verbo che lo crea
      ("summon a shadow", "create a plant", "leave a bomb"…), e si leggono tutti i blocchi dell'abilità (Finishing
      Blow, Slay, Collide…). Perdono il summon Harrow, Shadow Play, Nocturne, Assassinate, Fairy Ring; Harvest passa da
      Plant a Thrall; guadagnano Underway, Heave-Ho, Cavaliere. Solo codice.)
- [x] **R44. Tratti che evocano un summon senza il summon collegato** (S/M, bug)
      Bound Spirit (Freelancer, Astral Seraph), Beast Master (Warden, Great Beast), Selkie (Stormbender) e Cheap Trick
      (Fool, "leave a bomb in an adjacent space"; "Having a bomb summon node on this trait would be useful"). Come per l'aura
      dei tratti (R19c), i tratti non hanno il bottone summon delle abilità.
      (FATTO il 16 ottobre 2026, versione 1.15.46: i tratti sbloccati mostrano il chip del summon che creano, accanto al
      bottone aura; stessa regola delle abilità più il riconoscimento della scheda della creatura nel testo ("place your
      seraph", "summon it"). Hanno il chip Bound Spirit, Beast Master, Selkie, Cheap Trick e Darkside. Solo codice.)
- [x] **R45. "Hit (no damage)" proposto dove non serve** (S, bug)
      Dragon Dive ("Damage roller has the option of 'hit (no damage') on this despite that not being necessary") e Bifröst
      ("Damage roller says 'Hit (no damage)'"). Capire quando la finestra del danno mostra quella scelta.
      (FATTO il 16 ottobre 2026, versione 1.15.47: la scelta Hit compare solo se il colpo fa danno, se l'abilità è un
      attacco o se non c'è altro danno; le abilità non-attacco con solo danno d'area aprono su Area. Cambiano Dragon
      Dive, Bifröst, Chaos Tarot, Justice, Comet e 83 azioni ad area dei foe. Solo codice.)
- [x] **R46. Danno di Infuse e mastery che lo cambiano non aggiornato nel tiro del danno** (M, bug)
      - Cryo, Infuse 3 CRYOTIC: "increase damage to fray damage", ma il tiro resta a 1; idem per la mastery MAGNACRYO
        (Hit 2[D]+fray, Area [D]+fray).
      - Bio / Magnabio: "Alternate version (magnabio) does not update the damage die properly."
      - Geo, mastery Infuse 6 MAGNAGEO: l'Area deve diventare [D]+Fray, il tiro propone solo Fray.
      - Nothung, mastery EXCALIBUR: "All 1 piercing damage listed by this ability becomes divine", il tipo non cambia.
      Serve che il tiro del danno legga la versione infusa / della mastery quando è attiva.
      (FATTO il 16 ottobre 2026, versione 1.15.48: con un Infuse armato il tiro del danno usa le righe Hit / Miss /
      Area della versione (MAGNABIO, MAGNAGEO, MAGNACRYO, MAGNAPYRE, GREAT SPIRIT LANCE) o il suo "damage to …"
      (CRYOTIC, AEONCLOUD); MAGNACRYO parte con un dado bonus ogni due Aether spesi e si tira per colpire. EXCALIBUR
      rende divine i danni "1 piercing" proposti (Talent I di Nothung). Solo codice.)
- [x] **R47. Aree di Infuse e talenti che cambiano dimensione** (S/M, bug)
      - Ätherwand, Infuse X ÄTHERSTURM ("Extend the area by 1 space for every Aether infused, up to +3"): "Only allows you
        to select line 3".
      - Rime / Magnarime: "variable arc is not properly handled, although it's base arc is listed properly."
      - Sturmreiten Talent II ("Comeback: You may extend Sturmreiten's area by another line 3 area, drawn in a different
        direction"): "A way to use talent 2's extension would be useful."
      (FATTO il 16 ottobre 2026, versione 1.15.49, solo i primi due: con un Infuse X armato l'area cresce con l'Aether
      speso — ÄTHERSTURM allunga la Line 3 di Ätherwand di 1 per Aether fino a +3, MAGNARIME fa Arc 4 + Aether a range
      6 — e la versione armata è la prima scelta; le mastery che sono un Infuse cambiano l'area solo da armate. Solo
      codice.)
- [x] **R47b. Sturmreiten Talent II, seconda Line 3** (S/M, pronto: risposta di Maar del 17 ottobre 2026): "Comeback: You may extend Sturmreiten's area by another
      line 3 area, drawn in a different direction" (p.227): "A way to use talent 2's extension would be useful." Il
      piazzamento fa una sola Line alla volta; servirebbe, col Talent II scelto, una seconda Line 3 in un'altra
      direzione dallo stesso punto (o dalla fine della prima: il testo non lo dice, da chiedere a Edoardo) unita alla
      prima per i bersagli.
      Domanda per Edoardo: la seconda Line 3 parte dallo stesso punto della prima o dalla sua fine? (p.227 non lo dice)
      Risposta di Maar (17 ottobre 2026): "it should be either-or. So, choosing to place it in either place as the
      extension- first or last square." → l'utente sceglie: la seconda Line 3 parte dal primo o dall'ultimo spazio
      della prima, in un'altra direzione.
      (FATTO il 17 ottobre 2026, versione 1.15.73: col Talent II scelto, dopo la Line 3 si sceglie From the first space /
      From the last space / No extension, poi si piazza la seconda Line 3 accanto a quello spazio, in un'altra direzione
      e senza sovrapporsi; un solo template con le due Line, bersagli di entrambe. Se non si è bloodied (Comeback) la
      domanda lo dice e il default è No. Solo codice.)
- [x] **R48. Aure date ad altri o in alternativa** (M, bug)
      - Warding Bolts, mastery Phantom Bolts ("hover around you as an Aura 2 instead"): "No way to give self aura 2".
      - Fulminate: "No way to apply the aura to the marked character" ("The character gains aura 2 while marked"); i
        talenti la portano a 3 o a 1 ("making it a aura that can shift sizes would be useful", vedi R32).
      - Rampant Nail: "No way to give the aura to the area effect" (lo spuntone è un terrain effect con "Aura 2").
      Assorbe la voce "Emerso lavorando su R19 — aure alternative nel testo non proposte" (anche l'Heroic di Rook).
      R19b ha già il caso dell'alleato bersagliato: Fulminate potrebbe riusarlo.
      (FATTO il 16 ottobre 2026, versione 1.15.50: il bottone area legge anche le aure scritte nel testo: Phantom Bolts
      offre "Mastery: Aura 2" attorno a te; Fulminate ha il bottone area con Aura 2 attorno al token bersagliato, più
      Aura 3 / Aura 1 con i talenti; Rampant Nail piazza "Aura 2 (terrain effect)" attorno a uno spazio in range 3, ferma;
      il testo Heroic è letto (Rook "Heroic: Aura 2", anche Land Waster "Heroic: Burst 2 (target)"). Solo codice.)
- [x] **R49. Aree di Slay / Finishing Blow e mastery non piazzabili** (S/M, bug, da verificare)
      Death: "No way to easily place the large blast area effect from slay/finishing blow." Elden Rune: "include a small
      blast version for the Mastery." Eye of the Storm: "A way to place the area effect from mastery would be useful."
      R20 legge le aree di talento, mastery e combo; Slay / Finishing Blow forse no. Prima controllare se sono aree vere
      (area effect) o terrain effect da piazzare (R33).
      (FATTO il 16 ottobre 2026, versione 1.15.51: il bottone area legge Exceed, Crit, Collide, Slay, Finishing Blow e
      Comeback; un'area "centered on them / your foe" va da sola sul token bersagliato, "centered on you" su di te:
      Death offre "Slay / Finishing Blow: Large Blast (target)", poi Soul Shot, Matsuri, Gust, God Hand, Ace e altri;
      "burst N (target)" nel testo ora letto giusto. Elden Rune offriva già la Small Blast della mastery; la mastery di
      Eye of the Storm è un oggetto (R33). Solo codice.)
- [x] **R50. Keyword evidenziate fuori dal testo di colore** (S, bug)
      - Morrigan: "The first line of the effect text has summon highlighted, as if the flock being summoned from morrigan
        is a summon (character type), but it is not. The second line is correct; don't remove that underlining".
        Nel compendio la descrizione non ha etichette, quindi è tutta regole ("you summon a massive flock").
      - Death Blossom: "the name 'Flying Sleeves'" (nome della combo) evidenziato come keyword.
      (FATTO il 16 ottobre 2026, versione 1.15.52: nei testi dei PG il verbo "summon a …" ha il tooltip Summon solo
      se dopo c'è una creatura del compendio Summons; il nome all'inizio di combo, mastery e ultimate non riceve
      keyword. Cambiano 12 testi del compendio Jobs, foe e trofei no.)
- [x] **R51. Stack Dice: al capitolo 3 il secondo dado non si può alzare** (S, bug)
      "When at chapter 3, the trait properly shows having 2 stacked die to use, but does not allow the user to increment up
      the second dice." Il testo del tratto nel compendio dice "only hold on to one Stacked Die at once": cercare sul
      manuale cosa cambia al capitolo 3.
      (FATTO il 16 ottobre 2026, versione 1.15.53: al capitolo 3 Death's Apprentice permette 2 Stacked Dice (p.150);
      il template passava un massimo vuoto al click, che si fermava a 1. Ora il secondo dado si accende.)
- [x] **R52. Chronotemper: tag "Power Die" senza power die** (S, dati) (pronto: risposta di Maar del 17 ottobre 2026)
      "(This is an error with the book) Ability tag says 'Power Die' despite not utilizing die mechanics." Verificare
      sul manuale; se è un errore del libro, decidere se toglierlo (pack + migrazione) o lasciarlo come nel libro.
      Verificato: il libro (p.152) stampa davvero "1 action / Mark, Power die", ma né il testo né altro usa un dado
      (Cheat Time fa un Gamble, non un power die; Chronotemper non ha talenti né mastery). Nel compendio Jobs ha tags
      ["mark","power-die"] e nessun dado: sulla scheda compare solo l'etichetta "Power Die" con il suo tooltip,
      nessun contatore.
      Domanda per Edoardo: (a) togliere il tag "power-die" da Chronotemper nel compendio Jobs, con una migrazione che lo
      toglie anche dalle schede dove l'abilità è già presa (si discosta dal libro, ma l'etichetta non trae in inganno),
      oppure (b) lasciarlo come stampato nel libro e chiudere il punto senza modifiche?
      Risposta di Maar (17 ottobre 2026): "Yes, I think removing it just to be more clear so a player doesn't get
      confused." → (a): togliere "power-die" dal pack Jobs + migrazione sulle copie già prese.
      (FATTO il 17 ottobre 2026, versione 1.15.74: compendio Jobs con tags ["mark"]; la migrazione 30 toglie
      "power-die" dalle copie già prese. Nota: Chronotemper ha talenti e mastery Revolution, nessuno usa un dado.)
- [x] **R53. Heave-Ho: l'Effect dopo l'Area** (S, dati)
      "The 'Effect' is currently listed after the area, when the effect should go first, as the area is made with the
      effect." (Nel round 4, 30 agosto, era stato separato Trigger/Effect; l'ordine "Effect dopo Area per gli attacchi" di
      Draken Cross potrebbe valere anche qui, ma Heave-Ho non è un attacco.)
      (FATTO il 16 ottobre 2026, versione 1.15.54: il libro (p.234) stampa Trigger, Effect, poi il testo dell'area e
      Collide; Heave-Ho nel compendio ha ora l'ordine dei blocchi "effect, area", la migrazione 26 lo mette sulle copie.)
- [x] **R54. Eye of the Storm: "Special" e ordine Area / Effect** (S, dati)
      "The second line of flavor text is actually supposed to be a Special: keyword. (The book forgets the 'special' part
      of this.)" e "Should be formatted Area: [D]. Effect: Instead of how it currently is formatted (missing highlights and
      keywording)". Assorbe la voce "Emerso lavorando su R8 — Eye of the Storm".
      (FATTO il 16 ottobre 2026, versione 1.15.55: il libro (p.236) stampa la riga "This attack has no attack space…"
      senza etichetta, poi Area effect: [D], poi Effect; nel compendio la riga ha ora "Special:", l'Effect è uscito dal campo
      dell'area ed è un blocco suo, ordine "special, area, effect"; la migrazione 27 lo fa sulle copie.)
- [x] **R55. Helix Heel: la prima riga del testo di colore è il primo effetto** (S, dati)
      "The first line of flavor text is actually the first effect of the ability." Assorbe la voce "Emerso lavorando su R8 —
      Helix Heel" (p.219, "Effect: Release a shockwave in a line 3 area effect…").
      (FATTO il 16 ottobre 2026, versione 1.15.56: il libro (p.219) non ha testo di colore e apre con "Effect: Release a
      shockwave…"; nel compendio mancava l'etichetta, ora c'è; la migrazione 28 la mette sulle copie con il testo originale.
      Bottone area (line 3) e danno (2 piercing) invariati.)
- [x] **R56. Quaking Palm: niente Track target** (S, bug)
      "Some way to mark the chosen character would be nice." Il testo dice "When they end their next turn" (non "that
      foe's next turn"), quindi il bottone Track target di R30 probabilmente non compare.
      (FATTO il 16 ottobre 2026, versione 1.15.57: Track target compare anche con "when they end their next turn,
      they…" / "at the end of their next turn, they…"; sul compendio Jobs lo guadagnano Quaking Palm, Sidhe e Dark
      Sliver, nessuna abilità lo perde; le semplici durate "until the end of their next turn" restano senza.)

### Richieste

- [x] **R57. Stack Dice: bottone "Use"** (S)
      "Having a 'use' button that automatically decrements the die from 1 to zero could be useful, along with printing
      to chat '(character name) used their stacked die' or something similar."
      (FATTO il 16 ottobre 2026, versione 1.15.58: bottone Use accanto ai dadi del tratto, scala di 1 e posta in chat che
      il gamble fa 6; spento a 0; la finestra del gamble spende il suo dado da sola, nessun doppio scalo.)
- [x] **R58. Boon of Chaos: evasion del difensore nel tiro d'attacco** (S/M)
      "Currently no way during an attack to toggle that the defender has evasion. Some kind of modal on the attack roller
      would be useful for conditionals like this (evasion if a certain distance away)."
      (FATTO il 16 ottobre 2026, versione 1.15.59: casella "Defender has evasion" su ogni bersaglio della finestra
      dell'attacco, spuntata da sola con lo status Evasion e modificabile a mano; il tiro d'Evasion (p.146) usa la casella;
      il tratto nel libro è Curse of Chaos, p.149.)
- [x] **R59. Spendere Aether senza attacco, con messaggio in chat** (S/M)
      Tsunami: l'Infuse si scala solo attaccando, ma Tsunami non tira; "Some alternate button to spend 1 aether and then
      print to chat the stormlash ability would be useful." Aether Deflection (tratto): "you can spend 2 Aether any time
      to regain it", "Some way to activate and print to chat that you're using aether to regain the use".
      (FATTO il 16 ottobre 2026, versione 1.15.60: una versione Infuse con un suo costo d'azione, come STORMLASH (Free
      Action), si usa subito: scala l'Aether e posta in chat senza restare armata; Aether Deflection ha il bottone
      "Regain (2 Aether)" che scala 2 Aether e lo scrive in chat.)
- [x] **R60. Versioni Infuse nella card: solo quella usata** (M)
      "when an ability isn't infused, printing the base ability doesn't need to print out the infused variant's effects …
      some abilities have multiple different infuse variations, so the base card is massive. Having a base ability not
      including the infuse variants on cast could be useful- or maybe they're collapsibles in the card themselves."
      Commento di Turz Ven: "Also could be that toggling the 'Infuse' cost button on the card will instead change what is
      printed out when following buttons are selected. Instead of automatically printing it to chat, it just swaps which
      one is posted."
      Insieme: resa più leggibile delle versioni Infuse / alternative ("make it look mostly similar to an ability
      card"): Bio ("Alternate version card is hard to read"), Lance (versione della mastery), Pyre (versione infusa).
      (FATTO il 16 ottobre 2026, versione 1.15.61: senza Infuse armato la card Show in Chat mostra la base e ogni versione
      come riga chiusa col nome; con una versione armata quella è il blocco principale e il titolo la nomina, una
      versione completa (Magna, Great Spirit Lance) chiude anche la base; le versioni su una riga sono spezzate in
      blocchi Hit / Miss / Area / Effect; la card d'attacco usa Hit / Miss della versione armata.)
- [x] **R61. Postare da solo un interrupt scritto nel testo dell'abilità** (S/M)
      Chronotemper (Cheat Time, nel Mark): "Some way to print out just the interrupt part of this ability would be useful
      for legibility. Make this this version updates if the mastery is taken." (mastery Revolution: tre volte per round).
      Drifting Leaf (LEAF ON THE WIND): "A way to ping the interrupt separate from the ability would be useful." Come il
      bottone chat di R31, ma per un blocco "Nome — Interrupt N" dentro la descrizione.
      (FATTO il 16 ottobre 2026, versione 1.15.62: bottone fumetto accanto a ogni blocco "Nome — Interrupt N"
      dell'anteprima, card con Trigger ed Effect più le righe che lo cambiano (PHANTOM BLADE, talento scelto, mastery
      sbloccata: Revolution); la forma col punto "Cheat Time — Interrupt 1." diventa un blocco unico come quella coi due
      punti; 8 blocchi nel pack jobs, elenco nel CHANGELOG.)
- [x] **R62. Promemoria "round N or later" nel tracker** (M)
      Storm Hilt Rage: "having the combat tracker announce the timing of these (based on the players and NPCs within the
      combat) would be incredibly helpful. Many times, PCs have forgotten major buffs they would've gotten. Many, many
      times." (Molte mastery dicono "At round 4 or later": Drifting Leaf, Odinforce, Cryo, Tsunami, Shadow Play…)
      (FATTO il 16 ottobre 2026, versione 1.15.63: all'inizio di ogni round il GM attivo posta "Round N" con quello che
      si accende proprio in quel round: card pubblica per i PG (solo talento scelto, mastery sbloccata, tratti del
      capitolo, rank di relic sbloccati), card sussurrata al GM per foe e legend; letti "round N or later / N+ / from
      round N", "at the start of round N", liste e "every N rounds thereafter"; conteggio sui pack nel CHANGELOG.)
- [x] **R63. Soulfire: cambiare le soglie di crit / exceed nel tiro** (M, pronto: risposta di Maar del 17 ottobre 2026)
      "Some way to actively modify the crit/exceed values on the roller would be useful here, especially if automated.
      There's a relic that does something similar (-1 required number per round in game for crit/exceed)". Trovare la
      relic sul manuale.
      Risposta di Maar (17 ottobre 2026): "It's ARENHEIR, tier 3, and aspected." Arenheir (p.252): "III. Your threshold
      for exceed and critical hits is decreased by 1, and decreases again by 1 at round 3 and 5. Aspected: When you
      score a critical hit, reduce the threshold for critical hits by 1. This cannot reduce it lower than 15+."
      Soulfire (Enochian, p.208): "Comeback: Your threshold to critical hit becomes 18+, and your threshold to exceed
      becomes 13+. If you're at 1 hp, these thresholds are reduced to 15+ and 10+." Da fare: soglie di crit / exceed
      variabili nel tiro d'attacco (oggi fisse), calcolate da Soulfire e da Arenheir III / Aspected.
      (FATTO il 17 ottobre 2026, versione 1.15.75: stepper "Crit on" / "Exceed on" nel dialog d'attacco, precompilati da
      Soulfire, Arenheir III e Aspect e modificabili a mano; la card in chat usa le soglie scelte.)
- [x] **R64. Ridurre il costo in Aether delle abilità** (M/L, pronto: risposta di Maar del 17 ottobre 2026)
      Conqueror's Edge "and the one from Enochian": "there is no way to reduce aether costs on abilities … how to
      implement, I have no idea." Domanda per Maar: quale abilità dell'Enochian?
      Risposta di Maar (17 ottobre 2026): "The trait's name is 'Inner furnace'." Inner Furnace (Enochian, p.208):
      "Once a round, you may burn your own life force when you Infuse an ability. You can sacrifice 25% of your max hp
      to reduce the Aether cost of that ability by 2." Da fare: all'Infuse, se c'è il tratto e non è già stato usato
      nel round, proporre il sacrificio del 25% degli hp massimi per pagare 2 Aether in meno (insieme a Conqueror's
      Edge).
      (FATTO il 17 ottobre 2026, versione 1.15.76: all'Infuse Conqueror's Edge toglie 1 se un foe è in range 2, Inner
      Furnace chiede una volta per round se sacrificare VIT hp per 2 Aether in meno; annullare restituisce tutto;
      l'Infuse X non viene scontato.)
- [x] **R65. Aethershard come un summon** (M, da decidere)
      "Something similar to a summon ability would be useful here." Forse rientra in R33 (oggetti sulla mappa).
      (CHIUSO il 17 ottobre 2026: Maar conferma che rientra in R33, "That sounds right, yeah." Già fatto in R33a-R33a4,
      versioni 1.15.65-1.15.68: Aethershard è un oggetto sulla mappa con Move del Talent I, i danni quando è preso in
      un'area e AETHERSHIFT; il Talent II resta in R33a5. Nessuna modifica nuova, da far verificare a Maar.)

### Emersi lavorando

- [x] **Emerso lavorando su R37 — l'Ultimate dei Limit Break non si vede** (S/M): il riquadro Limit Break della
      scheda e la card di "Use Limit Break" mostrano solo `effect`; il campo `ultimate` (p.113, sbloccato al
      capitolo 3) non compare da nessuna parte, nemmeno al capitolo 3. Il Damage Roll di R37 ne legge già il danno.
(FATTO il 17 ottobre 2026, versione 1.15.82: la scheda mostra l'Ultimate sotto l'Effect, sbiadito con lucchetto finché
      system.combat.chapter è sotto 3; dal capitolo 3, stessa soglia di #limitBreakTexts e del Damage Roll di R37, la
      card "Use Limit Break" ne aggiunge testo e bottoni degli status. File: templates/actor/icon-combat.hbs,
      module/actor/sheets/IconSheet.mjs, css/icon.css.)
- [x] **Emerso lavorando su R37 — danno in percentuale degli hp non tirabile** (S/M, pronto: risposta del 17 ottobre 2026): Gigantas Crusher
      (Colossus, "50% of their max hp as divine damage") e Split Heaven and Hell (Demon Slayer, "100% / 50% / 25% of
      max hp") non hanno un danno tirabile; Gigantas Crusher propone solo il "divine fray damage" dei Legend. Valutare
      un Apply che toglie la percentuale degli hp massimi del bersaglio.
      Risposta dal manuale (17 ottobre 2026, confermata da Edoardo): si fa. "Any ability that costs or damages a
      certain percent of health always considers maximum base hp, and not max hp based on wounds … You can use VIT
      (25% HP) as a quick shorthand" (p.106); Gigantas Crusher "Your foe takes 50% of their max hp as divine damage,
      or 25% as divine damage on a successful save", i Legend "may always save" (p.135); Split Heaven and Hell, Legend
      "always take 25% of max hp" (p.127). Un Apply che toglie la percentuale degli hp massimi base del bersaglio come
      danno divine.
(FATTO il 17 ottobre 2026, versione 1.15.107: bottone "% Max HP" nel riquadro Limit Break; per ogni bersaglio si
      sceglie save o distanza, i Legend seguono la regola del testo; percentuale sugli hp massimi base (p.106),
      arrotondata per eccesso, applicata come divine senza armatura né vigor; casella Atomos Crusher dal capitolo 3.
      Solo codice.)
- [x] **Emerso lavorando su R38b — Meteor costa più Aether del massimo** (S, da decidere): "Infuse 8: METEOR" (p.208)
      chiede 8 Aether, ma il sistema tiene l'Aether al massimo a 6 (d6, p.204): con l'Aether normale Meteor non si arma
      mai, resta solo il Special effect (pagare con la vita). Verificare sul manuale se qualcosa porta l'Aether oltre 6.
      (CHIUSO il 17 ottobre 2026: non è un difetto. L'Aether è "a d6 power die" (p.204) e niente nel manuale lo porta
      oltre 6; Meteor si paga con lo Special effect, "pay the resolve, aether, and action cost of this spell with your
      entire life force … it deals 999 divine damage instead" (p.208), come il sistema fa già.)
- [x] **Emerso lavorando su R38b — l'infusione armata non si toglie a fine combattimento** (S): il commento di
      `helpers/infuse.mjs` dice che l'infusione armata si azzera a fine combattimento con l'Aether, ma `IconCombat`
      azzera solo l'Aether, non `flags.icon-system.infused` (e nemmeno dopo il tiro: `clearInfusion` non è chiamata da
      nessuno). Un'infusione armata resta "armed" anche nel combattimento dopo, per abilità e Limit Break.
(FATTO il 17 ottobre 2026, versione 1.15.81: "End Encounter" ora cancella flags.icon-system.infused insieme all'Aether
      (p.204), senza rimborso, in IconCombat.#cleanupAfterCombat. clearInfusion in realtà la chiamano già il
      piazzamento di oggetti e terreni; manca il consumo dopo l'uso, voce emersa a parte.)
- [x] **Emerso lavorando su R39 — piccole differenze di testo dei Limit Break dal libro** (S, dati) (FATTO il 17 ottobre 2026, versione 1.15.77): Split Heaven and
      Hell ha le tre distanze (1 space / 2-4 / 5+) come sotto-elenco nel libro (p.127), nel compendio sono in riga;
      Paradiso ha perso la prima frase del blocco Aura ("You gain an aura of supernatural accuracy…", p.155);
      la descrizione di Lycanthropy è tagliata ("…granting you massively increased speed and power", p.168).
- [x] **Emerso lavorando su R40 — danno di Succubus** (S): con la combo di Incubus armata, `parseComboAbilityDamage`
      (`combat/ability-damage.mjs`) legge "deal 3 damage to all characters marked by Incubus" come danno Hit e
      sostituisce il [D]+fray della base: il Damage Roll propone 3 su Hit invece di [D]+fray (p.164: Succubus cambia
      solo il Mark). I 3 danni andrebbero sotto Other.
(FATTO il 17 ottobre 2026, versione 1.15.83: il danno scritto in un "Effect:" aggiunto da una combo senza etichette
      Hit/Miss/Area non sostituisce più l'Hit della base; per Succubus i 3 danni sono il chip "Combo — Succubus" sotto
      Other, Hit resta [D]+fray, p.164; controllate tutte le 17 combo del pack Jobs, cambia solo Incubus.)
- [x] **Emerso lavorando su R41 — Show in Chat e card Auto-hit non sanno chi è il bersaglio d'attacco** (S): senza il
      dialog dell'attacco, con più token bersagliati (area piazzata) i bottoni Inflict restano su tutti, con il gruppo
      etichettato "attack target only". La card Auto-hit potrebbe chiedere il bersaglio d'attacco (o prendere
      l'attack space dell'area: il centro di un Blast / Burst, p.97) e dividere le righe come la card d'attacco.
(FATTO il 17 ottobre 2026, versione 1.15.86: la card Auto-hit prende come bersaglio d'attacco il token al centro di un
      Blast / Burst (p.97), altrimenti lo chiede in un piccolo dialog, e divide le righe Inflict come la card
      d'attacco; il dialog del danno parte da quel token. Show in Chat usa il centro dell'area ancora sulla mappa, o
      il bersaglio scelto per quell'area, e non chiede mai niente.)
- [x] **Emerso lavorando su R42 — Wish, mastery: Unstoppable a te invece che all'alleato** (S): "they also gain
      defiance, then become unstoppable until the end of their next turn" (Star Scorned Hermit): dopo R42 la Defiance
      va all'alleato, ma "then become unstoppable" è letto come imperativo e il Gain Unstoppable va su di te. In più la
      Defiance prende la durata dell'Unstoppable ("until the end of their next turn"), che nel testo non è sua.
(FATTO il 17 ottobre 2026, versione 1.15.85: una frase senza soggetto ("then become …") subito dopo un "they" riferito
      all'alleato tiene l'alleato come destinatario, e la durata dopo ", then …" vale solo per quella frase; Wish con
      la mastery dà Defiance (senza durata) e Unstoppable (fino alla fine del suo turno successivo) all'alleato; fra i
      pack cambia solo Wish. Solo codice.)
- [x] **Emerso lavorando su R46 — danno aggiunto dalle versioni Infuse delle abilità non proposto in Other** (S/M):
      come per i Limit Break (R38b), le versioni infuse che aggiungono danno invece di cambiarlo non compaiono in Other:
      MAGNARIME ("Deal 1 piercing damage to all characters in the area again … for every two aether infused"), BOULDER
      KICK di Dragon Dive ("2 piercing damage twice instead" se c'è un solo personaggio), INCANDIUS di Soul Burn ("dealing
      1 piercing"), GRAM di Nothung ("Slay or Infuse 3": in più il blocco "Slay or Infuse" non ha il bottone Infuse,
      `infuseCost` accetta solo "Infuse N"). Con EXCALIBUR il danno di GRAM e dell'Effect di Nothung andrebbe divine,
      ma oggi non è proposto (vedi anche "Emerso lavorando su R24 — danno scritto negli Effect del testo base").
(FATTO il 17 ottobre 2026, versione 1.15.91: il danno aggiunto dalla versione Infuse armata viene proposto in Other
      con il nome della versione (MAGNARIME solo da armato e un'istanza ogni 2 Aether, BOULDER KICK, INCANDIUS, anche
      MAGNAPYRE e GREAT SPIRIT LANCE); "Slay or Infuse N" / "Infuse N or Slay" hanno il bottone Infuse e il loro danno
      è sempre in Other; con EXCALIBUR il danno di GRAM è divine. Il danno nell'Effect di base di Nothung resta alla
      voce di R24.)
- [x] **Emerso lavorando su R48 — l'aura di Fulminate non segue il mark** (S): "The character gains aura 2 while
      marked" (p.226): l'aura piazzata sul personaggio marcato non sparisce quando il mark viene tolto o passa a un altro
      bersaglio (nessuna scadenza "while marked"); si toglie a mano. Si potrebbe legarla al mark di Fulminate.
(FATTO il 17 ottobre 2026, versione 1.15.80: l'aura piazzata su un altro personaggio da un testo con "while marked" si
      toglie da sola quando finisce il mark di quell'abilità su quel personaggio, in qualunque modo finisca; le aure
      piazzate prima della versione si tolgono ancora a mano.)
- [x] **Emerso lavorando su R48 — aure degli oggetti** (S/M, con R33) (FATTO il 16 ottobre 2026, versione 1.15.65, con
      R33a: l'Aura 2 dello Shrine si piazza attorno al suo token e lo segue): Spirit Shrine ("Shrine — Height 1 object. Object
      Effect: Aura 2", p.192) non ha bottone area: l'aura va attorno al santuario, che è un oggetto da piazzare (R33). Il
      piazzamento "aura attorno a uno spazio" fatto per Rampant Nail potrebbe servire anche qui.
- [x] **Emerso lavorando su R49 — Aria: la blast cresciuta non resta centrata su di te** (S): "affecting a small blast
      area effect centered on you … the area becomes a medium blast. If you are damaged again, it becomes a large blast"
      (p.178): la Small Blast va su di te da sola, ma "Medium Blast" e "Large Blast" si piazzano a mano (il "centered on
      you" è solo nella prima frase). Lo stesso per le aree centrate su pit / oggetti (Holy Talent I, Pandaemonium
      combo, Helix Heel), che restano a mano finché pit e oggetti non sono sulla mappa (R33).
(FATTO il 17 ottobre 2026, versione 1.15.84: un'area che lo stesso testo fa crescere più avanti tiene il centro
      dell'area prima, quindi Medium e Large Blast (self) di Aria vanno sul token come la Small; nei compendi cambia
      solo Aria. Le aree centrate su oggetti erano già a posto con R33a2; quelle che esplodono dai pit restano a mano,
      voce emersa a parte.)
- [x] **Emerso lavorando su R53 — la migrazione 25 non riconosce i testi con più spazi** (S) (FATTO il 16 ottobre 2026, versione 1.15.64: regex corrette; la 25 non era mai stata eseguita in nessun mondo, quindi corretta lì senza una migrazione nuova): in `migrations.mjs` la
      funzione `flat` della migrazione 25 usa `replace(/s+/g, " ")` (manca la barra: toglie le lettere "s" invece di
      unire gli spazi), quindi confronta un testo storpiato con quello vecchio e non aggiorna nessuna copia dei sei Limit
      Break di R39. Va corretta con `/\s+/g` in una nuova migrazione (la 25 è già stata eseguita nei mondi aggiornati).
- [x] **Emerso lavorando su R55 — Helix Heel: mancano tre parole del libro** (S, dati) (FATTO il 17 ottobre 2026, versione 1.15.87: pack jobs corretto con `r55b-helix-heel-text/fix-helix-heel.mjs`, migrazione 32 sulle copie): il secondo Effect nel compendio
      dice "you can keep extending the line by 3 spaces, but can only extend it once per object", il libro (p.219) "by 3
      spaces this way each time, but can only extend it once per object". Ripristinare "this way each time" (pack +
      migrazione sulle copie).
- [x] **Emerso lavorando su R60 — R59: due regex con un carattere "backspace" al posto di `\b`** (S, bug) (FATTO il 16 ottobre 2026, versione 1.15.64: regex corrette; la 25 non era mai stata eseguita in nessun mondo, quindi corretta lì senza una migrazione nuova): nel commit
      di R59 (1.15.60) il `\b` delle regex è finito nel file come carattere di controllo 0x08. In
      `module/actor/sheets/IconSheet.mjs` (riga ~739, `regain = /…spend (\d+) Aether any time to regain it…/i`) la regex
      cerca un backspace prima di "spend" e non trova mai niente → il bottone "Regain (2 Aether)" di Aether Deflection
      probabilmente non compare. In `module/helpers/infuse.mjs` (`isStandaloneInfusion`, "[Ii]nterrupt…") la variante
      "(Interrupt …)" non riconosce niente (nel pack jobs nessuna versione la usa, Stormlash funziona). Sostituire i due
      caratteri con `\b` e riprovare i test R59 in PLAYTEST.md.
- [x] **Emerso lavorando su R62 — promemoria "End of round 0" all'avvio del combat** (S, bug): `startCombat` fa
      `update({ round: 1 })` senza `direction`, e l'hook `updateCombat` (IconCombat.mjs, blocco "Round advanced") lo
      tratta come un avanzamento di round: posta i promemoria relic "round-end" col titolo "End of round 0" (Paleblood:
      "Tick the Paleblood die up by 1") e chiama `_nudgeReserves` già al round 1. Saltare la parte "fine round" quando il
      round nuovo è 1 (il promemoria R62 del round 1 invece va bene lì).
(FATTO il 17 ottobre 2026, versione 1.15.79: nell'hook updateCombat il controllo delle riserve e i promemoria relic
      "round-end" partono solo se il round nuovo è maggiore di 1, stessa condizione già usata per la crescita delle
      aree; il promemoria R62 del round 1 resta.)
- [x] **Emerso lavorando su R33a3 — Aethershard: testo del compendio diverso dal libro** (S, dati) (FATTO il 17 ottobre 2026, versione 1.15.89: pack jobs corretto con `r33a3-aethershard-text/fix-aethershard.mjs`, migrazione 33 sulle copie; il resto della frase era già uguale al libro): il pack dice "the
      ability deals 2 piercing damage as an area effect … Then destroy all activated Aethershards and gain 1 Aether",
      il libro (p.210-211) "the ability resonates with the shards, dealing 2 piercing damage as an area effect … Then
      destroy all Aethershards activated this way and gain 1 Aether". Il codice di R33a3 legge tutte e due le forme;
      ripristinare il testo del libro (pack + migrazione sulle copie).
- [x] **Emerso lavorando su R33b — clic destro durante la scelta di uno spazio degli oggetti** (S): `pickSpace` di
      `map-objects.mjs` (Teleport here, Erupt, Move dello shard) chiude la scelta col clic destro ma non ferma l'evento: sopra
      un token potrebbe aprirsi anche l'HUD del token. Il picker nuovo di `terrain-spaces.mjs` lo ferma (`stopPropagation`).
(FATTO il 17 ottobre 2026, versione 1.15.78: in pickSpace di map-objects.mjs il clic destro chiama stopPropagation
      prima di chiudere la scelta, come pickSpaces di terrain-spaces.mjs.)
- [x] **Emerso lavorando su R47b — Sturmreiten con mastery e Talent II insieme** (S, pronto: risposta del 17 ottobre 2026): MJÖLLNIR (p.227) "Create
      an arc 5 area any time you would create an area with this ability instead"; con la mastery l'area è Arc 5 e
      l'estensione del Talent II non viene offerta (R47b la offre solo dopo una Line). Domanda per Edoardo: con la
      mastery, l'estensione diventa un secondo Arc 5 (attaccato al primo)?
      Risposta dal manuale (17 ottobre 2026, confermata da Edoardo): sì. MJÖLLNIR "Create an arc 5 area any time you
      would create an area with this ability instead" (p.227) vale anche per l'area del Talent II: l'estensione è un
      secondo Arc 5, in una direzione diversa, dal primo o dall'ultimo spazio come per la Line.
(FATTO il 17 ottobre 2026, versione 1.15.102: con MJÖLLNIR l'estensione del Talent II è un secondo Arc 5, dal primo o
      dall'ultimo spazio del primo arco, non nel verso in cui il primo arco corre lì e senza sovrapporsi; un solo
      template con entrambi gli archi. Solo codice.)
- [x] **Emerso lavorando su R39 — altre parole dei Limit Break diverse dal libro** (S, dati): Split Heaven and Hell
      (p.127) dice "depending on their distance from you" (libro: "their distance on the line from you") e "(maximum 3
      width)" (libro: ", to a maximum of 3 width,"); Lycanthropy (p.168) ha perso "(including this one!)" dopo "abilities,
      summons, or actions" nel secondo "•". Pack + migrazione sulle copie. (FATTO il 17 ottobre 2026, versione 1.15.94:
      pack jobs corretto su Limit Break e template Demon Slayer/Warden, script
      `../icon-compendium-audit/r39-lb-wording/fix-lb-wording.mjs`; migrazione 34 sulle copie col testo vecchio.)
- [x] **Emerso lavorando su R48 — l'aura di Fulminate non compare da sola sul nuovo marcato** (S, pronto: risposta del 17 ottobre 2026): quando
      il mark di Fulminate passa a un altro personaggio, l'aura sul primo sparisce, ma sul nuovo marcato va rimessa
      con il bottone area. Domanda per Edoardo: piazzarla da sola sul token appena marcato, oppure chiedere prima?
      Risposta dal manuale (17 ottobre 2026, confermata da Edoardo): da sola. "The character gains aura 2 while
      marked" (p.226): l'aura viene con il mark, senza scelta; solo il Talent I ("When marking a character, you can
      increase the area to 3…") chiede Aura 2 o 3.
(FATTO il 17 ottobre 2026, versione 1.15.105: quando nasce il mark, l'aura "while marked" si piazza da sola sul token
      marcato ed è legata a quel mark; solo il Talent I chiede Aura 2 o 3; se l'aura c'è già non viene doppiata. Solo
      codice.)
- [x] **Emerso lavorando su R38b — l'infusione armata non si consuma quando si usa l'abilità o il Limit Break** (S/M):
      l'Aether si spende "all'inizio dell'azione" e si sceglie una sola infusione per volta (p.204), quindi la
      versione infusa vale per un uso; ma la card dell'abilità (`IconSheet`, ~riga 2628) e il Limit Break (~riga 3318)
      leggono l'infusione armata senza chiamare `clearInfusion` (lo fanno solo oggetti e terreni): nello stesso
      combattimento la seconda volta l'abilità esce di nuovo infusa gratis. Va scelto quando consumarla (alla card o
      dopo danno e area, che leggono ancora `armedInfusion`); anche il commento in testa a `helpers/infuse.mjs` ("It
      clears when the ability is rolled") oggi non è vero.
(FATTO il 17 ottobre 2026, versione 1.15.92: ogni passo dell'uso (card, attacco, danno) segna fin dove è arrivato; un
      passo che si ripete o torna indietro è l'uso successivo ed esce base; l'infusione usata scade a fine turno e
      annullarla dopo l'uso non rimborsa; il pulsante area non conta come passo; commento in testa a
      `helpers/infuse.mjs` corretto.)
- [x] **Emerso lavorando su R37 — bottoni di status dell'Infuse forse doppi sulla card del Limit Break** (S, da
      verificare): in `#onUseLimitBreak` gli status si cercano su `effect` + testo dell'Infuse armato; se il testo
      dell'Infuse è già dentro `effect` (come sembra dai blocchi "Infuse" di `enrichLimitBreakText`), i suoi status
      potrebbero comparire due volte. Lo stesso con l'Ultimate quando il suo Infuse (Meteor) è armato.
(FATTO il 17 ottobre 2026, versione 1.15.90: confermato nel codice, il testo dell'Infuse armato veniva letto due volte
      (da dentro effetto / Ultimate e di nuovo a parte); ora gli status si cercano solo su effetto e Ultimate. Nel
      pack jobs nessun Infuse di limit break nomina status, quindi nel gioco reale non si vedeva.)
- [ ] **Emerso lavorando su R40 — il chip "Combo — Succubus" si vede anche senza combo** (S): il chip sotto Other
      appare anche quando il combo token non è pieno (come la casella "Combo version"); decidere se mostrarlo solo con
      la combo armata. La voce del pulsante Other dice ancora "mastery / talent / free" e non nomina la combo.
- [x] **Emerso lavorando su R40 — danno del Mark di Incubus** (S): i "2 damage" del Mark della base (p.164: "both the
      target and any adjacent foes take 2 damage and are dazed") non compaiono nel Damage Roll, nemmeno sotto Other
      (lì finisce solo il danno di talenti e mastery). Probabilmente lo stesso per i danni dentro altri blocchi Mark /
      Effect della base (vedi "Emerso lavorando su R24 — danno scritto negli Effect del testo base").
(FATTO il 17 ottobre 2026, versione 1.15.100: il danno scritto nei blocchi Mark / Effect / Terrain Effect / Stance
      della descrizione base delle abilità PG è proposto in Other, una chip per frase col nome del blocco (Incubus
      "Mark 2", Chastise, Astral Chain, Nothung e altre nove); esclusi Hit / Miss / Area, Area effect già coperto,
      Infuse e frasi che modificano il danno; "unerring damage" conta come danno. Copre anche le due voci di R24 del
      round del 15 ottobre e quella di R46 su Excalibur.)
- [x] **Emerso lavorando su R49 — aree che esplodono da tutti i pit dell'area** (M): Holy Talent I ("all pits in the
      area explode for a medium blast area effect, centered on them") e la combo Purgatorio di Pandaemonium (p.178) si
      piazzano ancora a mano, una Medium Blast alla volta. Con i pit sulla mappa (template con flag `terrain`)
      servirebbe: trovare i pit dentro l'area appena piazzata, una Medium Blast centrata su ognuno e bersagliare chi
      sta in almeno una delle aree. Oggi `centreOf` in `area-templates.mjs` lascia apposta a mano le aree "centered on
      them" dopo pits/plants/nails/clouds.
(FATTO il 17 ottobre 2026, versione 1.15.93: solo i pit; `centreOf` dà "pits" per "them" dopo i pit, `pitBlastCells`
      trova i pit (flag `terrain.pit`) dentro l'area più recente dell'abilità, una blast per pit unite in un solo
      template con flag `pitBlast`, ognuno bersagliato una volta sola; il tiro d'attacco la esclude. Plants / nails /
      clouds restano a mano.)
- [x] **Emerso lavorando su R41 — Show in Chat delle azioni foe / legend non divide le righe di un'area** (S):
      `FoeSheet.#statusHtmlFor` e `LegendSheet` (~riga 380) chiamano `statusBlockHtml` senza `attackTargetId`; con
      un'area dell'azione ancora sulla mappa (abilityKey `action:<nome>`) si potrebbe usare lo stesso centro del Blast
      / Burst (`attackSpaceTokenId`) come sulla scheda PG.
(FATTO il 17 ottobre 2026, versione 1.15.88: Show in Chat delle azioni d'attacco foe / legend usa come bersaglio
      d'attacco il token al centro dell'area Blast / Burst ancora sulla mappa, altrimenti quello scelto nel dialog
      d'attacco, e divide le righe Inflict come sulla scheda PG. Solo codice.)
- [x] **Emerso lavorando su R41 — bersaglio d'attacco ricordato per nome dell'azione** (S): `rememberedAttackTarget`
      lega il bersaglio ad attore + nome dell'azione, non all'area: se l'area viene ripiazzata a mano dopo un vecchio
      tiro, Show in Chat (PG, foe e legend) può usare il bersaglio scelto per l'area precedente, se quel token è
      ancora tra i bersagli. Si potrebbe azzerare la scelta quando si piazza una nuova area.
(FATTO il 17 ottobre 2026, versione 1.15.95: una nuova area dell'abilità sulla mappa fa dimenticare il bersaglio
      scelto per l'area precedente; il tiro che piazza l'area sceglie dopo, quindi la sua scelta resta; l'esplosione
      dei pit non la azzera. Solo codice.)
- [x] **Emerso lavorando su R33a3 — Aethershard: il danno dello shard letto come danno dell'abilità** (S, da
      verificare): `parseAbilityDamage` sulla descrizione di Aethershard (vecchia e nuova forma) dà `dealsDamage: true`
      con Hit 2 piercing, cioè i "2 piercing damage" del Summon Effect (che li infligge l'area che include lo shard, non
      l'abilità che lo evoca). Controllare se la scheda mostra un bottone danno su Aethershard e, se sì, toglierlo.
(FATTO il 17 ottobre 2026, versione 1.15.101: confermato; sulla scheda PG il danno dentro "Summon Effect:" / "Object
      Effect:" non è più danno dell'abilità, quindi Aethershard non ha più il bottone danno; foe e legend invariati;
      nel pack jobs cambia solo Aethershard. Solo codice.)
- [x] **Emerso lavorando su R37 — status degli Infuse non armati sulla card del Limit Break** (S, pronto: risposta del 17 ottobre 2026): la
      card di "Use Limit Break" legge gli status da tutto il testo dell'effetto e dell'Ultimate, comprese le versioni
      Infuse non armate: se una versione Infuse nomina uno status, i bottoni compaiono anche senza infonderla (oggi
      nessun limit break del pack lo fa). Scegliere se togliere dalla ricerca i blocchi Infuse non armati, come fa la
      card delle abilità con `splitInfuseBlocks`.
      Risposta dal manuale (17 ottobre 2026, confermata da Edoardo): sì, toglierli. "Only one infusion can be chosen
      at once, and only one infuse effect can trigger at a time" (p.204): una versione non armata non scatta; come la
      card delle abilità con `splitInfuseBlocks`.
(FATTO il 17 ottobre 2026, versione 1.15.104: in `#onUseLimitBreak` gli status si leggono dall'effetto e dall'Ultimate
      dopo aver tolto le versioni Infuse non armate con `withoutUnarmedInfusions` (p.204); restano la versione armata
      e le "Slay or Infuse", come in `splitInfuseBlocks`. Solo codice.)
- [x] **Emerso lavorando su R46 — blocco Slay or Infuse doppio sulla card di attacco quando è armato** (S): con GRAM o
      GRAN BLITZ armati, la card di attacco mostra il blocco della versione ("Effect (GRAM)") e anche il blocco "Slay
      or Infuse 3" del testo base, che ora resta tra quelli base per non nasconderlo quando lo attiva lo Slay.
(FATTO il 17 ottobre 2026, versione 1.15.99: sulla card di attacco il blocco compariva già una volta sola; il punto
      storto era la card Show in Chat, dove con GRAM / GRAN BLITZ armati il blocco restava tra quelli base senza il
      riquadro Infused. Ora, armato, diventa il blocco della versione infusa e la card prende il nome della versione;
      non armato resta tra i blocchi base. Solo codice.)
- [x] **Emerso lavorando su R46 — infusione persa con il token combo** (S): con il token combo tenuto, il Damage Roll
      usa il danno della versione combo e ignora l'infusione armata, compreso il danno in Other appena aggiunto.
      Riguarda solo abilità con sia combo sia Infuse: da verificare se ce ne sono.
      (CHIUSO il 17 ottobre 2026: nessuna abilità ha sia combo sia Infuse — le 17 abilità combo sono Mendicant /
      Stalwart / Vagabond, i 32 item con Infuse sono tutti Wright, nessun incrocio in reliquie, bond power, gear kit e
      trofei; Infuse è "Wright only", p.117; senza combo sull'abilità il token non cambia il danno.)
- [x] **Emerso lavorando su R46 — Excalibur sull'Effect di base di Nothung** (S): "Effect: Teleport 1, then deal 1
      piercing damage again to your target for every foe or ally adjacent to them, to a maximum of four times" (p.225)
      non è proposto in Other, quindi con EXCALIBUR non diventa divine; fa parte della voce "Emerso lavorando su R24 —
      danno scritto negli Effect del testo base".
      (FATTO il 17 ottobre 2026, versione 1.15.100, con la voce del Mark di Incubus: la chip Effect di Nothung in
      Other diventa divine con EXCALIBUR.)
- [x] **Emerso lavorando su R38b — il danno rilanciato di un uso infuso esce base** (S, pronto: risposta del 17 ottobre 2026): un secondo
      Damage Roll sulla stessa abilità infusa conta come uso nuovo e cancella l'infusione. Se a tavolo si rilancia il
      danno per errore serve un modo per dire "stesso uso" (es. un'opzione "reroll" nel dialog del danno). Domanda per
      Edoardo: serve?
      Risposta di Edoardo (17 ottobre 2026): sì, serve. Il libro non ne parla (p.204: l'Aether "is consumed at the
      start of the action"): aggiungere nel dialog del danno un'opzione "Reroll (same use)" che non consuma
      l'infusione.
(FATTO il 17 ottobre 2026, versione 1.15.108: a un secondo Damage Roll della stessa abilità o del Limit Break infusi
      nello stesso turno il dialog del danno ha la casella "Reroll (same use)": spuntata tira di nuovo la versione
      infusa e non consuma l'infusione, vuota è un uso nuovo sulla versione base; cambiarla riapre il dialog su quella
      versione. Solo codice.)
- [x] **Emerso lavorando su R49 — Dulce Purgatorio su tutti i pit del campo** (S): la Mastery DULCE PURGATORIO (p.178,
      "Pandaemonium's area effect and Purgatorio's pit explosion effect extend to all pits on the battlefield") non è
      letta: l'esplosione prende solo i pit dentro l'area. Basterebbe saltare il filtro "dentro l'area" in
      `pitBlastCells` con la Mastery scelta.
(FATTO il 17 ottobre 2026, versione 1.15.96: con DULCE PURGATORIO sbloccata `pitBlastCells` prende tutti i pit della
      scena e non serve l'area dell'abilità; la prima metà della Mastery, sull'Area Effect di Pandaemonium, è una voce
      emersa a parte, da decidere.)
- [x] **Emerso lavorando su R49 — l'area di Holy forse resta come terrain effect** (S, da verificare): `#areaLasts`
      legge `baseAreaText`, che contiene anche il testo della combo; la riga "Terrain Effect: Create a pit under your
      target" di Hades rende probabilmente "lasting" la Medium Blast di Holy/Hades (flag `terrain`), che a fine turno
      non viene tolta.
(FATTO il 17 ottobre 2026, versione 1.15.98: confermato; la riga "Terrain Effect: Create a pit…" della combo Hades
      rendeva "lasting" la Medium Blast; il testo della combo ora è escluso dal testo base come talenti e mastery; nel
      pack jobs cambia solo Holy. Solo codice.)
- [ ] **Emerso lavorando su R49 — "centered on them" dopo plants / nails / clouds** (S/M): stesso schema dei pit,
      ancora a mano; plant / nail / cloud non hanno un tipo `terrain` riconoscibile sulla mappa come `pit`, servirebbe
      prima quello.
- [x] **Emerso lavorando su R49 — Purgatorio Talent II** (S): "its effect causes pits to appear under every pacified
      foe" (p.178) non crea i pit sotto i foe pacified: oggi si mettono a mano con il chip.
(FATTO il 17 ottobre 2026, versione 1.15.97: il Talent II di Pandaemonium ha il suo chip "Pits under pacified foes",
      che dopo una domanda mette un pit sotto ogni foe ostile pacified della scena che non ne ha già uno. Solo
      codice.)
- [x] **Emerso lavorando su R41 — area trascinata** (S): se l'area di una Line o di un Arc viene spostata
      trascinandola invece di ripiazzarla, il bersaglio scelto prima resta ricordato e Show in Chat lo usa se il token
      è ancora tra i bersagli, anche se non è più dentro l'area. Si potrebbe azzerarlo anche allo spostamento, o
      controllare che il token sia dentro le caselle dell'area.
(FATTO il 17 ottobre 2026, versione 1.15.117: Show in Chat di PG, foe e legend usa il bersaglio d'attacco ricordato
      solo se quel token è ancora dentro le caselle dell'area sulla mappa, comunque sia stata spostata. Solo codice.)
- [x] **Emerso lavorando su R49 — Dulce Purgatorio: l'Area Effect di Pandaemonium su tutti i pit** (S, pronto: risposta del
      17 ottobre 2026): la prima metà della Mastery (p.178, "Pandaemonium's area effect … extend to all pits on the
      battlefield") non è letta; l'Area Effect è "Remove all characters in the area, then place them back in any other
      space in the area" (p.177). Domanda per Edoardo: (a) l'area diventa l'area dell'abilità più tutte le caselle con
      un pit (chi sta su un pit viene preso, e si può rimettere anche su un pit), oppure (b) ogni pit conta come
      un'area di forma uguale a quella dell'abilità? Con la (a) basta poco codice.
      Risposta di Edoardo (17 ottobre 2026): (a). Con DULCE PURGATORIO l'Area Effect di Pandaemonium ("Remove all
      characters in the area, then place them back in any other space in the area", p.177) prende anche le caselle di
      tutti i pit del campo (p.178): chi sta su un pit viene preso, e si può rimettere anche su un pit.
(FATTO il 17 ottobre 2026, versione 1.15.106: con DULCE PURGATORIO sbloccata e la combo non armata, l'area di
      Pandaemonium unisce alle sue caselle quelle di tutti i pit della scena in un solo template; chi sta su un pit è
      bersaglio una volta sola; l'area di Purgatorio e l'esplosione dei pit non cambiano. Un'area già sulla mappa
      riusata dal tiro non prende i pit creati dopo. Solo codice.)
- [ ] **Emerso lavorando su R49 — chip dei pit di Pandaemonium legati tra loro** (S): i due chip finiscono nello
      stesso gruppo, quindi il clic destro su uno dei due toglie dalla scena sia il pit della combo sia quelli sotto i
      foe pacified.
- [x] **Emerso lavorando su R49 — pit sotto foe grandi** (S, da decidere): sotto un foe 2x2 o più grande il pit va
      solo nella casella in alto a sinistra (lo stesso per il terreno sotto i foe del Volcanic Geyser). Domanda per
      Edoardo: un pit su tutte le caselle occupate, o su una sola scelta da chi gioca?
      (CHIUSO il 17 ottobre 2026: "Large foes count as being 'inside' any effect (such as an aura, difficult terrain
      space, pit, dangerous terrain, etc) if at least one of their spaces is inside" (p.290): un pit su una casella
      vale per tutto il foe, quindi il pit nella casella in alto a sinistra è già giusto; lo stesso per il Volcanic
      Geyser. Nessuna modifica.)
- [x] **Emerso lavorando su R49 — oggetti di un "Terrain effect:" che rendono l'area "lasting"** (S, pronto: risposta del 17 ottobre 2026): Geo
      ("Terrain effect: Create a height 1 boulder object in free space anywhere in the area", p.218), The Tower
      ("Terrain effect: Then, create a height 1 meteor object in the area", p.203) e Dark Sliver ("Terrain effect: Cut
      away a part of the target's soul…", p.187) restano "lasting" solo per il testo base, quindi la loro area
      d'attacco resta sulla mappa; è lo stesso caso di Hades (il terrain effect è l'oggetto, non l'area), ma la regola
      di R33c lo accettava. Domanda per Edoardo: queste aree devono sparire al turno dopo come quella di Holy?
      Risposta dal manuale (17 ottobre 2026, confermata da Edoardo): sì, devono sparire come quella di Holy. I terrain
      effect sono "passive effects that modify the terrain spaces of the battlefield" (p.95-96); in Geo (boulder,
      p.218), The Tower (meteor, p.203) e Dark Sliver (uno spazio scelto, p.187) il terrain effect è l'oggetto o lo
      spazio, non l'area d'attacco.
(FATTO il 17 ottobre 2026, versione 1.15.103: un "Terrain effect:" che crea solo un oggetto o sceglie uno spazio non
      fa più restare l'area dell'abilità, e l'elenco dei nomi dei blocchi non conta più; nel pack jobs cambiano solo
      Geo, The Tower e Dark Sliver. Solo codice.)
- [ ] **Emerso lavorando su R49 — commento non più vero in `pitBlastCells`** (S): in
      `module/canvas/area-templates.mjs` (~riga 1084) il commento dice "Holy's area is kept as a terrain effect, so
      those count": ora non è più così (il codice funziona lo stesso).
- [x] **Emerso lavorando su R38b — un secondo Damage Roll per il "again" di MAGNARIME cancella l'infusione** (S, dalla
      revisione di R46 + R38b): `startInfusionStep` (`helpers/infuse.mjs` ~266) tratta ogni Damage Roll dopo il primo
      come un uso nuovo, ma MAGNARIME ("Deal 1 piercing damage to all characters in the area again after the ability
      resolves for every two aether infused", p.233), MAGNAPYRE e GREAT SPIRIT LANCE si tirano a parte dopo il danno
      base: al secondo Damage Roll l'infusione è cancellata, il chip "Infuse X — MAGNARIME" sparisce e il tiro esce
      base con l'Aether già speso. Possibile fix: nello stesso turno, il passo danno non cancella se la versione
      armata ha danni aggiunti (R46), oppure gli extra della versione usata restano offerti fino a fine turno.
      (FATTO il 17 ottobre 2026, versione 1.15.108, con il "Reroll (same use)": quando la versione armata aggiunge danni
      suoi sotto Other (MAGNARIME, MAGNAPYRE, GREAT SPIRIT LANCE) la casella parte spuntata, quindi il secondo Damage
      Roll non cancella più l'infusione.)
- [x] **Emerso lavorando su R38b — PHANTOM BLADE usata scade a fine turno ma dura "until the start of your next
      turn"** (S, dalla revisione): `armedInfusion` (`helpers/infuse.mjs` ~240) nasconde un'infusione usata appena
      cambia il turno; "Infuse 3 or Slay: PHANTOM BLADE — Until the start of your next turn, this interrupt has
      unlimited uses" (Drifting Leaf p.227) nel turno del foe non risulta più attiva e il bottone Infuse si può
      ripagare. La scadenza a fine turno dovrebbe valere solo per le versioni che non durano oltre il turno.
(FATTO il 17 ottobre 2026, versione 1.15.112: all'armo si segna se la versione dura "until the start of your next
      turn"; `armedInfusion` la tiene armata dopo l'uso, nello stesso combattimento, fino all'inizio del turno
      successivo del personaggio. Solo codice.)
- [x] **Emerso lavorando su R38b — annullare un'infusione armata in un round precedente sblocca Inner Furnace una
      seconda volta** (S, dalla revisione): `cancelInfusion` (`helpers/infuse.mjs` ~467) azzera sempre
      `flags.icon-system.innerFurnace`, anche quando il flag è stato riscritto da un altro uso nel round corrente (es.
      STORMLASH standalone): armata con Inner Furnace nel round 1 e non usata, annullata nel round 2 dopo un altro
      Inner Furnace → si può usare una seconda volta nel round 2 ("Once a round", p.208). Azzerare il flag solo se è
      ancora quello scritto da questo armo (stesso combat / round).
(FATTO il 17 ottobre 2026, versione 1.15.113: all'armo il flag infused ricorda in `furnaceAt` combattimento e round
      dell'Inner Furnace pagato; `cancelInfusion` azzera `flags.icon-system.innerFurnace` solo se è ancora quello.
      Solo codice.)
- [ ] **Emerso lavorando su R40 — chip Mark nel combo Succubus** (S): Succubus dice "Instead of the mark", ma in Other
      resta anche la chip "Mark" della base; andrebbe nascosta con il combo in uso.
- [ ] **Emerso lavorando su R40 — danno dei blocchi Effect di foe e legend** (M): azioni di foe e legend come Kelpie
      Savage Fang, Overpower, Mighty Smite e Heavy Arquebus scrivono danni extra nei loro "Effect:" che non vengono
      proposti; allargare la regola vuol dire circa 150 frasi da controllare (i blocchi Collide / Exceed / Charge
      finirebbero sotto "Effect").
- [ ] **Emerso lavorando su R40 — chip senza Unerring né ×N** (S): la chip di Astral Chain non spunta Unerring; le
      chip non mostrano "×N" anche quando la card applica N istanze (Chastise ×3); Blitz scrive due istanze da 1
      piercing nella stessa frase e propone una sola chip.
- [ ] **Emerso lavorando su R40 — etichetta di Other** (S): l'esito Other dice ancora "mastery / talent / free" anche
      quando le chip vengono dai blocchi base, dal combo o dalle versioni Infuse.
- [x] **Emerso lavorando su R47b — MJÖLLNIR "instead" e la scelta dell'area** (S, da verificare): MJÖLLNIR crea l'Arc
      5 *al posto* dell'area normale (p.227), ma il codice aggiunge l'Arc 5 come variante "Mastery" accanto alla Line
      3, quindi probabilmente chiede ancora di scegliere tra le due invece di usare sempre l'Arc 5 (`_areaVariantsFor`
      / `areaVariants`).
(FATTO il 17 ottobre 2026, versione 1.15.116: confermato; l'Arc 5 della mastery era un'alternativa alla Line 3 e
      veniva chiesto quale usare; ora con MJÖLLNIR sbloccata si offre solo l'Arc 5. Solo codice.)
- [x] **Emerso lavorando su R48 — la domanda del Talent I di Fulminate arriva al GM quando il mark passa da lui** (S):
      se il giocatore marca un personaggio che non è suo, il mark lo crea il GM, quindi la finestra "Aura 2 / Aura 3"
      compare al GM e non al giocatore; portare la domanda al client di chi ha marcato prima di passare il mark al GM.
(FATTO il 17 ottobre 2026, versione 1.15.110: quando il mark va al GM, la misura dell'aura la chiede `applyMark` sul
      client di chi marca, prima di inoltrarlo; il GM la riceve con la richiesta e la usa senza chiedere. Solo
      codice.)
- [x] **Emerso lavorando su R37 — il divine non salta il vigor col bottone Apply delle card** (S): p.104 dice che il
      divine "bypasses vigor"; il nuovo "% Max HP" lo salta, ma il bottone Apply delle card di danno (`icon.mjs`,
      gestione di `data-divine`) non passa `ignoreVigor` per il divine, quindi lì il vigor assorbe ancora il danno
      divine.
(FATTO il 17 ottobre 2026, versione 1.15.109: il bottone Apply / ½ delle card di danno passa ignoreVigor quando la
      card è divine (p.104); tutte le strade passano da lì. Solo codice.)
- [x] **Emerso lavorando su R37 — Atomos Crusher "+25%": in più o moltiplicato?** (S, da decidere): "deals 25% more
      max hp damage" è letto come 25 punti in più (50% → 75%); l'altra lettura è un quarto in più (50% → 62,5%).
      Domanda per Edoardo: quale?
      (CHIUSO il 17 ottobre 2026: Edoardo conferma la lettura già fatta in 1.15.107, 25 punti in più, quindi 50% → 75%
      e 25% → 50%. Nessuna modifica.)
- [x] **Emerso lavorando su R37 — Gigantas Crusher, Legend che salva: rimborso della resolve** (S): "refunding this
      ability's resolve cost on a successful save" (p.135) è solo una nota nella card, la resolve non torna da sola;
      la distanza sulla linea di Split Heaven and Hell si sceglie a mano, non viene misurata sulla mappa.
(FATTO il 17 ottobre 2026, versione 1.15.111: un Legend che salva contro Gigantas Crusher fa tornare il costo in
      resolve nelle stesse riserve personale / party da cui era stato pagato, una volta per uso; la distanza su Split
      Heaven and Hell resta a mano, voce emersa a parte. Solo codice.)
- [ ] **Emerso lavorando su R38b — il dialog del danno riaperto riparte da capo** (S): cambiando "Reroll (same use)"
      il dialog si riapre sull'altra versione, ma esito, bersaglio d'attacco e modificatori tornano ai valori
      iniziali; si potrebbero passare al dialog riaperto quelli già scelti.

Scelte confermate da Edoardo il 17 ottobre 2026 (il libro non le dice): con MJÖLLNIR il secondo Arc 5 non prosegue nel
verso del primo, come per la Line (1.15.102); con DULCE PURGATORIO il PG che sta su un pit è preso anche lui dall'area
(1.15.106).
- [ ] **Emerso lavorando su R37 — `applyDamagePipeline` non conosce i tipi di danno** (S, da decidere): la funzione
      esportata in `damage.mjs` (nell'API del sistema, senza chiamate interne) non accetta né `pierce` né `divine`,
      quindi da macro non si può far ignorare armor o vigor; valutare se serve.
- [ ] **Emerso lavorando su R37 — Split Heaven and Hell: distanza misurata sulla linea** (S/M): la fascia "1 space /
      2-4 / 5+" (p.127) si sceglie a mano nel dialog del "% Max HP"; per misurarla servirebbe sapere dove parte la
      linea piazzata e leggere la posizione di ogni bersaglio.
- [ ] **Emerso lavorando su R37 — l'annotazione della spesa di resolve resta vecchia** (S):
      `flags.icon-system.limitBreakSpend` non si cancella a fine combattimento: un "% Max HP" con un Legend che salva,
      senza aver riusato il Limit Break, rimborsa l'uso precedente, anche di un altro combattimento. Cancellarla nel
      reset di fine combattimento (IconCombat.mjs, ~riga 604).

---

## Round di debug del 15 ottobre 2026 — documento "15.10.2026.docx"

Versione aggiornata del documento del 9 ottobre (vedi "Feedback di Maar — documento Icon VTT Bugs" più sotto), con in più
la sezione **Ability Bugs** (Mendicant e Stalwart completi; il Vagabond "ill do this later lol"; sezione "FAQ
Changes/Editions" ancora vuota). I commenti nel documento sono di Turz Ven. Un punto = un `/prossimo` = un commit.

Già fatti o già decisi (nessun lavoro, solo da far verificare a Maar sulla 1.15.2):
- Save automatici doppi con più GM: fatto nella 1.16.5 (dentro la 1.15.1 pubblica). Commento: "Will test this out
  sometime soon- not often this comes up LOL".
- Bottoni dell'Encounter planner piccoli: fatto nella 1.15.0 (Sessione A).
- Skin/temi per fazione: scartata da Edoardo il 9 ottobre (commento: "low priority request").
- Feedback positivi (planner, save automatici, keyword al passaggio del mouse, scheda, clock, GIF dei bersagli, guida).

### Bug

- [x] **R1. Combo che ereditano tag ed effetti della versione base** (M/L, bug — priorità media nel documento)
      (FATTO il 15 ottobre 2026, versione 1.15.3: le combo con nome in maiuscolo sostituiscono tutta la base,
      "replace the base effect with" sostituisce l'Effect, barrato sulla scheda solo per le combo complete)
      "Combo tokens with new effects will often inherit tags they shouldn't." Casi:
      - Chastise, Dervish, Felicity: con il combo token la chat stampa sia l'effetto combo sia quello base, compreso
        il tag Charge, che la combo non eredita.
      - Pandaemonium: la combo eredita Charge.
      - Astra: "Combo version inherits the effects of the non-combo".
      - Sow: la combo eredita il mark della base.
      - Bleak Mercy, Revenge: la combo non sostituisce l'effetto (Revenge: in chat).
      - Caso opposto, Low Blow: la combo è un effetto *in più*, ma la scheda barra il testo combo come se lo
        sostituisse.
      Probabilmente è una sola logica ("la combo sostituisce" contro "la combo aggiunge"). Va controllata sul manuale
      abilità per abilità. Se le cause sono diverse, dividere il punto.
- [x] **R2. Vigor oltre il massimo** (S/M, bug — priorità media)
      "Players cannot increase vigor amount by above maximum (required by abilities like Gran Reversa's Mastery
      benefit)". Verificare sul manuale la mastery di Gran Reversa e quanto può superare il massimo.
      (FATTO il 15 ottobre 2026, versione 1.15.4: la Mastery Misericordia, p.202, non mette un tetto; il vigor scritto
      a mano sulla scheda non viene più riportato al massimo, Recover/Regeneration non lo abbassano, tacche in più
      in viola sulla scheda del PG.)
- [x] **R3. Nessun avviso quando scade un'aura** (S/M, bug — priorità bassa)
      "No prompt on removing aura effects in chatbox or ability sheet for when an aura effect expires, requiring the
      player to go into" (la frase nel documento si interrompe lì; probabilmente: andare a toglierla a mano).
      (FATTO il 15 ottobre 2026, versione 1.15.5: la durata dell'aura viene letta dal testo quando la si piazza
      ("gain aura 1 until the end of your next turn") e contata sui turni; alla scadenza un messaggio in chat la
      annuncia con il bottone Remove area. Le aure senza durata scritta restano come prima.)
- [x] **R4. Abilità trascinate dal compendio senza la scelta di talenti/mastery** (M, bug — priorità bassa)
      "Seems to only happen when adding many abilities quickly, so might be a menu issue."
      (FATTO il 15 ottobre 2026, versione 1.15.6: la finestra talento/mastery partiva solo per le abilità lasciate
      esattamente su un riquadro; ora parte dovunque l'abilità venga lasciata sulla scheda, e un drop fatto mentre la
      finestra precedente è aperta dà una notifica invece di sparire.)
- [x] **R5. Tag grigi senza tooltip** (S, bug)
      Dropkick: "Sacrifice" grigio e senza tooltip. Comet: "Medium Blast" grigio. Catapult: "Interrupt 1" in cima
      alla card senza tooltip; con la mastery spuntata compare "Interrupt 3" ("Maybe an old implementation of the tag
      system?").
      (FATTO il 15 ottobre 2026, versione 1.15.7: aggiunte le spiegazioni mancanti per Sacrifice, Small/Medium/Large
      Blast e Terrain Effect con i nomi usati dai compendi; per le abilità interrupt il numero di usi, anche quello
      cambiato da talento/mastery, sta sul badge del costo con il tooltip invece che in un tag doppio.)
- [x] **R6. Parole del testo di colore evidenziate come keyword** (S, bug)
      Battering Ram "flying", Six Hells Trigram "summon" (come se fosse il tipo di personaggio Summon), Revenge "armor".
      (FATTO il 15 ottobre 2026, versione 1.15.8: il testo di colore non riceve più i tooltip delle keyword
      nell'anteprima sulla scheda del PG, nella card in chat e nella scheda dell'abilità; i blocchi di regole sì.)
- [x] **R7. Raging Wolf ha collegato il summon "beast" del Warden** (S, bug di dati)
      (FATTO il 15 ottobre 2026, versione 1.15.9: non era un dato del pack ma il collegamento per nome — "Beast Within"
      nella mastery; ora un'abilità offre solo i summon del proprio job. Corretti anche Blackstar → Bomb e Mist Strider → Shadow.)
- [x] **R8. Massive Overhead: la prima riga delle regole è nel testo di colore** (S, bug di dati)
      (FATTO il 15 ottobre 2026, versione 1.15.10: nel libro (p.136) l'abilità non ha testo di colore; nel compendio la
      riga ora comincia con "Effect:" e "Special" diventa "Special Effect"; migrazione 20 per le copie già sulle schede.)
- [x] **R9. Fairy Ring: trigger al posto sbagliato** (S, bug di dati)
      Nella card (foto nel documento) "Trigger: A foe enters or exits the area." sta in cima come se fosse il trigger
      dell'abilità, e "Spirit Away —" resta appeso in fondo al Terrain Effect. Testo giusto secondo il documento:
      "Terrain effect: End your turn and create a ring of mushrooms, a burst 2 (self) terrain effect. The ring can be
      created overlapping any terrain and underneath characters. The ring lasts until this ability is used again.
      While the ring is active, gain the following interrupt:" e poi l'interrupt (Spirit Away). Controllare sul manuale.
      (FATTO il 15 ottobre 2026, versione 1.15.11: nel compendio il trigger di Spirit Away non è più anche il trigger
      dell'abilità (migrazione 21 per le copie già sulle schede); il nome di un interrupt concesso va nell'intestazione
      del suo blocco, "Spirit Away — Interrupt 2" (sistemati anche Gran Reversa e Drifting Leaf). Testo lasciato
      nell'ordine del manuale, p.187.)
- [x] **R10. Testo del Wild Card ripetuto per intero in Chaos Tarot e Sleight of Hand** (S, dati)
      (FATTO il 15 ottobre 2026, versione 1.15.12: nel libro il Wild Card è stampato una volta, p.200; nel compendio
      le due descrizioni ora finiscono con la riga del summon (p.201), le regole restano sull'attore Wild Card del
      compendio Summons; migrazione 22 per le copie già sulle schede.)
- [x] **R11. Tabelle poco leggibili** (S/M)
      Monogatari ("Some line breaks would be useful"), tabella del gamble di Chaos Tarot.
      (FATTO il 15 ottobre 2026, versione 1.15.13: una tabella numerata 1-6 nel testo ora esce una riga per
      risultato, numero in oro e nome in grassetto, come nel libro (p.179, p.201); solo resa, vale per tutte le
      tabelle, anche dei foe, e per le copie già sulle schede.)
- [x] **R12. Raging Wolf ed Eclipse formattati male** (S/M, dati)
      Eclipse: "Formatted strangely. Please revisit." Raging Wolf: "formatted poorly and hard to read".
      (FATTO il 15 ottobre 2026, versione 1.15.14: nel libro Eclipse ha i due esiti in elenco puntato (p.203) e il
      Comeback di Raging Wolf le tre soglie di hp una per riga (p.137); nel compendio erano un paragrafo unico. Ora
      ogni voce è su una riga "•" nel compendio e la resa le mostra una sotto l'altra; migrazione 23 per le copie già
      sulle schede.)
- [x] **R13. The Tower: la mastery raddoppia il danno sbagliato** (S, regola)
      Il manuale dice doppio danno dai meteoriti di *Eclipse*, il sistema lo applica al meteorite della Tower.
      "Strange, but that's how it was written." Verificare la pagina.
      (FATTO il 15 ottobre 2026, versione 1.15.15: il libro (p.203) dice davvero "double damage from Eclipse's
      meteor effect"; il compendio aveva tolto "Eclipse's". Testo riportato alla lettera nel compendio Jobs;
      migrazione 24 per le copie già sulle schede. Il raddoppio non è automatizzato.)
- [x] **R14. Provoke: la card del danno propone 1 invece di 2** (S, bug)
      Va bene per il danno subito, ma il danno base rimandato indietro è 2.
      (FATTO il 15 ottobre 2026, versione 1.15.16: la lettura del danno prendeva il primo "N damage" del testo, cioè
      "1 piercing damage to you" (danno subito, p.142); ora salta il danno seguito da "to you"/"to yourself" e propone
      2. Solo codice, vale anche per le copie già sulle schede.)
- [x] **R15. Gentleness: il tiro del danno non seleziona Divine** (S, bug)
      (FATTO il 15 ottobre 2026, versione 1.15.17: la lettura del danno prendeva la quantità e non il tipo, e il
      dialog non spuntava mai Divine/Pierce da solo; ora il tipo scritto accanto al danno ("1 divine damage", p.179;
      "N piercing damage") spunta Divine o Pierce per il risultato scelto. Solo codice, vale per PG, foe e legend.)
- [x] **R16. God Hand: Talent 1 e 2 non danno i bonus a Devil Hand (combo) e a Fists of Heaven and Hell (mastery)
      nella card dell'attacco** (S/M, bug)
      (FATTO il 15 ottobre 2026, versione 1.15.18: la card dell'attacco non mostrava mai i talenti, né per la base né
      per la combo. Ora il talento sbloccato vale per tutte le versioni (p.192): un suo Exceed / Hit / Miss / Crit va
      nel riquadro corrispondente, il resto (teleport a 2, Slay) ha un riquadro suo. Fists of Heaven and Hell non è
      ancora usabile (R28): vedi le voci emerse. Solo codice.)
- [x] **R17. Polaris: il Talent 1 non permette di marcare un personaggio** (S/M, bug)
      (FATTO il 15 ottobre 2026, versione 1.15.19: il bottone Mark segue il tag `mark` e il Talent I (p.202) non lo
      dava. Ora un talento / una mastery sbloccati che rendono l'abilità un mark ("as a mark", "making it a mark")
      aggiungono il tag Mark, anche con la mastery sbloccata; vale anche per la mastery Amico di Party Favor. Solo
      codice, vale per le copie già sulle schede.)
- [x] **R18. Intimidate: la mastery non propone Unstoppable** (S, bug)
      Né il bottone per applicarlo a sé, né il testo di promemoria.
      (FATTO il 15 ottobre 2026, versione 1.15.20: la frase della mastery (p.144) comincia con "also become" e la
      lettura del testo non riconosceva "also" davanti al verbo, quindi scartava lo status. Ora "also" è accettato:
      bottone "Gain Unstoppable" su di sé; stessa correzione per il Talent II di Circle the Oak (Gain Evasion). Solo
      codice, vale per le copie già sulle schede.)
- [x] **R19. Aure mancanti o sbagliate** (M, bug)
      - Endless Battlement: chiede la dimensione dell'aura (proposta 3) anche se è sempre 1, e la mette solo su chi
        la lancia, mentre va su un alleato.
      - Dervish Talent 1: non dà il tag aura e non si applica facilmente a sé.
      - Shieldmaster (tratto): niente aura su di sé.
      - Bleak Mercy combo e Dark Knight mastery: niente scelta dell'aura.
      Endless Battlement potrebbe essere un problema separato: se la causa è diversa, dividere.
      (FATTO il 15 ottobre 2026, versione 1.15.21: le aure scritte solo nel testo non diventavano tag. Ora talento /
      mastery / combo che danno un'aura a chi usa l'abilità aggiungono il tag Aura N e il bottone area (Dervish
      Talent I e DAWN, Dark Knight mastery, Sweet Torment), e un tag "aura" senza numero prende la dimensione dal
      testo (Endless Battlement Aura 1, niente più domanda; anche Rook, Strength of the Pack, Perseus, Nightmare).
      Spostati: l'aura di Endless Battlement sull'alleato → R19b; l'aura del tratto Shieldmaster → R19c. Solo
      codice, vale per le copie già sulle schede.)
- [x] **R19b. Endless Battlement: l'aura va sull'alleato scelto, non su chi usa la stance** (M, bug)
      "That ally gains aura 1 until the start of your next turn. The aura deactivates if your ally is out of range"
      (p.123). Il piazzamento delle aure (`placeAreaTemplate`, area-templates.mjs) mette sempre l'aura attorno al
      token di chi usa l'abilità e la fa seguire quel token: manca il modo di scegliere un alleato (in range 4, o
      senza limite con la mastery) e di legare l'aura al suo token. Causa diversa da R19 (dimensione già corretta).
      (FATTO il 15 ottobre 2026, versione 1.15.22: se il testo dice che un alleato riceve l'aura, il bottone area la
      piazza attorno all'alleato bersagliato (T) e la fa seguire lui; senza un solo alleato bersagliato resta attorno a
      chi la usa con un avviso; oltre range 4 solo un avviso (niente con la mastery). Durata sempre sui turni del
      Bastion. Solo codice.)
- [x] **R19c. Tratti con un'aura: niente bottone per piazzarla** (S/M, bug)
      Shieldmaster (Bastion, "You have aura 1", p.121) e Pelagic Rage ("You gain aura 2"): i tratti non hanno tag né
      bottone area sulla scheda (il bottone esiste solo per le abilità, `abilityPlaceArea` in IconSheet), quindi
      l'aura del tratto non si può mettere sulla mappa. Serve un bottone area per i tratti che danno un'aura a sé.
      (FATTO il 15 ottobre 2026, versione 1.15.23: un tratto sbloccato il cui testo dà un'aura a sé ha nell'intestazione
      un bottone "Aura N" (stesso stile delle abilità) che la piazza attorno al proprio token e la fa seguire; durata
      letta dal testo come per le abilità. Solo codice.)
- [x] **R20. Sow: l'Arc 4 della mastery non è piazzabile come area** (S, bug)
      (FATTO il 15 ottobre 2026, versione 1.15.24: la mastery Spectral Scythe, p.185, crea un arco IN PIÙ che parte dal
      bersaglio; il bottone area ora legge anche talento scelto / mastery sbloccata / combo armata (c'è anche con REAP
      e sulle copie vecchie), l'arco parte accanto al token bersagliato e non lo copre, il tiro d'attacco non lo
      piazza più e tiene il bersaglio. Copre anche le altre aree scritte solo nel testo di talenti/mastery. Solo codice.)
- [x] **R21. Dropkick: con la mastery il tiro del danno non propone il danno ad area** (S/M, bug)
      (FATTO il 15 ottobre 2026, versione 1.15.25: il danno dell'Area ora si legge anche dal talento scelto e dalla
      mastery sbloccata quando il testo base non ne ha (Giant Kicker, p.136: "The area deals fray damage"); stessa
      causa sistemata per Sow/Spectral Scythe, Pyroclast, Sidhe, Obsidian Flesh, Upheaval, Wicked Sheath, Exorcism.
      Escluso il danno "again" (R23/R24). Solo codice.)

### Richieste

- [x] **R22. FAQ narrativa: difficoltà dei tiri (Trivial, Risky/standard, Heroic)** (S)
      (FATTO il 15 ottobre 2026, versione 1.15.26: voce nella FAQ Narrative con controlled/risky/desperate (p.18),
      conseguenze e strain (p.29), niente "trivial"/"heroic" nel libro: fortune roll (p.20) ed effetto superpowered
      (pp.18-19). Solo codice.)
- [x] **R23. Danno extra delle mastery** (M)
      Harvest: l'area della mastery si piazza, ma il danno della mastery non si tira facilmente (secondo bottone?).
      Draken Cross: i 2 danni divine della mastery non si tirano senza metterli nel danno dell'area.
      Commento di Turz Ven: "I think most issues of this variety can be solved by simply adding a 'Other' option onto
      the damage roller."
      (FATTO il 15 ottobre 2026, versione 1.15.27: nuovo esito "Other" nella finestra del danno (PG, foe, legend) con
      Dice / Fixed damage / + Fray / Area effect liberi e, come scelta rapida, le righe di danno del talento scelto e
      della mastery sbloccata (Harvest Moon p.186, Dark Wind Devil Blade p.128), con tipo divine/piercing. Solo codice.)
- [x] **R24. Più istanze dello stesso danno nel damage roller** (M)
      Abilità che infliggono lo stesso danno più volte (per la sinergia con Vulnerable), es. Strongarm.
      (FATTO il 15 ottobre 2026, versione 1.15.28: campo "Instances ×N" nella finestra del danno, precompilato da
      "twice" / "N times" nel testo dell'esito; tiro unico, Apply applica N istanze separate con armor e ½ su ciascuna,
      vulnerable/weakened già per istanza nella card (p.92, p.109); mob un hit per istanza. Solo codice.)
- [x] **R25. Gamble cliccabile** (M)
      Bottone per il gamble sulle abilità che lo hanno (es. Riposte), con dadi da aggiungere o togliere al momento, e
      spazio per i tratti del Fool che fissano quei numeri. Commento di Turz Ven: "Remember that like armor/Vigilance,
      gamble only cares about the highest number rolled; so, 3d6kh1, not 3d6."
      (FATTO il 15 ottobre 2026, versione 1.15.29: bottone Gamble nell'anteprima della scheda PG e nella card Show in
      Chat; finestra con Dice +/−, cariche di Vigilance dove il testo le spende (Dire Parry), Stacked Die del Fool =
      6 (p.149) o numero scelto 1-6; tiro Nd6 tenendo il più alto (p.105, p.148); card con dadi, risultato e riga
      della tabella 1-6 se c'è. Solo codice.)
- [x] **R26. [D] che mostra i dadi veri nelle card delle abilità** (M)
      Sulla scheda di un PG "2d10" invece di "2[D]"; resta [D] prima della scelta o fuori dalla scheda. Il damage
      roller lo fa già.
      (FATTO il 15 ottobre 2026, versione 1.15.30: sulla scheda di un PG con job, anteprima, Show in Chat e card
      dell'attacco (anche attacchi base) mostrano "[D]" come il dado del PG ("2[D]" → "2d10", p.84, p.91) con
      tooltip "2[D] = 2d10"; senza job, scheda item, compendio, foe/legend restano [D]. Solo resa.)
- [x] **R27. "Damage Utility" sulla scheda PG** (M)
      La macro del danno anche in fondo alla scheda, come la finestra del danno standard ma più modulare.
      (FATTO il 15 ottobre 2026, versione 1.15.31: riquadro "Damage Utility" in fondo al tab Combat della scheda PG
      che apre la finestra del danno in modalità libera (solo i campi di Other: dadi [D] del PG, fisso, fray, area,
      più Source per la card) con tutti i modificatori, tipi e istanze; card e Apply quelli delle abilità. La macro
      del pack resta com'è. Solo codice.)
- [x] **R28. Combo alternativa data dalla mastery** (M)
      Felicity (scelta tra Fleet e Fantasia con un menù allo Show in Chat), God Hand, Justice, Rot (marcare per
      Regrowth invece che per Regenerate).
      (FATTO il 15 ottobre 2026, versione 1.15.32: con la mastery sbloccata e il token armato, Show in Chat / Attack /
      Damage chiedono quale combo usare (normale o della mastery, letta dal campo mastery); la scelta vale per
      card, attacco, danno, status e tag, e si azzera col token, a fine turno e a fine combattimento. Rot ha un
      bottone "Mark target (Regrowth)" a parte. Solo codice.)
- [x] **R29. Dervish: con la mastery, stampare in chat entrambi gli effetti** (S)
      (FATTO il 15 ottobre 2026, versione 1.15.33: con la mastery sbloccata ("gain both effects", p.178) Show in Chat
      posta "Dervish + Dawn" con i blocchi base, il Charge e "Dawn — Effect", e gli status di entrambe, anche senza
      token; il token si spende solo se acceso. Letto dal testo della mastery. Solo codice.)
- [x] **R30. Segno su un personaggio che non conta come mark** (M)
      Grand Banishment, The Tower ("probably just mark, renamed").
      (FATTO il 15 ottobre 2026, versione 1.15.34: bottone "Track target" sulle abilità PG senza mark il cui testo dice
      "that foe's / that character's (next) turn" (Grand Banishment p.193, The Tower p.203, anche Showdown,
      Assassinate, Great Giorgios, Pyroclast): segno "Tracked — …" con la grafica e la rimozione dei mark, ma non
      rimpiazza né viene rimpiazzato dai mark (p.95), non finisce alla sconfitta del PG, uno per abilità. Solo codice.)
- [x] **R31. Pubblicare in chat solo il trigger o la sotto-azione della mastery** (S/M)
      Symphony, Spirit Shrine.
      (FATTO il 15 ottobre 2026, versione 1.15.35: piccolo bottone chat accanto a "Mastery:" (se sbloccata) e al
      talento scelto nell'anteprima della scheda PG; posta una card con solo quel testo, titolo "Symphony —
      Mastery: Crescendo" (p.179) / "Spirit Shrine — Mastery: Spirit Patronage" (p.193), keyword e Inflict/Gain.
      Generico per tutte le mastery e i talenti. Solo codice.)
- [x] **R32. Dimensione dell'aura con +/-** (S/M)
      Gentleness: l'aura della mastery cresce; stessi controlli della larghezza della Line.
      (FATTO il 15 ottobre 2026, versione 1.15.36: mouse sopra un'aura già piazzata, + / − la allargano o restringono di
      1 attorno al token che la porta; limiti letti dal testo al piazzamento ("maximum of 3 or a minimum of 1",
      Gentle Prayer p.179), altrimenti 1-5 come la Line; l'avviso ripete "When you do, foes inside must save or be
      pacified". Solo chi l'ha piazzata o il GM. Solo codice.)
Il 16 ottobre 2026 Edoardo ha deciso che R33–R36 non servono a Maar: non sono più "da decidere", sono divisi in
sotto-punti da fare in ordine (ogni sotto-punto usa quello prima). Regole del libro: Object p.89 ("Categorized by
height, 1-3. Provides obstruction … immune to damage and effects unless specified"; distruttibili dal GM: "10 hp …
automatically hit … fail all saves"), Objects p.95 ("size 1-3 … can be stacked … total height … isn't past 3 … not
removed when you are defeated"), Terrain effects p.96 ("passive effects that modify the terrain spaces … can overlap
… not removed if you are defeated"), Pit / Dangerous / Difficult p.89.

- [ ] **R33. Oggetti e segni piazzabili sulla mappa** — elenco originale, diviso in R33a–R33d qui sotto.
      Symphony (motes, terrain effect), Fairy Ring (megamushroom della mastery), Comet ("thrown weapon"), Spirit
      Shrine (santuario con la sua aura), Gates of Hell (flash step della mastery), Eclipse (il singolo dangerous
      terrain dove cade la stella), Astra (medium blast messo sui foe), Polaris (uno spazio a terra), Blood Grove
      (disegnare più spazi per il Talent 2).
      Aggiunti dal documento del 16 ottobre: Darkside (token Shadow), Nocturne, Apex, Mist Strider, Morrigan (mastery),
      Underway, Party Favor, Showdown, Elden Rune, Implode (uno spazio), Pyroclast (anche il dangerous terrain dei
      talenti), Stone Double (oggetto), Bio, Geo (oggetto), Terraforming (scegliere tra i terrain effect), Bifröst (cresce
      col Talent II), Blitz (Talent I e mastery), Rampant Nail, Deepwrath (mastery), Geyser (oggetto), Gust (più di uno),
      Rime (pit di Magnarime), Tsunami, Waterspout (anche la mastery); forse Aethershard (R65).
      Darkside: lo Shadow è un summon del pack summons, il chip c'è già da R44 (1.15.46).
- [x] **R33a. Oggetti sulla mappa** (L) (FATTO il 16 ottobre 2026, versione 1.15.65: chip col cubo sull'abilità / tratto
      per ogni "height N <nome> object", "<Nome> — Height N object", "object (<Nome>, height N)"; trascinato sulla mappa
      diventa un token di un attore Summon con flag (cartella "Map Objects", creato dal GM anche per i giocatori);
      impilabile fino a 3, "can't stack", "lasts until … used again" chiede se sostituire; Aura dell'oggetto piazzata e
      che lo segue; altezza − / + e "Make destructible" (GM, 10 hp) sulla scheda dell'oggetto. Solo codice.)
      Un "oggetto" piazzabile come token: nome, altezza 1–3, immagine, chi l'ha creato; si può impilare fino ad altezza
      3; resta se chi l'ha creato è sconfitto; "lasts until this ability is used again" lo sostituisce; il GM può
      renderlo distruttibile (10 hp, p.89). Bottone sull'abilità / tratto quando il testo crea un oggetto ("height 1
      boulder object", "Shrine — Height 1 object", "becomes an object (Thrown Weapon, height 1)"). Con l'oggetto sulla
      mappa, la sua aura ("Object Effect: Aura 2") lo segue e il suo testo è a portata (Shrine: altezza +1 riusando
      l'abilità). Copre: Comet (Thrown Weapon), Spirit Shrine (con l'aura, emerso R48), Stone Double (statue), Geo e
      Terraforming (boulder), Pyroclast (magma spire, Pyrospire altezza 3), Astra e Polaris (meteor), Fairy Ring mastery
      (Megamushroom, conta come plant), Underway (portali, niente obstruction), Geyser (Volcanic Geyser), Aethershard
      (R65).
- [x] **R33a2. Oggetti sulla mappa: quello che resta dopo R33a** (M/L) (FATTO il 16 ottobre 2026, versione 1.15.66:
      sezione "Object Effect" sulla scheda dell'oggetto con il suo testo, l'altezza totale della pila e i benefici accesi
      dello Shrine, righe di talento / mastery, Spirit Patronage ×altezza, bottone Chat; Comet: domanda prima di
      attaccare e "Pick up"; Remove per gli altri, anche dal giocatore via GM; la pila scende quando si toglie o si
      sposta un oggetto da sotto; chip Pyrospire / Volcanic Geyser solo con l'Infuse armato, consumato al piazzamento;
      aree "centered on it / on them (objects)" centrate sul token dell'oggetto targettato. Il resto in R33a3. Solo codice.)
      Gli effetti degli oggetti oltre al token e all'aura sono ancora da leggere a mano: Spirit Shrine (benefici per
      altezza totale 1 / 2 / 3+, mastery "Destroy the shrine … 2 divine damage once per height"), Comet (rampart attorno,
      niente attacchi mentre l'arma è a terra, raccoglierla la toglie), Aethershard (preso in un'area: 2 piercing per
      shard, poi distrutti e +1 Aether, come le wild card), Underway (teleport tra portali), Megamushroom (blessing token,
      conta come plant), Geyser (eruzione: rimuovi e piazza chi ci sta sopra, poi Salt Sprite al suo posto), Volcanic
      Geyser e Pyrospire offerti sempre e non solo con l'Infuse armato, Upheaval mastery ("placed as a height 2 pillar
      instead", senza la parola object: oggi col +). Aree centrate su un oggetto (Holy Talent I, Helix Heel, Volcanic
      Geyser "medium blast area centered on it"; vedi l'emerso di R49). Oggetti che bloccano la vista o il movimento
      (muri di Foundry) e danno copertura: non fatto. Togliendo un oggetto da sotto una pila, quelli sopra non scendono.
- [x] **R33a3. Oggetti sulla mappa: quello che resta dopo R33a2** (M/L) (FATTO il 16 ottobre 2026, versione 1.15.67:
      Aethershard presi in un'area → domanda, 2 piercing × shard agli altri nell'area, shard tolti, +1 Aether; bottone
      Erupt sul Geyser / Volcanic Geyser (card con chi ripiazzare, Salt Sprite da ricordare, geyser tolto); Geyser
      Talent I +1 altezza a inizio turno; Megamushroom con "Pick up blessing" e nota plant; pilastro di Upheaval letto
      come oggetto; Burst 1 di Helix Heel sugli oggetti offerta dal bottone area; scheda dalla barra laterale con le
      copie sulla scena. Il resto in R33a4. Solo codice.)
      Oggi il testo e i benefici sono sulla scheda dell'oggetto, ma questi effetti restano a mano:
      Aethershard ("When you include the Aethershard in the area effect of any ability … 2 piercing damage … for every
      one of your Aethershards caught", poi distrutti e +1 Aether: un controllo all'area piazzata come le wild card di
      `wild-cards.mjs`); Underway (teleport tra portali, Bale Portal); Geyser (eruzione: rimuovi e piazza chi ci sta
      sopra, poi togli il geyser e Salt Sprite al suo posto; Talent I "+1 height of all geysers at the start of your
      turn"); Megamushroom (blessing token, conta come plant); Upheaval mastery ("placed as a height 2 pillar instead",
      senza la parola object, non letto da `objectsInText`); Helix Heel (la Burst 1 "centered on them" sugli oggetti è
      letta, ma il bottone area non legge la descrizione delle abilità che hanno già un'area nei tag); Comet (rampart
      sugli spazi adiacenti e raccolta automatica quando entri / esci da uno spazio adiacente); oggetti che bloccano vista
      o movimento (muri di Foundry) e copertura; personaggi in piedi su una pila che scende (oggi scendono solo gli
      oggetti); scheda aperta dalla barra laterale (attore del mondo, senza token) che mostra l'altezza totale 1+0.
- [x] **R33a4. Oggetti sulla mappa: automazioni sul movimento e il resto dopo R33a3** (M/L) (FATTO il 16 ottobre 2026,
      versione 1.15.68: Underway "Teleport here" e domanda al movimento con scelta dello spazio, promemoria Bale Portal;
      Comet aura "Rampart" e domanda di raccolta entrando / uscendo; Megamushroom domanda entrando; Erupt con ripiazzamento a
      clic e Salt Sprite automatico; personaggi in cima a una pila che sale / scende, Magma Spire che solleva; Aethershard
      Move (Talent I) e Phasing di AETHERSHIFT; card di inizio / fine turno. Muri e il resto in R33a5. Solo codice.)
      Lasciate fuori da R33a3 perché toccano il movimento dei token o i muri di Foundry:
      - Underway (p.168): "you and allies can teleport from any space adjacent to an underway to a free adjacent space
        to any other underway" — un bottone sul portale che sposta il token selezionato, con la scelta dello spazio
        libero; mastery Bale Portal (foe spinti nei portali / a fine turno adiacenti: save, una volta per round,
        bloodied falliscono).
      - Comet (p.128): rampart sugli spazi adiacenti all'arma e raccolta automatica quando il PG entra / esce da uno
        spazio adiacente (oggi c'è il bottone "Pick up").
      - Megamushroom / plant (p.184, p.187): raccolta della benedizione quando tu o un alleato entrate nello spazio (oggi
        bottone "Pick up blessing").
      - Geyser (p.232): Salt Sprite piazzato da solo nello spazio del geyser dopo l'eruzione e spostamento guidato dei
        personaggi "one or two spaces away" (oggi card + target); il dangerous terrain del Volcanic Geyser è di R33b.
      - Oggetti che bloccano vista o movimento (muri di Foundry attorno al token, tranne "don't provide obstruction")
        e copertura ("Characters can … take cover behind them", p.89) nel calcolo della Cover.
      - Personaggi in piedi su una pila che scende o sale (p.89 "Characters can stand on objects"): oggi si muovono solo
        gli oggetti; anche il personaggio spinto su dal Magma Spire di Pyroclast ("pushing them up").
      - Aethershard: Talent I (spostare uno shard di 2 quando spendi Aether), Talent II (pierce contro chi è adiacente a
        uno shard), mastery AETHERSHIFT (phasing se inizi / finisci adiacente) — p.210-211.
- [ ] **R33a5. Oggetti sulla mappa: quello che resta dopo R33a4** (M/L)
      Lasciato fuori da R33a4 perché rischioso o non fatto bene:
      - Muri di Foundry attorno agli oggetti per vista e movimento ("Provides obstruction", p.89; tranne Underway "don't
        provide obstruction"): creare / spostare / togliere muri insieme al token è rischioso (muri che restano, token
        bloccati); da decidere con Edoardo se servono.
      - Copertura: "Characters can … take cover behind them" (p.89), Underway Talent II "Allies adjacent to underways have
        cover", Geyser Talent I "Allies standing on a geyser have cover from all directions": il calcolo della Cover del
        tiro non guarda gli oggetti (oggi solo le righe del talento sulla scheda dell'oggetto).
      - Rampart di Comet che blocca davvero dash / volo / teleport dei foe (p.104): oggi è solo un'aura 1 da vedere.
      - Aethershard Talent II "Your abilities gain pierce against characters adjacent to Aethershards" (p.210): il pierce
        della card del danno è per tutta la card, non per bersaglio; oggi solo la riga sulla scheda dello shard.
      - Personaggi che salgono / scendono camminando su o giù da un oggetto (oggi l'elevazione cambia solo quando è la
        pila a cambiare, o con teletrasporto / eruzione).
      - Movimento: si guardano solo partenza e arrivo, non gli spazi attraversati (Comet "enter or exit", Megamushroom).
      - Bale Portal: foe "shoved into portals" (spinti dentro un portale) e il "once a round" non sono contati.
      - Comet "or start your turn there": a inizio turno solo una card, non la domanda.
- [x] **R33b. Spazi di terreno** (L) (FATTO il 16 ottobre 2026, versione 1.15.69: chip colorati sull'abilità / tratto
      letti dal testo ("Pit · 2", "Dangerous · 3", "Mote · 4", "Area +2"), si cliccano gli spazi sulla mappa; ogni spazio è un
      template di una casella col flag `terrain` (riusabile da R33c / R33d); tasto destro sul chip o "Remove all" li toglie;
      domanda dei 2 piercing (senza armatura né vigor, una volta a turno) entrando / uscendo dal dangerous; promemoria di
      mote, mine ed Elden Rune; Blood Grove estende l'area; dangerous sotto i foe del Volcanic Geyser. Il resto in R33b2.
      Solo codice.)
      Segnare uno o più spazi singoli, ognuno con il suo tipo: pit, dangerous, difficult, oppure un segno con nome
      (mote, afterimage, rune, mine, brand, Polaris). Il segno resta finché non lo si toglie, o finché l'abilità non
      viene riusata. Copre: Symphony (motes non adiacenti), Eclipse (brand + dangerous sotto i foe; Talent I pit), Polaris
      (spazi scelti), Implode (centro; Talent II pit), Party Favor (mine), Elden Rune (sotto di te), Gates of Hell mastery
      (afterimage), Apex Talent I, Morrigan Talent II, Blitz Talent I, Pyroclast Talent I e mastery (pit), Bio charge,
      Deepwrath (pit sotto il marcato; Darktide), Rime / Magnarime / Dagon (pit), Tsunami Talent I, Terraforming (pit,
      difficult), Geo charge (pit), Blood Grove Talent II / mastery (spazi aggiunti all'area).
- [ ] **R33b2. Spazi di terreno: quello che resta dopo R33b** (M/L)
      Oggi gli spazi si segnano a mano dal chip e il dangerous / i segni con una frase "enters" fanno una domanda o una card.
      Restano a mano:
      - Deepwrath (p.235): "create a watery pit under them at the start of their turn" (pit automatico a inizio turno del
        marcato) e "drag them under … placing them in the space of any other pit in range 3"; DARKTIDE "Marked allies are
        immune to dangerous terrain, and marked foes take +1 more damage from dangerous terrain" (la domanda dei 2 danni
        non guarda il mark).
      - Eclipse (p.203): a inizio del turno lento, controllo dello spazio del brand (personaggio sopra: 2 divine e sealed;
        nessuno: large blast centrata su quello spazio e dangerous sotto ogni foe); Talent I pit al centro dopo l'esplosione.
      - Symphony (p.178): la mote che esplode (small blast centrata sul personaggio, pit sotto il foe, tolta da sola) e il
        conteggio delle blessing tolte; Party Favor (p.151): l'esplosione della mine (medium blast, gamble, mine distrutta).
      - Polaris (p.202): il gamble a fine turno sugli spazi scelti (blast per numero di spazi, poi rimuoverli) e Talent II
        (difficult / pit / meteor sotto il centro); Implode: l'attivazione a inizio del turno lento sullo spazio scelto.
      - Pit: "Pits count as one level lower of elevation than their base space" (p.89) non cambia l'elevazione del token;
        aree centrate su un pit (Holy Talent I, Pandaemonium) ancora a mano. Difficult: il +1 movimento per uscire non è contato.
      - Elden Rune: "lasts until the end of the scene" non la toglie da sola; Gates of Hell Flash Step (togliere un
        afterimage libero e piazzarsi lì) senza bottone; Bio Talent I / II (pit, oggetti e difficult che diventano dangerous;
        2 piercing a chi è nel / accanto al dangerous) e Terraforming "Remove any difficult or dangerous terrain" a mano.
      - Movimento: si guardano solo partenza e arrivo, non gli spazi attraversati (come gli oggetti, R33a5).
- [x] **R33c. Aree terrain effect che durano, si muovono o crescono** (L) (FATTO il 16 ottobre 2026, versione 1.15.70:
      le aree terrain portano il flag `terrain` letto dal loro blocco (dangerous / difficult / for foes, shadow clouds,
      frase "enter"), così la domanda dei 2 danni e i promemoria valgono anche per Tsunami, Blood Grove, Dark Wing, Gungnir,
      Magnabio, Gust, Bifröst; "lasting" deciso per area e non per tutta l'abilità; Quench centrata sul PG; più aree insieme
      con la domanda "Add another / Replace" (NORTHSOUL 3, second cloud / HEIMDALL / ERENHELION 2); Shift + frecce sopra
      un'area la spostano di 1; Tsunami con il bordo chiesto e salvato, "Move 4", STORMLASH, LEGENDARY STORM, "Drag them
      with it" con conferma, fine mappa; Waterspout come segno di una casella con le frecce a inizio turno e "Grow" di
      HURRICANE; Ätherwand Talent II; Bifröst Talent II "Add 2 spaces" a fine round. Il resto in R33c2. Solo codice.)
      Partendo dalle aree "lasting" che ci sono già: muovere un'area già piazzata (Tsunami 4 spazi verso un bordo a
      inizio turno, Stormlash 2; Waterspout 1 spazio, Hurricane small blast), farla crescere (Bifröst Talent II +2
      spazi a fine round; Blood Grove), più aree insieme invece di sostituirle (Gust Northsoul fino a tre, Mist Strider
      charge "second cloud", Bifröst Heimdall seconda line), e le aree terrain dei talenti / mastery: Nocturne (shadow
      clouds), Mist Strider, Morrigan Dark Wing, Showdown Quench, Blitz Gungnir, Bio Magnabio (toxic cloud).
- [ ] **R33c2. Aree terrain effect: quello che resta dopo R33c** (M/L)
      Oggi le aree si piazzano, restano, portano dangerous / difficult e si muovono o crescono con un clic. Restano a mano:
      - Status per chi sta dentro: "Foes inside are blinded+" (Mist Strider p.169), shadow clouds "characters are blinded+"
        (p.161), "characters inside are shattered+" (Magnabio p.218), "Foes inside Tsunami take +1 curse on saves"
        (Tsunami Talent II p.233), "allies in the area have cover" (Dark Wing p.171), Quench "grants cover … exiting the
        area can gain stealth" (p.157): solo nel testo, nessuno status dato o tolto entrando / uscendo.
      - Danni dell'area: Bifröst Talent II "When they grow, deal 1 piercing damage to all characters inside" (oggi solo la
        frase sulla card), GUNGNIR "At the start and end of your turn, you may deal 1 piercing damage to all characters in
        the area" (p.225, nessun promemoria), Mist Strider River Guardians "Foes that start their turn inside the area that
        end their turn outside of it take 2 damage and are dazed".
      - Tsunami (p.233): il piazzamento "as long as its edge is adjacent to an edge of the map" non è controllato (serve Alt
        per piazzarla lontano dal PG); collisioni dei trascinati ("If they are blocked by obstructions, they collide") e
        "also affects flying foes" (LEGENDARY STORM) a giudizio del tavolo; Talent I: il pit al centro si mette dal chip.
      - Waterspout (p.235): risucchiare e risputare i personaggi ("removed from the battlefield … placing them in any other
        free space in range 2"), Talent I shove, Talent II "leaves a space of difficult terrain in one space that it
        vacates", HURRICANE "characters that start their turns adjacent to the area are shoved 1"; la "Small Blast" del
        bottone area con HURRICANE è un'area a parte, non il waterspout cresciuto.
      - Bifröst: HEIMDALL "cannot overlap the first" e PATH TO ERENHELION "bounces if its end space lands in the space of an
        object" non controllati (si può solo aggiungere la seconda line); "grab on … teleport" a mano. Ätherwand Talent I
        ("doesn't replace the old area, but extends it") e HELLERWIND (impassable terrain).
      - Mist Strider: "consume a cloud … summoning a beast in any of its spaces" a inizio turno senza promemoria; Nocturne
        Talent I (teleport dentro / fuori) e Trap Door Spider Technique a mano.
      - Movimento: si guardano solo partenza e arrivo, non gli spazi attraversati (come R33a5 / R33b2).
- [x] **R33d. Segni che seguono un personaggio** (M) (FATTO il 16 ottobre 2026, versione 1.15.71: con Polaris Talent I,
      Amico o WAKING VOID in gioco il chip chiede "On a space / On <bersaglio>"; sul personaggio targettato nasce il mark
      di marks.mjs (Waking Void come tracker) e il GM attivo aggiunge lo spazio sulle sue caselle, che lo segue; mark e
      spazio vanno via insieme (✕, Delete, creatore sconfitto, fine combat, nuovo mark); conteggio Polaris; Amico "Detonate"
      a fine di ogni turno non suo (gamble + Medium Blast centrata); Waking Void card quando il personaggio va a 0 hp.
      Il resto in R33d2. Solo codice.)
      Un segno di R33b / R33c messo su un personaggio invece che su uno spazio: Polaris Talent I ("follow a character
      as a mark"), Party Favor mastery Amico, Implode mastery Waking Void.
- [ ] **R33d2. Segni sul personaggio: quello che resta dopo R33d** (S/M)
      - Range non controllato: "any character in range" (Amico, range 3 di Party Favor p.151), il range 6 di Implode,
        il range 5 di Polaris: si targetta chiunque.
      - WAKING VOID (p.211): "Implode immediately activates" è solo una card col testo; lo spostamento della large blast
        verso il personaggio e l'attivazione a inizio del turno lento restano a mano (come Implode su uno spazio, R33b2).
      - Polaris (p.202): il segno sul personaggio è contato fra gli spazi Polaris sulla card, ma il gamble a fine turno e
        le esplosioni per numero di spazi restano a mano (R33b2).
      - Mark p.95 "choosing which gets replaced": come per il bottone Mark, il mark nuovo sostituisce il vecchio dello
        stesso creatore senza chiedere.
      - Un personaggio collegato (linked) con token su più scene: lo spazio va sul primo token trovato.
      - Amico: la card "Detonate" esce a fine di ogni turno non del creatore (sussurrata a lui e al GM), anche quando
        nessuno ha intenzione di farlo esplodere.
- [x] **R34. Open the Gates riformattata** (S)
      Proposta: l'ultimo effetto ("This attack gains +1 boon, cannot miss" ecc.) come "Special" davanti alle due
      versioni dell'attacco, come in Raging Wolf. Oggi sembra che dipenda dall'exceed. Il manuale è ambiguo: Edoardo
      ha scelto la proposta (16 ottobre 2026).
      (FATTO il 16 ottobre 2026, versione 1.15.72: nel compendio Jobs il blocco (p.194) ha l'etichetta "Special:" ed è in
      testa, ordine Special, Effect, Hit, Miss, Exceed; una combo completa tiene in cima lo Special della base, così
      Center the Temple lo mostra anche lei; migrazione 29 per le copie già sulle schede. Parole del libro invariate.)
- [ ] **R35. Righteous Disdain usabile dalle card del danno** — diviso in R35a–R35c.
      Commento di Turz Ven: "If you don't have a clean way to implement this (and probably make it modular so other
      interrupts could do similar on damage cards as needed), then I wouldn't do it. Keep in mind there are weird
      interrupts like Dire Parry's mastery which lets it bank interrupt usages, or the ones from seer that wholly
      prevent damage."
- [ ] **R35a. Interrupt dalle card del danno: la base** (L)
      Sulla card del danno, per il personaggio colpito (e per chi ha un interrupt con trigger "damaged" / "an ally …
      is damaged"), un bottone per ogni interrupt che quel danno fa scattare: spende un uso, posta Trigger ed Effect
      (come R61). Modulare, come chiede Turz Ven: un solo punto dove dire "questo interrupt scatta sul danno".
- [ ] **R35b. Righteous Disdain** (M)
      Il suo effetto applicato dalla card del danno, sopra R35a.
- [ ] **R35c. Interrupt strani sul danno** (M/L)
      Dire Parry mastery (usi messi da parte), interrupt del Seer che annullano il danno: il bottone di R35a toglie
      o riduce il danno già calcolato sulla card.
- [ ] **R36. Carte del Seer** — "Currently practically nonfunctional", diviso in R36a–R36c.
      I tre mazzi (deck, mano, scarti) ci sono, ma le carte non hanno effetti e giocarle non scrive niente in chat.
      Maar non consiglia di legarle alla scheda; con il sistema di carte di Foundry servirebbero gli effetti sulle
      carte, la carta giocata in chat e i bersagli. "Probably a big ask in terms of workload."
- [ ] **R36a. Il testo di ogni carta** (M)
      Ogni carta dei mazzi del Seer con il suo effetto preso dal libro (pagina citata).
- [ ] **R36b. Carta giocata in chat** (M)
      Giocare una carta dalla mano posta una card in chat con il suo effetto (keyword, Inflict / Gain come le
      abilità) e la sposta negli scarti.
- [ ] **R36c. Bersagli delle carte** (M)
      Le carte con bersaglio o area usano i bersagli correnti e i bottoni area già esistenti.

### Emersi lavorando

- [x] **Emerso lavorando su R24 — "2 unerring damage" non letto come danno** (S): Showdown (p.157,
      "they take 2 unerring damage from you twice") — il parser del danno riconosce solo "divine" / "piercing" tra il
      numero e "damage", quindi l'importo non viene letto (né la ripetizione). Aggiungere "unerring" ai tipi in
      `parseChunk` (ability-damage.mjs) e spuntare Unerring di conseguenza.
      (FATTO il 17 ottobre 2026, versione 1.15.100, con la voce del Mark di Incubus del round del 16 ottobre:
      "unerring" conta come tipo di danno; Showdown ha il suo Damage Roll, 2 ×2.)
- [x] **Emerso lavorando su R24 — danno scritto negli Effect del testo base non proposto in Other** (S/M): Chastise
      (p.179, "they take 1 divine damage three times") ha il danno in un Effect della base, non in hit/miss/area né in
      talento/mastery: Other non lo propone come scelta rapida, va scritto a mano (Fixed 1, Divine, Instances 3).
      (FATTO il 17 ottobre 2026, versione 1.15.100, con la voce del Mark di Incubus del round del 16 ottobre: Chastise
      propone in Other la chip "Effect — 1 divine" con 3 istanze.)
- [x] **Emerso lavorando su R8 — Helix Heel: regole nel testo di colore** (S, dati) (SPOSTATO in R55 del round del 16 ottobre): stesso difetto di Massive Overhead.
      Nel libro (p.219, "Effect: Release a shockwave in a line 3 area effect, dealing 2 piercing damage to all foes.")
      la prima riga è un Effect, nel compendio è senza etichetta e diventa testo di colore. Pack + migrazione per nome.
- [ ] **Emerso lavorando su R8 — Boiling Blood: "Defy Death —" appeso al testo di colore** (S, dati): il testo di colore
      finisce con "Defy Death —" (nome dell'interrupt, libro p.138). Da controllare come viene mostrato e sistemare.
- [x] **Emerso lavorando su R8 — Eye of the Storm: riga di regole senza etichetta** (S, dati) (SPOSTATO in R54 del round del 16 ottobre): "This attack has no
      attack space. Instead, the attack space is clear and exempt from this area." è una regola ma il libro la stampa
      senza etichetta, quindi finisce nel testo di colore. Decidere come mostrarla (es. "Effect:").
- [x] **Emerso lavorando su R1 — Incubus / Succubus** (S) (SPOSTATO in R40 del round del 16 ottobre): "Instead of the mark, gain Effect: …" non toglie il Mark
      della base (stesso problema di Sweet Torment, scritto in un altro modo). Va controllato sul manuale.
- [ ] **Emerso lavorando su R1 — tag di Reap** (S, dati): i tag della combo di Sow ("attack, range-4, mark, pierce")
      sono copiati dalla base; il Mark ora lo toglie il codice, ma Reap è un attacco melee (Special) e range 4 resta.
      Correzione dati nel pack + `COMBO_TAGS_BY_NAME` in `migrations.mjs` per i mondi già esistenti.
- [ ] **Emerso lavorando su R1 — barrato parziale** (S/M): con Sweet Torment / Indignation sulla scheda si potrebbe
      barrare solo l'Effect della base che viene sostituito (oggi non si barra niente).
- [ ] **Emerso lavorando su R1 — "Gains True Strike" letto come status** (S): l'Inflict di Indignation propone
      True Strike come se fosse uno status (c'era anche prima).
- [ ] **Emerso lavorando su R12 — elenchi "•" in linea nei foe** (M, dati): circa 100 tratti/azioni di foe e legend
      (Imperial Spy, Relict, Eternal Star del Warden, decreti del Majesty Demon, Creeping Cold delle Aesi…) scrivono
      gli elenchi con " • " in linea, senza a capo, quindi restano un paragrafo unico. La resa a righe di R12 vale solo
      per "\n•"; per usarla lì bisogna mettere l'a capo nei pack foes/legends, controllando a mano dove finisce l'ultima
      voce (es. "3+: 1 damage. Phase 2: …" dell'Eternal Star).
- [ ] **Emerso lavorando su R5 — tag dei foe ancora grigi** (S/M): nel pack delle foe abilities restano senza
      tooltip "per-round-N", "per-combat-N", "repeatable", "usable-when-bloodied", "round-3+(-only)", "area-effect",
      "burst-N-target/self", più i tag da meccanica di fazione ("cauldron-action",
      "might-of-the-wild", "blade-consume-N", "requires-N-tally", …). Servono le regole dal manuale per ognuno.
- [ ] **Emerso lavorando su R5 — costo grezzo nei riquadri delle abilità** (S): i sei riquadri della tab Combat
      mostrano il costo come è salvato ("1action", "interrupt-1") invece di "1 Action" / "Interrupt 1"
      (`icon-combat.hbs`, `item.system.cost`), e non seguono la mastery di Catapult.
- [ ] **Emerso lavorando su R14 — danno "to itself" dei foe** (S): Incredible Bulk del Bale Troll ("deals 10 piercing
      damage to itself") potrebbe proporre 10 come danno inflitto, come faceva Provoke con "to you"; da verificare
      sulla scheda del foe ed eventualmente saltare anche "to itself" in `ability-damage.mjs`.
- [x] **Emerso lavorando su R16 — Fists of Heaven and Hell con i talenti** (S, dipende da R28): la combo alternativa
      della mastery di God Hand "gains all talent effects of this ability" (p.192), ma oggi non si può usare (R28).
      Quando R28 la renderà usabile, la sua card dell'attacco deve ricevere il talento come la base e Devil Hand
      (`talentAttackBlocks` in `ability-blocks.mjs`, usato in `IconSheet.mjs` prima di `combatRoll`).
      (FATTO con R28, versione 1.15.32: la card dell'attacco aggiunge già il talento a ogni versione, Fists compresa.)
- [ ] **Emerso lavorando su R16 — talenti e mastery nella card auto-hit e mastery nella card dell'attacco** (S/M, non
      verificato): la card degli attacchi auto-hit (True Strike ecc.) non mostra né Exceed né il talento; la mastery
      sbloccata non entra in nessuna card dell'attacco (solo nello Show in Chat). Da controllare se ci sono mastery
      che aggiungono Hit / Exceed / Slay all'attacco e, se sì, trattarle come i talenti.
- [ ] **Emerso lavorando su R17 — testo del mark per Polaris / Party Favor** (S): il bottone Mark di un'abilità senza
      blocco "Mark:" mette nel mark tutto il testo dell'abilità (Terrain Effect + Gamble di Polaris); andrebbe usato
      il testo del talento / della mastery che crea il mark. Da verificare nel playtest R17.
- [ ] **Emerso lavorando su R19 — Painkiller: l'aura di Sweet Torment dovrebbe durare per sempre** (S): con la mastery
      di Bleak Mercy sbloccata ("Sweet Torment's aura lasts indefinitely", p.144) la durata dell'aura viene ancora
      letta dal testo della combo ("until the end of your next turn") e l'aura scade. Da verificare in gioco.
- [x] **Emerso lavorando su R19 — aure alternative nel testo non proposte** (S) (SPOSTATO in R48 del round del 16 ottobre): la mastery Phantom Bolts di Warding
      Bolts ("hover around you as an Aura 2 instead") e l'Heroic di Rook ("increase aura to Aura 2") non compaiono
      tra le scelte del bottone area (`areasInText` non legge "aura N"). Non verificato in gioco.
- [x] **Emerso lavorando su R19 — foe con tag "aura" senza numero** (S): Aura of Slaughter dei sei demoni (Armor,
      Gaping, Horn, Starving, Nail, Battle) ha il tag "aura" senza dimensione; le schede foe non passano da
      `resolveAbilityTags`, quindi probabilmente chiedono ancora la dimensione (proposta 3). Non verificato.
(FATTO il 17 ottobre 2026, versione 1.15.114: confermato; il tag "aura" senza numero dei sei demoni faceva chiedere la
      dimensione sulle schede foe; ora la dimensione si prende dal testo dell'azione ("gains aura 2", p.407), anche
      per le legend e per i foe già importati. Solo codice.)
- [x] **Emerso lavorando su R23 — finestra del danno dei summon senza "Other"** (S): la scheda summon usa ancora una
      sua finestra semplice (`SummonSheet.#promptSummonDamageMods`, select Hit/Crit/Miss/Area) e non quella condivisa
      di `roll-dialogs.mjs`, quindi non ha l'esito Other né Pierce/Divine/True Strike.
(FATTO il 17 ottobre 2026, versione 1.15.115: la scheda summon usa la finestra del danno condivisa di
      roll-dialogs.mjs, come foe e legend, con Other, Pierce / Divine / True Strike / Unerring, Hatred e bersagli; la
      vecchia finestra è stata tolta. Solo codice.)

---

## ⚠️ Già fatto nel round 4 (commit e87b2d8, 30 agosto) — CONFERMATI da Edoardo il 1 ottobre 2026

Maar li elenca ancora come bug il 5 settembre: o usa una build vecchia, o il fix non copre il suo caso.
Prima di riaprirli, chiedere a Maar di aggiornare e riprovare.

- [x] Dropdown delle schede PG che si chiudono a ogni fine turno (fix: stato `<details>` preservato)
- [x] Interrupt NPC non stampabili in chat (fix: bottone 💬 sugli interrupt Foe/Legend)
- [x] Burden/Ambition non avanzano cliccando le caselle o +1 (fix: lookup block-param nel `#each`)
- [x] Heave-Ho senza trigger (fix: split Trigger/Effect)
- [x] Draken Cross: effetto nel posto sbagliato (fix: Effect dopo Area per gli attacchi) — il pezzo
      "talento → tag Medium Blast" è fatto in Sessione 2
- [x] Overlay status sopra le tab della sidebar (fix: HUD ancorato alla sidebar reale)
- [x] Range degli attacchi base come promemoria (fix: badge "Range N")
- [x] Testo Aether "persists across combats" (fix: reset a fine combat + testo corretto)

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
- [x] (FATTO 1 ottobre 2026, 1.12.0: restano aure ed effetti terreno) Rimuovere automaticamente i template a inizio del turno successivo dell'attore (oggi restano finché
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
- [x] (CHIUSO 1 ottobre 2026: quelle scene non si usano) Maar: le scene della campagna (Enganoka) sono senza griglia → i template di area non funzionano lì.
      Chiedere se vuole una griglia quadrata sulle mappe di combattimento (Field Battlemap ce l'ha).

## Sessione 13 — Tutti i follow-up delle sessioni 9-12 — FATTA il 9 settembre 2026 (versione 1.5.0)

Le voci "Emerso" qui sotto sono spuntate; restano solo le due domande per Maar (riuso attori del mondo, icone token).
Dettagli nel CHANGELOG; test in PLAYTEST.md "Sessione 13".

## Playtest delle Sessioni 12 e 13 — FATTO il 10 settembre 2026 (vedi PLAYTEST.md, "Esito playtest del 10 settembre")

- [x] Sessione 12: 15/16 ok · Sessione 13: 21/23 ok, sul mondo di Maar con la build 1.5.0.

## Sessione 14 — Fix dal playtest del 10 settembre 2026 (S+S+S + cosmetici) — FATTA il 10 settembre 2026 (versione 1.5.1)

- [x] **Tag `true strike` dell'abilità/azione non ignora l'Evasion** (S): `ignoresEvasion(attacker)` in
      `module/combat/defenses.mjs` guarda solo gli status `true-strike` / `unerring` dell'attaccante. Demon Cutter,
      Cleave del Warrior, Brutal Strike del Trooper hanno il tag e fanno comunque tirare il d6. Passare i tag
      dell'abilità (PG: `resolveAbilityTags`; NPC: `action.tags`) a `combatRoll` / al dialog e trattare
      `true-strike` / `unerring` come lo status (p.117).
- [x] **"Applies to" nella tab Relics non compare mai** (S): in `IconSheet._prepareContext` la riga
      `touches: (context.abilityItems ?? []).filter(a => a.relicReminders …)` filtra gli Item grezzi, che non hanno
      `relicReminders`; usare `context.abilityDetails` (già calcolati prima dei relicItems).
- [x] **Card dei trait NPC senza blocco Inflict/Gain/Effects** (S): `foeTraitShowInChat` (FoeSheet e LegendSheet)
      non passa `statusHtml` come fanno azioni/interrupt/round action. Serve per Titanfall dei Jotunn (trait con
      "must save or take 6 damage, or 3 on a successful save"), per i trait tipo "Hold the Line" e "Sneak".
- [x] Cosmetici emersi il 10 settembre (S ciascuno):
      - [x] etichetta "EVASION" del blocco sulla card va a capo ("EVASIO N") nella colonna stretta della chat;
      - [x] card "MISS — evaded": il d20 resta visibile mentre la nota dice "no attack roll" (nascondere il dado o
            cambiare la nota);
      - [x] dialog d'attacco con Rigoletto Aspect attivo: chip "Evasion — sure" ma riga ⚙ "rolls 1d6 (3+ = miss)";
      - [x] dialog del danno con Dodge sul bersaglio: la riga "⚙ Dodge: … no damage from Miss / Area" compare anche
            con esito Hit selezionato (informativa, ma può confondere);
      - [x] "Hold the Line!": il testo dà "sturdy, counter and resistance" ma i bottoni Gain sono solo Sturdy e
            Counter (resistance è uno status "special": decidere se offrirlo);
      - [x] card del save senza status: "Damage: 6 / 3 on a successful save avoided." → frase più naturale;
      - [x] dialog d'attacco dei summon ("Attack: TEST") ancora vecchio stile, non restylato come PG/Foe.

## Playtest della Sessione 14 — FATTO il 10 settembre 2026 (11/11 ok)

- [x] Cosmetico (S): le card d'attacco di Foe/Legend mostrano i tag grezzi ("true-strike", "line-3") invece delle etichette
      ("True Strike", "Line 3") come le card PG: mappare i tag con lo stesso helper (`resolveAbilityTags` / label) in
      FoeSheet/LegendSheet prima di passarli a `combatRoll`.

## Debug del 13 settembre 2026 — emerso lavorando (da valutare in un blocco futuro)

- [x] **Ordine dei blocchi, casi rimasti** (S ciascuno): il report
      `icon-compendium-audit/block-order/report.md` elenca 10 abilità in cui l'estrazione del PDF ripete un blocco e
      l'ordine va deciso a mano (Pandaemonium, Raging Wolf, Dragon Dive, Fairy Ring, Chaos Tarot, Gran Reversa,
      Tsunami, Chastise, Dervish, Lance — le ultime tre risultano già giuste) e 6 abilità il cui testo non si trova
      nel .txt del manuale (Ace, Growing Season, Ätherwand, Bifröst, Heave-Ho, Waterspout): vanno confrontate a mano
      col PDF.
- [x] **Geo (Geomancer)**: nel manuale (p.218) ha un blocco `Terrain Effect:` ("crea un masso alto 1 nell'area dopo
      l'attacco") che nel pack non esiste — non è un problema d'ordine ma di dati mancanti. Controllare se altre
      abilità hanno perso un blocco nella conversione. (M, dati)

## Debug del 20 settembre 2026 — emerso lavorando (da valutare in un blocco futuro)

- [x] **Filtro nella lista PG dell'Encounter Designer** (S) — FATTO 1 ottobre 2026 (1.12.0): casella di ricerca, chi è nel party resta visibile: con ~40 attori di tipo PG nel mondo (schede usate come
      segnapunti) la lista dei ritratti ora scorre, ma trovare i 4 giocatori veri resta scomodo. Una casella di
      ricerca come quella del roster, o un ordinamento "prima i selezionati", renderebbe il passo 1 più rapido.
      Oggi si tira via con i bottoni "On scene" / "All".

- [x] **Mark che si impilano** (M) — FATTO 1 ottobre 2026 (1.12.0): "Battalion of Limbs" del Royal Guard (p.332) dice "This mark can be placed more
      than once and stacks indefinitely" e ogni stack aggiunge +3 danni. Oggi un secondo mark dello stesso
      marcatore sullo stesso bersaglio sostituisce il primo (regola generale p.95), quindi gli stack non si
      contano: servirebbe un contatore sul mark per le poche abilità che lo dicono esplicitamente.

- [x] **Level up, "← Back" perde le scelte del passo 2** (S/M) — FATTO 1 ottobre 2026 (1.12.0): tornando al passo 1 e ripremendo "Next →" le
      tendine delle azioni, le abilità spuntate, il relic e il bond power si azzerano (`_captureForm` viene
      chiamato solo in `#onNextStage`, quindi salva solo i campi del passo 1). Si nota di più ora che il passo 2
      è obbligatorio: basterebbe catturare il form anche in `#onPrevStage` e ripopolare i campi dal `savedData`.

- [x] **Classi dei Lowlander** — CHIUSO da Edoardo il 20 settembre 2026: va bene così. Il Butcher resta Heavy
      (corretto il 20 settembre), la sua base Slab e le altre varianti restano Artillery; niente passata sulla
      fazione. Resta agli atti che il manuale non dà classi ai foe unici dei Lowlander (pp.428-448) e che 20 dei
      40 nel pack sono artillery.

- [x] **Box "Summons" delle altre job finito nel posto sbagliato** (M, dati): stesso difetto di estrazione del
      Salt Sprite (corretto il 20 settembre su Rime e Geyser). Il box di fazione/job è finito in coda a un
      **tratto** invece che a un'abilità in quattro job — Shade → "Darkside", Warden → "Beast Master",
      Fool → "Cheap Trick", Harvester → "Gardener of Kin" — e nel Seer sta in coda all'abilità **Astra**
      ("Many seer abilities summon a wild card…"). I tratti vivono anche come copie sulle schede dei PG, quindi
      serve una migrazione come la 10. Da controllare anche se Chaos Tarot e Sleight of Hand (Seer) devono
      davvero contenere il blocco "Wild Card — Size 1…" (nel manuale il riquadro del summon è stampato sotto
      l'abilità, quindi lì probabilmente è giusto).

- [x] **Sealed e gli status positivi** — DECISO da Edoardo il 20 settembre 2026: vale quello che dice il testo
      dell'abilità. Se l'abilità dice che *infligge* uno status, Sealed lo blocca (blocco Inflict); se dice che
      il personaggio o un alleato *guadagna* uno status, non è infliggere e passa (blocco Gain). Nessuna modifica
      al codice: è il comportamento già in `module/combat/inflict-status.mjs`.

- [x] **Trigger scritti due volte** (S, dati): `icon-compendium-audit/block-format/scan-duplicate-blocks.mjs`
      trova 5 abilità in cui lo stesso trigger è sia nel campo sia nel testo, quindi il pannello lo stampa due
      volte: Terraforming e Helix Heel (Geomancer, Charge), Aethershard e Blazing Bond (Enochian, Comeback),
      Nothung (Spellblade, Slay). Blitz e Tsunami sono stati corretti il 20 settembre; per queste cinque serve
      confrontare col PDF quale delle due versioni tenere.
- [x] **Refocus e gli Skill Rank dei level up** (S): `↻ Refocus` azzera `skillRanksTotal`, quindi i dot
      guadagnati con i level up passati spariscono e il contatore torna a "6 dalla creazione". Andrebbe azzerata
      solo la spesa (le dieci azioni), lasciando il totale.
- [x] **Area nel testo per NPC** (S): il fallback "area letta dal testo dell'abilità" del 20 settembre vale solo
      per le abilità dei PG. Le azioni di foe/legend prendono l'area dai tag dell'intestazione: se qualcuna ha
      la forma solo nel testo, il bottone 📐 non compare nemmeno lì.

## Debug del 30 settembre 2026 — lista foe di Maar — FATTO (versione 1.6.2)

Decisioni di Edoardo (30 settembre): in questo round solo i dati; template e summon sulla scheda NPC in
blocchi futuri; Legends e Summons restano compendi separati.

- [x] **Classi dei foe** (L, dati): 122 foe corretti in base al colore dell'intestazione nel PDF (p.112
      "same class (color)"); tutta la lista di Maar confermata, più 6 casi trovati dal confronto automatico.
      Questo **supera la decisione del 20 settembre sulle classi dei Lowlander** (Slab e varianti ora Heavy):
      quella decisione partiva dal presupposto che il manuale non desse le classi.
- [x] **Mob**: Goons e Villager → mob; Red Worm → Artillery, Shinobi → Skirmisher.
- [x] **Tolti dal compendio Foes**: 8 summon, i 3 Dread Lords, Guilder / Islander / Leggio.
- [x] **Atrophic Grave e Churn Baron Elite**.
- [x] **Cartelle**: Fazione → Artillery / Heavy / Leader / Skirmisher / Mobs / Uniques / Uniques → Elites.

Emerso lavorando (da fare in blocchi futuri):

- [x] **Template trascinabili sulla scheda NPC** — FATTO il 30 settembre 2026 (versione 1.7.0): compendio a parte
      "Foe Templates" (un compendio Foundry contiene un solo tipo di documento, quindi non può stare dentro Foes),
      9 fazioni + 6 Great Culture + 2 speciali + 192 job; drop sulla scheda Foe con conferma di sostituzione e ✕
      per togliere. Emerso lavorando e corretto nello stesso giro: la tendina Faction che cancellava la fazione.
      Resta, da valutare:
      - [x] **Titan Armament, turno in più** — FATTO il 30 settembre 2026 (1.8.2): il template dà +50% HP ma il tracker dà comunque 2 turni a un
            Elite; p.448 dice "take one extra turn a round". Servirebbe un campo "turni extra" letto da
            `IconCombat.turnsFor()`.
      - [x] (FATTO il 13 ottobre 2026, 1.20.0, Sessione E) **Template sulle Legend** (S): la scheda Legend non accetta il drop dei template (il libro non lo
            chiede, ma Maar potrebbe volerlo per i Jotunn legend).
      - [x] (FATTO il 13 ottobre 2026, 1.20.0, Sessione E) **Template dei Unique** (S, dati): oggi i job template coprono solo i job di fazione e le varianti; gli
            Unique (Iron Soldat, Silent One…) restano solo come attori nel compendio Foes.
      - [x] **Foe Abilities "Faction: …"** — TOLTE il 30 settembre 2026 (1.8.2), 39 voci: le vecchie voci parafrasate "Faction: X — Y" in Foe Abilities
            ora sono doppioni meno precisi dei template; decidere se toglierle.
- [x] **Summon dei foe sulla scheda NPC** — FATTO il 30 settembre 2026 (versione 1.8.0): 59 summon e oggetti letti
      dal libro, 85 agganci su 71 foe e legend, sezione "Summons & Objects" sulle schede con gettone da
      trascinare sulla mappa (crea l'attore Summon nella cartella "Foe Summons" e un token), anche nei job
      template. Resta, da valutare:
      - [x] (FATTO il 13 ottobre 2026, 1.20.0, Sessione E) **Foe già importati** (S): i foe già nei mondi non hanno i summon (non si aggiornano dai compendi). Si
            può reimportarli, oppure una macro "copia i summon dal compendio ai foe del mondo con lo stesso nome".
      - [x] (FATTO il 13 ottobre 2026, 1.20.0, Sessione E) **Immagini dei summon** (S): tutti usano `mystery-man.svg`, come i foe.
      - [x] (FATTO il 13 ottobre 2026, 1.20.0, Sessione E) **Summon dei giocatori** (S): solo il GM può piazzare i summon dei foe (crea attori); se Maar lascia i
            foe a un giocatore co-GM servirebbe un relay via socket come per le altre azioni GM.
- [x] **Token di dimensione sbagliata** — FATTO il 30 settembre 2026 (versione 1.8.1): 18 Jotunn token 2×2, Bouncer
      taglia 2 (p.367 "Prodigious size: Size 2"), Scrapper token 1×1. `validate-packs.mjs`: HIGH 0.
- [x] (CHIUSO da Edoardo il 1 ottobre 2026: p.302 dice che la Great Culture la applica il GM; nessun Unique la ha nel pack, si aggiunge trascinando il template "Yeokin" da Foe Templates) **Villager senza tratti** (S, dati): il Villager nel pack non ha nessun tratto di fazione/cultura; nel
      libro è un mob degli Yeokin (p.322) e la Great Culture "Camaraderie (Villager)" esiste solo in Foe Abilities.

## Feedback di Maar — documento "Icon VTT Bugs" (ricevuto il 9 ottobre 2026)

Nessun bug alto/medio. Molti commenti positivi dai tavoli di Maar (encounter planner, save automatici, keyword al
passaggio del mouse, clock board, guide visive). La richiesta 1 (skin/temi alla COMP/CON per fazione) è **scartata per
scelta di Edoardo** (9 ottobre 2026). Il resto, diviso in sessioni:

### Sessione A — Bug bassi e ritocchi (S+S+S+S+M+S) — FATTA il 9 ottobre 2026 (versione 1.15.0)
- [x] **Tab della scheda PG "affondate"** (S, bug): la barra Narrative/Combat/Conditions/Relics/Notes sta più in basso
      e rientrata rispetto al resto della scheda (foto di Maar). Il reset CSS dei part AppV2 rendeva la barra `display: block` (tab inline che sbordavano): ora è flex.
- [x] **Box ridimensionabili solo in verticale** (S, bug): sulle schede clock e foe i riquadri si allargano solo in
      altezza (`resize: vertical` in `css/icon.css`). Erano le textarea `.icon-editor` senza larghezza: ora a tutta larghezza.
- [x] **Bottoni dell'Encounter planner piccoli** (S): ingrandire i bottoni troppo piccoli di `EncounterDesigner`.
- [x] **Scheda clock più ariosa** (S): "looks a little compressed"; più spazio tra i clock e tra le righe.
- [x] **Colore dei clock** (M): 3-4 colori già pronti (es. positivo / negativo / neutro / altro) più un color picker
      per un colore libero, per ogni clock. (Il picker c'era già: aggiunti i 4 colori pronti.)
- [x] **Ranghi delle reliquie sbloccati / bloccati** (S): nella tab Relics, evidenziare i ranghi sbloccati e
      sbiadire quelli ancora bloccati.

### Sessione B — Tab "Narrative" nella guida rapida (M/L) — FATTA il 9 ottobre 2026 (versione 1.16.0)
- [x] Nuova tab della Quick Guide per il gioco narrativo, sui dubbi segnalati da Maar: differenza tra Aid e Set up,
      come funzionano i second wind, cosa vuol dire "exhausted", i diversi rischi dei tiri. Testi presi dal manuale
      (con pagina), stile delle altre tab (diagrammi dove servono).

### Bug di Maar del 12 ottobre 2026 — danno degli attacchi ad area — FATTO il 12 ottobre 2026 (versione 1.16.1)
- [x] Il danno dopo un attacco ad area (Pyre, Enochian) trattava tutti i bersagli come bersaglio d'attacco; il ✕ del
      dialog del danno non toglieva i bersagli; i bersagli restavano anche dopo aver tolto l'area.

### Bug di Maar del 12 ottobre 2026 — Hatred+ finiva a fine turno — FATTO il 12 ottobre 2026 (versione 1.16.2)
- [x] La Hatred+ (ongoing) veniva tolta a fine turno come quella normale.
- [x] (FATTO il 13 ottobre 2026, 1.20.0, Sessione E) **Emerso lavorando — Hatred+ con durata e Hatred+ su se stessi** (M): alcune abilità danno una Hatred+ che
      scade a una data ora (Mock: "until the end of their next turn", Spite: "until the end of your next turn"):
      oggi la Hatred+ resta finché non la si toglie a mano. Inoltre le abilità che fanno *guadagnare* Hatred+ al PG
      (Spite, la stance "gain hatred+ of the closest foe") non hanno un bottone: `inflict-status.mjs` considera la
      Hatred solo come inflitta dall'attaccante. Si mette a mano dalla tab Conditions.

### Bug di Maar del 12 ottobre 2026 — mark della combo di Rot — FATTO il 12 ottobre 2026 (versione 1.16.3)
- [x] Rot / Regenerate: il bottone del mark piazzava sempre il mark base, mai quello della combo.

### Bug di Maar del 12 ottobre 2026 — Vigilance sommava i dadi — FATTO il 12 ottobre 2026 (versione 1.16.4)
- [x] Lo Spend di Vigilance sommava i d6 invece di tenere il più alto (p.105, p.117).

### Bug di Maar del 12 ottobre 2026 — save doppi con due GM — FATTO il 12 ottobre 2026 (versione 1.16.5)
- [x] Con GM + GM assistente i save automatici di fine turno (e l'annuncio di fase delle legend) uscivano una volta
      per GM.

### Bug di Maar del 12 ottobre 2026 — status delle combo e "Seal your foe" — FATTO il 12 ottobre 2026 (versione 1.16.6)
- [x] God Hand non offriva Sealed (verbo non riconosciuto); con la combo attiva sparivano gli status della base.
- [ ] **Emerso lavorando — status sulla card del danno** (S/M, da chiedere a Maar): i bottoni Inflict stanno sulla
      card dell'attacco (o dell'auto-hit), non su quella del danno. Maar dice "when damage card is posted": chiedere se
      li vuole anche lì.

### Bug di Maar del 12 ottobre 2026 — card delle versioni combo — FATTO il 12 ottobre 2026 (versione 1.16.7)
- [x] Show in Chat della combo con il nome base e "⚡ ⚡"; card dell'attacco con tutto il testo combo nel blocco Hit
      ed Exceed della versione base.

### Bug di Maar del 12 ottobre 2026 — bottone dell'area con la combo — FATTO il 12 ottobre 2026 (versione 1.16.8)
- [x] Death Blossom / Flying Sleeves: il bottone 📐 non cambiava nome con la combo accesa.

### Bug di Maar del 12 ottobre 2026 — Death Blossom: area e range — FATTO il 12 ottobre 2026 (versione 1.16.9)
- [x] Senza token proponeva le aree della combo (token speso con Show in Chat e mai "dimenticato"); la combo perdeva
      il range 2.

### Bug di Maar del 12 ottobre 2026 — "Death Blossom does not deal damage" — FATTO il 12 ottobre 2026 (versione 1.16.10)
- [x] Il danno delle combo che cambiano solo una parte dell'abilità era letto come "nessun danno"; Fortuna tirava 0 dadi.

### Bug di Maar del 12 ottobre 2026 — limit break e Resolve — FATTO il 12 ottobre 2026 (versione 1.16.11)
- [x] Il limit break spendeva sempre prima la Party Resolve senza chiedere (p.99: qualunque combinazione).

### Richiesta di Maar del 12 ottobre 2026 — più stance insieme — FATTA il 12 ottobre 2026 (versione 1.17.0)
- [x] Massimo automatico (1 + Martial Master + Byrax Aspect) e campo Extra senza tetto.

### Bug di Maar del 12 ottobre 2026 — Draken Cross Talent II — FATTO il 12 ottobre 2026 (versione 1.17.1)
- [x] Medium Blast del Talent II non selezionabile ("blasts" al plurale; tag del talento applicati sempre).
- [x] (FATTO il 13 ottobre 2026, 1.20.0, Sessione E) **Emerso lavorando — attacco senza area già piazzata** (S): se si preme l'attacco senza aver usato 📐 prima,
      l'area che si piazza è quella dei tag (Medium Blast col Talent II), senza la scelta del 📐. Valutare se usare lo
      stesso dialog anche lì.

### Bug di Maar del 12 ottobre 2026 — tracker con più turni — FATTO il 12 ottobre 2026 (versione 1.17.2)
- [x] I ▶ dei turni rimanenti, premuti durante il turno, chiudevano il turno e aprivano il successivo.

### Bug di Maar del 12 ottobre 2026 — Great Spirit Lance — FATTO il 12 ottobre 2026 (versione 1.17.3)
- [x] Gli Infuse scritti nella Mastery (Lance e altre sei) non comparivano tra i bottoni ✨.

### Bug di Maar del 12 ottobre 2026 — riquadri solo verticali — FATTO il 12 ottobre 2026 (versione 1.17.4)
- [x] I riquadri di testo delle schede si allargano anche di lato (prima resize solo verticale).

### Bug di Maar del 12 ottobre 2026 — Domain su Helix Heel — FATTO il 12 ottobre 2026 (versione 1.17.5)
- [x] Domain scattava su qualunque testo con "object": ora solo se l'abilità crea terreno o un oggetto.
- [x] (FATTO il 13 ottobre 2026, 1.20.0, Sessione E) **Emerso lavorando** (S, da controllare col manuale): Chaos Tarot e Sleight of Hand fanno scattare Domain per
      una frase sul wild card del Seer ("such as creating terrain effects"); succedeva anche prima.

### Bug di Maar del 12 ottobre 2026 — combo token sui tratti del Vagabond — FATTO il 12 ottobre 2026 (versione 1.17.6)
- [x] Il controllo della risorsa di classe compare solo sul tratto che la usa; nessuno sui tratti del Vagabond.

### Bug di Maar del 12 ottobre 2026 — numeri non modificabili nelle finestre PopOut! — FATTO il 12 ottobre 2026 (versione 1.17.7)
- [x] I tasti premuti nei campi delle finestre staccate non arrivano più alle scorciatoie di Foundry (1–0 = macro).
- [ ] **Da segnalare agli autori di PopOut!** (fuori dal nostro codice): il bug è loro, valeva per qualunque sistema.

### Domanda di Maar del 12 ottobre 2026 — slow turn e NPC che aprono il round — FATTO il 12 ottobre 2026 (versione 1.17.8)
- [x] È la regola di p.87 (apre il lato opposto a chi ha chiuso); aggiunta la spiegazione all'indicatore del tracker.

### Bug di Maar del 12 ottobre 2026 — Vigilance assente dalle regole dello Stalwart — FATTO il 12 ottobre 2026 (versione 1.17.9)
- [x] Aggiunte Vigilance, Rampart, Sturdy e True Strike alle Relevant Rules dello Stalwart (p.117).
- [x] (FATTO il 13 ottobre 2026, 1.20.0, Sessione E) **Emerso lavorando** (S): anche le altre classi hanno una pagina "Most relevant rules" (Vagabond p.146,
      Mendicant, Wright); confrontarle con le liste della scheda (il Vagabond ne ha zero).

### Bug di Maar del 12 ottobre 2026 — Terrorize con due tiri salvezza — FATTO il 12 ottobre 2026 (versione 1.17.10)
- [x] Status del save fallito e del save riuscito nello stesso blocco → un solo bottone, un solo tiro.

### Bug di Maar del 12 ottobre 2026 — tutto doppio con il modulo PopOut! — APERTO (non riprodotto)
- [ ] Con una finestra staccata con PopOut! l'automazione di fine turno (status, regeneration…) e altri eventi
      succedono due volte. Letto il sorgente di PopOut!: non carica una seconda copia del sistema (toglie dalla
      finestra nuova tutti gli script tranne poche librerie), non tocca hook né socket e non ri-renderizza le
      finestre. Il nostro fine turno gira solo sul GM attivo. Da chiedere a Maar: quale finestra era staccata, chi
      (GM o giocatore), se c'era un secondo GM o lo stesso GM collegato due volte (stesso sintomo del bug delle 1.16.5,
      che Maar non ha ancora: ha la 1.14.1). Poi riprodurre in locale installando PopOut!.

### Sessione C — Trofei (L, dati + scheda) — FATTA il 12 ottobre 2026 (versione 1.18.0)
- [x] **Compendio Trophies**: General Dungeon Trophies (tabella d20, p.243) e trofei di fazione/legend (manuale
      ~righe 20632, 22384+ del .txt). Regole p.243: massimo 3 trofei, danno un tratto o un'abilità, si rompono finiti
      gli usi.
- [x] **Trofei sulla scheda PG** senza automazione: usi rimasti come tracker, "1/battle", "dura un'expedition", e
      trofei personalizzati creati a mano.
- Maar l'ha richiesta di nuovo il 12 ottobre 2026: "Trophies would be a great compendium, along with having custom
  trophy implementation options. Doesn't need to be automated. Use tracker, 1/battle, expedition long marker, etc."
  Conferma il perimetro sopra: niente automazione, solo compendio + tracker sulla scheda.
- Fatto: 144 trofei (script `icon-compendium-audit/trophies-pack/build-trophies-pack.mjs`, dati in
  `trophies.json`), sezione nel tab "Relics & Trophies".
- [x] (FATTO il 13 ottobre 2026, 1.20.0, Sessione E) **Emerso lavorando** (S, da chiedere a Maar): "Used this combat" e "In effect this combat" si tolgono a mano;
      se Maar vuole, si possono spegnere da sole alla fine del combat.

### Sessione D — Gear kit migliori (L) — FATTA il 12 ottobre 2026 (versione 1.19.0)
- [x] Oggi il kit è solo un campo di testo (`system.narrative.gearKit`) che il drop di un item `gear-kit` riempie col
      nome. Richiesta: drag & drop vero (il kit resta sulla scheda con i suoi oggetti), scelta del kit quando si sceglie
      il bond, conteggio degli usi. Da chiarire con Maar quali usi intende tracciare.
- Fatto: kit come item sulla scheda (base sempre, uno del bond portato per expedition, due per l'Highborn), custom kit,
  kit aggiunti con il bond e scelti nel wizard, loose gear senza limite con spunta "portato" e limite per bond.
  Per "conteggio degli usi" ho fatto la cosa che il manuale prevede: oggetti segnati usati/persi fino alla prossima
  expedition (p.35: "even if that gear is used up or lost").
- [x] (FATTO il 13 ottobre 2026, 1.20.0, Sessione E) **Da chiedere a Maar**: gli bastano i segni usato/perso, o voleva contare usi numerici per oggetto (il manuale
      non ne ha: "Icon doesn't care about minutely tracking gear", p.35)?
- [x] (FATTO il 13 ottobre 2026, 1.20.0, Sessione E) **Emerso lavorando** (S): l'Outsider, a fine interlude, può prendere un oggetto dai kit degli altri PG del party
      come loose gear (p.76); oggi si scrive a mano nella lista.

### Sessione E — Voci rimaste "emerse lavorando" (13 ottobre 2026, richiesta di Edoardo: farle tutte) — FATTA il 13 ottobre 2026 (versione 1.20.0)
Raccoglie le voci aperte che non aspettano una risposta di Maar (le voci originali restano nelle loro sezioni e si
spuntano lì).
- [x] E1. Hatred+ con durata (Mock, Spite) e Hatred+ guadagnata su se stessi (Spite, Dark Knight) (M)
- [x] E2. Attacco ad area senza 📐: stesso dialog di scelta dell'area (S)
- [x] E3. Domain su Chaos Tarot / Sleight of Hand: controllare col manuale (S)
- [x] E4. "Most relevant rules" di Vagabond, Mendicant, Wright (S)
- [x] E5. Godly Smite automatico (S)
- [x] E6. Outsider: oggetto dai kit degli altri PG a fine interlude (S)
- [x] E7. Summon: immagini, macro per i foe già importati, piazzamento da giocatore co-GM (S+S+S)
- [x] E8. Template: drop sulle Legend, template degli Unique (S+S)

Risposte di Edoardo del 13 ottobre 2026 alle domande per Maar (decide lui):
- [x] E9. Trofei: "Used this combat" e "In effect this combat" si spengono da soli a fine combat (S)
- [x] E10. Gear kit: contare gli usi per oggetto, non solo usato/perso (S/M)
- [x] E11. Token dei foe: un'icona per fazione, assegnata a tutti i foe di quella fazione (M, dati)
### Sessione F — Resto del documento di Maar (ri-incollato da Edoardo il 13 ottobre 2026: "fai tutti questi") — FATTA il 13 ottobre 2026 (versione 1.20.0)
Già fatti: kit migliori (Sessione D; il conteggio usi è E10), tab Narrative della guida (Sessione B).
- [x] F1. Mendicant: bottone sul tratto delle blessing per dare un Blessed a un giocatore (niente automazione) (S)
- [x] F2. Combo dei foe "1 poi 2": dopo aver usato la parte 1, la 2 si evidenzia / la 1 si scurisce finché non si
      usa l'altra; reset a mano per gli errori (M)
- [x] F3. Aree della FAQ piazzabili sulla mappa (dalla guida) per provare se un'area ci sta (S/M)
- [x] F4. Prompt di rimozione dell'area: testo più grande, e sparisce da solo se l'area viene tolta (S)
- [x] F5. Larghezza della Line scelta al momento del piazzamento (Enochian che allargano la linea) (S)

- Status "Power Die" sul token: resta com'è (risposta: no). Encounter Designer "riusa gli attori": da spiegare
  meglio a Edoardo prima di decidere.

### Dal playtest della 1.15.1 (13 ottobre 2026)
- [ ] **Usi dei kit con clic rapidissimi** (S): due clic sullo stesso oggetto prima che la scheda si ridisegni
      contano come uno; servirebbe un blocco per oggetto finché l'aggiornamento non è fatto.
- [ ] **Da provare con un secondo client**: summon piazzati da un giocatore co-GM, Mock e Bless da giocatore, due GM
      collegati, slow turn / "NPC picks next", danno diviso degli attacchi ad area, tour guidati.

## Playtest locale del 2 ottobre 2026 (versioni 1.12.1–1.14.0) — FATTO, correzioni nella 1.14.1

- [x] **Gain vigilance**: il lettore del testo non riconosceva "Gain +1 vigilance" / "vigilance +1" (S, fatto).
- [x] **Nome lungo di un power die** nascondeva la dimensione (S, fatto).
- [ ] Da provare con un secondo client: Gain vigilance da giocatore su un alleato, controlli lato giocatore dei
      power die; tema chiaro della guida e "riduci animazioni" (S, playtest).

## Richiesta di Maar — status doppioni dei tracker (ricevuta il 2 ottobre 2026) — FATTA il 2 ottobre 2026 (versione 1.14.0)

Testo di Maar: "Old status methods of tracking (Vigilance, Power Die, Bonus Damage, Marked, etc) seem redundant with
current systems in place on the combat sheet … maybe making them hidden from the status menus and tying them directly
to the player character trackers? This doesn't apply to blessed". Scelte di Edoardo: nascondere solo sui PG (foe e
legend non hanno tracker), Bonus Damage nascosto anche lui sui PG, il token del PG mostra i valori della scheda.
File: `module/combat/tracker-statuses.mjs`.

- [x] **Marked nascosto per tutti** (S): c'è il sistema dei mark per abilità (`marks.mjs`), usato anche da foe e legend.
- [x] **Vigilance, Power Die, Bonus Damage nascosti sui PG** (S): via dalla tavolozza dell'HUD del token e dalla tab
      Conditions; foe e legend li tengono. Uno status ancora attivo "alla vecchia" resta visibile per poterlo togliere.
- [x] **Token legato ai tracker** (M): Vigilance e Power Die sul token del PG compaiono/spariscono seguendo i tracker
      della scheda; nel pannello degli status il numero è quello della scheda (Vigilance con +/−, Power Die solo lettura
      con i nomi dei dadi). "Gain vigilance" dalle card aggiunge 1 al tracker.
- [x] **Migrazione 19** (S): i PG con questi status li passano ai tracker (Vigilance, Power Die) o li perdono (Bonus
      Damage, Marked).

## Bug di Maar — power die (ricevuti il 2 ottobre 2026) — FATTO il 2 ottobre 2026 (versione 1.13.0)

Testo di Maar: "Ability to add power die onto the combat sheet for ease-of-use" — poi: "this is on the sheet for
Wrights, but not other classes. Moving this to a bug." Più Godly Smite del Sealer senza dado, e le etichette.

- [x] **Tracker dei power die per tutte le classi** (S/M): il blocco "Power Dice" della tab Combat stava dentro la
      sezione del Wright → ora è un blocco a sé, sotto le risorse di classe, per ogni classe.
- [x] **Etichette e dimensione** (S): ogni dado ha un nome (l'abilità che lo dà) e una dimensione d4–d12; "+ Die"
      chiede nome, dado e partenza; clic sul nome per rinominare; i tick non superano la dimensione, il 🎲 tira 1dN.
      Pensato per il Knave con molti dadi insieme (oggi usava lo status "Power Die", un numero solo senza nome).
- [x] **Godly Smite senza power die** (S, bug): il tratto nel pack `jobs` ha il d6 (Sessione 4), ma i tratti del PG
      vengono ricreati dalla lista del job-template, che tiene solo nome/descrizione/capitolo → il dado si perdeva.
      Ora viene copiato dal tratto del pack alla creazione (wizard, drop del job, cambio job primario) e la
      migrazione 18 lo aggiunge ai Sealer esistenti.

Emerso (da fare in un blocco futuro):
- [x] (FATTO il 13 ottobre 2026, 1.20.0, Sessione E) **Godly Smite automatico** (S): p.191 "You start combat with a mantra power die, a d6 that starts at 1, and
      ticks up by 1 at the start of every round, to a maximum of 6" → oggi si mette fuori e si sposta a mano;
      si potrebbe accendere a 1 all'inizio del combat e salire da solo a ogni round.
- [x] (CHIUSO: Edoardo il 13 ottobre 2026 risponde di lasciarlo com'è) **Status "Power Die" sul token** (S): resta come prima (contatore unico). Chiedere a Maar se toglierlo per i PG
      ora che c'è il tracker sulla scheda, o lasciarlo per i foe.

## Richieste di Maar — scheda Areas della guida, secondo giro (ricevute il 1 ottobre 2026 sera) — FATTA il 1 ottobre 2026 (versione 1.12.1)

Commento di Maar alle clip delle aree ("oh yes this is very good"), con tre richieste. File: `module/apps/area-diagrams.mjs`
(elenco `AREAS` + didascalie), clip in `assets/guide/areas/*.webm`, CSS `.icon-area-*` in `css/icon.css`.

- [x] **Burst: origin space e attack space** (S): le didascalie dei Blast dicono "The centre is the attack space", quelle
      dei Burst no. Manuale p.97: "Burst X: … The origin space and attack space is the central space". Conta soprattutto
      per Burst (target). Aggiungere la frase alle tre didascalie Burst (e scrivere "origin and attack space" anche nei Blast,
      p.97: "The origin space and the attack space (if there is one) is the central space").
- [x] **Esempio di Line con range** (S/M): oggi c'è solo "Line 5" senza range (parte accanto a chi la usa). Registrare una
      clip nuova, es. "Line 4, range 3", con lo stesso metodo delle altre (piazzamento 📐 in Foundry, ffmpeg) e la
      didascalia p.97: con un range l'origin space è la prima casella della linea.
- [x] **Titoletti per gruppo** (S): dividere le card in gruppi con un piccolo titolo — Blast, Burst, Line, Arc, Aura —
      invece della griglia unica.
- [x] (Edoardo, 2 ottobre 2026) **Origin/attack space più evidente**: riga `.icon-area-key` sotto ogni titoletto di
      famiglia, non solo nelle didascalie.
- [x] (arrivata il 2 ottobre 2026 con le altre tre) **Movimento tutto in una volta** (S): scheda Turn, "base movement
      must all be taken at once, any movement not used will be wasted" → riga nei Limits, p.88 "Movement can't be
      broken up: You can stop at any point during a movement to use an ability, but if you do, the movement ends".

## Richieste di Maar — guida rapida (ricevute il 1 ottobre 2026) — FATTA il 1 ottobre 2026 (versione 1.11.0)

Testo originale: "Expansion / Further attention being brought to the quick-guide". "Quick-guide" è la **Rules Reference**
(📖, `module/apps/reference.mjs`), confermato da Edoardo il 1 ottobre.

- [x] **Elenco illustrato delle aree** (M/L): Small / Medium / Large Blast, Burst 1-2 (self / target), Line N,
      Arc 3/4/5, Aura N, disegnate come appaiono sulla griglia del VTT, "preferibilmente animate" mentre vengono
      piazzate. Idea: disegni SVG generati con `shapeCells` di `module/canvas/area-templates.mjs` (le stesse caselle
      del piazzamento vero, quindi non possono essere diverse), con un'animazione CSS delle caselle che si accendono.
      Scelta di Edoardo (1 ottobre): disegni animati dal codice, niente GIF.
- [x] **Guida rapida in cima alla scheda PG** (S): un bottone ben visibile nell'intestazione della scheda che apre la
      guida. Oggi la Reference sta nel menu ⋮ della finestra e nel 📖 dei controlli token.
- [x] **Guida divisa in schede** (richiesta di Edoardo, stesso giorno): Turn / Areas / Glossary / FAQ, ricerca
      comune a glossario e FAQ.
- [x] **Guida con la grafica delle schede** (Edoardo, 1 ottobre pomeriggio): finestra come le schede, banda, linguette.
- [x] **Popup una volta per aggiornamento** che chiede se aprire la Quick Guide (Edoardo, 1 ottobre pomeriggio).
- [x] **FAQ dei casi limite** (M): 11 domande e risposte di Maar, incollate da Edoardo, controllate sul manuale.
      Tutte confermate; quattro risposte riformulate col testo del libro (vedi CHANGELOG 1.11.0).

Emerso (da valutare in un blocco futuro):
- [x] (CHIUSO da Edoardo il 1 ottobre 2026 dopo il confronto in Foundry: si lasciano così) Colori del piazzamento delle aree **sulla mappa** (`AREA_COLORS` in area-templates.mjs): sono gli stessi
      arancio/rosso/blu accesi tolti dai disegni della guida. Valutare se smorzarli anche lì. (S)
- [x] (CHIUSO da Edoardo: vengono dal manuale) Dire a Maar le quattro riformulazioni delle FAQ (danno, engagement, remove-and-place, "(+)" come boon), nel
      caso non sia d'accordo. (S)

## Richiesta di Edoardo — 1 ottobre 2026: tour guidati — FATTA il 1 ottobre 2026 (versione 1.10.0)

- [x] **Tour guidati del sistema** (M): usare il framework "Tours" di Foundry (Settings → Tours) per spiegare
      l'interfaccia di ICON. Fatti tre tour: *First Steps* (dove stanno gli strumenti), *The Character Sheet*
      (scheda PG tab per tab, apre la scheda da solo), *Combat* (tracker, attivazioni, slow turn, Resolve,
      status, Apply). Codice in `module/apps/tours.mjs`, passi in `tours/*.json`.
- [x] Bottone **Take the tour** nella guida di benvenuto.
- [x] Quarto tour **House Rules** (solo GM, chiesto lo stesso giorno): apre Configure Settings → ICON 1.5 ed
      evidenzia Party Resolve +1 (RAW), Dust per i Burden, Heroic/Routine.

Emerso (da valutare in un blocco futuro):
- [x] (FATTO 1 ottobre 2026, 1.12.0: è RAW, p.42 lo dice nel paragrafo Heal Burdens; ora attiva di default) **Dust sui Burden: è davvero una house rule?** Il suggerimento dell'impostazione `hrInterludeDustHealing`
      dice "in RAW la Dust per segmento esiste solo per le Ambition", ma il manuale non è coerente: p.42 (Heal
      Burdens / Pursue Ambitions) cita i 2 Dust per segmento solo per le Ambition, mentre l'elenco degli usi della
      Dust a p.242 dice "ambition or burden clock (2 dust for 1 tick)". Decidere con Maar se lasciarla opzionale
      (e correggere il testo del suggerimento) o renderla RAW. Il tour lo spiega già così. (S)
- [x] Tour per il GM sugli strumenti dei foe (Foe/Legend sheet, Encounter Designer aperto, Clock Board). (M) — FATTO 1 ottobre 2026 (1.12.0), tour "Foes & Encounters"
- [x] (RIMANDATA da Edoardo il 1 ottobre 2026: si fa solo insieme a una traduzione completa del sistema) I testi dei tour sono in inglese hardcoded come il resto: se un giorno si localizza, spostarli in
      `lang/en.json` (il formato dei tour accetta già chiavi di traduzione). (S)

## Richieste di Edoardo — 20 settembre 2026 (wishlist, NON bug)

Mandate come lista di desideri durante la sessione di debug del 20 settembre. Nessuna è stata fatta:
vanno pianificate come blocchi a sé. Le dimensioni sono stime (S/M/L/XL come in legenda).

**Piccole / rapide**

- [x] **Macro XP su attori scelti** (S): `macros/xp-award.mjs` prende `game.actors.filter(a => a.type === "icon"
      && a.isOwner)`, cioè TUTTI i PG posseduti. Serve al GM per aggiornare la scheda di chi si è dimenticato:
      aggiungere al dialog una lista di PG con le spunte (o usare gli attori selezionati sul canvas), default
      "tutti" per non cambiare l'uso attuale. Ricordare `macro-sync` dopo la modifica.
- [x] **Reference più raggiungibile per i giocatori** (S): oggi 📖 Reference sta nel menu "..." della finestra
      della scheda (`REFERENCE_CONTROL` in `module/apps/reference.mjs`, registrato in `window.controls`).
      Metterlo anche come bottone visibile (tab Notes c'è già, ma serve qualcosa di più evidente: bottone nella
      barra strumenti, voce di menu del gioco, o macro nel pack).
- [x] **Separazione visiva delle tab della scheda** (S): Narrative / Combat / Conditions / Relics / Notes hanno
      poco stacco. Ritocco CSS alla `.icon-tabs` (bordo inferiore, divisori, tab attiva più marcata).
- [x] **Danno piatto nel dialog del danno** (S): `promptDamageMods` (`module/apps/roll-dialogs.mjs`) ha solo lo
      stepper "Bonus dice" e le spunte Vulnerable / Resistance / Weakened / Hatred. Aggiungere un campo "+N
      danno piatto" per casi come Harden del Clot (+2 per round).
- [x] **Spunte per tipo di danno nel dialog del danno** (S/M): Divine / Pierce / True Strike / Unerring come
      toggle, per i tratti tipo le benedizioni del Mendicant. Da decidere quali hanno effetto meccanico
      (Pierce e Divine cambiano come si applica armor/riduzioni, p.117) e quali restano promemoria sulla card.

**Medie**

- [x] **Prompt per l'AP non speso** (S/M): al level up, se il PG ha AP liberi da prima (tipico dopo il bonus di
      metà livello), avvisare nel dialog e proporre di spenderli lì. Il conteggio "AP N left" c'è già in
      `LevelUpDialog._onRender`; serve leggere anche l'avanzo precedente (`apTotal - apSpent` dalla scheda).
- [x] **Stance come i mark** (M): oggi la stance è un campo (`system.combat.stance`) con un marcatore sul token
      (`IconActor`), ma non si vede targettando un altro personaggio né sul pannello dell'abilità. Rifarla sul
      modello di `module/combat/marks.mjs`: chip sul pannello, riga nella tab Conditions, voce nell'HUD del
      token, e "stance attiva" visibile a chi targetta.
- [x] **Automazione Finishing Blow** (M): il blocco Finishing Blow (Vagabond) scatta se il bersaglio è bloodied
      (≤50% HP). Sulla card d'attacco il blocco è già lì ma spento/acceso a mano: si può accendere da solo
      leggendo gli HP del bersaglio al momento del tiro, come fa `_blockOn` con l'esito del d20.
- [x] **Aetherwall automatico** (M): tratto di classe Artillery (p.298) — "Gains resistance against all abilities
      from characters that are outside of range 2 from them (Cover halves ranged damage)". **Nota**: il manuale
      dà *resistance*, non cover. Si può applicare il dimezzamento da solo su Apply, come già fanno Cover e
      Resistance in `module/combat/defenses.mjs`, misurando la distanza attaccante → bersaglio.
- [x] **Summon trascinabili dalla scheda** (M): poter trascinare un summon dal pannello dell'abilità (o dalla
      tab Combat) sulla mappa per piazzare il token, se l'utente ha i permessi. Il pack `summons` ha già gli
      attori; serve un handler dragstart sulla scheda + drop sul canvas.
- [x] **Colori delle aure scegliibili** (M): le aure si somigliano troppo. Prompt/impostazione per il colore
      (per attore o per aura) nei template di `module/canvas/area-templates.mjs`. Edoardo usa il modulo "Grid
      Aware Auras" per questo.
- [x] **Scheda "clock"** (M/L): un tipo di attore (o journal) per gli orologi di campagna, visto che il modulo
      Lancer Clocks non funziona più dall'ultimo aggiornamento. ICON ha già i clock narrativi (burden/ambition)
      sulla scheda PG: si può riusare quel widget in un attore a sé, con condivisione in chat e permessi.

**Grandi**

- [x] **Infuse dei Wright** (L): implementare le versioni Infuse delle abilità (Infuse 1/2/3/X) con scalo
      automatico dell'Aether dal power die quando si usa quella versione; oggi il testo Infuse è solo un blocco
      stampato. Include: scelta della versione al tiro (come il combo token), tag/area della versione infusa
      (Tsunami → Stormlash, Cryo → CRYOTIC Line 8, Rime → DAGON range 6), e **override del piazzamento dei
      template** quando l'infuse cambia range/area (oggi `placeAreaTemplate` impone le regole di piazzamento e
      non c'è modo di forzarlo).
- [x] **Sistema "mazzo" del Seer** (L): il Seer non ha un mazzo di carte in mano — le sue abilità piazzano
      **Wild Card** sul campo (p.200): summon size 1 intangibili con un small blast inattivo che, toccato
      dall'area di un'abilità propria o di un alleato, esplode ed estende quell'area; le wild card si possono
      innescare a catena, e non estendono gli effetti persistenti (terreno). C'è anche la **Master Card**. Gli
      attori esistono già nel pack `summons`. Serve: piazzamento rapido dal pannello, conteggio delle carte
      attive, e il collegamento "area che tocca una carta → estendi l'area". Da leggere prima: pp.197-200.

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
      - [x] Invoke **Gambit** delle reliquie (Byrax II, Hermes, Sleipnir, Mistborn…): bottone "Invoke" sulla tab
            Relics con conteggio "usato questo combat" e card in chat; oggi si leggono solo. (M)
      - [x] Reliquie con effetti "a inizio/fine turno" (Apophis I, Erenbrass, Storm Lord I, Trollhide I/II,
            Mistborn III): promemoria in chat al cambio turno del tracker. (S/M)
      - [x] Tab Relics: elencare sotto ogni reliquia le abilità equipaggiate che tocca (inverso dei reminder). (S)
- [x] **Encounter Designer** (FATTA il 9 settembre 2026, Sessione 10): scegli i PG, budget suggerito, pesca da
      fazioni/roster, toggle elite. Finestra GM `module/apps/EncounterDesigner.mjs` (bottone "Encounter" nella
      sidebar Actors, macro, `game.icon.openEncounterDesigner()`): party → budget p.292 (+ one-fight rule,
      aggiustamento, cap di capitolo), roster filtrato (376 foe + 28 legend + foe del mondo), Elite/riserve/
      quantità, 🎲 Random fill, salvataggi, uscite 💬 chat / 📥 attori in cartella / 🗺 deploy token + combat con
      riserve nascoste e "Reveal reserves" dalla card.
      Emerso (da fare in un blocco futuro):
      - [x] **Titan Armament** dei Jotunn (p.448: +1 punto, +50% HP, un turno in più) come opzione per riga. (S)
      - [x] **Riserve automatiche**: a fine round 2/3 il tracker propone "Reveal reserves" (oggi solo dal bottone
            sulla card in chat). (S/M)
      - [ ] Deploy con "riusa gli attori del mondo" (oggi i foe presi dalla sorgente World vengono comunque
            copiati in un nuovo attore per corpo). Chiedere a Maar se serve. (S)
      - [x] Nilfling (Jotunn, Ch1 skirmisher 28 HP) non è Elite nel pack `foes` mentre gli altri Jotunn lo sono:
            verificato il 9 settembre 2026 (Sessione 13) sul manuale p.449 ("Thinblood: doesn't have the elite trait"): il pack è giusto.
      - [x] (FATTO il 13 ottobre 2026, 1.20.0, Sessione E) Token dei foe: tutto il pack usa `mystery-man.svg`; se Maar vuole icone per classe/fazione, serve una
            passata sul pack (`img` + `prototypeToken.texture`). (M, dati)
- [x] **Automazione effetti/save** offensiva (FATTA il 9 settembre 2026, Sessione 11): parser degli status
      inflitti dal testo (`module/combat/ability-statuses.mjs`), blocco "Inflict" con un bottone per status e
      per bersaglio sulle card d'attacco / auto-hit / 💬 (PG, Foe, Legend, Summon), save 1d20 10+ con boons/curses
      dal testo, Blessed, "Bloodied foes fail the save", "already rolled"; `applyStatus` / `applyHatred`, relay al GM
      via socket (`module/combat/inflict-status.mjs`). Versione 1.3.0.
      Emerso (da fare in un blocco futuro):
      - [x] Danni "on a failed save" ("must save or take 2[D]+fray, or [D]+fray on a successful save"): oggi solo
            il testo; collegare l'esito del save al dialog del danno (outcome "save failed / passed"). (M)
      - [x] Effetti non-status letti dal testo ("shoved 2", "unable to attack until the end of their next turn",
            "+1 curse on all attacks and saves"): promemoria sulla card o effetto generico con durata. (L)
      - [x] Falso positivo noto: Freelancer "Showdown" ("Choose a foe in range 3 and become immobile" = se stessi)
            mostra un bottone Immobile. Regola per l'imperativo senza soggetto. (S)
      - [x] Status positivi su di sé / alleati ("you gain evasion", "allies gain sturdy") come bottone "Gain" sulla
            card (versione difensiva del blocco Inflict). (M)
- [x] **Automazione difensiva** (prima versione FATTA il 9 settembre 2026, Sessione 12): `module/combat/defenses.mjs`.
      Evasion tirata da sola (1d6 per bersaglio con lo status, prima del d20, 4+ o 3+ con Rigoletto I (la reliquia dell'evasion: nel pack si chiama Rigoletto); blocco
      "Evasion" sulla card, "MISS — evaded", righe Inflict sbiadite, True Strike/Unerring la ignorano); Cover /
      Resistance dimezzano da soli su "Apply" leggendo gli status del bersaglio al momento (una volta sola, mai
      doppio con la casella del dialog); Dodge azzera il danno delle card Miss / Area; chip difensivi nei dialog e
      sulle righe della card del danno, promemoria per i trait NPC che citano evasion/dodge. Versione 1.4.0.
      Emerso (da fare in un blocco futuro):
      (Follow-up FATTI il 9 settembre 2026, Sessione 13 — vedi CHANGELOG 1.5.0.)
      - [x] Rigoletto III (tira l'evasion per gli alleati in raggio 2, solo con un 6) e Aspected ("this turn
            your evasion is always successful"): oggi solo la soglia 3+ del rango I. (S)
      - [x] Rigoletto II ("when you or an ally in range 2 successfully evades, deal 2 damage to the attacker"):
            promemoria sulla card quando un bersaglio con quella reliquia evade. (S)
      - [x] Dodge contro il danno "on a successful save": dipende dal collegamento save → dialog del danno (voce
            della Sessione 11). (M)
      - [x] Evasion/Dodge condizionali dei foe ("Has evasion while bloodied", "unless suffering from a status"):
            oggi solo un chip promemoria; si potrebbe accendere lo status da solo quando la condizione è vera. (M)
      - [x] Cover dalla mappa (token adiacente a un muro/oggetto alto 1+): oggi Cover è solo uno status messo a
            mano. (L)

---

## Note di setup (facoltative, una tantum)

- [x] Scrivere le convenzioni del progetto (Foundry v13 AppV2, CHANGELOG in italiano,
      dove stanno gli script di build dei pack, come si testa) → ogni sessione nuova parte informata.
