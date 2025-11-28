import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * RewardsView component
 *
 * Rewards provide gentle positive feedback for completing tasks, maintaining
 * streaks or reviewing budgets.  Users can disable points and streaks in
 * Settings.  This stub displays a short description and will later show
 * accumulated points, streak indicators and cosmetic unlocks.
 */
const RewardsView = () => {
  const { t } = useTranslation();
  return (
    <section aria-label={t('rewards') + ' module'}>
      <h2>{t('rewards')}</h2>
      <p>{t('rewardsPlaceholder') || 'Points and streaks will appear here. Gamification is optional.'}</p>
    </section>
  );
};

export default RewardsView;