# Grimoires des 12 Kalistels

Collection graphique du 6 octobre 2026. Un livre par Kalistel :
ELECTRO, PYRO, HYDRO, CRYO, AERO, HERBO, GEO, MINERO, HEMATO, NECRO, LUXO,
RAINBOW. NONE n'est pas un Kalistel.

## Direction

Meme grimoire droit, memes ferrures, tranche a gauche et emplacement du cristal.
Chaque cuir et cristal reprend son element canonique. Les images sont sans
texte : le titre du Tome I reste du HTML editable. Les onze autres livres sont
sans titre, sans action et disabled, conformement a la demande de l'utilisateur.

MINERO reutilise la couverture approuvee sans retouche ni recompression.
Onze edits ont ete generes separement avec l'outil integre image_gen, avec comme
references le livre Minero approuve et le cristal canonique correspondant.
Aucune consultation du Drive et aucune modification du manuscrit.

## Fichiers

- originals/ : les douze PNG originaux 1024 x 1536 avec alpha.
- images/ : douze WebP avec alpha. MINERO conserve ses octets approuves.
- prompts/ : prompts exacts ; MINERO reprend son prompt de la revision precedente.
- generation.json : provenance et parametres de chaque edition d'image.
- manifest.json : dimensions, alpha, tailles, SHA-256 et references.
- prepare.cjs : copie des originaux, conversion et regeneration des manifests.
  Ce script ne genere pas d'illustration et ne retouche pas les pixels.
- verification/ : captures et rapport desktop/mobile.

## Integration

Le runtime publie les onze nouvelles couvertures sous
V4/site/assets/ui/story-books/ ; MINERO reste
V4/site/assets/ui/story-closed-grimoire-v2.webp.
La bibliotheque Story utilise six colonnes sur grand ecran, quatre ou trois sur
les ecrans intermediaires et deux sur telephone. Le shelf defile verticalement.
Seul le Tome I ouvre le lecteur existant ; chapitre, theme, taille et progression
restent sauvegardes. Aucun futur tome ou recit n'a ete invente.

Les originaux et les prompts restent hors du build Pages. Les images WebP sont
decodees a la demande ; reduced motion supprime le mouvement de survol.

## Reproduction

Executer node prepare.cjs dans ce dossier. Sharp est resolu dans les dependances
Node disponibles, ou dans KALISTAR_NODE_MODULES. Les chemins de generation
locaux servent uniquement a la copie initiale ; originals/ rend ensuite le lot
autonome. Une regeneration n'ecrase pas les originaux deja conserves.

Tests :
node --test --test-isolation=none V4/site/story-library.test.cjs V4/site/story-content.test.cjs V4/deploy/build.test.cjs
node V4/site/story-reader.browser.test.cjs

## Sources Preservees

- V4/site/assets/ui/story-closed-grimoire-v2.webp
- V4/revisions/2026-10-06-story-minero/
- V3/assets/cristaux/<CODE>.png
- V3/donnees/elements.json

Le lot contient 41 049 185 octets d'originaux et 7 481 022 octets de WebP.
Le site ajoute seulement onze WebP (6 809 856 octets) et garde le Minero existant.
