# Reliques ultimes

## Gant de Fer de Balmhyr

`mythic-iron-gauntlet` est une relique dans les nouvelles parties. Condition
`ULTIMATE / SURVIVED / outnumbered`, action `ARM / ATK / 40 / self`, duree
`ONCE_MATCH` : apres survie d'une attaque en inferiorite numerique, le prochain
jet ATK numerique conserve recoit +40. Le moteur declaratif existant gere la
charge et son expiration, sans changement des des ni de la famille imprimee.
Toutes les versions de Balmhyr sont compatibles. La Hache reste une arme
reservee a ses versions Hache. Les snapshots historiques gardent le Gant arme.
La reconciliation des profils n'ecrase jamais une relique deja equipee.

Decision utilisateur du 12 octobre 2026. Le premier lot concerne la Boite des
Petits Bonheurs, la Materia blanche et le Pod 042. Ses regles et sa documentation
historique sont conservees ci-dessous. L'extension aux 32 autres reliques est
decrite dans la section "Extension declarative". Les cartes imprimees, les
faces, les synergies et les trois emplacements ne changent pas.

## Regles

- Boite des Petits Bonheurs : le plateau du porteur comporte moins de combattants que le plateau
  adverse au verrouillage du duel. Une attaque hostile numerique ou Mort
  effectivement conservee distribue un trefle a chaque AUTRE allie actif
  sans trefle. Distribution avant la defense, meme si Momo meurt ensuite.
  Reserve exclue, pas de cumul ou rafraichissement. Une seule distribution
  par partie ; aucune consommation si personne ne peut recevoir le don.
- Materia blanche : meme inferiorite AVANT le duel. Aeris doit etre la cible
  et mourir definitivement. Son propre Reraise empeche cette activation.
  Apres le resultat, choisir un autre allie actif sans coeur. Le moteur bloque
  Tour suivant et les remplacements tant que ce choix existe. Aucun retour
  d'une carte morte, aucun coeur empile, aucun choix si aucune cible admissible.
- Pod 042 : survivre a une attaque numerique ennemie ayant au moins un
  modificateur positif arme, cristal, faction ou arene. La menace est figee
  a l'acceptation du jet. Esquive ou Reraise peuvent assurer la survie ; Mort
  ne prepare jamais le Pod. Ni ATK imprimee, ni jeton, capitaine, ni equipement
  ne qualifie seul cette condition. Le premier attaquant est memorise par UID.
  La prochaine ATK numerique conservee contre LUI gagne +60 ATK additifs.
  Le bonus reste identique durant les relances DEF de ce duel. Il est depense
  meme si la cible esquive. Autre cible, soutien, Mort ou jet abandonne ne le
  consomment pas. Mort definitive de la cible : occasion perdue, aucun transfert
  sur un renfort. Le Reraise adverse conserve la cible. Une seule riposte.

Les medaillons distinguent preparation et effet. Le Pod prepare n'ajoute pas
encore +60 au score ; seul le prochain assaut admissible l'utilise. La force
du +60 se cumule avec les bonus ordinaires, sans les multiplier.

## Donnees Et Sauvegardes

Les definitions modernes dans `site/weapons.js` utilisent :

```js
{trigger:'OUTNUMBERED_GIFT', event:'TARGETED', trait:'luck',
 recipient:'allies', duration:'ONCE_MATCH'}
{trigger:'OUTNUMBERED_GIFT', event:'ELIMINATED', trait:'reraise',
 recipient:'choice', duration:'ONCE_MATCH'}
{trigger:'TACTICAL_REPRISAL', stat:'ATK', value:60,
 duration:'NEXT_TARGET_ATTACK', advantages:['weapon','element','faction','arenaAttack']}
```

La logique pure vit dans `site/relic-ultimates.js`, appelee par `equipment.js`
et `engine.js`. Les traits n'ont PAS de faux bonus numerique stat/value.
L'exception +60 est limitee au trigger de riposte valide ; les autres bonus
d'equipement gardent leurs bornes existantes.

`equipment.ultimates.records` conserve une ligne par porteur : sourceUid,
weaponId, round, status, puis contexte/grants ou cible/menace selon le type.
Les UIDs de partie distinguent les exemplaires et survivent a la mort.
Les donnees supplementaires sont validees a la restauration. Aucun nouveau
store IndexedDB ni nouvelle edition/schema de sauvegarde n'est necessaire.

