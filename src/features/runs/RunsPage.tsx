import { useMemo, useState } from 'react';
import { formatDate, formatDuration } from '../../lib/time';
import { useNow } from '../../lib/useNow';
import * as M from './model';
import { allTemplates, useRuns } from './store';

export default function RunsPage() {
  const runs = useRuns((s) => s.runs);
  const active = runs.filter((r) => r.status !== 'finished');
  const finished = runs.filter((r) => r.status === 'finished');

  return (
    <div className="stack">
      {active.map((r) => (
        <RunTracker key={r.id} run={r} history={finished} />
      ))}
      <div className="two-cols">
        <NewRun />
        <Records runs={finished} />
      </div>
      <History runs={finished} />
    </div>
  );
}

function NewRun() {
  const { templates, startRun, saveTemplate, deleteTemplate } = useRuns();
  const all = allTemplates(templates);
  const [tplId, setTplId] = useState(all[0].id);
  const tpl = all.find((t) => t.id === tplId) ?? all[0];
  const [excluded, setExcluded] = useState<Record<string, boolean>>({});
  const [extra, setExtra] = useState('');
  const [autoNext, setAutoNext] = useState(false);
  const [editing, setEditing] = useState<{ id?: string; name: string; zones: string } | null>(null);

  const zones = [...tpl.zones.filter((z) => !excluded[z]), ...extra.split('\n').map((s) => s.trim()).filter(Boolean)];

  return (
    <div className="panel">
      <h3>Nouvelle run</h3>
      <label className="field">
        Parcours
        <select
          className="input"
          value={tpl.id}
          onChange={(e) => {
            setTplId(e.target.value);
            setExcluded({});
          }}
        >
          {all.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.zones.length} zones)
            </option>
          ))}
        </select>
      </label>
      <div className="zone-pick">
        {tpl.zones.map((z) => (
          <label key={z} className="chip-check">
            <input type="checkbox" checked={!excluded[z]} onChange={() => setExcluded({ ...excluded, [z]: !excluded[z] })} />
            {z}
          </label>
        ))}
      </div>
      <label className="field">
        Zones supplémentaires (une par ligne)
        <textarea className="input" rows={2} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Ex. Donjon Kolosso, Quête…" />
      </label>
      <label className="inline">
        <input type="checkbox" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} />
        Enchaîner automatiquement la zone suivante
      </label>
      <div className="row gap-s wrap">
        <button className="btn primary" disabled={zones.length === 0} onClick={() => startRun(tpl.name, zones, tpl.id, autoNext)}>
          ▶ Lancer la run ({zones.length} zones)
        </button>
        <button className="btn" onClick={() => setEditing({ name: 'Mon parcours', zones: zones.join('\n') })}>
          Enregistrer comme parcours
        </button>
        {!tpl.builtin && (
          <>
            <button className="btn" onClick={() => setEditing({ id: tpl.id, name: tpl.name, zones: tpl.zones.join('\n') })}>
              Modifier
            </button>
            <button
              className="btn danger"
              onClick={() => {
                if (window.confirm(`Supprimer le parcours « ${tpl.name} » ?`)) {
                  deleteTemplate(tpl.id);
                  setTplId(all[0].id);
                }
              }}
            >
              Supprimer
            </button>
          </>
        )}
      </div>
      {editing && (
        <div className="subpanel">
          <label className="field">
            Nom du parcours
            <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </label>
          <label className="field">
            Zones (une par ligne, dans l'ordre)
            <textarea className="input" rows={8} value={editing.zones} onChange={(e) => setEditing({ ...editing, zones: e.target.value })} />
          </label>
          <div className="row gap-s">
            <button
              className="btn primary"
              onClick={() => {
                const list = editing.zones.split('\n').map((s) => s.trim()).filter(Boolean);
                if (!editing.name.trim() || list.length === 0) return;
                saveTemplate({ id: editing.id, name: editing.name.trim(), zones: list });
                setEditing(null);
              }}
            >
              Enregistrer
            </button>
            <button className="btn" onClick={() => setEditing(null)}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RunTracker({ run, history }: { run: M.Run; history: M.Run[] }) {
  const { update, deleteRun } = useRuns();
  const now = useNow(run.status === 'running');
  const best = useMemo(() => M.bestZoneTimes(history), [history]);
  const bestTotal = useMemo(() => M.bestRunTime(history, run.templateId), [history, run.templateId]);
  const activeIdx = M.activeZoneIndex(run);
  const nextIdx = M.nextTodoIndex(run, Math.max(0, activeIdx)) >= 0 ? M.nextTodoIndex(run, Math.max(0, activeIdx)) : M.nextTodoIndex(run);
  const doneCount = run.zones.filter((z) => z.status === 'done' || z.status === 'skipped').length;
  const act = (fn: (r: M.Run) => M.Run) => update(run.id, fn);

  return (
    <div className="panel run-tracker">
      <div className="run-head">
        <div>
          <h3>
            {run.name} {run.status === 'paused' && <span className="tag warn">En pause</span>}
          </h3>
          <div className="muted small">
            Lancée le {formatDate(run.createdAt)} · {doneCount}/{run.zones.length} zones
          </div>
        </div>
        <div className="big-timer" aria-label="Temps global">
          {formatDuration(M.runTotal(run, now), true)}
          {bestTotal !== undefined && <div className="muted small">Record : {formatDuration(bestTotal)}</div>}
        </div>
      </div>
      <div className="progress">
        <div className="progress-bar" style={{ width: `${(doneCount / run.zones.length) * 100}%` }} />
      </div>
      <div className="row gap-s wrap">
        {activeIdx >= 0 && (
          <button className="btn primary" onClick={() => act((r) => M.completeZone(r, activeIdx, Date.now()))}>
            ✔ {run.zones[activeIdx].name} terminé
          </button>
        )}
        {activeIdx < 0 && nextIdx >= 0 && (
          <button className="btn primary" disabled={run.status === 'paused'} onClick={() => act((r) => M.startZone(r, nextIdx, Date.now()))}>
            ▶ Entrer : {run.zones[nextIdx].name}
          </button>
        )}
        {activeIdx >= 0 && (
          <button className="btn" onClick={() => act((r) => M.completeZone(r, activeIdx, Date.now(), "skipped"))}>
            Passer
          </button>
        )}
        {run.status === 'running' ? (
          <button className="btn" onClick={() => act((r) => M.pauseRun(r, Date.now()))}>
            ⏸ Pause
          </button>
        ) : (
          <button className="btn" onClick={() => act((r) => M.resumeRun(r, Date.now()))}>
            ▶ Reprendre
          </button>
        )}
        <button
          className="btn"
          onClick={() => {
            if (window.confirm('Terminer la run maintenant ? Les zones non faites resteront « à faire ».')) act((r) => M.finishRun(r, Date.now()));
          }}
        >
          ⏹ Terminer la run
        </button>
        <button
          className="btn danger"
          onClick={() => {
            if (window.confirm('Abandonner et supprimer cette run ?')) deleteRun(run.id);
          }}
        >
          Abandonner
        </button>
      </div>
      <ol className="zones">
        {run.zones.map((z, i) => {
          const time = M.zoneTime(z, now);
          const pb = best[z.name];
          const diff = z.status === 'done' && pb !== undefined ? time - pb : undefined;
          return (
            <li key={i} className={'zone ' + z.status}>
              <span className="zone-status">{{ todo: '○', active: '●', done: '✔', skipped: '↷' }[z.status]}</span>
              <span className="grow">{z.name}</span>
              {pb !== undefined && <span className="muted small">PB {formatDuration(pb)}</span>}
              {diff !== undefined && <span className={'small ' + (diff <= 0 ? 'good' : 'neg')}>{(diff > 0 ? '+' : '') + formatDuration(diff)}</span>}
              <span className="zone-time">{time > 0 || z.status === 'active' ? formatDuration(time, z.status === 'active') : '—'}</span>
              {z.status === 'todo' && i !== nextIdx && run.status === 'running' && (
                <button className="btn tiny" title="Faire cette zone maintenant" onClick={() => act((r) => M.startZone(r, i, Date.now()))}>
                  ▶
                </button>
              )}
              {(z.status === 'done' || z.status === 'skipped') && (
                <button className="btn tiny" title="Remettre à faire" onClick={() => act((r) => M.reopenZone(r, i))}>
                  ↺
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Records({ runs }: { runs: M.Run[] }) {
  const best = useMemo(() => M.bestZoneTimes(runs), [runs]);
  const names = Object.keys(best);
  const byTemplate = useMemo(() => {
    const map = new Map<string, { name: string; count: number; best?: number; avg: number }>();
    for (const r of runs) {
      const key = r.templateId ?? r.name;
      const cur = map.get(key) ?? { name: r.name, count: 0, avg: 0 };
      cur.avg = (cur.avg * cur.count + r.sw.accMs) / (cur.count + 1);
      cur.count += 1;
      cur.best = M.bestRunTime(runs, r.templateId);
      map.set(key, cur);
    }
    return [...map.values()];
  }, [runs]);

  return (
    <div className="panel">
      <h3>Records</h3>
      {runs.length === 0 && <p className="muted">Terminez une run pour voir vos records ici.</p>}
      {byTemplate.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Parcours</th>
              <th>Runs</th>
              <th>Moyenne</th>
              <th>Record (complet)</th>
            </tr>
          </thead>
          <tbody>
            {byTemplate.map((t) => (
              <tr key={t.name}>
                <td>{t.name}</td>
                <td>{t.count}</td>
                <td>{formatDuration(t.avg)}</td>
                <td>{t.best !== undefined ? formatDuration(t.best) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {names.length > 0 && (
        <>
          <h4>Meilleur temps par zone</h4>
          <ul className="totals-other">
            {names.map((n) => (
              <li key={n}>
                <span>{n}</span>
                <strong>{formatDuration(best[n])}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function History({ runs }: { runs: M.Run[] }) {
  const deleteRun = useRuns((s) => s.deleteRun);
  const update = useRuns((s) => s.update);
  const [open, setOpen] = useState<string>();
  return (
    <div className="panel">
      <h3>Historique ({runs.length})</h3>
      {runs.length === 0 ? (
        <p className="muted">Aucune run terminée pour l'instant.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Parcours</th>
              <th>Zones</th>
              <th>Temps total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <HistoryRow
                key={r.id}
                run={r}
                open={open === r.id}
                onToggle={() => setOpen(open === r.id ? undefined : r.id)}
                onDelete={() => window.confirm('Supprimer cette run de l’historique ?') && deleteRun(r.id)}
                onNotes={(notes) => update(r.id, (x) => ({ ...x, notes }))}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function HistoryRow({
  run,
  open,
  onToggle,
  onDelete,
  onNotes,
}: {
  run: M.Run;
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onNotes: (n: string) => void;
}) {
  const done = run.zones.filter((z) => z.status === 'done').length;
  return (
    <>
      <tr className="clickable" onClick={onToggle}>
        <td>{formatDate(run.finishedAt ?? run.createdAt)}</td>
        <td>{run.name}</td>
        <td>
          {done}/{run.zones.length}
        </td>
        <td>
          <strong>{formatDuration(run.sw.accMs)}</strong>
        </td>
        <td className="right">
          <button
            className="btn tiny danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            ✕
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5}>
            <ul className="totals-other">
              {run.zones.map((z, i) => (
                <li key={i} className={z.status}>
                  <span>
                    {z.name} {z.status === 'skipped' && <em className="muted">(passé)</em>}
                    {z.status === 'todo' && <em className="muted">(non fait)</em>}
                  </span>
                  <strong>{z.sw.accMs > 0 ? formatDuration(z.sw.accMs) : '—'}</strong>
                </li>
              ))}
              <li>
                <span className="muted">Temps hors donjons (déplacements…)</span>
                <strong className="muted">{formatDuration(run.sw.accMs - run.zones.reduce((s, z) => s + z.sw.accMs, 0))}</strong>
              </li>
            </ul>
            <textarea
              className="input full"
              rows={2}
              placeholder="Notes (drops, compo d'équipe…)"
              defaultValue={run.notes}
              onBlur={(e) => onNotes(e.target.value)}
            />
          </td>
        </tr>
      )}
    </>
  );
}
