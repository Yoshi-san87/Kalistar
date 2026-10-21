# Kalistar 4.6.104 - La suite des Fragments

[Parcours](../../docs/PARCOURS_BIBLIOTHEQUE.md) |
[Equipements Kaylis](../../revisions/2026-10-21-fragment-sequels/README.md) |
[Documentation](../../../docs/INDEX.md)

## Perimetre

Momo, Balmhyr et Kaylis conservent leurs quatre combats de carte. Apres la
remise de la carte, trois chapitres se revelent successivement : une victoire
pour l'arme, une pour la protection, une pour la relique. Une defaite ne retire
aucune progression. Les pages bonus restent visuellement cachees jusqu'a la
confirmation de la ceremonie precedente ; recharger ne confirme rien tout seul.

Neuf chapitres racontes avant et apres le combat, dans la continuite des cartes,
sans resoudre les mysteres de la Story. Livre, scellement, revelation de page
et ceremonie de remise partagent la DA existante, avec animations finies et
reduction des mouvements respectee. Le plateau Razr reste sans bandeau haut
supplementaire ni menu bas pendant le combat.

Deux objets sont ajoutes a Kaylis : Bottes du Prochain Pas (+20 DEF sur D6
chiffre conserve) et Ruban des Couleurs (SURVIVED en inferiorite, +40 pour sa
prochaine ATK chiffree conservee, une fois par match). Une Mort evitee ou un
Reraise prepare aussi le Ruban selon le contrat SURVIVED existant. Aucune
nouvelle mecanique moteur, aucune modification des definitions precedentes.
Catalogue personnages inchange : 462 modeles. Equipements : 138.

## Serveur Et Conservation

Migration 012 appliquee au seul projet personnel `fkskjhlaaagqlfcsojjp` : schema
applicatif 11, trois livres de sept combats et neuf recompenses serveur.
Les deux nouvelles tables sont privees, RLS active. Les droits sont attribues
atomiquement apres victoire signee, avec verrou du profil, controles de
sequence et requetes repetables sans doublon. Une carte par version reste
la regle ; obtenir un objet deja possede ne cree pas de second exemplaire.

Paris reste administrateur, Tokyo joueur normal. Pas de nouveau compte, secret,
forfait ou acces. Les deux comptes, 444 cartes, six tentatives, deux progressions,
deux sauvegardes et douze archives sont conserves. Aucun combat de production
n'a ete joue pour les tests. L'ajout ne distribue pas les objets a Tokyo.

Sauvegarde avant migration :
`sauvegardes-personnelles/registre-2026-10-21-avant-fragment-suite.dpapi`,
hors checkout, 459 974 octets, chiffree DPAPI puis restauree deux fois dans
un PostgreSQL local neuf. L'export CSV temporaire en clair a ete supprime.
Cette sauvegarde depend du compte Windows et ne remplace pas une copie hors
du PC ; elle ne contient pas les services Auth, les medias ni Cloudflare.

L'empreinte des anciens snapshots reste acceptee seulement avec la preuve
d'ajout strict de deux definitions d'equipement. Les quatre anciens combats,
le moteur et les definitions historiques sont preserves octet pour octet.

## Verifications

- Suite generale complete : 98 groupes reussis ; suite locale : 13 groupes,
  dont 62 tests PostgreSQL ; suite repository et controle d'organisation
  reussis. Les exclusions historiques optionnelles restent signalees.
- Scenarios PostgreSQL des trois livres, sept victoires, defaite/reprise,
  refus des etapes anticipees, isolation des comptes, signature et doubles
  demandes ; sauvegarde/restauration avec les trois droits deja attribues.
- Bloc client/Worker/moteur : 277 tests reussis, dont 19 pour le Ruban dans les
  deux camps, sur soutiens, jets speciaux, charge unique et restauration.
- Navigateur complet : sept victoires, 2 674 commandes Worker/PostgreSQL,
  huit defaites sans recul, trois objets effectivement presents, reload,
  refus de doublons et sept apercus admin sans progression. Base fictive.
- Vue du livre sur sept formats, ceremonies PC/Razr, ACK volontaire,
  navigation pendant une requete, annulation et reduction des animations.
- Six rendus des nouveaux equipements a 1440, 412 et 320 px : textes contenus,
  images chargees, absence de debordement horizontal, inspection visuelle.

Les commandes finales et captures restent sous `work/fragment-sequels-*`,
`work/qa/journeys`, `work/qa/journeys-view` et `work/qa/fragment-equipment`.
Les tests deterministes prouvent la progression et les controles, pas un taux
de victoire ou un nouvel equilibrage statistique.

Erreurs de verification corrigees : anciennes assertions de version et de
taille du catalogue ; test supposant a tort que SURVIVED excluait toute Mort
evitee ; ancienne assertion de menu visible en arene plein ecran. Aucun verrou
de reference ou mecanisme de securite n'a ete assoupli pour les faire passer.

## Medias Et Publication

Huit nouveaux WebP, 1 416 medias inscrits. Les 1 408 anciennes entrees restent
strictement identiques. Les six PNG sources sont sauvegardes par SHA-256 dans
`sauvegardes-personnelles/fragment-assets-2026-10-21`, hors checkout.
Aucun binaire ou export prive dans Git.

Publication du commit fige par Wrangler vers le projet personnel `kalistar`,
apres verification du meme build sur PC/Razr. Aucun changement de domaine,
de stockage navigateur, de sessions ou de configuration Cloudflare Access.
Les travaux de propositions et les anciens rapports QA modifies hors de ce
perimetre ne font pas partie de la livraison.
