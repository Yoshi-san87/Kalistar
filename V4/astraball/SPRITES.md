# Bibliotheque De Sprites

[Guide Astraball](README.md) | [Index du projet](../../docs/INDEX.md)

La bibliotheque est un catalogue de medias, pas un inventaire joueur.
Elle fournit vingt personnages supplementaires. Le vestiaire les propose avec
les dix personnages d'origine via `src/roster.mjs`, sans attribuer de statistiques
propres aux apparences ni modifier une sauvegarde existante. Une nouvelle equipe
enregistre l'identifiant d'apparence dans chaque joueur ; les statistiques restent
celles du poste. Une identite ne peut figurer deux fois dans le meme camp.
Les dix sprites du prototype restent independants et inchanges.

## Consulter

Ouvrir `/jeu/astraball/library.html` depuis le serveur Astraball ou le site
construit. La galerie permet de consulter chaque animation, de mettre en
pause, de retourner le personnage, de zoomer et de telecharger son atlas.
Reduced Motion suspend les animations au depart ; la lecture reste volontaire.
Seuls les personnages visibles sont animes et la page cachee suspend le rendu.

## Template Commun

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
| `scale` | Echelle de presentation utilisee sur le terrain et dans le vestiaire |

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
2. Ajouter une entree a `sources/sprites-v2/prompts.json` avec les references
   et la consigne individuelle. Generer le PNG separement avec le template
   Kaylis du lot 1 et l'illustration du personnage comme references visuelles.
   Conserver la source sous `sources/sprites-v2/<spriteKey>.png` et sa provenance.
3. Executer `node V4/astraball/tools/prepare-sprites-v2.cjs <spriteKey>` depuis
   la racine, puis `node V4/astraball/tools/build-sprite-library.cjs`.
   Sharp utilise les dependances Node du poste ou `KALISTAR_NODE_MODULES`.
4. Verifier le personnage en mouvement dans la galerie et la nettete au zoom
   natif. Mettre a jour l'attente de taille du lot dans son test si le lot est
   volontairement etendu ; ne pas remplacer d'anciennes empreintes pour cacher
   une modification. Une autre carte du meme personnage garde son propre modele.
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
[sprites-v2](sources/sprites-v2/README.md).
