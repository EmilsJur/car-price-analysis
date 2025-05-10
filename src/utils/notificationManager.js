import { loadFromLocalStorage, saveToLocalStorage } from './localStorage';

class NotificationManager {
  constructor() {
    this.notifications = loadFromLocalStorage('notifications', []);
    this.preferences = loadFromLocalStorage('notificationPreferences', {
      priceAlerts: true,
      newListings: true,
      systemUpdates: true,
      email: true,
      browser: true
    });
  }

  addNotification(notification) {
    const newNotification = {
      ...notification,
      id: Date.now(),
      read: false,
      date: new Date().toISOString()
    };
    
    this.notifications.unshift(newNotification);
    saveToLocalStorage('notifications', this.notifications);
    
    // Show browser notification if enabled
    if (this.preferences.browser && 'Notification' in window) {
      this.showBrowserNotification(newNotification);
    }
    
    return newNotification;
  }

  markAsRead(id) {
    this.notifications = this.notifications.map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    );
    saveToLocalStorage('notifications', this.notifications);
  }

  markAllAsRead() {
    this.notifications = this.notifications.map(notif => ({ ...notif, read: true }));
    saveToLocalStorage('notifications', this.notifications);
  }

  deleteNotification(id) {
    this.notifications = this.notifications.filter(notif => notif.id !== id);
    saveToLocalStorage('notifications', this.notifications);
  }

  async showBrowserNotification(notification) {
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo192.png'
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo192.png'
        });
      }
    }
  }

  updatePreferences(newPreferences) {
    this.preferences = { ...this.preferences, ...newPreferences };
    saveToLocalStorage('notificationPreferences', this.preferences);
  }
}

export const notificationManager = new NotificationManager();