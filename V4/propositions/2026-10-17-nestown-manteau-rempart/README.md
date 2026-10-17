# Nestown - Manteau-rempart

## Validation de l'auteur

Les quatre illustrations ont ensuite ete approuvees le 17 octobre 2026.
Le remplacement natif, les sauvegardes avant/apres et les tests sont dans
[la revision Nestown](../../revisions/2026-10-17-nestown-manteau-rempart/README.md).
[Voir les cartes finales](../../revisions/2026-10-17-nestown-manteau-rempart/index.html).
approval.json complete les documents de proposition ci-dessous ; leurs empreintes
initiales restent conservees. Le recit de preparation suivant decrit l'etat avant validation.

17 octobre 2026. Propositions d'illustrations uniquement, sans changement de
profil, mecanique, carte native, registre ou publication du jeu.

L'auteur souhaite appliquer le manteau-rempart de l'essai Vulkar 02 aux soldats
de Nestown deja en jeu. Selection fondee sur le catalogue courant et le job
GARDIEN/GARDIENNE de cette faction :

| Personnage | Modele | Identite | Peuple | Arme conservee |
| --- | --- | --- | --- | --- |
| Vessa | 49900312 | vessa-kalistar | FALCO | Baton de secours |
| Karrok | 49900313 | karrok-kalistar | KORBOW | Lance |
| Neryk | 49900314 | neryk-kalistar | KORBOW | Epee courte |
| Khariel | 49902608 | khariel-kalistar | FALCO | Fleau-ancre |

Cana, Scrow, Soryn et Keryn appartiennent egalement a Nestown mais ne sont pas
les gardiens militaires selectionnes ici. Aeren reste exclu : personnage retire
precedemment par l'auteur, absent du catalogue courant.

## Direction

Grandes plaques metalliques en forme de plumes, blanc perle et turquoise,
charniere d'epaule alimentee par un Kalistel Aero, mouvement de cape vers
rempart. Les plaques restent un equipement manufacture, pas des bras ou ailes
organiques supplementaires. Tenues, visages, armes et casques existants servent
de references ; pas de reprise du Drax, des couleurs ou du Pyro de Vulkar.
Cette fonction du manteau est une proposition visuelle, pas un nouveau bonus.

Generateur integre `image_gen`. Cinq generations pour quatre propositions :
la premiere version de Karrok a ete ecartee pour une incoherence des bras et
remplacee par une nouvelle generation debout. Les quatre autres fichiers
retenus ne sont pas des retouches des cartes natives.

[Galerie](index.html), [prompts exacts et references](selection.json),
[empreintes de provenance](provenance.json). Les liens sous chaque proposition
ouvrent l'illustration actuelle et la carte en jeu pour comparaison.

Les originaux du generateur sont preserves. Les nouvelles images sont copiees
dans `images/`, avec apercus `thumbs/`. Les sources courantes ne sont pas
ecrasees ; leurs empreintes sont conservees avec les identifiants stables.

## Verification

Fabrication : `work/build-nestown-mantle-gallery.cjs`.
Verification navigateur : `work/test-nestown-mantle-gallery.cjs`.
Captures et resultat : `work/qa/nestown-manteau-rempart/`.
Controles passes : quatre PNG distincts et identiques aux sorties generees ;
douze sources natives/illustrations existantes inchangees ; affichage de 320 a
1920 px ; quatre agrandissements charges ; huit liens de comparaison ; filtres,
clavier, retour du focus et reduced motion. Captures desktop et mobile relues.
La validation technique ne constitue pas une approbation artistique de l'auteur.
