import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
import useGamification from '../core/hooks/useGamification';
import { useTheme } from '../core/context/ThemeContext';
import SectionCard from './SectionCard.jsx';
import BudgetTooltip from './atoms/BudgetTooltip';
import AdSlot from '../features/ads/AdSlot';

/**
 * RewardsView component
 *
 * Rewards provide gentle positive feedback for completing tasks, maintaining
 * streaks or reviewing budgets. Users can disable points and streaks in
 * Settings. This component displays accumulated points, streak indicators,
 * cosmetic unlocks, and compassionate recovery messaging for lapsed streaks.
 */

const LAST_STREAK_BEFORE_KEY = 'gylio:lastStreakBeforeBreak';

/**
 * Returns days elapsed since lastActivityDate (ISO string), or null if unknown.
 */
function daysSinceActivity(lastActivityDate) {
  if (!lastActivityDate) return null;
  const last    = new Date(lastActivityDate);
  const today   = new Date();
  const utcLast  = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((utcToday - utcLast) / 86_400_000);
}

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

  const nearestReward = useMemo(() => {
    const locked = (rewards || []).filter((r) => !r.redeemed && r.pointsRequired > (progressSummary?.points ?? 0));
    if (!locked.length) return null;
    return locked.reduce((closest, r) => {
      const distA = r.pointsRequired - (progressSummary?.points ?? 0);
      const distB = closest.pointsRequired - (progressSummary?.points ?? 0);
      return distA < distB ? r : closest;
    });
  }, [rewards, progressSummary]);

  /**
   * bestStreak — merges the DB-level bestStreak with the localStorage
   * snapshot so history survives even if the DB is cleared/reset.
   */
  const bestStreak = useMemo(() => {
    const fromProgress = progress?.bestStreak ?? 0;
    const fromStorage  = parseInt(localStorage.getItem(LAST_STREAK_BEFORE_KEY) ?? '0', 10);
    return Math.max(fromProgress, fromStorage);
  }, [progress]);

  /**
   * gapDays — calendar days since last recorded activity.
   * Only meaningful when taskStreakDays === 0 (streak broken).
   */
  const gapDays = useMemo(() => {
    if ((progress?.taskStreakDays ?? 0) > 0) return null;
    const days = daysSinceActivity(progress?.lastActivityDate ?? null);
    return days !== null && days > 1 ? days : null;
  }, [progress]);

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
      badge={<BudgetTooltip content={t('tooltips.rewards.section', 'Rewards give you gentle, consistent positive feedback for building habits. XP, streaks, and unlocks are optional — they are here to celebrate progress, not add pressure.')} />}
    >
      <div style={{ display: 'grid', gap: `${theme.spacing.md}px`, gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <section
          data-tour="rewards-toggle"
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
            <p style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              {t('rewards.gamificationLabel') || 'Gamification'}
              <BudgetTooltip content={t('tooltips.rewards.gamification', 'Toggle XP points, level-ups, and streaks on or off. When off, tasks and budgets still work — you just skip the game layer. Your data is never deleted.')} />
            </p>
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
              data-tour="rewards-progress"
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
                  <p style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                    {t('rewards.levelLabel') || 'Level'}
                    <BudgetTooltip content={t('tooltips.rewards.level', 'Your level reflects cumulative XP across all completed tasks and budget reviews. Levels are purely cosmetic — they show long-term consistency, not short-term performance.')} />
                  </p>
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
                  <p style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                    {t('rewards.skipTokensLabel') || 'Skip tokens'}
                    <BudgetTooltip content={t('tooltips.rewards.skipTokens', 'Skip tokens protect your streak when life gets in the way. Earn them by completing tasks or budget reviews. Use them on days you miss — no guilt, no reset.')} />
                  </p>
                  <p style={{ margin: '0.25rem 0 0' }}>{progressSummary.skipTokens}</p>
                  <small style={{ color: theme.colors.muted }}>
                    {t('rewards.skipTokensHelper') || 'Use a token to preserve a streak after a missed day.'}
                  </small>
                </div>
              </div>
              {/* ── Streak status — taskStreakDays is the primary streak ── */}
              <div style={{ display: 'grid', gap: theme.spacing.xs }}>
                <p style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  {t('rewards.streakHeading') || 'Streak status'}
                  <BudgetTooltip content={t('tooltips.rewards.streak', 'Streaks track how many consecutive days you\'ve completed tasks, focused, or reviewed your budget. Consistency beats intensity — even 1 task a day counts.')} />
                </p>

                {/* Task streak — prominent counter */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                    borderRadius: theme.shape.radiusMd,
                    background: progressSummary.taskStreakDays > 0
                      ? `${theme.colors.primary}12`
                      : theme.colors.background,
                    border: `1px solid ${progressSummary.taskStreakDays > 0
                      ? theme.colors.primary + '40'
                      : theme.colors.border}`,
                  }}
                >
                  <span
                    role="status"
                    aria-label={t('rewards.taskStreak', { days: progressSummary.taskStreakDays })}
                    style={{
                      fontSize: 36,
                      fontWeight: 800,
                      lineHeight: 1,
                      color: progressSummary.taskStreakDays > 0
                        ? theme.colors.primary
                        : theme.colors.muted,
                    }}
                  >
                    {progressSummary.taskStreakDays}
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: theme.colors.text }}>
                      {t('rewards.taskStreak', { days: progressSummary.taskStreakDays }) ||
                        `Task completion streak: ${progressSummary.taskStreakDays} days`}
                    </span>

                    {progressSummary.taskStreakDays === 0 && gapDays !== null && (
                      <span
                        role="note"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: theme.colors.muted }}
                      >
                        <span aria-hidden="true">📅</span>
                        {t('streakRecovery.gapBadge', { days: gapDays }) || `${gapDays} days since last activity`}
                      </span>
                    )}

                    {progressSummary.taskStreakDays === 0 && bestStreak > 0 && (
                      <span
                        aria-label={t('streakRecovery.bestStreakAriaLabel', { count: bestStreak })}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: theme.colors.muted }}
                      >
                        <span aria-hidden="true">🏅</span>
                        {t('streakRecovery.bestStreak', { count: bestStreak }) || `Best: ${bestStreak} days`}
                      </span>
                    )}
                  </div>
                </div>

                <small style={{ color: theme.colors.muted }}>
                  {t('rewards.focusStreak', { days: progressSummary.focusStreakDays }) ||
                    `Daily focus streak: ${progressSummary.focusStreakDays} days`}
                </small>
                <small style={{ color: theme.colors.muted }}>
                  {t('rewards.budgetStreak', { weeks: progressSummary.budgetStreakWeeks }) ||
                    `Weekly budget review streak: ${progressSummary.budgetStreakWeeks} weeks`}
                </small>
              </div>
            </section>

            {!rewards.length && gamificationEnabled && (
              <div style={{ marginBottom: `${theme.spacing.md}px` }}>
                <p style={{ margin: `0 0 ${theme.spacing.xs}px`, fontSize: '0.8125rem', color: theme.colors.muted }}>
                  {t('rewards.starterHint', 'Not sure what to add? Start with these:')}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { title: t('rewards.starter.coffee', 'Coffee break'), pts: 50 },
                    { title: t('rewards.starter.episode', 'Watch an episode'), pts: 75 },
                    { title: t('rewards.starter.walk', '15-min walk outside'), pts: 30 },
                    { title: t('rewards.starter.snack', 'Favourite snack'), pts: 40 },
                    { title: t('rewards.starter.nap', 'Power nap'), pts: 60 },
                    { title: t('rewards.starter.game', '20 min of gaming'), pts: 80 },
                  ].map(({ title, pts }) => (
                    <button
                      key={title}
                      type="button"
                      onClick={() => insertReward(title, pts, null)
                        .then((created) => setRewards((prev) => (prev.length ? [created, ...prev] : [created])))
                        .catch(() => {})}
                      style={{
                        padding: '4px 12px',
                        borderRadius: theme.shape.radiusFull,
                        border: `1px dashed ${theme.colors.border}`,
                        background: 'transparent',
                        color: theme.colors.text,
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontFamily: theme.typography.body.family,
                      }}
                    >
                      + {title} <span style={{ color: theme.colors.muted, fontSize: '0.72rem' }}>{pts}pts</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div data-tour="rewards-form" style={{ display: 'grid', gap: `${theme.spacing.sm}px`, marginBottom: `${theme.spacing.md}px` }}>
              <label>
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  {t('titleLabel') || 'Title'}
                  <BudgetTooltip content={t('tooltips.rewards.rewardTitle', "What reward do you want to unlock? Make it something you genuinely look forward to — a meal out, a new book, a guilt-free lazy day.")} />
                </span>
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
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  {t('pointsRequiredLabel') || 'Points required'}
                  <BudgetTooltip content={t('tooltips.rewards.pointsRequired', 'How much XP to unlock this reward? You earn XP by completing tasks (10 pts each) and reviewing your budget weekly. Set thresholds you can realistically hit.')} />
                </span>
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
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  {t('descriptionLabel') || 'Description'}
                  <BudgetTooltip content={t('tooltips.rewards.rewardDescription', 'Optional notes about the reward — where to go, what to order, what it costs.')} />
                </span>
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
                  minHeight: '44px',
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

            {nearestReward && (
              <div style={{
                border: `2px solid ${theme.colors.primary}`,
                borderRadius: theme.shape.radiusMd,
                padding: `${theme.spacing.md}px`,
                marginBottom: `${theme.spacing.md}px`,
                backgroundColor: theme.colors.surface,
              }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, color: theme.colors.text }}>
                  {t('rewards.nearestHeading', "You're almost there!")}
                </p>
                <p style={{ margin: '0 0 8px', color: theme.colors.text }}>{nearestReward.title}</p>
                <div style={{ background: theme.colors.border, borderRadius: theme.shape.radiusFull, height: 10, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, Math.round(((progressSummary?.points ?? 0) / nearestReward.pointsRequired) * 100))}%`,
                    background: theme.colors.primary,
                    borderRadius: theme.shape.radiusFull,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                <small style={{ color: theme.colors.muted }}>
                  {t('rewards.progressLabel', {
                    current: progressSummary?.points ?? 0,
                    target: nearestReward.pointsRequired,
                    pct: Math.min(100, Math.round(((progressSummary?.points ?? 0) / nearestReward.pointsRequired) * 100)),
                    defaultValue: `${progressSummary?.points ?? 0} / ${nearestReward.pointsRequired} points`,
                  })}
                </small>
              </div>
            )}

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
                        {!reward.redeemed && reward.pointsRequired > (progressSummary?.points ?? 0) && (
                          <div style={{ marginTop: 6 }}>
                            <div style={{ background: theme.colors.border, borderRadius: theme.shape.radiusFull, height: 6, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${Math.min(100, Math.round(((progressSummary?.points ?? 0) / reward.pointsRequired) * 100))}%`,
                                background: theme.colors.primary,
                                opacity: 0.7,
                                borderRadius: theme.shape.radiusFull,
                              }} />
                            </div>
                          </div>
                        )}
                        <div>
                          {t('redeemedLabel') || 'Redeemed'}:{' '}
                          {reward.redeemed ? t('yesLabel') || 'Yes' : t('noLabel') || 'No'}
                        </div>
                        {reward.description ? <p style={{ marginTop: '0.25rem' }}>{reward.description}</p> : null}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: `${theme.spacing.xs}px`, alignItems: 'stretch', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => toggleRedeemed(reward)}
                          disabled={!reward.unlocked}
                          style={{
                            padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                            minHeight: 44,
                            borderRadius: theme.shape.radiusSm,
                            border: `1px solid ${theme.colors.border}`,
                            backgroundColor: reward.unlocked ? theme.colors.background : theme.colors.border,
                            color: reward.unlocked ? theme.colors.text : theme.colors.muted,
                            cursor: reward.unlocked ? 'pointer' : 'not-allowed',
                            fontFamily: theme.typography.body.family,
                            fontSize: '0.8125rem',
                            whiteSpace: 'nowrap',
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
                              padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                              minHeight: 44,
                              borderRadius: theme.shape.radiusSm,
                              border: `1px solid ${theme.colors.border}`,
                              backgroundColor: theme.colors.background,
                              color: theme.colors.text,
                              cursor: 'pointer',
                              fontFamily: theme.typography.body.family,
                              fontSize: '0.8125rem',
                              whiteSpace: 'nowrap',
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
      <AdSlot placement="rewards" />
    </SectionCard>
  );
};

export default RewardsView;
