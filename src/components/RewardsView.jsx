import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
import { useTheme } from '../core/context/ThemeContext';
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
  const { theme } = useTheme();
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', pointsRequired: '', description: '' });
  const [touched, setTouched] = useState({ title: false, pointsRequired: false });

  const validation = useMemo(() => {
    const errors = { title: '', pointsRequired: '' };
    const trimmedTitle = form.title.trim();
    const points = Number.parseInt(form.pointsRequired, 10);

    if (!trimmedTitle) {
      errors.title = t('validation.titleRequired');
    }

    if (Number.isNaN(points)) {
      errors.pointsRequired = t('validation.invalidNumber');
    } else if (points <= 0) {
      errors.pointsRequired = t('validation.pointsPositive');
    }

    return errors;
  }, [form.pointsRequired, form.title, t]);

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

  const resetForm = () => {
    setForm({ title: '', pointsRequired: '', description: '' });
    setTouched({ title: false, pointsRequired: false });
  };

  const handleAdd = () => {
    setTouched({ title: true, pointsRequired: true });
    const hasErrors = Object.values(validation).some(Boolean);
    if (hasErrors) return;

    const points = Number.parseInt(form.pointsRequired, 10);

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
    const target = rewards.find((entry) => entry.id === id);
    const confirmed = window.confirm(t('rewards.confirmDelete', { title: target?.title ?? '' }));
    if (!confirmed) return;

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
      ariaLabel={`${t('rewards.title')} module`}
      title={t('rewards.title')}
      subtitle={t('rewardsPlaceholder') || ''}
    >
      <div style={{ display: 'grid', gap: `${theme.spacing.sm}px`, marginBottom: `${theme.spacing.md}px` }}>
        <label>
          {t('titleLabel') || 'Title'}
          <input
            type="text"
            value={form.title}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, title: e.target.value }));
              setTouched((prev) => ({ ...prev, title: true }));
            }}
            style={{
              width: '100%',
              padding: `${theme.spacing.sm}px`,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.shape.radiusSm,
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              fontFamily: theme.typography.body.family,
            }}
          />
          {touched.title && validation.title ? (
            <span style={{ color: theme.colors.accent }}>{validation.title}</span>
          ) : null}
        </label>
        <label>
          {t('pointsRequiredLabel') || 'Points required'}
          <input
            type="number"
            value={form.pointsRequired}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, pointsRequired: e.target.value }));
              setTouched((prev) => ({ ...prev, pointsRequired: true }));
            }}
            style={{
              width: '100%',
              padding: `${theme.spacing.sm}px`,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.shape.radiusSm,
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              fontFamily: theme.typography.body.family,
            }}
          />
          {touched.pointsRequired && validation.pointsRequired ? (
            <span style={{ color: theme.colors.accent }}>{validation.pointsRequired}</span>
          ) : null}
        </label>
        <label>
          {t('descriptionLabel') || 'Description'}
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            style={{
              width: '100%',
              padding: `${theme.spacing.sm}px`,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.shape.radiusSm,
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              fontFamily: theme.typography.body.family,
            }}
          />
        </label>
        <button
          type="button"
          onClick={handleAdd}
          style={{
            padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
            width: 'fit-content',
            borderRadius: theme.shape.radiusSm,
            border: `1px solid ${theme.colors.primary}`,
            backgroundColor: theme.colors.primary,
            color: theme.colors.background,
            cursor: 'pointer',
            fontFamily: theme.typography.body.family,
          }}
        >
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
              style={{
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.shape.radiusSm,
                padding: `${theme.spacing.md}px`,
                marginBottom: `${theme.spacing.md}px`,
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: `${theme.spacing.sm}px` }}>
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
                <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, alignItems: 'flex-start' }}>
                  <button
                    type="button"
                    onClick={() => toggleRedeemed(reward)}
                    style={{
                      padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                      borderRadius: theme.shape.radiusSm,
                      border: `1px solid ${theme.colors.border}`,
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                      cursor: 'pointer',
                      fontFamily: theme.typography.body.family,
                    }}
                  >
                    {t('toggleRedeemed') || 'Toggle redeemed'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeReward(reward.id)}
                    style={{
                      padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                      borderRadius: theme.shape.radiusSm,
                      border: `1px solid ${theme.colors.border}`,
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                      cursor: 'pointer',
                      fontFamily: theme.typography.body.family,
                    }}
                  >
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
