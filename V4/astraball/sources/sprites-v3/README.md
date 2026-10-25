# Production Du Catalogue

Le registre `production.json` inventorie les identites canoniques du catalogue
reel de jeu, pas seulement les lignes brutes des exports. Une seule apparence
est choisie par `characterId` ; `modelIds` garde la liste de ses variantes.
Les collaborations sont incluses. Les cartes natives ne sont pas modifiees.

## Etat

Utiliser `node V4/astraball/tools/sprite-production.cjs status` depuis la racine.
Le registre distingue les sprites historiques (`existing`), les personnages
a produire (`pending`), les PNG enregistres (`generated`), les atlas a regarder
(`review`) et les atlas controles visuellement (`ready`).
La presence d'une entree en attente ne signifie pas que son image existe.
Les echecs du generateur sont consignes dans `generation-issues.json` : ces
personnages restent `pending` et absents du catalogue de sprites disponible.
Le journal conserve le message recu, sans en deduire une cause non fournie.

## Sources

Generation avec le generateur integre `image_gen`, fond transparent.
Image 1 : `sources/sprites-v1/kaylis.png`, gabarit des seize mouvements.
Image 2 : l'illustration canonique indiquee par `reference`.
La consigne associe `commonPrompt` a l'identite individuelle de `subjects.json`.
Les anatomies particulieres prennent priorite sur les deux jambes du gabarit,
par exemple la queue de Ruby et son deplacement nage.

Les sources PNG sont conservees ici, les atlas 384 x 384 dans
`assets/sprites-v3/`. Chaque `<id>.atlas.json` conserve les empreintes de la
reference, du PNG genere et de l'atlas, ainsi que les seize decoupages.
Le packer utilise une seule echelle, le plus proche voisin et l'alpha reel
apres reduction pour aligner les appuis. Il ne redessine pas les personnages.
La route historique v2 reste identique.

## Integration

Le constructeur de bibliotheque ajoute uniquement les entrees validees.
Le catalogue distribue, les vignettes du vestiaire et les textures du terrain
pointent tous vers les memes atlas. Les sprites ne definissent aucune statistique.
Les PNG restent hors Git ; le registre public SHA-256 et les metadonnees sont
versionnes. Avant publication, sauvegarder les sources hors checkout, actualiser
le registre de medias et executer les controles du guide [SPRITES](../../SPRITES.md).
