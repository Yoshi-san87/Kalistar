# Kalistar V3

## Ouvrir le jeu

Ouvrir `site/index.html` dans le navigateur habituel. Le site fonctionne localement, avec deux profils de demonstration, sans authentification, serveur ni multijoueur en ligne. La V2 reste independante.

La collection V3 comprend 41 versions pour 40 personnages. Seul Momo a deux versions. Les filtres, la composition des decks, les arenes et les statistiques utilisent les profils V3.

Cinq decks de test sont disponibles dans Mon deck : les deux decks initiaux, Z13, les Cites et les Frontieres. Ensemble, ils couvrent les 41 cartes. La nouvelle partie permet aussi de choisir le deck adverse ; un changement ne remplace jamais silencieusement la partie en cours.

## Revision Interface : Decks Et Enchainement

L'onglet **Decks** est une page separee de la collection : dix emplacements en deux rangees de cinq, nom du deck, sauvegarde, duplication et suppression confirmee en ligne. Chaque profil dispose de dix sauvegardes maximum. Un brouillon incomplet peut etre conserve mais pas joue.

Les nouvelles parties exigent au moins deux cartes compatibles avec chacune des positions P1 a P5, en plus d'une formation complete possible. Une carte polyvalente compte pour chacun de ses postes. Les cinq decks de demonstration ont ete ajustes a cette regle et couvrent toujours les 41 versions. Les anciennes parties sans le marqueur `deckCoverage: 2` restent lisibles et jouables avec leur regle historique ; les anciens brouillons sont controles avant de lancer une nouvelle partie.

La recherche propose des filtres de poste, faction, race, cristal, arme, disponibilite et gain de synergie. L'apercu compare le candidat au slot selectionne, avec les membres communs et la couverture gagnee ou perdue. Les affinites du deck sont des plafonds potentiels sur cinq cartes du plateau, pas des bonus actifs sur les dix cartes de la liste.

Apres la fin de l'animation d'un duel, le bouton **Tour suivant** devient disponible. Le resultat, le detail du calcul et les des restent affiches sans limite de temps jusqu'au clic. Les cartes restent mises en avant pour la lecture, puis reviennent en formation au passage suivant. Navigation, fiches et rechargement conservent le resultat en attente. Le minuteur, son bouton pause et son ancien reglage ont ete retires ; une ancienne preference `autoAdvance` n'a plus aucun effet. Les actions de l'IA et la seconde chance du trefle restent automatiques pendant le duel.

Les reserves disposent d'un grand apercu au survol, au focus clavier ou au toucher, avec commandes de deploiement. Le glisser-deposer reste disponible pendant la formation. Lors d'un remplacement, les cartes compatibles avec le poste libre selectionne sont surlignees ; les autres sont attenuees. Les cartes adverses IA restent cachees.

L'oeil d'inspection est en bas a droite. Le cadre central utilise des bordures et materiaux CSS adaptes aux seize arenes, sans etirer une image de carte. Le bandeau affiche les kills de chaque camp : dix eliminations definitives donnent la victoire ; un Reraise ne compte pas comme kill. Le match nul de demonstration a 200 echanges est conserve.

Les bibliotheques de decks sont de petits JSON dans `localStorage`, sous `kalistar.v3.deckLibrary.user-paris` et `kalistar.v3.deckLibrary.user-tokyo`. Leur export/import se trouve dans la page Decks. Elles sont distinctes de la sauvegarde IndexedDB du registre et des statistiques : exporter les deux pour une sauvegarde complete de l'experience. Les droits de propriete sont toujours reverifies par le registre lors du lancement d'une partie.

Cette revision ne modifie aucune illustration, carte imprimee, arme ou statistique de profil. Verification actuelle du passage manuel : `verification-flow/TOUR_SUIVANT.md` et `scripts/verify_flow_decks_ui.cjs`. `verification-flow/BILAN.md` conserve le bilan de la premiere passe avec enchainement automatique.

## Fichiers des cartes

- `templates/<slug>.psd` : carte editable, calques de contenu, illustration, element, positions, statistiques et bande de version separes.
- `impression/<slug>.tif` : 897 x 1497 pixels, 300 ppp, CMJN avec le profil du gabarit source. La zone noire d'impression est conservee. Le profil d'impression definitif reste a confirmer avec l'imprimeur.
- `cartes/<slug>.png` : meme format physique, export RVB sRGB.
- `site/assets/cards/<slug>-full.png` : carte jeu 797 x 1388 pixels, recadree sans modifier l'original d'impression.
- `assets/illustrations/<slug>.png` : illustration seule. Les deux Momo, Taulio, Zviri, Aelis et Cana sont des copies strictement identiques aux sources V2, avec empreintes dans `donnees/illustrations_verrouillees.json`.

