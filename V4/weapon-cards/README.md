# Cartes d'armes collectionnables

## Production actuelle : scenes peintes et anneaux individuels

Le lot initial a ete publie en 4.5.2. La revision 4.5.3 remplace les montages
de fond par une peinture en situation propre a chaque arme et des anneaux
personnalises. Les sections historiques plus bas documentent la progression
du prototype ; elles ne priment pas sur cette revision.

Source de presentation : `site/weapon-art.js`. Chaque entree declare la cle
stable `key` de l'equipement, une `scene` opaque, un `body` transparent,
un `rim` transparent et une `color` d'accent. Les anciens champs `cutout`
restent dans les definitions pour preserver les snapshots existants ; le
renderer les remplace uniquement visuellement par la scene du manifeste.

Pour ajouter une arme avec cette presentation :

1. Declarer son effet et ses restrictions dans `weapons.js`, puis ses tests
   moteur, sans modifier la famille imprimee sur le personnage.
2. Generer separement son objet detoure, sa peinture en situation et son
   anneau creux. Referencer seulement CET objet dans la peinture, jamais
   une autre arme pour la DA. Decor proche et sobre, lame/manche bien droits.
3. Ajouter son entree versionnee dans `weapon-art.js`. Conserver sa cle de
   snapshot lors de revisions ulterieures ; changer les noms des images.
4. Placer les PNG dans `sources/`. L'anneau doit avoir un centre transparent
   et rester circulaire. Le build conserve le canevas natif 488 x 488 et
   l'ancrage (244,242) ; l'objet central reste independant de sa rotation.
5. Executer build-assets, tests weapon-art/equipment, parcours navigateur
   puis export. Verifier les cartes au format normal et en duel sur PC/phone.

Prompts actifs : `scene-prompts-2026-10-04.json`. Preuves :
`../revisions/2026-10-04-weapon-scenes/`. Aucune regle de bonus n'est dans le
manifeste graphique. Les sources HD et essais rejetes ne sont pas servis par Pages.

## Famille Dans Le Bandeau (6 Octobre 2026)

La zone `family` du master HTML affiche le pictogramme blanc de la famille
a droite du titre, sans badge ni cercle supplementaire. Le titre et le motif
ont deux zones non superposees, calibrees sur le meme cadre natif. Le motif
provient de `base-weapons.js`, identique a celui des personnages et du Codex.
Son texte alternatif et son infobulle nomment la famille. Le pied de carte
garde seulement les porteurs/origines, sans repeter la famille en toutes lettres.

Projectile utilise une etoile de lancer blanche ajouree avec deux courtes
trainees. Source et preuve optique : `../revisions/2026-10-06-weapon-families/`.
Les PNG/PSD et cadres natifs restent inchanges, ainsi que les 19 autres icones.

## Historique du prototype

### Ajout Arborium Du 5 Octobre 2026

ARM-026 L'Accord Sylvestre et ARM-027 Le Cran de Ronce partagent exactement
le master bleu/cuivre, les textes vivants et l'ancrage natif existants.
Leur premiere restriction SOLDAT + Arborium est ensuite remplacee, sur demande
utilisateur, par Arborium seule. Les anciens rapports restent des constats dates.

Chaque objet possede trois sources independantes : detourage, scene peinte
sobre et anneau creux. L'arc en bois precieux a deux cordes et des nervures
vert fluorescent. La dague droite montre un petit bouton et un cran au fil.
Les cercles personnalises reprennent bois/cuivre ou acier/cuivre avec une
energie verte discrete. Seul l'anneau tourne ; l'objet reste droit et lisible.
Les scenes sont reculees pour conserver les extremites des armes sans les
courber ni remplir le decor de details inutiles.

Sources : `sources/arborium-*.png`. Prompts exacts, references et essai rejete :
`arborium-prompts-2026-10-05.json`. Le build existant produit les huit WebP,
enregistre leurs empreintes et ne change aucun cadre ni aucune carte native.
Preuves et cartes assemblees : `../revisions/2026-10-05-arborium-weapons/`.

