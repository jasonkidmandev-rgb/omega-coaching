import { useState, useEffect } from "react";
import { trpc } from "../../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, CheckCircle, AlertTriangle, ClipboardList, Package, Users, Calendar, ArrowUp, MessageSquare, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PreferenceItem {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: string;
}

const PREFERENCE_ITEMS: PreferenceItem[] = [
  {
    key: "taskAssignedEmail",
    label: "Task Assigned",
    description: "When a new task is assigned to you",
    icon: <ClipboardList className="h-4 w-4" />,
    category: "Tasks",
  },
  {
    key: "taskOverdueEmail",
    label: "Task Overdue",
    description: "When one of your tasks becomes overdue",
    icon: <AlertTriangle className="h-4 w-4" />,
    category: "Tasks",
  },
  {
    key: "projectAssignedEmail",
    label: "Project Assigned",
    description: "When you're assigned to a new client project",
    icon: <Users className="h-4 w-4" />,
    category: "Projects",
  },
  {
    key: "deadlineApproachingEmail",
    label: "Deadline Approaching",
    description: "When a task deadline is within 24 hours",
    icon: <Calendar className="h-4 w-4" />,
    category: "Tasks",
  },
  {
    key: "escalationEmail",
    label: "Task Escalation",
    description: "When an overdue task is escalated to you",
    icon: <ArrowUp className="h-4 w-4" />,
    category: "Tasks",
  },
  {
    key: "digestEmail",
    label: "Daily/Weekly Digest",
    description: "Summary of pending tasks and notifications",
    icon: <BarChart3 className="h-4 w-4" />,
    category: "Digest",
  },
  {
    key: "mentionEmail",
    label: "Mentions",
    description: "When someone mentions you in a note or comment",
    icon: <MessageSquare className="h-4 w-4" />,
    category: "Communication",
  },
  {
    key: "pipelineUpdateEmail",
    label: "Pipeline Updates",
    description: "When a prospect or client moves to a new stage",
    icon: <BarChart3 className="h-4 w-4" />,
    category: "Pipeline",
  },
  {
    key: "fulfillmentAlertEmail",
    label: "Fulfillment Alerts",
    description: "Backorder notifications, tracking updates, and shipping alerts",
    icon: <Package className="h-4 w-4" />,
    category: "Fulfillment",
  },
];

export default function NotificationPreferences() {
  // toast from sonner is already imported at top level
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<number | null>(null);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Get team members
  const { data: teamMembers, isLoading: loadingTeam } = trpc.teamMember.list.useQuery();

  // Get preferences for selected member
  const { data: savedPrefs, isLoading: loadingPrefs, refetch: refetchPrefs } = trpc.teamNotification.getPreferences.useQuery(
    { teamMemberId: selectedTeamMemberId! },
    { enabled: !!selectedTeamMemberId }
  );

  // Update mutation
  const updateMutation = trpc.teamNotification.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("Email notification preferences have been updated.");
      setHasChanges(false);
      refetchPrefs();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Load preferences when data arrives
  useEffect(() => {
    if (savedPrefs) {
      const prefs: Record<string, boolean> = {};
      for (const item of PREFERENCE_ITEMS) {
        prefs[item.key] = (savedPrefs as any)[item.key] !== 0;
      }
      setPreferences(prefs);
      setHasChanges(false);
    }
  }, [savedPrefs]);

  // Auto-select first team member
  useEffect(() => {
    if (teamMembers && teamMembers.length > 0 && !selectedTeamMemberId) {
      setSelectedTeamMemberId(teamMembers[0].id);
    }
  }, [teamMembers, selectedTeamMemberId]);

  const handleToggle = (key: string, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!selectedTeamMemberId) return;
    updateMutation.mutate({ teamMemberId: selectedTeamMemberId, preferences });
  };

  const handleEnableAll = () => {
    const allEnabled: Record<string, boolean> = {};
    for (const item of PREFERENCE_ITEMS) {
      allEnabled[item.key] = true;
    }
    setPreferences(allEnabled);
    setHasChanges(true);
  };

  const handleDisableAll = () => {
    const allDisabled: Record<string, boolean> = {};
    for (const item of PREFERENCE_ITEMS) {
      allDisabled[item.key] = false;
    }
    setPreferences(allDisabled);
    setHasChanges(true);
  };

  // Group preferences by category
  const categories = Array.from(new Set(PREFERENCE_ITEMS.map(p => p.category)));

  const selectedMember = teamMembers?.find(m => m.id === selectedTeamMemberId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Email Notification Preferences
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure which notifications each team member receives via email. In-app notifications are always enabled.
          </p>
        </div>
      </div>

      {/* Team Member Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Team Member</CardTitle>
          <CardDescription>Choose a team member to configure their email notification preferences</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTeam ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading team members...
            </div>
          ) : (
            <Select
              value={selectedTeamMemberId?.toString() || ""}
              onValueChange={(val) => setSelectedTeamMemberId(parseInt(val))}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a team member" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers?.map((member) => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    {member.name} — {member.role}
                    {member.email ? ` (${member.email})` : " (no email)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      {selectedTeamMemberId && (
        <>
          {loadingPrefs ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading preferences...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Quick Actions */}
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleEnableAll}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Enable All
                </Button>
                <Button variant="outline" size="sm" onClick={handleDisableAll}>
                  Disable All
                </Button>
                {hasChanges && (
                  <Button onClick={handleSave} disabled={updateMutation.isLoading}>
                    {updateMutation.isLoading ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                )}
                {!selectedMember?.email && (
                  <div className="flex items-center gap-1 text-amber-600 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    This team member has no email address configured. Email notifications won't be sent.
                  </div>
                )}
              </div>

              {/* Preference Categories */}
              {categories.map((category) => {
                const items = PREFERENCE_ITEMS.filter(p => p.category === category);
                return (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="text-lg">{category}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {items.map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted">
                              {item.icon}
                            </div>
                            <div>
                              <Label className="text-sm font-medium flex items-center gap-2">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                {item.label}
                              </Label>
                              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={preferences[item.key] ?? true}
                            onCheckedChange={(val) => handleToggle(item.key, val)}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Save Button */}
              {hasChanges && (
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={updateMutation.isLoading} size="lg">
                    {updateMutation.isLoading ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</>
                    ) : (
                      "Save Preferences"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
