# Kalistar 4.6.39 : Vaerok et la faction Froz

Une nouvelle carte originale approuvee : Vaerok, Le Croc du Passage.
49902301 / vaerok-kalistar, Okami, Mercenaire, P2 uniquement, Epee longue,
Kalistel Sang. Nom, titre et element choisis pour cette production.
Illustration approuvee preservee ; fanion original Froz rouge et noir.

Froz reste distincte de Grivka. La synergie de race Okami reste partagee.
ATK physique privilegiee, boost D1 natif, magie D4, esquive DEF D3 et
barriere DEF D5. Aucun changement du moteur ni des anciennes cartes.

Tests de toutes les faces, effet consomme, barriere, faction independante,
16 matchs complets, restaurations et ajout non destructif a une ancienne
collection. Carte native 897 x 1497 avec PSD editable, cadre fixe identique,
PNG identique au PSD reouvert et code-barres valide.

Publication coordonnee apres la Library 4.6.38. Seul le perimetre explicite
de release.json est inclus, avec versions PC/telephone, tests et captures.
Les captures de qa/browser sont des emulations, pas des essais physiques.
La nouvelle autorisation permanente de coordination est notee dans AGENTS.md.

Avant le push, l'auteur demande MERCENAIRE a la place de SOLDAT. La revision
2026-10-12-vaerok-mercenaire conserve la premiere composition et change seulement
le calque JOB et le champ job. Comparaison pixel stricte hors de la zone JOB.

## Verification avant publication

- Index Git exporte et hydrate en copie isolee : 75 commandes, 929 tests passes.
- Build Pages : 357 cartes, 1297 fichiers, 851.2 Mo.
- Carte et arene controlees visuellement en 1440 x 1000 et 412 x 915.
  Lecteur egalement teste en 320 x 740, sans debordement horizontal.
- Filtre Froz, migration de la collection 356 vers 357 cartes, import de
  sauvegarde et reprise du combat verifies ; aucune erreur JS ou HTTP.
- Revision Mercenaire : 1479 pixels modifies, tous dans la zone JOB ;
  zero difference ailleurs, PSD reouvert identique et code-barres valide.
- Rapports dans qa/ et captures dans qa/browser/.

Le premier lancement isole manquait du chemin des dependances Node (marked).
La suite complete a ensuite passe avec KALISTAR_NODE_MODULES configure.
Le controle navigateur du build utilise un chemin KALISTAR_DIST normalise
pour Windows ; aucun assouplissement de tests ou verrou de reference.
