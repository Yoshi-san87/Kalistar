# Palmares Illustre V3

Revision du 15 septembre 2026.

## Presentation

- Fenetre de 96 % de la hauteur et de la largeur de l'ecran, largeur plafonnee a 2000 pixels.
- Fond issu de l'arene jouee ; scores gauche/droite, resultat, nombre d'echanges et graine du match.
- Grande illustration du MVP, indice et quatre compteurs : kills, stops, ATK et DEF cumulees.
- Quatre fenetres illustrees pour Finisseur, Rempart, Soutien et Entrave. Les illustrations canoniques restent inchangees.
- Sur petit ecran, selection d'une distinction a la fois pour conserver un grand portrait. Navigation des ex aequo maintenue pour toutes les cartes recompensees.
- Onglets Equipes, Feuille et Decompte avec tris, filtres et pagination adaptee. Les six comparaisons principales sont reunies sur grand ecran ; la feuille peut afficher jusqu'a dix lignes selon la hauteur disponible.
- Apparition courte, survol discret, navigation au clavier. La preference de mouvements reduits desactive les animations.

## Verification

- `site/match-stats.test.cjs` : 18 tests moteur reussis, calculs exacts, attribution des soutiens, consommation des traits et absence de mutation lors de la lecture.
- `site/match-report.test.cjs` : 17 groupes reussis. Inclut vingt MVP ex aequo, profils archives, etat initial sans recompenses, valeurs par UID, alignements et tous les onglets sans debordement jusqu'a 320x480.
- `scripts/verify_palmares_ui.cjs` : 6 groupes reussis sur un match reel termine par le moteur. Scores, leaders et compteurs compares au moteur ; fiches, archives, ex aequo, clavier, animations, export et nouvelle rencontre controles.
- Formats du nouveau parcours : 1600x1080, 2560x1440, 1280x720, 900x900, 390x844, 360x640, 320x480 et 844x390. Chaque distinction compacte est verifiee, pas seulement le MVP.
- `scripts/verify_match_readability_ui.cjs` : 7 groupes reussis. Reserves, huit compteurs en duel, pagination, Tour suivant manuel, decks et glisser-deposer preserves.
- `scripts/verify_ownership_ui.cjs` : 16 entrees de controle reussies. Le bilan reste accessible depuis la carriere d'un exemplaire ; profils, transferts, activations et restauration inchanges.

Essais dans des contextes Chrome et des bases ephemeres, sans ouvrir le profil navigateur de l'utilisateur. Aucune exception navigateur dans les parcours controles.

## Perimetre

Fichiers applicatifs modifies : `site/match-report.js`, `site/match-report.css`, raccordement dans `site/app.js`.

Pas de modification du moteur, du schema IndexedDB, des cartes, des illustrations ou des exports d'impression. Les noms/titres et noms d'arenes archives sont conserves ; les visuels utilisent les chemins canoniques actuels, jamais ceux d'un document importe. Le palmares continue de lire les resultats de la rencontre, pas la carriere globale.

Rapports : `report.json`, `renderer-report.json`. Apercus : `awards-*.png`, `teams-1600x1080.png`, `lineup-1600x1080.png` et `definitions-1600x1080.png`.
