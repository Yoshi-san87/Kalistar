# Kalistar 4.6.51

## Froz et Grivka

Dix nouveaux equipements inspires des illustrations publiees des personnages :

| Faction | Type | Equipement | Effet |
| --- | --- | --- | --- |
| Grivka | Epee courte | Croc du Col | +25 ATK sur un 6 chiffre conserve |
| Grivka | Gun | Hurlement Muet | +25 ATK sur un 6 chiffre conserve |
| Grivka | Arc | Arc des Neiges Muettes | +20 ATK sur un 6 chiffre conserve |
| Froz | Hache | Brise-Rangs | +25 ATK sur un 6 chiffre conserve |
| Froz | Dague | Crocs de Velours | +20 ATK sur un 6 chiffre conserve |
| Froz | Epee longue | Lame du Ralliement | +25 ATK sur un 6 chiffre conserve |
| Grivka | Protection | Tenue de la Garde Blanche | +25 DEF sur un 6 chiffre conserve |
| Froz | Protection | Tenue du Regiment Pourpre | +25 DEF sur un 6 chiffre conserve |
| Grivka | Relique | Museliere du Souffle Calme | Survivre en inferiorite numerique prepare +40 DEF au prochain duel a defense chiffree, une fois |
| Froz | Relique | Bandouliere du Givre Captif | Survivre a une attaque magique prepare +40 ATK a la prochaine attaque magique chiffree, une fois |

Les armes exigent la faction ET la famille imprimee. Les protections/reliques
exigent la faction. Aucun personnage, visage de de, matchup ou moteur modifie.
La pelisse Grivka existante reste disponible. Les definitions des matchs deja
commences restent figees ; aucun schema de sauvegarde n'est modifie.

Chaque objet dispose d'une illustration detouree, d'une scene peinte et d'un
anneau personnalise generes independamment. Les 30 PNG sources restent hors du
site publie ; 40 exports WebP utilisent les ancrages optiques existants.

## Verification

- Tests natifs des dix equipements sur les deux camps, sommes reelles et logs.
- Quarante matchs ABBA complets, restauration apres chaque action.
- Fiches, porteurs, equiper/retirer, rechargement, apercu deck et arene.
- Formats 1440 x 1000, 412 x 1007 (Razr), 320 x 740 avec mouvement reduit.
- Verification des hashes, contours alpha et centres transparents des anneaux.
- Tests du workflow Pages executes sur un export de l'index Git, puis build.

Les preuves sont dans cette revision et dans
`../../revisions/2026-10-13-froz-grivka-equipment/qa/`.
Les resultats de tests ne constituent pas un audit d'equilibrage statistique.

Resultats locaux : 1 163 tests reussis (80 commandes du workflow), 30 scenarios
navigateur reussis et build publie de 363 personnages / 1 359 fichiers / 873,1 MiB.
Les captures ont ete inspectees, notamment les deux reliques, les tenues et
les medaillons actifs en inspection PC et smartphone.
