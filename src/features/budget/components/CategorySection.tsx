import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { BudgetCategory } from '../../../core/hooks/useDB';
import type { ThemeTokens } from '../../../core/themes';
import { useValidatedForm } from '../hooks/useValidatedForm';
import { CATEGORY_TYPES, categoryProgress, type SpendingStatus } from '../utils/budgetTotals';
import { parseNumber, validateCategory, type CategoryFields } from '../utils/budgetValidation';
import { BudgetField, BudgetInput, PrimaryButton, SectionHeading, fieldStyle, stackStyle } from './BudgetControls';

const EMPTY_CATEGORY: CategoryFields = { name: '', type: 'NEED', plannedAmount: '' };

type Props = {
  categories: BudgetCategory[];
  spentByCategory: Map<string, number>;
  onAdd: (entry: BudgetCategory) => Promise<boolean>;
  /** Adds several categories at once (the quick-start set). */
  onAddMany: (entries: BudgetCategory[]) => Promise<boolean>;
  onRemove: (index: number) => void;
};

type Translate = ReturnType<typeof useTranslation>['t'];

/** A realistic starting split people can edit, so an empty budget is never a blank page. */
const starterCategories = (t: Translate): BudgetCategory[] => [
  { name: t('budget.starter.housing', 'Housing'), type: 'NEED', plannedAmount: 800 },
  { name: t('budget.starter.food', 'Food & Groceries'), type: 'NEED', plannedAmount: 300 },
  { name: t('budget.starter.transport', 'Transport'), type: 'NEED', plannedAmount: 150 },
  { name: t('budget.starter.health', 'Health'), type: 'NEED', plannedAmount: 100 },
  { name: t('budget.starter.entertainment', 'Entertainment'), type: 'WANT', plannedAmount: 100 },
  { name: t('budget.starter.dining', 'Dining Out'), type: 'WANT', plannedAmount: 100 },
  { name: t('budget.starter.savings', 'Savings'), type: 'GOAL', plannedAmount: 200 },
  { name: t('budget.starter.emergency', 'Emergency Fund'), type: 'GOAL', plannedAmount: 100 },
];

const QuickStartButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
        minHeight: 44,
        borderRadius: theme.shape.radiusMd,
        border: `1.5px dashed ${theme.colors.primary}`,
        background: `${theme.colors.primary}0d`,
        color: theme.colors.primary,
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontFamily: theme.typography.body.family,
        textAlign: 'left',
      }}
    >
      ⚡ {t('budget.quickStart.btn', 'Quick-start with 8 suggested categories (YNAB method)')}
    </button>
  );
};

const statusColor = (theme: ThemeTokens, status: SpendingStatus): string =>
  ({ over: theme.colors.error, warning: theme.colors.warning, ok: theme.colors.success })[status];

type RowProps = { entry: BudgetCategory; spent: number; onRemove: () => void };

