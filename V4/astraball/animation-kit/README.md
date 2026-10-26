# Sprite V2 : Contrat D'Animation

Ce contrat remplace la methode de production, pas encore les medias jouables.
Les repertoires historiques sprites-v1/v2/v3 sont des **lots**, tous au vieux
format 96 px. Ils ne sont pas cette nouvelle generation `kalistar-actor-v2`.
Les anciens atlas, les sauvegardes et Astraball restent inchanges tant que les
nouveaux dessins ne sont pas controles et valides. Les etudes ne sont pas des
atlas prets a publier.

## Une Echelle Native

- Cellule **320 x 320 px**, origine immuable **(160, 272)**, marge de 4 px.
- **64 pixels par metre** pour tous les personnages, sans facteur individuel.
  La taille graphique est fixee a la fabrication, pas calculee au rendu.
- Gabarit borne entre 1 et 3 m pour le jeu : 64 a 192 pixels anatomiques.
  Taille reelle conservee dans le profil. Kaylis 164 cm = 105 px, Lanio 182 cm
  = 116 px, Gen 159 cm = 102 px, Taulio 218 cm = 140 px.
- Mesure anatomique de la plante au sommet du crane. Cheveux, cornes, chapeau,
  mains levees et armes ne sont pas inclus dans cette mesure.
- **4 pages de 1280 x 1280**, chacune 4 x 4 cellules, soit 64 frames.
  Chargement par page, pas une immense texture depassant les limites mobiles.
- Meme grille native, alpha binaire, maximum 128 couleurs par frame. Aucun
  etirement, filtrage lisse, rotation ou zoom du corps pour inventer une pose.
  Seul le zoom commun de la camera peut redimensionner toute la scene.
- Dessins en place ; le moteur deplace la racine dans le monde. Le saut est
  dessine au-dessus de cette racine : ne jamais recoller les pieds au sol par
  analyse automatique de la boite englobante.

Un personnage large n'est pas reduit automatiquement. Revoir son dessin et son
cadrage, en conservant sa densite de pixels. Un masque vide est preferable a
une arme incrustee. Une source incorrecte est refusee, pas "reparee" par une
normalisation silencieuse.

## Vraies Sequences

| Animation | Frames | Comportement |
| --- | --- | --- |
| Idle | 0-3 | 4 dessins, respiration en boucle, appuis fixes |
| Run | 4-9 | 6 dessins, contacts/passage opposes, boucle |
| Jump | 10-15 | anticipation, impulsion, montee, sommet, descente, reception |
| Win | 16-19 | 4 dessins de celebration en boucle |
| Push | 20-23 | 4 dessins, preparation, extension, appui, retour |
| Crouch | 24-27 | descente puis position basse maintenue |
| Block | 28-31 | mise en garde puis protection aux mains maintenue |
| Hit | 32-35 | impact leger, recul puis stabilisation |
| Fall | 36-39 | perte d'equilibre non mortelle, derniere pose maintenue |
| Rise | 40-43 | releve volontaire, independant de la chute |
| Throw | 44-47 | lancer sportif, ballon externe |
| Physical | 48-53 | 6 dessins propres a la famille d'arme |
| Magic | 54-59 | 6 dessins d'incantation, aucun effet incorpore |
| Death | 60-63 | effondrement definitif ; derniere frame immobile |

Les durees sont explicites par frame. Ce ne sont pas des poses uniques animees
par translations CSS. Une boucle doit raccorder son dernier dessin au premier.
Une sequence non bouclee maintient sa derniere frame ; le consommateur decide
quand passer a une autre sequence. **La mort ne declenche jamais Rise**.
Astraball ne doit pas appeler Death, Physical ou Magic : ces animations sont
des ressources futures, sans nouveau degat, skill ou statistique.
Pas d'"ultime" universelle arbitraire : plus tard, ajouter une sequence specifique
au personnage, avec anticipation/liberation/recuperation et effets separes.

## Gestes Et Armes Separees

Chaque apparence reference le **modelId exact** de la carte, et pas uniquement
le characterId : une variante Poing ne reutilise pas automatiquement un Katana.
L'inventaire cree un brouillon par modele, a partir du catalogue actuel.
Les familles initiales sont estoc, coupe, katana, arme lourde, hampe, flexible,
arc, arme a feu, projectile, sceptre/baton, livre, orbe, instrument et poing.
Leur attribution est une proposition de travail a relire avec l'illustration,
notamment pour les deux armes, pistolets/fusils et instruments precis.

