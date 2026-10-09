# Kalistar 4.5.61

18 equipements FFIX : 8 armes, 5 protections, 5 reliques. Catalogue total :
93 equipements (41 armes, 26 protections, 26 reliques).

Sources, effets, restrictions, references et methode d'extension :
[dossier du lot](../../revisions/2026-10-09-ff9-equipment/README.md).

Les armes conservent la famille imprimee. Les protections et reliques ont
une attribution par partie, Gastrette une charge non cumulable pour le
prochain duel. Le moteur et les faces natives ne sont pas modifies.

Les 54 sources ont ete generees individuellement avec image_gen integre :
objet transparent, illustration en situation et anneau vide par piece.
Les prompts et empreintes accompagnent les 72 exports WebP.

L'espace d'activation recupere la hauteur liberee par le porteur en bas
a gauche. Pour les effets declenches en defense, le texte distingue
desormais cette defense de la prochaine defense : aucun effet ne change.

## Verification

Resultats : 516 tests, 44 commandes de validation, 54 scenarios visuels sur
trois tailles d'ecran, aucun echec. Build : 294 cartes, 1061 fichiers, 723,5 MiB.

- `verification/publication/tests.json` : suites exactes du workflow publie.
- `verification/build.json` : compilation Pages et empreintes distribuees.
- `../../revisions/2026-10-09-ff9-equipment/qa-pages/` : fiches et duels des
  18 objets sur PC 1440x1000, Razr 50 412x1007, compact 320x640 Reduced Motion.
- Attribution, remplacement, retrait, reload, ancien match, deck et inspection,
  ancrages pendant resize, deux camps, bonus reels et consommation sont testes.
- Les captures d'inspection masquent l'adresse du profil local.

Les anciennes suites conservent leur lot initial ; les nouvelles definitions
ont une suite dediee. La suite defensive couvre automatiquement les 50 effets
ONCE_DEFENSE, dont les 10 nouveaux. Aucun ancien rapport ni verrou n'est change.

## Perimetre Git

Publication cible : Yoshi-san87/Kalistar, main + tag annote v4.5.61.
`stage.cjs` n'ajoute que les fichiers listes et les medias du manifeste.
L'ancien ajout local de performance.test.cjs au workflow, les anciennes
captures et `site/verification/weapons/results.json` restent hors du commit.
Les essais intermediaires demeurent locaux ; seul le rapport de publication
et les captures finales du build sont livres.
