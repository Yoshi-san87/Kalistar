# NieR - Corrections publiees

23 septembre 2026. Les cinq cartes sont mises a jour dans leurs PSD sources,
leurs PNG et les creations du catalogue V4. Le jeu conserve 57 cartes, dont
8 NieR. Pas de nouvelles cartes, pas de changement de possession.

- Pascal : reliure, pages et couverture du livre coherentes ; professeur et
  petite machine conserves.
- A2 : grande Type-4O Blade, geometrie continue, garde et prise lisibles ;
  visage repris dans la peinture Kalistar.
- Adam : visage peint et Orbe dans l'illustration, la banque d'arme et le profil.
- Eve et Anemone : visages harmonises, scenes, costumes et emotions conserves.
- Emil, 2B et 9S : controles visuellement, fichiers preserves.

Illustrations generees avec l'outil integre imagegen, puis objets dynamiques
remplaces dans les copies des PSD natifs. Aucun cache peint sur les exports,
aucun cadre regenere. Prompts et references : [art-provenance.json](art-provenance.json).
Comparaison artistique : [ART_REVIEW.md](ART_REVIEW.md).

## Controles executes

- 12 tests de revision reussis, dont les scenarios de rollback et de refus des
  modifications externes. Les fixtures restent hors production.
- Cinq PSD sauvegardes, fermes puis rouverts : PNG identiques aux rendus rouverts.
- Zero pixel modifie hors illustrations et empreinte de l'arme d'Adam ; zero
  difference des couches conservees lorsque les elements remplaces sont masques.
- Textes natifs et typographie identiques ; objets dynamiques incorpores.
- Cinq codes-barres reellement decodes en couleur et niveaux de gris. Ceci
  n'est pas un essai d'impression physique.
- Tous les champs de jeu preserves, sauf Adam : weapon Poing -> Orbe,
  weapon_index -> 14. Statistiques, positions et effets inchanges.
- Publication de 84 fichiers avec sauvegardes, journal et verifications finales.
- Navigateur isole GET uniquement : cinq medias compares par empreinte, quinze
  vues verifiees en 1600, 390 et 360 px ; aucune erreur JS/HTTP ni debordement du
  viewport. Collection personnelle non touchee.

Preuves : `verified.json`, `transaction.json` (published),
`browser-review/report.json`, `work/<key>/verification.json`.
Vue d'ensemble : [set-preview.jpg](set-preview.jpg).

Le premier lancement Photoshop a refuse un identifiant reserve ExtendScript
avant toute modification des cartes. Le script a ete corrige a la source ;
le second lancement et les verifications ont reussi. Trace conservee dans
`photoshop-attempt-1.log` et `render-inputs-attempt-1.json`.

Les preparations initiales et leurs empreintes restent historiques et intactes.
Utiliser `revise.cjs preflight` pour l'etat actuel, pas les anciens lanceurs de
fabrication initiale. Les originaux de chaque fichier remplace restent preserves.
