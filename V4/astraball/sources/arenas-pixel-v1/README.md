# Arenes Pixel v1

Sources de production des 19 fonds cosmetiques : quartier et officiel pour
les huit villes de l'atlas et Zarok, plus l'Astrium. Le contrat de rendu,
les cameras et le calage par image restent dans [ARENAS.md](../../ARENAS.md)
et [venues.mjs](../../data/venues.mjs). Ce dossier source n'est pas un repertoire
de medias a servir au joueur.

## Provenance

- [prompts.json](prompts.json) : lot final, avec `id`, prompt, reference et
  chemin PNG source absolu. Les references de ville viennent du
  [registre approuve](../../../map/city-portraits.json) ; Zarok reprend le
  [terrain Rhinoz](../rhinoz-v1/README.md).
- [revisions.json](revisions.json) : consignes et sources des retouches.
  Les fonds doivent rester sans personnages ni public, sans drapeaux generiques,
  sans buts ou lignes peints. Les gradins gardent une echelle coherente ;
  l'Astrium ne montre que ses gradins autour du terrain.
- [provenance.json](provenance.json) : prompts, references, sources, copies,
  exports, dimensions, tailles et SHA-256. Pour l'Astrium, `ref: null` et
  `reference: null` sont intentionnels : ne pas inventer une reference de ville.
- [preview.html](preview.html) : apercu des miniatures avec acces aux fonds.

## Export

Depuis la racine du checkout actif, avec Node.js et Sharp :

```sh
node V4/astraball/sources/arenas-pixel-v1/prepare.cjs
node V4/astraball/sources/arenas-pixel-v1/prepare-flags.cjs
```

`KALISTAR_NODE_MODULES` peut designer le dossier des dependances ; sans cette
variable, les scripts utilisent le runtime Codex configure sur ce poste.
Ces commandes ne generent pas d'illustrations et ne publient rien.

[prepare.cjs](prepare.cjs) exige un PNG de ratio exact 3:2, conserve ses octets
dans `originals/<id>.png`, puis exporte sans recadrage ni etirement :

- `V4/astraball/assets/arenas-pixel-v1/<id>.webp` : 1536 x 1024.
- `V4/astraball/assets/arenas-pixel-v1/<id>-small.webp` : 384 x 256.
- Sharp : `fit: inside`, filtre `nearest`, WebP qualite 90, effort 6.

Les scripts preparent et controlent leurs destinations avant ecriture,
refusent de remplacer des octets differents et relisent les copies. Ne pas
effacer une source ou modifier un hash pour contourner ce refus.

## Sauvegarde

Destination exterieure au checkout :
`C:/Users/guill/Documents/Kalistar-sauvegardes/astraball-arenas-pixel-v1/`.
Son acces en ecriture peut demander une autorisation elevee.

- `originals/<id>.png` : copies exactes des sources.
- `prompts.json`, `provenance.json` : metadonnees du lot exporte.
- `flags/<cityId>.png`, `flags/flags.json` : drapeaux et manifeste associe.

Les binaires restent sur le PC et dans cette sauvegarde, sans ajout force
dans Git. Les deux exporteurs ne changent ni les listes runtime ni la version
du jeu.

## Drapeaux

[prepare-flags.cjs](prepare-flags.cjs) copie sans transformation les PNG
`packed/banks` designes par le [manifeste Atelier](../../../atelier/designer-assets/manifest.json).
[flags.json](flags.json) consigne le mapping, la carte de reference, les chemins,
dimensions, tailles et hashes source/public/sauvegarde.

Les sorties sont `assets/arena-flags-v1/<cityId>.png`, relatives a Astraball :
`durane` -> Durane, `woodland` -> Woodland, `arborium` -> Arborium,
`vulkar` -> Vulkar, `cryptown` -> Cryptown, `thalassea` -> Thalassea,
`zarok` -> Zarok. RHINOZ est une race, pas la faction de ce mapping.
Kalistopolis, Velane et l'Astrium restent sans drapeau de faction etabli.
Les deux bannieres Pixi utilisent ces copies distinctes du fond, sans substitut
generique ni dessin SVG.

## Version Artistique

`arenas-pixel-v1` identifie ce lot artistique et ses chemins de medias, pas
une version du jeu ou un schema de sauvegarde. `arena-flags-v1` identifie
separement les copies de drapeaux. Pour une revision ulterieure, conserver
sources et provenance precedentes et definir explicitement les nouveaux
identifiants ou chemins ; ne pas ecraser silencieusement ce lot.

Ce README decrit les sources et leur preparation. Il ne constitue ni un
rapport de QA, ni une approbation artistique, ni une annonce de publication.
