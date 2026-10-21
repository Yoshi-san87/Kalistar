# Arenes - 21 octobre 2026

## Perimetre

Huit ajouts, sans remplacer les 28 lieux precedents ni les cartes publiees.
Le moteur de combat, les profils, les proprietes de collection et les schemas
Supabase restent inchanges. Les etapes Fragment existantes gardent leurs lieux.

| Lieu | Affinite elementaire | Affinites de personnage |
| --- | --- | --- |
| Alexandrie (FF IX) | Lumiere | Grenat, Steiner, Beate, Branet |
| Kaer Morhen (The Witcher) | Roche | Geralt, Vesemir, Ciri |
| Les toits de Gotham (Batman) | Tenebres | Batman, Catwoman, Robin |
| Commissariat de Raccoon City (RE 2) | Aucune | Leon, Claire, Ada, Tyrant T-103 |
| Place de Leene (Chrono Trigger) | Electricite | Crono, Marle, Lucca |
| Water Seven (One Piece) | Eau | Franky, Usopp, Nico Robin, Nami |
| Le refuge de Grivka (Kalistar) | Glace | Vaelrik, Neriska, Skaern |
| Le bastion de Froz (Kalistar) | Sang | Vaerok, General Barok, Drogan |

Les lieux Kalistar sont des decors de jeu proposes dans les regions deja
definies, pas des revelations ajoutees au manuscrit. Pour Froz, le choix Sang
ne transforme pas tous ses membres en porteurs de ce Kalistel. Le climat
neigeux et l'affinite tactique sont distincts.

## Regles

- Cristal correspondant : +15 ATK, y compris pour un invite d'un autre univers.
- Personnage lie au lieu : +10 ATK / +10 DEF pour toutes ses versions.
- Les deux se cumulent : maximum +25 ATK / +10 DEF. Aucun bonus de groupe entier.
- Memes conditions pour les deux camps ; aucun avantage cache selon le siege.
- Scores numeriques uniquement. Aucun changement des faces speciales.
- Sans cristal : jamais de bonus elementaire ; un bonus de domicile reste possible.
- L'arene ne change plus apres le lancement. Les snapshots historiques conservent
  leurs propres definitions, y compris pour une reprise Fragment.
- Raccoon City ne donne aucun bonus elementaire, mais conserve les domiciles listes.

## Sources et integration

`arenas.json` est le manifeste fige du lot, pas un second catalogue actif.
Les six collaborations vont dans `../../donnees/arenes-collaborations.json`,
les deux lieux natifs dans `../../donnees/arenes-kalistar.json`.
`../../atelier/arena-catalog.cjs` applique les memes validations aux deux sources.
Les lieux natifs apparaissent lorsqu'au moins un de leurs personnages natifs
est publie. Les collaborations suivent l'univers d'une version publiee.
Le menu, le choix aleatoire et le build utilisent le catalogue commun.

`before.json` conserve la reference avant ajout pour l'audit de cette livraison.
Ce n'est pas un verrou sur les futures editions autorisees des personnages.
`integration.test.cjs` couvre disponibilite, validation des sources et medias.
`arena-balance.test.cjs` et `simulation.cjs` couvrent le moteur et les sauvegardes.
`arenas.browser.test.cjs` controle les huit choix sur PC/Razr et leurs reprises.

## Illustrations

Generation par l'outil integre image_gen ; prompts complets, sources officielles
de contexte et chemins generes dans [provenance.json](provenance.json).
References picturales : Momo V3 et Cosmo Canyon Kalistar ; pas de copie de capture
du jeu d'origine. Adaptations privees non officielles pour les collaborations.
Grivka et Froz suivent [les peuples et regions](../../docs/PEUPLES_ET_REGIONS.md).

Originals PNG 1672 x 941 dans `sources/`, WebP qualite 86 au chemin runtime
du manifeste. Conversion reproductible : `node prepare-media.cjs`.
[media.json](media.json) conserve dimensions, tailles et SHA-256.
Environ 3,6 Mo pour les huit WebP ; aucun PNG original envoye au site.
Les fonds reutilisent le moteur d'ambiance borne, sans nouvelle boucle d'animation.
Sauvegarde des huit sources, WebP et manifestes hors checkout :
`C:/Users/guill/Documents/Sauvegardes-Kalistar/2026-10-21-arenes`,
empreintes verifiees. Les binaires ne sont pas ajoutes a Git.

## Livraison 4.6.107

Validation avant publication :

- Suite CI complete : 100 groupes termines sans echec.
- Suite locale avec sources natives et PostgreSQL isole : 13 groupes sans echec.
- Tests du lot : 47 controles moteur stricts et 4 controles d'integration.
- Simulation : 1 280 matchs, 222 561 restaurations et 47 748 verifications de
  formule. [Methodologie, resultats et limites](RAPPORT-TESTS.md).
- Navigateur : huit lieux sur PC 1440 x 1000 et Razr 412 x 1007 ; 32 captures
  preparation/combat, images verifiees par SHA-256, bonus affiches, dix cartes
  actives, aucun debordement, reprise du meme match et aucune erreur JavaScript.
- [Comparaison avant/apres](compatibility.json) : 462 modeles inchanges,
  28 anciens lieux inchanges, 36 lieux au total, empreinte Fragment identique.

Les preuves volumineuses et captures restent dans `work/qa/arenas-20261021/` ;
les logs complets sont `work/arenas-46107-ci.log` et `work/arenas-46107-local.log`.
Les memes tests navigateur sont rejoues sur la copie figee du commit avant
l'envoi Cloudflare. Canal personnel : `https://kalistar.pages.dev/jeu/`.
Tag de livraison : `v4.6.107`. Aucun changement de secret, compte, schema ou forfait.
