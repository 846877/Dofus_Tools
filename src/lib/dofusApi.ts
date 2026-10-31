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
  const data = (await fetchJson(url.toString())) as T;
  memoryCache.set(key, data);
  if (persist) writeLs(key, data);
  return data;
}

declare global {
  interface Window {
    dofusTools?: {
      isDesktop: boolean;
      fetchJson: (url: string) => Promise<{ ok: boolean; status: number; data?: unknown; error?: string }>;
      equipmentCatalog: (force?: boolean) => Promise<{ ok: boolean; stale?: boolean; data?: unknown; error?: string }>;
    };
  }
}

/** Dans l'application de bureau, la requête passe par Electron (pas de blocage CORS). */
export async function fetchJson(url: string): Promise<unknown> {
  if (typeof window !== 'undefined' && window.dofusTools?.fetchJson) {
    const r = await window.dofusTools.fetchJson(url);
    if (!r.ok) throw new Error(`API Dofus : ${r.error ?? r.status}`);
    return r.data;
  }
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error(`API Dofus injoignable (${(e as Error).message})`);
  }
  if (!res.ok) throw new Error(`API Dofus : ${res.status} ${res.statusText}`);
  return res.json();
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
  const run = async (q: string) =>
    asArray<ApiItem>(
      await getJson<unknown>(
        '/items/equipment/search',
        { query: q, limit: opts.limit ?? 60, 'filter[min_level]': opts.minLevel, 'filter[max_level]': opts.maxLevel },
        false,
      ),
    );
  // La recherche de l'API est sensible à la casse : on essaie aussi avec une majuscule au début.
  const variants = [...new Set([query, query.charAt(0).toUpperCase() + query.slice(1), query.toLowerCase()])];
  const seen = new Map<number, ApiItem>();
  for (const v of variants) {
    for (const it of await run(v)) if (!seen.has(it.ankama_id)) seen.set(it.ankama_id, it);
    if (seen.size > 0) break;
  }
  return [...seen.values()];
}

export function getEquipment(id: number): Promise<ApiItem> {
  const cached = memoryItems.get(id);
  if (cached) return Promise.resolve(cached);
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

let catalogPromise: Promise<ApiItem[]> | null = null;

/** Tous les équipements du jeu (armes comprises), triés par niveau décroissant. */
export function loadEquipmentCatalog(force = false): Promise<ApiItem[]> {
  if (catalogPromise && !force) return catalogPromise;
  catalogPromise = (async () => {
    let data: unknown;
    if (typeof window !== 'undefined' && window.dofusTools?.equipmentCatalog) {
      const r = await window.dofusTools.equipmentCatalog(force);
      if (!r.ok) throw new Error(`Catalogue indisponible : ${r.error}`);
      data = r.data;
    } else {
      data = await fetchJson(`${API_BASE}/${GAME}/v1/${LANG}/items/equipment/all?sort[level]=desc`);
    }
    const items = asArray<ApiItem>(data);
    if (items.length === 0) throw new Error('Catalogue vide');
    for (const it of items) memoryItems.set(it.ankama_id, it);
    return items;
  })();
  catalogPromise.catch(() => (catalogPromise = null));
  return catalogPromise;
}

const memoryItems = new Map<number, ApiItem>();
export const catalogItem = (id: number) => memoryItems.get(id);
