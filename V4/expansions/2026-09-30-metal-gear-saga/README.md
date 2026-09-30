# Metal Gear saga - demande du 30 septembre 2026

Integration locale terminee. Base personnelle main 8364a14, V4.1 et Drebin preserves.
Production dans ce clone, pas dans la racine Kalistar historique qui contient
encore 118 cartes. Le catalogue de depart du clone contient 119 cartes.

## Demande

19 nouvelles cartes :
- MGS4 : Meryl Gun AERO P2/P3; Raiden Katana P2; Otacon Tome P5 (blouse
  blanche, aucun grimoire dans l'illustration); Liquid Ocelot Poing P2/P1;
  Vamp Dague P3.
- MGS3 : Naked Snake Gun HERBO P2/P3; The Boss Poing LUXO P1/P3;
  The Pain AERO BUZZY P4; The Fear HERBO SERPES P3/P2; The End Gun
  MINERO P4/P5; The Fury Projectile PYRO P4/P3/P2; The Sorrow NECRO P5
  avec Mort en ATK; Volgin Poing ELECTRO P1; Major Ocelot Gun P2.
- MGS5 : Venom Snake Gun P2; Revolver Ocelot Gun P3/P2; Kazuhira Miller
  profil a concevoir; Skull Face NECRO P4/P2 avec Mort en ATK;
  Quiet Gun AERO P4.

3 revisions limitees : Snake MGS4 46676157 nom OLD SNAKE seulement;
Ninja MGS1 47702575 Mort sur ATK D3; Vamp MGS2 49173082 illustration
repeinte seulement, meme pose, scene, cadrage et profil.

Identites : les Ocelot restent revolver-ocelot-mgs, les Vamp restent vamp-mgs,
Meryl meryl-mgs, Raiden raiden-mgs. OLD SNAKE reste solid-snake-mgs.
Naked Snake et Venom Snake sont deux personnages independants, distincts aussi
de Solid Snake. Deux nouvelles bannieres MGS3/MGS5 et logos BUZZY/SERPES.

## Qualite et publication

DA Momo / Valazar obligatoire, peinture narrative et emotions. References web
de chaque episode a verifier. Illustration seule, cadre natif 897 x 1497,
fenetre 737 x 921. PSD editables et controles du cadre, reouverture, code-barres.
Reutiliser les regles actuelles et verifier les bornes de role sans les changer.
Les races BUZZY/SERPES sont des classifications Kalistar demandees pour ce lot,
pas une affirmation de leur race canonique dans Metal Gear.

Publication demandee sur origin/main de https://github.com/Yoshi-san87/Kalistar
apres tous les tests et controles. Preserver l'interface V4.1 et les captures
locales sans rapport. Ne jamais renouveler un ancien gel pour masquer un ecart.

## Etat produit

Le catalogue contient maintenant 138 cartes (119 + 19), avec 28 arenes inchangees.
Les 19 creations occupent les IDs 49600101 a 49600119. Les 3 revisions sont
documentees separement dans V4/revisions/2026-09-30-metal-gear-saga/.
Les autres 78 creations precedentes, les references approuvees et les composants
de races preexistants conservent leurs empreintes.

Les profils complets sont dans set.json. Choix complementaires : Raiden ELECTRO
CYBORG; Otacon GEO; Liquid Ocelot PYRO CYBORG; Vamp HEMATO; The Pain Projectile;
The Fear Arc; The Sorrow Orbe; Major Ocelot PYRO; Venom GEO CYBORG;
Ocelot MGS5 MINERO; Miller Tome LUXO P5/P3; Skull Face Gun HUMAIN.
Mort remplace l'attaque D6 de The Sorrow et Skull Face. Aucun nouveau Reraise.

Les 19 validations natives donnent zero pixel different sur le cadre fixe et
apres reouverture, avec codes-barres reconnus. Les trois retouches donnent zero
pixel different hors des zones demandees et conservent les autres styles natifs.
Le rapport global est release-audit.json; les essais navigateur sont dans qa/.
Le site construit passe 44 vues navigateur (22 cartes, ordinateur et telephone),
sans erreur de chargement. Chaque PNG servi correspond exactement au fichier
natif; le recadrage web a aussi ete compare au rendu source.

La description de Venom a ete raccourcie apres le premier controle de hauteur.
Les deux noms contenant Q suivent la meme exception de jambage que l'ancien
Liquid Snake : police et taille inchangees, geometries exactes inspectees, tests
negatifs inclus. Le verificateur generique et les verrous restent inchanges.

Ne pas relancer freeze/prepare sur une publication deja revisee. Les preuves
d'origine restent historiques; creations/ et nativeRevision du catalogue font
autorite. Lire SOURCES.md et art-prompts/ pour les illustrations.
