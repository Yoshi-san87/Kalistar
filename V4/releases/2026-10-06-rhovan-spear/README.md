# Kalistar V4.5.49 - Lance de Rhovan

Correction ponctuelle demandee par l'auteur : la lance ne doit plus tenir
seule devant Rhovan. Elle est portee dans son dos avec un harnais de cuir
visible a l'epaule. La pose, le mousqueton, les couleurs noir/vert foret,
le visage, les accessoires et le decor restent les references conservees.

## Sources

La nouvelle illustration est `Rhovan-03.png`. Les sorties 01 et 02 restent
intactes. Le drapeau Grivka-02 et Eyska-02 ne changent pas.
Le prompt exact, les references et le hash sont conserves dans
[provenance-03.json](../../propositions/2026-10-06-grivka-okami/provenance-03.json).
Outil : edition avec `image_gen.imagegen`, sans retouche procedurale.

## Perimetre

Illustration proposee uniquement : aucune nouvelle carte jouable, aucune
modification du gameplay, du catalogue, du template, des PNG/PSD natifs
ou des verrous. Catalogue inchange a 232 cartes.
Les six fichiers de version sont avances ensemble pour la publication.
Les changements locaux des autres taches restent hors de ce lot.

## Verification

- Revue visuelle : une seule lance, portee derriere l'epaule par une sangle,
  plus aucun manche devant la jambe ; visage et geste au mousqueton conserves.
- Hash et format PNG de la sortie 03 verifies (1075 x 1463).
- Les six images des variantes 01/02 sont toujours identiques a leurs hashes.
- Tests build/version/PWA du lot isole : 8 passes, zero echec.
- Build local isole : 232 cartes, 913 fichiers, 608.6 Mo.
- Une assertion residuelle de titre 4.5.47 dans weapons.browser.test.cjs est
  synchronisee avec 4.5.49 ; les autres adaptations UI sont preservees.
- Les essais dans le checkout partage ont rencontre les travaux de version
  puis de CSS Collection des autres taches. Ils ne sont pas utilises comme
  preuve de livraison : le lot indexe a ete verifie dans la copie isolee.
- La copie temporaire de QA 4.5.46 a ete reutilisee avec les 59 fichiers
  modifies depuis ce tag, extraits du nouvel index et controles par hash LFS.
  Aucun nouveau snapshot volumineux, aucune modification des fichiers tiers.
- Le build/deploiement CI et la version publique sont controles apres push.

Depot personnel : `Yoshi-san87/Kalistar`, branche `main`, tag `v4.5.49`.