Le corps est dessine **mains vides**. Katana : les deux prises suivent le meme
axe ; fouet : le bras et le poignet fouettent, pas de laniere peinte ; livre :
main secondaire sous le livre absent ; orbe : paumes ouvertes autour du volume
vide ; sceptre : prise fermee et geste adapte a la hampe absente.

Chaque frame porte quatre reperes saisis et verifies : `mainHand`, `offHand`,
`head`, `chest`, avec x/y natifs, angle et plan `behind`/`front`. Les mains sont
anatomiques, jamais echangees par le miroir. La matrice de `socketTransform`
retourne la transformation complete de l'accessoire autour de la racine.
La main secondaire sert de contrainte de prise, pas de seconde arme automatique.
Une arme a deux mains incompatible avec ces points doit etre adaptee comme
asset ; ne pas etirer les bras pour la faire rentrer.

Ordre : accessoires arriere, corps, accessoires avant, **masque avant des
doigts**. Ce dernier reprend des pixels exacts de la page corps, a la meme
position, pour que la poignee disparaisse vraiment sous les doigts. Les mains
ne doivent pas sembler collees derriere une arme. Arme, VFX, ombre, ballon et
hitboxes restent des objets separes. Les evenements `contact`, `release`,
`takeoff`, `land`, `recover` sont des marqueurs visuels, jamais une autorite
automatique sur les regles du jeu.

## Production Et Verification

Depuis la racine du depot :

```sh
node V4/astraball/tools/sprite-template-v2.cjs inventory
node V4/astraball/tools/sprite-template-v2.cjs serve 4350
node --test V4/astraball/tests/sprite-template-v2.test.mjs
```

L'URL `http://127.0.0.1:4350/?view=motion&clip=run` ouvre directement la
course de l'etude Kaylis ; la lecture reste volontairement en pause au depart.
Le test `sprite-template-v2.browser.test.cjs` utilise les sources d'etude
locales de `work/astraball-v2/` et un profil navigateur jetable. Il n'est pas
un test du site publie. Les tests de contrat et de pixels sont independants
des illustrations d'etude et ne remplacent pas leur validation artistique.

L'atelier local montre les gabarits et les etudes, puis exporte un manifeste
de travail. `guides <manifest.json>` cree les quatre pages transparentes et
leurs guides, sans ecraser une revision. `audit <page.png>` controle les pixels.
`validate <manifest.json> --ready` controle identite, tailles, cellules,
temporalite, reperes, hashes, masques et les validations manuelles.
Il ne certifie pas automatiquement la beaute, le style ou l'anatomie.

Tous les brouillons sont `draft`/`pending`, avec reperes inconnus a `null`,
jamais inventes depuis une silhouette. La publication exige les 4 pages corps,
4 masques de mains, 64 frames renseignees et les revues art/pixel/anatomie/prises,
mouvement (`motion`) et ancrage (`anchors`). Les copies exactes d'un dessin ne
peuvent pas remplir un clip ; Run exige six dessins differents. Cette regle
ne prouve PAS qu'ils forment un cycle juste. Les variations de couleur ou de
cheveux ne remplacent pas l'alternance des appuis. Verifier a vitesse normale
et image par image, avec raccord dernier/premier dessin et axe fixe visible.
Une generation brute n'est pas une page native. Le 26 octobre, l'utilisateur
a autorise une conversion unique a la fabrication, avec nettoyage de palette
et calibration explicite. Cela ne valide pas automatiquement ses poses ou ses
ancrages. Les sources restent conservees avec leur provenance. Aucun faux
remplacement des apparences actuellement jouables.

## Lot Local De Dix Personnages

Ouvrir `http://127.0.0.1:4350/batch.html` apres la commande `serve` ci-dessus.
La galerie presente Kaylis, Momo, Balmhyr, Gen, Lanio, Taulio, Voloden, Rikka,
Cana et General Barok. Elle charge leurs 14 animations, permet la lecture
image par image, le miroir et l'export des quatre pages et du manifeste.
La grille compare les corps a l'echelle native 1. Le zoom entier de la vue
detail est uniquement une loupe d'inspection, jamais un facteur d'acteur.

