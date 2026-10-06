# Kalistar 4.5.31 - Familles D'Armes

Suite a la 4.5.30 : famille representee par son symbole blanc a droite du
nom des cartes d'armes, sans repetition dans le pied. Titres longs adaptes
au bandeau sur PC, telephone et format d'export.

Toutes les armes exigent leur famille imprimee, y compris les nominatives.
Tidus Projectile et Liquid Ocelot Poing sont exclus, leurs editions avec
la bonne famille restent compatibles. Virtuous Treaty et Le Serment de Fer
attendent les nouvelles versions de 2B et Balmhyr. Les quatre objets
collectifs sans porteur restent disponibles dans le catalogue.

Projectile : nouveau vecteur blanc en etoile de lancer, ajoure et accompagne
de trainees. Meme ancrage, meme format, contour calibre. Aucun changement
des 19 autres symboles, cartes natives, bonus, regles de combat ou schemas.

La migration utilise les restrictions historiques exactes : seules les
anciennes attributions de famille incompatibles sont retirees. Les cartes,
possessions, formations et capitaines restent en place. Les matchs engages
conservent leur snapshot de definitions.

## Verification

- 79 tests cibles : porteurs, editions, migration, compositions, moteur,
  anciennes parties, effets numeriques et geometrie des pictogrammes.
- 45 controles de mise en page a six largeurs, plus les exports 1400 px.
- Preuves et sources dans `../../revisions/2026-10-06-weapon-families/`.
- 46 controles porteurs/import/reload sur le site statique, aux largeurs
  1440, 412 et 320 px. Captures finales examinees sur ordinateur et telephone.
- Snapshot de publication : arbre `f82f6f9ddc105a5d1072a9abbbb218af77461504`,
  base `6396c4e5` (4.5.30). Les 35 commandes du workflow passent : 229 tests
  et build de 712 fichiers runtime. Rapport : `workflow-results.json`.
- Regression statique : 215 cartes, Collection, Carnet, PNG, Decks, Arene,
  partie sauvegardee, ajouts de cartes et mobile valides, aucune erreur HTTP/JS.

Seuls ce rapport et les captures generees sont actualises apres ce snapshot ;
les fichiers executables publies sont identiques aux fichiers testes.

Les travaux locaux non lies a cette demande restent hors de cette publication.
