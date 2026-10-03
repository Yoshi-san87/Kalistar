# Arsenal : 23 nouvelles armes

Lot du 3 octobre 2026, **local uniquement**, version du site conservee en 4.4.4.
Aucun commit, tag, push ou deploiement distant pour ce prototype de cartes.
Le catalogue contient maintenant 25 armes equipees, dont les deux originales.

## Objets et porteurs

Chaque objet a une illustration generee distincte, le meme objet dans son
medaillon anime, un recit lie au porteur et une activation lue par le moteur.
Les recits des collaborations sont des adaptations Kalistar, pas des citations
du lore officiel. Les representations ne sont pas des assets officiels extraits.

| ID | Objet | Porteur / Job | Bonus | Condition |
| --- | --- | --- | --- | --- |
| white-oath-rapier | La Promesse Blanche | Kaylis, version Epee courte | +20 ATK | Inferiorite numerique |
| brotherhood | Fraternite | Tidus | +20 DEF | Au plus 2 actifs |
| virtuous-contract | Virtuous Contract | 2B | +20 ATK | Inferiorite numerique |
| virtuous-treaty | Virtuous Treaty | 2B | +20 DEF | Au plus 2 actifs |
| socom | SOCOM | Solid Snake | +20 ATK | Reserve vide |
| lulu-mog | Poupee Mog | Lulu | +20 DEF | Au plus 2 actifs |
| leopard-lightning | La Griffe d'Orage | Rikka | +20 ATK | Inferiorite numerique |
| mythic-iron-gauntlet | Le Serment de Fer | Balmhyr | +25 DEF | Seul actif |
| post-bow | L'Arc des Dernieres Lettres | Cana | +20 DEF | Reserve vide |
| grimoire-weiss | Grimoire Weiss | Nier | +20 DEF | Au plus 2 actifs |
| gen-mechanical-arm | Le Bras qui Insiste | Gen | +20 ATK | Reserve vide |
| violet-reaping | La Faux du Siege Vacant | Voloden | +25 ATK | Seul actif |
| mantis-mask | Le Masque du Silence | Psycho Mantis | +20 DEF | Inferiorite numerique |
| revolver-gunblade | Revolver | Squall | +20 ATK | Au plus 2 actifs |
| wolf-steel | L'Acier du Loup | Geralt | +20 DEF | Inferiorite numerique |
| wolf-silver | L'Argent du Loup | Geralt | +20 ATK | Reserve vide |
| kaine-saw | La Lame de Kaine | Kaine | +20 ATK | Inferiorite numerique |
| buster-sword | Buster Sword | Cloud | +25 ATK | Seul actif |
| psg1 | PSG1 | Sniper Wolf | +20 ATK | Reserve vide |
| single-action-army | Single Action Army | Revolver Ocelot | +20 ATK | Inferiorite numerique |
| wardens-spear | La Veille des Remparts | GARDIEN / GARDIENNE | +15 DEF | Au plus 2 actifs |
| soldiers-blade | La Lame de Releve | SOLDAT | +15 ATK | Reserve vide |
| commanders-sabre | Le Fil du Ralliement | COMMANDANT / COMMANDANTE | +15 DEF | Inferiorite numerique |

Les affectations reelles utilisent les `characterId` stables et les valeurs
exactes de `job` du catalogue, jamais les noms affiches. Le masque, le livre,
la poupee et le bras utilisent le slot Arme existant ; aucun inventaire RPG
supplementaire n'est cree. Les deux lames de 2B et de Geralt sont des choix
alternatifs : une seule arme equipee, pas de double bonus. Idem Hache/Gant.

## Garde-fous de gameplay

- Un seul nouvel evaluateur declaratif `TEAM_STATE`, partage par tous les
  objets. Les predicates sont testes symetriquement pour les deux camps.
- +15 pour les Jobs, +20 pour les armes personnelles ordinaires, +25 pour
  les conditions de dernier survivant. Aucun +100, multiplicateur, jet force
  ou nouveau type de degat.
- Les effectifs du plateau excluent reserves et morts. La condition cesse
  immediatement quand les remplacements la rendent fausse.
- Bonus reels captures au verrouillage et expliques par les recaps/journaux.
  Les faces Mort, Esquive, Retry et autres effets speciaux restent inchangees.
- La famille imprimee reste la source des matchups, jamais celle de l'objet.
- Le cadeau de Momo ne s'additionne pas a une arme DEF : seul le plus fort
  est retenu. Le cadeau garde sa consommation normale au prochain duel.
- Aucun changement de schema. Les matchs gardent leurs definitions copiees,
  les anciens snapshots et les anciens visuels demeurent compatibles.

Ces limites et tests evitent les regressions identifiees, mais ne constituent
pas une preuve de parite competitive. Mesurer les parties jouees avant une
future retouche des valeurs, sans changer retroactivement un match commence.

## Kaylis

