# Arenes Pixel Astraball

## Perimetre

[data/venues.mjs](data/venues.mjs) exporte `PIXEL_ARENAS` : 19 nouvelles
variantes cosmetiques, soit un terrain de quartier (`street`) et un stade
(`official`) pour chacune des huit villes de l'atlas et pour Zarok, puis
l'Astrium (`legendary`) a Kalistopolis. Zarok est le village Rhinoz deja
represente dans Astraball, pas une neuvieme ville ajoutee a l'atlas.

Les noms sportifs, surfaces, materiaux des U et amenagements sont des
propositions originales pour Astraball, pas des lieux retrouves dans le recit.
Le nom Astrium et sa localisation viennent de la demande de ce lot ; sa
qualification legendaire reste visuelle, sans histoire ni pouvoir inventes.
`region` est un repere descriptif, pas une nouvelle division politique.

Ces variantes ne changent aucune regle, statistique, probabilite, collision,
position de depart, IA, recompense ou sauvegarde. Le terrain logique reste
13 x 7 et chaque camp garde ses trois cibles U. Aucune surface ne ralentit,
aucun materiau ne renforce un but, aucun stade ne donne un avantage local.
Les arenes historiques `resonances` et `rhinoz` ne sont pas remplacees ici.

Les 19 fonds doivent rester vides : aucun joueur, passant ou public, y compris
dans les gradins. Les sportifs et les elements interactifs appartiennent au
moteur. Les gradins gardent une echelle et une lecture coherentes entre stades,
avec les materiaux propres a chaque ville ; Zarok conserve une echelle communale.
L'Astrium est une enceinte de gradins uniquement autour du sol de jeu, sans
ville, sanctuaire ou palais ajoute dans le decor, et sans spectateurs.

## Sources

- [Registre des huit portraits approuves](../map/city-portraits.json) : choix
  explicites de revisions, sources PNG et empreintes des exports WebP.
- [DA des maps](../map/DIRECTION_ARTISTIQUE.md), sections villes et portraits :
  geographie et architecture. La gravure sepia de l'atlas n'est pas le style
  pictural des portraits, ni une obligation de palette pour les arenes pixel.
