import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
import SectionCard from './SectionCard.jsx';

/**
 * RewardsView component
 *
 * Rewards provide gentle positive feedback for completing tasks, maintaining
 * streaks or reviewing budgets. Users can disable points and streaks in
 * Settings. This stub displays a short description and will later show
 * accumulated points, streak indicators and cosmetic unlocks.
 */
const RewardsView = () => {
  const { t } = useTranslation();
  const { ready, getRewards, insertReward, updateReward, deleteReward } = useDB();
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', pointsRequired: '', description: '' });

  useEffect(() => {
    if (!ready) return;

    setLoading(true);
    getRewards()
      .then(setRewards)
      .catch((error) => {
        console.error('Failed to load rewards', error);
      })
      .finally(() => setLoading(false));
  }, [getRewards, ready]);

  const resetForm = () => setForm({ title: '', pointsRequired: '', description: '' });

  const handleAdd = () => {
    if (!form.title.trim()) return;
    const points = Number.parseInt(form.pointsRequired, 10);
    if (Number.isNaN(points)) return;

    insertReward(form.title.trim(), points, form.description.trim() || null)
      .then((created) => {
        setRewards((prev) => (prev.length ? [created, ...prev] : [created]));
        resetForm();
      })
      .catch((error) => {
        console.error('Failed to add reward', error);
      });
  };

  const toggleRedeemed = (reward) => {
    updateReward(reward.id, { redeemed: !reward.redeemed })
      .then((updated) => {
        if (!updated) return;
        setRewards((prev) => prev.map((entry) => (entry.id === reward.id ? updated : entry)));
      })
      .catch((error) => {
        console.error('Failed to update reward', error);
      });
  };

  const removeReward = (id) => {
    deleteReward(id)
      .then((deleted) => {
        if (deleted) {
          setRewards((prev) => prev.filter((entry) => entry.id !== id));
        }
      })
      .catch((error) => {
        console.error('Failed to delete reward', error);
      });
  };

  return (
    <SectionCard
      ariaLabel={`${t('rewards')} module`}
      title={t('rewards')}
      subtitle={t('rewardsPlaceholder') || ''}
    >
      <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
        <label>
          {t('titleLabel') || 'Title'}
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </label>
        <label>
          {t('pointsRequiredLabel') || 'Points required'}
          <input
            type="number"
            value={form.pointsRequired}
            onChange={(e) => setForm((prev) => ({ ...prev, pointsRequired: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </label>
        <label>
          {t('descriptionLabel') || 'Description'}
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </label>
        <button type="button" onClick={handleAdd} style={{ padding: '0.5rem 0.75rem', width: 'fit-content' }}>
          {t('addReward') || 'Add reward'}
        </button>
      </div>

      {loading ? (
        <p>{t('loading') || 'Loading rewards…'}</p>
      ) : rewards.length === 0 ? (
        <p>{t('emptyRewards') || 'No rewards yet.'}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {rewards.map((reward) => (
            <li
              key={reward.id}
              style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.75rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{reward.title}</div>
                  <div>
                    {t('pointsRequiredLabel') || 'Points required'}: {reward.pointsRequired}
                  </div>
                  <div>
                    {t('redeemedLabel') || 'Redeemed'}: {reward.redeemed ? t('yesLabel') || 'Yes' : t('noLabel') || 'No'}
                  </div>
                  {reward.description ? <p style={{ marginTop: '0.25rem' }}>{reward.description}</p> : null}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <button type="button" onClick={() => toggleRedeemed(reward)} style={{ padding: '0.5rem 0.75rem' }}>
                    {t('toggleRedeemed') || 'Toggle redeemed'}
                  </button>
                  <button type="button" onClick={() => removeReward(reward.id)} style={{ padding: '0.5rem 0.75rem' }}>
                    {t('deleteLabel') || 'Delete'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
};

export default RewardsView;
