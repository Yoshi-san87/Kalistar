# Reprendre Kalistar

Guide actif. L'historique date est conserve [separement](historique/README.md) ;
ne pas y chercher la liste courante des cartes ou des mecanismes.

## 1. Choisir le bon dossier

Travailler dans le depot personnel `Yoshi-san87/Kalistar`, jamais dans une copie
historique. Sur le poste de l'auteur, le depot est actuellement sous
`paquets-transfert/github-personnel-20260921/`. Les jonctions du dossier parent
dependent de cet emplacement : ne pas le deplacer ou renommer.

Sur un autre poste, utiliser un clone du meme depot, pas un nouveau Git ni un
depot professionnel. [Procedure de transfert](TRANSFERT_ET_GIT.md).

## 2. Lire les references du domaine

1. [Consignes racine](../AGENTS.md) et [consignes V4](../V4/AGENTS.md).
2. [Organisation](ORGANISATION.md) et [index des documents actifs](INDEX.md).
3. Regles pour une modification du jeu ; DA pour une illustration ;
   [architecture du site](../V4/site/README.md) pour une modification d'interface.

Une demande d'illustration ne permet pas de refaire le cadre ou les valeurs.
Une demande de rangement ne permet pas de changer le gameplay.
Signaler une divergence entre documentation et moteur au lieu de la masquer.

## 3. Identifier les sources officielles

| Sujet | Source |
| --- | --- |
| References approuvees et empreintes | `V4/atelier/data/references.json` |
| Creations publiees | `V4/donnees/catalogue.json` et `V4/creations/<model-id>/` |
| Catalogue reel | `V4/atelier/game-catalog.cjs` |
| Cadre natif Electro | `V4/template-stable/current.json` |
| Autres elements | `V4/template-stable/current-elements.json` |
| Centrage des icones | `V4/template-stable/icon-layouts.json` |
| Composants du generateur | `V4/atelier/designer-assets/manifest.json` |
| Regression native | `V4/atelier/data/regression.json` |
| Roman lu dans Book (route historique #story) | `V4/site/story-content.json` |
| Explications Library | `V4/docs/joueurs/`, compilees par `V4/site/rules-documents.cjs` |

Lire le profil courant et sa `nativeRevision`, pas le `set.json` d'un ancien lot.
Un nom de fichier, une date ou un prefixe d'identifiant ne prouve pas un statut
canonique. Modele, `characterId`, exemplaire `KC-...` et instance de partie
`K4-...` sont des identites distinctes.

## 4. Preserver les contrats

- Format natif : 897 x 1497. Illustration separee du cadre valide ; textes
  editables et composants en objets dynamiques.
- Direction artistique Momo/Valazar preservee ; validation technique et
  approbation artistique sont deux choses differentes.
- Ne jamais modifier les verrous, anciens rapports ou empreintes pour cacher
  une regression. Conserver les originaux de revision.
- Les sources V3 et le lecteur de codes-barres V1 restent des dependances.
- Les matchs conservent leurs snapshots et definitions versionnees. Ne jamais
  leur appliquer retroactivement le catalogue ou les nouveaux equipements.
- IndexedDB et localStorage sont personnels au navigateur. Tests en profils
  jetables uniquement ; pas de reset, import ou transfert sur le profil reel.
- Le serveur Atelier reste sur `127.0.0.1`, avec les protections existantes.
  Un seul rendu Photoshop de production a la fois.
- Respecter les octets proteges et la configuration Git LFS. Pas de
  normalisation generale des fins de ligne.
- Aucun acces au Drive professionnel. Pour le roman Book, utiliser les sources locales
  de l'auteur, garder les revelations reservees. Lanio est depose au village
  Rhinoz de Zarok, pres de ses amis de jeu, pas enterre.

## 5. Travailler et verifier

Ranger les nouveaux fichiers suivant [ORGANISATION.md](ORGANISATION.md).
Ne pas accumuler un journal de versions dans ce guide ou le README.
Une decision courante va dans le document du domaine ; les preuves vont dans
le lot date ou la livraison. Les essais vont dans `work/`.

Depuis la racine :

```sh
npm run check
npm run test:organisation
npm test
npm run build
```

Le [guide de validation](VALIDATION.md) distingue CI, navigateur et Atelier.
Verifier desktop, smartphone/Razr et reprise d'une sauvegarde lorsqu'un parcours
est touche. Ne pas annoncer un test sans l'avoir execute.

## 6. Publier le seul perimetre termine

L'auteur demande une publication apres chaque changement termine et valide,
uniquement sur son depot personnel. Verifier le remote et les publications
concurrentes ; incrementer la version depuis la derniere livraison, creer le tag
annote et pousser branche et tag ensemble. Ne pas embarquer un brouillon d'une
autre tache. Verifier Actions et les fichiers publics avant d'annoncer le site
a jour. [Procedure complete](../V4/deploy/README.md).

## Reprise rapide

```text
Travaille dans le depot personnel Kalistar actif. Lis AGENTS.md, V4/AGENTS.md,
docs/GUIDE_REPRISE.md et les references du domaine via docs/INDEX.md.
Preserve sources approuvees, chemins, donnees personnelles et gameplay.
Range les essais dans work/, les decisions dans les guides du domaine,
les preuves dans un lot date. Execute les controles adaptes et coordonne
la publication sur Yoshi-san87/Kalistar selon les consignes actuelles.
Ma demande : [decrire le changement].
```
