# Kalistar V4 - Premiere serie multi-elements

16 cartes, 7 elements. Cette serie reprend la geometrie stable Electro 03F : 897 x 1497 px, 300 ppp, sRGB. La V3 jouable et les cinq cartes Electro existantes restent intactes.

## Livrables

- Galerie locale : `../../galerie-elements.html`.
- Cartes completes : `../../cartes/NOM_V4_01_ELEMENT.png`.
- PSD editables : `../../templates/NOM_V4_01_ELEMENT.psd`.
- Base de composition : `../KALISTAR_V4_TEMPLATE_04_ELEMENTS.psd`.
- Registre : `../registry-elements-04.json`.
- Parametres de chaque carte : `nom/card.json`.
- Illustrations retouchees, prompts et provenance : `../../assets/illustrations/elements-01/` et `../../donnees/elements-01/`.

## Cartes

| Element | Personnages |
|---|---|
| Eau / HYDRO | Ruby |
| Air / AERO | Cana, Scrow, Soryn, Gilmarr |
| Feu / PYRO | Darnako |
| Glace / CRYO | Malinia |
| Lumiere / LUXO | Aelis, Iliane |
| Roche / MINERO | Belrog, Lok, Balmhyr, Magnar |
| Plantes / HERBO | Thalie, Bloom, Victorvine |

Aelis, Iliane, Belrog, Thalie et Bloom conservent leur illustration native V3 et leur cadrage. Les onze autres illustrations sont editees separement avec l'outil integre image_gen, jamais avec le cadre de carte.

## Fabrication

La base 04 retire les banques d'illustrations inutiles des anciens personnages. Le moteur injecte un seul visuel et les composants requis dans chaque PSD. Les textes restent natifs ; illustration, cristal, effets et pictogrammes restent separes. Les nuances des fonds et des branches sont des filtres Photoshop sur les objets dynamiques, pas des rectangles peints par-dessus la carte.

Les statistiques, positions, armes, races, factions et identifiants proviennent de la V3 sans changement. Les textes narratifs de Ruby, Darnako, Lok, Balmhyr et Victorvine sont adaptes aux nouvelles scenes. Lok devient explicitement roi dans le libelle de metier, sans modifier son profil de jeu.

Les accents et apostrophes manquants de certains recits V3 sont corriges dans les profils V4 uniquement. Pour une revision purement editoriale, `refresh-elements-text.jsx` reutilise les champs Photoshop natifs et le moteur de mise en page ; le controle compare aussi tous les pixels hors des zones de texte, sans changement autorise ailleurs.

Le moteur 04 reequilibre les deux dernieres lignes du recit lorsqu'une derniere ligne fait moins de 230 px sur les 574 px disponibles. Les mots et la taille de police restent identiques ; seuls les retours a la ligne sont ajustes, puis le bloc est recentre.

## Modifier une carte

1. Modifier son `card.json`. C'est le profil relu par le moteur, pas une copie figee de la galerie.
2. Selectionner son nom dans `render-config.json`.
3. Executer `V4/scripts/stable/render-elements.jsx` dans Photoshop. Les sources non enregistrees provoquent un arret pour les proteger.
4. Executer `V4/scripts/stable/verify-elements.cjs`, puis le decodeur `verify-barcode.py --card <profil>`.

Un fichier `pause.request` dans ce dossier demande un arret entre deux cartes. Ne pas executer deux scripts Photoshop de composition simultanement. La base Electro 03F reste le point d'entree des cinq cartes Electro approuvees ; cette serie ne les remplace pas.

## Controles

Les rapports `nom/verification.json` comparent le cadre fixe pixel par pixel et le PNG au PSD reouvert. Ils verifient les valeurs V3, les modes magique/barriere, les positions, les limites des libelles et le drapeau. Les rapports `nom/barcode-verification.json` portent sur le code reellement rendu, en couleur et niveaux de gris, a taille native et x4. Les sources protegees sont comparees par SHA-256.

Ces controles techniques ne remplacent pas la validation artistique de l'utilisateur. Les fichiers RGB ne sont pas un bon a tirer CMJN imprimeur.

La galerie a fait l'objet de controles statiques de syntaxe, de chemins et de dimensionnement. Son ouverture automatisee a ete bloquee par la politique du navigateur pour les URL locales ; aucun test visuel dans le navigateur n'est revendique. Les PNG et les rendus PSD sont verifies directement.
