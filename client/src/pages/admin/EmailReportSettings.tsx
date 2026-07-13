import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Mail, Clock, Calendar, Users, Plus, Trash2, Send, Settings, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { goBackTo } from "@/hooks/useGoBack";
import { useState } from "react";
import { toast } from "sonner";

const REPORT_TYPES = [
  {
    id: "delivery_summary",
    name: "Email Delivery Summary",
    description: "Summary of all emails sent, delivery rates, and failures",
  },
  {
    id: "failed_notifications",
    name: "Failed Notifications Alert",
    description: "Alert when email failures exceed threshold",
  },
  {
    id: "engagement_report",
    name: "Email Engagement Report",
    description: "Open rates, click rates, and engagement metrics",
  },
];

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString(),
  label: i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`,
}));

export default function EmailReportSettings() {
  const [, setLocation] = useLocation();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<typeof REPORT_TYPES[0] | null>(null);
  
  // Form state
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [isEnabled, setIsEnabled] = useState(true);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [hourOfDay, setHourOfDay] = useState(9);

  const { data: settings, refetch } = trpc.emailReportSettings.list.useQuery();

  const upsertMutation = trpc.emailReportSettings.upsert.useMutation({
    onSuccess: () => {
      toast.success("Report settings saved");
      setEditDialogOpen(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const deleteMutation = trpc.emailReportSettings.delete.useMutation({
    onSuccess: () => {
      toast.success("Report disabled");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const sendTestMutation = trpc.emailReportSettings.sendTestReport.useMutation({
    onSuccess: () => {
      toast.success("Test report sent to your email");
    },
    onError: (error: any) => {
      toast.error(`Failed to send test: ${error.message}`);
    },
  });

  const handleEditReport = (reportType: typeof REPORT_TYPES[0]) => {
    setSelectedReport(reportType);
    
    // Load existing settings if available
    const existing = settings?.find(s => s.reportType === reportType.id);
    if (existing) {
      setFrequency(existing.frequency);
      setIsEnabled(existing.isEnabled);
      setRecipients((existing.recipients as string[]) || []);
      setDayOfWeek(existing.dayOfWeek || 1);
      setDayOfMonth(existing.dayOfMonth || 1);
      setHourOfDay(existing.hourOfDay || 9);
    } else {
      // Reset to defaults
      setFrequency("weekly");
      setIsEnabled(true);
      setRecipients([]);
      setDayOfWeek(1);
      setDayOfMonth(1);
      setHourOfDay(9);
    }
    
    setEditDialogOpen(true);
  };

  const handleAddRecipient = () => {
    if (newRecipient && !recipients.includes(newRecipient)) {
      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newRecipient)) {
        toast.error("Please enter a valid email address");
        return;
      }
      setRecipients([...recipients, newRecipient]);
      setNewRecipient("");
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const handleSave = () => {
    if (!selectedReport) return;
    
    if (recipients.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }
    
    upsertMutation.mutate({
      reportType: selectedReport.id,
      frequency,
      isEnabled,
      recipients,
      dayOfWeek,
      dayOfMonth,
      hourOfDay,
    });
  };

  const getSettingForReport = (reportId: string) => {
    return settings?.find(s => s.reportType === reportId);
  };

  const getScheduleDescription = (setting: any) => {
    if (!setting) return "Not configured";
    
    const hour = HOURS.find(h => h.value === setting.hourOfDay?.toString())?.label || "9:00 AM";
    
    if (setting.frequency === "daily") {
      return `Daily at ${hour}`;
    } else if (setting.frequency === "weekly") {
      const day = DAYS_OF_WEEK.find(d => d.value === setting.dayOfWeek?.toString())?.label || "Monday";
      return `Every ${day} at ${hour}`;
    } else {
      return `Monthly on day ${setting.dayOfMonth || 1} at ${hour}`;
    }
  };

  return (
    <AdminLayout>
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => goBackTo("/admin/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6 text-orange-500" />
              Scheduled Email Reports
            </h1>
            <p className="text-muted-foreground">Configure automated email delivery reports sent to admins</p>
          </div>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map((report) => {
          const setting = getSettingForReport(report.id);
          const isConfigured = !!setting;
          const isActive = setting?.isEnabled ?? false;
          
          return (
            <Card key={report.id} className={isActive ? "border-orange-200" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                    <CardDescription className="mt-1">{report.description}</CardDescription>
                  </div>
                  {isConfigured && (
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {isActive ? "Active" : "Paused"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isConfigured ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{getScheduleDescription(setting)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{(setting.recipients as string[])?.length || 0} recipient(s)</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>Not configured</span>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEditReport(report)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {isConfigured ? "Edit" : "Configure"}
                  </Button>
                  {isConfigured && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendTestMutation.mutate({ reportType: report.id })}
                      disabled={sendTestMutation.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">About Scheduled Reports</h3>
              <p className="text-sm text-blue-700 mt-1">
                Scheduled reports are automatically generated and sent to configured recipients at the specified times.
                Reports include email delivery statistics, failure alerts, and engagement metrics to help you monitor
                your automated communications.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-orange-500" />
              Configure {selectedReport?.name}
            </DialogTitle>
            <DialogDescription>
              Set up the schedule and recipients for this automated report.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">Enable Report</Label>
              <Switch
                id="enabled"
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
              />
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Day of Week (for weekly) */}
            {frequency === "weekly" && (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select value={dayOfWeek.toString()} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Day of Month (for monthly) */}
            {frequency === "monthly" && (
              <div className="space-y-2">
                <Label>Day of Month</Label>
                <Select value={dayOfMonth.toString()} onValueChange={(v) => setDayOfMonth(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Time */}
            <div className="space-y-2">
              <Label>Time</Label>
              <Select value={hourOfDay.toString()} onValueChange={(v) => setHourOfDay(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem key={hour.value} value={hour.value}>{hour.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recipients */}
            <div className="space-y-2">
              <Label>Recipients</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddRecipient()}
                />
                <Button type="button" variant="outline" onClick={handleAddRecipient}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {recipients.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {recipients.map((email) => (
                    <Badge key={email} variant="secondary" className="flex items-center gap-1">
                      {email}
                      <button
                        onClick={() => handleRemoveRecipient(email)}
                        className="ml-1 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={upsertMutation.isPending}
            >
              {upsertMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}