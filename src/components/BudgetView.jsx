import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
import { useTheme } from '../core/context/ThemeContext';
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
  const { ready, getBudgets, insertBudget, updateBudget, deleteBudget } = useDB();
  const { theme } = useTheme();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ category: '', amount: '', month: '' });
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({ category: '', amount: '', month: '' });
  const [touched, setTouched] = useState({ category: false, amount: false, month: false });
  const [editTouched, setEditTouched] = useState({ category: false, amount: false, month: false });
  const DEFAULT_CATEGORY_TYPE = 'NEED';

  const validateFields = useCallback(
    (fields) => {
      const validation = { category: '', amount: '', month: '' };
      const trimmedCategory = fields.category.trim();
      const trimmedMonth = fields.month.trim();
      const amountValue = Number.parseFloat(fields.amount);

      if (!trimmedCategory) {
        validation.category = t('validation.categoryRequired');
      }

      if (Number.isNaN(amountValue)) {
        validation.amount = t('validation.invalidNumber');
      } else if (amountValue <= 0) {
        validation.amount = t('validation.amountPositive');
      }

      if (!trimmedMonth) {
        validation.month = t('validation.periodRequired');
      }

      return validation;
    },
    [t]
  );

  const addValidation = useMemo(() => {
    if (!touched.category && !touched.amount && !touched.month) {
      return { category: '', amount: '', month: '' };
    }
    return validateFields(form);
  }, [form, touched, validateFields]);

  const editValidation = useMemo(() => {
    if (!editTouched.category && !editTouched.amount && !editTouched.month) {
      return { category: '', amount: '', month: '' };
    }
    return validateFields(editFields);
  }, [editFields, editTouched, validateFields]);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    getBudgets()
      .then(setBudgets)
      .catch((error) => {
        console.error('Failed to load budgets', error);
      })
      .finally(() => setLoading(false));
  }, [getBudgets, ready]);

  const resetForm = () => {
    setForm({ category: '', amount: '', month: '' });
    setTouched({ category: false, amount: false, month: false });
  };

  const hasErrors = (validation) => Object.values(validation).some(Boolean);

  const handleAdd = () => {
    const validation = validateFields(form);
    setTouched({ category: true, amount: true, month: true });

    if (hasErrors(validation)) {
      return;
    }

    const amount = Number.parseFloat(form.amount);

    insertBudget(form.month.trim(), [], [
      { name: form.category.trim(), type: DEFAULT_CATEGORY_TYPE, plannedAmount: amount }
    ])
      .then((created) => {
        setBudgets((prev) => (prev.length ? [created, ...prev] : [created]));
        resetForm();
      })
      .catch((error) => {
        console.error('Failed to add budget', error);
      });
  };

  const startEdit = (budget) => {
    const primaryCategory = budget.categories[0];
    setEditingId(budget.id);
    setEditFields({
      category: primaryCategory?.name ?? '',
      amount: primaryCategory ? String(primaryCategory.plannedAmount) : '',
      month: budget.month
    });
    setEditTouched({ category: false, amount: false, month: false });
  };

  const saveEdit = () => {
    if (editingId == null) return;
    const validation = validateFields(editFields);
    setEditTouched({ category: true, amount: true, month: true });

    if (hasErrors(validation)) return;

    const amount = Number.parseFloat(editFields.amount);

    updateBudget(editingId, {
      month: editFields.month.trim(),
      categories: [{ name: editFields.category.trim(), type: DEFAULT_CATEGORY_TYPE, plannedAmount: amount }]
    })
      .then((updated) => {
        if (!updated) return;
        setBudgets((prev) => prev.map((entry) => (entry.id === editingId ? updated : entry)));
        setEditingId(null);
      })
      .catch((error) => {
        console.error('Failed to update budget', error);
      });
  };

  const removeBudget = (id) => {
    const target = budgets.find((entry) => entry.id === id);
    const categoryName = target?.categories?.[0]?.name ?? '';
    const confirmed = window.confirm(t('budget.confirmDelete', { category: categoryName }));
    if (!confirmed) return;

    deleteBudget(id)
      .then((deleted) => {
        if (deleted) {
          setBudgets((prev) => prev.filter((entry) => entry.id !== id));
          if (editingId === id) {
            setEditingId(null);
          }
        }
      })
      .catch((error) => {
        console.error('Failed to delete budget', error);
      });
  };

  const renderBudgetRow = (budget) => {
    if (editingId === budget.id) {
      return (
        <li
          key={budget.id}
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.shape.radiusSm,
            padding: `${theme.spacing.md}px`,
            marginBottom: `${theme.spacing.md}px`,
            backgroundColor: theme.colors.surface,
          }}
        >
          <div style={{ display: 'grid', gap: `${theme.spacing.sm}px` }}>
            <label>
              {t('categoryLabel') || 'Category'}
              <input
                type="text"
                value={editFields.category}
                onChange={(e) => {
                  setEditFields((prev) => ({ ...prev, category: e.target.value }));
                  setEditTouched((prev) => ({ ...prev, category: true }));
                }}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.shape.radiusSm,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  fontFamily: theme.typography.body.family,
                }}
              />
              {editTouched.category && editValidation.category ? (
                <span style={{ color: theme.colors.accent }}>{editValidation.category}</span>
              ) : null}
            </label>
            <label>
              {t('amountLabel') || 'Amount'}
              <input
                type="number"
                value={editFields.amount}
                onChange={(e) => {
                  setEditFields((prev) => ({ ...prev, amount: e.target.value }));
                  setEditTouched((prev) => ({ ...prev, amount: true }));
                }}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.shape.radiusSm,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  fontFamily: theme.typography.body.family,
                }}
              />
              {editTouched.amount && editValidation.amount ? (
                <span style={{ color: theme.colors.accent }}>{editValidation.amount}</span>
              ) : null}
            </label>
            <label>
              {t('periodLabel') || 'Period'}
              <input
                type="text"
                value={editFields.month}
                onChange={(e) => {
                  setEditFields((prev) => ({ ...prev, month: e.target.value }));
                  setEditTouched((prev) => ({ ...prev, month: true }));
                }}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.shape.radiusSm,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  fontFamily: theme.typography.body.family,
                }}
              />
              {editTouched.month && editValidation.month ? (
                <span style={{ color: theme.colors.accent }}>{editValidation.month}</span>
              ) : null}
            </label>
            <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={saveEdit}
                style={{
                  padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
                  borderRadius: theme.shape.radiusSm,
                  border: `1px solid ${theme.colors.primary}`,
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.background,
                  cursor: 'pointer',
                  fontFamily: theme.typography.body.family,
                }}
              >
                {t('saveLabel') || 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
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
                {t('cancelLabel') || 'Cancel'}
              </button>
            </div>
          </div>
        </li>
      );
    }

    return (
      <li
        key={budget.id}
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
            <div style={{ fontWeight: 'bold' }}>{budget.categories[0]?.name ?? ''}</div>
            <div>{budget.month}</div>
            {budget.categories[0] ? (
              <div>
                {budget.categories[0].plannedAmount} · {budget.categories[0].type}
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: `${theme.spacing.sm}px`, alignItems: 'flex-start' }}>
            <button
              type="button"
              onClick={() => startEdit(budget)}
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
              {t('editLabel') || 'Edit'}
            </button>
            <button
              type="button"
              onClick={() => removeBudget(budget.id)}
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
    );
  };

  return (
    <SectionCard
      ariaLabel={`${t('budget.title')} module`}
      title={t('budget.title')}
      subtitle={`${t('budget.placeholder')} ${t('budget.debtSnowball')}`}
    >
      <div style={{ display: 'grid', gap: `${theme.spacing.sm}px`, marginBottom: `${theme.spacing.md}px` }}>
        <label>
          {t('categoryLabel') || 'Category'}
          <input
            type="text"
            value={form.category}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, category: e.target.value }));
              setTouched((prev) => ({ ...prev, category: true }));
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
          {touched.category && addValidation.category ? (
            <span style={{ color: theme.colors.accent }}>{addValidation.category}</span>
          ) : null}
        </label>
        <label>
          {t('amountLabel') || 'Amount'}
          <input
            type="number"
            value={form.amount}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, amount: e.target.value }));
              setTouched((prev) => ({ ...prev, amount: true }));
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
          {touched.amount && addValidation.amount ? (
            <span style={{ color: theme.colors.accent }}>{addValidation.amount}</span>
          ) : null}
        </label>
        <label>
          {t('periodLabel') || 'Period'}
          <input
            type="text"
            value={form.month}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, month: e.target.value }));
              setTouched((prev) => ({ ...prev, month: true }));
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
          {touched.month && addValidation.month ? (
            <span style={{ color: theme.colors.accent }}>{addValidation.month}</span>
          ) : null}
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
          {t('addBudget') || 'Add budget item'}
        </button>
      </div>

      {loading ? (
        <p>{t('loading') || 'Loading budgets…'}</p>
      ) : budgets.length === 0 ? (
        <p>{t('emptyBudget') || 'No budget items yet.'}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>{budgets.map(renderBudgetRow)}</ul>
      )}
    </SectionCard>
  );
};

export default BudgetView;
