export type SQLResultSetRowList = {
  length: number;
  item: (index: number) => any;
};

export type SQLResultSet = {
  insertId?: number | null;
  rowsAffected: number;
  rows: SQLResultSetRowList;
};

export type SQLTransaction = {
  executeSql: (
    sql: string,
    params?: any[] | ((tx: SQLTransaction, result: SQLResultSet) => void),
    success?: (tx: SQLTransaction, result: SQLResultSet) => void,
    error?: (tx: SQLTransaction, error: Error) => boolean | void
  ) => void;
};

export type SQLiteDatabase = {
  transaction: (
    callback: (tx: SQLTransaction) => void,
    error?: (error: Error) => void,
    success?: () => void
  ) => void;
};

let nextTaskId = 1;
let nextEventId = 1;
let nextBudgetId = 1;
let nextRewardId = 1;

const store = {
  tasks: [] as any[],
  events: [] as any[],
  budgets: [] as any[],
  rewards: [] as any[]
};

const createRows = (items: any[]): SQLResultSetRowList => ({
  length: items.length,
  item: (index: number) => items[index]
});

const now = () => new Date().toISOString();

const isSchemaStatement = (sql: string) => sql.trim().toUpperCase().startsWith('CREATE TABLE');

const handlers: Record<string, (params: any[]) => SQLResultSet> = {
  'INSERT INTO tasks (title, status, description, dueDate) VALUES (?, ?, ?, ?);': (params) => {
    const [title, status, description, dueDate] = params;
    const task = {
      id: nextTaskId++,
      title,
      status,
      description,
      dueDate,
      createdAt: now()
    };
    store.tasks.unshift(task);
    return { insertId: task.id, rowsAffected: 1, rows: createRows([]) };
  },
  'UPDATE tasks SET title = ?, status = ?, description = ?, dueDate = ? WHERE id = ?;': (params) => {
    const [title, status, description, dueDate, id] = params;
    const index = store.tasks.findIndex((task) => task.id === id);
    if (index === -1) return { rowsAffected: 0, rows: createRows([]) };
    store.tasks[index] = { ...store.tasks[index], title, status, description, dueDate };
    return { rowsAffected: 1, rows: createRows([]) };
  },
  'DELETE FROM tasks WHERE id = ?;': (params) => {
    const [id] = params;
    const before = store.tasks.length;
    store.tasks = store.tasks.filter((task) => task.id !== id);
    return { rowsAffected: before - store.tasks.length, rows: createRows([]) };
  },
  'SELECT * FROM tasks WHERE id = ?;': (params) => {
    const [id] = params;
    const task = store.tasks.find((entry) => entry.id === id);
    return { rowsAffected: 0, rows: createRows(task ? [task] : []) };
  },
  'SELECT * FROM tasks ORDER BY createdAt DESC;': () => ({
    rowsAffected: 0,
    rows: createRows([...store.tasks])
  }),
  'INSERT INTO events (title, description, startDate, endDate, location) VALUES (?, ?, ?, ?, ?);': (params) => {
    const [title, description, startDate, endDate, location] = params;
    const event = {
      id: nextEventId++,
      title,
      description,
      startDate,
      endDate,
      location,
      createdAt: now()
    };
    store.events.unshift(event);
    return { insertId: event.id, rowsAffected: 1, rows: createRows([]) };
  },
  'UPDATE events SET title = ?, description = ?, startDate = ?, endDate = ?, location = ? WHERE id = ?;': (params) => {
    const [title, description, startDate, endDate, location, id] = params;
    const index = store.events.findIndex((event) => event.id === id);
    if (index === -1) return { rowsAffected: 0, rows: createRows([]) };
    store.events[index] = { ...store.events[index], title, description, startDate, endDate, location };
    return { rowsAffected: 1, rows: createRows([]) };
  },
  'DELETE FROM events WHERE id = ?;': (params) => {
    const [id] = params;
    const before = store.events.length;
    store.events = store.events.filter((event) => event.id !== id);
    return { rowsAffected: before - store.events.length, rows: createRows([]) };
  },
  'SELECT * FROM events WHERE id = ?;': (params) => {
    const [id] = params;
    const event = store.events.find((entry) => entry.id === id);
    return { rowsAffected: 0, rows: createRows(event ? [event] : []) };
  },
  'SELECT * FROM events ORDER BY createdAt DESC;': () => ({
    rowsAffected: 0,
    rows: createRows([...store.events])
  }),
  'INSERT INTO budgets (category, amount, period, notes) VALUES (?, ?, ?, ?);': (params) => {
    const [category, amount, period, notes] = params;
    const budget = {
      id: nextBudgetId++,
      category,
      amount,
      period,
      notes,
      createdAt: now()
    };
    store.budgets.unshift(budget);
    return { insertId: budget.id, rowsAffected: 1, rows: createRows([]) };
  },
  'UPDATE budgets SET category = ?, amount = ?, period = ?, notes = ? WHERE id = ?;': (params) => {
    const [category, amount, period, notes, id] = params;
    const index = store.budgets.findIndex((budget) => budget.id === id);
    if (index === -1) return { rowsAffected: 0, rows: createRows([]) };
    store.budgets[index] = { ...store.budgets[index], category, amount, period, notes };
    return { rowsAffected: 1, rows: createRows([]) };
  },
  'DELETE FROM budgets WHERE id = ?;': (params) => {
    const [id] = params;
    const before = store.budgets.length;
    store.budgets = store.budgets.filter((budget) => budget.id !== id);
    return { rowsAffected: before - store.budgets.length, rows: createRows([]) };
  },
  'SELECT * FROM budgets WHERE id = ?;': (params) => {
    const [id] = params;
    const budget = store.budgets.find((entry) => entry.id === id);
    return { rowsAffected: 0, rows: createRows(budget ? [budget] : []) };
  },
  'SELECT * FROM budgets ORDER BY createdAt DESC;': () => ({
    rowsAffected: 0,
    rows: createRows([...store.budgets])
  }),
  'INSERT INTO rewards (title, pointsRequired, description, redeemed) VALUES (?, ?, ?, ?);': (params) => {
    const [title, pointsRequired, description, redeemed] = params;
    const reward = {
      id: nextRewardId++,
      title,
      pointsRequired,
      description,
      redeemed: Number(redeemed) === 1,
      createdAt: now()
    };
    store.rewards.unshift(reward);
    return { insertId: reward.id, rowsAffected: 1, rows: createRows([]) };
  },
  'UPDATE rewards SET title = ?, pointsRequired = ?, description = ?, redeemed = ? WHERE id = ?;': (params) => {
    const [title, pointsRequired, description, redeemed, id] = params;
    const index = store.rewards.findIndex((reward) => reward.id === id);
    if (index === -1) return { rowsAffected: 0, rows: createRows([]) };
    store.rewards[index] = { ...store.rewards[index], title, pointsRequired, description, redeemed: Number(redeemed) === 1 };
    return { rowsAffected: 1, rows: createRows([]) };
  },
  'DELETE FROM rewards WHERE id = ?;': (params) => {
    const [id] = params;
    const before = store.rewards.length;
    store.rewards = store.rewards.filter((reward) => reward.id !== id);
    return { rowsAffected: before - store.rewards.length, rows: createRows([]) };
  },
  'SELECT * FROM rewards WHERE id = ?;': (params) => {
    const [id] = params;
    const reward = store.rewards.find((entry) => entry.id === id);
    return { rowsAffected: 0, rows: createRows(reward ? [reward] : []) };
  },
  'SELECT * FROM rewards ORDER BY createdAt DESC;': () => ({
    rowsAffected: 0,
    rows: createRows([...store.rewards])
  })
};

