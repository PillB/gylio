import React from 'react';
import { useTranslation } from 'react-i18next';
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
  return (
    <SectionCard
      ariaLabel={`${t('rewards')} module`}
      title={t('rewards')}
      subtitle={t('rewardsPlaceholder') || ''}
    />
  );
};

export default RewardsView;
