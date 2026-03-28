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

const unsupportedSqlError = (statement: string): Error =>
  new Error(
    `[expo-sqlite shim] SQL execution is not supported on web fallback. Statement: ${statement}`
  );

const createTransaction = (): SQLTransaction => ({
  executeSql: (statement, _args = [], _success, error) => {
    const tx = createTransaction();
    const executionError = unsupportedSqlError(statement);

    if (error) {
      error(tx, executionError);
      return;
    }

    throw executionError;
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
