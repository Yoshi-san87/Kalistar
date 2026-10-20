# Villes d'Astralia - vues validees

Huit vues panoramiques du 20 octobre 2026. La selection validee retient Vulkar 12 :
la cite dans un cratere isole, sans volcan ni sommet visible derriere sa couronne.
Les huit vues de selection.json sont validees pour leur integration au site.
Les exports WebP sont prepares pour le runtime 4.6.100 ; la galerie de sources reste locale.

- `index.html` : galerie locale des huit propositions et originaux en grand.
- `preview.html` : prototype local des images dans les panneaux de la Map.
- `prompts.json` : prompts exacts, roles des references et limites du rendu.
- `provenance.json` : empreintes des sources, des references et des exports.
- `originals/` : sorties PNG image_gen intactes.
- `images/` : WebP d'apercu, uniquement redimensionnes/encodes.

## Sources visuelles

Momo et Valazar definissent la peinture narrative et les matieres ; leurs
personnages ne sont pas repris. La gravure sepia reste reservee a l'atlas.
Durane reprend la silhouette de l'Obelisque et l'arene miniere existante.
WoodLand reprend l'image de cite arboricole fournie par l'auteur, preservee
dans `../../map/layers-1.30/woodland-architecture-reference.png`.
Vulkar reprend les palais de basalte et l'ambiance des Drax existants.
Les autres villes suivent leur definition dans `../../site/map-view.js`
et `../../map/DIRECTION_ARTISTIQUE.md`.

Les nouveaux details architecturaux sont des propositions, pas du canon
supplementaire. Les ornements des tentures ne constituent pas des drapeaux
approuves. Le lac de WoodLand n'est pas nettement en coeur dans cette vue ;
la geometrie du lac de l'atlas reste intacte.

## Apercu de fonctionnement

L'apercu charge directement le module Map du site, les portraits, les huit icones et le terrain
1.39 en lecture seule. Il ne duplique plus les illustrations avec un second lecteur local.
Il ne charge ni comptes, ni base joueur, ni service worker, ni stockage prive.

Apres validation seulement : ajouter les images retenues aux panneaux du
runtime, avec chargement differe, dimensions stables, texte alternatif et
controle du poids. Aucun commit, tag, push ou deploiement dans cette proposition.

Preparation reproductible : `work/scratch/city-portraits-2026-10-20/prepare.cjs`.
Verification navigateur : `work/scratch/city-portraits-2026-10-20/verify.cjs`.

## Revision 02

Voir `DIRECTION_VILLES.md` pour les ajustements demandes par l'auteur,
`prompts-02.json` pour les prompts exacts et `provenance-02.json` pour les hashes.
`selection.json` indique les huit fichiers affiches actuellement. Les versions
01, leurs originaux, leurs WebP et leur preuve de provenance restent preserves.
Les anciennes vues se consultent dans `index-01.html` et `preview-01.html`.
Preparation 02 : `work/scratch/city-portraits-2026-10-20/prepare-02.cjs`.

## Revision 03

La coherence physique des lieux prime sur le remplissage : geographie continue,
chemins et fondations lisibles, proportions humaines et fonds hierarchises.
Voir `DIRECTION_VILLES.md`, `prompts-03.json` et `provenance-03.json`.
Les comparaisons 02 restent dans `index-02.html` et `preview-02.html`.
`selection-02.json` preserve la selection avant ce retour de l'auteur ;
`selection-03.json` et `selection.json` identifient la nouvelle serie.
Preparation : `work/scratch/city-portraits-2026-10-20/prepare-03.cjs`.

## Revision 04

WoodLand s'etire dans une cascade continue, sans effet d'archipel. Arborium
est une nouvelle composition depuis la reference du dome, apres rejet du premier
essai de correction d'echelle. Vulkar retrouve des parois nues entre quelques
quartiers distincts. Thalassea recoit le jet du palais vers la bulle.
Prompts, essai rejete et limites : `prompts-04.json`. Empreintes :
`provenance-04.json`. Selection : `selection.json` et `selection-04.json`.
La serie precedente reste dans `index-03.html` et `preview-03.html`.
Preparation : `work/scratch/city-portraits-2026-10-20/prepare-04.cjs`.

## WoodLand : retour feerique et arbre-couronne

05 reprend l'atmosphere de 01 ; l'auteur aime l'ambiance mais demande de vrais
bois de cerf issus d'un meme tronc. 06 fixe cette silhouette, validee par
l'auteur avant sa demande de feuillage et du batiment principal central.
07 ajoute ces deux elements sans changer les sept autres villes.
Les fichiers image 05/06/07 et leurs prompts sont preserves. Les versions
05/06 etaient des etapes visuelles, pas des series de galerie publiees.
`selection.json` et `selection-07.json` indiquent la vue courante ;
`provenance-06.json` et `provenance-07.json` fixent les empreintes.
Preparation : `work/scratch/city-portraits-2026-10-20/prepare-woodland-07.cjs`.
Toujours aucune publication du site ni modification du module Map.

