/**
 * The decisions behind AccountDataGate and the sign-in wait, kept free of React so each case is one line to test.
 */
import { bringBack, decideOwner, hasArchive, NoRoomToSetAside, setOwnerSignedIn, switchOwner, writeOwner, type OwnerDecision } from './deviceOwner';

export type GateStep = 'wait' | 'signed-out' | OwnerDecision;

type AuthSoFar = { isLoaded: boolean; isSignedIn?: boolean | null; userId?: string | null };

/** What to do with what sign-in knows so far, when the data on this device belongs to `owner` (null: nobody yet). */
export const gateStep = ({ isLoaded, isSignedIn, userId }: AuthSoFar, owner: string | null): GateStep => {
  if (!isLoaded) return 'wait';
  if (!isSignedIn || !userId) return 'signed-out';
  return decideOwner(owner, userId);
};

/** 'reload' after a switch; 'restored' after an account's data, set aside earlier, was put back on a device nobody owned. */
export type StepOutcome = 'show' | 'reload' | 'restored' | 'no-room';

type Apply = (storage: Storage, owner: string, userId: string) => StepOutcome;

/** gateStep returns 'switch' only with both ids, and 'claim' and 'same' only with a user id. */
const STEPS: Partial<Record<GateStep, Apply>> = {
  switch: (storage, owner, userId) => {
    switchOwner(storage, owner, userId);
    return 'reload';
  },
  // Nobody owns the device after "remove my data from this device", but this account's data may be set aside here.
  claim: (storage, _owner, userId) => {
    const archived = hasArchive(userId, storage);
    bringBack(storage, userId);
    writeOwner(userId, storage);
    setOwnerSignedIn(true, storage);
    return archived ? 'restored' : 'show';
  },
  same: (storage) => {
    setOwnerSignedIn(true, storage);
    return 'show';
  },
  'signed-out': (storage) => {
    setOwnerSignedIn(false, storage);
    return 'show';
  },
};

/**
 * Carries out a step. A switch, or data put back, changes what is on the device, and the page then reloads, because
 * every screen read what was there when it started.
 */
export const applyStep = (step: GateStep, owner: string | null, userId: string | null | undefined, storage: Storage): StepOutcome => {
  try {
    return STEPS[step]?.(storage, owner ?? '', userId ?? '') ?? 'show';
  } catch (error) {
    // A full device can refuse the owner mark as well; only a refused switch must keep the data hidden.
    return error instanceof NoRoomToSetAside ? 'no-room' : 'show';
  }
};

/**
 * What the gate says instead of showing the app while the data on this device changes hands, or null to show it.
 * A claim that will put data back says so from the start, rather than flashing an empty app first.
 */
export const gateNotice = (step: GateStep, outcome: StepOutcome, restorable: boolean): string | null => {
  if (outcome === 'restored' || (step === 'claim' && restorable)) return 'device.restoring';
  if (step === 'switch' || outcome === 'reload') return 'device.switching';
  return null;
};

/** Most sign-in checks finish within this; saying "checking" sooner would only flash. */
export const QUIET_MS = 600;
/** Online but slow: after this long, the person who was signed in gets their data while sign-in carries on. */
export const SLOW_SIGN_IN_MS = 4000;

export type SignInWait = 'quiet' | 'waiting' | 'offline' | 'local';

/**
 * While sign-in is still being checked. The data on this device opens at once offline (sign-in cannot be checked
 * there at all), or once the check has taken a while, but only if its owner was signed in when the app last ran:
 * after a sign-out it stays closed until someone signs in.
 */
export const signInWait = ({ ownerSignedIn, online, waitedMs }: { ownerSignedIn: boolean; online: boolean; waitedMs: number }): SignInWait => {
  if (ownerSignedIn && (!online || waitedMs >= SLOW_SIGN_IN_MS)) return 'local';
  if (waitedMs < QUIET_MS) return 'quiet';
  return online ? 'waiting' : 'offline';
};
