# Gardes des quatre cites

Demande du 4 octobre 2026. Serie originale Kalistar : 17 personnages distincts,
identifiants 49900301 a 49900317, aucun remplacement de carte existante.

## Direction artistique

Les 193 cartes publiees ont ete examinees avant la selection finale.
`visual-audit/ANALYSE.md`, les 13 planches et `inventory.json` documentent
ce perimetre. Les grandes references sont Momo, Valazar, Balmhyr, Soryn,
Scrow, Jelly-Joe et la garde Isvel fournie par l'utilisateur.

La correction prioritaire est de conserver les vetements classiques Kalistar,
les surfaces peintes et usees, les emotions et les gestes personnels. La legere
originalite futuriste appartient aux armes et aux boucliers, pas aux uniformes.
Les propositions intermediaires a uniformes tactiques ne sont pas publiees.

`art-selection.json` conserve chaque prompt exact, les references et la source
generee. `selected-art/` contient les 17 illustrations retenues, identiques aux
nouveaux fichiers `V4/Illustrations/City_Guards_*.png`. Aucun cadre n'a ete
regenere par IA. La carte native est composee separement.

## Personnages

| Cite | Personnages | Repartition |
| --- | --- | --- |
| Draevenheim | Orven, Serya, Marel, Veyr, Isvel | 3 humains sans cristal, 2 Vamps Sang ; uniforme rouge/noir |
| Durane | Torvan, Eldra, Brund, Helvik, Sovra | 2 humains, 3 nains ; gris de l'Ordre de Fer |
| Nestown | Aeren, Vessa, Karrok, Neryk | 2 Falco, 2 Korbow ; turquoise/blanc |
| Crabazar | Brask, Maelka, Tilko | 3 Crustos ; bicorne bleu/jaune, une main et une pince |

Les drapeaux imprimes proviennent des banques natives de chaque cite. Aucune
nouvelle banniere de faction n'est inventee pour ces cartes. Les illustrations
sans cristal n'ont ni barriere magique ni arme lumineuse surnaturelle.

## Donnees et regles

`set.json` est la source des identites, roles, positions, textes et six faces.
Chaque `characterId` est stable (`orven-kalistar`, etc.), distinct du nom affiche.
Les plafonds et intervalles existants de chaque role restent inchanges.
Garde est limitee aux P1/P5, Reraise aux P5, magie et barrieres aux faces
numeriques de porteurs de cristal. NONE conserve son hexagone eteint.

CRUSTOS ajoute un libelle de race et une icone, pas une regle de combat.
La synergie et les armes compatibles par job utilisent les mecanismes existants.
Les anciens profils, decks et sauvegardes ne sont pas migres ni reecrits.
Deux decks de test couvrent les 17 cartes ; ils ne deviennent pas des presets.

## Production native

- `model.cjs` valide la serie et derive les profils via la route existante.
- `flags.cjs` verifie les banques de faction sans les modifier.
- `build.cjs freeze` verrouille une fois les entrees et les cartes preexistantes.
- `build.cjs prepare` prepare les composants, apercus et plans natifs.
- Avec `KALISTAR_GUARDS_PS=2026-10-04`, `build.cjs render` utilise Photoshop
  26.11.7 : 897 x 1497, textes editables et objets dynamiques incorpores.
- `build.cjs verify` compare les pixels fixes, le PSD rouvert, les champs,
  le code-barres et l'etat NONE. Ne jamais recreer les verrous pour cacher
  une modification ou un echec.
- `publish.cjs` effectue un preflight ; `--publish` exige
  `KALISTAR_GUARDS_PUBLISH=2026-10-04` et ajoute les creations atomiquement.

Le medaillon CRUSTOS utilise l'extension calibree de race : rayon alpha complet
37.607 px pour une limite de 39, erreur optique 0.485 px pour une limite de 0.75.
Les autres entrees de `race-extensions.json` restent identiques.

## Verification

`model.test.cjs` controle les profils, les restrictions, l'icone et les sources
graphiques locales completes. `integration.test.cjs`, portable et ajoute au
workflow Pages, controle les 17 profils, les decks, la synergie CRUSTOS et
24 matchs complets avec effets de soutien et restaurations de sauvegarde.

`proof-sheets.cjs card` produit les planches des exports natifs par cite.
`browser.test.cjs` ouvre les 17 fiches dans un navigateur isole, photographie
les vues ordinateur et Razr 50 (412 x 915), teste le filtre CRUSTOS et verifie
le plateau et sa reprise. Les preuves sont dans `proofs/` et `browser-proof/`.
Le navigateur personnel et ses donnees IndexedDB ne sont pas utilises.

Les rapports natifs, les captures et les notes de version font foi pour les
controles effectivement termines. Ce dossier ne constitue pas une approbation
artistique finale donnee par l'utilisateur.
