# Kalistar - Guide de reprise

Consolidation du 20 septembre 2026. Point d'entree pour reprendre le projet sur
ce poste ou avec un autre Codex. Les chemins en code sont relatifs a la racine
Kalistar, sauf indication contraire. Ce document ne demande aucune modification
automatique du projet.

## Lire en premier

1. [Consignes du projet](../AGENTS.md) et [consignes V4](../V4/AGENTS.md).
2. Ce guide, puis [identite visuelle](../V4/docs/IDENTITE_VISUELLE.md) avant toute
   intervention artistique, et [regles du jeu](../V4/docs/REGLES_JEU.md) avant
   toute intervention sur les cartes jouables, decks, combats ou statistiques.
3. [Organisation V4](../V4/README.md), puis le document technique du domaine :
   [Atelier](../V4/atelier/README.md) ou [integration du jeu](../V4/site/README.md).

## Priorites et sources de verite

- La derniere demande explicite de l'utilisateur definit le travail demande.
  Une demande de nouvelle illustration n'autorise pas a refaire le cadre ou les
  statistiques ; une demande d'interface n'autorise pas a changer les regles.
- Les consignes actives et ces documents consolident les decisions validees.
  Ils ne remplacent pas une verification des fichiers avant intervention.
- Pour identifier les cartes approuvees, leurs fichiers et leurs empreintes :
  [references.json](../V4/atelier/data/references.json). Ne pas choisir un PNG
  par son nom, sa date ou sa presence dans une galerie d'essais.
- Pour le comportement reel : profils approuves, moteur V4, constructeur du
  catalogue et tests actuels. Si une intention documentee et le code divergent,
  signaler le point ; ne modifier ni regles ni verrou pour masquer l'ecart.
- Les documents V3 restent utiles pour les sources et les mecaniques conservees.
  Les notes de fabrication, anciens prompts et migrations sont historiques.
  Une mention ancienne ne doit pas annuler une decision V4 plus recente.

## Etat de reference

Au 20 septembre 2026, le verrou contient 27 cartes approuvees, Voloden inclus.
Ce nombre est un constat date, pas une constante a copier dans le code.
Le jeu ne propose que ces references V4 et les creations Atelier publiees et
verifiees. La V3 reste intacte, mais fournit encore des ressources partagees.

Les identifiants canoniques convertis depuis V3 peuvent rester en `3xxxxxxx` :
cela ne transforme pas ces cartes approuvees en cartes V3. Rikka est aussi une
reference approuvee avec un identifiant en `4xxxxxxx`. Ne pas deduire le statut
canonique du seul prefixe ; lire le registre.

Le registre et les sources locales constituent la memoire transmissible.
Ne pas supposer qu'une nouvelle tache connait cette conversation, les images
temporaires du presse-papiers ou les preferences non encore documentees.

## Reperes techniques

### Indice et MVP : 10 octobre 2026

Lire [INDICE_PERFORMANCE.md](../V4/docs/INDICE_PERFORMANCE.md). Les nouvelles
parties versionnent l'indice 2, avec ATK/DEF, victoire, assists causales et
consommations natives creditees au donneur stable. Les anciennes parties
gardent leur note et leur MVP ; aucun donneur n'est invente, aucun reset de
collection. La formule n'altere pas les combats. Les simulations distinguent
mesures automatiques et limites d'equilibrage, sans changer les coefficients.

### Trois emplacements d'equipement : V4.6.0

Lire [EQUIPEMENTS_460.md](../V4/docs/EQUIPEMENTS_460.md) et les regles actuelles.
Les nouvelles compositions portent une arme ATK6, une protection DEF6 et une
relique conditionnelle. Leurs trois maps restent indexees par `characterId`.
La flute de Momo devient une relique pour garder son soutien; la famille
d'arme imprimee continue de gouverner les avantages. Les parties anciennes
gardent leurs definitions version 1 et leurs conditions historiques. Les notes
ci-dessous sur l'emplacement unique sont des constats anterieurs a la V4.6.0.

