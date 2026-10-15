# Retour Au Passage Manuel

Revision du 15 septembre 2026, apres la premiere passe Decks et fluidite.

## Comportement

- Le resultat du duel, ses des et le detail ATK/DEF restent consultables sans
  limite de temps. Les cartes restent mises en avant jusqu'a confirmation.
- Le bouton Tour suivant devient actif une fois les animations terminees.
- Le clic est l'unique appel UI a `E.next`. Il conserve les controles de phase
  du moteur, change le camp actif et ouvre le choix du duel, les renforts ou
  le bilan final selon l'etat de la partie.
- Le retour anime des cartes utilise le mecanisme de placement existant.
- L'IA, la relance defensive automatique du trefle et l'attribution des buffs
  de l'IA restent automatiques a l'interieur de leur duel.
- Le score reste disponible apres navigation, inspection et rechargement.

## Nettoyage

Le minuteur a ete retire de l'application, pas seulement desactive par defaut.
Son module `turn-flow.js`, ses tests specifiques, son chargement HTML, les
styles de progression, son bouton pause et ses branchements ont ete supprimes.
Aucune occurrence de ces controles ne subsiste dans `site`.

Les anciennes preferences `autoAdvance` ne sont plus lues et ne peuvent pas
reactiver le passage automatique. Aucune suppression ou migration des parties,
bibliotheques, exemplaires ou carrieres n'a ete necessaire.

Le moteur, les regles de calcul, IndexedDB, les droits de propriete, les cartes,
les visuels et les fichiers d'impression n'ont pas ete modifies.

## Verification

Tests executes sur les vrais fichiers V3, en profils Chrome temporaires isoles.
Les donnees du navigateur utilisateur n'ont pas ete ouvertes.

| Controle | Resultat |
| --- | --- |
| Parcours navigateur flow/decks adapte au passage manuel | 17/17 |
| Buffs, ordres de resolution, animations, archives et clics | 23/23 |
| Site, assets, geometrie desktop/mobile et des 3D | 13/13 |
| Presets et imports de decks | 10/10 |
| Contrat moteur et IndexedDB | 9/9 |
| Tests moteur, buffs et statistiques | 116/116 |
| Validation des decks | 13/13 groupes |
| Bibliotheques de decks | 41/41 |

Le nouveau parcours injecte volontairement les anciennes preferences a true.
Il compare exactement l'etat, le RNG, le recapitulatif, les des et la sauvegarde
avant/apres attente, navigation et rechargement. Il controle l'attente apres
un duel humain ou IA, les renforts apres elimination et l'ouverture du bilan
apres le dernier kill. Le bouton est desactive pendant les animations.

Les suites historiques ne forcent plus une preference de mode manuel pour
passer : elles utilisent le comportement reel de l'application. Aucune
assertion de score, de cumul ou d'atomicite n'a ete affaiblie.

Rapports courants : `flow-decks-ui.json`, `../verification-buffs/report.json`,
`../verification-site/report.json` et `../verification-presets/report.json`.
Capture du recapitulatif avec le bouton : `tour-suivant-recap.png`.
