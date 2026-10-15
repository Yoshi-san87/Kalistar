# Batman - propositions Kalistar

Suite du 2026-10-09 : l'utilisateur a approuve les huit illustrations livrees
pour une production de cartes. Le lot natif, sa banniere alternative approuvee
et ses preuves sont dans `V4/expansions/2026-10-09-gotham/`.
Le compte rendu des tentatives ci-dessous reste conserve comme historique.

Date : 2026-10-09. Generation integree image_gen, une demande distincte par personnage.

Premiere selection de 12 personnages, non exhaustive. Sept illustrations livrees
lors de la premiere passe. Une seconde passe explicitement demandee par l'utilisateur
ajoute Le Pingouin : huit illustrations disponibles, quatre personnages sans image.
Aucun personnage n'est ajoute au jeu et aucune carte n'est produite avant selection
explicite de l'utilisateur.

## Illustrations livrees

- Double-Face : la piece et le doute, sur les marches du tribunal.
- Poison Ivy : une jeune pousse dans une serre abandonnee.
- Le Sphinx : une enigme mecanique dans les archives.
- L'Epouvantail : examen d'une fiole fermee dans une gare deserte.
- Mr Freeze : un souvenir dore dans son laboratoire glace.
- Catwoman : une cle retrouvee, sur les toits.
- Ra's al Ghul : la carte repliee, pres du bassin.
- Le Pingouin : son prochain coup d'echecs, dans son bureau du port (seconde passe).

Double-Face comporte une inscription murale ajoutee par le generateur. La seule
retouche demandee etait son effacement; elle a ete refusee au stade output,
categorie violence. L'original livre est preserve, ce detail reste a valider.

## Images non livrees

Joker, Harley Quinn, Bane et Robin : demandes refusees au stade output,
categorie other, lors des deux passes. Aucune image n'est disponible pour eux.
Le Pingouin avait ete refuse lors de la premiere passe; une nouvelle scene
explicitement nommee a ete livree lors de la seconde. Les resultats ne donnent
pas le critere precis ayant fait varier la decision.

## Tracabilite et consultation

- Ouvrir index.html directement, sans serveur.
- manifest.json conserve la premiere passe; attempts-02.json conserve les cinq
  nouvelles demandes de la seconde passe. Prompts reellement envoyes, chemins
  generes, erreurs et identifiants de requete disponibles sont preserves.
- Les deux references Momo / Valazar ont ete inspectees avant generation.
  Elles n'ont pas ete envoyees en entree des nouvelles images; la DA a ete
  decrite textuellement. Les images sont des propositions, pas des validations.
- images/ contient des copies byte-identiques des PNG generes.
- validation.json consigne les controles de la premiere passe; validation-02.json
  ajoute les controles du Pingouin et de la galerie mise a jour.
