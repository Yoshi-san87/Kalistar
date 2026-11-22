# Kalistar 4.7.33 - Reglages sonores en combat

Le menu de l'arene expose directement Musique et Bruitages : deux curseurs
et deux interrupteurs, dans la surface de navigation Kalistar existante.
Les controles restent dans le menu, ne quittent pas la partie et utilisent
les preferences locales de Mon compte, sans nouvelle cle de sauvegarde.

La musique reste audible et ajustable sous le menu. Les effets de combat
restent suspendus sous une popup et reprennent au volume choisi a la fermeture.
Aucun nouveau lecteur, media, achat, schema cloud ou changement de regles.

## Verification

Tests unitaires des variantes compte/menu et des bornes.
Test cible `V4/site/arena-audio-menu.browser.test.cjs` : clavier, volumes
natifs, mute, fermeture/reouverture, reload, reglages communs et match intact
sur PC, grand ecran, Razr, 320 px et paysage.
Avant preparation : 107 invocations CI, 14 invocations locales et 35 tests
unitaires cibles passes. Menu sonore : cinq formats ; musique native :
trois formats ; compte : cinq formats. Le build fige repasse les controles
du site et du menu avant mise en ligne.
Preuves sous `work/qa/arena-audio-menu/`.