Les vingt armes originales, les effets et les emblemes de race sont des PNG transparents. Les codes-barres Code128 sont uniques, avec une version couleur et une version noir et blanc. Les deux series sont controlees par decodage.

## Revision Active : Buffs Et Scenes

La revision `buffs-scenes-20260914` remplace les choix de la passe graphique precedente pour les cibles demandees : onze illustrations, dix-neuf emblemes de race riches et sculptes, vingt silhouettes d'armes blanches orientees vers l'exterieur et une capsule MINERO en pierre. Les trente autres illustrations, dont les deux Momo, Taulio, Zviri, Aelis, Cana, Voloden et Valazar violet, restent identiques.

L'original maritime de Skully a ete retrouve dans le calque 873 du PSD source et extrait sans modifier le document. Les scenes et textes sont versionnes dans `donnees/revision_buffs_scenes_profils.json`. Elenion passe du fleau a l'arc ; ses chiffres, postes et identifiants sont conserves. La matrice des armes reste identique.

Les sources avant cette nouvelle passe sont dans `sources/avant-buffs-scenes-20260914`. Les manifestes `donnees/revision_buffs_scenes_*.json` conservent les prompts complets, references, essais rejetes, sorties natives et controles. Le controle de revision active est `scripts/verify_buffs_scenes.cjs`, complete par les tests moteur, impression, navigateur et BDD listes plus bas. Bilan final : `verification/REVISION_BUFFS_SCENES.md`. Apercu : `verification/buffs-scenes-apercu.jpg`.

## Harmonisation Precedente

Cette section decrit la passe anterieure et ses rapports historiques. Les choix ci-dessus et le contrat de gameplay actuel sont prioritaires. `verify_harmonisation.cjs` conserve volontairement les empreintes de cette ancienne passe ; utiliser `verify_buffs_scenes.cjs` pour la revision courante.

La revision du 14 septembre 2026 conserve le set, ses identifiants et ses regles. Les logements arme/race passent de 98 a 126 pixels de diametre exterieur, avec ajustement circulaire de chaque symbole sans deformation. Le filet elementaire passe derriere les logements, sans les traverser.

L'Instrument d'index 11 utilise une guitare de base ; la matrice d'armes ne change pas. La flute speciale de Momo reste une evolution future, et ses illustrations conservent leur flute actuelle. Les dix-neuf races utilisent un embleme commun par race, dont la silhouette Humain et le coeur noir Cardemortis. NONE utilise un cristal eteint dans un hexagone dore. MINERO et GEO ont deux auras de pierre distinctes, plus lisibles.

La direction picturale est formalisee dans `sources/DIRECTION_ARTISTIQUE_KALISTAR.md`. Kaylis, Lanio et Malaba suivent les scenes demandees ; Valazar conserve sa scene avec les tissus devenus violets. Voloden et les six illustrations deja verrouillees restent identiques. Les retouches des autres personnages conservent leurs scenes propres, sans leur imposer une palette unique.

Les sources avant retouche sont conservees dans `sources/avant-harmonisation-20260914`. Les manifestes `donnees/harmonisation_*_20260914.json` font foi pour les prompts et fichiers de cette revision ; les prompts initiaux du repertoire restent une provenance historique. `scripts/prepare_card_inputs.cjs` ne remplace plus une illustration canonique existante par une ancienne scene.

Le controle `scripts/verify_harmonisation.cjs` verifie les empreintes des illustrations protegees, les 57 assets revises, les donnees de jeu inchangees et la fraicheur des exports natifs, des cartes du site et des illustrations de popup. Les prototypes restent dans `verification/harmonisation-prototype`, hors des 41 cartes finales.

Revision graphique validee : 34 illustrations retouchees, sept conservees, 19 emblemes de race, guitare, cristal NONE et deux auras de pierre. Les 41 PSD/TIFF/PNG et les images du site ont ete reconstruits. Les 123 decodages Code128, les controles de formats/recadrages et les 13 groupes de tests navigateur passent. Bilan detaille dans `verification/HARMONISATION_V3.md` et apercu dans `verification/harmonisation-apercu.jpg`. Recharger l'onglet existant pour actualiser les visuels, sans effacer les donnees du navigateur.

## Regles De Cette Edition

Les chiffres ci-dessous sont des choix d'equilibrage V3 documentes, a ajuster apres les essais de jeu.

