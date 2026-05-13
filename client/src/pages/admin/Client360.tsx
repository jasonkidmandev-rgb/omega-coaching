import { useState, useMemo, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Users,
  UserCheck,
  UserPlus,
  ShoppingCart,
  Calendar,
  CalendarPlus,
  ClipboardCheck,
  Mail,
  Phone,
  ChevronRight,
  ArrowLeft,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Package,
  Star,
  TrendingUp,
  Eye,
  ExternalLink,
  Merge,
  X,
  Pencil,
  Save,
  Zap,
  Rocket,
  Loader2,
  Filter,
  Trash2,
  MoreVertical,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useLocation } from "wouter";

// Stage badge colors
const stageBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  lead: { label: "Lead", variant: "outline", className: "border-blue-300 text-blue-700 bg-blue-50" },
  prospect: { label: "Prospect", variant: "outline", className: "border-amber-300 text-amber-700 bg-amber-50" },
  enrolled: { label: "Enrolled", variant: "outline", className: "border-purple-300 text-purple-700 bg-purple-50" },
  active_client: { label: "Active Client", variant: "default", className: "bg-green-600 text-white" },
  past_client: { label: "Past Client", variant: "secondary", className: "bg-slate-200 text-slate-700" },
  store_customer: { label: "Store Customer", variant: "outline", className: "border-orange-300 text-orange-700 bg-orange-50" },
};

function StageBadge({ stage }: { stage: string }) {
  const config = stageBadge[stage] || { label: stage, variant: "outline" as const };
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}

// Profile completion indicator
function ProfileIndicator({ complete }: { complete: boolean }) {
  if (complete) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="h-3 w-3" /> Complete
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-amber-600">
      <AlertCircle className="h-3 w-3" /> Incomplete
    </span>
  );
}

