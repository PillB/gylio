import { useCallback, useEffect, useRef, useState } from 'react';

export type PomodoroStatus = 'idle' | 'running' | 'paused' | 'done';

export type UsePomodoroTimerResult = {
  status: PomodoroStatus;
  remainingSeconds: number;
  totalSeconds: number;
  start: (durationSeconds: number) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
};

const usePomodoroTimer = (): UsePomodoroTimerResult => {
  const [status, setStatus] = useState<PomodoroStatus>('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = useCallback((durationSeconds: number) => {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return;
    clearTimer();
    const seconds = Math.round(durationSeconds);
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
    setStatus('running');
  }, []);

  const pause = useCallback(() => {
    setStatus((prev) => (prev === 'running' ? 'paused' : prev));
  }, []);

  const resume = useCallback(() => {
    setStatus((prev) => (prev === 'paused' ? 'running' : prev));
  }, []);

  const cancel = useCallback(() => {
    clearTimer();
    setStatus('idle');
    setRemainingSeconds(0);
    setTotalSeconds(0);
  }, []);

  useEffect(() => {
    if (status !== 'running') {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearTimer();
          setStatus('done');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [status]);

  return { status, remainingSeconds, totalSeconds, start, pause, resume, cancel };
};

export default usePomodoroTimer;
