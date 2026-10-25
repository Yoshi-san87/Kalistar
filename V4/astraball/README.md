# Kalistar Astraball

Exhibition jouable autonome de sport tactique, sans effet sur la collection,
les Fragments ou les combats du jeu de cartes.

[Guides Kalistar](../../docs/INDEX.md) | [Audit des regles](tests/REPORT.md)

## Jouer

Dans le site : menu `...` puis **Astraball**, ou `/jeu/astraball/`.
En production, la connexion Kalistar existante reste obligatoire. Le match est
sauvegarde localement, par profil Paris/Tokyo, sans synchronisation Supabase.

Developpement separe, depuis ce dossier avec Node.js 24+ :

```sh
npm ci --ignore-scripts
npm run vendor
npm start
```

Le serveur indique son adresse, normalement
`http://127.0.0.1:4330/jeu/astraball/`, et choisit un port libre si necessaire.
Les medias doivent etre presents sur ce PC ou restaures depuis leur sauvegarde.
Le clone Git volontairement leger ne contient pas les peintures.

Le premier match ouvre un vestiaire avec six ballons cosmetiques, une vue
HD-2D horizontale ou isometrique, le solo contre l'IA et deux joueurs sur le
meme ecran. Une sauvegarde existante reprend directement. Le vestiaire reste
accessible dans les options. Le livre des regles est accessible en haut.
Deplacement par clic de case ; passe, tir ou charge : selection puis confirmation.
Clavier : fleches sur le terrain puis Entree. Tactile : glisser pour deplacer
la camera, boutons + / - et recentrage. Le telephone zoome sur le joueur actif.
Le bouton camera ouvre le choix de vue et le curseur de hauteur HD-2D.
La vue, la hauteur et le ballon sont memorises sur l'appareil ; ils n'affectent
ni les statistiques, ni l'IA, ni les probabilites, ni les sauvegardes Kalistar.

## Regles Retenues

- Terrain logique 13 x 7 : onze colonnes jouables et deux colonnes de U.
- Cinq joueurs par equipe : Meneur, Scoreur, Middle, Sentry, Pilier.
- Chaque manche, chacun agit une fois, par VIT decroissante. A vitesse egale,
  l'equipe prioritaire alterne par manche ; aucun ABBA impose.
- Une activation : zero ou un deplacement orthogonal de MOB cases, puis une
  action. Les occupants bloquent le passage ; le ballon au sol est ramasse.
- Passe a portee et libre : certaine. Le premier adversaire sur une case
  traversee intercepte automatiquement, y compris un contact au coin d'une case.
- Trois U adverses selectionnables. Les adversaires traverses contrent le tir.
  Une cible libre donne une probabilite affichee selon TIR et distance.
- Un U vaut un point, ou deux pour le Scoreur. Premier a six points ; sinon,
  meilleur score apres douze manches, avec match nul possible.
- Apres un U, replacement initial et ballon au Meneur adverse ; les activations
  deja depensees ne reviennent pas. Un rate rebondit devant la cible choisie.
- Charge adjacente : FOR contre DEF, chance affichee ; succes = recul si libre,
  ballon lache et -3 VIT. Penalite immediate si la cible attend son tour, sinon
  pour la prochaine manche. Aucun tour supprime, penalites bornees a VIT.
- Un recul impossible n'annule pas le retard. Si le porteur reste sur sa case,
  il ramasse immediatement le ballon lache. Le Pilier reste dans ses trois
  colonnes defensives et ne couvre que les lignes qui croisent sa position.

Les formules exactes sont dans `src/core/game.mjs` et le livre des regles.
Les deux equipes partagent les memes profils de postes, pas les statistiques
du jeu de cartes. Cette exhibition ne constitue pas une declaration d'equilibrage.

## Architecture

| Fichier | Responsabilite |
| --- | --- |
| `data/teams.mjs` | Statistiques, equipes et formation initiale |
| `src/core/geometry.mjs` | Cases, limites, trajectoires supercover |
| `src/core/game.mjs` | Etat pur, initiative, actions, ballon, score, validation |
| `src/core/ai.mjs` | Decisions bornees sans modifier l'etat |
| `src/projection.mjs` | Deux projections communes au sol/clic, hauteur et zones du Pilier |
| `src/appearance.mjs` | Six ballons cosmetiques et validation des preferences visuelles |
| `src/renderer.mjs` | Scene PixiJS, personnages, ballon, animations, camera |
| `src/sprites.mjs` | Atlases, tailles, clips et orientation des dix personnages |
| `src/app.mjs` | Commandes, interface, sauvegarde et pause IA |
| `runtime-files.json` | Liste exacte des fichiers publiables |
| `assets/provenance.json` | Sources et SHA-256 des peintures et portraits |
| `sources/` | Peintures, sprites originaux et prompts, jamais servis au joueur |
| `tools/` | Serveur local, recadrage reproductible, bundle CSP |
| `tests/` | Regles, simulations, projection et navigateur |

PixiJS 8.22.0 est retenu pour cette tranche web : integration directe dans le
site/PWA existant, controles HTML accessibles et pas de seconde application
Godot/WebAssembly a charger. Ce choix ne pretend pas remplacer Godot pour un
futur jeu natif. Le moteur pur reste independant de Pixi et testable sans GPU.
Le polyfill officiel `pixi.js/unsafe-eval` evite justement l'usage d'eval ; la
politique CSP existante n'est pas relachee.

