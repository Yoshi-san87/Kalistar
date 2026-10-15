# Kalistar V4.5.46 - Grivka noir et vert foret

Retouche demandee apres validation des propositions Grivka : remplacer le
grenat par du vert foret sombre sur le drapeau et les vetements de Rhovan
et Eyska. Noir et argent conserves. Les scenes, poses, visages, fourrures,
armes, lumiere et grain peint restent les references de la retouche.

## Sources

- Les trois variantes 02 et leurs prompts exacts sont dans
  [provenance-02.json](../../propositions/2026-10-06-grivka-okami/provenance-02.json).
- Generation : image_gen.imagegen, edition localisee depuis les variantes 01.
- Les variantes 01 et leur provenance historique restent intactes.
- Le drapeau est une proposition visuelle, pas un export natif calibre.
- Aucun PNG/PSD de personnage, profil, verrou ou regle modifie.
- Aucune carte Okami produite ; catalogue jouable inchange a 232 cartes.

## Verification avant publication

- Revue visuelle des trois sorties : palette, emblemes argentes, gestes et
  cadrages conserves, pas de recoloration globale des fourrures ou du decor.
- `check-assets.cjs` : six hashes verifies, incluant les trois originaux.
- Tests build/PWA : 6 passes, zero echec.
- Build isole du lot indexe : 232 cartes, 912 fichiers, 608.1 Mo.
- Test Chrome Pages passe : desktop/phone, lecteur, PNG, decks, arene,
  sauvegarde et publication additive, aucune erreur JS/HTTP.
- Version desktop/mobile et assertions mises a jour ensemble.
- Le premier build a manque d'espace disque. Seule une ancienne copie
  temporaire de QA creee par cette tache a ete supprimee ; reprise reussie.
- Les changements locaux des autres taches, notamment le fond Collection
  et le workflow Pages, sont exclus de ce lot.

Publication personnelle : `Yoshi-san87/Kalistar`, `main`, tag `v4.5.46`.
La verification apres deploiement utilise `public-check.cjs`.
