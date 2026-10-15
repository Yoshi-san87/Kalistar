# Rikka V4-02 - Vitrine et icones

Carte : `../../cartes/RIKKA_V4_02_VITRINE_ICONES.png`.
PSD editable : `../../templates/RIKKA_V4_02_VITRINE_ICONES.psd`.
Maitre : `../KALISTAR_V4_TEMPLATE_03E_ELECTRO_RIKKA.psd`.
Registre : `../registry-electro-03e.json`. Profil : `card.json`.

## Illustration

Vitrine large sur un socle de taille humaine. La vitre frontale est relevee : Rikka prend le reliquaire de face, sans porte laterale incompatible avec son geste. Personnage, blessure, fouet et Kalistel Luxo conserves dans la composition. Illustration generee separement par l'outil integre `image_gen`, jamais avec le cadre de carte.

Source incorporee : `../../assets/illustrations/42_ELECTRO_RIKKA_V4_02_VITRINE_FRONTALE.png`. Prompt final : `prompt-vitrine-relevee.txt`. La proposition a porte laterale et l'essai de porte frontale sont des recherches rejetees, pas des variantes approuvees. Le rendu final reste soumis a validation artistique utilisateur.

## Calibration optique

Le dodge etait ajuste a un carre de 99 px : ses extremites pouvaient donc depasser le disque inscrit. Il est maintenant ajuste uniformement selon son contour visible, avec une marge a l'interieur du cercle. Le motif entier est conserve, sans decouper ses extremites.

Le trefle avait herite du decalage applique historiquement au calque DEF D4. Surtout, le centre du disque peint ne correspond ni au centre des limites du support, ni au repere du champ numerique : son cerclage interieur est centre vers (736.85, 772.95). Le transfert vers D1 ne verifiait pas cette geometrie reelle. Le repere actuel aligne la masse verte des quatre feuilles sur ce cerclage, en excluant l'or et ses reflets. La correction n'utilise ni le centre du fichier transparent, ni le rectangle du support. Le controle final remesure aussi le bord peint, independamment des coordonnees declarees dans le registre.

Les ancres normalisees et les centres cibles sont enregistres dans `effectLayouts`. `K.optical()` les applique en coordonnees absolues, avec une tolerance de quantification Photoshop, sans accumuler des translations a chaque rendu. Toute nouvelle icone doit etre mesuree puis controlee visuellement ; on ne reutilise pas aveuglement l'ancre d'un autre motif.

Les anciens registres sans `effectLayouts` gardent leur comportement. Aucune modification des cartes Momo, Taulio ou Jelly-Joe deja approuvees.

## Verification

`verification.json` documente les pixels du cadre, la sauvegarde/reouverture des deux PSD, une reconstruction depuis le maitre enregistre, la stabilite d'une deuxieme calibration, les centres et l'inscription des silhouettes dans leurs cercles. Ces comparaisons de pixels donnent toutes zero difference. Le PNG incorpore son profil sRGB a 300 ppp, sans modifier les pixels du rendu Photoshop. `barcode-verification.json` teste le code-barres reel. `sources.json` conserve les empreintes des fichiers proteges ; `visual-review.json` consigne la revue a grande et petite taille.

Les seules couches graphiques modifiees sont `ART - RIKKA`, `DEF D6 - effet dodge` et `DEF D1 - effet retry`. Le profil conserve les statistiques, le P2, l'unique attaque magique D5 et le trefle de relance DEF. La V3, le site et la BDD restent inchanges. Les controles techniques ne valent ni validation artistique, ni equilibrage confirme en match, ni BAT imprimeur.