// Format relative time
function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Calendly scheduling button with inline embed
function CalendlyScheduleButton({ clientName, clientEmail }: { clientName: string; clientEmail?: string }) {
  const [showEmbed, setShowEmbed] = useState(false);
  const { data: eventTypesData } = trpc.calendly.getEventTypes.useQuery();
  const { data: excludedData } = trpc.calendly.getExcludedEventTypes.useQuery();

  const filteredEventTypes = (eventTypesData?.eventTypes || []).filter(et => {
    const excluded = excludedData?.excludedNames || [];
    return !excluded.some(name => et.name.toLowerCase().includes(name.toLowerCase()));
  });

  const handleSchedule = (schedulingUrl: string) => {
    // Pre-fill client info via Calendly URL params
    const params = new URLSearchParams();
    if (clientName) params.set('name', clientName);
    if (clientEmail) params.set('email', clientEmail);
    const url = `${schedulingUrl}?${params.toString()}`;
    window.open(url, '_blank');
    toast.success(`Opening Calendly to schedule for ${clientName}`);
    setShowEmbed(false);
  };

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowEmbed(!showEmbed)}
        className="flex items-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
      >
        <CalendarPlus className="h-4 w-4" />
        Schedule Appointment
      </Button>

      {showEmbed && (
        <div className="mt-3 border rounded-lg p-4 bg-gray-50 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Select Event Type</span>
            <button onClick={() => setShowEmbed(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          {filteredEventTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No event types available. Check Calendly Settings.</p>
          ) : (
            <div className="grid gap-2">
              {filteredEventTypes.map(et => (
                <button
                  key={et.uri}
                  onClick={() => handleSchedule(et.schedulingUrl)}
                  className="flex items-center justify-between p-3 bg-white border rounded-lg hover:border-orange-300 hover:bg-orange-50/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: et.color || '#6b7280' }} />
                    <div>
                      <div className="text-sm font-medium">{et.name}</div>
                      <div className="text-xs text-gray-500">{et.duration} min</div>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">Opens Calendly in a new tab with {clientName}'s info pre-filled</p>
        </div>
      )}
    </div>
  );
}

// Detail panel for a single person
function PersonDetail({ email, personId, contactId: propContactId, onClose }: { email?: string; personId?: string; contactId?: number; onClose: () => void }) {
  const { data, isLoading } = trpc.client360.detail.useQuery({ email: email || undefined, personId: personId || undefined, contactId: propContactId || undefined });
  const { data: calendlyData } = trpc.calendly.getAppointmentsByEmail.useQuery(
    { email: email || "" },
    { enabled: !!email }
  );
  const [, setLocation] = useLocation();

  // ALL hooks must be called before any early returns (React rules of hooks)
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStage, setEditStage] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const utils = trpc.useUtils();
  const updateContactMutation = trpc.client360.updateContact.useMutation({
    onSuccess: () => {
      toast.success("Contact updated everywhere", { description: "Name, email, and phone synced across all records" });
      setIsEditing(false);
      utils.client360.detail.invalidate();
      utils.client360.list.invalidate();
    },
    onError: (err: any) => toast.error("Failed to update contact", { description: err.message }),
  });

  const deleteContactMutation = trpc.client360.deleteContact.useMutation({
    onSuccess: () => {
      toast.success("Contact deleted");
      setShowDeleteConfirm(false);
      onClose();
      utils.client360.list.invalidate();
    },
    onError: (err: any) => toast.error("Failed to delete contact", { description: err.message }),
  });

  // Sync edit fields when data loads or contact changes
  const contact = data?.contact;
  useEffect(() => {
    if (contact) {
      setEditFirstName(contact.firstName || "");
      setEditLastName(contact.lastName || "");
      setEditEmail(contact.email || "");
      setEditPhone(contact.phone || "");
      setEditStage(contact.lifecycleStage || "lead");
    }
  }, [contact?.id]);

  const contactId = contact?.id;

  // Journey Timeline query
  const { data: timelineData, isLoading: timelineLoading } = trpc.client360.journeyTimeline.useQuery(
    { email: email || undefined, personId: personId || undefined, contactId: propContactId || undefined },
    { enabled: !!email || !!personId || !!propContactId }
  );
  const [timelineFilter, setTimelineFilter] = useState<string>('all');

  const handleSaveContact = useCallback(() => {
    if (!contactId) {
      toast.error("No contact record found");
      return;
    }
    updateContactMutation.mutate({
      contactId,
      firstName: editFirstName || undefined,
      lastName: editLastName || undefined,
      email: editEmail || undefined,
      phone: editPhone || undefined,
      lifecycleStage: editStage as any || undefined,
    });
  }, [contactId, editFirstName, editLastName, editEmail, editPhone]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-muted-foreground py-8">No data found</div>;
  }

  const { prospect, protocols, enrollments, user, appointments: localAppointments, orders, checkins, emailHistory, consultationNotes, projects } = data;

  // Merge local DB appointments with Calendly appointments
  const calendlyAppointments = (calendlyData?.appointments || []).map((ca: any) => ({
    id: `calendly-${ca.id}`,
    appointmentTypeName: ca.eventTypeName,
    startTime: ca.startTime,
    endTime: ca.endTime,
    status: ca.status === 'canceled' ? 'cancelled' : ca.status === 'active' ? (new Date(ca.startTime) < new Date() ? 'completed' : 'scheduled') : ca.status,
    meetingLink: ca.joinUrl,
    duration: ca.duration,
    source: 'calendly' as const,
  }));
  const localMapped = (localAppointments || []).map((a: any) => ({ ...a, source: 'local' as const }));
  const appointments = [...localMapped, ...calendlyAppointments]
    .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  // Use contact record as the SINGLE SOURCE OF TRUTH for person data
  const primaryName = contact?.fullName || contact?.firstName || protocols[0]?.clientName || prospect?.name || user?.name || "Unknown";
  const primaryEmail = contact?.email || email;
  const primaryPhone = contact?.phone || protocols[0]?.clientPhone || prospect?.phone || user?.phone;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">First Name</label>
                  <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} placeholder="First name" className="mt-1" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Last Name</label>
                  <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} placeholder="Last name" className="mt-1" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" type="email" className="mt-1" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Phone</label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone" className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Lifecycle Stage</label>
                <Select value={editStage} onValueChange={setEditStage}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="enrolled">Enrolled</SelectItem>
                    <SelectItem value="active_client">Active Client</SelectItem>
                    <SelectItem value="past_client">Past Client</SelectItem>
                    <SelectItem value="store_customer">Store Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSaveContact} disabled={updateContactMutation.isPending}>
                  <Save className="h-3.5 w-3.5 mr-1" /> {updateContactMutation.isPending ? "Saving..." : "Save & Sync Everywhere"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
              <p className="text-xs text-muted-foreground">Changes will update this person's name, email, phone, and stage across all records.</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold">{primaryName}</h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {primaryEmail && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {primaryEmail}
                  </span>
                )}
                {primaryPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {primaryPhone}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {prospect && <StageBadge stage={prospect.status === "enrolled" ? "enrolled" : "prospect"} />}
                {protocols.some(p => p.status === "active") && <StageBadge stage="active_client" />}
                {user && <Badge variant="outline" className="text-xs">Has Account</Badge>}
              </div>
            </>
          )}
        </div>
        {!isEditing && contactId && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              setEditFirstName(contact?.firstName || "");
              setEditLastName(contact?.lastName || "");
              setEditEmail(contact?.email || "");
              setEditPhone(contact?.phone || "");
              setEditStage(contact?.lifecycleStage || "lead");
              setIsEditing(true);
            }}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Contact</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{primaryName}</strong>? This will permanently remove this contact and their prospect record. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => contactId && deleteContactMutation.mutate({ contactId })}
                disabled={deleteContactMutation.isPending}
              >
                {deleteContactMutation.isPending ? "Deleting..." : "Delete Permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Separator />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{protocols.length}</div>
            <div className="text-xs text-muted-foreground">Protocols</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{appointments.length}</div>
            <div className="text-xs text-muted-foreground">Appointments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{orders.length}</div>
            <div className="text-xs text-muted-foreground">Orders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{checkins.length}</div>
            <div className="text-xs text-muted-foreground">Check-ins</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Sections */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="protocols">Protocols ({protocols.length})</TabsTrigger>
          <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="emails">Emails ({emailHistory.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({consultationNotes.length})</TabsTrigger>
          <TabsTrigger value="journey">Journey</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Prospect Info */}
          {prospect && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Prospect Record
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline">{prospect.customStatus || prospect.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span>{prospect.source || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Contacted</span>
                  <span>{prospect.lastContactedAt ? new Date(prospect.lastContactedAt).toLocaleDateString() : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Follow-ups</span>
                  <span>{prospect.followUpCount}</span>
                </div>
                {prospect.thingsToKnow && (
                  <div className="pt-2">
                    <span className="text-muted-foreground text-xs">Things to Know:</span>
                    <p className="text-xs mt-1 bg-muted p-2 rounded">{prospect.thingsToKnow}</p>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => { onClose(); setLocation(`/admin/prospects/${prospect.id}`); }}
                >
                  Open in Lead Pipeline <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Enrollment Info */}
          {enrollments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="h-4 w-4" /> Transformation Enrollments
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {enrollments.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <span className="font-medium">{e.programType?.replace(/_/g, " ") || "Transformation"}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{e.status?.replace(/_/g, " ")}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => { onClose(); setLocation("/admin/enrollments"); }}
                    >
                      View <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* User Account */}
          {user && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserCheck className="h-4 w-4" /> User Account
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <Badge variant="outline">{user.role}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Sign In</span>
                  <span>{user.lastSignedIn ? timeAgo(user.lastSignedIn) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stripe Customer</span>
                  <span>{user.stripeCustomerId ? "Linked" : "None"}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" /> Client Projects
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {projects.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{p.clientName}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{p.status}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => { onClose(); setLocation(`/admin/projects/${p.id}`); }}
                    >
                      View <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Protocols Tab */}
        <TabsContent value="protocols" className="space-y-3 mt-4">
          {protocols.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No protocols found</div>
          ) : (
            protocols.map((cp: any) => (
              <Card key={cp.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { onClose(); setLocation(`/admin/clients/${cp.id}`); }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{cp.clientName}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {cp.coachingPackage || "No package"} · Created {new Date(cp.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={cp.status === "active" ? "default" : "outline"}>
                        {cp.status}
                      </Badge>
                      <ProfileIndicator complete={!!(cp.shippingName && cp.shippingStreet && cp.shippingCity)} />
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-3 mt-4">
          {/* Schedule New Appointment Button */}
          <CalendlyScheduleButton clientName={primaryName} clientEmail={primaryEmail} />

          {appointments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No appointments found in local DB or Calendly</div>
          ) : (() => {
            const now = new Date();
            const upcoming = appointments.filter((a: any) => new Date(a.startTime) >= now && a.status !== 'cancelled');
            const past = appointments.filter((a: any) => new Date(a.startTime) < now || a.status === 'cancelled');
            return (
              <div className="space-y-4">
                {upcoming.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-semibold text-orange-700">Upcoming ({upcoming.length})</span>
                    </div>
                    <div className="space-y-2">
                      {upcoming.map((a: any) => {
                        const daysUntil = Math.ceil((new Date(a.startTime).getTime() - now.getTime()) / (1000*60*60*24));
                        return (
                          <div key={a.id} className="p-3 border rounded-lg bg-orange-50/50 border-orange-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm flex items-center gap-2">
                                  {a.appointmentTypeName || 'Appointment'}
                                  <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                                    {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                                  </Badge>
                                  {a.source === 'calendly' && <Badge variant="outline" className="text-xs border-blue-200 text-blue-600 bg-blue-50">Calendly</Badge>}
                                  {a.duration && <span className="text-xs text-gray-400">{a.duration} min</span>}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {new Date(a.startTime).toLocaleString("en-US", { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </div>
                              </div>
                              <Badge variant="outline" className="border-green-300 text-green-700">{a.status}</Badge>
                            </div>
                            {a.meetingLink && (
                              <a href={a.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> Join Meeting
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {past.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-500">Past ({past.length})</span>
                    </div>
                    <div className="space-y-2">
                      {past.slice(0, 10).map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm text-gray-600 flex items-center gap-2">
                              {a.appointmentTypeName || 'Appointment'}
                              {a.source === 'calendly' && <Badge variant="outline" className="text-xs border-blue-200 text-blue-600 bg-blue-50">Calendly</Badge>}
                              {a.duration && <span className="text-xs text-gray-400">{a.duration} min</span>}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(a.startTime).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                            </div>
                          </div>
                          <Badge variant={a.status === "completed" ? "default" : a.status === "cancelled" ? "destructive" : "outline"}>
                            {a.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-3 mt-4">
          {orders.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No orders found</div>
          ) : (
            <div className="space-y-2">
              {orders.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm">Order #{o.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString()} · {o.paymentMethod}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${o.total}</div>
                    <Badge variant={o.status === "paid" || o.status === "delivered" ? "default" : "outline"} className="text-xs">
                      {o.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Emails Tab */}
        <TabsContent value="emails" className="space-y-3 mt-4">
          {emailHistory.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No email history</div>
          ) : (
            <div className="space-y-2">
              {emailHistory.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{e.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.emailType} · {new Date(e.sentAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-shrink-0">
                    {e.openCount > 0 && (
                      <span className="flex items-center gap-1 text-green-600">
                        <Eye className="h-3 w-3" /> {e.openCount}
                      </span>
                    )}
                    {e.clickCount > 0 && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <TrendingUp className="h-3 w-3" /> {e.clickCount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-3 mt-4">
          {consultationNotes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No consultation notes</div>
          ) : (
            <div className="space-y-2">
              {consultationNotes.map((n: any) => (
                <Card key={n.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">{n.consultType?.replace(/_/g, " ")}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.consultDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{n.notes}</p>
                    {n.recommendations && (
                      <div className="mt-2 text-xs bg-muted p-2 rounded">
                        <strong>Recommendations:</strong> {n.recommendations}
                      </div>
                    )}
                    {n.nextSteps && (
                      <div className="mt-1 text-xs bg-muted p-2 rounded">
                        <strong>Next Steps:</strong> {n.nextSteps}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Journey Timeline Tab */}
        <TabsContent value="journey" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Client Journey Timeline
                </CardTitle>
                <select
                  className="text-xs border rounded px-2 py-1 bg-background"
                  value={timelineFilter}
                  onChange={(e) => setTimelineFilter(e.target.value)}
                >
                  <option value="all">All Events</option>
                  <option value="Pipeline">Pipeline</option>
                  <option value="Protocol">Protocol</option>
                  <option value="Enrollment">Enrollment</option>
                  <option value="Appointment">Appointments</option>
                  <option value="Store">Store Orders</option>
                  <option value="Automation">Automation</option>
                  <option value="Project">Project Activity</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {timelineLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : timelineData && timelineData.events.length > 0 ? (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-4">
                    {timelineData.events
                      .filter(ev => timelineFilter === 'all' || ev.category === timelineFilter)
                      .map((ev) => {
                        const iconMap: Record<string, React.ReactNode> = {
                          UserPlus: <UserPlus className="h-3.5 w-3.5" />,
                          Phone: <Phone className="h-3.5 w-3.5" />,
                          FileText: <FileText className="h-3.5 w-3.5" />,
                          CheckCircle: <CheckCircle2 className="h-3.5 w-3.5" />,
                          Star: <Star className="h-3.5 w-3.5" />,
                          Calendar: <Calendar className="h-3.5 w-3.5" />,
                          Rocket: <Rocket className="h-3.5 w-3.5" />,
                          ShoppingCart: <ShoppingCart className="h-3.5 w-3.5" />,
                          Zap: <Zap className="h-3.5 w-3.5" />,
                          Activity: <Activity className="h-3.5 w-3.5" />,
                          MessageSquare: <Mail className="h-3.5 w-3.5" />,
                        };
                        const colorMap: Record<string, string> = {
                          blue: 'bg-blue-100 text-blue-700 border-blue-200',
                          purple: 'bg-purple-100 text-purple-700 border-purple-200',
                          green: 'bg-green-100 text-green-700 border-green-200',
                          amber: 'bg-amber-100 text-amber-700 border-amber-200',
                          orange: 'bg-orange-100 text-orange-700 border-orange-200',
                          red: 'bg-red-100 text-red-700 border-red-200',
                          emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                          cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
                          slate: 'bg-slate-100 text-slate-700 border-slate-200',
                          gray: 'bg-gray-100 text-gray-600 border-gray-200',
                        };
                        return (
                          <div key={ev.id} className="relative flex items-start gap-3 pl-2">
                            <div className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full border ${colorMap[ev.color] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {iconMap[ev.icon] || <Activity className="h-3.5 w-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{ev.title}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{ev.category}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{ev.description}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {ev.date ? new Date(ev.date).toLocaleString() : 'Unknown date'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No journey events found for this person.
                </div>
              )}
              {timelineData && (
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  {timelineData.totalCount} total events
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
// Main Client 360 Dashboard
export default function Client360Dashboard() {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [selectedPerson, setSelectedPerson] = useState<{ email?: string; personId?: string; contactId?: number } | null>(null);
  const [page, setPage] = useState(0);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<any[]>([]);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ contactId: number; name: string } | null>(null);

  const utils = trpc.useUtils();
  const limit = 50;

  const mergeMutation = trpc.client360.mergeContacts.useMutation({
    onSuccess: (data) => {
      toast.success(`Contacts merged successfully${data.mergedFields.length > 0 ? `. Filled: ${data.mergedFields.join(", ")}` : ""}`);
      setMergeMode(false);
      setMergeSelection([]);
      setShowMergeConfirm(false);
      utils.client360.list.invalidate();
    },
    onError: (err) => {
      toast.error(`Merge failed: ${err.message}`);
    },
  });

  const updateContactMutation = trpc.client360.updateContact.useMutation({
    onSuccess: () => {
      toast.success("Stage updated");
      utils.client360.list.invalidate();
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const deleteContactMutation = trpc.client360.deleteContact.useMutation({
    onSuccess: () => {
      toast.success("Contact deleted");
      setDeleteTarget(null);
      utils.client360.list.invalidate();
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const handleInlineStageChange = (contactId: number, newStage: string) => {
    updateContactMutation.mutate({ contactId, lifecycleStage: newStage as any });
  };

  const { data, isLoading } = trpc.client360.list.useQuery({
    search: search || undefined,
    stage: stage as any,
    limit,
    offset: page * limit,
  });

  const people = data?.people || [];
  const total = data?.total || 0;
  const stageCounts = data?.stageCounts || { all: 0, lead: 0, prospect: 0, enrolled: 0, active_client: 0, past_client: 0, store_customer: 0 };

  const stageFilters = [
    { key: "all", label: "All People", icon: Users },
    { key: "lead", label: "Leads", icon: UserPlus },
    { key: "prospect", label: "Prospects", icon: Activity },
    { key: "enrolled", label: "Enrolled", icon: Star },
    { key: "active_client", label: "Active Clients", icon: UserCheck },
    { key: "past_client", label: "Past Clients", icon: Clock },
    { key: "store_customer", label: "Store Customers", icon: ShoppingCart },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client 360 Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unified view of every person — leads, prospects, clients, and store customers in one place.
          </p>
        </div>

        {/* Merge Mode Toggle */}
        <div className="flex items-center gap-2">
          {mergeMode ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setMergeMode(false); setMergeSelection([]); }}>
                <X className="h-4 w-4 mr-1" /> Cancel Merge
              </Button>
              {mergeSelection.length === 2 && (
                <Button size="sm" onClick={() => setShowMergeConfirm(true)} className="bg-orange-600 hover:bg-orange-700">
                  <Merge className="h-4 w-4 mr-1" /> Merge Selected ({mergeSelection.length})
                </Button>
              )}
              {mergeSelection.length < 2 && (
                <span className="text-sm text-muted-foreground">Select exactly 2 people to merge</span>
              )}
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setMergeMode(true)}>
              <Merge className="h-4 w-4 mr-1" /> Merge Records
            </Button>
          )}
        </div>

        {/* Stage Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {stageFilters.map(f => {
            const count = stageCounts[f.key as keyof typeof stageCounts] || 0;
            const Icon = f.icon;
            return (
              <Button
                key={f.key}
                variant={stage === f.key ? "default" : "outline"}
                size="sm"
                onClick={() => { setStage(f.key); setPage(0); }}
                className="gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>

        {/* Results Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : people.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                No people found matching your criteria
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {mergeMode && <th className="w-10 p-3"></th>}
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">Email</th>
                      <th className="text-left p-3 font-medium hidden lg:table-cell">Phone</th>
                      <th className="text-left p-3 font-medium">Stage</th>
                      <th className="text-center p-3 font-medium hidden md:table-cell">Profile</th>
                      <th className="text-center p-3 font-medium hidden lg:table-cell">Appts</th>
                      <th className="text-center p-3 font-medium hidden lg:table-cell">Orders</th>
                      <th className="text-center p-3 font-medium hidden lg:table-cell">Check-ins</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">Last Activity</th>
                      <th className="w-10 p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((person: any, idx: number) => {
                      const isSelected = mergeSelection.some((s: any) => s.id === person.id);
                      return (
                      <tr
                        key={person.id || idx}
                        className={`border-b hover:bg-muted/30 cursor-pointer transition-colors ${isSelected ? 'bg-orange-50' : ''}`}
                        onClick={() => {
                          if (mergeMode) {
                            if (isSelected) {
                              setMergeSelection(prev => prev.filter((s: any) => s.id !== person.id));
                            } else if (mergeSelection.length < 2) {
                              setMergeSelection(prev => [...prev, person]);
                            }
                          } else {
                            setSelectedPerson({ email: person.email || undefined, personId: person.id || undefined, contactId: (person as any).contactId || undefined });
                          }
                        }}
                      >
                        {mergeMode && (
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            />
                          </td>
                        )}
                        <td className="p-3">
                          <div className="font-medium">{person.name}</div>
                          <div className="text-xs text-muted-foreground md:hidden">{person.email}</div>
                        </td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground">{person.email || "—"}</td>
                        <td className="p-3 hidden lg:table-cell text-muted-foreground">{person.phone || "—"}</td>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          {person.contactId ? (
                            <Select
                              value={person.lifecycleStage}
                              onValueChange={(val) => handleInlineStageChange(person.contactId, val)}
                            >
                              <SelectTrigger className="h-7 w-[140px] text-xs border-0 bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 px-1">
                                <StageBadge stage={person.lifecycleStage} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="lead">Lead</SelectItem>
                                <SelectItem value="prospect">Prospect</SelectItem>
                                <SelectItem value="enrolled">Enrolled</SelectItem>
                                <SelectItem value="active_client">Active Client</SelectItem>
                                <SelectItem value="past_client">Past Client</SelectItem>
                                <SelectItem value="store_customer">Store Customer</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <StageBadge stage={person.lifecycleStage} />
                          )}
                        </td>
                        <td className="p-3 text-center hidden md:table-cell">
                          <ProfileIndicator complete={person.profileComplete} />
                        </td>
                        <td className="p-3 text-center hidden lg:table-cell">{person.totalAppointments || 0}</td>
                        <td className="p-3 text-center hidden lg:table-cell">{person.totalOrders || 0}</td>
                        <td className="p-3 text-center hidden lg:table-cell">{person.totalCheckins || 0}</td>
                        <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">
                          {timeAgo(person.lastActivity)}
                        </td>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          {person.contactId && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedPerson({ email: person.email || undefined, personId: person.id || undefined, contactId: person.contactId || undefined })}>
                                  <Eye className="h-4 w-4 mr-2" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => setDeleteTarget({ contactId: person.contactId, name: person.name })}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete Contact
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Merge Confirmation Dialog */}
      <Dialog open={showMergeConfirm} onOpenChange={(open) => !open && setShowMergeConfirm(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5" /> Confirm Merge
            </DialogTitle>
          </DialogHeader>
          {mergeSelection.length === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will merge the second record into the first (primary). All linked records will be reassigned. This cannot be undone.
              </p>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg bg-green-50 border-green-200">
                  <div className="text-xs font-semibold text-green-700 mb-1">PRIMARY (kept)</div>
                  <div className="font-medium">{mergeSelection[0].name}</div>
                  <div className="text-sm text-muted-foreground">{mergeSelection[0].email || '—'} • {mergeSelection[0].phone || '—'}</div>
                  <StageBadge stage={mergeSelection[0].lifecycleStage} />
                </div>
                <div className="p-3 border rounded-lg bg-red-50 border-red-200">
                  <div className="text-xs font-semibold text-red-700 mb-1">SECONDARY (merged in & deleted)</div>
                  <div className="font-medium">{mergeSelection[1].name}</div>
                  <div className="text-sm text-muted-foreground">{mergeSelection[1].email || '—'} • {mergeSelection[1].phone || '—'}</div>
                  <StageBadge stage={mergeSelection[1].lifecycleStage} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowMergeConfirm(false)}>Cancel</Button>
                <Button
                  className="bg-orange-600 hover:bg-orange-700"
                  disabled={mergeMutation.isPending}
                  onClick={() => {
                    const primaryId = mergeSelection[0].contactId;
                    const secondaryId = mergeSelection[1].contactId;
                    if (!primaryId || !secondaryId) {
                      toast.error("Cannot merge: Both records must have a contact ID. Legacy records without contact IDs cannot be merged yet.");
                      return;
                    }
                    mergeMutation.mutate({ primaryContactId: primaryId, secondaryContactId: secondaryId });
                  }}
                >
                  {mergeMutation.isPending ? 'Merging...' : 'Confirm Merge'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPerson} onOpenChange={(open) => !open && setSelectedPerson(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Person Detail
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh] pr-4">
            {selectedPerson && (
              <PersonDetail
                email={selectedPerson.email}
                personId={selectedPerson.personId}
                contactId={selectedPerson.contactId}
                onClose={() => setSelectedPerson(null)}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation from Table */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will permanently remove this contact and their prospect record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteContactMutation.mutate({ contactId: deleteTarget.contactId })}
              disabled={deleteContactMutation.isPending}
            >
              {deleteContactMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
