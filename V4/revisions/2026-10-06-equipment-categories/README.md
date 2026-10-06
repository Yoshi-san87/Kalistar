# Equipements : bouclier et relique

Evolution du 6 octobre 2026, publiee avec V4.5.37.

La proposition acceptee devient jouable : un choix Arme OU Bouclier OU Relique
par personnage et composition. La route `#weapons` reste compatible mais le
menu, la page et la Composition affichent Equipements. Les trente-trois armes
existantes gardent leurs effets, restrictions et matchups.

## Objets

- **Le Rempart de Durane**, BOU-001 : membres de Durane, +30 DEF a la premiere
  defense, une fois par match. Bouclier de pierre grise reprenant le drapeau,
  marteaux et montagnes dores, Kalistel central et lumiere grise INTERIEURE.
- **Pod 042**, REL-001 : 2B, toutes editions. Apres un Block reussi, +20 DEF
  a sa prochaine defense, une seule charge pour toute la rencontre.

Les cartes sont composees en HTML sur le raster existant, jamais regenerees
en bloc. Cadres argent/jade et argent/amethyste par CSS ; objet detoure,
illustration et anneau generes independamment. Le motif ne tourne pas avec
l'anneau. Les cartes de personnages natives, masters et verrous sont intacts.

## Sources et reconstruction

`prompts.json` contient les prompts et references exacts du generateur integre
image_gen. Les PNG de production sont dans `V4/weapon-cards/sources/`.
`build-assets.cjs` reconstruit uniquement les huit nouveaux WebP et inscrit
leurs empreintes dans `media-provenance.json`. Le builder general des cartes
d'armes reste compatible. Le fond final du bouclier retire les bannieres
non canoniques de la premiere proposition, sans changer l'objet.

## Validation

- `site/equipment-categories.test.cjs` : categories, porteurs stables, slot
  partage, bonus reels des deux camps, consommation, soutien, Mort, esquive,
  relance, Reraise, snapshots, six rencontres completes et contours alpha.
- `site/equipment-categories.browser.test.cjs` : profils IndexedDB QA isoles,
  equiper/remplacer/retirer, reload, Composition, inspection, combat reel,
  resize du challenger, PC 1440, Razr 50 412 et compact 320 / Reduced Motion.
- Non-regression des armes, medias, profils, compositions et animations.
- Captures et mesures : `qa/`. Les anciens rapports de reference ne sont pas
  modifies ; les nouveaux medias ont leur propre preuve additive.

Schema, consommation et ajout d'un futur objet :
[`ARMES_EQUIPEES.md`](../../docs/ARMES_EQUIPEES.md).
