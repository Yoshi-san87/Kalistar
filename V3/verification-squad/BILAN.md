# Ecran Escouade V3

Refonte de l'interface de construction de deck en un ecran de composition de jeu. Aucun changement des illustrations, proprietaires, donnees de cartes, schema de sauvegarde ou regles du moteur.

## Interface

- Dix emplacements en deux rangees de cinq, sans defilement du document ni panneaux internes scrollables.
- Recrutement pagine toujours visible. Glisser une carte vers un slot autorise, ou utiliser le bouton de remplacement.
- Echange des slots a la souris, au tactile et au clavier. Annulation et revalidation de la disponibilite au depot.
- Liens de faction ou race sur la composition, groupes pagines et filtres directs par groupe ou poste.
- Visualiseur haute definition et comparaison du potentiel du candidat avec le slot selectionne.
- Changement rapide entre les decks nommes, dix sauvegardes par profil ; gestion et filtres avances en petits panneaux contextuels.
- Sur mobile, onglets Composition, Synergies et Carte avec recrutement permanent. En paysage court, disposition compacte sans actions hors ecran.
- Les liens sont visuels : aucune nouvelle regle de voisinage. Les synergies restent des potentiels sur cinq cartes en jeu.

## Verification

Tous les tests navigateur utilisent des contextes temporaires separes des profils et sauvegardes du joueur.

| Controle | Resultat |
| --- | --- |
| `scripts/verify_squad_ui.cjs` | 8/8 |
| `site/deck-builder-reorder.test.cjs` | 24/24 |
| `site/deck-library.test.cjs --no-report` | 41/41 |
| `scripts/verify_flow_decks_ui.cjs` | 17/17 |
| `scripts/verify_match_readability_ui.cjs` | 7/7 |
| `site/engine.test.cjs` | 61 controles, 100 campagnes completes |
| `site/engine-v3.test.cjs` | 26/26 |
| `site/buff-stacking.test.cjs` | 11/11 |
| `site/deck-rules.test.cjs` | 13/13 |
| `site/match-metrics.test.cjs` | 3/3 |
| `site/engine-roster.test.cjs` | 41 cartes, 16 arenes, 246 faces ATK, 80 campagnes completes |

Captures et geometrie : `report.json`, `squad-*.png`. Formats controles : 2560x1440, 1600x1080, 1440x900, 1280x720, 390x844, 360x740 et 844x390. Le composant isole est aussi teste en 320x700. Les images gardent le ratio 797/1388. A 1280x720, les images des dix slots atteignent environ 136 px de haut ; l'inspecteur permet la lecture detaillee.

Les tests couvrent les compositions distinctes, la persistance, les profils Paris/Tokyo, les cartes devenues indisponibles pendant un drag, les annulations, les remises a jour externes et le recrutement tactile depuis l'onglet Carte. La navigation vers les decks ne modifie pas la partie en cours ; le resultat reste affiche jusqu'au bouton Tour suivant.
