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
- [ ] **R23. Danno extra delle mastery** (M)
      Harvest: l'area della mastery si piazza, ma il danno della mastery non si tira facilmente (secondo bottone?).
      Draken Cross: i 2 danni divine della mastery non si tirano senza metterli nel danno dell'area.
      Commento di Turz Ven: "I think most issues of this variety can be solved by simply adding a 'Other' option onto
      the damage roller."
- [ ] **R24. Più istanze dello stesso danno nel damage roller** (M)
      Abilità che infliggono lo stesso danno più volte (per la sinergia con Vulnerable), es. Strongarm.
- [ ] **R25. Gamble cliccabile** (M)
      Bottone per il gamble sulle abilità che lo hanno (es. Riposte), con dadi da aggiungere o togliere al momento, e
      spazio per i tratti del Fool che fissano quei numeri. Commento di Turz Ven: "Remember that like armor/Vigilance,
      gamble only cares about the highest number rolled; so, 3d6kh1, not 3d6."
- [ ] **R26. [D] che mostra i dadi veri nelle card delle abilità** (M)
      Sulla scheda di un PG "2d10" invece di "2[D]"; resta [D] prima della scelta o fuori dalla scheda. Il damage
      roller lo fa già.
- [ ] **R27. "Damage Utility" sulla scheda PG** (M)
      La macro del danno anche in fondo alla scheda, come la finestra del danno standard ma più modulare.
- [ ] **R28. Combo alternativa data dalla mastery** (M)
      Felicity (scelta tra Fleet e Fantasia con un menù allo Show in Chat), God Hand, Justice, Rot (marcare per
      Regrowth invece che per Regenerate).
- [ ] **R29. Dervish: con la mastery, stampare in chat entrambi gli effetti** (S)
- [ ] **R30. Segno su un personaggio che non conta come mark** (M)
      Grand Banishment, The Tower ("probably just mark, renamed").
- [ ] **R31. Pubblicare in chat solo il trigger o la sotto-azione della mastery** (S/M)
      Symphony, Spirit Shrine.
- [ ] **R32. Dimensione dell'aura con +/-** (S/M)
      Gentleness: l'aura della mastery cresce; stessi controlli della larghezza della Line.
- [ ] **R33. Oggetti e segni piazzabili sulla mappa** (L/XL, da decidere)
      Symphony (motes, terrain effect), Fairy Ring (megamushroom della mastery), Comet ("thrown weapon"), Spirit
      Shrine (santuario con la sua aura), Gates of Hell (flash step della mastery), Eclipse (il singolo dangerous
      terrain dove cade la stella), Astra (medium blast messo sui foe), Polaris (uno spazio a terra), Blood Grove
      (disegnare più spazi per il Talent 2).
- [ ] **R34. Open the Gates riformattata** (S, da decidere: è il manuale a essere ambiguo)
      Proposta: l'ultimo effetto ("This attack gains +1 boon, cannot miss" ecc.) come "Special" davanti alle due
      versioni dell'attacco, come in Raging Wolf. Oggi sembra che dipenda dall'exceed.
- [ ] **R35. Righteous Disdain usabile dalle card del danno** (L, da decidere)
      Commento di Turz Ven: "If you don't have a clean way to implement this (and probably make it modular so other
      interrupts could do similar on damage cards as needed), then I wouldn't do it. Keep in mind there are weird
      interrupts like Dire Parry's mastery which lets it bank interrupt usages, or the ones from seer that wholly
      prevent damage."
- [ ] **R36. Carte del Seer** (XL, da decidere)
      "Currently practically nonfunctional": i tre mazzi (deck, mano, scarti) ci sono, ma le carte non hanno effetti e
      giocarle non scrive niente in chat. Maar non consiglia di legarle alla scheda; con il sistema di carte di
      Foundry servirebbero gli effetti sulle carte, la carta giocata in chat e i bersagli. "Probably a big ask in terms
      of workload."

### Emersi lavorando

- [ ] **Emerso lavorando su R8 — Helix Heel: regole nel testo di colore** (S, dati): stesso difetto di Massive Overhead.
      Nel libro (p.219, "Effect: Release a shockwave in a line 3 area effect, dealing 2 piercing damage to all foes.")
      la prima riga è un Effect, nel compendio è senza etichetta e diventa testo di colore. Pack + migrazione per nome.
- [ ] **Emerso lavorando su R8 — Boiling Blood: "Defy Death —" appeso al testo di colore** (S, dati): il testo di colore
      finisce con "Defy Death —" (nome dell'interrupt, libro p.138). Da controllare come viene mostrato e sistemare.
- [ ] **Emerso lavorando su R8 — Eye of the Storm: riga di regole senza etichetta** (S, dati): "This attack has no
      attack space. Instead, the attack space is clear and exempt from this area." è una regola ma il libro la stampa
      senza etichetta, quindi finisce nel testo di colore. Decidere come mostrarla (es. "Effect:").
- [ ] **Emerso lavorando su R1 — Incubus / Succubus** (S): "Instead of the mark, gain Effect: …" non toglie il Mark
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
- [ ] **Emerso lavorando su R16 — Fists of Heaven and Hell con i talenti** (S, dipende da R28): la combo alternativa
      della mastery di God Hand "gains all talent effects of this ability" (p.192), ma oggi non si può usare (R28).
      Quando R28 la renderà usabile, la sua card dell'attacco deve ricevere il talento come la base e Devil Hand
      (`talentAttackBlocks` in `ability-blocks.mjs`, usato in `IconSheet.mjs` prima di `combatRoll`).
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
- [ ] **Emerso lavorando su R19 — aure alternative nel testo non proposte** (S): la mastery Phantom Bolts di Warding
      Bolts ("hover around you as an Aura 2 instead") e l'Heroic di Rook ("increase aura to Aura 2") non compaiono
      tra le scelte del bottone area (`areasInText` non legge "aura N"). Non verificato in gioco.
- [ ] **Emerso lavorando su R19 — foe con tag "aura" senza numero** (S): Aura of Slaughter dei sei demoni (Armor,
      Gaping, Horn, Starving, Nail, Battle) ha il tag "aura" senza dimensione; le schede foe non passano da
      `resolveAbilityTags`, quindi probabilmente chiedono ancora la dimensione (proposta 3). Non verificato.

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
