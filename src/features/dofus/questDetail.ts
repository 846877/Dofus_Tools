/**
 * Détail d'une quête (étapes, objectifs lisibles, positions, récompenses) depuis DofusDB.
 * Les textes d'objectifs contiennent des jetons {npc,389}, {monster,113}, {item,1746}, {subarea,165}, {map,123}
 * résolus en noms en un minimum d'appels.
 */
import { dbByIds, dbGet, tr, type I18n } from '../../lib/dofusDb';

interface RawMap {
  posX?: number;
  posY?: number;
  subAreaId?: number;
}
interface RawObjective {
  id: number;
  typeId?: number;
  text?: I18n;
  mapId?: number;
  map?: RawMap | null;
  coords?: { x: number; y: number } | null;
}
interface RawReward {
  itemsReward?: Array<[number, number]>;
  items?: Array<{ id: number; name?: I18n; img?: string }>;
}
interface RawStep {
  id: number;
  name?: I18n;
  description?: I18n;
  optimalLevel?: number;
  objectives?: RawObjective[];
  rewards?: RawReward[];
}
interface RawQuest {
  id: number;
  name?: I18n;
  levelMin?: number;
  levelMax?: number;
  isDungeonQuest?: boolean;
  startPosition?: Array<{ mapId?: number; npcId?: number }>;
  steps?: RawStep[];
}

export interface Position {
  x: number;
  y: number;
  zone?: string;
}

export interface QuestObjective {
  id: number;
  text: string;
  position?: Position;
}

export interface QuestStep {
  id: number;
  name: string;
  description: string;
  level?: number;
  objectives: QuestObjective[];
  rewards: Array<{ id: number; name: string; img?: string; quantity: number }>;
}

export interface QuestDetail {
  id: number;
  name: string;
  levelMin?: number;
  levelMax?: number;
  dungeon?: boolean;
  start?: { npc?: string; position?: Position };
  steps: QuestStep[];
}

const TOKEN = /\{(npc|monster|item|subarea|map),(\d+)\}/g;
const ENDPOINT = { npc: '/npcs', monster: '/monsters', item: '/items', subarea: '/subareas', map: '/map-positions' } as const;
type TokenKind = keyof typeof ENDPOINT;

interface Named {
  id: number;
  name?: I18n;
  posX?: number;
  posY?: number;
  subAreaId?: number;
}

const cache = new Map<number, QuestDetail>();
const LS_KEY = (id: number) => `dofus-tools:api:quest:${id}`;

export async function loadQuestDetail(id: number): Promise<QuestDetail> {
  if (cache.has(id)) return cache.get(id)!;
  try {
    const raw = localStorage.getItem(LS_KEY(id));
    if (raw) {
      const parsed = JSON.parse(raw) as QuestDetail;
      cache.set(id, parsed);
      return parsed;
    }
  } catch {
    // ignore
  }

  const q = await dbGet<RawQuest>(`/quests/${id}`);
  const steps = q.steps ?? [];

  // 1. Collecte des ids à résoudre
  const wanted: Record<TokenKind, Set<number>> = { npc: new Set(), monster: new Set(), item: new Set(), subarea: new Set(), map: new Set() };
  const scan = (text: string) => {
    for (const m of text.matchAll(TOKEN)) wanted[m[1] as TokenKind].add(Number(m[2]));
  };
  for (const s of steps) {
    scan(tr(s.description));
    for (const o of s.objectives ?? []) {
      scan(tr(o.text));
      if (o.map?.subAreaId) wanted.subarea.add(o.map.subAreaId);
    }
  }
  const start = q.startPosition?.[0];
  if (start?.npcId) wanted.npc.add(start.npcId);
  if (start?.mapId) wanted.map.add(start.mapId);

  // Les cartes de départ peuvent référencer une sous-zone : on les résout d'abord.
  const maps = wanted.map.size ? await dbByIds<Named>(ENDPOINT.map, [...wanted.map]).catch(() => new Map<number, Named>()) : new Map<number, Named>();
  for (const m of maps.values()) if (m.subAreaId) wanted.subarea.add(m.subAreaId);

  const resolved: Record<TokenKind, Map<number, Named>> = { npc: new Map(), monster: new Map(), item: new Map(), subarea: new Map(), map: maps };
  await Promise.all(
    (['npc', 'monster', 'item', 'subarea'] as const).map(async (k) => {
      if (wanted[k].size) resolved[k] = await dbByIds<Named>(ENDPOINT[k], [...wanted[k]]).catch(() => new Map());
    }),
  );

  const zoneName = (subAreaId?: number) => (subAreaId ? tr(resolved.subarea.get(subAreaId)?.name) || undefined : undefined);
  const mapLabel = (m?: Named) => (m && m.posX != null ? `[${m.posX},${m.posY}]` : '');
  const render = (text: string) =>
    text
      .replace(TOKEN, (_all, kind: TokenKind, idStr: string) => {
        const e = resolved[kind].get(Number(idStr));
        if (kind === 'map') return mapLabel(e) || 'une carte';
        return tr(e?.name) || `${kind} ${idStr}`;
      })
      .replace(/<[^>]+>/g, '')
      .trim();

  const startMap = start?.mapId ? maps.get(start.mapId) : undefined;
  const detail: QuestDetail = {
    id: q.id,
    name: tr(q.name),
    levelMin: q.levelMin,
    levelMax: q.levelMax,
    dungeon: q.isDungeonQuest,
    start: start
      ? {
          npc: start.npcId ? tr(resolved.npc.get(start.npcId)?.name) || undefined : undefined,
          position: startMap?.posX != null ? { x: startMap.posX, y: startMap.posY!, zone: zoneName(startMap.subAreaId) } : undefined,
        }
      : undefined,
    steps: steps.map((s) => ({
      id: s.id,
      name: tr(s.name),
      description: render(tr(s.description)),
      level: s.optimalLevel,
      objectives: (s.objectives ?? []).map((o) => {
        let position: Position | undefined;
        if (o.map?.posX != null) position = { x: o.map.posX, y: o.map.posY!, zone: zoneName(o.map.subAreaId) };
        else if (o.coords) position = { x: o.coords.x, y: o.coords.y };
        return { id: o.id, text: render(tr(o.text)), position };
      }),
      rewards: (s.rewards ?? []).flatMap((r) =>
        (r.itemsReward ?? []).map(([itemId, quantity]) => {
          const it = r.items?.find((x) => x.id === itemId);
          return { id: itemId, quantity, name: tr(it?.name) || `Objet ${itemId}`, img: it?.img };
        }),
      ),
    })),
  };

  cache.set(id, detail);
  try {
    localStorage.setItem(LS_KEY(id), JSON.stringify(detail));
  } catch {
    // quota : on garde le cache mémoire
  }
  return detail;
}

export function clearQuestCache() {
  cache.clear();
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith('dofus-tools:api:quest:')) localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}
