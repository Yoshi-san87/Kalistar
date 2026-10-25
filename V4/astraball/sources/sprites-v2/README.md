# Sprites Astraball - lot 2

Vingt personnages existants, en complement des dix atlas `sprites-v1`.
Les atlas existants, les equipes et les sauvegardes ne sont pas modifies.
Format final : 384 x 384, 4 x 4 poses, cellules 96 x 96, pieds a 90.

## Personnages

Rikka, Gen, Keryn, Riko, Vaerok, Elyrane, Brask, Maelka, Ssilas, Eryss,
Varkhen, Dame Ysane, Aelis, Brund, Bex, Nell, Ithrek, Odran, Edris-7F et Nessyra.

Les 20 PNG sources ont ete generes avec image_gen : le spritesheet Kaylis du
lot 1 fournit le template, l'illustration approuvee fournit l'identite.
`prompts.json` conserve le prompt commun et chaque consigne individuelle.
`provenance.json` indique les references, fichiers generes et SHA-256.
Le preparateur conserve les originaux et produit les atlas sous
`../../assets/sprites-v2/`. `atlas-report.json` conserve les decoupes et echelles.

## Resultat Et Controle

320 poses, 778 519 octets au total apres preparation. Transparence binaire,
filtrage nearest-neighbor et echelle uniforme par personnage. Les 16 poses
partagent l'appui au sol et ne sortent pas de leur cellule.
Deux orientations par miroir, pas huit directions nouvellement dessinees.

Les tests verifient les empreintes des references et des atlas, les 16 cellules,
les marges transparentes, les cycles distincts et la preservation du lot 1.
La galerie a ete controlee dans Chrome sur PC, Razr 50 et largeur 320 px :
sept animations, pause, miroir, zoom, filtre, recharge et Reduced Motion.
Captures et mesures locales : `work/astraball-sprites-v2/qa/` a la racine.

Les PNG restent locaux et dans la sauvegarde native privee ; seuls les 20 atlas
runtime sont distribues sur le site. Le catalogue relie chaque apparence au
`characterId` stable et au `modelId`, jamais au nom affiche.
Voir [le guide des sprites](../../SPRITES.md) pour le schema et l'integration.
