# Electro 03 - Positions communes et Jelly-Joe 02

## Livrables

| Carte | PSD editable dans V4/templates | PNG dans V4/cartes |
| --- | --- | --- |
| Momo | MOMO_V4_11_POSITIONS.psd | MOMO_V4_11_POSITIONS.png |
| Taulio | TAULIO_V4_02_POSITIONS.psd | TAULIO_V4_02_POSITIONS.png |
| Jelly-Joe | JELLY_JOE_V4_02_VISAGE_POSITIONS.psd | JELLY_JOE_V4_02_VISAGE_POSITIONS.png |

Maitre : `../KALISTAR_V4_TEMPLATE_03_ELECTRO.psd`. Registre : `../registry-electro-03.json`. Dimensions inchangees : 897 x 1497 pixels, 300 ppp, sRGB. Les trois profils sont dans les sous-dossiers `momo`, `taulio` et `jelly-joe`.

## Positions

Les supports d'origine sont conserves, incorpores en objets dynamiques et agrandis de 12%. Les chiffres restent des textes Myriad Pro Regular natifs a 7,84 pt. Leur centrage tient compte des glyphes. Cinq emplacements fixes, de gauche a droite, pas de 58 px ; le code-barres et le bandeau de version restent degages.

Ombre du support : multiplication, 65%, distance 3 px, flou 4 px. Ombre du chiffre : 50%, distance et flou 1 px. Ce sont des styles Photoshop editables, pas des ombres peintes dans l'illustration. La geometrie est dans `positionLayout` du registre, utilisee par le moteur commun `registered.jsx`.

## Illustration

`../../assets/illustrations/32_ELECTRO_JELLY_JOE_V4_02.png` : visage humain expressif et opaque, cheveux et barbe en filaments de meduse, ombrelle comme couvre-chef, silhouette plus fine, manteau noir, ivresse joyeuse et chope en verre. La taverne evoque l'identite maritime de Crabazar par son bois use, ses cordages et ses touches bleu/laiton. Il s'agit d'une interpretation visuelle, pas d'une nouvelle scene canonique.

Image editee avec l'outil image_gen integre, depuis la proposition 01 et les references Momo/Valazar. Prompt exact : `../../donnees/prompt-jelly-joe-v4-02.txt`. `assets.json` contient provenance et empreintes. Le PNG genere est conserve integralement ; seule sa mise a l'echelle dans l'objet dynamique l'adapte a la fenetre de carte. Aucune regeneration du cadre.

## Verification et reproduction

1. `../../scripts/stable/prepare-revision-03.cjs` prepare les profils et protege les empreintes des sources.
2. `revise-electro-03.jsx`, dans Photoshop, construit le maitre, les trois cartes et les rendus de controle.
3. `verify-revision-03.cjs` compare les pixels hors des zones autorisees, le cadre sans illustration/badges, les PSD reouverts, les chiffres natifs, les effets et les donnees V3. Il exporte les PNG sRGB et les apercus.
4. `verify-barcode.py --card V4/template-stable/revision-03/<personnage>/card.json` decode chaque rendu final.

Rapport commun : `verification.json`. Rapports de lecture des identifiants dans chaque sous-dossier. Apercus : `family-comparison.png`, `badges-before-after.png` (ancien a gauche, nouveau a droite), `five-positions-preview.png` et les apercus propres aux personnages.

Comparaisons effectuees dans la meme version de Photoshop afin de ne pas confondre une difference de moteur avec une retouche. Les anciens PSD/PNG, V3, site, BDD, mecaniques et illustrations de Momo/Taulio restent intacts. Cette proposition attend l'approbation artistique utilisateur et ne constitue pas un BAT imprimeur.
