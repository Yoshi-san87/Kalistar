# Arborium et Draevenheim : armes de faction

## Demande Et Perimetre

Arborium seul suffit pour L'Accord Sylvestre et Le Cran de Ronce : retrait
explicite du Job SOLDAT, sans modification des bonus ou des visuels existants.
Deux nouvelles armes exclusives a Draevenheim, tous Jobs :

- ARM-028, Les Ailes du Rempart : longue lance inspiree d'Orven, lames deployees
  en ailes de chauve-souris. +20 DEF en inferiorite numerique sur le plateau.
- ARM-029, L'Arbalete Ecarlate : grande arbalete noire, cuivre et rouge avec
  carreau rouge. +20 ATK avec deux combattants actifs allies ou moins.

Valeur technique de faction : `Draevenheim`, comme Orven dans le catalogue.
Pas d'ajout d'une faction distincte "Dravenheim". Les deux familles sont Lance
et Arc ; elles ne changent jamais la famille imprimee ou la matrice du porteur.
Conditions TEAM_STATE / WHILE_TRUE existantes, un seul slot, aucun tir multiple,
nouveau statut ou bonus permanent. Les medaillons suivent l'etat reel du moteur.
Le recapitulatif DEF utilise un bouclier, et non la note de musique heritee
de la toute premiere arme defensive (la flute). Les calculs restent identiques.

## DA Et Sources

Peinture Kalistar, metaux patines, cuivre et rouge contenus, decors sobres et
cadres existants intacts. Objet, scene et anneau restent trois couches distinctes.
Six PNG selectionnes dans `V4/weapon-cards/sources/draevenheim-*.png`, huit WebP
servis dans les banques existantes, hashes dans `media-provenance.json`.
Les prompts exacts et references sont dans `draevenheim-prompts-2026-10-05.json`.
Le premier cadrage de scene de lance est marque rejete, pas servi. Aucune source
de personnage, aucun PSD ou verrou historique change.

## Compatibilite

Les dix personnages Arborium sont eligibles, ainsi que les huit personnages
Draevenheim sur leurs neuf editions. Noms affiches et Jobs ne sont pas des cles.
Les autres factions sont exclues des choix UI, profils et compositions.
Les anciennes sauvegardes restent valides : une partie commencee garde son
snapshot SOLDAT + Arborium. Les nouvelles parties prennent les regles elargies.
L'ancien rapport `2026-10-05-arborium-weapons` demeure une preuve historique.

## Verification

- 81 tests cibles : equipement, rendu, art, composition, quatre armes de faction.
- 76 duels numeriques verifient toutes les editions eligibles dans les deux camps,
  formules exactes, journaux, reprise et disparition du bonus hors condition.
- La suite generale execute aussi des matchs complets avec les armes equipees.
- `layout/` : 41 controles, 29 cartes au format export et six tailles d'ecran.
- `browser/` : profils jetables, equiper/remplacer/desequiper, recharger,
  inspection deck/arene, adversaire, geometrie au resize et Reduced Motion.

Commandes : `node --test V4/site/arborium-weapons.test.cjs V4/site/draevenheim-weapons.test.cjs`,
`node V4/site/arborium-weapons.browser.test.cjs`, `node V4/site/weapon-cards.browser.test.cjs`.
Pour les captures du master, definir KALISTAR_VERIFICATION_DIR dans ce dossier
afin de ne jamais ecraser les anciens rapports. Aucune collection personnelle
n'est utilisee par les tests. Les tests ne constituent pas une mesure de balance
en tournoi ; les conditions restent deliberement ponctuelles et le bonus +20.