Sources techniques : [PixiJS Application](https://pixijs.com/8.x/guides/components/application),
[Godot Web](https://docs.godotengine.org/en/4.5/tutorials/export/exporting_for_web.html).

## Images Et Performance

L'arene est une peinture originale produite avec l'outil image_gen integre,
en prenant les peintures approuvees Momo/Valazar comme references de matiere.
Le prompt est conserve dans `sources/arena-v1.prompt.txt`. La grille et les
trois cibles de chaque U sont dessinees par le moteur, jamais devinees depuis
des lignes generees. Les points du sol et le clic utilisent le meme quadrilatere.
La seconde peinture conserve les lignes horizontales d'une cour HD-2D.
Seul le plan de jeu se comprime avec la hauteur, les sprites restent debout.
Les zones defensives suivent exactement les trois colonnes autorisees par
le moteur (frontieres 1/4 et 9/12), sans decalage optique fractionnaire.
Les cibles se dessinent dans les colonnes de U, distinctes des zones du Pilier.

Les six ballons sont derives de la planche fournie par l'auteur avec image_gen
integre : Fondateurs, Noyau orbital, Tissage celeste, Rempart Rhinoz, Harmonie
Cerelf et Edition Ligue. Leurs WebP transparents font 256 x 256 et totalisent
moins de 195 Ko ; la nouvelle peinture fait moins de 590 Ko.
Sources, prompts et empreintes :
[`sources/visuals-v2/prompts.json`](sources/visuals-v2/prompts.json) et
[`media-report.json`](sources/visuals-v2/media-report.json).
`node tools/prepare-visuals.cjs` reproduit le redimensionnement et les exports
depuis les PNG preserves, sans relancer de generation.
Reference de cadrage : [Wandering Sword, editeur](https://www.spiralupgames.com/projects/wandering-sword).
Il s'agit ici d'un rendu 2D a plans superposes, pas d'une camera 3D libre.

Le terrain affiche dix personnages de corps entier en pixel art original,
generes avec image_gen a partir de leurs illustrations Kalistar approuvees.
Les portraits des cartes restent reserves aux fiches et a l'initiative.
Les dix atlases PNG transparents totalisent moins de 410 Ko : 16 poses par
personnage, cellules 96 x 96, palette de 128 couleurs et filtrage nearest.
Deux orientations (miroir gauche/droite), sans pretendre a huit angles dessines.

`npm run assets` reproduit les portraits/terrain sans modifier les originaux.
`npm run sprites` utilise Sharp pour separer les silhouettes, normaliser leurs
appuis et reconstruire les atlases. `KALISTAR_NODE_MODULES` indique le dossier
des dependances du poste. Sources et prompts :
[`sources/sprites-v1/prompts.json`](sources/sprites-v1/prompts.json).
Le rapport adjacent `atlas-report.json` conserve references, SHA-256 et decoupes.
La generation n'est pas relancee automatiquement par le build ni par les tests.

Les clips couvrent respiration, course, lancer, garde, charge, impact et joie.
Les commandes du moteur pilotent les clips ; aucune regle n'est decidee par
l'animation. Texture et ombre sont separees, la direction suit la trajectoire.

Aucune boucle de rendu au repos. Les mouvements, tirs et charges utilisent
des animations finies ; une respiration de 1,92 seconde accompagne l'activation,
a douze mises a jour au total, puis le rendu s'arrete completement. Les actions
plafonnent le rendu a environ 60 images/s, meme sur un ecran 120 ou 144 Hz.
Onglet masque : animation et IA suspendues. Reduced Motion est respecte.
Resolution GPU plafonnee a 1,75x. Pas de particules permanentes ni filtre flou.

## Verification

Depuis la racine du depot :

```sh
node --test V4/astraball/tests/astraball.test.cjs
node V4/astraball/tests/simulation.mjs --games 120 --out work/astraball/simulation.json
node V4/astraball/tests/interface.browser.test.cjs
```

Le rapport de simulation est confine au `work/astraball/` du depot.
Les tests navigateur utilisent Chrome et Playwright du poste, un profil jetable,
et `KALISTAR_URL` si le port differe. Ils couvrent PC, grand ecran, Razr, compact,
paysage, sauvegarde/reload, interception visible, charge animee et but a 2 points.
`KALISTAR_DIST` permet de tester le build fige avec la meme politique CSP ;
les comptes de verification sont factices, jamais les sessions personnelles.

## Limites Et Suite

- Une arene en deux vues, six ballons cosmetiques, deux equipes fixes,
  IA heuristique et match local seulement.
- Pas de matchmaking, compte Astraball, classement, recompense ni reseau de jeu.
- Sprites en deux orientations miroir, sans animation squelettique ni huit vues.
- Pas de replay du dernier tir ou de bande sonore enregistree. Sons synthetiques
  facultatifs, desactives par defaut.
- Les regles passent les tests, mais le plaisir et l'equilibre competitif demandent
  des essais humains. Les premiers matchs IA montrent davantage de victoires
  pour Obsidienne : voir l'audit, ne pas qualifier cette tranche d'equilibree.

Prochaines etapes : sessions de jeu courtes, analyse des lignes et de la duree,
puis ajustement des stats/IA et enrichissement des poses directionnelles.