export const openDatabase = (): SQLiteDatabase => ({
  transaction: (callback, error, success) => {
    try {
      const tx: SQLTransaction = {
        executeSql: (sql, paramsOrSuccess, successCallback, errorCallback) => {
          const params = Array.isArray(paramsOrSuccess) ? paramsOrSuccess : [];
          const resolvedSuccess =
            typeof paramsOrSuccess === 'function' ? paramsOrSuccess : successCallback;

          const handler = handlers[sql];

          const handleUnsupportedStatement = (): SQLResultSet | null => {
            const err = new Error(`Unsupported SQL statement: ${sql}`);
            if (errorCallback) {
              const shouldProceed = errorCallback(tx, err);
              if (shouldProceed === false) return null;
            }
            throw err;
          };

          const runHandler = (): SQLResultSet | null => {
            if (handler) return handler(params);
            if (isSchemaStatement(sql)) return { rowsAffected: 0, rows: createRows([]) };
            handleUnsupportedStatement();
            return null;
          };

          try {
            const result = runHandler();
            if (result && resolvedSuccess) resolvedSuccess(tx, result);
          } catch (handlerError) {
            if (errorCallback && errorCallback(tx, handlerError as Error) === false) return;
            throw handlerError;
          }
        }
      };

      callback(tx);
      if (success) success();
    } catch (err) {
      if (error) error(err as Error);
    }
  }
});

export default { openDatabase };
