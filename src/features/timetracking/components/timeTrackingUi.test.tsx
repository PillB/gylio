import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attention } from '../trackedTime';
import EstimatePicker from './EstimatePicker';
import TimeTrackerBar from './TimeTrackerBar';
import { ActualPrompt, TimeLogEditor, TrackButton } from './TrackedTimeControls';

const tracker = {
  run: null as null | { taskId: number; title: string; estimateMin: number | null },
  elapsed: 0,
  attention: { kind: 'ok' } as Attention,
  stopped: null as null | { taskId: number; title: string; entry: { actualSeconds: number; startedAt: string } },
  version: 0,
  start: vi.fn(async () => undefined),
  stop: vi.fn(async () => undefined),
  confirmStillWorking: vi.fn(),
  stopRemovingAway: vi.fn(async () => undefined),
  continueRemovingAway: vi.fn(async () => undefined),
  keepGoing: vi.fn(),
  undoStop: vi.fn(async () => undefined),
  dismissStopped: vi.fn(),
  setStoppedMinutes: vi.fn(async () => undefined),
  editEntry: vi.fn(async () => undefined),
  removeEntry: vi.fn(async () => undefined),
  addManual: vi.fn(async () => undefined),
};
vi.mock('../TimeTrackerContext', () => ({ useTimeTracker: () => tracker }));
vi.mock('../../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options && Object.keys(options).length ? `${key} ${JSON.stringify(options)}` : key),
    i18n: { language: 'en' },
  }),
}));