- Cumul : Garde, Trefle, Reraise, potion magique et puissance physique peuvent coexister. Une seule charge de chaque categorie ; une nouvelle attribution identique n'en ajoute pas une seconde.
- Garde : une face ATK de tank ou de certains supports attribue +60 DEF physique a un allie vivant. Le trait est consomme a la premiere defense numerique face a une attaque physique et reste compte lors des relances du meme duel. La magie, l'esquive et Mort ne le consomment pas ; Mort le contourne.
- Ordre automatique : Garde dans le score DEF, Trefle si le score est insuffisant, puis Reraise si la carte reste battue. Mort contourne Garde et Trefle, mais pas Reraise.
- Puissance physique : comme la potion magique, choix d'un allie vivant du plateau, auteur compris. +60 sur sa prochaine attaque numerique du type correspondant. Les autres buffs ne sont pas effaces.
- Reraise : uniquement les soigneurs P5, attribuable a un allie vivant. Il protege contre une elimination, sans choisir une carte du cimetiere.
- Cristal classique contre sans-cristal : +20 ATK. Rainbow contre sans-cristal : +30 ATK. Sans-cristal n'accorde aucun bonus elementaire.
- Arene elementaire : +15 ATK pour le cristal concerne. Affinite de personnage : +10 ATK et +10 DEF. Les deux camps suivent les memes regles. Le terrain est verrouille au debut du match.
- Matrice des vingt armes et cycles elementaires V2 conserves. Aucun Chaos dans ce set.

Les sources, corrections du classeur et choix narratifs sont distingues dans `sources/DECISIONS_NARRATIVES.md`. Les donnees des postes sont controlees contre les bornes de Capacite base.

Historique d'equilibrage, avant l'ajustement des decks a deux compatibles par poste : un echantillon deterministe de 640 matchs IA contre IA avec les buffs cumulables sur les cinq anciens decks et les seize arenes se termine sans blocage. Les taux de victoire vont de 34.8 a 64.5 pour cent ; l'ancien deck initial est a 54.3 pour cent. Ces valeurs ne decrivent pas les nouveaux decks. Aucune statistique de carte n'a ete reajustee silencieusement. Ce controle automatise ne remplace pas l'equilibrage par des parties humaines. Resultats historiques dans `verification/balance-simulation.json`.

## Lisibilite Du Jeu Et Des Decks

Preference d'interface : privilegier les onglets et la pagination plutot que les zones a defilement. La composition des decks doit tenir dans un seul ecran, sans defilement. Si le defilement reste necessaire ailleurs (plateau mobile), conserver la navigation tactile/clavier mais masquer les barres.

Le bilan utilise les onglets Palmares, Equipes, Feuille et Decompte. Les pages s'adaptent a la hauteur disponible ; elles couvrent tous les exemplaires du match, y compris les reserves et les cartes eliminees. Les miniatures et les noms partagent un alignement fixe. Les six compteurs principaux ont la meme iconographie dans la feuille et sous les cartes engagees en duel : kills, stops, somme ATK, somme DEF, trefles accordes et Reraise accordes. Ces derniers mesurent l'attribution par l'auteur (allie ou lui-meme), pas la consommation ; les renouvellements identiques sont exclus. Les consommations restent accessibles dans Complements. Les statistiques affichees sous les combattants concernent uniquement leur UID dans la rencontre actuelle, jamais leur carriere globale. Un historique incomplet est signale.

Les reserves affichent le PNG haute definition a une taille adaptee a presque toute la hauteur de l'ecran. Le bouton Tour suivant reste manuel.

## Palmares Illustre

Le bilan de rencontre utilise une grande fenetre adaptee a l'ecran. Le score distingue les deux camps dans leur ordre de plateau. Le MVP dispose d'une grande illustration et de ses kills, stops, scores ATK et DEF ; les quatre autres distinctions mettent en avant Finisseur, Rempart, Soutien et Entrave. Les illustrations sont celles de la revision graphique actuelle, sans modification des cartes imprimees.

Sur petit ecran, une barre de distinctions permet de consulter les cinq portraits successivement. La navigation des ex aequo est conservee : tous les gagnants restent accessibles. Les onglets Equipes, Feuille et Decompte conservent leurs comparaisons, tris, filtres et pages sans defilement. Les fleches clavier parcourent les onglets et la selection de distinction.

Le palmares ne modifie aucun calcul. Les valeurs proviennent de la rencontre, pas de la carriere globale ; le soutien reste credite a l'auteur du buff. Les fiches archivees gardent leurs anciens noms et titres, et le bandeau utilise le nom historique de l'arene. Exporter le bilan, revoir le plateau ou ouvrir le formulaire de nouvelle rencontre ne change pas la partie terminee. Les animations sont courtes et desactivees avec la preference de mouvements reduits.

