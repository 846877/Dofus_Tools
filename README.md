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
| 🛡️ **Stuff** | Théorycraft façon DofusBook : 16 emplacements, recherche dans tous les équipements du jeu, bonus de panoplie, jets personnalisables, points de caractéristiques et parchemins, totaux. Plusieurs stuffs, duplication, export/import JSON. |
| ⏱️ **Runs** | Lancer une run multi-zones (préréglage **Frigost complet**, ou parcours personnalisés), chrono global + chrono par donjon, pause, zones passées, records par donjon et par parcours, historique avec notes. |
| 🥚 **Dofus** | Collection de tous les Dofus avec progression : obtenu / manquant, quêtes et succès à cocher, notes, liens vers les guides. Le bouton « Synchroniser » récupère visuels, effets et Dofus manquants depuis les données du jeu. |

Les données des objets viennent de l'API communautaire [dofusdu.de](https://docs.dofusdu.de)
(extraites du client Dofus 3), appelée directement depuis le navigateur et mise en cache.

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
