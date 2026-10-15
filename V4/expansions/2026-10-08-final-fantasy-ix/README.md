# Kalistar x Final Fantasy IX

22 cartes natives, 19 identites de personnage, IDs 49901001 a 49901022.
Fan crossover non officiel. Aucun preset, equipement ou regle de combat ajoute.

- [Galerie des cartes actives](galerie.html)
- [Illustrations selectionnees](../../propositions/2026-10-08-ff9/index.html)
- [Profils initiaux et intentions](set.json)
- [Controles natifs initiaux](native-checks.json)
- [Revision des scenes Vivi et des races](../../revisions/2026-10-08-ff9-art-direction/README.md)

## Decisions de l'auteur

Grenat et Dagga partagent leur characterId ; la reine Branet est distincte.
Les trois Vivi partagent vivi-ff9, avec Feu, Glace et Foudre. Une seule version
du meme personnage reste autorisee dans un deck. Cina utilise l'illustration
02 approuvee ; Dagga utilise le sceptre fixe au sac, sans main parasite.

Mice : Freyja. Batra : Kweena. Ratz : Pile et Face. Macako : Djidane et Cina.
Vivi : Robot. Markus : Sharkan. Les autres classifications et roles sont dans
set.json. Ruby FFIX est distincte de Ruby Kalistar. Beate correspond au nom
Beast de la demande initiale, interprete lors des propositions.

Les pouvoirs utilisent uniquement les faces existantes : garde pour P1/P5,
coeur pour P5, potion, trefle, puissance physique, esquive et Mort selon le
personnage. Les valeurs respectent les intervalles de leur role. Ce controle
de conformite n'est pas une garantie d'equilibre competitif.

## Etat actuel et historique

La premiere composition de 22 cartes et ses manifestes restent immuables.
L'auteur a ensuite refuse des variantes Vivi limitees a un changement de sort
et les quatre emblemes trop uniformes. La revision artistique remplace huit
sorties actives, sans modifier les statistiques. current.cjs applique cette
decision aux controles courants ; les fichiers historiques cards/ et set.json
ne sont pas reecrits pour masquer la revision.

La source courante est creations/<id>/, avec nativeRevision dans le catalogue.
Ne pas relancer freeze/prepare de ce premier lot sur des cartes deja publiees.

## Verification

Les 22 premieres cartes passent cadre fixe, textes editables, reouverture PSD,
resolution 897 x 1497 a 300 ppp et lecture reelle du code-barres.
La revision suivante repasse ces controles sur ses huit sorties.

Les tests executent les 132 faces ATK et 132 faces DEF dans le moteur, puis
36 rencontres ABBA sur trois equipes couvrant les 22 versions. Ils verifient
les identites, la couverture 2, les effets, les barrieres et la restauration.

Le navigateur isole controle Collection, huit lecteurs, les trois equipes
en arene et le reload aux largeurs 1440, 412 et 320 px. Les sauvegardes
personnelles ne sont pas utilisees. Captures dans browser-proof/.

Commandes de validation courante :

~~~powershell
node --test V4/expansions/2026-10-08-final-fantasy-ix/integration.test.cjs
node --test V4/expansions/2026-10-08-final-fantasy-ix/assets.test.cjs
node V4/deploy/build.cjs
node V4/expansions/2026-10-08-final-fantasy-ix/browser.test.cjs
~~~

Generations : outil integre image_gen. Prompts, sources et SHA-256 conserves
dans asset-prompts.json, asset-provenance.json et la proposition d'origine.
Les drapeaux et medaillons sont calibres separement, jamais generes avec
le cadre de carte. Le fanion FFIX conserve exactement le contour natif.

Publication GitHub : voir le rapport de release associe, distinct du statut
de publication locale dans publication/.
