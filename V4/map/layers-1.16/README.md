# Test de retouche locale 1.16

## Intention

Zone nord-ouest indiquee par l'auteur : extension du plateau neigeux,
toundra au nord et haute chaine continue formant une barriere avec les
terres temperees. Relief naturel, pas un mur construit. DA de l'atlas
sepia conservee. Date : 12 octobre 2026.

## Processus

1. Extraction du fond 1.15 : x=115, y=35, largeur=450, hauteur=205.
2. Generation de cette zone seule avec image_gen, pas de la carte complete.
3. Mise aux dimensions exactes du recadrage et integration par masque
   polygonal a transition douce de 18 pixels vers l'interieur.
4. Ajout d'un calque Relief nord-ouest au-dessus du fond initial verrouille,
   sous les groupes de villes. Le masque PSD est editable et non destructif.
5. Inspection de la zone et de la carte assemblee ; comparaison des pixels
   hors support du masque, relecture du PSD et controle des villes.

La generation seule ne preserve pas exactement les marges du recadrage.
C'est le masque et l'assemblage deterministe qui assurent cette preservation.
Le polygone et les parametres sont dans `zone.json`. Aucune retouche du
fond original ni des villes ; masquer le nouveau calque restaure la 1.15.

## Livraison

- `kalistar-map-1.16.psd` : fond 1.15, calque de relief masque, villes intactes.
- `kalistar-map-1.16-preview.png` : assemblage avec les villes.
- `../kalistar-map-1.16-base.png` : export du terrain avec la retouche.
- `zone-before.png` / `zone-after.png` : controle local avant/apres.
- `zone-generated.png` : sortie originale du generateur.
- `zone-fitted.png` : sortie ramenee aux dimensions du recadrage.
- `zone-mask.png` : masque en niveaux de gris.
- `user-zone-reference.png` / `zone.prompt.txt` : reference et prompt exact.
- `verification.json` / `provenance.json` : controles et empreintes.

`node V4/map/layers-1.16/build-zone-map.cjs` reconstruit cette livraison
avec sharp du runtime et ag-psd installe pour la 1.15. Ne pas reconstruire
sur un PSD ayant recu des retouches manuelles sans une nouvelle version.

Verification : 34 323 pixels modifies dans la zone, 1 537 690 pixels hors
masque compares sans changement. Calque initial, images, positions et noms
des villes preserves. Masque et composite relus depuis le PSD avec succes.
Ouverture native dans Photoshop non testee ici. Site non modifie.
