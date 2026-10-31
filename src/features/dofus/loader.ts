/**
 * Construit, à partir des données du jeu (DofusDB), la liste des Dofus avec pour chacun :
 * - le ou les succès de « série de quêtes » qui le récompensent,
 * - les quêtes de la série, dans l'ordre,
 * - les objets demandés (avec quantités).
 */
import { dbAll, dbByIds, dbGet, idOf, tr, type DbAchievement, type DbItem, type DbQuest } from '../../lib/dofusDb';
import { normalizeText } from '../stuff/types';
import { slugify } from './data';

export interface QuestInfo {
  id: number;
  name: string;
  levelMin?: number;
  levelMax?: number;
  dungeon?: boolean;
}

export interface AchievementInfo {
  id: number;
  name: string;
  description: string;
  points?: number;
  /** succès prérequis (ids) */
  requires: number[];
  questIds: number[];
}

export interface NeededItem {
  id: number;
  name: string;
  img?: string;
  quantity: number;
}

export interface DofusInfo {
  key: string;
  itemId: number;
  name: string;
  level?: number;
  img?: string;
  description?: string;
  achievements: AchievementInfo[];
  /** quêtes qui donnent directement le Dofus */
  rewardQuestIds: number[];
  items: NeededItem[];
}

export interface DofusCatalog {
  loadedAt: number;
  dofus: DofusInfo[];
  quests: Record<number, QuestInfo>;
}

const DOFUS_TYPE_ID = 23;
/** Succès de « série de quêtes » quand le Dofus n'est pas donné directement en récompense. */
const MANUAL_ACHIEVEMENTS: Record<number, number[]> = {
  7754: [5220], // Dofus Ocre : « Ocre d'ambre »
  8072: [9056], // Dofus Kaliptus : « Haleine fraîche » (Skeunk)
  27803: [7761], // Dom de Pin : étape de la chaîne du Sylvestre
  29134: [7761], // Dofus Sylvestre (doublon)
  29135: [7761], // Dofus Verdoyant : même chaîne que le Sylvestre
  20833: [2104], // Dofus Cacao : événement de Pâques « Chauuuuud cacao ! »
  20987: [2104],
};
const QUEST_SERIES_CATEGORY = 40;

async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

