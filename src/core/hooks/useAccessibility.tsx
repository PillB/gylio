import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useOnboardingFlow from '../../hooks/useOnboardingFlow.jsx';

const TINT_STORAGE_KEY = 'accessibility:tint';

type SpeechModule = {
  speak: (text: string, options?: Record<string, any>) => void;
  stop?: () => void;
};

type AccessibilityContextValue = {
  speak: (text?: string) => Promise<void>;
  isSpeaking: boolean;
  toggleTint: () => void;
  isTinted: boolean;
  motionPreference: MotionPreference;
  setMotionPreference: (preference: MotionPreference) => void;
  textStylePreference: TextStylePreference;
  setTextStylePreference: (preference: TextStylePreference) => void;
  ttsEnabled: boolean;
  setTtsEnabled: (enabled: boolean) => void;
};

type MotionPreference = 'reduced' | 'standard' | '';
type TextStylePreference = 'dyslexic' | 'standard' | 'large' | '';

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

function useAccessibilityInternal(): AccessibilityContextValue {
  const { selections, hydrated, updateSelections } = useOnboardingFlow();
  const [isTinted, setIsTinted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechModuleRef = useRef<SpeechModule | null>(null);
  const activeUtteranceRef = useRef(0);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(TINT_STORAGE_KEY)
      .then((stored) => {
        setIsTinted(stored === 'true');
      })
      .catch(() => {
        // Non-blocking persistence failure.
      });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(TINT_STORAGE_KEY, isTinted ? 'true' : 'false').catch(() => {
      // Ignore persistence issues to avoid blocking UI.
    });
  }, [isTinted]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const motionPreference = useMemo<MotionPreference>(
    () => selections?.accessibility?.motion ?? '',
    [selections]
  );
  const textStylePreference = useMemo<TextStylePreference>(
    () => selections?.accessibility?.textStyle ?? '',
    [selections]
  );
  const ttsEnabled = useMemo(() => Boolean(selections?.accessibility?.tts), [selections]);
  const ttsOptIn = useMemo(() => hydrated && ttsEnabled, [hydrated, ttsEnabled]);

  const loadSpeechModule = useCallback(async () => {
    if (speechModuleRef.current) return speechModuleRef.current;

    try {
      const av = await import('expo-av');
      if (av?.Speech?.speak) {
        speechModuleRef.current = av.Speech as SpeechModule;
        return speechModuleRef.current;
      }
    } catch (error) {
      // Fallback to expo-speech below.
    }

    try {
      const speech = await import('expo-speech');
      speechModuleRef.current = speech as SpeechModule;
      return speechModuleRef.current;
    } catch (error) {
      console.warn('TTS is not available in this environment');
    }

    return null;
  }, []);

  const speak = useCallback(
    async (text?: string) => {
      if (!ttsOptIn || !text?.trim()) return;

      const speechModule = await loadSpeechModule();
      if (!speechModule?.speak) return;

      if (isSpeakingRef.current && speechModule.stop) {
        speechModule.stop();
      }

      const utteranceId = activeUtteranceRef.current + 1;
      activeUtteranceRef.current = utteranceId;
      setIsSpeaking(true);

      speechModule.speak(text.trim(), {
        language: 'en',
        onDone: () => {
          if (activeUtteranceRef.current === utteranceId) {
            setIsSpeaking(false);
          }
        },
        onStopped: () => {
          if (activeUtteranceRef.current === utteranceId) {
            setIsSpeaking(false);
          }
        },
        onError: () => {
          if (activeUtteranceRef.current === utteranceId) {
            setIsSpeaking(false);
          }
        }
      });
    },
    [loadSpeechModule, ttsOptIn]
  );

  const toggleTint = useCallback(() => {
    setIsTinted((prev) => !prev);
  }, []);

  const setMotionPreference = useCallback(
    (preference: MotionPreference) => updateSelections('accessibility', { motion: preference }),
    [updateSelections]
  );

  const setTextStylePreference = useCallback(
    (preference: TextStylePreference) => updateSelections('accessibility', { textStyle: preference }),
    [updateSelections]
  );

  const setTtsEnabled = useCallback(
    (enabled: boolean) => updateSelections('accessibility', { tts: enabled }),
    [updateSelections]
  );

  return {
    speak,
    isSpeaking,
    toggleTint,
    isTinted,
    motionPreference,
    setMotionPreference,
    textStylePreference,
    setTextStylePreference,
    ttsEnabled,
    setTtsEnabled
  };
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const value = useAccessibilityInternal();
  const memoized = useMemo(() => value, [value]);

  return <AccessibilityContext.Provider value={memoized}>{children}</AccessibilityContext.Provider>;
}

export default function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
