# Kalistar 4.7.27 - Galerie Collection

## Intention

La Collection devient une galerie de cartes a contempler. La double page et
ses contraintes de hauteur disparaissent. Les cartes natives restent nettes,
entieres et inchangees, sur un atlas discret et des socles metal/jade avec
la banniere de leur faction en filigrane.

## Interface

- Grandes cartes ou affichage compact sur PC ; deux colonnes sur telephone.
  Trois rangees par page, defilement vertical et index visuel des pages.
- Mes cartes / Catalogue, progression reelle de possession, recherche,
  cristaux, univers, favoris et filtres complets.
- Un personnage par emplacement. Le selecteur de version apparait seulement
  quand plusieurs editions respectent les filtres et les droits courants.
- Favori et compteur directement sur la carte. Nom, titre, positions et
  editions dans le socle ; les textes longs se replient naturellement.
- Ouverture en grand avec carte ou illustration originale, recit integral,
  fiche, carriere, exemplaires et lien vers le PNG d'impression.
- PC : carte et lecture cote a cote. Telephone : une lecture verticale, avec
  raccourcis Carte / Details, sans masquer le contenu. Retour a la position
  precedente de la galerie, avec restauration du focus.

## Technique

`collection-binder.css` est l'unique responsable du responsive Collection.
`collection-pedestal.css` possede les socles. Les anciennes compensations
Collection dans `mobile.css`, `statistics.css`, `weapons.css` et le theme
manuscrit dans `ui-system.css` sont retires. Aucun nouveau framework, asset
binaire ni appel serveur n'est ajoute.

Les images de face sont chargees paresseusement. Les versions non selectionnees
utilisent le meme dos ; leur illustration est demandee au changement de version.
Les effets d'apparition, de survol et de permutation sont finis, sur transform
et opacity. Pas d'animation permanente ni de boucle de calcul de taille du nom.
La permutation attend le crop final CardMedia, meme sur cache froid, avec
annulation et delai borne en cas d'erreur. Le survol deplace carte, verre,
favori et compteur ensemble.
Reduced Motion, contraste force, tactile et navigation clavier sont conserves.

Aucun changement de moteur, de statistiques, de catalogue, de modele de carte,
de sauvegarde, de droits Supabase ou de possessions personnelles. Les sources
historiques et medias approuves restent aux memes chemins et octets.

## Verification

Les tests s'executent avec des profils et bases jetables. Les captures et
rapports repetes sont dans `work/qa/collection-gallery*`, hors du depot leger.
La preuve de publication doit porter sur le build fige du commit de livraison.

- Suite `ci` : 107 invocations reussies avec les medias originaux.
- Suite `local` : 14 invocations reussies, bases PostgreSQL ephemeres incluses.
- `browser.test.cjs` : Collection, lecteur, Decks, Arene, Atelier, publication
  additive et reload dans un profil jetable.
- `V4/deploy/browser.test.cjs` : build distribue, 462 cartes, PC/phone, PNG,
  preparation, Arene, sauvegarde/reprise et absence d'erreurs HTTP.
- `collection-versions.test.cjs` : sept formats, editions, proprietes,
  focus, recit/fiche/carriere/exemplaires, vraie image PNG, attente sur cache
  froid, transition bornee et annulations lors des filtres et changements de vue.
- `collection-map.browser.test.cjs` : 71 combinaisons de formats/densites et
  jeux de donnees, noms longs, cinq positions, derniere page, vrai favori
  persistant, controles tactiles, scroll/focus restitues, contraste force et
  absence d'animation permanente. Sept formats, de 320 x 568 a 2560 x 1440.
- `collaborations.browser.test.cjs` : onze formats, scopes, univers, factions,
  filtres combines, etat vide et cibles tactiles.
- `reader-legibility.test.cjs` : sept formats, tailles de texte, contraste,
  couleurs de magie distinctes et contenu integral accessible.
- `career-statistics.test.cjs` : totaux/moyennes, selection d'exemplaire,
  lecteurs PC/Razr/phone/paysage et popup existante.
- `collection-deck-ux.browser.test.cjs` : sept formats, liens vers le bon
  deck/emplacement, comparaison, annuler/retablir, brouillons et revalidation
  des possessions avant remplacement.
- `mobile-browser.test.cjs` : defilement tactile, filtres, lecteur continu,
  preparation locale, Arene portrait/paysage, des non vides, duel et retour
  vers les Decks puis la Collection.
- Controle de syntaxe, `git diff --check` et revalidation ciblee des modules
  UI/build/statistiques apres le nettoyage final des styles.

Les tests de l'ancienne double page ont ete adaptes au nouveau contrat :
ils ne doivent plus exiger un fond livre, deux feuilles ou un nombre de cartes
calcule a partir de la hauteur. Les assertions de droits, d'identite, de
filtrage, de persistance, de lisibilite et d'absence de chevauchement restent.