Les anciennes definitions figees dans les parties version 1 OU version 2
conservent les anciennes regles (+30 DEF Flute, +20 DEF Pod/Materia).
Le catalogue historique et ses empreintes ne sont pas modifies. Equiper un
objet dans le profil ne reecrit jamais les definitions d'un match commence.

## Correction De Momo

L'utilisateur a corrige l'attribution apres la 4.6.24 : la Flute est son arme,
pas sa relique. La Flute (`little-joys-flute`) utilise desormais la regle commune
des armes, +30 ATK sur un 6 numerique conserve. La Boite existante
(`little-joys-box`) recoit exactement l'ultime de trefles decrit ci-dessus,
a la place de son ancien +20 DEF apres perte alliee. Les deux sont equipables
simultanement ; effets, consommations et sources statistiques restent distincts.

Les anciens profils/decks migrent la Flute de `relic` vers `weapon`, sans
equiper d'office la Boite ni toucher une protection. Les anciennes parties
gardent leurs snapshots : y compris la Flute-ultime 4.6.24, la Flute de soutien
plus ancienne et la Boite +20 DEF. Aucun etat temporaire n'est transfere.

## Statistiques Et Presentation

Les vrais dons sont inscrits dans `duel.relicGrants`, puis dans l'unique
evenement de performance de cet echange. Ils incrementent soutien, soutien
allie et trefle/coeur du DONNEUR, pas de l'attaquant adverse. Les traitSources
conservent ce donneur. Une utilisation ulterieure du trefle ou du Reraise
credite le donneur original, y compris Aeris/Momo morts. Ni une relance,
ni un reload, ni une lecture des statistiques ne recompte ces dons.

`duel.relicEvents` fournit les transitions visuelles luck/reraise/mark/riposte/
sacrifice. Le rendu compare avant/apres ; une reprise affiche l'etat sans
rejouer la cinematique. Animation et selection sont distinctes : fermer ou
interrompre une animation ne doit pas inventer de don. Reduced Motion,
navigation, resize et pagehide nettoient les elements temporaires.

## Verification

Tests moteur : `site/relic-ultimates.test.cjs`, plus les regressions equipements,
performance, bilan et fin de partie. Les fixtures synthetiques de tests sont
isolees ; elles ne modifient jamais le catalogue publie. Tests navigateur et
captures dans la revision `revisions/2026-10-12-relic-ultimates/`.

Le +60 est une valeur de depart explicite, pas une preuve d'equilibrage parfait.
Surveiller surtout les cumuls arme + jeton et la frequence des ripostes utiles.

## Extension declarative : 32 reliques

`site/ultimate-definitions.js` exporte un objet UMD `KalistarUltimateDefinitions`
indexe exclusivement par les IDs d'equipement existants. Chaque entree contient
`effect` et `condition`, sans redefinir nom, lore, restrictions, famille ou
visuels. `site/weapons.js` fusionne ces champs AVANT le gel du catalogue courant,
APRES la capture de `legacyWeapons`. Les trois ultimes historiques ne figurent
pas dans ce module et ne sont pas modifies.

Le chargement navigateur doit placer `ultimate-definitions.js` avant
`weapons.js`. CommonJS charge directement cette dependance. Le module n'importe
ni moteur ni DOM et n'ajoute ni mecanique Job ni stockage. Les objets et leurs
tableaux imbriques sont geles. Les conditions en francais donnent aussi l'effet
et l'usage unique ; le rendu n'a pas a deduire une regle d'un nom affiche.

`site/ultimate-runtime.js` interprete ces definitions sans DOM. Il est charge
avant `equipment.js`, qui l'expose via `Equipment.rituals`. Les branchements
dans `engine.js` appellent `lock`, `accepted`, `numeric`, `insufficient`, `after`
et `deployed` aux moments decrits ci-dessous. `equipmentChoice` et
`grantEquipment` servent aux choix de cible, de trait ou de parite, sans ajouter
une phase au moteur. Les documents joueurs sont ensuite regeneres par
`node V4/site/rules-documents.cjs` ; les tests Library comparent le texte et
les empreintes des sources, mais ne remplacent pas les tests de combat.

### Contrat des effets

```js
{
  trigger: 'ULTIMATE',
  duration: 'ONCE_MATCH',
  event: 'SUPPORT',
  count: 2,
  distinct: true,
  traits: ['ward', 'reraise'],
  action: {kind: 'GRANT', traits: ['reraise'], target: 'chooseAllies'}
}
```

