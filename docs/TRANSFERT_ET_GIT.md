# Cloner et changer de poste

Le depot personnel existe deja :
[Yoshi-san87/Kalistar](https://github.com/Yoshi-san87/Kalistar).
Ne pas creer un autre Git ni reprendre un depot professionnel.

## Depot source

Installer Git et Node.js 24+, puis :

```sh
git clone https://github.com/Yoshi-san87/Kalistar.git
cd Kalistar
npm run check
```

Le depot est leger : code, profils et registres, pas les images ni les PSD.
Pour jouer, utiliser Cloudflare. Pour produire ou construire sur un nouveau PC,
restaurer aussi les medias depuis la sauvegarde personnelle, aux memes chemins.
Le clone seul ne constitue pas une sauvegarde graphique et un `git lfs pull`
ne remplace pas cette restauration. Ne pas ecraser le code recent en recopiant
une ancienne sauvegarde complete sur un clone deja initialise.

La sauvegarde du 15 octobre conserve les fichiers, un bundle Git complet et
les 14 465 objets LFS historiques verifies. Son chemin prive et ses manifestes
restent sur le PC dans Documents/Sauvegardes-Kalistar. Une copie sur le meme
disque protege les operations de migration, pas contre la panne du disque.

Les anciens attributs LFS restent preserves pour relire l'archive historique.
Ne pas republier ses anciens tags/branches dans le depot allege.
Ne pas modifier les attributs ou normaliser les fins de ligne pour contourner
un controle d'empreintes.

## Donnees du joueur

Avant une migration, exporter la collection, les decks et les parties depuis
le jeu. IndexedDB, localStorage, preferences et possessions ne font pas partie
du clone. L'origine localhost, Cloudflare et GitHub Pages a chacune son stockage.
Importer par les outils du jeu sur le nouveau poste ; ne pas tester un transfert
destructif sur le profil personnel.

Les brouillons Atelier et Story, imports, travaux `work/` et sauvegardes privees
sont hors Git. Leur preservation demande une sauvegarde privee distincte,
pas un ajout force au depot public. Aucun acces au Drive professionnel.

## Poste de production

Jouer et construire le site ne demande pas de Photoshop.
La composition native demande Windows, Photoshop, les polices et les runtimes
decrits dans l'[Atelier](../V4/atelier/README.md). Les chemins propres au poste
peuvent necessiter une adaptation. V1/V3 restent des dependances.

Sur le PC de l'auteur, ne pas deplacer
`paquets-transfert/github-personnel-20260921/` : les anciennes adresses utilisent
des jonctions. Un clone sur un autre PC est independant de ces jonctions.

## Publication

Avant tout push, verifier le remote personnel, les autres publications,
le diff stage et les validations. La procedure version/tag/hebergeurs est dans
[le guide de publication](../V4/deploy/README.md). Les anciennes instructions
de creation d'un futur depot restent dans
[l'historique documentaire](historique/README.md), pas dans la procedure actuelle.
