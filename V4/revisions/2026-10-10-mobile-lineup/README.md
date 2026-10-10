# Introduction de match sur telephone

## Symptome et diagnostic

L'utilisateur signale que, dans l'application installee sur telephone, la
presentation commence puis passe au jeu des la premiere carte. Le parcours
standard n'a pas reproduit cette coupure dans Chromium Android emule.

Une fragilite concrete a ete reproduite sur le build 4.6.16 : rejeter une
animation au premier indice fait remonter une exception dans `run()`, dont
le repli appelle `finish('skip')`. La presentation disparait et le moteur
resout immediatement le tirage. Cette injection reproduit le symptome,
mais ne constitue pas une observation du compositeur du telephone reel.

Un autre risque existait : annuler un vol sans resize laissait sa promesse
en attente. Enfin, un element dont les dimensions sont momentanement nulles
ne doit pas produire de transformation avec division par zero.

## Correction

- Une animation refusee est remplacee par une presentation statique locale,
  sans appeler Passer et sans raccourcir les temps de lecture.
- Le retournement statique montre bien la face de la carte.
- Un vol annule conserve son echeance puis laisse avancer la sequence.
- Les retargets de resize sont revisionnes : un ancien vol ou repli ne peut
  pas terminer le nouveau mouvement, ni survivre a un skip/destruction.
- Les geometries non finies ou cibles sans dimensions ne sont pas animees.
- Les cinq paires, indices, suspense, Tip Off et tirage restent inchanges.
  Aucun changement du moteur, du RNG, des scores ou des sauvegardes.

## Verification

`V4/site/lineup-mobile.browser.test.cjs --all` utilise de nouveaux profils
Chromium tactiles Android, viewport Razr 412 x 1007, densite 2.625 et detection
standalone ; ce n'est pas un test sur un telephone physique. IndexedDB et
localStorage restent dans des contextes jetables, distincts du profil humain.

Scenarios : parcours normal, refus d'un indice, refus de toutes les animations,
annulation d'un vol, variation de hauteur puis rotation, mode animations
reduites a 320 px. Chaque cas verifie l'ordre P1-P5, les temps de lecture,
les faces visibles, les limites du viewport, le tirage, l'identite de l'etat
de combat et le nettoyage. Un second lancement verifie le bouton Passer tactile.

Preuve avant correction : `qa/before-rejected-animation/results.json`.
Preuves apres correction et captures : `qa/after/`.
Le rapport de publication et les controles du build sont dans
`V4/releases/2026-10-10-v4.6.17/`.

La validation sur le Razr physique de l'utilisateur reste necessaire pour
confirmer que cette fragilite etait bien la cause de sa coupure.