- `count` vaut 1 par defaut, ou explicitement 1 ou 2. `distinct:true` compte
  des beneficiaires differents par UID de partie, pas des noms ou des versions.
- `traits` au niveau de l'effet filtre les soutiens qui PREPARENT l'ultime.
  `action.traits` decrit au contraire les dons PRODUITS. Ce ne sont pas des
  conditions alternatives a la compatibilite existante du porteur.
- `when` combine ses contraintes par ET : `outnumbered:true`, `activeAtMost:2`,
  `magic:true|false`, `elementPositive:true`, `elementNegative:true`.
  Les signes portent sur le modificateur de cristal du veritable attaquant.
  Une attaque physique n'est jamais synonyme de Mort ou d'une face soutien.
- `GRANT` utilise les cinq traits natifs. `chooseAllies` exclut le porteur et
  propose un autre allie actif par defaut, jusqu'a deux avec `max:2`.
  `selfAndAlly` couvre le porteur et son dernier compagnon, deux au maximum ;
  seul, le porteur reste admissible. `recipient` conserve le beneficiaire reel
  de l'evenement ; `self` designe le porteur ; `nextAlly` attend un renfort.
- `chooseTrait:true` est reserve ici au Log Pose : choisir UNE des categories
  absentes parmi Potion et Puissance, jamais distribuer les deux.
- `ARM` prepare un bonus de 40, 50 ou 60 sur `ATK`, `DEF` ou `DUEL` pour `self`
  ou `nextAlly`. `DUEL` consomme la charge sur la premiere ATK conservee OU DEF
  chiffree admissible, selon celle qui arrive en premier, pas une fois chacune.
  `against:'killer'|'attacker'` lie la charge a l'UID ennemi memorise.
  Le filtre optionnel `magic:true` dans l'action restreint l'usage a la magie.
- `BONUS` applique +60 ATK ou DEF au duel admissible courant. Pour
  `ALLY_TARGETED`, la DEF appartient a l'allie attaque, jamais a la porteuse.
- `MITIGATE` ne produit pas un +40/+60 forfaitaire. `direction:'penalty'`
  annule au plus 40 du malus `element` de l'attaquant. `direction:'advantage'`
  neutralise au plus 60 au TOTAL parmi les composantes positives adverses
  `weapon`, `element`, `faction`, `arenaAttack`. Ni face imprimee, jeton,
  capitaine, equipement ni barriere ne font partie de cette liste.
- `DEBUFF` fait choisir un ennemi actif : -40 a sa prochaine ATK chiffree
  conservee, sans vol de tour ni application a Mort.
- `COIN` produit un unique tirage sauvegarde : pile +60 ATK au duel courant,
  face Garde personnelle si absente. Une Garde deja presente n'est pas renouvelee
  et ne permet pas de relancer la piece ; ce resultat reste celui de la tentative.
- `PREDICT` prepare une prediction pair/impair. Le choix est fait quand le
  porteur est cible, AVANT le premier de ATK ennemi. La parite est celle du de
  finalement conserve (1 a 6), pas celle du score ATK. Une bonne prediction
  donne +50 DEF seulement contre une attaque chiffree. Tentative depensee
  meme si la parite est fausse ou si la face finale est speciale.

### Semantique des evenements

