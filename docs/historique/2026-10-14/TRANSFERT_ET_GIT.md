# Transfert vers un autre PC et nouveau depot

## Methode recommandee

1. Dans le jeu, exporter la collection depuis **Archives et sauvegardes**.
   Exporter aussi les decks depuis leur interface et conserver les fichiers
   dans un emplacement personnel. Les preferences du navigateur ne sont pas
   automatiquement transportees par le dossier Kalistar.
2. Terminer toute composition et enregistrer les documents Photoshop ouverts.
3. Creer une archive ZIP du dossier Kalistar complet, sans aucun dossier `.git`.
   Conserver l'arborescence, y compris V1, V2, V3, les sources et les preuves.
   Un ZIP n'applique pas `.gitignore` : c'est utile pour une migration complete
   incluant les brouillons et imports locaux. Ne pas publier ce ZIP publiquement.
4. Deposer le ZIP dans un Drive personnel, attendre la fin de la synchronisation,
   puis le telecharger et le decompresser sur l'autre PC, hors d'un depot du travail.
5. Sur l'autre PC uniquement, creer le nouveau depot personnel, de preference
   prive. Choisir le stockage des gros fichiers avant le premier commit.
6. Avant tout push, verifier le compte connecte et `git remote -v` : l'URL doit
   etre exactement celle du nouveau depot personnel. Ne pas reutiliser un remote
   existant ni executer de push si la destination est incertaine.

Drive sert ici au transport d'une archive, pas a synchroniser un depot Git actif
entre deux ordinateurs. Ne pas partager en continu un meme dossier `.git` via Drive.

## Fichiers volumineux

Les PSD, certaines images et les sauvegardes graphiques rendent le projet lourd.
Avant le premier commit, decider entre Git LFS (selon les capacites du futur
hebergeur) et un stockage separe des sources lourdes avec restauration controlee.
Ne pas supprimer ou ignorer tous les PSD pour gagner de la place : plusieurs
font partie du verrou et sont indispensables a l'Atelier.

Les regles `.gitattributes` conservent les octets exacts. Une normalisation
automatique des fins de ligne casserait les SHA-256 des scripts et JSON proteges.
Aucun filtre LFS, hebergeur, compte, remote ou authentification n'est configure ici.

## Ce que contient le dossier

Les cartes approuvees, leurs PSD, les composants, profils, illustrations, sources,
scripts, preuves et donnees de catalogue sont dans Kalistar. Les creations
publiees sont dans `V4/creations/` lorsqu'il y en a.

`.gitignore` exclut les travaux temporaires, les logs, les verrous, les imports
locaux et les brouillons Atelier. Ils ne sont pas supprimes du poste. Pour
reprendre exactement ces brouillons ailleurs, conserver le ZIP complet prive.
Le verrou `V4/atelier/data/references.json` et le dernier controle
`V4/atelier/data/regression.json` restent des fichiers de projet.

Les proprietaires, transferts et parties se trouvent dans l'IndexedDB du
navigateur, pas dans ce dossier. Les bibliotheques de decks et preferences
utilisent aussi le stockage du navigateur. Une copie de Kalistar seule ne les
emporte donc pas. Conserver les exports a part et utiliser les fonctions d'import
du jeu sur le nouveau poste, sans ecraser une collection existante par accident.

## Executer l'Atelier sur l'autre PC

Recuperer les fichiers et les pousser dans Git n'exige pas Photoshop. En revanche,
executer le generateur natif demande une configuration de poste distincte :

- Windows et Photoshop compatible avec le pont COM actuel.
- Node.js, Sharp, Python, Pillow et le lecteur zxing-cpp compatibles.
- Les polices utilisees dans les PSD, installees et controlees dans Photoshop.
- Adapter les chemins d'executables et bibliotheques : `V4/atelier/lib.cjs`
  contient actuellement des chemins absolus sous `C:/Users/guill/.cache/`,
  et `start.ps1` recherche le runtime Codex dans le profil utilisateur.
- `V4/atelier/barcode.py` utilise encore `V1/scripts/vendor/` : ne pas enlever V1.
- Refaire la verification native des references apres adaptation du moteur.
  Ne jamais recreer artificiellement le verrou pour contourner un echec.

Le rangement du 19 septembre n'a pas modifie ces chemins ni reconfigure le moteur.
Le projet reste fonctionnel ici ; ce n'est pas encore un installateur autonome.
