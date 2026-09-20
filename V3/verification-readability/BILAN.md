# Lisibilite V3 - 15 septembre 2026

## Changements

- Reserve : PNG integral 797 x 1388, apercu agrandi et contenu dans le viewport. En 1600 x 1080, l'image atteint environ 900 px de haut au lieu de 510.
- Duel : six compteurs propres au UID de chaque combattant dans le match courant. Kills/skull, stops/ban, ATK/sword, DEF/shield, trefles/clover et Reraise/heart. Les deux derniers mesurent les attributions par l'auteur, jamais les consommations. Les historiques partiels restent explicites.
- Bilan : quatre onglets, pagination de tous les exemplaires et des ex aequo, colonnes et portraits alignes, tri sur un critere visible, navigation clavier et adaptation aux ecrans courts. Pas de scroll interne.
- Deck : dix slots en deux rangees de cinq sur toute la largeur disponible. Visualiseur droit conserve. Echanges souris, poignee tactile, clavier ou deux clics ; annulation possible et aucun changement de composition/ownership. La hauteur des grandes cartes peut necessiter le defilement naturel de la page, sans barre visible.
- Tour suivant reste manuel. Aucune modification des regles, schemas de BDD, profils des 41 cartes, assets ou fichiers d'impression.

## Verification

- `scripts/verify_match_readability_ui.cjs` : 7 groupes, aucune exception ; vrais fichiers du site, Chrome et IndexedDB temporaires. Compteurs compares au moteur, 20 UID accessibles une seule fois, deplacement reel du deck puis sauvegarde/rechargement, proprietaires et match inchanges.
- Formats controles : 1600 x 1080, 1440 x 900, 1024 x 768, 390 x 844, 360 x 740, 844 x 390 ; deck large en 2560 x 1440. Captures finales dans ce dossier.
- `site/deck-builder-reorder.test.cjs` : 22 controles navigateur, dont tactile reel, clavier, emplacements vides, copies identiques, annulations et remontage.
- `site/match-report.test.cjs` : 16 controles, dont compteurs attribues/consommes distincts, archives, ex aequo et absence de chevauchement entre lignes mobiles.
- `scripts/verify_flow_decks_ui.cjs` : 17 groupes, y compris Tour suivant, IA, renforts, victoire et profils locaux.
- `scripts/verify_stacked_buffs_ui.cjs` : 23 groupes sur fichiers stabilises ; aucun changement de source durant la passe finale.
- `scripts/verify_site_v3.cjs --require-final --require-assets` : 13 groupes, aucun asset absent, aucune erreur navigateur.
- `scripts/verify_db_engine_contract.cjs` : 9 groupes, imports, archives et statistiques coherents.
- Tests unitaires : moteur 61, V3 26, statistiques 18, buffs 11, regles deck 13, bibliotheque deck 41, presentation des compteurs 3. Tous passent.

La base personnelle du navigateur utilise pour jouer n'a pas ete ouverte ni modifiee par ces controles. Les changements sont des fichiers V3 ; recharger la page suffit.
