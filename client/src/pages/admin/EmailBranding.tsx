import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Mail, Eye, Palette, Bell, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EmailBranding() {
  const scrollRef = useRef<number>(0);
  
  const { data: branding, refetch } = trpc.emailTracking.getBranding.useQuery();
  const settingsQuery = trpc.settings.get.useQuery;
  const { data: subjectFriendlySetting } = settingsQuery({ key: "reminder_subject_friendly" });
  const { data: subjectModerateSetting } = settingsQuery({ key: "reminder_subject_moderate" });
  const { data: subjectUrgentSetting } = settingsQuery({ key: "reminder_subject_urgent" });
  const { data: bodyFriendlySetting } = settingsQuery({ key: "reminder_body_friendly" });
  const { data: bodyModerateSetting } = settingsQuery({ key: "reminder_body_moderate" });
  const { data: bodyUrgentSetting } = settingsQuery({ key: "reminder_body_urgent" });
  const setSettingMutation = trpc.settings.set.useMutation();
  
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#ea580c");
  const [secondaryColor, setSecondaryColor] = useState("#1e40af");
  const [companyName, setCompanyName] = useState("Omega Longevity");
  const [tagline, setTagline] = useState("Elite Level Health Optimization");
  const [footerText, setFooterText] = useState("");
  
  // Payment reminder email customization
  const [reminderSubjectFriendly, setReminderSubjectFriendly] = useState("Friendly Reminder: Complete Your Protocol Payment");
  const [reminderSubjectModerate, setReminderSubjectModerate] = useState("Reminder: Payment Pending for Your Protocol");
  const [reminderSubjectUrgent, setReminderSubjectUrgent] = useState("⚠️ Final Notice: Payment Required for Your Protocol");
  const [reminderBodyFriendly, setReminderBodyFriendly] = useState("We noticed that your payment for your protocol is still pending. Please complete your payment to activate your protocol access.");
  const [reminderBodyModerate, setReminderBodyModerate] = useState("Your payment is now overdue. Please complete your payment to avoid any interruption to your protocol.");
  const [reminderBodyUrgent, setReminderBodyUrgent] = useState("This is your final reminder. Your protocol access may be deactivated if payment is not received soon.");
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  
  useEffect(() => {
    if (branding) {
      setLogoUrl(branding.logoUrl || "");
      setPrimaryColor(branding.primaryColor || "#ea580c");
      setSecondaryColor(branding.secondaryColor || "#1e40af");
      setCompanyName(branding.companyName || "Omega Longevity");
      setTagline(branding.tagline || "Elite Level Health Optimization");
      setFooterText(branding.footerText || "");
    }
  }, [branding]);

  useEffect(() => {
    if (subjectFriendlySetting) setReminderSubjectFriendly(subjectFriendlySetting);
    if (subjectModerateSetting) setReminderSubjectModerate(subjectModerateSetting);
    if (subjectUrgentSetting) setReminderSubjectUrgent(subjectUrgentSetting);
    if (bodyFriendlySetting) setReminderBodyFriendly(bodyFriendlySetting);
    if (bodyModerateSetting) setReminderBodyModerate(bodyModerateSetting);
    if (bodyUrgentSetting) setReminderBodyUrgent(bodyUrgentSetting);
  }, [subjectFriendlySetting, subjectModerateSetting, subjectUrgentSetting, bodyFriendlySetting, bodyModerateSetting, bodyUrgentSetting]);
  
  const updateMutation = trpc.emailTracking.updateBranding.useMutation({
    onSuccess: () => {
      toast.success("Email branding settings saved");
      window.scrollTo(0, scrollRef.current);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const handleSave = () => {
    scrollRef.current = window.scrollY;
    updateMutation.mutate({
      logoUrl: logoUrl || null,
      primaryColor,
      secondaryColor,
      companyName,
      tagline,
      footerText: footerText || null,
    });
  };

  const handleSaveReminderEmail = async () => {
    setIsSavingReminder(true);
    try {
      await Promise.all([
        setSettingMutation.mutateAsync({ key: "reminder_subject_friendly", value: reminderSubjectFriendly }),
        setSettingMutation.mutateAsync({ key: "reminder_subject_moderate", value: reminderSubjectModerate }),
        setSettingMutation.mutateAsync({ key: "reminder_subject_urgent", value: reminderSubjectUrgent }),
        setSettingMutation.mutateAsync({ key: "reminder_body_friendly", value: reminderBodyFriendly }),
        setSettingMutation.mutateAsync({ key: "reminder_body_moderate", value: reminderBodyModerate }),
        setSettingMutation.mutateAsync({ key: "reminder_body_urgent", value: reminderBodyUrgent }),
      ]);
      toast.success("Payment reminder email settings saved");
    } catch (error) {
      toast.error("Failed to save reminder email settings");
    } finally {
      setIsSavingReminder(false);
    }
  };
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6" />
              Email Branding
            </h1>
            <p className="text-muted-foreground">
              Customize the appearance of emails sent to clients
            </p>
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Settings Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Brand Identity
                </CardTitle>
                <CardDescription>
                  Your company name, logo, and tagline
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Omega Longevity"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Elite Level Health Optimization"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a URL to your logo image. Recommended size: 200x50px
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Colors</CardTitle>
                <CardDescription>
                  Primary and secondary brand colors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color (Buttons)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#ea580c"
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color (Headers)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#1e40af"
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Footer</CardTitle>
                <CardDescription>
                  Custom footer text for all emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="footerText">Footer Text</Label>
                  <Textarea
                    id="footerText"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Enter custom footer text (optional)"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    This text will appear at the bottom of all emails
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Preview */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Email Preview
                </CardTitle>
                <CardDescription>
                  Preview how your emails will look
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden bg-white">
                  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" style={{ maxHeight: '50px', marginBottom: '10px' }} />
                      ) : (
                        <h1 style={{ color: secondaryColor, marginBottom: '5px' }}>{companyName}</h1>
                      )}
                      <p style={{ color: '#6b7280', fontSize: '14px' }}>{tagline}</p>
                    </div>
                    
                    <p style={{ fontSize: '16px', color: '#374151' }}>Hi [Client Name],</p>
                    
                    <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                      Your personalized health protocol is ready for you to review!
                    </p>
                    
                    <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                      Click the button below to view your complete protocol, including all recommended products, 
                      dosing schedules, and exclusive affiliate discount codes.
                    </p>
                    
                    <div style={{ textAlign: 'center', margin: '30px 0' }}>
                      <span 
                        style={{ 
                          display: 'inline-block', 
                          backgroundColor: primaryColor, 
                          color: 'white', 
                          padding: '14px 32px', 
                          borderRadius: '8px', 
                          fontWeight: 'bold', 
                          fontSize: '16px' 
                        }}
                      >
                        View My Protocol
                      </span>
                    </div>
                    
                    <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '30px 0' }} />
                    
                    <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                      {footerText || `This email was sent by ${companyName}.`}<br />
                      If you didn't request this protocol, you can safely ignore this email.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Payment Reminder Email Customization */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Payment Reminder Email Customization
            </CardTitle>
            <CardDescription>
              Customize the subject lines and body text for payment reminder emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Friendly Reminder */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
              <h3 className="font-medium text-amber-800">Day 3 - Friendly Reminder</h3>
              <div className="space-y-2">
                <Label htmlFor="subject-friendly" className="text-sm">Subject Line</Label>
                <Input
                  id="subject-friendly"
                  value={reminderSubjectFriendly}
                  onChange={(e) => setReminderSubjectFriendly(e.target.value)}
                  placeholder="Friendly Reminder: Complete Your Protocol Payment"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body-friendly" className="text-sm">Email Body Text</Label>
                <Textarea
                  id="body-friendly"
                  value={reminderBodyFriendly}
                  onChange={(e) => setReminderBodyFriendly(e.target.value)}
                  rows={3}
                  placeholder="We noticed that your payment for your protocol is still pending..."
                />
              </div>
            </div>

            {/* Moderate Reminder */}
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
              <h3 className="font-medium text-orange-800">Day 7 - Moderate Reminder</h3>
              <div className="space-y-2">
                <Label htmlFor="subject-moderate" className="text-sm">Subject Line</Label>
                <Input
                  id="subject-moderate"
                  value={reminderSubjectModerate}
                  onChange={(e) => setReminderSubjectModerate(e.target.value)}
                  placeholder="Reminder: Payment Pending for Your Protocol"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body-moderate" className="text-sm">Email Body Text</Label>
                <Textarea
                  id="body-moderate"
                  value={reminderBodyModerate}
                  onChange={(e) => setReminderBodyModerate(e.target.value)}
                  rows={3}
                  placeholder="Your payment is now overdue..."
                />
              </div>
            </div>

            {/* Urgent Reminder */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
              <h3 className="font-medium text-red-800">Day 14 - Urgent Reminder</h3>
              <div className="space-y-2">
                <Label htmlFor="subject-urgent" className="text-sm">Subject Line</Label>
                <Input
                  id="subject-urgent"
                  value={reminderSubjectUrgent}
                  onChange={(e) => setReminderSubjectUrgent(e.target.value)}
                  placeholder="⚠️ Final Notice: Payment Required for Your Protocol"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body-urgent" className="text-sm">Email Body Text</Label>
                <Textarea
                  id="body-urgent"
                  value={reminderBodyUrgent}
                  onChange={(e) => setReminderBodyUrgent(e.target.value)}
                  rows={3}
                  placeholder="This is your final reminder..."
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveReminderEmail} disabled={isSavingReminder}>
                <Save className="h-4 w-4 mr-2" />
                {isSavingReminder ? "Saving..." : "Save Reminder Email Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Reminder Email Preview */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Payment Reminder Email Preview
            </CardTitle>
            <CardDescription>
              Preview how payment reminder emails will look to clients with pending payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="friendly" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="friendly">Day 3 (Friendly)</TabsTrigger>
                <TabsTrigger value="moderate">Day 7 (Moderate)</TabsTrigger>
                <TabsTrigger value="urgent">Day 14 (Urgent)</TabsTrigger>
              </TabsList>
              
              <TabsContent value="friendly" className="mt-4">
                <div className="border rounded-lg overflow-hidden bg-white">
                  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ backgroundColor: '#fef3c7', borderLeft: '4px solid #f59e0b', padding: '30px 20px' }}>
                      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#f59e0b' }}>📋 Payment Reminder</h1>
                    </div>
                    <div style={{ padding: '40px 20px' }}>
                      <p style={{ fontSize: '16px', marginBottom: '20px' }}>Hi [Client Name],</p>
                      <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                        We noticed that your payment for your protocol is still pending. Please complete your payment to activate your protocol access.
                      </p>
                      <div style={{ backgroundColor: '#f3f4f6', borderLeft: '4px solid #6b7280', padding: '20px', margin: '20px 0', borderRadius: '4px' }}>
                        <h2 style={{ margin: '0 0 15px 0', color: '#374151', fontSize: '16px' }}>Payment Details</h2>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{ fontWeight: 500, color: '#666' }}>Protocol:</span>
                          <span style={{ fontWeight: 600, color: '#333' }}>Your Health Protocol</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{ fontWeight: 500, color: '#666' }}>Amount Due:</span>
                          <span style={{ fontWeight: 600, color: '#333' }}>USD $3,060.40</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                          <span style={{ fontWeight: 500, color: '#666' }}>Days Pending:</span>
                          <span style={{ fontWeight: 600, color: '#333' }}>3 days</span>
                        </div>
                        <div style={{ fontSize: '28px', color: '#1f2937', fontWeight: 700, textAlign: 'center', margin: '20px 0' }}>USD $3,060.40</div>
                      </div>
                      <div style={{ backgroundColor: '#fef3c7', borderLeft: '4px solid #f59e0b', padding: '15px', margin: '20px 0', borderRadius: '4px', color: '#f59e0b' }}>
                        <strong>Reminder:</strong> Please complete your payment as soon as possible to ensure uninterrupted access to your protocol.
                      </div>
                      <a href="#" style={{ display: 'block', backgroundColor: '#f59e0b', color: 'white', padding: '14px 32px', textDecoration: 'none', borderRadius: '4px', fontWeight: 600, textAlign: 'center' }}>
                        Complete Payment Now
                      </a>
                      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '4px', borderLeft: '4px solid #22c55e' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#16a34a' }}>Payment Methods Accepted</h3>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#16a34a' }}>
                          <li>Stripe (Secure Checkout)</li>
                        </ul>
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#f9fafb', padding: '20px', textAlign: 'center', fontSize: '12px', color: '#666', borderTop: '1px solid #e5e7eb' }}>
                      <p style={{ margin: '5px 0' }}><strong>Need Help?</strong></p>
                      <p style={{ margin: '5px 0' }}>If you have any questions about your payment, please reach out.</p>
                      <p style={{ margin: '5px 0' }}>Email: <a href="mailto:omega@omegalongevity.com">omega@omegalongevity.com</a></p>
                      <p style={{ marginTop: '20px', color: '#999' }}>This is an automated message. Please do not reply to this email.</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="moderate" className="mt-4">
                <div className="border rounded-lg overflow-hidden bg-white">
                  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ backgroundColor: '#fee2e2', borderLeft: '4px solid #dc2626', padding: '30px 20px' }}>
                      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#dc2626' }}>⚠️ Urgent: Payment Reminder</h1>
                    </div>
                    <div style={{ padding: '40px 20px' }}>
                      <p style={{ fontSize: '16px', marginBottom: '20px' }}>Hi [Client Name],</p>
                      <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                        We noticed that your payment for your protocol is still pending. Please complete your payment to activate your protocol access.
                      </p>
                      <div style={{ backgroundColor: '#f3f4f6', borderLeft: '4px solid #6b7280', padding: '20px', margin: '20px 0', borderRadius: '4px' }}>
                        <h2 style={{ margin: '0 0 15px 0', color: '#374151', fontSize: '16px' }}>Payment Details</h2>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{ fontWeight: 500, color: '#666' }}>Protocol:</span>
                          <span style={{ fontWeight: 600, color: '#333' }}>Your Health Protocol</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{ fontWeight: 500, color: '#666' }}>Amount Due:</span>
                          <span style={{ fontWeight: 600, color: '#333' }}>USD $3,060.40</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                          <span style={{ fontWeight: 500, color: '#666' }}>Days Pending:</span>
                          <span style={{ fontWeight: 600, color: '#333' }}>7 days</span>
                        </div>
                        <div style={{ fontSize: '28px', color: '#1f2937', fontWeight: 700, textAlign: 'center', margin: '20px 0' }}>USD $3,060.40</div>
                      </div>
                      <div style={{ backgroundColor: '#fee2e2', borderLeft: '4px solid #dc2626', padding: '15px', margin: '20px 0', borderRadius: '4px', color: '#dc2626' }}>
                        <strong>Important:</strong> Your protocol access will be deactivated if payment is not received within the next 24 hours. Please complete your payment immediately to avoid losing access.
                      </div>
                      <a href="#" style={{ display: 'block', backgroundColor: '#dc2626', color: 'white', padding: '14px 32px', textDecoration: 'none', borderRadius: '4px', fontWeight: 600, textAlign: 'center' }}>
                        Complete Payment Now
                      </a>
                      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '4px', borderLeft: '4px solid #22c55e' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#16a34a' }}>Payment Methods Accepted</h3>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#16a34a' }}>
                          <li>Stripe (Secure Checkout)</li>
                        </ul>
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#f9fafb', padding: '20px', textAlign: 'center', fontSize: '12px', color: '#666', borderTop: '1px solid #e5e7eb' }}>
                      <p style={{ margin: '5px 0' }}><strong>Need Help?</strong></p>
                      <p style={{ margin: '5px 0' }}>If you have any questions about your payment, please reach out.</p>
                      <p style={{ margin: '5px 0' }}>Email: <a href="mailto:omega@omegalongevity.com">omega@omegalongevity.com</a></p>
                      <p style={{ marginTop: '20px', color: '#999' }}>This is an automated message. Please do not reply to this email.</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="urgent" className="mt-4">
                <div className="border rounded-lg overflow-hidden bg-white">
                  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ backgroundColor: '#fee2e2', borderLeft: '4px solid #dc2626', padding: '30px 20px' }}>
                      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#dc2626' }}>⚠️ FINAL NOTICE: Payment Required</h1>
                    </div>
                    <div style={{ padding: '40px 20px' }}>
                      <p style={{ fontSize: '16px', marginBottom: '20px' }}>Hi [Client Name],</p>
                      <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                        We noticed that your payment for your protocol is still pending. Please complete your payment to activate your protocol access.
                      </p>
                      <div style={{ backgroundColor: '#f3f4f6', borderLeft: '4px solid #6b7280', padding: '20px', margin: '20px 0', borderRadius: '4px' }}>
                        <h2 style={{ margin: '0 0 15px 0', color: '#374151', fontSize: '16px' }}>Payment Details</h2>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{ fontWeight: 500, color: '#666' }}>Protocol:</span>
                          <span style={{ fontWeight: 600, color: '#333' }}>Your Health Protocol</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{ fontWeight: 500, color: '#666' }}>Amount Due:</span>
                          <span style={{ fontWeight: 600, color: '#333' }}>USD $3,060.40</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                          <span style={{ fontWeight: 500, color: '#666' }}>Days Pending:</span>
                          <span style={{ fontWeight: 600, color: '#333' }}>14 days</span>
                        </div>
                        <div style={{ fontSize: '28px', color: '#1f2937', fontWeight: 700, textAlign: 'center', margin: '20px 0' }}>USD $3,060.40</div>
                      </div>
                      <div style={{ backgroundColor: '#fee2e2', borderLeft: '4px solid #dc2626', padding: '15px', margin: '20px 0', borderRadius: '4px', color: '#dc2626' }}>
                        <strong>FINAL NOTICE:</strong> This is your last reminder. Your protocol access will be permanently deactivated if payment is not received immediately.
                      </div>
                      <a href="#" style={{ display: 'block', backgroundColor: '#dc2626', color: 'white', padding: '14px 32px', textDecoration: 'none', borderRadius: '4px', fontWeight: 600, textAlign: 'center' }}>
                        Complete Payment Now
                      </a>
                      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '4px', borderLeft: '4px solid #22c55e' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#16a34a' }}>Payment Methods Accepted</h3>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#16a34a' }}>
                          <li>Stripe (Secure Checkout)</li>
                        </ul>
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#f9fafb', padding: '20px', textAlign: 'center', fontSize: '12px', color: '#666', borderTop: '1px solid #e5e7eb' }}>
                      <p style={{ margin: '5px 0' }}><strong>Need Help?</strong></p>
                      <p style={{ margin: '5px 0' }}>If you have any questions about your payment, please reach out.</p>
                      <p style={{ margin: '5px 0' }}>Email: <a href="mailto:omega@omegalongevity.com">omega@omegalongevity.com</a></p>
                      <p style={{ marginTop: '20px', color: '#999' }}>This is an automated message. Please do not reply to this email.</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
