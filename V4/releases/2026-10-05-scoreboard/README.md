# Kalistar 4.5.20 - Scoreboard Kalistar

- Retrait de "Maintenant" dans l'arene, annonce accessible conservee.
- Compteur cuivre a coins tailles, matiere grimoire, chiffres Cinzel et
  Kalistel rainbow central. Deux camps lisibles sans nouvel effet permanent.
- Meme identite sur telephone, en 110 x 48 px ; aucune place prise aux cartes.
- A largeur intermediaire, les outils restent sur une seconde ligne pour ne
  plus comprimer le titre de l'arene. Le mode plein ecran conserve son format.
- Aucun changement de regle, sauvegarde, resultat, image native ou IA.

## Validation

35 tests Node passent, dont les 250 matchs ABBA complets existants.
Le test navigateur dedie verifie les scores issus d'un vrai match (0, premier
kill et 10), le reload, les noms locaux/IA et huit formats d'ecran :
1920 x 1080, 1440 x 1000, 1024 x 768, 412 x 1007, 390 x 844, 320 x 568,
699 x 900 et 844 x 390. Scores finaux recontroles sur 412 et 320 px.
Preview Razr 50, plein ecran et Reduced Motion verifies, sans profil personnel.

Captures et mesures : `V4/site/verification/scoreboard-kalistar/`.
Les dix groupes du navigateur ABBA passent. Le build Pages passe : 211 cartes,
689 fichiers, 527.3 Mo. Le test du scoreboard passe aussi sur le build Pages,
avec les memes mesures et sans appel a une API locale.
`public-check.cjs` controle le tag `v4.5.20`, la version publique, les badges
PC/mobile et les hashes des modules et des matieres reellement servis.
La mise en ligne ne doit etre annoncee qu'apres la reussite du workflow Pages
et de ce controle.

```powershell
node --test --test-isolation=none V4/site/scoreboard.test.cjs V4/site/turn-timeline.test.cjs V4/site/turn-order.test.cjs V4/site/lineup-intro.test.cjs V4/site/navigation.test.cjs V4/site/ui-system.test.cjs
node V4/site/scoreboard.browser.test.cjs
node V4/deploy/build.cjs
$env:KALISTAR_BUILT_SITE='1'
$env:KALISTAR_VERIFICATION_DIR='V4/site/verification/scoreboard-kalistar/pages'
node V4/site/scoreboard.browser.test.cjs
```

La publication suit la release d'armes 4.5.19 preparee dans un autre travail.
Ne pas inclure ses changements dans le commit de ce scoreboard.
