import { describe, expect, it } from 'vitest';
import * as M from './model';

describe('runs', () => {
  it('chronomètre global et par zone', () => {
    let r = M.createRun('Test', ['A', 'B'], {}, 0);
    expect(r.zones[0].status).toBe('active');
    r = M.completeZone(r, 0, 60_000);
    expect(r.zones[0].sw.accMs).toBe(60_000);
    expect(r.zones[1].status).toBe('todo'); // pas d'enchaînement auto
    r = M.startZone(r, 1, 90_000);
    r = M.pauseRun(r, 100_000);
    r = M.resumeRun(r, 200_000);
    r = M.completeZone(r, 1, 230_000);
    expect(r.status).toBe('finished');
    expect(r.zones[1].sw.accMs).toBe(40_000);
    expect(M.runTotal(r)).toBe(130_000);
  });

  it('enchaînement automatique', () => {
    let r = M.createRun('Test', ['A', 'B'], { autoNext: true }, 0);
    r = M.completeZone(r, 0, 10);
    expect(r.zones[1].status).toBe('active');
  });

  it('records', () => {
    const a = M.finishRun(M.completeZone(M.createRun('F', ['A'], { templateId: 't' }, 0), 0, 50), 50);
    const b = M.finishRun(M.completeZone(M.createRun('F', ['A'], { templateId: 't' }, 0), 0, 30), 30);
    expect(M.bestZoneTimes([a, b]).A).toBe(30);
    expect(M.bestRunTime([a, b], 't')).toBe(30);
  });
});