### Ajout Draevenheim Du 5 Octobre 2026

ARM-028 Les Ailes du Rempart est une longue lance noire, cuivre et rouge,
inspiree de `Illustrations/City_Guards_Orven_07.png`. Deux lames articulees
en forme d'ailes de chauve-souris sont representees deployees sous sa pointe.
ARM-029 L'Arbalete Ecarlate est une grande arbalete de metal noir avec finitions
rouges et un carreau rouge. Toutes deux sont exclusives a la faction Draevenheim,
sans restriction de Job ; aucune carte native de personnage n'est retouchee.

Six nouvelles sources : deux objets detoures, deux scenes peintes et deux
anneaux creux. L'anneau de lance reprend les segments ailes/charniere ; celui
de l'arbalete les poulies et fleches gravees. Leur centre est transparent,
l'objet ne tourne pas avec la couronne. Meme canevas 488, meme ancrage valide.
La premiere scene de lance cadrait trop serre ; la version v2 recule le sujet
pour conserver hampe, pointe et ailes dans le master sans deformer l'arme.

Prompts integres et references : `draevenheim-prompts-2026-10-05.json`.
Sources selectionnees : `sources/draevenheim-*.png`. Le build existant ajoute
huit derives WebP et leurs hashes sans changer les anciens assets. Preuves
de cartes et de combat : `../revisions/2026-10-05-faction-weapons/`.

La demande du 3 octobre 2026 remplace les panneaux d'armes par de vraies cartes
poker horizontales. Les deux premieres sont la Hache du Roi Dechu et la Flute
des Petits Bonheurs. Ce lot reste local : pas de commit, tag ou push demande.

## Un master commun, des couches independantes

Le master de production est le composant HTML `site/weapon-cards.js` et son CSS.
Le PNG fourni est conserve intact dans `sources/blue-copper-template-v1.png`.
Il n'est jamais regenere avec une illustration ou du texte.

Le composant assemble six couches depuis la meme calibration :

1. Cadre bleu/cuivre fourni, derive WebP lossless.
2. Illustration de l'arme dans la fenetre de gauche.
3. Nom blanc en Times New Roman, comme les noms des cartes personnages.
4. Recit court avec la famille manuscrite Story, activation doree et porteurs.
5. Bonus dans la plaque violette, lu dans la vraie definition de l'effet.
6. Medaillon HTML independant utilisant `KalistarEquipmentFX.markup` et ses
   propres images, anneaux, radar, survol, focus et Reduced Motion.

Le medaillon ne fait pas partie du PNG du cadre ni de l'illustration. Le meme
design continue a fonctionner sur les personnages dans le deck et l'arene.
Le bonus de la carte d'arme est dans sa plaque violette ; sa languette n'est
donc pas dupliquee sous le medaillon dans l'arsenal.

`layout` est l'unique calibration : coordonnees dans la source 1482 x 1061,
recadrage de sa marge noire, zones de texte, polygone d'illustration et ratio
7:5. L'habillage s'adapte a ce format poker ; le medaillon conserve un cercle
reel et l'illustration conserve ses proportions. Aucun positionnement ne
depend d'une resolution d'ecran. Le PC propose six cartes par ligne sur toute
la largeur, la tablette trois, le telephone une colonne. Les niveaux
typographiques dependent de la largeur de la carte ; les miniatures ouvrent
toujours une fiche agrandie.

### Ajustements du master v2

Le medaillon est en haut a gauche, avec l'ancrage fourni par l'utilisateur
(left 0,315789 %, top -0,117904 %, largeur 19,298246 %). Le titre laisse la
place a ce cercle. Le bonus est recentre verticalement dans la plaque violette.
Activation devient un cartouche sur la traverse separant les deux textes.

Le bloc Activation distingue la condition (cle doree) de la consequence
(epee ATK ou bouclier DEF, vert clair). Les deux textes sont alignes a gauche ;
la duree/consommation reste sous l'effet. Bonus et conditions sont toujours
derives des donnees moteur, sans regle supplementaire. Les captures et controles
de cette lecture sont dans `../revisions/2026-10-03-collectible-weapons/qa-activation/`.

