# Couvertures Fragment

Demande : nouveaux livres utilisant l'illustration de la carte a gagner en
couverture. Aucun changement de cartes natives, de Story ou de progression.

## Composition

- Reliure originale generee avec l'outil image integre, reference de matiere :
  `V4/site/assets/ui/story-books/electro-book-v1.webp`. Prompt exact dans
  [prompt.txt](prompt.txt). Original local dans `sources/binding-v1.png`.
- Peintures originales des modeles recompenses, sans regeneration des
  personnages : Momo `30000001`, Balmhyr `49900802`, Kaylis `49055457`.
- [provenance.json](provenance.json) : sources, SHA-256 avant conversion et
  exports web. [prepare.cjs](prepare.cjs) : encodage WebP reproductible avec
  Sharp, sans retouche de peinture ni remplacement des sources.
- Composition HTML dans `journey-view.js/css` : peinture sous la reliure
  transparente, nom sur le bas de l'image, titre sur le cuir. Une seule reliure
  telechargee, reutilisee par tous les livres. Aucun titre dans le bitmap.

Les fichiers binaires sont conserves sur ce PC et dans la sauvegarde personnelle,
pas dans Git. Seuls code, prompt, provenance et registre runtime sont suivis.
Les images Story restent au meme chemin et ne sont pas modifiees.

## Verification

`node --test V4/site/journey-covers.test.cjs` controle sources, modeles,
empreintes et alpha. `node V4/site/journey-view.browser.test.cjs` controle
texte et cadre, PC/Razr, filtres, tactile, quatre etapes, reclamation, nettoyage
et fallback vers l'art de la bonne version. Preuves sous
`work/qa/fragment-covers/`, hors Git.
