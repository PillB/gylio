/**
 * Two small signals about the app database, sent as DOM events so the database shim, the sync layer and the
 * screens need not import each other.
 *
 *  - LOCAL_WRITE: this tab saved something. The sync layer listens, to notice what changed.
 *  - DATA_CHANGED: rows changed behind the screens' backs (a server change arrived, or another tab saved).
 *    Screens listen, to reload quietly. Saves made by a screen itself do not send it: that screen already knows.
 */
export const LOCAL_WRITE = 'gylio:local-write';
export const DATA_CHANGED = 'gylio:data-changed';

const send = (name: string) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(name));
};

const listen = (name: string, listener: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(name, listener);
  return () => window.removeEventListener(name, listener);
};

export const announceLocalWrite = () => send(LOCAL_WRITE);
export const announceDataChanged = () => send(DATA_CHANGED);
export const onLocalWrite = (listener: () => void) => listen(LOCAL_WRITE, listener);
export const onDataChanged = (listener: () => void) => listen(DATA_CHANGED, listener);
