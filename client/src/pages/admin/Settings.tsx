import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Settings as SettingsIcon, Shield, FileText, Bell, Loader2, Mail, Save, Clock, Users, Eye, DollarSign, Wrench, ExternalLink, BarChart3, Layout, FileCheck, Package, X, Check, AlertTriangle, Send, MessageSquare, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

export default function Settings() {
  const [ageDisclaimerEnabled, setAgeDisclaimerEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // SMTP Settings state
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);

  // Waiver expiration settings
  const [waiverExpirationMonths, setWaiverExpirationMonths] = useState(12);
  const [isSavingWaiver, setIsSavingWaiver] = useState(false);

  // Payment reminder settings
  const [paymentRemindersEnabled, setPaymentRemindersEnabled] = useState(true);
  const [isSavingPaymentReminder, setIsSavingPaymentReminder] = useState(false);
  const [reminderDay1, setReminderDay1] = useState(3);
  const [reminderDay2, setReminderDay2] = useState(7);
  const [reminderDay3, setReminderDay3] = useState(14);
  const [isSavingReminderDays, setIsSavingReminderDays] = useState(false);

  // Session reminder settings
  const [sessionRemindersEnabled, setSessionRemindersEnabled] = useState(true);
  const [isSavingSessionReminder, setIsSavingSessionReminder] = useState(false);
  const [session1hRemindersEnabled, setSession1hRemindersEnabled] = useState(true);
  const [isSaving1hReminder, setIsSaving1hReminder] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState<'24h' | '1h' | null>(null);

  // Email notification settings
  const [welcomeEmailEnabled, setWelcomeEmailEnabled] = useState(true);
  const [protocolSentEmailEnabled, setProtocolSentEmailEnabled] = useState(true);
  const [paymentConfirmationEmailEnabled, setPaymentConfirmationEmailEnabled] = useState(true);
  const [shipmentNotificationEnabled, setShipmentNotificationEnabled] = useState(true);
  const [protocolApprovedEmailEnabled, setProtocolApprovedEmailEnabled] = useState(true);
  const [isSavingNotification, setIsSavingNotification] = useState<string | null>(null);

  // Inventory alert settings state
  const [restockAlertsEnabled, setRestockAlertsEnabled] = useState(true);
  const [restockThreshold, setRestockThreshold] = useState(-3);
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [isSavingInventoryAlerts, setIsSavingInventoryAlerts] = useState(false);
  const [restockEmailSubject, setRestockEmailSubject] = useState('🔴 Restock Alert: {{count}} item(s) below threshold ({{threshold}})');
  const [restockEmailIntro, setRestockEmailIntro] = useState('The following inventory items have dropped below your configured restock threshold and need to be reordered:');
  const [isSendingTestRestock, setIsSendingTestRestock] = useState(false);
  // Check-in email customization state
  const [checkinEmailSubject, setCheckinEmailSubject] = useState('📊 Weekly Progress Check-In - {{protocolName}}');
  const [checkinEmailGreeting, setCheckinEmailGreeting] = useState('This is your weekly reminder to track your progress on your {{protocolName}} protocol. Consistent tracking helps you and {{coachName}} see what\'s working!');
  const [checkinEmailCtaText, setCheckinEmailCtaText] = useState('Complete Your Check-In');
  const [isSavingCheckinEmail, setIsSavingCheckinEmail] = useState(false);
  const [showCheckinPreview, setShowCheckinPreview] = useState(false);
  const [isSendingTestCheckin, setIsSendingTestCheckin] = useState(false);

  // Fetch current settings
  const { data: ageDisclaimerSetting, isLoading } = trpc.settings.get.useQuery({ key: "age_disclaimer_enabled" });
  const { data: smtpHostSetting } = trpc.settings.get.useQuery({ key: "smtp_host" });
  const { data: smtpUserSetting } = trpc.settings.get.useQuery({ key: "smtp_user" });
  const { data: smtpPassSetting } = trpc.settings.get.useQuery({ key: "smtp_pass" });
  const { data: smtpFromSetting } = trpc.settings.get.useQuery({ key: "smtp_from" });
  const { data: waiverExpirationSettings, isLoading: loadingWaiverSettings } = trpc.waiver.getExpirationSettings.useQuery();
  const { data: paymentReminderSetting } = trpc.settings.get.useQuery({ key: "payment_reminders_enabled" });
  const { data: reminderDay1Setting } = trpc.settings.get.useQuery({ key: "payment_reminder_day_1" });
  const { data: reminderDay2Setting } = trpc.settings.get.useQuery({ key: "payment_reminder_day_2" });
  const { data: reminderDay3Setting } = trpc.settings.get.useQuery({ key: "payment_reminder_day_3" });
  const { data: sessionReminderSetting } = trpc.settings.get.useQuery({ key: "session_reminders_enabled" });
  const { data: session1hReminderSetting } = trpc.settings.get.useQuery({ key: "session_1h_reminders_enabled" });
  
  // Notification settings queries
  const { data: welcomeEmailSetting } = trpc.settings.get.useQuery({ key: "notification_welcome_email" });
  const { data: protocolSentEmailSetting } = trpc.settings.get.useQuery({ key: "notification_protocol_sent" });
  const { data: paymentConfirmationEmailSetting } = trpc.settings.get.useQuery({ key: "notification_payment_confirmation" });
  const { data: shipmentNotificationSetting } = trpc.settings.get.useQuery({ key: "notification_shipment" });
  const { data: protocolApprovedEmailSetting } = trpc.settings.get.useQuery({ key: "notification_protocol_approved" });
  
  // Inventory alert settings queries
  const { data: restockAlertsSetting } = trpc.settings.get.useQuery({ key: "restock_alerts_enabled" });
  const { data: restockThresholdSetting } = trpc.settings.get.useQuery({ key: "restock_alert_threshold" });
  const { data: excludedCategoriesSetting } = trpc.settings.get.useQuery({ key: "inventory_excluded_categories" });
  const { data: restockEmailSubjectSetting } = trpc.settings.get.useQuery({ key: "restock_email_subject" });
  const { data: restockEmailIntroSetting } = trpc.settings.get.useQuery({ key: "restock_email_intro" });
  const { data: inventoryCategories } = trpc.inventory.listCategories.useQuery();
  const sendRestockAlertsMutation = trpc.inventory.sendLowStockAlerts.useMutation();
  // Check-in email settings queries
  const { data: checkinSubjectSetting } = trpc.settings.get.useQuery({ key: 'checkin_email_subject' });
  const { data: checkinGreetingSetting } = trpc.settings.get.useQuery({ key: 'checkin_email_greeting' });
  const { data: checkinCtaSetting } = trpc.settings.get.useQuery({ key: 'checkin_email_cta_text' });

  const setSettingMutation = trpc.settings.set.useMutation();
  const settingsSet = trpc.settings.set.useMutation();
  const sendTestCheckinMutation = trpc.settings.sendTestCheckinEmail.useMutation();
  const updateWaiverExpirationMutation = trpc.waiver.updateExpirationSettings.useMutation();

  useEffect(() => {
    if (ageDisclaimerSetting !== undefined) {
      setAgeDisclaimerEnabled(ageDisclaimerSetting !== "false");
    }
  }, [ageDisclaimerSetting]);

  useEffect(() => {
    if (smtpHostSetting) setSmtpHost(smtpHostSetting);
    if (smtpUserSetting) setSmtpUser(smtpUserSetting);
    if (smtpPassSetting) setSmtpPass(smtpPassSetting);
    if (smtpFromSetting) setSmtpFrom(smtpFromSetting);
  }, [smtpHostSetting, smtpUserSetting, smtpPassSetting, smtpFromSetting]);

  useEffect(() => {
    if (waiverExpirationSettings) {
      setWaiverExpirationMonths(waiverExpirationSettings.expirationMonths);
    }
  }, [waiverExpirationSettings]);

  useEffect(() => {
    if (paymentReminderSetting !== undefined) {
      setPaymentRemindersEnabled(paymentReminderSetting !== "false");
    }
  }, [paymentReminderSetting]);

  useEffect(() => {
    if (reminderDay1Setting) setReminderDay1(parseInt(reminderDay1Setting) || 3);
    if (reminderDay2Setting) setReminderDay2(parseInt(reminderDay2Setting) || 7);
    if (reminderDay3Setting) setReminderDay3(parseInt(reminderDay3Setting) || 14);
  }, [reminderDay1Setting, reminderDay2Setting, reminderDay3Setting]);

  useEffect(() => {
    if (sessionReminderSetting !== undefined) {
      setSessionRemindersEnabled(sessionReminderSetting !== "false");
    }
  }, [sessionReminderSetting]);

  useEffect(() => {
    if (session1hReminderSetting !== undefined) {
      setSession1hRemindersEnabled(session1hReminderSetting !== "false");
    }
  }, [session1hReminderSetting]);

  // Load inventory alert settings
  useEffect(() => {
    if (restockAlertsSetting !== undefined) setRestockAlertsEnabled(restockAlertsSetting !== "false");
  }, [restockAlertsSetting]);
  useEffect(() => {
    if (restockThresholdSetting) setRestockThreshold(parseInt(restockThresholdSetting) || -3);
  }, [restockThresholdSetting]);
  useEffect(() => {
    if (excludedCategoriesSetting) {
      try { setExcludedCategories(JSON.parse(excludedCategoriesSetting)); } catch { setExcludedCategories([]); }
    }
  }, [excludedCategoriesSetting]);
  useEffect(() => {
    if (restockEmailSubjectSetting) setRestockEmailSubject(restockEmailSubjectSetting);
  }, [restockEmailSubjectSetting]);
  useEffect(() => {
    if (restockEmailIntroSetting) setRestockEmailIntro(restockEmailIntroSetting);
  }, [restockEmailIntroSetting]);

  // Load notification settings
  useEffect(() => {
    if (welcomeEmailSetting !== undefined) setWelcomeEmailEnabled(welcomeEmailSetting !== "false");
  }, [welcomeEmailSetting]);
  useEffect(() => {
    if (protocolSentEmailSetting !== undefined) setProtocolSentEmailEnabled(protocolSentEmailSetting !== "false");
  }, [protocolSentEmailSetting]);
  useEffect(() => {
    if (paymentConfirmationEmailSetting !== undefined) setPaymentConfirmationEmailEnabled(paymentConfirmationEmailSetting !== "false");
  }, [paymentConfirmationEmailSetting]);
  useEffect(() => {
    if (shipmentNotificationSetting !== undefined) setShipmentNotificationEnabled(shipmentNotificationSetting !== "false");
  }, [shipmentNotificationSetting]);
  useEffect(() => {
    if (protocolApprovedEmailSetting !== undefined) setProtocolApprovedEmailEnabled(protocolApprovedEmailSetting !== "false");
  }, [protocolApprovedEmailSetting]);
  // Load check-in email settings
  useEffect(() => {
    if (checkinSubjectSetting) setCheckinEmailSubject(checkinSubjectSetting);
  }, [checkinSubjectSetting]);
  useEffect(() => {
    if (checkinGreetingSetting) setCheckinEmailGreeting(checkinGreetingSetting);
  }, [checkinGreetingSetting]);
  useEffect(() => {
    if (checkinCtaSetting) setCheckinEmailCtaText(checkinCtaSetting);
  }, [checkinCtaSetting]);

  // Build check-in email preview HTML
  const buildCheckinPreviewHtml = (opts: { subject: string; greeting: string; ctaText: string }) => {
    const sampleGreeting = opts.greeting
      .replace(/\{\{clientName\}\}/g, 'Sarah Johnson')
      .replace(/\{\{protocolName\}\}/g, 'Sarah Johnson')
      .replace(/\{\{coachName\}\}/g, 'Jason')
      .replace(/\{\{weekNumber\}\}/g, '4');
    const ctaText = opts.ctaText || 'Complete Your Check-In';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#0f172a;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="text-align:center;margin-bottom:0;"><div style="background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);padding:30px;border-radius:16px 16px 0 0;">
<img src="https://peptidecoach.pro/omega-longevity-logo.png" alt="Omega Longevity" style="height:50px;margin-bottom:15px;" />
<h1 style="color:#fff;margin:0;font-size:24px;font-weight:600;">Weekly Progress Check-In</h1>
<p style="color:rgba(255,255,255,0.9);margin:10px 0 0;font-size:14px;">Week 4 &bull; Time to track your health journey!</p>
</div></div>
<div style="background-color:#1e293b;padding:30px;color:#e2e8f0;">
<p style="font-size:16px;margin:0 0 16px;color:#e2e8f0;">Hi Sarah Johnson,</p>
<p style="color:#94a3b8;font-size:14px;margin:0 0 24px;line-height:1.6;">${sampleGreeting}</p>
<div style="text-align:center;margin-bottom:28px;"><a href="#" style="display:inline-block;background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);color:white;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:600;font-size:16px;">${ctaText}</a></div>
<div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #334155;">
<h3 style="color:#f97316;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">This Week's Suggestions</h3>
<div style="color:#e2e8f0;font-size:14px;padding:8px 0;border-bottom:1px solid #334155;">📸 Upload a progress photo to track your transformation</div>
<div style="color:#e2e8f0;font-size:14px;padding:8px 0;border-bottom:1px solid #334155;">📝 Log your mood, energy, and sleep quality</div>
</div>
<div style="display:flex;gap:16px;margin-bottom:24px;">
<div style="flex:1;background:#0f172a;border-radius:8px;padding:16px;text-align:center;border:1px solid #334155;"><p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">Last Photo</p><p style="color:#f8fafc;font-size:16px;font-weight:600;margin:0;">3 days ago</p></div>
<div style="flex:1;background:#0f172a;border-radius:8px;padding:16px;text-align:center;border:1px solid #334155;"><p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">Last Journal</p><p style="color:#f8fafc;font-size:16px;font-weight:600;margin:0;">Never</p></div>
</div>
<div style="text-align:center;margin-bottom:24px;"><a href="#" style="display:inline-block;background:transparent;color:#f97316;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:500;font-size:14px;border:1px solid #f97316;">Open My Dashboard</a></div>
<div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #334155;">
<h3 style="color:#f97316;font-size:14px;margin:0 0 15px;text-transform:uppercase;letter-spacing:0.5px;">Explore</h3>
<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #334155;"><a href="#" style="color:#f1f5f9;text-decoration:none;font-weight:600;font-size:14px;">Store</a><p style="color:#94a3b8;margin:4px 0 0;font-size:12px;">Browse peptides and supplements</p></div>
<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #334155;"><a href="#" style="color:#f1f5f9;text-decoration:none;font-weight:600;font-size:14px;">Coaching &amp; Programs</a><p style="color:#94a3b8;margin:4px 0 0;font-size:12px;">Your central hub for all Omega resources</p></div>
<div><a href="#" style="color:#f1f5f9;text-decoration:none;font-weight:600;font-size:14px;">Inside Omega Podcast</a><p style="color:#94a3b8;margin:4px 0 0;font-size:12px;">Listen to Jason &amp; Lane discuss health optimization</p></div>
</div>
<div style="text-align:center;padding-top:20px;border-top:1px solid #334155;"><p style="color:#94a3b8;margin:0;font-size:13px;">Questions? Contact us at <a href="#" style="color:#f97316;">omega@omegalongevity.com</a></p></div>
</div>
<div style="background-color:#0f172a;border-radius:0 0 16px 16px;text-align:center;padding:20px;color:#64748b;font-size:12px;">
<p style="margin:0 0 8px;">Omega Longevity<br>1098 W. South Jordan Pkwy #106, South Jordan, UT 84095</p>
<p style="margin:0;color:#475569;">You're receiving this because you're enrolled in a health optimization protocol.</p>
</div>
</div></body></html>`;
  };

  const handleSaveSmtpSettings = async () => {
    setIsSavingSmtp(true);
    try {
      await Promise.all([
        setSettingMutation.mutateAsync({ key: "smtp_host", value: smtpHost }),
        setSettingMutation.mutateAsync({ key: "smtp_user", value: smtpUser }),
        setSettingMutation.mutateAsync({ key: "smtp_pass", value: smtpPass }),
        setSettingMutation.mutateAsync({ key: "smtp_from", value: smtpFrom }),
      ]);
      toast.success("SMTP settings saved successfully");
    } catch (error) {
      toast.error("Failed to save SMTP settings");
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleAgeDisclaimerToggle = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      await setSettingMutation.mutateAsync({
        key: "age_disclaimer_enabled",
        value: enabled ? "true" : "false",
      });
      setAgeDisclaimerEnabled(enabled);
      toast.success(enabled ? "Age disclaimer enabled" : "Age disclaimer disabled");
    } catch (error) {
      toast.error("Failed to update setting");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWaiverExpiration = async () => {
    setIsSavingWaiver(true);
    try {
      await updateWaiverExpirationMutation.mutateAsync({ expirationMonths: waiverExpirationMonths });
      toast.success("Waiver expiration settings saved");
    } catch (error) {
      toast.error("Failed to save waiver settings");
    } finally {
      setIsSavingWaiver(false);
    }
  };

  const handlePaymentReminderToggle = async (enabled: boolean) => {
    setIsSavingPaymentReminder(true);
    try {
      await setSettingMutation.mutateAsync({
        key: "payment_reminders_enabled",
        value: enabled ? "true" : "false",
      });
      setPaymentRemindersEnabled(enabled);
      toast.success(enabled ? "Payment reminders enabled" : "Payment reminders disabled");
    } catch (error) {
      toast.error("Failed to update setting");
    } finally {
      setIsSavingPaymentReminder(false);
    }
  };

  const handleSessionReminderToggle = async (enabled: boolean) => {
    setIsSavingSessionReminder(true);
    try {
      await setSettingMutation.mutateAsync({
        key: "session_reminders_enabled",
        value: enabled ? "true" : "false",
      });
      setSessionRemindersEnabled(enabled);
      toast.success(enabled ? "Session reminders enabled" : "Session reminders disabled");
    } catch (error) {
      toast.error("Failed to update setting");
    } finally {
      setIsSavingSessionReminder(false);
    }
  };

  const handle1hReminderToggle = async (enabled: boolean) => {
    setIsSaving1hReminder(true);
    try {
      await setSettingMutation.mutateAsync({
        key: "session_1h_reminders_enabled",
        value: enabled ? "true" : "false",
      });
      setSession1hRemindersEnabled(enabled);
      toast.success(enabled ? "1-hour reminders enabled" : "1-hour reminders disabled");
    } catch (error) {
      toast.error("Failed to update setting");
    } finally {
      setIsSaving1hReminder(false);
    }
  };

  const handleSaveInventoryAlerts = async () => {
    setIsSavingInventoryAlerts(true);
    try {
      await Promise.all([
        setSettingMutation.mutateAsync({ key: "restock_alerts_enabled", value: restockAlertsEnabled ? "true" : "false" }),
        setSettingMutation.mutateAsync({ key: "restock_alert_threshold", value: restockThreshold.toString() }),
        setSettingMutation.mutateAsync({ key: "inventory_excluded_categories", value: JSON.stringify(excludedCategories) }),
        setSettingMutation.mutateAsync({ key: "restock_email_subject", value: restockEmailSubject }),
        setSettingMutation.mutateAsync({ key: "restock_email_intro", value: restockEmailIntro }),
      ]);
      toast.success("Inventory alert settings saved");
    } catch (error) {
      toast.error("Failed to save inventory alert settings");
    } finally {
      setIsSavingInventoryAlerts(false);
    }
  };

  const handleSendTestRestockAlert = async () => {
    setIsSendingTestRestock(true);
    try {
      const result = await sendRestockAlertsMutation.mutateAsync();
      if (result.itemCount === 0) {
        toast.info("No low stock items to report");
      } else {
        toast.success(`Restock alert sent for ${result.itemCount} items (${result.emailsSent} emails)`);
      }
    } catch (error) {
      toast.error("Failed to send restock alert");
    } finally {
      setIsSendingTestRestock(false);
    }
  };

  const toggleExcludedCategory = (categoryName: string) => {
    setExcludedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleNotificationToggle = async (key: string, enabled: boolean, setter: (val: boolean) => void) => {
    setIsSavingNotification(key);
    try {
      await setSettingMutation.mutateAsync({
        key,
        value: enabled ? "true" : "false",
      });
      setter(enabled);
      toast.success(enabled ? "Notification enabled" : "Notification disabled");
    } catch (error) {
      toast.error("Failed to update notification setting");
    } finally {
      setIsSavingNotification(null);
    }
  };

  const handleSaveReminderDays = async () => {
    // Validate that days are in ascending order
    if (reminderDay1 >= reminderDay2 || reminderDay2 >= reminderDay3) {
      toast.error("Reminder days must be in ascending order (Day 1 < Day 2 < Day 3)");
      return;
    }
    if (reminderDay1 < 1 || reminderDay3 > 30) {
      toast.error("Reminder days must be between 1 and 30");
      return;
    }
    
    setIsSavingReminderDays(true);
    try {
      await Promise.all([
        setSettingMutation.mutateAsync({ key: "payment_reminder_day_1", value: reminderDay1.toString() }),
        setSettingMutation.mutateAsync({ key: "payment_reminder_day_2", value: reminderDay2.toString() }),
        setSettingMutation.mutateAsync({ key: "payment_reminder_day_3", value: reminderDay3.toString() }),
      ]);
      toast.success("Reminder schedule saved. Changes will take effect on the next cron run.");
    } catch (error) {
      toast.error("Failed to save reminder schedule");
    } finally {
      setIsSavingReminderDays(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-500/20 rounded-xl">
            <SettingsIcon className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
            <p className="text-gray-600">Configure platform-wide settings and preferences</p>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-gray-100 border border-gray-200">
            <TabsTrigger value="general" className="data-[state=active]:bg-orange-500">
              <SettingsIcon className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="disclaimers" className="data-[state=active]:bg-orange-500">
              <Shield className="h-4 w-4 mr-2" />
              Disclaimers
            </TabsTrigger>
            <TabsTrigger value="waivers" className="data-[state=active]:bg-orange-500">
              <FileText className="h-4 w-4 mr-2" />
              Waivers
            </TabsTrigger>
            <TabsTrigger value="email" className="data-[state=active]:bg-orange-500">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-orange-500">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="admins" className="data-[state=active]:bg-orange-500">
              <Users className="h-4 w-4 mr-2" />
              Admin Users
            </TabsTrigger>
            <TabsTrigger value="tools" className="data-[state=active]:bg-orange-500">
              <Wrench className="h-4 w-4 mr-2" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="email-reply" className="data-[state=active]:bg-orange-500">
              <MessageSquare className="h-4 w-4 mr-1" />
              Email Reply Bridge
            </TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:bg-orange-500">
              <Package className="h-4 w-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="checkin-email" className="data-[state=active]:bg-orange-500">
              <Mail className="h-4 w-4 mr-2" />
              Check-In Email
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4">
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">General Settings</CardTitle>
                <CardDescription className="text-gray-600">
                  Basic platform configuration options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Reminders Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-1">
                    <Label htmlFor="payment-reminders" className="text-gray-900 font-medium flex items-center gap-2">
                      <Bell className="h-4 w-4 text-orange-500" />
                      Automatic Payment Reminders
                    </Label>
                    <p className="text-sm text-gray-600">
                      When enabled, the system will automatically send payment reminder emails to clients with pending payments on days 3, 7, and 14 after their protocol is sent. Only applies to protocols that have been sent (not drafts).
                    </p>
                  </div>
                  <Switch
                    id="payment-reminders"
                    checked={paymentRemindersEnabled}
                    onCheckedChange={handlePaymentReminderToggle}
                    disabled={isSavingPaymentReminder}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>

                {/* Customizable Reminder Schedule */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <Label className="text-gray-900 font-medium">Reminder Schedule (Days After Protocol Sent)</Label>
                  </div>
                  <p className="text-sm text-gray-600">
                    Customize when payment reminder emails are sent. Reminders are sent at 9:00 AM daily.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reminder-day-1" className="text-gray-700 text-sm">First Reminder (Friendly)</Label>
                      <Input
                        id="reminder-day-1"
                        type="number"
                        min={1}
                        max={30}
                        value={reminderDay1}
                        onChange={(e) => setReminderDay1(parseInt(e.target.value) || 3)}
                        className="bg-gray-100 border-gray-300 text-gray-900"
                      />
                      <p className="text-xs text-gray-500">Day {reminderDay1}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reminder-day-2" className="text-gray-700 text-sm">Second Reminder (Moderate)</Label>
                      <Input
                        id="reminder-day-2"
                        type="number"
                        min={1}
                        max={30}
                        value={reminderDay2}
                        onChange={(e) => setReminderDay2(parseInt(e.target.value) || 7)}
                        className="bg-gray-100 border-gray-300 text-gray-900"
                      />
                      <p className="text-xs text-gray-500">Day {reminderDay2}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reminder-day-3" className="text-gray-700 text-sm">Third Reminder (Urgent)</Label>
                      <Input
                        id="reminder-day-3"
                        type="number"
                        min={1}
                        max={30}
                        value={reminderDay3}
                        onChange={(e) => setReminderDay3(parseInt(e.target.value) || 14)}
                        className="bg-gray-100 border-gray-300 text-gray-900"
                      />
                      <p className="text-xs text-gray-500">Day {reminderDay3}</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveReminderDays}
                      disabled={isSavingReminderDays}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {isSavingReminderDays && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <Save className="h-4 w-4 mr-2" />
                      Save Schedule
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-400 mb-1">How It Works</p>
                      <p className="text-gray-700">
                        Reminders are sent at 9:00 AM daily. Clients receive reminders on the configured days after their protocol is sent. Reminders stop once payment is received or the client opts out.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Session Reminders Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-1">
                    <Label htmlFor="session-reminders" className="text-gray-900 font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-500" />
                      Session Reminder Emails
                    </Label>
                    <p className="text-sm text-gray-600">
                      When enabled, clients will automatically receive an email reminder 24 hours before their scheduled coaching sessions. Includes session details, meeting link, and preparation tips.
                    </p>
                  </div>
                  <Switch
                    id="session-reminders"
                    checked={sessionRemindersEnabled}
                    onCheckedChange={handleSessionReminderToggle}
                    disabled={isSavingSessionReminder}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>

                {/* 1-Hour Reminder Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-1">
                    <Label htmlFor="1h-reminders" className="text-gray-900 font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      1-Hour Reminder Emails
                    </Label>
                    <p className="text-sm text-gray-600">
                      Send an additional reminder 1 hour before sessions for clients who may need a last-minute nudge.
                    </p>
                  </div>
                  <Switch
                    id="1h-reminders"
                    checked={session1hRemindersEnabled}
                    onCheckedChange={handle1hReminderToggle}
                    disabled={isSaving1hReminder || !sessionRemindersEnabled}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>

                {/* Email Preview Buttons */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-blue-500" />
                    <Label className="text-gray-900 font-medium">Preview Email Templates</Label>
                  </div>
                  <p className="text-sm text-gray-600">
                    Preview exactly what your clients will receive before enabling reminders.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEmailPreview('24h')}
                      className="border-green-500 text-green-600 hover:bg-green-50"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview 24-Hour Email
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEmailPreview('1h')}
                      className="border-amber-500 text-amber-600 hover:bg-amber-50"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview 1-Hour Email
                    </Button>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-green-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-green-600 mb-1">Session Reminder Details</p>
                      <p className="text-gray-700">
                        The system checks for upcoming sessions every 15 minutes. 24-hour reminders are sent a day before, and 1-hour reminders (if enabled) are sent shortly before the session. Both include session details, meeting link, and preparation tips.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Disclaimers Settings */}
          <TabsContent value="disclaimers" className="space-y-4">
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-500" />
                  Age Verification Disclaimer
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Control the 18+ age verification popup that appears when visitors first access the site
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-1">
                      <Label htmlFor="age-disclaimer" className="text-gray-900 font-medium">
                        Enable Age Disclaimer Popup
                      </Label>
                      <p className="text-sm text-gray-600">
                        When enabled, visitors must confirm they are 18+ before accessing the site. This verification is stored and only shown once per visitor.
                      </p>
                    </div>
                    <Switch
                      id="age-disclaimer"
                      checked={ageDisclaimerEnabled}
                      onCheckedChange={handleAgeDisclaimerToggle}
                      disabled={isSaving}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>
                )}

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-400 mb-1">Important Notice</p>
                      <p className="text-gray-700">
                        The age disclaimer helps protect your business by ensuring visitors acknowledge they are of legal age to view content related to health optimization, peptides, and supplements. It is recommended to keep this enabled for compliance purposes.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email/SMTP Settings */}
          <TabsContent value="email" className="space-y-4">
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-orange-500" />
                  SMTP Email Configuration
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Configure SMTP settings to enable sending protocol PDFs via email to clients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host" className="text-gray-900">SMTP Host</Label>
                    <Input
                      id="smtp-host"
                      placeholder="smtp.gmail.com or smtp.sendgrid.net"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      className="bg-gray-50 border-gray-200 text-gray-900"
                    />
                    <p className="text-xs text-gray-500">The SMTP server hostname</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtp-user" className="text-gray-900">SMTP Username</Label>
                    <Input
                      id="smtp-user"
                      placeholder="your-email@gmail.com or apikey"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      className="bg-gray-50 border-gray-200 text-gray-900"
                    />
                    <p className="text-xs text-gray-500">Your email or API key username</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtp-pass" className="text-gray-900">SMTP Password</Label>
                    <Input
                      id="smtp-pass"
                      type="password"
                      placeholder="••••••••••••"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      className="bg-gray-50 border-gray-200 text-gray-900"
                    />
                    <p className="text-xs text-gray-500">Your app password or API key (for Gmail, use an app-specific password)</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="smtp-from" className="text-gray-900">From Email Address</Label>
                    <Input
                      id="smtp-from"
                      placeholder="noreply@omegalongevity.com"
                      value={smtpFrom}
                      onChange={(e) => setSmtpFrom(e.target.value)}
                      className="bg-gray-50 border-gray-200 text-gray-900"
                    />
                    <p className="text-xs text-gray-500">The email address that will appear as the sender</p>
                  </div>
                </div>

                <Button
                  onClick={handleSaveSmtpSettings}
                  disabled={isSavingSmtp}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {isSavingSmtp ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Save SMTP Settings</>
                  )}
                </Button>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-400 mb-1">Setup Guide</p>
                      <p className="text-gray-700 mb-2">
                        <strong>For Gmail:</strong> Use smtp.gmail.com as host, your Gmail address as username, and an app-specific password (generate at myaccount.google.com/apppasswords).
                      </p>
                      <p className="text-gray-700 mb-2">
                        <strong>For SendGrid:</strong> Use smtp.sendgrid.net as host, "apikey" as username, and your SendGrid API key as password.
                      </p>
                      <p className="text-gray-700">
                        <strong>For Mailgun:</strong> Use smtp.mailgun.org as host, your Mailgun SMTP credentials for username/password.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Waivers Settings */}
          <TabsContent value="waivers" className="space-y-4">
            {/* Waiver Expiration Settings */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  Waiver Expiration Settings
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Configure how long store waivers remain valid before requiring renewal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingWaiverSettings ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="space-y-1">
                        <Label className="text-gray-900 font-medium">
                          Waiver Validity Period
                        </Label>
                        <p className="text-sm text-gray-600">
                          How long a signed waiver remains valid. Clients will receive a renewal reminder 7 days before expiration.
                        </p>
                      </div>
                      <Select
                        value={waiverExpirationMonths.toString()}
                        onValueChange={(value) => setWaiverExpirationMonths(parseInt(value))}
                      >
                        <SelectTrigger className="w-[180px] bg-gray-50 border-gray-200 text-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-100 border-gray-200">
                          <SelectItem value="0" className="text-gray-900">Never expires</SelectItem>
                          <SelectItem value="3" className="text-gray-900">3 months</SelectItem>
                          <SelectItem value="6" className="text-gray-900">6 months</SelectItem>
                          <SelectItem value="12" className="text-gray-900">12 months (1 year)</SelectItem>
                          <SelectItem value="24" className="text-gray-900">24 months (2 years)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleSaveWaiverExpiration}
                      disabled={isSavingWaiver}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {isSavingWaiver ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                      ) : (
                        <><Save className="h-4 w-4 mr-2" /> Save Expiration Settings</>
                      )}
                    </Button>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-400 mb-1">How It Works</p>
                          <p className="text-gray-700">
                            When a client signs a waiver, it will be valid for the selected period. 7 days before expiration, they will receive an email with a direct link to renew their waiver. If a waiver expires, the client will need to sign a new one to access the Omega Store.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Waiver List */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-500" />
                  Store Waiver Management
                </CardTitle>
                <CardDescription className="text-gray-600">
                  View and manage signed store waivers from clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WaiverList />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-4">
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  Email Notification Settings
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Enable or disable specific email notifications sent to clients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Welcome Email */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-1">
                    <Label className="text-gray-900 font-medium">Welcome Email</Label>
                    <p className="text-sm text-gray-600">
                      Sent when a new client account is created
                    </p>
                  </div>
                  <Switch
                    checked={welcomeEmailEnabled}
                    onCheckedChange={(checked) => handleNotificationToggle("notification_welcome_email", checked, setWelcomeEmailEnabled)}
                    disabled={isSavingNotification === "notification_welcome_email"}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>

                {/* Protocol Sent Email */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-1">
                    <Label className="text-gray-900 font-medium">Protocol Sent Email</Label>
                    <p className="text-sm text-gray-600">
                      Sent when a protocol is sent to a client for review
                    </p>
                  </div>
                  <Switch
                    checked={protocolSentEmailEnabled}
                    onCheckedChange={(checked) => handleNotificationToggle("notification_protocol_sent", checked, setProtocolSentEmailEnabled)}
                    disabled={isSavingNotification === "notification_protocol_sent"}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>

                {/* Protocol Approved Email */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-1">
                    <Label className="text-gray-900 font-medium">Protocol Approved Email</Label>
                    <p className="text-sm text-gray-600">
                      Sent to admin when a client approves their protocol
                    </p>
                  </div>
                  <Switch
                    checked={protocolApprovedEmailEnabled}
                    onCheckedChange={(checked) => handleNotificationToggle("notification_protocol_approved", checked, setProtocolApprovedEmailEnabled)}
                    disabled={isSavingNotification === "notification_protocol_approved"}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>

                {/* Payment Confirmation Email */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-1">
                    <Label className="text-gray-900 font-medium">Payment Confirmation Email</Label>
                    <p className="text-sm text-gray-600">
                      Sent when a payment is successfully processed
                    </p>
                  </div>
                  <Switch
                    checked={paymentConfirmationEmailEnabled}
                    onCheckedChange={(checked) => handleNotificationToggle("notification_payment_confirmation", checked, setPaymentConfirmationEmailEnabled)}
                    disabled={isSavingNotification === "notification_payment_confirmation"}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>

                {/* Shipment Notification */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-1">
                    <Label className="text-gray-900 font-medium">Shipment Notification</Label>
                    <p className="text-sm text-gray-600">
                      Sent when a packing slip is signed off and order is shipped
                    </p>
                  </div>
                  <Switch
                    checked={shipmentNotificationEnabled}
                    onCheckedChange={(checked) => handleNotificationToggle("notification_shipment", checked, setShipmentNotificationEnabled)}
                    disabled={isSavingNotification === "notification_shipment"}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-400 mb-1">Note</p>
                      <p className="text-gray-700">
                        Payment reminders can be configured separately in the General tab. These settings control individual notification types - disabling a notification here will prevent it from being sent to any client.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Users Management */}
          <TabsContent value="admins" className="space-y-4">
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-500" />
                  Admin Users
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Manage admin privileges and user roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminUsersList />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tools & Configuration */}
          <TabsContent value="tools" className="space-y-4">
            <ToolsSection />
          </TabsContent>

          {/* Email Reply Bridge */}
          <TabsContent value="email-reply" className="space-y-4">
            <EmailReplyBridgeSection />
          </TabsContent>

          {/* Inventory Alerts Settings */}
          <TabsContent value="inventory" className="space-y-4">
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-500" />
                  Inventory Alert Settings
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Configure automatic restock alerts and excluded categories for inventory monitoring
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable/Disable Restock Alerts */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-1">
                    <Label htmlFor="restock-alerts" className="text-gray-900 font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Automatic Restock Alerts
                    </Label>
                    <p className="text-sm text-gray-600">
                      When enabled, the system will automatically send email alerts to admins when inventory items drop below the configured threshold after a sale or protocol deduction.
                    </p>
                  </div>
                  <Switch
                    id="restock-alerts"
                    checked={restockAlertsEnabled}
                    onCheckedChange={setRestockAlertsEnabled}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>

                {/* Restock Threshold */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                  <Label className="text-gray-900 font-medium">Restock Alert Threshold</Label>
                  <p className="text-sm text-gray-600">
                    Send an alert when any tracked item's stock drops to or below this number. Use negative values (e.g., -3) to only alert when stock goes significantly negative.
                  </p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={restockThreshold}
                      onChange={(e) => setRestockThreshold(parseInt(e.target.value) || 0)}
                      className="w-32 bg-white border-gray-300"
                    />
                    <span className="text-sm text-gray-500">Current threshold: {restockThreshold}</span>
                  </div>
                </div>

                {/* Excluded Categories */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                  <Label className="text-gray-900 font-medium">Excluded Categories</Label>
                  <p className="text-sm text-gray-600">
                    Items in these categories will not trigger restock alerts or show negative stock warnings on the Inventory page. Click to toggle.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {inventoryCategories?.map((cat) => {
                      const isExcluded = excludedCategories.includes(cat.name);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => toggleExcludedCategory(cat.name)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                            isExcluded
                              ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
                              : 'bg-white border-gray-300 text-gray-700 hover:border-orange-400'
                          }`}
                        >
                          {isExcluded ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5 text-green-500" />}
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                  {excludedCategories.length > 0 && (
                    <p className="text-xs text-red-600">
                      {excludedCategories.length} categor{excludedCategories.length === 1 ? 'y' : 'ies'} excluded: {excludedCategories.join(', ')}
                    </p>
                  )}
                </div>

                {/* Email Customization */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                  <Label className="text-gray-900 font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-orange-500" />
                    Restock Alert Email Customization
                  </Label>
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-700">Email Subject</Label>
                    <Input
                      value={restockEmailSubject}
                      onChange={(e) => setRestockEmailSubject(e.target.value)}
                      className="bg-white border-gray-300"
                      placeholder="Use {{count}} for item count and {{threshold}} for threshold value"
                    />
                    <p className="text-xs text-gray-500">Variables: {'{{count}}'} = number of items, {'{{threshold}}'} = threshold value</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-700">Email Introduction Text</Label>
                    <textarea
                      value={restockEmailIntro}
                      onChange={(e) => setRestockEmailIntro(e.target.value)}
                      className="w-full min-h-[80px] px-3 py-2 rounded-md border border-gray-300 bg-white text-sm"
                      placeholder="The introductory paragraph shown in the restock alert email"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleSaveInventoryAlerts}
                    disabled={isSavingInventoryAlerts}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {isSavingInventoryAlerts ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="h-4 w-4 mr-2" /> Save Settings</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSendTestRestockAlert}
                    disabled={isSendingTestRestock}
                  >
                    {isSendingTestRestock ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" /> Send Test Alert Now</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Check-In Email Customization Tab */}
          <TabsContent value="checkin-email" className="space-y-4">
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Check-In Email Template</CardTitle>
                <CardDescription>Customize the weekly check-in email sent to clients. Use placeholders: {`{{clientName}}`}, {`{{protocolName}}`}, {`{{coachName}}`}, {`{{weekNumber}}`}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Email Subject Line</Label>
                  <Input
                    value={checkinEmailSubject}
                    onChange={(e) => setCheckinEmailSubject(e.target.value)}
                    placeholder="📊 Weekly Progress Check-In - {{protocolName}}"
                    className="bg-white border-gray-300 text-gray-900"
                  />
                  <p className="text-xs text-gray-500">Default: 📊 Weekly Progress Check-In - {`{{protocolName}}`}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Greeting / Body Text</Label>
                  <textarea
                    value={checkinEmailGreeting}
                    onChange={(e) => setCheckinEmailGreeting(e.target.value)}
                    placeholder="This is your weekly reminder to track your progress on your {{protocolName}} protocol. Consistent tracking helps you and {{coachName}} see what's working!"
                    className="w-full min-h-[100px] p-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500">This appears below "Hi {`{{clientName}}`}," in the email body.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Button Text</Label>
                  <Input
                    value={checkinEmailCtaText}
                    onChange={(e) => setCheckinEmailCtaText(e.target.value)}
                    placeholder="Complete Your Check-In"
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={async () => {
                      setIsSavingCheckinEmail(true);
                      try {
                        await Promise.all([
                          settingsSet.mutateAsync({ key: 'checkin_email_subject', value: checkinEmailSubject }),
                          settingsSet.mutateAsync({ key: 'checkin_email_greeting', value: checkinEmailGreeting }),
                          settingsSet.mutateAsync({ key: 'checkin_email_cta_text', value: checkinEmailCtaText }),
                        ]);
                        toast.success('Check-in email template saved');
                      } catch (err) {
                        toast.error('Failed to save email template');
                      } finally {
                        setIsSavingCheckinEmail(false);
                      }
                    }}
                    disabled={isSavingCheckinEmail}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isSavingCheckinEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Template
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCheckinPreview(!showCheckinPreview)}
                    className="border-gray-300 text-gray-700"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showCheckinPreview ? 'Hide Preview' : 'Preview Email'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setIsSendingTestCheckin(true);
                      try {
                        // Save current settings first
                        await Promise.all([
                          settingsSet.mutateAsync({ key: 'checkin_email_subject', value: checkinEmailSubject }),
                          settingsSet.mutateAsync({ key: 'checkin_email_greeting', value: checkinEmailGreeting }),
                          settingsSet.mutateAsync({ key: 'checkin_email_cta_text', value: checkinEmailCtaText }),
                        ]);
                        const result = await sendTestCheckinMutation.mutateAsync({});
                        toast.success(`Test email sent to ${result.sentTo}`);
                      } catch (err: any) {
                        toast.error(err?.message || 'Failed to send test email');
                      } finally {
                        setIsSendingTestCheckin(false);
                      }
                    }}
                    disabled={isSendingTestCheckin}
                    className="border-orange-500 text-orange-600 hover:bg-orange-50"
                  >
                    {isSendingTestCheckin ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Send Test Email
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Live Preview */}
            {showCheckinPreview && (
              <Card className="bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900 text-base">Email Preview</CardTitle>
                  <CardDescription>This is how the email will appear to clients (with sample data)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <iframe
                      srcDoc={buildCheckinPreviewHtml({
                        subject: checkinEmailSubject,
                        greeting: checkinEmailGreeting,
                        ctaText: checkinEmailCtaText,
                      })}
                      className="w-full border-0"
                      style={{ height: '800px' }}
                      title="Check-in email preview"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Email Preview Dialog */}
      {showEmailPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {showEmailPreview === '24h' ? '24-Hour Session Reminder Preview' : '1-Hour Session Reminder Preview'}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowEmailPreview(null)}>
                ✕
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              {showEmailPreview === '24h' ? (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a87] text-white p-6 rounded-t-lg text-center">
                    <h2 className="text-xl font-semibold">🗓️ Session Reminder</h2>
                    <p className="text-white/90 text-sm mt-2">Your coaching session is tomorrow!</p>
                  </div>
                  <div className="bg-white p-6 border border-gray-200 rounded-b-lg">
                    <p className="text-gray-700 mb-4">Hi <strong>[Client Name]</strong>,</p>
                    <p className="text-gray-700 mb-4">This is a friendly reminder that you have a coaching session scheduled for <strong>tomorrow</strong>. Please make sure you're prepared and in a quiet space for our call.</p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <h4 className="text-green-800 font-semibold mb-2">📋 Session Details</h4>
                      <p className="text-gray-700"><strong>Session Type:</strong> [Session Type]</p>
                      <p className="text-gray-700"><strong>Date:</strong> [Session Date]</p>
                      <p className="text-gray-700"><strong>Time:</strong> [Session Time]</p>
                      <p className="text-gray-700"><strong>Duration:</strong> [Duration] minutes</p>
                    </div>
                    <div className="text-center mb-4">
                      <span className="inline-block bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-3 rounded-lg font-semibold">Join Video Call</span>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-blue-800 font-semibold mb-2">✅ How to Prepare</h4>
                      <ul className="text-gray-700 list-disc list-inside space-y-1">
                        <li>Find a quiet, private space for our call</li>
                        <li>Have your questions and notes ready</li>
                        <li>Test your internet connection and camera</li>
                        <li>Have a glass of water nearby</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 rounded-t-lg text-center">
                    <h2 className="text-xl font-semibold">⏰ Starting in 1 Hour!</h2>
                    <p className="text-white/90 text-sm mt-2">Your coaching session is coming up soon</p>
                  </div>
                  <div className="bg-white p-6 border border-gray-200 rounded-b-lg">
                    <p className="text-gray-700 mb-4">Hi <strong>[Client Name]</strong>,</p>
                    <p className="text-gray-700 mb-4">Just a quick reminder - your <strong>[Session Type]</strong> session starts in <strong>1 hour</strong> at <strong>[Session Time]</strong>.</p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <h4 className="text-amber-800 font-semibold mb-2">📋 Quick Checklist</h4>
                      <ul className="text-gray-700 list-disc list-inside space-y-1">
                        <li>Find a quiet, private space</li>
                        <li>Have your notes and questions ready</li>
                        <li>Test your camera and microphone</li>
                        <li>Close unnecessary browser tabs</li>
                      </ul>
                    </div>
                    <div className="text-center mb-4">
                      <span className="inline-block bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-3 rounded-lg font-semibold">Join Video Call Now</span>
                    </div>
                    <p className="text-gray-600 text-sm">See you soon!</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <Button onClick={() => setShowEmailPreview(null)}>Close Preview</Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function WaiverList() {
  const { data: waivers, isLoading } = trpc.waiver.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!waivers || waivers.length === 0) {
    return (
      <div className="text-gray-600 text-center py-8">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No signed waivers yet</p>
        <p className="text-sm mt-1">Waivers will appear here when clients sign them before accessing the Omega Store</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4">
        {waivers.length} signed waiver{waivers.length !== 1 ? 's' : ''}
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {waivers.map((waiver) => {
          const isExpired = waiver.expiresAt && new Date(waiver.expiresAt) < new Date();
          const isExpiringSoon = waiver.expiresAt && !isExpired && 
            new Date(waiver.expiresAt) < new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
          
          return (
            <div
              key={waiver.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="space-y-1">
                <p className="text-gray-900 font-medium">
                  {waiver.firstName} {waiver.lastName}
                </p>
                <p className="text-sm text-gray-600">{waiver.email}</p>
                <p className="text-xs text-gray-500">{waiver.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  Signed: {new Date(waiver.agreedAt).toLocaleDateString()}
                </p>
                {waiver.expiresAt && (
                  <p className={`text-xs mt-1 ${isExpired ? 'text-red-400' : isExpiringSoon ? 'text-amber-400' : 'text-gray-500'}`}>
                    {isExpired ? 'Expired' : 'Expires'}: {new Date(waiver.expiresAt).toLocaleDateString()}
                  </p>
                )}
                {waiver.parentGuardianName && (
                  <p className="text-xs text-amber-400 mt-1">
                    Guardian: {waiver.parentGuardianName}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function AdminUsersList() {
  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const updateRoleMutation = trpc.users.updateRole.useMutation();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRoleChange = async (userId: number, newRole: string) => {
    setIsUpdating(true);
    try {
      await updateRoleMutation.mutateAsync({ userId, role: newRole as any });
      await refetch();
      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      toast.error("Failed to update user role");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="text-gray-600 text-center py-8">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No users found</p>
      </div>
    );
  }

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'admin': return 'border-red-500/30 bg-red-500/5';
      case 'manager': return 'border-orange-500/30 bg-orange-500/5';
      case 'viewer': return 'border-blue-500/30 bg-blue-500/5';
      case 'finance': return 'border-green-500/30 bg-green-500/5';
      default: return 'border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-gray-900 font-semibold mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-600" />
          All Users ({users?.length || 0})
        </h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {users.map((user: any) => (
            <div
              key={user.id}
              className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg border ${getRoleColor(user.role)}`}
            >
              <div className="space-y-1 flex-1">
                <p className="text-gray-900 font-medium">{user.name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-xs text-gray-500">
                  Created: {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Select
                value={user.role}
                onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-[130px] bg-gray-100 border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-100 border-gray-300">
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-400 mb-3">Role Permissions</p>
            <div className="space-y-2 text-gray-700">
              <p><span className="font-semibold text-red-400">Admin:</span> Full access to all features and settings</p>
              <p><span className="font-semibold text-orange-400">Manager:</span> Can manage clients, protocols, waivers (cannot modify admin settings)</p>
              <p><span className="font-semibold text-blue-400">Viewer:</span> Read-only access to protocols, analytics, and operations</p>
              <p><span className="font-semibold text-green-400">Finance:</span> Can manage payments and financial operations</p>
              <p><span className="font-semibold text-gray-600">User:</span> Can view assigned protocols only</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function ToolsSection() {
  const [, setLocation] = useLocation();

  const tools = [
    {
      title: "Protocol Presets",
      description: "Save and manage reusable protocol templates for quick application to clients",
      icon: Layout,
      path: "/admin/protocol-presets",
      color: "orange",
    },
    {
      title: "Email Templates",
      description: "Preview and test automated email templates before they're sent to clients",
      icon: Mail,
      path: "/admin/email-templates",
      color: "blue",
    },
    {
      title: "Notification Report",
      description: "View email delivery rates, failed notifications, and communication trends",
      icon: BarChart3,
      path: "/admin/notification-report",
      color: "green",
    },
    {
      title: "Scheduled Reports",
      description: "Configure automated email delivery reports sent to admins on a schedule",
      icon: Clock,
      path: "/admin/email-report-settings",
      color: "cyan",
    },
    {
      title: "QA Testing Dashboard",
      description: "Comprehensive testing checklist for all platform features",
      icon: FileCheck,
      path: "/admin/qa-testing",
      color: "purple",
    },
  ];

  const colorClasses: Record<string, { bg: string; border: string; icon: string; hover: string }> = {
    orange: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      icon: "text-orange-500",
      hover: "hover:border-orange-500/50",
    },
    blue: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      icon: "text-blue-500",
      hover: "hover:border-blue-500/50",
    },
    green: {
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      icon: "text-green-500",
      hover: "hover:border-green-500/50",
    },
    purple: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      icon: "text-purple-500",
      hover: "hover:border-purple-500/50",
    },
    cyan: {
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      icon: "text-cyan-500",
      hover: "hover:border-cyan-500/50",
    },
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-orange-500" />
            Admin Tools & Configuration
          </CardTitle>
          <CardDescription className="text-gray-600">
            Access advanced configuration tools and reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tools.map((tool) => {
              const colors = colorClasses[tool.color];
              return (
                <button
                  key={tool.path}
                  onClick={() => setLocation(tool.path)}
                  className={`flex items-start gap-4 p-4 rounded-lg border ${colors.border} ${colors.bg} ${colors.hover} transition-all text-left group`}
                >
                  <div className={`p-2 rounded-lg ${colors.bg}`}>
                    <tool.icon className={`h-5 w-5 ${colors.icon}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 font-medium flex items-center gap-2">
                      {tool.title}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-orange-500" />
            Quick Links
          </CardTitle>
          <CardDescription className="text-gray-600">
            Frequently accessed admin pages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Clients", path: "/admin/clients" },
              { label: "Packing Slips", path: "/admin/packing-slips" },
              { label: "Store Orders", path: "/admin/store-orders" },
              { label: "Revenue Goals", path: "/admin/revenue-goals" },
              { label: "Categories", path: "/admin/categories" },
              { label: "Affiliate Partners", path: "/admin/affiliate-partners" },
              { label: "Coupons", path: "/admin/coupons" },
              { label: "Dashboard", path: "/admin" },
            ].map((link) => (
              <button
                key={link.path}
                onClick={() => setLocation(link.path)}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-orange-500/50 transition-all text-gray-700 hover:text-gray-900 text-sm"
              >
                {link.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmailReplyBridgeSection() {
  const { data: status, isLoading, refetch } = trpc.emailReplyBridge.status.useQuery();
  const pollNowMutation = trpc.emailReplyBridge.pollNow.useMutation();
  const restartMutation = trpc.emailReplyBridge.restart.useMutation();
  const [isPolling, setIsPolling] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [lastPollResult, setLastPollResult] = useState<{ checked: number; processed: number; errors: number } | null>(null);

  const handlePollNow = async () => {
    setIsPolling(true);
    try {
      const result = await pollNowMutation.mutateAsync();
      setLastPollResult(result);
      toast.success(`Poll complete: ${result.processed} replies processed, ${result.checked} emails checked`);
      refetch();
    } catch (error) {
      toast.error("Failed to poll for replies");
    } finally {
      setIsPolling(false);
    }
  };

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await restartMutation.mutateAsync();
      toast.success("Email reply polling restarted");
      refetch();
    } catch (error) {
      toast.error("Failed to restart polling");
    } finally {
      setIsRestarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-500" />
            Email Reply Bridge
          </CardTitle>
          <CardDescription className="text-gray-600">
            Clients can reply to notification emails and their responses automatically appear in the protocol chat.
            The system polls Gmail every 2 minutes for new replies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className={`w-3 h-3 rounded-full ${status?.imapConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">IMAP Configured</p>
                  <p className="text-xs text-gray-500">{status?.imapConfigured ? 'Gmail credentials set' : 'Not configured'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className={`w-3 h-3 rounded-full ${status?.pollingActive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">Polling Active</p>
                  <p className="text-xs text-gray-500">{status?.pollingActive ? 'Checking every 2 min' : 'Stopped'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Gmail Account</p>
                  <p className="text-xs text-gray-500">{status?.imapUser || 'Not set'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Actions</h4>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handlePollNow}
                disabled={isPolling || !status?.imapConfigured}
                variant="outline"
                className="border-orange-500/30 text-orange-600 hover:bg-orange-50"
              >
                {isPolling ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Polling...</>
                ) : (
                  <><Mail className="h-4 w-4 mr-2" /> Poll Now</>
                )}
              </Button>
              <Button
                onClick={handleRestart}
                disabled={isRestarting || !status?.imapConfigured}
                variant="outline"
                className="border-blue-500/30 text-blue-600 hover:bg-blue-50"
              >
                {isRestarting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Restarting...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" /> Restart Polling</>
                )}
              </Button>
            </div>
          </div>

          {/* Last Poll Result */}
          {lastPollResult && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Last Poll Result</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-2xl font-bold text-blue-600">{lastPollResult.checked}</p>
                  <p className="text-xs text-blue-500">Emails Checked</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-2xl font-bold text-green-600">{lastPollResult.processed}</p>
                  <p className="text-xs text-green-500">Replies Processed</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-2xl font-bold text-red-600">{lastPollResult.errors}</p>
                  <p className="text-xs text-red-500">Errors</p>
                </div>
              </div>
            </div>
          )}

          {/* How It Works */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">How It Works</h4>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
              <li>When you send a message in a protocol chat, the client receives an email notification with the message content</li>
              <li>The email includes a prompt: &quot;Reply directly to this email&quot;</li>
              <li>When the client replies, this system picks up their response within 2 minutes</li>
              <li>The reply is automatically posted as a comment in the protocol chat, prefixed with 📧</li>
              <li>You&apos;ll receive a notification that the client replied (push + email + in-app)</li>
            </ol>
          </div>

          {/* Not Configured Warning */}
          {!status?.imapConfigured && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Gmail IMAP Not Configured</p>
                <p className="text-sm text-amber-700 mt-1">
                  To enable email reply bridge, set the GMAIL_IMAP_USER and GMAIL_IMAP_APP_PASSWORD environment variables.
                  You&apos;ll need a Gmail App Password (create one at myaccount.google.com/apppasswords).
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
