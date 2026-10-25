# Kalistar 4.7.15 - Livraison du menu Astraball

Cette livraison reprend le menu contextuel et le panneau d'analyse de
[4.7.14](../2026-10-26-v4.7.14/README.md), sans modification supplementaire
du jeu, des animations, des medias, des statistiques ou des sauvegardes.

La validation du build fige 4.7.14 a detecte une course dans son nouveau test
navigateur : apres Escape, le test affirmait immediatement que le menu etait
visible, avant l'evenement `close` asynchrone du dialogue natif. Le test attend
desormais la visibilite du menu avec un delai borne, sans pause arbitraire et
sans changement de l'application. La suite navigateur complete a ensuite
reussi sur la meme sortie figee. Le tag deja pousse est preserve ; la version
avance pour inclure ce correctif de test. 4.7.14 n'a pas ete envoyee a Cloudflare.

## Verification

- Suite CI complete relancee : 104 invocations, 2 053 tests reussis, 2 ignores,
  aucun echec. Suite locale complete : 14 invocations, 154 tests reussis.
- Le registre valide reste celui de la livraison precedente, sans les ajouts
  Sprite V2 independants et non termines d'un autre chat. Aucun brouillon de
  cet autre chantier n'est inclus ou modifie.
- Le menu, ses 1 470 dispositions, clavier/tactile, camera et reprises sont
  couverts par les tests decrits dans la livraison precedente.
- Build fige de 4.7.14 : interface Astraball complete et site principal verifies
  sur PC et telephone ; aucun changement applicatif entre 4.7.14 et 4.7.15,
  hormis les numeros de version affiches.
- Avant Cloudflare : reconstruire le commit final 4.7.15 avec prepare-release,
  relancer les deux verifications navigateur sur cette sortie exacte et
  controler le login public ainsi que le token de version apres publication.

Les journaux et preuves restent dans work/astraball/action-wheel/, notamment
ci-4.7.15.log, local-4.7.15.log et les rapports frozen-final-*.
Les contextes navigateur sont jetables ; aucun compte ou stockage personnel
n'est manipule. Le Razr est emule dans Chrome, sans mesure sur appareil reel.
