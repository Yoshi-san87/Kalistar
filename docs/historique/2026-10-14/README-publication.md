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

## Cloudflare Pages

Depuis 4.6.49, `.lfsconfig` exclut par defaut les telechargements LFS au clonage.
Cloudflare clonait auparavant les PSD avant de transmettre les variables de
build, remplissant son disque temporaire. Les sources et objets LFS restent
conserves : rien n'est retire du depot ni converti en fichier ordinaire.
Ce reglage concerne aussi les nouveaux clones sur un autre ordinateur ;
les fichiers deja disponibles sur ce poste ne sont pas modifies.

Configuration du projet Pages lie a `Yoshi-san87/Kalistar` :

- Branche `main`, preset `None`, racine vide.
- Dossier de sortie `V4/deploy/dist`.
- Variable `NODE_VERSION=24`. La variable `GIT_LFS_SKIP_SMUDGE=1` peut rester
  presente, mais la protection du clonage ne depend pas de son injection.
- Commande de build :

```sh
git lfs pull --include="$(node V4/deploy/build.cjs --lfs-paths)" --exclude="" && node V4/deploy/build.cjs
```

Les fetchs explicites doivent garder `--exclude=""` pour lever l'exclusion
initiale sur leur selection seulement. Le workflow GitHub existant conserve
ses selections de medias et de preuves natives. Pour recuperer une source
native sur un nouveau poste, utiliser une selection precise, par exemple :

```sh
git lfs pull --include="V4/creations/49902501/**" --exclude=""
```

Sous `CF_PAGES=1`, fourni par Cloudflare, le build controle 20000 fichiers et
25 Mio maximum par fichier, fichiers generes inclus. Il n'applique pas le
budget GitHub de 900 Mio ; ce dernier reste actif sur GitHub et en local.
References : [Cloudflare](https://developers.cloudflare.com/pages/platform/limits/)
et [Git LFS 3.0.2](https://github.com/git-lfs/git-lfs/blob/v3.0.2/docs/man/git-lfs-config.5.ronn).

Relancer une ancienne tentative ne change pas son commit : apres ce correctif,
verifier que le nouveau deploiement utilise le commit de 4.6.49 ou un suivant.
La premiere copie Cloudflare ne remplace pas le site GitHub et ne transfere pas
les sauvegardes locales entre leurs deux origines. Exporter/importer celles-ci
avant une bascule de domaine ; ne pas modifier le DNS avant verification.

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
marqueur HTML `data-hosting` et ajoute un identifiant aux URLs CSS et JavaScript,
y compris aux modules charges par `boot.js`, pour eviter de melanger des versions
en cache ; en local l'API et l'Atelier restent disponibles.
Le build publie aussi `V4/site/story-content.json`, unique contenu de lecture
autorise dans le lot de fichiers JSON ; les autres JSON du depot restent exclus.

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

## Application installable et plein ecran

Sous Chrome ou Edge, installer Kalistar depuis l'action d'installation du site
ou le menu du navigateur ouvre `/Kalistar/jeu/` dans une fenetre autonome sans
barre d'adresse. Dans l'arene, le clic sur l'onglet demande le plein ecran avant
la preparation du match ; le bouton de sortie revient a la Collection. Le plein
ecran natif reste soumis a l'autorisation du navigateur et a une interaction
explicite de l'utilisateur. Aucun service worker n'est utilise afin que Pages
serve toujours la version publiee la plus recente.
