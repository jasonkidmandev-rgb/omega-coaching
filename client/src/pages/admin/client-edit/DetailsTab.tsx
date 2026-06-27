import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TabsContent } from "@/components/ui/tabs";
import { Save, Loader2, Layers, ChevronRight, Target, BellOff, Bell, Send, Clock, AlertTriangle, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { FormData, Template, Program, Phase, ClientProgramInfo } from "./types";
import { trpc } from "@/lib/trpc";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// Format phone number as user types: (555) 123-4567
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limitedDigits = digits.slice(0, 10);
  
  // Format based on length
  if (limitedDigits.length === 0) return '';
  if (limitedDigits.length <= 3) return `(${limitedDigits}`;
  if (limitedDigits.length <= 6) return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
  return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
};

type DetailsTabProps = {
  isNew: boolean;
  clientId: number | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  templates: Template[] | undefined;
  programs: Program[] | undefined;
  clientProgramInfo: ClientProgramInfo | undefined;  // Can be null or undefined
  selectedProgramId: number | null;
  setSelectedProgramId: React.Dispatch<React.SetStateAction<number | null>>;
  selectedPhaseId: number | null;
  setSelectedPhaseId: React.Dispatch<React.SetStateAction<number | null>>;
  selectedProgramPhases: Phase[] | undefined;
  handleSubmit: (e: React.FormEvent) => void;
  createMutationPending: boolean;
  updateMutationPending: boolean;
  assignProgramMutation: {
    mutate: (params: { clientProtocolId: number; programId: number; phaseId: number }) => void;
    isPending: boolean;
  };
  advancePhaseMutation: {
    mutate: (params: { clientProtocolId: number; newPhaseId: number }) => void;
    isPending: boolean;
  };
  // Check-in status and prompt
  checkinEnabled?: boolean;
  onStatusChangeToActive?: (newStatus: string, previousStatus: string) => void;
  previousStatus?: string;
};

