# Kalistar V4.5.51 - Retour des popups

Demande de l'auteur du 7 octobre 2026 : utiliser le geste/bouton Retour du
telephone pour fermer une popup, sans rechercher la croix et sans recharger
le jeu. Livraison dans le depot personnel Yoshi-san87/Kalistar uniquement.

## Comportement

- Retour ferme seulement la popup au premier plan et conserve le match,
  le brouillon d'equipe, les filtres et la vue courante.
- Les fiches imbriquees se ferment une par une ; la fenetre sous-jacente reste.
- Croix, fond et Echap restent disponibles et nettoient l'historique technique.
- Repaint des filtres/gestion d'equipe et resize ne creent pas de doublons.
- Une operation refusant `cancel` conserve sa protection de fermeture.
- Un reload ne rouvre pas une ancienne popup ; Forward ne la restaure pas.
- Sans popup, Retour garde sa navigation normale. Aucun geste tactile n'est
  intercepte et aucun double-Retour de sortie n'est impose.

Le module observe les dialogues reels et reutilise leur identite logique.
Les apercus de reserve ouverts explicitement participent ; les simples survols
n'ajoutent pas d'etape d'historique. Les controles et le style restent inchanges.
Schema de sauvegarde, moteur, cartes natives, equipements et Story preserves.

## Validation

`node --test V4/site/navigation.test.cjs` inclut les contrats de boot,
navigation, cancellation des vues dynamiques et nettoyage du module.

`node V4/site/dialog-history.browser.test.cjs` utilise des profils Chrome
jetables, dont la base de registre est isolee. Les gestes sont testes par une
vraie traversal de l'historique du navigateur, pas par un evenement fictif.
Desktop 1440x1000, Razr 50 412x1007 et compact 360x800 : filtres, sommaire,
equipement + fiche personnage, gestion d'equipe, preparation, arene et Story.
Une signature du document et la sauvegarde du match prouvent l'absence de
reload lors de Retour. Le scenario reload est teste separement.

La validation Pages et la construction sont executees depuis un snapshot
isole de l'index Git, sans inclure le workflow/performance local non publie.
`verify-static.cjs <snapshot>` rejoue les controles navigateur sur ce build ;
captures et resultats dans `verification/`.

Resultats verifies : 435 tests du workflow publie reussis, construction Pages
de 232 cartes et 915 fichiers runtime, puis 27 scenarios navigateur reussis
sur ce build. `verification/workflow-results.json` conserve les commandes et
leurs resultats ; `verification/results.json` detaille les scenarios Retour.

Limite : formats telephone emules dans Chrome, sans pretendre avoir effectue
un essai physique sur le smartphone de l'auteur. L'application PWA et le site
chargent le meme module ; aucune nouvelle installation n'est necessaire.
