import { describe, expect, it } from 'vitest';
import { availablePoints, computeBuild, costForStat, normalizeEffect } from './stats';
import { newBuild } from './store';

describe('stats', () => {
  it('coût des caractéristiques', () => {
    expect(costForStat('Force', 100)).toBe(100);
    expect(costForStat('Force', 150)).toBe(200);
    expect(costForStat('Sagesse', 10)).toBe(30);
    expect(costForStat('Vitalité', 995)).toBe(995);
    expect(availablePoints(200)).toBe(995);
  });

  it('malus et lignes de dégâts', () => {
    expect(normalizeEffect({ int_minimum: 10, int_maximum: 0, type: { name: '-Force' } })).toEqual({ name: 'Force', value: -10 });
    expect(normalizeEffect({ int_minimum: 5, int_maximum: 10, type: { name: 'dommages Feu', is_active: true } })).toBeNull();
  });

  it('objets et panoplies', () => {
    const b = newBuild();
    b.scrolls = { Vitalité: 0, Sagesse: 0, Force: 0, Intelligence: 0, Chance: 0, Agilité: 0 };
    b.slots = { hat: { itemId: 1 }, cloak: { itemId: 2, overrides: { 0: 20 } } };
    const items = {
      1: { ankama_id: 1, name: 'Coiffe', parent_set: { id: 9 }, effects: [{ int_minimum: 10, int_maximum: 30, type: { name: 'Force' } }] },
      2: { ankama_id: 2, name: 'Cape', parent_set: { id: 9 }, effects: [{ int_minimum: 10, int_maximum: 30, type: { name: 'Force' } }] },
    };
    const sets = { 9: { ankama_id: 9, name: 'Pano', effects: { '2': [{ int_minimum: 1, int_maximum: 0, type: { name: 'PA' } }] } } };
    const { totals, setBonuses } = computeBuild(b, items, sets);
    expect(totals.Force).toBe(50);
    expect(totals.PA).toBe(8);
    expect(setBonuses).toHaveLength(1);
  });
});