- [Textes et descriptions de l'atlas du site](../site/map-view.js) : graphie
  des villes, situation, monuments et descriptions des portraits courants.
- [Terrain Rhinoz existant](sources/rhinoz-v1/README.md) et
  [consignes retenues v2](sources/rhinoz-v1/prompts-v2.json) : Zarok, reference
  principale [Lanio](../../V3/assets/illustrations/21_NONE_LANIO.png), appui
  [Belrog](../../V3/assets/illustrations/19_MINERO_BELROG.png), arrivee a Zarok
  dans [le recit local](../site/story-content.json). Les essais Rhinoz v1 ne
  remplacent pas ces consignes.

Les liens ci-dessous designent les exports complets approuves ; leurs apercus
`-small.webp` correspondent aux memes revisions. Ne pas choisir automatiquement
le dernier fichier d'un dossier de propositions.

| Ville | Portrait approuve | Reperes a conserver dans l'art |
| --- | --- | --- |
| Durane | [02](../site/assets/map/portraits/durane-02.webp) | Cite contre le rebord du grand cratere minier, Obelisque de Fer, terrasses rocheuses, rails et passerelles industriels. Pas de cratere de lave. |
| WoodLand | [07](../site/assets/map/portraits/woodland-07.webp) | Graphie WoodLand, terre des Cerelf a droite du lac en coeur ; sanctuaire entre les deux bois feuillus d'un arbre immense, architecture vegetale, passerelles et cascades. Pas de simple copie de Velane. |
| Kalistopolis | [03](../site/assets/map/portraits/kalistopolis-03.webp) | Cite-sanctuaire sur le sommet solitaire de l'ile centrale, au-dessus de l'ocean et des nuages ; fleche centrale droite, architecture claire et terrasses. |
| Arborium | [11](../site/assets/map/portraits/arborium-11.webp) | Dome colossal nervure contenant les quartiers forestiers et un palais-laboratoire botanique central, serres et jardins de recherche. Pas seulement une petite serre ou une cabane. |
| Velane | [01](../site/assets/map/portraits/velane-01.webp) | Village accueillant principalement humain, cabanes de bois nichees dans les arbres, passerelles, lanternes et lisiere nord-ouest de la grande foret. Pas de palais Cerelf. |
| Vulkar | [12](../site/assets/map/portraits/vulkar-12.webp) | Interieur d'un cratere isole, couronne rocheuse, palais et quartiers sur corniches de basalte, lac noir et lave interieure. Aucun sommet derriere la couronne, aucune coulee venue d'un autre volcan. |
| Cryptown | [03](../site/assets/map/portraits/cryptown-03.webp) | Royaume Skullz en cimetiere geant, necropole enfoncee dans le gouffre insulaire, grande croix, tombes, galeries et brume. Pas de lave ni de vortex marin. |
| Thalassea | [13](../site/assets/map/portraits/thalassea-13.webp) | Cite sous bulle au fond de la mer, anneau d'iles et de recifs, capteurs et jet vertical. Tout l'exterieur est immerge : fonds rocheux sous les ponts, jamais de bassins a l'air libre ni de cascades exterieures. Canaux possibles seulement dans la bulle. |
| Zarok | [Rhinoz horizontal v2](assets/rhinoz-horizontal-v2.webp) et [isometrique v2](assets/rhinoz-isometric-v2.webp) | Village accroche a la roche, bois massif, cordages, passerelles, eau conduite, ardoise, lanternes, sable compact. Pas de dunes, palais desertique, colonnades monumentales ou emblemes Rhinoz inventes. |

Pour Thalassea, les deux terrains proposes sont au sec dans la bulle ; le decor
exterieur reste sous-marin. Pour Zarok, la version officielle conserve une
echelle communale et des tribunes modestes. L'Astrium reste localise a
Kalistopolis, mais sa generation finale n'utilise pas le portrait de la ville :
`ref: null` et `reference: null` sont intentionnels. Ne pas lui inventer une
reference ni reintroduire une silhouette urbaine derriere les gradins.

## Provenance

Les [prompts finaux](sources/arenas-pixel-v1/prompts.json),
[revisions](sources/arenas-pixel-v1/revisions.json) et
[provenance des exports](sources/arenas-pixel-v1/provenance.json) conservent
sources, references, dimensions et SHA-256. [prepare.cjs](sources/arenas-pixel-v1/prepare.cjs)
copie les PNG sans modification, refuse un ratio autre que 3:2 et exporte les
WebP 1536 x 1024 et miniatures 384 x 256 sans recadrage ni etirement.
L'[apercu](sources/arenas-pixel-v1/preview.html) sert a l'inspection des images.

Le [manifeste des drapeaux](sources/arenas-pixel-v1/flags.json) et
[leur exporteur](sources/arenas-pixel-v1/prepare-flags.cjs) tracent les copies
exactes des PNG Atelier verrouilles. Les sauvegardes restent hors checkout,
dans `C:/Users/guill/Documents/Kalistar-sauvegardes/astraball-arenas-pixel-v1/`,
avec les drapeaux sous `flags/`. Ces registres ne valent pas validation du rendu.

## Catalogue

Dans chaque ligne, les identifiants sont `<cityId>-street` et
`<cityId>-official`. `astrium` est la seule exception et reste rattache a
`cityId: 'kalistopolis'`. Les graphies affichees proviennent du site.

| cityId | Terrain de quartier | Stade officiel | U quartier | U officiel |
| --- | --- | --- | --- | --- |
| durane | Cour des ateliers | Stade de l'Obelisque | bois | blanc |
| woodland | Cour des passerelles | Stade des deux bois | bois | blanc |
| kalistopolis | Cour des hauteurs | Stade du sanctuaire | pierre | blanc |
| arborium | Cour des serres | Stade du dome | bois | blanc |
| velane | Clairiere des cabanes | Stade de la lisiere | bois | blanc |
| vulkar | Cour du basalte | Stade du cratere | fer | blanc |
| cryptown | Cour des caveaux | Stade du gouffre | pierre | blanc |
| thalassea | Cour des nacres | Stade de la bulle | ivoire | blanc |
| zarok | Cour des cordages | Stade de Zarok | bois | blanc |

L'Astrium utilise des U blancs et une surface de pierre claire mate. Les
couleurs sont des choix de rendu, pas des couleurs de faction canoniques.

## Contrat Courant

Le module ESM n'importe rien, ne charge aucune image et ne touche ni DOM,
stockage, reseau ni moteur. Le tableau exporte, chaque entree et chaque tableau
`ground` sont geles. [appearance.mjs](src/appearance.mjs) ajoute ces 19 entrees
aux deux arenes classiques et normalise la vue selon l'arene choisie.

- Identite : `id`, `cityId`, `city`, `kind`, `name`, `region`, `surface`.
- U : `goalMaterial` parmi `wood`, `iron`, `bronze`, `stone`, `ivory`, `white` ;
  `goalColor` est un entier RGB 24 bits. Pour tous les `official` et l'Astrium,
  les valeurs finales sont `goalMaterial: 'white'` et `goalColor: 0xffffff`.
  Les materiaux de quartier restent distincts, sans changement des cibles.
- Image : `pixel: true`, `horizontal: assets/arenas-pixel-v1/<id>.webp` et
  `preview: assets/arenas-pixel-v1/<id>-small.webp`, relatifs a Astraball.
- Calage par asset : `ground` vient de l'entree correspondante dans
  [venues.mjs](data/venues.mjs), avec `inset` et `nearInset` pour les bords
  eloigne et proche, sur le canevas 1536 x 1024. Ces valeurs sont la reference :
  ne pas restaurer un rectangle commun ni etirer l'image pour l'y faire entrer.
- Marquages : `whiteLines: true` et `lines: 0xffffff` pour `official` et
  `legendary` ; `whiteLines: false` et `lines: 0xf2eee2` (blanc casse) pour
  `street`. Le false ne demande pas de supprimer tous les traits.
- Camera : `views: ['horizontal']` pour les 19 nouvelles arenes, donc HD-2D
  seulement. Le champ `isometric` reste un alias technique de l'image, pas une
  vue disponible. Les classiques `resonances` et `rhinoz` conservent HD-2D et
  leur vraie vue isometrique.
- Zoom uniforme : le decor, le terrain, les drapeaux et les sprites suivent
  la meme echelle X/Y de scene. Les fonds pixel restent entiers, sans compression
  verticale du sol ni deformation de l'architecture par le reglage de hauteur.

Les lignes, la grille et les U doivent rester des elements du moteur alignes
avec les cases interactives, pas des marques generees dans le fond. Garder
la surface de jeu vide et lisible, les constructions et tribunes hors sol
jouable, sans objets, personnages ou effets masquant les cibles.

## Drapeaux

Le champ `flag` fournit `assets/arena-flags-v1/<cityId>.png` pour Durane,
WoodLand, Arborium, Vulkar, Cryptown, Thalassea et Zarok. Les cles de faction
sont les memes noms, sauf WoodLand qui correspond a `Woodland`. Zarok est la
faction ; RHINOZ est la race. Les sources exactes figurent dans le manifeste.

Le renderer pose deux bannieres Pixi par arene de ces villes, distinctes de
l'image de fond, avec le PNG verrouille sans embleme generique redessine.
Kalistopolis, Velane et l'Astrium restent neutres : `flag: null`, aucune banniere
de faction ni substitution par un autre drapeau. Cela concerne 14 nouvelles
arenes avec drapeau et cinq sans. La couche est purement decorative.

## QA A Faire

Ce document decrit le contrat courant, pas un rapport de tests ni une annonce
de publication. Les resultats de QA et le statut de livraison restent a
consigner par le parent ; aucune validation globale n'est revendiquee ici.

- Verifier chaque image contre ses references reelles et les contraintes
  ci-dessus : 19 fonds sans public, gradins coherents, Astrium limite aux
  gradins et sans reference ville inventee.
- Verifier dimensions, nettete pixel, decodage des 19 WebP, provenance et
  empreintes ; ne pas substituer les anciennes propositions aux references.
- Verifier alignement sol/clic/grille/U avec le calage propre a chaque asset,
  zoom uniforme, U officiels blancs et deux bannieres exactes seulement pour
  les villes mappees. Verifier HD-2D seul pour le lot pixel et isometrie conservee
  pour les deux classiques.
- Verifier le vestiaire, le chargement et son echec, le retour aux arenes
  historiques, les sauvegardes et le reload sans modification du gameplay.
- Examiner desktop, mobile et ecran etroit : noms, lisibilite des sprites,
  contrastes des lignes et U, aucun masquage par le decor ou l'interface.

Un controle structurel du catalogue ne remplace aucune de ces verifications.
