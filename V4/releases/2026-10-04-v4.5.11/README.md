# Kalistar 4.5.11

Retouches visuelles demandees apres 4.5.10.

- Arborium : eclat Herbo renforce sur Eryss, Velran, Saelor et Liorne.
- Neryk : aucune forme d'oeil dans le casque vide tenu en main.
- Orven : longues canines deployees, visiere rouge bornee par leurs bords.
- Aeren retire du catalogue actif et de ses fichiers de creation ; Vessa conservee.

211 cartes jouables. Les 211 profils restants conservent leurs statistiques et
regles. Les Kalistels des armures n'ajoutent aucun effet moteur, et les
personnages NONE conservent leur cristal personnel eteint.

## Controles

- Six PSD/PNG verifies : zero pixel modifie hors illustration, zero difference
  a la reouverture et codes-barres reconnus.
- 205 autres cartes preservees ; les archives approuvees d'Aeren sont conservees.
- Six tests cibles reussis, dont 24 matchs complets avec sauvegarde/reprise.
- Lecteurs des 18 soldats, filtre CRUSTOS, arene et reload verifies en navigateur
  isole ; captures desktop 1440 x 1000 et telephone 412 x 915.
- Build Pages : 211 cartes, 669 fichiers, 524.7 Mo.
- Les 137 tests du workflow passent sur l'instantane Git isole
  705e5cc300daedf67b651ce93b9a2ec8ba4e310b, avant ajout de ce bilan.
  Resultats : workflow-results.json.
- La suite navigateur du build isole passe : collection, lecteur, telechargement
  PNG, decks, arene, sauvegarde/reprise ; aucune erreur HTTP ou JavaScript.

Sources, prompts image_gen, images finales et preuves :
V4/revisions/2026-10-04-armor-refinement/.

Publication cible : Yoshi-san87/Kalistar, main et tag annote v4.5.11.
Le script public-check.cjs doit confirmer le commit, les six images et
l'absence d'Aeren apres le succes du workflow Pages.
