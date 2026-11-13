import { useEffect, useState } from 'react';
import { api } from '../../api';

let cache = null;
let inflight = null;

export function useSiteSettings() {
  const [settings, setSettings] = useState(cache);
  useEffect(() => {
    if (cache) return;
    if (!inflight) inflight = api('/public/settings');
    inflight
      .then((data) => {
        cache = data;
        setSettings(data);
      })
      .catch(() => setSettings(null));
  }, []);
  return settings;
}

export const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1920&q=80',
  aboutMain: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1100&q=80',
  aboutNarrow: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80',
  classThumbs: [
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1519452575417-564c1401ecc0?auto=format&fit=crop&w=600&q=80',
  ],
  cta: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?auto=format&fit=crop&w=1200&q=80',
};
