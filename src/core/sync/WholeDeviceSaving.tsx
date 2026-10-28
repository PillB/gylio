/**
 * Where account sync is switched on (flag.ts), it replaces saving the whole device as one copy
 * (src/features/account). Running both would send every change twice, to an API that serves only one of them, and
 * show two different saving states.
 */
import React, { type ReactNode } from 'react';
import { AccountSyncProvider } from '../../features/account/AccountSyncContext';
import { syncEnabled } from './flag';

export function WholeDeviceSaving({ children }: { children: ReactNode }) {
  return syncEnabled() ? <>{children}</> : <AccountSyncProvider>{children}</AccountSyncProvider>;
}
