export type SQLResultSetRowList = {
  length: number;
  item: (index: number) => Record<string, unknown>;
};

export type SQLResultSet = {
  rows: SQLResultSetRowList;
  rowsAffected: number;
  insertId?: number;
};

export type SQLTransaction = {
  executeSql: (
    statement: string,
    args?: unknown[],
    success?: (tx: SQLTransaction, result: SQLResultSet) => boolean | void,
    error?: (tx: SQLTransaction, err: Error) => boolean | void
  ) => void;
};

export type SQLiteDatabase = {
  transaction: (
    callback: (tx: SQLTransaction) => void,
    onError?: (error: Error) => void,
    onSuccess?: () => void
  ) => void;
};

const emptyRows: SQLResultSetRowList = {
  length: 0,
  item: () => ({})
};

const emptyResult: SQLResultSet = {
  rows: emptyRows,
  rowsAffected: 0,
  insertId: 0
};

const createTransaction = (): SQLTransaction => ({
  executeSql: (_statement, _args = [], success, error) => {
    try {
      success?.(createTransaction(), emptyResult);
    } catch (err) {
      error?.(createTransaction(), err as Error);
    }
  }
});

export const openDatabase = (_name: string): SQLiteDatabase => ({
  transaction: (callback, onError, onSuccess) => {
    try {
      callback(createTransaction());
      onSuccess?.();
    } catch (error) {
      onError?.(error as Error);
    }
  }
});

export default { openDatabase };
