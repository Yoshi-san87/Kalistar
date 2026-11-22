# Map 1.40 - Archipel et petits ponts

L'auteur valide la proposition et demande sa publication le 22 novembre 2026 :
"parfait tu peux push cette version de la map sur le site". Livraison jeu 4.7.36.

- [Carte complete](kalistar-map-1.40-preview.png)
- [Detail integre](islands-detail.png)
- [PSD editable](kalistar-map-1.40.psd)
- [Validation et sauvegarde](publication-approved.json)
- [Medias runtime](published-media.json)
- [Sources et prompt de la proposition](README.md)

L'export WebP sans perte reprend exactement le terrain approuve, sans villes
incrustees. Les huit emblemes, noms, coordonnees et portraits sont conserves.
Les nouveaux ponts rejoignent le continent par le nord uniquement. Le masque
modifie 8 237 pixels ; le reste de la carte est identique a 1.39.

La version courante est definie par `versions.json` et `KalistarSite.atlas`.
La nouvelle Collection Album conserve ses textures et sa disposition propres.
Les propositions, leur statut initial et leurs empreintes ne sont pas reecrits
apres approbation. Tous les originaux sont sauvegardes hors du checkout.

Le test 1.39 garde sa verification historique de l'asset 1.39 ; la version
courante est maintenant couverte par le test 1.40 et les tests du module Map.
