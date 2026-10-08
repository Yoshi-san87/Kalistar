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

Le nom, l'appartenance et la palette noir / vert foret sombre sont demandes
par l'auteur. Apres validation des propositions, il a demande de remplacer
le grenat par ce vert sur le drapeau et les vetements. Les versions 02
appliquent ce choix et conservent la tete de loup, le signe de montagne
et les emblemes argentes. Le drapeau reste une proposition d'illustration,
pas encore un composant natif calibre.

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

[Sources et prompts initiaux](../propositions/2026-10-06-grivka-okami/provenance.json).
[Retouche de palette 02](../propositions/2026-10-06-grivka-okami/provenance-02.json).
[Correction de la lance de Rhovan et selection actuelle](../propositions/2026-10-06-grivka-okami/provenance-03.json).

- **Rhovan**, gardien des cols de Grivka : Okami gris, manteau de laine sombre,
  lance de montagne fixee dans son dos par un harnais et mousqueton de secours.
  La version 03 corrige le port de la lance. Un instant de memoire silencieuse
  devant un refuge. Titre propose : *Ceux que la neige rend*.
- **Eyska**, eclaireuse de Grivka : Okami au pelage roux cendre, arc technique
  discret et geste de pisteuse. Elle retrouve une balise ensevelie qui confirme
  qu'une ancienne route est encore praticable. Titre propose : *La piste demeure*.

Noms, metiers, scenes et titres ont ete proposes pour ces illustrations,
pas retrouves dans un manuscrit. L'auteur a valide les propositions puis
demande la correction de palette ci-dessus. Cristaux personnels, postes,
statistiques et competences restent a definir avant toute production de carte.

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

## Passage aux cartes : 8 octobre 2026

L'auteur retient Vaelrik et Neriska, les deux Okami de la serie du 7 octobre,
avec neuf autres personnages. Voir [le lot de production](../expansions/2026-10-08-eleven-lives/README.md)
pour son statut et ses preuves. Ils appartiennent a Grivka ; Rhovan et Eyska
restent des propositions distinctes, sans cartes ajoutees par cette selection.

Le lot introduit le medaillon OKAMI argent/cuivre et le fanion Grivka natif,
noir et vert foret avec le loup et la montagne argentes. Les anciens composants
restent inchanges. Okami utilise la synergie de race ordinaire ; aucun pouvoir
de transformation ni bonus specifique n'est cree. Lycanos et Garou restent
documentes narrativement, sans carte ni composant jouable ajoute ici.
