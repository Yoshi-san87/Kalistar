# Kalistar x NieR - set 02

Etat au 23 septembre 2026 : six cartes publiees et verifiees dans le jeu local.
Voir [le resultat, les controles et les choix artistiques](RESULTAT.md).
Mise a jour ulterieure du 23 septembre : cinq illustrations revues et Adam
passe a Orbe. Voir la [revision native active](../../revisions/2026-09-23-nier-art-refinement/README.md)
et son [resultat](../../revisions/2026-09-23-nier-art-refinement/RESULTAT.md).
Pascal a ensuite recu une seconde correction du livre :
[revision courante Pascal](../../revisions/2026-09-23-pascal-book-02/README.md).
Les preuves de la premiere retouche restent historiques, sans modification.
Le tableau et `set.json` ci-dessous decrivent la fabrication initiale ; les
profils courants sont dans `cards/<key>/profile.json` et le contrat revise dans
`../../revisions/2026-09-23-nier-art-refinement/revised-set.json`.
Ne pas relancer `prepare` ou `render` sur les sorties publiees pour une retouche :
prevoir une revision native tracee, avec conservation des sources precedentes.

Six nouvelles cartes privees non officielles. Le pilote 2B/9S, les sets FF7/FF8,
le moteur, les banques, les references et leurs hashes restent intacts. Aucun
deck ni aucune arene : huit cartes NieR au total ne font pas un deck de dix.

## Contrat

| Carte | ID reserve | Race | Arme native | Cristal natif | Positions | Principal |
| --- | --- | --- | --- | --- | --- | --- |
| Emil | 43525184 | CYBORG | Sceptre | HEMATO | P4/P3 | P4 |
| A2 | 47952087 | ANDROID | Epee longue (*) | CRYO | P2/P1 | P2 |
| Pascal | 42650442 | ROBOT | Tome | HERBO | P5 | P5 |
| Adam | 47023549 | ROBOT | Poing | LUXO | P3/P4 | P4 |
| Eve | 48867563 | ROBOT | Poing | PYRO | P1/P2 | P1 |
| Anemone | 45243854 | HUMAIN | Gun | GEO | P4 | P4 |

(*) Cle exacte dans `set.json` : `Ep\u00e9e longue`. Les libelles demandes
SANGO/GLACEO/PLANTO/FEO/Grimoire correspondent aux cles existantes
HEMATO/CRYO/HERBO/PYRO/Tome. Aucune nouvelle option ni recoloration.

Les IDs ont ete tires avec `crypto.randomInt`, puis reserves dans `set.json`.
`check` refuse les collisions du catalogue, des dossiers de creations et des
reservations Atelier. Ce fichier n'est pas une reservation globale du serveur :
relancer `check` sous le verrou au moment de `prepare` reste obligatoire.

Les positions imprimees conservent l'ordre demande, distinct du role principal.
Les chiffres sont bornes face par face par `V3/donnees/regles_demo.json`.
Pascal : ATK D6-D1 = Reraise, garde, trefle, mana, puissance physique, 18.
DEF = 184/150/116/82/48/20, une barriere D5, aucune magie. Son esperance
numerique brute ATK est 3, avant modificateurs ; les cinq soutiens remplacent
l'attaque. Ni Mort, ni esquive DEF, ni cumul de charges d'une meme categorie.
Ces contraintes ne constituent pas une preuve statistique d'equilibrage.

Emil et Adam privilegient la magie ; A2 et Eve sont physiques. A2 conserve une
esquive, une relance DEF et une barriere numerique. Anemone apporte une face de
puissance physique et un tir magique D4. Details exacts dans `set.json`.

## Adaptation Et Art

Races, armes, cristaux et pouvoirs sont une adaptation Kalistar, pas une fiche
canonique NieR. HUMAIN pour Anemone suit la demande explicite actuelle, avec
clarification en cours ; son recit ne lui attribue pas une nature humaine.
Si la demande change, modifier ensemble `set.json` et `model.cjs`, puis relancer
les tests et toute preparation deja faite. Ne jamais corriger seulement un PNG.