| Evenement | Ce qui compte |
| --- | --- |
| `SUPPORT` | Don nouveau du porteur a un AUTRE allie actif. Un auto-buff, une reception ou un rafraichissement ne compte pas. Par defaut, les cinq traits natifs sont admissibles. |
| `BLOCK` | Resultat `hold` du porteur : aucune elimination, aucun soutien ni sauvetage Reraise. Une esquive compte comme un Block dans cette definition existante. Le compteur de Franky est cumulatif. |
| `ALLIED_DEATH` | Elimination definitive d'un AUTRE allie alors que le porteur est actif ; aucun compte en reserve ni perte annulee par Reraise. |
| `WARD_SAVED` | Autre allie sauve par une Garde dont le porteur est le donneur trace. Sans cette Garde, la DEF aurait ete insuffisante ; ni esquive, Reraise ou simple Garde presente ne suffisent. |
| `RERAISE_USED` | Autre allie sauve par un Reraise dont le porteur est le donneur trace. Le don du Ruban intervient APRES le sauvetage, pour une defense future. |
| `POWER_USED` | Autre allie consomme une Puissance tracee jusqu'au porteur. Le nouveau choix exclut le donneur ET le premier beneficiaire. |
| `CLOVER_SAVED` | Un JETON Trefle a ete consomme apres une DEF chiffree insuffisante (`luckUsed` et `failedDefense`) et le resultat final est un Block (`hold`). Une face native Retry seule ne suffit pas. Une esquive apres le Trefle peut conclure ce sauvetage ; un Reraise final ne le qualifie pas. |
| `UNINVOLVED` | Echange termine alors que le porteur est actif, sans etre attaquant ni cible. Deux consecutifs pour Snake ; une implication remet ce compteur a zero tant que la charge n'est pas prete. |
| `SURVIVED` | Le porteur, cible d'une attaque hostile, est encore vivant au resultat. Un soutien n'est pas une attaque ; esquive ou Reraise peuvent assurer la survie. |
| `ATTACK` | ATK chiffree effectivement conservee du porteur, jamais une previsualisation Kalistel, une face soutien ou Mort. |
| `TARGETED` | Attaque CHIFFREE conservee contre le porteur. La Gourde donne ses Gardes avant la defense ; une attaque Mort ne declenche pas la Gourde. Cette restriction concerne le nouveau runtime, pas la Boite de Momo geree par le module historique. |
| `ALLY_TARGETED` | Attaque chiffree conservee contre un AUTRE allie actif pendant que le porteur est sur le plateau. |
| `INSUFFICIENT_DEFENSE` | La premiere DEF chiffree est insuffisante contre une ATK chiffree, sans Trefle disponible NI deja utilise. Une face Retry imprimee avant ce premier score chiffre n'empeche pas l'activation. Son Trefle est donne puis consomme immediatement pour relancer, pas stocke apres le duel. |
| `DEPLOYED` | Un AUTRE allie entre depuis la reserve en cours de partie, pas le deploiement initial. Le porteur doit deja etre actif et le rester pour transmettre. |

Les contraintes de nombre de combattants sont lues sur les plateaux reels
au traitement de l'evenement, jamais sur les dix cartes du deck. `accepted`
intervient apres conservation du de ATK mais avant la defense ; `after` passe
apres l'enregistrement du resultat. Un resultat fatal ne relance pas les
evenements d'attaque deja traites. Les rosters du debut du duel sont conserves
comme pieces de validation historique, pas comme un second plateau actif.
Pour `DEPLOYED`, compter les combattants APRES l'arrivee du renfort : un retour
a egalite ne remplit plus `outnumbered`.

Trois actions sont volontairement differees sans nouveau nom de trigger :
`SUPPORT -> MITIGATE advantage` de 9S attend sa prochaine defense chiffree ;
`SUPPORT -> PREDICT` attend d'etre cible et propose alors la parite ;
`ALLIED_DEATH -> nextAlly` prepare une transmission au prochain renfort
admissible, uniquement si le porteur est encore sur le plateau a son arrivee.
En revanche `ATTACK -> MITIGATE penalty` de Ruby agit sur l'attaque courante.

Pour Auron, `TARGETED` fixe le moment de la Gourde : etre attaque par une ATK
CHIFFREE conservee avec au plus deux actifs et en inferiorite. Une attaque
magique chiffree peut distribuer les Gardes, mais ne les consomme pas : elles
restent destinees aux attaques physiques chiffrees. Il ne s'agit ni d'une
aura permanente ni d'une activation en reserve des que l'equipe diminue.

### Catalogue du nouveau lot

Tous les effets ci-dessous sont a usage unique. "Allie" signifie autre allie
actif, sauf mention contraire ; les conditions completes sont dans le module.

