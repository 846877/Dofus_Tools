import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '../../lib/id';
import * as M from './model';

interface RunsState {
  runs: M.Run[];
  templates: M.RunTemplate[];
  startRun: (name: string, zones: string[], templateId?: string, autoNext?: boolean) => string;
  update: (runId: string, fn: (r: M.Run) => M.Run) => void;
  deleteRun: (runId: string) => void;
  saveTemplate: (t: Omit<M.RunTemplate, 'id'> & { id?: string }) => void;
  deleteTemplate: (id: string) => void;
}

export const useRuns = create<RunsState>()(
  persist(
    (set, get) => ({
      runs: [],
      templates: [],
      startRun: (name, zones, templateId, autoNext) => {
        const run = M.createRun(name, zones, { templateId, autoNext });
        set({ runs: [run, ...get().runs] });
        return run.id;
      },
      update: (runId, fn) => set({ runs: get().runs.map((r) => (r.id === runId ? fn(r) : r)) }),
      deleteRun: (runId) => set({ runs: get().runs.filter((r) => r.id !== runId) }),
      saveTemplate: (t) => {
        const id = t.id ?? uid('tpl-');
        const tpl: M.RunTemplate = { id, name: t.name, zones: t.zones };
        const exists = get().templates.some((x) => x.id === id);
        set({ templates: exists ? get().templates.map((x) => (x.id === id ? tpl : x)) : [...get().templates, tpl] });
      },
      deleteTemplate: (id) => set({ templates: get().templates.filter((t) => t.id !== id) }),
    }),
    { name: 'dofus-tools:runs', version: 1 },
  ),
);

/** Parcours intégrés (éventuellement modifiés par l'utilisateur) puis parcours personnalisés. */
export const allTemplates = (custom: M.RunTemplate[]) => {
  const byId = new Map(custom.map((t) => [t.id, t]));
  const builtins = M.BUILTIN_TEMPLATES.map((b) => (byId.has(b.id) ? { ...byId.get(b.id)!, builtin: true } : b));
  return [...builtins, ...custom.filter((t) => !M.BUILTIN_TEMPLATES.some((b) => b.id === t.id))];
};
