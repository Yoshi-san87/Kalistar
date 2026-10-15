# Kalistar 4.6.4 - Batman et Joker

Publication personnelle vers `Yoshi-san87/Kalistar`, branche main et tag
annote `v4.6.4`, apres la v4.6.3.

## Contenu

- Batman et Joker jouables depuis les illustrations fournies intactes.
- Deux nouveaux PSD editables et PNG natifs, IDs 49901509 et 49901510.
- Collection Batman : 10 cartes. Catalogue complet : 306 cartes.
- Profils HUMAIN sans cristal, effets existants et limites de roles respectes.
- Anciennes cartes, compositions, sauvegardes et matrices preservees.
- Versions desktop/mobile et assertions synchronisees en 4.6.4 ; edition V4
  et schema de sauvegarde inchanges.

## Limite explicite

La nouvelle banniere au logo Batman n'est PAS livree : l'outil image a refuse
l'adaptation, y compris avec le logo fourni. La tour gothique noire et or
precedemment validee reste en place. Les requetes, erreurs et sources sont
documentees dans le lot, sans modifier les anciens rapports ou verrous.

## Validation locale

- Deux preuves natives : cadre et reouverture PSD sans difference,
  codes-barres valides, lisibilite inspectee.
- 71 tests d'integration, anciens profils Gotham, catalogue, collection,
  compositions, mises a jour, build et PWA passes.
- 14 scenarios de persistance isoles passes.
- Deux fiches controlees a 1440/412/320 px, arene desktop/mobile et reload.
- Build Pages : 306 cartes, 1074 fichiers, 741.8 MiB.
- Six tests de ce lot ajoutes a la CI, avec hydratation des preuves LFS.

Details et captures : `V4/expansions/2026-10-09-gotham-completion/`.
La modification locale independante ajoutant le test de performance au
workflow ainsi que les autres travaux hors perimetre ne sont pas inclus.
