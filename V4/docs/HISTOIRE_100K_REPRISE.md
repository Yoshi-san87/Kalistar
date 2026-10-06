# Le Réveil : reprise narrative longue

## Source Actuelle

La demande du 6 octobre 2026 porte sur un roman de 100 000 à 120 000 mots :
approfondir les personnages, les scènes et leurs conséquences, sans ajouter
une nouvelle intrigue pour atteindre la longueur. Le document fourni par
l'auteur, `KALISTAR — Histoire intégrale.docx`, est la source prioritaire.
Il contient aussi des variantes et des notes pour la suite : ces notes ne
sont pas automatiquement des révélations à intégrer au tome I.

Le travail a utilisé uniquement les fichiers locaux. Aucun accès au Drive.
Le DOCX original reste intact. Les extractions, contrats de suspense, brouillons
et rapports de relecture sont privés et exclus de Git et du site statique.

Le manuscrit de lecture est `../site/story-content.json`. Ses identifiants,
titres, ordre et quatre illustrations approuvées restent stables. La mémoire
de lecture existante continue de fonctionner ; une position proportionnelle
peut naturellement correspondre à un passage différent après une réécriture.

## Priorité Éditoriale

Cette reprise remplace les choix narratifs de `HISTOIRE_80K_PLAN.md`, qui reste
un compte rendu historique de la version du 2 octobre, pas une instruction
pour rétablir ses anciennes phrases.

Correction importante issue de la nouvelle source : Gen réalise bien une
transfusion Electro au chapitre IV. Elle se fait au contact de sa chair et
de sa prothèse, manque de le tuer et ne lui donne pas une maîtrise immédiate.
Les arcs atteignent aussi sa main organique. Ses amis ne connaissent pas
d'emblée le détail de l'opération ; leurs déductions précèdent la confirmation
du laboratoire. La carte jouable de Gen décrit un état antérieur et n'est pas
modifiée pour suivre cette étape du roman.

## Fil Narratif

- Kaylis, Baba, Gen et Lanio ont chacun leurs désirs, leurs limites et leurs
  liens avec les trois autres. La mine, les repas, les soins et l'apprentissage
  développent ces relations avant les grandes confrontations.
- L'éveil public de Kaylis conduit à une seule arrestation et une seule
  audience. L'évasion collective sépare Gen des trois fugitifs.
- Balmhyr et Belzébuth ouvrent la découverte de la surface. Deux jours
  d'apprentissage ne transforment pas les héros en combattants infaillibles.
- L'Astraball donne à Lanio un avenir personnel, pas un pouvoir magique.
  Nazar est le fils de Belrog ; Yvar celui de Koronak.
- Les visions de Kaylis restent des perceptions et des questions. Le narrateur
  ne confirme ni leur explication ni les identités réservées à la suite.
- Le transfert de Gen précède l'arrivée de Baba, Belrog et Yvar. La Z6 est la
  couverture du faux ordre ; la chambre est vide et Gen demeure prisonnier.
- Au Conseil, le partage six contre six précède la procuration de Kognus.
  Lok tue Vorn avant l'entrée de Balmhyr. Ses remords n'effacent pas les crimes.
- Lanio protège Nazar pendant l'attaque de la projection. Sa chute est
  mortelle et définitive. Le deuil concerne aussi Gen, qui reste isolé.
- L'enterrement près de la sortie de Z13 précède la confrontation finale.
  Voloden exige le Minero Primaire ; Balmhyr refuse ; Kaylis et Baba partent.
  Le violet est constaté, pas expliqué. Mennuyir reste une ouverture de suite.

Les informations révélées par un personnage intéressé ne deviennent pas
automatiquement des certitudes du narrateur. Les retours en arrière doivent
être balisés ; ne pas rejouer une capture ou une rencontre pour développer
deux versions contradictoires du DOCX.

## Compteur

Comptage des suites non vides séparées par des espaces dans les paragraphes
uniquement, sans titres, légendes, épigraphe ni interface du lecteur.

| Section | Mots |
| --- | ---: |
| Prologue | 2 843 |
| I | 6 005 |
| II | 6 500 |
| III | 5 875 |
| IV | 6 885 |
| V | 6 631 |
| VI | 6 061 |
| VII | 5 831 |
| VIII | 7 163 |
| IX | 5 227 |
| X | 6 314 |
| XI | 6 554 |
| XII | 6 156 |
| XIII | 6 266 |
| XIV | 6 853 |
| XV | 7 129 |
| XVI | 6 454 |
| XVII | 6 266 |
| **Total** | **111 013** |

## Validation

`story-content.test.cjs` vérifie la plage demandée, les dix-huit sections,
l'absence de paragraphes identiques et de marqueurs inachevés, les ancrages
sémantiques des illustrations, la restauration de Gen et la séquence du
Conseil puis de la fin. Des contrôles empêchent la publication de termes
réservés aux notes de suite sans publier ces termes dans les tests eux-mêmes.

Ces tests ne mesurent pas la qualité d'un roman. La relecture éditoriale par
l'assistant principal, complétée par des lectures croisées, a corrigé la
chronologie, les connaissances prématurées, les répétitions de gestes et les
anticipations qui éventaient le suspense. Les scènes ajoutées sont de la
fiction développée à partir de la trame, pas des citations de l'auteur.

Le test navigateur du lecteur couvre sept dimensions, l'absence de débordement,
les réglages, la reprise de lecture et les quatre images. Le build statique
ne publie que le manuscrit curaté, jamais les documents de travail.
