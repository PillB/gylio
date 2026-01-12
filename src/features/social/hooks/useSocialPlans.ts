import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDB, { type SocialPlan, type SocialStep } from '../../../core/hooks/useDB';
import useAccessibility from '../../../core/hooks/useAccessibility';

type NotificationsModule = typeof import('expo-notifications');

type UseSocialPlansResult = {
  plans: SocialPlan[];
  loading: boolean;
  refreshPlans: () => Promise<void>;
  addPlan: (payload: {
    title: string;
    type: SocialPlan['type'];
    dateTime?: string | null;
    steps?: SocialStep[];
    reminderMinutesBefore?: number | null;
    energyLevel?: SocialPlan['energyLevel'];
    notes?: string | null;
  }) => Promise<SocialPlan | null>;
  updatePlan: (id: number, updates: Partial<Omit<SocialPlan, 'id'>>) => Promise<SocialPlan | null>;
  removePlan: (id: number) => Promise<boolean>;
  toggleStep: (id: number, stepIndex: number) => Promise<void>;
  readPlan: (plan: SocialPlan) => Promise<void>;
};

const parseDateTime = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getReminderTriggerSeconds = (dateTime: string | null, reminderMinutesBefore: number | null) => {
  const start = parseDateTime(dateTime);
  if (!start || reminderMinutesBefore == null) return null;
  const reminderAt = new Date(start.getTime() - reminderMinutesBefore * 60 * 1000);
  const diff = reminderAt.getTime() - Date.now();
  if (diff <= 0) return null;
  return Math.floor(diff / 1000);
};

