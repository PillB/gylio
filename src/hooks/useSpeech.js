import { getSpeechOptions } from '../utils/speechOptions.js';

/**
 * useSpeech
 *
 * A small wrapper around Expo's Text‑to‑Speech API. Returns a function that
 * speaks the provided text aloud. In a browser context this will silently
 * do nothing unless polyfilled by Expo's web implementation. Consumers
 * should guard against undefined behaviour by checking for Speech.speak.
 */
export function useSpeech() {
  let speechModule;

  const speak = (text) => {
    if (!text?.trim()) {
      return;
    }

    if (!speechModule) {
      try {
        // Lazy-load to avoid import errors in environments without Expo Speech
        // support (e.g., web). This keeps the API synchronous for consumers.
        // eslint-disable-next-line global-require
        speechModule = require('expo-speech');
      } catch (error) {
        console.warn('TTS is not available in this environment');
        return;
      }
    }

    if (speechModule && typeof speechModule.speak === 'function') {
      speechModule.speak(text.trim(), getSpeechOptions());
    } else {
      console.warn('TTS is not available in this environment');
    }
  };

  return speak;
}
