# Identite des menus Kalistar - 3 octobre 2026

Demande utilisateur : integrer la proposition visuelle approuvee, puis ajouter
une touche legere de cyberpunk heroic fantasy et un Kalistel rainbow.

## Direction retenue

- Emblemes peints argent/cuivre, cuir jade, petites incrustations cyan.
- Bandeau continu, separateurs fins, selection jade et Kalistel prismatique.
- Police de signature Cinzel, reservee aux menus et titres de section.
- Manuscrit, chiffres, statistiques, illustrations et logo original inchanges.
- Sur telephone : Collection, Decks, Armes, Arene, Plus. Story et Statistiques
  restent accessibles par Plus, sans dupliquer les cinq entrees principales.
- L'arene telephone conserve son immersion : aucun bandeau ajoute au combat.
  Sa feuille de navigation utilise les memes emblemes.
- L'Atelier local de developpement reste accessible comme auparavant, absent
  du site Pages. Son entree supplementaire utilise un bandeau adapte en
  petit ordinateur/tablette plutot que des libelles reduits.

## Sources Et Integration

Generation par l'outil integre `image_gen`, jamais par une API externe.
Prompts exacts dans [prompts.json](prompts.json). La planche approuvee,
l'atlas transparent et le Kalistel rainbow sont dans `sources/`.
`build-media.cjs` extrait les cellules, ajuste les contours alpha et exporte
des WebP lossless 128 x 128. Pas de recoloriage procedurale ni de modification
des cartes natives. Les originaux generes sont preserves.

Ressources consommees : `V4/site/assets/navigation/*-v1.webp`.
Style : `V4/site/navigation.css`, charge apres les feuilles existantes.
Entrees principales : `index.html`; feuilles mobiles et etats accessibles :
`app.js`. Aucun nouveau stockage, moteur ou schema de sauvegarde.
L'etat de Plus suit la section active et le changement de taille d'ecran.
`aria-expanded` suit l'ouverture/fermeture du dialogue natif, y compris Escape.
Les transitions de navigation respectent Reduced Motion.

Cinzel est une vraie police existante, pas une nouvelle fonte proprietaire
dessinee par Kalistar. Copyright 2020 The Cinzel Project Authors.
Fichiers originaux Google Fonts v26 distribues localement dans
`V4/site/assets/fonts/`, avec `Cinzel-OFL.txt` (SIL OFL 1.1).
Pas de requete Google/Adobe necessaire pendant le jeu. Le prechargement ne
concerne que le sous-ensemble latin; latin-ext est charge si necessaire.
URLs officielles, tailles et SHA-256 dans `media-provenance.json`.

## Validation

- 39 tests cibles : media/font, equipement, inspection, equipes, medailles.
- 75 tests catalogue/moteur/construction, avec overlay en lecture seule du
  manuscrit publie pour ne pas embarquer le roman local encore en cours.
- Navigation Pages : huit formats, 38 controles de vues/resize, images
  chargees, police reelle, libelles contenus, cible >=44 px, une selection
  visible, clavier/Enter/Escape, Plus et Reduced Motion.
- Navigation serveur local : huit formats, 16 controles, dont tablette avec
  sept entrees et Razr 50.
- Suite navigateur Armes : PC, Razr 50, petit ecran, Reduced Motion,
  vrais bonus moteur, sauvegarde/reload, cartes agrandies et inspections.
- Suite navigateur Composition : construire une equipe, capitaine, armes,
  sauvegarde/reload, import/export, glisser-deposer, apercu Razr et combat.
- Captures et mesures dans `qa/`. Les profils de verification sont isoles;
  aucune possession ni sauvegarde du navigateur personnel n'est manipulee.

Commandes depuis la racine du checkout :

```powershell
node --test V4/site/navigation.test.cjs
node V4/site/navigation.browser.test.cjs
$env:KALISTAR_NAV_LOCAL='1'
$env:KALISTAR_VERIFICATION_DIR='V4/revisions/2026-10-03-menu-identity/qa/local-navigation'
node V4/site/navigation.browser.test.cjs
```

La suite Pages utilise le `dist` courant : construire avant, jamais pendant
une verification navigateur. Le controle visuel complete les assertions;
un test n'est pas une nouvelle autorisation de modifier la DA des cartes.
