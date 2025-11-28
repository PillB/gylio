import * as Speech from 'expo-speech';

/**
 * useSpeech
 *
 * A small wrapper around Expo's Text‑to‑Speech API.  Returns a function that
 * speaks the provided text aloud.  In a browser context this will silently
 * do nothing unless polyfilled by Expo's web implementation.  Consumers
 * should guard against undefined behaviour by checking for Speech.speak.
 */
export function useSpeech() {
  const speak = (text) => {
    if (Speech && typeof Speech.speak === 'function') {
      Speech.speak(text, { language: 'en' });
    } else {
      console.warn('TTS is not available in this environment');
    }
  };

  return speak;
}