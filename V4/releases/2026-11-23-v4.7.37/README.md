# Kalistar 4.7.37 - Album et menu stabilises

Correction du rendu 4.7.35 par comparaison avec le concept choisi et la
capture PC de l'auteur. Le lot Map 1.40 reste celui du parent 4.7.36.

## Presentation

- Livre physique a ratio conserve, determine par le rectangle
  disponible et non une liste de modeles de telephones.
- Douze pochettes : double page PC et folio 3 x 4 sur telephone vertical.
  Cartes natives plus presentes, contour plastique fin,
  pas de plaque opaque claire derriere le livre.
- Pagination attachee au livre avec une reserve de hauteur tactile.
- Outils du lecteur repliables dans un dialogue natif sur ecran bas,
  lecture immersive et restitution du menu au Retour a l'album.
- En-tete en grille reservee et sticky, commandes plus sobres et cadre actif
  seulement pour la destination selectionnee.
- Focus de filtre par valeur du radio et scroll du dialogue conserves.

Pas de modification des regles, des identites de carte, des droits ou des
sauvegardes. Quatre nouveaux WebP prepares (1 236 356 octets ensemble) ; aucun
ancien media modifie et aucun binaire ajoute a Git. Sources et prompts :
`../../revisions/2026-11-22-album-layout-lock/`.

## Verification

- Suite complete locale : 107 invocations, 2 318 tests passes ; les 14
  invocations natives supplementaires et les 32 contrats cibles passent aussi.
- Lecteur : huit formats, verification de chaque caractere du long recit,
  clavier/tactile, douze slots, versions, PNG natif, animation et annulation.
- Regressions PC/mobile, Map/Book, Decks, filtres et Catalogue verifiees dans
  des profils jetables ; PostgreSQL isole pour les acquisitions et droits.
- HUD : 23 cas dedies, dont zoom et composition hebergee, plus les contrats
  et regressions historiques de navigation.

La matrice de geometrie couvre 320 a 3 440 px CSS et 360 a 1 440 px de hauteur,
des tailles intermediaires, les seuils CSS et des viewports/DPR simulant le zoom
125/150/200 %. Six pivots approfondissent pages, texte, filtres et outils ;
les autres points echantillonnent debut/milieu/fin et page vide. Les tailles
hors domaine CSS minimum sont signalees comme diagnostics, pas comme passes.

Preuves dans `work/qa/album-repair/`. Le build exact du commit est controle
avant Cloudflare ; login anonyme PC/Razr et empreinte de version controles
ensuite. Aucun test n'utilise les mots de passe ou les sauvegardes personnels.