Les medias locaux sont sous `work/astraball-v2/ten-characters/`, hors medias
de production et sans migration de sauvegarde :

- `production.json` : modele exact, reference, prompts, sources et SHA-256 ;
- `calibration.json` : mesure cranienne estimee et ordre des dessins par source ;
- `library.json` : selection de la derniere revision convertie de chaque acteur ;
- `<characterId>/source-<page>-r<n>.png` : source originale conservee intacte ;
- `<characterId>/native-r<n>/` : quatre pages corps, `actor.json`, `authoring.json` ;
- `qa/` : audit des 640 frames, contacts et captures ordinateur/mobile.

`sprite-v2-production.cjs record <id> <page> <PNG> [prompt]` conserve une nouvelle
source sans ecraser l'ancienne. Mettre ensuite a jour sa recette de calibration
apres lecture visuelle. La recette doit nommer exactement la source courante.
`sprite-v2-bake.cjs bake <id>` cree une nouvelle revision native : un seul facteur
uniforme par page source, commun a ses seize poses, nearest-neighbour, alpha
binaire et une palette partagee de 127 couleurs opaques maximum pour l'acteur.
Aucun facteur par frame, deformation X/Y ou grossissement individuel au runtime.
Les debordements ne sont pas masques : une silhouette coupee au bord de sa
source est refusee et doit etre regeneree.

L'ancrage propose par le convertisseur utilise la zone du torse, et des
positions explicites pour le saut et les corps couches. Il reste **provisoire** :
les estimations craniennes, appuis et transitions doivent etre controles en
mouvement. Il n'invente ni points de main ni masque de doigts. Les reperes
anatomiques definitifs restent `null` et les revues restent `false`, sauf
`pixelGrid` apres controle des pixels. Le statut est `review`, jamais `ready`.

### Accessoires Sous Les Pieds

Si des patins ou un autre accessoire depassent sous la semelle anatomique,
la recette peut porter `soleInsetPx`, mesure entiere explicite dans le dessin
`referenceFrame`. La taille source est `height - crownInsetPx - soleInsetPx`.
L'absence du champ vaut zero et conserve la calibration precedente. Une
valeur `null`, negative, non entiere ou absorbant toute la hauteur est refusee.
Consigner l'observation et son incertitude ; ne pas inventer un inset cranien
pour compenser les roues. Le meme facteur s'applique aux seize poses, sans
changer la densite native ni le runtime. `soleOffset` est conserve dans chaque
page d'authoring. Ce n'est pas un decalage de racine : le materiel peut toucher
le sol et porter la semelle plus haut. Le crownY nominal presume des semelles
au sol et ne certifie pas la position reelle d'un acteur sur patins.

### Origines Sources Explicites

Le placement automatique de revue cale le bas de la silhouette au sol sauf
pour les trois poses aeriennes du saut. Il ne prouve donc pas les appuis
d'une course et ne conserve pas automatiquement sa suspension. Ne pas
valider un galop ou une course sur ce seul placement.

Une page de `worker.json` peut maintenant porter `sourceOrigins` :
`schemaVersion: 1`, `sourceSha256` identique au PNG selectionne,
`coordinateSpace: "source-pixels"`, `method: "manual"`,
`review: "proposed"`, une `note` expliquant les mesures et exactement
16 `points`. Chaque point contient uniquement `x`, `y` et
`grounded` (booleen propose, jamais deduit de la boite englobante).

Les coordonnees sont des pixels entiers dans l'image source complete,
pas dans le rectangle detoure ni dans l'atlas natif. Un point correspond
au dessin dans l'ordre source du scanner, avant application de `order`.
Le point represente la racine au sol du dessin : pour une pose suspendue,
il peut se trouver dans l'espace transparent sous les pieds.

Le convertisseur aligne ce point sur (160,272), avec le meme facteur
anatomique que les quinze autres dessins de la page. Aucun facteur
individuel, deformation ou deplacement au runtime. Les limites de cellule
restent bloquantes. La provenance conserve les points, leur mode propose
et les bornes natives ; elle ne cree ni socket ni masque de doigts.

