import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Switch } from "../../components/ui/switch";
import { toast } from "sonner";
import { Bell, Mail, Clock, Settings2, Save, RefreshCw, CheckCircle2, XCircle, Shield, CreditCard, FileText, Calendar, Package, Users, Volume2, Smartphone, BellRing, AlertTriangle, ArrowLeft } from "lucide-react";
import { Separator } from "../../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

// Notification type categories with metadata
const NOTIFICATION_CATEGORIES = {
  protocol: {
    label: "Protocol Notifications",
    description: "Notifications about client protocol activity",
    icon: FileText,
    color: "text-blue-600",
    types: [
      { id: "protocol_approved", label: "Protocol Approved", description: "When a client approves their protocol" },
      { id: "protocol_viewed", label: "Protocol Viewed", description: "When a client views their protocol for the first time" },
      { id: "protocol_updated", label: "Protocol Updated", description: "When a protocol is updated by admin" },
      { id: "protocol_option_selected", label: "Option Selected", description: "When a client selects a protocol option" },
    ],
  },
  payment: {
    label: "Payment Notifications",
    description: "Notifications about payments and transactions",
    icon: CreditCard,
    color: "text-green-600",
    types: [
      { id: "payment_received", label: "Payment Received", description: "When a payment is successfully processed" },
      { id: "payment_failed", label: "Payment Failed", description: "When a payment attempt fails" },
      { id: "payment_refunded", label: "Payment Refunded", description: "When a refund is processed" },
      { id: "venmo_pending", label: "Payment Pending", description: "When a payment is awaiting verification" },
    ],
  },
  checkin: {
    label: "Check-in Notifications",
    description: "Notifications about client wellness check-ins",
    icon: Shield,
    color: "text-purple-600",
    types: [
      { id: "checkin_submitted", label: "Check-in Submitted", description: "When a client submits their weekly check-in" },
      { id: "low_checkin_score", label: "Low Check-in Score", description: "When a client reports a low wellness score" },
    ],
  },
  store: {
    label: "Store & Inventory",
    description: "Notifications about store orders and inventory",
    icon: Package,
    color: "text-orange-600",
    types: [
      { id: "new_store_order", label: "New Store Order", description: "When a new store order is placed" },
      { id: "waiver_signed", label: "Waiver Signed", description: "When a client signs the store waiver" },
      { id: "packing_slip_created", label: "Packing Slip Created", description: "When a packing slip is generated" },
      { id: "inventory_out_of_stock", label: "Out of Stock Alert", description: "When inventory items reach zero" },
    ],
  },
  client: {
    label: "Client Activity",
    description: "Notifications about client actions and engagement",
    icon: Users,
    color: "text-indigo-600",
    types: [
      { id: "profile_completed", label: "Profile Completed", description: "When a client completes their profile" },
      { id: "intake_completed", label: "Intake Completed", description: "When a client completes their intake form" },
      { id: "client_comment", label: "Client Comment", description: "When a client comments on their protocol" },
      { id: "new_message", label: "New Message", description: "Email notifications when clients or coaches send messages" },
      { id: "new_user_registered", label: "New User Registered", description: "When a new user creates an account" },
      { id: "referral_submitted", label: "Referral Conversion", description: "When a referral converts to a purchase" },
    ],
  },
  scheduling: {
    label: "Scheduling",
    description: "Notifications about appointments and bookings",
    icon: Calendar,
    color: "text-teal-600",
    types: [
      { id: "appointment_booked", label: "Appointment Booked", description: "When a client books an appointment" },
      { id: "appointment_cancelled", label: "Appointment Cancelled", description: "When an appointment is cancelled" },
    ],
  },
  other: {
    label: "Other",
    description: "Miscellaneous notifications",
    icon: Bell,
    color: "text-gray-600",
    types: [
      { id: "other", label: "Other Notifications", description: "General system notifications" },
    ],
  },
};

