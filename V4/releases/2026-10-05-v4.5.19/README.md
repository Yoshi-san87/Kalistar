# Kalistar 4.5.19 - Armes de faction

## Livraison

- L'Accord Sylvestre et Le Cran de Ronce deviennent accessibles a tous les
  personnages Arborium, sans condition de Job. Bonus et visuels conserves.
- Les Ailes du Rempart : lance noire/cuivre/rouge inspiree d'Orven, deux lames
  deployees en ailes de chauve-souris, +20 DEF en inferiorite numerique.
- L'Arbalete Ecarlate : grande arbalete noire a finitions rouges, carreau rouge,
  +20 ATK avec deux combattants actifs ou moins.
- Les nouvelles armes exigent la faction canonique Draevenheim, tous Jobs.
- Deux scenes peintes, deux detourages et deux anneaux personnalises conservant
  le cadre Kalistar et la geometrie native. Recapitulatif DEF avec bouclier.

29 armes au total. Pas de modification de la matrice d'armes imprimees, de
nouvelle famille mecanique, de poison persistant ou de cumul. Les snapshots
des parties commencees restent intacts, y compris l'ancienne restriction
SOLDAT + Arborium. Aucun PNG/PSD de personnage ni ancien rapport modifie.

## Validation

81 tests cibles passent, dont 76 duels sur les editions des deux factions,
dans les deux camps. Compatibilite, vrais calculs, journaux, reprise, profils,
composition, non-cumul et matchs complets sont verifies. Ce n'est pas une
mesure d'equilibrage competitif.

41 controles du master (29 cartes et six tailles d'ecran) ; 12 parcours arme /
viewport en profil jetable PC, Razr 50 et 320 px Reduced Motion : equiper,
remplacer, desequiper, reload, inspections, resize, adversaire et formules.
Le workflow complet passe dans une copie isolee de l'index : 171 tests,
ainsi que les verifications Kalistel et ambiance. Resultats conserves dans
`workflow-results.json`. Le build Pages passe : 211 cartes, 688 fichiers,
527.3 Mo. La suite navigateur du site construit passe sur PC et telephone :
collection, lecture, export PNG, decks, arene, reprise et publications additives,
sans erreur JavaScript ou HTTP. Aucun travail parallele non indexe n'est inclus.
Captures dans `V4/revisions/2026-10-05-faction-weapons/`.

Schema courant : `V4/docs/ARMES_EQUIPEES.md`. Sources PNG et vrais prompts
integres : `V4/weapon-cards/sources/draevenheim-*.png` et
`V4/weapon-cards/draevenheim-prompts-2026-10-05.json`. Les anciens assets sont
conserves. Aucune sauvegarde du navigateur personnel n'est utilisee en QA.

## Publication

Depot personnel `Yoshi-san87/Kalistar`, branche `main`, tag annote `v4.5.19`.
L'indisponibilite temporaire du service d'autorisation est resolue ; l'utilisateur
a confirme la publication. Apres le push, attendre le succes du workflow Pages
et executer `public-check.cjs` avant d'annoncer le site en ligne.
Cette release suit la publication parallele 4.5.18 sans en reindexer les
changements. Badges et assertions PC/mobile synchronises. `public-check.cjs`
verifie le tag precis (pas le HEAD mobile du checkout partage), les versions
affichees et les hashes des modules et des huit medias distribues.
