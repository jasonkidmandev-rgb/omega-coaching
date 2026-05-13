/**
 * Push Notification Opt-In Banner
 * A gentle, dismissable banner shown on the client Dashboard
 * encouraging clients to enable push notifications so they don't miss messages.
 * 
 * - Only shows if push is supported and not already subscribed
 * - Dismissable with "Not now" (remembers preference in localStorage for 7 days)
 * - Matches the site's navy/amber color scheme
 */

import { useState, useEffect } from 'react';
import { Bell, BellRing, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '../hooks/usePushNotifications';

const DISMISS_KEY = 'push_notification_banner_dismissed';
const DISMISS_DURATION_DAYS = 7;

export function PushNotificationBanner() {
  const [visible, setVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);
  const { isSupported, isSubscribed, isLoading, subscribe, permission } = usePushNotifications();

  useEffect(() => {
    if (isLoading) return;

    // Don't show if not supported, already subscribed, or permission denied
    if (!isSupported || isSubscribed || permission === 'denied') {
      setVisible(false);
      return;
    }

    // Check if user dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const now = new Date();
      const daysSinceDismiss = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < DISMISS_DURATION_DAYS) {
        setVisible(false);
        return;
      }
      // Expired — clear and show again
      localStorage.removeItem(DISMISS_KEY);
    }

    setVisible(true);
  }, [isSupported, isSubscribed, isLoading, permission]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setVisible(false);
  };

  const handleEnable = async () => {
    setEnabling(true);
    const success = await subscribe();
    setEnabling(false);
    if (success) {
      setJustEnabled(true);
      // Auto-hide after 3 seconds
      setTimeout(() => setVisible(false), 3000);
    }
  };

  if (!visible) return null;

  // Success state after enabling
  if (justEnabled) {
    return (
      <div className="mx-4 md:mx-0 mb-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 p-2 bg-green-100 rounded-full">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">Notifications enabled!</p>
            <p className="text-xs text-green-600 mt-0.5">
              You'll now receive alerts when your coach sends you a message.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 md:mx-0 mb-4 rounded-xl bg-gradient-to-r from-[#1e3a5f]/5 via-amber-50/50 to-orange-50/50 border border-amber-200/60 p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-sm mt-0.5">
          <BellRing className="h-5 w-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Stay in the loop
              </p>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Enable notifications so you never miss a message from your coach. 
                We'll only notify you about important updates.
              </p>
            </div>
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-3">
            <Button
              size="sm"
              onClick={handleEnable}
              disabled={enabling}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm text-xs px-4 h-8"
            >
              {enabling ? (
                <>
                  <div className="h-3.5 w-3.5 mr-1.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <Bell className="h-3.5 w-3.5 mr-1.5" />
                  Enable Notifications
                </>
              )}
            </Button>
            <button
              onClick={handleDismiss}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
