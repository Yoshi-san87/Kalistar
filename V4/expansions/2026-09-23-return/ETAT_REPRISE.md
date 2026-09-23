# Etat de reprise - 23 septembre 2026

## Mise a jour - publication du 24 septembre

La production et la publication locales sont terminees : 22 nouvelles cartes,
une arene, catalogue de 80 cartes / 23 arenes, regression native 38/38 et
controles navigateur ordinateur/telephone reussis. Voir [RESULTAT.md](RESULTAT.md)
et les recus de publication. Les sections suivantes conservent le constat
historique du blocage et ne decrivent plus l'etat courant.

## Reprise du 24 septembre

L'utilisateur a autorise le nettoyage en reponse a la proposition precise de
supprimer `Kalistar.zip`. Cette seule archive a ete supprimee, liberant
7 372 398 907 octets. Espace libre observe ensuite : 21 302 255 616 octets.
Voir `maintenance/cleanup-2026-09-24/RAPPORT.md` a la racine du projet.
Le rendu natif est autorise a reprendre avec surveillance de l'espace disque.
Les paragraphes de blocage ci-dessous decrivent le constat du 23 septembre.

## Statut reel

22 illustrations et profils prepares, dont 11 identites V3 conservees, quatre
variantes Kalistar et sept cartes NieR/Replicant. Les trois planches
`visual-review/preview-*.png` ont ete examinees : ce sont des apercus, pas des
rendus Photoshop definitifs. L'arene du village et la banniere Replicant ont
leurs preuves techniques et une revue visuelle liee aux empreintes.

**Aucune nouvelle carte ni arene publiee. Aucun commit ni push de ce lot.**

Photoshop a echoue sur Julienne : disque de travail sature. Il a ete ferme
normalement, sans document ouvert, sans changement de preferences et sans
suppression de source. Lire `ATTEMPT-01.md`. Environ 14 Go restent libres sur C:.

Une question attend la reponse de l'utilisateur : dispose-t-il d'une autre
copie de l'archive privee `Kalistar.zip`, et autorise-t-il sa suppression locale
pour liberer 7 372 398 907 octets ? **Ne pas supprimer sans sa reponse.**
L'autorisation de push n'est pas une autorisation de suppression de sauvegarde.

## Verification deja effectuee

- `art-c/verify.cjs` : sept illustrations et leur provenance verifies.
- `gameplay-review.cjs` : catalogue candidat de 80 cartes, conservation exacte
  des 11 profils historiques et 22 matchs simules avec decks valides contenant
  chacun une nouvelle carte. Ce n'est pas une validation competitive.
- 43 tests : publication d'arene en environnement isole, pipeline du lot et
  nouveau module des collaborations.
- 67 tests : Atelier, designer, API, publications, reprise apres interruption,
  catalogue, arenes et construction du site statique.
- UI Replicant : revue isolee de l'en-tete sur cinq largeurs de 320 a 1600 px,
  voir `../../site/verification/replicant-ui/report.json`.
- Fichiers approuves et banques existantes preserves ; aucun verrou reecrit
  pour masquer une modification.
- Controle final de portabilite : 20 tests du pipeline passent et 1 336 chemins
  necessaires ne sont pas ignores par Git. Les 193 fichiers proteges et les
  31 creations existantes sont intacts. `evidence.cjs` archive les rapports de
  regression et renforce les controles de leurs rendus.

## Suite requise

1. Resoudre la capacite disque avec accord explicite, puis reprendre le rendu
   Photoshop serie : Julienne et Commander d'abord, puis les autres cartes.
   La revision explicite de portabilite a archive 41 fichiers, dont les 22
   preparations originales, dans `attempts/01-before-portable-evidence/`.
   Une nouvelle preparation est necessaire pour le code revise. Ne pas
   modifier les anciennes empreintes ni relancer la capture historique.
2. Verifier les 22 PSD/PNG, les champs natifs, le code-barres reel, le cadre
   fixe et la regression complete des anciennes et nouvelles references.
   Les preuves necessaires doivent etre archivees dans le lot suivi, pas
   exclusivement dans `atelier/data/jobs` ignore par Git.
3. Revoir les planches natives (`visual-review.cjs native`), lancer le preflight
   puis la publication des cartes. Publier ensuite l'arene et le drapeau via
   `arena/publish.cjs` selon `arena/PUBLISH.md`.
4. Verifier le catalogue attendu de 80 cartes et 23 arenes. Relancer le serveur
   local si son cache de modules est ancien, puis `browser-review.cjs` dans ses
   contextes isoles. Examiner les captures desktop/mobile et construire le
   site statique. Ne jamais tester sur les possessions reelles du navigateur.
5. Synchroniser et pousser seulement apres ces controles. Ne pas pousser des
   rendus partiels ou annoncer ces etapes deja terminees.

## Push demande par l'utilisateur

Destination verifiee : `https://github.com/Yoshi-san87/Kalistar.git`, branche
`main`, clone personnel dans `paquets-transfert/github-personnel-20260921`.
La racine de production n'est pas un depot Git. Le clone est propre ; base
verifiee `1f4e58acb4699272d72397ce180596d51ea3f33d`.

Comparer et verifier a nouveau la destination avant toute ecriture Git.
Conserver les `.gitattributes`, `.gitignore` et README propres au clone. Les
medias et PSD utilisent LFS. Exclure archives privees, donnees d'execution et
sauvegardes personnelles. Ne pas reutiliser les anciens scripts de push dont
la liste de fichiers et le commit de base sont fixes pour un autre lot.

Cette note est un constat de travail incomplet, pas une approbation artistique
de l'utilisateur ni une preuve de publication.
