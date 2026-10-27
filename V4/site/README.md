# Architecture du jeu V4

Le jeu actif est servi sous `/jeu/`. Le serveur local et le build public
consomment le meme catalogue V4. Aucun fallback vers le jeu ou `data.js` V3.

[Guide de reprise](../../docs/GUIDE_REPRISE.md) |
[Regles actuelles](../docs/REGLES_JEU.md) |
[Validation](../../docs/VALIDATION.md) |
[Publication](../deploy/README.md)

## Entree et orchestration

- `index.html`, `site-config.js`, `boot.js` : shell, resolution du prefixe,
  chargement du catalogue et ordre de dependances. Conserver l'ordre des modules.
- `login.html/js/css`, `cloud-session.js`, `auth-guard.js/css` : entree par
  email/mot de passe et reprise de session avant tout chargement du jeu heberge.
  `../deploy/access-worker.mjs` protege aussi les fichiers bruts cote Cloudflare.
- `startup.js/css` : frontiere preparation/activation. Les donnees et un petit
  budget d'images peuvent charger ; aucun controleur de vue ni commande de jeu
  ne demarre avant la fin du film et le retour au premier plan. `KALISTAR_PREPARED`
  signifie donnees pretes, `KALISTAR_READY` signifie interface active.
- `login-intro.js/css` : film anime contemplatif de trente secondes apres le seul login
  explicite reussi, avec skip, son et coupe portrait. Reprise/reload et Reduced
  Motion ne le rejouent pas. Le jeu se prepare dans le meme document sans monter
  ses vues sous le film.
  [Contrat du lecteur](../docs/INTRO_CONNEXION.md).
- `app.js` : orchestration des vues et des commandes. Les regles restent dans
  les modules purs, pas dans le DOM.
- `ui-system.js/css`, `positions.js/css`, `navigation.css` : langage visuel commun.
- `home-screen.js`, `page-transitions.js`, `phone-preview.js/css` :
  accueil, transitions et preview Razr. Le desktop garde sa navigation propre.

Home utilise une peinture panoramique et son export portrait dans `assets/home/`,
avec les cartes et emblemes reels en DOM. `home-screen.css` est l'unique
proprietaire de sa mise en page. Le carrousel garde huit cartes au plus et
respecte focus, popup, visibilite et Reduced Motion. Son resume de composition
vient de l'etat local fourni par app.js, jamais d'un jeu de donnees decoratif.
Sur PC, le decor couvre au moins la hauteur disponible et la taille des cartes
s'adapte a cette hauteur (plafond 720 px), sans agrandir les polices avec le
viewport. Le mode telephone garde son propre cadrage et le defilement vertical.

Les menus "..." general et Arene utilisent `showMenu`, `menuGroup` et
`menuItem` dans app.js, avec un seul habillage dans navigation.css. Toute
nouvelle destination ou commande passe par ces lignes communes. Story utilise
le cristal rainbow approuve, pas l'icone de Library. L'entete et la fermeture
restent visibles pendant le defilement interne, avec Retour et Echap natifs.
Ne pas recreer de variantes de menu dans mobile.css ou les CSS de parcours.

Le menu propose aussi [Astraball](../astraball/README.md), jeu de sport tactique
independant sous `/jeu/astraball/`. Sa liste runtime est explicite. Il reutilise
la connexion et les icones Kalistar, sans charger le moteur de cartes ni modifier
les collections, recompenses ou sauvegardes du jeu principal.

Les vues publiques sont Home, Collection, Decks, Equipements, Arene,
Statistiques, Book, Map, Guide, Library, Story et Mon compte. Le serveur local garde en plus
l'Atelier ; il ne fait pas partie du build public.

`site-config.js` definit aussi `KalistarSite.atlas`, source unique de la Map
et du fond Collection. La variable CSS `--kalistar-atlas-image` reprend cette
URL ; Collection conserve son flou leger sans toucher aux cartes ni aux
surfaces de lecture. Une publication Map met a jour cette seule reference.

Dans Map, Ctrl + molette zoome autour du pointeur, uniquement dans la zone
de carte. La molette seule et le comportement du navigateur hors carte sont
preserves, ainsi que les boutons, le clavier et le tactile. Le zoom reste
borne de 1 a 8 ; le listener non passif est retire au demontage de la vue.

Les huit fiches de villes affichent les vues validees dans
`../map/city-portraits.json`. Un apercu WebP est demande seulement a l'ouverture
de sa fiche ; la vue detaillee ne charge qu'au clic. Le lecteur modal natif
conserve le focus, Echap et la fermeture tactile, sans quitter Map. Un echec
d'image ne masque pas la description. Les images, les noms et le terrain de
l'atlas restent independants. La peinture des villes ne remplace pas la gravure
sepia ; originaux et prompts restent dans le lot de propositions, sauvegarde
hors du checkout avant publication.

