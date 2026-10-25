# Kalistar 4.7.6 - Bibliotheque Astraball

## Perimetre

- 170 identites animees disponibles, dont les 30 historiques preserves.
- 140 nouveaux atlas de seize poses, fond transparent, 384 x 384 pixels.
- Inventaire canonique de 368 personnages pour 462 modeles de cartes.
  Les 198 identites en attente ne sont pas presentees comme deja produites.
- Pagination du vestiaire par 30, recherche sur toutes les identites, melange
  global et conservation des selections entre pages. Pas de doublon des dix
  premiers personnages dans le vestiaire.
- Galerie avec chargement des images et animations limite aux sprites visibles,
  nettoyage de la vue et respect de Reduced Motion.
- Aucune modification des cartes natives, des statistiques de jeu, des comptes
  ou des sauvegardes personnelles. Les futurs profils athletes sont hors scope.

## Sources

Generation avec image_gen integre, template Kaylis et illustration canonique
de chaque personnage. Consignes et empreintes dans
[la production v3](../../astraball/sources/sprites-v3/README.md).
Les corrections anatomiques de Barret, Red XIII, Venom Snake et Miller gardent
leurs sources precedentes. Les atlas utilisent l'alpha reel, des marges de
trois pixels et un appui commun, sans modifier les atlas historiques.

Sauvegarde hors checkout verifiee :
`Documents/Sauvegardes-Kalistar/2026-10-25-astraball-sprites-v3-170/`.
428 fichiers et leurs SHA-256. Les PNG ne sont pas ajoutes a Git.

## Verification

- CI complete sur copie isolee : 104 invocations, 1986 tests reussis,
  deux ignores, aucun echec.
- Suite native locale : 14 invocations, 154 tests reussis avec les medias et
  dependances du poste. Ce controle tourne dans le checkout source ; les
  modifications de profils athletes n'interviennent pas dans ces groupes.
- Sept controles de bibliotheque et medias reussis sur les 170 identites.
- Build Cloudflare : 462 cartes, 1803 fichiers, 1125,8 Mio.
- Galerie verifiee a 1440 x 960, 412 x 915 (Razr) et 320 x 800 : filtres,
  zoom, retournement, animations, redimensionnement et Reduced Motion.
- Astraball verifie sur cinq formats, dont Razr et paysage : 170 choix,
  pagination, selections, arene, actions, course et sauvegarde/rechargement.
- Parcours Collection, Story, Decks et Arene verifies sur le build, avec
  telechargement PNG, reprise de match et version PC/mobile coherente.
- Captures et journaux conserves dans `work/astraball-sprites-v3/` :
  `qa-170/`, `site-170/`, `arena-170/`, `ci-170-r3.log` et
  `local-source-170-r2.log`.

Le commit exact est reconstruit par prepare-release puis reteste avant son
 envoi a Cloudflare. Les preuves finales restent dans work/publication/ et
 work/astraball-sprites-v3/ ; aucun verrou historique n'est assoupli.

## Limites

Livraison intermediaire : la production des 198 autres personnages continue.
Une apparence par characterId, pas encore toutes les variantes de cartes.
Les controles mobiles utilisent Chrome emule, pas un telephone physique.
