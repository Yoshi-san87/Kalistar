# Kalistar x Chrono Trigger

Lot de sept cartes, faction `CHRONOTRIGGER`, collection `chrono-trigger`.
Adaptation de fan non officielle. Aucun preset, terrain, equipement ou effet nouveau.

## Profils

| Personnage | Kalistel | Race | Role | Intention |
| --- | --- | --- | --- | --- |
| Crono | ELECTRO | HUMAIN | P2 | Katana, eclairs selectifs, soutien physique |
| Marle | CRYO | HUMAIN | P5 | Reraise preventif et trefle, attaque modeste |
| Lucca | PYRO | HUMAIN | P4 | Magie de feu, potion, defense fragile |
| Frog | HYDRO | BATRA | P3 | Masamune polyvalente, eau et esquive |
| Robo | LUXO | ROBOT | P1 | Garde, defense reguliere, protection |
| Ayla | GEO | HUMAIN | P2 | Poings physiques, esquive au prix d'une forte face DEF |
| Magus | NECRO | HUMAIN | P4 | Quatre faces magiques, Mort D2, sans esquive |

LUXO pour Robo et GEO pour Ayla sont des traductions Kalistar, pas des pouvoirs
canoniques revendiques. Tous portent un Kalistel selon la regle des collaborations.
L'arbalete de Marle utilise la famille Arc existante. Magus (Janus) reste HUMAIN.
Les effets et la matrice des armes ne changent pas. Les valeurs suivent les
bornes du role principal et les modes magie/barriere ne portent que sur des nombres.
Les sept profils ont des repartitions distinctes. `set.json` explicite chaque choix.

## Images et sources

Les six illustrations approuvees sont conservees a l'identique.
Crono utilise `crono-v3.png` : correction localisee des cheveux en meches naturelles,
sans changement demande de scene. V1 et V2 restent disponibles dans les propositions.
`asset-provenance.json` contient les prompts exacts, les entrees et les sorties du
generateur integre. La banniere horloge turquoise/or est generee separement, puis
exportee avec l'alpha du pennon natif valide.

## Production

- `assets.cjs prepare` puis `install` : composant et asset de faction.
- `build.cjs prepare` : profils et composants, gel des entrees dans `before.json`.
- `build.cjs render <cles>` : Photoshop 26.11.8, maximum trois cartes par lot.
- `build.cjs verify` : cadre fixe, reouverture PSD, textes editables, code-barres.
- `build.cjs publish` : ajout atomique aux creations et au catalogue.

Les variables de consentement de rendu/publication sont
`KALISTAR_CHRONOTRIGGER_PS=2026-10-11` et
`KALISTAR_CHRONOTRIGGER_PUBLISH=2026-10-11`.
Ne pas relancer prepare ou remplacer les entrees d'un lot gele.

## Verification

`integration.test.cjs` couvre les 84 faces ATK/DEF, les effets reels, leurs
sauvegardes, 36 matchs ABBA et des matchs contre des decks historiques.
`publication.test.cjs` controle l'ajout sans modification du catalogue precedent,
les images natives, profils, bannieres et collections.
`browser.test.cjs` ouvre les sept cartes sur PC, Razr 50 (412 px) et 320 px,
importe une ancienne sauvegarde isolee et reprend Crono contre Magus en arene.
Les controles de publication et captures finales sont ranges avec la release.
