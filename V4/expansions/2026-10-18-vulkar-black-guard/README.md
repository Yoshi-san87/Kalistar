# La Garde noire de Vulkar

[Galerie](index.html) | [Profils](set.json) | [Organisation](../../../docs/INDEX.md)

Cinq illustrations de la revision 04 validees le 18 octobre 2026, composees
sans modification dans le template natif 897 x 1497. Sources et prompts :
[selection artistique](../../propositions/2026-10-17-vulkar-black-guard/selection-scenes-kalistar.json).
Meme faction Vulkar, race DRAX et Kalistel PYRO ; aucun nouvel effet moteur.

| Personnage | Role | Intention |
| --- | --- | --- |
| Zhaerik | P1, P3 | Garde et defense reguliere |
| Syrkha | P4 | Mort D3, tirs Pyro, relance DEF |
| Dhorven | P3, P1 | Equilibre et soutien physique |
| Nessyra | P2, P3 | Trefle et esquive ; vol narratif seulement |
| Orzhan | P5, P3 | Garde, potion et trefle, sans Reraise |

Les bornes du role principal sont conservees. set.json documente chaque
compromis et les douze faces exactes. Aucun preset, arene ou equipement ajoute.
IDs 49903001-49903005, characterId stables independants des noms affiches.

Production : build.cjs prepare/render/verify/publish ; Photoshop 26.11.8 sous
mutex, textes editables et objets dynamiques. Les glyphes blancs actuels sont
adaptes par white-weapon-component.cjs avant gel des entrees. Les verrous
historiques ne sont pas modifies. Le questionnaire Adobe apparu apres la
premiere carte a ete annule sans envoyer de reponse ni modifier les preferences.

Tests : integration.test.cjs pour les 60 faces, effets, journaux, barrieres,
reprises et parties ABBA ; native.test.cjs pour les empreintes, cadre fixe,
PSD reouvert, codes-barres et typographie. Preuves navigateur dans work/qa/.

Les cinq verifications natives sont reussies : zero difference du cadre fixe
et de la reouverture PSD, cinq codes-barres lisibles. Les neuf tests moteur
passent. Galerie verifiee de 320 a 1920 pixels, lecteur des cinq cartes a
1440, 412 et 320 pixels, duel Zhaerik/Nessyra et reprise apres reload controles.
L'import d'une sauvegarde anterieure ajoute les cinq modeles sans alterer les
anciennes entrees. Aucun compte joueur personnel n'a ete utilise.
Zhaerik peut porter la Veille des Remparts selon ses restrictions GARDIEN et
Lance existantes ; un test verifie les 15 ATK sur D6 retenu et leur absence D5.

Livraison : [4.6.89](../../releases/2026-10-18-v4.6.89/README.md).
Les originaux, PSD et preuves sont sauvegardes hors du checkout sous
sauvegardes-personnelles/creation/2026-10-18-vulkar-lara/ ; seuls les textes,
profils et empreintes sont destines a Git. Lara reste une proposition locale.
