# Bibliotheque De Sprites

[Guide Astraball](README.md) | [Index du projet](../../docs/INDEX.md)

La bibliotheque est un catalogue de medias, pas un inventaire joueur.
Elle regroupe les personnages disponibles des trois lots. Le vestiaire les propose
via `src/roster.mjs`, sans attribuer de statistiques aux images ni modifier une
sauvegarde existante. Une nouvelle equipe enregistre l'identifiant d'apparence
dans chaque joueur ; son profil sportif et ses deux postes autorises viennent
du catalogue [des athletes](ATHLETES.md), independant des medias. Une identite
ne peut figurer deux fois dans le meme camp.
Les dix sprites du prototype restent inchanges, avec leurs identifiants courts
historiques conserves dans les equipes et les sauvegardes.

## Consulter

Ouvrir `/jeu/astraball/library.html` depuis le serveur Astraball ou le site
construit. La galerie permet de consulter chaque animation, de mettre en
pause, de retourner le personnage, de zoomer et de telecharger son atlas.
Reduced Motion suspend les animations au depart ; la lecture reste volontaire.
Seuls les personnages visibles sont charges et animes ; la page cachee suspend le rendu.
Le vestiaire affiche trente personnages par page, avec recherche sur tout le catalogue.

## Template Commun

Le remplacement demande le 26 octobre est prepare dans
[Animation Kit V2](animation-kit/README.md) : dessin a densite commune,
cellules 320 px, origine fixe, 14 sequences / 64 frames et prises d'armes
separees. Il est encore en validation artistique. Les paragraphes ci-dessous
decrivent le format historique actuellement jouable, pas la cible V2.

Le lot local de dix personnages est consultable dans
`http://127.0.0.1:4350/batch.html` via le serveur de l'Animation Kit.
La conversion native autorisee intervient une seule fois a la fabrication ;
ce lot ne modifie pas encore la bibliotheque jouable ni ses sauvegardes.
La production de toutes les identites est consultable dans
`http://127.0.0.1:4350/batch.html?catalog=all`. Son registre reprenable,
ses limites et ses commandes sont decrits dans l'Animation Kit. Une apparence
principale exacte est produite par identite ; les autres variantes de cartes
ne sont pas remplacees par de faux alias. La production est arretee a la
demande de l'auteur a 170 identites, pilotes inclus. Les 680 pages restent
en revue, sans migration automatique du jeu.

Chaque atlas PNG transparent mesure 384 x 384 pixels : 4 colonnes et 4 lignes
de cellules 96 x 96, indice zero en haut a gauche. L'appui des pieds est a 90.

| Cellules | Mouvement |
| --- | --- |
| 0-3 | Repos |
| 4-7 | Course |
| 8-11 | Lancer |
| 12 | Garde |
| 13 | Impact |
| 14-15 | Celebration |

La charge reutilise les poses 8, 12, 9, 12. Les timings viennent de `CLIPS`
dans `src/sprites.mjs`, commun au jeu et a la galerie. Les personnages regardent
a droite, avec miroir pour la gauche ; ce lot n'ajoute pas de vues de dos.
Le dessin source est adapte au format sans etirement independant des axes.

## Echelle Sur Le Terrain

Le template et les PNG restent inchanges. Le constructeur derive une
`calibration` des seize rectangles peints dans les rapports de decoupage :
hauteur mediane des quatre poses de repos, largeur au repos et enveloppe
maximale des animations. Les marges transparentes ne comptent pas comme du corps.
Un chapeau ou une corne fait partie de la silhouette graphique, pas d'une
nouvelle mesure anatomique ; cette normalisation reste une approximation visuelle.

