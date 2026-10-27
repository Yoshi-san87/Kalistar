# Kalistar 4.7.24 - Ballon Astraball dans les menus

L'entree Astraball reprend le ballon Les Fondateurs deja publie par le jeu :
V4/astraball/assets/balls-v1/founders.webp. Meme ressource, meme SHA-256,
aucune copie ni generation d'image. Le jeu et ses sauvegardes restent inchanges.

Le composant commun des menus principal et Arene affiche le ballon en 40 x 40
pixels CSS, avec ratio carre, fond transparent et libelle Astraball conserve.
Le visuel est decoratif pour les lecteurs d'ecran. Aucun nouvel effet continu.

Verification : navigation.test.cjs controle la source et son empreinte ;
menu-navigation.browser.test.cjs verifie le chargement, 40 x 40, l'absence de
l'ancien symbole orbit, les deux menus et leurs contraintes PC/Razr/320 px,
paysage et Reduced Motion. Les preuves vont dans work/qa/astraball-menu-icon/.
Le paquet du commit exact est controle avant publication Cloudflare.

Version PC, mobile et Astraball incrementee ensemble, sans migration de donnees.

Resultats avant commit : 18 tests navigation/build, six invocations repository,
14 invocations locales avec medias originaux et cinq profils navigateur verts.
L'assertion historique d'integration Astraball suit le nouveau visuel ; le test
du lien d'ouverture et du retour au jeu reste intact. Un premier lancement
Node a ete refuse par Windows avant execution ; sa relance complete a reussi.
