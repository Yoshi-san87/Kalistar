# Kalistar V1

## Voir les cartes
Ouvrir OUVRIR_LES_CARTES.html.
Les douze PNG sont dans cartes/. La planche APERÇU_12_CARTES.jpg donne une vue d'ensemble.
KALISTAR_V1_CARTES_PNG.zip contient uniquement les douze cartes terminées.

## Impression
impression/KALISTAR_V1_12_CARTES.pdf contient une carte par page, à la taille du fichier source : 75,946 × 126,746 mm.
Les TIFF sont les fichiers CMJN sans perte : 897 × 1497 pixels, 300 ppp, profil U.S. Web Coated (SWOP) v2.
Le PDF contient des images CMJN et le profil source comme condition de sortie. Ce n'est pas une certification PDF/X.
Imprimer à 100 %, sans ajustement automatique. Le noir extérieur appartient au fichier original.
Aucun repère de coupe ni fond perdu confirmé n'était fourni. Aucune nouvelle TrimBox ou BleedBox n'a été inventée.
Faire valider le format fini, la coupe, le papier et le profil par l'imprimeur avant un tirage commercial.

## Contenu
11 éléments classiques et Rainbow. Chaos exclu.
Momo : P3/P4, Robot, Chroma. Momo et Zviri gardent leurs images, chiffres et textes imprimés : seul le code-barres change dans les PNG/TIFF finaux.
Taulio reste intact dans main ; il ne constitue pas un treizième élément.
Les dix nouvelles illustrations représentent des moments narratifs, pas des poses de catalogue.
Les nouvelles scènes, les profils manquants et Aelis sont des propositions V1. Les provenances sont dans donnees/cartes.json.
Balmhyr reprend les statistiques du classeur ; Kaylis reprend son ATK, avec une DEF proposée.
Le cadre natif des PSD est conservé. Sa base a été adaptée à la composition de Momo ; une équivalence pixel à pixel de tous les ornements entre le JPG Momo et le PSD ancien n'est pas revendiquée.

## Modifier plus tard
Aucune manipulation Photoshop n'est nécessaire pour utiliser les cartes livrées.
templates/KALISTAR_MASTER_V1.psd et les douze PSD par élément conservent les textes éditables et les images en objets dynamiques.
Les deux PSD supplémentaires MOMO_REFERENCE_JPG_IDENTIFIANT et ZVIRI_REFERENCE_JPG_IDENTIFIANT préservent les JPG d'origine avec leur nouveau code-barres. Ils ne sont pas les maîtres entièrement décomposés.
Dans les autres PSD : NOM, TITRE DE VERSION, METIER, RACE, DESCRIPTION NARRATIVE, ATK D6 à D1 et DEF D6 à D1.
D6 est le gros rond supérieur. P1 à P5 désignent exclusivement les positions du plateau.
Pour une face à effet, masquer le pictogramme et afficher le calque valeur, ou inversement.
Les halos ATK et les barrières DEF sont des calques distincts ; la liste des faces actives figure dans les données.
Les compositions de calques AVEC CRISTAL et SANS CRISTAL basculent l'état élémentaire. Le second état masque aussi les halos élémentaires.
Le calque CADRE GENERAL contrôle l'ornement extérieur. Le groupe ELEMENT contrôle le cristal et son accent, indépendamment de la rareté.
Le générateur accepte un champ frame_hue facultatif pour une variante de cadre ; aucune rareté nouvelle n'a été attribuée arbitrairement.
Pour Momo/Zviri, l'illustration disponible vient du JPG et contient des éléments déjà aplatis. Le masque conserve la fenêtre haute ; une nouvelle illustration propre peut remplacer cet objet dynamique.
Ne pas redimensionner le document pour changer une illustration.

## Données et symboles
donnees/cartes.json est le registre de production des douze exemples.
donnees/elements.json contient les cycles et couleurs ; armes.json reprend les signes de la matrice colorée du classeur.
assets/armes contient les vingt images extraites. Les drapeaux Chroma, Vulkar, Arborium et Cryptown reprennent les sources.
Les autres drapeaux de cette série sont des propositions identifiées par faction. Les silhouettes de race forment une bibliothèque commune ; le dragon Drax est extrait du drapeau Vulkar.
Les pictogrammes originaux de Momo/Zviri sont conservés dans leurs exports fidèles ; la bibliothèque normalisée sert aux nouvelles cartes et aux maîtres.
Les cristaux et halos viennent de deux planches générées puis découpées. Les prompts et chemins de provenance figurent dans generation_manifest.json.

## Identifiants
Huit chiffres stables par version, de 00000001 à 00000012, encodés en Code 128.
Le registre donnees/registre_identifiants.json fait autorité : ne pas recycler un numéro pour une nouvelle version.
Le code occupe exactement la zone 22 × 210 pixels existante. Les marges blanches sont indispensables.
Le contrôle logiciel décode les PNG et TIFF exportés ; il ne garantit pas la lecture de tous les téléphones sur tous les papiers.
La barre élémentaire fait environ 0,17 mm de large et la hauteur utile environ 1,86 mm : une épreuve physique est importante.
Pour une lecture industrielle robuste à grande distance, une zone plus grande pourrait être nécessaire ; elle n'a pas été agrandie sans accord.

## Validation
verification/controle_exports.json : dimensions, CMJN, résolution, décodage et comparaison des références hors barcode.
verification/controle_pdf.json : rendu et décodage des douze pages du PDF.
verification/EQUILIBRAGE.md : essais numériques conditionnels et limites, distincts de la validation graphique.
La magie contre une barrière perd 30 ATK. Ce mécanisme n'est pas intrinsèquement équilibré : les valeurs et effets doivent compenser cette exposition.
Les essais de parties restent nécessaires, notamment pour Malinia, les soutiens et Rainbow.

