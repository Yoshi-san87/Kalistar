# Kalistar V4.6.0 - trois equipements

## Regles

Un personnage peut porter une arme, une protection et une relique. Arme et
protection se placent entre les faces 6 et 5, respectivement ATK et DEF.
Leur bonus s'applique uniquement sur un 6 numerique conserve. La relique
reste sur le medaillon imprime, avec ses conditions et consommations.
La famille d'arme de base, les faces, magie, barrieres, capitaine et ABBA
restent inchanges. Le bonus direct s'ajoute au meilleur bonus de relique;
plusieurs cadeaux de reliques ne s'additionnent pas.

Les anciens bonus DEF d'armes deviennent ATK6, les protections deviennent
DEF6. Valeurs actuelles de 15 a 30 conservees. La flute de Momo devient une
relique de soutien; elle n'est pas convertie en bonus offensif generique.
Le catalogue conserve ses 93 identites et visuels : 40 armes, 26 protections,
27 reliques. Aucun PNG/PSD de personnage ni verrou de reference n'est change.

## Integration

- Profil, deck, duplication, annuler/retablir et imports gardent trois maps
  independantes. Retirer une protection ne retire pas les autres objets.
- Migration non destructive des anciens profils/decks. Les matchs en cours
  gardent leur snapshot version 1; les nouveaux utilisent la revision 2.
- Ancres natives asymetriques projetees par le crop et la taille de l'image;
  zoom, focus, resize et popup utilisent la meme geometrie.
- Activation mecanique, radar synchronise au 6, usage de l'art reel, pulse et
  transfert de relique. Une protection utilisee s'anime meme en cas d'echec.
  Seul un Block avec bonus reel remplace le bouclier d'animation habituel.
- Images et origines separees dans le recap et le journal. Reduced Motion,
  nettoyage des animations et fermeture de popup restent pris en charge.

## Verification

Les tests nouveaux sont `equipment-v2.test.cjs`,
`equipment-slots-persistence.test.cjs`, `equipment-slots-presentation.test.cjs`
et leurs deux suites navigateur. Les tests historiques utilisent la fixture
publiee immuable `fixtures/equipment-v4.5.64.json` pour verifier explicitement
les anciennes conditions, sans modifier les verrous ou les rapports anciens.
Les 571 tests du workflow Pages et le build passent sur l'instantane final.
Les commandes et resultats sont conserves dans `qa/workflow/`, avec le
manifeste du build dans `qa/build.json`. Les empreintes des six sources de
gameplay correspondent exactement a celles de la campagne statistique.

La campagne statistique, son script et ses limites sont dans
[la revision equipements](../../revisions/2026-10-09-equipment-slots/README-statistics.md).
10 000 rencontres appariees, 28 arenes; delta trois objets contre aucun
de +1,75 point, IC95 [+0,46; +3,04]. Ce protocole n'est ni une preuve
d'equilibrage competitif universel ni une mesure objective du plaisir.

Les controles du catalogue signalent trois armes sans porteur compatible
actuel et une protection sans DEF6 numerique. Leurs restrictions/faces ne
sont pas assouplies pour masquer ces ecarts. L'interface explique et bloque
les nouvelles attributions sans face 6 numerique utile ; un objet deja
porte peut toujours etre retire. Details dans le rapport.

Controles navigateur reussis : regression arsenal (93 controles sur quatre
formats), persistance (8 scenarios), presentation (11 scenarios), composition
(8 formats), faces 6 indisponibles (4 scenarios), application complete locale
et construite (PC 1440, Razr 412, compact 320 avec Reduced Motion).
Le build Pages general couvre egalement Collection, carnet, telechargement
PNG, Decks, lancement, Arène, references, sauvegarde/reload et ajout de carte.
Les profils QA sont isoles ; aucune sauvegarde personnelle n'est effacee.

Captures de la livraison : [PC](../../revisions/2026-10-09-equipment-slots/qa/pages-app/desktop-arena-result.png),
[Razr](../../revisions/2026-10-09-equipment-slots/qa/pages-app/razr-arena-result.png),
[inspection trois objets](../../revisions/2026-10-09-equipment-slots/qa/pages-app/desktop-deck-popup.png).
La preuve des positions natives, effets de protection perdue et resize est
dans [PRESENTATION.md](../../revisions/2026-10-09-equipment-slots/PRESENTATION.md).
Hors de cette evolution, la navigation desktop existante reste trop dense
au format paysage 1007 x 412. Le controle ne pretend pas corriger ce point.

`prepare-snapshot.cjs` extrait l'index Git isole et hydrate seulement les
medias jouables et preuves du workflow, avec verification de chaque OID LFS.
La livraison s'appuie sur les tests et le build de cet instantane, pas sur
les fichiers historiques ou le travail independant non indexe.
`verify-public.cjs <commit>` controle ensuite la version publique, ses
ressources de jeu et les equipements contre ce build valide.

## Documentation

[Regles](../../docs/REGLES_JEU.md), [schema et ajout d'objet](../../docs/EQUIPEMENTS_460.md),
[compositions](../../docs/COMPOSITION_EQUIPE.md).
