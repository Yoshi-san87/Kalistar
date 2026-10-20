# Kalistar 4.6.100 - Vues des villes

## Perimetre

- Les huit illustrations validees rejoignent les descriptions de Map :
  Durane 02, WoodLand 07, Kalistopolis 03, Arborium 11, Velane 01,
  Vulkar 12, Cryptown 03 et Thalassea 04.
- Apercu au depliage, vue detaillee au clic, fermeture tactile ou Echap et
  restitution du focus. Pas de requete pour les portraits des fiches fermees.
- Etats d'echec lisibles sans masquer le texte. Un demontage de Map ferme
  la fenetre et retire ses listeners ; aucune persistance personnelle ajoutee.
- Textes de Kalistopolis, Arborium et Vulkar raccordes aux lieux valides.
- Terrain 1.39, huit emblemes, noms, positions, fond Collection, catalogue,
  gameplay, authentification et sauvegardes inchanges.
- Seize WebP supplementaires : 953 880 octets d'apercus et 3 725 786 octets
  de vues detaillees. Aucun original PNG/PSD ni ancienne proposition publies.
  Les sources PNG et prompts sont sauvegardes hors du checkout actif.

## Provenance Et Verification

`V4/map/city-portraits.json` fixe les sources choisies et leurs SHA-256.
Le registre runtime ajoute uniquement les seize WebP derives. Le build fige
provient du commit exact, pas de travaux locaux ou de sources graphiques Git.

Controles locaux executes :

- npm run check apres staging explicite ; aucun binaire ni travail tiers stage.
- npm test : 97 invocations, avec KALISTAR_NODE_MODULES vers les bibliotheques
  du poste. Sans cette variable, les anciens tests Library ne trouvent pas marked.
- Map : sept formats, selection des huit villes, geographie, zoom et labels.
- Portraits : PC, Razr, 320 px, paysage et tablette ; chargement a la demande,
  agrandissement, Retour/Echap, focus, erreurs, demontage et retour dans Map.
- Ctrl + molette reel, ancrage sous le pointeur, clavier, drag et remount.
- Build : 446 cartes ; Collection, lecteur, PNG, Decks, Arene et sauvegarde/reload
  verifies sur PC et telephone, sans erreur HTTP/JavaScript.
- Les 1 375 anciens medias du registre restent identiques ; seuls seize
  nouveaux WebP sont ajoutes. Les sources natives choisies gardent leurs hashes.

Le build utilise CF_PAGES=1, comme les livraisons Cloudflare existantes ; le
plafond historique GitHub Pages n'est pas assoupli. Les tests navigateur
utilisent des profils et bases jetables, jamais la collection personnelle.
Le commit exact prepare est reteste avant envoi. Les captures et rapports
repetables restent dans work/qa/map-city-portraits/.
