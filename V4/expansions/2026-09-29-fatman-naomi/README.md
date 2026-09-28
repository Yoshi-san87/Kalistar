# Fatman et Naomi Hunter

Lot local du 29 septembre 2026, fan crossover non officiel Metal Gear.
Les illustrations seules sont generees; les cadres et composants sont issus
des sources V4 approuvees, avec textes natifs editables et objets incorpores.

## Illustrations et DA

Fatman MGS2 : toit/heliport de Big Shell, tenue anti-explosion massive avec
long manteau et haut col devant le bas du visage, charges et rollers en ligne.
Naomi MGS1 : blouse blanche, jupe sombre et conversation Codec dans une salle
medicale de soutien de mission. La scene est une interpretation narrative,
pas la reproduction revendiquee d'une cinematique.

Derniere demande utilisateur pour Naomi : aucun grimoire visuel, uniquement
des livres medicaux contemporains et ordinaires. La categorie d'arme du jeu
reste Tome (Grimoire). Ne pas reprendre les generations intermediaires.

References picturales : Momo et Valazar, observes avant generation. Peinture
narrative, plans colores sur les visages, matieres et contours hierarchises;
ni peau photographique, ni 3D lisse, ni anime. Naomi a ete retouchee avec les
deux fichiers de reference pour la coherence picturale et le livre.
References officielles Konami inspectees visuellement et prompts exacts dans
prompt.json. Generation et retouches via l'outil image_gen integre.

Sources finales : V4/Illustrations/Fatman_MGS2_Heliport.png et
V4/Illustrations/Naomi_MGS1_Medical.png.

## Profils

- Fatman 49508137 : HUMAIN, Projectile, MINERO (Roche), P1/P3, role P1.
  Garde en ATK D2, magie D4/D3, barriere DEF D5.
- Naomi 49592640 : HUMAIN, Tome, HEMATO (Sang), P5.
  Reraise en ATK D5, potion magique D3, trefle D2; magie D6/D4;
  barrieres DEF D6/D3. Le Reraise est preventif, pas une resurrection.

Les valeurs numeriques respectent les minima et maxima du role principal,
avec au moins trois faces numeriques par cote. Les positions secondaires
n'ajoutent aucun bonus de statistiques. Pas de nouveaux effets de jeu.

## Production

Commandes : build.cjs freeze, prepare, render, verify, publish.
Le gel de ce lot preserve les 78 creations precedentes, y compris Fortune
et le Raiden repeint, ainsi que les references approuvees. Ne jamais refaire
le gel pour cacher un changement. Les nouvelles cartes restent dans cards/
avant publication transactionnelle vers V4/creations/.

Tests : model.test.cjs et banner.test.cjs. Preuves natives par carte : verification.json.
Verification visuelle du catalogue sur ordinateur et mobile : browser.cjs,
rapport qa/local/report.json. Ces preuves techniques ne remplacent pas une
validation artistique utilisateur.

Affinites publiees : Fatman pour Big Shell, Naomi pour Shadow Moses. Les valeurs,
images et autres affinites d'arenes restent identiques a arenas-before.json.
Aucun nouveau deck predefini ni aucune nouvelle arene.

Publication locale seulement. Aucun commit, push ou deploiement externe.
Un futur envoi Git doit aussi prendre en compte Fortune et la revision de
Raiden encore locales, sans ecraser l'interface plus recente du clone personnel.

## Verification finale

Les deux cartes sont publiees dans V4/creations/49508137 et 49592640.
Le catalogue local contient 118 cartes et conserve ses 28 arenes.
Les 18 tests passent apres publication. Chaque PSD reouvert est identique au
PNG, sans difference du cadre fixe; les deux codes-barres sont decodes.
Le controle Chrome isole passe pour chaque carte a 1440 x 1000 et 390 x 844,
sans erreur de chargement ni de script. Les PNG natifs et les captures de
collection ont aussi ete inspectes visuellement.

La premiere composition utilisait la banniere non recadree. Le controle pixel
l'a rejetee avant publication; la source packed calibree a ete retablie puis
les deux PSD ont ete recomposes et reverifies. Voir qa/banner-input-fix.json.
Les seuils et empreintes des sources historiques n'ont pas ete modifies.
