# Composition d'equipe - V4.6.0

Decision utilisateur du 3 octobre 2026 : preparer les titulaires, la reserve,
le capitaine et les armes dans Decks. Les nouvelles rencontres commencent
directement avec cette formation. Aucun profil natif ni matrice n'est modifie.

## Architecture

- `site/team-composition.js` : normalisation, migration deterministe, edition
  et loadout. Module pur, aucun DOM et aucune seconde base d'equipement.
- `site/deck-library.js` : enveloppe schema 2, copies profondes, imports anciens
  et nouveaux, sauvegardes atomiques avec detection des ecritures concurrentes.
- `site/deck-builder.js` / `team-composition.css` : composition, recrutement,
  ADN, couronnes, comparaison, drag/touch, annuler/retablir et bibliotheque.
- `site/equipment.js` reste l'unique autorite pour la compatibilite et les
  mutations d'armes. Le medaillon partage vient de `equipment-presentation.js`.
- `site/engine.js` : validation jouable, deploiement explicite, commandement,
  calculs numeriques, IA, snapshots et reprise des rencontres.
- `site/app.js` : preferences locales, avant-match, possesseurs, recaps et
  journal. `local-db.js` archive deja ces etats schema 6 sans nouvelle base.

## Format et persistence

```json
{
  "schema": 2,
  "edition": "V4",
  "decks": [{
    "id": "kd-12345678-1234-4234-8234-123456789abc",
    "name": "Les Sentry",
    "cards": ["30000007", "... neuf autres cardIds ..."],
    "formation": ["P1 cardId", "P2 cardId", "P3 cardId", "P4 cardId", "P5 cardId"],
    "captain": "30000007",
    "equipment": {
      "weapon": {"balmhyr": "fallen-king-axe"},
      "shield": {"balmhyr": "durane-rampart"},
      "relic": {"momo": "little-joys-flute"}
    }
  }]
}
```

Les valeurs avec `...` sont explicatives, pas une fixture importable.
`cards` conserve les dix membres, sans deduire leurs positions de son ordre.
`formation[i]` definit P(i+1). La reserve est la difference d'inventaire,
ordonnee comme `cards`, et non cinq remplacements attaches a une position.
Les brouillons peuvent contenir `null`. Leur capitaine peut etre `null`.

Les armes restent indexees par `characterId` stable pour reutiliser exactement
le contrat Armes. `formation` et `captain` utilisent les cardIds de la version
choisie. Une seule version par personnage rend cette association non ambigue.
Une arme, une protection et une relique par personnage. Chaque objet n'a qu'un
porteur dans un meme loadout. Le picker classe les objets par emplacement;
remplacer une arme ne retire jamais une protection ou une relique.

Cle existante : `kalistar.v4.deckLibrary.<userId>`. Le brouillon complet utilise
la preference de profil `kalistar.v4.[<userId>.]teamDraft`; les anciennes
preferences `deck`/`deckName` restent des projections compatibles.
La bibliotheque reste limitee a dix equipes par profil. Chaque duplication,
export ou import conserve formation, capitaine ET loadout.

## Migration

La lecture d'une enveloppe schema 1 conserve tous les membres et utilise
`engine.lineup()` une fois pour proposer une formation. Le capitaine est nul.
Les preferences d'armes du profil servent uniquement de valeurs initiales.
La nouvelle enveloppe est persistee avec verification de conflit avant ecriture.
Une formation explicite n'est jamais recalculee a chaque affichage.

Les anciens loadouts plats sont distribues dans les trois maps selon la
categorie actuelle de chaque objet, sans perdre leurs porteurs. Les equipes
deja explicites ne recopient pas les preferences du profil. Un ancien match
version 1 n'est pas converti en cours de combat : il garde ses definitions,
ses conditions et son emplacement historique. Voir `EQUIPEMENTS_460.md`.

Un ancien brouillon sans formation complete utilise un appariement partiel.
Si plus de cinq cartes resteraient sans place, elles restent visibles dans les
emplacements de titulaires a corriger. Aucun membre n'est supprime pour faire
passer la validation. Un brouillon incoherent est enregistrable/importable,
mais ne peut jamais devenir une rencontre : incompatibilites, doublons,
couverture et capitaine sont revalides avant Jouer. Toute nouvelle action de
placement refuse immediatement un titulaire incompatible.

Les nouvelles armes choisies dans un deck ne modifient ni un autre deck ni le
profil global. Une modification globale ne remplace jamais un loadout explicite.
La possession des personnages et leur disponibilite restent verifiees par le
registre existant. La V1 Armes ne possede pas d'inventaire d'armes distinct :
ses deux objets de demonstration sont disponibles pour les porteurs compatibles.

## Rencontres et commandement

