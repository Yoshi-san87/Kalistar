# Maintenance

## Outils actifs

- [organisation.json](organisation.json) : frontieres, roles et guides actifs.
- [check-organisation.cjs](check-organisation.cjs) : controle en lecture seule.
- [validation-suites.json](validation-suites.json) : liste unique des tests CI/locaux.
- [validate.cjs](validate.cjs) : lanceur, sans shell ni installation automatique.

[Organisation](../docs/ORGANISATION.md) et [validation](../docs/VALIDATION.md)
expliquent le protocole et les commandes.

## Historique

Les dossiers `cleanup-YYYY-MM-DD/` et `scripts-historiques/` sont des preuves
datees. Ne pas relancer leurs operations ni modifier leurs manifestes pour
faire passer un controle. Aucun nettoyage automatique a l'ouverture du jeu.

La remise en ordre documentaire conserve les chemins/sources ; ses preuves
sont dans [organisation-2026-10-14/](organisation-2026-10-14/).
Les travaux temporaires suivants vont dans [work/](../work/README.md).
