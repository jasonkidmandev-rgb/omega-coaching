import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Bell, HelpCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [, setLocation] = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const { isSupported: pushSupported, isSubscribed, subscribe, isLoading: pushLoading } = usePushNotifications();

  useEffect(() => {
    // Check if already installed as PWA
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Show prompt again after 7 days
    if (dismissedTime && daysSinceDismissed < 7) {
      return;
    }

    // Listen for the beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show custom prompt after a delay
    if (iOS && !isInStandaloneMode) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
        // After install, prompt for notifications
        if (pushSupported && !isSubscribed) {
          setShowNotificationPrompt(true);
        }
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleEnableNotifications = async () => {
    await subscribe();
    setShowNotificationPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  // Show notification prompt after install
  if (showNotificationPrompt && pushSupported && !isSubscribed) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4 z-50 animate-in slide-in-from-bottom-4">
        <button
          onClick={() => setShowNotificationPrompt(false)}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-200"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
            <Bell className="h-6 w-6 text-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white mb-1">
              Enable Notifications?
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Get instant updates when your protocol changes, payments are due, or there are important announcements.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleEnableNotifications}
                size="sm"
                disabled={pushLoading}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <Bell className="h-4 w-4 mr-1" />
                Enable
              </Button>
              <Button
                onClick={() => setShowNotificationPrompt(false)}
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show if already installed
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4 z-50 animate-in slide-in-from-bottom-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-slate-400 hover:text-slate-200"
        aria-label="Dismiss"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
          <Smartphone className="h-6 w-6 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white mb-1">
            Install Omega Longevity
          </h3>
          {isIOS ? (
            <p className="text-xs text-slate-400 mb-3">
              Tap the share button <span className="inline-block px-1 py-0.5 bg-slate-700 rounded text-[10px]">⬆</span> then "Add to Home Screen" to install this app on your iPhone.
            </p>
          ) : (
            <p className="text-xs text-slate-400 mb-3">
              Install our app for quick access, offline support, and a native app experience.
            </p>
          )}
          {!isIOS && deferredPrompt && (
            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Download className="h-4 w-4 mr-1" />
                Install App
              </Button>
              <Button
                onClick={() => {
                  handleDismiss();
                  setLocation('/install');
                }}
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
          {isIOS && (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  handleDismiss();
                  setLocation('/install');
                }}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                How to Install
              </Button>
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Got it
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