`engine.newGame(team0, team1, options)` copie les deux equipes, leurs definitions
d'armes et leurs loadouts. Il deploie les cinq cardIds explicites et passe a
`choose`. `state.composition = {version:1, teams:[...]}` distingue cette regle
dans le schema 6 existant. Les modifications ulterieures des equipes ne peuvent
pas changer cette copie. Les etats temporaires Armes restent dans le match.

Deux arguments tableaux conservent l'ancienne phase `setup`, notamment pour
les sauvegardes historiques. En mode mixte, un adversaire technique tableau
utilise `lineup()` et un marqueur `technical:true`, sans capitaine implicite.
Les equipes adverses sauvegardees utilisent leur formation, capitaine et armes.

`captainUnit(state, side)` retrouve le capitaine vivant sur le plateau.
`captainBonus(state, unit, 'attack'|'defense')` rend 0 ou 10 depuis ce plateau :
un autre allie doit partager la faction ou la race du capitaine. Le lien donne
+10 a tous les combattants actifs de ce groupe, capitaine compris. Plusieurs
allies ne multiplient pas ce bonus. Synergie normale +40, commandement +10
maximum. Reserve et morts exclus. Reraise conserve le capitaine; elimination
definitive retire l'aura. Un remplacant n'herite jamais de la couronne.

Les formules conservent `captainAttack` / `captainDefense` separes des termes
faction/race, sur les scores numeriques seulement. Recaps, journal et calcul
d'IA utilisent les memes fonctions. Les anciennes formules sans composition
gardent leur forme et leurs regles, sans ajout retroactif.

## UX et medaillons

PC : deux lignes de cinq cartes physiques, recrutement vertical trois colonnes
a droite, ADN en bande inferieure. Les compteurs de couverture portent sur les
dix membres; l'ADN actif porte sur les cinq titulaires. Le potentiel des dix
personnages est un panneau distinct sans promesse de bonus actif.

Phone : Equipe / Recruter / ADN, cinq titulaires et reserve horizontale.
Slot puis personnage reste le parcours principal, sans dependance au drag.
Les commandes tactiles ont une cible de 44 px; scroll possible sans barre.
L'oeil ouvre la fiche existante. La comparaison precede un remplacement recrute.
Le paysage court reduit les outils du bandeau; le format portrait garde les
outils de demonstration, imports et exports. Le mouvement reduit est respecte.

Dans Decks et sa fiche agrandie, les trois objets sont visibles sans languette
ni etat de combat. L'arme s'ancre entre ATK6 et ATK5, la protection entre DEF6
et DEF5, la relique sur le medaillon d'arme imprime. Le crop reste
(50,50,797,1388); tous les ancrages sont projetes depuis le template natif et
le rectangle reel de l'image. Aucun PNG/PSD de personnage n'est modifie.
En arene et dans sa fiche, seuls les objets actifs apparaissent. Les rotations
respectent le mouvement reduit. Les regles actuelles sont dans
`EQUIPEMENTS_460.md`, et non les conditions historiques de la V1.

Les designs propres de Hache et Flute electrique sont documentes dans
`../revisions/2026-10-02-unique-weapon-art/README.md`. Ils n'ecrasent aucun PNG
ou PSD natif de personnage. Pour ajouter un objet, suivre `ARMES_EQUIPEES.md`.

## Verification reproductible

```powershell
node --test V4/site/team-composition.test.cjs V4/site/equipment.test.cjs
node V4/site/team-composition.browser.test.cjs
$env:KALISTAR_BUILT_SITE='1'
node V4/site/team-composition.browser.test.cjs
node V4/site/weapons.browser.test.cjs
```

Playwright se charge depuis `KALISTAR_NODE_MODULES` ou le runtime Codex local.
Les tests navigateur utilisent des contextes neufs et une base QA suffixee,
jamais le stockage du navigateur personnel. Le mode construit intercepte les
requetes vers un domaine QA et sert uniquement le contenu construit localement.
Captures avant/apres : `site/verification/team-composition/`.
Les captures finales du site construit sont dans son sous-dossier `pages/`
(huit tailles, recrutement Armes, preview Razr, duel et fin de match).
Le sous-dossier `weapons-pages/` conserve les controles du site construit
pour les deux armes. Elles sont testees dans de vrais combats par
`weapons.browser.test.cjs`, avec geometrie, zoom,
challenger, adversaire et reprise. Les tests moteur couvrent aussi migrations,
invalides, liens non cumulables, mort/Reraise, reserves polyvalentes, IA,
equipement isole, snapshot et rencontres completes.

Une ancienne bibliotheque requiert le choix d'un capitaine avant Jouer.
La nouvelle version n'ajoute ni Jobs, duo de positions, talents ni equipements
multiples. L'equilibrage du commandement est un choix utilisateur, pas une
affirmation de taux de victoire mesure.
