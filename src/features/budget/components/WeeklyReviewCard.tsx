import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import BudgetTooltip from '../../../components/atoms/BudgetTooltip';
import useGamification from '../../../core/hooks/useGamification';
import useRewards from '../../../core/hooks/useRewards';

const BUDGET_REVIEW_POINTS = 15;
const CONFIRMATION_MS = 2000;

/** Opt-in weekly budget check-in that feeds the rewards streak. */
const WeeklyReviewCard: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { applyRewardsProgress } = useRewards();
  const { gamificationEnabled } = useGamification();
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    if (!logged) return undefined;
    const timerId = setTimeout(() => setLogged(false), CONFIRMATION_MS);
    return () => clearTimeout(timerId);
  }, [logged]);

  const logReview = async () => {
    await applyRewardsProgress({ points: BUDGET_REVIEW_POINTS, budgetReviewed: true });
    setLogged(true);
  };

  return (
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
        <p style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
          {t('budget.reviewHeading', 'Weekly review')}
          <BudgetTooltip
            content={t(
              'tooltips.budget.review',
              'A 5-minute weekly check-in is the single highest-leverage budget habit. Glancing at the numbers prevents small leaks from becoming big holes.'
            )}
          />
        </p>
        <small style={{ color: theme.colors.muted }}>
          {gamificationEnabled
            ? t('budget.reviewHelper', 'Log a gentle check-in to keep your budget streak steady.')
            : t('budget.reviewDisabled', 'Enable gamification to track your weekly budget streak.')}
        </small>
        {logged ? (
          <p style={{ margin: `${theme.spacing.xs}px 0 0`, color: theme.colors.primary }}>
            {t('budget.reviewLogged', 'Logged for this week.')}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={logReview}
        disabled={!gamificationEnabled}
        style={{
          padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
          minHeight: 44,
          borderRadius: theme.shape.radiusSm,
          border: `1px solid ${theme.colors.primary}`,
          backgroundColor: gamificationEnabled ? theme.colors.primary : theme.colors.border,
          color: gamificationEnabled ? theme.colors.background : theme.colors.muted,
          cursor: gamificationEnabled ? 'pointer' : 'not-allowed',
          fontFamily: theme.typography.body.family,
        }}
      >
        {t('budget.logReview', 'Log weekly review')}
      </button>
    </section>
  );
};

export default WeeklyReviewCard;
