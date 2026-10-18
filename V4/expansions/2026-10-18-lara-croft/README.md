# Lara Croft - cinq epoques

Retour aux [guides actifs](../../../docs/INDEX.md).

Cinq illustrations approuvees le 18 octobre 2026, preservees sans retouche.
Cartes natives 897 x 1497, textes editables, composants en objets dynamiques.
Fan crossover non officiel, sans affiliation annoncee.

## Versions

| Episode | Modele | Kalistel | Poste | Intention |
| --- | --- | --- | --- | --- |
| Tomb Raider (1996) | 49903101 | GEO | P3 / P4 | Exploration et agilite |
| Tomb Raider II | 49903102 | HYDRO | P4 / P2 | Distance et puissance physique |
| Tomb Raider III | 49903103 | MINERO | P3 / P4 | Reconnaissance et soutien |
| The Last Revelation | 49903104 | LUXO | P4 / P3 | Mysteres anciens et tirs elementaires |
| Chronicles | 49903105 | NECRO | P2 / P4 | Infiltration et mobilite |

Une identite stable : `lara-croft-tomb-raider`. Les cinq versions sont
collectionnables, mais une seule Lara peut entrer dans un deck. Aucun preset
illegal de cinq Lara, aucune arene inventee, aucune regle speciale ajoutee.
Les Kalistels sont des adaptations Kalistar des scenes, pas des pouvoirs
attribues au canon Tomb Raider. Les pistolets restent la famille Gun.

`set.json` contient les faces D6 a D1 et leur justification par version.
Les postes suivent les bornes V3. Les soutiens remplacent l'attaque :
aucun bonus permanent, aucune Mort ni Reraise artificielle.

## Banniere

Nouvelle faction `TOMBRAIDER`, collection « Tomb Raider ». Tissu turquoise,
cuir sombre et boussole antique en or portant le monogramme TR.
La source generee est conservee dans `banner-source.png`, avec prompt et
provenance dans `asset-provenance.json`. `assets.cjs` applique la silhouette
native validee, sans changer le cadre ou les autres bannieres.
La faction ne donne pas de synergie gratuite entre les editions d'une meme Lara.

## Fabrication et verification

- `assets.cjs prepare`, puis `install` : composant natif et asset web.
- `build.cjs prepare` : fige profils, illustrations et composants.
- `KALISTAR_LARA_PS=2026-10-18`, `build.cjs render` : Photoshop 26.11.8.
- `build.cjs verify` : pixels fixes, PSD reouvert, typographie et code-barres.
- `KALISTAR_LARA_PUBLISH=2026-10-18`, `build.cjs publish` : ajout transactionnel.
- Tests integration/native/publication dans le registre commun.
- Tests navigateur `gallery.browser.test.cjs` et `game.browser.test.cjs`.

Preuves et captures courantes : `work/qa/lara-croft/`.
Sources graphiques et PSD sauvegardes hors checkout ; Git ne contient que
textes, profils et empreintes. Voir la livraison 4.6.90 pour les controles
effectivement executes et le deploiement.
