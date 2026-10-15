# Elyrane - La Main de Grivka

Illustration validee le 12 octobre 2026. Carte originale Kalistar.
Modele `49902101`, characterId `elyrane-kalistar`.

## Identite et regles

Princesse Okami de Grivka, Kalistel CRYO, famille Orbe, role principal P5,
compatible P3/P5. Son medaillon fait office de foyer magique ; aucune arme
supplementaire n'est ajoutee a l'illustration approuvee.

- ATK D6-D1 : 168, 132 magique, 102 magique, Garde, 46, Reraise.
- DEF D6-D1 : 204 barriere, 169, 129, 98 barriere, 57, 22.
- Garde : +60 a une defense physique numerique, puis consommation.
- Reraise : coeur preventif annulant une elimination, pas une resurrection.

Deux faces de soutien remplacent des attaques ; aucun effet nouveau, bonus
permanent, equipement automatique ou changement de matrice. Toutes les valeurs
suivent les bornes natives P5. Les matchs automatiques testent l'integration,
sans pretendre prouver un equilibrage competitif.

## Illustration et fabrication

Source intacte : `V4/propositions/2026-10-12-princesse-okami/princesse-okami-05.png`.
Les cinq versions et prompts ImageGen sont conserves dans les propositions.
Le compositeur Photoshop 26.11.8 utilise le cadre natif 897 x 1497, les textes
editables, les composants embarques et la banniere Grivka deja calibree.
Les references protegees ne sont ni modifiees ni regenerees.

## Verification et reprise

`cards/elyrane/verification.json` : cadre fixe et reouverture PSD sans ecart,
code-barres valide. `integration.test.cjs` : toutes les faces, coeur, garde,
barrieres, sauvegardes et douze matchs ABBA complets. `browser.test.cjs` :
PC, Razr 50, 320 px, duel, reload et import d'une ancienne sauvegarde.

Le premier helper QA avait un chemin date incorrect. Les fichiers initiaux
et `before.json` restent immuables ; `fixtures-02.cjs`, `model-02.cjs` et
`build-02.cjs` corrigent uniquement cette reference. `before-02.json` conserve
toutes les empreintes initiales et ajoute celles des pilotes corriges. Aucun
fichier natif n'a ete change pour cette correction technique.

Production deja realisee : ne pas relancer prepare/render sur ce lot.
Publication locale : `KALISTAR_ELYRANE_PUBLISH=2026-10-12`, puis
`node V4/expansions/2026-10-12-elyrane/build-02.cjs publish`.
