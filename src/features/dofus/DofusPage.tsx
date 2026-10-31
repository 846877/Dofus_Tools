import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDate } from '../../lib/time';
import { BASE_DOFUS, STEP_KIND_LABEL, type StepKind } from './data';
import { loadDofusCatalog, type DofusCatalog, type DofusInfo } from './loader';
import { getProgress, useDofus, type DofusProgress } from './store';

type Filter = 'tous' | 'manquants' | 'obtenus';

/** Clés de progression : « a:<id> » pour un succès, « q:<id> » pour une quête. */
const achKey = (id: number) => `a:${id}`;
const questKey = (id: number) => `q:${id}`;

function stepsOf(d: DofusInfo) {
  const quests = new Set<number>();
  d.achievements.forEach((a) => a.questIds.forEach((q) => quests.add(q)));
  d.rewardQuestIds.forEach((q) => quests.add(q));
  return [...d.achievements.map((a) => achKey(a.id)), ...[...quests].map(questKey)];
}

function completion(d: DofusInfo, p: DofusProgress) {
  const keys = [...stepsOf(d), ...p.customSteps.map((s) => s.id)];
  return { done: keys.filter((k) => p.done[k]).length, total: keys.length };
}

/** Dofus de secours tant que les données du jeu ne sont pas chargées. */
const fallback = (): DofusInfo[] =>
  BASE_DOFUS.map((b) => ({ key: b.id, itemId: 0, name: b.name, achievements: [], rewardQuestIds: [], items: [] }));

