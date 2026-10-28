/**
 * The decisions behind AccountDataGate and the sign-in wait, kept free of React so each case is one line to test.
 */
import { decideOwner, NoRoomToSetAside, setOwnerSignedIn, switchOwner, writeOwner, type OwnerDecision } from './deviceOwner';

export type GateStep = 'wait' | 'signed-out' | OwnerDecision;

type AuthSoFar = { isLoaded: boolean; isSignedIn?: boolean | null; userId?: string | null };

/** What to do with what sign-in knows so far, when the data on this device belongs to `owner` (null: nobody yet). */
export const gateStep = ({ isLoaded, isSignedIn, userId }: AuthSoFar, owner: string | null): GateStep => {
  if (!isLoaded) return 'wait';
  if (!isSignedIn || !userId) return 'signed-out';
  return decideOwner(owner, userId);
};

export type StepOutcome = 'show' | 'reload' | 'no-room';

/** The steps that only record who is here; gateStep returns 'claim' and 'same' only with a user id. */
const RECORD: Partial<Record<GateStep, (storage: Storage, userId: string) => void>> = {
  claim: (storage, userId) => {
    writeOwner(userId, storage);
    setOwnerSignedIn(true, storage);
  },
  same: (storage) => setOwnerSignedIn(true, storage),
  'signed-out': (storage) => setOwnerSignedIn(false, storage),
};

/**
 * Carries out a step. Only a switch changes what is on the device, and the page then reloads, because every screen
 * read the previous person's data when it started.
 */
export const applyStep = (step: GateStep, owner: string | null, userId: string | null | undefined, storage: Storage): StepOutcome => {
  try {
    if (step === 'switch' && owner && userId) {
      switchOwner(storage, owner, userId);
      return 'reload';
    }
    RECORD[step]?.(storage, userId ?? '');
  } catch (error) {
    // A full device can refuse the owner mark as well; only a refused switch must keep the data hidden.
    if (error instanceof NoRoomToSetAside) return 'no-room';
  }
  return 'show';
};

/** Most sign-in checks finish within this; saying "checking" sooner would only flash. */
export const QUIET_MS = 600;
/** Online but slow: after this long, the person who was signed in gets their data while sign-in carries on. */
export const SLOW_SIGN_IN_MS = 4000;

export type SignInWait = 'quiet' | 'waiting' | 'local';

/**
 * While sign-in is still being checked. The data on this device opens at once offline (sign-in cannot be checked
 * there at all), or once the check has taken a while, but only if its owner was signed in when the app last ran:
 * after a sign-out it stays closed until someone signs in.
 */
export const signInWait = ({ ownerSignedIn, online, waitedMs }: { ownerSignedIn: boolean; online: boolean; waitedMs: number }): SignInWait => {
  if (ownerSignedIn && (!online || waitedMs >= SLOW_SIGN_IN_MS)) return 'local';
  return waitedMs >= QUIET_MS ? 'waiting' : 'quiet';
};
