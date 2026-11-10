/**
 * The browser's own key-value store, behind promises.
 *
 * Settings were read and written through a React Native storage package, which on the web is this same
 * `localStorage` wrapped in promises, and which brought React Native itself along as a dependency. The keys and the
 * values are unchanged, so nothing a person has saved is lost or moved.
 *
 * A call rejects when the browser refuses (storage switched off, or full); every caller already treats that as
 * "carry on without saving".
 */
const attempt = <T>(action: (store: Storage) => T): Promise<T> =>
  new Promise((resolve, reject) => {
    try {
      resolve(action(window.localStorage));
    } catch (error) {
      reject(error);
    }
  });

export const deviceStorage = {
  getItem: (key: string): Promise<string | null> => attempt((store) => store.getItem(key)),
  setItem: (key: string, value: string): Promise<void> => attempt((store) => store.setItem(key, value)),
  removeItem: (key: string): Promise<void> => attempt((store) => store.removeItem(key)),
};

export default deviceStorage;
