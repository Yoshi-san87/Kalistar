# Story - Couverture grise Minero

Revision demandee par l'auteur le 6 octobre 2026 : livre ferme droit, cuir gris
et cristal Minero gris, a la place de la couverture verte au cristal Rainbow.

## Sources Et Integration

- Edition raster avec l'outil image integre, pas de recoloration CSS.
- Cible : `V4/site/assets/ui/story-closed-grimoire-v1.webp`.
- Reference du cristal : `V3/assets/cristaux/MINERO.png`, inchangee.
- Prompt exact : `cover.prompt.txt`.
- Original genere : `story-closed-grimoire-v2.original.png`, 1024 x 1536, alpha.
- Runtime : `V4/site/assets/ui/story-closed-grimoire-v2.webp`, meme taille, alpha.

Le livre reste de face, avec une tranche fine a gauche et des pages en bas.
Le cuir devient gris neutre ; les ferrures bronze/dorees et le relief peint
restent coherents avec Kalistar. Le cristal reprend les facettes argent/gris,
le fond mineral et le sertissage Minero. Aucune ecriture n'est generee :
le titre, la serie et le numero du tome restent des textes HTML accessibles.

Le survol conserve seulement une levee de 3 px et le reflet, sans rotation ni
perspective. Reduced Motion, clavier, ouverture et reprise restent inchanges.
Le v1 est conserve pour les anciennes ressources mises en cache ; la liseuse
actuelle charge exclusivement le v2. Le grimoire ouvert approuve est intact.

## Perimetre

Aucune modification du roman, de ses illustrations, de la progression locale,
des cartes, de l'equipement ou des regles. Le manuscrit garde son SHA256 :
`e6f3468b33b786156cb98ddaf48cc152fea2e8980e6cedf2a44a39fb797d2cef`.

## Verification

Le test navigateur Story controle le nouveau fichier et une matrice de survol
sans rotation. Il couvre la bibliotheque et la lecture sur 1440x1000, 1024x768,
850x760, 412x1007, 390x844, 320x568 et 844x390, la reprise, les preferences,
le clavier, Reduced Motion et les chargements interrompus.

Le test a aussi detecte le libelle Equipements plus large que sa colonne a
320 px depuis la livraison precedente. Sous 360 px, les colonnes Collection
et Equipements recoivent une largeur minimale adaptee, sans diminuer la police
ni les cibles tactiles. Les trois autres destinations gardent au moins 44 px.

Captures PC et telephone : `verification/`. Le PNG de fabrication reste hors
du build Pages ; seul le WebP de jeu y est consomme.
