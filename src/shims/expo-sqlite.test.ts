import { describe, expect, it, vi } from 'vitest';
import { openDatabase } from './expo-sqlite';

describe('expo-sqlite web shim', () => {
  it('routes executeSql calls to the error callback', () => {
    const db = openDatabase('test.db');
    const sqlErrorHandler = vi.fn(() => false);
    const successHandler = vi.fn();

    db.transaction((tx) => {
      tx.executeSql('INSERT INTO tasks (title) VALUES (?)', ['Example'], successHandler, sqlErrorHandler);
    });

    expect(successHandler).not.toHaveBeenCalled();
    expect(sqlErrorHandler).toHaveBeenCalledTimes(1);

    const errorArg = sqlErrorHandler.mock.calls[0]?.[1];
    expect(errorArg).toBeInstanceOf(Error);
    expect((errorArg as Error).message).toContain('SQL execution is not supported on web fallback');
  });

  it('surfaces SQL errors to the transaction onError callback when executeSql has no error callback', () => {
    const db = openDatabase('test.db');
    const transactionErrorHandler = vi.fn();

    db.transaction(
      (tx) => {
        tx.executeSql('SELECT 1');
      },
      transactionErrorHandler
    );

    expect(transactionErrorHandler).toHaveBeenCalledTimes(1);
    const errorArg = transactionErrorHandler.mock.calls[0]?.[0];
    expect(errorArg).toBeInstanceOf(Error);
    expect((errorArg as Error).message).toContain('Statement: SELECT 1');
  });
});
