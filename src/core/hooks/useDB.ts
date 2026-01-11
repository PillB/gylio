import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SQLResultSetRowList, SQLTransaction } from 'expo-sqlite';
import { initializeDatabase, type Database } from '../db';

export type Subtask = {
  label: string;
  done: boolean;
};

export type Task = {
  id: number;
  title: string;
  status: string;
  subtasks: Subtask[];
  plannedDate: string | null;
  calendarEventId: number | null;
  focusPresetMinutes: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type Event = {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  taskId: number | null;
  reminderMinutesBefore: number | null;
  createdAt: string | null;
};

export type BudgetIncome = {
  source: string;
  amount: number;
};

export type BudgetCategory = {
  name: string;
  type: 'NEED' | 'WANT' | 'GOAL' | 'DEBT';
  plannedAmount: number;
};

export type Budget = {
  id: number;
  month: string;
  income: BudgetIncome[];
  categories: BudgetCategory[];
  createdAt: string | null;
};

export type Transaction = {
  id: number;
  budgetMonth: string;
  amount: number;
  categoryName: string;
  isNeed: boolean;
  date: string;
  note: string | null;
  createdAt: string | null;
};

export type Debt = {
  id: number;
  name: string;
  balance: number;
  annualRate: number;
  minPayment: number;
  categoryName: string | null;
  createdAt: string | null;
};

export type SocialStep = {
  label: string;
  done: boolean;
};

export type SocialPlan = {
  id: number;
  title: string;
  type: 'CALL' | 'MEETUP' | 'MESSAGE' | 'EVENT';
  dateTime: string | null;
  steps: SocialStep[];
  reminderMinutesBefore: number | null;
  energyLevel: 'LOW' | 'MED' | 'HIGH';
  notes: string | null;
  createdAt: string | null;
};

export type Reward = {
  id: number;
  title: string;
  pointsRequired: number;
  description: string | null;
  redeemed: boolean;
  createdAt: string | null;
};

export type RewardsProgress = {
  id: number;
  points: number;
  level: number;
  focusStreakDays: number;
  lastFocusDate: string | null;
  taskStreakDays: number;
  lastTaskCompletionDate: string | null;
  skipTokens: number;
};

type StatementSet = {
  insertTask: string;
  updateTask: string;
  deleteTask: string;
  selectTaskById: string;
  selectTasks: string;
  insertEvent: string;
  updateEvent: string;
  deleteEvent: string;
  selectEventById: string;
  selectEvents: string;
  insertBudget: string;
  updateBudget: string;
  deleteBudget: string;
  selectBudgetById: string;
  selectBudgets: string;
  insertTransaction: string;
  updateTransaction: string;
  deleteTransaction: string;
  selectTransactionById: string;
  selectTransactions: string;
  insertDebt: string;
  updateDebt: string;
  deleteDebt: string;
  selectDebtById: string;
  selectDebts: string;
  insertSocialPlan: string;
  updateSocialPlan: string;
  deleteSocialPlan: string;
  selectSocialPlanById: string;
  selectSocialPlans: string;
  insertReward: string;
  updateReward: string;
  deleteReward: string;
  selectRewardById: string;
  selectRewards: string;
  insertRewardsProgress: string;
  updateRewardsProgress: string;
  selectRewardsProgress: string;
};

const mapRows = <T>(rows: SQLResultSetRowList, transformer: (row: any) => T): T[] => {
  const items: T[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    items.push(transformer(rows.item(i)));
  }
  return items;
};

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return (parsed ?? fallback) as T;
    } catch (error) {
      return fallback;
    }
  }
  return fallback;
};

const normalizeSubtasks = (value: unknown): Subtask[] => {
  const parsed = parseJson<unknown[]>(value, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry) => {
      if (typeof entry === 'string') {
        return { label: entry, done: false };
      }
      if (entry && typeof entry === 'object') {
        const label = 'label' in entry ? String((entry as { label?: unknown }).label ?? '') : '';
        if (!label) return null;
        const done = 'done' in entry ? Boolean((entry as { done?: unknown }).done) : false;
        return { label, done };
      }
      return null;
    })
    .filter((entry): entry is Subtask => Boolean(entry));
};

const normalizeSocialSteps = (value: unknown): SocialStep[] => {
  const parsed = parseJson<unknown[]>(value, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry) => {
      if (typeof entry === 'string') {
        return { label: entry, done: false };
      }
      if (entry && typeof entry === 'object') {
        const label = 'label' in entry ? String((entry as { label?: unknown }).label ?? '') : '';
        if (!label) return null;
        const done = 'done' in entry ? Boolean((entry as { done?: unknown }).done) : false;
        return { label, done };
      }
      return null;
    })
    .filter((entry): entry is SocialStep => Boolean(entry));
};