Controles : `site/match-report.test.cjs`, `scripts/verify_palmares_ui.cjs` et `scripts/verify_match_readability_ui.cjs`. Captures et rapport du palmares dans `verification-palmares/`.

## Ecran Escouade

La page Decks adopte une composition plein ecran sur le decor de l'arene : dix emplacements en deux rangees de cinq, liens de synergie sur la composition, panneau de factions ou races a gauche, grande carte a droite et recrutement permanent en bas. Sur petit ecran, les onglets Composition, Synergies et Carte partagent la zone principale sans defilement ; le recrutement reste disponible.

Une carte du recrutement peut etre glissee directement dans un emplacement. Les destinations legales s'allument, les autres sont estompees ; la disponibilite est reverifiee au depot. Les cartes du deck peuvent echanger leurs positions par glisser-deposer, souris ou tactile, ou via les poignees au clavier. Un depot hors du deck, Echap, une annulation tactile ou un changement externe de composition annule le deplacement. L'ordre est conserve dans le brouillon et dans le deck enregistre.

Les fleches en haut changent rapidement de deck. Le nom et l'enregistrement restent accessibles ; duplication, nouveau deck, suppression confirmee et export/import sont regroupes dans le menu de gestion. La limite reste de dix decks par profil. Les filtres avances s'ouvrent dans le recrutement ; les postes et les groupes de synergies peuvent aussi servir de filtres directs. Les cartes candidates affichent le gain de potentiel pour le slot selectionne, et le visualiseur affiche la couverture gagnee ou perdue. Les liens n'ajoutent aucune regle d'adjacence : les bonus restent ceux du moteur, calcules sur cinq cartes en jeu.

Les images haute definition, les proprietaires, la BDD et les regles du jeu ne changent pas. Les controles de cette revision se trouvent dans `verification-squad/` et `scripts/verify_squad_ui.cjs`.

## Classeur De Collection

La collection utilise des doubles pages qui tiennent dans l'ecran : huit personnages sur grand ecran, quatre si la hauteur est reduite, deux sur mobile. Les versions d'un personnage sont superposees dans la meme pochette. Une version favorite est mise en couverture par defaut si aucune autre n'a ete choisie dans la session.

Un clic ouvre la consultation plein ecran : carte haute definition ou illustration complete, avec les onglets Recit, Fiche, Carriere et Exemplaires. Recits, rencontres et listes d'exemplaires sont pagines sans zone a defilement. Les fleches permettent de parcourir les cartes du resultat courant ; le retour au classeur conserve la double page. Les filtres et les favoris n'affectent pas le deck. La construction du deck reste dans l'onglet Decks.

Les animations de feuilletage et de consultation sont courtes, sans boucle, et desactivees avec la preference systeme de mouvements reduits. La collection est limitee aux possessions du profil par defaut ; Catalogue permet aussi de consulter les versions non possedees, identifiees comme telles. L'acces aux exemplaires, transferts, activation et sauvegardes reprend les controles du registre local existant.

Les donnees des cartes, leurs illustrations, le moteur et la BDD ne changent pas. Verification du classeur : `scripts/verify_collection_ui.cjs`, `site/collection-binder.test.cjs`, captures dans `verification-collection/`.

## Base Locale

La BDD est une base IndexedDB nommee `kalistar-v3-cards`, dans le profil du navigateur utilise pour jouer, et non un fichier SQLite dans ce dossier. L'inspecteur de la collection permet de consulter les cartes, exemplaires, rencontres et performances. L'export de la collection cree une sauvegarde JSON transportable.

Le bouton Paris/Tokyo en haut ouvre le registre : exemplaires, transferts, activation, atelier d'emission et stockage. Au premier chargement de cette revision, Paris (`guillaumeprevost.paris@gmail.com`) recoit un exemplaire de chacune des 41 versions ; Tokyo (`guillaumeprevost.tokyo@gmail.com`) n'en possede aucun. Ce sont des profils locaux, pas des comptes Gmail authentifies. Un rechargement ne reattribue pas les cartes transferees.

Chaque objet de collection porte maintenant un identifiant public permanent aleatoire `KC-` suivi de 32 caracteres hexadecimaux. Les anciens `K3-<identifiant carte>-001` restent les identifiants internes du moteur et des archives, pas une preuve de propriete. La nouvelle table `collectibles` est distincte de `instances` : les cartes virtuelles adverses ne creent jamais d'exemplaires possedes. Les statistiques des nouveaux matchs sont reliees aux exemplaires ; l'historique ancien du joueur 1 suit l'exemplaire initial correspondant.

