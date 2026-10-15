# Extension des ultimes de reliques

Implementation publiee en 4.6.43, commencee le 12 octobre 2026.
Voir le [rapport de livraison](../../releases/2026-10-13-v4.6.43/README.md) et
le [schema complet](../../docs/RELIQUES_ULTIMES.md).

## Verification reproductible

Depuis la racine du checkout actif, avec les dependances de developpement :

```powershell
node V4/revisions/2026-10-12-ultimate-expansion/validate.cjs
node V4/site/ultimate-expansion-ui.browser.test.cjs
```

Le premier script execute les commandes Node du workflow Pages sans en
affaiblir les assertions. Les anciennes fixtures conservent explicitement leurs
definitions 4.6.42 ; les nouvelles suites couvrent les nouveaux effets.
Le navigateur utilise un contexte isole et ne touche pas aux profils personnels.

## Captures

- `verification/desktop-griever-pendant-bonus-before-defense.jpg` : +60 reel
  et total avant la DEF.
- `verification/razr50-gotham-riddle-box-before-enemy-roll.jpg` : prediction
  avant le jet adverse, choix bloquant.
- `verification/compact-log-pose-reinforcement-choice.jpg` : choix Potion ou
  Puissance sur un renfort en 320 px.
- `verification/desktop-kalistar-nestown-beacon-deployment-gifts.jpg` : dons
  automatiques a l'arrivee d'un renfort.
- `verification/ui-results.json` : scenarios navigateur et dimensions.
- `verification/workflow/results.json` : resultat de chaque commande.
- `verification/first-three/` : retour navigateur sur Momo, Aeris et 2B.

Les images illustrent les scenarios verifies ; les tests moteur constituent
la preuve des calculs, consommations, sauvegardes et attributions de statistiques.