const normalizeIncome = (value: unknown): BudgetIncome[] => {
  const parsed = parseJson<unknown[]>(value, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const source = 'source' in entry ? String((entry as { source?: unknown }).source ?? '') : '';
      const amountValue = 'amount' in entry ? Number((entry as { amount?: unknown }).amount) : Number.NaN;
      if (!source || Number.isNaN(amountValue)) return null;
      return { source, amount: amountValue };
    })
    .filter((entry): entry is BudgetIncome => Boolean(entry));
};

const normalizeCategories = (value: unknown): BudgetCategory[] => {
  const parsed = parseJson<unknown[]>(value, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const name = 'name' in entry ? String((entry as { name?: unknown }).name ?? '') : '';
      const plannedAmount = 'plannedAmount' in entry ? Number((entry as { plannedAmount?: unknown }).plannedAmount) : Number.NaN;
      if (!name || Number.isNaN(plannedAmount)) return null;
      const rawType = 'type' in entry ? String((entry as { type?: unknown }).type ?? '') : '';
      const type = (['NEED', 'WANT', 'GOAL', 'DEBT'] as const).includes(rawType as BudgetCategory['type'])
        ? (rawType as BudgetCategory['type'])
        : 'NEED';
      return { name, type, plannedAmount };
    })
    .filter((entry): entry is BudgetCategory => Boolean(entry));
};

const mapTask = (row: any): Task => ({
  id: row.id,
  title: row.title,
  status: row.status,
  subtasks: normalizeSubtasks(row.subtasks),
  plannedDate: row.plannedDate ?? null,
  calendarEventId: row.calendarEventId !== undefined && row.calendarEventId !== null ? Number(row.calendarEventId) : null,
  focusPresetMinutes:
    row.focusPresetMinutes !== undefined && row.focusPresetMinutes !== null ? Number(row.focusPresetMinutes) : null,
  createdAt: row.createdAt ?? null,
  updatedAt: row.updatedAt ?? null,
});

const mapEvent = (row: any): Event => ({
  id: row.id,
  title: row.title,
  description: row.description ?? null,
  startDate: row.startDate,
  endDate: row.endDate ?? null,
  location: row.location ?? null,
  taskId: row.taskId !== undefined && row.taskId !== null ? Number(row.taskId) : null,
  reminderMinutesBefore:
    row.reminderMinutesBefore !== undefined && row.reminderMinutesBefore !== null
      ? Number(row.reminderMinutesBefore)
      : null,
  createdAt: row.createdAt ?? null,
});

const mapBudget = (row: any): Budget => ({
  id: row.id,
  month: row.month ?? '',
  income: normalizeIncome(row.income),
  categories: normalizeCategories(row.categories),
  createdAt: row.createdAt ?? null,
});

const mapTransaction = (row: any): Transaction => ({
  id: row.id,
  budgetMonth: row.budgetMonth,
  amount: Number(row.amount),
  categoryName: row.categoryName,
  isNeed: row.isNeed === 1,
  date: row.date,
  note: row.note ?? null,
  createdAt: row.createdAt ?? null,
});

const mapDebt = (row: any): Debt => ({
  id: row.id,
  name: row.name,
  balance: Number(row.balance),
  annualRate: Number(row.annualRate),
  minPayment: Number(row.minPayment),
  categoryName: row.categoryName ?? null,
  createdAt: row.createdAt ?? null,
});

const mapSocialPlan = (row: any): SocialPlan => ({
  id: row.id,
  title: row.title,
  type: row.type,
  dateTime: row.dateTime ?? null,
  steps: normalizeSocialSteps(row.steps),
  reminderMinutesBefore:
    row.reminderMinutesBefore !== undefined && row.reminderMinutesBefore !== null
      ? Number(row.reminderMinutesBefore)
      : null,
  energyLevel: row.energyLevel ?? 'LOW',
  notes: row.notes ?? null,
  createdAt: row.createdAt ?? null,
});

const mapReward = (row: any): Reward => ({
  id: row.id,
  title: row.title,
  pointsRequired: row.pointsRequired,
  description: row.description ?? null,
  redeemed: row.redeemed === 1,
  createdAt: row.createdAt ?? null,
});

