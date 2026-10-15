# Maps Kalistar

Versionnement des cartes du monde, defini par l'auteur le 11 octobre 2026.
Ces numeros sont independants de la version du jeu.

Lire [la direction artistique et ses references](DIRECTION_ARTISTIQUE.md)
avant les prochaines retouches : trait, parchemin, villes, biomes et cotes.

Publication active : [map 1.33](layers-1.33/kalistar-map-1.33-preview.png),
livraison jeu 4.6.68. Huit villes selectionnables, dont Thalassea dans sa bulle
sous-marine, au centre d'un anneau d'iles. Le mur et sa porte barrent les
montagnes du nord-ouest. Terrain et emblemes restent independants.
Sources, prompts et export runtime : [layers-1.33](layers-1.33/PUBLICATION.md).
Les retouches du cratere 1.34/1.35 sont des propositions locales non publiees.

| Version | Fichier | Contenu |
| --- | --- | --- |
| 1.0 | [kalistar-map-1.0.png](kalistar-map-1.0.png) | Carte originale, sans le temple ni le nom Kalistopolis. |
| 1.1 | [kalistar-map-1.1.png](kalistar-map-1.1.png) | Temple sur l'ile centrale et inscription Kalistopolis. |
| 1.2 | [kalistar-map-1.2.png](kalistar-map-1.2.png) | Continent ouest elargi vers l'est dans sa partie sud, silhouette evoquant l'Amerique du Sud. |
| 1.3 | [kalistar-map-1.3.png](kalistar-map-1.3.png) | Grande cicatrice de meteorite sur le continent ouest : sillon oblique, cratere terminal et fractures. |
| 1.4 | [kalistar-map-1.4.png](kalistar-map-1.4.png) | Meme cicatrice d'impact, legerement reduite pour mieux equilibrer le relief. |
| 1.5 | [kalistar-map-1.5.png](kalistar-map-1.5.png) | Durane et son Obelisque de Fer ; temple de Kalistopolis redresse et reduit. |
| 1.6 | [kalistar-map-1.6.png](kalistar-map-1.6.png) | Chaine montagneuse plus occidentale ; golfe et arc d'iles au nord-est de la peninsule sud-ouest. |
| 1.7 | [kalistar-map-1.7.png](kalistar-map-1.7.png) | Golfe plus profond et vaste foret gravee, teintee olive, au sud. |
| 1.8 | [kalistar-map-1.8.png](kalistar-map-1.8.png) | Bande forestiere nord remplacee par un bras de mer ouvert sur le golfe. |
| 1.9 | [kalistar-map-1.9.png](kalistar-map-1.9.png) | Continent oriental elargi, silhouette evoquant l'Afrique, desert et forets meridionales. |
| 1.10 | [kalistar-map-1.10.png](kalistar-map-1.10.png) | Continent oriental affine : fleuves, lac, details cotiers et forets moins etendues. |
| 1.11 | [kalistar-map-1.11.png](kalistar-map-1.11.png) | Deux grandes mers orientales, dont une ouverte sur l'ocean a droite ; Durane contre l'arc du cratere. |
| 1.12 | [kalistar-map-1.12.png](kalistar-map-1.12.png) | Regeneration complete et harmonisation du trait, du parchemin et des reliefs. |
| 1.13 | [kalistar-map-1.13.png](kalistar-map-1.13.png) | Continent sud-oriental inspire de l'Afrique, separe du nord par une mer de type Mediterranee. |
| 1.14 | [kalistar-map-1.14.png](kalistar-map-1.14.png) | Dome d'Arborium dans la foret occidentale ; ile et temple de Kalistopolis reduits. |
| 1.15 | [Fond sans villes](kalistar-map-1.15-base.png) / [PSD](layers-1.15/kalistar-map-1.15.psd) | Villes independantes ; cratere naturel, foret restauree, ile centrale encore reduite. |
| 1.16 | [Fond](kalistar-map-1.16-base.png) / [PSD](layers-1.16/kalistar-map-1.16.psd) | Retouche locale masquee : plateau neigeux et barriere montagneuse au nord-ouest. |
| 1.17 | [Fond](kalistar-map-1.17-base.png) / [PSD](layers-1.17/kalistar-map-1.17.psd) | Foret cotiere enrichie et voile parchemin independant pour Arborium. |
| 1.18 | [Carte finale](layers-1.18/kalistar-map-1.18-preview.png) / [PSD](layers-1.18/kalistar-map-1.18.psd) | Villes agrandies et ombres portees ; carte publiee dans le menu Plus > Map. |
| 1.19 | [Carte finale](layers-1.19/kalistar-map-1.19-preview.png) / [PSD](layers-1.19/kalistar-map-1.19.psd) | Lisiere adaptee et Velane, village humain represente par un arbre-cabane. |

Conserver chaque version intacte. Enregistrer les prochaines evolutions dans
un nouveau fichier versionne, sans remplacer les precedentes.

