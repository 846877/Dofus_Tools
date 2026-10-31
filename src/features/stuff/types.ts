export const BASE_STAT_KEYS = ['Vitalité', 'Sagesse', 'Force', 'Intelligence', 'Chance', 'Agilité'] as const;
export type BaseStatKey = (typeof BASE_STAT_KEYS)[number];
export type BaseStats = Record<BaseStatKey, number>;

export const emptyStats = (): BaseStats => ({
  Vitalité: 0,
  Sagesse: 0,
  Force: 0,
  Intelligence: 0,
  Chance: 0,
  Agilité: 0,
});

export const CLASSES = [
  'Cra', 'Ecaflip', 'Eliotrope', 'Eniripsa', 'Enutrof', 'Féca', 'Forgelance', 'Huppermage', 'Iop', 'Osamodas',
  'Ouginak', 'Pandawa', 'Roublard', 'Sacrieur', 'Sadida', 'Sram', 'Steamer', 'Xélor', 'Zobal',
] as const;

export interface SlotDef {
  id: string;
  label: string;
  /** Types acceptés (nom du type FR renvoyé par l'API, comparé sans accents/casse). */
  types: string[];
  weapon?: boolean;
}

export const SLOTS: SlotDef[] = [
  { id: 'amulet', label: 'Amulette', types: ['amulette'] },
  { id: 'hat', label: 'Chapeau', types: ['chapeau'] },
  { id: 'cloak', label: 'Cape', types: ['cape', 'sac a dos'] },
  { id: 'belt', label: 'Ceinture', types: ['ceinture'] },
  { id: 'boots', label: 'Bottes', types: ['bottes'] },
  { id: 'ring1', label: 'Anneau 1', types: ['anneau'] },
  { id: 'ring2', label: 'Anneau 2', types: ['anneau'] },
  { id: 'weapon', label: 'Arme', types: ['epee', 'arc', 'baguette', 'baton', 'dague', 'marteau', 'pelle', 'hache', 'faux', 'pioche', 'outil', 'lance', 'arme'], weapon: true },
  { id: 'shield', label: 'Bouclier', types: ['bouclier'] },
  { id: 'pet', label: 'Familier / Monture', types: ['familier', 'montilier', 'muldo', 'dragodinde', 'volkorne', 'monture', 'familiers'] },
  { id: 'dofus1', label: 'Dofus / Trophée 1', types: ['dofus', 'trophee', 'prysmaradite'] },
  { id: 'dofus2', label: 'Dofus / Trophée 2', types: ['dofus', 'trophee', 'prysmaradite'] },
  { id: 'dofus3', label: 'Dofus / Trophée 3', types: ['dofus', 'trophee', 'prysmaradite'] },
  { id: 'dofus4', label: 'Dofus / Trophée 4', types: ['dofus', 'trophee', 'prysmaradite'] },
  { id: 'dofus5', label: 'Dofus / Trophée 5', types: ['dofus', 'trophee', 'prysmaradite'] },
  { id: 'dofus6', label: 'Dofus / Trophée 6', types: ['dofus', 'trophee', 'prysmaradite'] },
];

export interface EquippedItem {
  itemId: number;
  /** Jets personnalisés : index de l'effet -> valeur */
  overrides?: Record<number, number>;
}

export interface Build {
  id: string;
  name: string;
  className: string;
  level: number;
  base: BaseStats;
  scrolls: BaseStats;
  slots: Record<string, EquippedItem | undefined>;
  notes?: string;
  updatedAt: number;
}

export function normalizeText(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function itemFitsSlot(slot: SlotDef, item: { type?: { name?: string }; is_weapon?: boolean | null }) {
  const type = normalizeText(item.type?.name ?? '');
  const matches = slot.types.some((t) => type === t || type.startsWith(t + ' '));
  if (slot.weapon) return !!item.is_weapon || matches;
  if (item.is_weapon) return false;
  return matches;
}