### Nerval, le Veilleur des Passerelles : 9 octobre 2026

Le [lot Nerval](../V4/expansions/2026-10-09-nerval/README.md) ajoute le modele
49901402 : Humain de Chroma, Lumiere, Baton, soutien P3/P5. L'illustration
approuvee reste intacte ; bouclier attribuable, mana et barriere utilisent
uniquement les regles existantes. PSD natif, preuves et captures sont conserves.

### Skaern et Djidane Lumiere : 9 octobre 2026

Le [lot Skaern / Luxo](../V4/expansions/2026-10-09-skaern-luxo/README.md)
ajoute Skaern 49901401, Okami de Grivka P1/P5 sans cristal, et passe Djidane
49901001 de NONE a LUXO sans changer ses valeurs, effets, illustration ou
identite. Lire les profils actifs ; le lot FFIX initial reste historique.
Originaux, retouche d'age, PSD natifs, preuves et captures sont conserves.

### Equipements FFIX : 9 octobre 2026

Le [lot FFIX](../V4/revisions/2026-10-09-ff9-equipment/README.md) ajoute
8 armes, 5 protections et 5 reliques avec des visuels propres et des effets
declaratifs existants. Armes : characterId et famille imprimee obligatoires.
Protections/reliques : characterId, une attribution par partie. Un seul
emplacement partage ; aucun changement de faces natives ni de matrice.
Prompts, sources, exports et tests sont documentes dans le lot.

### FFIX et personnalite Resident Evil : 8 octobre 2026

Le [lot FFIX](../V4/expansions/2026-10-08-final-fantasy-ix/README.md) ajoute
22 cartes pour 19 identites : Grenat/Dagga partagent leur personnage, Branet
reste separee, Vivi possede trois versions Feu/Glace/Foudre classees Robot.
La [revision artistique](../V4/revisions/2026-10-08-ff9-art-direction/README.md)
remplace les deux premieres variantes Vivi par de nouvelles scenes completes
et differencie les portraits Mice, Batra, Ratz et Macako. Lire les sorties
actives et nativeRevision, pas les images du premier lot devenu historique.

Les [25 Resident Evil](../V4/revisions/2026-10-08-resident-evil-faces/README.md)
recoivent des faces speciales variees selon leur personnalite. Cette demande
explicite est posterieure a la revision uniquement numerique du 1 octobre.
Illustrations, identites, roles et positions restent inchanges ; les valeurs
respectent les bornes et les effets existants. Aucun moteur n'est modifie.

### Onze nouvelles vies : selection du 8 octobre 2026

Le [lot de production](../V4/expansions/2026-10-08-eleven-lives/README.md)
concerne Vaelrik, Neriska, Ssahel, Odran, Tivrek, Calven, Rovel, Maelor,
Djarell, Veyrac et Helior, choisis parmi les vingt illustrations du 7 octobre.
Les deux Okami sont ceux de cette nouvelle serie, pas Rhovan et Eyska.
Illustrations preservees, nouveaux medaillon OKAMI et fanion Grivka,
profils differencies sans nouvelle mecanique. Lire les preuves natives et
le statut de publication du lot avant d'annoncer son integration en ligne.

### Niveria, Ysilis et les peuples lupins (6 octobre 2026)

Lire [Peuples et regions](../V4/docs/PEUPLES_ET_REGIONS.md) : Niveria est la
region ; Ysilis est le royaume humain qui conserve l'ancien drapeau de neige.
Grivka est la faction des Okami. Okami, Lycanos et Garou se distinguent par
la stabilite de leur transfusion homme-loup. Les deux illustrations de Grivka
restent des propositions, sans nouvelles cartes ni nouvelles mecaniques.
Les profils natifs historiques restent preserves ; `site/factions.js` fournit
le nom actuel et la compatibilite des anciennes sauvegardes.

### Story : source narrative du 6 octobre 2026