Un logement au format de carte personnage occupe le coin inferieur droit.
Vide, il montre un plus ; equipe, il affiche la carte du porteur. Son bouton
est independant du bouton de consultation pour eviter les boutons imbriques.
Il ouvre directement le choix de porteur compatible. Le profil conserve ses
characterId existants : la miniature represente la premiere version compatible
du personnage, sans inventer une affectation a une edition specifique.
Les noms de porteurs autorises restent dans le cartouche inferieur.

Le selecteur a cote d'Armes filtre par equipement, bonus ou famille. Le premier
prototype avait deux objets ; l'extension locale suivante en a 25 et les tests
de six colonnes emploient maintenant les vraies definitions, sans clones DOM.
Captures et parcours d'attribution/reload : `../revisions/2026-10-03-collectible-weapons/qa-refinement/`.

### Layout v3 : porteur en bas a gauche (8 octobre 2026)

Le logement du porteur quitte le coin droit pour le bas gauche de
l'illustration : `holder: [90,746,131,204]`. Ses dimensions et son altitude
restent identiques. Le bouton d'attribution reutilise la meme zone, y compris
le minimum tactile sur telephone. La plaque du bonus reste degagee.

Le cartouche des noms utilise toute la largeur du panneau droit :
`bearers: [858,846,512,92]`. Personnages, jobs, factions et races gardent le
meme centrage horizontal, aligne sur le panneau de description.
Le raster du cadre, les illustrations et les medaillons ne changent pas ;
aucun PNG natif ne doit etre regenere pour cette revision HTML.

Validation : `site/equipment-presentation.test.cjs` et
`site/equipment-holder.browser.test.cjs`. Preuves sous
`revisions/2026-10-08-equipment-holder/qa/`.

## Sources de verite

- `site/weapons.js` : ID stable, nom, famille, restrictions et effet moteur.
- `site/weapon-cards.js`, objet `faces` : metadonnees des deux premieres cartes,
  completees par `collectible` dans les nouvelles definitions de `weapons.js`.
  Numero de collection, illustration, recit court et alt sont lus au meme endroit.
- Les noms des porteurs sont resolus depuis leurs `characterId` dans le
  catalogue courant. Une restriction Job affiche le Job dans le cartouche.
- L'activation courte est derivee du trigger et du bonus moteur. La fiche
  conserve aussi la condition exacte et le lore integral de `weapons.js`.
- `sources/`, `prompts.json`, `media-provenance.json` : originaux, prompts
  reellement envoyes, references, dimensions et empreintes des derives.

Le recit court est une accroche imprimee propre a la carte ; il ne remplace
pas le recit integral. Le renderer ne modifie jamais les regles. Les definitions
et visuels anciens restent disponibles pour les matchs sauvegardes.

## Ajouter une arme

1. Creer la definition moteur selon `../docs/ARMES_EQUIPEES.md`, avec un nouvel
   ID stable. Tester son effet et ses restrictions avant de la proposer.
2. Ajouter `collectible: {number, illustration, flavour, alt, cutout: true}`
   dans la definition : numero ARM unique, nom du WebP versionne, phrase
   narrative courte (50 caracteres maximum ; viser 30-40), texte alt.
3. Produire uniquement l'illustration. Fournir le design exact de l'objet et
   Momo/Valazar comme references de peinture. Garder l'objet entier, detoure
   sur fond transparent, avec une marge. Lame et manche restent droits :
   dezoomer ou orienter l'objet en diagonale, jamais le courber pour le cadrage.
   Aucun titre, cadre ou chiffre dans l'image generee.
4. Conserver son original PNG dans `sources/`, sous le meme basename que le
   WebP declare. Conserver le vrai prompt et ses references dans `prompts.json`.
