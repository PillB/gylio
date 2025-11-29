import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB from '../core/hooks/useDB';
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
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ category: '', amount: '', period: '', notes: '' });
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({ category: '', amount: '', period: '', notes: '' });

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

  const resetForm = () => setForm({ category: '', amount: '', period: '', notes: '' });

  const handleAdd = () => {
    if (!form.category.trim() || !form.period.trim()) return;
    const amount = Number.parseFloat(form.amount);
    if (Number.isNaN(amount)) return;

    insertBudget(form.category.trim(), amount, form.period.trim(), form.notes.trim() || null)
      .then((created) => {
        setBudgets((prev) => (prev.length ? [created, ...prev] : [created]));
        resetForm();
      })
      .catch((error) => {
        console.error('Failed to add budget', error);
      });
  };

  const startEdit = (budget) => {
    setEditingId(budget.id);
    setEditFields({
      category: budget.category,
      amount: String(budget.amount),
      period: budget.period,
      notes: budget.notes ?? ''
    });
  };

  const saveEdit = () => {
    if (editingId == null) return;
    const amount = Number.parseFloat(editFields.amount);
    if (Number.isNaN(amount)) return;

    updateBudget(editingId, {
      category: editFields.category.trim(),
      amount,
      period: editFields.period.trim(),
      notes: editFields.notes.trim() || null
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
          style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.75rem' }}
        >
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <label>
              {t('categoryLabel') || 'Category'}
              <input
                type="text"
                value={editFields.category}
                onChange={(e) => setEditFields((prev) => ({ ...prev, category: e.target.value }))}
                style={{ width: '100%', padding: '0.4rem' }}
              />
            </label>
            <label>
              {t('amountLabel') || 'Amount'}
              <input
                type="number"
                value={editFields.amount}
                onChange={(e) => setEditFields((prev) => ({ ...prev, amount: e.target.value }))}
                style={{ width: '100%', padding: '0.4rem' }}
              />
            </label>
            <label>
              {t('periodLabel') || 'Period'}
              <input
                type="text"
                value={editFields.period}
                onChange={(e) => setEditFields((prev) => ({ ...prev, period: e.target.value }))}
                style={{ width: '100%', padding: '0.4rem' }}
              />
            </label>
            <label>
              {t('notesLabel') || 'Notes'}
              <textarea
                value={editFields.notes}
                onChange={(e) => setEditFields((prev) => ({ ...prev, notes: e.target.value }))}
                style={{ width: '100%', padding: '0.4rem' }}
              />
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={saveEdit} style={{ padding: '0.5rem 0.75rem' }}>
                {t('saveLabel') || 'Save'}
              </button>
              <button type="button" onClick={() => setEditingId(null)} style={{ padding: '0.5rem 0.75rem' }}>
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
        style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.75rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div>
            <div style={{ fontWeight: 'bold' }}>{budget.category}</div>
            <div>{budget.period}</div>
            <div>{budget.amount}</div>
            {budget.notes ? <p style={{ marginTop: '0.25rem' }}>{budget.notes}</p> : null}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <button type="button" onClick={() => startEdit(budget)} style={{ padding: '0.5rem 0.75rem' }}>
              {t('editLabel') || 'Edit'}
            </button>
            <button type="button" onClick={() => removeBudget(budget.id)} style={{ padding: '0.5rem 0.75rem' }}>
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
      <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
        <label>
          {t('categoryLabel') || 'Category'}
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </label>
        <label>
          {t('amountLabel') || 'Amount'}
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </label>
        <label>
          {t('periodLabel') || 'Period'}
          <input
            type="text"
            value={form.period}
            onChange={(e) => setForm((prev) => ({ ...prev, period: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </label>
        <label>
          {t('notesLabel') || 'Notes'}
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </label>
        <button type="button" onClick={handleAdd} style={{ padding: '0.5rem 0.75rem', width: 'fit-content' }}>
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
