# FF10 - Illustrations B

Date : 25 septembre 2026. Perimetre : illustration seule, quatre personnages.
Generation integree `image_gen.imagegen`, cinq appels, aucun appel CLI/API.
Momo et Valazar sont fournis par leurs vrais chemins a CHAQUE appel, y compris
la correction de Rikku. Les sorties originales sont copiees sans retouche
deterministe ; seuls les apercus QA sont reduits.

## Selection pour integration

| Fichier | Scene et intention | Controle visuel |
| --- | --- | --- |
| [yuna.png](yuna.png) | L'envoi sur les eaux de Kilika au crepuscule ; compassion et devoir. | Deux mains sur le meme sceptre continu, manches fluides, visage central. Verifier la marge superieure du sceptre dans le cadre natif. |
| [lulu.png](lulu.png) | Recueillement a l'entree de l'Au-dela ; reserve protectrice et chagrin. | Peluche Mog blanche, pompon rouge, petites ailes ; mains coherentes. Aucun livre dans l'illustration. |
| [rikku.png](rikku.png) | Reparation d'une machina a Bikanel ; fierte et sourire joueur. | Version 2 retenue : mains et outil recentres, dague lisible a la hanche, deux jambes. |
| [yunalesca.png](yunalesca.png) | Le sacrifice annonce dans le sanctuaire de Zanarkand ; calme inflexible. | Longue chevelure et ornements reconnaissables, costume ceremonial couvrant, deux mains vides. Aucune boule de cristal. |

`rikku-v1.png` est conserve comme entree de la correction mais n'est PAS retenu :
la main sur le couvercle etait trop proche de la colonne de statistiques droite.
Ne pas integrer cette premiere version.

Les quatre sujets ont ete regardes en grand puis a 224 x 280 dans
[la planche QA](qa/small-size-contact.png). DA peinte et gestes lisibles.
Il s'agit d'une selection de production, pas d'une validation artistique
utilisateur ni d'une validation du cadre, du PSD ou du code-barres.

## References et tracabilite

Les portraits Yuna, Lulu et Rikku proviennent du
[portail officiel Square Enix FF10](https://na.finalfantasy.com/titles/finalfantasy10),
utilises uniquement pour l'identite ; ils ne fixent pas le rendu pictural.
La reference de Yunalesca est un visuel Square Enix conserve sur
[Wikibooks](https://en.wikibooks.org/wiki/File:Yunalesca.jpg), donc une copie
archivee tierce et non un telechargement direct du portail officiel.

[provenance.json](provenance.json) contient les URLs, empreintes SHA256,
originaux du generateur, choix/rejets et notes de scene pour les descriptions.
Les cinq `*.request.json` conservent les prompts exacts et les chemins de
reference reellement envoyes. Aucun de ces prompts ne regenere le cadre.

[verify.cjs](verify.cjs) controle les six references, les cinq generations,
les empreintes de prompts, la presence des deux references de style dans
chaque appel, le format PNG, le ratio 4:5 a tolerance 0,001 et la resolution.
Resultat execute : 6 references, 5 generations, 4 selections verifiees.
Rapport : [qa/results.json](qa/results.json).

Les fichiers de carte, profils, donnees globales, PSD et Git n'ont pas ete
modifies par ce lot. L'integration et la verification du rendu natif restent
a la charge du parent.