const mapRewardsProgress = (row: any): RewardsProgress => ({
  id: row.id,
  points: Number(row.points ?? 0),
  level: Number(row.level ?? 1),
  focusStreakDays: Number(row.focusStreakDays ?? 0),
  lastFocusDate: row.lastFocusDate ?? null,
  taskStreakDays: Number(row.taskStreakDays ?? 0),
  lastTaskCompletionDate: row.lastTaskCompletionDate ?? null,
  skipTokens: Number(row.skipTokens ?? 0),
});

const useDB = () => {
  const [db, setDb] = useState<Database | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    initializeDatabase()
      .then((database) => {
        if (isMounted) {
          setDb(database);
          setReady(true);
        }
      })
      .catch((error) => {
        console.error('Database initialization failed', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const statements = useMemo<StatementSet>(
    () => ({
      insertTask:
        'INSERT INTO tasks (title, status, subtasks, plannedDate, calendarEventId, focusPresetMinutes) VALUES (?, ?, ?, ?, ?, ?);',
      updateTask:
        'UPDATE tasks SET title = ?, status = ?, subtasks = ?, plannedDate = ?, calendarEventId = ?, focusPresetMinutes = ?, updatedAt = ? WHERE id = ?;',
      deleteTask: 'DELETE FROM tasks WHERE id = ?;',
      selectTaskById: 'SELECT * FROM tasks WHERE id = ?;',
      selectTasks: 'SELECT * FROM tasks ORDER BY createdAt DESC;',
      insertEvent:
        'INSERT INTO events (title, description, startDate, endDate, location, taskId, reminderMinutesBefore) VALUES (?, ?, ?, ?, ?, ?, ?);',
      updateEvent:
        'UPDATE events SET title = ?, description = ?, startDate = ?, endDate = ?, location = ?, taskId = ?, reminderMinutesBefore = ? WHERE id = ?;',
      deleteEvent: 'DELETE FROM events WHERE id = ?;',
      selectEventById: 'SELECT * FROM events WHERE id = ?;',
      selectEvents: 'SELECT * FROM events ORDER BY createdAt DESC;',
      insertBudget: 'INSERT INTO budgets (month, income, categories) VALUES (?, ?, ?);',
      updateBudget: 'UPDATE budgets SET month = ?, income = ?, categories = ? WHERE id = ?;',
      deleteBudget: 'DELETE FROM budgets WHERE id = ?;',
      selectBudgetById: 'SELECT * FROM budgets WHERE id = ?;',
      selectBudgets: 'SELECT * FROM budgets ORDER BY createdAt DESC;',
      insertTransaction:
        'INSERT INTO transactions (budgetMonth, amount, categoryName, isNeed, date, note) VALUES (?, ?, ?, ?, ?, ?);',
      updateTransaction:
        'UPDATE transactions SET budgetMonth = ?, amount = ?, categoryName = ?, isNeed = ?, date = ?, note = ? WHERE id = ?;',
      deleteTransaction: 'DELETE FROM transactions WHERE id = ?;',
      selectTransactionById: 'SELECT * FROM transactions WHERE id = ?;',
      selectTransactions: 'SELECT * FROM transactions ORDER BY createdAt DESC;',
      insertDebt: 'INSERT INTO debts (name, balance, annualRate, minPayment, categoryName) VALUES (?, ?, ?, ?, ?);',
      updateDebt: 'UPDATE debts SET name = ?, balance = ?, annualRate = ?, minPayment = ?, categoryName = ? WHERE id = ?;',
      deleteDebt: 'DELETE FROM debts WHERE id = ?;',
      selectDebtById: 'SELECT * FROM debts WHERE id = ?;',
      selectDebts: 'SELECT * FROM debts ORDER BY createdAt DESC;',
      insertSocialPlan:
        'INSERT INTO social_plans (title, type, dateTime, steps, reminderMinutesBefore, energyLevel, notes) VALUES (?, ?, ?, ?, ?, ?, ?);',
      updateSocialPlan:
        'UPDATE social_plans SET title = ?, type = ?, dateTime = ?, steps = ?, reminderMinutesBefore = ?, energyLevel = ?, notes = ? WHERE id = ?;',
      deleteSocialPlan: 'DELETE FROM social_plans WHERE id = ?;',
      selectSocialPlanById: 'SELECT * FROM social_plans WHERE id = ?;',
      selectSocialPlans: 'SELECT * FROM social_plans ORDER BY createdAt DESC;',
      insertReward: 'INSERT INTO rewards (title, pointsRequired, description, redeemed) VALUES (?, ?, ?, ?);',
      updateReward: 'UPDATE rewards SET title = ?, pointsRequired = ?, description = ?, redeemed = ? WHERE id = ?;',
      deleteReward: 'DELETE FROM rewards WHERE id = ?;',
      selectRewardById: 'SELECT * FROM rewards WHERE id = ?;',
      selectRewards: 'SELECT * FROM rewards ORDER BY createdAt DESC;',
      insertRewardsProgress:
        'INSERT OR IGNORE INTO rewards_progress (id, points, level, focusStreakDays, lastFocusDate, taskStreakDays, lastTaskCompletionDate, skipTokens) VALUES (1, 0, 1, 0, NULL, 0, NULL, 0);',
      updateRewardsProgress:
        'UPDATE rewards_progress SET points = ?, level = ?, focusStreakDays = ?, lastFocusDate = ?, taskStreakDays = ?, lastTaskCompletionDate = ?, skipTokens = ? WHERE id = 1;',
      selectRewardsProgress: 'SELECT * FROM rewards_progress WHERE id = ?;',
    }),
    []
  );

  const runTransaction = useCallback(
    <T>(operation: (tx: SQLTransaction, resolve: (value: T) => void, reject: (reason?: any) => void) => void) =>
      new Promise<T>((resolve, reject) => {
        if (!db) {
          reject(new Error('Database not initialized'));
          return;
        }

        db.transaction(
          (tx) => operation(tx, resolve, reject),
          (error) => reject(error)
        );
      }),
    [db]
  );

  const selectSingle = useCallback(
    <T>(tx: SQLTransaction, sql: string, params: any[], mapper: (row: any) => T, resolve: (value: T | null) => void, reject: (reason?: any) => void) => {
      tx.executeSql(
        sql,
        params,
        (_, result) => {
          resolve(result.rows.length ? mapper(result.rows.item(0)) : null);
          return true;
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    },
    []
  );

  const getTasks = useCallback(
    () =>
      runTransaction<Task[]>((tx, resolve, reject) => {
        tx.executeSql(
          statements.selectTasks,
          [],
          (_, result) => {
            resolve(mapRows(result.rows, mapTask));
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, statements.selectTasks]
  );

  const getTaskById = useCallback(
    (id: number) =>
      runTransaction<Task | null>((tx, resolve, reject) => {
        selectSingle(tx, statements.selectTaskById, [id], mapTask, resolve, reject);
      }),
    [runTransaction, selectSingle, statements.selectTaskById]
  );

  const insertTask = useCallback(
    (
      title: string,
      status: string,
      subtasks: Subtask[] = [],
      plannedDate: string | null = null,
      calendarEventId: number | null = null,
      focusPresetMinutes: number | null = null
    ) =>
      runTransaction<Task>((tx, resolve, reject) => {
        tx.executeSql(
          statements.insertTask,
          [
            title,
            status,
            JSON.stringify(subtasks),
            plannedDate,
            calendarEventId,
            focusPresetMinutes,
          ],
          (_, result) => {
            const insertId = result.insertId;
            if (insertId == null) {
              reject(new Error('Task insert failed'));
              return false;
            }
            selectSingle(tx, statements.selectTaskById, [insertId], mapTask, resolve, reject);
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, selectSingle, statements.insertTask, statements.selectTaskById]
  );

  const updateTask = useCallback(
    (id: number, updates: Partial<Omit<Task, 'id'>>) =>
      runTransaction<Task | null>((tx, resolve, reject) => {
        selectSingle(tx, statements.selectTaskById, [id], mapTask, (current) => {
          if (!current) {
            resolve(null);
            return;
          }
          const next: Task = {
            ...current,
            ...updates,
            subtasks: updates.subtasks ?? current.subtasks,
            plannedDate: updates.plannedDate ?? current.plannedDate,
            calendarEventId: updates.calendarEventId ?? current.calendarEventId,
            focusPresetMinutes: updates.focusPresetMinutes ?? current.focusPresetMinutes,
            updatedAt: new Date().toISOString(),
          };
          tx.executeSql(
            statements.updateTask,
            [
              next.title,
              next.status,
              JSON.stringify(next.subtasks),
              next.plannedDate,
              next.calendarEventId,
              next.focusPresetMinutes,
              next.updatedAt,
              id,
            ],
            () => {
              resolve(next);
              return true;
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        }, reject);
      }),
    [runTransaction, selectSingle, statements.selectTaskById, statements.updateTask]
  );

  const deleteTask = useCallback(
    (id: number) =>
      runTransaction<boolean>((tx, resolve, reject) => {
        tx.executeSql(
          statements.deleteTask,
          [id],
          (_, result) => {
            resolve(result.rowsAffected > 0);
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, statements.deleteTask]
  );

  const getEvents = useCallback(
    () =>
      runTransaction<Event[]>((tx, resolve, reject) => {
        tx.executeSql(
          statements.selectEvents,
          [],
          (_, result) => {
            resolve(mapRows(result.rows, mapEvent));
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, statements.selectEvents]
  );

  const getEventById = useCallback(
    (id: number) =>
      runTransaction<Event | null>((tx, resolve, reject) => {
        selectSingle(tx, statements.selectEventById, [id], mapEvent, resolve, reject);
      }),
    [runTransaction, selectSingle, statements.selectEventById]
  );

  const insertEvent = useCallback(
    (
      title: string,
      description: string | null,
      startDate: string,
      endDate: string | null = null,
      location: string | null = null,
      taskId: number | null = null,
      reminderMinutesBefore: number | null = null
    ) =>
      runTransaction<Event>((tx, resolve, reject) => {
        tx.executeSql(
          statements.insertEvent,
          [title, description, startDate, endDate, location, taskId, reminderMinutesBefore],
          (_, result) => {
            const insertId = result.insertId;
            if (insertId == null) {
              reject(new Error('Event insert failed'));
              return false;
            }
            selectSingle(tx, statements.selectEventById, [insertId], mapEvent, resolve, reject);
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, selectSingle, statements.insertEvent, statements.selectEventById]
  );

  const updateEvent = useCallback(
    (id: number, updates: Partial<Omit<Event, 'id'>>) =>
      runTransaction<Event | null>((tx, resolve, reject) => {
        selectSingle(tx, statements.selectEventById, [id], mapEvent, (current) => {
          if (!current) {
            resolve(null);
            return;
          }
          const next: Event = {
            ...current,
            ...updates,
            description: updates.description ?? current.description,
            endDate: updates.endDate ?? current.endDate,
            location: updates.location ?? current.location,
            taskId: updates.taskId ?? current.taskId,
            reminderMinutesBefore: updates.reminderMinutesBefore ?? current.reminderMinutesBefore,
          };
          tx.executeSql(
            statements.updateEvent,
            [
              next.title,
              next.description,
              next.startDate,
              next.endDate,
              next.location,
              next.taskId,
              next.reminderMinutesBefore,
              id,
            ],
            () => {
              resolve(next);
              return true;
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        }, reject);
      }),
    [runTransaction, selectSingle, statements.selectEventById, statements.updateEvent]
  );

  const deleteEvent = useCallback(
    (id: number) =>
      runTransaction<boolean>((tx, resolve, reject) => {
        tx.executeSql(
          statements.deleteEvent,
          [id],
          (_, result) => {
            resolve(result.rowsAffected > 0);
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, statements.deleteEvent]
  );

  const getBudgets = useCallback(
    () =>
      runTransaction<Budget[]>((tx, resolve, reject) => {
        tx.executeSql(
          statements.selectBudgets,
          [],
          (_, result) => {
            resolve(mapRows(result.rows, mapBudget));
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, statements.selectBudgets]
  );

  const getBudgetById = useCallback(
    (id: number) =>
      runTransaction<Budget | null>((tx, resolve, reject) => {
        selectSingle(tx, statements.selectBudgetById, [id], mapBudget, resolve, reject);
      }),
    [runTransaction, selectSingle, statements.selectBudgetById]
  );

  const insertBudget = useCallback(
    (month: string, income: BudgetIncome[], categories: BudgetCategory[]) =>
      runTransaction<Budget>((tx, resolve, reject) => {
        tx.executeSql(
          statements.insertBudget,
          [month, JSON.stringify(income), JSON.stringify(categories)],
          (_, result) => {
            const insertId = result.insertId;
            if (insertId == null) {
              reject(new Error('Budget insert failed'));
              return false;
            }
            selectSingle(tx, statements.selectBudgetById, [insertId], mapBudget, resolve, reject);
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, selectSingle, statements.insertBudget, statements.selectBudgetById]
  );

  const updateBudget = useCallback(
    (id: number, updates: Partial<Omit<Budget, 'id'>>) =>
      runTransaction<Budget | null>((tx, resolve, reject) => {
        selectSingle(tx, statements.selectBudgetById, [id], mapBudget, (current) => {
          if (!current) {
            resolve(null);
            return;
          }
          const next: Budget = {
            ...current,
            ...updates,
            income: updates.income ?? current.income,
            categories: updates.categories ?? current.categories,
          };
          tx.executeSql(
            statements.updateBudget,
            [next.month, JSON.stringify(next.income), JSON.stringify(next.categories), id],
            () => {
              resolve(next);
              return true;
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        }, reject);
      }),
    [runTransaction, selectSingle, statements.selectBudgetById, statements.updateBudget]
  );

  const deleteBudget = useCallback(
    (id: number) =>
      runTransaction<boolean>((tx, resolve, reject) => {
        tx.executeSql(
          statements.deleteBudget,
          [id],
          (_, result) => {
            resolve(result.rowsAffected > 0);
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, statements.deleteBudget]
  );

  const getTransactions = useCallback(
    () =>
      runTransaction<Transaction[]>((tx, resolve, reject) => {
        tx.executeSql(
          statements.selectTransactions,
          [],
          (_, result) => {
            resolve(mapRows(result.rows, mapTransaction));
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, statements.selectTransactions]
  );

  const getTransactionById = useCallback(
    (id: number) =>
      runTransaction<Transaction | null>((tx, resolve, reject) => {
        selectSingle(tx, statements.selectTransactionById, [id], mapTransaction, resolve, reject);
      }),
    [runTransaction, selectSingle, statements.selectTransactionById]
  );

  const insertTransaction = useCallback(
    (budgetMonth: string, amount: number, categoryName: string, isNeed: boolean, date: string, note: string | null = null) =>
      runTransaction<Transaction>((tx, resolve, reject) => {
        tx.executeSql(
          statements.insertTransaction,
          [budgetMonth, amount, categoryName, isNeed ? 1 : 0, date, note],
          (_, result) => {
            const insertId = result.insertId;
            if (insertId == null) {
              reject(new Error('Transaction insert failed'));
              return false;
            }
            selectSingle(tx, statements.selectTransactionById, [insertId], mapTransaction, resolve, reject);
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, selectSingle, statements.insertTransaction, statements.selectTransactionById]
  );

  const updateTransaction = useCallback(
    (id: number, updates: Partial<Omit<Transaction, 'id'>>) =>
      runTransaction<Transaction | null>((tx, resolve, reject) => {
        selectSingle(tx, statements.selectTransactionById, [id], mapTransaction, (current) => {
          if (!current) {
            resolve(null);
            return;
          }
          const next: Transaction = {
            ...current,
            ...updates,
            note: updates.note ?? current.note,
          };
          tx.executeSql(
            statements.updateTransaction,
            [next.budgetMonth, next.amount, next.categoryName, next.isNeed ? 1 : 0, next.date, next.note, id],
            () => {
              resolve(next);
              return true;
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        }, reject);
      }),
    [runTransaction, selectSingle, statements.selectTransactionById, statements.updateTransaction]
  );

  const deleteTransaction = useCallback(
    (id: number) =>
      runTransaction<boolean>((tx, resolve, reject) => {
        tx.executeSql(
          statements.deleteTransaction,
          [id],
          (_, result) => {
            resolve(result.rowsAffected > 0);
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, statements.deleteTransaction]
  );

  const getDebts = useCallback(
    () =>
      runTransaction<Debt[]>((tx, resolve, reject) => {
        tx.executeSql(
          statements.selectDebts,
          [],
          (_, result) => {
            resolve(mapRows(result.rows, mapDebt));
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, statements.selectDebts]
  );

  const getDebtById = useCallback(
    (id: number) =>
      runTransaction<Debt | null>((tx, resolve, reject) => {
        selectSingle(tx, statements.selectDebtById, [id], mapDebt, resolve, reject);
      }),
    [runTransaction, selectSingle, statements.selectDebtById]
  );

  const insertDebt = useCallback(
    (name: string, balance: number, annualRate: number, minPayment: number, categoryName: string | null = null) =>
      runTransaction<Debt>((tx, resolve, reject) => {
        tx.executeSql(
          statements.insertDebt,
          [name, balance, annualRate, minPayment, categoryName],
          (_, result) => {
            const insertId = result.insertId;
            if (insertId == null) {
              reject(new Error('Debt insert failed'));
              return false;
            }
            selectSingle(tx, statements.selectDebtById, [insertId], mapDebt, resolve, reject);
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, selectSingle, statements.insertDebt, statements.selectDebtById]
  );

  const updateDebt = useCallback(
    (id: number, updates: Partial<Omit<Debt, 'id'>>) =>
      runTransaction<Debt | null>((tx, resolve, reject) => {
        selectSingle(tx, statements.selectDebtById, [id], mapDebt, (current) => {
          if (!current) {
            resolve(null);
            return;
          }
          const next: Debt = {
            ...current,
            ...updates,
            categoryName: updates.categoryName ?? current.categoryName,
          };
          tx.executeSql(
            statements.updateDebt,
            [next.name, next.balance, next.annualRate, next.minPayment, next.categoryName, id],
            () => {
              resolve(next);
              return true;
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        }, reject);
      }),
    [runTransaction, selectSingle, statements.selectDebtById, statements.updateDebt]
  );

  const deleteDebt = useCallback(
    (id: number) =>
      runTransaction<boolean>((tx, resolve, reject) => {
        tx.executeSql(
          statements.deleteDebt,
          [id],
          (_, result) => {
            resolve(result.rowsAffected > 0);
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, statements.deleteDebt]
  );

  const getSocialPlans = useCallback(
    () =>
      runTransaction<SocialPlan[]>((tx, resolve, reject) => {
        tx.executeSql(
          statements.selectSocialPlans,
          [],
          (_, result) => {
            resolve(mapRows(result.rows, mapSocialPlan));
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, statements.selectSocialPlans]
  );

  const getSocialPlanById = useCallback(
    (id: number) =>
      runTransaction<SocialPlan | null>((tx, resolve, reject) => {
        selectSingle(tx, statements.selectSocialPlanById, [id], mapSocialPlan, resolve, reject);
      }),
    [runTransaction, selectSingle, statements.selectSocialPlanById]
  );

  const insertSocialPlan = useCallback(
    (
      title: string,
      type: SocialPlan['type'],
      dateTime: string | null = null,
      steps: SocialStep[] = [],
      reminderMinutesBefore: number | null = null,
      energyLevel: SocialPlan['energyLevel'] = 'LOW',
      notes: string | null = null
    ) =>
      runTransaction<SocialPlan>((tx, resolve, reject) => {
        tx.executeSql(
          statements.insertSocialPlan,
          [title, type, dateTime, JSON.stringify(steps), reminderMinutesBefore, energyLevel, notes],
          (_, result) => {
            const insertId = result.insertId;
            if (insertId == null) {
              reject(new Error('Social plan insert failed'));
              return false;
            }
            selectSingle(tx, statements.selectSocialPlanById, [insertId], mapSocialPlan, resolve, reject);
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, selectSingle, statements.insertSocialPlan, statements.selectSocialPlanById]
  );

  const updateSocialPlan = useCallback(
    (id: number, updates: Partial<Omit<SocialPlan, 'id'>>) =>
      runTransaction<SocialPlan | null>((tx, resolve, reject) => {
        selectSingle(tx, statements.selectSocialPlanById, [id], mapSocialPlan, (current) => {
          if (!current) {
            resolve(null);
            return;
          }
          const next: SocialPlan = {
            ...current,
            ...updates,
            steps: updates.steps ?? current.steps,
            dateTime: updates.dateTime ?? current.dateTime,
            reminderMinutesBefore: updates.reminderMinutesBefore ?? current.reminderMinutesBefore,
            energyLevel: updates.energyLevel ?? current.energyLevel,
            notes: updates.notes ?? current.notes,
          };
          tx.executeSql(
            statements.updateSocialPlan,
            [
              next.title,
              next.type,
              next.dateTime,
              JSON.stringify(next.steps),
              next.reminderMinutesBefore,
              next.energyLevel,
              next.notes,
              id,
            ],
            () => {
              resolve(next);
              return true;
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        }, reject);
      }),
    [runTransaction, selectSingle, statements.selectSocialPlanById, statements.updateSocialPlan]
  );

  const deleteSocialPlan = useCallback(
    (id: number) =>
      runTransaction<boolean>((tx, resolve, reject) => {
        tx.executeSql(
          statements.deleteSocialPlan,
          [id],
          (_, result) => {
            resolve(result.rowsAffected > 0);
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, statements.deleteSocialPlan]
  );

  const getRewards = useCallback(
    () =>
      runTransaction<Reward[]>((tx, resolve, reject) => {
        tx.executeSql(
          statements.selectRewards,
          [],
          (_, result) => {
            resolve(mapRows(result.rows, mapReward));
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, statements.selectRewards]
  );

  const getRewardById = useCallback(
    (id: number) =>
      runTransaction<Reward | null>((tx, resolve, reject) => {
        selectSingle(tx, statements.selectRewardById, [id], mapReward, resolve, reject);
      }),
    [runTransaction, selectSingle, statements.selectRewardById]
  );

  const insertReward = useCallback(
    (title: string, pointsRequired: number, description: string | null = null, redeemed = false) =>
      runTransaction<Reward>((tx, resolve, reject) => {
        tx.executeSql(
          statements.insertReward,
          [title, pointsRequired, description, redeemed ? 1 : 0],
          (_, result) => {
            const insertId = result.insertId;
            if (insertId == null) {
              reject(new Error('Reward insert failed'));
              return false;
            }
            selectSingle(tx, statements.selectRewardById, [insertId], mapReward, resolve, reject);
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, selectSingle, statements.insertReward, statements.selectRewardById]
  );

  const updateReward = useCallback(
    (id: number, updates: Partial<Omit<Reward, 'id'>>) =>
      runTransaction<Reward | null>((tx, resolve, reject) => {
        selectSingle(tx, statements.selectRewardById, [id], mapReward, (current) => {
          if (!current) {
            resolve(null);
            return;
          }
          const next: Reward = {
            ...current,
            ...updates,
            description: updates.description ?? current.description,
            redeemed: updates.redeemed ?? current.redeemed,
          };
          tx.executeSql(
            statements.updateReward,
            [next.title, next.pointsRequired, next.description, next.redeemed ? 1 : 0, id],
            () => {
              resolve(next);
              return true;
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        }, reject);
      }),
    [runTransaction, selectSingle, statements.selectRewardById, statements.updateReward]
  );

  const deleteReward = useCallback(
    (id: number) =>
      runTransaction<boolean>((tx, resolve, reject) => {
        tx.executeSql(
          statements.deleteReward,
          [id],
          (_, result) => {
            resolve(result.rowsAffected > 0);
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, statements.deleteReward]
  );

  const getRewardsProgress = useCallback(
    () =>
      runTransaction<RewardsProgress>((tx, resolve, reject) => {
        tx.executeSql(
          statements.insertRewardsProgress,
          [],
          () => {
            selectSingle(tx, statements.selectRewardsProgress, [1], mapRewardsProgress, resolve, reject);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, selectSingle, statements.insertRewardsProgress, statements.selectRewardsProgress]
  );

  const updateRewardsProgress = useCallback(
    (updates: Partial<Omit<RewardsProgress, 'id'>>) =>
      runTransaction<RewardsProgress | null>((tx, resolve, reject) => {
        tx.executeSql(
          statements.insertRewardsProgress,
          [],
          () => {
            selectSingle(tx, statements.selectRewardsProgress, [1], mapRewardsProgress, (current) => {
              if (!current) {
                resolve(null);
                return;
              }
              const next: RewardsProgress = {
                ...current,
                ...updates,
                lastFocusDate: updates.lastFocusDate ?? current.lastFocusDate,
                lastTaskCompletionDate: updates.lastTaskCompletionDate ?? current.lastTaskCompletionDate,
              };
              tx.executeSql(
                statements.updateRewardsProgress,
                [
                  next.points,
                  next.level,
                  next.focusStreakDays,
                  next.lastFocusDate,
                  next.taskStreakDays,
                  next.lastTaskCompletionDate,
                  next.skipTokens,
                ],
                () => {
                  resolve(next);
                  return true;
                },
                (_, error) => {
                  reject(error);
                  return false;
                }
              );
            }, reject);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }),
    [runTransaction, selectSingle, statements.insertRewardsProgress, statements.selectRewardsProgress, statements.updateRewardsProgress]
  );

  return {
    ready,
    insertTask,
    updateTask,
    deleteTask,
    getTasks,
    getTaskById,
    insertEvent,
    updateEvent,
    deleteEvent,
    getEvents,
    getEventById,
    insertBudget,
    updateBudget,
    deleteBudget,
    getBudgets,
    getBudgetById,
    insertTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactions,
    getTransactionById,
    insertDebt,
    updateDebt,
    deleteDebt,
    getDebts,
    getDebtById,
    insertSocialPlan,
    updateSocialPlan,
    deleteSocialPlan,
    getSocialPlans,
    getSocialPlanById,
    insertReward,
    updateReward,
    deleteReward,
    getRewards,
    getRewardById,
    getRewardsProgress,
    updateRewardsProgress,
  } as const;
};

export default useDB;