Lire [la reprise longue du Reveil](../V4/docs/HISTOIRE_100K_REPRISE.md) avant
toute modification du roman. Le DOCX fourni localement par l'auteur remplace
les choix narratifs anterieurs, notamment concernant la transfusion Electro
de Gen au IV. Ne pas reutiliser l'ancien rapport 80K comme une instruction
pour annuler cette correction. Les notes de suite restent reservees ; aucun
acces au Drive n'est autorise pour ce travail. Les cartes jouables, leurs
profils et les regles ne changent pas avec le roman.

La decision ulterieure de l'auteur du 6 octobre remplace l'enterrement de Lanio :
il est depose au village Rhinoz de Zarok, pres de ses amis d'Astraball. Reprendre
les scenes d'adieu revisees, pas les anciens brouillons. Story s'ouvre desormais
sur le tome ferme ; son ouverture reprend le repere local du lecteur.

### Equipements : armes, boucliers et reliques (6 octobre 2026)

La vue `#weapons` s'appelle maintenant Equipements. Un seul objet par personnage
et composition, toutes categories confondues. Rempart de Durane et Pod 042
introduisent des bonus DEF a usage unique ; aucun matchup imprime n'est modifie.
Lire [le schema actuel](../V4/docs/ARMES_EQUIPEES.md) et
[la revision](../V4/revisions/2026-10-06-equipment-categories/README.md).

### Armes equipees V4.3.6

La [publication V4.3.6](../V4/releases/2026-10-02-equipped-weapons/README.md)
ajoute l'onglet Armes, l'equipement par profil et les bonus moteur conditionnels
de Balmhyr et Momo. Les medaillons natifs s'animent seulement lorsque leur
condition est active. Le match conserve son snapshot ; la famille d'arme
imprimee et sa matrice restent inchangees. Lire les
[schemas et regles](../V4/docs/ARMES_EQUIPEES.md) avant d'ajouter un objet.
La Story longue locale reste hors de cette release. Verifier le workflow Pages
du commit avant d'annoncer la publication en ligne.

### Immersion de combat V4.3.5

La [publication V4.3.5](../V4/releases/2026-10-02-arena-immersion/README.md)
regroupe l'eveil des cristaux imprimes, les ambiances d'arene et les reactions
de terrain sur ordinateur et smartphone. Le moteur, le RNG, les profils,
les cartes approuvees et les sauvegardes restent inchanges. Le roman long
encore local reste hors de ce lot. Verifier le workflow Pages et la version
publique avant d'annoncer la fin du deploiement.

### One Piece Et The Witcher - V4.3

La [suite V4.3.4](../V4/releases/2026-10-02-pages-portability/README.md)
remplace dans Pages deux tests natifs dependants du poste Windows par des
controles portables des memes profils publies. Elle termine la livraison
des trois cartes apres l'echec initial du workflow V4.3.2, preserve les
filtres de collection publies concurremment en V4.3.3, et conserve le roman
long local hors du push. Catalogue : 193 cartes, 28 arenes, edition V4.

La [publication V4.3.2](../V4/releases/2026-10-02-serpes-publication/README.md)
autorisee le 2 octobre 2026 regroupe Geralt 49900101, Ssilas 49900201 et
Mirelle 49900202 : 193 cartes, 28 arenes, sauvegardes toujours V4. Les
changements independants d'histoire et de classeur restent locaux. Consulter
le workflow du commit et les controles publics avant de conclure a la fin
du deploiement. Geralt en chemise blanche reste absent du catalogue.

Le [lot Mirelle](../V4/expansions/2026-10-02-serpes-mirelle/README.md)
du 2 octobre 2026 ajoute ensuite localement la Serpes 49900202 d'Arborium,
Support P3/P5 Plante au Sceptre, distincte de Ssilas. PSD natif, profil,
prompts et controles sont preserves. Le catalogue local atteint 193 cartes
et 28 arenes. Aucun push Git de ce lot ; ne pas confondre integration locale
et mise a jour publique.