| ID stable | Porteur existant | Preparation et effet |
| --- | --- | --- |
| `exiled-king-seal` | Balmhyr | Block en inferiorite ; Garde a jusqu'a deux allies choisis. |
| `current-compass` | Ruby (Kalistar) | ATK en inferiorite avec malus cristal ; annule jusqu'a 40 de ce malus. |
| `last-garden-seed` | Thalie | Nouveau Reraise donne ; Trefle au meme beneficiaire. |
| `lost-names-bell` | Ombrine | Deux pertes alliees ; Potion et Trefle a un allie choisi. |
| `kalistar-nerval-lantern` | Nerval | Sa Garde sauve un allie ; Trefle a ce meme allie. |
| `kalistar-nestown-beacon` | Faction Nestown | Deux pertes ; Garde et Trefle au prochain renfort. |
| `griever-pendant` | Squall | Au plus deux actifs et inferiorite ; +60 ATK au prochain assaut chiffre. |
| `zanarkand-abes-pendant` | Tidus | Block en inferiorite ; Puissance a un allie choisi. |
| `guardian-jug` | Auron | Attaque chiffree subie, au plus deux actifs et inferiorite ; Garde a lui et son dernier compagnon. |
| `ff9-garnet-pendant` | Grenat / Dagga | Soutiens a deux allies differents ; Garde a jusqu'a deux allies choisis. |
| `ff9-mog-ribbon` | Eiko | Son Reraise est consomme ; Garde au meme allie pour la suite. |
| `ff9-final-act-feather` | Kuja | Au plus deux actifs et inferiorite ; +60 ATK au prochain assaut magique chiffre. |
| `ff9-terra-fragment` | Garland | Deux pertes ; prochain renfort prepare +50 a sa premiere ATK ou DEF chiffree. |
| `ff9-tantalus-script` | Ruby (FFIX) | Sa Puissance est consommee ; Puissance a un troisieme compagnon. |
| `pod-153` | 9S | Deux soutiens ; prochaine defense chiffree neutralise jusqu'a 60 d'avantages tactiques ennemis. |
| `lunar-tear` | Kaine | Jeton Trefle consomme puis Block ; +60 a sa prochaine ATK chiffree. |
| `infiltration-box` | Solid / Old Snake | Deux echanges consecutifs sans implication ; +40 a sa prochaine ATK chiffree. |
| `metal-gear-mkii` | Otacon MGS4 | Soutiens a deux allies differents ; Garde et Trefle a un allie choisi. |
| `jill-lockpicks` | Jill | Inferiorite et premiere DEF chiffree insuffisante sans Trefle disponible ou deja utilise ; une relance immediate, meme apres une face Retry imprimee. |
| `wolf-medallion` | Geralt / Vesemir | Attaque magique avec avantage cristal ; +60 DEF au duel. |
| `obsidian-star` | Yennefer | Inferiorite, allie attaque en magie ; +60 DEF a cet allie au duel. |
| `straw-hat` | Luffy | Perte alliee ; +60 a sa prochaine ATK chiffree contre le responsable exact. |
| `log-pose` | Nami | Inferiorite encore vraie APRES l'arrivee du renfort allie ; choisir Potion OU Puissance pour lui. |
| `rumble-ball` | Chopper | Soutiens a deux allies differents ; +50 a sa premiere ATK ou DEF chiffree. |
| `cola-reserve` | Franky | Deux Blocks ; +60 a sa prochaine ATK chiffree. |
| `gotham-harvey-coin` | Double-Face | ATK en inferiorite ; pile +60 ATK, face Garde personnelle. |
| `gotham-riddle-box` | Le Sphinx | Un soutien ; prediction avant un futur de ennemi, +50 DEF si juste. |
| `gotham-ivy-seed` | Poison Ivy | Deux soutiens ; -40 a la prochaine ATK chiffree de l'ennemi choisi. |
| `gotham-utility-belt` | Batman | Survit a un attaquant ; +60 DEF contre sa prochaine attaque chiffree. |
| `gotham-lazarus-vial` | Ra's al Ghul | Deux pertes alliees ; Reraise personnel si aucun coeur. |
| `castlevania-hector-ring` | Hector | Gardes/Reraise a deux allies differents ; Reraise a un allie choisi. |
| `castlevania-lisa-memory` | Dracula | Inferiorite, allie attaque physiquement ; +60 DEF a cet allie au duel. |

Les porteurs de ce tableau ne servent PAS de cles. Les restrictions existantes
du catalogue restent intactes, notamment `characterIds` ET faction MGS4 pour
Otacon. Les autres versions d'un personnage restent compatibles seulement
selon ces restrictions, sans derive de son nom affiche.

### Cumuls, chaines et sauvegardes

Pour un meme beneficiaire et une meme statistique, retenir le MAXIMUM des
modificateurs directs positifs de reliques applicables, pas leur somme. Ce
maximum concerne aussi les cadeaux directs prepares par une autre relique.
Les bonus ordinaires arme/protection et les buffs natifs gardent leur
fonctionnement normal. Une Garde native +60 et le meilleur bonus direct DEF
restent donc deux contributions distinctes, sans seconde Garde empilee.
Une mitigation plafonnee n'invente jamais un avantage au-dela du malus reel,
et n'augmente pas les bornes des contributions existantes.

