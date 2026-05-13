/**
 * Push Notification Settings Component
 * Allows users to enable/disable push notifications and manage preferences
 */

import { Bell, BellOff, Smartphone, Loader2 } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

interface PushNotificationSettingsProps {
  showCard?: boolean;
  compact?: boolean;
}

export function PushNotificationSettings({ showCard = true, compact = false }: PushNotificationSettingsProps) {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  // Compact version for use in headers/menus
  if (compact) {
    if (!isSupported) return null;

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSubscribed ? (
          <Bell className="h-4 w-4 text-green-500" />
        ) : (
          <BellOff className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="hidden sm:inline">
          {isSubscribed ? 'Notifications On' : 'Enable Notifications'}
        </span>
      </Button>
    );
  }

  // Full card version
  const content = (
    <>
      {!isSupported ? (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Smartphone className="h-5 w-5" />
          <p className="text-sm">
            Push notifications are not supported on this browser. Try using Chrome, Firefox, or Edge on a mobile device.
          </p>
        </div>
      ) : permission === 'denied' ? (
        <div className="flex items-center gap-3 text-destructive">
          <BellOff className="h-5 w-5" />
          <div>
            <p className="text-sm font-medium">Notifications Blocked</p>
            <p className="text-xs text-muted-foreground">
              You've blocked notifications. Please enable them in your browser settings.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSubscribed ? (
                <Bell className="h-5 w-5 text-green-500" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="push-toggle" className="text-sm font-medium">
                  Push Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isSubscribed 
                    ? 'You will receive notifications on this device'
                    : 'Enable to receive updates on this device'
                  }
                </p>
              </div>
            </div>
            <Switch
              id="push-toggle"
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={isLoading}
            />
          </div>

          {isSubscribed && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">You'll receive notifications for:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Protocol updates and changes</li>
                <li>• Payment reminders and confirmations</li>
                <li>• Check-in reminders</li>
                <li>• Important announcements</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get instant updates on your phone or desktop
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