Sans ces mesures explicites, les pixels conservent le placement automatique
historique. Aucune revision existante n'est reecrite ou approuvee. La saisie
doit s'appuyer sur des reperes visuels et une lecture des appuis, pas sur
des hauteurs arbitraires destinees a donner artificiellement du mouvement.
La revue `anchors` et la revue `motion` restent obligatoires dans les deux cas.

### Placement Avec Phases Explicites

Lorsque la racine n'est pas directement observable (par exemple en suspension),
ne pas inventer un point mesure. Le champ optionnel `authoredPlacement` separe
les observations des choix d'animation. Il est exclusif de `sourceOrigins`.
Le module pur `tools/sprite-v2-placement.cjs` valide puis resout ce contrat :

- `source` lie le SHA-256, largeur, hauteur, numero de page et permutation
  `order` au scan reel ; une source ou un ordre obsolete est refuse.
- `observations.frames` contient les 16 pelvis et contacts de semelle saisis
  dans les pixels sources, avec incertitude et statut `proposed`. Un contact
  peut etre inconnu (`null`), jamais une coordonnee inventee hors image.
- `preset.frames` choisit explicitement contact ou suspension dans l'ordre
  de sortie. La politique horizontale aligne le pelvis ; elle ne verrouille
  pas automatiquement un pied et ne corrige pas les dessins de course.
- Une phase de suspension utilise une trajectoire constante ou parabolique
  explicite. Sa hauteur de reference est la mediane pelvis/semelle de poses
  de contact choisies, pas la hauteur totale d'une silhouette accroupie.

La solution garde le facteur commun de la page, les limites natives strictes
et des translations entieres uniquement. Elle consigne `virtualOrigin`, une
origine affine derivee **non utilisee pour echantillonner l'image** : elle peut
etre hors source sans pretendre etre une mesure. Les choix de phase et les
solutions restent `authored-proposal`. Ni sockets, ni masque, ni approbation
manuelle ne sont produits. L'import controle les reperes sur les pixels avant
d'ecrire la passation ; le bake les controle a nouveau. Sans ce champ, le
placement existant reste inchange. Aucun personnage n'est migre en masse.

```sh
node V4/astraball/tools/sprite-v2-bake.cjs bake kaylis
node V4/astraball/tools/sprite-v2-review.cjs
node --test V4/astraball/tests/sprite-template-v2.test.mjs V4/astraball/tests/sprite-template-v2.native.test.cjs V4/astraball/tests/sprite-v2-bake.native.test.cjs
node V4/astraball/tests/sprite-v2-batch.browser.test.cjs
```

L'audit du lot verifie les 40 pages, les hashes, 640 cellules non vides, les
six dessins distincts de chaque course et la grille commune. Il ne transforme
pas une difference de pixels en preuve de mouvement juste. Les points de
prise, masques et revues de mouvement restent obligatoires avant integration
dans un jeu. `validate --ready` refuse ce lot tant qu'ils ne sont pas renseignes.

## Production Du Catalogue Complet

`sprite-v2-catalog.cjs init` prepare le registre reprenable dans
`work/astraball-v2/full-catalog/`. Il selectionne une apparence principale exacte
par `characterId`, issue du registre de production existant. Les autres
`modelIds` sont conserves comme variantes, mais ne recoivent jamais un faux
alias vers une arme ou une tenue differente. Les dix pilotes restent a leur
chemin d'origine. Une empreinte du plan empeche de changer silencieusement le
perimetre pendant une production longue.

Chaque producteur possede uniquement `jobs/<characterId>/` : quatre sources,
prompts et references, mesures explicites dans `worker.json`, puis revisions
natives. `import <characterId>` verifie cette passation et fabrique uniquement
ce dossier. Des personnages distincts peuvent donc avancer en parallele sans
reecrire le meme registre. Le coordinateur seul lance `refresh` pour reunir
les resultats. Une source incomplete reste en attente ; elle n'est pas un
personnage anime disponible.

```sh
node V4/astraball/tools/sprite-v2-catalog.cjs init
node V4/astraball/tools/sprite-v2-catalog.cjs import <characterId>
node V4/astraball/tools/sprite-v2-catalog.cjs refresh
node V4/astraball/tools/sprite-v2-catalog.cjs audit
node V4/astraball/tools/sprite-v2-catalog.cjs contact <characterId> run
```