// Email notification categories (subset of all categories)
const EMAIL_NOTIFICATION_CATEGORIES = {
  protocol: {
    ...NOTIFICATION_CATEGORIES.protocol,
    types: NOTIFICATION_CATEGORIES.protocol.types.filter(t => 
      ["protocol_approved", "protocol_viewed", "protocol_updated"].includes(t.id)
    ),
  },
  payment: NOTIFICATION_CATEGORIES.payment,
  checkin: NOTIFICATION_CATEGORIES.checkin,
  store: {
    ...NOTIFICATION_CATEGORIES.store,
    types: NOTIFICATION_CATEGORIES.store.types.filter(t => 
      ["new_store_order", "waiver_signed", "inventory_out_of_stock"].includes(t.id)
    ),
  },
  client: {
    ...NOTIFICATION_CATEGORIES.client,
    types: NOTIFICATION_CATEGORIES.client.types.filter(t => 
      ["intake_completed", "client_comment", "new_message", "new_user_registered", "referral_submitted"].includes(t.id)
    ),
  },
  scheduling: NOTIFICATION_CATEGORIES.scheduling,
};

// Push notification categories (critical alerts only)
const PUSH_NOTIFICATION_CATEGORIES = {
  payment: {
    ...NOTIFICATION_CATEGORIES.payment,
    types: NOTIFICATION_CATEGORIES.payment.types.filter(t => 
      ["payment_received", "payment_failed", "venmo_pending"].includes(t.id)
    ),
  },
  checkin: {
    ...NOTIFICATION_CATEGORIES.checkin,
    types: NOTIFICATION_CATEGORIES.checkin.types.filter(t => 
      ["low_checkin_score"].includes(t.id)
    ),
  },
  store: {
    ...NOTIFICATION_CATEGORIES.store,
    types: NOTIFICATION_CATEGORIES.store.types.filter(t => 
      ["new_store_order", "inventory_out_of_stock"].includes(t.id)
    ),
  },
  scheduling: NOTIFICATION_CATEGORIES.scheduling,
};

