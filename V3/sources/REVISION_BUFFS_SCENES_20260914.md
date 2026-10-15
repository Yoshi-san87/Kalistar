# V3 - buffs, iconographie et nouvelles scenes

Cette demande remplace les choix graphiques precedents pour les cibles listees uniquement. Travail exclusivement dans le meme projet V3. Le parent assemble les cartes et raccorde le jeu.

## Direction commune

Momo 01 et 14, Cana 02, Aelis 06, Zviri 10, Taulio 13 : illustrations toujours verrouillees. Voloden 28 et Valazar violet 34 ne changent pas. Le reste hors liste reste intact.

DA des illustrations : peinture narrative Kalistar, reference principale `assets/illustrations/01_ELECTRO_MOMO.png`, references secondaires Voloden et Valazar. Peinture construite par plans et touches visibles, lumieres motivees, matieres usees, visages expressifs ; pas photo, anime, plastique 3D ou simple filtre de grain. Conserver l'identite du personnage sauf correction explicite. Portrait environ 4:5, sans texte ni cadre, anatomie lisible. Metamorphes humanoides deux bras/deux jambes sauf demande explicite de sirene nageuse pour Ruby. Ne pas reprendre la meme pose dans toutes les scenes.

## Illustrations demandees

- 07 BALMHYR : roi dechu charismatique, regard vers l'horizon sur Durane, son ours derriere lui. Conserver sa race naine, barbe et identite. Retirer la scene d'echange avec enfant. Gravite et noblesse sans trone ajoute.
- 12 KAYLIS : meme jeune femme adulte metisse indienne/antillaise, silhouette svelte athletique, tenue noire de mine. Debout appuyee sur ses DEUX jambes, regarde ses propres bras incandescents Rainbow avec stupeur et emotion heroique, comprend qu'un pouvoir la depasse. Les bras illuminent la grotte sombre et son visage. Pas pose de mannequin, pas regard au loin, pas yeux manga.
- 16 NERIS : refaire la scene, trop photographique et grand-mere. Soigneuse cryomancienne adulte, presence resolue et emotive, personnage peint et non portrait photo de vieille dame. Conserver fonction CRYO, identite lisible et narration du refuge. Pas simple filtre de texture.
- 23 GEN : conserver la scene et le personnage de l'atelier, ajouter des etincelles et un petit court-circuit au niveau du bras mecanique qu'il repare. Pas cristal, pas troisieme bras, pas incendie.
- 25 KOGNUS : nain mesquin et mauvais, ruse et autoritaire, regard calculateur. Conserver ses cles/role de surveillant Z13, pas sympathique.
- 26 REEVUS : nain mesquin et mauvais, le plus borne et obtus du duo, brutal et balourd, expression lisible sans caricature grossiere. Garder role/intendant et identite, pas sage aimable.
- 27 XIAOMI : femme adulte clairement asiatique, katana, ninja dans la penombre d'un couloir ; menace et discretion, visage/arme lisibles, anatomie credible. Sa categorie mecanique existante ne doit pas etre modifiee par l'agent.
- 32 JELLY-JOE : vieux marin use et alcoolique, esprit pirate fanfaron/charmeur rappelant l'energie de Jack Sparrow sans copier son costume ou Johnny Depp. Au bar en train de faire la fete, chope/bouteille et joie desordonnee. Conserver son identite TANTALAK humanoide, son element ELECTRO et les caracteristiques etablies dans les sources, ne pas transformer sans raison en humain.
- 35 CAPITAINE SKULLY : retrouver sa premiere illustration en mer dans les sources du projet/classeur/anciennes productions, puis l'adapter a la DA Kalistar. Garder son identite de capitaine squelette. Ne pas inventer une reference introuvable : signaler si recherche infructueuse et proposer scene en mer fidele.
- 36 ELENION : cerf humanoide plus imposant et menacant, arc BANDE, fleche encochee, en train de viser ; deux bras/deux jambes, tete de cerf. Geste de tir mecaniquement coherent, regard intense.
- 39 RUBY : sirene sous l'eau nageant avec un dauphin, cheveux et tissus portes par l'eau ; deux petits pistolets-harpons au niveau des hanches, clairement accessoires sous-marins. Conserver visage/cheveux roux/peau bleue existants. La demande sirene nageuse autorise une queue de sirene si naturelle dans la scene. Pas de tir actif, pas membre duplique.

## Races

Revenir a la DA RICHE ET DETAILLEE des PNG sous `sources/avant-harmonisation-20260914/assets/races`, avec reliefs metalliques, contours ciseles, couleurs et materiaux fantasy. La serie de logos plats de la derniere passe est rejetee. Varier profils/trois-quarts/signes naturels selon race ; ne pas faire dix-neuf faces identiques. Reference au vrai ancien PNG de chaque race indispensable. Un embleme coherent par race. Humain naturel, Cardemortis coeur noir/mort maintenu. Transparence reelle hors embleme, pas carre, fond ou medaillon rond supplementaire car le parent a le logement circulaire. Garder des formes fortes lisibles a 90px, pas traits microscopiques.

## Armes et roche

Armes : silhouettes BLANCHES comme les anciens symboles, sans carre bleu. Orientation vers l'exterieur du cote gauche de la carte : tete/lame vers le haut-gauche, manche vers le bas-droit selon reference historique. Les formes non directionnelles restent naturellement centrees. Instrument = guitare standard, flute Momo future speciale seulement. Index/matrice des 20 categories ne changent pas. Chercher d'abord les anciens pictogrammes/sources editables ; extraction native ou code-vector si deja natif preferable a une nouvelle peinture coloree. Le parent valide avant integration.

MINERO : remplacer la capsule magique par une pierre/facette rocheuse avec un peu de magie autour, pas une nouvelle couronne de petits cailloux. Centre assez calme pour le chiffre. Le parent gere cet asset et le calque Photoshop.

## Production des agents

Sorties uniquement sous `V3/assets/revisions-buffs-scenes-20260914/<famille>`. Aucun ecrasement des canoniques, aucun changement au jeu/BDD/regles/profils par les agents graphiques. Manifeste specifique `V3/donnees/revision_buffs_scenes_<lot>.json`, avec prompts complets, references ordonnees, sorties natives, SHA256 et QA. ImageGen integre, un appel par asset, corrections ciblees si necessaires ; PNG alpha controle pour iconographie. Inspecter les vraies sources avec view_image avant edition et toutes sorties apres generation. Le parent integrera les assets approuves, adaptera les textes narratifs concernes si besoin et reconstruira les 41 cartes.

## Clarifications Gameplay Confirmees

- Le joueur a confirme ne PAS choisir l'ordre d'activation : bouclier inclus dans la DEF, puis trefle automatiquement si insuffisant, puis Reraise si la seconde chance echoue.
- Les cinq categories se cumulent : ward, luck, reraise, mana, physical. Une seule charge par categorie ; pas deux coeurs, trefles, boucliers ou potions de meme type. Une attribution identique conserve la charge, sans doubler le soutien dans les statistiques.
- Le buff physique ATK doit aussi pouvoir etre attribue a n'importe quel allie vivant du plateau, auteur compris, comme la potion magique. Nouvelle phase physical, grantPhysical/aiPhysicalChoice et physicalGranted ; schema V3 6 et BDD actuelle conserves.
- Elenion : l'arc explicitement demande remplace sa categorie Fleau par Arc, index 5 ; aucune modification de la matrice ni de ses stats numeriques.
- Skully : original en mer retrouve dans le calque 873 de template-source.psd, extrait dans sources/skully-original-psd.png. Reference prioritaire a la place de toute scene marine inventee faute d'image.
