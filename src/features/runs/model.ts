import { uid } from '../../lib/id';
import { elapsed, newStopwatch, startSw, stopSw, type Stopwatch } from '../../lib/time';

export interface RunTemplate {
  id: string;
  name: string;
  zones: string[];
  builtin?: boolean;
}

export type ZoneStatus = 'todo' | 'active' | 'done' | 'skipped';

export interface RunZone {
  name: string;
  status: ZoneStatus;
  sw: Stopwatch;
}

export type RunStatus = 'running' | 'paused' | 'finished';

export interface Run {
  id: string;
  name: string;
  templateId?: string;
  createdAt: number;
  finishedAt?: number;
  status: RunStatus;
  sw: Stopwatch;
  zones: RunZone[];
  /** enchaîner le donjon suivant automatiquement à la fin d'un donjon */
  autoNext: boolean;
  notes?: string;
}

/**
 * Frigost complet : les donjons de l'île de Frigost (I, II, III) dans l'ordre des niveaux du jeu (données DofusDB).
 * L'ordre et la liste sont modifiables dans l'application (bouton « Modifier l'ordre / les zones »).
 */
export const FRIGOST_COMPLET: RunTemplate = {
  id: 'builtin-frigost',
  name: 'Frigost complet',
  builtin: true,
  zones: [
    'Royalmouth (Serre du Royalmouth, niv. 120)',
    'Mansot Royal (Excavation du Mansot Royal, niv. 140)',
    'Ben le Ripate (Épave du Grolandais violent, niv. 150)',
    "Obsidiantre (Hypogée de l'Obsidiantre, niv. 160)",
    'Tengu & Fuji Givrefoux (Tanière Givrefoux, niv. 170)',
    'Korriandre (Antre du Korriandre, niv. 180)',
    'Kolosso (Cavernes du Kolosso, niv. 190)',
    'Glourséleste (Antichambre des Gloursons, niv. 190)',
    'Missiz Frizz (Forgefroide de Missiz Frizz, niv. 200)',
    'Sylargh (Transporteur de Sylargh, niv. 200)',
    'Klime (Salons privés de Klime, niv. 200)',
    'Nileza (Laboratoire de Nileza, niv. 200)',
    'Comte Harebourg (Donjon du Comte Harebourg, niv. 200)',
  ],
};

export const BUILTIN_TEMPLATES: RunTemplate[] = [FRIGOST_COMPLET];

export function createRun(name: string, zones: string[], opts: { templateId?: string; autoNext?: boolean } = {}, now = Date.now()): Run {
  const run: Run = {
    id: uid('run-'),
    name,
    templateId: opts.templateId,
    createdAt: now,
    status: 'running',
    sw: startSw(newStopwatch(), now),
    zones: zones.map((z) => ({ name: z, status: 'todo', sw: newStopwatch() })),
    autoNext: opts.autoNext ?? false,
  };
  return startZone(run, 0, now);
}

export const activeZoneIndex = (run: Run) => run.zones.findIndex((z) => z.status === 'active');
export const nextTodoIndex = (run: Run, from = 0) => run.zones.findIndex((z, i) => i >= from && z.status === 'todo');

/** Démarre (ou reprend) un donjon ; met en pause le donjon actif éventuel. */
export function startZone(run: Run, index: number, now = Date.now()): Run {
  if (run.status === 'finished' || !run.zones[index]) return run;
  const zones = run.zones.map((z, i) => {
    if (i === index) return { ...z, status: 'active' as const, sw: run.status === 'running' ? startSw(z.sw, now) : z.sw };
    if (z.status === 'active') return { ...z, status: 'todo' as const, sw: stopSw(z.sw, now) };
    return z;
  });
  return { ...run, zones };
}

export function completeZone(run: Run, index: number, now = Date.now(), status: 'done' | 'skipped' = 'done'): Run {
  if (!run.zones[index]) return run;
  let next: Run = {
    ...run,
    zones: run.zones.map((z, i) => (i === index ? { ...z, status, sw: stopSw(z.sw, now) } : z)),
  };
  // Les zones se font dans l'ordre : la suivante est la première encore « à faire ».
  const following = nextTodoIndex(next);
  if (following < 0) return finishRun(next, now);
  if (next.autoNext) next = startZone(next, following, now);
  return next;
}

/** Remet un donjon terminé/passé en "à faire" (sans perdre son temps). */
export function reopenZone(run: Run, index: number): Run {
  if (run.status === 'finished' || !run.zones[index]) return run;
  return { ...run, zones: run.zones.map((z, i) => (i === index ? { ...z, status: 'todo' } : z)) };
}

export function pauseRun(run: Run, now = Date.now()): Run {
  if (run.status !== 'running') return run;
  return {
    ...run,
    status: 'paused',
    sw: stopSw(run.sw, now),
    zones: run.zones.map((z) => ({ ...z, sw: stopSw(z.sw, now) })),
  };
}

export function resumeRun(run: Run, now = Date.now()): Run {
  if (run.status !== 'paused') return run;
  return {
    ...run,
    status: 'running',
    sw: startSw(run.sw, now),
    zones: run.zones.map((z) => (z.status === 'active' ? { ...z, sw: startSw(z.sw, now) } : z)),
  };
}

export function finishRun(run: Run, now = Date.now()): Run {
  if (run.status === 'finished') return run;
  return {
    ...run,
    status: 'finished',
    finishedAt: now,
    sw: stopSw(run.sw, now),
    zones: run.zones.map((z) => ({
      ...z,
      status: z.status === 'active' ? 'done' : z.status,
      sw: stopSw(z.sw, now),
    })),
  };
}

export const runTotal = (run: Run, now = Date.now()) => elapsed(run.sw, now);
export const zoneTime = (z: RunZone, now = Date.now()) => elapsed(z.sw, now);

/** Meilleur temps par donjon sur l'ensemble des runs terminées (donjons validés uniquement). */
export function bestZoneTimes(runs: Run[]): Record<string, number> {
  const best: Record<string, number> = {};
  for (const r of runs) {
    if (r.status !== 'finished') continue;
    for (const z of r.zones) {
      if (z.status !== 'done') continue;
      const t = z.sw.accMs;
      if (t > 0 && (best[z.name] === undefined || t < best[z.name])) best[z.name] = t;
    }
  }
  return best;
}

/** Meilleur temps total pour un modèle donné (runs entièrement terminées sans donjon passé). */
export function bestRunTime(runs: Run[], templateId?: string): number | undefined {
  let best: number | undefined;
  for (const r of runs) {
    if (r.status !== 'finished' || r.templateId !== templateId) continue;
    if (r.zones.some((z) => z.status !== 'done')) continue;
    if (best === undefined || r.sw.accMs < best) best = r.sw.accMs;
  }
  return best;
}
