import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import type { Debt } from '../../../core/hooks/useDB';
import { billTaskDrafts, type BillTaskDraft } from '../../planning/billTasks';
import { PrimaryButton } from './BudgetControls';

const ADDED_KEY = 'gylio:billTasksAdded';
const LEAD_DAYS = 7;
const draftKey = (draft: BillTaskDraft): string => `${draft.billId}:${draft.dueDate}`;

const readAdded = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(ADDED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
};

const writeAdded = (keys: string[]): void => {
  try {
    localStorage.setItem(ADDED_KEY, JSON.stringify(keys.slice(-100)));
  } catch {
    // not remembered; the person can still see the button state this session
  }
};

type Props = {
  debts: Debt[];
  today?: Date;
  /** Creates the task; resolves true when it was saved. */
  onAddTask: (title: string, firstStep: string, plannedDate: string) => Promise<boolean>;
};

/**
 * Bills due in the next week, each with one button that makes a reminder task whose first step
 * is the next action. Suggestions only: nothing is created until the person presses the button.
 */
const BillRemindersCard: React.FC<Props> = ({ debts, today, onAddTask }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [added, setAdded] = useState<string[]>(readAdded);
  const drafts = useMemo(
    () =>
      billTaskDrafts(
        debts.filter((debt) => debt.dueDay != null).map((debt) => ({ id: debt.id, name: debt.name, dueDay: debt.dueDay as number, minPayment: debt.minPayment })),
        today ?? new Date(),
        LEAD_DAYS,
      ),
    [debts, today],
  );
  if (drafts.length === 0) return null;

  const add = async (draft: BillTaskDraft) => {
    const saved = await onAddTask(
      t('billTask.title', 'Pay {{name}}', { name: draft.name }),
      t('billTask.nextAction', 'Open your bank app and pay {{name}}', { name: draft.name }),
      draft.remindDate,
    );
    if (!saved) return;
    const next = [...added, draftKey(draft)];
    setAdded(next);
    writeAdded(next);
  };

  return (
    <section aria-labelledby="bill-reminders-heading" style={{ display: 'grid', gap: theme.spacing.sm }}>
      <h3 id="bill-reminders-heading" style={{ margin: 0, color: theme.colors.text, fontSize: '1rem' }}>
        {t('billTask.heading', 'Bills coming up')}
      </h3>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: theme.spacing.sm }}>
        {drafts.map((draft) => {
          const done = added.includes(draftKey(draft));
          return (
            <li key={draftKey(draft)} style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center', flexWrap: 'wrap', color: theme.colors.text }}>
              <span>{t('billTask.due', '{{name}} is due {{date}}', { name: draft.name, date: draft.dueDate })}</span>
              {done ? (
                <span role="status">{t('billTask.added', 'Reminder added')}</span>
              ) : (
                <PrimaryButton fitContent onClick={() => add(draft)}>
                  {t('billTask.add', 'Add a reminder task')}
                </PrimaryButton>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default BillRemindersCard;