/** One category with spent / planned and a progress bar: green below 80%, amber up to 100%, red over. */
const CategoryRow: React.FC<RowProps> = ({ entry, spent, onRemove }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { ratio, status } = categoryProgress(entry.plannedAmount, spent);
  const over = status === 'over';
  return (
    <li
      style={{
        display: 'grid',
        gap: 4,
        padding: `${theme.spacing.sm}px`,
        borderRadius: theme.shape.radiusMd,
        border: `1px solid ${over ? theme.colors.error : theme.colors.border}`,
        backgroundColor: over ? `${theme.colors.error}08` : theme.colors.surface,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.sm }}>
        <span style={{ fontWeight: 600, color: theme.colors.text, minWidth: 0, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          {entry.name}
          <span style={{ fontWeight: 400, color: theme.colors.muted, fontSize: '0.78rem', marginLeft: 6, whiteSpace: 'nowrap' }}>
            {t(`budget.categoryType.${entry.type.toLowerCase()}`, entry.type)}
          </span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, flexShrink: 0 }}>
          <span style={{ fontSize: '0.8125rem', color: over ? theme.colors.error : theme.colors.muted, fontWeight: over ? 700 : 400, whiteSpace: 'nowrap' }}>
            {spent.toFixed(2)} / {entry.plannedAmount.toFixed(2)}
          </span>
          <button
            type="button"
            onClick={onRemove}
            style={{
              padding: `2px ${theme.spacing.sm}px`,
              borderRadius: theme.shape.radiusSm,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: 'transparent',
              color: theme.colors.muted,
              cursor: 'pointer',
              fontFamily: theme.typography.body.family,
              fontSize: '0.75rem',
            }}
          >
            {t('deleteLabel', 'Delete')}
          </button>
        </div>
      </div>
      <div style={{ height: 5, borderRadius: 3, backgroundColor: theme.colors.border, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${(ratio * 100).toFixed(1)}%`,
            backgroundColor: statusColor(theme, status),
            borderRadius: 3,
            transition: 'width 400ms ease-out, background-color 300ms ease',
          }}
        />
      </div>
    </li>
  );
};

const CategorySection: React.FC<Props> = ({ categories, spentByCategory, onAdd, onAddMany, onRemove }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const validate = useCallback((values: CategoryFields) => validateCategory(values, t), [t]);
  const form = useValidatedForm(EMPTY_CATEGORY, validate);

  const handleAdd = () => {
    if (!form.submit()) return;
    const { name, type, plannedAmount } = form.values;
    onAdd({ name: name.trim(), type: type as BudgetCategory['type'], plannedAmount: parseNumber(plannedAmount) }).then(
      (saved) => {
        if (saved) form.reset();
      }
    );
  };

  return (
    <section data-tour="budget-categories" style={stackStyle(theme)}>
      <SectionHeading
        tooltip={t(
          'tooltips.budget.categories',
          'Named spending buckets. Every transaction must belong to a category — this is how you track where your money really goes vs. where you planned it to go.'
        )}
      >
        {t('budget.categoryHeading', 'Categories')}
      </SectionHeading>
      {!categories.length && <QuickStartButton onClick={() => onAddMany(starterCategories(t))} />}
      <div style={stackStyle(theme)}>
        <BudgetInput
          label={t('categoryLabel', 'Category')}
          tooltip={t(
            'tooltips.budget.categoryName',
            'Give this spending bucket a clear, memorable name. Be specific: "Groceries" is better than "Food", "Netflix + Spotify" is better than "Subscriptions". You will see this name on every transaction you log.'
          )}
          value={form.values.name}
          onChange={(value) => form.setField('name', value)}
          error={form.errorFor('name')}
        />
        <BudgetField
          label={t('budget.categoryTypeLabel', 'Type')}
          tooltipPosition="bottom"
          tooltip={t(
            'tooltips.budget.categoryType',
            'NEED: Essential expenses (rent, utilities, groceries, transport) — the floor below which life stops working. WANT: Lifestyle choices (dining out, streaming, hobbies) — not bad money, just honest about what it is. GOAL: Future building (savings, investments, emergency fund) — pay yourself first. DEBT: Repayments (loans, credit cards, anything with interest) — every extra dollar here shortens your debt-free date.'
          )}
          error={form.errorFor('type')}
        >
          <select value={form.values.type} onChange={(event) => form.setField('type', event.target.value)} style={fieldStyle(theme)}>
            {CATEGORY_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`budget.categoryType.${type.toLowerCase()}`, type)}
              </option>
            ))}
          </select>
        </BudgetField>
        <BudgetInput
          type="number"
          label={t('budget.plannedAmountLabel', 'Planned amount')}
          tooltip={t(
            'tooltips.budget.plannedAmount',
            'The maximum you intend to spend in this category for the month. Be realistic — set it based on recent history, not wishful thinking. You can always adjust it later as you learn your real patterns.'
          )}
          value={form.values.plannedAmount}
          onChange={(value) => form.setField('plannedAmount', value)}
          error={form.errorFor('plannedAmount')}
        />
        <PrimaryButton fitContent onClick={handleAdd}>
          {t('budget.addCategory', 'Add category')}
        </PrimaryButton>
      </div>
      {categories.length ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, ...stackStyle(theme) }}>
          {categories.map((entry, index) => (
            <CategoryRow
              key={`${entry.name}-${index}`}
              entry={entry}
              spent={spentByCategory.get(entry.name) ?? 0}
              onRemove={() => onRemove(index)}
            />
          ))}
        </ul>
      ) : (
        <p>{t('budget.emptyCategories', 'No categories yet.')}</p>
      )}
    </section>
  );
};

export default CategorySection;
