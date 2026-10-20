# Direction artistique des maps Kalistar

Reference de travail etablie le 11 octobre 2026 a la demande de l'auteur.
Cette direction concerne les cartes geographiques d'Astralia ; elle ne
remplace pas la direction des illustrations de personnages.

## References visuelles a ouvrir

| Domaine | Reference | Ce qu'il faut conserver |
| --- | --- | --- |
| Trait et matiere de base | [Map 1.0](kalistar-map-1.0.png) | Gravure sepia fine, contours nets, parchemin vieilli, mer hachuree. |
| Architecture de Kalistopolis | [Map 1.1](kalistar-map-1.1.png) | Fleche centrale droite, contreforts symetriques, entree et marches ; silhouette initiale propre. |
| Echelle des villes | [Map 1.5](kalistar-map-1.5.png) | Petits monuments lisibles avec nom en dessous ; ne dominent pas leur region. |
| Forets | [Map 1.7](kalistar-map-1.7.png) | Canopes gravees, masses irregulieres, clairieres, teinte olive patinee. |
| Bras de mer | [Map 1.8](kalistar-map-1.8.png) | Rivages continus, contours cotiers et hachures qui prolongent la mer existante. |
| Desert et biomes du continent oriental | [Map 1.10](kalistar-map-1.10.png) | Reliefs plus fins, bassins fluviaux, lac, plaines ouvertes et petites forets espacees. |

La geometrie courante se lit dans `versions.json`. Les references ci-dessus
servent chacune a leur domaine : ne pas restaurer une ancienne geographie
en utilisant une ancienne image comme reference de style.
La map 1.0 est la reference permanente de nettete du trait et de matiere :
une perte de detail dans une iteration ne devient pas une nouvelle DA.
Les versions suivantes sont des propositions successives de l'auteur ;
leurs empreintes sont conservees dans le registre.

## Matiere, palette et dessin

- Vue de planisphere a plat, format panoramique 2:1.
- Parchemin chaud, vieilli et nuance, avec fibres et usure discretes.
- Encre brune/terre d'ombre fine et irreguliere, comme une gravure a la plume.
- Terres ocre clair ; mers gris-brun attenue, hachurees ; glace ivoire/gris froid.
- Biomes en lavis translucides : desert ocre pale, foret olive/gris mousse
  desature. Le grain du papier et l'encre restent visibles sous la couleur.
- Pas de nouvelle dominante vive, de vert sature ou de bleu ocean moderne.
- Hierarchie du trait : cote identifiable, relief fin, navigation plus legere,
  noms courts et lisibles. Ne pas epaissir tout le dessin a chaque retouche.

## Grammaire du terrain

Montagnes : petites cretes gravees suivant une chaine identifiable, avec
contreforts et vallees. Laisser des plaines entre les reliefs pour eviter
un tapis uniforme de montagnes.

Forets : groupes de petites canopes, limites naturelles, densites variees,
clairieres et cours d'eau. Les forets suivent bassins et pentes ; les sommets
restent distincts. Les touches olive signalent le biome sans former un aplat.

Deserts : espaces ouverts, quelques dunes, oueds secs, mesas et reliefs
rocheux espaces. Transition progressive vers terres ouvertes puis forets.
Ne pas remplir toute zone vide de details.

Affinement demande apres 1.9 : privilegier des details geographiques petits
et naturels, des fleuves et estuaires, plutot que des rochers picturaux
massifs. Sur le continent oriental, limiter les forets a quelques poches
espacees et laisser de larges plaines ouvertes. Cette decision ne supprime
pas la grande foret occidentale voulue precedemment par l'auteur.

Cotes et mer : cote continue, caps et baies organiques, contours marins fins
et hachures raccordees. En ajoutant de la terre, effacer les anciens traits
marins ; en ajoutant de l'eau, effacer les anciens arbres et reliefs terrestres.
Le nouveau terrain doit repondre aux formes environnantes.

Cratere : sillon oblique se terminant par un bassin fracture, cicatrice
ancienne cartographiee avec les memes traits que le relief.

Gouffre insulaire (demande du 12 octobre 2026, map 1.26) : ile rocheuse avec
un vaste abime central, falaises interieures et gradins descendant vers un
fond invisible brun-charbon. Pas de lave ni de vortex marin ; la profondeur
vient des hachures et des ombres, sans transformer le centre en aplat noir.

## Villes et textes

