# Kalistar V4.6.16

## Indice de performance 3

Demande utilisateur : mieux valoriser l'impact reel sans modifier les combats.
La puissance valorisee est plafonnee a DEF + 1 en ATK et a ATK en DEF, par duel
numerique definitif. Les statistiques ATK/DEF brutes restent disponibles.
Les gardes natives decisives au Block d'un allie donnent une assist (+3) au
donneur stable. Pas de double prime, auto-garde ou assist d'equipement.

Nouvelle formule seulement pour les nouveaux matchs. Les archives et reprises
indice 1/2 gardent leur formule, leurs metriques et leur MVP. Aucun reset des
parties, possessions, historiques ou bases personnelles.

Les rapports et statistiques distinguent les metriques valorisees et assists
DEF. Les moyennes n'inventent pas des zeros pour les generations non suivies.
Les huit petites statistiques des cartes de duel et les douze lignes de
carriere restent compactes. Les CSV identifient les trois generations.

Regles : [INDICE_PERFORMANCE.md](../../docs/INDICE_PERFORMANCE.md).
Campagne et limites : [rapport statistique](../../revisions/2026-10-10-performance-useful/README.md).

## Validation avant publication

- Snapshot isole du stage, ressources LFS hydratees depuis leurs SHA-256.
- 61 commandes de la vraie workflow Pages : 697 tests reussis.
- Build : 343 cartes, 1 169 fichiers, 809,5 Mo. Aucune source native modifiee.
- 4 000 matchs, toutes les 343 cartes et 28 arenes, indices 2/3 sur les memes
  evenements ; 200 replays moteur publie strictement identiques.
- 14 controles navigateur indice 3, 11 controles indice 2, zero erreur JS/HTTP.
- Imports repetes, faux donneur refuse, notes importees recalculees depuis
  l'etat valide, anciennes faces Jill et anciens trophees preserves.
- PC 1440/1920, Razr 412, compact 320, paysage 844 et Reduced Motion.
- Controle general Pages : Collection, lecture, telechargement PNG, Decks,
  Arene, reprise, publication additive ; aucun endpoint Atelier attendu.
- Sources stagees identiques aux fichiers testes, y compris les six fichiers
  de version et les hashes du moteur utilise pour les simulations.

Les anciens exports de verification et la modification locale independante
`performance.test.cjs` de la workflow ne font pas partie de cette release.
Les cartes Castlevania/Le Fauve publiees avant cette evolution sont conservees.

Preuves : [publication](qa/publication.json), [identite des sources](qa/stage.json),
[build](qa/build.txt), [navigateur indice 3](qa/browser-index3/results.json),
[archives indice 2](qa/browser-index2/results.json).

## Captures inspectees

- [PC : detail MVP](qa/browser-index3/desktop-mvp.png)
- [Razr : detail MVP](qa/browser-index3/razr-mvp.png)
- [Razr : assists et puissance valorisee](qa/browser-index3/razr-assists.png)
- [PC : carriere compacte](qa/browser-index3/desktop-career.png)
- Les autres formats et archives sont dans les deux dossiers navigateur.

## Publication personnelle

Depot unique : `https://github.com/Yoshi-san87/Kalistar.git`, branche `main`,
tag annote `v4.6.16`, push atomique branche + tag. Version desktop/mobile et
assertions synchronisees. Aucune nouvelle edition de carte ou version de base.

Apres le deploiement, `public-smoke.cjs <commit SHA>` verifie le commit public
et 14 assets compares au build teste. Le meme parcours navigateur indice 3
est rejoue sur Pages dans une base QA isolee. Les preuves post-publication
restent locales pour ne pas necessiter un second push sans nouvelle version.
