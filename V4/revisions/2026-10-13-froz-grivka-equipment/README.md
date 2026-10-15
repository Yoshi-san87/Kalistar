# Equipements Froz / Grivka

Publication cible : 4.6.51.

## Sources et fabrication

`art-plan.json` relie les dix equipements aux illustrations des personnages.
Les references Grivka incluent Hrold, Taevrik et Nivra ; les references Froz
incluent Kaervan, Nyrska et Saevra. Les tenues et accessoires reprennent les
uniformes de ces deux groupes. Aucune image de personnage n'est retouchee.

`prompts.json` et `generation.json` conservent les trente generations separees
(objet, scene, anneau). `media-provenance.json` enregistre les hashes sources et
exports. Les fichiers originaux sont dans `V4/weapon-cards/sources/`.

Reproduction des exports : `node V4/revisions/2026-10-13-froz-grivka-equipment/build-assets.cjs`.
Sharp est charge depuis `KALISTAR_NODE_MODULES` ou le runtime local configure.
Ne pas reexecuter une generation pour reconstruire de simples exports.

## Integration

Les definitions additives sont dans `V4/site/weapons.js`, apres la capture
des definitions historiques. Les medaillons/scenes sont lies par
`V4/site/weapon-art.js`. Les regles reutilisent RETAINED_SIX et ULTIMATE/SURVIVED.
Le texte commun des ultimes distingue maintenant les attaques magiques.

Une arme supplementaire suit le meme schema : identifiant unique, numero libre,
restriction de faction ET famille, effet declaratif, trois images independantes,
exports et provenance, definition et presentation, puis tests natifs.
Ne pas modifier les definitions archivees ou la famille imprimee des porteurs.

Les nouvelles reliques sont a usage unique ; un jet physique ne consomme pas
la charge magique de la bandouliere. Les faces speciales ne deviennent jamais
des valeurs numeriques a cause d'un equipement.

## Tests

`node --test V4/site/froz-grivka-equipment.test.cjs`

`node V4/deploy/build.cjs`

`node V4/site/froz-grivka-equipment.browser.test.cjs`

Le navigateur utilise un domaine fictif et une base isolee, jamais les donnees
personnelles. Les captures et `qa/results.json` documentent les trois formats.
