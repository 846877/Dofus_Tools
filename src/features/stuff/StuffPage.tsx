import { useEffect, useMemo, useState } from 'react';
import type { ApiItem } from '../../lib/dofusApi';
import { effectRange, effectValue } from '../../lib/dofusApi';
import { downloadText } from '../../lib/backup';
import { useStuff } from './store';
import { availablePoints, computeBuild, normalizeEffect, spentPoints } from './stats';
import { BASE_STAT_KEYS, CLASSES, SLOTS, type Build, type SlotDef } from './types';
import { useItemData } from './useItemData';
import ItemPicker from './ItemPicker';
import { EffectList, ItemIcon } from './ItemBits';

const MAIN_STATS = [
  'PA', 'PM', 'Portée', 'Vitalité', 'Initiative', 'Sagesse', 'Force', 'Intelligence', 'Chance', 'Agilité',
  'Puissance', 'Critique', 'Invocation', 'Prospection', 'Soins', 'Pods',
];

export default function StuffPage() {
  const { builds, currentId, create, select } = useStuff();
  const current = builds.find((b) => b.id === currentId) ?? builds[0];

  useEffect(() => {
    if (builds.length === 0) create();
    else if (!currentId || !builds.some((b) => b.id === currentId)) select(builds[0].id);
  }, [builds, currentId, create, select]);

  return (
    <div className="layout-sidebar">
      <BuildList />
      {current ? <BuildEditor key={current.id} build={current} /> : <div />}
    </div>
  );
}

function BuildList() {
  const { builds, currentId, select, create, duplicate, remove, importBuild } = useStuff();
  return (
    <aside className="panel sidebar">
      <div className="panel-head">
        <h3>Mes stuffs</h3>
        <button className="btn primary small" onClick={create}>
          + Nouveau
        </button>
      </div>
      <ul className="list">
        {builds.map((b) => (
          <li key={b.id}>
            <button className={'list-item' + (b.id === currentId ? ' selected' : '')} onClick={() => select(b.id)}>
              <strong>{b.name}</strong>
              <span className="muted small">
                {b.className} niv. {b.level} · {Object.values(b.slots).filter(Boolean).length} objets
              </span>
            </button>
          </li>
        ))}
      </ul>
      {currentId && (
        <div className="row wrap gap-s">
          <button className="btn small" onClick={() => duplicate(currentId)}>
            Dupliquer
          </button>
          <button
            className="btn small"
            onClick={() => {
              const b = builds.find((x) => x.id === currentId);
              if (b) downloadText(`stuff-${b.name}.json`, JSON.stringify(b, null, 2));
            }}
          >
            Exporter
          </button>
          <label className="btn small">
            Importer
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  importBuild(JSON.parse(await f.text()) as Build);
                } catch {
                  window.alert('Fichier de stuff invalide');
                }
                e.target.value = '';
              }}
            />
          </label>
          <button
            className="btn small danger"
            onClick={() => {
              if (window.confirm('Supprimer ce stuff ?')) remove(currentId);
            }}
          >
            Supprimer
          </button>
        </div>
      )}
    </aside>
  );
}

