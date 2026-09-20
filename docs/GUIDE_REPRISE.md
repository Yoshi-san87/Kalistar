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

| Besoin | Source actuelle |
| --- | --- |
| Demarrer le projet | [Lancer-Atelier.cmd](../V4/atelier/Lancer-Atelier.cmd) |
| Jeu, collection, decks | `V4/site/`, servis sous `/jeu/` |
| Atelier interactif | `V4/atelier/`, serveur `server.cjs`, onglet `/jeu/#atelier` |
| Catalogue du jeu | `V4/atelier/game-catalog.cjs`, route `/api/game/catalogue` |
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
