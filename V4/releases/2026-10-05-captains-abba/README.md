# Kalistar V4.5.14 - Capitaines et ABBA

Publication sur le depot personnel `Yoshi-san87/Kalistar`, branche `main`,
tag annote `v4.5.14`. Le workflow `Publish Kalistar` construit et deploie Pages.

## Changements

- 300 ms de suspense supplementaire avant chaque retournement de titulaire.
- Apres les cinq paires, les vrais capitaines rejoignent le centre, lancent
  chacun un D6, relancent les egalites et retournent a leurs positions.
- Le gagnant ouvre ; les actions suivent A, B, B, A, A, B, B, A...
- Frise compacte : camp courant et quatre actions suivantes, PC et telephone.
- Les presets adverses designent leur P1 comme capitaine ; les compositions
  enregistrees gardent le choix du joueur. Regles de commandement inchangees.
- Tirage sauvegarde separement du hasard de combat, compatible avec passage,
  fermeture, reload et retour au menu. L'IA attend la fin de la presentation.

## Contrat preserve

Edition V4 et schema 6 conserves. Les anciens matchs sans marqueur d'initiative
restent ABAB. Aucun nouveau jeton, changement de face, bonus d'arme, politique
de choix IA, retouche d'illustration ou modification des verrous natifs.
Les equipements du match restent des snapshots ; les commandements conservent
leur regle ordinaire +10 par lien. Aucun bonus n'intervient dans le D6 initial.
Les soutiens consomment une action ; DEF, relances et remplacements n'avancent
pas la frise. Une meme carte peut agir deux fois dans sa fenetre consecutive.

Voir [schema et reprise](../../docs/INITIATIVE_ABBA.md) et
[regles actuelles](../../docs/REGLES_JEU.md).

## Verification

- 149 tests de validation du workflow passes localement sous Node 24, avec
  `--test-isolation=none` pour la restriction Windows de creation de processus.
- 250 matchs complets ABBA : toutes les phases valides, equipements et
  restaurations periodiques, evenements et metriques coherents.
- 20 000 tirages reproductibles : faces D6 et camps ouvrants controles.
- Suite navigateur historique d'introduction : indices persistants, geometrie
  native, positions, capitaines, passage aux quatre moments sensibles, retour
  au menu, reload, six tailles, rotation du telephone, reduced motion.
- Nouveau parcours navigateur : presentation complete, +300 ms mesures,
  egalite, voyage depuis les vrais emplacements, skip, reprises avant/apres
  decision, quatre boutons Tour suivant, renforts, IA ouvrante et preset adverse.
- PC 1440 x 1000, telephone 412 x 1007, compact 320 x 568, paysage 844 x 390
  et vrai preview Razr 50. Pas de debordement horizontal ni d'erreur navigateur.
- Build Pages : 211 cartes, 671 fichiers jouables, sources approuvees verifiees.
  Le meme parcours est execute sur ce paquet statique avec chemins `/Kalistar/`.

Les profils et IndexedDB de verification sont isoles de la collection personnelle.
Ces controles portent sur la fiabilite et l'affichage, pas une nouvelle preuve
d'equilibrage global ou de fun.

## Captures

[Rapport du paquet Pages](../../site/verification/captains-abba/pages/results.json),
[rapport d'introduction](../../site/verification/captains-abba/persistent-clues/results.json).

[Capitaines PC](../../site/verification/captains-abba/pages/desktop-captains.png),
[resultat PC](../../site/verification/captains-abba/pages/desktop-initiative.png),
[frise PC](../../site/verification/captains-abba/pages/desktop-timeline.png),
[capitaines telephone](../../site/verification/captains-abba/pages/captains-412.png),
[frise telephone](../../site/verification/captains-abba/pages/timeline-duel-412.png),
[compact](../../site/verification/captains-abba/pages/captains-320.png),
[paysage](../../site/verification/captains-abba/pages/captains-844.png),
[preview Razr 50](../../site/verification/captains-abba/pages/razr-preview.png).

Le push vise uniquement le depot personnel ; le deploiement et le numero
public doivent etre controles avant d'annoncer le site en ligne.
