/**
 * Liste de base des Dofus du jeu. Les visuels, niveaux et effets viennent de l'API dofusdu.de
 * (bouton « Synchroniser »), qui ajoute aussi automatiquement les Dofus manquants ici.
 *
 * Les étapes (quêtes / succès) pré-remplies sont volontairement limitées à ce qui est sûr :
 * chacun peut ajouter ses propres étapes depuis l'onglet, elles sont sauvegardées localement.
 */

export type StepKind = 'quete' | 'succes' | 'donjon' | 'autre';

export interface DofusStep {
  id: string;
  label: string;
  kind: StepKind;
  note?: string;
}

export interface DofusEntry {
  /** identifiant stable (slug du nom) */
  id: string;
  name: string;
  category: 'primordial' | 'autre';
  steps: DofusStep[];
}

export const STEP_KIND_LABEL: Record<StepKind, string> = {
  quete: 'Quête',
  succes: 'Succès',
  donjon: 'Donjon',
  autre: 'Autre',
};

export function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const d = (name: string, category: DofusEntry['category'] = 'autre', steps: DofusStep[] = []): DofusEntry => ({
  id: slugify(name),
  name,
  category,
  steps,
});

export const BASE_DOFUS: DofusEntry[] = [
  d('Dofus Émeraude', 'primordial'),
  d('Dofus Pourpre', 'primordial'),
  d('Dofus Turquoise', 'primordial'),
  d('Dofus Ocre', 'primordial', [
    {
      id: 'eternelle-moisson',
      label: "L'Éternelle Moisson",
      kind: 'quete',
      note: 'Capturer tous les archimonstres (pierres d’âme).',
    },
  ]),
  d('Dofus Ivoire', 'primordial'),
  d('Dofus Ébène', 'primordial'),
  d('Dofus Cawotte'),
  d('Dofus Vulbis'),
  d('Dofus des Glaces'),
  d('Dofus Abyssal'),
  d('Dofus Cauchemar'),
  d('Dofus Sylvestre'),
  d('Dofus Tacheté'),
  d('Dofus Kaliptus'),
  d('Dofus Dokoko'),
  d('Dofus Domakuro'),
  d('Dofus Argenté'),
  d('Dofus Argenté Scintillant'),
  d('Dofus Nébuleux'),
  d('Dofus Forgelave'),
];

