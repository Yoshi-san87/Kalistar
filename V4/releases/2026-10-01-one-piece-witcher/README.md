# One Piece / The Witcher - V4.3

Lot commence le 1 octobre 2026, controles termines le 2 octobre. Publication
partielle explicite : 14 nouvelles cartes et la revision de Luffy, soit 189
cartes jouables et 28 arenes inchangees. Les deux Geralt et Vesemir ne sont
pas publies : le service image a refuse leurs illustrations, y compris les
scenes paisibles. Aucun placeholder ni profil sans PSD verifie n'est installe.

## Production Et Sources

- [Selection publiee et cartes en attente](../../expansions/2026-10-01-one-piece-witcher/publication-selection.json).
- [Profils demandes, valeurs individualisees et descriptions](../../expansions/2026-10-01-one-piece-witcher/set.json).
- [Audit des sources, profils, rendu et preservation](audit.json).
- [Planche des quinze cartes controlees](contact.png).
- Prompts exacts, references et hashes des illustrations : `art-prompts/*.json`.
  Methode : outil integre `image_gen`, pas de CLI/API ni generation de carte
  complete. Images selectionnees dans `V4/Illustrations/OP_*_01.png` et
  `V4/Illustrations/TW_*_01.png`, toutes embarquees dans leurs PSD.
- Essais refuses conserves en texte dans `art-attempts/`; les identifiants du
  service sont dans la selection. Il n'existe pas d'image selectionnee pour
  Geralt ou Vesemir. Reprise : fournir/generer les images, puis un nouveau lot
  additif avec une preservation figee sur les 189 cartes actuelles. Ne pas
  refiger les anciennes empreintes pour masquer Luffy ou la publication.

One Piece : nouvelle version de Sanji en costume noir ; Shanks, Ace, Law,
Hancock, Koby, Baggy, Alvida, Mihawk, Arlong. Sanji conserve `sanji-op` et
l'exclusion des variantes dans un deck. Koby reste NONE/P5 : ni magie ni
barriere, hexagone eteint verifie. Arlong est SHARKAN. Bannieres et race
existantes reutilisees, pas de nouveau design du cadre.

The Witcher : Ciri, Yennefer, Triss et Dandelion, tenues inspirees des jeux,
peinture narrative Kalistar et proportions humaines. Banniere WITCHER et
filtre dedie ; alpha et geometrie de l'etendard FF8 preserves exactement.
Les deux profils Geralt prepares partagent leur characterId. Aucun deck
purement Witcher n'est ajoute : la collection ne couvre pas les conditions
d'un deck complet.

References canoniques : [site officiel One Piece](https://one-piece.com/character/),
[The Witcher 3](https://www.thewitcher.com/_next/witcher3),
[Ciri](https://www.thewitcher.com/us/en/news/826/ciri-the-girl-from-the-prophecy),
[Geralt et Dandelion](https://www.playgwent.com/en/news/35971/journey-1-story).
Les pages indexees servent aux choix canoniques ; aucune image inaccessible
n'est declaree examinee. Momo, Valazar et Leon RE4 sont les references locales
visuellement consultees pour peinture et anatomie, pas des identites a copier.

## Photoshop Et Gameplay

Photoshop 26.11.7, texte natif editable, objets dynamiques embarques, 897x1497
pixels a 300dpi. Cadre issu des composants approuves ; illustration independante.
Les PSD et PNG actifs sont `V4/creations/<id>/card.psd` et `card.png`. Preuves
natives, reouverture et preparations dans le lot `expansions/.../cards/<key>/`.

Les limites de role ne sont pas copiees comme valeurs imposees : 17 profils
authores et distincts, dont les trois demandes encore en attente. Le moteur,
la sauvegarde et le schema V4 ne changent pas. Les effets restent aux faces
declarees, Reraise seulement sur le role Support P5, garde seulement P1/P5.

Luffy : [revision native documentee](../../revisions/2026-10-01-luffy-light/README.md).
LUXO, D4 magique, trefle DEF D1 remplace 12. Illustration, toutes les autres
valeurs, positions et identite conservees. Les textes restants ont les memes
fontes, tailles, contenus et bornes ; aucun pixel modifie hors zones prevues.

Les reparations du lot concernent le selecteur de banniere avant rendu et les
contrats de verification, pas les sources approuvees. Sources precedentes et
empreintes sont archivees dans `attempts/`. L'adaptation portable du test n'a
pas change les sorties natives ; les preparations exactes de publication sont
conservees sous `attempts/04-portable-projection/cards/`. Les 941 fichiers
proteges sont inchanges. Aucune empreinte du verrou de reference n'est renouvelee.

## Verification Et Deploiement

- 67 tests de regression passent ; tests Kalistel et huit parties completes passent.
- Quinze PSD verifies : cadre fixe identique, rendu apres reouverture identique,
  code-barres reel dans quatre cas couleur/gris, typographie et petite lecture.
  Il s'agit de tests numeriques, pas d'une certification d'impression physique.
- Trente vues navigateur, quinze cartes en 1440px et 390px, pas de debordement
  horizontal ni erreur de media. Rapports et images : `qa/local/`.
- Version visible 4.3 sur ordinateur et telephone. Schema et edition restent V4.
- Le travail narratif utilisateur non termine n'est ni modifie ni embarque.
  `test-committed-story.cjs` et `build-committed-runtime.cjs` lisent le recit
  deja commite en superposition read-only ; ils ne restaurent aucun fichier.

La publication est realisee uniquement sur `Yoshi-san87/Kalistar`, `origin/main`.
Le workflow Pages teste les sources commitees puis ne deploie que les medias
jouables, sans PSD. Les controles publics et leur SHA sont en `publication/`.
