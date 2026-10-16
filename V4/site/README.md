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

Les vues publiques sont Home, Collection, Decks, Equipements, Arene,
Statistiques, Story, Map, Guide, Library et Bibliotheque de parcours. Le serveur local garde en plus
l'Atelier ; il ne fait pas partie du build public.

`site-config.js` definit aussi `KalistarSite.atlas`, source unique de la Map
et du fond Collection. La variable CSS `--kalistar-atlas-image` reprend cette
URL ; Collection conserve son flou leger sans toucher aux cartes ni aux
surfaces de lecture. Une publication Map met a jour cette seule reference.

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
Sur le site heberge, seule l'identite autorisee par le serveur choisit le profil
local Paris/Tokyo ; le selecteur de profils reste reserve au developpement local.
`cloud-player.js`, `cloud-ownership.js` et `cloud-sync.js/css` ajoutent collections
serveur, progression par compte, outbox IndexedDB, revisions et reprise explicite
entre appareils. L'ancienne base de demonstration n'est jamais effacee. Ne pas
confondre compte Auth, profil local et exemplaire emis ; ne jamais certifier
un resultat local par simple import. Voir le [contrat du registre](../docs/REGISTRE_EN_LIGNE.md).

`journey-definitions.js`, `journey-combat.js`, `journey-client.js` et
`journey-view.js/css` separent livres, commandes moteur, transport et rendu.
La route `#journeys` est la Bibliotheque ; `#library` reste les regles joueur.
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
Verifier les tailles reelles, petits ecrans, clavier, tactile et Reduced Motion.
Les timers/listeners/observateurs de vue doivent etre nettoyes a sa destruction.

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