beforeEach(() => {
  Object.assign(tracker, { run: null, elapsed: 0, attention: { kind: 'ok' }, stopped: null });
  Object.values(tracker).forEach((v) => typeof v === 'function' && 'mockClear' in v && (v as ReturnType<typeof vi.fn>).mockClear());
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const running = () => {
  tracker.run = { taskId: 1, title: 'Write report', estimateMin: 30 };
  tracker.elapsed = 125;
};

describe('TimeTrackerBar', () => {
  it('renders nothing while idle', () => {
    const { container } = render(<TimeTrackerBar />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the running clock and task with a labelled Stop button', () => {
    running();
    render(<TimeTrackerBar />);
    expect(screen.getByText('02:05')).toBeTruthy();
    expect(screen.getByText('Write report')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /timeTracker.stopAria/ }));
    expect(tracker.stop).toHaveBeenCalled();
  });

  it('offers three non-punitive answers when the person was away, with "still working" first', () => {
    running();
    tracker.attention = { kind: 'away', awaySeconds: 47 * 60, stopAt: '2026-10-27T14:02:00Z' };
    render(<TimeTrackerBar />);
    const group = screen.getByRole('group', { name: 'timeTracker.awayAria' });
    const buttons = Array.from(group.querySelectorAll('button')).map((b) => b.textContent);
    expect(buttons).toEqual(['timeTracker.awayKeep', 'timeTracker.awayRemoveStop', 'timeTracker.awayRemoveContinue']);
    fireEvent.click(screen.getByText('timeTracker.awayKeep'));
    expect(tracker.confirmStillWorking).toHaveBeenCalled();
    fireEvent.click(screen.getByText('timeTracker.awayRemoveStop'));
    expect(tracker.stopRemovingAway).toHaveBeenCalled();
    fireEvent.click(screen.getByText('timeTracker.awayRemoveContinue'));
    expect(tracker.continueRemovingAway).toHaveBeenCalled();
  });

  it('checks in past the estimate with Keep going and Stop, and uses the no-estimate wording without one', () => {
    running();
    tracker.attention = { kind: 'over', elapsedSeconds: 50 * 60, estimateMin: 30 };
    const first = render(<TimeTrackerBar />);
    expect(screen.getByText(/timeTracker.overEstimate/)).toBeTruthy();
    fireEvent.click(screen.getByText('timeTracker.overKeepGoing'));
    expect(tracker.keepGoing).toHaveBeenCalled();
    first.unmount();
    tracker.attention = { kind: 'over', elapsedSeconds: 130 * 60, estimateMin: null };
    render(<TimeTrackerBar />);
    expect(screen.getByText(/timeTracker.overNoEstimate/)).toBeTruthy();
  });

  it('after a stop, shows what was saved with undo, fixes it from a typed value, and rejects nonsense', async () => {
    tracker.stopped = { taskId: 1, title: 'Write report', entry: { actualSeconds: 25 * 60, startedAt: '2026-10-27T09:00:00Z' } };
    render(<TimeTrackerBar />);
    expect(screen.getByRole('status').textContent).toContain('"duration":"25m"');
    fireEvent.click(screen.getByText('timeTracker.undo'));
    expect(tracker.undoStop).toHaveBeenCalled();
    fireEvent.click(screen.getByText('timeTracker.fix'));
    const input = screen.getByLabelText('timeTracker.fixLabel') as HTMLInputElement;
    expect(input.value).toBe('25');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect((screen.getByText('timeTracker.fixSave') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input, { target: { value: '1h30' } });
    await act(async () => fireEvent.click(screen.getByText('timeTracker.fixSave')));
    expect(tracker.setStoppedMinutes).toHaveBeenCalledWith(90);
  });

  it('fades the saved notice by itself after 15 seconds, but not while it is being fixed', () => {
    vi.useFakeTimers();
    tracker.stopped = { taskId: 1, title: 'x', entry: { actualSeconds: 600, startedAt: '2026-10-27T09:00:00Z' } };
    render(<TimeTrackerBar />);
    act(() => { vi.advanceTimersByTime(14_000); });
    expect(tracker.dismissStopped).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(tracker.dismissStopped).toHaveBeenCalledTimes(1);
    tracker.dismissStopped.mockClear();
    fireEvent.click(screen.getByText('timeTracker.fix'));
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(tracker.dismissStopped).not.toHaveBeenCalled();
  });
});

const baseTask = { id: 1, title: 'Write report', status: 'pending', estimateMin: 30 as number | null, timeLog: [] as Array<{ type: string; actualSeconds: number; startedAt: string; endedAt: string }> };

describe('TrackButton', () => {
  it('starts tracking the task it belongs to', () => {
    render(<TrackButton task={baseTask} />);
    fireEvent.click(screen.getByRole('button', { name: /timeTracker.startAria/ }));
    expect(tracker.start).toHaveBeenCalledWith(baseTask);
  });

  it('turns into Stop while this task runs, and shows tracked time against the estimate', () => {
    tracker.run = { taskId: 1, title: 'Write report', estimateMin: 30 };
    const task = { ...baseTask, timeLog: [{ type: 'tracked', actualSeconds: 25 * 60, startedAt: 'a', endedAt: 'b' }] };
    render(<TrackButton task={task} />);
    expect(screen.queryByRole('button', { name: /startAria/ })).toBeNull();
    expect(screen.getByText(/timeTracker.tracked.*25m/)).toBeTruthy();
    expect(screen.getByText(/timeTracker.estimated.*30m/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /stopAria/ }));
    expect(tracker.stop).toHaveBeenCalled();
  });
});

describe('TimeLogEditor', () => {
  const log = [
    { type: 'focus', actualSeconds: 1500, startedAt: '2026-10-27T08:00:00Z', endedAt: '2026-10-27T08:25:00Z' },
    { type: 'tracked', actualSeconds: 1200, startedAt: '2026-10-27T09:00:00Z', endedAt: '2026-10-27T09:20:00Z' },
  ];

  it('edits and removes only tracked stretches, addressed by their real position in the log', () => {
    render(<TimeLogEditor task={{ ...baseTask, timeLog: log }} />);
    const input = screen.getByLabelText(/timeTracker.entryLabel/) as HTMLInputElement;
    expect(input.value).toBe('20');
    fireEvent.change(input, { target: { value: '35' } });
    fireEvent.click(screen.getByText('timeTracker.fixSave'));
    expect(tracker.editEntry).toHaveBeenCalledWith(1, 1, 35);
    fireEvent.click(screen.getByRole('button', { name: /removeEntryAria/ }));
    expect(tracker.removeEntry).toHaveBeenCalledWith(1, 1);
  });

  it('shows the new length when the same stretch is changed elsewhere, such as by Fix in the saved notice', () => {
    const { rerender } = render(<TimeLogEditor task={{ ...baseTask, timeLog: log }} />);
    expect((screen.getByLabelText(/timeTracker.entryLabel/) as HTMLInputElement).value).toBe('20');
    const fixed = [log[0], { ...log[1], actualSeconds: 45 * 60 }];
    rerender(<TimeLogEditor task={{ ...baseTask, timeLog: fixed }} />);
    expect((screen.getByLabelText(/timeTracker.entryLabel/) as HTMLInputElement).value).toBe('45');
  });

  it('adds time that was never timed, and refuses a value it cannot read', () => {
    render(<TimeLogEditor task={baseTask} />);
    const input = screen.getByLabelText('timeTracker.addLabel');
    fireEvent.change(input, { target: { value: 'soon' } });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect((screen.getByText('timeTracker.addSave') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input, { target: { value: '1h15' } });
    fireEvent.click(screen.getByText('timeTracker.addSave'));
    expect(tracker.addManual).toHaveBeenCalledWith(1, 75);
  });
});

describe('ActualPrompt', () => {
  const done = { ...baseTask, status: 'completed' };

  it('asks once after a task with an estimate and no timed work is finished, with answers around the estimate', async () => {
    render(<ActualPrompt task={done} />);
    const labels = screen.getAllByRole('button').map((b) => b.textContent);
    expect(labels).toEqual(['15m', '30m', '45m', '1h', 'timeTracker.actualSkip']);
    await act(async () => fireEvent.click(screen.getByText('45m')));
    expect(tracker.addManual).toHaveBeenCalledWith(1, 45);
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('stays away when skipped, and on later visits', () => {
    const first = render(<ActualPrompt task={done} />);
    fireEvent.click(screen.getByText('timeTracker.actualSkip'));
    first.unmount();
    const { container } = render(<ActualPrompt task={done} />);
    expect(container.firstChild).toBeNull();
  });

  it('never asks for unfinished tasks, tasks without a guess, or tasks that were timed', () => {
    for (const task of [
      baseTask,
      { ...done, estimateMin: null },
      { ...done, timeLog: [{ type: 'tracked', actualSeconds: 600, startedAt: 'a', endedAt: 'b' }] },
    ]) {
      const { container, unmount } = render(<ActualPrompt task={task} />);
      expect(container.firstChild).toBeNull();
      unmount();
    }
  });
});

describe('EstimatePicker', () => {
  it('toggles a preset on and off and exposes the choice as pressed', () => {
    const onChange = vi.fn();
    const { rerender } = render(<EstimatePicker idPrefix="e" value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '30m' }));
    expect(onChange).toHaveBeenLastCalledWith(30);
    rerender(<EstimatePicker idPrefix="e" value={30} onChange={onChange} />);
    expect(screen.getByRole('button', { name: '30m' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '30m' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('reads a typed value such as 1h30 and ignores unreadable input', () => {
    const onChange = vi.fn();
    render(<EstimatePicker idPrefix="e" value={null} onChange={onChange} />);
    const input = screen.getByLabelText('estimate.customLabel');
    fireEvent.change(input, { target: { value: 'whenever' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    fireEvent.change(input, { target: { value: '1h30' } });
    expect(onChange).toHaveBeenCalledWith(90);
  });

  it('suggests a 25 percent buffer to start with and applies it only when tapped', () => {
    const onChange = vi.fn();
    render(<EstimatePicker idPrefix="e" value={30} onChange={onChange} samples={[]} />);
    expect(screen.getByText(/estimate.hintDefault.*40m/)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText(/estimate.useSuggestion/));
    expect(onChange).toHaveBeenCalledWith(40);
  });

  it('uses the person’s own history once there is enough of it', () => {
    const samples = Array.from({ length: 5 }, () => ({ estimateMin: 20, actualMin: 40 }));
    render(<EstimatePicker idPrefix="e" value={30} onChange={() => undefined} samples={samples} />);
    expect(screen.getByText(/estimate.hintHistory.*"ratio":"2.0".*1h/)).toBeTruthy();
  });
});
