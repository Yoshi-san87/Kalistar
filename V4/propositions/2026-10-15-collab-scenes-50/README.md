# Scènes cultes, nouvelles versions

50 illustrations de propositions, issues des collaborations déjà présentes dans
Kalistar. Ouvrir `index.html` directement dans un navigateur. Aucune carte native,
statistique, publication ou sauvegarde du jeu n'est modifiée par ce lot.

## Contenu

- `images/` : PNG originaux du générateur intégré, sans cadre ni texte de carte.
- `thumbs/` : aperçus WebP pour la galerie, dérivés des PNG sans recadrage.
- `selection.json` : scènes, intentions, identifiants existants, références,
  prompts exacts, chemins de génération et empreintes SHA-256.
- `index.html`, `gallery.css`, `gallery.js` : galerie locale et comparaison avec
  l'illustration actuellement utilisée par le personnage.

Les numéros 01 à 50 désignent les propositions, pas de nouveaux identifiants
jouables. Toutes restent en attente de sélection artistique.

## Direction

Les illustrations réinterprètent des scènes cultes ou des moments emblématiques
dans la peinture narrative Kalistar. Ce ne sont pas des reproductions de captures
officielles : costumes, lieux, lumières et certains accessoires sont adaptés.
Par exemple, la Tifa adulte revisite le souvenir du château d'eau, Fang évoque
symboliquement le sacrifice pour Cocoon, et Shadow est accompagné d'Interceptor
dans une réinterprétation de la fuite du continent flottant.

La première passe utilise l'identité du personnage comme première référence et
le grain peint de Momo comme seconde référence. Après comparaison, neuf scènes
trop proches des poses existantes ont été entièrement régénérées avec Momo
comme seule référence visuelle et une description textuelle du personnage.
Les nouvelles scènes ne remplacent aucune illustration approuvée. Les sources,
prompts de révision et premières versions restent conservés.

## Corrections et résultat

- 06, Linoa / Rinoa : cheveux extérieurs supprimés. La galerie utilise la v2,
  avec toute la chevelure contenue dans le casque fermé.
- 24, Ocelot : première pose écartée pour un bras incohérent. Nouvelle génération
  complète, assise, pendant le rechargement, les deux bras visibles devant lui.
- 43, Dracula : scène entièrement régénérée après le signalement d'un rebord
  incohérent. Il est désormais assis au sol près du lit d'Adrian, les deux mains
  posées sur ses genoux. Le mobilier est séparé du corps ; première version
  conservée, v2 affichée dans la galerie.
- 04, 10, 14, 15, 22, 32, 33, 38 et 41 : nouvelles compositions complètes pour
  Sephiroth, Vivi, Yuna, Auron, Naked Snake, Ciri, Yennefer, Ryu et Trevor.
  Actions, silhouettes et émotions ont été revues, sans montage du personnage
  sur un autre décor.
- 50, Shadow : remplace une proposition Gambit refusée par le générateur.
  Le refus et son prompt sont conservés dans `unavailableProposals`.

La validation technique contrôle 50 PNG distincts, les empreintes, les formats
portrait et l'intégrité des références. Les planches comparatives et captures
de contrôle sont conservées sous `work/collab-scenes-50/qa/`, hors production.
Un contrôle technique ne vaut pas approbation artistique de l'auteur.

## Vérification de la galerie

Le 15 octobre 2026, les 34 contrôles navigateur passent dans Edge : chargement
des 50 aperçus, recherche, filtres, comparaison, navigation au clavier, retour
du focus, fermeture et préférence de mouvement réduit. Les formats 1440/1920 px
et mobiles 412/320 px ont été vérifiés sans débordement horizontal ni erreur
console. Les captures desktop, comparaison Ocelot, Dracula v2 et mobile ont été
inspectées. L'aperçu et l'agrandissement de Dracula utilisent bien la v2.
La syntaxe de `gallery.js` a également été vérifiée avec `node --check`.

Ce lot reste local et non publié. Il ne modifie ni le catalogue jouable ni les
versions de l'application ; la publication partagée est suspendue pendant la
migration du dépôt.

## Repères consultés

Les choix utilisent d'abord les illustrations et identités du catalogue local.
Quelques repères officiels complémentaires :

- [Square Enix, histoires d'amour de Final Fantasy](https://www.square-enix-games.com/en_GB/news/5-great-final-fantasy-love-stories), notamment l'opéra de Celes.
- [Konami, histoire de Metal Gear Solid 3](https://eu-support.konami.com/hc/fr/articles/9731056113303-Histoire-Quelle-est-l-histoire-de-Metal-Gear-Solid-3-Snake-Eater), contexte du dernier duel.
- [Chrono Trigger, site officiel](https://www.jp.square-enix.com/chronotrigger/), univers de la collaboration.

[Direction artistique](../../DIRECTION_ARTISTIQUE.md) ·
[Propositions](../README.md) ·
[Organisation](../../../docs/ORGANISATION.md)
