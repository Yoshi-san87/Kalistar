# Royal Training: publication et reprise

Ces modules sont separes des preparations natives capturees. Ils ne modifient
ni les anciens scripts, ni les sources V3, ni les medias/router du site public.
Lancer depuis la racine Kalistar avec le Node du poste.

## Ordre

1. Einstein termine les sept revisions et les neuf cartes, leurs verifications
   natives et la selection artistique. Les profils B definitifs doivent etre
   assembles dans set.json avant preparation.
2. Einstein seul lance `node V4/expansions/2026-09-24-royal-training/regression.cjs --native-authorized`.
   Cela rend les 38 references via renderRegistered, dont six copies revisees.
   Le registre actif n'est jamais remplace pour ce test. Le correctif natif
   MINERO existant est conserve, sans modifier le moteur partage.
3. Si Photoshop a termine les 38 sorties mais la verification a ete interrompue,
   `regression.cjs --verify-only` reverifie les sorties sans relancer Photoshop.
   Une tentative incomplete reste conservee; pas de reprise par ecrasement.
4. `node V4/expansions/2026-09-24-royal-training/publish.cjs` est un preflight
   strictement en lecture seule. Il requiert l'absence de render.lock.
5. Apres revue et feu vert final du parent seulement, ajouter `--publish`.
   Aucune publication de production n'a ete lancee pendant le developpement.

## Contrat

- 89 cartes, 38 references, 51 creations et 23 arenes. Les neuf ajouts sont des
  editions distinctes. Les sept profils existants gardent toute leur identite
  et leur gameplay; seuls les crops autorises Kaine/Skully deviennent 1.12.
- 80 cibles exactes derivees des snapshots et du lot, pas de regex generale
  donnant acces a toutes les creations. V3 et V4/site sont exclus.
- Le verrou enfant conserve les anciennes protections, sauf les PSD/PNG des
  six references revisees et le profil crop de Skully explicitement autorises.
  Les anciens octets sont archives dans chaque transaction, preuves comprises.
- Solaria: RGB et alpha hors zone controles pixel par pixel; packed 109x168
  sans mise a l'echelle, raw 126x224. La source V3 doit rester byte-identique.
- Les preuves de regression sont sous evidence/native-regression, avec chemins
  relatifs au projet, hashes des sources, PNG/reouverture/native pour chaque
  reference. Le rapport lie le verrou parent et les candidats, sans cycle de
  hash avec le futur verrou enfant. Ne pas modifier les modules de regression
  apres le demarrage d'une tentative: leurs hashes sont captures.
- Les anciennes creations et leur inventaire restent identiques hors Kaine.
  Pas de filtrage silencieux de doublon pour obtenir le nombre attendu.

## Journal et copie ciblee

`publication/<UUID>/journal.json` expose `files[].to` en chemins relatifs racine.
Chaque ligne a hash, beforeHash et backup. Le plan immuable voisin contient
les sources observees apres installation et la synthese du lot. Il est lie
au journal par SHA256. Les sauvegardes sont byte-identiques, pas reserialisees.

Le parent peut utiliser ces seuls chemins pour la copie de fichiers actifs au
clone, avec les sources et preuves suivies du lot. Ne pas synchroniser tout le
site: une autre tache UI y travaille. Ne pas copier le PSD scratch de regression
comme media de production. Conserver les sauvegardes jusqu'a validation finale.

## Echec et recuperation

Pendant applying, une erreur tente le rollback compare-and-swap. Un fichier
tiers provoque un refus, jamais son ecrasement. Pour reprendre manuellement:

Les repertoires manquants sont d'abord prepares dans la transaction puis
installes par renommage. Le journal garde leur identite filesystem. Le rollback
retire seulement ces repertoires, encore proprietes de la transaction et vides;
les repertoires preexistants ou contenant un fichier tiers sont conserves.

`publish.cjs --rollback UUID SHA256_DU_JOURNAL`

Seul un journal applying est accepte. Un journal staging n'a rien installe:
conserver et examiner sa preparation; il bloque une nouvelle publication jusqu'a
un archivage explicite. Aucun nettoyage automatique des tentatives en echec.

Si le journal est committed mais published.json manque:

`publish.cjs --recover UUID`

Cette commande est en lecture seule et fournit journalHash. Apres verification:

`publish.cjs --recover UUID --finalize journalHash`

Le recu est cree sous verrou par fichier temporaire wx puis renommage atomique.
Tous les fichiers installes, sources/preuves, registre, catalogue, profils, crops
et identites sont reverifies. Un recu deja conforme est retourne tel quel. Un
recu etranger, un journal stale, un lien/jonction, un verrou tiers ou une seule
empreinte modifiee bloquent. La reprise committed ne reinstalle ni ne rollback
aucune carte; checkedAt est la date de cette nouvelle verification.

## Tests isoles

`node V4/expansions/2026-09-24-royal-training/publication.test.cjs`

`node V4/expansions/2026-09-24-royal-training/regression.test.cjs`

Fixtures transaction dans un repertoire temporaire propre au test; aucune
publication de production et aucun appel Photoshop. Les tests de domaine lisent
les snapshots mais ne les modifient pas. L'execution directe evite le processus
enfant du mode node --test quand le sandbox Windows le refuse.
