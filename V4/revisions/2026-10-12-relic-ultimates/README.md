# Trois reliques ultimes

Decision utilisateur : transformer la Flute des Petits Bonheurs, le Pod 042
et la Materia blanche en effets uniques lies a leur personnage. Ni une nouvelle
famille d'equipement, ni un bouton manuel d'ultime, ni une modification des
cartes natives. Les autres equipements restent inchanges.

Regles et schema : `../../docs/RELIQUES_ULTIMES.md`.

## Verification reproductible

```powershell
node --test --test-isolation=none V4/site/relic-ultimates.test.cjs V4/site/relic-ultimates-integrity.test.cjs V4/site/relic-ultimates-ui.test.cjs
node V4/deploy/build.cjs
node V4/site/relic-ultimates.browser.test.cjs
```

Le test navigateur utilise Chrome/Playwright et une origine fictive locale,
un contexte neuf et un nom IndexedDB de test. Aucune sauvegarde personnelle
n'est ouverte. `KALISTAR_DIST` permet de choisir un build deja fige.
`KALISTAR_VERIFICATION_DIR` choisit le dossier des preuves ;
`KALISTAR_QA_VIEWPORT` limite a desktop, razr50 ou compact.

Pour iterer avant le build, `KALISTAR_QA_SOURCE=1` remplace uniquement les scripts,
styles et assets du build par leurs sources presentes. Les preuves finales
doivent etre rejouees SANS cette option sur le build complet.

Les six scenarios utilisent le catalogue publie sans changer les faces,
positions, familles, synergies ou matrices. Chaque relique est jouee des deux
cotes. Une place vide est preparee pour les deux dons ; la carte reste en
reserve. Les jets sont controles via l'etat du generateur existant : les actions
ATK conservee, DEF et choix du don passent par les vrais controles de l'application.

Controles : mecanismes reellement appliques, effets DOM emis, medaillons au bon
ancrage, cartes et textes charges, choix d'Aeris apres reload, credits du donneur,
marque du Pod sur le bon ennemi, cumul de la riposte avec l'arme, reprise des
statistiques sans doublon, nettoyage des effets et absence de debordement.
Formats : 1440 x 1000, Razr 50 412 x 1007, compact 320 x 740 sans mouvement.

Les tests unitaires ajoutent les bords non visibles dans ces six parcours :
Mort, soutien ennemi, Esquive, Reraise, relances DEF et jet Kalistel abandonne,
cible morte/remplacee, plusieurs dons simultanes, anciens snapshots de regles
et import d'etats incoherents. Les suites voisines couvrent les autres objets,
la sauvegarde locale, les statistiques, le bilan et la fin de partie.

## Equilibrage

Une seule distribution de Momo, un seul coeur d'Aeris, une seule riposte de 2B.
Pas de cumul de trefles/coeurs, pas de don aux reserves, pas de ressuscitation
immediate, pas de multiplicateur. Le +60 reste cumulable avec les bonus normaux.
Les verifications prouvent le calcul et le cycle de vie, pas un equilibre parfait
entre tous les decks. La valeur devra etre suivie sur des parties reelles.

## Resultats De Publication 4.6.24

- Les 69 commandes de validation du workflow Pages ont termine sans erreur
  depuis un export isole de l'index Git : 852 tests recenses. Le rapport
  `qa/publication.json` identifie le tree exact et son commit parent.
- Le build Pages isole contient les 350 cartes publiees. Les travaux locaux
  non publies sur Elyrane ne font pas partie de cette livraison.
- Les 18 parcours navigateur ont reussi sur ce build, sans remplacement de
  sources (`sourceOverlay: false`) : `qa/final/results.json`.
- Captures conservees : trefles de Momo, choix d'Aeris sur trois tailles,
  marque du Pod sur telephone et riposte desktop avec +60 et bonus d'arme.
- Verification visuelle des totaux desktop et de la cible Reraise sur les
  deux formats telephone ; aucun debordement detecte par ces parcours.

Les ajouts posterieurs au tree verifie se limitent a cette documentation et
aux preuves. Ils ne modifient ni le code execute ni les donnees du build.
