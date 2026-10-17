# Cristal de marque rainbow

Demande du 17 octobre : rainbow eclatant comme les cartes, cristal bien droit.
Le logo conserve son mot-symbole et sa monture d'origine. Seul l'insert de verre
est genere via image_gen, puis ajuste a la monture par le pipeline d'export.
Les premieres generations de logo complet, non retenues, deformaient le texte
ou ajoutaient des franges : elles ne sont pas des ressources de production.

## Exports

- `V4/site/assets/logo-rainbow-v2.webp` : nouvelle adresse versionnee pour
  renouveler aussi les caches navigateur; original V3 preserve.
- `V4/site/assets/navigation/kalistel-rainbow-v2.webp` : cristal des menus,
  commandes, score, chronologie, accueil, ceremonie et connexion.
- Dos de carte : cinq propositions locales dans
  `../../propositions/2026-10-17-card-backs/index.html`, aucune selection appliquee.

`prepare.cjs` compose uniquement l'insert genere, sans regenere le lettrage.
Les deux pointes sont sur le meme axe vertical, les pointes laterales au meme
niveau. Le controle pixel verifie zero changement visible hors de la zone
du bijou, y compris les bordures translucides. WebP sans perte.
`provenance.json` conserve les empreintes source/sortie.

Aucun cristal elementaire, carte native, verrou, regle, dos en jeu ni film
approuve n'est modifie. Le logo deja incruste dans le film reste dans le media
original; les surfaces HTML utilisent la nouvelle version.

## Verification

- `node V4/revisions/2026-10-17-rainbow-brand/prepare.cjs`
- `node V4/site/brand-rainbow.browser.test.cjs` sur le build courant ou fige.
- Suites locales et navigateur indiquees dans le rapport de livraison 4.6.87.

Les PNG sources et originaux sont conserves dans `sources/` puis sauvegardes
hors checkout avant publication. Ils ne doivent pas etre ajoutes a Git/LFS.
