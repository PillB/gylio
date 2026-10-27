import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { themes } from '../core/themes';
import { SyncProvider } from '../core/sync/SyncContext';
import type { SyncEngine, SyncSnapshot, SyncState } from '../core/sync/engine';
import { CHIP_DELAY_MS, SyncSettingsSection, SyncStatusChip } from './SyncStatus';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number; time?: string }) => (options?.count !== undefined ? `${key}:${options.count}` : options?.time ? `${key}:${options.time}` : key),
    i18n: { language: 'en' },
  }),
}));
vi.mock('../core/context/ThemeContext', () => ({ useTheme: () => ({ theme: themes.light }) }));

const base: SyncSnapshot = { state: { kind: 'idle' }, pending: 0, refused: 0, kept: 0, lastSyncedAt: null, economy: false };

/** A stand-in engine the test can push new snapshots through. */
const fakeEngine = (initial: SyncSnapshot) => {
  let listener: ((s: SyncSnapshot) => void) | null = null;
  const calls = { kick: [] as string[], retryRefused: 0 };
  const engine = {
    snapshot: () => initial,
    subscribe: (fn: (s: SyncSnapshot) => void) => {
      listener = fn;
      return () => (listener = null);
    },
    kick: (reason: string) => calls.kick.push(reason),
    retryRefused: async () => {
      calls.retryRefused += 1;
    },
  } as unknown as SyncEngine;
  return { engine, calls, push: (s: SyncSnapshot) => act(() => listener?.(s)) };
};

const waiting = (reason: 'offline' | 'paused'): SyncState => ({ kind: 'waiting', reason, retryAt: reason === 'offline' ? null : 5 });

describe('SyncStatusChip', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows nothing when sync is not set up, or when everything is saved', () => {
    const { container, rerender } = render(<SyncStatusChip />);
    expect(container.textContent).toBe('');
    const rig = fakeEngine({ ...base, pending: 2 });
    rerender(<SyncProvider engine={rig.engine}><SyncStatusChip /></SyncProvider>);
    act(() => vi.advanceTimersByTime(CHIP_DELAY_MS * 2));
    expect(container.textContent).toBe('');
  });

  it('waits a few seconds before saying anything, so a brief blip never flashes', () => {
    const rig = fakeEngine({ ...base, state: waiting('offline'), pending: 3 });
    render(<SyncProvider engine={rig.engine}><SyncStatusChip /></SyncProvider>);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => vi.advanceTimersByTime(CHIP_DELAY_MS - 100));
    expect(screen.queryByRole('status')).toBeNull();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole('status').textContent).toContain('sync.status.offline');
    expect(screen.getByRole('status').textContent).toContain('sync.status.pending:3');
  });

  it('never appears if the problem clears within the delay', () => {
    const rig = fakeEngine({ ...base, state: waiting('paused') });
    render(<SyncProvider engine={rig.engine}><SyncStatusChip /></SyncProvider>);
    act(() => vi.advanceTimersByTime(2000));
    rig.push({ ...base, state: { kind: 'idle' } });
    act(() => vi.advanceTimersByTime(CHIP_DELAY_MS * 2));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('is polite for screen readers, labelled, and contains no countdown or time', () => {
    const rig = fakeEngine({ ...base, state: waiting('paused') });
    render(<SyncProvider engine={rig.engine}><SyncStatusChip delayMs={0} /></SyncProvider>);
    act(() => vi.advanceTimersByTime(10));
    const chip = screen.getByRole('status');
    expect(chip.getAttribute('aria-live')).toBe('polite');
    expect(chip.getAttribute('aria-label')).toBe('sync.status.ariaLabel');
    expect(chip.textContent).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('can be hidden, and comes back only for a different message', () => {
    const rig = fakeEngine({ ...base, state: waiting('paused') });
    render(<SyncProvider engine={rig.engine}><SyncStatusChip delayMs={0} /></SyncProvider>);
    act(() => vi.advanceTimersByTime(10));
    fireEvent.click(screen.getByRole('button', { name: 'sync.status.dismiss' }));
    expect(screen.queryByRole('status')).toBeNull();
    rig.push({ ...base, state: waiting('paused'), pending: 4 });
    act(() => vi.advanceTimersByTime(10));
    expect(screen.queryByRole('status')).toBeNull();
    rig.push({ ...base, state: waiting('offline') });
    act(() => vi.advanceTimersByTime(10));
    expect(screen.getByRole('status').textContent).toContain('sync.status.offline');
  });

  it('a needed choice cannot be dismissed away', () => {
    const rig = fakeEngine({ ...base, state: { kind: 'other-account' } });
    render(<SyncProvider engine={rig.engine}><SyncStatusChip delayMs={0} /></SyncProvider>);
    act(() => vi.advanceTimersByTime(10));
    expect(screen.getByRole('status').textContent).toContain('sync.status.otherAccount');
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('SyncSettingsSection', () => {
  afterEach(cleanup);

  it('renders nothing until sync is set up', () => {
    const { container } = render(<SyncSettingsSection />);
    expect(container.textContent).toBe('');
  });

  it('says it is up to date and offers no retry', () => {
    const rig = fakeEngine({ ...base, lastSyncedAt: Date.UTC(2026, 9, 27, 12, 0, 0) });
    render(<SyncProvider engine={rig.engine}><SyncSettingsSection /></SyncProvider>);
    expect(screen.getByText('sync.detail.upToDate')).toBeTruthy();
    expect(screen.getByText(/sync.detail.lastSynced:/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('while waiting, offers "try now"; pressing it asks the engine for one manual attempt', () => {
    const rig = fakeEngine({ ...base, state: waiting('paused'), pending: 2 });
    render(<SyncProvider engine={rig.engine}><SyncSettingsSection /></SyncProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'sync.detail.tryNow' }));
    expect(rig.calls.kick).toEqual(['manual']);
  });

  it('reports refused changes and kept versions, and can send the refused ones again', () => {
    const rig = fakeEngine({ ...base, refused: 2, kept: 1, economy: true });
    render(<SyncProvider engine={rig.engine}><SyncSettingsSection /></SyncProvider>);
    expect(screen.getByText('sync.detail.refused:2')).toBeTruthy();
    expect(screen.getByText('sync.detail.kept:1')).toBeTruthy();
    expect(screen.getByText('sync.detail.economy')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'sync.detail.tryRefused' }));
    expect(rig.calls.retryRefused).toBe(1);
  });

  it('every button is a real, keyboard-reachable button at least 44px tall', () => {
    const rig = fakeEngine({ ...base, state: waiting('offline'), refused: 1 });
    render(<SyncProvider engine={rig.engine}><SyncSettingsSection /></SyncProvider>);
    for (const button of screen.getAllByRole('button')) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('type')).toBe('button');
      expect(parseInt((button as HTMLElement).style.minHeight, 10)).toBeGreaterThanOrEqual(44);
    }
  });
});
