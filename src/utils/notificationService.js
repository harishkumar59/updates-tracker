// ─── NotificationService ────────────────────────────────────────────────────
// Centralized notification dispatch. Only browser notifications are fully
// implemented. Email, Telegram, and WhatsApp are clean stubs ready for
// backend integration.

/**
 * Request browser notification permission.
 * @returns {Promise<string>} The permission state.
 */
export async function requestBrowserPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

/**
 * Send a browser desktop notification.
 * @param {string} title
 * @param {string} body
 * @param {string} [tag] - Optional de-duplication tag.
 */
export function sendBrowserNotification(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    icon: '/vite.svg',
    tag: tag || undefined,
    badge: '/vite.svg',
  });
}

/**
 * Check if a notification channel is configured and available.
 * @param {'browser'|'email'|'telegram'|'whatsapp'} channel
 * @param {Object} settings - The notification settings object.
 * @returns {{ available: boolean, reason?: string }}
 */
export function getChannelStatus(channel, settings) {
  switch (channel) {
    case 'browser':
      if (!('Notification' in window)) return { available: false, reason: 'Browser does not support notifications' };
      if (Notification.permission === 'denied') return { available: false, reason: 'Permission denied by user' };
      if (Notification.permission === 'default') return { available: false, reason: 'Permission not yet requested' };
      return { available: true };

    case 'email':
      if (!settings?.email?.enabled) return { available: false, reason: 'Not enabled' };
      if (!settings?.email?.address) return { available: false, reason: 'No email address configured' };
      return { available: false, reason: 'Backend integration required' };

    case 'telegram':
      if (!settings?.telegram?.enabled) return { available: false, reason: 'Not enabled' };
      if (!settings?.telegram?.chatId) return { available: false, reason: 'No Chat ID configured' };
      return { available: false, reason: 'Backend integration required' };

    case 'whatsapp':
      if (!settings?.whatsapp?.enabled) return { available: false, reason: 'Not enabled' };
      if (!settings?.whatsapp?.number) return { available: false, reason: 'No phone number configured' };
      return { available: false, reason: 'Backend integration required' };

    default:
      return { available: false, reason: 'Unknown channel' };
  }
}

// ─── Stubs for future backend integration ────────────────────────────────────

/**
 * Send an email notification. (Stub — requires backend)
 */
export async function sendEmail(/* address, subject, body */) {
  console.info('[ExamPulse] Email notification: backend integration required.');
  return { success: false, reason: 'Backend integration required' };
}

/**
 * Send a Telegram notification. (Stub — requires backend)
 */
export async function sendTelegram(/* chatId, message */) {
  console.info('[ExamPulse] Telegram notification: backend integration required.');
  return { success: false, reason: 'Backend integration required' };
}

/**
 * Send a WhatsApp notification. (Stub — requires backend)
 */
export async function sendWhatsApp(/* number, message */) {
  console.info('[ExamPulse] WhatsApp notification: backend integration required.');
  return { success: false, reason: 'Backend integration required' };
}

/**
 * Dispatch notifications through all enabled channels for a tracker update.
 * @param {Object} tracker - The tracker that changed.
 * @param {Object} settings - The notification settings.
 */
export function dispatchNotifications(tracker, settings) {
  const title = `🔔 ${tracker.siteName} Updated`;
  const body = tracker.previousValue
    ? `Previous: ${tracker.previousValue.slice(0, 60)}\nNew: ${tracker.lastKnownValue.slice(0, 60)}`
    : tracker.lastKnownValue.slice(0, 120);

  // Browser notification (fully functional)
  if (settings?.browserNotification) {
    sendBrowserNotification(title, body, tracker.id);
  }

  // Email (stub)
  if (settings?.email?.enabled && settings?.email?.address) {
    sendEmail(settings.email.address, title, body);
  }

  // Telegram (stub)
  if (settings?.telegram?.enabled && settings?.telegram?.chatId) {
    sendTelegram(settings.telegram.chatId, `${title}\n${body}`);
  }

  // WhatsApp (stub)
  if (settings?.whatsapp?.enabled && settings?.whatsapp?.number) {
    sendWhatsApp(settings.whatsapp.number, `${title}\n${body}`);
  }
}