`src/sprite-sizing.mjs` combine cette calibration avec la taille renseignee
par le resolveur partage `data/athlete-measurements.mjs` (profil, reference
documentee, puis taille d'adaptation Kalistar). La plage de presentation est
bornee a **100..300 cm**, puis comprimee en **70..154 pixels monde** pour garder
les petits lisibles : `70 + (cm - 100) * 0.42`. Les vraies mensurations ne
sont jamais reecrites. Une taille inconnue ou une longueur de queue prend un
gabarit neutre de 180 cm, sans le faire passer pour une mesure. Les 368 identites
actuelles sont renseignees. Simone a une taille d'adaptation de 900 cm, non
canonique, ramenee au gabarit geant de 300 cm sur le terrain. Les valeurs
documentees et les estimations restent distinguees dans la fiche.

Une echelle uniforme et constante sur les seize poses limite aussi la largeur
a 96 pixels au repos / 144 en action et la hauteur totale a 174 pixels.
Les silhouettes larges peuvent donc etre davantage comprimees. Les gestes
peuvent depasser la case, mais ne changent jamais la case occupee. Aucun bras
n'est etire, aucune pose ne fait varier la taille du corps.

L'appui reste a `(48,90)`. Le zoom de camera s'applique ensuite a toute la scene,
sans agrandir independamment un personnage. Le ballon porte, ses departs et
arrivees de passe, la penalite au-dessus de la tete et la zone de selection
suivent les nouvelles dimensions. Les anneaux d'equipe gardent leur taille
commune pour lire la grille. Il n'y a aucun effet sur les statistiques,
collisions, portees ou sauvegardes. Galerie et vignettes du vestiaire conservent
le zoom du template pour inspecter le dessin, pas une echelle de comparaison.

Pour un nouvel atlas, le constructeur calcule cette calibration automatiquement.
Verifier sa pose de repos et ses mensurations, puis le comparer en match a un
petit et a un grand personnage. Ne pas compenser un mauvais dessin par une
deformation X/Y ou une echelle differente a chaque frame.

## Catalogue Et Stockage

`data/sprite-library.json` est la source de metadonnees distribuable.
`src/sprite-library.mjs` la valide sans DOM et fournit une lecture immuable.

| Champ | Usage |
| --- | --- |
| `schemaVersion`, `packId` | Version de contrat et identite du lot |
| `template` | Grille, cellule, appui et identifiant du template |
| `entries[].id` | Identifiant stable de l'apparence sprite |
| `characterId` | Identite existante du personnage, commune a ses variantes |
| `modelId` | Modele exact de carte ayant servi de reference |
| `spriteKey` | Nom technique du fichier dans ce lot |
| `name`, `race`, `faction` | Libelles de consultation, non utilises comme cles |
| `file` | Chemin relatif de l'atlas public |
| `width`, `height`, `bytes`, `sha256` | Dimensions et integrite du media |
| `scale` | Ancien multiplicateur, conserve seulement pour les catalogues sans calibration |
| `calibration` | Hauteur de repos et enveloppes peintes, derives du rapport de l'atlas |

Exemple de resolution explicite :

```js
import { createSpriteLibrary } from './src/sprite-library.mjs';
const library = createSpriteLibrary(await (await fetch('./data/sprite-library.json')).json());
const riko = library.forModel('49903201');
const appearances = library.forCharacter('riko-kalistar');
```

`forModel()` ne remplace pas silencieusement une variante manquante par une
autre carte. Il retourne `null` si son modele exact n'a pas de sprite.
`get(id)` retrouve une apparence ; `forCharacter()` retourne ses variantes.

Les fichiers PNG vont dans le stockage de medias, pas en base64 dans une base
joueur. Aucune migration Supabase n'est necessaire pour ce catalogue commun.
Une future table de preferences pourra referencer l'`id` du sprite, avec une
validation des droits separee, sans recopier les images ou les statistiques.
Ce lot n'accorde aucun personnage et ne change pas les droits de collection.

## Ajouter Un Personnage

1. Identifier son `characterId` et son `modelId` dans les profils existants.
   Lire sa carte et son illustration approuvee. Conserver ses couleurs et
   attributs propres, sans inventer une autre identite pour remplir une cellule.
2. Actualiser `sources/sprites-v3/production.json` avec
   `node V4/astraball/tools/sprite-production.cjs inventory`.
   Ajouter sa consigne individuelle dans `sources/sprites-v3/subjects.json`.
   Generer le PNG separement avec le template
   Kaylis du lot 1 et l'illustration du personnage comme references visuelles.
   Conserver le prompt commun et l'identite dans le registre de production.
3. Executer `node V4/astraball/tools/sprite-production.cjs record <spriteKey> <PNG-genere>`.
   La source est copiee sous `sources/sprites-v3/` sans ecrasement, puis decoupee.
   Sharp utilise les dependances Node du poste ou `KALISTAR_NODE_MODULES`.
4. Verifier le personnage en mouvement dans la galerie et la nettete au zoom
   natif, puis executer `sprite-production.cjs accept <spriteKey>`.
   Le constructeur `node V4/astraball/tools/build-sprite-library.cjs` ne publie
   que les etats `ready` et les lots historiques. Les etats `pending`,
   `generated` et `review` ne deviennent jamais de faux personnages disponibles.
   `repack <spriteKey>` permet de reprendre un decoupage non publie, sans changer
   le PNG source ; toute entree deja au registre de medias est protegee.
   Ne pas remplacer d'anciennes empreintes pour cacher une modification.
5. Sauvegarder les sources hors checkout, ajouter explicitement le nouvel
   atlas a `runtime-files.json` et au registre `runtime-media.json`, puis lancer
   les suites natives, navigateur et publication. Ne pas ajouter de PNG a Git.

Pour une revision d'apparence deja publiee, creer un nouvel identifiant et un
nouveau fichier versionne. Ne pas ecraser l'ancien media sous son identifiant.
Les changements de statistiques ou d'equipe relavent du moteur, hors de ce guide.

## Validation

```sh
node --test V4/astraball/tests/sprite-library.test.cjs V4/astraball/tests/sprite-library.native.test.cjs
node V4/astraball/tests/sprite-library.browser.test.cjs
```

Le test navigateur lance un serveur local ephemere, ferme en fin de test.
`KALISTAR_DIST` cible le build fige ; `KALISTAR_SPRITE_LIBRARY_URL` permet de
tester un serveur deja ouvert si aucun build fige n'est indique. Les captures vont sous
`work/astraball-sprites-v2/qa/`, ou `KALISTAR_VERIFICATION_DIR`.
Les controles couvrent l'identite, les chemins, les hashes, la transparence,
l'alignement, les animations, les filtres, le zoom, les ecrans et Reduced Motion.
Les sources, prompts et mesures de ce lot sont decrits dans
[sprites-v2](sources/sprites-v2/README.md) et [sprites-v3](sources/sprites-v3/README.md).
