# Kalistar 4.7.12

La livraison conserve exactement les sept images et le rendu des buts de
[4.7.11](../2026-10-25-v4.7.11/README.md). Aucun changement de gameplay.

Le premier controle GitHub 4.7.11 a echoue : le nouveau test de catalogue lisait
un WebP absent du depot leger, volontairement sans medias. Le test portable
compare maintenant provenance et registre SHA-256. Le test goals.native.test.cjs,
inscrit dans la suite ci locale et non dans repository, verifie obligatoirement
les sept originaux, les exports, leurs empreintes et leur alpha reel.
Les controles navigateur d'images restent actifs sur le build exact.

La version 4.7.11 n'a pas ete envoyee a Cloudflare. Cette version corrective
sera la premiere livraison en ligne des buts en images.

Les preuves sont conservees sous work/astraball/goals-v1/ ; les sources et
prompts sont dans [goals-v1](../../astraball/sources/goals-v1/README.md).

## Verifications

- Suite ci complete relancee : 2048 tests reussis, deux ignores, aucun echec.
- Suite locale relancee : 154 tests reussis, aucun echec.
- Copie isolee des 16155 fichiers textes suivis, sans aucun media : les 177
  tests du wrapper Astraball passent.
- Le build fige de 4.7.11 a passe camera, interface Astraball complete, tailles
  de sprites et Collection/Decks/Arene avec sauvegarde. Pour 4.7.12, les modules
  du rendu, de projection, de buts, de l'application et l'allowlist sont
  compares octet pour octet ; camera et interface principale sont rejouees
  sur le nouveau build fige avant publication.
