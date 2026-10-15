# Kalistar 4.5.27 - La Corne des Anciens

Hache Rhinoz ARM-033 : lame en forme de corne, scene montagneuse et anneau
cuivre/pierre propres a l'objet. Trois sources selectionnees, quatre WebP.
Le catalogue compte 33 armes ; les cartes natives restent intactes.

Restriction generique races: ['RHINOZ'] : Belrog, Gilmarr et Nazar, tous jobs
et factions. Bonus +20 ATK numerique en inferiorite sur le plateau ; aucun
nouveau trigger, changement de matchup imprime ou conversion de la Garde.
Le critere s'integre au validateur et aux fiches sans migration de sauvegarde.

Six tests Rhinoz rejoignent Pages. Tests de l'arsenal, des snapshots et du
rendu ; trois parcours navigateur PC/Razr/compact Reduced Motion, plus 45
controles de mise en page. Preuves dans ../../revisions/2026-10-06-rhinoz-weapons/.

La release preserve la 4.5.26 Morveth publiee entre-temps. Les autres retouches
d'interface encore locales sont exclues. Le snapshot indexe
f0d2d0c31db970cfd64a04a8da0286d678a405ef a passe les 221 tests du workflow,
ainsi que les controles Kalistel et ambiance. Construction Pages :
215 personnages, 710 fichiers, 536,7 Mo. Resultats : workflow-results.json.

Le navigateur statique valide les ecrans principaux, la sauvegarde et la
publication additive sur PC/telephone sans erreur HTTP ou JavaScript.
Les trois parcours Rhinoz ont ensuite ete repetes contre CE build statique,
sans les retouches d'interface locales. Leurs captures remplacent les captures
preliminaires de ce lot dans revisions/2026-10-06-rhinoz-weapons/browser/.
Le script verify-static-rhinoz.cjs permet de reproduire cette verification.
Seules les preuves et cette documentation sont ajoutees apres le snapshot.

Version PC/mobile 4.5.27, main et tag annote v4.5.27 sur Yoshi-san87/Kalistar.
public-check.cjs controle la version et les octets du jeu reellement deploye.
