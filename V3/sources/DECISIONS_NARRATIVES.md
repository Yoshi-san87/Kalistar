# Repertoire V3 : decisions et rapport

## Livraison du repertoire

- 41 cartes, IDs 30000001 a 30000041, 40 characterId stables ; Momo seul a deux versions.
- Les 15 identites distinctes V2 sont conservees, Belrog compris : 16 cartes conservees, dont Kaylis et Julienne a redessiner.
- 25 nouvelles identites : quatre substitutions aux emplacements 15, 16, 17 et 20, puis 21 emplacements additionnels.
- Capacites : huit P1, huit P2, huit P3, neuf P4, huit P5. Huit tanks et quatre supports portent Garde ; six supports peuvent attribuer Reraise. Aucun bouclier special en DEF.
- 16 arenes : douze cristaux, z13, trone-fer, astraball, ruins neutre.
- Cinq decks de dix cartes, tous capables d une formation complete, couvrant les 41 cartes.
- Les six JSON sont produits par `V3/scripts/build_repertoire.cjs`. `--check` verifie leur reproductibilite sans ecriture. Ne pas regenerer apres une modification directe d integration sans reporter celle-ci dans le generateur.

## Sources et priorites

1. Instruction utilisateur et `V3/CONTRAT_V3.md` pour les choix V3 explicites.
2. DOCX extraits dans `V3/sources/sources-extraites.json` et `histoire.txt` pour les scenes, la chronologie et les descriptions.
3. Classeur Kalistar, feuilles Personnages, Capacite base, Capacite Speciale, Armes / Armes V2 et couleurs de cellules.
4. Donnees V2 pour la continuite des identites, des armes, des factions et des scenes originales deja retenues.
5. Creation V3 identifiee comme telle pour les blancs du canon. Le Guide complet est un document de monde prospectif, pas une preuve que chaque aventure annoncee a deja eu lieu.

Les deux copies de classeur extraites sont consultees. Les couleurs sont indispensables : rouge `FFE6B8AF` transforme le 50 affiche en -50 ; vert `FFB6D7A8` donne +50. Les zeros et diagonales X donnent 0. Les 400 cases sont comparees aux deux feuilles dans les deux classeurs : aucune modification de la matrice V2 ni des indices 00..19. Les vingt armes sont representees dans le roster.

## Canon des personnages prioritaires

- Kaylis : humaine, Rainbow deja eveille pendant l evasion, et non NONE. Le Reveil V2 decrit ses tatouages lumineux avant l evasion et la lame de Xiaomi brisee par son bras au chapitre 5. Version unique V3 : evasion de la Z13, avant le trone. Beaute, jeune adulte de 23 ans, metissage indien/antillais, morphologie athletique et tenue noire de mine suivent la direction utilisateur ; ces precisions ne sont pas attribuees abusivement au manuscrit. Reraise reste une abstraction de jeu de soutien, pas une resurrection de Lanio dans cette scene.
- Lanio : HUMAIN blond, souriant, sportif ; il joue chez les Rhinoz, il ne devient pas un Rhinoz. Chapitres 10-12 et Le Reveil V2 chapitre 1. Cristal NONE, aucune magie ni barriere. Sa lance double-lame est la categorie Lance ; elle reste hors du terrain dans le prompt.
- Malaba / Baba : une identite `malaba`, alias Baba. Homme massif et bienveillant, scene au comptoir de La Gueule Fumante au debut du recit, sans cristal. Le geste de partage au comptoir est une vignette nouvelle fidele a son caractere, pas une citation d action litterale.
- Gen : CYBORG pour sa prothese technique, sans affirmer une transfusion deja realisee. Jeune homme mince et petit, cheveux noirs avec meche verte, bras GAUCHE partiellement mecanique. Reparation d atelier situee avant la fusion Electro du chapitre 4. NONE, sentry=false, attaques de distance physiques. Arme technique Bracchium rattachee a la categorie existante Projectile, sans nouvelle mecanique.
- Julienne : SIRENA / HYDRO / Thalassea conservee ; sauvetage par arche d eau maintenu comme scene originale V2, pas comme episode retrouve dans les DOCX. Anatomie humanoide a deux jambes pour la direction V3, sans ajouter une seconde version.
- Momo et Taulio : ROBOT / Chroma conserve malgre Metal Haven dans Personnages et Voltania dans le guide. Confirmation utilisateur V2 prioritaire. Deux scenes pour Momo seulement.
- Balmhyr : nom normalise malgre les variantes Balhmyr ; mentor et exil du recit conserves. Lok reste P2, mais le profil de tank recopie du classeur est reequilibre. Sa scene ouvriere V2 reste une vignette inventee, pas un acte canonique attribue au roi despote.
- Belrog est bien maintenu. La relation Nazar fils de Belrog est presente au chapitre 10 ; sa vignette du signal du col vient de V2, pas d une scene du manuscrit.

