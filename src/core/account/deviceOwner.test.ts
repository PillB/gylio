import { describe, expect, it } from 'vitest';
import { ARCHIVE_PREFIX, bringBack, decideOwner, isPersonalKey, NoRoomToSetAside, OWNER_KEY, setAside, switchOwner } from './deviceOwner';

/** localStorage with an optional size limit, counted in characters like the browser's quota. */
class FakeStorage implements Storage {
  private items = new Map<string, string>();
  /** Every write tried, including refused ones, so a test can tell which path a switch took. */
  readonly tried: string[] = [];
  constructor(private readonly limit = Infinity) {}
  get length() {
    return this.items.size;
  }
  key(index: number) {
    return Array.from(this.items.keys())[index] ?? null;
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.tried.push(key);
    const used = Array.from(this.items.entries()).reduce((sum, [k, v]) => (k === key ? sum : sum + k.length + v.length), 0);
    if (used + key.length + value.length > this.limit) throw new DOMException('Quota exceeded', 'QuotaExceededError');
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  clear() {
    this.items.clear();
  }
  dump() {
    return Object.fromEntries(this.items);
  }
}

const deviceWithA = (limit?: number) => {
  const storage = new FakeStorage(limit);
  storage.setItem('gylio_sqlite', '{"tasks":{"rows":[{"title":"A: pay rent"}]}}');
  storage.setItem('gylio:timeTracker:v1', '{"title":"A: report"}');
  storage.setItem('onboardingFlowState', '{"quickSetup":{"monthlyBudget":"2000"}}');
  storage.setItem('theme-mode', 'dark');
  storage.setItem('gylio_lang', 'es-PE');
  storage.setItem('accessibility:reduceMotion', 'true');
  storage.setItem('__clerk_db_jwt', 'session');
  storage.setItem(OWNER_KEY, 'user_a');
  return storage;
};

describe('decideOwner', () => {
  it('claims an unowned device, keeps the same owner, and switches for anyone else', () => {
    expect(decideOwner(null, 'user_a')).toBe('claim');
    expect(decideOwner('user_a', 'user_a')).toBe('same');
    expect(decideOwner('user_a', 'user_b')).toBe('switch');
  });
});

describe('isPersonalKey', () => {
  it("treats the person's data as personal and the device's settings and sign-in as not", () => {
    for (const key of ['gylio_sqlite', 'gylio:timeTracker:v1', 'onboardingFlowState', 'gylio:some-new-feature', 'analytics:queue', 'gylio:sync:meta', 'gylio:preRestoreBackup']) {
      expect({ key, personal: isPersonalKey(key) }).toEqual({ key, personal: true });
    }
    for (const key of ['theme-mode', 'gylio_lang', 'accessibility:tint', '__clerk_db_jwt', 'clerk-telemetry', 'gylio:anonId', OWNER_KEY, `${ARCHIVE_PREFIX}user_a`]) {
      expect({ key, personal: isPersonalKey(key) }).toEqual({ key, personal: false });
    }
  });
});

describe('switchOwner', () => {
  it("hides A's tasks, budget and timer from B, and keeps the device settings and sign-in", () => {
    const storage = deviceWithA();
    switchOwner(storage, 'user_a', 'user_b');
    const after = storage.dump();
    expect(after.gylio_sqlite).toBeUndefined();
    expect(after['gylio:timeTracker:v1']).toBeUndefined();
    expect(after.onboardingFlowState).toBeUndefined();
    expect(after).toMatchObject({ 'theme-mode': 'dark', gylio_lang: 'es-PE', 'accessibility:reduceMotion': 'true', __clerk_db_jwt: 'session' });
    expect(after[OWNER_KEY]).toBe('user_b');
  });

  it("gives A everything back, exactly, when A signs in again, and keeps B's for later", () => {
    const storage = deviceWithA();
    const before = storage.dump();
    switchOwner(storage, 'user_a', 'user_b');
    storage.setItem('gylio_sqlite', '{"tasks":{"rows":[{"title":"B: call mum"}]}}');
    switchOwner(storage, 'user_b', 'user_a');
    expect(storage.dump()).toEqual({ ...before, 'gylio:ownerSignedIn': 'true', [`${ARCHIVE_PREFIX}user_b`]: expect.any(String) });
    switchOwner(storage, 'user_a', 'user_b');
    expect(storage.getItem('gylio_sqlite')).toContain('B: call mum');
  });

  it("is safe to run twice: the second run cannot file B's data over A's archive", () => {
    const storage = deviceWithA();
    const aData = storage.getItem('gylio_sqlite');
    switchOwner(storage, 'user_a', 'user_b');
    storage.setItem('gylio_sqlite', '{"tasks":{"rows":[{"title":"B: call mum"}]}}');
    switchOwner(storage, 'user_a', 'user_b');
    expect(storage.getItem('gylio_sqlite')).toContain('B: call mum');
    expect(JSON.parse(storage.getItem(`${ARCHIVE_PREFIX}user_a`) as string).gylio_sqlite).toBe(aData);
  });

  it('changes nothing when there is no room to set the data aside', () => {
    const storage = deviceWithA(400);
    const before = storage.dump();
    expect(() => switchOwner(storage, 'user_a', 'user_b')).toThrow(NoRoomToSetAside);
    expect(storage.dump()).toEqual(before);
  });

  it("puts A's data back, and keeps A as the owner, when B's archive cannot be restored in full", () => {
    const storage = deviceWithA(1200);
    storage.setItem(`${ARCHIVE_PREFIX}user_b`, JSON.stringify({ gylio_sqlite: 'x'.repeat(260), 'gylio:energy': 'y'.repeat(200) }));
    const live = Object.fromEntries(Object.entries(storage.dump()).filter(([key]) => key !== `${ARCHIVE_PREFIX}user_b`));
    storage.tried.length = 0;
    expect(() => switchOwner(storage, 'user_a', 'user_b')).toThrow(NoRoomToSetAside);
    // It got as far as restoring B's data, and was refused part way.
    expect(storage.tried).toEqual(expect.arrayContaining([`${ARCHIVE_PREFIX}user_a`, 'gylio:energy']));
    expect(storage.getItem(OWNER_KEY)).toBe('user_a');
    expect(storage.getItem('gylio_sqlite')).toBe(live.gylio_sqlite);
    expect(storage.getItem(`${ARCHIVE_PREFIX}user_b`)).not.toBeNull();
  });
});

describe('setAside and bringBack', () => {
  it('leave a damaged archive alone instead of applying part of it', () => {
    const storage = new FakeStorage();
    storage.setItem(`${ARCHIVE_PREFIX}user_a`, '{not json');
    bringBack(storage, 'user_a');
    expect(storage.getItem(`${ARCHIVE_PREFIX}user_a`)).toBe('{not json');
  });

  it('never restores a device setting or another archive from inside an archive', () => {
    const storage = new FakeStorage();
    storage.setItem('theme-mode', 'light');
    storage.setItem(`${ARCHIVE_PREFIX}user_a`, JSON.stringify({ 'theme-mode': 'dark', [OWNER_KEY]: 'user_z', gylio_sqlite: '{}' }));
    bringBack(storage, 'user_a');
    expect(storage.dump()).toEqual({ 'theme-mode': 'light', gylio_sqlite: '{}' });
  });

  it('archives nothing personal twice: an empty device sets aside an empty archive', () => {
    const storage = new FakeStorage();
    setAside(storage, 'user_a');
    expect(storage.getItem(`${ARCHIVE_PREFIX}user_a`)).toBe('{}');
  });
});
