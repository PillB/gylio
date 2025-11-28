import React from 'react';
import { useTranslation } from 'react-i18next';

const tourItems = ['tasks', 'calendar', 'budget', 'rewards', 'settings'];

/**
 * Lightweight tour checklist so users know where to find key modules.
 */
export default function MiniTour({ data, onUpdate }) {
  const { t } = useTranslation();

  const toggleVisited = (item) => {
    const visited = new Set(data.visited || []);
    if (visited.has(item)) {
      visited.delete(item);
    } else {
      visited.add(item);
    }
    onUpdate({ ...data, visited: Array.from(visited) });
  };

  return (
    <div>
      <p>{t('onboarding.tour.helper')}</p>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.5rem' }}>
        {tourItems.map((item) => (
          <li key={item}>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={Boolean(data.visited?.includes(item))}
                onChange={() => toggleVisited(item)}
              />
              <span>
                <strong>{t(item)}</strong> — {t(`onboarding.tour.copy.${item}`)}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