Le boolean `sentry` est une convention mecanique V3 : possession d un cristal actif dans la version illustree. Il n arbitre pas l identite metaphysique que Kaylis revendique ou refuse dans les dialogues.

## Les 25 identites nouvelles

Les slugs complets, prompts, actions et chemins sont dans `registre_personnages.json.imageAssignments`.

| ID final | Identite | Ancrage canon / creation |
| --- | --- | --- |
| 15 | Scrow | Personnages 25 : nom, Korbow, AERO, Arc et distance ; Nestown et hesitation inventes. Remplace Cana bis. |
| 16 | Neris | Identite et scene nouvelles ; humaine soigneuse de Niveria. Remplace Malinia bis. |
| 17 | Iliane | Identite et scene nouvelles ; Aurelion archiviste de Solaria. Remplace Aelis bis. |
| 20 | Seraphina | Personnages 44 : nom et HEMATO ; Vamp, Draevenheim et mediation inventes. Remplace Verminia bis. |
| 21 | Lanio | Classeur 11 et recit ; details ci-dessus. |
| 22 | Malaba | Classeur 12 et recit ; details ci-dessus. |
| 23 | Gen | Classeur 15 et recit ; details ci-dessus. |
| 24 | Magnar | Classeur 6 : Golem, MINERO, Durane, tank ; gardien de galerie du chapitre 5. |
| 25 | Kognus | Classeur 7 et recit : nain, dague et Z13 ; NONE prudent faute de cristal personnel atteste. Vignette des cles inventee. |
| 26 | Reevus | Classeur 8 et chapitre 7 ; alias Revuus du chapitre 1. NONE prudent. Registre des absents et Fleau inventes. |
| 27 | Xiaomi | Classeur 9 et chapitre 5 : katana, precision, lame brisee ; humaine et NONE choisis sans transfusion attestee. |
| 28 | Voloden | Classeur 10 : Cardemortis, NECRO, faux, DPS physique ; aspect et retour au Conseil du recit. Faux rattachee a l indice Faucille 19. |
| 29 | Thanor | Classeur 20 : Drax, PYRO, Vulkar, DPS ; scene de forge inventee. Le titre ambigu Roi Dragon n impose pas un nouveau souverain global. |
| 30 | Daruk | Classeur 33 : Drax, PYRO, Vulkar, tank ; vanne et hache inventees. |
| 31 | Polux | Classeur 34 : Felineus, PYRO, healer P5, coeur ; Vulkar, dispensaire et details de lynx inventes. |
| 32 | Jelly-Joe | Classeur 30 : Tantalak, ELECTRO, Crabazar, Lance, support ; quai invente. Tentalak est une variante de la table des hybrides, pas une nouvelle race. |
| 33 | Bloom | Classeur 42 : Toxinar, HERBO ; botaniste d Arborium et scene inventes. |
| 34 | Valazar | Classeur 45 : Skullz, NECRO, Cryptown, P4 et Mort ; scene de cendre et sceptre inventes. |
| 35 | Capitaine Skully | Classeur 47 : Skullz, NECRO, Cryptown ; contradiction Middle / position 2 tranchee P3. Scene de quai inventee. |
| 36 | Elenion | Classeur 48 : Cerelf, Terre, Woodland, Middle ; GEO conserve malgre HERBO generique des Cerelf. Scene et arme inventees. |
| 37 | Yvar | Classeur 4, chapitres 10/15 : Rhinoz de Zarok, fils de Koronak, lance et infiltration ; GEO et instant de reconnaissance proposes. |
| 38 | Gilmarr | Classeur 3 et chapitre 11 : habitant de Zarok, rencontre sportive ; specialisation pilier et AERO inventees. Le Sentry aerien anonyme du match n est pas explicitement Gilmarr. |
| 39 | Ruby | Pull1 Carte A85/AA85 : nom, HYDRO et Sirenas ; Thalassea, cartographie et instrument Gun inventes. |
| 40 | Soryn | Identite et scene nouvelles ; Falco accordeur de Nestown. |
| 41 | Thalie | Identite et scene nouvelles ; Carnivert herboriste d Arborium. |

