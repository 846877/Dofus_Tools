import type { ComponentType } from 'react';
import StuffPage from '../features/stuff/StuffPage';
import RunsPage from '../features/runs/RunsPage';
import DofusPage from '../features/dofus/DofusPage';

/**
 * Registre des fonctionnalités : pour ajouter un nouvel onglet, créer un dossier
 * dans src/features/<nom>/ avec sa page, puis l'ajouter ici. La navigation et les routes suivent.
 */
export interface Feature {
  path: string;
  label: string;
  icon: string;
  description: string;
  component: ComponentType;
}

export const FEATURES: Feature[] = [
  { path: 'stuff', label: 'Stuff', icon: '🛡️', description: 'Théorycraft de stuffs avec les objets du jeu', component: StuffPage },
  { path: 'runs', label: 'Runs', icon: '⏱️', description: 'Chronométrer et historiser vos runs de donjons', component: RunsPage },
  { path: 'dofus', label: 'Dofus', icon: '🥚', description: 'Suivre la quête de tous les Dofus', component: DofusPage },
];
