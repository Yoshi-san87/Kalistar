# Niveria devient une region, Ysilis conserve son drapeau

Demande de l'auteur, 6 octobre 2026. Voir
[Peuples et regions](../../docs/PEUPLES_ET_REGIONS.md).

## Perimetre

- Catalogue jouable : Malinia 30000005, Oskara 49900701, Sivel 49900707
  affichent Ysilis au lieu de Niveria.
- Le drapeau reste `V3/assets/factions/Niveria.png`, octets inchanges.
- Aucun profil natif, PNG/PSD approuve, verrou, ancien rapport ou document V3
  n'est reecrit. Aucun effet, matchup, poste, statistique ou identifiant change.
- Le lac de Niveria et les textes geographiques conservent leur nom.
- Grivka, Okami, Lycanos et Garou sont documentes ; Rhovan et Eyska demeurent
  des propositions. Aucun modele jouable supplementaire n'est installe.

## Implementation

`site/factions.js` centralise l'alias actuel et le chemin historique du drapeau.
Le constructeur du catalogue l'applique aux profils publies et approuves.
Les consommateurs UI recoivent donc le nom actuel sans reecriture du template.
`equipment.compatible` compare les factions par cet alias pour accepter
les anciennes definitions en snapshot, sans les modifier ni elargir leurs
porteurs a Grivka. Les nouvelles definitions du manteau affichent Ysilis.

Les tests des champs natifs et du lot quinze visages sont adaptes uniquement
pour cette conversion de faction documentee ; leurs autres assertions restent
intactes. Le nouveau test controle explicitement les trois modeles concernes,
les autres champs, l'absence de nouvelles cartes et la geographie preservee.

## Validation

- `node --test V4/site/factions.test.cjs` : alias, asset, trois modeles,
  compatibilite des porteurs, restauration exacte de snapshots Niveria,
  bonus reel +25 DEF du manteau lors d'une attaque magique sur les deux camps.
- Suite ciblee initiale : 43 tests passes, dont anciennes regles et matchs.
- `browser.test.cjs` : filtre et carnet sur PC, Razr 50 et 320 px ; drapeau
  existant charge, modules accessibles, absence de debordement et sauvegarde.
- Les preuves de publication finales se trouvent dans le dossier de release.

Les trois images de proposition et les prompts exacts sont conserves dans
[`propositions/2026-10-06-grivka-okami`](../../propositions/2026-10-06-grivka-okami/provenance.json).
Generation avec l'outil integre ImageGen, references Momo et Valazar.
Le drapeau de Grivka est une proposition d'heraldique, pas encore un composant
natif calibre ou une banniere active du catalogue.