function BuildEditor({ build }: { build: Build }) {
  const { patch, equip } = useStuff();
  const [picking, setPicking] = useState<SlotDef>();
  const [editing, setEditing] = useState<SlotDef>();
  const [preloaded, setPreloaded] = useState<Record<number, ApiItem>>({});

  const itemIds = useMemo(
    () => Object.values(build.slots).filter((s): s is NonNullable<typeof s> => !!s).map((s) => s.itemId),
    [build.slots],
  );
  const { items: loaded, sets, errors } = useItemData(itemIds);
  const items = useMemo(() => ({ ...preloaded, ...loaded }), [preloaded, loaded]);
  const { totals, setBonuses } = useMemo(() => computeBuild(build, items, sets), [build, items, sets]);

  const points = availablePoints(build.level);
  const spent = spentPoints(build.base);

  const otherStats = Object.keys(totals)
    .filter((k) => !MAIN_STATS.includes(k) && totals[k] !== 0)
    .sort((a, b) => a.localeCompare(b, 'fr'));

  return (
    <section className="build">
      <div className="panel build-head">
        <input className="input title-input" value={build.name} onChange={(e) => patch(build.id, { name: e.target.value })} />
        <label className="inline">
          Classe
          <select className="input" value={build.className} onChange={(e) => patch(build.id, { className: e.target.value })}>
            {CLASSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="inline">
          Niveau
          <input
            className="input num"
            type="number"
            min={1}
            max={200}
            value={build.level}
            onChange={(e) => patch(build.id, { level: Math.min(200, Math.max(1, +e.target.value || 1)) })}
          />
        </label>
      </div>

      <div className="build-grid">
        <div className="panel">
          <h3>Équipement</h3>
          {errors.length > 0 && <p className="error small">Certains objets n'ont pas pu être chargés (API injoignable ?).</p>}
          <div className="slots">
            {SLOTS.map((slot) => {
              const eq = build.slots[slot.id];
              const item = eq ? items[eq.itemId] : undefined;
              return (
                <div key={slot.id} className={'slot' + (eq ? ' filled' : '')}>
                  <div className="slot-label">{slot.label}</div>
                  {eq ? (
                    <div className="slot-item">
                      <ItemIcon item={item} />
                      <div className="grow">
                        <div className="slot-name" title={item?.name}>
                          {item?.name ?? 'Chargement…'}
                        </div>
                        <div className="muted small">{item ? `niv. ${item.level}` : ''}</div>
                      </div>
                      <div className="slot-actions">
                        <button className="btn tiny" title="Modifier les jets" onClick={() => setEditing(slot)}>
                          ✎
                        </button>
                        <button className="btn tiny" title="Changer" onClick={() => setPicking(slot)}>
                          ⇄
                        </button>
                        <button className="btn tiny danger" title="Retirer" onClick={() => equip(build.id, slot.id, undefined)}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="slot-empty" onClick={() => setPicking(slot)}>
                      + Ajouter
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <h3>Caractéristiques</h3>
          <p className={'small ' + (spent > points ? 'error' : 'muted')}>
            Points : {points - spent} restants sur {points}
          </p>
          <table className="stat-table">
            <thead>
              <tr>
                <th />
                <th>Base</th>
                <th>Parchemin</th>
              </tr>
            </thead>
            <tbody>
              {BASE_STAT_KEYS.map((k) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>
                    <input
                      className="input num"
                      type="number"
                      min={0}
                      value={build.base[k]}
                      onChange={(e) => patch(build.id, { base: { ...build.base, [k]: Math.max(0, +e.target.value || 0) } })}
                    />
                  </td>
                  <td>
                    <input
                      className="input num"
                      type="number"
                      min={0}
                      max={100}
                      value={build.scrolls[k]}
                      onChange={(e) =>
                        patch(build.id, { scrolls: { ...build.scrolls, [k]: Math.min(100, Math.max(0, +e.target.value || 0)) } })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <textarea
            className="input full"
            rows={3}
            placeholder="Notes (sorts, exos, idées…)"
            value={build.notes ?? ''}
            onChange={(e) => patch(build.id, { notes: e.target.value })}
          />
        </div>

        <div className="panel">
          <h3>Totaux</h3>
          <div className="totals-main">
            {MAIN_STATS.filter((k) => totals[k] !== undefined).map((k) => (
              <div key={k} className="total">
                <span className="muted small">{k}</span>
                <strong className={totals[k] < 0 ? 'neg' : ''}>{totals[k]}</strong>
              </div>
            ))}
          </div>
          {otherStats.length > 0 && (
            <ul className="totals-other">
              {otherStats.map((k) => (
                <li key={k}>
                  <span>{k}</span>
                  <strong className={totals[k] < 0 ? 'neg' : ''}>{totals[k]}</strong>
                </li>
              ))}
            </ul>
          )}
          {setBonuses.length > 0 && (
            <>
              <h4>Panoplies actives</h4>
              {setBonuses.map(({ set, count, effects }) => (
                <details key={set.ankama_id} className="set-bonus">
                  <summary>
                    {set.name} ({count}/{set.equipment_ids?.length ?? '?'})
                  </summary>
                  <EffectList effects={effects} />
                </details>
              ))}
            </>
          )}
        </div>
      </div>

      {picking && (
        <ItemPicker
          slot={picking}
          maxLevel={build.level}
          onClose={() => setPicking(undefined)}
          onPick={(item) => {
            setPreloaded((p) => ({ ...p, [item.ankama_id]: item }));
            equip(build.id, picking.id, { itemId: item.ankama_id });
            setPicking(undefined);
          }}
        />
      )}
      {editing && build.slots[editing.id] && items[build.slots[editing.id]!.itemId] && (
        <RollEditor
          item={items[build.slots[editing.id]!.itemId]}
          overrides={build.slots[editing.id]!.overrides ?? {}}
          onClose={() => setEditing(undefined)}
          onSave={(overrides) => {
            equip(build.id, editing.id, { itemId: build.slots[editing.id]!.itemId, overrides });
            setEditing(undefined);
          }}
        />
      )}
    </section>
  );
}

function RollEditor({
  item,
  overrides,
  onSave,
  onClose,
}: {
  item: ApiItem;
  overrides: Record<number, number>;
  onSave: (o: Record<number, number>) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<number, number>>(overrides);
  const effects = item.effects ?? [];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Modifier les jets">
        <div className="modal-head">
          <h3>Jets : {item.name}</h3>
          <button className="btn ghost" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <p className="muted small">Par défaut, le jet maximum est utilisé. Ajustez chaque ligne selon votre objet.</p>
        <table className="stat-table">
          <tbody>
            {effects.map((e, i) => {
              if (!normalizeEffect(e)) return null;
              const [min, max] = effectRange(e);
              return (
                <tr key={i}>
                  <td>{e.type?.name}</td>
                  <td className="muted small">
                    {min === max ? min : `${min} à ${max}`}
                  </td>
                  <td>
                    <input
                      className="input num"
                      type="number"
                      value={values[i] ?? effectValue(e)}
                      onChange={(ev) => setValues({ ...values, [i]: +ev.target.value })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="row gap-s end">
          <button className="btn" onClick={() => setValues({})}>
            Jets max
          </button>
          <button className="btn primary" onClick={() => onSave(values)}>
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
