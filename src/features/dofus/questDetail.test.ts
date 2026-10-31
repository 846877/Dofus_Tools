import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadQuestDetail } from './questDetail';

const page = (data: unknown[]) => ({ total: data.length, limit: 50, skip: 0, data });

describe('loadQuestDetail', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('rend les objectifs lisibles avec positions et récompenses', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, length: 0 });
    vi.stubGlobal('fetch', async (url: string) => {
      const u = new URL(url);
      let body: unknown;
      if (u.pathname === '/quests/1653')
        body = {
          id: 1653, name: { fr: 'Plongeon et dragon' }, levelMin: 100, isDungeonQuest: true,
          startPosition: [{ npcId: 389, mapId: 77 }],
          steps: [{
            id: 1, name: { fr: 'Étape A' }, description: { fr: 'Parlez à {npc,383}.' }, optimalLevel: 140,
            objectives: [
              { id: 9954, text: { fr: 'Aller voir {npc,389}' }, map: { posX: -19, posY: -23, subAreaId: 76 } },
              { id: 9955, text: { fr: 'Vaincre x1 {monster,113} en un seul combat' }, coords: { x: 25, y: -8 } },
            ],
            rewards: [{ itemsReward: [[739, 1]], items: [{ id: 739, name: { fr: 'Dofus Turquoise' } }] }],
          }],
        };
      else if (u.pathname === '/npcs') body = page([{ id: 389, name: { fr: 'Mama Ayuto' } }, { id: 383, name: { fr: 'Girle Pylote' } }]);
      else if (u.pathname === '/monsters') body = page([{ id: 113, name: { fr: 'Dragon Cochon' } }]);
      else if (u.pathname === '/subareas') body = page([{ id: 76, name: { fr: 'Village des Brigandins' } }]);
      else if (u.pathname === '/map-positions') body = page([{ id: 77, posX: 1, posY: 2, subAreaId: 76 }]);
      else body = page([]);
      return { ok: true, json: async () => body };
    });
    const d = await loadQuestDetail(1653);
    expect(d.start).toEqual({ npc: 'Mama Ayuto', position: { x: 1, y: 2, zone: 'Village des Brigandins' } });
    expect(d.steps[0].description).toBe('Parlez à Girle Pylote.');
    expect(d.steps[0].objectives[0]).toEqual({ id: 9954, text: 'Aller voir Mama Ayuto', position: { x: -19, y: -23, zone: 'Village des Brigandins' } });
    expect(d.steps[0].objectives[1].text).toBe('Vaincre x1 Dragon Cochon en un seul combat');
    expect(d.steps[0].rewards).toEqual([{ id: 739, quantity: 1, name: 'Dofus Turquoise', img: undefined }]);
  });
});
