# Kalistar V4.3.4 - Verification Pages portable

Suite de la publication utilisateur du 2 octobre 2026. Le premier workflow
V4.3.2 a echoue sur deux tests locaux chargeant sharp depuis un chemin Windows.
Le workflow utilise maintenant des tests portables des profils effectivement
publies, des limites de role, des preuves natives et du catalogue dans le
moteur reel. Photoshop reste uniquement necessaire a la production locale.

La publication concurrente V4.3.3 des filtres de collection est preservee.
Version visible 4.3.4 sur ordinateur et telephone, sans changer l'edition V4
ni les sauvegardes. La branche et le tag v4.3.4 sont publies ensemble.

193 cartes et 28 arenes, dont Geralt 49900101, Ssilas 49900201 et Mirelle
49900202. Aucun changement des illustrations, PSD, profils, references ou
composants natifs. Geralt en chemise blanche reste non publie.

Le roman long encore modifie localement reste hors de cette publication.
Les compilations et tests locaux emploient sa version deja committee via
un overlay en lecture seule, sans remplacer les sources de travail.

Verification locale : 78 tests de deploiement, catalogue et profils passes,
dont les tests portables ; six vues
des trois cartes en ordinateur/mobile, version visible et empreintes des
images. Le controle public compare le catalogue et les 480 fichiers jouables
avec la compilation du meme commit, puis les trois PNG natifs.
La reussite du workflow et le controle public sont necessaires pour annoncer
la fin effective du deploiement.
