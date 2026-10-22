# Fragment : recits et adversaires narratifs

Perimetre du 22 octobre 2026 : definitions, tests et ce bilan uniquement.
Aucun changement de moteur, Worker, SQL, interface, CSS, version ou index Git
dans ce lot de travail. L'integration et la publication restent a faire par
la tache principale.

## Sources Et Intention

- Demande directe de l'auteur : Momo domestique maltraite, abandon pour ses
  emotions, Taulio protecteur rencontre a la casse, flute traversiere, premiers
  souvenirs du createur, recherche avec Kaylis.
- Catalogue integral publie : `V4/deploy/build.cjs.plan().catalogue`, 462 modeles
  lors de la verification. Ne pas remplacer cette source par les seules
  references de `buildCatalog()` sans publications.
- Profils natifs du registre, notamment Momo 30000001 / 30000014, Taulio 30000013,
  Balmhyr 30000007 / 49900802 et Kaylis 30000012 / 49055457 / 49902701.
- Roman local `site/story-content.json` : Le chemin de la decouverte,
  L'art du combat et la force de Baba, Une rencontre retrouvee et La veille
  du Conseil. Aucun texte du roman n'est modifie.
- Equipements existants dans `equipment.js` : identifiants, restrictions et
  effets preserves. Les cartes gagnees ne sont pas equipees automatiquement.

Les equipes sont des tableaux de l'episode, pas des alliances nouvellement
declarees. Les habitants de Chroma incarnent les objets, la memoire et les
passerelles ; les artisans et gardiens de Durane incarnent le retour et les
passages ; les figures de la Z13 et de l'apprentissage composent les epreuves
de Kaylis. Les invites ont un motif de profil precis, pas un simple tirage :
Marel repare les machines abandonnees, Serya raccommode et protege, Daska
ecoute les moteurs, Karrok repare son bouclier, Soryn guide par la musique,
Nerval veille sur les passerelles, Ithrek sonde les failles, Iliane retrouve
les noms oublies. Leur presence dans une equipe ne raconte pas un voyage ni
une rencontre qui ne figurent pas dans le canon.

Les 21 equipes fixes sont distinctes et emploient **50 versions de
43 personnages natifs**. Cela ouvre tout le vivier natif aux futurs
chapitres, sans imposer chaque carte disponible comme figurant hors sujet.
Aucune carte de collaboration, aucun multiplicateur cache et aucun de force.

## Recits

Chaque livre conserve ses quatre combats de carte puis trois combats bonus.
Les 42 scenes intro/conclusion contiennent chacune 80 a 140 mots (4506 mots au
total), deux paragraphes et une suite emotionnelle explicite.

Momo suit les sept fonds prepares par la tache principale : abandon, Taulio,
premiere melodie, bal debout, note retrouvee, harnais ajuste par Taulio, boite
musicale avec Kaylis. Le nom **Gezinho** n'apparait qu'au dernier chapitre.
Le reflet jaune et les circuits sont des indices tardifs, pas une explication
complete de la transformation par le Kalistel Electro. Il n'y a ni reunion
inventee avec le createur ni resolution du mystere.

Balmhyr va de l'exil a l'apprentissage du role de guide, puis au gant rendu par
Madania et a l'attente devant le Conseil. Ses bonus prolongent la prise du
gant, la place laissee derriere le rempart et le sens du sceau. Aucun
retablissement sur le trone n'est annonce.

Kaylis va de la peur de ses marques a la prise, aux appuis et au choix du
prochain pas. Promesse, les **bottes noires** et le ruban bleu nuit restent des
objets concrets. Aucun destin nouveau n'est attribue a leurs effets.

## Compositions Retenues

Les decks ne sont plus des variantes d'un tableau `base`. Chaque liste a dix
identites distinctes, deux cartes compatibles par position, au plus un
Rainbow et cinq titulaires explicites. Le capitaine peut etre P2, P3, P4 ou
P5 : `validate()` affecte le vrai capitaine avant de valider la composition.
Momo original est bien titulaire P3 du premier combat ; Taulio est P1 du
deuxieme. Le quatrieme combat de chaque livre garde la version recompensee
titulaire et capitaine.

### Momo

Carte : `30000014`. Les cinq titulaires sont dans l'ordre P1 a P5.

