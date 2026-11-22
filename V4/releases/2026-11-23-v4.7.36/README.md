# Kalistar 4.7.36 - Map 1.40 et petits ponts

## Perimetre

Publication de la map 1.40 validee par l'auteur le 22 novembre : petites iles
redessinees a l'est de Durane, reliees par de fins ponts et un acces continental
au nord. Les huit villes, leurs portraits et leurs coordonnees sont inchanges.
L'export WebP sans perte reprend exactement le terrain approuve, sans villes
fusionnees. Les 8 237 pixels modifies restent dans le masque local.

Un seul media est ajoute au registre, sans suppression ni changement d'une
autre entree. Les originaux et le PSD sont sauvegardes hors checkout, avec
controle SHA-256. La Collection Album 4.7.35 est conservee : les travaux de sa
prochaine revision, du HUD et de la navigation ne font pas partie de ce commit.
Aucun changement de gameplay, de compte, d'acces ou de sauvegarde.

## Verification

- 17 tests natifs Map passes sur les versions 1.33, 1.36, 1.39 et 1.40 :
  provenance, pixels hors masque, calques, PSD relu et export sans perte.
- Map verifiee sur PC 1440 et smartphones 412/390 : huit villes, accordions,
  marqueurs, cadrage, bas de carte et rechargement. Build CF_PAGES=1 valide.
- La premiere suite generale du checkout partage rencontre une assertion
  Collection en cours de revision. Ce resultat n'est pas utilise pour valider
  la livraison : la suite est relancee sur son commit isole avec les medias
  natifs locaux, sans restaurer les fichiers de l'autre chat.
- Le paquet exact de `prepare:release` est controle avant l'envoi Cloudflare :
  Map PC/telephone, smoke general, sauvegarde/reload, puis login public et
  acces prive anonyme. Les tests n'utilisent pas le navigateur personnel.

Preuves et journaux : `work/qa/map-1.40/`. Les liens de medias du checkout QA
servent seulement a la lecture des fixtures natives, jamais de sauvegarde.
Le checkout temporaire est retire apres les controles ; seuls ses rapports
utiles sont conserves. Git conserve les sources texte et les empreintes,
pas les fichiers PNG, PSD ou WebP.

Source et approbation : `V4/map/layers-1.40/PUBLICATION.md`.
