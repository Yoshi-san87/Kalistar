# Kalistar V4

## Reprendre le projet

- [Guide central de reprise](../docs/GUIDE_REPRISE.md) : priorites, architecture,
  preferences UX, securite, controles et message pour un autre Codex.
- [Identite visuelle](docs/IDENTITE_VISUELLE.md) : references, generation,
  contraintes du cadre et intentions de personnages.
- [Regles du jeu](docs/REGLES_JEU.md) : decks, buffs, scores, statistiques et
  differences entre intention utilisateur et implementation actuelle.

## Version active

La V4 contient le jeu, la collection, la construction de decks et l'Atelier.
Le registre approuve comporte **27 cartes au nettoyage du 19 septembre 2026**,
Voloden inclus. Le nombre et les chemins de reference font autorite dans
`atelier/data/references.json`, pas dans les rapports historiques.

- Jeu : ouvrir [Lancer-Atelier.cmd](atelier/Lancer-Atelier.cmd), puis Collection,
  Decks, Arene ou Atelier.
- Consultation des exports : [galerie-elements.html](galerie-elements.html).
- Direction artistique : [DIRECTION_ARTISTIQUE.md](DIRECTION_ARTISTIQUE.md).
- Production et securite locale : [Atelier](atelier/README.md).

## Ou trouver les fichiers

| Dossier / fichier | Usage |
| --- | --- |
| `cartes/` | PNG des cartes ; certains essais historiques restent presentes |
| `templates/` | Les 27 PSD courants, textes natifs et objets dynamiques |
| `template-stable/` | Maitres, profils par carte, registres et calibrages |
| `assets/` | Illustrations et composants sources |
| `site/` | Jeu V4, collection et decks |
| `atelier/` | Serveur local et generateur de cartes |
| `atelier/designer-assets/` | Composants controles de l'apercu interactif |
| `donnees/catalogue.json` | Catalogue publie pour le site |
| `creations/` | Creations Atelier publiees, si presentes |
| `revisions/` | Preuves, originaux de retour arriere et migrations terminees |
| `propositions/` | Explorations artistiques conservees |

Les anciens essais dans `master/`, `momo-bottom/`, `references/` et les rapports
de production restent des sources historiques. Ne pas relancer leurs migrations
pour fabriquer une carte courante.

## Production courante

Le format reste **897 x 1497 pixels**. Le cadre n'est jamais regenere pour creer
un personnage. Les illustrations restent independantes des textes, valeurs,
positions, icones et effets natifs.

- Electro : `template-stable/current.json`, maitre 03F.
- Autres elements : `template-stable/current-elements.json`, maitre 04 corrige.
- Calibrage des medaillons : `template-stable/icon-layouts.json`.
- Voloden : `template-stable/voloden/card.json` et sa revision documentee.
- Verrou complet des fichiers et cartes approuves : `atelier/data/references.json`.

Les instructions de production sont dans [AGENTS.md](AGENTS.md).
V4 utilise encore des ressources V3 et le lecteur de codes-barres de V1 :
ne pas deplacer ces dossiers independamment du projet.

## Historique et entretien

L'ancien README accumulant les essais Momo et les migrations precedentes est
conserve, octet pour octet, dans
[l'historique documentaire](docs/HISTORIQUE_AVANT_2026-09-19.md).
Ses liens relatifs s'entendent depuis le dossier V4 d'origine ; certaines
anciennes sorties avaient deja ete retirees lors des nettoyages anterieurs.

Le nettoyage courant retire seulement des copies temporaires identiques a des
fichiers conserves. Les originaux des revisions et les empreintes approuvees
restent intacts. [Rapport et journal](../maintenance/cleanup-2026-09-19/RAPPORT.md).

Pour l'autre PC : [transfert prive via Drive et nouveau Git](../docs/TRANSFERT_ET_GIT.md).