| Etape | Capitaine | Titulaires P1-P5 | Reserve | Arene |
| --- | --- | --- | --- | --- |
| rebuts | MOMO 30000001 | ORVEN, SERYA, MOMO, GEN, MAREL | DASKA, PERELLE, BEX, NELL, VEYRAC | electro |
| passage | TAULIO 30000013 | TAULIO, PERELLE, TAZRIK, MOMO, NELL | KARROK, SERYA, BEX, NERVAL, MAREL | electro |
| carillons | MOMO 30000014 | TAULIO, RIKKA, MOMO, BEX, NELL | DASKA, PERELLE, TAZRIK, SORYN, NERVAL | electro |
| rester | MOMO 30000014 | TAULIO, RIKKA, MOMO, BEX, NELL | KARROK, PERELLE, TAZRIK, EDRIS-7F, NERVAL | electro |
| souffle | MOMO 30000014 | TAULIO, EDRIS-7F, MOMO, BEX, NELL | DASKA, PERELLE, TAZRIK, SORYN, NERVAL | electro |
| coutures | TAULIO 30000013 | TAULIO, NERYK, MOMO, BEX, NERVAL | KARROK, RIKKA, PERELLE, NELL, VESSA | electro |
| boite | MOMO 30000014 | TAULIO, KAYLIS, MOMO, BEX, NELL | KARROK, EDRIS-7F, PERELLE, NERVAL, GEN | electro |

### Balmhyr

Carte : `49900802`. Les cinq titulaires sont dans l'ordre P1 a P5.

| Etape | Capitaine | Titulaires P1-P5 | Reserve | Arene |
| --- | --- | --- | --- | --- |
| horizon | BALMHYR 30000007 | BALMHYR, CANA, LANIO, GEN, NERVAL | KARROK, PERELLE, SORYN, ITHREK, NELL | minero |
| durane | LOK 30000018 | BRUND, LOK, CALVEN, GEN, RASKEL | MAGNAR, KOGNUS, TORVAN, ITHREK, OSSUM | minero |
| guide | BALMHYR 30000007 | BALMHYR, OREL, BRUND, ITHREK, OSSUM | ELDRA, NAZAR, CALVEN, GEN, RASKEL | minero |
| portes | BALMHYR 49900802 | BRUND, OREL, BALMHYR, ITHREK, OSSUM | MAGNAR, ELDRA, CALVEN, GEN, RASKEL | minero |
| serment | BALMHYR 49900802 | TORVAN, CALVEN, BALMHYR, GEN, RASKEL | DASKA, OREL, SERYA, ITHREK, OSSUM | minero |
| rempart | MAGNAR 30000024 | MAGNAR, ELDRA, BALMHYR, ITHREK, OSSUM | BRUND, CALVEN, DASKA, GEN, RASKEL | minero |
| empreinte | TORVAN 49900306 | TORVAN, OREL, BALMHYR, ILIANE, RASKEL | BRUND, ELDRA, CALVEN, GEN, OSSUM | trone-fer |

### Kaylis

Carte : `49055457`. Les cinq titulaires sont dans l'ordre P1 a P5.

| Etape | Capitaine | Titulaires P1-P5 | Reserve | Arene |
| --- | --- | --- | --- | --- |
| breche | KAYLIS 30000012 | DASKA, KOGNUS, REEVUS, GEN, KAYLIS | MAGNAR, ELDRA, ITHREK, RASKEL, SERYA | z13 |
| couleurs | BALMHYR 30000007 | BALMHYR, KAYLIS, LANIO, ITHREK, HADRUK | MALABA, OREL, GEN, RASKEL, NAZAR | minero |
| ligne | KAYLIS 49055457 | BALMHYR, KAYLIS, CALVEN, GEN, RASKEL | NAZAR, OREL, ELDRA, ITHREK, HADRUK | minero |
| seuil | KAYLIS 49055457 | MALABA, XIAOMI, KAYLIS, GEN, HELIOR | BALMHYR, LANIO, KOGNUS, ITHREK, HADRUK | z13 |
| promesse | BALMHYR 30000007 | BALMHYR, KAYLIS, ELDRA, ITHREK, OSSUM | TORVAN, OREL, CALVEN, GEN, RASKEL | minero |
| appuis | BELROG 30000019 | BELROG, KHORNA, KAYLIS, ITHREK, HELIOR | NAZAR, OREL, GEN, HADRUK, ELDRA | geo |
| ruban | KAYLIS 49902701 | MALABA, KAYLIS, LANIO, GEN, HELIOR | BALMHYR, XIAOMI, EDRIS-7F, BEX, HADRUK | rainbow |

## Progression Et Mesure

La progression est portee par les compositions, pas les statistiques des
cartes : Chroma passe de 4 a 7, 8 puis 9 membres dans le parcours Momo ; Durane
renforce son noyau et sa double couverture ; Kaylis passe du soutien apeure
a la version de combat entouree des figures de la Z13 et de son apprentissage.
Le terrain `minero` est retenu pour l'epreuve finale de Balmhyr afin de garder
la synergie Roche de Durane. Le recit attend devant le Conseil ; l'arene est
un tableau de combat, pas une nouvelle scene geographique du roman.