Concretement, `totals` retient le plus grand modificateur positif et le plus
petit modificateur negatif pour le beneficiaire et la statistique. Deux
reductions d'ATK de -40 et -60 donnent -60, pas -100. La compensation positive
de Ruby participe aussi au maximum positif ; ce n'est pas une seconde famille
de cumul. `addModifier` ne consomme pas une charge ordinaire qui n'ameliore pas
le maximum deja present. Si un bonus a deja ete applique avant qu'un plus fort
arrive, sa consommation n'est pas annulee retroactivement. La piece et la
prediction consomment leur tentative selon leurs regles propres.

Les cinq categories natives ne se doublent ni ne se rafraichissent. Dans un
don de plusieurs traits, n'attribuer que ceux qui manquent et conserver le
donneur original des autres. Aucun choix vide, aucune consommation pour un
don integralement impossible. `max:2` compte deux personnes, pas deux traits ;
les choix se font successivement, avec un second choix s'il reste une cible
admissible. Avec une seule cible admissible, un seul don est possible.

Les evenements provenant d'un ultime ne sont pas exclus par principe :
Boite de Momo -> Trefle de Kaine -> Larme lunaire constitue une chaine valide.
En revanche recevoir un effet ne fait pas de son beneficiaire un donneur de
soutien. Le runtime marque le don comme depense avant d'emettre ses consequences
et conserve les identifiants d'evenements deja traites dans `seen`. Une relance
DEF ne reemet pas `ATTACK` ; animations et changement d'ecran ne distribuent pas
de dons. Reraise ne recharge pas les reliques.

Une marque conserve l'UID exact du combattant. Sa mort definitive perd la
charge sans nouveau ciblage ; son Reraise conserve l'UID et la marque. Une
autre perte ou attaque ne remplace pas une premiere cible deja memorisee.
Les effets deja donnes conservent leur source meme apres le depart du donneur.
Preparation, choix, tirage de piece, cible, consommation et provenance sont
serialises avec la partie ; le catalogue vivant ne remplace pas le snapshot
d'equipement d'un match commence.

### Etat reel et controles de restauration

Le nouveau runtime utilise `equipment.rituals`, separe du registre historique
`equipment.ultimates.records` des trois premiers ultimes :

```js
{version: 1, records: {}, events: [], uses: []}
```

`records` est indexe par UID du porteur. Une ligne contient `sourceUid`,
`weaponId`, `status`, `progress` et `seen`, puis uniquement les champs utiles :
`armedRound`, `spentRound`, `lostRound`, `targetUid`, `beneficiary`,
`waitingDeployment`, `choice`, `selected`, `excludeUid`, `parity`,
`predictedRound` ou `coin`.

| `status` | Signification enregistree |
| --- | --- |
| `tracking` | Suivi des evenements admissibles avant preparation ou attribution effective. |
| `ready` | Charge preparee ; peut attendre une cible precise ou un renfort via `waitingDeployment:true`. |
| `choice` | Choix de cible, de trait ou de parite encore a valider. `choice.mode` vaut `target`, `trait` ou `parity`. |
| `spent` | Attribution/bonus effectue, ou tentative de piece/parite depensee. |
| `lost` | Cible marquee ou beneficiaire d'une charge prete definitivement absent du plateau. |

L'absence d'une ligne n'est pas un etat sauvegarde `inactive` : ce mot est une
valeur de lecture de `view`. De meme, `active` et `ready` exposes au rendu sont
des booleens calcules ; la vue peut signaler une condition courante avant
qu'une ligne soit creee. Aucun etat sauvegarde `charging` ou `exhausted` n'est
ajoute. Un `spent` peut encore etre visuellement utilise durant le duel.

`events` conserve les transitions `ready`, `grant`, `bonus`, `mark`, `spent`.
`uses` garde les modificateurs numeriques signes. Les dons sont dans
`match.ultimateGrants`, avec identifiant, tour, objet, donneur, beneficiaire et
trait. `matchStats` les credite au donneur ; `alliedSupport` n'augmente que si
le beneficiaire est un autre personnage. Les consommations natives utilisent
toujours `traitSources` puis les sources du duel pour leurs credits habituels.