5. Utiliser `art: '<id>-v1'` et une source de meme nom. Le build derive la
   grande illustration et le petit objet pour le medaillon depuis CE meme PNG.
   `visual` choisit seulement l'anneau existant (pierre ou energie). La carte
   collectionnable appelle le meme renderer, sans en creer une copie.
6. Lancer le build d'assets, les controles de lecture et l'export ci-dessous.
   Si un texte deborde, l'ajuster editorialement ou reviser le master commun ;
   ne pas deplacer individuellement les zones ou masquer du texte.

```powershell
node V4/weapon-cards/build-assets.cjs
node V4/site/weapon-cards.browser.test.cjs
node V4/weapon-cards/export.cjs
```

Les commandes navigateur utilisent le serveur local a `127.0.0.1:4304`.
`KALISTAR_URL` permet de choisir un autre port. Elles ouvrent un contexte
jetable avec IndexedDB isole, sans toucher a la collection personnelle.

`build-assets.cjs` parcourt les definitions reelles, verifie les metadonnees,
convertit les sources et enregistre les hashes. Les assets distribues sont
dans `site/assets/weapon-cards/` et `site/assets/equipment/`; les sources HD
restent hors du site construit. Pour un detourage, le grand objet est contenu
dans la fenetre (jamais coupe) et le petit tient dans 240 x 240 px, centre en
(244,242) sur le canevas natif 488 x 488. Le contour reste dans un rayon de
171 px. Le cadre utilisateur et les anciens medaillons restent inchanges.
Les outils reutilisent Sharp et Playwright du runtime local, avec l'override
`KALISTAR_NODE_MODULES` utilise ailleurs dans Kalistar.

`export.cjs` utilise exactement le renderer du jeu pour produire les faces
1400 x 1000 px, 400 ppp, soit 88,9 x 63,5 mm. Les sorties sont dans `exports/`
avec leur manifeste. Ce sont des apercus numeriques RVB, pas un master CMJN
avec fond perdu. Les textes demeurent editables dans les donnees du master.

Le choix HTML comme master garde la carte vivante et evite de dupliquer ses
textes et regles dans un PSD. Un futur export PSD peut consommer ces memes
zones et sources ; il ne doit pas devenir une seconde source de verite.

## Verification de ce lot

18 tests d'equipement/presentation et le parcours navigateur d'armes complet :
equipement, remplacement, desequipement, profil/reload, vrais bonus Hache et
Flute, combat adverse, challenger, zoom, Reduced Motion et nettoyage.

Le controle de cartes verifie la geometrie du poker, le cercle non deforme,
les images chargees, les textes dans leurs zones et le recit integral en fiche
sur 1920, 1440, 412 et 320 px. Captures et resultats :
`../revisions/2026-10-03-collectible-weapons/qa/`.

## Extension 25 Armes

23 illustrations transparentes produites avec l'outil de generation d'images
integre, puis derivees localement avec Sharp. Les prompts exacts et chemins
des generations sont dans `arsenal-2026-10-03-prompts.json` ; les originaux
preserves sont dans `sources/<id>-v1.png`. Empreintes dans `media-provenance.json`.

ARM-003 a ARM-025 utilisent `collectible.cutout`. Leur fond d'illustration
recouvre le cercle anciennement imprime au milieu du template fourni, sans
modifier ce template. Un seul medaillon demeure visible, en haut a gauche.
Les 25 exports partagent le master, les cartes n'ont pas de variantes CSS
individuelles. Les tests controlent leurs textes a six tailles d'ecran et au
format export 1400 x 1000.

Voir [le bilan du lot](../revisions/2026-10-03-weapons-arsenal/README.md) pour
les armes, les activations, les tests et les limites restantes. Local uniquement.

## Decors Narratifs Separables

Les 23 objets detoures ont desormais un decor derriere eux. La Hache et la
Flute conservent leurs illustrations de scene deja approuvees, sans double fond.
Le tableau `backgrounds` de `site/weapon-cards.js` associe chaque ID d'arme
a un WebP sous `assets/weapon-cards/backgrounds/`. Cette association est une
donnee de presentation, pas une definition moteur ou un element du snapshot.

