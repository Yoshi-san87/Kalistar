# Préparation Compacte — V4.6.5

Écran centré sur les capitaines et les noms des compositions, sans grille des dix
cartes ni galerie d'arènes. Les choix manuels restent disponibles ; deux actions
Au hasard proposent une composition adverse ou un terrain avec un shuffle court.

## Contrat De Jeu

- Générateur déclaratif indépendant du DOM et du RNG de combat.
- Deux affectations compatibles P1–P5 construisent dix personnages distincts.
- Validation finale par `validateComposition` ; au plus un Rainbow, pas de
  statistiques changées ni d'équipement offert.
- 48 candidats, recherche bornée à 4096 noeuds par candidat. Quantiles 15/50/95 %
  de cohésion pour Détente / Équilibré / Tactique.
- Cohésion : vrais bonus faction/race du moteur, vrai commandement du capitaine,
  poids secondaires de variété élémentaire (+4/type) et relais réserve (+2/lien).
- Le match capture le résultat affiché avant toute attente IndexedDB.
- Les decks sauvegardés, l'ABBA, le tip-off et les anciennes parties ne changent pas.

## Vérification

Les tests dédiés couvrent légalité, déterminisme, petit catalogue, échecs bornés,
absence de mutation des cartes, isolation des dés, reload, annulation et Reduced
Motion. Une campagne de 100 graines produit 300 équipes : elle vérifie une
cohésion croissante pour chaque graine, pas des probabilités de victoire.

Les captures `qa/browser/` documentent le site complet sur PC 1440×1000,
Razr 412×1007 et petit téléphone 320×568 avec Reduced Motion. Le test navigateur
vérifie les trois niveaux, les sélections manuelles, le shuffle, le retour arrière,
la prévention d'un lancement pendant le tirage et le snapshot après reload.