Le debuff chiffre d'une relique est credite a sa source, meme si un autre allie
defend (Ivy). Une Esquive ou un Bouclier sans calcul chiffre ne cree pas ce
credit ; le score du beneficiaire ne peut pas devenir negatif par transfert.

L'identite calculee d'une charge native inclut aussi le donneur :
`PerformanceIndex.chargeId(source)` vaut
`round + ':' + kind + ':' + recipient + ':' + donor`. Deux Gardes donnees
au meme personnage pendant le meme echange par deux donneurs differents
restent donc distinctes. Exemple couvert par
`site/ultimate-expansion-integrity.test.cjs` : Auron donne une Garde pendant
l'attaque ; elle est consommee ; le beneficiaire survit ensuite grace a un
Reraise d'Eiko, qui lui donne une nouvelle Garde. La consommation de la
premiere ne marque pas celle d'Eiko comme deja depensee. Cette cle est
calculee depuis les champs existants, pas ajoutee a la sauvegarde ; aucun
champ ni schema de snapshot n'est modifie pour cette distinction.

Le duel conserve `ultimateEvents`, `ultimateModifiers`, `ultimateRosters` et
`ultimateThreat` ; les deux derniers sont recopies dans son evenement de bilan.
`ultimateAttack` et `ultimateDefense` sont les contributions nettes dans la
formule, y compris les reductions d'ATK. Le moteur les prend dans les scores
reels et la validation recalcule les totaux.

Les plafonds actuels de restauration sont : 20 lignes `records`, 20 `uses`,
240 `events` et 80 `match.ultimateGrants` pour la partie. Chaque `progress`
est limite au compteur de sa definition (1 ou 2), `seen` a 1000 identifiants
uniques, et chaque copie de transitions/modificateurs du duel a 60 entrees.
Ces bornes sont des controles de format, pas de nouvelles ressources joueur.

Les progressions liees a un duel sont recoupees avec son evenement de bilan,
ses sources de soutien et la presence du porteur dans `ultimateRosters`.
Les conditions de nombre d'actifs et de magie sont controlees avec ces preuves.
`DEPLOYED` ne passe pas par ce meme controle de progression de duel : le
branchement traite l'arrivee reelle, avec porteur actif, puis les choix/dons
conservent leurs controles d'UID, de camp et de definition. Le validateur
controle aussi les valeurs, les tours, les cibles, les doublons et la
correspondance des copies de duel avec les registres. Ces controles et les
tests ne constituent pas une garantie absolue contre toute incoherence.

Les choix passent par `equipmentChoice` et `grantEquipment`. Ils bloquent un
nouveau verrouillage, le jet ATK, le tour suivant et un nouveau deploiement
tant qu'une option attend. La parite se choisit en phase `attack`, le don
post-duel en `result`, et le choix du Log Pose apres l'arrivee du renfort dans
la phase determinee par le moteur. Aucune phase speciale `ultimate` n'existe.

### Ajouter ou verifier une definition

Ajouter une entree par ID existant, limiter le patch a `effect`/`condition`,
et utiliser uniquement les evenements/actions valides ci-dessus. Ne pas
introduire un nom de personnage dans les regles du moteur pour contourner une
condition manquante. Une nouvelle semantique doit d'abord etre specifiee et
testee. Mettre a jour le manuscrit joueur puis regenerer les documents seulement
avec le lot d'integration complet.

Verification des donnees : exactement 32 IDs distincts, uniquement des reliques
version 2 existantes, schema et valeurs bornes, conditions explicites, export
CommonJS identique a l'export navigateur et gel profond. Comparer les empreintes
des trois ultimes historiques, de `legacyWeapons`, des restrictions et de tous
les champs autres que `effect`/`condition` avant/apres.

Tests moteur dans `site/ultimate-expansion.test.cjs` et tests de presentation
dans `site/ultimate-expansion-ui.test.cjs`. Leurs resultats doivent etre
rapportes par l'execution correspondante, sans les deduire de ce document.
La verification porte sur chaque activation et non-activation,
deux camps, absence de cible, charges saturees, choix interrompu, relance,
marques perdues, causalite des Gardes/Trefles, reserve, renforts, fin de
match et reload pendant une chaine. Tester explicitement le maximum des bonus,
Momo -> Kaine, Eiko -> Garde sans second coeur, Ruby -> troisieme compagnon,
Jill sans double Trefle, parite apres Kalistel et piece inchangee au reload.
