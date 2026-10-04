# Gardes revises et soldats d'Arborium

Demande du 4 octobre 2026, suite au lot city-guards. Direction artistique :
grain peint de Momo / Valazar, vetements militaires classiques, materiaux uses,
effets discrets propres au Kalistel. Les cadres natifs ne sont pas regeneres.

## Perimetre

- Onze illustrations retouchees : Orven, Isvel, Torvan, Eldra, Brund, Aeren,
  Vessa, Neryk, Brask, Maelka et Tilko. Les chiffres et identifiants restent fixes.
- Serya recoud desormais la chaussure de son fils. Son illustration est conservee.
  Les textes d'Orven et Tilko suivent leurs gestes corriges.
- CRUSTOS : visage rapproche, meme ancrage natif 711/1116, aucun deplacement
  du medaillon. Controle optique et contour alpha dans `race-proof.json`.
- Sovra 49900310 et Helvik 49900309 retirees, y compris sources individuelles,
  PSD, PNG et publications. Aucun effacement de l'historique Git ou des anciens
  rapports : ils decrivent honnetement le lot anterieur, desormais remplace.
- Quatre soldats Arborium : Eryss (Toxinar/P5), Velran (Humain/NONE/P1),
  Saelor (Cerelf/P4), Liorne (Cerelf/P2). `specs.cjs` definit leur identite.

## Sources et fabrication

Les prompts exacts, references et sorties selectionnees figurent dans
`art-prompts.json` et `selected-art/`. Les illustrations de production sont
versionnees dans `V4/Illustrations/`. Chaque dossier `cards/` contient le profil,
les composants, le PSD editable et ses preuves de reouverture et code-barres.

`before.json` conserve les empreintes anterieures. `before/` conserve les sources
des cartes revisees, jamais une nouvelle copie des personnages supprimes.
Les anciens verrous et rapports ne sont pas modifies. Le nouveau test portable
remplace le test du lot de 17 dans Pages, car deux de ses sources sont retirees.

La revision ne change ni moteur, ni matrice des armes, ni schema de sauvegarde.
La lumiere grise de Brund est un effet d'armure : son cristal GEO reste GEO.
Les fusils dorsaux sont des details d'illustration, pas un remplacement des
familles d'arme imprimees. Velran n'a aucune face magique ni barriere.

Les donnees personnelles du navigateur ne sont pas effacees. Une composition
qui utilisait Sovra ou Helvik doit remplacer ces cartes. Aucun ancien identifiant
n'est recycle pour les quatre nouveaux soldats.

## Commandes

1. `node build.cjs freeze` une seule fois avant revision.
2. `node build.cjs race`, puis `node build.cjs prepare`.
3. `KALISTAR_ARBORIUM_PS=2026-10-04 node build.cjs render` avec Photoshop 26.11.7.
4. `node build.cjs verify`, controle visuel des cartes completes.
5. `KALISTAR_ARBORIUM_PUBLISH=2026-10-04 node build.cjs publish`.
6. `remove-retired.ps1` verifie les chemins absolus avant suppression.
7. Tests d'integration, build Pages et `node browser.test.cjs` dans Chrome isole.

Les controles finaux et la publication sont consignes avec la release 4.5.8.