## Regles et sauvegardes

| Domaine | Modules principaux |
| --- | --- |
| Combat et transitions d'etat | `engine.js`, `turn-order.js`, `combat-timeline.js` |
| Decision IA | `ai-strategies.js` |
| Equipements | `weapons.js`, `defensive-equipment.js`, `equipment.js` |
| Reliques | `relic-ultimates.js`, `ultimate-definitions.js`, `ultimate-runtime.js` |
| Indice et agregation | `performance-index.js`, `match-metrics.js`, `statistics.js` |
| Possession et persistance | `ownership.js`, `local-db.js`, `deck-library.js` |

Le moteur ne depend pas du DOM. UI, calcul, definitions d'objets et animations
restent separes. Les matchs figent cartes, equipements et politiques IA ;
ne pas leur substituer les definitions courantes au reload.
Les regles de jeu, des emplacements et de l'indice restent dans les documents
actifs indexes par [docs/INDEX.md](../../docs/INDEX.md).

IndexedDB `kalistar-v4-cards` et cles `kalistar.v4.*` vivent dans le navigateur.
Conserver les schemas, identifiants stables et validations des anciens imports.
Ne pas tester sur les possessions ou parties reelles.

`cloud-config.js`, `cloud-registry.js` et `cloud-registry-ui.js/css` ajoutent un
registre distant independant. Le SDK officiel partage la session de connexion.
`#account/profile`, `transfers`, `settings`, `billing` et `contact` sont les
rubriques de la vraie page Mon compte, sans galerie dupliquant Collection.
La page occupe toute la surface disponible sous la navigation, sans largeur
maximale centree. Seuls les formulaires gardent une largeur de lecture ; le
defilement reste dans `#app`, au-dessus de la barre mobile.
Les formulaires utilisent toujours les RPC du registre. Les certificats,
l'activation et l'emission admin restent accessibles depuis Transferts.
Les pages Facturation et Contact indiquent leur indisponibilite tant que les
services ne sont pas ouverts ; ne jamais simuler un paiement ni publier les
emails prives comme adresse de support. La navigation detruit les secrets
transitoires et ignore les resultats d'une ancienne rubrique.
Sur le site heberge, seule l'identite autorisee par le serveur choisit le profil
local Paris/Tokyo ; le selecteur de profils reste reserve au developpement local.
`cloud-player.js`, `cloud-archives.js`, `cloud-ownership.js` et `cloud-sync.js/css` ajoutent collections
serveur, progression par compte, outbox IndexedDB, revisions et reprise explicite
entre appareils. L'ancienne base de demonstration n'est jamais effacee. Ne pas
confondre compte Auth, profil local et exemplaire emis ; ne jamais certifier
un resultat local par simple import. Voir le [contrat du registre](../docs/REGISTRE_EN_LIGNE.md).

Les archives cloud immuables sont synchronisees par pages, separement du
document courant. Les transactions IndexedDB ordinaires ne relisent que les
domaines ou cles touches ; les mutations du registre local conservent leur
graphe atomique complet. La retention des metadonnees ne supprime jamais un
brouillon en attente. Tester le cas volumineux et les changements d'appareil.

`card-media.js` conserve au plus 48 recadrages ou 24 Mio de Blob lorsque les
visuels inutilises sont liberables. Les images encore connectees au DOM sont
protegees, y compris `currentSrc` pendant un remplacement ; elles peuvent donc
depasser temporairement cette cible. Les URL stables permettent une reinsertion
apres eviction. `dispose()` debranche l'observateur, les listeners et les URL,
sans laisser une ancienne promesse recreer un cache apres destruction.

`journey-definitions.js`, `journey-combat.js`, `journey-client.js` et
`journey-view.js/css` separent livres, commandes moteur, transport et rendu.
La route `#journeys` est Story (les Gaming Books) ; `#story` est Book
(le roman). Les routes et progressions restent stables. `#library` reste les regles joueur.
Chaque livre comporte quatre combats. Le Worker execute le meme moteur et
Supabase conserve la progression faisant autorite. Voir le
[contrat des parcours](../docs/PARCOURS_BIBLIOTHEQUE.md). Les essais admin sont
explicitement sans progression, archive de match ou recompense.

La conversion des profils d'equipement se fait profil par profil : une carte
archivee hors du catalogue ne bloque pas la migration d'un profil connu.
Si un porteur ou un equipement historique manque, garder ce profil intact et
afficher sa fiche en lecture seule. Ne jamais supprimer ces attributions pour
faire reussir une conversion. Les sauvegardes et snapshots de match restent
independants des modifications d'equipement.

