# Draust - Quand les chaines se taisent

Illustration miroir approuvee par l'utilisateur le 6 octobre 2026, puis demande
explicite d'une carte P1. Modele 49900602, characterId draust-kalistar.
Cryptown, SKULLZ, SOLDAT, NECRO, Fleau ; poste unique P1.

ATK D6-D1 : 205, 164, 119, 81, 43, Garde.
DEF D6-D1 : 296, 241, 183, 137, 86, 32.
Magie D5, barrieres D6/D3. Defense de tank avec soutien Garde D1, sans Mort,
Esquive ni Reraise. Les deux fleaux illustres n'accordent pas deux attaques :
la famille Fleau et sa matrice habituelle restent uniques et inchangees.
Ce profil respecte les limites P1 ; aucun taux de victoire competitif garanti.

## Illustration et production

Source exacte : ../../propositions/2026-10-06-cryptown-dual-flails/
cryptown-dual-flails-v2-mirror.png, copiee dans ../../Illustrations/
Cryptown_Draust_01.png. Aucun nouveau rendu generatif, aucune deformation.
La composition native reprend city-guards et les composants Atelier verrouilles,
avec textes editables et objets dynamiques incorpores, format 897 x 1497.
Le poste Photoshop 26.11.8 reprend la calibration additive Momo/Taulio/Valazar
de cryptown-sentinel, controlee par hash sans modifier les anciens rapports.

Commandes : build.cjs game, freeze, prepare, render, verify puis publish.cjs.
Render exige KALISTAR_FLAIL_PS=2026-10-06 ; la publication exige
KALISTAR_FLAIL_PUBLISH=2026-10-06 et --publish.
dependencies.json et existing-created.snapshot.json sont figes avant preparation.
Ne jamais les refaire pour masquer un ecart. Les tests utilisent des decks QA
isolant le nouveau personnage ; aucun preset utilisateur n'est installe.
