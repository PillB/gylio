// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { speak, stop } from './expo-speech';

describe('expo-speech web shim', () => {
  it('calls speechSynthesis when available', () => {
    const speakSpy = vi.fn();
    const cancelSpy = vi.fn();

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak: speakSpy,
        cancel: cancelSpy,
      },
    });

    class MockSpeechSynthesisUtterance {
      text: string;
      lang = '';
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor(input: string) {
        this.text = input;
      }
    }

    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    });

    speak('Hello world', { language: 'en-US' });
    expect(speakSpy).toHaveBeenCalledTimes(1);

    stop();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('gracefully resolves when speech APIs are unavailable', async () => {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: undefined,
    });

    const onDone = vi.fn();
    speak('fallback', { onDone });
    await Promise.resolve();

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
