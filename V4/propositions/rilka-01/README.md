# Rilka - Cinq propositions d'illustration

## Carte Rikka

L'utilisateur a choisi le nom definitif **Rikka** et approuve la proposition 04D Luxo. Premiere carte : `../../cartes/RIKKA_V4_01_TEMPLATE_ELECTRO.png`, PSD : `../../templates/RIKKA_V4_01_TEMPLATE_ELECTRO.psd`. P2, une attaque magique, dodge et trefle en DEF. L'illustration d'origine reste intacte ; une extension generative du musee permet un cadrage avec le Kalistel visible hors des statistiques. Details : `../../template-stable/rikka/README.md`. Les noms de fichiers Rilka ci-dessous sont historiques.

## Revision 04D : Kalistel Luxo

L'utilisateur a approuve la scene 04C et demande uniquement un Kalistel **Luxo**. [04D - Kalistel Luxo](04d-kalistel-luxo.png) remplace le cristal ambre contenu dans le reliquaire par un cristal blanc opalescent, a facettes irisees et fin halo dore. Reference de matiere : `V3/assets/cristaux/LUXO.png`. Le personnage reste Electro ; ce changement concerne uniquement l'objet vole.

Retouche generative ciblee via image_gen integre, [prompt exact](prompt-04d-kalistel-luxo.txt), [provenance](revision-04d.json). Revue visuelle : identite, coiffure, pose, reliquaire et composition du musee conserves. Il ne s'agit pas d'une garantie d'identite pixel a pixel hors du cristal. Sortie generative copiee sans retouche locale ; la source 04C reste intacte. Aucun PSD, carte, site ou BDD modifie. Illustration a valider avant integration.

## Revision 04C : musee et Kalistel

L'utilisateur a choisi le **carre asymetrique, coiffure 02**. [04C - Musee et Kalistel](04c-musee-kalistel.png) conserve cette coiffure, l'identite, la blessure et l'action de vol. Le musee est redessine en galerie prestigieuse : pierre claire, verre, socles sombres, details de bronze et eclairage d'exposition. Les bannieres sont retirees.

L'objet derobe est un reliquaire de verre et de metal contenant un Kalistel nettement visible. La teinte Electro doree est une proposition visuelle pour cette iteration, pas une nouvelle decision canonique sur la provenance de l'objet. La main le souleve de son support dans la vitrine ouverte.

Retouche via image_gen integre, [prompt exact](prompt-04c-musee-kalistel.txt), [provenance et controles](revision-04c.json). PNG original de generation conserve sans retouche locale. Les precedentes propositions, les six coiffures et les cartes V4 restent intactes. Aucun PSD, profil de jeu, site ou BDD modifie. Version a valider avant integration a une carte.

## Revision 04B : vol au musee

[04B - Vol au musee](04b-vol-au-musee.png) reprend l'identite de la proposition 04, avec une nouvelle scene de cambriolage dans un musee de Chroma. Rilka retire une relique d'une vitrine ouverte et regarde vers la galerie, en alerte. Ajouts demandes : courte chevelure asymetrique, elegance athletique, blessure superficielle au bras sous une manche dechiree. La posture devient fonctionnelle et narrative, sans regard seducteur vers le spectateur. Le fouet electrique est conserve.

Retouche generative avec image_gen integre, references : proposition 04 (identite), Momo et Valazar (DA). [Prompt exact](prompt-04b-musee.txt), [provenance et controles](revision-04b.json). PNG copie sans retouche locale de la sortie generee. Les cinq propositions precedentes et les cartes existantes restent intactes. Illustration a valider avant cadrage et integration au PSD : la main tenant la relique approche du bord droit et devra etre controlee avec le rail DEF.

## Serie initiale

Statut : propositions a choisir, pas encore integrees a une carte. Rilka est un nom de travail propose, pas une identite imposee au canon.

Brief utilisateur : Felineus hybride gueparde, adulte, voleuse de Chroma, grande silhouette elancee et jambes d'athlete, touche cyberpunk legere, fouet electrique et electricite associee a la vitesse. Direction Kalistar : peinture narrative, matieres usees, references Momo et Valazar. Aucun cadre de carte genere.

## Propositions

1. [Un eclair d'avance](01-depart-sur-les-toits.png) : depart en sprint, toits de Chroma au soleil couchant, butin et fouet en mouvement.
2. [Sous la pluie de Chroma](02-infiltration-sous-la-pluie.png) : infiltration d'un atelier, nuit bleue et lumiere chaude, attitude furtive.
3. [Entre deux battements](03-saut-des-passerelles.png) : impulsion entre deux passerelles, silhouette dynamique, grand arc de fouet.
4. [Le sourire du larcin](04-sortie-du-coffre.png) : sortie d'un coffre, pose elancee, butin en main et assurance tranquille.
5. [La ville sous ses pas](05-equilibre-sur-chroma.png) : equilibre sur une poutre, veste claire et lumiere du matin, vue ouverte sur Chroma.

Comparaisons : [illustrations completes](comparatif-illustrations.png), [visages](comparatif-visages.png). Les planches sont des apercus numerotes ; les cinq PNG individuels restent les sorties generatives intactes.

## Production

Cinq appels distincts a l'outil image_gen integre, avec `V3/assets/illustrations/01_ELECTRO_MOMO.png` et `V3/assets/illustrations/34_NECRO_VALAZAR.png` comme references de style uniquement. Aucun recours a une API/CLI externe.

Prompts exacts : [01](prompt-01.txt), [02](prompt-02.txt), [03](prompt-03.txt), [04](prompt-04.txt), [05](prompt-05.txt). Leur generation reproductible est dans `prepare.cjs` ; `specs.json` contient les cinq specifications. `sources.json` et `manifest.json` consignent les fichiers generes, dimensions et SHA-256. `prepare-comparisons.cjs` copie les originaux sans modification et assemble uniquement les apercus.

## Revue

Les cinq propositions montrent une silhouette humanoide a deux bras et deux jambes, un visage de gueparde, une arme materielle electrifiee et un decor de Chroma. Les jambes et les appuis sont visibles ; le visage n'est pas masque par les effets. La piste 03 privilegie le mouvement, la 04 le caractere, la 05 la longueur de silhouette et une palette plus claire. Le rendu des visages de 01 et 02 est plus lisse que les matieres du decor : une harmonisation ciblee reste possible apres selection. Les costumes explorent davantage la recuperation fantasy-industrielle qu'un cyberpunk fortement neon.

La proposition 03 demande une attention particuliere au recadrage dans les futurs rails de carte, car le bras et le fouet utilisent davantage la largeur. Aucun personnage, profil, statistique, PSD, site ou BDD existant n'est modifie. Les fichiers des quatre cartes V4 actuelles et le template 03C sont proteges par empreinte.
