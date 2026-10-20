# Kalistar 4.6.103 - Les Seize Voyageurs

[Lot natif Octopath](../../expansions/2026-10-21-octopath-traveler/README.md) |
[Documentation](../../../docs/INDEX.md)

## Perimetre

Seize cartes natives des protagonistes d'Octopath Traveler I et II, modeles
49903301 a 49903316, seize identites stables. Faction OCTOPATH et filtre du
classeur. Tous portent un Kalistel ; Ochette est FELINEUS, les autres HUMAIN.
Aucun nouvel effet moteur ni modification des comptes ou des regles de possession.
La publication d'un modele ne distribue pas d'exemplaire a Tokyo.

Hikari : katana final legerement rallonge apres l'essai trop court. Arc de
H'aanit refait, lance de Tressa courte et droite. Controle des seize visages,
avec retouches picturales d'Ophilia, Agnea, Temenos et Ochette. Toutes les
iterations precedentes restent conservees. Nouvelle banniere huit routes,
mise a l'echelle uniforme et inscrite dans le support natif sans etirement.

Catalogue : 446 vers 462 modeles. Registre medias : 1 391 vers 1 408 fichiers,
soit seize PNG de carte et une banniere. Toutes les anciennes entrees et
empreintes restent identiques. Aucun PNG, PSD ou autre binaire ajoute a Git.

## Preuves

- Suite generale complete : 98 groupes reussis ; suite locale : 13 groupes ;
  suite repository et controle d'organisation reussis. Les scenarios optionnels
  des suites historiques restent explicitement signales par leurs tests.
- 23 tests dedies : 192 faces ATK/DEF, soutiens, journal, barrieres,
  seize matchs ABBA complets avec reprises, production native et publication.
- Seize PSD editables : 0 difference sur les pixels fixes, 0 difference apres
  rouverture, seize codes-barres valides, descriptions et accents controles.
- Galerie PC 1440 px, Razr 412 px et 320 px ; controles visuels grand/petit.
- Jeu : 48 lecteurs verifies par SHA-256, filtre et pagination des seize
  voyageurs, Hikari contre H'aanit, reprise de match et import de sauvegarde.
- Suite locale Atelier et SQL ephemere executee ; aucune base personnelle
  modifiee par ces tests. Captures sous `work/qa/octopath-traveler/` ; premier
  passage des lecteurs conserve sous `work/qa/octopath/game/`.
- Connexion privee PC/Razr : refus anonymes, attribution Paris/Tokyo, reprise,
  deconnexion et sauvegardes controles dans une base ephemere.

Echecs corriges pendant la verification : acces COM Photoshop confine,
attente erronee de seize vignettes sur une seule page dans le nouveau test,
et deux assertions de version restees a 4.6.102 dans le test de build.
Aucun verrou natif ou ancien rapport n'a ete modifie pour les contourner.

## Conservation Et Livraison

Sauvegarde privee hors checkout :
`sauvegardes-personnelles/creation/2026-10-21-octopath-traveler/`,
672 fichiers, 765 808 624 octets, chaque copie controlee par SHA-256.
Les evolutions ulterieures des tests et textes sont conservees dans ce commit.

La 4.6.102 de droits d'equipement a ete publiee avant ce lot. Cette livraison
ne contient pas les autres propositions non validees, les anciens rapports QA
modifies localement ni les travaux d'un autre chat.
Publication depuis le commit fige, verification de ses captures puis envoi au
projet Cloudflare personnel existant. Le rapport de snapshot et les preuves
de mise en ligne restent sous `work/publication/` et `work/qa/`.
