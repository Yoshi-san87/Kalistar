# Kaine - cadrage natif +12 %

Demande utilisateur du 1 octobre 2026 : Kaine est trop loin. Seule la creation
publiee 45951088, Ne baisse pas les yeux, est concernee. Aucune regeneration.

Le cadrage est agrandi de 12 % par rapport au PNG publie. Zoom effectif 1.2544
depuis le plein cadre, centre. La fenetre interne mesure exactement 737 x 921,
placee en [80, 156, 817, 1077] sur la carte 897 x 1497. Elle contient un objet
dynamique incorpore avec le PNG original complet, exportable a l'identique.
Le cadre, les autres calques, les textes et leurs styles, les statistiques,
les capacites, profile.json et illustration.png restent inchanges. Le crop
historique du profil reste conserve; nativeRevision.framing decrit le rendu
actuel et son zoom relatif, sans modifier les donnees de jeu.

Protocole : revise.cjs prepare, render, verify, puis publish apres inspection
de work/kaine/card.png et comparison-small.png. Le rendu Photoshop 26.11.7
prend Local\KalistarV4AtelierRender et le libere dans finally. Un verrou occupe
interdit le rendu; les autres travaux Photoshop ne sont pas interrompus.

originals/ conserve les sauvegardes exactes et before.json leurs empreintes.
La preuve native inclut la carte avant, sans art avant/apres, la reouverture
PSD, les styles natifs, et l'export du PNG complet incorpore. verified.json
fige les empreintes du travail et de staging/. Aucun verrou de reference ni
hash protege n'est actualise. La publication relit le catalogue courant et
ne change que nativeRevision de cette carte, par renommage atomique avec
controle de concurrence; les ajouts et revisions des autres cartes survivent.

Tests : revision.test.cjs, comparaison pixel stricte hors illustration,
PSD reouvert identique, controle typographique natif et quatre lectures
du code-barres. La verification papier n'est pas effectuee. Aucun commit/push.

Reception : inspection 897 x 1497 et comparaison avant/apres a 300 px de large.
Le visage et le buste gagnent en presence, tete et deux pieds restent visibles.
La lame d'epaule est lisible; l'extreme pointe de la lame basse rencontre le
bord gauche/code-barres, sans perdre la lecture de l'arme. Le choix centre
+12 % repond a la demande. visual-review.json fige ce constat avant publication.

Le premier essai est conserve dans attempts/01-resolution-scaled/ : Photoshop
avait garde l'echelle physique du PNG 72 ppi lors du remplacement par le PSD
300 ppi. L'essai final retablit explicitement les dimensions et le centre de
la fenetre. Tous les calques du rendu final ont exactement les bornes natives
du PSD actuellement publie. current-embedded-window.png est extrait de ce PSD
et correspond pixel a pixel au crop historique 1.12; il ne s'agit pas d'une
deduction fondee seulement sur le profil.

La calibration de glyphes de 2026-09-23 contient encore l'ancien hash du PSD
donneur Ruby, revise depuis. Aucun hash historique n'est reecrit. Les fichiers
de mesures et de requete restent verifies par leurs empreintes; les styles,
les dimensions et tous les runs des textes du nom et du titre sont
identiques dans les etats avant/apres/reouverture du PSD Kaine
courant. Le seul ecart du donneur est consigne dans verification.json et son
hash actuel correspond au verrou protege. Les mesures du nom Kaine,
129 x 39 px, le centrage, Times New Roman 10 pt/7.68 pt et tracking 0 passent.

Validation utilisateur : comparaison-small.png approuvee explicitement apres
inspection, visage +12 % et conservation des deux lames juges professionnels.
Publication terminee : quatre fichiers dans creations/45951088/ et seulement
nativeRevision de cette entree dans donnees/catalogue.json; 174 cartes, les
173 autres entrees preservees. profile.json et illustration.png restent
strictement identiques. published.json et completion.json consignent le bilan.
18 tests reussis avant et apres publication : revision.test.cjs,
atelier/game-catalog.test.cjs et atelier/designer-publication.test.cjs.
Photoshop et son mutex sont liberes; aucun rendu global ni commit/push.
