# Remise en ordre du 14 octobre 2026

Demande : rendre le depot comprehensible et durable sans affecter le jeu.
Base : commit `4bcc98b2803316e5e08c4c9e05210decebb7da54` (4.6.61).

## Methode

- Les six anciens guides d'entree ont ete copies et compares octet par octet
  avant reecriture ; snapshots dans `docs/historique/2026-10-14/`.
- Les guides actifs distinguent jeu, production, lots dates et fichiers locaux.
  Pas de transfert de carte native, PSD, profil, composant ou arborescence.
- Les chemins V1-V4/main/Templates et les jonctions locales restent inchanges.
- La liste CI de 84 invocations a ete extraite sans changement d'arguments
  ni d'ordre vers le registre commun ; tests de non-perte inclus.
- Les 292 journaux de preuves existants et 136 tests historiques non inclus
  dans cette CI sont conserves par chemins exacts. Ces constats ne classent
  pas automatiquement de nouveaux logs ou tests.
- Les fichiers temporaires suivants ont une destination ignoree : `work/`.
  Le controle d'organisation ne supprime rien.

## Constats preserves

- [ci-before.json](ci-before.json) : invocations du workflow avant rangement.
- [retained-evidence.json](retained-evidence.json) : anciens journaux suivis.
- [retained-tests.json](retained-tests.json) : anciens tests de lots non executes
  par la CI precedente, sans suppression ni affirmation qu'ils passent.

Ces listes datent l'operation ; ne pas les regenerer pour faire accepter
un nouveau fichier mal range. La politique active est
[organisation.json](../organisation.json), les suites actives sont
[validation-suites.json](../validation-suites.json).

## Verification

Les empreintes avant/apres, commandes et resultats de cette livraison sont
dans [4.6.62](../../V4/releases/2026-10-14-v4.6.62/README.md).
Les essais intermediaires restent locaux. Les travaux non termines d'autres
taches ne font pas partie de cette publication.
