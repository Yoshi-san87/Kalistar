# Kalistar 4.6.113 - Continuite des cartes en duel

## Perimetre

Le remplacement du plateau a chaque clic recreait les animations de focus
depuis leur debut, meme quand une carte gardait la meme destination. Le test
reproduit notamment une progression de 91,5 ms remise a zero au clic suivant.
`duel-focus.js` reprend maintenant les images-cles et la meme horloge pour ces
cartes. Un nouveau placement annule aussi son ancien tween avant de le remplacer,
pour eviter deux animations concurrentes lors d'un redimensionnement.

Destinations, tailles finales, animations d'attaque, moteur, equipements,
catalogue, medias et sauvegardes restent inchanges. Reduced Motion conserve
son placement immediat. La preparation avant-match 4.6.112 est preservee.

## Verification

- Regression navigateur source : PC 1440, portable 1280, zoom 140 %, grand
  ecran 1920, telephone 412 et Reduced Motion. Mesures avant/apres clic et
  pendant les transitions, selection rapide, verrouillage, lancer et parite
  exacte avec le moteur. Controles supplementaires de resize et de tactile.
- `npm test` : 102 groupes passes, avec les bibliotheques et medias locaux.
  Le premier lancement avait detecte une invocation historique reecrite dans
  le registre de 4.6.111 ; son proprietaire l'a corrigee avant cette passe verte.
- Preuves locales ignorees : `work/qa/duel-focus/`, notamment
  `full/suite-final.log`, `restart-before/` et `final-source/`.

Le commit exact est prepare avec `prepare:release`, puis verifie par la
regression focus et le smoke PC/telephone avant envoi au projet Cloudflare
existant. Le login public et les ressources privees sont controles sans
identifiants reels. Git conserve le texte uniquement, sans nouveau media.
