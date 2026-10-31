import { useMemo, useState } from 'react';
import { listEquipmentByType } from '../../lib/dofusApi';
import { formatDate } from '../../lib/time';
import { EffectList, ItemIcon } from '../stuff/ItemBits';
import { BASE_DOFUS, guideLinks, slugify, STEP_KIND_LABEL, type DofusEntry, type StepKind } from './data';
import { getProgress, useDofus, type DofusApiInfo } from './store';

type Filter = 'tous' | 'obtenus' | 'manquants';

export default function DofusPage() {
  const { progress, apiInfo, lastSync, setApiInfo } = useDofus();
  const [filter, setFilter] = useState<Filter>('tous');
  const [selected, setSelected] = useState<string>();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string>();

  // Liste de base + Dofus découverts via l'API
  const entries: DofusEntry[] = useMemo(() => {
    const known = new Map(BASE_DOFUS.map((d) => [d.id, d]));
    for (const [id, info] of Object.entries(apiInfo)) {
      if (!known.has(id) && info.name) known.set(id, { id, name: info.name, category: 'autre', steps: [] });
    }
    return [...known.values()];
  }, [apiInfo]);

  const obtainedCount = entries.filter((e) => getProgress(progress, e.id).obtained).length;
  const shown = entries.filter((e) => {
    const o = getProgress(progress, e.id).obtained;
    return filter === 'tous' || (filter === 'obtenus' ? o : !o);
  });
  const current = entries.find((e) => e.id === selected);

  const sync = async () => {
    setSyncing(true);
    setSyncError(undefined);
    try {
      const items = await listEquipmentByType('dofus');
      const info: Record<string, DofusApiInfo> = {};
      for (const it of items) {
        if (!it.name?.toLowerCase().startsWith('dofus')) continue;
        info[slugify(it.name)] = {
          ankama_id: it.ankama_id,
          name: it.name,
          level: it.level,
          image_urls: it.image_urls,
          description: it.description,
          effects: it.effects,
        };
      }
      if (Object.keys(info).length === 0) throw new Error('aucun Dofus reçu');
      setApiInfo(info);
    } catch (e) {
      setSyncError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="stack">
      <div className="panel dofus-head">
        <div>
          <h3>Collection de Dofus</h3>
          <div className="muted small">
            {obtainedCount}/{entries.length} obtenus
            {lastSync ? ` · données du jeu synchronisées le ${formatDate(lastSync)}` : ''}
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${entries.length ? (obtainedCount / entries.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="row gap-s wrap">
          <div className="segmented">
            {(['tous', 'manquants', 'obtenus'] as Filter[]).map((f) => (
              <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                {f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn" onClick={sync} disabled={syncing}>
            {syncing ? 'Synchronisation…' : '↻ Synchroniser avec le jeu'}
          </button>
        </div>
        {syncError && <p className="error small">Synchronisation impossible : {syncError}</p>}
      </div>

      <div className="layout-sidebar reverse">
        <div className="dofus-grid">
          {shown.map((e) => {
            const p = getProgress(progress, e.id);
            const steps = [...e.steps, ...p.customSteps];
            const done = steps.filter((s) => p.done[s.id]).length;
            return (
              <button
                key={e.id}
                className={'dofus-card' + (p.obtained ? ' obtained' : '') + (selected === e.id ? ' selected' : '')}
                onClick={() => setSelected(e.id)}
              >
                <ItemIcon item={apiInfo[e.id] ?? { name: e.name }} size={56} />
                <strong>{e.name}</strong>
                <span className="muted small">
                  {p.obtained ? '✔ Obtenu' : steps.length ? `${done}/${steps.length} étapes` : 'À suivre'}
                </span>
              </button>
            );
          })}
        </div>
        {current ? (
          <DofusDetail entry={current} info={apiInfo[current.id]} />
        ) : (
          <aside className="panel sidebar">
            <p className="muted">Sélectionnez un Dofus pour suivre ses quêtes et succès.</p>
          </aside>
        )}
      </div>
    </div>
  );
}

function DofusDetail({ entry, info }: { entry: DofusEntry; info?: DofusApiInfo }) {
  const { progress, toggleObtained, toggleStep, addStep, removeStep, setNotes } = useDofus();
  const p = getProgress(progress, entry.id);
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<StepKind>('quete');
  const steps = [...entry.steps.map((s) => ({ ...s, builtin: true })), ...p.customSteps.map((s) => ({ ...s, builtin: false }))];

  return (
    <aside className="panel sidebar dofus-detail">
      <div className="preview-head">
        <ItemIcon item={info ?? { name: entry.name }} size={72} />
        <div>
          <h3>{entry.name}</h3>
          {info?.level && <div className="muted small">Niveau {info.level}</div>}
          {entry.category === 'primordial' && <span className="tag">Primordial</span>}
        </div>
      </div>
      <label className="inline big-check">
        <input type="checkbox" checked={p.obtained} onChange={() => toggleObtained(entry.id)} />
        Dofus obtenu
      </label>
      {info?.effects && info.effects.length > 0 && (
        <details>
          <summary>Effets</summary>
          <EffectList effects={info.effects} />
        </details>
      )}

      <h4>Quêtes & succès</h4>
      {steps.length === 0 && <p className="muted small">Aucune étape pour l'instant : ajoutez les quêtes et succès que vous suivez.</p>}
      <ul className="steps">
        {steps.map((s) => (
          <li key={s.id} className={p.done[s.id] ? 'done' : ''}>
            <label className="inline grow">
              <input type="checkbox" checked={!!p.done[s.id]} onChange={() => toggleStep(entry.id, s.id)} />
              <span>
                <span className="tag small">{STEP_KIND_LABEL[s.kind]}</span> {s.label}
                {s.note && <div className="muted small">{s.note}</div>}
              </span>
            </label>
            {!s.builtin && (
              <button className="btn tiny danger" onClick={() => removeStep(entry.id, s.id)} aria-label="Supprimer l'étape">
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="row gap-s"
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim()) return;
          addStep(entry.id, { label: label.trim(), kind });
          setLabel('');
        }}
      >
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as StepKind)}>
          {Object.entries(STEP_KIND_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input className="input grow" placeholder="Nom de la quête / du succès" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button className="btn primary">Ajouter</button>
      </form>

      <textarea
        className="input full"
        rows={3}
        placeholder="Notes (ressources à farmer, étape en cours…)"
        value={p.notes ?? ''}
        onChange={(e) => setNotes(entry.id, e.target.value)}
      />
      <div className="row gap-s wrap">
        {guideLinks(entry.name).map((l) => (
          <a key={l.url} className="btn small" href={l.url} target="_blank" rel="noreferrer">
            {l.label} ↗
          </a>
        ))}
      </div>
    </aside>
  );
}
