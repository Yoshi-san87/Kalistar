# Kalistar 4.6.28 - Guide et Library

## Livraison

- Menu Plus sur ordinateur et telephone : Guide et Library.
- Guide : 18 exercices interactifs, profils publies non modifies et moteur reel.
  Les jets prepares sont annonces. Formation, initiative, ABBA, Block, elimination,
  remplacement, Kalistel, magie, barriere, equipements D6, cinq soutiens,
  Esquive, Mort, Momo, Aeris, Pod 042, capitaine, arene et fin de rencontre.
- Chaque exercice est recree independamment et n'ecrit aucun deck, match,
  recompense ou historique personnel. Rejouer, revenir en arriere et changer de
  chapitre sont possibles. Un controle de comprehension termine chaque chapitre.
- Library : six documents actuels, complets, rendus avec marked 17.0.5 ;
  empreintes des sources, HTML neutralise, liens internes entre manuscrits.
- Ordinateur : parchemins ouvrant un dialogue quasi plein ecran avec sommaire.
  Telephone : lignes pleine largeur et accordeon exclusif. Retour arriere,
  clavier, focus et reduced motion sont pris en charge.
- Aucun changement de moteur, profil natif, sauvegarde ou equilibrage.

## Maintenance

Apres une modification des six documents sources, executer
`node V4/site/rules-documents.cjs`, puis les tests Library. Le build refuse une
Library dont les empreintes ne correspondent plus aux documents actuels.
Le generateur utilise marked uniquement en developpement ; le lecteur n'ajoute
pas de dependance de parsing au navigateur.

Les scenarios se trouvent dans `guide-scenario.js`. Les identifiants de cartes
sont stables et explicites. Les preambules (pertes, dons, tours intermediaires)
passent aussi par le moteur ; aucune charge ni mort n'est injectee dans l'etat.
Les tests refusent un cas dont le resultat ne montre plus la regle annoncee.

## Visuel du parchemin

Generation : outil image_gen integre, sortie PNG avec alpha, 12 octobre 2026.
Derive mecanique Sharp : hauteur 1200, WebP qualite 90, alpha conserve.
Asset : `V4/site/assets/ui/library-parchment-v1.webp`.

Prompt final :

> Use case: stylized-concept. Asset: blank manuscript scroll for Kalistar game
> Library, front-facing reading UI cutout. A single vertically oriented fully
> unrolled antique manuscript, light muted ivory-grey parchment with very subtle
> natural fibers, broad nearly uniform empty center for dark readable text. Two
> narrow rolled parchment curls across the top and bottom with thin aged
> copper-bronze end caps, restrained engraved fantasy craftsmanship. Clean
> straight perspective, symmetrical, flat camera, complete object, generous
> transparent margin. No text, letters, runes, drawings, stains in reading area,
> no background, no table, no books, no neon. Premium heroic fantasy material
> texture with subtle antique metal accents. Real alpha transparent background.

## Verification

Les rapports dans `qa/` correspondent a un export isole de l'index Git,
pas a des sources partagees mouvantes. Les captures sont des emulations
Playwright Chrome, pas des essais physiques sur un Razr.

Resultat : 904 tests passes, build de 351 cartes / 1282 fichiers / 839,4 MiB,
huit suites navigateur, dont les 18 chapitres du Guide sur PC et Razr,
six formats de lecture Library et onze scenarios d'introduction mobile.
Les pilotes navigateur ont ete adaptes aux deux nouvelles entrees du menu et
aux quatre medaillons Hache/Flute des deux equipes depuis la correction 4.6.27.
Les empreintes exactes des sources effectivement verifiees sont dans `qa/stage.json`.
Le PNG original du parchemin et sa provenance sont conserves dans `art/`.
