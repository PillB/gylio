import { describe, expect, it } from 'vitest';
import { serverCopyOf } from './legacyConflict';

describe('serverCopyOf', () => {
  it("reads the record inside the Worker's 409 answer, not the wrapper", () => {
    const answer = {
      error: { code: 'CONFLICT', message: 'Server copy changed since your version' },
      current: { entity: 'task', id: '7', version: 3, deleted: false, data: { title: 'Water plants', status: 'pending' } },
    };
    expect(serverCopyOf('task', answer)).toEqual({ kind: 'record', record: { title: 'Water plants', status: 'pending' } });
  });

  it('reads a record sent on its own (the older API)', () => {
    expect(serverCopyOf('event', { title: 'Dentist', startDate: '2026-11-02T10:00' })).toMatchObject({ kind: 'record' });
  });

  it('treats only an explicit tombstone as deleted on the server', () => {
    expect(serverCopyOf('task', { error: {}, current: { id: '7', deleted: true } })).toEqual({ kind: 'deleted' });
  });

  it('never offers a copy that would wipe the local record', () => {
    expect(serverCopyOf('task', null)).toEqual({ kind: 'unreadable' });
    expect(serverCopyOf('task', { error: { code: 'CONFLICT' }, current: null })).toEqual({ kind: 'unreadable' });
    expect(serverCopyOf('task', { error: { code: 'CONFLICT' } })).toEqual({ kind: 'unreadable' });
    expect(serverCopyOf('task', { current: { deleted: false, data: { title: '   ' } } })).toEqual({ kind: 'unreadable' });
    expect(serverCopyOf('transaction', { current: { deleted: false, data: { note: 'no amount' } } })).toEqual({ kind: 'unreadable' });
    expect(serverCopyOf('task', ['not', 'a', 'record'])).toEqual({ kind: 'unreadable' });
  });
});
