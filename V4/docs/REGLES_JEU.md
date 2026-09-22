# Kalistar V4 - Regles et conventions

Etat verifie le 20 septembre 2026. Synthese des decisions utilisateur et du
comportement actuel, sans changement de gameplay. Retour au
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
- Cinq cartes sont deployees au depart ; les autres sont en reserve. Apres le
  debut, une carte vivante ne change plus de position. Une elimination ouvre un
  remplacement uniquement par une carte de reserve compatible avec la place.
- Dix decks enregistres maximum par profil ; nom, sauvegarde et ordre des dix
  emplacements relevent de la bibliotheque et du constructeur de decks.

Technique : `validatePlayableDeck()` impose la couverture 2. Le moteur conserve
`validateDeck()`/`newGame()` avec couverture 1 par defaut pour les etats historiques.
L'interface cree les nouvelles parties avec `deckCoverage: 2`. Ne pas utiliser
l'ancien defaut pour assouplir la construction des decks actuels.

## Duel et fin de rencontre

Le joueur ouvre, puis les camps alternent apres un duel ou une action de soutien.
Une carte ATK et une cible DEF sont choisies sur le plateau. Chaque carte a six
faces de chaque cote ; les tableaux sont ranges D6 vers D1 (`6 - de`). Les listes
`magic` et `barriers` contiennent des NUMEROS DE DE, pas des indices de tableau.

Une ATK finale strictement superieure a la DEF elimine la cible. L'egalite laisse
la defense en vie. Les effets speciaux se resolvent separement : ils ne sont pas
des valeurs numeriques egales a zero.

L'action et les animations se terminent avant le bouton **Tour suivant**. La
phase `result` conserve le detail consultable ; `next()` declenche la suite et
les remplacements. Ne pas remettre une transition automatique de tour.

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

```text
ATK = face + arme + cristal + faction + jeton ATK + arene ATK - barriere
DEF = face + race + arene DEF + garde physique
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
strictement positif recoivent chacun le trophee entier. A zero, aucun laureat.
Une seule attribution par categorie, instance et rencontre terminee. Les
rapports provisoires et historiques partiels ne donnent aucun trophee.

La source commune est `site/trophies.js`. Les recompenses sont derivees des
evenements verifies, ajoutees aux resultats archives et reconstituees lors des
imports. Les anciennes rencontres completes sont prises en compte. Les
totaux de carriere respectent la selection d'exemplaires et leur propriete
existante. Le nouvel onglet Statistiques permet aussi le regroupement par
personnage, toutes versions comprises ; les moyennes sont toujours ponderees
par les participations, jamais une moyenne des moyennes de versions.

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
