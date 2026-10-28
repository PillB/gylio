export type BillSource = {
  id: string | number;
  name: string;
  /** Day of month the payment is due, 1-31. */
  dueDay: number;
  minPayment: number;
};
export type BillTaskDraft = {
  billId: string | number;
  name: string;
  dueDate: string; // YYYY-MM-DD, local
  remindDate: string;
  nextActionKey: 'billTask.nextAction';
};

const pad = (n: number): string => String(n).padStart(2, '0');
const key = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Due day clamped to the month's length, so day 31 lands on Feb 28/29 instead of rolling into March. */
const dueIn = (year: number, month: number, dueDay: number): Date => {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(dueDay, last));
};

/**
 * Turn bills due within `leadDays` into task drafts with an explicit next action. Drafts only:
 * the caller shows them for the user to accept; nothing is created or paid automatically.
 */
export const billTaskDrafts = (bills: BillSource[], today: Date, leadDays = 7): BillTaskDraft[] => {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const drafts: BillTaskDraft[] = [];
  for (const bill of bills) {
    if (!Number.isInteger(bill.dueDay) || bill.dueDay < 1 || bill.dueDay > 31) continue;
    for (const offset of [0, 1]) {
      const due = dueIn(start.getFullYear(), start.getMonth() + offset, bill.dueDay);
      const days = Math.round((due.getTime() - start.getTime()) / 86_400_000);
      if (days < 0 || days > leadDays) continue;
      const remind = new Date(due.getFullYear(), due.getMonth(), due.getDate() - Math.min(2, days));
      drafts.push({ billId: bill.id, name: bill.name, dueDate: key(due), remindDate: key(remind), nextActionKey: 'billTask.nextAction' });
      break;
    }
  }
  return drafts.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
};
