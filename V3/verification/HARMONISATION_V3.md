# Harmonisation V3 - 14 septembre 2026

## Livraison

- 41 PSD editables, 41 TIFF CMJN 300 ppp et 41 PNG, tous 897 x 1497.
- 41 cartes jeu recadrees en 797 x 1388, miniatures WebP et illustrations de detail actualisees.
- 34 illustrations retouchees ; deux Momo, Cana, Aelis, Zviri, Taulio et Voloden conserves sans modification des sources.
- 19 emblemes de race, guitare standard index 11, cristal NONE eteint et nouvelles auras MINERO/GEO. Total : 57 assets revises.
- Medaillons symetriques de diametre 126 px, contre 98 auparavant ; icones ajustees au cercle sans deformation.
- Scenes particulieres Kaylis/Lanio/Malaba validees ; Valazar en violet, scene conservee.

## Verification

- `harmonisation-final.json` : 57 empreintes d'assets, sept illustrations protegees, 41 exports recents, 41 recadrages pixel-identiques et 41 images de detail issues des sources actuelles.
- `outputs-41.json` : profils, textes, statistiques, positions, PSD, CMJN/300 ppp, formats et marges. Aucun pixel clair hors du recadrage jeu. Les regions centrales des six illustrations protegees historiques sont identiques aux cartes V2.
- `barcodes-41.json` : 123 decodages Code128, dont 41 apres assemblage Photoshop.
- `../verification-site/report.json` : 13 groupes navigateur passes ; 41 cartes, 40 personnages, 16 arenes ; aucun asset absent, probleme de geometrie ou exception. Ordinateur/mobile et ouverture directe de index.html controles ; des 3D non vides et animes.
- `harmonisation-static-audit.json` : moteur 61 tests, V3 26, statistiques 18, repertoire 12 et campagnes completes ; contrat BDD 9 groupes et presets 10 groupes passes dans un navigateur temporaire isole.
- Les empreintes des profils, matrices d'armes, regles, decks, arenes, bundle de donnees, moteur, UI, statistiques et module `local-db.js` sont inchangees. Le namespace `kalistar-v3-cards` et les identifiants K3 sont conserves. Aucun profil utilisateur ni base reelle n'a ete utilise pour les tests.

## Tracabilite

Les prompts et sources sont dans `../donnees/harmonisation_*_20260914.json`. L'integration fait foi dans `harmonisation_integration_20260914.json`. Les anciens assets et scripts de composition sont archives dans `../sources/avant-harmonisation-20260914`. La charte picturale est `../sources/DIRECTION_ARTISTIQUE_KALISTAR.md`.

Les constats intermediaires F01/F02 de l'audit statique sont couverts par les controles finaux de fraicheur et de pixels. F04 est corrige dans le garde-fou d'integration : le vrai module `local-db.js` et les autres contrats sont maintenant verifies avec les empreintes du snapshot d'audit. Aucun changement de mecanique n'a ete effectue.