`background-sources.json` relie les 14 decors a leurs sources : sept nouvelles
peintures et sept scenes d'arene existantes. Les prompts des nouvelles images,
references de DA et chemins des generations sont conserves dans
`background-prompts-2026-10-03.json`. Sources generees : `sources/backgrounds/`.
Le build encode les derives sans toucher aux sources, aux detourages ou aux
medaillons. Il enregistre tous les hashes dans `media-provenance.json`.

Dans la fenetre de gauche, le decor est une image decorative (`alt` vide),
avec `object-fit:cover`, sous l'objet conserve en `contain`. Le meme polygone
decoupe les deux couches. Le contraste attenue concerne uniquement le fond.
SOCOM, PSG1 et le masque utilisent un fond plus clair pour separer leur
silhouette sombre. Ni mouvement ni Canvas supplementaire. Le medaillon
independant ne recoit jamais ce fond.

Pour ajouter un decor : conserver une source distincte, ajouter son entree
dans `background-sources.json` et son affectation dans `backgrounds`, puis
relancer build-assets et export. Plusieurs armes du meme univers peuvent
partager un lieu ; les decors ne doivent pas contenir une deuxieme arme.

Tests specifiques : `site/weapon-backgrounds.test.cjs` et
`site/weapon-backgrounds.browser.test.cjs`. Bilan et captures dans
`../revisions/2026-10-03-weapon-backgrounds/`. Toujours local.

## Lot Cryptown - 6 octobre 2026

ARM-030 a ARM-032 reprennent les armes des illustrations approuvees
`V4/Illustrations/Cryptown_Varkhen_01.png`, `Cryptown_Nereth_01.png` et
`Cryptown_Draust_01.png`. Epee longue droite a garde cuivree et coeur violet,
fusil gothique a longue lunette et crosse ajouree, fleau-lanterne a crane
contenant un cristal violet. Le fleau represente un des deux objets portes
par Draust, sans ajouter de mecanique de double attaque.

Chaque arme possede un detourage, une scene peinte et un anneau independant.
Les dix appels de generation integree, leurs references et leurs sorties
sont traces dans `cryptown-prompts-2026-10-06.json`. Neuf sources sont
retenues : l'epee utilise la scene v2, car sa pointe et son pommeau etaient
tronques par la fenetre du cadre avec la v1. La v1 rejetee n'est pas servie.
Les tableaux de presentation restent dans `site/weapon-art.js`.

Les scenes comportent peu d'accessoires : marches du rempart, poste de
veille, seuil de pierre. La priorite est la silhouette entiere de l'objet,
pas le remplissage du decor. Chaque anneau reprend sa matiere propre :
garde angulaire, monture de lunette, chaines et cristal du fleau.

Le build existant encode les 12 WebP et conserve leurs empreintes dans
`media-provenance.json`. Aucun cadre, PNG/PSD de personnage, verrou,
crop natif ou ancrage du medaillon n'a ete modifie. Voir les captures et
tests dans `../revisions/2026-10-06-cryptown-weapons/`.

## Hache Rhinoz - 6 octobre 2026

ARM-033, La Corne des Anciens : la forme de corne definit le tranchant,
avec acier gris ivoire, embase cuirassee, manche droit et cuivre use.
La scene evoque un passage montagneux, dans la famille picturale de Belrog
et de Momo. L'anneau independant reprend les plaques et les reliefs de corne.

Detourage retenu : `sources/rhinoz-ancestral-horn-v2.png` ; scene et anneau :
`rhinoz-ancestral-horn-scene-v1.png` et `rhinoz-ancestral-horn-ring-v1.png`.
La premiere silhouette en croissant a ete ecartee pour rendre la corne
plus caracteristique. Prompts reels et chemins des quatre appels integres :
`rhinoz-prompts-2026-10-06.json`. Quatre WebP distribues par le build existant.
Le cadre, les cartes des trois personnages et les ancres restent inchanges.
