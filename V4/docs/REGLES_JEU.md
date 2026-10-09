# Kalistar V4 - Regles et conventions

Etat actualise le 3 octobre 2026. Synthese des decisions utilisateur et du
comportement actuel, avec composition et commandement demandes explicitement. Retour au
[guide de reprise](../../docs/GUIDE_REPRISE.md).

## Sources et perimetre

- [Moteur V4](../site/engine.js), [interface](../site/app.js) et
  [metriques](../site/match-metrics.js) : comportement execute.
- [Constructeur du catalogue](../atelier/game-catalog.cjs) : validation des
  profils approuves et des creations publiees.
- [Contrat V3](../../V3/CONTRAT_V3.md) et
  [parametres de demo](../../V3/donnees/regles_demo.json) : mecaniques conservees,
  mais leurs chemins de stockage et effectifs historiques ne definissent pas V4.
- Les profils du [verrou courant](../atelier/data/references.json) font autorite
  pour les valeurs et faces d'une carte ; ne pas les recreer depuis ce resume.

## Deck et formation

- Dix cartes par deck, une seule carte par personnage toutes versions confondues,
  et une seule carte Rainbow. Les possessions du compte sont verifiees par
  l'interface. Deux exemplaires identiques ou deux variantes du meme personnage
  sont donc interdits dans un meme deck.
- Cinq positions : P1 Tank, P2 DPS physique, P3 Middle, P4 DPS magique ou distance,
  P5 Support. Une position ne donne pas de bonus de statistiques a elle seule.
- Pour un deck jouable nouveau, au moins deux cartes compatibles avec CHAQUE
  position et une formation simultanee complete P1-P5 possible. Une carte
  polyvalente compte dans chaque position compatible, sans occuper deux places.
- Cinq titulaires P1-P5 et un capitaine sont prepares et sauvegardes dans le
  deck, avec son propre equipement. La nouvelle Arene demarre directement
  avec cette formation, sans rappel ni placement initial. Les cinq autres
  cartes forment une reserve commune, sans poste de remplacement dedie.
  Les anciens matchs en setup gardent leur comportement historique.
- Cinq cartes sont deployees au depart ; les autres sont en reserve. Apres le
  debut, une carte vivante ne change plus de position. Une elimination ouvre un
  remplacement uniquement par une carte de reserve compatible avec la place.
- Dix decks enregistres maximum par profil ; nom, sauvegarde et ordre des dix
  emplacements relevent de la bibliotheque et du constructeur de decks.

Technique : `validatePlayableDeck()` impose la couverture 2. Le moteur conserve
`validateDeck()`/`newGame()` avec couverture 1 par defaut pour les etats historiques.
L'interface cree les nouvelles parties avec une composition explicite qui impose
`deckCoverage: 2`. Ne pas utiliser
l'ancien defaut pour assouplir la construction des decks actuels.

## Capitaine (3 octobre 2026)

Un deck jouable possede exactement un capitaine parmi ses cinq titulaires.
Tant qu'il est vivant sur le plateau ET qu'un autre allie partage sa faction,
tous les combattants actifs de cette faction recoivent +10 ATK numerique.
Meme regle pour sa race : +10 DEF numerique. Un seul +10 par lien, pas par
allie. Chaque composante de synergie peut donc atteindre +40 normal +10
commandement = +50. Le capitaine beneficie aussi de ses liens.

Reserve et morts exclus. Un Reraise conserve la presence du capitaine;
sa mort definitive retire le commandement immediatement. Aucun remplacant
n'herite de la couronne. Les liens sont recalcules depuis le plateau reel.
Les scores, l'IA et les journaux distinguent le commandement de la synergie.
Voir [composition et migration](COMPOSITION_EQUIPE.md) pour le contrat technique.

## Duel et fin de rencontre

Les nouvelles rencontres commencent par un tirage des deux capitaines : un D6
par camp, le plus grand ouvre, une egalite relance les deux des. Ce tirage ne
modifie ni les statistiques des capitaines ni le hasard des jets de combat.
Les decks predefinis choisissent leur titulaire P1 comme capitaine ; les
compositions enregistrees conservent celui choisi par le joueur.

### Adversaire et arène au hasard (4.6.5)

