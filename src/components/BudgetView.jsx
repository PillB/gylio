import React from 'react';
import { useTranslation } from 'react-i18next';
import SectionCard from './SectionCard.jsx';

/**
 * BudgetView component
 *
 * Here we will display income and spending categories, highlight the difference
 * between Needs and Wants, and show debt payoff projections. At present,
 * this component only contains placeholder text. Future iterations will
 * integrate charts, sliders and a zero‑based budgeting workflow.
 */
const BudgetView = () => {
  const { t } = useTranslation();
  return (
    <SectionCard
      ariaLabel={`${t('budget.title')} module`}
      title={t('budget.title')}
      subtitle={`${t('budget.placeholder')} ${t('budget.debtSnowball')}`}
    />
  );
};

export default BudgetView;
