# Kalistar V4.4.0

Publication autorisee le 3 octobre 2026, uniquement sur le depot personnel
`Yoshi-san87/Kalistar`. Branche `main`, tag annote `v4.4.0`.

## Lot Publie

- Medaillons d'armes actives : anneaux et radar tournent en continu;
  dessin et bonus restent stables. Animation au survol/focus dans l'Arsenal.
- Composition smartphone : en-tete compact, gestion dans une feuille modale,
  cinq titulaires plus grands et cinq reservistes visibles, Razr 50 inclus.
- Couronne de capitaine unique generee, controles de composition et aura
  discrete en bas a gauche des cartes d'arene, sans pastille de fond.
- Pictogramme blanc Fleau corrige nativement pour Reevus et Selphie,
  reutilise dans le Codex et les futures fabrications. Source Delapouite,
  CC BY 3.0, attribution integree. Aucun changement des profils ou regles.
- Version 4.4.0 dans le titre, le badge PC, le badge telephone et les tests.

Les designs uniques de la Hache du Roi Dechu et de la Flute des Petits
Bonheurs restent inclus, issus de la release 4.3.7. Les changements locaux
independants du roman Story ne sont pas inclus et restent intacts.
Edition des cartes et schemas des sauvegardes toujours V4.

## Sources Et Preuves

[Revision interface](../../revisions/2026-10-03-team-polish/README.md) :
source originale de la couronne, prompt, export et captures PC/telephone.
Le constat "sans push" de ce rapport de travail precede la presente
autorisation de publication et ne decrit pas le statut de cette release.

[Revision native Fleau](../../revisions/2026-10-03-flail-glyph/README.md) :
originaux preserves, nouvelles sources PSD/PNG, publication explicite,
comparaisons circulaires et vraie regression Photoshop sur 38 references.
Les deux revisions ne changent aucun pixel hors du medaillon concerne;
reouverture native et lecture des codes-barres valides.
Le nouveau manifeste ne remplace pas silencieusement une ancienne preuve:
ses tests verifient le recu de migration et les empreintes avant/apres.

## Verification

Controles du lot avant publication : 32 tests equipement/composition/revision
native, 12 protections de publication existantes, 75 validations du runtime
publie. Regression native : 38 references conformes.
Suites navigateur Armes et Composition sur le site construit, PC et
smartphone, avec bases QA separees : equipement, vrai duel, bonus transmis
puis consomme, sauvegarde/reprise, zoom, focus, R5, gestion, navigation clavier
et mouvement reduit. Captures du lot sous `team-polish/qa/`.

La verification de release repasse les suites avec les badges 4.4.0;
les deux suites Armes et Composition passent. Le controle navigateur general
passe aussi (collection, lecture, telechargement PNG, briefing, IA,
sauvegardes et publication additive), sans erreur JavaScript ou HTTP.
Les captures sont dans `qa/`. Le build contient 193 cartes et 495 medias.
La construction locale utilise `build-committed-runtime.cjs`, une surcouche
en lecture seule pour le roman non termine; la CI utilise le commit propre.
Le workflow recupere aussi la banque Fleau native requise par ses tests.
Les deux rapports de calques `staged/*/native.json` sont inclus explicitement
malgre l'exclusion habituelle du staging redondant, pour rendre le test de
revision reproductible. Les copies intermediaires PSD/PNG restent locales;
les sorties natives publiees et leurs originaux sont bien dans le depot.
Le rapport global `atelier/data/regression.json` est celui du vrai rendu
termine a 02:57:14 UTC, apres la transaction initiale de publication des
sources. Son empreinte est attestee par `native-regression.json` et sa copie
`native-regression/verification.json`, non par l'empreinte intermediaire
inscrite dans la transaction a 02:50:47. Ce recu historique reste inchange.
Le journal Photoshop copie est aussi conserve explicitement dans Git.

## Publication En Ligne

Le workflow `Publish Kalistar` construit puis deploie GitHub Pages.
Apres le push, `node V4/releases/2026-10-03-v4.4.0/public-check.cjs` compare
le manifeste public et le build local du commit publie, ainsi que les
empreintes des deux cartes revisees, de la couronne et du pictogramme.
Il verifie aussi le titre et les deux badges 4.4.0. Un tag pousse ne suffit
pas a prouver la fin du deploiement : verifier le workflow et ce controle.

Site : https://yoshi-san87.github.io/Kalistar/jeu/

Les captures utilisent Chrome automatise, pas un appareil Android physique.
