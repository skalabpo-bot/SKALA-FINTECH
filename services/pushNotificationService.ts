
import { supabase } from './supabaseClient';

// VAPID public key — la misma que se usa en la Edge Function
const VAPID_PUBLIC_KEY = 'BDd1xSo79UGaNKWoz2tXA5L6w3Qcb9K-yVUPP73sHq0NnQC6513geFqorgHWmbBtKFvZn_gJwoBnxqH9tJRUh1s';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Verifica si el navegador soporta push notifications */
export const isPushSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

/** Registra el Service Worker */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (err) {
    console.error('Error registrando Service Worker:', err);
    return null;
  }
};

/** Solicita permiso y suscribe al usuario a push notifications */
export const subscribeToPush = async (userId: string): Promise<boolean> => {
  if (!isPushSupported()) {
    console.warn('Push notifications no soportadas en este navegador');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permiso de notificaciones denegado');
      return false;
    }

    const registration = await registerServiceWorker();
    if (!registration) return false;

    // Esperar a que el SW esté activo
    await navigator.serviceWorker.ready;

    // Verificar si ya existe una suscripción
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Guardar suscripción en Supabase
    const subJson = subscription.toJSON();
    await savePushSubscription(userId, subJson);

    return true;
  } catch (err) {
    console.error('Error suscribiendo a push:', err);
    return false;
  }
};

/** Guarda/actualiza la suscripción push en Supabase */
const savePushSubscription = async (userId: string, subscription: any) => {
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh || '',
      auth: subscription.keys?.auth || '',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,endpoint' }
  );

  if (error) {
    console.error('Error guardando suscripción push:', error);
  }
};

/** Elimina la suscripción push (al hacer logout) */
export const unsubscribeFromPush = async (userId: string): Promise<void> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);
    }
  } catch (err) {
    console.error('Error desuscribiendo push:', err);
  }
};

/** Estado actual del permiso de notificaciones */
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
};
