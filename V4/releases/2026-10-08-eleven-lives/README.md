# Kalistar V4.5.52 - Onze nouvelles vies

Selection de l'auteur du 8 octobre 2026 : Vaelrik, Neriska, Ssahel, Odran,
Tivrek, Calven, Rovel, Maelor, Djarell, Veyrac et Helior.
Publication reservee au depot personnel Yoshi-san87/Kalistar.

## Perimetre

- Onze cartes natives, identifiants 49900901 a 49900911 ; catalogue de 232 a 243 cartes.
- Illustrations validees conservees, PSD editables, PNG 897 x 1497 et textes propres a chaque scene.
- Medaillon OKAMI et fanion Grivka noir/vert foret, composants additionnels sans remplacer les precedents.
- Odran et Rovel rejoignent Ysilis avec son drapeau historique ; Grivka reste une faction distincte.
- Aucun changement de regle, equipement, arene, roman, schema de sauvegarde ou edition imprimee.
- Neuf propositions non retenues restent hors catalogue. Rhovan et Eyska ne sont pas les deux Okami de cette selection.

Profils, scripts, prompts de composants et provenance artistique dans
[le lot de production](../../expansions/2026-10-08-eleven-lives/README.md).

## Controles locaux

Les onze controles natifs sont passes : zero pixel de cadre fixe modifie,
zero difference PNG/PSD reouvert, textes editables et codes-barres valides.
132 faces ATK/DEF exercees, 24 matchs ABBA complets, sauvegarde/reprise,
soutiens et remplacements. Les bornes de chaque role sont conservees ; cela
ne constitue pas une garantie de taux de victoire competitifs.

Les tests de factions ont ete etendus pour les deux nouveaux membres Ysilis
et les deux Okami. Le test historique du renommage des trois anciennes cartes
et la reprise d'un equipement ancien Niveria restent controles.

Maelor est le premier porteur courant du Cran de Ronce : sa faction Arborium
et sa famille Dague satisfont les restrictions existantes. Le test historique
qui attendait une absence de porteur est actualise, avec controle negatif sur
chacune des deux restrictions ; les regles et definitions restent inchangees.

La preparation de publication isole l'index Git : les travaux performance
independants du checkout restent locaux. La verification du site public
reste distincte de la validation locale ; ne pas annoncer le deploiement
avant succes du workflow Pages et controle de la version et des onze medias.

## Verification de la livraison isolee

Les 442 tests declares par le workflow Pages passent, ainsi que les deux
verifications autonomes Kalistel et ambiance. Le build contient 243 cartes
et 928 fichiers de media/runtime. Resultats : workflow-results.json.
Arbre Git teste : 0921dcad8f9d1bce3f3808d252603df0a7c6d7fd.
Les ajouts ulterieurs sont uniquement la documentation, les preuves de
navigateur et le script de verification publique, sans changement du runtime.

Le navigateur a ete controle sur ce build isole : 1440 x 1000, 412 x 915
(Razr 50) et 320 x 740. Recherche des onze cartes, cinq lecteurs de carte,
deux formations en arene et reprise apres rechargement ; aucun debordement
horizontal, aucune image manquante ni erreur JavaScript observee.
Captures et resultat dans le dossier browser-proof du lot de production.

Apres deploiement, executer `node V4/releases/2026-10-08-eleven-lives/verify-public.cjs <commit>`.
Ce controle exige la version 4.5.52, le SHA de release, 243 cartes et l'identite
SHA-256 des onze PNG natifs servis par GitHub Pages.