Le parent possede `art/` et toute provenance : aucun de ces fichiers n'est cree
ou modifie par cette implementation. Entrees attendues :
`art/{emil,a2,pascal,adam,eve,anemone}.png`.
Les recits sont des propositions evocatrices de 190-220 caracteres, non des
citations du jeu. Ils suivent les scenes demandees et restent independants du
costume. Correction visuelle Anemone transmise par le parent : cheveux courts
fonces, cape verte a capuche brodee or, tunique claire, pantalon tactique,
bottes et fusil ; pas d'echarpe rouge generique.
Reference fournie : https://www.jp.square-enix.com/nierautomata/character/

## Dependances Natives

- Fanion : exactement `../nier-pilot-01/flag-NieR-packed.png`, 98 x 223 a
  (672,829), hash approuve dans `dependencies.json`. Aucun script d'assets a lancer.
- ANDROID/CYBORG : extensions installees `atelier/designer-assets/race-extensions.json`.
  ROBOT/HUMAIN et toutes les armes viennent directement de la banque native.
- Composition : inclusion directe de `../nier-pilot-01/compose-one.jsx`.
  Typographie partagee `typography.jsx/cjs` : TimesNewRomanPSMT, NOM 10 pt,
  TITLE herite 7,68 pt et ALLCAPS, sans toucher aux fichiers du pilote.
- Verification native : `verifyNative` du pilote et controle de pixels FF8.
  PSD 897 x 1497 a 300 dpi, textes editables, objets dynamiques incorpores,
  cadre fixe conforme, PSD rouvert identique, code-barres reel lisible.

## Commandes

Depuis la racine Kalistar, avec Node configure sur ce poste :

```powershell
node --test --test-isolation=none V4/collaborations/nier-set-02/pipeline.test.cjs
node V4/collaborations/nier-set-02/build.cjs check
```

Le parent seul execute la suite, quand les six illustrations sont finalisees :

```powershell
node V4/collaborations/nier-set-02/build.cjs prepare
node V4/collaborations/nier-set-02/build.cjs render
node V4/collaborations/nier-set-02/build.cjs verify
node V4/collaborations/nier-set-02/publish.cjs
node V4/collaborations/nier-set-02/publish.cjs --publish
```

`publish.cjs` sans argument est un preflight en lecture seule. `--publish` est
la seule commande de publication. Les commandes build acceptent une cle finale,
par exemple `render pascal` ; la publication exige toujours les six preuves.
`prepare` compose les entrees et apercus, sans Photoshop. Seul `render` lance
Photoshop. Aucun rendu natif ne doit etre lance en parallele.

## Preservation Et Reprise

`prepare` fige une seule fois `existing-created.snapshot.json` : toutes les
entrees creees existantes, leur inventaire complet et leurs empreintes. Une
nouvelle preparation reutilise ce snapshot ; elle ne le renouvelle jamais pour
masquer une mutation. Les sorties approuvees 2B/9S sont aussi epinglees dans
`dependencies.json`, aux valeurs observees apres la correction typographique.

Chaque `preparation.json` lie sources, art, composants prepares et snapshot.
Chaque verification lie l'empreinte de cette preparation. Modifier un fichier
d'entree invalide le rendu et interdit la publication. Une retouche d'art exige
prepare/render/verify a nouveau, jamais une mise a jour manuelle des hashes.

La fabrique transactionnelle FF8 gere staging, commit atomique, collisions,
publication additive, idempotence et reprise de dossiers orphelins compatibles.
L'enveloppe locale recontrole les creations existantes et toutes les entrees
juste avant le commit du catalogue. Un conflit n'est jamais annule par retour
arriere du catalogue ou des fichiers d'un autre travail.

Danger d'integration : une publication externe ou revision de carte apres
`prepare` rend le snapshot obsolete et bloque ce lot. Coordonner ces travaux
avant preparation. Ne pas supprimer le snapshot ni renouveler les verrous pour
contourner le blocage ; toute rebase demande une decision explicite du parent.
`check`/`prepare` refusent les IDs deja publies ; apres publication, utiliser
le preflight ou `--publish` pour verifier l'idempotence.

## Verification Effectuee

Tests unitaires, composants/typographie en lecture seule, apercus de texte en
memoire, simulations reelles du moteur avec restauration a chaque transition,
Pascal/Reraise, publication transactionnelle en memoire et injections de panne.
Aucune preparation, aucun rendu Photoshop, aucune publication reelle par ce
travail. QA native, validation artistique et QA navigateur restent au parent.
Les textes en memoire ne prouvent pas le cadrage final des six illustrations.
