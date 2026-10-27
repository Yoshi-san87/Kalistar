# Kalistar 4.7.22 - Story, Book et la nuit de Momo

## Perimetre

- Fragment devient Story dans les menus PC/phone, le lecteur, le menu de match
  et les manuscrits joueur. Le roman devient Book. Les routes #journeys/#story,
  les clefs de lecture, sauvegardes et identifiants de parcours ne changent pas.
- Story porte la signature Gaming Book. Le prototype interactif local reste
  isole : cette livraison raccorde le recit, sans publier son moteur en travail.
- Momo gagne de nouveau L'Artiste magique, modele 30000001, assis a la flute
  dans la nuit. Couverture, quatrieme capitaine et peinture suivent cette edition.
- Le combat 4, Et la nuit ecouta, reprend les marches, la musique pour soi et
  la presence de Taulio. La decouverte reste au combat 3, Gezinho au chapitre 7.
  Les scenes avant/apres font 122 et 131 mots. Aucun changement du roman.
- Sur phone, le titre repete ne couvre plus les portraits du lecteur.
  Pas de nouvelle animation permanente, de media ou de dependance runtime.

## Registre Personnel

La migration 015 passe le registre de 13 a 14 et change seulement la future
recompense Momo. Les deux anciennes editions restent sur leurs vrais recus.
Collections, combats en cours, equipements et progressions ne sont pas modifies.
Pas de seconde recompense apres un transfert, aucun reset.

Avant application : export coherent des tables applicatives et Auth, sauvegarde
DPAPI hors checkout, restauration isolee et verification du rechiffrement.
Empreinte du fichier chiffre :
`511e62346518d75aaab2cb754cfdb6fb530d37f5d37b768ef18846a885a22638`.
L'export temporaire non chiffre a ete supprime apres verification.
Controle SQL distant : modele 30000001, sept etapes, registre 14 ; nombres
d'exemplaires, combats, progressions et claims identiques a la sauvegarde.
Aucune cle, adresse personnelle ou donnee d'Auth dans le depot.

## Verification

Les commandes de livraison sont celles de docs/VALIDATION.md :

- suite ci complete : 105 invocations reussies avec les medias originaux ;
- suite local : 14 invocations reussies, incluant migration, non-regression et
  restauration du schema 14 ; suite repository : cinq invocations reussies ;
- build CF_PAGES=1 : 462 cartes, 1 968 fichiers, 1 142,6 Mio ;
- journeys : sept combats signes, reprises, ceremonies et aucun doublon ;
- login : six profils, refus d'acces, connexion/deconnexion, reprises et lecteur ;
- navigateur deploy : PC/phone, Collection, Book, decks, Arene et reprise ;
- organisation et diff explicitement stages controles.

Le premier essai local a rencontre une restriction de connexion loopback
Windows ; la relance autorisee hors restriction a reussi sans changement du
serveur. Le test login attendait l'ancien conteneur .jv-scene : il verifie
maintenant le panorama effectivement affiche, sans supprimer le controle
de decodage. Le premier build sans CF_PAGES utilisait la limite historique
GitHub de 900 Mio ; le build Cloudflare a reussi sans relever les limites.

Les captures des scenes PC/Razr sont dans work/qa/journey-view.browser.test/.
Le quatrieme chapitre utilise la peinture nocturne originale et le lecteur
reste immobile au repos. Les ceremonies restent conditionnees aux acquittements.
La verification du commit fige et les controles publics suivent avant annonce
de mise en ligne. Publication personnelle uniquement, sans inclure les autres
travaux locaux ni les sorties QA.
