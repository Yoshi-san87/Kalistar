# Kalistar 4.7.8

## Perimetre

- Echelle Astraball derivee des mensurations et des silhouettes peintes.
  Gabarit visuel borne a 100..300 cm, compression pour lisibilite et enveloppe
  de grille ; les vrais chiffres des profils sont preserves.
- Template 384 x 384 / seize cases 96 x 96 / appui 90 inchange, aucune retouche
  des PNG. Meme echelle dans toutes les animations et orientations.
- Ballon porte, passe/tir et zone de selection suivent les nouvelles dimensions.
- 269 apparences disponibles, dont 99 ajouts valides depuis 4.7.7.
  Les propositions en attente restent exclues du runtime.
- Aucun changement de statistiques, regles, collision ou schema de sauvegarde.
- Travaux concurrents sur les arenes/camera exclus de cette livraison.

## Sources

La bibliotheque couvre les identites approuvees du catalogue Kalistar ; aucun
sprite n'accorde une carte ou un avantage de jeu. Sources et atlas sont conserves
aux chemins de production. Sauvegarde independante verifiee hors checkout :
`2026-10-25-astraball-sprites-v3-269`, 798 fichiers / 545242190 octets.
Les PNG restent hors Git, avec empreintes dans le registre de medias publics.

Le module pur `src/sprite-sizing.mjs` et [le guide](../../astraball/SPRITES.md)
documentent les bornes et le repli des tailles inconnues. Simone utilise un
gabarit geant de presentation, sans lui inventer une taille documentaire.

## Verification

Les tests et preuves de cette livraison sont executes dans une copie figee du
perimetre, pour ne pas inclure les modifications d'arenes encore en cours.
Resultats executes, detailles dans [qa.json](qa.json) :

- Organisation : OK, 16124 fichiers examines avant ajout du rapport final.
- Suite CI locale complete : 104 invocations, 1997 tests passes, 2 ignores,
  aucun echec. Suite native locale : 14 invocations, 154 tests passes.
- Calibration/integrite : 12 tests passes ; pixels des atlases historiques
  identiques, transparence et appui commun conserves.
- Comparaison Barret/Luffy/Chopper/Simone sur PC, Razr et petit ecran ;
  six configurations de projection, clips, miroir, selection et ballon porte.
- Bibliotheque : 269 sprites, filtres, zoom, miroir, Reduced Motion,
  course animee et lancer fini.
- Vestiaire et terrain : les 269 apparences ont demarre une rencontre.
  PC, grand ecran, Razr, compact et paysage ; passes, interception, charge,
  but a deux points, animations, rechargement et isolation des profils.
- Build Cloudflare : 462 cartes, 1907 fichiers. Collection, Decks, Arene,
  lecture des fiches, telechargement et reprise de sauvegarde verifies sur
  desktop et telephone sans erreur HTTP.

Les essais initiaux sur le checkout partage ont rencontre les changements
d'arenes non termines ; ils ne servent pas de preuve de livraison. La copie
isolee a ensuite recu ses dependances natives manquantes avant relance complete.
Aucun ancien verrou, rapport ni test de gameplay n'a ete assoupli.
Les captures detaillees et journaux restent dans `work/astraball-sizing/`.
