# Kalistar V4

Version active du jeu et de la production graphique.
[Guide central](../docs/GUIDE_REPRISE.md) |
[Organisation](../docs/ORGANISATION.md) |
[Regles](docs/REGLES_JEU.md)

## Jeu et outils

- [Lancer le jeu local](../Lancer-Kalistar.cmd) : `/jeu/` via le serveur Atelier.
- [Architecture du site](site/README.md) : modules, media, sauvegardes et interface.
- [Atelier natif](atelier/README.md) : production locale et composants valides.
- [Site public](deploy/README.md) : build jouable, sans Atelier ni PSD.

Le nombre de cartes se deduit des registres courants. Les comptes de cartes
dans les anciens rapports decrivent leur livraison, pas la collection actuelle.

## Sources de production

| Source | Autorite |
| --- | --- |
| `atelier/data/references.json` | Cartes approuvees, chemins et empreintes |
| `donnees/catalogue.json` | Publications creees |
| `creations/<model-id>/` | Sorties courantes publiees |
| `template-stable/current.json` | Route Electro, maitre 03F |
| `template-stable/current-elements.json` | Routes multi-element, maitre 04 |
| `template-stable/icon-layouts.json` | Geometrie et centrage optique |
| `atelier/designer-assets/manifest.json` | Composants controles |
| `site/assets/base-weapons/` | Glyphes blancs actuels pour les nouvelles cartes |

Le format natif reste **897 x 1497**. Ne pas regenerer le cadre pour produire une
illustration. Textes natifs editables, effets separes, objets dynamiques incorpores.
Les revisions et le profil courant determinent la source effective d'une carte ;
l'ancien lot de preparation n'est pas une sortie active implicite.

Lire [AGENTS.md](AGENTS.md), [DA](DIRECTION_ARTISTIQUE.md) et
[identite visuelle](docs/IDENTITE_VISUELLE.md).
Verifier pixels du cadre, chiffres, alpha/centrage, code-barres et PSD reouvert.
Ne jamais refaire un verrou pour cacher une difference.

## Ou ranger

- [Creations](creations/README.md) : sorties par ID.
- [Expansions](expansions/README.md) : lots d'ajout.
- [Revisions](revisions/README.md) : changements et originaux.
- [Propositions](propositions/README.md) : explorations.
- [Livraisons](releases/README.md) : preuves selectionnees et publication.
- [Scripts](scripts/README.md) : route stable vs experimentations.
- [work/](../work/README.md) : essais et captures intermediaires, hors Git.

Les chemins existants sont conserves. Certains dossiers dates fournissent encore
des ressources actives ; aucune suppression generale des "archives".
V1/V3 restent des dependances partagees.

## Verifier

[Commandes centralisees](../docs/VALIDATION.md) et
[controle d'organisation](../maintenance/README.md).
Les notes et anciennes listes de versions de ce README sont conservees dans
[l'historique documentaire](../docs/historique/README.md).
