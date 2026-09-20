# Classeur De Collection V3

Revision du 15 septembre 2026.

## Experience

- Double page plein ecran : huit personnages sur grand ecran, quatre en hauteur reduite, deux sur mobile.
- 40 personnages et 41 versions ; les deux Momo restent regroupes, sans modifier les illustrations.
- Une version favorite sert de couverture par defaut ; le choix de version reste conserve pendant la session.
- Consultation grand format : carte originale du jeu ou illustration complete.
- Onglets Recit, Fiche, Carriere et Exemplaires. Recits, historiques et exemplaires sont pagines sans defilement.
- Recherche, filtres, favoris et tri independants du deck. La vue Mes cartes suit les possessions du profil ; Catalogue inclut les versions non possedees.
- Feuilletage par boutons, fleches clavier ou geste horizontal sur le fond des pages. Les gestes verticaux et annules ne changent pas de page.
- Animations courtes et non repetitives, desactivees avec la preference de mouvements reduits.

## Controles Effectues

- `site/collection-binder.test.cjs` : 6 tests reussis, regroupement, pagination des textes, couverture favorite, isolation des possessions et echappement des libelles.
- `scripts/verify_collection_ui.cjs` : 9 groupes reussis, parcours du classeur et du lecteur, images chargees, favoris, profils, tactile, clavier, animations et retour depuis Decks/Arene.
- Formats controles : 2560x1440, 1600x1080, 1440x900, 1280x720, 390x844, 360x740 et 844x390. Pas de debordement du document, des commandes ou des panneaux controles.
- `scripts/verify_squad_ui.cjs` : 8 groupes reussis, dont glisser-deposer, filtres et sauvegardes de decks ; habillage Collection sans impact sur Decks.
- `scripts/verify_ownership_ui.cjs` : 16 entrees de controle reussies. Inclut carriere reelle et selection d'exemplaire dans le nouveau lecteur, ouverture du match archive, profils Paris/Tokyo, transferts, activation et restauration.
- `scripts/verify_db_engine_contract.cjs` : 9 groupes reussis, contrat moteur/BDD, scores et archives conserves, V2 isolee.
- `scripts/verify_site_v3.cjs --require-final --require-assets` : 13 groupes reussis, 41 cartes, 16 arenes, aucun asset absent, aucun format d'image incorrect et aucune exception navigateur.

Les essais utilisent des contextes Chrome ephemeres et des bases de test, jamais le profil navigateur de l'utilisateur.

## Perimetre

Nouveaux fichiers applicatifs : `site/collection-binder.js` et `site/collection-binder.css`, raccordes par `site/app.js` et `site/index.html`.

Aucune modification du moteur, des chiffres des cartes, des illustrations, des exports d'impression ou du schema IndexedDB. Les favoris utilisent les cles de profil existantes. Les transferts, activations et sauvegardes passent toujours par le registre existant. Le bouton Tour suivant reste manuel.

Rapport detaille et captures : `report.json`, `binder-*.png` et `reader-*.png` dans ce dossier. Ouvrir `../site/index.html#collection` dans le navigateur habituel.
