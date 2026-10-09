# Kalistar 4.5.62

Suivi de la publication FFIX 4.5.61, sans changement de gameplay ni d'image.
Le controle public compare desormais le HTML local au HTML GitHub en
normalisant uniquement les identifiants de cache CSS/JS/manifest : le build
utilise une empreinte locale, mais GITHUB_SHA sur GitHub Actions.

Le hash brut de chaque ressource doit d'abord correspondre au manifeste
public. Le contenu normalise doit ensuite correspondre au build local.
Les autres fichiers sont verifies octet pour octet sans normalisation.
Les tests rejettent un contenu different, un cache melange ou un media altere.
Aucun rapport de 4.5.61 n'est modifie.

La ressource locale non publiee cryptown-oath-sword-scene-v1.webp n'est
referencee par aucun equipement actuel et reste hors de cette publication.
Le build local contient donc un fichier de plus que Pages ; les 72 nouveaux
exports FFIX et les fichiers actifs verifies sont identiques.

Le script public accepte KALISTAR_BUILD_PROOF pour une nouvelle preuve,
et KALISTAR_VERIFICATION_DIR pour conserver les controles successifs.
La version 4.5.62 est incrementee selon la regle un push = une version.
