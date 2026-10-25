# Kalistar 4.7.11

## Buts en images

- Les U dessines au trait sont remplaces par deux vrais sprites transparents.
- Cinq materiaux suivent les arenes : blanc officiel, bois, fer, pierre et
  ivoire. Deux angles supplementaires preservent les vues classiques.
- Calage autour des trois cases de tir, echelle uniforme, aucun changement
  des cibles, des regles, des equipes, des sprites joueurs ou des sauvegardes.
- Sept WebP sans perte : 561544 octets au total. Seuls les assets utiles a
  l'arene sont charges ; les deux equipes partagent leur texture. Aucun
  timer, animation ou filtre supplementaire.
- Originaux, prompts et provenance conserves dans
  [sources/goals-v1](../../astraball/sources/goals-v1/README.md).
  Les sept originaux sont sauvegardes hors checkout, avec comparaison SHA-256.

## Verification

- Premier parcours visuel : 19 arenes PC et trois captures Razr.
- Camera : cinq formats, zoom, deplacement tactile, annulation du geste,
  cadrage et retour a la vue d'ensemble. Les cibles restent toutes presentes.
- Les controles d'images portent sur l'alpha reel, le milieu ouvert, la taille,
  les empreintes, le calage et l'absence d'etirement.

- Suite ci : 2047 tests reussis, deux ignores, aucun echec.
- Suite local : 154 tests reussis, aucun echec.
- Interface Astraball : PC, large, Razr, compact et paysage ; alpha des sept
  assets, vues classiques, tirs, interception, but, placement, sauvegarde/reload
  et idle verifies. Aucun debordement, erreur navigateur ou regression observe.
- La premiere execution du wrapper a refuse les medias non encore inscrits ;
  apres leur inscription explicite, la suite ci complete passe.

Le build exact est encore controle dans des profils jetables avant l'envoi.
Logs et captures dans work/astraball/goals-v1/. Les preuves de livraison
distantes restent dans ce dossier ignore. Aucun stockage joueur reel utilise.
