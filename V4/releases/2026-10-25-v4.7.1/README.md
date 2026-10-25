# Kalistar 4.7.1 - Personnages Astraball

Les dix portraits du terrain deviennent des personnages de corps entier en
pixel art original, inspires des proportions JRPG demandees et des costumes
Kalistar approuves. Les portraits restent dans l'initiative et les fiches.

## Animation

- Momo, Kaylis, Taulio, Cana, Balmhyr, Voloden, Lok, Darnako, Iliane, Valazar.
- Seize poses par personnage : respiration, course, lancer, garde, impact, joie.
- Deplacement en quatre images, orientation vers la destination, preparation
  du lancer, reaction de la cible aux charges, celebration des cinq partenaires.
- Pieds ancres au sol, ombres et anneaux d'equipe separes, pixels nets au zoom.
- Deux orientations miroir ; il ne s'agit pas de huit directions dessinees.
- Clips pilotes exclusivement par les evenements du moteur. Aucun changement
  de regles, statistiques, IA, sauvegardes, authentification ou base de donnees.

## Performance Et Sources

Dix PNG indexes de 384 x 384 pixels, 160 cellules de 96 x 96, 405 214 octets
au total. Le bundle PixiJS versionne ajoute seulement Texture et Rectangle.
Pas de dependance reseau ou d'effet shader supplementaire. Les actions rendent
au maximum environ 60 images/s ; la respiration finit apres douze mises a jour.
Le terrain ne se redessine plus ensuite. Hidden et Reduced Motion respectes.

Generation via l'outil image_gen integre. Les prompts complets, references et
decoupes verifiees sont dans [sources/sprites-v1](../../astraball/sources/sprites-v1/prompts.json).
Le [guide](../../astraball/README.md) explique la reconstruction deterministe
par Sharp. Aucun dessin natif existant ni verrou approuve n'a ete modifie.

Les douze fichiers source/metadonnees et le preparateur sont sauvegardes hors
checkout dans `Documents/Sauvegardes-Kalistar/2026-10-25-astraball-sprites/`.
Les copies des douze sources ont ete controlees par SHA-256. Les PNG restent
hors Git/LFS ; seuls code, prompts et empreintes runtime sont versionnes.

## Verification

- Suite `ci` complete : 103 invocations reussies. Deux cas optionnels restent
  ignores par leur configuration existante, comme avant cette livraison.
- Suite `local` complete : 14 invocations reussies, dont les controles PostgreSQL
  jetables de droits, progression, unicite, transferts et sauvegardes.
- Astraball : 86 tests de regles, IA, projection, publication et clips.
- Les 160 images sont presentes ; les quatre poses de course et de lancer
  sont distinctes pour chaque personnage, avec gouttieres transparentes.
- Chrome : 1440 x 900, 1920 x 1080, 412 x 915, 360 x 800, 915 x 412.
  Aucun debordement, erreur console ou ressource manquante sur ces controles.
- Deplacement, sauvegarde/reload, interception, but a deux points, victoire,
  charge avec recul/retard et isolation des profils factices verifies.
- Le parcours tactile Razr avec animations normales passe aussi a densite 2x.
- Au repos, zero redraw sur la fenetre mesuree de 800 ms, avec et sans
  Reduced Motion. Le test de mouvement observe les quatre frames et limite
  le nombre de dessins. Ces mesures locales ne garantissent pas les FPS de
  tous les appareils physiques.

La premiere passe de CI a signale deux assertions de version encore en 4.7.0.
Elles ont ete mises a jour et la suite complete a ete relancee avec succes.

Les validations completes et preuves de build fige sont conservees dans
`work/astraball/sprites-release/`. Publication du commit exact et de son tag
annote `v4.7.1` dans le seul projet personnel Cloudflare `kalistar`, apres
validation du build fige PC/phone. L'acces anonyme doit rester sur le login.