export default function DofusPage() {
  const { progress, catalog, setCatalog } = useDofus();
  const [filter, setFilter] = useState<Filter>('tous');
  const [selected, setSelected] = useState<string>();
  const [loading, setLoading] = useState<string>();
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setError(undefined);
    setLoading('Chargement…');
    try {
      setCatalog(await loadDofusCatalog(setLoading));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(undefined);
    }
  }, [setCatalog]);

  // Premier chargement automatique, puis rafraîchissement si les données ont plus de 7 jours.
  useEffect(() => {
    if (!catalog || Date.now() - catalog.loadedAt > 7 * 24 * 3600 * 1000) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = catalog?.dofus.length ? catalog.dofus : fallback();
  const obtainedCount = entries.filter((e) => getProgress(progress, e.key).obtained).length;
  const shown = entries.filter((e) => {
    const o = getProgress(progress, e.key).obtained;
    return filter === 'tous' || (filter === 'obtenus' ? o : !o);
  });
  const current = entries.find((e) => e.key === selected);

  return (
    <div className="stack">
      <div className="panel dofus-head">
        <div>
          <h3>Collection de Dofus</h3>
          <div className="muted small">
            {obtainedCount}/{entries.length} obtenus
            {catalog ? ` · données du jeu du ${formatDate(catalog.loadedAt)}` : ''}
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
          <button className="btn" onClick={refresh} disabled={!!loading}>
            {loading ?? '↻ Mettre à jour les données'}
          </button>
        </div>
        {error && <p className="error small">Chargement des données du jeu impossible : {error}</p>}
      </div>

      <div className="layout-sidebar reverse">
        <div className="dofus-grid">
          {shown.map((e) => {
            const p = getProgress(progress, e.key);
            const c = completion(e, p);
            return (
              <button
                key={e.key}
                className={'dofus-card' + (p.obtained ? ' obtained' : '') + (selected === e.key ? ' selected' : '')}
                onClick={() => setSelected(e.key)}
              >
                {e.img ? <img className="item-icon" src={e.img} alt="" width={56} height={56} /> : <span className="item-icon placeholder" style={{ width: 56, height: 56 }} />}
                <strong>{e.name}</strong>
                <span className="muted small">{p.obtained ? '✔ Obtenu' : c.total ? `${c.done}/${c.total} étapes` : 'À suivre'}</span>
                {!p.obtained && c.total > 0 && (
                  <span className="progress mini">
                    <span className="progress-bar" style={{ width: `${(c.done / c.total) * 100}%` }} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {current ? (
          <DofusDetail entry={current} catalog={catalog} />
        ) : (
          <aside className="panel sidebar">
            <p className="muted">Sélectionnez un Dofus pour suivre ses quêtes et succès.</p>
          </aside>
        )}
      </div>
    </div>
  );
}

function DofusDetail({ entry, catalog }: { entry: DofusInfo; catalog?: DofusCatalog }) {
  const { progress, toggleObtained, toggleStep, addStep, removeStep, setNotes } = useDofus();
  const p = getProgress(progress, entry.key);
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<StepKind>('quete');
  const c = completion(entry, p);
  const quest = (id: number) => catalog?.quests[id];

  const otherQuests = useMemo(() => {
    const inSeries = new Set(entry.achievements.flatMap((a) => a.questIds));
    return entry.rewardQuestIds.filter((q) => !inSeries.has(q));
  }, [entry]);

  return (
    <aside className="panel sidebar dofus-detail">
      <div className="preview-head">
        {entry.img ? <img className="item-icon" src={entry.img} alt="" width={72} height={72} /> : null}
        <div>
          <h3>{entry.name}</h3>
          {entry.level ? <div className="muted small">Niveau {entry.level}</div> : null}
          {c.total > 0 && (
            <div className="muted small">
              {c.done}/{c.total} étapes faites
            </div>
          )}
        </div>
      </div>
      <label className="inline big-check">
        <input type="checkbox" checked={p.obtained} onChange={() => toggleObtained(entry.key)} />
        Dofus obtenu
      </label>
      {entry.description && <p className="muted small">{entry.description}</p>}

      {entry.achievements.map((a) => (
        <div key={a.id} className="achievement">
          <label className="inline ach-head">
            <input type="checkbox" checked={!!p.done[achKey(a.id)]} onChange={() => toggleStep(entry.key, achKey(a.id))} />
            <span>
              <span className="tag small">Succès</span> <strong>{a.name}</strong>
              {a.points ? <span className="muted small"> · {a.points} pts</span> : null}
              {a.description && <div className="muted small">{a.description}</div>}
            </span>
          </label>
          {a.questIds.length > 0 && (
            <ol className="steps">
              {a.questIds.map((qid) => (
                <QuestRow key={qid} id={qid} info={quest(qid)} done={!!p.done[questKey(qid)]} onToggle={() => toggleStep(entry.key, questKey(qid))} />
              ))}
            </ol>
          )}
        </div>
      ))}

      {otherQuests.length > 0 && (
        <>
          <h4>Quête qui donne le Dofus</h4>
          <ol className="steps">
            {otherQuests.map((qid) => (
              <QuestRow key={qid} id={qid} info={quest(qid)} done={!!p.done[questKey(qid)]} onToggle={() => toggleStep(entry.key, questKey(qid))} />
            ))}
          </ol>
        </>
      )}

      {catalog && entry.achievements.length === 0 && otherQuests.length === 0 && (
        <p className="muted small">Aucune quête ni succès lié dans les données du jeu (Dofus d'événement, de boutique ou de drop).</p>
      )}

      {entry.items.length > 0 && (
        <>
          <h4>Objets demandés</h4>
          <ul className="needed-items">
            {entry.items.map((it) => (
              <li key={it.id}>
                {it.img ? <img src={it.img} alt="" width={28} height={28} /> : null}
                <span className="grow">{it.name}</span>
                <strong>×{it.quantity}</strong>
              </li>
            ))}
          </ul>
        </>
      )}

      <h4>Mes étapes perso</h4>
      <ul className="steps">
        {p.customSteps.map((s) => (
          <li key={s.id} className={p.done[s.id] ? 'done' : ''}>
            <label className="inline grow">
              <input type="checkbox" checked={!!p.done[s.id]} onChange={() => toggleStep(entry.key, s.id)} />
              <span>
                <span className="tag small">{STEP_KIND_LABEL[s.kind]}</span> {s.label}
              </span>
            </label>
            <button className="btn tiny danger" onClick={() => removeStep(entry.key, s.id)} aria-label="Supprimer l'étape">
              ✕
            </button>
          </li>
        ))}
      </ul>
      <form
        className="row gap-s"
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim()) return;
          addStep(entry.key, { label: label.trim(), kind });
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
        <input className="input grow" placeholder="Ajouter une étape" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button className="btn primary">Ajouter</button>
      </form>

      <textarea
        className="input full"
        rows={3}
        placeholder="Notes (ressources à farmer, étape en cours…)"
        value={p.notes ?? ''}
        onChange={(e) => setNotes(entry.key, e.target.value)}
      />
    </aside>
  );
}

function QuestRow({ id, info, done, onToggle }: { id: number; info?: { name: string; levelMin?: number; levelMax?: number; dungeon?: boolean }; done: boolean; onToggle: () => void }) {
  const lvl = info?.levelMin ? (info.levelMax && info.levelMax !== info.levelMin ? `niv. ${info.levelMin}-${info.levelMax}` : `niv. ${info.levelMin}`) : '';
  return (
    <li className={done ? 'done' : ''}>
      <label className="inline grow">
        <input type="checkbox" checked={done} onChange={onToggle} />
        <span>
          {info?.name ?? `Quête ${id}`}
          <span className="muted small">
            {lvl && ` · ${lvl}`}
            {info?.dungeon && ' · donjon'}
          </span>
        </span>
      </label>
    </li>
  );
}
