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

- `site/weapons.js` : catalogue declaratif des objets reels.
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

Les restrictions peuvent etre `characterIds`, `jobs`, `families` et `factions`. Plusieurs
valeurs d'une liste sont alternatives ; plusieurs categories se cumulent
avec un ET. `families` cible `card.weapon`, la famille imprimee. Les noms
affiches ne sont jamais des cles. Les jobs sont les valeurs exactes du
catalogue, par exemple `MENTOR`, pas une traduction UI.

`factions` cible la valeur exacte de `card.faction`, sans normaliser un nom
affiche. Exemple : `{ jobs: ['SOLDAT'], factions: ['Arborium'] }` exige les
deux proprietes sur la meme edition. Un Gardien d'Arborium ou un Soldat
d'une autre faction est refuse. Les anciennes definitions sans `factions`
gardent leur compatibilite et leur snapshot, sans migration.

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

## Inspection Des Cartes (V4.4.2)

Dans Composition, l'oeil ouvre la carte avec l'arme choisie pour CE deck,
pas avec un equipement repris automatiquement du profil. Le medaillon tourne
sur la carte de composition et dans sa popup ; la languette de bonus n'apparait
pas hors combat. Les autres versions du meme personnage conservent ce contexte.

Dans l'Arene, l'inspection lit `engine.equipmentView` sur l'instance presente
sur le plateau et le snapshot du match. Seule une arme actuellement active
remplace le medaillon imprime ; elle garde sa languette et la rotation radar.
Une arme inactive, consommee, en reserve ou une carte d'un match termine reste
native. Une modification du profil n'affecte pas la carte inspectee du match.

`equipment-presentation.js` gere `mountDetail` / `clearDetail` independamment
des observers du plateau. L'ancrage tient compte de la zone effectivement
dessinee par `object-fit: contain`, du crop natif et du chargement asynchrone.
Les listeners et ResizeObservers sont liberes a la fermeture, au remplacement
de la popup et lors d'un rendu/navigation. La vue Illustration n'a pas d'overlay.
Collection, statistiques et fiches de l'Arsenal n'adoptent pas cet overlay de
combat. Reduced Motion supprime les rotations dans tous les contextes.

Tests : `site/equipment-presentation.test.cjs` et les parcours d'inspection de
`site/weapons.browser.test.cjs`. Captures de cette revision :
`revisions/2026-10-03-equipped-card-inspection/qa/`.

## Cartes Collectionnables (Prototype Local)

