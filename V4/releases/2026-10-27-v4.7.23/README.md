# Kalistar 4.7.23 - La derniere page jouable de Momo

## Livraison

Suite a la clarification de l'auteur apres le depart de 4.7.22 : ouvrir la
scene interactive apres la victoire du combat 4, pas seulement son recit.
Story/Book et la recompense nocturne de 4.7.22 restent en place.

Copie de production explicite du prototype Momo r6, jamais du dossier work
entier. Aucun fichier du prototype ou d'Astraball remplace. Liste runtime
fermee, modules et styles versionnes, medias inscrits par SHA-256.
62 medias (~19,8 Mio), charges uniquement dans la scene ; le film charge une
seule orientation et seulement a l'approche du final.

La quatrieme victoire ouvre Story puis le Gaming Book. Le joueur peut sortir,
reprendre sa page sur ce navigateur ou revoir la scene. Paris a un apercu
sans recompense. Le parent valide origin/source/jeton de chaque message ;
ni la scene ni son marque-page ne font autorite sur la collection.

Continuer apres l'epilogue appelle l'attribution existante, puis la ceremonie
de carte et son ACK. Aucun nouveau schema SQL, aucune regle de combat changee,
aucun reset. Fermer/recharger avant l'attribution laisse la victoire disponible.
Les anciens recus restent definitifs. Les animations et l'audio disparaissent
avec l'iframe ; Retour smartphone ferme la scene sans recharger le jeu.

## Preservation

118 fichiers d'assets et de sources du prototype sauvegardes hors checkout,
52 881 043 octets, toutes les copies verifiees par SHA-256 :
sauvegardes-privees/gaming-book-momo-20261027-v4.7.23.
La licence Matter.js MIT accompagne le runtime, Lucide reutilise le site.
Aucun nouveau service payant ou generation de media.

## Verification

Les preuves navigateur et rapports locaux sont sous work/qa/gaming-book/.
Les tests de livraison utilisent ensuite le commit fige avant Cloudflare.
PC, Razr, compact, 320 px et paysage : pixels reels, texte, commandes, medias
paresseux, retour, reprise par page, fin explicite et nettoyage.
Le test journeys traverse de vrais combats Worker/PostgreSQL ephemeres puis
le Gaming Book avant de verifier les attributions et ACK des sept etapes.

Les 106 invocations CI ont ete couvertes : 101 avant l'arret sur le compteur
de modules du boot, puis les cinq dernieres apres correction (70 -> 71,
avec controle explicite de l'ordre du nouveau module Gaming Book).
La suite locale complete (14 invocations) et la suite repository (6) passent.
Le navigateur verifie aussi l'animation normale et l'arret des redraws en pause.

Un premier passage CI a detecte deux assertions de titre restees en 4.7.22 :
elles ont ete mises a jour avec les badges, sans modifier leurs exigences.
Un passage local a epuise la recherche bornee d'une issue Balmhyr dans une
fixture a graine aleatoire. Le test isole a ensuite reussi sans changement
des regles ou du moteur ; la relance complete est verte. Un lancement sandbox
a bloque les connexions localhost ; la suite a ete relancee avec ces acces.
Ce test n'est pas une preuve d'equilibrage statistique.

Le premier parcours complet a passe les sept etapes avec lecture interactive,
14 tentatives reelles et 2 408 commandes. Le controle automatique ajoute ensuite
a demande un refresh explicite de la fixture apres son start direct par API,
avant de chercher le bouton Reprendre. Aucun contournement des victoires.
Le second passage confirme l'ouverture automatique depuis une vraie quatrieme
victoire, l'absence d'attribution a l'ouverture, la fermeture sans perte,
puis la lecture complete et une seule attribution a la fin de la scene.
Ce passage complet termine aussi les sept etapes : 14 tentatives, 2 622
commandes, carte et trois equipements, ACK/reload sans doublons et sept apercus
Paris sans progression. Le smoke general du build passe sur PC et telephone :
462 cartes, Book, PNG, Decks, Arene, sauvegarde/reprise, aucune erreur HTTP.
