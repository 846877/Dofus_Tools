/**
 * Client pour l'API publique https://api.dofusdb.fr (données du jeu : objets, quêtes, succès, donjons).
 * Réponses paginées par 50 : { total, limit, skip, data: [...] }.
 */
import { fetchJson } from './dofusApi';

export const DB_BASE = 'https://api.dofusdb.fr';

export type I18n = { fr?: string; en?: string } | string | undefined;
export const tr = (v: I18n): string => (typeof v === 'string' ? v : v?.fr ?? v?.en ?? '');

export interface DbItem {
  id: number;
  name: I18n;
  level?: number;
  typeId?: number;
  img?: string;
  description?: I18n;
  questsThatReward?: Array<number | { id: number }>;
  achievementsThatReward?: Array<number | { id: number }>;
}

export interface DbNeed {
  quests?: number[];
  achievements?: number[];
  items?: number[];
  quantities?: number[];
}

export interface DbQuest {
  id: number;
  name: I18n;
  categoryId?: number;
  levelMin?: number;
  levelMax?: number;
  isDungeonQuest?: boolean;
}

export interface DbAchievement {
  id: number;
  name: I18n;
  description?: I18n;
  categoryId?: number;
  points?: number;
  level?: number;
  need?: DbNeed;
  img?: string;
  iconId?: number;
}

interface Page<T> {
  total: number;
  limit: number;
  skip: number;
  data: T[];
}

function url(path: string, params: Array<[string, string | number]> = []) {
  const u = new URL(DB_BASE + path);
  for (const [k, v] of params) u.searchParams.append(k, String(v));
  u.searchParams.set('lang', 'fr');
  return u.toString();
}

export async function dbGet<T>(path: string, params: Array<[string, string | number]> = []): Promise<T> {
  return (await fetchJson(url(path, params))) as T;
}

/** Récupère toutes les pages d'une requête (pas de 50). */
export async function dbAll<T>(path: string, params: Array<[string, string | number]> = [], max = 2000): Promise<T[]> {
  const out: T[] = [];
  for (let skip = 0; skip < max; skip += 50) {
    const page = await dbGet<Page<T>>(path, [...params, ['$limit', 50], ['$skip', skip]]);
    out.push(...(page.data ?? []));
    if (out.length >= (page.total ?? 0) || (page.data ?? []).length === 0) break;
  }
  return out;
}

/** Récupère des éléments par id (par lots de 50). */
export async function dbByIds<T extends { id: number }>(path: string, ids: number[]): Promise<Map<number, T>> {
  const map = new Map<number, T>();
  const unique = [...new Set(ids.filter((x) => typeof x === 'number' && Number.isFinite(x)))];
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const page = await dbGet<Page<T>>(path, [...chunk.map((id) => ['id[$in][]', id] as [string, number]), ['$limit', 50]]);
    for (const it of page.data ?? []) map.set(it.id, it);
  }
  return map;
}

export const idOf = (x: number | { id: number }) => (typeof x === 'number' ? x : x.id);
