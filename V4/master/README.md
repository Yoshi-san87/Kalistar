# Kalistar V4 - Epreuves du Maitre ELECTRO

**Historique, ne plus utiliser comme base active.** Le template actuel derive de Momo V4-10 au format 897 x 1497 pixels et se trouve dans `../template-stable/`. Voir `../template-stable/README.md`. Les fichiers de ce dossier sont conserves pour provenance.

## Etat actuel : hybride V4 / V3

L'essai `TAULIO-recompose` et le maitre `01-supports` ont ete refuses par l'utilisateur pour leurs raccords visibles et un code-barres visuellement abime. Leurs anciens rapports techniques ne constituent pas une validation graphique.

La nouvelle epreuve utilise `templates/KALISTAR_MASTER_V4_02-chassis.psd` et la fiche `profiles/taulio.json` avec `dynamicSource: "V3"`. Sorties : `exports/TAULIO-hybride-V4-V3.png` et `.psd`. Les composants et leurs provenances sont decrits dans `components/README.md`; verification dans `verification/hybrid-report.json`. Cette epreuve attend un retour visuel, sans statut de template final ni de BAT.

Les sections ci-dessous conservent la documentation de construction precedente. Pour l'essai courant :

```powershell
& './V4/scripts/master/render.ps1' -Card './V4/master/profiles/taulio.json' -Name 'TAULIO-hybride-V4-V3'
```

## Fichiers de reference

- `../cartes/MOMO_ELECTRO_V4_04-typographie.png` : visuel approuve, conserve sans modification.
- `../templates/KALISTAR_MASTER_V4_01-supports.psd` : maitre de production en calques, 950 x 1655 px, RGB sRGB, 300 ppp.
- `../templates/KALISTAR_MASTER_V4.psd` : premiere reconstruction conservee intacte.
- `exports/MOMO-recompose.png` : Momo recompose depuis les composants et textes du maitre.
- `profiles/momo.json` : fiche courte des contenus modifiables.
- `profiles/taulio.json` : Taulio, illustration originale et mecanismes V3.
- `exports/TAULIO-recompose.psd` et `exports/TAULIO-recompose.png` : premiere declinaison issue du maitre, soumise a validation visuelle.
- `verification/MOMO-TAULIO-maitre.png` : comparaison a dimensions et placements communs.
- `verification/taulio-report.json` : controles de cette declinaison.
- `verification/comparaison-reference-maitre.png` : reference a gauche, recomposition a droite.
- `verification/report.json` : mesures et essais de remplacement.

Le PSD historique `../templates/01_ELECTRO_MOMO.psd` est un ancien prototype. Il ne doit pas etre utilise comme nouveau maitre.

## Ce qui est reellement separe

1. Illustration, dans une fenetre fixe, independante du cadre.
2. Cadre cuivre et surfaces bleues, verrouilles.
3. Finition coloree du metal, facultative et separee de l'element.
4. Douze capsules : un seul etat visible par emplacement, chiffre en texte natif.
5. Etats physique, electrique, barriere ou capacite.
6. Arme, race, cristal, branches colorees, drapeau et code-barres en objets dynamiques.
7. Cinq plaques de position sur une seule ligne; emplacements inutilises masques.
8. Nom, version, metier, race et description en vrais calques de texte.

Les objets dynamiques gardent un canevas interne commun de 950 x 1655 pixels. Le script remplace leur contenu, pas leur transformation. Aucun montage au juger ni generation de carte complete n'intervient dans les rendus.

La reference aplatie n'avait pas de fonds sous les lettres ni sous certaines superpositions. Ces zones ont ete reconstruites une seule fois dans `assets/` : nettoyage des textes, rails sous les capsules, fonds caches par les plaques et le drapeau, detourage des lumieres. La reference approuvee n'est jamais ecrasee.

Les polices generees n'existent pas comme fichiers de police. La recomposition utilise Augustus pour le nom, Times New Roman pour les libelles, Arial Bold pour les chiffres et Myriad Pro pour le recit. Leur rendu est soumis a validation visuelle; il ne faut pas annoncer une identite pixel a pixel de l'ensemble de la carte.

## Produire une carte

Dans PowerShell, depuis le projet :

```powershell
& './V4/scripts/master/render.ps1' -Card './V4/master/profiles/momo.json' -Name 'MOMO-rendu'
& './V4/scripts/master/render.ps1' -Card './V4/master/profiles/taulio.json' -Name 'TAULIO-recompose'
```

Le script prepare les composants, ouvre le maitre defini par `scripts/master/layout.json`, le duplique, renseigne les donnees et exporte un PNG et un PSD dans `exports/`. Il ne reecrit ni le maitre ni la reference. Photoshop et les runtimes locaux Node/Python du projet doivent etre disponibles.

Pour une autre carte, sa fiche doit fournir explicitement `masterArtwork`, un chemin d'illustration relatif a V4. L'image est ajustee proportionnellement a la fenetre, sans deformer le cadre. Le cadrage de chaque illustration devra etre choisi artistiquement.

### Donnees

