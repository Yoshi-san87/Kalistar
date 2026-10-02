# Armes equipees - V1

Feature additive du 2 octobre 2026. Les PNG/PSD, les vingt familles d'armes et
leur matrice d'avantages restent inchanges. Aucun systeme Job n'est ajoute.

## Regles Jouables

| Arme | Porteur stable | Activation | Bonus |
| --- | --- | --- | --- |
| Hache du Roi Dechu | `balmhyr` | Seul combattant vivant sur son plateau | +30 ATK numerique tant que cet etat dure |
| La Flute des Petits Bonheurs | `momo`, toutes editions compatibles | Nouveau trefle ou nouvelle potion attribue par Momo | +30 DEF au beneficiaire pour son prochain duel |

Un remplacant encore en reserve ne compte pas comme combattant actif. Le retour
d'un allie sur le plateau desactive la Hache. Son bonus ne remplace jamais le
matchup Hache, ni celui d'une autre famille imprimee.

La Flute prolonge le soutien existant `retry`/`mana` : pas de nouveau jet ni de
regle de soutien parallele. Auteur compris, le beneficiaire doit etre vivant
sur le plateau allie. Une categorie deja chargee ne declenche pas la Flute ;
une charge de Flute deja presente ne se cumule pas et n'est pas rafraichie.
Le cadeau expire a la fin du prochain duel impliquant son beneficiaire, meme
s'il attaque ou obtient une face speciale. Il ne transforme pas Esquive, Mort,
Retry ou un autre effet en score numerique. Les relances DEF du MEME duel
conservent le +30 ; elles ne consomment pas plusieurs cadeaux. Un cadeau gagne
sur soi pendant une action de soutien n'expire pas sur cette action : seul
un cadeau present au verrouillage du duel est consomme.

Les +30 restent ponctuels, sous les +60 des soutiens ordinaires et sans
multiplicateur. Ils creent une opportunite, pas un kill garanti. Cette premiere
version n'affirme pas un taux de victoire equilibre : il faudra mesurer les
resultats joues avant d'ajuster les valeurs.

## Responsabilites

- `site/weapons.js` : catalogue declaratif des deux objets reels.
- `site/equipment.js` : compatibilite, profils, snapshots, conditions,
  modificateurs, consommation et validation, sans DOM.
- `site/local-db.js` : transactions, sauvegardes et profils locaux.
- `site/engine.js` : verrouillage, soutiens, calcul reel et journal.
- `site/weapons-ui.js` : liste, detail, porteurs, equipement et confirmations.
- `site/equipment-presentation.js` / `weapons.css` : medaillon partage entre
  fiche et arene, ancrage, transitions et transfert de soutien.
- `site/app.js` : branchements aux vues et animations existantes.

La forme `slots.weapon` laisse une place a un futur slot Job. Aujourd'hui seul
`weapon` est accepte : aucun bonus Job, inventaire RPG ou changement de famille
n'est implicitement active.

## Donnees

Exemple du catalogue :

```js
{
  id: 'fallen-king-axe',
  slot: 'weapon',
  name: 'Hache du Roi Dechu',
  family: 'Hache',
  visual: 'axe',
  restrictions: { characterIds: ['balmhyr'] },
  effect: {
    trigger: 'LAST_STANDING', stat: 'ATK', value: 30,
    duration: 'WHILE_TRUE'
  },
  condition: 'Dernier combattant actif de son equipe.',
  lore: '...'
}
```

Les restrictions peuvent etre `characterIds`, `jobs` et `families`. Plusieurs
valeurs d'une liste sont alternatives ; plusieurs categories se cumulent
avec un ET. `families` cible `card.weapon`, la famille imprimee. Les noms
affiches ne sont jamais des cles. Les jobs sont les valeurs exactes du
catalogue, par exemple `MENTOR`, pas une traduction UI.

Le second effet est declare par :

```js
{ trigger: 'AFTER_SUPPORT', supports: ['luck', 'mana'],
  stat: 'DEF', value: 30, duration: 'NEXT_DUEL' }
```

Profil local stocke dans le store `equipment` de `kalistar-v4-cards` :

```js
{ id: 'user-paris', version: 1,
  slots: { weapon: { balmhyr: 'fallen-king-axe',
                     momo: 'little-joys-flute' } } }
```

Un seul objet par personnage et un seul porteur par identifiant d'arme.
Les changements sont atomiques, avec verification du profil ayant servi a
la confirmation. Une confirmation ancienne ne peut pas ecraser un changement
effectue dans un autre onglet. Paris et Tokyo ont des profils distincts.

