/**
 * paddle — loads Paddle.js v2 on demand and opens checkout for a transaction
 * the server created. The client token is public by design (VITE_ variable).
 */

type PaddleGlobal = {
  Environment: { set: (env: 'sandbox') => void };
  Initialize: (options: { token: string; eventCallback?: (event: { name: string }) => void }) => void;
  Checkout: { open: (options: { transactionId: string; settings?: Record<string, unknown> }) => void };
};

const SCRIPT_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';
let loading: Promise<PaddleGlobal> | null = null;
let onCompleted: (() => void) | null = null;

export const paddleConfigured = () => Boolean(import.meta.env.VITE_PADDLE_CLIENT_TOKEN);

function loadPaddle(): Promise<PaddleGlobal> {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const paddle = (window as unknown as { Paddle?: PaddleGlobal }).Paddle;
      if (!paddle) {
        reject(new Error('Paddle did not load'));
        return;
      }
      if (import.meta.env.VITE_PADDLE_ENV !== 'production') paddle.Environment.set('sandbox');
      paddle.Initialize({
        token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
        eventCallback: (event) => {
          if (event.name === 'checkout.completed') onCompleted?.();
        },
      });
      resolve(paddle);
    };
    // Content blockers stop the script; say so instead of a button that does nothing.
    script.onerror = () => {
      loading = null;
      reject(new Error('Paddle checkout was blocked from loading'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export async function openPaddleCheckout(transactionId: string, locale: string, completed: () => void) {
  const paddle = await loadPaddle();
  onCompleted = completed;
  paddle.Checkout.open({
    transactionId,
    settings: { displayMode: 'overlay', theme: 'light', locale: locale.startsWith('es') ? 'es' : 'en' },
  });
}
