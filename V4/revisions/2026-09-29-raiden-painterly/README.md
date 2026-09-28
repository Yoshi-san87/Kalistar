# Raiden : coherence picturale Kalistar

Revision du 29 septembre 2026 demandee apres validation utilisateur du rendu
peint de Fortune. Seule l'illustration de Raiden MGS2, carte 49382016, change.
Visage, cheveux et combinaison sont repeints en plans de couleur et touches
visibles, avec contours hierarchises, sans rendu photographique ou 3D lisse.
Identite, expression vigilante, posture, pistolet et coursive de Big Shell
restent conserves.

## Sources

- Illustration finale : art/raiden-painterly.png.
- Prompt exact et quatre references d'entree : art/provenance.json.
- References de DA : Momo, Valazar, Fortune peinte validee par l'utilisateur.
- L'illustration initiale dans V4/Illustrations/ reste historique et intacte.
- Les preuves initiales dans V4/expansions/2026-09-28-raiden/ restent intactes.
- Sauvegardes natives exactes : originals/. Aucun verrou de reference modifie.

## Integration et verification

Remplacement natif du seul objet dynamique d'illustration dans le PSD existant.
Textes editables, styles, geometrie, cadre, icones et profil de jeu inchanges.
Difference hors illustration : 0 pixel. Difference apres reouverture : 0 pixel.
Code-barres relu. Catalogue jouable identique et toutes les autres creations
protegees, Fortune comprise. Cinq tests de perimetre reussis.
Rapport navigateur local : qa/local/report.json.

Sorties actives : V4/creations/49382016/card.psd, card.png et illustration.png.
Publication locale seulement : aucun commit ni push Git dans cette revision.
La validation technique ne remplace pas l'approbation artistique utilisateur.

Une future publication Git devra inclure Fortune et cette revision ensemble :
le controle de preservation de l'ancien lot Fortune refusera normalement le
changement de Raiden. Ne pas reecrire ce gel historique pour contourner ce refus.