Les fichiers sont des copies exactes des sorties de generation.
`versions.json` conserve leur provenance et leurs empreintes.
Les sources et prompts des versions 1.0 et 1.1 restent dans `../propositions/`.
Les prompts exacts et recadrages de reference des versions 1.2 et suivantes
sont conserves dans ce dossier. Generation avec l'outil integre image_gen,
depuis la version precedente, avec le recadrage de zone de l'auteur lorsqu'il
est fourni.
Les anciens suffixes de travail `v1` et `v2` dans ces sources ne sont pas les
numeros de version des maps.

Ce classement ne change pas la carte affichee sur le site.

## Controle de la version 1.2

Controle visuel de la carte entiere : nouvelle cote continue sans raccord
rectangulaire apparent, interieur terrestre coherent, ile centrale distincte
et nom Kalistopolis lisible. La retouche generative conserve la composition,
mais ne garantit pas l'identite pixel a pixel hors de la zone modifiee.
Les fichiers 1.0 et 1.1 restent strictement inchanges, verifies par SHA-256.

## Controle de la version 1.3

Zone identifiee par le recadrage utilisateur : interieur du continent ouest,
autour de l'ancien petit lac ramifie. Le sillon se termine dans un large
cratere fracture, avec relief grave sepia et raccord au terrain environnant.
Pas d'explosion, de feu, de lumiere ou de nouveau nom ajoute sur la carte.
La cicatrice oblique est coherente avec les passages du prologue et de
Canyonero consultes dans `../site/story-content.json`, sans modifier le recit.

Controle visuel de la composition, de la silhouette elargie du continent,
de la separation de l'ile centrale et de Kalistopolis. Les versions 1.0,
1.1 et 1.2 restent inchangees. Comme pour 1.2, la retouche generative ne
garantit pas une identite pixel a pixel hors de la zone cible.

## Controle de la version 1.4

Reduction legere du cratere et de son sillon demandee par l'auteur, sans
nouveau motif. Cible du prompt : environ 85 % des dimensions precedentes ;
il s'agit d'une retouche generative, pas d'une mesure exacte de redimensionnement.
Controle visuel : bassin plus discret, sillon toujours lisible, relief sepia
continu autour de la cicatrice. Les versions 1.0 a 1.3 restent intactes.

## Controle de la version 1.5

L'auteur situe Durane sur le rebord sud-est du cratere. Son petit recadrage
correspond a la zone x=370..444, y=317..387 de la version 1.4 (1774 x 887).
Le monument retenu est l'Obelisque de Fer, explicitement cite dans
`../site/story-content.json` : repere sur une carte dans le recit, puis
monument dominant une place lors de l'arrivee de Voloden. Le dessin est une
interpretation cartographique sobre, pas un plan architectural canonique.

Deux passes avec l'outil integre image_gen :

1. Ajout de Durane et restauration du temple de Kalistopolis en utilisant
   la version 1.1 comme reference de silhouette propre. Prompt principal
   `kalistar-map-1.5.prompt.txt`, sortie intermediaire conservee dans
   `sources/1.5-durane-preparation.png`.
2. Reduction supplementaire des deux monuments pour une echelle de ville
   discrete. Prompt exact `kalistar-map-1.5-refinement.prompt.txt`.

Controle visuel : obelisque a cote du cratere et non dans son bassin,
deux noms lisibles, temple central droit et plus petit, cratere et sillon
encore lisibles, absence de cadre de collage apparent.
Les dimensions du prompt sont des cibles, pas une mesure de redimensionnement.
La retouche generative ne garantit pas une identite pixel a pixel ailleurs.
La reference de dessin initiale de Kalistopolis reste la version 1.1 ; ne
pas prendre une deformation issue d'une iteration comme nouvelle reference.
Les versions 1.0 a 1.4 et la carte actuellement publiee restent intactes.

## Controle de la version 1.6

L'auteur demande une chaine plus proche du bord ouest, avec une silhouette
verticale puis oblique, et une ouverture maritime evoquant les Antilles
au nord de la partie meridionale du continent ouest.

Controle visuel : spine montagneuse occidentale, interieur plus ouvert,
golfe et arc d'iles, continuite terrestre de la peninsule, craterisation
encore lisible, deux reperes urbains et noms conserves.
Retouche avec l'outil integre image_gen ; prompt et recadrage fournis conserves.
Les fichiers 1.0 a 1.5 sont preserves et verifies par SHA-256. La retouche
generative ne garantit pas une identite pixel a pixel hors des zones ciblees.

## Controle de la version 1.7

Demande : ouvrir davantage le golfe et diversifier le vaste interieur au sud
par une foret cartographiee, coherente avec le parchemin.
Generation avec l'outil integre image_gen depuis 1.6 et les deux recadrages
utilisateur. Prompt exact et references conserves dans ce dossier.

Controle visuel : mer plus profonde, littoral continu, grandes masses boisees
irregulieres et clairieres, teinte olive patinee sous les traits sepia,
chaine occidentale distincte, monuments et noms lisibles. Aucun nom de foret
n'a ete invente. Les anciens fichiers restent inchanges. Comme les autres
retouches generatives, cette version ne garantit pas l'identite pixel a pixel
hors des zones demandees.

## Controle de la version 1.8

