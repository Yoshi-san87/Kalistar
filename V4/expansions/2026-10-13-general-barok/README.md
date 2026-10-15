# General BaroK
Production demandee le 13 octobre 2026 : ceinture Cryo lumineuse et carte P1,
une Mort en ATK. Identifiant 49902501, personnage general-barok-kalistar.
Okami / Froz / Cryo / Katana, job General. Aucune regle nouvelle.

## Choix de jeu
Une seule position P1. Mort remplace ATK D5 (un chiffre eleve), pas une
septieme face. Autres ATK dans les bornes P1 ; DEF reguliere sans esquive,
relance ou coeur ajoute. Magie D4, barrieres D6 et D3 : Cryo natif.
Les trois cristaux visibles sur son uniforme n'accordent aucun bonus cache.
Mort garde ses contres habituels : Esquive et Reraise. Pas d'arme equipee
automatiquement, pas de double attaque liee aux deux katanas illustres.

## Production
Illustration approuvee retouchee uniquement pour la ceinture lumineuse avec
image_gen integre ; prompts et versions dans
../../propositions/2026-10-13-froz-general/.
Cadre natif 897x1497, texte editable, composants en objets dynamiques,
fanion Froz et medaillon Okami existants. Sources precedentes preservees.

Pipeline : build.cjs prepare ; render avec KALISTAR_BAROK_PS=2026-10-13 ;
verify ; publish avec KALISTAR_BAROK_PUBLISH=2026-10-13.
Le manifeste before.json fige les entrees avant Photoshop.
