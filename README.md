# Dofus Tools

Boîte à outils web pour Dofus (Dofus 3). Tout est sauvegardé localement dans le navigateur,
avec export / import d'une sauvegarde depuis le menu **⚙️ Données**.

## Fonctionnalités

| Onglet | Ce qu'il fait |
| --- | --- |
| 🛡️ **Stuff** | Théorycraft façon DofusBook : 16 emplacements, recherche dans tous les équipements du jeu, bonus de panoplie, jets personnalisables, points de caractéristiques et parchemins, totaux. Plusieurs stuffs, duplication, export/import JSON. |
| ⏱️ **Runs** | Lancer une run multi-zones (préréglage **Frigost complet**, ou parcours personnalisés), chrono global + chrono par donjon, pause, zones passées, records par donjon et par parcours, historique avec notes. |
| 🥚 **Dofus** | Collection de tous les Dofus avec progression : obtenu / manquant, quêtes et succès à cocher, notes, liens vers les guides. Le bouton « Synchroniser » récupère visuels, effets et Dofus manquants depuis les données du jeu. |

Les données des objets viennent de l'API communautaire [dofusdu.de](https://docs.dofusdu.de)
(extraites du client Dofus 3), appelée directement depuis le navigateur et mise en cache.

## Lancer en local

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests unitaires (calculs de stats, chronos)
npm run build    # build statique dans dist/
```

## Mise en ligne

Le workflow `.github/workflows/deploy.yml` publie l'application sur GitHub Pages à chaque push sur `main`.
Il faut l'activer une fois : *Settings → Pages → Source : GitHub Actions*.

## Ajouter une fonctionnalité

1. Créer un dossier `src/features/<nom>/` avec une page React (et son store `zustand` si besoin, clé `dofus-tools:<nom>`).
2. L'ajouter dans `src/app/features.tsx` : l'onglet et la route apparaissent automatiquement.

```
src/
  app/            coquille (onglets, routes, menu sauvegarde)
  lib/            API Dofus, chronos, sauvegarde, utilitaires
  features/
    stuff/        théorycraft
    runs/         runs chronométrées
    dofus/        suivi des Dofus
```