const useSocialPlans = (): UseSocialPlansResult => {
  const { t, i18n } = useTranslation();
  const { speak, ttsEnabled } = useAccessibility();
  const { ready, getSocialPlans, insertSocialPlan, updateSocialPlan, deleteSocialPlan } = useDB();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SocialPlan[]>([]);
  const notificationModuleRef = useRef<NotificationsModule | null>(null);
  const reminderIdsRef = useRef<Map<number, string>>(new Map());

  const loadNotificationsModule = useCallback(async (): Promise<NotificationsModule | null> => {
    if (notificationModuleRef.current) return notificationModuleRef.current;

    const module = await import('expo-notifications').catch(() => null);
    if (!module) {
      console.warn('Notifications are not available in this environment');
      return null;
    }
    notificationModuleRef.current = module;
    return module;
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    const notifications = await loadNotificationsModule();
    if (!notifications) return false;

    const current = await notifications.getPermissionsAsync();
    if (current.granted || current.status === 'granted') return true;

    const requested = await notifications.requestPermissionsAsync();
    return requested.granted || requested.status === 'granted';
  }, [loadNotificationsModule]);

  const scheduleReminder = useCallback(
    async (plan: SocialPlan) => {
      const notifications = await loadNotificationsModule();
      if (!notifications) return;

      const seconds = getReminderTriggerSeconds(plan.dateTime, plan.reminderMinutesBefore);
      if (seconds == null) return;

      const permissionGranted = await requestNotificationPermission();
      if (!permissionGranted) return;

      const existingId = reminderIdsRef.current.get(plan.id);
      if (existingId) {
        try {
          await notifications.cancelScheduledNotificationAsync(existingId);
        } catch (error) {
          // If cancel fails, continue to schedule a new reminder.
        }
      }

      try {
        const notificationId = await notifications.scheduleNotificationAsync({
          content: {
            title: t('social.reminderTitle'),
            body: t('social.reminderBody', { title: plan.title }),
            sound: ttsEnabled
          },
          trigger: { seconds }
        });
        reminderIdsRef.current.set(plan.id, notificationId);
      } catch (error) {
        console.warn('Unable to schedule social reminder', error);
      }
    },
    [loadNotificationsModule, requestNotificationPermission, t, ttsEnabled]
  );

  const refreshPlans = useCallback(async () => {
    if (!ready) return;

    setLoading(true);
    try {
      const fetched = await getSocialPlans();
      setPlans(fetched);
    } catch (error) {
      console.error('Failed to load social plans', error);
    } finally {
      setLoading(false);
    }
  }, [getSocialPlans, ready]);

  useEffect(() => {
    refreshPlans();
  }, [refreshPlans]);

  const addPlan = useCallback(
    async ({
      title,
      type,
      dateTime = null,
      steps = [],
      reminderMinutesBefore = null,
      energyLevel = 'LOW',
      notes = null
    }: {
      title: string;
      type: SocialPlan['type'];
      dateTime?: string | null;
      steps?: SocialStep[];
      reminderMinutesBefore?: number | null;
      energyLevel?: SocialPlan['energyLevel'];
      notes?: string | null;
    }) => {
      const trimmed = title.trim();
      if (!trimmed) return null;

      try {
        const created = await insertSocialPlan(
          trimmed,
          type,
          dateTime,
          steps,
          reminderMinutesBefore,
          energyLevel,
          notes
        );
        setPlans((prev) => [created, ...prev]);
        await scheduleReminder(created);
        await refreshPlans();
        return created;
      } catch (error) {
        console.error('Failed to create social plan', error);
        return null;
      }
    },
    [insertSocialPlan, refreshPlans, scheduleReminder]
  );

  const updatePlan = useCallback(
    async (id: number, updates: Partial<Omit<SocialPlan, 'id'>>) => {
      try {
        const updated = await updateSocialPlan(id, updates);
        if (!updated) return null;
        setPlans((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
        await scheduleReminder(updated);
        await refreshPlans();
        return updated;
      } catch (error) {
        console.error('Failed to update social plan', error);
        return null;
      }
    },
    [refreshPlans, scheduleReminder, updateSocialPlan]
  );

  const removePlan = useCallback(
    async (id: number) => {
      try {
        const removed = await deleteSocialPlan(id);
        if (removed) {
          setPlans((prev) => prev.filter((plan) => plan.id !== id));
        }
        return removed;
      } catch (error) {
        console.error('Failed to delete social plan', error);
        return false;
      }
    },
    [deleteSocialPlan]
  );

  const toggleStep = useCallback(
    async (id: number, stepIndex: number) => {
      const target = plans.find((plan) => plan.id === id);
      if (!target) return;
      const currentStep = target.steps[stepIndex];
      if (!currentStep) return;

      const updatedSteps = target.steps.map((step, index) =>
        index === stepIndex ? { ...step, done: !step.done } : step
      );

      try {
        const updated = await updateSocialPlan(id, { steps: updatedSteps });
        if (!updated) return;
        setPlans((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
        await refreshPlans();
      } catch (error) {
        console.error('Failed to update social step', error);
      }
    },
    [plans, refreshPlans, updateSocialPlan]
  );

  const readPlan = useCallback(
    async (plan: SocialPlan) => {
      const date = parseDateTime(plan.dateTime);
      const dateLabel = date
        ? new Intl.DateTimeFormat(i18n.language, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          }).format(date)
        : t('social.dateTimeOptional');
      const typeLabel = t(`social.type.${plan.type.toLowerCase()}`);
      const energyLabel = t(`social.energy.${plan.energyLevel.toLowerCase()}`);
      const summary = t('social.readSummary', {
        title: plan.title,
        type: typeLabel,
        energy: energyLabel,
        dateTime: dateLabel
      });
      await speak(summary);
    },
    [i18n.language, speak, t]
  );

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => (a.createdAt && b.createdAt ? b.createdAt.localeCompare(a.createdAt) : b.id - a.id)),
    [plans]
  );

  return {
    plans: sortedPlans,
    loading,
    refreshPlans,
    addPlan,
    updatePlan,
    removePlan,
    toggleStep,
    readPlan
  };
};

export default useSocialPlans;
