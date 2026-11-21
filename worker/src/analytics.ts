/**
 * Product-analytics events from the app, checked before they are stored.
 *
 * Events describe what happened ("paywall_viewed"), never who: there is no account id, email or free text.
 * Names and property keys must be identifiers; property values are short strings, finite numbers or booleans.
 * Anything else is dropped rather than stored. Same rules as the old server (server/analytics/validateEvents.js).
 */
export const MAX_EVENTS = 50;
const MAX_PROPS = 20;
const MAX_STRING = 100;
const NAME = /^[a-z][a-z0-9_]{1,63}$/;
const PROP_KEY = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;
const SESSION = /^[A-Za-z0-9_-]{1,64}$/;
const EVENT_ID = /^[A-Za-z0-9_-]{8,64}$/;

export type StoredEvent = { eventId: string; name: string; sessionId: string; signedIn: boolean; props: Record<string, string | number | boolean>; receivedAt: number };

const cleanValue = (value: unknown): string | number | boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') return value.slice(0, MAX_STRING);
  return undefined;
};

const cleanProps = (raw: unknown): StoredEvent['props'] => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const props: StoredEvent['props'] = {};
  for (const [key, value] of Object.entries(raw)) {
    if (Object.keys(props).length >= MAX_PROPS) break;
    const cleaned = PROP_KEY.test(key) ? cleanValue(value) : undefined;
    if (cleaned !== undefined) props[key] = cleaned;
  }
  return props;
};

type Incoming = { id?: unknown; name?: unknown; sessionId?: unknown; signedIn?: unknown; props?: unknown };

const usable = (event: unknown): event is Incoming & { name: string; sessionId: string } => {
  if (!event || typeof event !== 'object') return false;
  const { name, sessionId } = event as Incoming;
  return typeof name === 'string' && NAME.test(name) && typeof sessionId === 'string' && SESSION.test(sessionId);
};

/** The events to store (unusable ones skipped), or why the whole request is refused. */
export const validateEvents = (body: Record<string, unknown>, now: number): { events: StoredEvent[] } | { error: string } => {
  const raw = Array.isArray(body.events) ? (body.events as unknown[]) : null;
  if (!raw) return { error: 'events must be an array' };
  if (raw.length > MAX_EVENTS) return { error: `at most ${MAX_EVENTS} events per request` };
  const events = raw.filter(usable).map((event) => ({
    // The app's own id makes a re-sent event (page closed mid-upload) count once.
    eventId: typeof event.id === 'string' && EVENT_ID.test(event.id) ? event.id : `srv-${crypto.randomUUID()}`,
    name: event.name,
    sessionId: event.sessionId,
    signedIn: event.signedIn === true,
    props: cleanProps(event.props),
    receivedAt: now,
  }));
  return { events };
};

/** D1 binds at most 100 values per statement; six per event. */
export const ROWS_PER_INSERT = 16;