## Arborium : le dome au-dessus de la foret

08 reprend uniquement l'architecture de l'icone du dome et la peinture narrative
Kalistar. Le dome couronne une hauteur boisee, avec une petite entree humaine,
un seul chemin d'acces et une foret continue en contrebas. Pas de maisons autour.
WoodLand 07 et les six autres vues restent intactes. La proposition attend l'auteur.
Prompt exact : `prompts-08.json`. Preuves : `provenance-08.json`.
La galerie precedente est preservee dans `index-07.html` et `preview-07.html`.
Preparation : `work/scratch/city-portraits-2026-10-20/prepare-arborium-08.cjs`.
Aucune publication ni modification du terrain, des icones ou du module Map.

## Arborium : changement radical d'echelle

09 agrandit reellement le dome par rapport aux arbres : un vaste bassin forestier,
des cours d'eau et de minuscules quartiers sous la verriere. L'architecture et la
peinture de 08 restent les references ; ce n'est pas un simple zoom ou recadrage.
Les mesures indicatives du prompt ne sont pas du canon approuve.
Les sept autres villes restent identiques a 08. Prompt exact : `prompts-09.json`.
Empreintes des 58 fichiers media precedents : `provenance-09.json`.
La galerie 08 reste dans `index-08.html` et `preview-08.html`.
Preparation : `work/scratch/city-portraits-2026-10-20/prepare-arborium-09.cjs`.
Proposition locale en attente de validation, sans publication ni changement du runtime.

## Arborium : les habitations de la foret interieure

L'auteur valide l'echelle et l'ensemble de 09 puis demande un peu plus d'habitations
realistes a l'interieur, sans remplissage copie-colle. 10 conserve le grand dome,
son environnement et la foret dominante ; quelques quartiers varies occupent les
clairieres et les terrasses seches, relies aux chemins et aux cours d'eau existants.
La nouvelle vue attend validation ; les sept autres villes ne changent pas.
Prompt exact : `prompts-10.json`. Preuve : `provenance-10.json`.
Les 60 fichiers media precedents restent identiques. La serie 09 est preservee
dans `index-09.html` et `preview-09.html`.
Preparation : `work/scratch/city-portraits-2026-10-20/prepare-arborium-10.cjs`.
Toujours aucune publication ni modification des fichiers Map du site.

## Arborium : le palais-laboratoire central

11 reunit les petits batiments civiques centraux en un vrai palais botanique :
un corps principal et des ailes de recherche vitrees, des jardins experimentaux
et des acces relies aux quartiers, sans agrandir les maisons ni changer le dome.
Le palais et ses serres constituent une proposition architecturale a valider,
pas un ajout automatique au canon. Les sept autres vues ne changent pas.
Prompt exact : `prompts-11.json`. Preuve : `provenance-11.json`.
Les 62 fichiers media precedents restent intacts. Galerie precedente :
`index-10.html` et `preview-10.html`.
Preparation : `work/scratch/city-portraits-2026-10-20/prepare-arborium-11.cjs`.
Aucune publication ni modification du module Map ou des autres villes.

## Vulkar : un seul cratere isole

12 retire les volcans exterieurs et leurs coulees alimentant le cratere, ainsi
que tous les sommets du paysage de fond. La couronne basaltique est la derniere
terre visible devant le ciel. Les sources de lave restantes sont interieures.
Palais, quartiers, ponts et lac noir sont conserves. Les sept autres images ne
changent pas ; Arborium 11 est desormais validee par l'auteur.
Prompt exact : `prompts-12.json`. Preuve : `provenance-12.json`.
Les 64 fichiers media precedents restent intacts. Galerie precedente :
`index-11.html` et `preview-11.html`.
Preparation : `work/scratch/city-portraits-2026-10-20/prepare-vulkar-12.cjs`.
La correction Vulkar attend validation. Aucune publication ni modification du runtime.

## Integration validee

L'auteur autorise l'integration des huit vues dans les descriptions de villes.
La selection source reste locale ; seuls les seize WebP du registre
`../../map/city-portraits.json` rejoignent les assets du site. Les PNG, anciennes
versions et PSD ne sont pas envoyes au serveur ni ajoutes a Git.
`../../map/prepare-city-portraits.cjs` sauvegarde les sources hors checkout et
exporte sans retouche. L'apercu local utilise le meme module Map que le jeu.
Voir `../../releases/2026-10-20-v4.6.100/README.md` pour la verification de livraison.
