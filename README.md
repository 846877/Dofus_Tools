# Dofus Tools

Application Windows (.exe) pour Dofus (Dofus 3). Tout est sauvegardé localement sur le PC,
avec export / import d'une sauvegarde depuis le menu **⚙️ Données**.

## Télécharger l'application

- **Installeur** : `Dofus-Tools-<version>-installeur.exe` (raccourci bureau + menu Démarrer).
- **Portable** : `Dofus-Tools-<version>-portable.exe` (un seul fichier, aucune installation).

Les deux sont générés automatiquement par GitHub Actions (workflow *Application Windows*) :
onglet **Actions** → dernière exécution → artefact **Dofus-Tools-Windows**.
Pour une version avec lien de téléchargement direct, créer un tag `v0.1.0` : les .exe sont publiés dans **Releases**.

> Windows SmartScreen peut afficher « Windows a protégé votre ordinateur » car l'exécutable n'est pas signé :
> cliquer sur **Informations complémentaires → Exécuter quand même**.

## Fonctionnalités

| Onglet | Ce qu'il fait |
| --- | --- |
| 🛡️ **Stuff** | Théorycraft façon DofusBook : 16 emplacements, catalogue complet des équipements du jeu avec visuels (filtré par emplacement, nom, niveau), bonus de panoplie, jets personnalisables, points de caractéristiques et parchemins, totaux. Plusieurs stuffs, duplication, export/import JSON. |
| ⏱️ **Runs** | Lancer une run multi-zones faite dans l'ordre (préréglage **Frigost complet** : 13 donjons classés par niveau, ou parcours personnalisés), chrono global + chrono par donjon, pause, zones passées, records par donjon et par parcours, historique avec notes. |
| 🥚 **Dofus** | Les 34 Dofus du jeu : obtenu / manquant, succès de série, quêtes dans l'ordre (niveau, quête de donjon), objets demandés, étapes perso et notes. |

Données du jeu (Dofus 3) issues des API communautaires [dofusdu.de](https://docs.dofusdu.de) (équipements)
et [DofusDB](https://dofusdb.fr) (Dofus, quêtes, succès), téléchargées par l'application et mises en cache sur le PC.

## Développement

```bash
npm install
npm run app:dev   # application de bureau avec rechargement à chaud
npm run app       # application de bureau à partir du build
npm test          # tests unitaires (calculs de stats, chronos)
npm run dist:win  # crée les .exe dans release/ (à lancer sous Windows)
```

L'application est faite en React + TypeScript (Vite) et empaquetée avec Electron (`electron/main.cjs`).

## Ajouter une fonctionnalité

1. Créer un dossier `src/features/<nom>/` avec une page React (et son store `zustand` si besoin, clé `dofus-tools:<nom>`).
2. L'ajouter dans `src/app/features.tsx` : l'onglet et la route apparaissent automatiquement.

```
electron/         fenêtre de bureau (Electron)
src/
  app/            coquille (onglets, routes, menu sauvegarde)
  lib/            API Dofus, chronos, sauvegarde, utilitaires
  features/
    stuff/        théorycraft
    runs/         runs chronométrées
    dofus/        suivi des Dofus
```