Une ville est un petit monument iconique dessine a l'encre, avec le nom
dessous en serif ancien legerement italique. Pas de cadre ni de cartouche.
Une nouvelle ville doit utiliser un repere du recit verifie.
Une demande directe de l'auteur peut aussi definir un nouveau repere : Velane,
village de cabanes principalement humain, est represente par un arbre avec
une cabane en bois (12 octobre 2026). Icone et nom sur calques independants.
Durane utilise l'Obelisque de Fer. Arborium utilise un petit dome nervure
dans la clairiere de la grande foret occidentale, demande directement
par l'auteur le 12 octobre 2026. Kalistopolis garde la silhouette propre
de 1.1, reduite a l'echelle discrete de 1.5. Verifier que les monuments
restent droits, nets et que les noms gardent leur orthographe.
Vulkar est defini par l'auteur comme un embleme de volcan au centre des trois
volcans du plateau du feu (12 octobre 2026). Icone et nom restent independants.
Cryptown est un royaume Skullz sous forme de cimetiere geant, defini par
l'auteur le 12 octobre 2026. Une croix funeraire et quelques tombes forment
son embleme independant sur la bordure de l'ile au gouffre central (map 1.27).

WoodLand est la terre des Cerelf, placee par l'auteur le 13 octobre 2026 a
droite d'un lac en forme de coeur dans la pointe forestiere occidentale.
Reference fournie : cite arboricole avec architecture vegetale, passerelles
et cascades. Traduire cette architecture en petit embleme grave sepia, pas en
scene photographique ni en cristal bleu lumineux. Le nom conserve la graphie
WoodLand. Terrain, ombre, filet, embleme et nom restent independants dans la
version 1.30. L'auteur valide le rendu et demande sa publication sur le site
le 14 octobre 2026. Les six autres villes et le terrain hors masque restent
identiques ; les versions precedentes sont conservees.

Thalassea est definie par l'auteur le 15 octobre 2026 : cite sous-marine
abritee dans une bulle au fond de la mer, au centre d'un anneau d'iles arrondi.
Une petite cite gravee sepia dans une sphere represente la ville, sans ajouter
de terre centrale, de scene sous-marine moderne ou de bleu lumineux.
Terrain, embleme, ombre, filet serre et nom restent independants (map 1.33).

Lisibilite (13 octobre 2026, map 1.29) : en interface, conserver le terrain
separe des emblemes. Taille minimale en pixels ecran, limites de proximite,
filet parchemin serre et ombre portee pour detacher les silhouettes sans badge.
Les noms ne diminuent pas avec l'atlas ; sur petit ecran, afficher celui de la
ville selectionnee et cadrer sa region. Garder la geometrie et le trait d'origine.

## Vues de villes dans les fiches

Les huit vues validees le 20 octobre 2026 sont repertoriees dans
`city-portraits.json`, avec les empreintes des PNG et des deux exports WebP.
Elles gardent la peinture narrative Kalistar, distincte de la gravure de l'atlas.
Durane 02, WoodLand 07, Kalistopolis 03, Arborium 11, Velane 01, Vulkar 12,
Cryptown 03 et Thalassea 04 sont les choix approuves, pas la derniere image
d'un dossier prise automatiquement. Arborium possede un dome colossal, des
quartiers forestiers et un palais-laboratoire botanique central. La vue Vulkar
est a l'interieur d'un cratere isole : aucun sommet derriere sa couronne, aucune
coulee provenant d'un autre volcan. Terrain, icones et noms restent inchanges.

`prepare-city-portraits.cjs` verifie les sources, exporte sans retouche graphique
et sauvegarde les originaux hors checkout. Les petits apercus ne chargent qu'a
l'ouverture d'une fiche et les vues detaillees au clic. Ne pas remplacer un PNG
valide ou regenerer l'atlas pour changer une illustration de ville.

## Methode de retouche

Depuis 1.15, separer le terrain et les villes : fond sans monuments ni noms,
icones PNG transparentes et noms editables dans un PSD a calques. Ne pas
regenerer la carte pour deplacer une ville. Sources dans `layers-1.15/`.
Le fond conserve de la foret sous Arborium. Toute correction du terrain
reste une nouvelle version, sans ecraser les anciens fonds.

Depuis le test 1.16, privilegier la generation d'un recadrage avec contexte,
puis l'integration sur un calque PSD a masque editable. Conserver le fond
initial, les villes et une preuve de comparaison des pixels hors masque.
L'identite hors zone vient du compositing controle, pas du generateur.

1. Ouvrir la derniere map et les references du domaine concerne.
2. Identifier la zone exacte et le role de chaque image fournie au generateur.
3. Decrire une modification locale, l'integration au terrain et les formes
   a conserver : pas de rectangle peint, halo flou, bord de collage ou traces
   fantomes des anciens reliefs.
4. Regarder le resultat entier puis les zones touchees et les villes.
   Comparer le trait a 1.0 pour reperer toute derive de nettete ou de couleur.
5. Enregistrer une nouvelle version, les prompts exacts et les references.
   Conserver les precedentes et verifier leurs empreintes.

L'outil utilise pour ces retouches est image_gen integre. Une retouche
generative ne garantit pas l'identite pixel a pixel hors de la zone cible ;
les fichiers de reference restent donc conserves separement.
La version du jeu et la version des maps sont independantes.
