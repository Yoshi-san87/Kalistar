# Kalistar V4 - Identite visuelle

Consolidation du 20 septembre 2026 des consignes artistiques et des decisions
utilisateur. Complete la [regle d'or](../DIRECTION_ARTISTIQUE.md), sans proposer
une nouvelle DA. Retour au [guide de reprise](../../docs/GUIDE_REPRISE.md).

## References obligatoires

- [Momo](../../V3/assets/illustrations/01_ELECTRO_MOMO.png) : reference principale
  de peinture narrative, emotion, matieres et lisibilite.
- [Valazar](../../V3/assets/illustrations/34_NECRO_VALAZAR.png) : reference
  complementaire pour les volumes peints et les matieres usees. Son ambiance
  sombre ne doit pas devenir obligatoire pour tous les personnages.
- Momo et Taulio V4 : references de lecture de la carte complete. Trouver leurs
  fichiers dans [le verrou](../atelier/data/references.json), pas parmi les essais.

Ouvrir les images, ne pas se contenter de lire leurs noms. Un prompt de style
seul ne garantit pas une reproduction exacte. La coherence demande references
visuelles, selection et controle dans le cadre final.

## Illustration : les invariants

Peinture fantasy narrative detaillee : coups de pinceau visibles, plans de
couleur et contours hierarchises. Volumes peints, textiles, cuir et metaux patines.
Pas de photographie, photorealisme, peau plastique, 3D lisse, manga ou anime.
Ne pas ajouter un bruit numerique uniforme pour simuler une peinture.

Chaque illustration raconte un instant : geste credible, regard dirige, emotion
personnelle et relation avec le lieu ou les autres personnages. Eviter le
portrait vide, le sourire automatique et la pose de mannequin suggestive.
Une silhouette elegante reste compatible avec une action naturelle.

Lumiere justifiee par la scene. Contraste principal sur le visage, les mains et
l'action. Decor evocateur mais subordonne, sans accumulation de petits details,
d'immeubles ou de bannieres. Un ciel plus calme peut etre preferable a une
architecture dense. Les drapeaux visibles doivent correspondre a la faction.

Anatomie normalement humanoide : une tete, deux bras, deux jambes ; tete hybride,
extremites et details possibles. Ne pas creer de membres supplementaires a cause
de cheveux, tentacules ou accessoires. Exceptions explicites du personnage :
Ruby est une sirene avec deux bras et une queue, sans jambes humaines.

L'illustration est seule : aucun texte, logo, bord, statistiques, code-barres ou
interface generes. Composition verticale pour une fenetre de 737 x 921 pixels.
Visage et geste principal au centre, proteges des colonnes laterales ; laisser
de la marge pour le cadrage. Le ratio d'un ancien prompt n'est pas une raison
de changer la taille du template.

## Generation et conservation

1. Lire le profil actuel et les sources narratives. Identifier ce qui est valide
   et ce qui doit changer ; preserver le reste, notamment une illustration aimee.
2. Fournir les references Momo/Valazar et, s'il existe, le personnage approuve.
   Distinguer reference d'identite, reference de composition et reference de DA.
3. Decrire l'instant, l'emotion, les accessoires, les contraintes anatomiques
   et la place du sujet dans la fenetre. Ne pas laisser ces choix au seul style.
4. Conserver le prompt reellement envoye, les references et leurs chemins,
   le fichier genere original, puis la version retenue et les retouches.
5. Comparer au style de reference, puis inserer dans la carte sans changer son
   cadre. Controler en grand et a la taille d'utilisation dans le jeu.

Prompts effectivement conserves : [Ruby](../donnees/elements-01/eau-feu-glace/RUBY_V4_01.prompt.txt),
[Scrow](../donnees/elements-01/air/SCROW_V4_01.prompt.txt),
[Jelly-Joe Encre](../propositions/jelly-joe-dandy-02/prompt-08b.txt).
Les prompts des anciennes cartes entieres ne sont pas une methode de production.

### Trame de prompt reutilisable

Cette trame est une synthese, pas le prompt exact d'une ancienne generation.
La completer pour la scene demandee et fournir les vraies images de reference.

```text
Asset: standalone Kalistar character illustration, not a complete card.
References: Momo for painterly identity; Valazar for painted volumes and worn
materials, not necessarily its dark mood; approved character art for continuity.
Subject: [identity, adult age when relevant, anatomy, clothing and equipment].
Moment and emotion: [specific action, gaze, tension, joy or hesitation].
Scene: [canonical place and a few meaningful details, restrained background].
Style: detailed narrative fantasy painting, visible painterly strokes,
hierarchical edges, textured color planes, worn cloth, leather and metal.
Lighting: physically motivated by the scene; focus on face and main action.
Composition: vertical, for a 737 x 921 px illustration window; essential face,
hands and equipment away from side stat columns, with room for framing.
Continuity constraints: [approved details to preserve and explicit exceptions].
Avoid: photorealism, smooth 3D, anime, manga, artificial pose, extra limbs,
uniform noise, overloaded background, incoherent object contact or perspective.
No text, numbers, logo, watermark, card frame, barcode or interface.
```

## Cadre et composants : design verrouille

La carte native fait 897 x 1497 pixels, 300 ppp. Reutiliser le template et ses
calibrages, jamais une carte entiere regeneree ou un assemblage de caches peints
sur l'export. Les elements dynamiques restent separes : textes, chiffres,
illustration, cristal, arme, race, drapeau, positions et effets.

- Bas de carte coherent avec le haut : raccords nets, ronds arme/race propres et
  homologues, sans trait parasite unilateral. Ne pas remettre les anciens
  panneaux `+30 AIR / -30 ROCHE` retires du nouveau design.
- Les branches issues du cristal prennent sa couleur en degrade. Les raccords
  non Electro corriges sont integres au maitre actuel ; ne pas restaurer la
  premiere extraction au rebord gauche incomplet.
- Bande du titre de version : fond bleu texture de la famille du bandeau du nom.
  Texte propre et centre verticalement. Description exploite son cadre sans
  deborder, sans texte ecrase ni intervention peinte sur un rendu aplati.
- Chiffres : conserver la typographie native validee et sa lisibilite en petit.
  Un chiffre plus gros n'est pas suffisant ; contraste, fond nuance et ombre
  doivent fonctionner ensemble. Ne pas reintroduire les anneaux avec bavures.
- Electro : fond dore nuance, suffisamment assombri pour les chiffres ; bord
  simple sans fioritures. Les faces magiques gardent leur energie electrique
  distinctive. Ne pas remplacer les fonds physiques dores par du noir uniforme.
- Autres elements : utiliser leurs composants approuves. La difference entre
  attaque physique et magique doit rester immediate, sans inventer un nouvel
  effet ou recolorer Electro au hasard.
- Barrieres DEF lisibles sur le contour, propres, sans bavures ni surcharge.
- Effets, trefles, potions, esquive, armes et races : centrage OPTIQUE du motif
  visible dans l'interieur peint du cercle, pas centrage de sa boite d'image.
  Le contour alpha entier reste dans le cercle avec une marge respirante.
  Verifier aussi en petit ; une mesure geometrique seule ne suffit pas.
- Armes : silhouettes blanches, sans carre bleu, orientation vers l'exterieur
  conservee selon les composants valides. L'icone Instrument generique est une
  guitare ; cela n'interdit pas la flute de Momo dans son illustration ou son lore.
- Races : qualite du logo illustre conservee ; ne pas imposer toutes les vues de
  face. Humain lisible comme silhouette humaine ; Cardemortis, coeur noir/mort.
  Les Hache/NAIN et Faucille/CARDEMORTIS ont des calibrages natifs specifiques.
- Positions : petites plaques elegantes, horizontalement de gauche a droite
  pres du code-barres, capables d'accueillir P1 a P5. Conserver leur ombre et
  leur taille validees, pas de chiffres massifs ni de debordement du coin.
- Drapeau : taille lisible, sous sa barre, dans les limites internes du cadre.
  Conserver la petite ombre derriere la barre ; ne pas empieter sur le bord droit.
- Code-barres : degrade correspondant a la bande voisine, continu et lisible.
  Tester le vrai code rendu, pas seulement les donnees ayant servi a le produire.
- NONE : hexagone conserve, cristal eteint sans lumiere. Aucune face magique
  ni barriere elementaire. Ce n'est pas un trou vide a la place du cristal.

## Intentions de personnages a preserver

Ces reperes decrivent les choix utilisateur ; ce ne sont pas des ordres de
regenerer les cartes existantes. Le profil et le visuel approuves restent la
reference pour une reprise. Une nouvelle demande peut changer un point precis.

| Personnage | Intention retenue |
| --- | --- |
| Momo | Robot artiste sensible de Chroma, flute, emotion narrative ; illustration approuvee protegee. L'Artiste magique et Le Bal des objets perdus sont deux versions distinctes. |
| Taulio | Protecteur robot, imposant mais loyal et empathique ; conserver son illustration validee et l'homogeneite avec Momo. |
| Jelly-Joe | Pirate dandy mince, meduse Encre, visage legerement allonge, joyeux et ivre mais pas effrayant ; manteau noir, lance et chope transparente avec biere ; ambiance de Crabazar. Positions 3 et 5. |
| Rikka | Felineus guepard, voleuse athletique de Chroma, jambes elancees, carre asymetrique, blessure et fouet electrique visible. Vole un Kalistel Luxo pour sauver un ami ; vitrine et geste physiquement coherents, action plutot que pose. |
| Ruby | Sirene heureuse nageant avec des dauphins, emotion partagee, deux mini pistolets-harpons aux hanches. |
| Cana, Scrow, Soryn, Gilmarr | Preserver les personnages ; decors plus calmes et davantage de ciel. Scrow surveille le chateau de Nestown, bannieres coherentes ; terrain de jeu de Gilmarr sans immeubles trop denses. |
| Darnako | Adulte, sort son epee pret a combattre ; pression et agressivite lisibles. Pas d'enfant. |
| Malinia | Lac des souvenirs, pierre tenue sans image a l'interieur. |
| Aelis, Iliane, Belrog, Thalie, Bloom | Illustrations aimees et conservees ; aucune regeneration spontanee. |
| Lok | Roi sur son trone, nerveux, pas simple ouvrier. |
| Balmhyr | Vieux nain sage, force paternelle, charisme et ours visible ; Canyonero desertique rouge et gris, pas un gentil vieillard generique. |
| Magnar | Apparence plus humaine avec peau de pierre ; conserver l'idee de la porte de pierre. |
| Victorvine | Emotion de la scene conservee, echelle non geante, recul et foret ravagee en fond. |
| Kaylis | Heroine debout sur ses deux jambes, surprise emue devant ses bras tatoues Rainbow incandescents qui eclairent la grotte. |
| Valazar, Voloden | Illustrations approuvees conservees ; Valazar avec habits violets, Voloden incarne son siege vacant. |

L'ancienne demande de preserver Cana n'interdit pas le changement de fond
explicitement demande plus tard. De meme, les anciennes propositions de visage
humain pour Jelly-Joe ne remplacent pas le choix final Encre. Appliquer la
derniere decision, pas toutes les etapes contradictoires a la fois.

## Reception artistique et technique

- Comparer au Momo/Valazar de reference et a une carte approuvee du meme element.
- Verifier anatomie, emotion, contacts des mains, proportions, perspective et
  accessoires. Aucun motif important cache par les colonnes.
- Verifier les medaillons, raccords, drapeau et code-barres a fort grossissement,
  puis les chiffres et l'identite du personnage a petite taille de jeu.
- Comparer les pixels fixes et les zones autorisees, reouvrir le PSD, controler
  les textes editables et effectuer les lectures du code-barres.
- Garder preuve et provenance. Une correction ne doit pas degrader les autres
  cartes ni remplacer une validation visuelle par un simple test technique.
