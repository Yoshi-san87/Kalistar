# Kalistar 4.5.36 - Le livre ferme et les adieux de Lanio

Revision du 6 octobre 2026, exclusivement a partir des fichiers locaux.
Aucun acces au Drive. Le DOCX de l'auteur reste intact.

Publication distincte, apres la livraison des nouvelles cartes 4.5.35.
Version PC/telephone et assertions mises a jour ensemble ; tag `v4.5.36`.

## Roman

La derniere decision de l'auteur remplace l'enterrement de Lanio : son corps
est depose a Zarok, au village des Rhinoz, dans une piece abritee ouverte pres
du terrain d'Astraball. Ses compagnons de jeu sont aupres de lui.

Les chapitres XVI et XVII sont reecrits comme des scenes : choix du lieu,
preparation, trajet, accueil des joueurs, souvenirs partages, depot et retour
a la Tour. Nazar reste au village. La mort de Lanio, l'absence de Gen, le
rendez-vous a Mennuyir et le refus de Balmhyr sont preserves. Le billet de
Gilmarr est deja prepare au XI ; aucun nouveau raccord au VIII n'est requis.

Le roman compte 113 472 mots et 1 279 paragraphes. Les sections du prologue
au XV sont identiques a la publication precedente. Dix-huit sections, memes
identifiants et titres, quatre illustrations aux memes ancrages. Les reperes
proportionnels existants restent valides apres revision.

SHA256 du manuscrit :
`e6f3468b33b786156cb98ddaf48cc152fea2e8980e6cedf2a44a39fb797d2cef`.

## Bibliotheque

Story presente d'abord un grimoire ferme, Tome I - Le Reveil. Le clic ou
Entree ouvre la liseuse au dernier repere. Un bouton Bibliotheque permet de
fermer le livre sans perdre le chapitre, la position ou les preferences.
La couverture revient lors d'une navigation ou d'un rechargement.

Le cuir peint vert, les ferrures patinees et le cristal Rainbow sont un nouvel
asset, pas une modification du grimoire ouvert approuve. L'image est generee
avec l'outil image integre ; le prompt exact et le PNG original sont conserves
ici. Le site consomme uniquement le WebP de 534 ko, avec alpha preserve.
Les titres sont du HTML accessible, independant de l'image.

L'ouverture courte et le mouvement au survol sont supprimes avec Reduced Motion.
L'ouverture du livre est protegee contre les clics rapides et les chargements
tardifs apres navigation. Aucun changement de regle ou de sauvegarde de match.

## Verification

- Copie isolee de l'index : les 248 tests du workflow Pages passent,
  build statique de 232 cartes / 730 fichiers. Rapport `workflow-results.json`.
- 16 tests Story, build, PWA et performance.
- 60 tests catalogue, composition, equipement, introduction, tours et score.
- Navigateur sur 1440x1000, 1024x768, 850x760, 412x1007, 390x844,
  320x568 et 844x390 : couverture, geometrie de lecture, commandes tactiles,
  clavier, preferences, progression, images, Reduced Motion et navigation
  pendant un chargement retarde.
- Captures relues dans `verification/` : bibliotheque et lecture PC/telephone.
- Build GitHub Pages avec le nouvel asset ; aucune source de travail privee
  ni document d'auteur dans le site statique.
- Navigateur general de la copie isolee : Collection, Decks, Arene,
  telechargements et sauvegardes valides.

Les tests narratifs controlent la continuite, pas la qualite litteraire.
La relecture finale a verifie les souvenirs prepares au VIII/XI, les voix des
joueurs, le depot sans terre et la chronologie appel J0 / adieux J1 / aube J2.
