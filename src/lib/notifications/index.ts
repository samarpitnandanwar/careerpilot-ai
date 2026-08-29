import "server-only";

export {
  generateNotificationFromEvent,
  generateNotificationKey,
  isNotifiableEvent,
} from "./generator";
export type { GeneratedNotification } from "./generator";

export {
  createNotification,
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "./service";
export type { GetNotificationsOptions } from "./service";

export {
  getNotificationPreferences,
  areNotificationsEnabled,
  updateNotificationPreferences,
  NotificationPreferencesUpdateSchema,
} from "./preferences";
export type { NotificationPreferences, NotificationPreferencesUpdate } from "./preferences";

export type {
  NotificationType,
  NotificationPriority,
  FirestoreNotification,
  NotificationCreateInput,
} from "./types";

export {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY_COLORS,
  NOTIFICATION_TYPE_ICONS,
} from "./types";
