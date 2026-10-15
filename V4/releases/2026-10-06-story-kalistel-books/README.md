# Kalistar V4.5.41

## Bibliotheque Des Kalistels

Douze livres droits, un par Kalistel, reprenant le grimoire Minero approuve.
Onze nouvelles couvertures generees separement avec l'outil image integre :
cuir adapte, cristal canonique et ferrures coherentes. Originaux, prompts exacts
et SHA-256 sont dans ../../propositions/2026-10-06-kalistel-books-v1/.

Seul le Tome I est cliquable et titre. Les onze autres couvertures n'affichent
aucune ecriture et sont de vrais boutons disabled, sans action de lecture.
Six colonnes desktop, quatre/trois intermediaires et deux sur telephone ;
defilement vertical sans barre visible, et chargement des couvertures a la demande.

Aucune modification du roman, du Minero approuve, des chapitres, de la progression
du joueur, des regles ou des cartes. Les changements locaux d'equipement en cours
restent hors de ce commit. Version PC et telephone et assertions passent a 4.5.41.

## Validation

- 13 tests cibles reussis, dont hashes des douze couvertures et du manuscrit.
- Snapshot isole de l'index valide : 300 tests du workflow Pages et deux tests
  supplementaires des couvertures reussis ; aucun travail non lie inclus.
- Story verifie sur 1440x1000, 1024x768, 850x760, 412x1007, 390x844,
  320x568 et 844x390 ; acces au dernier livre sur telephone.
- Clavier, reduced motion, reprise, preferences, retours Collection et chargements
  interrompus verifies. Captures dans le dossier de proposition/verification/.
- Build statique isole reussi : 232 cartes, 750 fichiers, 577.4 MiB.
  Le lecteur Story a aussi ete teste dans ce build sur PC et telephone.
  Seuls les WebP
  de jeu sont publies, jamais les originaux de fabrication.

Le push cible uniquement Yoshi-san87/Kalistar/main, avec le tag annote v4.5.41.