export async function loadDofusCatalog(onProgress?: (msg: string) => void): Promise<DofusCatalog> {
  onProgress?.('Liste des Dofus…');
  const list = (await dbAll<DbItem>('/items', [['typeId', DOFUS_TYPE_ID]])).sort((a, b) => (a.level ?? 0) - (b.level ?? 0));

  onProgress?.('Détail de chaque Dofus…');
  const details = await pool(list, 4, (it) => dbGet<DbItem>(`/items/${it.id}`).catch(() => it));

  // Succès de séries de quêtes, pour les Dofus sans lien direct.
  let seriesAchievements: DbAchievement[] | undefined;
  const findSeries = async (name: string) => {
    seriesAchievements ??= await dbAll<DbAchievement>('/achievements', [['categoryId', QUEST_SERIES_CATEGORY]]).catch(() => []);
    const n = normalizeText(name);
    return seriesAchievements.filter((a) => normalizeText(tr(a.description)).includes(n)).map((a) => a.id);
  };

  const achByDofus = new Map<number, number[]>();
  for (const d of details) {
    let ids = (d.achievementsThatReward ?? []).map(idOf);
    if (MANUAL_ACHIEVEMENTS[d.id]) ids = [...new Set([...ids, ...MANUAL_ACHIEVEMENTS[d.id]])];
    if (ids.length === 0) ids = await findSeries(tr(d.name));
    achByDofus.set(d.id, ids);
  }

  onProgress?.('Succès…');
  const achievements = await dbByIds<DbAchievement>('/achievements', [...achByDofus.values()].flat());
  // Un niveau de succès prérequis (ex. succès d'une série précédente).
  const prereqIds = [...achievements.values()].flatMap((a) => a.need?.achievements ?? []).filter((id) => !achievements.has(id));
  if (prereqIds.length) for (const [id, a] of await dbByIds<DbAchievement>('/achievements', prereqIds)) achievements.set(id, a);

  const questIds = new Set<number>();
  const itemIds = new Set<number>();
  for (const a of achievements.values()) {
    (a.need?.quests ?? []).forEach((q) => questIds.add(q));
    (a.need?.items ?? []).forEach((i) => itemIds.add(i));
  }
  for (const d of details) (d.questsThatReward ?? []).map(idOf).forEach((q) => questIds.add(q));

  onProgress?.(`Quêtes (${questIds.size})…`);
  const quests = await dbByIds<DbQuest>('/quests', [...questIds]);
  onProgress?.('Objets demandés…');
  const items = await dbByIds<DbItem>('/items', [...itemIds]);

  const toAch = (id: number): AchievementInfo | undefined => {
    const a = achievements.get(id);
    if (!a) return undefined;
    return {
      id,
      name: tr(a.name),
      description: tr(a.description),
      points: a.points,
      requires: a.need?.achievements ?? [],
      questIds: a.need?.quests ?? [],
    };
  };

  const usedKeys = new Set<string>();
  const dofus: DofusInfo[] = details.map((d) => {
    const name = tr(d.name);
    let key = slugify(name);
    if (usedKeys.has(key)) key = `${key}-${d.id}`;
    usedKeys.add(key);
    const direct = (achByDofus.get(d.id) ?? []).map(toAch).filter((x): x is AchievementInfo => !!x);
    const prereqs = direct
      .flatMap((a) => a.requires)
      .filter((id) => !direct.some((x) => x.id === id))
      .map(toAch)
      .filter((x): x is AchievementInfo => !!x);
    const needed = new Map<number, number>();
    for (const a of achByDofus.get(d.id) ?? []) {
      const need = achievements.get(a)?.need;
      (need?.items ?? []).forEach((iid, i) => needed.set(iid, (needed.get(iid) ?? 0) + (need?.quantities?.[i] ?? 1)));
    }
    return {
      key,
      itemId: d.id,
      name,
      level: d.level,
      img: d.img,
      description: tr(d.description),
      achievements: [...prereqs, ...direct],
      rewardQuestIds: (d.questsThatReward ?? []).map(idOf),
      items: [...needed].map(([iid, quantity]) => ({
        id: iid,
        quantity,
        name: tr(items.get(iid)?.name) || `Objet ${iid}`,
        img: items.get(iid)?.img,
      })),
    };
  });

  const questInfo: Record<number, QuestInfo> = {};
  for (const [id, q] of quests) {
    questInfo[id] = { id, name: tr(q.name), levelMin: q.levelMin, levelMax: q.levelMax, dungeon: q.isDungeonQuest };
  }
  return { loadedAt: Date.now(), dofus: dedupe(dofus), quests: questInfo };
}

/**
 * Le jeu contient plusieurs objets « Dofus » au même nom (anciennes versions, variantes d'événement…).
 * On n'en garde qu'un par nom : celui qui a le plus de quêtes / succès liés, puis le niveau le plus haut.
 */
export function dedupe(list: DofusInfo[]): DofusInfo[] {
  const score = (d: DofusInfo) =>
    d.achievements.reduce((s, a) => s + 1 + a.questIds.length, 0) * 1000 + d.rewardQuestIds.length * 1000 + (d.level ?? 0);
  const best = new Map<string, DofusInfo>();
  for (const d of list) {
    const k = normalizeText(d.name);
    const cur = best.get(k);
    // à égalité, l'id le plus récent (version échangeable, l'autre étant liée au personnage)
    if (!cur || score(d) > score(cur) || (score(d) === score(cur) && d.itemId > cur.itemId)) best.set(k, d);
  }
  return list
    .filter((d) => best.get(normalizeText(d.name)) === d)
    .map((d) => ({ ...d, key: slugify(d.name) }));
}