La préparation propose une composition adverse au hasard dans le catalogue
courant : dix personnages distincts, au moins deux cartes compatibles avec
chaque position P1–P5, cinq titulaires simultanément compatibles et au plus un
Rainbow. Le capitaine appartient aux titulaires ; cinq cartes restent en réserve.

Les niveaux **Détente**, **Équilibré** et **Tactique** orientent la sélection vers
une cohésion croissante : synergies de faction/race, commandement du capitaine,
variété de cristaux et relais en réserve. Ils ne changent ni les statistiques
imprimées, ni les dés, ni les règles ou décisions de l'IA. Ce sont des niveaux de
construction d'équipe, pas une garantie de résultat. Les compositions tirées
n'ont pas d'équipement ajouté automatiquement. Un deck adverse choisi à la main
conserve sa formation et ses équipements. Le tirage est figé avant le lancement.

Une arène peut également être tirée au hasard, indépendamment des équipes et de
la graine du combat. Quand plusieurs arènes existent, elle diffère de l'arène
courante. Ses avantages habituels s'appliquent toujours aux deux camps.

### Ordre de combat

L'ordre est **ABBA** : A est le gagnant du tirage, B son adversaire. Les actions
suivent A, B, B, A, A, B, B, A, etc. Une action de soutien compte comme un
echange, exactement comme un duel. Les jets DEF, les relances de Kalistel et
les remplacements ne font pas avancer cet ordre. Le bouton **Tour suivant**
termine l'echange et avance d'une case dans la frise visible sur PC et telephone.
Les anciennes rencontres sans marqueur d'initiative conservent leur alternance
ABAB ; leur sauvegarde n'est pas convertie. Voir [contrat technique](INITIATIVE_ABBA.md).

Une carte ATK et une cible DEF sont choisies sur le plateau. Chaque carte a six
faces de chaque cote ; les tableaux sont ranges D6 vers D1 (`6 - de`). Les listes
`magic` et `barriers` contiennent des NUMEROS DE DE, pas des indices de tableau.

Une ATK finale strictement superieure a la DEF elimine la cible. L'egalite laisse
la defense en vie. Les effets speciaux se resolvent separement : ils ne sont pas
des valeurs numeriques egales a zero.

L'action et les animations se terminent avant le bouton **Tour suivant**. La
phase `result` conserve le detail consultable ; `next()` declenche la suite et
les remplacements. Ne pas remettre une transition automatique de tour.

