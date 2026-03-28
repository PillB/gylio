export type SpeechOptions = {
  language?: string;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error?: unknown) => void;
};

let activeUtterance: SpeechSynthesisUtterance | null = null;

const invokeFallback = (callback?: () => void) => {
  if (callback) {
    queueMicrotask(callback);
  }
};

export const speak = (text: string, options?: SpeechOptions): void => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    invokeFallback(options?.onDone);
    return;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options?.language ?? 'en-US';
    utterance.onend = () => {
      activeUtterance = null;
      options?.onDone?.();
    };
    utterance.onerror = () => {
      activeUtterance = null;
      options?.onError?.();
    };
    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    activeUtterance = null;
    options?.onError?.(error);
  }
};

export const stop = (): void => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  if (activeUtterance) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }
};

const speechModule = { speak, stop };

export default speechModule;
