# Kalistar 4.7.9 - Terrains Astraball

## Livraison

- Dix-neuf decors HD-2D pixel : street et officiel pour les huit villes de
  l'atlas et Zarok, plus l'Astrium a Kalistopolis. Les deux terrains classiques
  restent disponibles avec leur vraie vue isometrique.
- Stades vides, sans public ni personnages peints. Echelle des gradins coherente
  entre lieux ; l'Astrium s'agrandit par ses tiers de tribunes, sans ville en fond.
- Sept bannieres de faction copiees a l'identique depuis les assets verrouilles.
  Kalistopolis, Velane et l'Astrium restent neutres, sans embleme invente.
- Un but U ouvert par camp, deux poteaux relies au sol. Blanc en officiel,
  materiaux locaux en street. Les trois cibles logiques restent inchangees.
- Grille discrete et contour plus lisible des cases accessibles.
- Zoom uniforme a la molette, glisser et pincement tactile avec bornes d'image.
  Le reglage vertical cadre la scene pixel sans comprimer son architecture.
- Vestiaire filtre par ville/type, miniatures legeres, noms adaptables et
  bascule isometrique reservee aux classiques.

Aucune modification du moteur, des statistiques, de la base de donnees, de la
progression ou du schema des sauvegardes. Le calibrage des sprites 4.7.8 reste
en place. Le nouveau decor par defaut est le Stade du sanctuaire ; les parties
existantes gardent leur terrain valide.

## Sources Et Performance

[Catalogue et contrat](../../astraball/ARENAS.md) et
[sources, prompts et exports](../../astraball/sources/arenas-pixel-v1/README.md).
Les PNG originaux et les sept drapeaux sont sauvegardes hors checkout dans
`C:/Users/guill/Documents/Kalistar-sauvegardes/astraball-arenas-pixel-v1/`.
Git ne recoit que code, documents et empreintes. Le registre runtime ajoute
38 WebP (19 fonds 1536 x 1024 et 19 miniatures 384 x 256) et sept petits PNG,
soit 12 809 173 octets pour l'ensemble. Un controle relit 116 fichiers
source/export/sauvegarde et confirme leurs empreintes reelles.

Seuls les fonds du lieu courant et du lieu entrant restent en cache Pixi,
pas les 19 grandes images. L'idle partage reste limite a quatre mises a jour
par seconde ; les decors sont statiques, sans filtre ni particules permanents.
Reduced Motion et pause en onglet masque sont conserves.

Les fonds gardent leur ratio : l'apercu global peut laisser des marges sur un
ecran tres etroit. Le zoom tactile montre une partie du terrain et permet de
le parcourir, sans etirer ses bords. Ce lot reste un rendu 2D, pas une camera 3D.

## Validation

Les preuves de ce lot sont sous `work/astraball/` et la copie figee de livraison
sous `work/publication/`. Les tests utilisent des profils navigateur jetables,
jamais les comptes ou sauvegardes personnels.

La livraison ne sera annoncee en ligne qu'apres validation des suites completes,
du build fige, du push personnel et du deploiement Cloudflare.

Controles source effectues :

- 37 tests camera pure et quatre tests catalogue/provenance/cibles/drapeaux.
- Camera navigateur : cinq formats, molette, ancrage, bornes, glisser,
  pincement, annulation tactile, clics apres geste, Reduced Motion et idle.
- 22 captures de lieux : les 19 sur PC et trois sur Razr. Dix-huit changements
  de lieu dans la meme session sans reload gardent au plus deux lieux charges.
- Vestiaire : quatre formats, filtres ville/type, choix clavier, absence de
  debordement, compatibilite des vues, reprise et persistance.
- Interface Astraball : cinq formats, 269 apparences, formation, interception,
  charge et but, sauvegarde/rechargement.
- Calibrage sprites : PC, Razr et compact, six projections, clips, deplacement
  et selection. Les tailles et ancrages 4.7.8 restent inchanges.
- Inspection humaine des fonds et captures representatives apres integration.

Preuves : `work/astraball/camera-goals-instrumented/results.json`,
`work/astraball/venue-locker/results.json`,
`work/astraball/ui-worker-interface/results.json` et les journaux `pixel-*`.
Les premiers essais ont detecte un debordement de nom mobile et deux assertions
de version restees en 4.7.8 ; ces erreurs ont ete corrigees sans assouplir les tests.

Suites completes sur ce poste : `maintenance/validate.cjs --suite ci` termine
ses 104 invocations avec 2041 tests reussis, zero echec et deux tests optionnels
ignores (comparaison de politiques et ancienne fixture navigateur de reliques).
`--suite local` termine ses 14 invocations avec 154 tests reussis. L'acces
localhost refuse dans le bac a sable a necessite une relance locale autorisee.
Le build de cette livraison utilise `CF_PAGES=1`, comme le deploiement existant,
et non le plafond historique 900 Mio du mode GitHub Pages.
