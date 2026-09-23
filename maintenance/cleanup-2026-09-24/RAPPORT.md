# Suppression de l'archive privee - 24 septembre 2026

Autorisation utilisateur : « oui fais le menage », en reponse a la demande
explicite de suppression de l'archive locale Kalistar.zip de 7,4 Go.

- Cible unique : `Kalistar.zip` a la racine du projet.
- Taille avant suppression : 7 372 398 907 octets.
- Controle : fichier regulier, non reparse point, parent resolu exactement
  egal a la racine Kalistar et taille identique a l'archive identifiee.
- Absence de reference a ce fichier dans le verrou courant et les deux
  manifestes de composants de l'Atelier verifiee avant l'operation.
- Suppression effectuee avec `Remove-Item -LiteralPath`, sans recursion.
- Absence du fichier confirmee apres suppression.
- Espace libre observe apres suppression : 21 302 255 616 octets sur C:.

Aucun dossier source, illustration, PSD, banque de composants, fichier protege,
donnee navigateur ni autre archive n'a ete supprime. La presence d'une copie
distante n'a pas ete verifiee par l'assistant. Cette operation est limitee au
fichier explicitement propose puis autorise ; elle n'autorise aucun nettoyage
general supplementaire.
