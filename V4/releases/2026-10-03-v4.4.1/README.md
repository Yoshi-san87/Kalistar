# Kalistar V4.4.1

Publication autorisee le 3 octobre 2026 sur le depot personnel
`Yoshi-san87/Kalistar`, branche `main` et tag annote `v4.4.1`.

## Lot

- Anneaux transparents personnalises : pierre/cuivre pour Balmhyr,
  electricite bleue/cuivre pour Momo. Le dessin de l'arme reste stable;
  anneaux et radar continuent de tourner dans l'Arsenal et en combat.
- Couronne de capitaine entierement visible dans le coin inferieur gauche,
  en respectant le zoom et l'agrandissement du challenger, sans pastille.
- En combat, la medaille remplace le nombre a droite de la tete de mort
  des le Double-Kill. Le total exact reste accessible. Taille responsive
  pour les bandeaux PC et telephone; aucun compteur duplique.
- Version 4.4.1 dans le titre, le badge PC, le badge phone et leurs tests.
- Consigne durable de publication automatique apres chaque modification
  terminee et validee, uniquement sur le depot personnel. Chaque push
  continue d'incrementer la version.

Le moteur, les profils, les cartes natives et les schemas de sauvegarde
restent inchanges. Les anciennes illustrations et preuves restent intactes.
Les modifications locales independantes du roman Story ne font pas partie
de cette publication et sont preservees.

## Sources Et Verification

[Revision et captures](../../revisions/2026-10-03-personalized-weapon-rings/README.md).
Les sources generees avec ImageGen, prompts exacts, exports et empreintes
sont conserves. Le constat local sans push du rapport initial precede
l'autorisation de cette release.

33 tests Node du lot : medias generes, statistiques, medailles, equipement,
composition et anciennes sauvegardes. Suites navigateur Armes, Composition
et Medailles : desktop, Razr 50, petit telephone, conditions actives,
bonus moteur, reload, focus, zoom, mouvement reduit, couronne et neuf tiers
de medailles. Les bases de test sont separees du navigateur personnel.
Les captures de version 4.4.1 de l'Arsenal remplacent seulement les captures
de travail de cette nouvelle revision, jamais une ancienne preuve validee.

Construction Pages : 193 cartes, 499 medias. Le helper
`build-committed-runtime.cjs` exclut le roman local non termine sans modifier
ses fichiers; la CI construit le commit propre. Les nouveaux tests des
statistiques et medailles sont ajoutes a la validation Pages existante.

## Publication

Le workflow `Publish Kalistar` construit puis deploie GitHub Pages.
`node V4/releases/2026-10-03-v4.4.1/public-check.cjs` compare le manifeste
public entier au build du commit publie, verifie huit medias par SHA-256,
les deux badges, le branchement des nouveaux anneaux et le rendu du compteur.
Ne pas annoncer le site a jour avant le succes du workflow et de ce controle.

Site : https://yoshi-san87.github.io/Kalistar/jeu/

Les controles phone sont executes dans Chrome automatise, pas sur un appareil
Android physique.
