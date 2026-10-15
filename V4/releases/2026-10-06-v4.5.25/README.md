# Kalistar 4.5.25 - Armes de Cryptown

Trois nouvelles cartes d'armes, ARM-030 a ARM-032, pour la faction Cryptown :
Le Serment sans Visage (epee de Varkhen), La Releve Muette (fusil de Nereth),
Le Glas des Veilleurs (fleau de Draust). Total : 32 armes.

Illustrations fideles aux personnages, scenes peintes, detourages et trois
anneaux dynamiques propres aux objets. Cadres et cartes natives preserves.
Les restrictions portent uniquement sur Cryptown, soit six personnages
et sept editions actuelles, quel que soit leur job.

Bonus conditionnels +20 ATK / +20 ATK / +20 DEF, sans changement de moteur,
de matchup imprime, de schema de sauvegarde ou de faces speciales.
Mort/Esquive/Reraise de Nereth et Garde de Varkhen/Draust sont testees.

## Validation

Six tests Cryptown ajoutes au workflow Pages, 42 duels numeriques, tests
d'arsenal et d'equipement. Neuf parcours navigateur PC/Razr/compact Reduced
Motion et 44 controles de layout. Voir ../../revisions/2026-10-06-cryptown-weapons/
pour les captures, les limites d'equilibrage et la provenance artistique.

Le snapshot indexe 3880c5dfe1033c6027fd58f0ce1eb7cd5a4a51f4 a passe les
207 tests du workflow complet, ainsi que les controles Kalistel et ambiance.
Construction Pages : 214 personnages, 705 fichiers, 534,2 Mo.
Resultats dans workflow-results.json. Le navigateur statique valide
collection, lecteur, telechargement PNG, decks, arene, sauvegarde/reprise,
publication additive, PC et telephone, sans erreur HTTP ou JavaScript.
Les captures statiques desktop/mobile sont jointes. Seules ces preuves et
la presente documentation ont ete ajoutees apres verification du snapshot.

## Publication

Version desktop/mobile et assertions : 4.5.25. Depot personnel
Yoshi-san87/Kalistar, main et tag annote v4.5.25. public-check.cjs controle
le commit du tag, la version publique et les octets des 12 nouveaux assets
et des definitions effectivement deployees, independamment du cache local.
