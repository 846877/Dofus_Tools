import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '../../lib/id';
import type { ApiItem } from '../../lib/dofusApi';
import type { DofusStep } from './data';

export interface DofusProgress {
  obtained: boolean;
  done: Record<string, boolean>;
  customSteps: DofusStep[];
  notes?: string;
}

/** Données issues de l'API, mises en cache (nom, image, niveau, effets). */
export type DofusApiInfo = Pick<ApiItem, 'ankama_id' | 'name' | 'level' | 'image_urls' | 'description' | 'effects'>;

interface DofusState {
  progress: Record<string, DofusProgress>;
  apiInfo: Record<string, DofusApiInfo>;
  lastSync?: number;
  toggleObtained: (id: string) => void;
  toggleStep: (id: string, stepId: string) => void;
  addStep: (id: string, step: Omit<DofusStep, 'id'>) => void;
  removeStep: (id: string, stepId: string) => void;
  setNotes: (id: string, notes: string) => void;
  setApiInfo: (info: Record<string, DofusApiInfo>) => void;
}

const empty = (): DofusProgress => ({ obtained: false, done: {}, customSteps: [] });

export const useDofus = create<DofusState>()(
  persist(
    (set, get) => {
      const edit = (id: string, fn: (p: DofusProgress) => DofusProgress) =>
        set({ progress: { ...get().progress, [id]: fn(get().progress[id] ?? empty()) } });
      return {
        progress: {},
        apiInfo: {},
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
        setApiInfo: (info) => set({ apiInfo: { ...get().apiInfo, ...info }, lastSync: Date.now() }),
      };
    },
    { name: 'dofus-tools:dofus', version: 1 },
  ),
);

export const getProgress = (all: Record<string, DofusProgress>, id: string) => all[id] ?? empty();
