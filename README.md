# Kalistar

Jeu de cartes, univers et production graphique. La version active est **V4**.

[Jouer sur Cloudflare](https://kalistar.pages.dev/jeu/)

## Commencer ici

- **Jouer en local** : [Lancer-Kalistar.cmd](Lancer-Kalistar.cmd).
- **Se reperer dans le projet** : [index des guides](docs/INDEX.md).
- **Developper ou reprendre le travail** : [guide de reprise](docs/GUIDE_REPRISE.md).
- **Creer une carte** : [production V4](V4/README.md).
- **Comprendre les regles** : [regles actuelles](V4/docs/REGLES_JEU.md).
- **Tester et publier** : [validation](docs/VALIDATION.md), puis [publication](V4/deploy/README.md).

## Les trois espaces

| Espace | Ou chercher |
| --- | --- |
| Jeu actif | `V4/site/`, `V4/donnees/`, `V4/deploy/` |
| Production des cartes et de l'univers | `V4/atelier/`, `V4/template-stable/`, `V4/creations/`, `V4/map/` |
| Historique et preuves | Lots dates dans `V4/expansions/`, `V4/revisions/`, `V4/releases/`; anciennes versions `V1/`, `V2/`, `V3/` |

Les lots peuvent encore contenir des sources actives : **historique ne veut pas
dire supprimable**. Le [plan d'organisation](docs/ORGANISATION.md) indique les
responsabilites et les destinations des nouveaux fichiers.

## Commandes communes

Avec Node.js 24 ou plus recent, depuis ce depot :

```sh
npm run check
npm run test:organisation
npm test
npm run build
```

Ces commandes n'installent aucune dependance et ne changent ni les cartes ni les
sauvegardes. Certains tests existants demandent les bibliotheques du poste ;
leurs prerequis sont dans le [guide de validation](docs/VALIDATION.md).

## Ce qui fait reference

- Cartes approuvees : `V4/atelier/data/references.json`.
- Creations publiees : `V4/donnees/catalogue.json`, puis leurs sorties dans `V4/creations/<model-id>/`.
- Catalogue jouable : `V4/atelier/game-catalog.cjs`, construit depuis ces registres.
- Regles, DA et contrats : documents actifs indexes dans [docs/INDEX.md](docs/INDEX.md).

La date ou le nom d'un PNG ne determinent jamais sa publication.
La version visible vient de `V4/site/index.html` et `V4/site/v4.css` ;
les tags `vX.Y.Z` identifient les livraisons. Ne pas recopier de compte de cartes
historique dans le code.

## Depot et donnees personnelles

Depot personnel : [Yoshi-san87/Kalistar](https://github.com/Yoshi-san87/Kalistar).
Le depot conserve le code et les registres. Les medias lourds restent sur le PC
de production et le jeu est publie directement sur Cloudflare ; voir
[clonage et transfert](docs/TRANSFERT_ET_GIT.md).

Collection, decks, preferences et parties sont dans le navigateur, pas dans Git.
Les travaux temporaires vont dans [work/](work/README.md), exclus de Git.
Les anciennes notes d'entree sont preservees dans
[l'historique documentaire](docs/historique/README.md).
