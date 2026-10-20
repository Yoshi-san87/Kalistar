# Vues de villes - reperes de l'auteur

Decisions courantes du 20 octobre 2026 pour les illustrations des panneaux Map.
Ces reperes concernent les vues de villes, pas une regeneration automatique
du terrain de l'atlas. La peinture narrative Kalistar reste la reference.

## Coherence avant remplissage

L'auteur refuse le remplissage decoratif et l'effet patchwork, meme tres detaille.
Un lieu doit avoir une geographie continue, des cours d'eau qui suivent la pente,
des fondations credibles, des acces raccordes et une echelle humaine constante.
Regrouper les quartiers par fonction et relief. Les arriere-plans peuvent rester
calmes ; ne pas ajouter des tours, rochers ou passerelles juste pour occuper le vide.
Ne pas cacher une incoherence avec du flou, du brouillard ou une multiplication
de petits objets. Le monument principal doit conserver sa hierarchie visuelle.

Une correction de proportion doit reprendre le plan d'ensemble : maison, porte,
personne, pont, garde-corps et escalier suivent la meme echelle au meme plan de
perspective. Ne pas conserver une grosse maison en essayant seulement de diminuer
ses fenetres ou d'ajouter de petits batiments autour pour faire illusion.
Une nouvelle composition est preferable si la precedente impose une echelle fausse.

| Ville | Ce qui est conserve | Direction actuelle |
| --- | --- | --- |
| Durane | Version 02 validee telle quelle | Grand cratere, Obelisque au bord et ateliers nains ; aucun nouveau rendu |
| WoodLand | Ambiance feerique de 01/05 et silhouette 06 validee | Un seul tronc monumental se divise en deux vrais bois de cerf pointus ; feuillage laissant leurs pointes visibles ; batiment principal au milieu ; ecosysteme forestier de cascades, jardins et passerelles |
| Kalistopolis | Version 03 validee telle quelle | Sommet insulaire solitaire ; uniquement ciel, nuages et ocean en arriere-plan |
| Arborium | Version 11 validee telle quelle | Dome colossal, quartiers forestiers et palais-laboratoire botanique central avec ailes vitrees et jardins ; aucun nouveau rendu |
| Velane | Version 01 validee telle quelle | Aucun changement |
| Vulkar | Palais, quartiers sur corniches et lac noir | Vue 12 : un seul cratere de volcan isole ; uniquement le ciel derriere la couronne, aucun sommet exterieur ni coulee de lave venue d'un autre volcan |
| Cryptown | Version 03 conservee sans nouvelle retouche | Necropole profonde, croix, parois coherentes et horizon marin calme |
| Thalassea | Grande bulle, cite, capteurs, banlieues et jet central | Version 13 : exterieur entierement immerge, pas de surface liquide ni cascade dans la mer ; canaux et eau courante uniquement a l'interieur de la bulle |

Selection integree le 20 octobre 2026, avec correction Thalassea le 21 octobre :
Durane 02, WoodLand 07, Kalistopolis 03, Arborium 11, Velane 01, Vulkar 12,
Cryptown 03 et Thalassea 13. selection.json fixe cette selection ; le manifeste
../../map/city-portraits.json fixe leurs sources et exports runtime.
Les anciennes variantes gardent leur historique et ne sont pas repromues.
Les dimensions numeriques du prompt Arborium servent a calibrer le rendu ;
ce ne sont pas des mesures canoniques approuvees par l'auteur.

Derniers prompts WoodLand : `prompts-05.json` (retour feerique),
`prompts-06.json` (vrais bois de cerf, silhouette validee),
`prompts-07.json` (batiment principal central et feuillage).
La demande de simple paroi de cascade etiree est remplacee par le retour a un
magnifique ecosysteme de cascade DANS la foret. Les cornes doivent etre une
silhouette explicite de bois de cerf, pas deux arbres vaguement ressemblants.
Les images 05 et 06 sont preservees comme etapes, sans galeries globales 05/06.

Dernier prompt Arborium : `prompts-11.json`, palais-laboratoire botanique central
avec serres et jardins, dans la meme composition. 10 conserve les habitations variees
sous le dome. L'echelle et la composition 09 sont validees ; elles couvrent la
foret a l'echelle d'une region. Les arbres deviennent minuscules face au dome,
sans simple zoom. Les chiffres du prompt calibrent la taille et ne sont pas du canon.

Prompts des retouches precedentes : `prompts-04.json`. Le premier essai Arborium 04 a ete rejete
car les maisons restaient trop grandes ; le fichier choisi est une nouvelle
generation depuis la reference architecturale du dome. Les prompts des deux
essais sont conserves, sans remplacer les anciennes images 01/02/03.
Series precedentes : `index-01.html`, `index-02.html`, `index-03.html`,
`index-04.html`, `index-07.html`, `index-08.html`, `index-09.html`, `index-10.html`, `index-11.html` et leurs apercus correspondants.
Selection source : `selection.json`. Integration du site : livraison 4.6.100.

Dernier prompt Vulkar : `prompts-12.json`. Le volcan de la cite est isole :
la couronne du cratere ferme le paysage, aucun autre relief ne depasse au fond.
Les anciennes coulees venant de volcans exterieurs sont retirees, sans effacer
l'activite volcanique a l'interieur du cratere.

Thalassea est corrigee le 21 octobre 2026 : l'exterieur de la bulle est un
volume marin continu. Sous les ponts exterieurs, montrer les fonds rocheux et
la profondeur de l'ocean, jamais des bassins a l'air libre ni des cascades.
Les canaux peuvent rester dans la bulle. Sources, prompt et hashes sont dans
`../../revisions/2026-10-21-thalassea-underwater/` ; les sept autres vues et l'atlas restent inchanges.
