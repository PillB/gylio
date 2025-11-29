import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SQLResultSetRowList, SQLTransaction } from 'expo-sqlite';
import { initializeDatabase, type Database } from '../db';

export type Task = {
  id: number;
  title: string;
  status: string;
  description: string | null;
  dueDate: string | null;
  createdAt: string | null;
};

export type Event = {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  createdAt: string | null;
};

export type Budget = {
  id: number;
  category: string;
  amount: number;
  period: string;
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
  insertReward: string;
  updateReward: string;
  deleteReward: string;
  selectRewardById: string;
  selectRewards: string;
};

const mapRows = <T>(rows: SQLResultSetRowList, transformer: (row: any) => T): T[] => {
  const items: T[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    items.push(transformer(rows.item(i)));
  }
  return items;
};

const mapTask = (row: any): Task => ({
  id: row.id,
  title: row.title,
  status: row.status,
  description: row.description ?? null,
  dueDate: row.dueDate ?? null,
  createdAt: row.createdAt ?? null,
});

const mapEvent = (row: any): Event => ({
  id: row.id,
  title: row.title,
  description: row.description ?? null,
  startDate: row.startDate,
  endDate: row.endDate ?? null,
  location: row.location ?? null,
  createdAt: row.createdAt ?? null,
});

const mapBudget = (row: any): Budget => ({
  id: row.id,
  category: row.category,
  amount: row.amount,
  period: row.period,
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
      insertTask: 'INSERT INTO tasks (title, status, description, dueDate) VALUES (?, ?, ?, ?);',
      updateTask: 'UPDATE tasks SET title = ?, status = ?, description = ?, dueDate = ? WHERE id = ?;',
      deleteTask: 'DELETE FROM tasks WHERE id = ?;',
      selectTaskById: 'SELECT * FROM tasks WHERE id = ?;',
      selectTasks: 'SELECT * FROM tasks ORDER BY createdAt DESC;',
      insertEvent: 'INSERT INTO events (title, description, startDate, endDate, location) VALUES (?, ?, ?, ?, ?);',
      updateEvent: 'UPDATE events SET title = ?, description = ?, startDate = ?, endDate = ?, location = ? WHERE id = ?;',
      deleteEvent: 'DELETE FROM events WHERE id = ?;',
      selectEventById: 'SELECT * FROM events WHERE id = ?;',
      selectEvents: 'SELECT * FROM events ORDER BY createdAt DESC;',
      insertBudget: 'INSERT INTO budgets (category, amount, period, notes) VALUES (?, ?, ?, ?);',
      updateBudget: 'UPDATE budgets SET category = ?, amount = ?, period = ?, notes = ? WHERE id = ?;',
      deleteBudget: 'DELETE FROM budgets WHERE id = ?;',
      selectBudgetById: 'SELECT * FROM budgets WHERE id = ?;',
      selectBudgets: 'SELECT * FROM budgets ORDER BY createdAt DESC;',
      insertReward: 'INSERT INTO rewards (title, pointsRequired, description, redeemed) VALUES (?, ?, ?, ?);',
      updateReward: 'UPDATE rewards SET title = ?, pointsRequired = ?, description = ?, redeemed = ? WHERE id = ?;',
      deleteReward: 'DELETE FROM rewards WHERE id = ?;',
      selectRewardById: 'SELECT * FROM rewards WHERE id = ?;',
      selectRewards: 'SELECT * FROM rewards ORDER BY createdAt DESC;',
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
    (title: string, status: string, description: string | null = null, dueDate: string | null = null) =>
      runTransaction<Task>((tx, resolve, reject) => {
        tx.executeSql(
          statements.insertTask,
          [title, status, description, dueDate],
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
            description: updates.description ?? current.description,
            dueDate: updates.dueDate ?? current.dueDate,
          };
          tx.executeSql(
            statements.updateTask,
            [next.title, next.status, next.description, next.dueDate, id],
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
      location: string | null = null
    ) =>
      runTransaction<Event>((tx, resolve, reject) => {
        tx.executeSql(
          statements.insertEvent,
          [title, description, startDate, endDate, location],
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
          };
          tx.executeSql(
            statements.updateEvent,
            [next.title, next.description, next.startDate, next.endDate, next.location, id],
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
    (category: string, amount: number, period: string, notes: string | null = null) =>
      runTransaction<Budget>((tx, resolve, reject) => {
        tx.executeSql(
          statements.insertBudget,
          [category, amount, period, notes],
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
            notes: updates.notes ?? current.notes,
          };
          tx.executeSql(
            statements.updateBudget,
            [next.category, next.amount, next.period, next.notes, id],
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
    insertReward,
    updateReward,
    deleteReward,
    getRewards,
    getRewardById,
  } as const;
};

export default useDB;
