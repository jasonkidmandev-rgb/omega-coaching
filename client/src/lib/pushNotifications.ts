// Push Notification Utilities

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

// Get current notification permission status
export function getPermissionStatus(): NotificationPermission {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

// Request notification permission
export async function requestPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return 'denied';
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

// Register service worker for push notifications
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw-push.js', {
      scope: '/'
    });
    console.log('Push service worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Error registering service worker:', error);
    return null;
  }
}

// Show a local notification (for testing or when app is in foreground)
export function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!isPushSupported()) {
    console.warn('Notifications not supported');
    return null;
  }
  
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }
  
  try {
    const notification = new Notification(title, {
      icon: '/logo.png',
      badge: '/logo.png',
      ...options
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
}

// Notification type configurations
export const PUSH_NOTIFICATION_CONFIG: Record<string, {
  title: string;
  icon: string;
  requireInteraction: boolean;
  sound: boolean;
}> = {
  low_checkin_score: {
    title: 'Low Check-in Score Alert',
    icon: '⚠️',
    requireInteraction: true,
    sound: true
  },
  payment_received: {
    title: 'Payment Received',
    icon: '💰',
    requireInteraction: false,
    sound: true
  },
  payment_failed: {
    title: 'Payment Failed',
    icon: '❌',
    requireInteraction: true,
    sound: true
  },
  new_store_order: {
    title: 'New Store Order',
    icon: '🛒',
    requireInteraction: false,
    sound: true
  },
  appointment_booked: {
    title: 'Appointment Booked',
    icon: '📅',
    requireInteraction: false,
    sound: false
  },
  appointment_cancelled: {
    title: 'Appointment Cancelled',
    icon: '📅',
    requireInteraction: true,
    sound: true
  },
  inventory_out_of_stock: {
    title: 'Inventory Alert',
    icon: '📦',
    requireInteraction: true,
    sound: true
  },
  venmo_pending: {
    title: 'Payment Pending',
    icon: '💳',
    requireInteraction: true,
    sound: true
  }
};

// Format notification for display
export function formatPushNotification(
  type: string,
  message: string
): { title: string; body: string; requireInteraction: boolean } {
  const config = PUSH_NOTIFICATION_CONFIG[type] || {
    title: 'Notification',
    icon: '🔔',
    requireInteraction: false,
    sound: false
  };
  
  return {
    title: `${config.icon} ${config.title}`,
    body: message,
    requireInteraction: config.requireInteraction
  };
}
