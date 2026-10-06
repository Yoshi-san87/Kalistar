# Peuples et regions de Kalistar

## Decision de l'auteur du 6 octobre 2026

Cette note distingue le canon demande par l'auteur des propositions artistiques.
Elle complete les sources historiques sans les reecrire. Elle ne cree aucune
regle de transformation ni aucun bonus de race dans le jeu de cartes.

### Niveria, la region

Niveria est une region de glace, de toundra et de montagnes, pas une faction.
Les mentions geographiques, dont le lac de Niveria, restent valables.

### Ysilis, le royaume humain des neiges

Ysilis est le nom de la faction auparavant appelee Niveria dans le catalogue.
Ce royaume humain est connu pour ses chasseurs et sa maitrise du gel.
Il conserve exactement le drapeau blanc a couronne de glace bleu argent.
Malinia, Oskara et Sivel appartiennent a Ysilis ; leurs cartes imprimees,
illustrations, races, identifiants et statistiques ne changent pas.

### Grivka, la faction des Okami

Grivka est une autre faction de la region de Niveria. Son identite et son
drapeau sont distincts de ceux du royaume d'Ysilis. Ne pas assimiler toute
la region a un seul peuple ou a un seul Etat.

Le nom et l'appartenance sont demandes par l'auteur. La proposition de
drapeau charbon/grenat/argent, tete de loup et signe de montagne, attend
encore sa validation visuelle : voir le dossier des illustrations ci-dessous.

## Trois issues de la transfusion homme-loup

| Race | Nature de la transfusion | Rapport a la transformation |
| --- | --- | --- |
| Okami (`OKAMI`) | Parfaite : integration harmonieuse de l'homme et du loup. | Une forme hybride permanente, une conscience et une identite continues. |
| Lycanos (`LYCANOS`) | Stable, sans fusion permanente des deux formes. | Ils peuvent controler leur transformation. "Lycans" peut servir de forme courte, pas de quatrieme race. |
| Garou (`GAROU`) | Ratee, donc instable. | Ils subissent leur transformation plutot que de la choisir. |

La forme permanente des Okami est l'interpretation retenue pour ces deux
propositions. La distinction de l'auteur porte sur la reussite et la stabilite
de la transfusion : elle n'etablit pas une hierarchie morale. Ne pas ecrire
que tous les Garou seraient cruels, ni que les Okami seraient infaillibles.

Aucun cycle lunaire obligatoire, mode de transmission, origine historique,
cout de transformation ou systeme de combat n'est fixe ici. Ne pas les
inventer implicitement en produisant les prochaines cartes.

## Propositions, pas encore des cartes

[Sources et prompts](../propositions/2026-10-06-grivka-okami/provenance.json).

- **Rhovan**, gardien des cols de Grivka : Okami gris, manteau de laine sombre,
  lance de montagne et mousqueton de secours. Un instant de memoire silencieuse
  devant un refuge. Titre propose : *Ceux que la neige rend*.
- **Eyska**, eclaireuse de Grivka : Okami au pelage roux cendre, arc technique
  discret et geste de pisteuse. Elle retrouve une balise ensevelie qui confirme
  qu'une ancienne route est encore praticable. Titre propose : *La piste demeure*.

Noms, metiers, scenes, palette et titres sont des propositions nouvelles,
pas des personnages retrouves dans un manuscrit. Cristaux personnels, postes,
statistiques et competences restent a definir apres validation des images.

## Compatibilite technique

`site/factions.js` convertit la cle historique de faction `Niveria` en `Ysilis`
au moment de construire le catalogue jouable. L'asset du drapeau conserve
son chemin historique et ses octets. Les profils natifs verrouilles et les
anciens rapports ne sont pas modifies pour masquer ce changement de nom.

Les restrictions d'equipement reconnaissent les deux noms comme la meme
faction, y compris dans un snapshot de match ancien. Les nouvelles definitions
affichent Ysilis. Ni la compatibilite effective ni les bonus ne changent.

Les trois nouvelles races sont enregistrees narrativement ici. Elles ne sont
pas ajoutees artificiellement aux matchups, aux cartes jouables ou aux menus
du designer tant que leurs cartes et leurs medaillons ne sont pas approuves.
