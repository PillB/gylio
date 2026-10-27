/**
 * How a row of the app's own database becomes a record the server stores, and back.
 *
 * The server keeps five kinds of record (worker/src/schemas.ts). Each row carries a `syncId` column: an id chosen on
 * the device that made the row, the same on every device. The row's own number (`id`) stays private to one device,
 * which is why the two links between records (a task's calendar event, an event's task) travel as sync ids.
 *
 * Everything here is a pure function of its inputs: no storage, no network, no clock.
 */
import type { EntityName, RecordData } from './types';

export const SYNCED_TABLES: readonly EntityName[] = ['tasks', 'events', 'budgets', 'transactions', 'debts'];

export const isSyncedTable = (name: string): name is EntityName => (SYNCED_TABLES as readonly string[]).includes(name);

/** A row as the app database returns it. */
export type Row = Record<string, unknown>;

/** Looks up the other end of a link, by the number a row has on this device or by the id every device shares. */
export type LinkLookup = {
  syncIdOf(table: EntityName, localId: unknown): string | null;
  localIdOf(table: EntityName, syncId: string): number | null;
};

type Kind = 'text' | 'number' | 'int' | 'flag' | 'list' | 'steps' | 'energy' | 'status' | 'link';
type Field = { name: string; kind: Kind; target?: EntityName };

const field = (name: string, kind: Kind, target?: EntityName): Field => ({ name, kind, target });

/** The fields of each record, in the order the schemas list them. A field not listed here is never sent. */
const FIELDS: Record<EntityName, Field[]> = {
  tasks: [
    field('title', 'text'),
    field('status', 'status'),
    field('subtasks', 'steps'),
    field('plannedDate', 'text'),
    field('calendarEventId', 'link', 'events'),
    field('focusPresetMinutes', 'int'),
    field('energyRequired', 'energy'),
    field('implementationIntention', 'text'),
    field('createdAt', 'text'),
  ],
  events: [
    field('title', 'text'),
    field('description', 'text'),
    field('startDate', 'text'),
    field('endDate', 'text'),
    field('location', 'text'),
    field('taskId', 'link', 'tasks'),
    field('reminderMinutesBefore', 'int'),
    field('createdAt', 'text'),
  ],
  budgets: [field('month', 'text'), field('income', 'list'), field('categories', 'list'), field('createdAt', 'text')],
  transactions: [
    field('budgetMonth', 'text'),
    field('amount', 'number'),
    field('categoryName', 'text'),
    field('isNeed', 'flag'),
    field('date', 'text'),
    field('note', 'text'),
    field('createdAt', 'text'),
  ],
  debts: [
    field('name', 'text'),
    field('balance', 'number'),
    field('annualRate', 'number'),
    field('minPayment', 'number'),
    field('categoryName', 'text'),
    field('dueDay', 'int'),
    field('createdAt', 'text'),
  ],
};

// ---- reading what the database holds ------------------------------------------------------------

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const finite = (value: unknown): number | null => {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

const whole = (value: unknown): number | null => {
  const n = finite(value);
  return n !== null && Number.isInteger(n) ? n : null;
};

const parseList = (value: unknown): unknown[] => {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(parsed) ? parsed : [];
};

const stepOf = (item: unknown): { label: string; done: boolean } | null => {
  if (typeof item === 'string') return item.trim() === '' ? null : { label: item, done: false };
  const entry = item as { label?: unknown; done?: unknown } | null;
  if (!entry || typeof entry !== 'object' || typeof entry.label !== 'string' || entry.label.trim() === '') return null;
  return { label: entry.label, done: entry.done === true };
};

const steps = (value: unknown) => parseList(value).flatMap((item) => stepOf(item) ?? []);

const ENERGY = ['tiny', 'low', 'medium', 'high'];
const STATUS_FALLBACK = 'pending';

/** What the server should be sent for a stored value. `link` is handled apart, because it needs the other rows. */
const READ: Record<Exclude<Kind, 'link'>, (value: unknown) => unknown> = {
  text,
  number: finite,
  int: whole,
  flag: (value) => value === true || value === 1 || value === '1',
  list: parseList,
  steps,
  energy: (value) => (typeof value === 'string' && ENERGY.includes(value) ? value : 'medium'),
  status: (value) => (typeof value === 'string' && value !== '' ? value : STATUS_FALLBACK),
};

/** What to store for a value the server sent. */
const WRITE: Record<Exclude<Kind, 'link'>, (value: unknown) => unknown> = {
  text: (value) => text(value),
  number: (value) => finite(value) ?? 0,
  int: whole,
  flag: (value) => (value === true ? 1 : 0),
  list: (value) => JSON.stringify(Array.isArray(value) ? value : []),
  steps: (value) => JSON.stringify(Array.isArray(value) ? value : []),
  energy: READ.energy,
  status: READ.status,
};

/**
 * The record to send for a row. `pendingLink` is the other end of a link that has not reached this device yet
 * (see `fromRemote`): it is sent along, so editing something else on the row never erases a link made elsewhere.
 */
export const toRemote = (table: EntityName, row: Row, links: LinkLookup, pendingLink?: string | null): RecordData => {
  const data: RecordData = {};
  for (const { name, kind, target } of FIELDS[table]) {
    if (kind !== 'link') {
      data[name] = READ[kind](row[name]);
      continue;
    }
    data[name] = links.syncIdOf(target as EntityName, row[name]) ?? pendingLink ?? null;
  }
  return data;
};

export type StoredValues = { columns: Row; unresolvedLink: string | null };

/**
 * The columns to store for a record the server sent. A link whose other end is not on this device yet is left
 * empty and handed back as `unresolvedLink`, to be filled in when that record arrives.
 */
export const fromRemote = (table: EntityName, data: RecordData, links: LinkLookup): StoredValues => {
  const columns: Row = {};
  let unresolvedLink: string | null = null;
  for (const { name, kind, target } of FIELDS[table]) {
    const value = data[name];
    if (kind !== 'link') {
      // A creation time the server does not have is left out, so the database fills in "now".
      if (name !== 'createdAt' || typeof value === 'string') columns[name] = WRITE[kind](value);
      continue;
    }
    const wanted = typeof value === 'string' && value !== '' ? value : null;
    const local = wanted === null ? null : links.localIdOf(target as EntityName, wanted);
    columns[name] = local;
    if (wanted !== null && local === null) unresolvedLink = wanted;
  }
  return { columns, unresolvedLink };
};

/** The link column of a table and the table it points to, if it has one. */
export const linkOf = (table: EntityName): { column: string; target: EntityName } | null => {
  const link = FIELDS[table].find((f) => f.kind === 'link');
  return link ? { column: link.name, target: link.target as EntityName } : null;
};

// ---- recognising a change -----------------------------------------------------------------------

/** JSON with the keys sorted, so two records with the same content always give the same text. */
export const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};

/** A 53-bit hash (cyrb53): not secret, only a cheap way to tell whether a record's content changed. */
const hash53 = (input: string): number => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

export const fingerprint = (data: RecordData): string => {
  const json = canonicalJson(data);
  return `${json.length.toString(36)}-${hash53(json).toString(36)}`;
};

// ---- ids ----------------------------------------------------------------------------------------

const HEX = '0123456789abcdef';

/** A new id for a row: a UUID where the browser can make one, otherwise 32 random hex digits. Always fits the server's id rule. */
export const newSyncId = (): string => {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => HEX[b >> 4] + HEX[b & 15]).join('');
};

/** The same rule the Worker applies to ids in the path (worker/src/index.ts). */
export const isValidSyncId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
