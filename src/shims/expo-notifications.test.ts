import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelScheduledNotificationAsync, scheduleNotificationAsync } from './expo-notifications';

const shown: string[] = [];

class FakeNotification {
  static permission = 'granted';
  constructor(title: string) {
    shown.push(title);
  }
}

beforeEach(() => {
  shown.length = 0;
  vi.useFakeTimers();
  vi.stubGlobal('Notification', FakeNotification);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('web notification shim', () => {
  it('returns a distinct id per scheduled reminder', async () => {
    const first = await scheduleNotificationAsync({ content: { title: 'a' }, trigger: { seconds: 60 } });
    const second = await scheduleNotificationAsync({ content: { title: 'b' }, trigger: { seconds: 60 } });
    expect(first).toEqual(expect.any(String));
    expect(second).not.toBe(first);
  });

  it('replaces a reminder instead of showing both when the old one is cancelled', async () => {
    const original = await scheduleNotificationAsync({ content: { title: 'old time' }, trigger: { seconds: 60 } });
    await cancelScheduledNotificationAsync(original);
    await scheduleNotificationAsync({ content: { title: 'new time' }, trigger: { seconds: 120 } });
    vi.advanceTimersByTime(120_000);
    expect(shown).toEqual(['new time']);
  });

  it('ignores ids it does not know, including already delivered ones', async () => {
    const id = await scheduleNotificationAsync({ content: { title: 'soon' }, trigger: { seconds: 1 } });
    vi.advanceTimersByTime(1_000);
    await expect(cancelScheduledNotificationAsync(id)).resolves.toBeUndefined();
    await expect(cancelScheduledNotificationAsync('missing')).resolves.toBeUndefined();
    expect(shown).toEqual(['soon']);
  });
});
