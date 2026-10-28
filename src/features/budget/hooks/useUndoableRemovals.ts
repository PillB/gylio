import { useTranslation } from 'react-i18next';
import { useToast } from '../../../core/context/ToastContext';
import type { Debt, Transaction } from '../../../core/hooks/useDB';
import { UNDO_WINDOW_MS } from '../../tasks/hooks/useDeferredDelete';
import type { BudgetData } from './useBudgetData';

/**
 * Budget deletes take one tap, so each one offers Undo for a few seconds, as task deletes do.
 * Undo puts the line back where it was (income and categories) or saves it again (expenses and debts).
 */
export const useUndoableRemovals = (data: BudgetData) => {
  const { t } = useTranslation();
  const { success } = useToast();

  const offerUndo = (name: string, undo: () => Promise<boolean>) =>
    success(t('budget.removed', { name }), { label: t('budget.undoRemove'), onClick: () => void undo() }, UNDO_WINDOW_MS);

  const removeIncome = async (index: number) => {
    const budget = data.activeBudget;
    const entry = budget?.income[index];
    if (!budget || !entry || !(await data.removeIncome(index))) return;
    offerUndo(entry.source, () => data.restoreIncome(budget.id, index, entry));
  };

  const removeCategory = async (index: number) => {
    const budget = data.activeBudget;
    const entry = budget?.categories[index];
    if (!budget || !entry || !(await data.removeCategory(index))) return;
    offerUndo(entry.name, () => data.restoreCategory(budget.id, index, entry));
  };

  const removeTransaction = async (id: number) => {
    const entry = data.transactions.find((item: Transaction) => item.id === id);
    if (!entry || !(await data.removeTransaction(id))) return;
    offerUndo(entry.note?.trim() || entry.categoryName, () => data.restoreTransaction(entry));
  };

  const removeDebt = async (id: number) => {
    const entry = data.debts.find((item: Debt) => item.id === id);
    if (!entry || !(await data.removeDebt(id))) return;
    offerUndo(entry.name, () => data.restoreDebt(entry));
  };

  return { removeIncome, removeCategory, removeTransaction, removeDebt };
};