export default function NotificationSettings() {
  const [, setLocation] = useLocation();
  // Local state for payment reminder form
  const [paymentRemindersEnabled, setPaymentRemindersEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState("3,7,14");
  const [maxReminders, setMaxReminders] = useState("3");
  const [reminderSendTime, setReminderSendTime] = useState("09:00");
  const [hasPaymentChanges, setHasPaymentChanges] = useState(false);

  // Local state for in-app notification type preferences
  const [enabledTypes, setEnabledTypes] = useState<string[]>([]);
  const [hasTypeChanges, setHasTypeChanges] = useState(false);
  const [initialTypesLoaded, setInitialTypesLoaded] = useState(false);

  // Local state for email notification preferences
  const [enabledEmailTypes, setEnabledEmailTypes] = useState<string[]>([]);
  const [hasEmailTypeChanges, setHasEmailTypeChanges] = useState(false);
  const [initialEmailTypesLoaded, setInitialEmailTypesLoaded] = useState(false);

  // Local state for digest settings
  const [digestFrequency, setDigestFrequency] = useState<"none" | "daily" | "weekly">("none");
  const [digestSendTime, setDigestSendTime] = useState("09:00");
  const [hasDigestChanges, setHasDigestChanges] = useState(false);
  const [initialDigestLoaded, setInitialDigestLoaded] = useState(false);

  // Local state for push notification preferences
  const [enabledPushTypes, setEnabledPushTypes] = useState<string[]>([]);
  const [hasPushTypeChanges, setHasPushTypeChanges] = useState(false);
  const [initialPushTypesLoaded, setInitialPushTypesLoaded] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [hasSubscription, setHasSubscription] = useState(false);

  // Query for payment reminder settings
  const { data: settingsData, refetch: refetchSettings } = trpc.adminSettings.getByCategory.useQuery({
    category: "notifications",
  });

  // Query for in-app notification type preferences
  const { data: typePrefsData, refetch: refetchTypePrefs } = trpc.users.getEnabledNotificationTypes.useQuery();

  // Query for email notification type preferences
  const { data: emailTypePrefsData, refetch: refetchEmailTypePrefs } = trpc.users.getEnabledEmailNotificationTypes.useQuery();

  // Query for digest settings
  const { data: digestData, refetch: refetchDigest } = trpc.users.getDigestSettings.useQuery();

  // Query for push notification preferences
  const { data: pushTypePrefsData, refetch: refetchPushTypePrefs } = trpc.users.getEnabledPushNotificationTypes.useQuery();

  // Mutations
  const bulkUpdateMutation = trpc.adminSettings.bulkUpdate.useMutation({
    onSuccess: () => {
      toast.success("Payment reminder settings saved");
      setHasPaymentChanges(false);
      refetchSettings();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateTypesMutation = trpc.users.updateEnabledNotificationTypes.useMutation({
    onSuccess: () => {
      toast.success("In-app notification preferences saved");
      setHasTypeChanges(false);
      refetchTypePrefs();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateEmailTypesMutation = trpc.users.updateEnabledEmailNotificationTypes.useMutation({
    onSuccess: () => {
      toast.success("Email notification preferences saved");
      setHasEmailTypeChanges(false);
      refetchEmailTypePrefs();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateDigestMutation = trpc.users.updateDigestSettings.useMutation({
    onSuccess: () => {
      toast.success("Digest settings saved");
      setHasDigestChanges(false);
      refetchDigest();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updatePushTypesMutation = trpc.users.updateEnabledPushNotificationTypes.useMutation({
    onSuccess: () => {
      toast.success("Push notification preferences saved");
      setHasPushTypeChanges(false);
      refetchPushTypePrefs();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const savePushSubscriptionMutation = trpc.users.savePushSubscription.useMutation({
    onSuccess: () => {
      toast.success("Push notifications enabled");
      setHasSubscription(true);
      refetchPushTypePrefs();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Check push notification support
  useEffect(() => {
    if ("Notification" in window && "serviceWorker" in navigator) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
  }, []);

  // Load payment reminder settings
  useEffect(() => {
    if (settingsData?.data) {
      const settingsMap = new Map(settingsData.data.map(s => [s.settingKey, s.settingValue]));
      setPaymentRemindersEnabled(settingsMap.get("payment_reminders_enabled") === "true");
      setReminderDays(settingsMap.get("reminder_days") || "3,7,14");
      setMaxReminders(settingsMap.get("max_reminders") || "3");
      setReminderSendTime(settingsMap.get("reminder_send_time") || "09:00");
    }
  }, [settingsData]);

  // Load in-app notification type preferences
  useEffect(() => {
    if (typePrefsData && !initialTypesLoaded) {
      setEnabledTypes(typePrefsData.enabledTypes);
      setInitialTypesLoaded(true);
    }
  }, [typePrefsData, initialTypesLoaded]);

  // Load email notification type preferences
  useEffect(() => {
    if (emailTypePrefsData && !initialEmailTypesLoaded) {
      setEnabledEmailTypes(emailTypePrefsData.enabledTypes);
      setInitialEmailTypesLoaded(true);
    }
  }, [emailTypePrefsData, initialEmailTypesLoaded]);

  // Load digest settings
  useEffect(() => {
    if (digestData && !initialDigestLoaded) {
      setDigestFrequency(digestData.frequency as "none" | "daily" | "weekly");
      setDigestSendTime(digestData.sendTime);
      setInitialDigestLoaded(true);
    }
  }, [digestData, initialDigestLoaded]);

  // Load push notification type preferences
  useEffect(() => {
    if (pushTypePrefsData && !initialPushTypesLoaded) {
      setEnabledPushTypes(pushTypePrefsData.enabledTypes);
      setHasSubscription(pushTypePrefsData.hasSubscription);
      setInitialPushTypesLoaded(true);
    }
  }, [pushTypePrefsData, initialPushTypesLoaded]);

  // Save handlers
  const handleSavePaymentSettings = () => {
    bulkUpdateMutation.mutate({
      settings: [
        { key: "payment_reminders_enabled", value: paymentRemindersEnabled.toString() },
        { key: "reminder_days", value: reminderDays },
        { key: "max_reminders", value: maxReminders },
        { key: "reminder_send_time", value: reminderSendTime },
      ],
    });
  };

  const handleSaveTypePreferences = () => {
    updateTypesMutation.mutate({ enabledTypes });
  };

  const handleSaveEmailTypePreferences = () => {
    updateEmailTypesMutation.mutate({ enabledTypes: enabledEmailTypes });
  };

  const handleSaveDigestSettings = () => {
    updateDigestMutation.mutate({ frequency: digestFrequency, sendTime: digestSendTime });
  };

  const handleSavePushTypePreferences = () => {
    updatePushTypesMutation.mutate({ enabledTypes: enabledPushTypes });
  };

  // Toggle handlers for in-app notifications
  const toggleNotificationType = (typeId: string) => {
    setEnabledTypes(prev => {
      const newTypes = prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId];
      return newTypes;
    });
    setHasTypeChanges(true);
  };

  const toggleCategory = (categoryKey: string, enable: boolean) => {
    const category = NOTIFICATION_CATEGORIES[categoryKey as keyof typeof NOTIFICATION_CATEGORIES];
    if (!category) return;

    setEnabledTypes(prev => {
      const categoryTypeIds = category.types.map(t => t.id);
      if (enable) {
        const newTypes = [...prev];
        categoryTypeIds.forEach(id => {
          if (!newTypes.includes(id)) {
            newTypes.push(id);
          }
        });
        return newTypes;
      } else {
        return prev.filter(t => !categoryTypeIds.includes(t));
      }
    });
    setHasTypeChanges(true);
  };

  const enableAllTypes = () => {
    const allTypeIds = Object.values(NOTIFICATION_CATEGORIES).flatMap(cat => cat.types.map(t => t.id));
    setEnabledTypes(allTypeIds);
    setHasTypeChanges(true);
  };

  const disableAllTypes = () => {
    setEnabledTypes([]);
    setHasTypeChanges(true);
  };

  // Toggle handlers for email notifications
  const toggleEmailNotificationType = (typeId: string) => {
    setEnabledEmailTypes(prev => {
      const newTypes = prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId];
      return newTypes;
    });
    setHasEmailTypeChanges(true);
  };

  const toggleEmailCategory = (categoryKey: string, enable: boolean) => {
    const category = EMAIL_NOTIFICATION_CATEGORIES[categoryKey as keyof typeof EMAIL_NOTIFICATION_CATEGORIES];
    if (!category) return;

    setEnabledEmailTypes(prev => {
      const categoryTypeIds = category.types.map(t => t.id);
      if (enable) {
        const newTypes = [...prev];
        categoryTypeIds.forEach(id => {
          if (!newTypes.includes(id)) {
            newTypes.push(id);
          }
        });
        return newTypes;
      } else {
        return prev.filter(t => !categoryTypeIds.includes(t));
      }
    });
    setHasEmailTypeChanges(true);
  };

  const enableAllEmailTypes = () => {
    const allTypeIds = Object.values(EMAIL_NOTIFICATION_CATEGORIES).flatMap(cat => cat.types.map(t => t.id));
    setEnabledEmailTypes(allTypeIds);
    setHasEmailTypeChanges(true);
  };

  const disableAllEmailTypes = () => {
    setEnabledEmailTypes([]);
    setHasEmailTypeChanges(true);
  };

  // Toggle handlers for push notifications
  const togglePushNotificationType = (typeId: string) => {
    setEnabledPushTypes(prev => {
      const newTypes = prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId];
      return newTypes;
    });
    setHasPushTypeChanges(true);
  };

  const togglePushCategory = (categoryKey: string, enable: boolean) => {
    const category = PUSH_NOTIFICATION_CATEGORIES[categoryKey as keyof typeof PUSH_NOTIFICATION_CATEGORIES];
    if (!category) return;

    setEnabledPushTypes(prev => {
      const categoryTypeIds = category.types.map(t => t.id);
      if (enable) {
        const newTypes = [...prev];
        categoryTypeIds.forEach(id => {
          if (!newTypes.includes(id)) {
            newTypes.push(id);
          }
        });
        return newTypes;
      } else {
        return prev.filter(t => !categoryTypeIds.includes(t));
      }
    });
    setHasPushTypeChanges(true);
  };

  const enableAllPushTypes = () => {
    const allTypeIds = Object.values(PUSH_NOTIFICATION_CATEGORIES).flatMap(cat => cat.types.map(t => t.id));
    setEnabledPushTypes(allTypeIds);
    setHasPushTypeChanges(true);
  };

  const disableAllPushTypes = () => {
    setEnabledPushTypes([]);
    setHasPushTypeChanges(true);
  };

  // Request push notification permission
  const requestPushPermission = async () => {
    if (!pushSupported) {
      toast.error("Push notifications are not supported in this browser");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission === "granted") {
        // Register service worker and get subscription
        const registration = await navigator.serviceWorker.ready;
        
        // For now, we'll just save a placeholder subscription
        // In production, you'd use web-push with VAPID keys
        const subscriptionData = JSON.stringify({
          endpoint: "browser-notification",
          enabled: true,
          timestamp: new Date().toISOString(),
        });
        
        savePushSubscriptionMutation.mutate({ subscription: subscriptionData });
      } else if (permission === "denied") {
        toast.error("Push notifications were denied. Please enable them in your browser settings.");
      }
    } catch (error) {
      console.error("Error requesting push permission:", error);
      toast.error("Failed to enable push notifications");
    }
  };

  // Disable push notifications
  const disablePushNotifications = () => {
    savePushSubscriptionMutation.mutate({ subscription: null });
    setHasSubscription(false);
    toast.success("Push notifications disabled");
  };

  // Helper functions
  const getCategoryEnabledCount = (categoryKey: string, categories: typeof NOTIFICATION_CATEGORIES, enabledList: string[]) => {
    const category = categories[categoryKey as keyof typeof categories];
    if (!category) return { enabled: 0, total: 0 };
    const categoryTypeIds = category.types.map(t => t.id);
    const enabled = categoryTypeIds.filter(id => enabledList.includes(id)).length;
    return { enabled, total: categoryTypeIds.length };
  };

  const isCategoryFullyEnabled = (categoryKey: string, categories: typeof NOTIFICATION_CATEGORIES, enabledList: string[]) => {
    const { enabled, total } = getCategoryEnabledCount(categoryKey, categories, enabledList);
    return enabled === total;
  };

  const isCategoryPartiallyEnabled = (categoryKey: string, categories: typeof NOTIFICATION_CATEGORIES, enabledList: string[]) => {
    const { enabled, total } = getCategoryEnabledCount(categoryKey, categories, enabledList);
    return enabled > 0 && enabled < total;
  };

  // Parse reminder days for display
  const reminderDaysArray = reminderDays.split(",").map(d => d.trim()).filter(d => d);

  // Count totals
  const totalEnabled = enabledTypes.length;
  const totalTypes = Object.values(NOTIFICATION_CATEGORIES).flatMap(cat => cat.types).length;
  const totalEmailEnabled = enabledEmailTypes.length;
  const totalEmailTypes = Object.values(EMAIL_NOTIFICATION_CATEGORIES).flatMap(cat => cat.types).length;
  const totalPushEnabled = enabledPushTypes.length;
  const totalPushTypes = Object.values(PUSH_NOTIFICATION_CATEGORIES).flatMap(cat => cat.types).length;

  // Render category card helper
  const renderCategoryCard = (
    key: string,
    category: typeof NOTIFICATION_CATEGORIES[keyof typeof NOTIFICATION_CATEGORIES],
    categories: typeof NOTIFICATION_CATEGORIES,
    enabledList: string[],
    toggleType: (id: string) => void,
    toggleCat: (key: string, enable: boolean) => void
  ) => {
    const Icon = category.icon;
    const { enabled, total } = getCategoryEnabledCount(key, categories, enabledList);
    const isFullyEnabled = isCategoryFullyEnabled(key, categories, enabledList);
    const isPartiallyEnabled = isCategoryPartiallyEnabled(key, categories, enabledList);

    return (
      <Card key={key} className="border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${category.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">{category.label}</CardTitle>
                <CardDescription className="text-sm">{category.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isFullyEnabled ? "default" : isPartiallyEnabled ? "secondary" : "outline"}>
                {enabled}/{total}
              </Badge>
              <Switch
                checked={isFullyEnabled}
                onCheckedChange={(checked) => toggleCat(key, checked)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-2 pl-12">
            {category.types.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-muted-foreground">{type.description}</div>
                </div>
                <Switch
                  checked={enabledList.includes(type.id)}
                  onCheckedChange={() => toggleType(type.id)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Settings2 className="h-8 w-8 text-primary" />
              Notification Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure all notification channels and preferences
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="inapp" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl">
          <TabsTrigger value="inapp" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">In-App</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="digest" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Digest</span>
          </TabsTrigger>
          <TabsTrigger value="push" className="flex items-center gap-2">
            <BellRing className="h-4 w-4" />
            <span className="hidden sm:inline">Push</span>
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Reminders</span>
          </TabsTrigger>
        </TabsList>

        {/* In-App Notifications Tab */}
        <TabsContent value="inapp" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    In-App Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose which notification types appear in your notification bell
                  </CardDescription>
                </div>
                <Badge variant={totalEnabled === totalTypes ? "default" : "secondary"}>
                  {totalEnabled} / {totalTypes} enabled
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={enableAllTypes}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Enable All
                </Button>
                <Button variant="outline" size="sm" onClick={disableAllTypes}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Disable All
                </Button>
                <div className="flex-1" />
                <Button 
                  onClick={handleSaveTypePreferences} 
                  disabled={!hasTypeChanges || updateTypesMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateTypesMutation.isPending ? "Saving..." : "Save Preferences"}
                </Button>
              </div>

              <Separator />

              <div className="grid gap-4">
                {Object.entries(NOTIFICATION_CATEGORIES).map(([key, category]) =>
                  renderCategoryCard(key, category, NOTIFICATION_CATEGORIES, enabledTypes, toggleNotificationType, toggleCategory)
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Notifications Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose which events trigger email notifications (separate from in-app)
                  </CardDescription>
                </div>
                <Badge variant={totalEmailEnabled === totalEmailTypes ? "default" : "secondary"}>
                  {totalEmailEnabled} / {totalEmailTypes} enabled
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={enableAllEmailTypes}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Enable All
                </Button>
                <Button variant="outline" size="sm" onClick={disableAllEmailTypes}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Disable All
                </Button>
                <div className="flex-1" />
                <Button 
                  onClick={handleSaveEmailTypePreferences} 
                  disabled={!hasEmailTypeChanges || updateEmailTypesMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateEmailTypesMutation.isPending ? "Saving..." : "Save Preferences"}
                </Button>
              </div>

              <Separator />

              <div className="grid gap-4">
                {Object.entries(EMAIL_NOTIFICATION_CATEGORIES).map(([key, category]) =>
                  renderCategoryCard(key, category, EMAIL_NOTIFICATION_CATEGORIES as typeof NOTIFICATION_CATEGORIES, enabledEmailTypes, toggleEmailNotificationType, toggleEmailCategory)
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Digest Tab */}
        <TabsContent value="digest" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Notification Digest
              </CardTitle>
              <CardDescription>
                Receive a summary email of all unread notifications instead of individual emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Digest Frequency</Label>
                  <Select
                    value={digestFrequency}
                    onValueChange={(value: "none" | "daily" | "weekly") => {
                      setDigestFrequency(value);
                      setHasDigestChanges(true);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Disabled</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly (Mondays)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {digestFrequency === "none" 
                      ? "You will receive individual email notifications as events occur"
                      : digestFrequency === "daily"
                      ? "You will receive a daily summary of all unread notifications"
                      : "You will receive a weekly summary every Monday"}
                  </p>
                </div>

                {digestFrequency !== "none" && (
                  <div className="space-y-2">
                    <Label>Send Time</Label>
                    <Input
                      type="time"
                      value={digestSendTime}
                      onChange={(e) => {
                        setDigestSendTime(e.target.value);
                        setHasDigestChanges(true);
                      }}
                      className="w-32"
                    />
                    <p className="text-sm text-muted-foreground">
                      Time of day to send the digest email (your local timezone)
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveDigestSettings} 
                    disabled={!hasDigestChanges || updateDigestMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateDigestMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Digest Preview */}
              <div className="space-y-4">
                <h3 className="font-medium">Digest Preview</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  {digestFrequency === "none" ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Digest is currently disabled</p>
                      <p className="text-sm">Enable it above to receive summary emails</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Mail className="h-4 w-4" />
                        {digestFrequency === "daily" ? "Daily" : "Weekly"} Notification Summary
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Your digest will include:</p>
                        <ul className="list-disc list-inside ml-2 space-y-1">
                          <li>All unread in-app notifications since last digest</li>
                          <li>Summary counts by category (payments, check-ins, etc.)</li>
                          <li>Quick links to view details in the app</li>
                        </ul>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Sent {digestFrequency === "daily" ? "every day" : "every Monday"} at {digestSendTime}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Push Notifications Tab */}
        <TabsContent value="push" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="h-5 w-5" />
                Browser Push Notifications
              </CardTitle>
              <CardDescription>
                Receive instant desktop alerts for critical events even when the app is closed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Push Status */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {hasSubscription ? (
                    <>
                      <div className="p-2 rounded-full bg-green-100 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Push Notifications Enabled</p>
                        <p className="text-sm text-muted-foreground">You will receive desktop alerts for selected events</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-2 rounded-full bg-gray-100 text-gray-600">
                        <Volume2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">Push Notifications Disabled</p>
                        <p className="text-sm text-muted-foreground">
                          {!pushSupported 
                            ? "Your browser doesn't support push notifications"
                            : pushPermission === "denied"
                            ? "Notifications are blocked. Please enable them in browser settings."
                            : "Enable to receive instant alerts for critical events"}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                {hasSubscription ? (
                  <Button variant="outline" onClick={disablePushNotifications}>
                    Disable
                  </Button>
                ) : (
                  <Button 
                    onClick={requestPushPermission}
                    disabled={!pushSupported || pushPermission === "denied"}
                  >
                    <BellRing className="h-4 w-4 mr-2" />
                    Enable Push
                  </Button>
                )}
              </div>

              {hasSubscription && (
                <>
                  <Separator />

                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={enableAllPushTypes}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Enable All
                    </Button>
                    <Button variant="outline" size="sm" onClick={disableAllPushTypes}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Disable All
                    </Button>
                    <div className="flex-1" />
                    <Badge variant={totalPushEnabled === totalPushTypes ? "default" : "secondary"}>
                      {totalPushEnabled} / {totalPushTypes} enabled
                    </Badge>
                    <Button 
                      onClick={handleSavePushTypePreferences} 
                      disabled={!hasPushTypeChanges || updatePushTypesMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updatePushTypesMutation.isPending ? "Saving..." : "Save Preferences"}
                    </Button>
                  </div>

                  <div className="grid gap-4">
                    {Object.entries(PUSH_NOTIFICATION_CATEGORIES).map(([key, category]) =>
                      renderCategoryCard(key, category, PUSH_NOTIFICATION_CATEGORIES as typeof NOTIFICATION_CATEGORIES, enabledPushTypes, togglePushNotificationType, togglePushCategory)
                    )}
                  </div>
                </>
              )}

              {/* Push Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">About Push Notifications</p>
                    <p className="text-blue-700 mt-1">
                      Push notifications are designed for critical alerts that require immediate attention.
                      They work even when the browser is closed (but the computer must be on).
                      For less urgent updates, use in-app notifications or email digests.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Reminders Tab */}
        <TabsContent value="reminders" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Payment Reminder Emails
                  </CardTitle>
                  <CardDescription>
                    Automatically send reminder emails to clients with pending payments
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => refetchSettings()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button onClick={handleSavePaymentSettings} disabled={!hasPaymentChanges || bulkUpdateMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {bulkUpdateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Payment Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Send automatic email reminders for unpaid protocols
                  </p>
                </div>
                <Switch
                  checked={paymentRemindersEnabled}
                  onCheckedChange={(checked) => {
                    setPaymentRemindersEnabled(checked);
                    setHasPaymentChanges(true);
                  }}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <Label className="text-base">Reminder Schedule</Label>
                  <p className="text-sm text-muted-foreground">
                    Days after protocol creation to send reminders (comma-separated)
                  </p>
                </div>
                <Input
                  value={reminderDays}
                  onChange={(e) => {
                    setReminderDays(e.target.value);
                    setHasPaymentChanges(true);
                  }}
                  placeholder="3,7,14"
                  disabled={!paymentRemindersEnabled}
                />
                <div className="flex gap-2 flex-wrap">
                  {reminderDaysArray.map((day, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                    >
                      <Clock className="h-3 w-3" />
                      Day {day}
                    </span>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <Label className="text-base">Maximum Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Maximum number of reminder emails to send per protocol
                  </p>
                </div>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={maxReminders}
                  onChange={(e) => {
                    setMaxReminders(e.target.value);
                    setHasPaymentChanges(true);
                  }}
                  disabled={!paymentRemindersEnabled}
                  className="w-24"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <Label className="text-base">Send Time</Label>
                  <p className="text-sm text-muted-foreground">
                    Time of day to send reminder emails (24-hour format)
                  </p>
                </div>
                <Input
                  type="time"
                  value={reminderSendTime}
                  onChange={(e) => {
                    setReminderSendTime(e.target.value);
                    setHasPaymentChanges(true);
                  }}
                  disabled={!paymentRemindersEnabled}
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}