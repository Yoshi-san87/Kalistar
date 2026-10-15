# Kalistar 4.6.29 - Villes de la Map et Velane

Phone : carte collee en bas, au-dessus de la navigation. Liste des quatre
villes dans la partie haute ; une seule ligne depliee a la fois, details
narratifs courts et repere lumineux sur la carte. Le repere suit le zoom
et le redimensionnement. PC : liste laterale et grande carte.

Velane (Map 1.19) : foret locale adaptee, arbre-cabane transparent, ombre et
nom independants dans le PSD. Geographie hors zone et anciennes villes
verifiees identiques. Les sources et versions restent preservees.

Map dans Plus utilise un atlas illustre cuivre/parchemin, assorti aux
emblemes du site. Menu Guide/Library de 4.6.28 conserve. Aucun module de boot
ajoute, aucune regle de combat ni sauvegarde changee.

Accessibilite : boutons natifs, aria-expanded/controls, region de carte,
texte non limite a une couleur, clavier et mouvement reduit. Listeners et
ResizeObserver nettoyes a chaque navigation. Pas de stockage additionnel.

Version desktop/phone et assertions avancees a 4.6.29. Publication personnelle
Yoshi-san87/Kalistar, main et tag v4.6.29. Captures et rapports dans qa/.

Controles : tests Map et empreintes, Pages/PWA/navigation/performance, build
statique, PC/Razr/320/paysage, accordions des quatre villes, ancrage du repere,
zoom/reset/reload, absence de chevauchement avec la barre basse. Le test de
publication couvre aussi lecteur, Decks, arene et reprise de match.

## Resultats

- 25 tests unitaires cibles reussis, dont empreintes et identite WebP/PNG.
- Map PC/Razr/320/paysage : accordions, repere aligne, zoom/reset/reload PASS.
- Navigation : 46 controles sur dix viewports reussis, Guide/Library conserves.
- Publication : 351 cartes, lecteur, Decks, arene, sauvegarde/reprise PASS.
- Les anciens calques de carte et villes sont preserves ; Velane est independant.
- Deux doublons de generation Velane retires apres comparaison, 5 006 626 octets.