Depuis la V4.6.10, le dernier bouton affiche **Duel termine** lorsque `next()`
termine effectivement la rencontre (verification sur une copie de l'etat).
Le dernier resultat reste lisible avant ce clic. Ensuite, une ceremonie remet
en scene les personnages ayant reellement gagne des trophees, morts compris,
sur le decor de l'arene. Elle ne les ressuscite pas dans le moteur et n'ajoute
aucune recompense. Les ex aequo sont conserves ; les historiques partiels
n'attribuent aucun trophee. Le Palmares et le Dernier duel restent accessibles.
Cette mise en scene, sans confettis et desactivable, ne change ni les regles
de victoire, ni les scores, ni le journal, ni les sauvegardes.

**Intention utilisateur : premier a dix kills definitifs.** Un Reraise ne donne
pas de kill. **Implementation actuelle :** `findReplacement()` termine aussi
la partie lorsqu'un camp n'a plus de carte sur le plateau apres recherche des
remplacements compatibles. Une reserve incompatible peut donc rester, et la
victoire survenir avant dix kills. Ce point doit etre arbitre explicitement
avant un changement de moteur ; ce guide ne le presente pas comme deja corrige.
Le moteur impose aussi un match nul de demo apres 200 echanges.

## Eclats de Kalistel

Ajout demande le 21 septembre 2026 : deux Eclats de Kalistel par joueur et par
nouvelle rencontre, partages par son equipe, y compris les cartes sans cristal.
Apres le premier jet ATK, avant toute defense ou attribution d'effet, le joueur
garde le resultat ou depense un eclat pour relancer. Une relance au maximum par
attaque ; attaquant et cible restent identiques. Le second resultat est
obligatoire, meme moins favorable. Les soutiens et Mort sont aussi eligibles.
Le jet abandonne ne consomme ni potion ni puissance physique et n'attribue aucun
effet. Seul le resultat conserve est resolu ; aucun objet de collection consomme.
Le trefle conserve ses regles de relance DEF automatique, distinctes des eclats.

Le choix n'a pas de compte a rebours. L'IA dispose des memes deux charges et
decide uniquement selon les faces publiques, sans consulter le futur RNG.
Les anciennes parties sans marqueur `kalistel` restent inchangees. Les nouvelles
sauvegardent le choix en phase `kalistel` et les depenses `{round, side}` ; une
reprise ne regenere aucune charge. Le bilan ne compte que le resultat final,
avec deux jets ATK lorsqu'un eclat a ete utilise.

## Scores numeriques

Clarification utilisateur du 1 octobre 2026 : les valeurs par role principal
dans `V3/donnees/regles_demo.json.roleBounds` sont des limites et reperes,
pas des chiffres obligatoires a recopier sur chaque carte. Les profils peuvent
privilegier un pic, la regularite ou la survie, avec des compromis entre faces.
La [revision de personnalite numerique](../revisions/2026-10-01-stat-personality/README.md)
concerne onze One Piece, vingt-cinq Resident Evil et douze MGS selectionnes.
Elle conserve les bornes, roles, positions, modes et effets speciaux ; seul le
chiffre d'une face deja numerique change. Elle ne modifie pas le moteur et ne
constitue pas une preuve de taux de victoire equilibres.

```text
ATK = face + arme + cristal + faction + capitaine faction + jeton ATK + arene ATK - barriere
DEF = face + race + capitaine race + arene DEF + garde physique
Puis ajouter les contributions d'equipement : arme ATK sur un 6 conserve,
protection DEF sur un 6 conserve, et le bonus de relique applicable.
Chaque total est borne a zero au minimum.
```

Armes : conserver la matrice existante, ses signes et ses vingt categories.
Un avantage n'est pas a appliquer une seconde fois dans l'interface. Les
modificateurs de cristal classiques viennent du profil attaquant, normalement
+30/-30 ; Taulio conserve notamment son exception +40/-20.

Cycles classiques, chaque element ayant avantage sur le suivant :

```text
Air > Eau > Feu > Glace > Plante > Terre > Roche > Electricite > Air
Sang > Tenebres > Lumiere > Sang
```

RAINBOW contre classique : +40 ; classique contre RAINBOW : -40.
Classique contre NONE : +20 ; RAINBOW contre NONE : +30 ; NONE contre cristal : 0.
Meme element contre lui-meme : 0. Ne pas confondre GEO (Terre) et MINERO (Roche).
NONE n'a ni face magique ni barriere elementaire.

Une barriere sur la face DEF numerique obtenue retire 30 ATK seulement a une
attaque magique. C'est distinct de la garde physique `ward` et de l'icone
bouclier utilisee pour afficher la somme des scores DEF.

## Equipements - 4.6.0 (9 octobre 2026)

Un personnage peut porter simultanement UNE arme, UNE protection et UNE
relique, choisies avant le match. Chaque objet reste attribue a un seul
porteur dans ce loadout. Le deck et le match conservent leurs propres copies :
changer un profil ou un autre deck ne modifie jamais une rencontre commencee.

- Arme : bonus ATK sur le D6 NUMERIQUE conserve. Elle apparait entre ATK 6
  et ATK 5, sur l'emplacement cible. Hache du Roi Dechu : +30 ATK sur ce 6,
  sans ancienne condition de dernier survivant.
- Protection : bonus DEF sur le D6 NUMERIQUE courant contre une ATK numerique.
  Elle apparait entre DEF 6 et DEF 5. Rempart de Durane : +30 DEF sur ce 6,
  sans ancienne limite de premiere defense. Chaque duel peut la reutiliser.
- Relique : garde son effet conditionnel et sa duree propres. Son mecanisme
  reste sur le medaillon d'arme imprime. Aucun nouvel ulti manuel ni jauge.
  Pod 042 conserve son +20 DEF a la prochaine defense apres un Block, une
  fois par partie. La Flute des Petits Bonheurs est une relique de soutien :
  nouveau trefle/potion de Momo, +30 DEF au beneficiaire pour son prochain duel.

Un 6 ATK en attente de decision Kalistel ne donne pas encore le bonus.
Un 6 abandonne ne l'active pas ; un second 6 impose ou un 6 accepte l'active.
En DEF, le bonus est recalcule a CHAQUE relance : passer de 6 a 5 le retire,
passer de 5 a 6 l'ajoute. Le calcul du premier essai reste dans le journal.
Les bonus de reliques captures pour le duel conservent leur duree initiale.

Mort, Reraise, Esquive et autres faces speciales ne deviennent jamais des
scores. Une ATK Mort ne beneficie ni de l'arme ni de la protection. L'arme
imprimee, ses vingt matchups, la magie, les barrieres, les jetons +60, les
synergies, le capitaine, l'initiative et ABBA sont inchanges.

Le bonus direct arme/protection S'AJOUTE au meilleur bonus de relique de la
meme statistique. Plusieurs cadeaux de reliques ne se cumulent toujours pas :
leur maximum est retenu, avec les consommations historiques. Ainsi une
protection +30 sur DEF 6 et une relique +20 applicable donnent +50 DEF ; sur
DEF 5 seule la relique donne +20. Toutes les origines sont nommees separement.

La protection est montree lorsqu'elle contribue, meme si la defense echoue.
Un Block utilisant cette protection emploie son illustration ; un Block sans
activation conserve le bouclier habituel. Les medaillons actifs et le 6
conserve tournent ensemble jusqu'a la fin du duel, sans prolonger les bonus
sur le prochain duel. Reduced Motion remplace le mouvement par un etat fixe.
En arene, arme et protection equipees restent visibles au repos, avec un cercle
plus grand et sans languette. Un cercle fixe ne donne aucun bonus : seule son
activation le fait tourner. L'inspection de la carte montre le meme etat.

Les reliques a usage unique gardent leurs evenements (`DEFENSE`, `BLOCK`,
`DODGE`, `ALLY_FALL`, `SUPPORT`, `DEPLOY`, `ALLY_DEPLOY`), destinataires et
expiration. Un soutien deja charge ou une perte annulee par Reraise ne les
recharge pas. Un cadeau a choisir attend un autre allie actif. Une vraie
defense consomme sa charge, meme speciale ; attaquer ne consomme pas une
charge `NEXT_DEFENSE`. Le cadeau de la Flute expire, lui, apres le prochain
duel du beneficiaire, y compris s'il attaque.

Les parties historiques `equipment.version: 1` gardent leurs anciennes
definitions et regles a un emplacement partage. Les profils/compositions
migrent vers trois emplacements sans perdre leurs membres ou possessions.
Schemas et ajout d'un objet : [Equipements 4.6.0](EQUIPEMENTS_460.md).

## Synergies et arenes

Pour 1, 2, 3, 4 ou 5 cartes de meme groupe sur le plateau : bonus respectif
0, 10, 20, 30 ou 40. Faction sur ATK, race sur DEF. Reserve et morts exclus.
L'apercu de synergie des dix cartes du deck est un potentiel, jamais un bonus
actif calcule comme si les dix cartes occupaient le plateau.

L'arene est fixee avant le match, identique pour les deux camps. Cristal
correspondant : +15 ATK. Affinite du personnage (`characterId`, toutes versions
comprises) : +10 ATK et +10 DEF. Maximum +25 ATK/+10 DEF, uniquement sur les
scores numeriques. NONE ne donne pas d'affinite elementaire.

## Buffs et effets

Cinq categories coexistent : `ward`, `luck`, `reraise`, `mana`, `physical`.
Une charge par categorie. Reattribuer une categorie deja active ne double pas
le bonus et ne supprime pas les autres categories.

Tous les soutiens ATK remplacent l'attaque par le choix d'un beneficiaire
vivant sur le plateau allie, auteur compris. Pas de cible en reserve ou morte.

| Face / categorie | Effet actuel |
| --- | --- |
| `guard` / `ward` | +60 DEF a la prochaine defense numerique contre une ATK physique. Face ATK reservee aux `canGuard` de role principal P1/P5. |
| `retry` / `luck` en ATK | Attribue un trefle : relance DEF si le score final est insuffisant contre une attaque numerique. |
| `revive` / `reraise` | Attribue un coeur preventif. Prochaine elimination annulee, meme par Mort ; la carte reste en place. Reserve aux `canHeal` de role principal P5. |
| `mana` | +60 a la prochaine attaque numerique magique du beneficiaire. |
| `buff_atk` / `physical` | +60 a la prochaine attaque numerique physique du beneficiaire, pas obligatoirement celle du donneur. |
| `retry` en DEF | Relance immediate du de DEF, sans attribuer de jeton. Peut produire plusieurs jets jusqu'a resolution. |
| `dodge` en DEF | Annule l'attaque, y compris Mort. |
| `death` en ATK | Mort ignore les scores, barriere, ward et jeton trefle ; esquive et Reraise peuvent sauver la cible. |

Ordre AUTOMATIQUE : garde deja comprise dans la DEF, puis trefle si insuffisant,
puis Reraise si l'elimination persiste. Aucun choix manuel de cet ordre.

Ward se consomme une fois sur une defense numerique contre une ATK physique ;
son +60 demeure dans la formule du meme duel apres une relance. Magie, esquive
et Mort ne le consomment pas. La barriere et les autres modificateurs sont
recalcules sur le nouveau jet DEF.

Egalite, defense suffisante, esquive et Mort ne consomment pas le jeton trefle.
Mort peut rencontrer une face DEF `retry` qui relance le de : cette face est
distincte du jeton `luck` ignore par Mort.

Les jetons ATK se consomment au jet numerique du type correspondant, meme si la
cible esquive ensuite. Une attaque physique ne consomme pas `mana`, et inversement.
Un Reraise peut etre regagne apres consommation ; il ne ressuscite pas une carte
du cimetiere. Les anciens boucliers speciaux en DEF ne sont pas des faces
autorisables dans le catalogue V4 actuel, meme si le moteur garde du code legacy.

## Statistiques et attribution

Les statistiques sous une carte en duel portent sur CETTE instance et CE match,
pas sur sa carriere ni sur toutes les cartes du meme personnage.

| Colonne | Haut | Bas |
| --- | --- | --- |
| 1 | Kill, tete de mort | Stop, sens interdit, pas bouclier |
| 2 | Somme ATK, epee | Somme DEF, bouclier |
| 3 | Trefles attribues, trefle | Reraise attribues, coeur |
| 4 | Points ATK physiques attribues, +epee | Points DEF physiques attribues, +bouclier |

Kills = eliminations definitives. Stops = attaques arretees par la defense ou
l'esquive, pas sauvetages Reraise. Les anciens shields ne concernent que les
etats legacy. Les scores cumules sont les scores finaux de chaque echange ;
ne pas additionner les jets intermediaires echoues ou les actions de soutien.

Trefles et coeurs : compter les nouvelles attributions faites par cette carte,
a elle-meme ou a un allie, pas les receptions ni les consommations. Un
renouvellement sans nouvelle charge ne compte pas comme nouvelle attribution.

`+epee` et `+bouclier` affichent un MONTANT, soit 60 par nouvelle attribution,
pas le nombre de buffs. Le moteur conserve des compteurs d'attributions
`physical` et `guards` ; `match-metrics.js` les convertit pour l'affichage.
Ne pas multiplier aussi les donnees stockees, ce qui compterait 60 deux fois.

L'indice actuel vaut 5 par kill + 3 par stop + 2 par soutien + 1 par Reraise
consomme + 1 par tranche de 30 points de debuff. C'est une formule de classement,
pas une preuve d'equilibrage des cartes.

Depuis la demande du 21 septembre 2026, la carriere affiche ensemble les totaux
et les moyennes par match pour kills, stops, ATK, DEF, soutiens, ATK retiree,
vies sauvees et MVP. Moyenne = total / participations aux matchs termines, pour
le meme exemplaire ou le meme ensemble d'exemplaires selectionne. Les cartes
restees en reserve et les historiques partiels sont exclus par les agregats
existants. Arrondi d'affichage a une decimale, sans modifier les totaux ni
les archives. Sans participation, la moyenne est indisponible (`-`), total 0.
ATK/DEF conservent leur definition de scores finaux cumules, pas de degats nets.

## Edition, sauvegardes et limites

### Trophees individuels (22 septembre 2026)

Demande utilisateur : Golden Crystal (MVP, indice existant), Golden Killer
(kills definitifs), Golden Blocker (stops), Golden Clover (nouveaux trefles
attribues) et Golden Heart (nouveaux coeurs Reraise attribues). La distinction
recompense le donneur de coeurs, pas leur consommation par le beneficiaire.
Classement sur les deux equipes : tous les premiers ex aequo avec un score
strictement positif recoivent chacun le trophee entier, sauf le MVP qui reste
unique (demande du 23 septembre). A indice egal, departage successif par kills,
stops, soutiens, vies sauvees, puis ATK retiree. Une egalite parfaite utilise
l'identifiant d'instance du match en ordre lexical, sans tirage aleatoire.
A zero, aucun laureat.
Une seule attribution par categorie, instance et rencontre terminee. Les
rapports provisoires et historiques partiels ne donnent aucun trophee.

La source commune est `site/trophies.js`. Les recompenses sont derivees des
evenements verifies, ajoutees aux resultats archives et reconstituees lors des
imports. Les anciennes rencontres completes sont prises en compte. Les
totaux de carriere respectent la selection d'exemplaires et leur propriete
existante. Le nouvel onglet Statistiques permet aussi le regroupement par
personnage, toutes versions comprises ; les moyennes sont toujours ponderees
par les participations, jamais une moyenne des moyennes de versions.

### Medailles de kills (23 septembre 2026)

Distinctions honorifiques, sans bonus : une meme instance cumule ses kills
definitifs sur toute la rencontre. Aucun delai entre deux kills, aucune remise
a zero apres un tour sans kill ou un kill allie. Un sauvetage Reraise n'est pas
une elimination et ne fait pas progresser le palier.

Paliers : 2 Double-Kill, 3 Triple-Kill, 4 Quadra-Kill, 5 Penta-Kill,
6 Hexa-Kill, 7 Hepta-Kill, 8 Octo-Kill, 9 Nona-Kill, 10 Deca-Kill.
Le chiffre tient lieu d'abreviation. Le medaillon est rond a 2, triangulaire
a 3, carre a 4, puis polygonal ; le Deca est Rainbow et scintillant.

Chaque nouveau palier declenche une breve annonce apres resolution du combat,
sans bloquer Tour suivant. Une reprise ne rejoue pas l'annonce. Pas de compteur
supplementaire : la medaille courante se place a gauche de la tete de mort
uniquement si la largeur permet de conserver les statistiques lisibles.
Le palmares et la feuille de match la montrent devant le nom du personnage.

En carriere, seule la meilleure medaille de CHAQUE rencontre terminee compte.
Un Penta-Kill attribue une medaille 5, pas aussi les medailles 2, 3 et 4.
Sous les cinq trophees, seules les medailles deja gagnees sont affichees avec
leur nombre d'obtentions. Les historiques partiels, matchs non termines et
cartes restees en reserve sont exclus. Les anciens matchs complets restent
eligibles : calcul depuis leurs kills verifies, sans compteur parallele ni
nouveau schema de sauvegarde. La selection d'exemplaire et la propriete du
registre sont preservees. Les cinq trophees portent leur nom Golden complet.

### Stockage

Parties schema 6 avec edition V4 ; IndexedDB `kalistar-v4-cards`, preferences
`kalistar.v4.*`. Ne pas importer silencieusement les sauvegardes V2/V3.
Le peuplement ajoute uniquement les originaux manquants sans annuler un transfert.

Les sauvegardes de registre schema 3 sont validees contre leur propre instantane
`versions` ; elles peuvent preceder une nouvelle reference canonique. L'import
preserve les exemplaires plus recents et leurs dependances/historiques, verifie
les preuves et echoue atomiquement en cas d'incoherence. Le schema 2, sans ces
preuves de propriete, reste plus strict. Ne pas simplifier cette logique en
vidant la base puis en recreant les cartes de Paris.

Les profils reequilibres et tests de regles ne prouvent pas des taux de victoire
equilibres. Toute evolution des valeurs, restrictions de role, cycle ou ordre
des buffs doit etre explicite, testee, et separee d'une correction graphique.
