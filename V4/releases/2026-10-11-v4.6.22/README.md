# Kalistar 4.6.22

Six armes Chrono Trigger : Rainbow, Arc Valkyrie, Wondershot, Masamune,
Bras Tératon et Faux du Désespoir. Illustration peinte en situation,
objet detoure et anneau individuel pour chacune. Ayla conserve ses poings nus.

Catalogue : 125 equipements (55 armes, 34 protections, 36 reliques).
Les 350 cartes personnages et les regles V4.6 restent inchangees.
Les bonus +20/+25 ATK utilisent le D6 numerique conserve, sans effets
surpuissants importes de Chrono Trigger.

Publication personnelle exclusivement sur Yoshi-san87/Kalistar.
`release.json` definit les fichiers inclus ; la ligne CI de performance
non publiee et tous les travaux locaux hors scope sont preserves.

## Verification

- 735 tests reussis dans les 66 commandes de validation de publication.
- 24 parties ABBA natives terminees avec sauvegarde/restauration a chaque etape.
- 18 scenarios navigateur du lot : six armes sur PC, Razr et compact.
- Nouvelle passe des six armes sur le paquet exact final en format Razr.
- Parcours Pages PC/telephone : 350 cartes, lecteur, export PNG, deck,
  arene, rencontre sauvegardee, publication additive ; aucune erreur HTTP/JS.
- Build exact : 1263 fichiers, 835.5 Mo.

Les controles locaux et les captures sont dans
`../../revisions/2026-10-11-chrono-equipment/qa/`.
`qa/publication.json` et les journaux associes conservent le resultat de
la suite complete executee sur un export exact de l'index Git, avec
hydratation LFS verifiee par empreinte. `qa/final-index.json` confirme
l'identite de ce contenu avec celui du commit prepare.
La verification publique est executee apres le deploiement ; ses preuves
ne sont pas presentees comme acquises avant le push.
