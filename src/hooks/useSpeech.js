/**
 * useSpeech
 *
 * Lightweight wrapper around the Web Speech API. Expo modules are intentionally
 * not imported to keep the Vite web bundle lean and avoid dependency conflicts.
 */
export function useSpeech() {
  const speak = (text, options = {}) => {
    const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

    if (synthesis && typeof SpeechSynthesisUtterance !== 'undefined') {
      const utterance = new SpeechSynthesisUtterance(text);
      if (options.language) utterance.lang = options.language;
      synthesis.speak(utterance);
      return;
    }

    console.warn('TTS is not available in this environment');
  };

  return speak;
}
