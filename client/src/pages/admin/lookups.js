import { useEffect, useState } from 'react';
import { api } from '../../api';

let cache = null;

export function useLookups(force = false) {
  const [data, setData] = useState(cache);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (cache && !force) return;
    api('/admin/settings/lookups')
      .then((result) => {
        cache = result;
        setData(result);
      })
      .catch(() => setData({ classes: [], camps: [], students: [] }));
  }, [force, tick]);

  return { ...(data || { classes: [], camps: [], students: [] }), reload: () => setTick((v) => v + 1) };
}

export const invalidateLookups = () => {
  cache = null;
};
