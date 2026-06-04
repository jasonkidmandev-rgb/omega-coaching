import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import { 
  Calendar, Clock, Pause, Play, SkipForward, Settings, 
  AlertCircle, CheckCircle, RefreshCw, History, Eye, Send
} from "lucide-react";
import { toast } from "sonner";
import { addWeeks } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
const MT = "America/Denver";

interface CheckinSettingsTabProps {
  clientId: number;
  clientName?: string;
  isSubTab?: boolean;
  engagementLevel?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 Weeks" },
  { value: "monthly", label: "Monthly" },
];

const TIMEZONES = [
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific Time (LA)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Phoenix", label: "Arizona (Phoenix)" },
];

export default function CheckinSettingsTab({ clientId, clientName, isSubTab = false, engagementLevel }: CheckinSettingsTabProps) {
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [skipWeeks, setSkipWeeks] = useState(1);
  const [pauseReason, setPauseReason] = useState("");
  const [skipReason, setSkipReason] = useState("");
  const autoEnableAttempted = useRef(false);
  
  // Fetch schedule
  const { data: schedule, isLoading, refetch } = trpc.checkin.schedules.getByClient.useQuery({
    clientProtocolId: clientId,
  });

  // Self-healing: auto-enable check-ins if engagement level warrants it but no schedule exists
  const autoEnableMutation = trpc.checkin.schedules.enable.useMutation({
    onSuccess: () => {
      toast.success("Check-ins auto-enabled based on engagement level");
      refetch();
    },
    onError: () => {}, // Silent — user can still click Enable manually
  });

  useEffect(() => {
    if (autoEnableAttempted.current) return;
    if (isLoading) return;
    const needsCheckins = engagementLevel === 'full_coaching' || engagementLevel === 'self_guided_checkins';
    const hasNoActiveSchedule = !schedule || !schedule.isEnabled;
    if (needsCheckins && hasNoActiveSchedule) {
      autoEnableAttempted.current = true;
      autoEnableMutation.mutate({ clientProtocolId: clientId });
    }
  }, [isLoading, schedule, engagementLevel, clientId]);
  
  // Mutations
  const pauseMutation = trpc.checkin.schedules.pause.useMutation({
    onSuccess: () => {
      toast.success("Check-ins paused");
      refetch();
      setPauseReason("");
    },
    onError: (error) => toast.error(error.message),
  });
  
  const resumeMutation = trpc.checkin.schedules.resume.useMutation({
    onSuccess: () => {
      toast.success("Check-ins resumed");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const skipMutation = trpc.checkin.schedules.skip.useMutation({
    onSuccess: () => {
      toast.success("Check-ins skipped");
      refetch();
      setShowSkipDialog(false);
      setSkipReason("");
    },
    onError: (error) => toast.error(error.message),
  });
  
  const updateMutation = trpc.checkin.schedules.update.useMutation({
    onSuccess: () => {
      toast.success("Schedule updated");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const enableMutation = trpc.checkin.schedules.enable.useMutation({
    onSuccess: () => {
      toast.success("Check-ins enabled");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const disableMutation = trpc.checkin.schedules.disable.useMutation({
    onSuccess: () => {
      toast.success("Check-ins disabled");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const sendTestMutation = trpc.checkin.sendTestCheckin.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Test check-in sent!");
      refetch();
    },
    onError: (error) => toast.error(`Failed to send: ${error.message}`),
  });

  if (isLoading) {
    const loadingContent = (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
    if (isSubTab) return loadingContent;
    return <TabsContent value="checkin-settings">{loadingContent}</TabsContent>;
  }

  const isPaused = schedule?.isPaused;
  const isSkipped = schedule?.skipUntil && new Date(schedule.skipUntil) > new Date();
  const isEnabled = schedule?.isEnabled;

  const mainContent = (
    <div className="space-y-6">
        {/* Status Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Check-In Schedule Settings
                </CardTitle>
                <CardDescription>
                  Configure automated check-in reminders for {clientName || 'this client'}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Current Status */}
            <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-muted/50">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">Current Status</p>
                <div className="flex items-center gap-2">
                  {!schedule ? (
                    <Badge variant="outline" className="text-gray-500">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Not Configured
                    </Badge>
                  ) : !isEnabled ? (
                    <Badge variant="outline" className="text-gray-500">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Disabled
                    </Badge>
                  ) : isPaused ? (
                    <Badge variant="outline" className="text-yellow-600 bg-yellow-500/10">
                      <Pause className="h-3 w-3 mr-1" />
                      Paused
                    </Badge>
                  ) : isSkipped ? (
                    <Badge variant="outline" className="text-orange-600 bg-orange-500/10">
                      <SkipForward className="h-3 w-3 mr-1" />
                      Skipped until {formatInTimeZone(new Date(schedule.skipUntil!), MT, 'MMM d, yyyy')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 bg-green-500/10">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
                {schedule?.pausedReason && (isPaused || isSkipped) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Reason: {schedule.pausedReason}
                  </p>
                )}
              </div>
              
              {schedule?.nextScheduledAt && isEnabled && !isPaused && !isSkipped && (
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Next Check-In</p>
                  <p className="text-sm font-medium">
                    {new Date(schedule.nextScheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(schedule.nextScheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' })} MT
                  </p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mb-6">
              {!schedule || !isEnabled ? (
                <Button 
                  onClick={() => enableMutation.mutate({ clientProtocolId: clientId })}
                  disabled={enableMutation.isPending}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Enable Check-Ins
                </Button>
              ) : (
                <>
                  {isPaused ? (
                    <Button 
                      onClick={() => resumeMutation.mutate({ clientProtocolId: clientId })}
                      disabled={resumeMutation.isPending}
                      variant="default"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Resume Check-Ins
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => {
                        pauseMutation.mutate({ clientProtocolId: clientId, reason: pauseReason || undefined });
                      }}
                      disabled={pauseMutation.isPending}
                      variant="outline"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Check-Ins
                    </Button>
                  )}
                  
                  <Button 
                    onClick={() => setShowSkipDialog(!showSkipDialog)}
                    variant="outline"
                  >
                    <SkipForward className="h-4 w-4 mr-2" />
                    Skip Weeks
                  </Button>
                  
                  <Button 
                    onClick={() => disableMutation.mutate({ clientProtocolId: clientId })}
                    disabled={disableMutation.isPending}
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    Disable Check-Ins
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      if (confirm(`Send a test check-in email to ${clientName || 'this client'} right now?`)) {
                        sendTestMutation.mutate({ clientProtocolId: clientId });
                      }
                    }}
                    disabled={sendTestMutation.isPending}
                    variant="default"
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendTestMutation.isPending ? 'Sending...' : 'Send Test Check-In'}
                  </Button>
                </>
              )}
            </div>

            {/* Pause Reason Input */}
            {schedule && isEnabled && !isPaused && (
              <div className="mb-6">
                <Label htmlFor="pauseReason" className="text-sm">Pause Reason (optional)</Label>
                <Input
                  id="pauseReason"
                  placeholder="e.g., Client on vacation, Medical leave..."
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            {/* Skip Dialog */}
            {showSkipDialog && (
              <Card className="mb-6 border-orange-500/20 bg-orange-500/5">
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div>
                      <Label>Skip for how many weeks?</Label>
                      <Select 
                        value={skipWeeks.toString()} 
                        onValueChange={(v) => setSkipWeeks(parseInt(v))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 week</SelectItem>
                          <SelectItem value="2">2 weeks</SelectItem>
                          <SelectItem value="3">3 weeks</SelectItem>
                          <SelectItem value="4">4 weeks</SelectItem>
                          <SelectItem value="6">6 weeks</SelectItem>
                          <SelectItem value="8">8 weeks</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Check-ins will resume on {format(addWeeks(new Date(), skipWeeks), 'MMMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="skipReason">Reason (optional)</Label>
                      <Input
                        id="skipReason"
                        placeholder="e.g., Holiday break, Travel..."
                        value={skipReason}
                        onChange={(e) => setSkipReason(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          const skipUntilDate = addWeeks(new Date(), skipWeeks).toISOString();
                          skipMutation.mutate({ 
                            clientProtocolId: clientId, 
                            skipUntil: skipUntilDate,
                            reason: skipReason || undefined,
                          });
                        }}
                        disabled={skipMutation.isPending}
                      >
                        <SkipForward className="h-4 w-4 mr-2" />
                        Skip {skipWeeks} Week{skipWeeks > 1 ? 's' : ''}
                      </Button>
                      <Button variant="outline" onClick={() => setShowSkipDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Schedule Configuration */}
        {schedule && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule Configuration
              </CardTitle>
              <CardDescription>
                Customize when check-in reminders are sent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Frequency */}
                <div>
                  <Label>Frequency</Label>
                  <Select 
                    value={schedule.frequency} 
                    onValueChange={(v) => updateMutation.mutate({ 
                      clientProtocolId: clientId, 
                      frequency: v as 'weekly' | 'biweekly' | 'monthly' 
                    })}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Day of Week */}
                <div>
                  <Label>Day of Week</Label>
                  <Select 
                    value={schedule.dayOfWeek.toString()} 
                    onValueChange={(v) => updateMutation.mutate({ 
                      clientProtocolId: clientId, 
                      dayOfWeek: parseInt(v) 
                    })}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Time of Day */}
                <div>
                  <Label>Time of Day</Label>
                  <Input
                    type="time"
                    value={schedule.timeOfDay}
                    onChange={(e) => {
                      if (e.target.value) {
                        updateMutation.mutate({ 
                          clientProtocolId: clientId, 
                          timeOfDay: e.target.value 
                        });
                      }
                    }}
                    disabled={updateMutation.isPending}
                    className="mt-1"
                  />
                </div>

                {/* Timezone */}
                <div>
                  <Label>Timezone</Label>
                  <Select 
                    value={schedule.timezone} 
                    onValueChange={(v) => updateMutation.mutate({ 
                      clientProtocolId: clientId, 
                      timezone: v 
                    })}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Last Sent Info */}
              {schedule.lastSentAt && (
                <div className="mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Last check-in sent: {formatInTimeZone(new Date(schedule.lastSentAt), MT, "MMMM d, yyyy 'at' h:mm a")} MT
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Schedule Preview - only show when enabled */}
        {schedule && isEnabled && !isPaused && <SchedulePreview clientProtocolId={clientId} />}
        {schedule && isEnabled && isPaused && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-yellow-600">
                <Pause className="h-4 w-4" />
                Upcoming Check-Ins Preview
              </CardTitle>
              <CardDescription>Check-ins are currently paused. Resume to see upcoming dates.</CardDescription>
            </CardHeader>
          </Card>
        )}
        {schedule && !isEnabled && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Upcoming Check-Ins Preview
              </CardTitle>
              <CardDescription>Check-ins are currently disabled. Enable to see upcoming dates.</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Schedule History */}
        {schedule && <ScheduleHistory clientProtocolId={clientId} />}
      </div>
  );

  if (isSubTab) return mainContent;
  return <TabsContent value="checkin-settings">{mainContent}</TabsContent>;
}

// Schedule Preview Component
function SchedulePreview({ clientProtocolId }: { clientProtocolId: number }) {
  const { data: preview, isLoading } = trpc.checkin.schedules.getPreview.useQuery({
    clientProtocolId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Upcoming Check-Ins Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!preview?.previews?.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Upcoming Check-Ins Preview
        </CardTitle>
        <CardDescription>
          Next 4 scheduled check-in dates based on current settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {preview.previews.map((item, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg border ${
                index === 0 ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
              }`}
            >
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {index === 0 ? 'Next' : `#${index + 1}`}
              </p>
              <p className="font-medium text-sm">
                {item.dayName}
              </p>
              <p className="text-sm">
                {formatInTimeZone(new Date(item.date), MT, 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.formattedTime}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Schedule History Component
function ScheduleHistory({ clientProtocolId }: { clientProtocolId: number }) {
  const [showAll, setShowAll] = useState(false);
  const { data: history, isLoading } = trpc.checkin.schedules.getHistory.useQuery({
    clientProtocolId,
    limit: showAll ? 50 : 5,
  });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const actionLabels: Record<string, { label: string; color: string }> = {
    created: { label: 'Created', color: 'text-green-600' },
    updated: { label: 'Updated', color: 'text-blue-600' },
    enabled: { label: 'Enabled', color: 'text-green-600' },
    disabled: { label: 'Disabled', color: 'text-gray-600' },
    paused: { label: 'Paused', color: 'text-yellow-600' },
    resumed: { label: 'Resumed', color: 'text-green-600' },
    bulk_updated: { label: 'Bulk Update', color: 'text-purple-600' },
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-4 w-4" />
            Schedule Change History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!history?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-4 w-4" />
            Schedule Change History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No schedule changes recorded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-4 w-4" />
          Schedule Change History
        </CardTitle>
        <CardDescription>
          Track when schedule settings were changed
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.map((entry) => {
            const actionInfo = actionLabels[entry.action] || { label: entry.action, color: 'text-gray-600' };
            return (
              <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={actionInfo.color}>
                      {actionInfo.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatInTimeZone(new Date(entry.createdAt), MT, 'MMM d, yyyy h:mm a')} MT
                    </span>
                  </div>
                  
                  {entry.action === 'updated' || entry.action === 'bulk_updated' ? (
                    <div className="text-sm space-y-1">
                      {entry.previousDayOfWeek !== entry.newDayOfWeek && (
                        <p>
                          <span className="text-muted-foreground">Day:</span>{' '}
                          <span className="line-through text-muted-foreground">
                            {dayNames[entry.previousDayOfWeek ?? 0]}
                          </span>{' '}
                          → <span className="font-medium">{dayNames[entry.newDayOfWeek ?? 0]}</span>
                        </p>
                      )}
                      {entry.previousTimeOfDay !== entry.newTimeOfDay && (
                        <p>
                          <span className="text-muted-foreground">Time:</span>{' '}
                          <span className="line-through text-muted-foreground">
                            {entry.previousTimeOfDay}
                          </span>{' '}
                          → <span className="font-medium">{entry.newTimeOfDay}</span>
                        </p>
                      )}
                      {entry.previousFrequency !== entry.newFrequency && (
                        <p>
                          <span className="text-muted-foreground">Frequency:</span>{' '}
                          <span className="line-through text-muted-foreground">
                            {entry.previousFrequency}
                          </span>{' '}
                          → <span className="font-medium">{entry.newFrequency}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Schedule {entry.action}
                    </p>
                  )}
                  
                  {entry.changedByName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      By: {entry.changedByName}
                    </p>
                  )}
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Note: {entry.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {history.length >= 5 && (
          <div className="mt-4 text-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : 'Show More History'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
