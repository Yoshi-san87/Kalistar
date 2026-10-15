# Kalistar 4.5.2 - Publication du travail local

Publication de tout le travail de jeu local, demandee le 4 octobre 2026.
Depot personnel Yoshi-san87/Kalistar, branche main, tag annote v4.5.2.
Les rapports des lots precedents conservent leur statut historique local ;
cette release constitue leur autorisation et leur trace de publication.

## Contenu

- Roman Le Reveil : 80 144 mots, 18 sections, quatre illustrations placees
  sur les scenes correspondantes. Lecteur desktop/telephone et reprise.
- Cartes d'armes horizontales : master reutilisable, medaillons independants,
  logements de porteurs, filtres, condition et consequence distinctes.
- Arsenal complet : 25 armes, dont 23 nouvelles, objets et decors separes,
  sources, prompts, exports et preuves de production conserves.
- Bonus declaratifs conditionnels, restrictions personnage/job, snapshots,
  remplacement et sauvegarde. Un seul equipement ; aucun cumul des bonus DEF.
- Kaylis 49055457 : Epee courte dans le profil, PNG, PSD et catalogue.
  Revision native documentee, autres cartes et verrous inchanges.
- La DA commune 4.5.1 et l'introduction 4.5.0 restent integrees.

Schemas : ../../docs/ARMES_EQUIPEES.md et ../../weapon-cards/README.md.
Roman : ../../docs/HISTOIRE_80K_PLAN.md.
Revision Kaylis : ../../revisions/2026-10-03-kaylis-short-sword/README.md.

## Publication et verification

Les chemins de production et leurs sources sont indexes explicitement. Les
medias historiques inchanges, fichiers temporaires et captures de debug ne
sont pas assimiles a de nouvelles fonctionnalites. Aucune donnee personnelle
IndexedDB ou sauvegarde de navigateur n'est incluse.

La copie isolee est preparee depuis l'arbre indexe avec le script de la
release 4.5.0. Le build verifie les empreintes des cartes publiees. Les
preuves et captures nouvelles de cette release sont dans qa/.

Les tests natifs d'images utilisent les dependances de production locales.
Les tests portables du workflow Pages incluent desormais aussi le roman long.
Les anciens rapports de tests ne sont pas modifies pour masquer un echec.

## Resultats avant publication

- 123 tests portables du workflow, Kalistel, ambiances et build : reussis.
- 54 tests locaux roman/arsenal/decors/equipement/presentation : reussis.
- Lecteur : 18 sections, scenes exactes, reprise, sept tailles de fenetre.
- Cartes d'armes : 37 controles de mise en page desktop/telephone/export.
- Nouvel arsenal : 52 parcours, 23 objets equipes, remplacements et reload,
  vrais bonus calcules en combat. Parcours historique armes complet reussi.
- Socle UI : 35 controles sur cinq formats, Reduced Motion compris.
- Parcours Pages : Collection, Story, export, decks, arene et sauvegarde/reprise,
  PC/telephone, sans erreur HTTP ou JavaScript.
- Build : 193 personnages, 25 armes, 581 fichiers, environ 484.4 Mio.
- Audit : 2 298 medias historiques identiques, aucun fichier manquant.

Les assertions de build du manuscrit ont ete actualisees de l'ancien resume
de dix sections au roman de dix-huit sections, avec quatre ancres narratives
exactes et une limite de 80 000 a 84 000 mots. Le test de navigation du lecteur
verifie maintenant les cinq entrees et l'acces Story via Plus, conformement
au menu deja publie ; aucune fonctionnalite n'est supprimee pour passer un test.

Les sources de recherches graphiques sont conservees dans Git ; les variantes
non raccordees au master actif ne sont pas activees implicitement par ce push.
Les captures historiques de debug hors des lots publies restent locales.

Reproduction : browser-check.cjs <copie-isolee> execute les cinq suites sur le
paquet statique, avec profils jetables. public-check.cjs compare le manifeste,
le roman, le catalogue, les nouveaux visuels et la version publique au build
isole du commit publie (variable KALISTAR_RELEASE_DIST).
