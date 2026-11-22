# Kalistar 4.7.35 - Album vivant

Collection devient un album de douze emplacements fixes, avec cases vides et
une carte par version. Chaque double page contient six pochettes de chaque
cote. Animation recto/verso de feuille en 720 ms, annulation et Reduced Motion.
Carte a gauche et lecture paginee a droite sur PC, Razr et ecran etroit,
sans defilement du document ou du lecteur.

HUD et menus reprennent les matieres emeraude/cuivre et les cadres alpha du
meme lot, sans changer navigation, acces, audio ou masquage en Arene.
Six nouveaux composants bitmap, moins de 900 Ko ensemble ; cartes natives
et textes DOM conserves. Voir ../../revisions/2026-11-22-album-vivant/.

Aucun changement de regles, de collection serveur ou de sauvegarde. Le
Catalogue conserve les decouvertes apres transfert et l'acces complet admin.

## Verification

Suites generales : 107 invocations CI et 14 invocations locales reussies.
Apres le dernier ajustement paysage : 32 tests de build, UI, positions et
navigation reussis. HUD : 11 configurations, dont les quatre actions hebergees
simultanees a 320 px, plus les tests de navigation existants.

Controles navigateur de pagination fixe et cas vide, lecteur et textes longs
(couverture caractere par caractere), versions, favoris, filtres, PNG,
carriere/exemplaires, historique et droits Catalogue. Huit profils pour le
lecteur (dont deux formats tres bas) et six pour le login : PC, grand ecran,
Razr, compact, paysage et Reduced Motion.
Preuves dans work/qa/album-vivant/ et work/qa/album-hud/. Le build fige est
teste avant envoi a Cloudflare, puis acces anonyme PC et Razr controle.
