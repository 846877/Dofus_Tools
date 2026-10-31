import type { ApiItem, ApiSet, Effect } from '../../lib/dofusApi';
import { effectValue } from '../../lib/dofusApi';
import type { BaseStats, Build } from './types';
import { BASE_STAT_KEYS } from './types';

/** Normalise un effet en { nom, valeur } (les malus "-Force" deviennent Force négative). */
export function normalizeEffect(e: Effect, value?: number): { name: string; value: number } | null {
  const t = e.type;
  if (!t?.name) return null;
  // Lignes de dégâts d'arme / effets "actifs" : pas des caractéristiques.
  if (t.is_active || t.is_meta) return null;
  let name = t.name.trim();
  let v = value ?? effectValue(e);
  if (name.startsWith('-')) {
    name = name.slice(1).trim();
    v = -Math.abs(v);
  }
  if (!name || Number.isNaN(v)) return null;
  return { name, value: v };
}

export type StatTotals = Record<string, number>;

export function addTo(totals: StatTotals, name: string, value: number) {
  totals[name] = (totals[name] ?? 0) + value;
}

/**
 * Coût en points de caractéristique pour monter une stat à `points` (barème Dofus 3) :
 * Vitalité 1 pt = 1, Sagesse 3 pts = 1, autres : 1 pt jusqu'à 100, 2 jusqu'à 200, 3 jusqu'à 300, 4 au-delà.
 */
export function costForStat(stat: keyof BaseStats, points: number): number {
  if (points <= 0) return 0;
  if (stat === 'Vitalité') return points;
  if (stat === 'Sagesse') return points * 3;
  let cost = 0;
  const tiers: Array<[number, number]> = [
    [100, 1],
    [200, 2],
    [300, 3],
    [Infinity, 4],
  ];
  let prev = 0;
  for (const [cap, mult] of tiers) {
    if (points <= prev) break;
    const inTier = Math.min(points, cap) - prev;
    cost += inTier * mult;
    prev = cap;
  }
  return cost;
}

export function availablePoints(level: number) {
  return Math.max(0, (Math.min(level, 200) - 1) * 5);
}

export function spentPoints(base: BaseStats) {
  return BASE_STAT_KEYS.reduce((sum, k) => sum + costForStat(k, base[k] ?? 0), 0);
}

export interface ComputedBuild {
  totals: StatTotals;
  setBonuses: Array<{ set: ApiSet; count: number; effects: Effect[] }>;
}

/** Calcule les totaux d'un build : base + parchemins + objets + panoplies. */
export function computeBuild(
  build: Build,
  items: Record<number, ApiItem | undefined>,
  sets: Record<number, ApiSet | undefined>,
): ComputedBuild {
  const totals: StatTotals = {};
  const level = build.level;

  addTo(totals, 'PA', level >= 100 ? 7 : 6);
  addTo(totals, 'PM', 3);
  addTo(totals, 'Vitalité', 55 + (level - 1) * 5);
  addTo(totals, 'Prospection', 100);
  addTo(totals, 'Invocation', 1);

  for (const k of BASE_STAT_KEYS) {
    addTo(totals, k, (build.base[k] ?? 0) + (build.scrolls[k] ?? 0));
  }

  const setCounts = new Map<number, number>();
  for (const slot of Object.values(build.slots)) {
    if (!slot) continue;
    const item = items[slot.itemId];
    if (!item) continue;
    (item.effects ?? []).forEach((e, idx) => {
      const n = normalizeEffect(e, slot.overrides?.[idx]);
      if (n) addTo(totals, n.name, n.value);
    });
    if (item.parent_set?.id != null) {
      setCounts.set(item.parent_set.id, (setCounts.get(item.parent_set.id) ?? 0) + 1);
    }
  }

  const setBonuses: ComputedBuild['setBonuses'] = [];
  for (const [setId, count] of setCounts) {
    const set = sets[setId];
    if (!set || count < 2) continue;
    const effects = set.effects?.[String(count)] ?? [];
    for (const e of effects) {
      const n = normalizeEffect(e);
      if (n) addTo(totals, n.name, n.value);
    }
    setBonuses.push({ set, count, effects });
  }

  // Dérivées simples
  addTo(totals, 'Prospection', Math.floor((totals['Chance'] ?? 0) / 10));
  const initBase = ['Force', 'Intelligence', 'Chance', 'Agilité'].reduce((s, k) => s + Math.max(0, totals[k] ?? 0), 0);
  addTo(totals, 'Initiative', initBase);

  return { totals, setBonuses };
}
