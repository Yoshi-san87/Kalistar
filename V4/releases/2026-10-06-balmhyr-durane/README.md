# Kalistar V4.5.40 - Balmhyr, Le poids du retour

Nouvelle illustration de la seconde edition `49900802`, approuvee par
l'utilisateur le 6 octobre 2026 : Balmhyr dans les couloirs de Durane, nouvelle
tenue, Poing de Fer et bannieres de sa faction. Titre et description accordes
a la scene. Meme identifiant, statistiques, positions P2/P3 et famille Poing.

La premiere edition Hache `30000007`, 2B `49900801`, les autres cartes et les
sauvegardes sont preserves. Le catalogue reste a 232 cartes. Les equipements
et Story de V4.5.39 sont conserves; leurs fichiers ne sont pas retouches.

## Verification

- Composition Photoshop 26.11.8, PSD editable 897 x 1497 px a 300 ppp.
- Zero difference de cadre fixe, zero difference a la reouverture PSD,
  code-barres 49900802 relu, aucune modification hors illustration/titre/lore.
- 9 tests cibles : toutes les faces, equipements, sauvegardes, 12 matchs
  complets et conservation byte-identique de 2B.
- Lecteurs PC (1440 px), Razr 50 (412 px), petit telephone (320 px),
  deux camps de l'arene et rechargement de partie controles dans une copie isolee.
- Les 300 tests du workflow passent sur l'index isole, puis le build Pages
  produit les 232 cartes. Detail : `workflow-results.json`.
- Le test navigateur Pages general passe aussi : collection, telechargement
  PNG, decks, arene, sauvegardes et publication additive, sans erreur HTTP.
- Verification publique du commit, de la version PC/mobile, des profils et
  des empreintes PNG : `public-check.cjs`.

Les captures de premiere verification sont faites sur une copie de V4.5.38
avec la nouvelle carte, avant que l'index partage soit libere. Les captures
finales de publication sont refaites sur le snapshot V4.5.40 et conservees
dans `qa-pages/` (PC, Razr 50, 320 px et les deux camps de l'arene).

Sources, conservation et controles natifs :
[`revisions/2026-10-06-balmhyr-durane`](../../revisions/2026-10-06-balmhyr-durane/README.md).
Aucun verrou ni rapport historique n'est reecrit. Publication cible :
`Yoshi-san87/Kalistar`, `main` et tag annote `v4.5.40`.
