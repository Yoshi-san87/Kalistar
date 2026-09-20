# Kalistar V2 - retours graphiques

La V1 reste intacte. Cette V2 change les visuels, pas les règles ni les identifiants.

## Livrables
- OUVRIR_LES_CARTES.html : galerie des douze cartes.
- cartes/ : PNG à consulter directement.
- impression/ : TIFF CMJN et PDF à taille réelle.
- templates/ : douze PSD éditables et KALISTAR_MASTER_V2.psd.
- assets/ : illustrations, armes détourées, drapeaux, races, effets et codes.
- donnees/ : mêmes cartes et mêmes identifiants que la V1, avec provenance des nouvelles images.

## Corrections
Les 20 armes conservent leur image originale ; les coins extérieurs sont réellement transparents.
Les 12 drapeaux ont été redessinés avec matières, broderies et armatures. Leurs silhouettes et palettes varient dans le même emplacement.
Les 11 emblèmes de race et les 5 effets utilisent une bibliothèque commune métal/émail. Le trèfle, la potion, le coeur, le crâne et l'esquive sont séparés des fonds de résultats.
Les planches générées avaient un damier aplati. Les fichiers de production ont ensuite été détourés dans Photoshop et contrôlés sur fond sombre ; les fichiers suffixés _alpha issus de l'essai génératif ne sont pas les fichiers de production. Les sources effectivement utilisées sont suffixées _subject.
Les 12 illustrations ont été retravaillées avec le générateur intégré, en conservant les personnages, le contexte et la sensibilité picturale. Les prompts complets sont dans donnees/prompts_revision.json et les sorties dans generation_v2_manifest.json.
Les scènes ne répètent plus le même cadrage : Momo de profil, Cana en vol, Julienne sous l'eau, Darnako debout de face, Malinia en plongée verticale, Aelis assise de face, Balmhyr de dos, Victorvine en contre-plongée, Verminia de profil debout, Zviri en bond, Nazar en poussée latérale, Kaylis en portrait.
La passe de contrôle porte sur les silhouettes, mains, articulations, accessoires et raccords visibles. Elle ne constitue pas une garantie d'absence de tout défaut d'illustration à un agrandissement arbitraire.

## Barcodes en couleur
Oui, un code peut fonctionner sans être strictement noir et blanc. Le contraste et la restitution par le lecteur restent déterminants.
La V2 utilise un dégradé de barres foncées sur fond blanc, dont la phase varie selon l'identifiant. Les largeurs, espaces et marges ne changent pas.
L'identifiant est encodé dans les barres, pas dans les couleurs. La couleur est uniquement graphique.
Les fichiers monochromes originaux sont conservés dans assets/barcodes_noir_blanc/.
Un PDF alternatif BARCODE_NOIR est prévu pour une impression plus prudente ; ses barres sont vectorielles, uniquement en noir K.
Les contrôles logiciels portent sur les PNG, TIFF et PDF exportés. Les essais du canal rouge sont un indicateur, pas une simulation certifiée d'un laser ou de la réflectance du papier.
Ne pas remplacer ces couleurs par un arc-en-ciel clair sans nouveau test. Les barres rouges/orange/jaunes claires sont particulièrement risquées avec certains lecteurs.
GS1 recommande des barres sombres, un fond clair et une seule encre pour l'impression ; notre dégradé est une proposition graphique de prototype, pas une certification de qualité industrielle.
Source : [GS1 US, couleurs et impression des barcodes](https://www.gs1us.org/upcs-barcodes-prefixes/how-to-use-your-upc-barcodes/place-barcodes-on-products).

## Impression
897 × 1497 pixels, 300 ppp, CMJN, U.S. Web Coated (SWOP) v2.
Une carte par page PDF, 75,946 × 126,746 mm, sans agrandissement automatique.
Aucun fond perdu ni repère de coupe nouveau n'a été inventé. Le cadre et les zones restent ceux du gabarit.
Faire une épreuve sur le papier prévu et la tester avec le téléphone/lecteur réel avant un grand tirage, en particulier pour le barcode de 22 × 210 pixels.
