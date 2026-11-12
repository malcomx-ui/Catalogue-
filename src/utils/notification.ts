export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
}

type NotificationListener = (notification: AppNotification) => void;
const listeners = new Set<NotificationListener>();

/**
 * Clean UI notification helper function
 * Replaces window.alert with an in-app animated toast notification banner.
 */
export function showCleanMessage(message: string, type: NotificationType = 'info'): void {
  const notification: AppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    message,
    type,
  };

  listeners.forEach((listener) => {
    try {
      listener(notification);
    } catch (e) {
      console.warn('Notification listener error:', e);
    }
  });

  if (type === 'error') {
    console.error(`[Notification: ${type.toUpperCase()}]`, message);
  } else if (type === 'warning') {
    console.warn(`[Notification: ${type.toUpperCase()}]`, message);
  } else {
    console.log(`[Notification: ${type.toUpperCase()}]`, message);
  }
}

export function subscribeToNotifications(listener: NotificationListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Attach to window object for console access
if (typeof window !== 'undefined') {
  (window as any).showCleanMessage = showCleanMessage;
}
