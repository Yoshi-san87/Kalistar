# Armures Kalistel des soldats

Retouches demandees le 4 octobre 2026 sur les illustrations validees en 4.5.8.
Generation integree image_gen, une retouche par personnage ; prompts et sources
exacts dans `art-prompts.json`. Les cadres ne sont jamais generes.

## Intention

- Nestown : Aeren, Vessa et casque tenu par Neryk. Grandes ailettes metalliques,
  Kalistel Aero dans les attaches, veines lumineuses et verres scintillants.
- Arborium : Herbo dans les attaches de poitrine, epaulettes boisees lumineuses
  pour Eryss, Velran, Saelor et Liorne. Prise et position du bouclier de Velran.
- Crustos : Kalistels bleus a l'avant des bottes, renforts scintillants pour
  Brask, Maelka et Tilko. Armes dorsales, bateau et cigare conserves.
- Dravenheim : casque d'Isvel commun a Isvel et Orven, deux canines rouges.
  Visiere active chez Orven seulement ; filaments du bouclier d'Isvel conserves.

## Clarification utilisateur

L'utilisateur confirme explicitement que les Kalistels sont utilises SUR LES
ARMURES, y compris chez les personnages sans cristal personnel. Cette demande
visuelle fait exception a l'ancienne interdiction generale de lumiere magique
dans une illustration NONE. Aucun cristal personnel, face magique, barriere,
bonus, equipement jouable ou nouvelle regle n'est ajoute. Orven, Velran et Tilko
conservent integralement leurs profils NONE. Ne pas deduire un pouvoir moteur
de l'illustration. Tous les textes imprimes restent ceux de 4.5.8.

## Controle

`build.cjs freeze` conserve les empreintes et sources anterieures. `prepare`,
`render`, `verify`, puis `publish` passent par les composants verrouilles,
Photoshop et la transaction existante. `verify` exige zero pixel modifie
en dehors de la fenetre d'illustration. Les controles et captures de ce lot
ne remplacent aucun verrou ou ancien rapport.

## Resultats locaux

- Douze PSD editables et PNG publies localement via transaction (73 fichiers).
- Douze reouvertures PSD identiques, douze codes-barres lisibles.
- Zero pixel modifie hors de la fenetre 80/156/737/921 pour chaque carte.
- Cadres verrouilles, textes imprimes et profils jouables inchanges.
- 200 autres cartes preservees ; aucune source approuvee ni ancien rapport change.
- Deux tests portables propres a la revision passent ; 24 matchs avec les
  soldats, effets de soutien et restaurations repetes passent egalement.
- Lecteurs des 19 soldats controles, captures des 12 retouches en 1440 x 1000
  et 412 x 915, filtre Crustos et arene apres reload sans erreur JS/HTTP.
- Suite generale Pages : collection, lecteur, decks, arene et sauvegardes OK.
- Vue d'ensemble : `cards-overview.jpg`. Details : `native-checks.json`,
  `cards/*/verification.json` et `browser-proof/results.json`.

La release et ses tests isoles sont documentes dans
`V4/releases/2026-10-04-v4.5.10/`. Statut public a verifier sur le workflow du commit.
