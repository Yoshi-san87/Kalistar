# Jeu en ligne

La publication GitHub Pages est une sortie jouable de la V4, pas une copie de
l'Atelier. Le moteur, la collection, les decks et les profils restent communs.
Les PSD, prompts, brouillons, scripts Photoshop et sauvegardes personnelles ne
sont pas inclus dans le site. Le depot source reste distinct et public.

## Publication

Le workflow `.github/workflows/pages.yml` publie les changements pertinents de
`main`, apres tests et verification du verrou des PNG approuves. Il peut aussi
etre declenche manuellement. Activer GitHub Pages avec la source **GitHub Actions**.
Seuls les objets LFS necessaires au jeu sont recuperes ; aucun rendu Photoshop
n'est execute sur GitHub. La publication precedente reste en place si le build
echoue. `dist/` et les captures de verification sont generes et exclus de Git.

Pour ajouter une carte : la creer et la valider en local, publier normalement
son profil et ses fichiers dans le registre V4, puis commit/push sur `main`.
Ne pas ajouter une image seule ni modifier manuellement le catalogue genere.
Les references approuvees viennent de `atelier/data/references.json`, les autres
publications de `donnees/catalogue.json`, comme pour le serveur local.

## Construction et tests

```powershell
node --test V4/deploy/build.test.cjs
node V4/deploy/build.cjs
node V4/deploy/browser.test.cjs
```

Le build utilise seulement Node.js (24 dans GitHub Actions). Le test navigateur
utilise Playwright et Chrome du poste configure ; `KALISTAR_NODE_MODULES` peut
preciser le dossier de dependances. `KALISTAR_PAGES_URL` permet de tester la vraie
URL apres publication. Le test utilise un navigateur temporaire, jamais les
sauvegardes personnelles. Il couvre les cartes, les deux formats d'ecran, le
telechargement PNG, les decks, l'arene, la restauration d'une partie et l'ajout
simule d'une carte sans doublon ni effacement.

`site/site-config.js` deduit le prefixe depuis son URL : le site fonctionne a la
racine comme sous `/Kalistar/`. Les anciennes URL de medias conservees dans les
sauvegardes restent resolues sous le bon prefixe. Le build change uniquement le
marqueur HTML `data-hosting` ; en local l'API et l'Atelier restent disponibles.

## Sauvegardes et acces

Le site est public. Paris et Tokyo sont des profils locaux, pas des comptes
Internet authentifies. Il n'y a pas de synchronisation entre PC ou telephones.
L'adresse publique et localhost ont des stockages navigateur distincts : utiliser
les exports/imports du jeu pour transporter une collection ou une partie.
Une actualisation ajoute les nouvelles cartes a ce navigateur sans reinitialiser
les possessions, decks, preferences ou parties existantes. Une partie ouverte
conserve son catalogue jusqu'a l'actualisation. Aucun service worker ne fige une
ancienne version des fichiers. GitHub Pages peut mettre quelques minutes a
propager une mise a jour.