Le [lot Geralt et Ssilas](../V4/expansions/2026-10-02-serpes-geralt/README.md)
du 2 octobre 2026 ajoute localement Geralt 49900101 et Ssilas 49900201,
nouvel eclaireur Serpes d'Arborium. Les controles natifs et navigateur passent.
Le catalogue local compte 192 cartes et 28 arenes ; ce lot n'est pas encore
pousse sur GitHub. Geralt en chemise 49900102 reste en attente. Consulter
le statut de livraison du lot avant de conclure a une publication publique.

La [suite V4.3.1](../V4/releases/2026-10-02-witcher-completion/README.md)
ajoute Vesemir depuis son profil P1 prepare et corrige uniquement l'illustration
du Sanji en costume noir. Lire sa `nativeRevision.artworkSource` pour la source
actuelle ; son profil imprime et ses statistiques restent strictement identiques.
Les deux Geralt restent en attente apres de nouveaux refus du service image.
Le catalogue de cette suite compte 190 cartes et 28 arenes.

Le [lot V4.3](../V4/releases/2026-10-01-one-piece-witcher/README.md) ajoute
dix cartes One Piece et quatre The Witcher, avec une banniere et un filtre
WITCHER. Luffy est revise en Lumiere avec un trefle DEF, sans nouvelle image
ni modification des autres chiffres. Le catalogue compte 189 cartes et 28
arenes a cette publication du 2 octobre 2026. Les deux Geralt et Vesemir
restent en attente d'illustration : ne pas les presenter comme publies.
Les prompts, refus du service image, profils, PSD, preuves natives et controles
navigateur sont conserves dans le lot. Pour reprendre les trois demandes,
partir de l'etat courant et creer un nouveau lot additif ; ne pas refiger
l'ancien snapshot pour effacer les revisions intervenues entre-temps.
La version visible est 4.3, mais l'edition/schema de sauvegarde reste V4.

### Personnalite numerique des cartes du 1 octobre 2026

La demande utilisateur confirme que les valeurs par role sont des limites et
reperes, pas un gabarit numerique identique impose a chaque personnage. La
[revision des statistiques](../V4/revisions/2026-10-01-stat-personality/README.md)
conserve son tableau avant/apres, les originaux actifs, les compromis choisis
et les preuves natives pour onze One Piece, vingt-cinq Resident Evil et douze
MGS. Skull Face et les profils deja distinctifs non selectionnes restent intacts.
Seules les valeurs ATK/DEF numeriques changent ; ni illustrations, ni identites,
ni effets, ni positions, ni regles. Les anciens `expansions/*/set.json` restent
des preuves historiques immuables. Pour un profil revise et publie, lire le
catalogue courant, `creations/<id>/profile.json` et sa `nativeRevision`, jamais
les anciens chiffres du lot initial. Le dossier de revision indique le statut
de verification et de publication ; une preparation seule ne fait pas autorite.

### Ajout One Piece du 1 octobre 2026

Le lot [One Piece et Skull Face](../V4/releases/2026-10-01-one-piece/README.md)
documente onze nouvelles cartes pour dix personnages, la banniere ONEPIECE
et la race SHARKAN. Les deux formes de Chopper partagent leur characterId :
ce ne sont pas deux personnages cumulables dans un deck. Les profils, prompts,
references et preuves Photoshop sont conserves dans le lot de production.
La revision de Skull Face (49600118) change seulement l'illustration et sa race
en SKULLZ, pas ses statistiques. Lire les sorties publiees de creations/ et
nativeRevision avant tout ancien export. Aucun changement des arenes ni des
mecaniques de combat ne fait partie de ce lot. Les verifications de publication
et les controles navigateur sont centralises dans son dossier releases/.

### Ajout Metal Gear du 30 septembre 2026

