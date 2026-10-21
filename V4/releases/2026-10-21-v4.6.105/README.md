# Kalistar 4.6.105 - Bottes noires de Kaylis

[Revision et sources](../../revisions/2026-10-21-kaylis-black-boots/README.md)

## Perimetre

Le cuir, les lacets et les semelles des Bottes du Prochain Pas deviennent
noirs sur la scene de la carte et dans le medaillon. Les deux sources PNG
versionnees sont editees avec imagegen integre, pas avec un filtre CSS.
Oeillets cuivres, reflets rainbow, anneau et cadre existants conserves.

La selection passe uniquement par weapon-art.js : pas de modification de
weapons.js, des bonus, du Ruban des Couleurs, des droits ni de Supabase.
Les parties sauvegardees gardent leur empreinte et leurs definitions ; elles
profitent aussi du nouveau visuel. Aucun reset et aucune distribution d'objet.

Les 1 416 medias deja inscrits et leurs empreintes restent identiques. Deux
WebP ajoutes, 489 768 octets ; sources HD hors Git, sauvegardees et comparees
par SHA-256 dans sauvegardes-personnelles/kaylis-black-boots-2026-10-21,
hors checkout. Les versions brunes restent conservees.

## Verification Et Publication

Controles : suite CI complete, suite locale, tests weapon-art (empreintes,
alpha, ancrage et identite de snapshot), rendu des equipements a 1440,
412 et 320 px, parcours Collection/Decks/Arene et sauvegarde/reload sur le
build fige. Commandes et captures sous work/kaylis-black-boots-* et
work/qa/kaylis-black-boots/.

La premiere invocation CI utilisait CF_PAGES=1 par erreur : un test de plan
de build standard refusait alors le manifeste specifique Cloudflare. Relance
avec l'environnement de test normal, sans modifier ni assouplir ce test.
CF_PAGES=1 reste reserve a la construction de production par prepare-release.

Publication du commit exact, version et tag v4.6.105 sur le seul depot personnel,
puis envoi du build fige au projet Cloudflare kalistar et controle du login
public sans identifiants. Aucune cle ou donnee privee n'entre dans le paquet.
Travaux locaux sans rapport avec cette correction preserves et non stages.
