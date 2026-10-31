import type { ApiItem, Effect } from '../../lib/dofusApi';
import { effectRange } from '../../lib/dofusApi';

export function ItemIcon({ item, size = 40 }: { item?: Pick<ApiItem, 'image_urls' | 'name'>; size?: number }) {
  const src = item?.image_urls?.sd ?? item?.image_urls?.icon;
  if (!src) return <span className="item-icon placeholder" style={{ width: size, height: size }} />;
  return <img className="item-icon" src={src} alt={item?.name ?? ''} width={size} height={size} loading="lazy" />;
}

export function effectLabel(e: Effect): string {
  if (e.formatted) return e.formatted;
  const [min, max] = effectRange(e);
  return `${min === max ? min : `${min} à ${max}`} ${e.type?.name ?? ''}`;
}

export function EffectList({ effects }: { effects: Effect[] }) {
  if (!effects.length) return <p className="muted small">Aucun effet.</p>;
  return (
    <ul className="effects">
      {effects.map((e, i) => {
        const neg = (e.type?.name ?? '').startsWith('-') || (e.int_minimum ?? 0) < 0;
        return (
          <li key={i} className={neg ? 'neg' : e.type?.is_active ? 'active' : ''}>
            {effectLabel(e)}
          </li>
        );
      })}
    </ul>
  );
}