Le lot [Metal Gear saga](../V4/expansions/2026-09-30-metal-gear-saga/README.md)
ajoute 19 cartes MGS3/MGS4/MGS5, les bannieres MGS3/MGS5 et les races BUZZY/SERPES.
Le constat apres integration est de 138 cartes et 28 arenes, sans changer les
regles de combat. Les profils, prompts, preuves PSD et tests du lot sont conserves.
Les trois retouches natives sont dans V4/revisions/2026-09-30-metal-gear-saga/ :
46676157 devient OLD SNAKE sans changer d'identite; 47702575 gagne Mort en ATK D3;
49173082 conserve son profil et recoit seulement la nouvelle illustration de Vamp.
Pour une reprise, lire les sorties actives dans creations/ et leur nativeRevision,
pas un ancien PNG de preparation. Les trois familles Snake restent distinctes,
tandis que les variantes Ocelot, Vamp, Meryl et Raiden partagent leur identite.

| Besoin | Source actuelle |
| --- | --- |
| Demarrer le projet | [Lancer-Atelier.cmd](../V4/atelier/Lancer-Atelier.cmd) |
| Jeu, collection, decks | `V4/site/`, servis sous `/jeu/` |
| Atelier interactif | `V4/atelier/`, serveur `server.cjs`, onglet `/jeu/#atelier` |
| Catalogue du jeu | `V4/atelier/game-catalog.cjs`, route `/api/game/catalogue` |
| Jeu en ligne (ajout du 21 septembre) | [Publication GitHub Pages](../V4/deploy/README.md), sortie jouable sans Atelier |
| References approuvees | `V4/atelier/data/references.json` |
| Publications Atelier | `V4/donnees/catalogue.json`, sorties `V4/creations/` |
| PSD et PNG approuves | Chemins du verrou, normalement `V4/templates/` et `V4/cartes/` |
| Route Electro | `V4/template-stable/current.json`, maitre 03F |
| Route multi-element | `V4/template-stable/current-elements.json`, maitre 04 corrige |
| Centrage des icones | `V4/template-stable/icon-layouts.json` et registres associes |
| Composants de l'Atelier | `V4/atelier/designer-assets/manifest.json` et ses empreintes |
| Derniere regression native | `V4/atelier/data/regression.json` |

Le lancement utilise Windows, Photoshop et les runtimes du poste configure.
Le port prefere est 4304, avec repli sur un port libre jusqu'a 4324. Ne pas
promettre que le serveur est actif sans le verifier, ni ouvrir le fichier HTML
seul pour contourner l'API necessaire au jeu V4.

Sur un autre PC, les chemins des runtimes, Photoshop et les polices peuvent
necessiter une adaptation. Voir [transfert et Git](TRANSFERT_ET_GIT.md).

## Travailler sur une carte

1. Identifier le profil et les sorties actives dans le verrou. Lire les consignes
   artistiques et regarder la carte validee avant de produire quoi que ce soit.
2. Separer le perimetre : illustration, donnees de jeu, textes ou structure.
   Preserver tout ce qui n'est pas concerne par la demande.
3. Generer ou retoucher uniquement l'illustration si necessaire. Conserver le
   prompt exact, les references, le fichier genere et la selection. Ne pas
   regenerer la carte complete pour obtenir une nouvelle illustration.
4. Composer depuis la route native correspondante. Garder textes editables,
   objets dynamiques incorpores et effets separes. Ne pas aplatir le PSD maitre.
5. Verifier rendu, centrages optiques, lisibilite en petit, pixels du cadre,
   champs natifs et code-barres reel. Reouvrir le PSD et comparer au PNG.
6. Distinguer validation technique et validation artistique de l'utilisateur.
   Un test reussi ne valide pas une nouvelle DA.
7. Publier selon la nature de la carte : creation Atelier dans `creations/`,
   ou ajout canonique explicite au registre avec preuves et regression native.
   Ne pas ecraser une reference existante par une creation d'essai.

La [revision Voloden](../V4/revisions/2026-09-18-voloden/README.md) documente un
ajout canonique termine. C'est une reference de protocole, pas une commande a
relancer. Les dossiers `staged/` et `transaction/` redondants ont ete nettoyes.

## Exigences UX de l'utilisateur

- L'experience doit evoquer un jeu video, pas un formulaire de site web.
  Conserver les interfaces V4 deja validees ; ne pas engager une refonte gratuite.
