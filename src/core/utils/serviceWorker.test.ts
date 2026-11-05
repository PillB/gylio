import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from './serviceWorker';

const register = vi.fn(() => Promise.resolve());

afterEach(() => {
  register.mockClear();
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('registerServiceWorker', () => {
  it('registers the build’s worker under the base path', () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });
    registerServiceWorker(true);
    expect(register).toHaveBeenCalledWith(new URL(`${import.meta.env.BASE_URL}service-worker.js`, window.location.origin).toString());
  });

  it('does nothing on the dev server, which has no worker file', () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });
    registerServiceWorker(false);
    expect(register).not.toHaveBeenCalled();
  });
});
