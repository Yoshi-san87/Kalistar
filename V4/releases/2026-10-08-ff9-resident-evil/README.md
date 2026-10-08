# Kalistar : FFIX et visages du combat

Cette livraison ajoute 22 cartes FFIX et revise les faces des 25 Resident Evil.
Le catalogue passe de 243 a 265 cartes. Le numero exact et le parent Git de
la publication sont dans release.json ; edition des cartes et sauvegardes V4
inchangees.

## FFIX

19 personnages, dont Grenat/Dagga sous la meme identite et trois Vivi
Feu/Glace/Foudre. Branet est separee. Cina utilise l'illustration 02 validee ;
Dagga porte son sceptre accroche au sac, sans main supplementaire.

La derniere demande artistique est incluse : nouvelles generations completes
pour Vivi Glace sur un pont enneige et Vivi Foudre sur un aeronef. Aucune
recoloration de la scene Feu. Les deux descriptions correspondent aux scenes.

Les portraits Mice, Batra, Ratz et Macako varient silhouettes, orientations,
couleurs et matieres suivant les composants Kalistar existants. Le fanion FFIX,
le filtre de faction et le groupe Final Fantasy sont integres. Vivi utilise
Robot ; Markus utilise Sharkan. Pas de mecanique de race ajoutee.

## Resident Evil

Les effets repetes ATK D1 trefle / DEF D3 esquive sont redistribues selon les
personnages, en conservant identites, roles, postes, illustrations et regles.
Les chiffres restent dans les bornes ; garde reservee aux roles P1/P5,
coeur reserve au P5, modes magiques uniquement sur faces numeriques.

## Verification et preservation

- 22 preuves natives initiales, huit revisions artistiques, 25 revisions RE.
- Cadres fixes : zero difference ; PSD rouverts identiques au PNG.
- Codes-barres reellement relus, textes editables, exports petits controles.
- 564 faces forcees dans le moteur : 264 FFIX et 300 Resident Evil.
- 86 matchs ABBA complets : 36 FFIX et 50 Resident Evil, sauvegarde/reprise.
- 42 commandes de validation Pages, 458 tests comptabilises, toutes reussies.
- Lecteurs FFIX et arene sur ordinateur, Razr 50, ecran 320 px.
- Galerie des 22 illustrations controlee a 1440, 412 et 320 px.

Les anciens tests Orven et Balmhyr reconnaissent la revision Resident Evil
seulement apres validation exacte de sa filiation, des profils autorises et
de ses preuves. Leurs historiques et verrous ne changent pas. Les premiers
Vivi et emblemes sont archives ; aucun ancien manifeste n'est reecrit.

Sources et preuves :

- [Cartes FFIX](../../expansions/2026-10-08-final-fantasy-ix/README.md)
- [Scenes et races](../../revisions/2026-10-08-ff9-art-direction/README.md)
- [Faces Resident Evil](../../revisions/2026-10-08-resident-evil-faces/README.md)
- [Tests complets](verification/tests.json)
- [Captures navigateur](../../expansions/2026-10-08-final-fantasy-ix/browser-proof/results.json)

Aucune sauvegarde personnelle n'est utilisee. Aucun changement du moteur,
des cartes approuvees verrouillees, des armes ou des arenes.

## Publication

Destination autorisee : Yoshi-san87/Kalistar, main avec tag annote.
stage.cjs limite le contenu a ce lot et laisse hors index les travaux
independants, notamment l'experimentation de performance du workflow.
La version avance apres les publications concurrentes, controlees avant
toute modification des marqueurs et de l'index.

verify-public.cjs controle ensuite le commit Pages, le compteur 265, les
profils et les PNG des 47 cartes concernees ainsi que les cinq nouveaux
assets de faction/races. Le site n'est annonce en ligne qu'apres succes
du workflow et de ces controles.
