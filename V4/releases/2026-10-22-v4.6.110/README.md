# Kalistar 4.6.110 - Kaylis dans le Fragment de Momo

Retouche visuelle demandee par l'auteur : cette rencontre se situe plus tard
dans l'histoire. Kaylis retrouve la cape noire brodee de rouge et la longue
tresse de sa version approuvee 49902701, Le Prochain Pas. Son visage et son
allure sont plus affirmes, en gardant la douceur de la rencontre avec Momo.

L'outil de generation d'images integre a retouche la scene existante avec
l'illustration native de Kaylis comme reference. Composition, Momo, flute,
boite musicale et lumiere du matin restent dans la meme scene. Aucun texte,
deck, effet, moteur, compte ou schema Supabase n'est modifie.

## Fichiers Et Preservation

- Source v2 et prompt :
  [lot Fragment](../../revisions/2026-10-22-fragment-adventure/README.md) et
  [references de retouche](../../revisions/2026-10-22-fragment-adventure/kaylis-cape-v2.json).
- Exports WebP : 1672 x 941, 371 408 octets ; 840 x 473, 140 650 octets.
  La scene active est plus legere que la premiere edition.
- Source v1, ses exports et l'illustration native de Kaylis preservent leurs
  empreintes. Nouvelle source sauvegardee hors checkout avant publication.
- Le lecteur et la ceremonie selectionnent la version 2 pour le chapitre
  boite uniquement ; les six autres scenes restent en version 1.
- Les binaires restent locaux et sur Cloudflare, pas dans Git/LFS.

## Verification De Publication

Les quatre tests de sources/export verifient les empreintes, les tailles,
la reference 49902701 et la preservation de la version precedente.
La publication est conditionnee aux suites CI et locale completes, puis aux
controles navigateur PC/Razr sur le build fige du commit : scene boite v2,
lecture, ceremonie et absence de debordement. Aucun combat reel Paris/Tokyo
n'est utilise pour les tests.

Les preuves et logs repetables sont sous work/fragment-adventure/kaylis-cape-*
et work/qa/kaylis-cape-4.6.110-*, hors Git. Apres push du tag v4.6.110, verifier
le workflow et le login public Cloudflare du commit deploye.
