import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
import useGamification from '../core/hooks/useGamification';
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
  const { ready, getRewards, getRewardsProgress, insertReward, updateReward, deleteReward } = useDB();
  const { theme } = useTheme();
  const { gamificationEnabled, setGamificationEnabled } = useGamification();
  const [rewards, setRewards] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', pointsRequired: '', description: '' });
  const [touched, setTouched] = useState({ title: false, pointsRequired: false });
  const [rewardDeleteConfirmId, setRewardDeleteConfirmId] = useState(null);

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

  const progressSummary = useMemo(() => {
    const points = progress?.points ?? 0;
    const level = progress?.level ?? 1;
    const nextLevelTarget = level * 100;
    return {
      points,
      level,
      nextLevelTarget,
      nextLevelRemaining: Math.max(0, nextLevelTarget - points),
      focusStreakDays: progress?.focusStreakDays ?? 0,
      taskStreakDays: progress?.taskStreakDays ?? 0,
      budgetStreakWeeks: progress?.budgetStreakWeeks ?? 0,
      skipTokens: progress?.skipTokens ?? 0,
    };
  }, [progress]);

  const unlockedRewards = useMemo(
    () =>
      rewards.map((reward) => ({
        ...reward,
        unlocked: progressSummary.points >= reward.pointsRequired,
      })),
    [progressSummary.points, rewards]
  );

  useEffect(() => {
    if (!ready) return;

    setLoading(true);
    Promise.all([getRewards(), getRewardsProgress()])
      .then(([loadedRewards, loadedProgress]) => {
        setRewards(loadedRewards);
        setProgress(loadedProgress);
      })
      .catch((error) => {
        console.error('Failed to load rewards', error);
      })
      .finally(() => setLoading(false));
  }, [getRewards, getRewardsProgress, ready]);

  const resetForm = () => {
    setForm({ title: '', pointsRequired: '', description: '' });
    setTouched({ title: false, pointsRequired: false });
  };

  const handleAdd = () => {
    if (!gamificationEnabled) return;
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
    deleteReward(id)
      .then((deleted) => {
        if (deleted) {
          setRewards((prev) => prev.filter((entry) => entry.id !== id));
        }
        setRewardDeleteConfirmId(null);
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
      <div style={{ display: 'grid', gap: `${theme.spacing.md}px` }}>
        <section
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusMd,
            padding: theme.spacing.md,
            background: theme.colors.surface,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: theme.spacing.md,
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>{t('rewards.gamificationLabel') || 'Gamification'}</p>
            <small style={{ color: theme.colors.muted }}>
              {t('rewards.gamificationHelper') ||
                'Toggle XP, streaks, and unlocks on or off. Your data stays local.'}
            </small>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <input
              type="checkbox"
              checked={gamificationEnabled}
              onChange={(event) => setGamificationEnabled(event.target.checked)}
              aria-label={t('rewards.gamificationLabel') || 'Gamification'}
              style={{ width: 20, height: 20 }}
            />
            <span>
              {gamificationEnabled
                ? t('rewards.gamificationOn') || 'Enabled'
                : t('rewards.gamificationOff') || 'Disabled'}
            </span>
          </label>
        </section>

        {!gamificationEnabled ? (
          <p style={{ color: theme.colors.muted }}>{t('rewards.gamificationDisabled') || 'Gamification is off.'}</p>
        ) : loading ? (
          <p>{t('loading') || 'Loading rewards…'}</p>
        ) : (
          <>
            <section
              style={{
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.shape.radiusMd,
                padding: theme.spacing.md,
                background: theme.colors.surface,
                display: 'grid',
                gap: theme.spacing.sm,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: theme.spacing.md }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{t('rewards.levelLabel') || 'Level'}</p>
                  <p style={{ margin: '0.25rem 0 0' }}>
                    {t('rewards.levelSummary', { level: progressSummary.level }) || `Level ${progressSummary.level}`}
                  </p>
                  <small style={{ color: theme.colors.muted }}>
                    {t('rewards.xpSummary', {
                      points: progressSummary.points,
                      target: progressSummary.nextLevelTarget,
                    }) || `${progressSummary.points} XP / ${progressSummary.nextLevelTarget} XP`}
                  </small>
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{t('rewards.skipTokensLabel') || 'Skip tokens'}</p>
                  <p style={{ margin: '0.25rem 0 0' }}>{progressSummary.skipTokens}</p>
                  <small style={{ color: theme.colors.muted }}>
                    {t('rewards.skipTokensHelper') || 'Use a token to preserve a streak after a missed day.'}
                  </small>
                </div>
              </div>
              <div style={{ display: 'grid', gap: theme.spacing.xs }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{t('rewards.streakHeading') || 'Streak status'}</p>
                <small style={{ color: theme.colors.muted }}>
                  {t('rewards.focusStreak', { days: progressSummary.focusStreakDays }) ||
                    `Daily focus streak: ${progressSummary.focusStreakDays} days`}
                </small>
                <small style={{ color: theme.colors.muted }}>
                  {t('rewards.taskStreak', { days: progressSummary.taskStreakDays }) ||
                    `Task completion streak: ${progressSummary.taskStreakDays} days`}
                </small>
                <small style={{ color: theme.colors.muted }}>
                  {t('rewards.budgetStreak', { weeks: progressSummary.budgetStreakWeeks }) ||
                    `Weekly budget review streak: ${progressSummary.budgetStreakWeeks} weeks`}
                </small>
              </div>
            </section>

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

            {unlockedRewards.length === 0 ? (
              <p>{t('emptyRewards') || 'No rewards yet.'}</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {unlockedRewards.map((reward) => (
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
                          {reward.unlocked
                            ? t('rewards.unlocked') || 'Unlocked'
                            : t('rewards.locked') || 'Locked'}
                        </div>
                        <div>
                          {t('redeemedLabel') || 'Redeemed'}:{' '}
                          {reward.redeemed ? t('yesLabel') || 'Yes' : t('noLabel') || 'No'}
                        </div>
                        {reward.description ? <p style={{ marginTop: '0.25rem' }}>{reward.description}</p> : null}
                      </div>
                      <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, alignItems: 'flex-start' }}>
                        <button
                          type="button"
                          onClick={() => toggleRedeemed(reward)}
                          disabled={!reward.unlocked}
                          style={{
                            padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                            borderRadius: theme.shape.radiusSm,
                            border: `1px solid ${theme.colors.border}`,
                            backgroundColor: reward.unlocked ? theme.colors.background : theme.colors.border,
                            color: reward.unlocked ? theme.colors.text : theme.colors.muted,
                            cursor: reward.unlocked ? 'pointer' : 'not-allowed',
                            fontFamily: theme.typography.body.family,
                          }}
                        >
                          {t('toggleRedeemed') || 'Toggle redeemed'}
                        </button>
                        {rewardDeleteConfirmId === reward.id ? (
                          <div
                            role="group"
                            aria-label={t('rewards.confirmDelete', { title: reward.title })}
                            style={{
                              display: 'grid',
                              gap: `${theme.spacing.xs}px`,
                              padding: `${theme.spacing.xs}px`,
                              borderRadius: theme.shape.radiusSm,
                              border: `1px solid ${theme.colors.border}`,
                              backgroundColor: theme.colors.surface,
                            }}
                          >
                            <span>{t('rewards.confirmDelete', { title: reward.title })}</span>
                            <div style={{ display: 'flex', gap: `${theme.spacing.xs}px`, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => removeReward(reward.id)}
                                style={{
                                  padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                                  borderRadius: theme.shape.radiusSm,
                                  border: `1px solid ${theme.colors.primary}`,
                                  backgroundColor: theme.colors.primary,
                                  color: theme.colors.background,
                                  cursor: 'pointer',
                                  fontFamily: theme.typography.body.family,
                                }}
                              >
                                {t('confirmLabel') || 'Confirm'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setRewardDeleteConfirmId(null)}
                                style={{
                                  padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                                  borderRadius: theme.shape.radiusSm,
                                  border: `1px solid ${theme.colors.border}`,
                                  backgroundColor: theme.colors.background,
                                  color: theme.colors.text,
                                  cursor: 'pointer',
                                  fontFamily: theme.typography.body.family,
                                }}
                              >
                                {t('cancelLabel') || 'Cancel'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRewardDeleteConfirmId(reward.id)}
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
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </SectionCard>
  );
};

export default RewardsView;
