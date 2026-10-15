# Armes Et Protections Visibles En Arene

Decision utilisateur du 9 octobre 2026, version 4.6.2.

- Arme et protection portees restent visibles, fixes quand leur condition
  n'est pas active. Aucune languette de bonus sur ces deux cercles en arene.
- Diametre natif 106, contre 86 auparavant. Centres conserves : ATK
  (160, 264.5), DEF (735, 270.5). Projection par crop et rectangle dessine,
  avec le meme centrage dans la popup, le focus et apres resize.
- Activation : le cercle deja visible s'enclenche et tourne avec son D6.
  Desactivation : retour mecanique bref puis cercle fixe, sans disparition.
- Le plateau termine conserve les objets au repos ; les animations, notes,
  transferts, marqueurs D6 et listeners temporaires sont nettoyes.
- Reliques conditionnelles, composition et arsenal restent inchanges.
  Les bonus continuent d'etre exposes dans le recap et le journal.

Aucune modification du moteur, des objets, des faces natives, des profils
ou des snapshots. Une presence fixe ne signifie pas qu'un bonus est applique.
Le libelle accessible distingue port, activation et bonus non applique.
Reduced Motion conserve des cercles fixes et des transitions courtes.

Les tests de presentation et du vrai shell couvrent : avant jet, D6 utilise,
retour au repos, equipe adverse, inspection, Back, reload, isolation du profil,
carte normale/focus, resize, fin de match et navigation. Les trois formats sont
1440x1000, Razr 412x1007 et compact 320x568 (Reduced Motion).
Captures et resultats de cette revision dans `qa/`, sans modifier les preuves
des publications precedentes.
