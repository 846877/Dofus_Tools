import { useEffect, useMemo, useState } from 'react';
import { getEquipment, getSet, type ApiItem, type ApiSet } from '../../lib/dofusApi';

/** Charge (et met en cache) les objets et panoplies nécessaires à un build. */
export function useItemData(itemIds: number[]) {
  const [items, setItems] = useState<Record<number, ApiItem>>({});
  const [sets, setSets] = useState<Record<number, ApiSet>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const key = useMemo(() => [...new Set(itemIds)].sort().join(','), [itemIds]);

  useEffect(() => {
    let cancelled = false;
    const ids = key ? key.split(',').map(Number) : [];
    const missing = ids.filter((id) => !items[id]);
    if (missing.length === 0) return;
    Promise.allSettled(missing.map((id) => getEquipment(id))).then((results) => {
      if (cancelled) return;
      const loaded: Record<number, ApiItem> = {};
      const errs: string[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') loaded[missing[i]] = r.value;
        else errs.push(`Objet ${missing[i]} : ${(r.reason as Error).message}`);
      });
      setItems((prev) => ({ ...prev, ...loaded }));
      setErrors(errs);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setKey = useMemo(
    () =>
      [...new Set(Object.values(items).map((i) => i.parent_set?.id).filter((x): x is number => x != null))]
        .sort()
        .join(','),
    [items],
  );

  useEffect(() => {
    let cancelled = false;
    const ids = setKey ? setKey.split(',').map(Number) : [];
    const missing = ids.filter((id) => !sets[id]);
    if (missing.length === 0) return;
    Promise.allSettled(missing.map((id) => getSet(id))).then((results) => {
      if (cancelled) return;
      const loaded: Record<number, ApiSet> = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') loaded[missing[i]] = r.value;
      });
      setSets((prev) => ({ ...prev, ...loaded }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setKey]);

  return { items, sets, errors };
}