Reemploi des factions existantes partout sauf Woodland, deja nommee pour Elenion dans le classeur, et Crabazar, deja presente dans les sources et les assets V2. Races supplementaires issues des sources : KORBOW, CYBORG, GOLEM, CARDEMORTIS, FELINEUS, TANTALAK, TOXINAR, CERELF. Aucun nouvel asset cree dans le chantier repertoire. Pas de personnage ni de cristal Chaos.

## Equilibrage

Chaque face numerique respecte les bornes minimum/maximum de Capacite base pour le role principal. Les valeurs originales ne sont pas recopiees aveuglement : notamment Balmhyr, Lok et Belrog sont normalises. Momo original conserve ses douze valeurs/signatures compatibles P3 ; sa seconde version est P4. Les deux restent compatibles P3/P4 sans bonus automatique de position. Scrow et Gen sont P4 de distance physique selon Personnages, exception explicite a l etiquette generique DPS magique.

Les cellules L4 et L6, maximum DEF sur le de 5 des P2/P4, indiquent 50 alors que leur minimum est 120 et que la progression des autres faces est 180/120/90/60/30. Correction V3 documentee : maximum 150, sans toucher le classeur ni V2.

| Poste | Cartes | Contribution numerique ATK par lancer | Contribution numerique DEF par lancer | Garde | Reraise |
| --- | --- | --- | --- | --- | --- |
| P1 | 8 | 103.77 | 168.04 | 8 | 0 |
| P2 | 8 | 157.81 | 92.04 | 0 | 0 |
| P3 | 8 | 123.56 | 121.23 | 0 | 0 |
| P4 | 9 | 158.54 | 98.04 | 0 | 0 |
| P5 | 8 | 82.98 | 114.75 | 4 | 6 |

La contribution est la somme des seules valeurs numeriques divisee par six et par le nombre de cartes. Elle ne mesure PAS la valeur totale d une capacite et ne transforme jamais une face speciale en score zero de duel. L equilibrage valide les enveloppes et la repartition des fonctions ; aucun taux de victoire ni simulation moteur n est revendique.

- Garde seulement ATK, tous P1 plus Julienne, Kaylis, Seraphina et Jelly-Joe en P5. Ward=60, allie vivant dont auteur, prochaine DEF numerique physique seulement ; Magie, Esquive et Mort ne consomment pas. Mort contourne ; relances du meme duel conservent le +60 deja applique.
- Reraise seulement Julienne, Aelis, Kaylis, Neris, Polux, Thalie, tous canHeal/P5. Trait preventif sur vivant, aucun retour du cimetiere.
- Potion surtout supports/casters ; trefle pour profils agiles ou soutien ; buff physique pour protecteurs et Reevus. Mort reste specialisee chez Zviri, Voloden et Valazar.
- NONE pour Lanio, Baba, Gen, Kognus, Reevus, Xiaomi : aucune face magique, aucune barriere. Cristal classique contre NONE +20, Rainbow +30, retour NONE 0.
- Cycles V2 inchanges, Rainbow/classique +40/-40. Exception elementaire originale Taulio +40/-20 conservee sur les cycles classiques ; elle ne modifie pas le +20 fixe contre NONE.
- Un seul trait actif ; tout remplacement de trait supprime le precedent. Synergies et lieu restent des modificateurs distincts.

## Arenes et production

Chaque entree de `arenes.json` contient les champs contractuels, `story_scene`, `prompt`, `narrative_status`, `source_history` et `production`. Les references ciblent un DOCX et des lignes/ancres verifiees dans histoire.txt. Les architectures du guide sont adaptees aux noms de villes conserves dans V2 : aucun renommage retroactif des factions.

Douze lieux elementaires donnent +15 ATK au cristal correspondant. Affinite par characterId : +10 ATK/+10 DEF, donc meme affinite pour les deux Momo. Plafond +25/+10, symetrique, numerique seulement, verrouillage apres setup. `element:null` pour z13, trone-fer, astraball, ruins ; NONE n est jamais un cristal d arene.