Nouvelle composition (V4.3.7) : le loadout propre a chaque deck fait autorite.
Le profil global n'est qu'une preference initiale de migration. Voir
[Composition d'equipe](COMPOSITION_EQUIPE.md). Un match conserve les definitions
et loadouts copies au lancement, meme si le joueur modifie son equipe ensuite.

Appel historique / technique :

```js
engine.newGame(deck0, deck1, {
  equipment: [profile0.slots.weapon, profile1.slots.weapon]
});
```

Les anciens appels techniques peuvent prendre le profil actif. Un adversaire
tableau n'a pas d'arme equipee par defaut; une equipe adverse sauvegardee fournit
son propre loadout. Le moteur supporte les deux camps de facon
symetrique. Le match conserve une copie des definitions ET des deux loadouts :
une modification du profil ne change jamais un match commence.

Dans le snapshot `state.equipment` : `version`, `definitions`, `loadouts` et
`pending`. Une charge temporaire est indexee par UID d'instance de match,
avec `{weaponId, sourceUid, grantedRound}`. Le duel conserve les modificateurs
captures dans `duel.equipment.attack/defense` et les UIDs a consommer dans
`expires`. Les formules ajoutent `equipmentAttack` / `equipmentDefense` aux
totaux reels ; les recaps et journaux nomment leur source.

## Compatibilite Et Reprise

Le store est ajoute par l'upgrade IndexedDB existant. Un profil absent equivaut
a `{weapon:{}}`. Les parties schema 6 sans `equipment` gardent leur forme et
leur comportement precedents ; aucun equipement n'est injecte retroactivement.

Les sauvegardes de bibliotheque schema 3 incluent desormais `equipment`.
Une ancienne sauvegarde sans cette propriete conserve les equipements actuels,
y compris lors d'une restauration confirmee. Un equipement importe invalide
fait echouer la restauration avant toute mutation. Les charges temporaires et
captures de duel sont sauvegardees dans le match et restaurees sans recharge.

## Medaillon Natif

Native : 897 x 1497 ; crop de `card-media.js` : `(50,50,797,1388)`.
Le centre optique valide est `(137,1163.5)`, extraction `(76,1103,122,122)`.
Le positionnement utilise ces coordonnees, le crop et les dimensions CSS
reelles de l'image DANS `.slot-card`. Le focus et le zoom de la carte portent
donc aussi le medaillon. L'overlay attend l'image recadree, pas le PNG brut.

`node V4/site/build-weapon-media.cjs` extrait les pixels cuivre de la frame
approuvee et compose les banques natives Hache/Instrument. Il ne touche aucune
source. L'Instrument conserve le pictogramme Instrument imprime sur Momo ;
aucun symbole approximatif n'est dessine depuis une capture. La preuve des
sources, ancres et derives est dans `site/verification/weapons/media-provenance.json`.

Activation : 640 ms, anneau/reflet puis languette. Desactivation : 420 ms,
repli puis disparition. Usage : impulsion 340 ms ; soutien : quelques notes
et transfert 650 ms. Reduced Motion : fades courts, sans rotation ni trajet.
Animations WAAPI, ResizeObserver et listeners sont nettoyes lors du rendu,
de la navigation et de la fermeture. Pas de Canvas permanent par arme.

## Ajouter Une Troisieme Arme

Visuels uniques : voir `../revisions/2026-10-02-unique-weapon-art/README.md`.
Le champ facultatif `art` choisit un WebP versionne du meme medaillon natif ;
`visual` conserve la famille d'animation. Sans `art`, les anciens snapshots
utilisent toujours leurs fichiers historiques. `build-weapon-art.cjs` calibre
les PNG transparents sur le contour interieur sans modifier cadre ou regles.

1. Relever le `characterId`, `job` ou `weapon` exact dans le catalogue V4.
2. Ajouter une definition a `site/weapons.js` avec un ID nouveau et une
   restriction explicite. Reutiliser un effet declaratif existant si possible.
3. Reutiliser `visual: 'axe'` ou `'flute'` pour ces familles. Pour une autre
   famille, ajouter sa banque validee au generateur, son nouveau visual a la
   validation et son WebP derive. Conserver les visuels des anciens snapshots.
4. Pour un nouveau trigger, ajouter son evaluation/consommation dans
   `equipment.js` et son point de declenchement moteur. Ne jamais disperser
   des `if (weapon.id === ...)` dans les vues ou calculs.
5. Ajouter des tests de compatibilite, effet, expiration, reprise et rendu.
   La fiche, les confirmations, le deck et les recaps lisent deja le catalogue.

Le champ futur `changesFamily` est refuse aujourd'hui. Une mecanique modifiant
la matrice exigerait une decision d'equilibrage et une version explicite,
pas l'ajout silencieux d'un objet au catalogue.

## Validation

```powershell
node --test --test-isolation=none V4/site/equipment.test.cjs
node V4/site/weapons.browser.test.cjs
node V4/deploy/build.cjs
```

Le navigateur utilise un contexte jetable et suffixe tous les noms IndexedDB
par `-weapons-qa-only`. Il ne modifie aucun compte du navigateur personnel.
Desktop, Razr 50, Reduced Motion, formules reelles, snapshots, anciennes bases,
sauvegardes, zoom et nettoyage sont couverts. Captures et resultats :
`site/verification/weapons/`. Le libelle "Lame Prismatique" de la demande
initiale ne correspond pas a la seconde arme finale : les tests portent sur
La Flute des Petits Bonheurs, sans inventer une troisieme arme en production.
