# V3 : Decks Et Fluidite Du Duel

Historique de la premiere passe. Le passage automatique decrit ci-dessous a
ensuite ete retire a la demande du joueur. Le comportement actuel et sa
verification sont documentes dans `TOUR_SUIVANT.md`. Le rapport navigateur
`flow-decks-ui.json` est regenere par la suite adaptee au passage manuel.

Revision du 15 septembre 2026. Verification finale sur les vrais assets locaux,
avec Chrome headless et des profils temporaires isoles. La BDD utilisateur n'a
pas ete ouverte par les tests.

## Livrable

- Passage automatique au prochain echange : resultat environ 1,2 seconde,
  retour anime en formation de 520 ms, puis progression apres 700 ms.
- Suspension pendant les fiches, apercus, navigation et onglets masques ;
  preference pause/mode manuel accessible dans le bandeau du match.
- Apercu reserve grand format au survol, au clavier ou au toucher ;
  commandes de deploiement et glisser-deposer compatibles.
- Surlignage des renforts compatibles avec le poste libre selectionne.
- Oeil en bas a droite, avec espace reserve quand les cinq buffs coexistent.
- Cadre central CSS par arene : symbole, palette et bordures adaptes ;
  aucun dos de carte etire ni ascenseur interieur du recapitulatif.
- Score par camp : eliminations definitives, objectif dix. Reraise exclu ;
  plafond historique de 200 echanges conserve pour la demonstration.
- Page Decks independante : dix slots en deux rangees, apercu haute definition,
  filtres, comparaison des candidats, affinites potentielles et couverture.
- Dix decks nommes par profil : sauvegarde, copie, suppression confirmee,
  brouillons incomplets, export/import JSON defensif.
- Validation des nouvelles parties : deux compatibles minimum pour chaque
  P1-P5 et formation complete possible. Multi-position compte pour chaque poste.
- Presets ajustes, toujours 41 versions couvertes. Archives historiques
  sans marqueur de couverture conservees, sans migration destructive.

## Verification

| Suite | Resultat |
| --- | --- |
| Nouveau parcours navigateur flow/decks | 15/15 |
| Bibliotheque/modeles de decks | 41/41 |
| Ordonnanceur de transition | 6/6 groupes |
| Couverture et validation moteur | 13/13 groupes |
| Moteur existant | 116 tests, 200 campagnes |
| Site avec assets reels | 13/13 |
| Presets, imports et anciennes parties | 10/10 |
| Cinq buffs, effets, clics et geometrie | 23/23 |
| Registre IndexedDB | 41/41 |
| Profils/transferts dans l'interface | 16/16 |
| Contrat moteur/BDD | 9/9 |

Les nouveaux parcours couvrent les seize arenes, le score de victoire a dix,
la pause du resultat, son retour anime sans raccourci reduced-motion,
le glisser-deposer depuis une reserve agrandie, les renforts, les limites
des bibliotheques et l'isolation Paris/Tokyo. Captures de decks aux largeurs
2560, 1600, 1440, 390 et 360 px ; aucun debordement horizontal du document.
L'arene mobile conserve son plateau horizontal navigable. Les controles
existants verifient aussi les pixels et l'animation des des 3D.

Trois defauts trouves puis corriges : repaint recursif lors du changement
de focus d'une recherche, animations de placement sans mouvement effectif,
et chevauchement du cinquieme buff avec l'oeil d'inspection. La verification
finale ne rapporte aucune exception navigateur ou regression restante.

Rapports : `flow-decks-ui.json`, `deck-tests.json`, `engine-deck-rules.json`,
et `../verification-site/regressions-decks.md`. Les captures de ce dossier
utilisent des comptes de test et ne montrent pas une partie utilisateur.

## Conservation Et Limites

Aucun changement des illustrations, armes, statistiques de profils,
dimensions physiques, fichiers imprimes ou fichiers V2. `data.js` a ete
actualise avec `build_game_bundle.cjs --data-only` pour les presets uniquement.

Les petits JSON des bibliotheques sont stockes par profil dans localStorage.
Ils ont leur propre export dans Decks, distinct de l'export IndexedDB du registre
et des carrieres. Les sauvegardes de composition ne constituent jamais une
preuve de propriete : le registre reverifie les exemplaires avant de jouer.
Les profils restent locaux, sans authentification distante.

Les valeurs affichees pour les groupes sont des plafonds sur cinq cartes,
pas une promesse de formation simultanee ni un bonus actif sur les dix cartes.
Les nouvelles compositions de demonstration necessitent encore des essais
humains d'equilibrage ; aucune statistique de carte n'a ete changee a cet effet.
