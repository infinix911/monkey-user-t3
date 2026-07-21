/**
 * Notification backend contract (monkey-user-api /notifications).
 *
 * Wire shape is camelCase. The mapper normalizes it to the snake_case shape
 * the dropdown renders.
 */

import { z } from "zod";

export const notificationWireSchema = z.object({
  id: z.number(),
  category: z.string(),
  title: z.string(),
  message: z.string(),
  isRead: z.boolean(),
  pagePath: z.string(),
  createdAt: z.string(),
});
export type NotificationWire = z.infer<typeof notificationWireSchema>;

export const notificationsResponseSchema = z.array(notificationWireSchema);

/** Normalized notification consumed by NotificationDropdown. */
export interface NotificationItem {
  id: number;
  category: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  page_path: string;
}

export const mapNotification = (w: NotificationWire): NotificationItem => ({
  id: w.id,
  category: w.category,
  title: w.title,
  message: w.message,
  created_at: w.createdAt,
  page_path: w.pagePath,
  is_read: w.isRead,
});
