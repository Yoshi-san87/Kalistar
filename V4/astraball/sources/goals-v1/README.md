# Buts Astraball en images

Images generees avec l'outil integre image_gen le 25 octobre 2026.
Les [prompts](prompts.json), [ancrages source](inputs.json) et
[empreintes des exports](provenance.json) permettent de retrouver la production.

- Cinq materiaux : blanc officiel, bois, fer, pierre et bois ivoire de Thalassea.
- Deux angles supplementaires pour les terrains classiques en isometrie.
- Chaque original PNG est conserve dans originals/. Les WebP du jeu sont dans
  ../../assets/goals-v1/, avec leur alpha et sans retouche geometrique.
- prepare.cjs copie les originaux puis reduit uniformement a 512 x 768 et encode
  en WebP sans perte. Il ne dessine pas les buts et ne retire pas leur fond.
- La source de la premiere generation blanche devient la vue isometrique ;
  sa revision plus laterale devient la vue HD-2D.

Le moteur pose deux sprites statiques, partage la texture entre les equipes
et applique une echelle uniforme. Les pieds sont calibres autour du milieu
des trois cases de tir. L'image est une representation lisible en perspective,
pas une collision : aucune regle, cible ou sauvegarde ne change.

Les fichiers binaires restent locaux et sont sauvegardes hors checkout dans
Kalistar-sauvegardes/astraball-goals-v1 avant publication. Seuls les textes et
empreintes vont dans Git. [Apercu local](preview.html).
