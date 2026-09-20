# Kalistar

## Commencer ici

La version courante est **V4** : collection, decks, arene et Atelier.
Ouvrir [Lancer-Atelier.cmd](V4/atelier/Lancer-Atelier.cmd) sur le poste actuellement
configure. Le service local ouvre le jeu sur `http://127.0.0.1:4304/jeu/`
(ou un port libre voisin si necessaire).

Les cartes approuvees sont recensees dans
`V4/atelier/data/references.json`. Ne pas choisir une carte seulement parce
qu'elle est la derniere dans l'ordre alphabetique d'un dossier historique.

## Organisation

| Dossier | Contenu |
| --- | --- |
| `V4/` | Version active : site, cartes, PSD, templates, Atelier et preuves |
| `V3/` | Version precedente et ressources encore partagees avec V4 |
| `V1/`, `V2/` | Historique ; V1 contient aussi le lecteur de codes-barres utilise par V4 |
| `main/` | Documents, classeurs et references d'origine de l'univers |
| `Templates/` | Premiers templates Photoshop, conserves comme sources |
| `maintenance/` | Audits, journaux de nettoyage et anciens scripts de maintenance |
| `docs/` | Guide de reprise, transfert entre postes et preparation du futur depot personnel |

Les dossiers historiques restent a leur emplacement pour ne pas casser les
dependances. Leurs scripts de migration ne doivent pas etre relances pour
fabriquer les cartes actuelles.

## Guides

- [Guide de reprise pour un autre Codex](docs/GUIDE_REPRISE.md)
- [Identite visuelle et consignes de generation](V4/docs/IDENTITE_VISUELLE.md)
- [Regles du jeu V4 et statistiques](V4/docs/REGLES_JEU.md)
- [Version V4 et fichiers actifs](V4/README.md)
- [Direction artistique](V4/DIRECTION_ARTISTIQUE.md)
- [Atelier et controles](V4/atelier/README.md)
- [Transfert via Drive et nouveau Git](docs/TRANSFERT_ET_GIT.md)
- [Nettoyage du 19 septembre 2026](maintenance/cleanup-2026-09-19/RAPPORT.md)

## Git

Depot personnel : https://github.com/Yoshi-san87/Kalistar

La branche principale est `main`. Les sources graphiques, les PDF et les archives
sont suivis avec Git LFS ; installer Git LFS avant de cloner le projet :

```sh
git lfs install
git clone https://github.com/Yoshi-san87/Kalistar.git
cd Kalistar
git lfs pull
```

`.gitattributes` preserve les octets des sources, sans normalisation des fins
de ligne. `.gitignore` exclut les donnees locales temporaires et les brouillons.
L'archive privee de transfert `Kalistar.zip` n'est pas publiee dans le depot.
Les collections et decks du navigateur restent a exporter separement.
