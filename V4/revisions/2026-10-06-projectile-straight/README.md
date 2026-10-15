# Projectile Redresse

Correction demandee apres la 4.5.31 : etoile blanche droite, quatre pointes
de meme longueur, centre ajoure et deux trainees conservees. Pas de rotation.
Le contour de l'etoile possede une symetrie exacte par quart de tour.

Le format 96 x 95, l'ancrage natif et le rayon de securite sont conserves.
Le motif complet est centre optiquement, trainees comprises : erreur 0.073 px,
rayon maximal 42.253 px (limite 44). Les 19 autres vecteurs sont inchanges.
Ni cartes natives, ni regles, ni sauvegardes modifiees.

Source : `projectile.cjs`. Generation : `node build.cjs` depuis ce dossier.
La source et les preuves precedentes restent preservees dans weapon-families.
Le cache de Projectile passe a `09.svg?v=3` dans les cartes et le Codex.

Tests : `site/base-weapons.test.cjs`, `site/collaborations.test.cjs` et
`site/base-weapons.browser.test.cjs` (sortie isolee dans browser/).