- Eviter le scrolling, surtout dans les popups. Preferer vues adaptees a l'ecran,
  onglets et pagination. Si le defilement est indispensable, garder son acces
  clavier/tactile sans barre visuelle envahissante ni contenu inaccessible.
- Les cartes doivent etre assez grandes pour lire ATK et DEF. Prevoir une
  consultation agrandie confortable, notamment depuis la reserve.
- Decks : composition rapide, deplacement par glisser-deposer, dix emplacements,
  synergies et couverture visibles ensemble. Inspiration composition FIFA,
  pas imitation de marque. Le visualiseur doit rester utile et lisible.
- Collection : plaisir de feuilleter un classeur de possessions, contemplation
  et ambiance calme. Animations legeres ; ne pas la transformer en feuille de
  statistiques identique a l'ecran de composition.
- Combat : conserver le bouton **Tour suivant**, utilisable apres les animations,
  pour laisser lire le detail des scores. Ne pas retablir l'enchainement
  automatique abandonne par l'utilisateur.
- En remplacement, mettre en evidence les cartes compatibles avec la position
  libre selectionnee. Le bouton oeil reste en bas a droite, loin du score ATK.
- Le plateau central doit respecter l'arene ; ne pas etirer le cadre d'une carte
  pour en faire une bordure de plateau.
- Statistiques de duel : match en cours, pas carriere globale. Quatre colonnes :
  kills/stops, ATK/DEF, trefles/coeurs, points de buff physique ATK/DEF attribues.
  Voir [definitions precises](../V4/docs/REGLES_JEU.md).
- Palmares : grande presentation de fin de match, illustrations mises en valeur,
  equipes et feuille lisibles par onglets, alignements propres. Ne pas revenir
  a une petite liste defilante.
- Tester ordinateur et petit ecran, absence de chevauchement, clavier, clic et
  glisser-deposer. Ne pas sacrifier la consultation au seul effet visuel.

## Comptes, possession et securite

Le prototype a deux profils locaux, Paris et Tokyo, definis dans
`V4/site/ownership.js`. Au premier peuplement, Paris recoit les originaux et
Tokyo aucun. Cette regle n'autorise jamais a reattribuer une carte transferee
lors d'un rechargement ou d'une nouvelle publication.

Trois identites ne doivent pas etre confondues : modele imprime/code-barres,
exemplaire de collection possede (`KC-...`) et identifiant d'instance de jeu
(`K4-...`). Le code-barres du modele n'est ni un secret ni une preuve de propriete.

L'emission locale d'un exemplaire a activer produit un code aleatoire separe,
dont le hash est conserve ; activation et transfert sont des parcours distincts.
Ne pas imprimer ce secret dans le code-barres public ni inventer un ID changeant
pour resoudre la copie d'une carte physique.

Les protections locales, le journal et les validations d'import ne constituent
pas une authentification multiutilisateur de production. Le proprietaire du
poste peut modifier son navigateur. La propriete partagee entre plusieurs PC
et les ventes physiques exigeraient un service autoritaire authentifie a
concevoir separement. Ne pas presenter IndexedDB comme ce service.

Le serveur Atelier reste sur `127.0.0.1`, sans exposition Internet. Conserver
controles d'origine, jeton de session, validation d'imports et verrous de rendu.
Un seul travail Photoshop de production a la fois.

IndexedDB `kalistar-v4-cards` et localStorage `kalistar.v4.*` vivent dans le
navigateur, pas dans ce dossier. Exporter collection et decks avant migration ;
copier le projet ne copie pas les possessions. Ne pas tester un transfert ou
un import destructif sur la collection reelle.

## Verifier sans casser

- Lire les tests du domaine avant intervention. Capturer les empreintes et les
  references utiles ; ne jamais renouveler le verrou pour cacher une regression.
- Pour une modification du moteur natif, refaire la regression Photoshop de
  toutes les references, pas seulement une carte qui semble correcte.
