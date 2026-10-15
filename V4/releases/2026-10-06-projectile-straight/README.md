# Kalistar 4.5.33 - Projectile Redresse

Suite a la publication 4.5.32, sans modifier ses nouvelles cartes.
Correction purement visuelle : quatre pointes egales alignees sur les axes,
centre ajoure et deux trainees blanches. Suppression de la rotation et des
longueurs irregulieres. Meme medaillon, ancrage et format vectoriel 96 x 95.

Les 19 autres symboles, les cartes natives, les armes equipees, les regles et
les sauvegardes restent inchanges. Cache du pictogramme : `09.svg?v=3`.
Sources et geometrie : `../../revisions/2026-10-06-projectile-straight/`.

Validation : 13 tests cibles passes (symetrie exacte, centrage, rayon,
isolation des autres symboles et URLs), controle visuel des vraies cartes
sur PC et Razr 50. Les preuves precedentes restent preservees.

Validation finale sur le snapshot exact de l'index
`4a96b205271f75a878e9731c10fa2878ffef771c`, base `cb80006d` :
- 238 tests du workflow passes ; construction GitHub Pages reussie.
- Site statique : 230 cartes, desktop/telephone, lecteur, export PNG, decks,
  arene, reprise de match et publication additive verifies sans erreur HTTP.
- Le rapport `workflow-results.json` conserve les commandes et leurs resultats.
