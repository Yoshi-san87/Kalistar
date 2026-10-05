# Deux armes pour les Soldats d'Arborium

## Scope

- ARM-026 : L'Accord Sylvestre, arc de bois a deux cordes, vert fluorescent.
- ARM-027 : Le Cran de Ronce, dague empoisonnee avec bouton et petit cran.
- Compatibilite cumulative `jobs: ['SOLDAT']` ET `factions: ['Arborium']`.
- Cadre Kalistar bleu/cuivre inchange, scenes peintes, detourages et anneaux
  propres a chaque arme, geometrie native commune au deck et a l'arene.

## Regles

L'arc ajoute +20 ATK numerique en inferiorite numerique sur le plateau.
La dague ajoute +20 ATK numerique sans carte en reserve. Ce sont les conditions
`TEAM_STATE` existantes. Pas de degats de poison, de nouveau jet, de cumul de
deux armes ou de changement de la famille imprimee. Les snapshots en cours
restent intacts ; pas de changement de schema de sauvegarde.

Porteurs actuels : Eryss, Velran, Saelor, Liorne. Les autres Jobs d'Arborium et
les Soldats des autres factions sont exclus par les memes validations moteur,
profil et composition. Noms et traduction de l'interface ne sont pas des cles.

## Production Et Preuves

Les six PNG sources sont dans `weapon-cards/sources/arborium-*.png`. Les vrais
prompts et references sont dans `weapon-cards/arborium-prompts-2026-10-05.json`.
L'essai de scene d'arc au cadrage trop serre est marque rejete ; seul le second
est servi. `weapon-cards/media-provenance.json` relie les huit derives WebP
a leurs sources. Aucun PNG/PSD de personnage ni verrou historique modifie.

- `layout/` : suite du master commun, desktop a compact 320 px, cartes 1400x1000.
- `browser/` : fiches des deux armes, deck, combat, inspection PC/Razr/compact.
- `site/arborium-weapons.test.cjs` : AND job/faction, equipement, sauvegardes,
  composition, snapshots et 16 duels numeriques symetriques.
- `site/arborium-weapons.browser.test.cjs` : profils jetables, equiper,
  remplacer, desequiper, reload, medaillons actifs/inactifs, resize, Reduced
  Motion, formules et journal. Aucun acces aux sauvegardes personnelles.

Les seuils et le +20 sont conservateurs, pas une preuve statistique de balance.
Le test de combat prepare une situation de plateau synthetique puis utilise
les vrais jets, calculs, validations et sauvegardes du moteur.
