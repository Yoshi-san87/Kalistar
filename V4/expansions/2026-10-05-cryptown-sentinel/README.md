# Varkhen - Soldat de Cryptown

Demande utilisateur du 5 octobre 2026 : alleger la fumee de l'illustration
approuvee, puis produire la carte native. Ajout original, aucun remplacement.

## Identite et profil

- VARKHEN, LE DERNIER AVERTISSEMENT.
- Modele 49900501, characterId stable varkhen-kalistar.
- Cryptown, SKULLZ, SOLDAT, NECRO, Epee longue.
- Role principal P1, compatible P1/P3.
- ATK D6-D1 : 204, 170, 133, 97, 61, Garde.
- DEF D6-D1 : 291, 234, 185, 141, 90, 38.
- Attaques magiques D5/D3 ; barrieres D6/D4.
- Aucun effet Mort, Esquive ou Reraise supplementaire.

Profil defensif sous les bornes P1 existantes : un pic DEF a 291 mais des
faces basses reduites, et une attaque remplacee par Garde. Le plastron
lumineux ne cree pas de mecanique passive. Magie, barriere et Garde utilisent
uniquement le moteur courant. Ce choix n'est pas une preuve d'equilibrage
competitif, qui demanderait des parties mesurees.

## Illustration

La derniere generation conserve le soldat noir/violet, son casque compact,
le Kalistel au col, les cotes lumineuses uniquement au torse et l'epee droite.
La fumee devient quelques volutes discretes. La banniere reprend le vrai
fanion Cryptown des assets du projet, pas un embleme invente.

Le PNG source est V4/Illustrations/Cryptown_Varkhen_01.png.
selected-art/varkhen.png est identique. art-selection.json conserve les
prompts ImageGen exacts et la provenance. references/ garde la version
approuvee avant l'allegement de la fumee. Momo et Valazar ont ete consultes
pour la DA. Aucun cadre de carte n'a ete genere par IA.

## Production et preservation

La route native reutilise les composants verrouilles de l'Atelier et
compose-one.jsx du lot city-guards, en lecture seule. Textes natifs editables,
elements graphiques separes et objets dynamiques incorpores. Le PNG final
fait 897 x 1497 pixels, 300 ppp.

build.cjs freeze et prepare figent la preparation et les 173 creations
preexistantes. dependencies.json et existing-created.snapshot.json ne sont
jamais reinitialises. La premiere tentative de rendu s'est arretee avant
composition : le poste contient Photoshop 26.11.8, et non 26.11.7.

L'adaptateur additif runtime-26118.cjs conserve ce premier garde-fou intact.
Son manifeste propre est runtime-26118.inputs.json. La calibration exporte
les PSD approuves Momo, Taulio et Valazar sous 26.11.8 et compare leurs PNG
aux references : zero pixel different sur les trois. Les sources approuvees,
l'ancien rapport global et les verrous ne sont pas modifies.

Commandes pour cette production :
- node runtime-26118.cjs render
- node runtime-26118.cjs verify
- node publish.cjs (preflight)
- KALISTAR_CRYPTOWN_PUBLISH=2026-10-05 node publish.cjs --publish

Le controle final exige toujours le cadre fixe identique, le PSD rouvert
identique au PNG, les bonnes polices, le recit dans sa zone et le vrai
code-barres lisible. Aucune comparaison n'a ete assouplie pour changer
de version Photoshop.

## Tests

integration.test.cjs verifie l'identite, les bornes, les modes numeriques,
la collection Kalistar, les synergies et 24 matchs complets avec reprises.
Deux compositions de QA couvrent les postes ; aucun preset utilisateur
n'est ajoute et les sauvegardes personnelles ne sont pas ouvertes.

browser.test.cjs photographie le lecteur de collection et l'arene sur
ordinateur et Razr 50 (412 x 915), avec verification des images et du reload.
Les rapports native-checks.json et browser-proof/results.json font foi
pour les etapes effectivement terminees.
