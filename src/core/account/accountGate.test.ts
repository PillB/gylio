import { describe, expect, it } from 'vitest';
import { applyStep, gateNotice, gateStep, QUIET_MS, signInWait, SLOW_SIGN_IN_MS } from './accountGate';
import { ARCHIVE_PREFIX, OWNER_KEY, OWNER_SIGNED_IN_KEY } from './deviceOwner';

describe('gateStep', () => {
  it('waits for sign-in, then claims, keeps or switches the data on this device', () => {
    expect(gateStep({ isLoaded: false }, 'user_a')).toBe('wait');
    expect(gateStep({ isLoaded: true, isSignedIn: false, userId: null }, 'user_a')).toBe('signed-out');
    expect(gateStep({ isLoaded: true, isSignedIn: true, userId: null }, 'user_a')).toBe('signed-out');
    expect(gateStep({ isLoaded: true, isSignedIn: true, userId: 'user_a' }, null)).toBe('claim');
    expect(gateStep({ isLoaded: true, isSignedIn: true, userId: 'user_a' }, 'user_a')).toBe('same');
    expect(gateStep({ isLoaded: true, isSignedIn: true, userId: 'user_b' }, 'user_a')).toBe('switch');
  });
});

describe('applyStep', () => {
  it('records the first account to sign in as the owner, and whether the owner is signed in', () => {
    localStorage.clear();
    expect(applyStep('claim', null, 'user_a', localStorage)).toBe('show');
    expect(localStorage.getItem(OWNER_KEY)).toBe('user_a');
    expect(localStorage.getItem(OWNER_SIGNED_IN_KEY)).toBe('true');
    expect(applyStep('signed-out', 'user_a', null, localStorage)).toBe('show');
    expect(localStorage.getItem(OWNER_SIGNED_IN_KEY)).toBe('false');
    expect(applyStep('same', 'user_a', 'user_a', localStorage)).toBe('show');
    expect(localStorage.getItem(OWNER_SIGNED_IN_KEY)).toBe('true');
  });

  it('sets the data aside and asks for a reload when someone else signs in', () => {
    localStorage.clear();
    localStorage.setItem(OWNER_KEY, 'user_a');
    localStorage.setItem('gylio_sqlite', '{"tasks":{"rows":[{"title":"A"}]}}');
    expect(applyStep('switch', 'user_a', 'user_b', localStorage)).toBe('reload');
    expect(localStorage.getItem('gylio_sqlite')).toBeNull();
    expect(localStorage.getItem(`${ARCHIVE_PREFIX}user_a`)).toContain('"title\\":\\"A\\"');
    expect(localStorage.getItem(OWNER_KEY)).toBe('user_b');
  });

  it('keeps the data hidden when there is no room to set it aside', () => {
    const full = {
      length: 1,
      key: () => 'gylio_sqlite',
      getItem: (key: string) => ({ gylio_sqlite: '{"big":true}', [OWNER_KEY]: 'user_a' })[key] ?? null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
      removeItem: () => undefined,
      clear: () => undefined,
    } as Storage;
    expect(applyStep('switch', 'user_a', 'user_b', full)).toBe('no-room');
    // A full device refusing the owner mark is harmless: the data shown is the signed-in person's own.
    expect(applyStep('claim', null, 'user_a', full)).toBe('show');
  });

  it("puts back an account's data that was set aside, on a device nobody owns, and asks for a reload", () => {
    localStorage.clear();
    // A removed their data and signed out; B's data was set aside here earlier.
    localStorage.setItem(`${ARCHIVE_PREFIX}user_b`, JSON.stringify({ gylio_sqlite: '{"tasks":{"rows":[{"title":"B"}]}}' }));
    localStorage.setItem('onboardingFlowState', '{"isOnboardingComplete":false}');
    expect(applyStep('claim', null, 'user_b', localStorage)).toBe('restored');
    expect(localStorage.getItem('gylio_sqlite')).toContain('"title":"B"');
    expect(localStorage.getItem(`${ARCHIVE_PREFIX}user_b`)).toBeNull();
    expect(localStorage.getItem(OWNER_KEY)).toBe('user_b');
  });

  it('does nothing while sign-in is still loading', () => {
    localStorage.clear();
    expect(applyStep('wait', 'user_a', null, localStorage)).toBe('show');
    expect(localStorage.length).toBe(0);
  });
});

describe('signInWait', () => {
  it('stays quiet for a moment, then says sign-in is being checked', () => {
    expect(signInWait({ ownerSignedIn: false, online: true, waitedMs: 0 })).toBe('quiet');
    expect(signInWait({ ownerSignedIn: false, online: true, waitedMs: QUIET_MS })).toBe('waiting');
  });

  it('opens the owner\'s data at once offline, and after a while on a slow line', () => {
    expect(signInWait({ ownerSignedIn: true, online: false, waitedMs: 0 })).toBe('local');
    expect(signInWait({ ownerSignedIn: true, online: true, waitedMs: SLOW_SIGN_IN_MS - 1 })).toBe('waiting');
    expect(signInWait({ ownerSignedIn: true, online: true, waitedMs: SLOW_SIGN_IN_MS })).toBe('local');
  });

  it('never opens it after its owner signed out, however long sign-in takes', () => {
    expect(signInWait({ ownerSignedIn: false, online: true, waitedMs: 60_000 })).toBe('waiting');
    expect(signInWait({ ownerSignedIn: false, online: false, waitedMs: 60_000 })).toBe('offline');
  });
});

describe('gateNotice', () => {
  it('says what is happening while the data changes hands, and nothing otherwise', () => {
    expect(gateNotice('switch', 'show', false)).toBe('device.switching');
    expect(gateNotice('same', 'reload', false)).toBe('device.switching');
    expect(gateNotice('claim', 'show', true)).toBe('device.restoring');
    expect(gateNotice('same', 'restored', false)).toBe('device.restoring');
    expect(gateNotice('claim', 'show', false)).toBeNull();
    expect(gateNotice('same', 'show', true)).toBeNull();
    expect(gateNotice('wait', 'show', false)).toBeNull();
  });
});
