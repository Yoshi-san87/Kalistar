# Simone - lot natif independant 03

Production additive d'une seule carte, adaptation privee non officielle de
NieR:Automata. Ce dossier ne gere aucune arene et ne cree pas de deck de dix
cartes. Les arenes appartiennent au travail parent.

## Etat de production

**Publie le 23 septembre 2026.** Preparation, rendu, verification native et
publication termines. Les sources actives sont `cards/simone/` ; leurs sorties
publiees se trouvent dans `V4/creations/45862715/` et dans le catalogue V4.
Les sources et preuves des lots precedents restent preservees.

Cadre fixe sans difference, aucun ecart severe des composants, reouverture
PSD/PNG identique et quatre decodages du code-barres reussis. Photoshop est
ferme. Le parent confirme 45 tests passes avant publication et le build de
307 fichiers, 231,3 Mo : 58 cartes dont 9 NieR, 22 arenes. Le premier rerun
apres publication a revele deux echecs d'isolation de fixture, corriges sans
changer le code de production : les 12 tests du lot passent a nouveau.
Le rerun global des 45 tests reste au parent. Voir `RESULTAT.md` pour les preuves
et la distinction entre controles locaux et bilan global du parent.

Tests navigateur en cours dans une autre sous-tache ; validation artistique
finale de l'utilisateur et verification sur impression physique en attente.
Ne pas relancer `prepare`, `render` ou `verify` sur cette production publiee,
ni regenerer ses captures. Toute correction ulterieure demande une revision
independante, preservant ces sources et preuves.

## Identite et equilibrage

- Modele : `45862715`, personnage : `simone-nier`, faction : `NieR`.
- `SIMONE`, version **La beaute jusqu'au silence**, metier **CANTATRICE**.
- Race `ROBOT`, arme existante `Instrument`, cristal `HEMATO`, P4 uniquement.
- Faces D6 vers D1 : ATK `280 / 230 / 180 / mana / 80 / 30` ;
  DEF `162 / 132 / 102 / 74 / 44 / 18`.
- Magie D6/D5/D4/D2, barrieres D5/D3. D1 reste physique.
- Une seule face de soutien, sans Reraise, Garde, Mort ni esquive.
  Les valeurs restent sous chaque borne P4 ; defense totale 532 et ATK
  numerique totale 800, proches des profils DPS magiques existants.
- Ce controle des bornes n'est pas une preuve d'equilibrage empirique parfait.

## Sources reutilisees

Le lot `nier-set-02` reste strictement intact : ses contrats a six personnages
et ses preuves historiques ne sont pas des parametres a remplacer.

- Ses factories `assets.createAssets` et `preservation.createGuard` sont
  reexportees, sans copie ni modification.
- Ses fonctions `donor`, `profile` et `validateProfile` produisent le profil ;
  l'identite de revision et le contrat d'une carte sont propres a ce dossier.
- Le publisher transactionnel FF8, deja employe par `nier-set-02`, est reutilise
  avec son verrou, staging, relecture avant commit et reprise des orphelins.
- `nier-pilot-01/compose-one.jsx` conserve les textes natifs, objets incorpores
  et typographies NieR corrigees. `verifyNative` est reutilise sans modification.
- Le petit orchestrateur local remplace seulement le contrat rigide du builder
  precedent ; aucun chargement de module detourne ni reecriture de code source.

Cadre 897 x 1497 a 300 ppp. Illustration seule dans `art/simone.png`, recadree
dans la fenetre 737 x 921. Ni cadre genere ni retouche de PNG de carte aplatie.
L'icone generique Instrument reste celle deja calibree dans la banque.

## Protocole de production initiale

Commandes documentees depuis la racine Kalistar, avec le Node configure sur
le poste. Ce protocole a deja ete execute ; ce n'est pas une liste d'actions
restantes pour la carte publiee. `check`/`prepare` refusent normalement son
identifiant desormais present dans le catalogue.

```powershell
node V4/collaborations/nier-simone-03/capture.cjs
node --test --test-isolation=none V4/collaborations/nier-simone-03/pipeline.test.cjs
node V4/collaborations/nier-simone-03/build.cjs check
node V4/collaborations/nier-simone-03/build.cjs prepare
node V4/collaborations/nier-simone-03/build.cjs render
node V4/collaborations/nier-simone-03/build.cjs verify
node V4/collaborations/nier-simone-03/publish.cjs
node V4/collaborations/nier-simone-03/publish.cjs --publish
```

`capture` est idempotent mais ne remplace JAMAIS une capture existante : il
refuse toute modification d'une dependance ou d'une creation preservee.
La capture initiale est deja effectuee (30 creations, 182 fichiers).
Les references approuvees sont protegees en plus par le verrou Atelier.

`check` est en lecture seule et signale les images manquantes et les conflits
d'ID. `prepare` ne lance pas Photoshop. `render` le lance via le bridge partage :
attendre l'accord du parent et n'executer aucun autre rendu en parallele.
Les deux etapes prennent le verrou de production commun.

La preparation lie les octets de l'art, du profil, des composants et du code
utilise aux preuves ; une modification rend la preuve obsolete. Faire la
preparation finale apres les modifications des arenes et avant le rendu, car
`game-catalog.cjs` fait partie des sources liees.
Une nouvelle preparation archive toute ancienne verification locale ; elle ne
reecrit ni les captures ni les preuves des precedents lots NieR.

`verify` controle cadre, texte, centrage, typo, objets dynamiques, reouverture
PSD/PNG et lecture reelle du code-barres. Le preflight seul ne publie rien.
Examiner la carte en grand et en petit, puis publier seulement sur instruction
explicite du parent. La validation technique ne remplace pas la revue visuelle.

## Fichiers de production

- `art/simone.png` et provenance artistique fournie par le parent.
- `cards/simone/profile.json`, `illustration.png`, `preview.png`.
- `cards/simone/render/*`, `preparation.json`.
- Rendu natif termine : `card.psd`, `card.png`, `verification.json`.
- Publication active : `V4/creations/45862715/` et entree additive
  dans le catalogue ; sauvegarde transactionnelle dans `publication/`.

Les tests de publication travaillent exclusivement dans des maps en memoire.
Ils ne lancent pas Photoshop, n'ajoutent aucune carte au catalogue reel et ne
touchent jamais aux possessions du navigateur. Aucun script de ce lot ne lance
Git. Ne pas relancer les anciennes captures NieR pour faire passer ce nouvel ajout.
