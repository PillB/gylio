export type NotificationPermissionStatus = 'undetermined' | 'denied' | 'granted';

export type NotificationPermissionsResponse = {
  status: NotificationPermissionStatus;
  granted: boolean;
};

// Web reminders are page-lifetime timers; ids let callers replace a reminder instead of stacking duplicates.
const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>();
let nextNotificationId = 0;

export const AuthorizationStatus = {
  GRANTED: 'granted' as NotificationPermissionStatus,
  DENIED: 'denied' as NotificationPermissionStatus,
  UNDETERMINED: 'undetermined' as NotificationPermissionStatus,
};

const resolvePermissionStatus = (permission: NotificationPermission | null): NotificationPermissionsResponse => {
  if (permission === 'granted') return { status: 'granted', granted: true };
  if (permission === 'denied') return { status: 'denied', granted: false };
  return { status: 'undetermined', granted: false };
};

export const getPermissionsAsync = async (): Promise<NotificationPermissionsResponse> => {
  if (typeof Notification === 'undefined' || !Notification.permission) {
    return { status: 'denied', granted: false };
  }

  return resolvePermissionStatus(Notification.permission);
};

export const requestPermissionsAsync = async (): Promise<NotificationPermissionsResponse> => {
  if (typeof Notification === 'undefined' || !Notification.requestPermission) {
    return { status: 'denied', granted: false };
  }

  const permission = await Notification.requestPermission();
  return resolvePermissionStatus(permission);
};

export const scheduleNotificationAsync = async ({
  content,
  trigger,
}: {
  content: { title?: string; body?: string; sound?: boolean };
  trigger?: { seconds?: number } | null;
}): Promise<string> => {
  const id = `web-notification-${(nextNotificationId += 1)}`;
  if (typeof Notification === 'undefined') return id;

  const delay = Math.max(0, Math.round((trigger?.seconds ?? 0) * 1000));
  const timer = setTimeout(() => {
    scheduledTimers.delete(id);
    if (Notification.permission === 'granted') {
      new Notification(content.title ?? '', { body: content.body });
    }
  }, delay);
  scheduledTimers.set(id, timer);
  return id;
};

/** Cancels a reminder scheduled in this page session; unknown ids are ignored. */
export const cancelScheduledNotificationAsync = async (id: string): Promise<void> => {
  const timer = scheduledTimers.get(id);
  if (timer === undefined) return;
  clearTimeout(timer);
  scheduledTimers.delete(id);
};
