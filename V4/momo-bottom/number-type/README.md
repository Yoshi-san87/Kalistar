# Momo V4 : chiffres ATK et DEF plus lisibles

Livrables : `V4/templates/MOMO_V4_05_CHIFFRES_LISIBLES.psd` et `V4/cartes/MOMO_V4_05_CHIFFRES_LISIBLES.png`.

Les neuf valeurs numeriques ATK/DEF utilisent maintenant Bahnschrift Bold SemiCondensed, en texte natif Photoshop. Les chiffres sont droits, sans zero barre, avec un blanc chaud, un filet sombre de 1 pixel et une ombre courte. Les anciennes ombres diffuses des valeurs ont ete remplacees.

Deux hauteurs visuelles : environ 52 pixels pour les deux grands cercles D6 et 33 a 34 pixels pour les petits cercles. Le centrage utilise les limites des glyphes sans inclure les effets de calque. Les matrices de texte historiques peuvent produire de legeres differences de corps nominal ; les hauteurs visibles sont controlees.

Les valeurs restent 202, 167, 84, 29 en ATK et 200, 167, 100, 59, 11 en DEF. Aucun changement sur les positions 3 et 4, les effets speciaux, les cercles, le drapeau, son ombre, le code-barres ou le bas de la carte.

`typography.json` recense les polices, valeurs, tailles et centres. `verification.json` confirme que tous les changements de pixels se limitent aux empreintes des chiffres et de leurs effets, que les valeurs restent editables et que le PSD rouvert reproduit l'export.

`game-size-comparison.png` montre les versions avant/apres par paires, a 180 puis 240 pixels de large. `stats-comparison.png` compare les anciens chiffres a gauche et les nouveaux a droite.

Le PSD exige la police Bahnschrift pour l'edition des textes. Le PNG conserve le rendu sans dependance de police. Canevas : 897 x 1497 pixels, 300 ppp, sRGB. La revision precedente reste intacte.
