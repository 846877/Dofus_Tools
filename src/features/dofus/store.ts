import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '../../lib/id';
import type { DofusStep } from './data';
import type { DofusCatalog } from './loader';

export interface DofusProgress {
  obtained: boolean;
  done: Record<string, boolean>;
  customSteps: DofusStep[];
  notes?: string;
}

interface DofusState {
  progress: Record<string, DofusProgress>;
  /** Dofus, quêtes et succès issus des données du jeu (mis en cache) */
  catalog?: DofusCatalog;
  toggleObtained: (id: string) => void;
  toggleStep: (id: string, stepId: string) => void;
  addStep: (id: string, step: Omit<DofusStep, 'id'>) => void;
  removeStep: (id: string, stepId: string) => void;
  setNotes: (id: string, notes: string) => void;
  setCatalog: (c: DofusCatalog) => void;
}

const empty = (): DofusProgress => ({ obtained: false, done: {}, customSteps: [] });

export const useDofus = create<DofusState>()(
  persist(
    (set, get) => {
      const edit = (id: string, fn: (p: DofusProgress) => DofusProgress) =>
        set({ progress: { ...get().progress, [id]: fn(get().progress[id] ?? empty()) } });
      return {
        progress: {},
        toggleObtained: (id) => edit(id, (p) => ({ ...p, obtained: !p.obtained })),
        toggleStep: (id, stepId) => edit(id, (p) => ({ ...p, done: { ...p.done, [stepId]: !p.done[stepId] } })),
        addStep: (id, step) => edit(id, (p) => ({ ...p, customSteps: [...p.customSteps, { ...step, id: uid('step-') }] })),
        removeStep: (id, stepId) =>
          edit(id, (p) => {
            const done = { ...p.done };
            delete done[stepId];
            return { ...p, done, customSteps: p.customSteps.filter((s) => s.id !== stepId) };
          }),
        setNotes: (id, notes) => edit(id, (p) => ({ ...p, notes })),
        setCatalog: (catalog) => set({ catalog }),
      };
    },
    { name: 'dofus-tools:dofus', version: 2, migrate: (s) => { const st = s as Record<string, unknown>; delete st.apiInfo; delete st.lastSync; return st as never; } },
  ),
);

export const getProgress = (all: Record<string, DofusProgress>, id: string) => all[id] ?? empty();
