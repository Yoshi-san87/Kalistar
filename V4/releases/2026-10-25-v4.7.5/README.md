# Kalistar 4.7.5 - Vestiaire Et Zarok

## Perimetre

- Vestiaire Astraball : Equipes, Ballon, Arene ; PC, Razr, compact et paysage.
- Trente personnages disponibles, cinq postes par camp, recherche, melange et
  restauration des compositions. Selectionner une identite deja presente
  echange les postes. Les statistiques restent celles des postes, symetriques.
- Cour des resonances conservee ; Terrain de Zarok ajoute en HD-2D/isometrique.
  Sable compact, lignes blanches moteur, architecture Rhinoz d'apres Lanio :
  roche, bois, cordes, ardoise et lanternes. Pas de decor desertique generique.
- Six ballons conserves. Choix visuels sans effet sur les probabilites.
- Brouillon du vestiaire independant de la partie. Une rencontre existante ne
  change d'equipe qu'au lancement explicite d'un nouveau match. Le chargement
  des medias precede le remplacement ; un echec conserve le match et autorise
  une nouvelle tentative. Les sauvegardes existantes restent compatibles.
- Idle partage a 4 Hz conserve, suspendu dans le vestiaire et en onglet masque.
  Les vignettes du vestiaire sont statiques. Pas de nouveau ticker permanent.
- Cadre de selection conserve lors des changements de camera ; epaisseur
  minimale des lignes blanches en vue eloignee sur smartphone.

## Medias

Les deux nouvelles peintures publiques WebP totalisent 1 100 688 octets.
Les versions sources 2 sont retenues, les versions 1 restent des essais locaux.
Generations avec image_gen integre, references canoniques Lanio et Belrog.
Consignes et hashes : [sources Rhinoz](../../astraball/sources/rhinoz-v1/README.md).
Backup hors checkout verifie SHA-256 dans
`Documents/Sauvegardes-Kalistar/2026-10-25-astraball-rhinoz-v1/`.
Git ne contient que le code, les consignes et les empreintes.

## Verification

Preuves locales : `work/astraball/locker/`.

- 116 tests Astraball : postes, 30 apparences, compositions invalides,
  echanges, sauvegardes et 20 simulations completes de compositions variees.
- Playwright : 1440x900, 1920x1080, 412x915, 360x800 et 915x412 ;
  choix des deux camps, six ballons, deux vues, lignes blanches visibles,
  absence de debordement, annulation, reprise, sauvegarde/reload.
- Trente apparences lancees successivement, dix sprites presents a chaque fois.
- Panne de chargement d'arene simulee puis nouvelle tentative reussie,
  sans perte de la rencontre precedente.
- Regression actions, placement, interception, charge, but, animations normales
  et Reduced Motion ; profils de navigateur jetables uniquement.
- Regression du site construit : Collection, Story, Decks, Arene, reprise de
  match, version PC/phone et telechargement de carte.

- Suite CI complete : 104 invocations, 1 985 tests reussis, 2 ignores, aucun echec.
- Suite locale complete : 14 invocations, 154 tests reussis, aucun echec.
- Controle d'organisation apres staging : conforme. Build Cloudflare local :
  462 cartes, 1 663 fichiers, 1 120,6 Mio, aucun depassement de fichier.

Le build fige du commit
est reteste avant l'envoi Cloudflare, sans inclure les brouillons des autres
taches. Aucun changement Supabase, Cloudflare Access ou donnees Paris/Tokyo.

## Limites

Exhibition locale, sans matchmaking ni attribution de carte. Les trente choix
sont les sprites disponibles, pas tout le catalogue de cartes. Les controles
Razr sont emules sous Chrome, pas mesures sur le telephone physique. Les
simulations verifient les invariants et ne prouvent pas l'equilibre competitif.
