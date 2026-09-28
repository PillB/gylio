import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { BudgetCategory } from '../../../core/hooks/useDB';
import type { ThemeTokens } from '../../../core/themes';
import BudgetTooltip from '../../../components/atoms/BudgetTooltip';
import { useValidatedForm } from '../hooks/useValidatedForm';
import { CATEGORY_TYPES, categoryProgress, type SpendingStatus } from '../utils/budgetTotals';
import { parseNumber, validateCategory, type CategoryFields } from '../utils/budgetValidation';
import { BudgetField, BudgetInput, PrimaryButton, fieldStyle, stackStyle } from './BudgetControls';

const EMPTY_CATEGORY: CategoryFields = { name: '', type: 'NEED', plannedAmount: '' };

type Props = {
  categories: BudgetCategory[];
  spentByCategory: Map<string, number>;
  onAdd: (entry: BudgetCategory) => Promise<boolean>;
  onRemove: (index: number) => void;
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
        <span style={{ fontWeight: 600, color: theme.colors.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.name}
          <span style={{ fontWeight: 400, color: theme.colors.muted, fontSize: '0.78rem', marginLeft: 6 }}>
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

const CategorySection: React.FC<Props> = ({ categories, spentByCategory, onAdd, onRemove }) => {
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

  const typeLabel = (
    <span style={{ display: 'flex', alignItems: 'center' }}>
      {t('budget.categoryTypeLabel', 'Type')}
      <BudgetTooltip content={t('budget.needTooltip', 'Need: rent, food, transport. Want: dining, streaming, hobbies. Goal: savings, investments, emergency fund. Debt: loans and credit cards with interest.')} />
    </span>
  );

  return (
    <section style={stackStyle(theme)}>
      <h3 style={{ margin: 0 }}>{t('budget.categoryHeading', 'Categories')}</h3>
      <div style={stackStyle(theme)}>
        <BudgetInput
          label={t('categoryLabel', 'Category')}
          value={form.values.name}
          onChange={(value) => form.setField('name', value)}
          error={form.errorFor('name')}
        />
        <BudgetField label={typeLabel} error={form.errorFor('type')}>
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