- `atk` et `defense` : six entrees, dans l'ordre D6, D5, D4, D3, D2, D1.
- `magic` et `barriers` : numeros des faces concernees, et non indices du tableau.
- Valeurs de capacite : `retry`, `mana`, `revive`, `guard`, `buff_atk`, `dodge`, `death`.
- `positions` : une a cinq valeurs distinctes entre 1 et 5, rangees de gauche a droite.
- `textLines` : coupures de ligne optionnelles. Leur reunion doit reproduire exactement `text`. Supprimer ce champ pour un retour a la ligne automatique.
- `frameColor` : `null` conserve le cuivre; une couleur RGB comme `93B5CF` applique une finition coloree au metal, sans changer le cristal.
- `id` : reference numerique de huit chiffres, encodee en Code128. Jamais un code secret d'activation.

Le generateur refuse un recit qui ne tient pas en quatre lignes lisibles. Il refuse aussi une autre carte sans illustration explicite. Les nouvelles armes et races sont centrees sur leur masse visible et ajustees proportionnellement au disque interieur, sans rogner leurs extremites ni toucher le cerclage.

## Revision des supports communs

Le test Taulio sans halos a revele des raccords rectangulaires sous les capsules et des reperes ATK/DEF partiellement inclus dans l'illustration. La revision `01-supports` corrige ces sous-couches dans le composant structurel commun, puis duplique le maitre pour chaque carte. Aucune position, taille de capsule, transformation d'objet dynamique ou typographie n'a ete changee.

Les pixels de cuivre visibles et les fonds bleu sombre de la reference servent a reconstruire les supports. Le petit support inferieur gauche utilise le segment propre du support droit a la meme hauteur. Les reperes ATK/DEF restent au premier plan quand l'illustration change. `refine-supports.cjs` et `refine-supports.jsx` documentent cette revision de composant; ils ne font pas partie du remplissage quotidien.

L'ancien maitre, le visuel Momo approuve et l'export Momo precedent restent intacts. `verification/MOMO-supports.png` est uniquement un reexport de controle du maitre revise, pas une nouvelle carte Momo validee.

## Perimetre actuel

Ce premier maitre est calibre pour **ELECTRO / Chroma**. Les armes et races peuvent utiliser les bibliotheques V3 dans leur enveloppe fixe. Les autres cristaux et drapeaux doivent etre calibres et valides avant d'etre enregistres dans le maitre; le script les refuse plutot que de substituer silencieusement un visuel incorrect.

Les capacites et valeurs sont affichees, pas reequilibrees par ce generateur. Aucune regle de jeu, carte V3, base de donnees, propriete ou deck n'est modifie.

## Controles

- Dimensions exactes du canevas.
- Empreinte SHA-256 de la reference approuvee.
- Comparaison des pixels fixes du cadre a la reference, selon `masks/fixed-pixels.png`.
- Reexport du PSD identique au premier rendu.
- Modification d'un chiffre limitee a sa zone.
- Remplacement de l'illustration limite a sa fenetre.
- Affichage des cinq positions sans deplacer la structure.
- Passage en tout physique pour rechercher les restes de halo.
- Lecture du Code128 en couleur et en gris.
- Rendu complet depuis la fiche identique au rendu du maitre : zero canal modifie (`verification/pipeline.json`).
- Illustration centrale protegee de Momo identique a la reference; aucun recadrage du personnage.

Les images `test-*` sont des essais techniques et ne sont pas de nouvelles cartes a collectionner.

## Impression

Les 300 ppp sont une metadonnee de travail, pas une validation d'impression. Le visuel approuve mesure 950 x 1655 pixels, tandis que l'ancien canevas physique mesurait 897 x 1497 pixels : leurs proportions different. Aucun etirement, recadrage ni nouveau fond perdu n'a ete impose. Format physique, zone de coupe, fond perdu et profil imprimeur restent a valider avant le BAT.

## Entretien du maitre

`scripts/master/prepare.cjs`, `prepare-backgrounds.jsx`, `extract.cjs` et `build.jsx` servent a reconstruire le maitre lui-meme. Ce ne sont pas les commandes de production quotidiennes. Les relancer ecraserait les actifs de calibration ou le maitre. Pour produire des cartes, utiliser uniquement `render.ps1`.

L'essai Taulio par generation complete refuse et ses apercus restent supprimes. La nouvelle Taulio est assemblee depuis le PSD maitre et sa fiche, sans generation de carte complete. Ses valeurs restent celles de la V3 : P1, attaques physiques 202/165/135/98/bouclier/buff ATK, defense 294/242/190/145/93/41 et barriere seulement sur D2. Son code-barres encode 30000013; il n'est pas un secret de propriete.

Pour verifier Taulio apres un rendu, utiliser `inspect-render.jsx` dans Photoshop, `check-barcode.py --card master/exports/TAULIO-recompose.png --id 30000013 --report master/verification/taulio-barcode.json`, puis `verify-taulio.cjs`. Le controle des objets dynamiques lit leur identifiant sans les selectionner, afin de ne pas modifier la visibilite des etats masques.