- Pour les parcours utilisateur, employer un contexte navigateur isole.
  Les tests de publication ne doivent pas ajouter des cartes au vrai catalogue.
- Les emplois QA du designer sont marques test-only des leur creation et ne
  peuvent pas etre publies. Ne pas convertir un essai QA en carte canonique.
- Pour une correction documentaire seule, verifier liens, coherence et absence
  de modification des sources protegees. Une generation d'images n'est pas utile.

Suite rapide depuis la racine, avec le Node du poste configure :

```powershell
node --test --test-isolation=none V4/atelier/test.cjs V4/atelier/designer.test.cjs V4/atelier/designer-api.test.cjs V4/atelier/designer-publication.test.cjs V4/atelier/designer-recovery.test.cjs V4/atelier/game-catalog.test.cjs
```

Tests navigateur : `V4/site/browser.test.cjs` et
`V4/site/catalogue-evolution.test.cjs`. Lire leurs prerequisites et la
[documentation du site](../V4/site/README.md). La regression native se lance
avec `node runner.cjs` depuis `V4/atelier/`, apres verification de Photoshop et
des verrous. Le rapport n'est valable que pour ses references et son moteur.
Ne pas annoncer ces tests passes sans les avoir effectivement executes.

## Documentation ancienne a interpreter

| Mention rencontree | Interpretation actuelle |
| --- | --- |
| Un seul trait actif dans les decisions narratives V3 | Obsolete : cinq categories cumulables, une charge chacune |
| 41 cartes V3, 26 references V4, ou cinq cartes | Perimetres historiques ; le verrou courant fait autorite |
| Travail exclusivement sous V3 | Ancien contrat de production ; le travail actif est V4 |
| Carte entiere generee, template 950 x 1655 | Essais abandonnes ; cadre natif 897 x 1497 |
| Integration encore absente dans un profil ou statut artistic-review | Ancienne metadata ; consulter le verrou et le catalogue actuels |
| Sauvegarde obligee de contenir toutes les nouvelles references | Faux pour schema 3 : instantane valide avec preservation des ajouts plus recents |

Les [decisions narratives V3](../V3/sources/DECISIONS_NARRATIVES.md) distinguent
canon et creation, mais contiennent aussi des anciennes scenes remplacees en V4.
Les documents d'origine se trouvent sous `main/` ; les extractions se trouvent
sous `V3/sources/`. Lire ces sources avant d'inventer un lien narratif, et
etiqueter toute nouvelle proposition. Ne pas confondre postes Astraball et
positions du jeu de cartes.

## Rangement, transfert et entretien

Conserver l'arborescence complete : V4 utilise encore V3 et le lecteur de
codes-barres sous V1. Ne pas supprimer des fichiers uniquement parce qu'ils
semblent anciens. Consulter verrous, dependances et journaux de maintenance.
Ne pas supprimer les originaux des revisions.

Aucune initialisation Git, remote, commit ou push sans nouvelle demande
explicite. Ne jamais reutiliser le depot du travail. Lire le
[guide de transfert](TRANSFERT_ET_GIT.md) pour le ZIP prive via Drive, les gros
fichiers, les sauvegardes navigateur et les limites de portabilite du poste.

Apres une nouvelle decision validee, actualiser le document concerne, noter la
date et la source, puis ses liens. Conserver les preuves historiques ; ne pas
reecrire un ancien rapport comme si la decision avait toujours existe.

## Message de reprise pret a utiliser

```text
Travaille dans le dossier Kalistar. Lis AGENTS.md, V4/AGENTS.md puis
docs/GUIDE_REPRISE.md et les references du domaine concerne.
La V4 est active. Preserve les cartes approuvees et la DA Momo/Valazar.
Identifie les fichiers courants dans le verrou avant toute modification.
Ne regenere jamais le cadre complet pour changer une illustration.
Ne change pas les mecaniques sans demande explicite et signale les divergences.
Ne lance aucune operation Git ni aucun push sans mon accord explicite.
Ma demande pour cette reprise : [decrire ici le travail souhaite].
```
