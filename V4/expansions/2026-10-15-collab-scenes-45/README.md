# Scenes cultes : 45 nouvelles versions

Selection approuvee le 15 octobre 2026 depuis les 50 propositions. Shadow,
Claire Redfield, Jill Valentine, Aranea et Auron ne sont pas produits.
Les anciennes cartes et illustrations restent conservees.

[Galerie des cartes](index.html) | [Profils complets](set.json) |
[Regles V4](../../docs/REGLES_JEU.md) | [Documentation](../../../docs/INDEX.md)

## Identites et intention

Modeles 49902801 a 49902845. Chaque carte conserve le characterId, la race,
la faction et la collaboration de sa version precedente. Deux versions d'un
meme personnage ne peuvent pas etre reunies dans un deck. Les bannières
actuellement validees sont reutilisees ; aucune faction nouvelle.

Les roles suivent la scene, pas seulement la puissance habituelle du personnage :
Tidus au blitzball utilise Projectile en P4 ; Celes a l'opera utilise Instrument
en P5 ; Zoro dans son sacrifice devient P1. Yuna, Aeris et Emil peuvent fournir
un coeur. Dracula au chevet d'Adrian reste un soutien sans resurrection.
Les 45 profils sont definis explicitement, sans tirage aleatoire ni nouvelle
mecanique. Tous possedent un Kalistel. Les armes equipees gardent leurs
restrictions de personnage, de job et de famille d'arme : l'epee Brotherhood
ne s'applique donc pas a la version Projectile de Tidus.

## Production native

`set.json` relie chaque nouvelle carte a son modele precedent et a l'empreinte
de l'illustration approuvee. `choices.cjs` conserve les choix de statistiques
et de narration. `before.json` fige les entrees avant Photoshop et le catalogue
anterieur. Les corrections finales de Linoa, Ocelot et Dracula sont utilisees.

Le pipeline compose le template 897 x 1497 px, 300 dpi, avec textes editables
et composants incorporés en objets dynamiques. Les glyphes blancs d'armes
proviennent du composant stable actuel, notamment l'etoile Projectile verticale.
Les bannières viennent des assets de faction valides, adaptees a leur fenetre
native sans modifier leur silhouette. Aucun verrou precedent n'est reecrit.

`build.cjs prepare` prepare et fige une seule fois. `render <cles>` compose les
cartes en sequence dans Photoshop 26.11.8 ; `node verify.cjs` controle chaque carte.
La publication locale passe par le publisher transactionnel V4. Les sorties
de travail et captures restent sous `work/collab-scenes-45/` ou `work/qa/`.

## Validation

`integration.test.cjs` couvre les 540 faces imprimees, magie, barrieres,
soutiens, journaux, restauration des parties, 45 matches ABBA complets,
identites et restrictions d'equipement. `native.test.cjs` controle les
empreintes, cadres fixes, reouverture PSD et codes-barres reels.
Les tests navigateur couvrent galerie, lecteurs PC/telephone, migration
d'une sauvegarde anterieure et reprise d'un combat.

Git conserve les textes, profils et preuves JSON. Images et PSD restent sur
le PC a leurs chemins natifs et sont sauvegardes hors checkout avant livraison.
La publication suit [la procedure Cloudflare](../../deploy/README.md).

## Portee du controle typographique

Le premier controle final a refuse le Q de SQUALL : sa descendante produit une
encre haute de 37 px, contre 30 px pour la plupart des capitales. La police
Times New Roman reste exactement a 10 pt et l'encre reste dans l'encart natif.
`typography.cjs` conserve les controles de taille, police, centrage, tracking et
limites du titre, en reconnaissant cette descendante comme les accents deja
prevus. Les anciens validateurs et rapports restent inchanges. Le point d'entree
`verify.cjs` et sa politique figee portent ce controle sur le nouveau lot ;
des mutations de police, taille ou geometrie restent rejetees par les tests.
