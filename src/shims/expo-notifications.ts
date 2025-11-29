export type NotificationPermissionStatus = 'undetermined' | 'denied' | 'granted';

export type NotificationPermissionsResponse = {
  status: NotificationPermissionStatus;
  granted: boolean;
};

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
}): Promise<void> => {
  if (typeof Notification === 'undefined') return;

  const delay = Math.max(0, Math.round((trigger?.seconds ?? 0) * 1000));
  setTimeout(() => {
    if (Notification.permission === 'granted') {
      // eslint-disable-next-line no-new
      new Notification(content.title ?? '', { body: content.body });
    }
  }, delay);
};
