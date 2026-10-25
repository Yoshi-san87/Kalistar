# Kalistar 4.7.2 - Deux vues, six Astraballs

## Perimetre

- Vue HD-2D horizontale par defaut, avec quadrillage rectangulaire et hauteur
  reglable. Vue isometrique precedente conservee, accessible dans le vestiaire
  ou par le bouton camera. Aucun remplacement de son illustration.
- Plan de sol, surbrillances, trajectoires, sprites et clics partagent la meme
  projection. Les sprites restent debout quand la profondeur du sol change.
- Zones des Piliers alignees exactement sur les trois colonnes autorisees :
  bornes 1/4 pour Chroma et 9/12 pour Obsidienne, derivees du moteur.
  Le remplissage, le contour colore et les limites des cases coincident.
- Six ballons d'apres la planche de l'auteur : Fondateurs, Noyau orbital,
  Tissage celeste, Rempart Rhinoz, Harmonie Cerelf, Edition Ligue.
- Premier coup d'envoi : choix du ballon avec apercu, mode de rencontre,
  camera, sons et animations. Une sauvegarde existante reprend directement.
  Les ballons restent selectionnables dans le vestiaire en cours de match.
- Textures du ballon utilisees sur le terrain, rotation et trainee teintee
  pendant les lancers. Choix conserve au rechargement, sans bonus de jeu.
- Tactile : suivi du joueur actif, deplacement manuel et recentrage conserves.
  Une case accessible reste cliquable meme si le sprite devant la recouvre.

Le moteur, les equipes/statistiques et l'IA restent inchanges. Pas de migration
Supabase, de recompense, de reset des matchs personnels ni de modification
des cartes, Fragments, sources approuvees ou verrous natifs.

## Medias Et Performance

Generation avec image_gen integre, puis redimensionnement/exports Sharp.
Sources et prompts : [visuals-v2](../../astraball/sources/visuals-v2/prompts.json).
Empreintes : [rapport](../../astraball/sources/visuals-v2/media-report.json).
Le [guide](../../astraball/README.md) explique le pipeline reproductible.

Six WebP transparents de 256 x 256 : 192 618 octets. Decor horizontal de
1536 x 1024 : 588 990 octets. Ajout total : 781 608 octets, sans nouveau
bundle, shader, filtre permanent ou boucle de rendu au repos.
Les trois plans du decor partagent une seule texture. Aucune regeneration
graphique n'est executee a l'ouverture du jeu.

Les dix fichiers source/metadonnees et le preparateur sont sauvegardes sous
`Documents/Sauvegardes-Kalistar/2026-10-25-astraball-visuals-v2/`.
Les dix copies source sont verifiees par SHA-256. Les images restent hors
Git/LFS ; code, prompts, rapports et registre runtime sont versionnes.

Le rendu horizontal est une scene 2D a plans superposes, pas une camera 3D
libre. Les personnages restent en deux orientations miroir.

## Verification

- Suite `ci` complete : 103 invocations reussies, 1 952 tests passes,
  deux cas optionnels ignores par leur configuration existante.
- Suite `local` complete : 14 invocations reussies, y compris les bases
  PostgreSQL jetables. Aucun acces a la base de production.
- Site construit : 462 cartes ; Collection, lecteur, export PNG, Decks,
  Arene et reprise de sauvegarde verifies sur PC et telephone.
- Astraball : 89 tests de regles, IA, sauvegardes, projection, assets et build.
- Cases : centres et points proches des coins dans les deux vues, a quatre
  hauteurs ; correspondance exacte avec les zones autorisees des Piliers.
- Chrome : 1440 x 900, 1920 x 1080, Razr 412 x 915, compact 360 x 800,
  paysage 915 x 412 ; aucun debordement ou erreur console constate.
- Six ballons : alpha, budget, selection reelle, texture sur le terrain,
  persistance et deplacements reels dans les deux vues a hauteur basse/haute.
- Controle des 160 sprites preserve ; course animee, passe interceptee,
  charge avec recul et retard, but a deux points et victoire.
- Etat de partie identique avant/apres les changements de camera, six labels
  de U apres chaque changement, reprise et profils factices isoles.
- Reduced Motion et tactile normal a densite 2x. Zero redraw sur 800 ms
  au repos ; quatre frames de course observees et budget de rendu respecte.
  Ces mesures Chrome locales ne garantissent pas les FPS sur tout appareil.

Les premieres passes navigateur ont revele un clic masque par un sprite dans
la nouvelle vue, corrige au niveau du ciblage. Les radios ont ensuite ete
testees via leur tuile visible, et l'alpha du coeur de verre est accepte comme
translucide. Les scenarios complets ont ete relances avec succes.

Preuves locales : `work/astraball/visuals-v2/`.
La suite complete, le build fige et l'acces heberge sont controles avant
l'annonce de publication du tag annote `v4.7.2` sur Kalistar personnel.