Un transfert conserve l'identifiant et la carriere. Il requiert une proposition du proprietaire puis l'acceptation du destinataire ; annulation et refus sont possibles. Les cartes engagees dans une partie liee non terminee sont bloquees jusqu'a sa fin ou son abandon explicite. Les nouvelles parties verifient les exemplaires disponibles dans le profil, ainsi que les regles du deck.

L'atelier Paris peut emettre un exemplaire supplementaire non attribue. Son code d'activation secret, distinct de l'identifiant public, n'est affiche qu'une fois et peut etre telecharge dans un bon separe. Seule son empreinte SHA-256 est stockee. Il n'y a aucun code a distribuer pour les 41 cartes deja attribuees initialement. Les images et codes-barres imprimes existants ne sont pas modifies : ils identifient une version, pas encore son exemplaire physique. Voir `REGISTRE_LOCAL.md` pour les parcours, les limites et la future impression.

La sauvegarde JSON schema 3 inclut le registre et les archives. Seul le profil administrateur Paris expose la restauration complete, avec confirmation explicite car elle peut revenir a d'anciens proprietaires ou etats d'activation. Les imports historiques schema 2 restent possibles sans recreer de propriete. Les sauvegardes V2 restent refusees.

Le bilan et la fiche ouverts depuis un match archive utilisent son profil historique, y compris apres un changement de titre, de texte ou d'arme. Les images ne sont pas dupliquees dans IndexedDB : la fiche indique explicitement que son visuel est celui de la revision actuelle.

Ne pas effacer les donnees du navigateur sans exporter la collection. Changer de navigateur ou de profil ne deplace pas automatiquement la BDD.

Cette revision ajoute `users`, `collectibles`, `activations`, `transfers`, `events` et `registryMeta` a la base V3 existante, sans supprimer `versions`, `instances`, `matches` ni `results`. Migration, claims/transferts concurrents, refus atomiques et conservation des archives sont verifies par `scripts/verify_ownership_db.cjs`. Le parcours visuel et les profils sont verifies par `scripts/verify_ownership_ui.cjs` ; resultats dans `verification-ownership`.

Le controle graphique `verify_buffs_scenes.cjs` reste un temoignage de la passe precedente : il exige notamment l'ancienne empreinte de `local-db.js`, qui a volontairement change pour ce registre. Ses rapports graphiques restent valables pour les assets inchanges ; il ne constitue plus un controle global de la revision applicative actuelle.

## Production Et Controles

`donnees/cartes.json` contient les contenus dynamiques. Le generateur de repertoire est `scripts/build_repertoire.cjs` ; toute modification manuelle durable de son resultat doit etre reportee dans ce generateur avant de le relancer.

`scripts/build_cards.jsx` assemble les cartes dans Photoshop a partir de `sources/template-source.psd` et de `scripts/version_band.jsx`. `donnees/build_config.json` permet de limiter un rendu aux identifiants choisis. `scripts/build_game_bundle.cjs` reconstruit ensuite les images recadrees et les donnees du site. L'option `--data-only` actualise uniquement `site/data.js`, sans toucher aux images.

Les manifestes `donnees/generation_*_manifest.json` conservent les prompts, fichiers sources et controles des images generees avec l'outil integre. Aucune API de generation payante supplementaire n'a ete configuree.

Controles reproductibles : `scripts/testsrepertoire.test.cjs`, tests moteur dans `site/*.test.cjs` dont `site/buff-stacking.test.cjs`, `scripts/verify_buffs_scenes.cjs`, `scripts/verify_barcodes.py --require-prints`, `scripts/verify_outputs.cjs`, `scripts/verify_db_engine_contract.cjs`, `scripts/verify_stacked_buffs_ui.cjs`, `scripts/verify_presets_v3.cjs` et `scripts/verify_site_v3.cjs --require-final --require-assets`.

Controle final de la revision buffs-scenes du 14 septembre 2026 : 41 PSD, 41 TIFF CMJN 300 ppp et 41 PNG reconstruits ; 41 cartes jeu recadrees ; trente illustrations conservees, dont les six verrouillees V2 avec cadrage identique. Les 51 assets revises et les 123 lectures de codes-barres passent. Le site final passe 13 groupes de controles et les buffs/archives 23 scenarios, sans asset absent ni erreur navigateur. Les tests BDD et presets passent egalement. Rapports dans `verification`, `verification-site` et `verification-buffs`.

Le prototype de bande de version est archive dans `verification/PROTOTYPE_MOMO.psd` ; il ne fait pas partie du set de 41 cartes.