La bande indiquee par l'auteur devient un bras de mer continu avec le golfe.
Controle visuel : nouveaux rivages organiques et contours cotiers, hachures
marines continues, foret restante sur la rive sud, monuments lisibles,
cratere et chaine occidentale conserves dans la composition.
Generation avec l'outil integre image_gen, prompt exact et recadrage conserves.
Les versions precedentes restent intactes. La retouche generative ne garantit
pas une identite pixel a pixel hors de la zone cible.

## Controle de la version 1.11

Deux bassins marins distincts dans le continent oriental : mer interieure
fermee et mer orientale ouverte par un passage sur l'ocean de droite.
Controle visuel : contours naturels, terrain ancien retire des eaux,
continuites terrestres et pointe sud conservees. Durane et son monument
sont deplaces contre le rebord sud-est du cratere. Prompt exact et reference
de localisation conserves. Les anciennes versions et le site restent intacts.

## Controle de la version 1.12

Regeneration globale demandee par l'auteur, plutot qu'une nouvelle retouche
locale. Geographie source : 1.11 ; references du trait : 1.0 ; architecture
de Kalistopolis : 1.1. Controle visuel : trait plus fin et homogene, mers
orientales distinctes, ouverture orientale conservee, Durane contre le
cratere, temple droit, foret occidentale et archipel conserves.
Le sillon du cratere reste stylise ; la generation ne garantit pas une
identite geometrique exacte. Prompt et empreinte conserves. Site inchange.

## Controle de la version 1.13

Separation complete du continent sud-oriental et des terres du nord par
une mer transversale ouverte aux deux extremites. Silhouette fictive
inspiree de l'Afrique, large au nord et effilee au sud. Deux bassins
interieurs conserves, dont celui de l'est ouvert sur l'ocean.
Controle visuel : continuite du passage maritime, trait sepia et parchemin
coherents, monuments et continent occidental conserves. Le generateur
a densifie certaines forets du sud ; les contours ne sont pas identiques
pixel a pixel. Prompt et reference conserves. Site et anciennes maps inchanges.

## Controle de la version 1.14

Le petit creux indique dans la foret occidentale accueille un dome grave
et le nom Arborium, selon la demande directe de l'auteur. Ile centrale
de Kalistopolis et temple reduits proportionnellement ; nom encore lisible.
Controle visuel : dome au bon emplacement, trois noms de villes lisibles,
mers orientales et separation du nord conservees. La regeneration peut
faire varier le trait hors des zones ciblees. Site et anciennes maps inchanges.

## Controle de la version 1.15

Nouveau fonctionnement : le fond ne contient plus les villes. Trois PNG
transparents et trois noms editables sont places dans un PSD en groupes
independants. Le fond est verrouille. Voir [le guide des calques](layers-1.15/README.md).
Corrections demandees : cratere redessine sans les tubes artificiels,
foret retablie a l'ancien emplacement d'Arborium, ile centrale plus petite.
Inspection du fond et de l'assemblage, verification de l'alpha des icones,
relecture du PSD avec controle de ses groupes, textes et pixels composites.
Photoshop absent : ouverture native non verifiee. Anciennes versions et site
intacts. Les retouches generatives peuvent changer des details hors cible.

## Controle de la version 1.16

Premier test du processus par zone : generation du seul recadrage indique,
integration sur un calque masque dans le PSD 1.15. Neige et toundra plus
etendues au nord, haute chaine transversale separant les terres temperees.
Inspection du raccord et du planisphere. Verification deterministe : zero
pixel modifie hors du masque, calque de fond et trois groupes de villes
inchanges. Voir [le dossier du test](layers-1.16/README.md).
Les versions precedentes restent intactes. Site non modifie.

## Controle de la version 1.17

Retouche forestiere locale par masque : canopes variees, clairieres,
ruisseaux et lisiere plus naturelle. Arborium gagne un voile parchemin
sur un calque distinct sous le monument et le texte. Aucun halo dans
l'export du terrain. Inspection du raccord et de la carte complete ;
zero pixel modifie hors du masque, zone neigeuse et villes preservees.
Voir [le dossier de retouche](layers-1.17/README.md).

## Controle de la version 1.9

Partie sud du continent oriental elargie, avec silhouette fictive evoquant
l'Afrique. Desert ouvert, reliefs espaces, vallees et plusieurs masses
forestieres au sud. Controle visuel : mer conservee autour de Kalistopolis,
continuite du continent oriental, pointe sud distincte des iles et de la
rose des vents, reperes du continent ouest encore lisibles.
Generation avec l'outil integre image_gen ; prompt et recadrage conserves.
La direction artistique est maintenant consignee dans un document dedie.

## Controle de la version 1.10

Demande de relief plus fin et realiste et de moins de foret dans la region
orientale nouvellement creee. Controle visuel : fleuves et lac, rivages plus
details, grands espaces ouverts, poches boisees plus petites et espacees.
Generation avec l'outil integre image_gen ; prompt exact conserve.
La reference de biomes orientaux dans la DA pointe maintenant vers 1.10.
Les versions precedentes restent intactes. La retouche generative ne garantit
pas une identite pixel a pixel hors de la zone cible.