export default function DetailsTab({
  isNew,
  clientId,
  formData,
  setFormData,
  templates,
  programs,
  clientProgramInfo,
  selectedProgramId,
  setSelectedProgramId,
  selectedPhaseId,
  setSelectedPhaseId,
  selectedProgramPhases,
  handleSubmit,
  createMutationPending,
  updateMutationPending,
  assignProgramMutation,
  advancePhaseMutation,
  checkinEnabled,
  onStatusChangeToActive,
  previousStatus,
}: DetailsTabProps) {
  return (
    <TabsContent value="details">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>
              Basic client details and protocol settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Client Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, clientEmail: e.target.value })
                  }
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Client Phone</Label>
                <PhoneInput
                  id="clientPhone"
                  value={formData.clientPhone}
                  onChange={(value) =>
                    setFormData({ ...formData, clientPhone: value })
                  }
                  placeholder="(555) 123-4567"
                  showCountryCode={true}
                />
              </div>
            </div>

            {isNew && (
              <div className="space-y-2">
                <Label htmlFor="template">Start from Template</Label>
                <Select
                  value={formData.templateId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, templateId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="durationMonths">Protocol Duration</Label>
                <Select
                  value={formData.durationMonths.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, durationMonths: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Protocol Only</SelectItem>
                    <SelectItem value="1">1 Month (30 Days)</SelectItem>
                    <SelectItem value="3">3 Months (90 Days)</SelectItem>
                    <SelectItem value="4">4 Months (120 Days)</SelectItem>
                    <SelectItem value="6">6 Months</SelectItem>
                    <SelectItem value="12">12 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="engagementLevel">Engagement Level</Label>
                <Select
                  key={`engagement-${formData.engagementLevel}`}
                  value={formData.engagementLevel}
                  onValueChange={(value) =>
                    setFormData({ ...formData, engagementLevel: value as "full_coaching" | "self_guided_checkins" | "protocol_only" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_coaching" textValue="Full Coaching">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Full Coaching</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="self_guided_checkins" textValue="Self-Guided + Check-ins">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>Self-Guided + Check-ins</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="protocol_only" textValue="Protocol Only">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                        <span>Protocol Only</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Visible to client on their portal</p>
              </div>
              {!isNew && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    key={`status-${formData.status}`}
                    value={formData.status}
                    onValueChange={(value) => {
                      const newStatus = value as "draft" | "pending_approval" | "approved" | "active" | "completed";
                      setFormData({ ...formData, status: newStatus });
                      // Trigger check-in prompt when changing to active and check-ins are not enabled
                      if (newStatus === "active" && previousStatus !== "active" && !checkinEnabled && onStatusChangeToActive) {
                        onStatusChangeToActive(newStatus, previousStatus || formData.status);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="active" textValue="Active">
                        <div className="flex items-center gap-2">
                          <span>Active</span>
                          {!checkinEnabled && <Badge variant="outline" className="text-xs">No Check-Ins</Badge>}
                        </div>
                      </SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.status === "active" && !checkinEnabled && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Weekly check-ins are not enabled for this client
                    </p>
                  )}
                </div>
              )}
              {!isNew && (
                <div className="space-y-2">
                  <Label htmlFor="clientVisibility">Client Visibility</Label>
                  <Select
                    key={`visibility-${formData.clientVisibility}`}
                    value={formData.clientVisibility}
                    onValueChange={(value) =>
                      setFormData({ ...formData, clientVisibility: value as "hidden" | "option" | "active" | "archived" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hidden" textValue="Hidden">
                        <div className="flex flex-col">
                          <span>Hidden</span>
                          <span className="text-xs text-muted-foreground">Only you can see this (drafts, working copies)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="option" textValue="Option">
                        <div className="flex flex-col">
                          <span>Option</span>
                          <span className="text-xs text-muted-foreground">Client can see and compare alternatives</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="active" textValue="Active">
                        <div className="flex flex-col">
                          <span>Active</span>
                          <span className="text-xs text-muted-foreground">The current/chosen protocol</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="archived" textValue="Archived">
                        <div className="flex flex-col">
                          <span>Archived</span>
                          <span className="text-xs text-muted-foreground">Historical, accessible in history section</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {!isNew && (
                <div className="space-y-2">
                  <Label htmlFor="versionName">Version Name</Label>
                  <Input
                    id="versionName"
                    value={formData.versionName || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, versionName: e.target.value })
                    }
                    placeholder="e.g., Foundational Protocol, Enhancement Protocol"
                  />
                  <p className="text-xs text-muted-foreground">Custom name for this protocol version (defaults to "Version N")</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Notes for your reference (not shown to client)"
                rows={3}
              />
            </div>

            {/* Payment Reminder Opt-Out */}
            {!isNew && (
              <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="space-y-1">
                  <Label htmlFor="payment-reminder-optout" className="text-white font-medium flex items-center gap-2">
                    <BellOff className="h-4 w-4 text-orange-500" />
                    Opt Out of Payment Reminders
                  </Label>
                  <p className="text-sm text-slate-400">
                    When enabled, this client will not receive automatic payment reminder emails.
                  </p>
                </div>
                <Switch
                  id="payment-reminder-optout"
                  checked={formData.paymentReminderOptOut}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, paymentReminderOptOut: checked })
                  }
                  className="data-[state=checked]:bg-orange-500"
                />
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={createMutationPending || updateMutationPending}
              >
                {(createMutationPending || updateMutationPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Save className="h-4 w-4 mr-2" />
                {isNew ? "Create Protocol" : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Program Assignment Section */}
      {!isNew && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Program Assignment
            </CardTitle>
            <CardDescription>
              Assign this client to a multi-phase coaching program
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clientProgramInfo?.program ? (
              <div className="space-y-4">
                {/* Current Program Info */}
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">{clientProgramInfo.program.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {clientProgramInfo.program.totalMonths} month program
                      </p>
                    </div>
                    {clientProgramInfo.currentPhase && (
                      <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-full">
                        <span className="text-sm font-medium">Q{clientProgramInfo.currentPhase.phaseNumber}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Phase Timeline */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Phase Progress</div>
                    <div className="flex items-center gap-1">
                      {clientProgramInfo.phases?.map((phase, index) => {
                        const isCurrent = phase.id === clientProgramInfo.currentPhase?.id;
                        const isPast = (clientProgramInfo.phases?.findIndex((p) => p.id === clientProgramInfo.currentPhase?.id) ?? -1) > index;
                        return (
                          <div key={phase.id} className="flex items-center">
                            <div
                              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                                isCurrent
                                  ? "bg-primary text-primary-foreground"
                                  : isPast
                                  ? "bg-green-500 text-white"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              Q{phase.phaseNumber}
                            </div>
                            {index < (clientProgramInfo.phases?.length || 0) - 1 && (
                              <ChevronRight className={`h-4 w-4 mx-1 ${isPast ? "text-green-500" : "text-muted-foreground"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Current Phase Details */}
                  {clientProgramInfo.currentPhase && (
                    <div className="mt-4 p-3 bg-background rounded-md">
                      <div className="font-medium">{clientProgramInfo.currentPhase.name}</div>
                      {clientProgramInfo.currentPhase.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {clientProgramInfo.currentPhase.description}
                        </p>
                      )}
                      {clientProgramInfo.currentPhase.goals && (
                        <div className="mt-2">
                          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <Target className="h-3 w-3" />
                            Goals
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-line">
                            {clientProgramInfo.currentPhase.goals}
                          </p>
                        </div>
                      )}
                      {clientProgramInfo.phaseStartDate && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Started: {new Date(clientProgramInfo.phaseStartDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Advance Phase Button */}
                  {clientProgramInfo.phases && clientProgramInfo.currentPhase && (() => {
                    const currentIndex = clientProgramInfo.phases?.findIndex((p) => p.id === clientProgramInfo.currentPhase?.id) ?? -1;
                    const nextPhase = clientProgramInfo.phases[currentIndex + 1];
                    if (nextPhase) {
                      return (
                        <Button
                          className="mt-4"
                          onClick={() => {
                            if (confirm(`Advance client to ${nextPhase.name}?`)) {
                              advancePhaseMutation.mutate({
                                clientProtocolId: clientId!,
                                newPhaseId: nextPhase.id,
                              });
                            }
                          }}
                          disabled={advancePhaseMutation.isPending}
                        >
                          {advancePhaseMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          <ChevronRight className="h-4 w-4 mr-2" />
                          Advance to {nextPhase.name}
                        </Button>
                      );
                    }
                    return (
                      <div className="mt-4 text-sm text-green-600 font-medium">
                        ✓ Client has completed all phases
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  This client is not currently assigned to a program. Assign them to track their progress.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Select Program</Label>
                    <Select
                      value={selectedProgramId?.toString() || ""}
                      onValueChange={(value) => {
                        setSelectedProgramId(parseInt(value));
                        setSelectedPhaseId(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a program..." />
                      </SelectTrigger>
                      <SelectContent>
                        {programs?.map((program) => (
                          <SelectItem key={program.id} value={program.id.toString()}>
                            {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedProgramId && selectedProgramPhases && selectedProgramPhases.length > 0 && (
                    <div className="space-y-2">
                      <Label>Starting Phase</Label>
                      <Select
                        value={selectedPhaseId?.toString() || ""}
                        onValueChange={(value) => setSelectedPhaseId(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose starting phase..." />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedProgramPhases.map((phase) => (
                            <SelectItem key={phase.id} value={phase.id.toString()}>
                              Q{phase.phaseNumber}: {phase.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {selectedProgramId && (selectedPhaseId || (selectedProgramPhases && selectedProgramPhases.length === 0)) && (
                  <Button
                    onClick={() => {
                      assignProgramMutation.mutate({
                        clientProtocolId: clientId!,
                        programId: selectedProgramId,
                        phaseId: selectedPhaseId || 0,
                      });
                    }}
                    disabled={assignProgramMutation.isPending}
                  >
                    {assignProgramMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Layers className="h-4 w-4 mr-2" />
                    Assign to Program
                  </Button>
                )}
                {programs?.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No programs available. <a href="/admin/programs" className="text-primary hover:underline">Create a program</a> first.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Reminder History & Manual Trigger */}
      {!isNew && clientId && (
        <PaymentReminderSection clientId={clientId} clientEmail={formData.clientEmail} />
      )}

      {/* Reset Approval Section - Component handles its own visibility based on status */}
      {!isNew && clientId && (
        <ResetApprovalSection clientId={clientId} clientName={formData.clientName} />
      )}
    </TabsContent>
  );
}

// Separate component for payment reminder functionality
function PaymentReminderSection({ clientId, clientEmail }: { clientId: number; clientEmail: string }) {
  const [selectedUrgency, setSelectedUrgency] = React.useState<'friendly' | 'moderate' | 'urgent'>('friendly');
  
  const reminderLogsQuery = trpc.clientProtocol.getReminderLogs.useQuery(
    { protocolId: clientId },
    { enabled: !!clientId }
  );
  
  const sendManualReminderMutation = trpc.clientProtocol.sendManualReminder.useMutation({
    onSuccess: () => {
      toast.success('Payment reminder sent successfully');
      reminderLogsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to send reminder: ${error.message}`);
    },
  });
  
  const formatDate = (date: string | Date) => {
    return toLocaleDateStringMT(date, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'manual':
        return <Send className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const getUrgencyBadge = (type: string) => {
    switch (type) {
      case 'friendly':
        return <Badge variant="outline" className="text-green-600 border-green-600">Friendly</Badge>;
      case 'moderate':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Moderate</Badge>;
      case 'urgent':
        return <Badge variant="outline" className="text-red-600 border-red-600">Urgent</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Payment Reminders
        </CardTitle>
        <CardDescription>
          View reminder history and send manual payment reminders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Manual Reminder Trigger */}
        <div className="p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium mb-3">Send Manual Reminder</h4>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Urgency Level</Label>
              <Select
                value={selectedUrgency}
                onValueChange={(value: 'friendly' | 'moderate' | 'urgent') => setSelectedUrgency(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                if (!clientEmail) {
                  toast.error('No email address for this client');
                  return;
                }
                sendManualReminderMutation.mutate({
                  protocolId: clientId,
                  urgencyLevel: selectedUrgency,
                });
              }}
              disabled={sendManualReminderMutation.isPending || !clientEmail}
            >
              {sendManualReminderMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Reminder
            </Button>
            {!clientEmail && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                No email address on file
              </p>
            )}
          </div>
        </div>
        
        {/* Reminder History */}
        <div>
          <h4 className="font-medium mb-3">Reminder History</h4>
          {reminderLogsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reminderLogsQuery.data && reminderLogsQuery.data.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Date</th>
                    <th className="px-4 py-2 text-left font-medium">Type</th>
                    <th className="px-4 py-2 text-left font-medium">Day</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reminderLogsQuery.data.map((log: any) => (
                    <tr key={log.id} className="border-t">
                      <td className="px-4 py-2">{formatDate(log.sentAt)}</td>
                      <td className="px-4 py-2">{getUrgencyBadge(log.reminderType)}</td>
                      <td className="px-4 py-2">
                        {log.reminderDay === 0 ? (
                          <span className="text-blue-600">Manual</span>
                        ) : (
                          `Day ${log.reminderDay}`
                        )}
                      </td>
                      <td className="px-4 py-2 flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <span className="capitalize">{log.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No payment reminders have been sent to this client yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Component for resetting protocol approval status
function ResetApprovalSection({ clientId, clientName }: { clientId: number; clientName: string }) {
  const trpcUtils = trpc.useUtils();
  
  // Fetch client data to check status
  const { data: client } = trpc.clientProtocol.get.useQuery(
    { id: clientId },
    { enabled: !!clientId }
  );
  
  const resetApprovalMutation = trpc.clientProtocol.resetApproval.useMutation({
    onSuccess: () => {
      toast.success('Protocol approval has been reset');
      trpcUtils.clientProtocol.invalidate();
      // Refresh the page to show updated status
      window.location.reload();
    },
    onError: (error) => {
      toast.error(`Failed to reset approval: ${error.message}`);
    },
  });
  
  // Only show if status is approved or active
  if (!client || !['approved', 'active'].includes(client.status)) {
    return null;
  }
  
  return (
    <Card className="mt-6 border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <RotateCcw className="h-5 w-5" />
          Reset Protocol Approval
        </CardTitle>
        <CardDescription className="text-red-600">
          Reset this protocol back to draft status. This will clear the approval date and payment status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-lg border border-red-200">
            <p className="text-sm text-gray-700">
              <strong>Warning:</strong> This action will:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
              <li>Reset the protocol status to "draft"</li>
              <li>Clear the approval date</li>
              <li>Reset payment status to "pending"</li>
              <li>Clear the payment received date and method</li>
            </ul>
            <p className="text-sm text-gray-500 mt-3">
              Note: This will NOT restore any inventory that was deducted when the protocol was approved.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm(`Are you sure you want to reset ${clientName}'s protocol approval? This cannot be undone.`)) {
                resetApprovalMutation.mutate({ id: clientId });
              }
            }}
            disabled={resetApprovalMutation.isPending}
          >
            {resetApprovalMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Reset Approval Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
