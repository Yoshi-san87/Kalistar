# Kalistar 4.6.102 - Arsenal obtenu

## Portee

- Joueur heberge : aucune arme, protection ou relique par defaut.
- Acces aux objets determine par les attributions privees du serveur, jamais
  par le simple catalogue partage ni par un profil administrateur local.
- Paris conserve le catalogue via son role administrateur serveur existant.
- Tokyo conserve ses dix cartes. Profil, imports, brouillons et decks ne
  reintroduisent plus d'equipement non obtenu.
- Les adversaires virtuels et les snapshots des parties deja commencees ne
  changent pas. Aucune statistique, carte, regle de de ou formule modifiee.

## Serveur

Migration `202610210011_equipment_ownership.sql`, schema applicatif 10.
Tables privees avec RLS, aucune attribution exposable depuis le navigateur.
Les nouveaux combats Fragment et les sauvegardes refusent un equipement non
possede. Le retrait cible Tokyo uniquement, conserve une copie de progression
si necessaire et n'efface aucun historique. Les reponses de synchronisation
ne masquent jamais une modification serveur du document acquitte.

Avant application : export du projet personnel, chiffrement Windows DPAPI et
restauration comparee dans un PostgreSQL local neuf. Export clair transitoire
retire apres verification. Aucun secret ni donnees de joueurs dans ce depot.

## Verification

- Tests unitaires : droits par compte, import/brouillon, snapshots historiques.
- PostgreSQL local : RLS, anciens wrappers fermes, faux equipements refuses,
  reprise d'un ancien combat, attribution idempotente et retrait reversible.
- Navigateur PC et Razr : arsenal vide, refus d'equipement direct, puis
  attribution fictive explicite pour verifier D6, reprise et synchronisation.
- Sauvegarde logique : schema 10 restaure localement, anciennes versions
  de sauvegarde toujours reconnues.
- Suites completes `ci`, `local` et `repository`, build fige et parcours
  navigateur du build publie. Preuves repetables privees sous
  `work/qa/equipment-ownership/`, non versionnees.

## Suite Narrative Proposee, Non Activee

Le livre conserve ses quatre combats et sa carte finale. Proposition a valider :
la reception de cette carte revele des pages secretes, puis trois chapitres
additionnels attribuent arme, protection et relique, dans cet ordre.

Chaque chapitre doit prolonger le recit du personnage, avec illustration,
enjeu et conclusion. Pas trois combats generiques ni une augmentation de
puissance de la carte. Les bonus sont invisibles au depart ; une animation
breve de sceau/page revele la suite au moment de l'obtention, puis chaque victoire
ouvre le chapitre suivant. La relique conclut l'epilogue. Aucun spoiler revele
par un cadenas ou un compteur sur sept etapes avant la premiere revelation.

Cette publication installe seulement le socle de possession. Elle n'ajoute pas
encore ces combats, ces recompenses ou l'animation de pages cachees.
