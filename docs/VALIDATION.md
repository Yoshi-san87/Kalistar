# Validation

Toutes les commandes partent de la racine du depot Git actif, avec Node.js 24+.
Aucune commande ci-dessous ne publie, ne reinitialise une save ou ne recompose
les cartes natives. `package.json` est une facade de commandes sans dependances.

## Organisation

```sh
npm run check
npm run test:organisation
```

Le premier controle les fichiers deja suivis/stages, les frontieres des dossiers,
les liens des guides actifs et les tests non affectes. Il ignore le contenu des
anciens rapports. Un fichier non suivi ne sera controle qu'une fois ajoute a
l'index : faire du staging explicite, pas `git add .`.

## Suite de publication

```sh
npm test
node maintenance/validate.cjs --suite ci --list
node maintenance/validate.cjs --suite ci --only team-composition.test.cjs
```

La suite conserve les invocations CI existantes et leur ordre. Les tests
d'organisation passent en premier. Cette suite complete s'execute sur le PC
avec les sources originales. GitHub execute seulement la suite `repository`,
sans medias ni telechargement LFS ; ce n'est pas une preuve de validation native.
`--only` prend un nom exact ou un chemin, jamais une commande shell.
En cas de nom identique dans plusieurs dossiers, donner le chemin complet.

Certains tests historiques de medias utilisent Sharp ; la Library utilise
marked. Ces dependances doivent etre disponibles sur le poste de validation.
Sur ce poste, les tests retrouvent les bibliotheques configurees, ou utiliser
`KALISTAR_NODE_MODULES` pour indiquer le dossier `node_modules` approprie.
Le controle d'organisation, lui, utilise seulement Node et Git.

## Navigateur

```sh
npm run build
node maintenance/validate.cjs --suite browser --list
node maintenance/validate.cjs --suite browser --only collection-map.browser.test.cjs
node maintenance/validate.cjs --suite browser --only V4/deploy/browser.test.cjs
```

Playwright et Chrome doivent etre disponibles. Les scripts conservent leurs
prerequis propres : certains demandent un serveur local, d'autres le build.
La commande `--list` permet de choisir les controles adaptes ; le lancement
complet de la suite reste volontaire.

Variables existantes utiles :
`KALISTAR_URL`, `KALISTAR_BUILT_SITE`, `KALISTAR_DIST`,
`KALISTAR_PAGES_URL`, `KALISTAR_VERIFICATION_DIR`.
Le lanceur fournit par defaut `work/qa/<nom-du-test>/` aux tests qui respectent
`KALISTAR_VERIFICATION_DIR`. Quelques anciens scripts gardent une sortie fixe :
ne pas embarquer leurs nouvelles captures automatiquement.

Tester avec profils jetables, jamais le navigateur personnel.
Pour l'interface : PC, Razr/phone, ecran etroit, tactile/clavier,
Reduced Motion et reprise apres reload suivant le changement.

## Atelier et natif

```sh
node maintenance/validate.cjs --suite local --list
node maintenance/validate.cjs --suite local --only start.test.cjs
```

Ces tests ont ete separes explicitement de la CI : PowerShell, services locaux
ou sources graphiques originales supplementaires. Le lanceur Windows est teste
sur un serveur factice temporaire. Les controles natifs complets passent par
l'[Atelier](../V4/atelier/README.md), avec Photoshop et ses prerequis.
Ne pas relancer un ancien script de migration pour obtenir un test vert.

## Ajouter un test

1. Mettre le test a cote du domaine, pas dans la racine.
2. CI portable : ajouter son invocation a
   [validation-suites.json](../maintenance/validation-suites.json), suite `ci`.
3. Navigateur : nommer `sujet.browser.test.cjs` ; decouverte automatique.
4. Test depend du poste : suite `local`, avec le prerequis documente.
5. Lancer le test, puis `npm run check` apres staging.

Dans un lot date, inscrire aussi le test dans le registre : la decouverte
automatique navigateur concerne uniquement les repertoires directs du site,
de l'Atelier et du deploy. Les anciens tests de lots non executes par la CI
restent identifies par une liste datee, sans dispenser les nouveaux tests.

Le workflow ne doit plus recevoir une nouvelle ligne `node --test ...` par
feature. Le registre est la seule liste active ; l'ancienne liste reste une
[preuve datee](../maintenance/organisation-2026-10-14/ci-before.json).

## Resultat attendu

Conserver commandes, environnement, echecs et limites reelles dans le README
de livraison. Une capture ou un test de donnees ne remplace pas l'autre.
Le catalogue et les fichiers publiables sont construits par le
[build existant](../V4/deploy/README.md), sans source PSD dans le site public.
