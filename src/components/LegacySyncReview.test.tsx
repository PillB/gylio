import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LegacySyncReview from './LegacySyncReview.jsx';

const conflicts: Record<string, unknown>[] = [];
const updateTask = vi.fn(async () => undefined);
const deleteTask = vi.fn(async () => undefined);
const removeSyncConflict = vi.fn(async (_id: string) => undefined);

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../core/context/ThemeContext', async () => {
  const { themes } = await import('../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});
vi.mock('../core/hooks/useDB', () => ({
  default: () => ({ updateTask, deleteTask, updateEvent: vi.fn(), deleteEvent: vi.fn(), updateTransaction: vi.fn(), deleteTransaction: vi.fn() }),
}));
vi.mock('../core/utils/backgroundSync', () => ({ requestBackgroundSync: vi.fn(async () => undefined) }));
vi.mock('../core/utils/offlineSync', () => ({
  enqueueSyncAction: vi.fn(async () => undefined),
  listSyncConflicts: async () => conflicts,
  removeSyncConflict: (id: string) => removeSyncConflict(id),
}));

const conflict = (remoteData: unknown) => ({
  id: 'c1',
  entityType: 'task',
  action: 'update',
  localData: { id: 7, title: 'Water plants' },
  remoteData,
  detectedAt: '2026-10-28T10:00:00Z',
});

afterEach(() => {
  cleanup();
  conflicts.splice(0);
  vi.clearAllMocks();
});

describe('LegacySyncReview', () => {
  it("saves the record inside the server's answer, keeping its title", async () => {
    conflicts.push(conflict({ error: { code: 'CONFLICT' }, current: { id: '7', deleted: false, data: { title: 'Water the plants', status: 'pending' } } }));
    render(<LegacySyncReview />);
    fireEvent.click(await screen.findByRole('button', { name: 'sync.reviewUseRemote' }));
    await waitFor(() => expect(updateTask).toHaveBeenCalledWith(7, expect.objectContaining({ title: 'Water the plants' }), { skipSync: true }));
    expect(removeSyncConflict).toHaveBeenCalledWith('c1');
  });

  it('offers only "keep this device\'s version" when the server copy cannot be read, and never deletes', async () => {
    conflicts.push(conflict(null));
    render(<LegacySyncReview />);
    const useServer = (await screen.findByRole('button', { name: 'sync.reviewUseRemote' })) as HTMLButtonElement;
    expect(useServer.disabled).toBe(true);
    expect(screen.getByText('sync.reviewServerUnreadable')).toBeTruthy();
    fireEvent.click(useServer);
    expect(deleteTask).not.toHaveBeenCalled();
    expect(updateTask).not.toHaveBeenCalled();
  });
});
