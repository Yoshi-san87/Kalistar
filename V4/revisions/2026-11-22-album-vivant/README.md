# Album vivant et HUD Kalistar

Mise en oeuvre de la piste 2 choisie par l'auteur : douze pochettes fixes,
une version par emplacement, double page de six cartes par cote et cases
vides conservees. Lecteur sans scroll : carte a gauche, texte a droite,
contenu complet pagine sur PC comme sur smartphone.

## Composants visuels

Six composants generes avec ImageGen integre, reference visuelle :
`../../propositions/2026-11-22-collection-six-concepts/02-album-vivant.png`.
`prompts.json` conserve les six prompts ; `assets.json` conserve les sources,
dimensions, poids et SHA-256. Les originaux sont preserves dans le dossier
generated_images de Codex, hors checkout. Aucun PNG de carte n'est regenere.

- Album ouvert paysage et sa variante portrait.
- Pochette plastique transparente, sans carte ni texte incruste.
- Feuille seule pour le recto/verso du changement de page.
- Cadre HUD alpha reutilisable en neuf tranches et matiere emeraude/cuivre.

`prepare-assets.cjs` realise seulement les exports WebP et retire la marge
alpha du cadre HUD. Il refuse de remplacer un export different. Les six
fichiers runtime pesent 897 740 octets ensemble et sont inscrits au registre
runtime-media.json ; les binaires ne sont pas ajoutes a Git.

## Contrats conserves

Possessions, decouvertes par version, role administrateur serveur, favoris,
filtres, recits, profils, carriere, exemplaires, decks et PNG natifs restent
ceux du jeu. Pas de reset ou nouvelle table cloud. Navigation via boutons,
clavier et balayage ; dialogues via le gestionnaire d'historique existant.
Les controles sont DOM, pas des textes ou boutons peints dans les images.

La feuille animee est temporaire, inert et masquee aux lecteurs d'ecran.
Interruption au resize, demontage, filtre, arriere-plan ou Reduced Motion.
Aucune animation ni mesure permanente au repos.

Preuves et scripts de verification sous `work/qa/album-vivant/` et
`work/qa/album-hud/`, pas dans les sources de production.
