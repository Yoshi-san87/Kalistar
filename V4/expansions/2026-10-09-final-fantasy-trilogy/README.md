# Cartes Final Fantasy VI XV et XIII

29 cartes natives, 28 identites, IDs 49901101 a 49901129.
Fan crossover non officiel. Les 29 illustrations approuvees sont conservees
sans nouvelle generation. Terra et sa transe partagent terra-ff6.

- [Galerie des cartes](galerie.html)
- [Profils et intentions individuelles](set.json)
- [Propositions approuvees](../../propositions/2026-10-09-ff6-ff15-ff13/index.html)
- [Bannieres FFIX revisees](../../revisions/2026-10-09-ff-logo-banners/README.md)

## Repartition

FFVI : 14 cartes, dont Terra normale et Transe. FFXV : 7. FFXIII : 8.
Chaque role principal possede ses bornes numeriques ; une face speciale
remplace un chiffre et ne constitue jamais un bonus gratuit. Les 29 paires
ATK/DEF sont distinctes. Les roles P1/P5 seuls portent la garde, P5 seul le
coeur. NONE n'a aucune face magique ni barriere.

Celes privilegie les barrieres existantes, sans inventer une absorption.
Shadow sacrifie D3 pour Mort. Setzer prefere les relances, Sabin la puissance
physique. Gogo multiplie les soutiens au prix de trois faces numeriques.
Gladiolus et Snow protègent ; Lunafreya, Vanille, Hope et Serah peuvent
transmettre le Reraise. Ignis et Cindy soutiennent sans etre copies conformes.
Les equivalences d'arme utilisent les familles existantes : outils d'Edgar
en Arc, cle de Cindy en Marteau, pendentif de Serah en Orbe.
Aucune arme equipee ou regle supplementaire n'est ajoutee.

Umaro utilise maintenant MACAKO et son portrait existant, suite a la demande
du 9 octobre. La [revision native](../../revisions/2026-10-09-umaro-macako/README.md)
preserve ses statistiques et son illustration. Le portrait YETI du premier lot
reste archive avec ses preuves. Terra conserve HUMAIN sur ses deux versions :
c'est une classification de synergie Kalistar, non une affirmation sur son
origine canonique. La Transe utilise RAINBOW, soumis a la limite existante
d'une seule carte Rainbow par deck.

Les tests de conformite ne constituent pas une garantie de taux de victoire
competitif. Le detail de chaque compromis figure dans rationale de set.json.

## Bannieres

Les silhouettes sont inspirees des logos officiels : armure Magitek pour VI,
cristal pour IX, motif spherique et cristallin pour XIII, oracle lunaire pour XV.
Les compositions sont generees separement puis calibrees sur le contour
exact du fanion natif. Sources officielles, prompts et empreintes sont dans
asset-prompts.json et asset-provenance.json.

## Production et verification

Le renderer Photoshop 26.11.8 utilise le template verrouille 897 x 1497,
300 ppp. Les textes restent editables, les composants incorpores. Les preuves
natives controlent le cadre, les chiffres, la reouverture et le code-barres
reel. Les anciens manifestes ne sont jamais refaits pour accepter un ecart.

La revision FFIX doit etre publiee AVANT le gel du nouveau lot, afin que le
controle de conservation photographie l'etat courant approuve.

Commandes de controle :
~~~powershell
node --test V4/expansions/2026-10-09-final-fantasy-trilogy/integration.test.cjs
node --test V4/expansions/2026-10-09-final-fantasy-trilogy/assets.test.cjs
node V4/deploy/build.cjs
node V4/expansions/2026-10-09-final-fantasy-trilogy/browser.test.cjs
~~~

Les tests jouent 174 faces ATK et 174 faces DEF, puis 58 rencontres ABBA
sur 29 compositions de controle, avec restauration repetee. Chaque composition
affronte aussi un ancien deck dans une arene existante, soit 29 matchs mixtes
supplementaires et 87 rencontres au total. Chaque composition
possede deux cartes par role principal et respecte les identites de variantes.
Aucun de ces decks de test n'est installe comme preset utilisateur.
