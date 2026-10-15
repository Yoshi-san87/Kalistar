# Kalistar V4.5.23 - Suivi du combat par tours et rounds

Demande utilisateur du 6 octobre 2026 : une ligne de stations compacte, avec
tours et rounds, sans ABBA visible ni texte explicatif. Publication personnelle
uniquement sur `Yoshi-san87/Kalistar`, apres V4.5.22.

## Affichage

- Une station `T` par action ; un groupe `R` par serie d'actions du meme camp.
- R1 contient T1, R2 T2/T3, R3 T4/T5, etc., quel que soit le gagnant du tirage.
- Onze stations glissantes sur PC, cinq sur telephone : passe, courant, avenir.
- Camp identifie par `J1`/`J2` et accent cyan/rose ; cristal rainbow sur le tour
  courant, coche lorsqu'il est resolu. Le passe reste visible et discret.
- Cadre cuivre, texture de grimoire et Cinzel existants. Hauteur inchangee :
  36 px PC, 34 px telephone. Separateurs sans incidence sur les dimensions.
- Annonce accessible complete ; Reduced Motion sans animation du cristal.

## Compatibilite

`site/combat-timeline.js` derive les groupes depuis l'ordre canonique du moteur.
Pas de nouvelle regle, fatigue, statistique ou migration. Les archives ABAB,
equipements, supports, RNG et numeros historiques `state.round`/`event.round`
restent intacts. `position(state, event.round)` rend possible une future lecture
statistique par round sans reecrire les anciens evenements.

## Validation

```powershell
node --test --test-isolation=none V4/site/combat-timeline.test.cjs V4/site/turn-timeline.test.cjs V4/site/scoreboard.test.cjs V4/site/turn-order.test.cjs V4/site/lineup-intro.test.cjs V4/deploy/build.test.cjs V4/deploy/pwa.test.cjs V4/site/navigation.test.cjs V4/site/ui-system.test.cjs
$env:KALISTAR_VERIFICATION_DIR='V4/site/verification/combat-timeline/captains'
node V4/site/turn-order.browser.test.cjs
node V4/deploy/build.cjs
$env:KALISTAR_BUILT_SITE='1'
$env:KALISTAR_VERIFICATION_DIR='V4/site/verification/combat-timeline/pages'
node V4/site/combat-timeline.browser.test.cjs
$env:KALISTAR_VERIFICATION_DIR='V4/site/verification/combat-timeline/scoreboard'
node V4/site/scoreboard.browser.test.cjs
```

41 tests unitaires passent, dont 250 matchs complets avec reprises. Le test
navigateur dedie joue aussi deux matchs reels non letaux jusqu'au tour 200
avec les deux ouvreurs ; 42 controles passent en local et sur le build Pages.
Il couvre transitions reelles via le bouton suivant, reload, neuf formats,
grands numeros de tours/rounds, Reduced Motion et preview Razr 50.
Le test scoreboard valide les scores reels 0/kill/10, la reprise, l'IA et huit
formats sans chevauchement. Les dix controles de presentation des capitaines,
egalite, passage, reprise, IA et chronologie passent aussi. Les profils et
IndexedDB QA sont isoles.

Captures et resultats : `site/verification/combat-timeline/`, notamment
`pages/track-17-1440.png`, `pages/track-17-412.png`, `pages/track-200-320.png`
et `pages/razr50.png`. Aucun ancien rapport, verrou ou media natif n'est modifie.

## Publication

Le workflow Pages inclut le nouveau test pur. Commit et tag annote `v4.5.23`
publies atomiquement sur `main`. Apres la reussite du workflow, executer :

```powershell
node V4/releases/2026-10-06-combat-timeline/public-check.cjs
```

Ce controle compare le site public au commit du tag, aux empreintes de son
manifeste et aux versions des deux en-tetes. Le dossier `dist` n'est pas versionne.
