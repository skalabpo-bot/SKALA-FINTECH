
import { supabase } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

type NotificationCallback = (notification: any) => void;
type CommentCallback = (comment: any) => void;

let notificationChannel: RealtimeChannel | null = null;
let commentChannels: Map<string, RealtimeChannel> = new Map();

/**
 * Suscribirse a notificaciones en tiempo real para un usuario.
 * Cuando llega una nueva notificación, se invoca el callback.
 */
export const subscribeToNotifications = (userId: string, onNew: NotificationCallback): (() => void) => {
  // Limpiar suscripción anterior si existe
  if (notificationChannel) {
    supabase.removeChannel(notificationChannel);
    notificationChannel = null;
  }

  notificationChannel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const n = payload.new as any;
        onNew({
          id: n.id,
          userId: n.user_id,
          title: n.title,
          message: n.message,
          type: n.type,
          isRead: n.is_read,
          creditId: n.credit_id,
          createdAt: new Date(n.created_at),
        });
      }
    )
    .subscribe();

  return () => {
    if (notificationChannel) {
      supabase.removeChannel(notificationChannel);
      notificationChannel = null;
    }
  };
};

/**
 * Suscribirse a nuevos comentarios en tiempo real para un crédito específico.
 */
export const subscribeToComments = (creditId: string, onNew: CommentCallback): (() => void) => {
  // Limpiar suscripción anterior para este crédito
  const existing = commentChannels.get(creditId);
  if (existing) {
    supabase.removeChannel(existing);
    commentChannels.delete(creditId);
  }

  const channel = supabase
    .channel(`comments:${creditId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `credit_id=eq.${creditId}`,
      },
      (payload) => {
        const c = payload.new as any;
        onNew({
          id: c.id,
          userId: c.user_id,
          text: c.text,
          isSystem: c.is_system,
          attachmentName: c.attachment_name,
          attachmentUrl: c.attachment_url,
          createdAt: new Date(c.created_at),
        });
      }
    )
    .subscribe();

  commentChannels.set(creditId, channel);

  return () => {
    const ch = commentChannels.get(creditId);
    if (ch) {
      supabase.removeChannel(ch);
      commentChannels.delete(creditId);
    }
  };
};

/**
 * Suscribirse a cambios en el historial de un crédito (audit log en tiempo real).
 */
export const subscribeToCreditHistory = (creditId: string, onNew: (entry: any) => void): (() => void) => {
  const channel = supabase
    .channel(`history:${creditId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'credit_history',
        filter: `credit_id=eq.${creditId}`,
      },
      (payload) => {
        const h = payload.new as any;
        onNew({
          id: h.id,
          date: new Date(h.created_at),
          action: h.action,
          description: h.description,
          userId: h.user_id,
          changes: h.changes,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Limpia todas las suscripciones realtime (llamar al hacer logout).
 */
export const cleanupAllSubscriptions = () => {
  if (notificationChannel) {
    supabase.removeChannel(notificationChannel);
    notificationChannel = null;
  }
  commentChannels.forEach((ch) => supabase.removeChannel(ch));
  commentChannels.clear();
};