## Parcours et presentation

Les cartes collectionnables Protection placent illustration, medaillon,
puissance et vignette du porteur a droite ; description, activation et noms
des porteurs a gauche. Armes et Reliques gardent leur disposition originale.
`weapon-cards.js` projette les zones depuis le crop avec
`zone(nom,categorie)`, y compris la zone cliquable du porteur dans
`weapons-ui.js`. Seul le cadre est retourne : images et textes restent
dans leur orientation d'origine. Les ancres d'equipement en arene ne changent pas.

| Vue | Modules |
| --- | --- |
| Collection | `catalogue.js`, `collection-binder.js/css`, `collection-pedestal.css` |
| Composition | `deck-builder.js/css`, `team-composition.js/css`, `formation-drag.js` |
| Equipements | `weapons-ui.js`, `weapon-cards.js/css` |
| Avant-match | `matchmaking.js`, `pre-match.js/css`, `lineup-intro.js/css` |
| Arene | `duel-focus.js`, `combat-effects.js`, `arena-ambience.js`, `elemental-roll.js` |
| Presentation d'equipement | `equipment-presentation.js`, `ultimate-ui.js/css` |
| Panneau et score | `duel-console.css`, `arena-console-skin.css`, `scoreboard.css`, `turn-timeline.css` |
| Fin et bilan | `arena-finale.js`, `match-report.js`, `battle-report.js`, `trophies.js` |
| Lecture et monde | `story-reader.js`, `map-view.js`, `guide-scenario.js`, `guide-view.js`, `library-view.js` |

Respecter le proprietaire CSS d'un composant. Par exemple, le socle Collection
est defini dans `collection-pedestal.css`, pas par de nouveaux overrides dans
`mobile.css`, `positions.css` ou `collection-binder.css`.
La preparation avant-match utilise une seule zone de defilement dans
`pre-match.css` : capitaines face a face et reglages lateraux sur PC, puis
blocs successifs sur telephone. Entete et lancement restent fixes, meme en
paysage et avec les options avancees ouvertes. Le formulaire garde les memes
choix, validations et snapshots de composition ; cette presentation ne change
ni les profils IA, ni la cohesion, ni les bonus du terrain.
Verifier les tailles reelles, petits ecrans, clavier, tactile et Reduced Motion.
Les timers/listeners/observateurs de vue doivent etre nettoyes a sa destruction.
Les effets d'ambiance et les cristaux en attente dessinent autour de 30 Hz,
sans polling RAF a la frequence maximale de l'ecran. Hors champ, en arriere-plan
ou derriere un dialogue, leurs boucles s'arretent ; les jets actifs gardent leur
animation propre. Les effets CSS decoratifs utilisent transform/opacity autant
que possible. Ne pas ajouter un timer permanent pour un effet purement visuel.

L'arene masque la navigation generale sur PC et telephone, sans imposer le
plein ecran du navigateur. Son toolbar garde sortie et menu de combat. Le
plateau se dimensionne dans la hauteur restante, y compris le contexte Story ;
seuls les contenus longs du bilan ou des calculs peuvent defiler dans leur zone.
`duel-focus.js` conserve l'horloge d'une transition en cours quand le plateau
est recree sans changer sa destination. Une nouvelle disposition annule le tween
precedent ; `duel-focus.browser.test.cjs` verifie continuite, resize et commandes.

## Images et contenu

`card-media.js` charge les PNG V4 valides, puis applique le crop natif
`{left:50, top:50, width:797, height:1388}` en memoire. Ne pas modifier les PNG
pour ajouter un effet d'equipement ; les overlays suivent les ancrages natifs.

- `assets/` : medias optimises du runtime, pas des PSD ou dossiers de staging.
- `story-content.json` : texte autorise du roman et ancres d'illustrations.
- `rules-documents.js` : bundle joueur genere depuis `../docs/joueurs/`.

Apres une modification des regles, revoir les explications joueur puis executer
`node V4/site/rules-documents.cjs` depuis la racine. Le build verifie les hashes
techniques/joueur. Ne pas transformer la Library en documentation de maintenance.

## Tester sans encombrer

Tests purs `sujet.test.cjs` a cote du module et inscrits dans la suite CI/locale.
Tests interactifs `sujet.browser.test.cjs`, decouverts par le lanceur commun.
Captures intermediaires dans `work/qa/`, preuves retenues dans la livraison.
[Commandes et prerequis](../../docs/VALIDATION.md).

L'ancien historique detaille par version est preserve dans
[les snapshots documentaires](../../docs/historique/README.md).
Ce fichier explique l'architecture actuelle, pas chaque modification passee.
