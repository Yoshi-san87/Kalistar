# Les cinq veilleurs blancs de Grivka

Illustrations finales approuvees le 12 octobre 2026. Cinq nouvelles identites,
sans remplacement de carte existante. Race OKAMI, faction Grivka, cristal CRYO.
Les armes et les gants illumines appartiennent a l'illustration : aucun nouvel
equipement ni pouvoir parallele n'est ajoute au moteur.

| Carte | Positions | Arme de base | Intention |
| --- | --- | --- | --- |
| Hrold | P1 / P3 | Epee courte | Gardien : Garde en ATK D2, deux barrieres, attaque moderee. |
| Sevrane | P2 / P3 | Epee longue | Duelliste : boost physique D3, esquive DEF D2, defense faible. |
| Taevrik | P3 / P4 | Gun | Tireur P4 : Mort ATK D2, valeurs et defenses sacrifiees, relance DEF D1. |
| Ulvren | P1 / P2 | Marteau | Tank offensif : attaque reguliere, boost physique D1, moins resistant que Hrold. |
| Nivra | P3 / P4 / P5 | Arc | Eclaireuse Middle : trefle ATK D3, esquive DEF D5 en echange d'une forte defense numerique. |

Toutes les valeurs sont dans la bande de leur role principal. Les modes
magiques et barrieres portent uniquement sur des faces numeriques. Aucun
Reraise, multiplicateur ou effet nouveau. La synergie commune ne justifie
pas de maximiser toutes les faces : les contreparties restent imprimees.

Sources : hrold-03, sevrane-03, taevrik-03, ulvren-03 et **nivra-06** dans
../../propositions/2026-10-12-grivka-white-guard/images.
Le cadrage conserve les proportions et le haut de l'image, sans deformation.
Les sources completes restent conservees dans chaque illustration.png.

Production : build.cjs prepare, puis render avec KALISTAR_GRIVKA_PS=2026-10-12,
puis verify. Le pont Photoshop reprend le composeur natif valide des soldats
des villes et les composants Grivka / OKAMI existants. Aucun verrou de reference
n'est modifie. Publication transactionnelle seulement apres verification.

Le PSD garde les textes natifs et les objets dynamiques. La verification
compare le cadre fixe, le PNG au PSD reouvert et quatre lectures du code-barres.
integration.test.cjs couvre les faces, effets, restaurations et vrais matchs.
