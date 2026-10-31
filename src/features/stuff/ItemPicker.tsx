import { useEffect, useState } from 'react';
import { searchEquipment, type ApiItem } from '../../lib/dofusApi';
import { itemFitsSlot, type SlotDef } from './types';
import { EffectList, ItemIcon } from './ItemBits';

interface Props {
  slot: SlotDef;
  maxLevel: number;
  onPick: (item: ApiItem) => void;
  onClose: () => void;
}

export default function ItemPicker({ slot, maxLevel, onPick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [minLvl, setMinLvl] = useState(1);
  const [maxLvl, setMaxLvl] = useState(maxLevel);
  const [onlySlot, setOnlySlot] = useState(true);
  const [results, setResults] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [preview, setPreview] = useState<ApiItem>();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    const t = setTimeout(() => {
      searchEquipment(q, { minLevel: minLvl, maxLevel: maxLvl, limit: 100 })
        .then((r) => !cancelled && setResults(r))
        .catch((e: Error) => !cancelled && setError(e.message))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, minLvl, maxLvl]);

  const shown = onlySlot ? results.filter((i) => itemFitsSlot(slot, i)) : results;

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
            placeholder="Rechercher un objet (ex. Gelano, Bottes du Comte…)"
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
            {query.trim().length < 2 && <p className="muted">Tapez au moins 2 lettres pour chercher dans les objets du jeu.</p>}
            {loading && <p className="muted">Recherche…</p>}
            {error && <p className="error">Impossible de joindre l'API des objets ({error}).</p>}
            {!loading && !error && query.trim().length >= 2 && shown.length === 0 && (
              <p className="muted">Aucun objet trouvé{onlySlot && results.length > 0 ? ' pour cet emplacement (décochez le filtre ?)' : ''}.</p>
            )}
            {shown.map((item) => (
              <button
                key={item.ankama_id}
                className={'picker-row' + (preview?.ankama_id === item.ankama_id ? ' selected' : '')}
                onClick={() => setPreview(item)}
                onDoubleClick={() => onPick(item)}
              >
                <ItemIcon item={item} />
                <span className="grow">
                  <strong>{item.name}</strong>
                  <span className="muted small">
                    {item.type?.name} · niv. {item.level}
                    {item.parent_set?.name ? ` · ${item.parent_set.name}` : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="picker-preview">
            {preview ? (
              <>
                <div className="preview-head">
                  <ItemIcon item={preview} size={64} />
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
              <p className="muted">Sélectionnez un objet pour voir ses caractéristiques (double-clic pour équiper).</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