L'arsenal utilise maintenant des cartes poker horizontales assemblees depuis
le cadre bleu/cuivre fourni, une illustration distincte et des textes vivants.
Le medaillon anime reste independant ; les regles et snapshots ne changent pas.
Le master commun, les sources conservees, les exports et la procedure pour
ajouter une carte sont documentes dans
[le workflow cartes d'armes](../weapon-cards/README.md).
Ce prototype du 3 octobre 2026 reste local, sans publication.

## Extension De L'Arsenal (3 Octobre 2026, Locale)

Le catalogue compte maintenant 25 armes : les deux originales, vingt armes
personnelles et trois armes de Job. Le detail, les choix d'equilibrage et les
preuves sont dans [la revision de l'arsenal](../revisions/2026-10-03-weapons-arsenal/README.md).
Il s'agit de restrictions sur les Jobs existants, pas de cartes Job nouvelles.

Les nouvelles definitions utilisent un seul trigger declaratif supplementaire :

```js
effect: {
  trigger: 'TEAM_STATE', stat: 'DEF', value: 15, duration: 'WHILE_TRUE',
  when: { activeAtMost: 2 }
}
```

Predicats acceptes dans `when` (tous doivent etre vrais s'ils sont combines) :

- `outnumbered: true` : moins de combattants presents sur le plateau allie
  que sur le plateau adverse ; les reserves ne comptent pas.
- `activeAtMost: n` : au plus n combattants sur le plateau allie (entier 1-4).
- `reserveAtMost: n` : au plus n cartes en reserve alliee (entier 0-4).

Une arme sur une carte en reserve, morte, en preparation ou en fin de match
reste inactive. L'etat suit les remplacements et les retours d'allies.
Le modificateur est capture au verrouillage du duel, comme les armes V1.
Il s'applique seulement a un jet numerique de sa statistique. Aucun nouveau
jet, aucune face speciale convertie en nombre, aucun changement de matchup.

Les armes personnelles ajoutent +20 ou +25 ; celles de Job +15. Le dernier
survivant est la condition des +25. Pour une meme statistique, le moteur prend
le maximum entre l'arme personnelle et le cadeau temporaire de Momo, jamais
leur somme. Le cadeau expire normalement apres le duel, meme si un autre
bonus plus fort a ete retenu. Les bonus ordinaires du jeu restent inchanges.

2B et Geralt ont chacun deux armes alternatives ; Balmhyr choisit entre la
Hache et le Gant. Aucun de ces personnages ne gagne un deuxieme slot.
La Promesse Blanche exige `characterId: kaylis` ET `families: ['Epée courte']`.
Elle n'est donc pas compatible avec la version Dague. La revision native de
Kaylis est documentee separement, sans changer les autres cartes.

Les tableaux imbriques des definitions sont geles ; les matchs les copient
dans leur snapshot. Pas de migration de base ou de changement de schema.
Les anciennes definitions `LAST_STANDING` / `AFTER_SUPPORT` restent valides.

## Ajouter Une Arme

### Equipements De Faction (5 Octobre 2026)

Le catalogue contient 29 armes. Apres la premiere publication Arborium,
l'utilisateur ouvre explicitement ses deux armes a TOUS les membres de cette
faction, sans restriction de metier, et ajoute deux armes Draevenheim.

| Arme | Faction exclusive | Activation | Effet |
| --- | --- | --- | --- |
| L'Accord Sylvestre, ARM-026 | Arborium | Moins de combattants actifs allies qu'adverses | +20 ATK numerique |
| Le Cran de Ronce, ARM-027 | Arborium | Reserve alliee vide | +20 ATK numerique |
| Les Ailes du Rempart, ARM-028 | Draevenheim | Moins de combattants actifs allies qu'adverses | +20 DEF numerique |
| L'Arbalete Ecarlate, ARM-029 | Draevenheim | Au plus deux combattants actifs allies | +20 ATK numerique |

Les quatre reutilisent `TEAM_STATE` / `WHILE_TRUE`. L'arme de base imprimee
continue de definir le matchup. Le poison du Cran est un element narratif,
pas un statut : aucun degat automatique ou sur plusieurs tours n'est ajoute.
Le bonus disparait si la condition cesse ; il ne convertit pas une face
speciale en score et ne cree pas de charge temporaire. Une seule arme equipee.

Arborium : Thalie, Bloom, Victorvine, Brindor, Ssilas, Mirelle, Eryss, Velran,
Saelor et Liorne. Draevenheim : Seraphina, Verminia (ses deux editions),
Baptiste, Orven, Serya, Marel, Veyr et Isvel. `Draevenheim` est la valeur exacte
du catalogue, distincte de l'orthographe libre "Dravenheim" de la demande.
La compatibilite reste declarative, sans liste de noms ou de characterId.
Les futurs membres de ces factions seront automatiquement compatibles.

Les familles des nouveaux objets sont `Lance` et `Arc` (arbalete), reutilisant
les vingt familles existantes ; elles ne remplacent pas le matchup imprime.
La restriction generale de faction ne requiert ni SOLDAT ni arme de base precise.
Le +20 reste conditionnel et sans cumul de deux equipements. Il ne garantit pas
l'equilibrage competitif ; les parties reelles pourront motiver un ajustement.

Les anciennes parties conservent leurs definitions SOLDAT + Arborium originales
et leurs equipements. Seuls les nouveaux choix de profil/composition et les
nouveaux matchs utilisent la restriction elargie. Aucun schema n'est migre.

Tests : `arborium-weapons.test.cjs` (restriction, profil, deck, snapshots,
40 duels sur dix porteurs) et `draevenheim-weapons.test.cjs` (36 duels sur neuf
editions). `arborium-weapons.browser.test.cjs` couvre maintenant les QUATRE
armes de faction : UI, sauvegarde, remplacement, inspection, alignement,
formules reelles, adversaire, PC/mobile et Reduced Motion. Les preuves sont
dans `revisions/2026-10-05-faction-weapons/`, pas dans l'ancien rapport Arborium.

Visuels uniques : voir `../revisions/2026-10-02-unique-weapon-art/README.md`.
Le champ facultatif `art` choisit un WebP versionne du meme medaillon natif ;
`visual` conserve la famille d'animation. Sans `art`, les anciens snapshots
utilisent toujours leurs fichiers historiques. `build-weapon-art.cjs` calibre
les PNG transparents sur le contour interieur sans modifier cadre ou regles.

1. Relever le `characterId`, `job` ou `weapon` exact dans le catalogue V4.
2. Ajouter une definition a `site/weapons.js` avec un ID nouveau et une
   restriction explicite. Reutiliser un effet declaratif existant si possible.
3. Ajouter `art: '<id>-v1'` et les metadonnees `collectible` dans la definition
   pour un objet detoure. Suivre le workflow `weapon-cards/README.md`. `visual`
   est un nom historique de STYLE D'ANNEAU : `axe` pour pierre/cuivre,
   `flute` pour energie/cuivre. Il ne decide ni de l'objet dessine ni de sa
   famille mecanique. Les notes musicales sont reservees a `Instrument`.
   Conserver les anciens assets : ils peuvent etre utilises par un snapshot.
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
node --test V4/site/weapons-arsenal.test.cjs V4/site/equipment-presentation.test.cjs
node V4/site/weapons-arsenal.browser.test.cjs
node V4/site/weapon-cards.browser.test.cjs
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
