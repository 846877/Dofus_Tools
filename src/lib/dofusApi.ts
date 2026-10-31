/**
 * Client minimal pour l'API publique de la communauté https://docs.dofusdu.de
 * (données officielles Dofus 3 extraites du jeu). Appelée directement depuis le navigateur.
 *
 * Les réponses sont mises en cache en mémoire + localStorage pour limiter les appels.
 */

export const API_BASE = 'https://api.dofusdu.de';
export const GAME = 'dofus3';
export const LANG = 'fr';

export interface TranslatedId {
  id?: number;
  name?: string;
}

export interface EffectType {
  id?: number;
  name?: string;
  is_active?: boolean;
  is_meta?: boolean;
}

export interface Effect {
  int_minimum?: number;
  int_maximum?: number;
  type?: EffectType;
  ignore_int_min?: boolean;
  ignore_int_max?: boolean;
  formatted?: string;
}

export interface Images {
  icon?: string;
  sd?: string | null;
  hq?: string | null;
  hd?: string | null;
}

export interface ApiItem {
  ankama_id: number;
  name: string;
  description?: string | null;
  type?: TranslatedId;
  level?: number;
  image_urls?: Images;
  effects?: Effect[] | null;
  is_weapon?: boolean | null;
  parent_set?: TranslatedId | null;
}

export interface ApiSet {
  ankama_id: number;
  name: string;
  equipment_ids?: number[];
  /** clé = nombre d'objets équipés, valeur = bonus de panoplie */
  effects?: Record<string, Effect[]> | null;
}

const memoryCache = new Map<string, unknown>();
const LS_PREFIX = 'dofus-tools:api:';
const LS_TTL_MS = 1000 * 60 * 60 * 24 * 3; // 3 jours

function readLs<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { t: number; v: T };
    if (Date.now() - parsed.t > LS_TTL_MS) return undefined;
    return parsed.v;
  } catch {
    return undefined;
  }
}

function writeLs(key: string, value: unknown) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    // quota dépassé : on ignore, le cache mémoire suffit
  }
}

async function getJson<T>(path: string, params: Record<string, string | number | undefined> = {}, persist = true): Promise<T> {
  const url = new URL(`${API_BASE}/${GAME}/v1/${LANG}${path}`);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  const key = url.pathname + url.search;
  if (memoryCache.has(key)) return memoryCache.get(key) as T;
  if (persist) {
    const cached = readLs<T>(key);
    if (cached !== undefined) {
      memoryCache.set(key, cached);
      return cached;
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API Dofus : ${res.status} ${res.statusText}`);
  const data = (await res.json()) as T;
  memoryCache.set(key, data);
  if (persist) writeLs(key, data);
  return data;
}

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}

/** Recherche plein texte dans les équipements (armes comprises). */
export async function searchEquipment(query: string, opts: { minLevel?: number; maxLevel?: number; limit?: number } = {}) {
  const data = await getJson<unknown>(
    '/items/equipment/search',
    {
      query,
      limit: opts.limit ?? 60,
      'filter[min_level]': opts.minLevel,
      'filter[max_level]': opts.maxLevel,
    },
    false,
  );
  return asArray<ApiItem>(data);
}

export function getEquipment(id: number) {
  return getJson<ApiItem>(`/items/equipment/${id}`);
}

export function getSet(id: number) {
  return getJson<ApiSet>(`/sets/${id}`);
}

/** Liste des équipements d'un type (ex. "dofus", "trophy"). */
export async function listEquipmentByType(typeNameId: string) {
  const data = await getJson<unknown>('/items/equipment', {
    'filter[type.name_id]': typeNameId,
    'page[size]': -1,
    'fields[item]': 'effects,description',
    'sort[level]': 'asc',
  });
  return asArray<ApiItem>(data);
}

/** Valeur retenue pour un effet (jet max par défaut). */
export function effectValue(e: Effect, mode: 'max' | 'min' = 'max'): number {
  const min = e.int_minimum ?? 0;
  const max = e.int_maximum ?? 0;
  if (e.ignore_int_max || max === 0) return min;
  if (e.ignore_int_min) return max;
  return mode === 'max' ? Math.max(min, max) : Math.min(min, max);
}

export function effectRange(e: Effect): [number, number] {
  const min = e.int_minimum ?? 0;
  const max = e.int_maximum ?? 0;
  if (e.ignore_int_max || max === 0) return [min, min];
  return [Math.min(min, max), Math.max(min, max)];
}