La carte `49055457` (L'Elan des Couleurs) passe de Katana a Epee courte dans
son profil, son PNG ET son PSD. L'autre Kaylis, Dague, reste intacte.
La rapiere offerte par Balmhyr n'est compatible qu'avec la version Epee courte.
Voir [la preuve native](../2026-10-03-kaylis-short-sword/README.md).

## Images et industrialisation

23 PNG transparents generes avec l'outil d'image integre. Lames et manches
droits, objets entiers avec marge, reduction/diagonale plutot que deformation.
Le fouet garde sa souplesse naturelle ; arc et faux conservent leur geometrie.
Les originaux ne sont ni redessines dans le CSS, ni incrustes dans les PNG
des personnages. Les deux premieres illustrations d'armes sont conservees.

- Sources : `V4/weapon-cards/sources/<id>-v1.png`.
- Prompts exacts : `V4/weapon-cards/arsenal-2026-10-03-prompts.json`.
- Hashes et derives : `V4/weapon-cards/media-provenance.json`.
- Grandes illustrations : `V4/site/assets/weapon-cards/<id>-v1.webp`.
- Objets du medaillon : `V4/site/assets/equipment/<id>-v1.webp`.
- 25 cartes exportees : `V4/weapon-cards/exports/`, PNG 1400 x 1000 / 400 ppp.

Le master commun reste `site/weapon-cards.js` + CSS. Chaque definition contient
ses metadonnees `collectible`. Les textes sont vivants et controles a toutes
les tailles ; les six colonnes desktop emploient de vraies armes. Les noms
longs restent consultables dans la fiche et les textes accessibles.
L'anneau et le radar restent independants du dessin, avec Reduced Motion.
Les petites notes de soutien sont limitees a la famille Instrument.

Procedures d'ajout : [schema des armes](../../docs/ARMES_EQUIPEES.md) et
[workflow du master](../../weapon-cards/README.md).

## Validation

- 30 tests du nouveau lot : 23 activations sur les deux camps, formules,
  journaux, desactivations, cadeaux non cumulables, alternatives, contours
  alpha/hashes, et 23 parties completes avec restauration a chaque etape.
- Tests historiques equipement/presentation, Kalistel, medailles et composition
  passes (64 tests au total dans ce groupe, nouveau lot compris).
- `weapon-cards.browser.test.cjs` : 37 controles, toutes les cartes aux
  largeurs 1920/1440/1280/1024/412/320 et en export 1400 x 1000. Textes dans
  leurs zones, aucun debordement horizontal, cercle rond et ancrage conserve.
- `weapons-arsenal.browser.test.cjs` : 52 parcours desktop/Razr, equipement
  des 23 nouveaux objets avec remplacement et reload, vrais calculs en arene
  de la rapiere, Fraternite et du Bras qui Insiste.
- `weapons.browser.test.cjs` : parcours historique complet passe, incluant
  les vrais soutiens Momo, les deux camps, inspection deck/arene, zoom,
  resize, anciennes bases, import/export, Reduced Motion et nettoyage.
- Le meme parcours complet passe egalement contre le paquet statique construit
  (`KALISTAR_BUILT_SITE=1`), sans serveur de production ni appel externe.
- Verification finale des references protegees et du manifest de composants :
  aucune difference, aucun verrou reecrit.
- Build statique local : 193 personnages, 564 fichiers, 480,9 Mio environ.
  Il ne constitue PAS une publication du site.

Captures inspectees : `qa/`, `combat-qa/`, `new-weapons-qa/`. Le parcours du
paquet statique est conserve dans `pages-qa/`. Tous les profils navigateur
sont jetables/isoles ; aucun equipement du joueur n'est attribue d'office.

Deux controles transverses non modifies echouent encore et ne sont pas
comptes comme passes :

- `catalogue-evolution.test.cjs:19` suppose que Voloden est le seul ajout
  approuve depuis septembre, alors que le registre a douze ajouts. Les
  references et ce test n'ont pas ete modifies dans ce lot.
- `career-statistics.test.cjs:68` : tous les indicateurs ne tiennent pas sans
  scroll dans le manuscrit desktop. Les calculs de carriere passent ; la
  presentation du carnet, ses CSS et ce test n'ont pas ete modifies ici.

Ces attentes/rapports n'ont pas ete reecrits pour masquer les echecs.

## References de noms

Les appellations usuelles ont ete verifiees avant de nommer les adaptations :

- [Brotherhood / Tidus, Square Enix](https://na.finalfantasy.com/topics/539)
- [Les lames de 2B, Bandai Namco](https://en.bandainamcoent.eu/soulcalibur/news/2b-nier-automata-brings-her-blades-soulcalibur-vi)
- [Buster Sword, Final Fantasy VII Rebirth](https://www.square-enix.com/ffvii/en-us/games/rebirth/battle/)
- [Revolver, Square Enix](https://na.finalfantasyxiv.com/lodestone/playguide/db/item/06dabd956b9/)
- [Grimoire Weiss, Square Enix](https://www.square-enix-games.com/en_US/documents/nier-replicant-ver-1-22474487139-grimoire-weiss-giveaway)
- [La poupee Mog de Lulu, Square Enix](https://eu.finalfantasy.com/topics/507)
- [SOCOM et PSG1, archives Konami](https://www.konami.com/mg/archive/integral/vr/index.html)

Les noms generiques des deux lames de Geralt et de la lame de Kaine sont
volontaires : ne pas inventer de nom canonique unique. Le Single Action Army
reprend l'arme explicitement demandee. Les autres titres et courts recits
sont des creations pour Kalistar.
