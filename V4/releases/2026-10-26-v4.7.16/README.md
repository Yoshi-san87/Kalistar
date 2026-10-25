# Kalistar 4.7.16 - Validation camera du menu contextuel

Livraison du [menu Astraball](../2026-10-26-v4.7.14/README.md), avec les
[attentes de dialogue fiables](../2026-10-26-v4.7.15/README.md).
Hormis le numero affiche, le code du jeu reste celui de 4.7.14.
Les versions Git 4.7.14 et 4.7.15 n'ont pas ete envoyees a Cloudflare.

Le test de camera utilisait une coordonnee fixe pour la molette et le debut
du glissement. Apres un deplacement extreme en paysage, une icone du nouveau
menu pouvait recouvrir cette coordonnee : le test attendait alors a tort un
evenement sur le canvas. Il choisit maintenant le point libre le plus proche
par hit-test DOM. Le geste reste natif ; aucun evenement synthetique, masque
force des controles ou assouplissement des assertions de camera n'est ajoute.
La suite complete de camera a ensuite reussi sur le meme build fige.

Les interfaces Astraball et Kalistar ont ete verifiees sur la sortie figee
precedente, sur PC et telephone. Les suites CI et locale de cette livraison
utilisent le registre publie, en excluant les brouillons Sprite V2 d'un autre
chat. Les tests restent dans les entrees existantes du registre.
Resultats : CI, 104 invocations, 2 053 tests reussis, 2 ignores, aucun echec ;
local, 14 invocations, 154 tests reussis, aucun echec.

Journaux : work/astraball/action-wheel/ci-4.7.16.log et local-4.7.16.log.
Avant publication, reconstruire le commit exact, repasser interface, site et
camera sur cette sortie, puis verifier le workflow GitHub, le login public
et le token de version Cloudflare. Le rapport prive publication-proof.json
conserve les resultats et l'URL du deploiement final. Les tests utilisent des
profils jetables et le telephone est emule ; aucun compte personnel n'est modifie.

Aucun changement de regles, d'IA, de statistiques, de schema/sauvegarde,
de media, de base de donnees ou de droits d'acces n'est inclus.
