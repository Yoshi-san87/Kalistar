# Construction et publication

Le jeu public est sur [Cloudflare](https://kalistar.pages.dev/jeu/), projet
personnel existant `kalistar`. Le PC construit et envoie directement le site.
GitHub conserve le code, les profils, les verrous et les empreintes des medias,
pas les images ni les PSD. Aucun abonnement supplementaire n'est necessaire.

[Organisation](../../docs/ORGANISATION.md) | [Validation](../../docs/VALIDATION.md)

## Sources locales

Les originaux restent aux memes chemins V1-V4, Templates et main. Ne pas les
supprimer sous pretexte qu'ils ne sont plus suivis par Git. Ne pas deplacer le
checkout actif : les jonctions historiques en dependent. Avant chaque livraison,
sauvegarder les nouvelles sources et leurs PSD hors du checkout.

Un clone leger ne contient pas les medias. Pour changer de PC, il faut aussi
la sauvegarde privee. Les parties du navigateur n'en font pas partie.

## Ajouter des medias

`runtime-media.json` contient source, taille et SHA-256 de chaque media public.
Le build refuse un media modifie et ignore les brouillons locaux non inscrits.
Les cartes approuvees gardent en plus leur verrou natif et leur taille validee.

Apres validation d'une nouvelle carte, rafraichir son entree :

```sh
npm run media:refresh
```

Les PNG du catalogue sont selectionnes par les registres actuels, jamais par
le nom ou la date. Pour un nouvel asset web, donner son chemin explicitement :

```sh
npm run media:refresh -- --add V4/site/assets/weapon-cards/exemple.webp
```

Examiner le diff du registre. Ne jamais lancer `git add -f` sur l'image ou le
PSD. Les nouvelles illustrations et les cadres doivent etre sauvegardes avant
la publication. Aucun script ci-dessus ne touche aux fichiers natifs.

## Verifier en local

Avec Node.js 24+, les bibliotheques du poste et les medias originaux :

```sh
npm run check
npm test
npm run build
node V4/deploy/browser.test.cjs
```

La suite complete reste obligatoire sur le PC. GitHub execute seulement
`node maintenance/validate.cjs --suite repository` : organisation, code et
garde-fous sans LFS. Aucun build ou deploiement du jeu ne part de GitHub.
Le registre commun conserve toutes les anciennes invocations locales.

## Preparer la livraison exacte

1. Verifier le remote personnel et coordonner les autres publications.
2. Incrementer version PC/phone, assertions et rapport de livraison.
3. Ajouter explicitement uniquement le texte et les registres termines.
4. Relancer controles et examiner le diff stage. Ne pas ajouter les travaux
   des autres chats, les sorties work ou les fichiers graphiques.
5. Commit et tag annote `vX.Y.Z`, push atomique de main et de ce seul tag.
6. Preparer ce commit exact :

```sh
npm run prepare:release
```

`prepare-release.cjs` lit le texte du commit, pas les modifications de travail.
Il copie seulement les medias inscrits et controles par SHA-256, depuis le PC
ou le cache LFS deja present. Il ne telecharge rien. La copie figee et son
rapport `publication.json` vont dans `work/publication/<commit>-<identifiant>/`.
Le rapport indique `dist`, `commit` et l'empreinte du manifest final.

Tester cette sortie exacte avec `KALISTAR_DIST` et une sortie de preuves
`KALISTAR_VERIFICATION_DIR` sous work/qa. Ne pas reconstruire depuis un dossier
contenant des brouillons entre le test et l'envoi.

## Envoyer a Cloudflare

Connexion initiale, si necessaire, avec l'outil officiel limite a Pages :

```sh
npm exec --yes --package=wrangler@4.151.0 -- wrangler login --device --scopes account:read user:read pages:write
```

Puis remplacer les valeurs par celles du rapport :

```sh
npm exec --yes --package=wrangler@4.151.0 -- wrangler pages deploy <dist> --project-name=kalistar --branch=main --commit-hash=<commit> --commit-dirty=false
```

Toujours reutiliser ce projet, son compte personnel et sa branche main. Ne pas
creer un nouveau projet pour publier. Les constructions automatiques Git sont
desactivees en production et en preview. Conserver Cloudflare Access sur les
previews : un test non connecte peut recevoir une page de connexion, pas le jeu.

Verifier ensuite la version publique, les empreintes de release.json, le rendu
PC/Razr, Collection, Decks, Arene et sauvegarde/reload. Le precedent deploiement
Cloudflare reste disponible pour un rollback ; ne pas l'effacer apres l'envoi.
Ne signaler la livraison en ligne qu'apres ces controles.

Le build respecte les limites Cloudflare sous CF_PAGES=1 : 20 000 fichiers et
25 Mio par fichier. Le site ne contient ni PSD ni donnees privees. Les limites
et les verrous natifs ne sont pas assouplis par la migration.

## Sauvegardes et application

La meme adresse Cloudflare conserve le stockage local de l'application installee.
Aucune manipulation de l'IndexedDB personnelle n'est necessaire. Les tests
utilisent des profils jetables. GitHub Pages et localhost ont un stockage
distinct : exporter/importer depuis le jeu avant de changer d'origine.

Les profils Paris/Tokyo restent locaux. Une publication ajoute les nouvelles
cartes sans effacer possessions, compositions ni parties ; les rencontres
conservent leur snapshot. Le manifest reste relatif a /jeu/, sans service worker.

## Archive et stockage LFS

La sauvegarde privee du 15 octobre contient les originaux, le bundle complet de
l'ancien historique et tous les objets LFS verifies. Ne pas envoyer ses vieux
tags/branches au depot leger : cela remettrait l'historique LFS sur GitHub.
Une suppression de fichiers dans un commit ne libere pas le stockage historique.
Une purge distante ou recreation du depot exige une confirmation humaine et
le controle de la sauvegarde. Aucun forfait payant n'est active par ces scripts.

La recreation du depot leger est autorisee explicitement le 15 octobre. La
premiere racine legere est la livraison 4.6.66. L'ancien historique et ses tags
restent dans la sauvegarde PC et sous refs/archive-before-lfs en local, jamais
dans les branches ou tags publics du nouveau depot.
