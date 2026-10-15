# Kalistar V4.5.15 - Timeline mobile et Tip Off

Demande utilisateur du 5 octobre 2026. Publication reservee au depot personnel
`Yoshi-san87/Kalistar`, branche `main`, tag annote `v4.5.15`.

## Changements

- Smartphone et paysage compact : cinq etapes de timeline de largeur egale,
  sur toute la largeur du bandeau existant de 34 px. Aucune phrase visible.
  L'annonce du camp courant reste disponible aux lecteurs d'ecran.
- Indices arme, cristal et faction : 850 ms chacun, au lieu de 600 ms.
- Retournement : 500 ms ; carte revelee : 1 200 ms au lieu de 400 ms.
- Depart et retour : 400 ms ; suspense avant retournement conserve a 380 ms.
- Cinq paires : 27,65 s hors chargement, au lieu de 18,5 s. Reduced Motion
  conserve les temps de lecture sans mouvement ni rotation : 21,25 s.
- Une popup Tip Off avec la couronne Kalistar apparait 1,8 s apres la pose
  des dix cartes, avant le depart des capitaines. Aucun clic supplementaire.
- Le tirage reste lisible : pause de 650 ms avant les jets, 1 s en cas
  d'egalite et 1,8 s pour le gagnant avant le retour des capitaines.
- Passer, Escape, retour au menu, reprise et nettoyage incluent cette popup.

L'ordre ABBA, les jets D6, les statistiques, les effets d'equipement, les PNG
et PSD natifs et le schema des sauvegardes restent inchanges. Le desktop
conserve les libelles de sa timeline. Aucun nouveau media n'est genere.

## Validation

Sur Node 24, les tests `node --test` enumeres dans le workflow Pages passent :
**148 tests, 0 echec**, dont 250 matchs ABBA complets avec reload a chaque phase.
Les sondes autonomes Kalistel et ambiance passent egalement.

```powershell
node --test --test-isolation=none V4/site/lineup-intro.test.cjs V4/site/turn-order.test.cjs
node V4/deploy/build.cjs
$env:KALISTAR_BUILT_SITE='1'
$env:KALISTAR_VERIFICATION_DIR='V4/site/verification/tipoff-pace/pages'
node V4/site/turn-order.browser.test.cjs
$env:KALISTAR_VERIFICATION_DIR='V4/site/verification/tipoff-pace/lineup'
node V4/site/lineup-intro.browser.test.cjs
```

Le premier lot cible contient 15 tests reussis. Le build contient 211 cartes,
671 fichiers et 524,7 Mio de ressources jouables ; les preuves QA sont exclues.

Les deux suites Chrome/Playwright passent sur le build Pages reel. Les profils
et bases IndexedDB de QA sont isoles : aucune collection personnelle utilisee.

- Les cinq paires gardent ordre, indices persistants et ancrages aux vraies cartes.
- Mesure de chaque indice >= 840 ms et de chaque lecture revelee >= 1 190 ms.
- Tip Off suit toutes les paires et precede le depart des vrais capitaines.
- Egalite, victoire, quatre transitions de tour et remplacements verifies.
- Passer pendant Tip Off resout le tirage ; quitter retire la popup et l'inert.
- Reload conserve les jets deja tires et ne rejoue pas les cinq paires.
- L'IA n'ouvre le combat qu'apres la ceremonie ; les presets ont leur capitaine.
- Popup sans debordement : 1440 x 1000, 412 x 1007, 320 x 568 et 844 x 390.
- Frise mobile : pleine largeur, cinq cellules egales, libelle visuellement
  masque, pas de collision avec le score ou le menu.
- Indices/retournement : 320, 360, 390, 412, 430 et 844 px ; rotation en cours.
- Reduced Motion, resize, nettoyage et preview Motorola Razr 50 verifies.

Preuves machine :
[tirage, chronometrage et geometrie](../../site/verification/tipoff-pace/pages/results.json),
[presentation](../../site/verification/tipoff-pace/lineup/results.json),
[indices et ancrages](../../site/verification/tipoff-pace/lineup/samples.json).

## Captures Controlees

- [Popup desktop](../../site/verification/tipoff-pace/pages/desktop-tipoff.png)
- [Popup smartphone](../../site/verification/tipoff-pace/pages/tipoff-412.png)
- [Popup 320 px](../../site/verification/tipoff-pace/pages/tipoff-320.png)
- [Popup paysage](../../site/verification/tipoff-pace/pages/tipoff-844.png)
- [Timeline smartphone en duel](../../site/verification/tipoff-pace/pages/timeline-duel-412.png)
- [Timeline paysage](../../site/verification/tipoff-pace/pages/timeline-duel-844.png)
- [Preview Razr 50](../../site/verification/tipoff-pace/pages/razr-preview.png)

## Publication

Les affichages desktop, mobile et les assertions de release portent 4.5.15.
Pousser uniquement les fichiers de cette livraison, `main` et son tag ensemble.
Apres publication, verifier le workflow Pages et le titre public 4.5.15,
ainsi que le hash du commit dans `release.json` avant d'annoncer le site en ligne.
Les anciens rapports et les modifications locales hors scope sont preserves.