Le Temple Rainbow et son affinite Kaylis sont symboliques/inventes, sans affirmer sa presence au Temple durant l evasion. Les plateformes exactes, la serre, le quai et les accessoires de decor sont des compositions originales explicites. Trone de Fer signifie la salle du Conseil des Zones de Durane, pas un trone de lames d une autre oeuvre : douze sieges, estrade circulaire, acier poli, pupitre technique.

Astraball : chapitre 11, panier en forme de U INVERSE, pas anneau rond de basket ni cage de football. Meneur ne marque pas ; scoreur ne recule pas en defense, points doubles ; middle peut aller partout mais ne dribble/avance pas avec la balle ; pilier reste dans sa zone ; Sentry polyvalent selon regles regionales. Nombre de paniers, dimensions et marquages ne sont pas fixes dans ce passage : la composition visuelle les extrapole sans ajouter une regle de jeu. Ne pas confondre poste de carte et poste sportif du personnage.

Perimetre de production autorise apres ce rapport : 14 nouvelles images distinctes (12 elements + trone-fer + astraball), une invocation built-in imagegen par asset, PNG originaux V3/assets/arenas et WebP qualite 92 sous V3/site/assets/arenas. `z13` appartient au parent et ne doit pas etre modifie. `ruins` est repris de V3/site/assets/arena.webp, sans nouvelle generation ; son prompt est une description de reference neutre et non un ordre de regenerer. Progression/provenance dans generation_arenas_manifest.json.

## Verification du repertoire

Commande validee sous Windows : `node --test --test-isolation=none V3/scripts/testsrepertoire.test.cjs`.

12 tests passes : IDs/deduplication, schema, toutes bornes de faces, restrictions des capacites, scenes prioritaires/NONE, cycles, matrice armes couleur, cinq formations/decks et couverture, contrats/bonus des arenes, ancres documentaires, manifeste de 14 copies/2 redraw/25 creations, reproductibilite sans ecriture.

Le mode sans isolation evite une restriction Windows `spawn EPERM` du lanceur de tests ; la verification du generateur s execute en VM avec ecritures interdites. Aucun test moteur/UI ni export Photoshop effectue par le chantier repertoire. V2, sources main, moteur, interface et assets restent intacts a la cloture de cette phase.

## Livraison des arenes raster

Production terminee : aero, hydro, electro, pyro, cryo, luxo, minero, herbo, hemato, necro, geo, rainbow, trone-fer, astraball. Quatorze generations built-in distinctes, puis une retouche ciblee de Hemato pour retirer une petite signature generee dans un coin ; les deux appels et leurs sources sont traces dans le manifeste. Aucune image de remplacement factice.

- Originaux selectionnes : `V3/assets/arenas/<id>.png`, 1672 x 941 pixels natifs. Le prompt demandait 2560 x 1440 ou plus si disponible ; l outil a livre 1672 x 941, conserves sans agrandissement artificiel. Ratio a moins de 0.1 % du 16:9.
- Exports : `V3/site/assets/arenas/<id>.webp`, Sharp qualite 92, resolution conservee.
- Ruins : copie octet pour octet de `V3/site/assets/arena.webp` vers `V3/site/assets/arenas/ruins.webp`.
- Z13 : fichiers du parent non modifies, SHA-256 verifies avant/apres la production.
- Les deux Momo, Taulio, Zviri, Aelis et Cana sont intacts : les six sources V2 et destinations V3 sont comparees aux empreintes de `illustrations_verrouillees.json`. Aucun de ces fichiers n a ete regenere ni retouche.
- Manifeste : `V3/donnees/generation_arenas_manifest.json`, prompt exact, histoire ciblee, source generee effective, dimensions, tailles, empreintes et revue visuelle par image.
- Controle final : `node V3/scripts/arenas_production.cjs verify` verifie quatorze fichiers originaux uniques, les quatorze exports, leur ratio, leur contenu non uniforme, les assets Z13 proteges et la copie neutre. Les 12 tests du repertoire repassent apres production.

La validation de lecture du sol et des architectures est visuelle ; l integration reelle des cartes superposees et les exports Photoshop appartiennent au chantier parent.
