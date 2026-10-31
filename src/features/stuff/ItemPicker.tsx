import { useEffect, useMemo, useState } from 'react';
import { loadEquipmentCatalog, searchEquipment, type ApiItem } from '../../lib/dofusApi';
import { itemFitsSlot, normalizeText, type SlotDef } from './types';
import { EffectList, ItemIcon } from './ItemBits';

interface Props {
  slot: SlotDef;
  maxLevel: number;
  onPick: (item: ApiItem) => void;
  onClose: () => void;
}

const PAGE = 120;

export default function ItemPicker({ slot, maxLevel, onPick, onClose }: Props) {
  const [catalog, setCatalog] = useState<ApiItem[]>();
  const [catalogError, setCatalogError] = useState<string>();
  const [query, setQuery] = useState('');
  const [minLvl, setMinLvl] = useState(1);
  const [maxLvl, setMaxLvl] = useState(maxLevel);
  const [onlySlot, setOnlySlot] = useState(true);
  const [shownCount, setShownCount] = useState(PAGE);
  const [preview, setPreview] = useState<ApiItem>();
  // Recherche en ligne, utilisée seulement si le catalogue complet n'a pas pu être chargé.
  const [remote, setRemote] = useState<ApiItem[]>([]);
  const [remoteError, setRemoteError] = useState<string>();

  const load = (force = false) => {
    setCatalogError(undefined);
    loadEquipmentCatalog(force)
      .then(setCatalog)
      .catch((e: Error) => setCatalogError(e.message));
  };
  useEffect(() => load(), []);

  useEffect(() => {
    if (catalog || !catalogError) return;
    const q = query.trim();
    if (q.length < 2) return setRemote([]);
    const t = setTimeout(() => {
      searchEquipment(q, { minLevel: minLvl, maxLevel: maxLvl, limit: 100 })
        .then((r) => {
          setRemote(r);
          setRemoteError(undefined);
        })
        .catch((e: Error) => setRemoteError(e.message));
    }, 300);
    return () => clearTimeout(t);
  }, [catalog, catalogError, query, minLvl, maxLvl]);

  useEffect(() => setShownCount(PAGE), [query, minLvl, maxLvl, onlySlot]);

  const results = useMemo(() => {
    const source = catalog ?? remote;
    const q = normalizeText(query);
    return source.filter((i) => {
      if (onlySlot && !itemFitsSlot(slot, i)) return false;
      const lvl = i.level ?? 0;
      if (lvl < minLvl || lvl > maxLvl) return false;
      if (q && !normalizeText(i.name).includes(q) && !normalizeText(i.parent_set?.name ?? '').includes(q)) return false;
      return true;
    });
  }, [catalog, remote, query, minLvl, maxLvl, onlySlot, slot]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Choisir : ${slot.label}`}>
        <div className="modal-head">
          <h3>Choisir : {slot.label}</h3>
          <button className="btn ghost" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="picker-filters">
          <input
            autoFocus
            className="input grow"
            placeholder="Filtrer par nom d'objet ou de panoplie…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="inline">
            Niv.
            <input className="input num" type="number" min={1} max={200} value={minLvl} onChange={(e) => setMinLvl(+e.target.value || 1)} />
            à
            <input className="input num" type="number" min={1} max={200} value={maxLvl} onChange={(e) => setMaxLvl(+e.target.value || 200)} />
          </label>
          <label className="inline">
            <input type="checkbox" checked={onlySlot} onChange={(e) => setOnlySlot(e.target.checked)} />
            Seulement « {slot.label} »
          </label>
        </div>
        <div className="picker-body">
          <div className="picker-list">
            {!catalog && !catalogError && <p className="muted">Chargement de tous les objets du jeu…</p>}
            {catalogError && (
              <div className="error small">
                Le catalogue complet n'a pas pu être chargé ({catalogError}).{' '}
                <button className="btn tiny" onClick={() => load(true)}>
                  Réessayer
                </button>
                <div className="muted">En attendant, tapez un nom pour chercher en ligne.</div>
                {remoteError && <div>Recherche en ligne : {remoteError}</div>}
              </div>
            )}
            {catalog && <p className="muted small">{results.length} objets</p>}
            <div className="item-grid">
              {results.slice(0, shownCount).map((item) => (
                <button
                  key={item.ankama_id}
                  className={'item-card' + (preview?.ankama_id === item.ankama_id ? ' selected' : '')}
                  onClick={() => setPreview(item)}
                  onDoubleClick={() => onPick(item)}
                  title={item.name}
                >
                  <ItemIcon item={item} size={56} />
                  <span className="item-card-name">{item.name}</span>
                  <span className="muted small">niv. {item.level}</span>
                </button>
              ))}
            </div>
            {results.length > shownCount && (
              <button className="btn full" onClick={() => setShownCount((n) => n + PAGE)}>
                Afficher plus ({results.length - shownCount} restants)
              </button>
            )}
          </div>
          <div className="picker-preview">
            {preview ? (
              <>
                <div className="preview-head">
                  <ItemIcon item={preview} size={72} />
                  <div>
                    <h4>{preview.name}</h4>
                    <div className="muted small">
                      {preview.type?.name} · niveau {preview.level}
                    </div>
                    {preview.parent_set?.name && <div className="tag">Panoplie : {preview.parent_set.name}</div>}
                  </div>
                </div>
                <EffectList effects={preview.effects ?? []} />
                <button className="btn primary full" onClick={() => onPick(preview)}>
                  Équiper
                </button>
              </>
            ) : (
              <p className="muted">Cliquez sur un objet pour voir ses caractéristiques (double-clic pour l'équiper).</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
