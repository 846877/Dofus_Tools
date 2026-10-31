import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '../../lib/id';
import { emptyStats, type Build, type EquippedItem } from './types';

export function newBuild(name = 'Nouveau stuff'): Build {
  return {
    id: uid('build-'),
    name,
    className: 'Iop',
    level: 200,
    base: emptyStats(),
    scrolls: { Vitalité: 0, Sagesse: 100, Force: 100, Intelligence: 100, Chance: 100, Agilité: 100 },
    slots: {},
    updatedAt: Date.now(),
  };
}

interface StuffState {
  builds: Build[];
  currentId?: string;
  select: (id: string) => void;
  create: () => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  patch: (id: string, patch: Partial<Build>) => void;
  equip: (id: string, slotId: string, item: EquippedItem | undefined) => void;
  importBuild: (b: Build) => void;
}

export const useStuff = create<StuffState>()(
  persist(
    (set, get) => {
      const touch = (id: string, fn: (b: Build) => Build) =>
        set({ builds: get().builds.map((b) => (b.id === id ? { ...fn(b), updatedAt: Date.now() } : b)) });
      return {
        builds: [],
        currentId: undefined,
        select: (id) => set({ currentId: id }),
        create: () => {
          const b = newBuild(`Stuff ${get().builds.length + 1}`);
          set({ builds: [...get().builds, b], currentId: b.id });
        },
        duplicate: (id) => {
          const src = get().builds.find((b) => b.id === id);
          if (!src) return;
          const copy: Build = { ...structuredClone(src), id: uid('build-'), name: `${src.name} (copie)`, updatedAt: Date.now() };
          set({ builds: [...get().builds, copy], currentId: copy.id });
        },
        remove: (id) => {
          const builds = get().builds.filter((b) => b.id !== id);
          set({ builds, currentId: builds[0]?.id });
        },
        patch: (id, patch) => touch(id, (b) => ({ ...b, ...patch })),
        equip: (id, slotId, item) => touch(id, (b) => ({ ...b, slots: { ...b.slots, [slotId]: item } })),
        importBuild: (b) => {
          const copy = { ...b, id: uid('build-'), updatedAt: Date.now() };
          set({ builds: [...get().builds, copy], currentId: copy.id });
        },
      };
    },
    { name: 'dofus-tools:stuff', version: 1 },
  ),
);
