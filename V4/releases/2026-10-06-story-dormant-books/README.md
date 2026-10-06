# Kalistar V4.5.44

## Livres Inactifs

Le bloc du titre conserve son ancrage Minero natif, avec un ajustement optique
de 2px vers la gauche, sur PC et telephone.

Les onze livres suivants restent sans titre et disabled. Leur rendu devient
desature (80%), attenue (luminosite 55%, opacite 80%) et sans lueur de survol.
Les silhouettes, matieres et cristaux restent visibles ; aucun flou ni nouvelle
illustration. Tome I garde sa lumiere et son interaction.

Les fichiers d'image, le roman, la progression locale et les regles restent
inchanges. Badges et assertions de version passent a 4.5.44.

## Validation

Le test Story controle le decalage de 2px sur sept formats, les styles inactifs
et leur stabilite au survol, le livre actif, clavier, lecture/reprise et reduced
motion. Captures dans verification/.

- 13 tests cibles Story/library/build : OK.
- 426 tests du workflow Pages sur snapshot isole : OK.
- Construction statique du catalogue de 232 personnages : OK.
- Controle Chrome du serveur local et du site statique construit : OK.
- Captures PC 1440x1000 et telephone 412x1007 inspectees.
- Images approuvees et roman preserves ; aucun changement de sauvegarde.

Publication ciblee sur Yoshi-san87/Kalistar/main, tag annote v4.5.44.
