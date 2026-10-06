# Porteurs des armes collectives

Demande : appliquer la coherence de famille aux armes qui ne sont pas
directement nominatives et lister celles sans correspondance.

- 11 armes collectives : origine conservee, famille imprimee obligatoire.
- 22 armes nominatives strictement identiques a la version 4.5.28.
- Aucun changement de matrice, bonus, statistiques ou carte native.
- Quatre armes sans porteur actuel, conservees dans la collection :
  Fil du Ralliement, Cran de Ronce, Arbalete Ecarlate, Corne des Anciens.
- Le rapport JSON releve chaque edition retiree, chaque porteur conserve,
  les jobs/factions/races/familles et les exceptions nominatives.

## Persistance

Les profils et compositions retires de compatibilite sont nettoyes sans
modifier cartes, capitaine ou formation. La migration ne supprime aucun
objet du catalogue, et ne transfere pas automatiquement une arme a autrui.
Les anciens matchs restent valides avec leur snapshot original.

## Verification

`node --test --test-isolation=none V4/site/weapon-bearers.test.cjs`

Les suites Arborium, Draevenheim, Cryptown, Rhinoz, arsenal, equipement et
composition couvrent aussi les nouveaux choix et les anciens snapshots.
`weapon-bearers.browser.test.cjs` teste 1440, 412 et 320 px dans des contextes
jetables : listes reelles, absence de porteur, equipement/reload/desequipement,
migration IndexedDB et deck, import de backup, conservation d'une partie.
Les rapports historiques restent inchanges ; nouvelles preuves sous browser/.