La galerie `http://127.0.0.1:4350/batch.html?catalog=all` lit ce registre local.
Elle indique le nombre reel de personnages convertis sur le total prevu,
avec recherche et filtre de faction. Elle charge au plus douze personnages
sur ordinateur, six sur smartphone, et uniquement leur page d'animation
active. Les textures des autres pages ne sont pas retenues par le lecteur.
Les PNG restent des fichiers medias ; aucune image ni brouillon n'est ajoute
a la base joueur. Ce catalogue conserve le statut `review` et ne remplace pas
le catalogue sportif ou les sprites publies.

L'import refuse les sequences statiques et les six frames de course
identiques, sans assimiler une difference de pixels a une bonne animation.
Une reprise echouee reste relancable et conserve la derniere revision native.
Les sources selectionnees dans la passation sont explicites ; une ancienne
tentative conservee ne doit jamais remplacer silencieusement le choix courant.
`contact` produit une bande de frames au zoom natif pour examiner les phases.

La palette est quantifiee en une seule fois pour les quatre pages, sans
dithering. La profondeur PNG peut arrondir le nombre de couleurs demande a
256 entrees. Si le quantificateur depasse 127 couleurs opaques, le convertisseur
fusionne successivement les paires au cout RGB pondere le plus faible afin de
reserver l'entree transparente : limite maintenue a 127 couleurs opaques.
La correspondance est globale et deterministe, consignee dans `authoring.json`, et ne modifie ni
l'alpha binaire, ni les positions, ni la geometrie des dessins. Les anciennes
revisions natives restent intactes.

### Palette Independante Du Placement

Les nouvelles conversions utilisent `canonical-glyphs-v1` : les 64 dessins
deja calibres sont quantifies dans une grille canonique fixe, avant leur
placement autour de la racine. Deplacer une pose ne doit donc changer ni ses
couleurs ni celles d'une autre animation. Le test de bake compare les 64
rectangles RGBA et les hashes des pages non deplacees sur une source riche.
Une palette deja conforme reste intacte. La provenance precise la methode,
la grille de quantification et les fusions, sans approuver les mouvements.

Le mode explicite `bake(id, { out, paletteMode: 'legacy-placed-v1' })` est
conserve pour reproduire les preuves historiques, pas pour les nouvelles
productions. Aucun ancien PNG, pilote ou rapport n'est reconverti en place.
Un changement de source peut toujours modifier la palette partagee ; seul
un changement de placement a glyphes identiques doit etre neutre en couleur.

## Migration Du Jeu

1. Valider visuellement un pilote complet, puis petit/moyen/geant au meme zoom.
2. Redessiner et verifier les sequences de chaque apparence necessaire.
3. Publier des identifiants V2 et medias versionnes, sans ecraser les V1.
4. Brancher explicitement un lecteur V2 commun aux jeux, avec echelle locale 1,
   pages/cellules/reperes du contrat. Garder la lecture V1 des anciennes saves.
5. Adapter Astraball : Idle/Run/Throw/Push/Hit/Win/Block uniquement. Les autres
   clips restent disponibles pour les futurs mini-jeux sans changer les regles.

Le contrat et l'atelier sont implementes. La production est arretee a la
demande de l'auteur a 170 identites, dix pilotes inclus : 680 pages et
10 880 frames natives. Les 368 entrees du plan restent un inventaire, pas une
autorisation de reprendre automatiquement. Le point de reprise local est
`work/astraball-v2/full-catalog/stop-at-170.json`.

Le lot reste `review` : les controles techniques ne certifient ni les gestes,
ni la lateralite, ni les reperes anatomiques. Des defauts de course, de prises
d'armes et de pinces/mains sont documentes dans les dossiers des personnages.
La migration du moteur reste conditionnee a leur validation artistique et
aux prises/reperes complets. Aucun atlas V2 de ce lot n'est distribue au jeu.

Un changement explicite de taille invalide la reutilisation du dernier bake,
meme si les sources n'ont pas change. L'import compare aussi le modele et les
familles d'animation ; il cree une revision native sans ecraser les precedentes.
Malaba est ainsi passe de 191 a 205 cm : 131 pixels anatomiques a 64 px/m,
reconvertis depuis les sources, sans mise a l'echelle individuelle au runtime V2.
