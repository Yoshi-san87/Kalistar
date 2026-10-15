# Organisation du depot

Le projet conserve ses chemins pour ne pas casser le jeu, les scripts natifs
ou les jonctions locales. Le rangement se fait par responsabilite, avec des
entrees courtes et une politique verifiee automatiquement.

## Jeu actif

| Dossier | Responsabilite |
| --- | --- |
| `V4/site/` | Interface, moteur, regles executable et medias web |
| `V4/donnees/` | Registre de publications |
| `V4/deploy/` | Build statique et verification des hebergeurs |
| `V4/atelier/` | Serveur local, catalogue, generateur et verrous |

Le serveur et le build utilisent les memes registres. Les saves du navigateur
ne vont dans aucun de ces dossiers.

## Production graphique et univers

| Dossier | Responsabilite |
| --- | --- |
| `V4/template-stable/` | Maitres valides, profils, calibrage |
| `V4/cartes/`, `V4/templates/` | Exports canoniques aux chemins du verrou |
| [creations/](../V4/creations/README.md) | Sorties courantes par model-id |
| `V4/assets/`, `V4/Illustrations/` | Sources graphiques existantes |
| `V4/map/`, `V4/weapon-cards/` | Sources et provenance du monde et des equipements |
| [scripts/](../V4/scripts/README.md) | Composition native ; distinguer stable et historique |

Ne pas choisir la derniere image d'un dossier pour determiner la carte active.
Le verrou et le registre donnent les sorties faisant reference.

## Lots, recherches et preuves

| Dossier | Ce qu'il contient |
| --- | --- |
| [expansions/](../V4/expansions/README.md) | Ajout d'un ensemble de cartes |
| [revisions/](../V4/revisions/README.md) | Modification ciblee et originaux preserves |
| `V4/collaborations/` | Lots de collaborations existants |
| [propositions/](../V4/propositions/README.md) | Recherches artistiques et selections |
| [releases/](../V4/releases/README.md) | Livraison, commandes executees et preuves utiles |
| `V4/audits/`, `V4/verification/` | Anciennes preuves conservees |

**Ces dossiers ne sont pas tous des archives inactives.** Certains profils,
scripts et illustrations y sont encore references. Aucun deplacement ou retrait
sans analyse des dependances et validation des empreintes.

`V1/`, `V2/`, `V3/`, `main/`, `Templates/` et les anciens essais natifs sont
preserves. V1/V3 fournissent encore des ressources au jeu et au generateur.

## Nouveau travail : une seule destination

- Code du jeu : module du domaine dans `V4/site/`, test a cote. Garder les
  responsabilites et proprietaires CSS existants ; pas de correctifs repetes
  ajoutes au hasard a la fin de plusieurs feuilles.
- Creation : `V4/creations/<model-id>/`, avec identifiants stables.
- Ajout ou revision : un lot `YYYY-MM-DD-sujet-en-kebab-case`, un README,
  sources/provenance et tests. Eviter plusieurs lots pour la meme operation.
- Decision actuelle : document du domaine indexe dans [INDEX.md](INDEX.md).
- Livraison : `V4/releases/YYYY-MM-DD-vX.Y.Z/`, README et preuves selectionnees.
- Essai, sortie repetee, capture intermediaire ou staging :
  [work/](../work/README.md), par exemple `work/qa/<sujet>/`.
- Donnees joueur et sauvegardes privees : hors Git. Les brouillons Story et
  l'etat runtime de l'Atelier gardent leurs exclusions actuelles.

Chaque nouvelle preuve publiee doit servir a reproduire ou constater un resultat.
Ne pas committer chaque tentative ou copier des dossiers complets de build.
Ne pas regrouper les PSD sous une nouvelle adresse simplement pour embellir
l'arborescence : leur emplacement fait partie des contrats.

## Controle anti-desordre

[maintenance/organisation.json](../maintenance/organisation.json) classe chaque
zone racine/V4 et declare les guides actifs, fichiers essentiels et espaces
locaux. C'est le plan verifie, pas un second catalogue de cartes.

`npm run check` controle les chemins suivis ou stages par Git, les entrees
documentaires et leurs liens, et l'affectation des tests directs.
Un nouveau dossier racine/V4 doit etre justifie dans ce plan.
Un nouveau test doit rejoindre la suite CI ou locale ; dans les repertoires
directs du site, de l'Atelier ou du deploy, le suffixe `.browser.test.cjs`
l'affecte automatiquement a la suite navigateur.

Depuis la publication directe Cloudflare, le runner GitHub ne telecharge plus
aucun media. Le controle refuse aussi le retour d'un binaire dans l'index Git.
Les fichiers graphiques restent aux memes chemins locaux, sauvegardes a part ;
les verrous et leur contenu ne changent pas. Le registre web
`V4/deploy/runtime-media.json` fixe leurs empreintes de publication.
Les commandes CI sont centralisees dans
[validation-suites.json](../maintenance/validation-suites.json).
Un controle refuse un changement non classe ; il ne supprime rien et ne modifie
aucune reference. Les anciens journaux de preuve et tests de lots sont
identifies par leurs chemins exacts dans un constat date ; cette conservation
n'autorise pas a ajouter de nouveaux temporaires ou tests non classes.

## Avant de terminer

1. Classer le travail et actualiser le document courant du domaine.
2. Ajouter seulement les fichiers du perimetre termine a l'index.
3. Relancer `npm run check` apres ce staging, puis les tests concernes.
4. Examiner le diff stage ; aucune sortie `work/`, sauvegarde personnelle ou
   modification d'une autre tache.
5. Publier avec version, tag et preuves verifiees selon les consignes.
