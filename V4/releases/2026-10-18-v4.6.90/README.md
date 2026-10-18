# Kalistar 4.6.90

## Perimetre

Cinq cartes Lara Croft, illustrations validees le 18 octobre 2026 :
Tomb Raider I, II, III, The Last Revelation et Chronicles.
Modeles 49903101-49903105 ; catalogue de 439 a 444 cartes.
[Galerie et fabrication](../../expansions/2026-10-18-lara-croft/README.md).

Nouvelle faction TOMBRAIDER, collection Tomb Raider et banniere turquoise,
cuir sombre et or ancien avec boussole TR. Fan crossover non officiel.
Une identite `lara-croft-tomb-raider`, cinq editions collectionnables,
une seule Lara par deck. Aucun preset ou combat de cinq Lara.

Kalistels GEO, HYDRO, MINERO, LUXO et NECRO adaptes aux scenes. Profils
distincts P3, P4 et P2, avec les effets existants : trefle, potion, puissance
physique, esquive et barrieres. Pas de Mort ni de Reraise artificiel.
Les valeurs restent dans les bornes de poste V3 ; aucune regle moteur,
matrice d'armes, sauvegarde, SQL ou progression cloud modifiee.

## Sources

Illustrations approuvees preservees octet pour octet. Exports natifs
897 x 1497, PSD editables et objets dynamiques. Icône Gun blanche courante.
Le masque natif de banniere est conserve ; seuls le nouveau composant et
son asset web sont ajoutes. Aucun verrou precedent reecrit.
Six nouveaux medias runtime : cinq cartes et une banniere.

Sauvegarde hors checkout :
`sauvegardes-personnelles/creation/2026-10-18-lara-croft-native/`,
223 fichiers, 228627283 octets, manifest SHA-256 verifie.
Les PSD et images restent hors Git, aux chemins de production habituels.

## Controles

- Tests natifs : cinq codes-barres valides, zero difference de cadre fixe,
  zero difference apres reouverture PSD, textes et empreintes conformes.
- Neuf tests moteur : 60 faces imprimees, soutiens, barrieres, journaux,
  restauration, cinq matchs ABBA termines et exclusion des doubles Lara.
- Galerie : 1920/1440/800/412/320 px, zoom, clavier, filtres et mouvement reduit.
- Jeu : cinq lecteurs en desktop/Razr/320 px, duel, sauvegarde/reload et import
  d'une ancienne sauvegarde dans un profil jetable.
- Navigateur general : 444 cartes, Collection, PNG, Decks, Arene, reprise,
  aucune erreur JavaScript ou HTTP.
- Suite complete : 95 invocations reussies. Suite locale : 13 invocations
  reussies. Suite GitHub repository : 105 tests reussis.
- Build Cloudflare : 444 cartes, 1504 fichiers, environ 1068,2 Mio.

Logs et captures : `work/qa/lara-croft/`. Aucun test ne touche au profil
personnel de l'utilisateur. Le controle supplementaire a permis de raccorder
Tomb Raider au filtre explicite du classeur. Il verifie aussi le changement
entre les cinq editions regroupees sous un seul personnage. La suite complete
finale repasse ses 95 invocations dans ci-final.log apres cette correction.
Les essais intermediaires restent locaux.

## Publication

Main et tag annote v4.6.90 vers Yoshi-san87/Kalistar. La sortie du commit
exact est preparee, controlee dans le navigateur puis envoyee au projet
Cloudflare personnel kalistar. Le login public PC/Razr et la version des
assets publics sont controles apres envoi. Aucun secret ou acces modifie.