La formulation " meilleur deck possible " n'est pas une garantie d'optimum
global : les finales privilegient le heros, sa faction et une formation viable
sans lui substituer un assemblage sans rapport avec son histoire.

Serie finale independante des graines exploratoires : **3024
matchs**, 24 graines par adversaire-type, chaque paire rejouee en inversant
les places, 3 adversaires natifs fixes et 21 rencontres. ABBA et IA reelles,
aucun equipement gratuit, aucun de force. Resultat :
**0 nul, aucun blocage**, maximum
80 tours moteur. Les 21 combats
sont aussi traverses avec `journey-combat.apply()` et des reprises JSON.

Taux de victoire du deck adverse du Fragment, pas celui du joueur :

| Livre | 1 | 2 | 3 | 4 | Arme | Protection | Relique |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Momo | 24.3 % | 42.4 % | 36.8 % | 47.9 % | 33.3 % | 33.3 % | 37.5 % |
| Balmhyr | 35.4 % | 30.6 % | 44.4 % | 41.0 % | 41.7 % | 20.8 % | 41.0 % |
| Kaylis | 42.4 % | 49.3 % | 52.8 % | 56.9 % | 40.3 % | 53.5 % | 59.7 % |

Cette mesure **ne prouve pas une difficulte strictement croissante contre
tous les decks**. Kaylis monte regulierement sur cette serie ; Taulio peut etre
plus difficile que la premiere magie de Momo, et le guide de Balmhyr rivalise
avec sa finale selon les oppositions. Les intervalles se chevauchent avec
144 matchs par rencontre. Les contres de cristal, les soutiens et les choix
humains modifient ces resultats. Aucun taux n'est converti en bonus cache.
Les bonus restent accessibles ; ils proposent d'autres situations plutot
qu'une escalade automatique de puissance.

Preuve reproductible, ignoree par Git :
`work/qa/fragment-adventure-decks.json`. Empreinte des definitions testees :
`e4b07f2944a5c5e2d664fa364b08a82e8e7bc54d40990bc23ff9243b49d79d5d`.

## Contrats Et Integration

- IDs des trois livres et des 21 etapes, ordre 4+3 et revision `journeys-1`
  inchanges. Aucun nouveau module runtime a ajouter au hash.
- Momo recompense devient **30000014**, LE BAL DES OBJETS PERDUS. La migration
  additive et la projection des anciennes attributions sont gerees par
  l'autre perimetre ; voir `BACKEND.md`. Ne pas reattribuer 30000014 aux anciens
  joueurs ayant deja recu 30000001 et ne pas reecrire leurs certificats.
- Garder les anciens medias de 30000001 pour les receipts historiques ; la
  nouvelle couverture utilise 30000014. L'UI doit utiliser les livres projetes
  par le client serveur, pas seulement le catalogue statique.
- Les 12 empreintes de snapshots historiques n'ont pas ete regenerees. Leur
  test injecte les anciennes equipes figees dans le moteur inchange, verifie
  chaque hash original et reprend les etats avec le runtime courant.
- Le test hors perimetre `V4/site/journey-combat.test.cjs:215` altere encore
  `30000001` pour tester une mauvaise identite de recompense. Il doit desormais
  alterer `runtime.books[0].rewardModelId` (30000014). Cette assertion et son
  parent sont les seuls echecs observes de cette suite ; aucun contournement
  n'a ete ajoute dans les definitions pour faire passer une hypothese obsolete.
- La tache principale doit enregistrer `decks.test.cjs` dans le registre
  commun, actualiser la documentation des parcours (ancienne recompense,
  textes courts, bottes noires), relire l'UI et publier apres integration.
- Pas de stage, commit, push, reset ou publication effectue par ce perimetre.

## Verification Executee

```text
KALISTAR_JOURNEY_BALANCE=1 node --test V4/revisions/2026-10-22-fragment-adventure/decks.test.cjs
node --test V4/site/journey-sequels.test.cjs V4/deploy/journey-compatibility.test.cjs
git diff --check -- V4/site/journey-definitions.js V4/site/journey-sequels.test.cjs
```

Resultats : 27/27 pour les nouveaux tests avec simulation, 27/27 pour suites
sequel/compatibilite, controle de diff sans erreur. Sans variable de simulation,
le test statistique optionnel est explicitement ignore ; les 21 combats reels
et les controles de contrats restent executes.
