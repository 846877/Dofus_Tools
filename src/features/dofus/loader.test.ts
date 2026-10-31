import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadDofusCatalog } from './loader';

const page = (data: unknown[]) => ({ total: data.length, limit: 50, skip: 0, data });

// Réponses au format DofusDB (observé sur l'API réelle).
function mockDb(url: string): unknown {
  const u = new URL(url);
  const ids = u.searchParams.getAll('id[$in][]').map(Number);
  if (u.pathname === '/items' && u.searchParams.get('typeId') === '23')
    return page([
      { id: 739, name: { fr: 'Dofus Turquoise' }, level: 100, img: 'https://x/739.png' },
      { id: 7754, name: { fr: 'Dofus Ocre' }, level: 120 },
    ]);
  if (u.pathname === '/items/739') return { id: 739, name: { fr: 'Dofus Turquoise' }, achievementsThatReward: [1385], questsThatReward: [] };
  if (u.pathname === '/items/7754') return { id: 7754, name: { fr: 'Dofus Ocre' }, achievementsThatReward: [], questsThatReward: [] };
  if (u.pathname === '/achievements')
    return page(
      [
        { id: 1385, name: { fr: 'Bleu turquoise' }, need: { quests: [1653, 1654], items: [7024], quantities: [5] } },
        { id: 5220, name: { fr: "Ocre d'ambre" }, need: { quests: [1781] } },
      ].filter((a) => ids.includes(a.id)),
    );
  if (u.pathname === '/quests')
    return page(ids.map((id) => ({ id, name: { fr: `Quête ${id}` }, levelMin: 100, isDungeonQuest: id === 1653 })));
  if (u.pathname === '/items') return page(ids.map((id) => ({ id, name: { fr: `Objet ${id}` } })));
  throw new Error('URL inattendue ' + url);
}

describe('loadDofusCatalog', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('relie chaque Dofus à ses succès, quêtes et objets', async () => {
    vi.stubGlobal('fetch', async (url: string) => ({ ok: true, json: async () => mockDb(url) }));
    const c = await loadDofusCatalog();
    const turquoise = c.dofus.find((d) => d.itemId === 739)!;
    expect(turquoise.achievements.map((a) => a.name)).toEqual(['Bleu turquoise']);
    expect(turquoise.achievements[0].questIds).toEqual([1653, 1654]);
    expect(turquoise.items).toEqual([{ id: 7024, name: 'Objet 7024', img: undefined, quantity: 5 }]);
    expect(c.quests[1653].dungeon).toBe(true);
    const ocre = c.dofus.find((d) => d.itemId === 7754)!;
    expect(ocre.achievements[0].name).toBe("Ocre d'ambre");
  });
});

import { dedupe } from './loader';
describe('dedupe', () => {
  it('garde un seul Dofus par nom, le plus complet', () => {
    const base = { rewardQuestIds: [], items: [] };
    const out = dedupe([
      { ...base, key: 'a', itemId: 1, name: 'Dofus Cacao', level: 50, achievements: [] },
      { ...base, key: 'b', itemId: 2, name: 'Dofus Cacao', level: 60, achievements: [{ id: 9, name: '', description: '', requires: [], questIds: [1] }] },
      { ...base, key: 'c', itemId: 3, name: 'Dofus Ocre', achievements: [] },
    ]);
    expect(out.map((d) => d.itemId)).toEqual([2, 3]);
    expect(out[0].key).toBe('dofus-cacao');
  });
});
