import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  GraduationCap,
  Users,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  RefreshCw,
  Eye,
  Edit,
  Calendar,
  CreditCard,
  Package,
  Video,
  MessageSquare,
  ChevronRight,
  Save,
  X,
  RotateCcw,
  Send,
  History,
  Trash2,
  GitMerge,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Scan,
  Download,
  Mail,
  MailOpen,
  MousePointerClick,
  Pin,
  PinOff,
  Plus,
  FileText,
  Pencil,
  AlertTriangle,
  Timer,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Journey step definitions with labels
const journeySteps = [
  { key: "bioregulatorVideoWatched", label: "Bioregulator Video", icon: Video, phase: "Pre-Consult" },
  { key: "coachingFeePaid", label: "Coaching Fee Paid", icon: CreditCard, phase: "Pre-Consult" },
  { key: "discoverySessionScheduled", label: "Strategy Scheduled", icon: Calendar, phase: "Pre-Consult" },
  { key: "discoverySessionCompleted", label: "Strategy Completed", icon: CheckCircle, phase: "Pre-Consult" },
  { key: "protocolReady", label: "Protocol Ready", icon: Package, phase: "Protocol" },
  { key: "protocolApproved", label: "Protocol Approved", icon: CheckCircle, phase: "Protocol" },
  { key: "protocolPaid", label: "Protocol Paid", icon: CreditCard, phase: "Protocol" },
  { key: "boxShipped", label: "Box Shipped", icon: Package, phase: "Fulfillment" },
  { key: "boxDelivered", label: "Box Delivered", icon: CheckCircle, phase: "Fulfillment" },
  { key: "unpackingVideoWatched", label: "Unpacking Video", icon: Video, phase: "Launch" },
  { key: "reconstitutionScheduled", label: "Training Scheduled", icon: Calendar, phase: "Launch" },
  { key: "reconstitutionCompleted", label: "Training Completed", icon: CheckCircle, phase: "Launch" },
];

// Status badge colors
const statusColors: Record<string, string> = {
  enrolled: "bg-blue-100 text-blue-800",
  watching_videos: "bg-purple-100 text-purple-800",
  video_complete: "bg-indigo-100 text-indigo-800",
  coaching_paid: "bg-green-100 text-green-800",
  discovery_scheduled: "bg-amber-100 text-amber-800",
  discovery_complete: "bg-orange-100 text-orange-800",
  protocol_preparing: "bg-cyan-100 text-cyan-800",
  protocol_review: "bg-teal-100 text-teal-800",
  protocol_paid: "bg-emerald-100 text-emerald-800",
  launched: "bg-lime-100 text-lime-800",
  fulfillment: "bg-yellow-100 text-yellow-800",
  shipped: "bg-amber-100 text-amber-800",
  delivered: "bg-orange-100 text-orange-800",
  training_scheduled: "bg-pink-100 text-pink-800",
  training_complete: "bg-rose-100 text-rose-800",
  active: "bg-green-100 text-green-800",
  week3_review: "bg-blue-100 text-blue-800",
  month2: "bg-indigo-100 text-indigo-800",
  month3_final: "bg-purple-100 text-purple-800",
  completed: "bg-gray-100 text-gray-800",
  renewed: "bg-emerald-100 text-emerald-800",
};

export default function AdminEnrollments() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [coachNotes, setCoachNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [intakeEditingField, setIntakeEditingField] = useState<string | null>(null);
  const [intakeEditValue, setIntakeEditValue] = useState('');

  // Editable field map for intake form admin editing
  const intakeEditableFieldMap: Record<string, string> = {
    'Primary Goal': 'primaryGoal',
    'Secondary Goal': 'secondaryGoal',
    'Additional Goals': 'additionalGoals',
    'Alcohol': 'alcoholUse',
    'Nicotine': 'nicotineUse',
    'Cannabis': 'cannabisUse',
    'Other Substances': 'otherSubstanceUse',
    'Additional Context': 'additionalContext',
    'Top 3 Goals': 'top3Goals',
    'Previous Peptide Experience': 'previousPeptideExperience',
    'Medical Issues': 'medicalIssues',
    'Medical Diagnoses': 'medicalDiagnoses',
    'Hormonal Status': 'hormonalStatus',
    'Digestive Issues': 'digestiveIssues',
    'Food Cravings': 'foodCravings',
    'Activity Routine': 'physicalActivityRoutine',
    'Physical Limitations': 'physicalLimitations',
    'Sleep Duration': 'sleepDuration',
    'Main Stressors': 'mainStressors',
    'Stress Management': 'stressManagementMethods',
    'Mental Health History': 'mentalHealthHistory',
    'Psych Medications': 'psychMedications',
    'Other Concerns': 'otherConcerns',
    'Other Goal Support': 'otherGoalSupport',
    'Full Name': 'fullName',
    'Phone': 'phone',
  };

  // Fetch all enrollments
  const trpcUtils = trpc.useUtils();
  const { data: enrollments, isLoading, refetch } = trpc.transformation.getAllEnrollments.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 100,
  });

  // Fetch enrollment details
  const { data: enrollmentDetails, refetch: refetchDetails } = trpc.transformation.getEnrollmentDetails.useQuery(
    { enrollmentId: selectedEnrollment?.id || 0 },
    { enabled: !!selectedEnrollment?.id }
  );

  // Update enrollment step mutation
  const updateStepMutation = trpc.transformation.adminUpdateEnrollmentStep.useMutation({
    onSuccess: () => {
      toast.success("Step updated successfully");
      refetch();
      refetchDetails();
    },
    onError: (error) => {
      toast.error("Failed to update step", { description: error.message });
    },
  });

  // Update notes mutation
  const updateNotesMutation = trpc.transformation.updateEnrollmentNotes.useMutation({
    onSuccess: () => {
      toast.success("Notes saved successfully");
      setIsSavingNotes(false);
      refetchDetails();
    },
    onError: (error) => {
      toast.error("Failed to save notes", { description: error.message });
      setIsSavingNotes(false);
    },
  });

  // Retry payment recording mutation
  const [retryResult, setRetryResult] = useState<any>(null);
  const retryPaymentMutation = trpc.transformation.retryPaymentRecording.useMutation({
    onSuccess: (result) => {
      setRetryResult(result);
      if (result.success) {
        toast.success("Payment recovered!", { description: result.message });
        refetch();
        refetchDetails();
        refetchActivityLog();
      } else {
        toast.info(result.message);
      }
    },
    onError: (error) => {
      toast.error("Retry failed", { description: error.message });
    },
  });

  // Resend payment link mutation
  const [resendResult, setResendResult] = useState<any>(null);
  const resendPaymentLinkMutation = trpc.transformation.resendPaymentLink.useMutation({
    onSuccess: (result) => {
      setResendResult(result);
      toast.success("Payment link sent!", { description: result.message });
      refetchActivityLog();
    },
    onError: (error) => {
      toast.error("Failed to send payment link", { description: error.message });
    },
  });

  // Activity log query
  const { data: activityLog, refetch: refetchActivityLog } = trpc.transformation.getEnrollmentActivityLog.useQuery(
    { enrollmentId: selectedEnrollment?.id || 0 },
    { enabled: !!selectedEnrollment?.id }
  );

  // Email tracking query
  const { data: emailTrackingData, refetch: refetchEmailTracking } = trpc.transformation.getEnrollmentEmailTracking.useQuery(
    { enrollmentId: selectedEnrollment?.id || 0 },
    { enabled: !!selectedEnrollment?.id }
  );

  // Intake form responses query
  const { data: intakeFormData } = trpc.transformation.getIntakeForm.useQuery(
    { enrollmentId: selectedEnrollment?.id || 0 },
    { enabled: !!selectedEnrollment?.id }
  );

  // Admin update intake form fields mutation
  const intakeUpdateFieldMutation = trpc.transformation.adminUpdateIntakeFormFields.useMutation({
    onSuccess: (data) => {
      toast.success(`Updated ${data.updatedFields.join(', ')}`);
      setIntakeEditingField(null);
      setIntakeEditValue('');
      trpcUtils.transformation.getIntakeForm.invalidate({ enrollmentId: selectedEnrollment?.id || 0 });
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  // Resend welcome email mutation
  const resendWelcomeEmailMutation = trpc.transformation.resendWelcomeEmail.useMutation({
    onSuccess: (result) => {
      toast.success("Welcome email resent!", { description: result.message });
      refetchEmailTracking();
      refetchActivityLog();
    },
    onError: (error) => {
      toast.error("Failed to resend welcome email", { description: error.message });
    },
  });

  // Resend intake form email mutation
  const resendIntakeFormMutation = trpc.transformation.resendIntakeFormEmail.useMutation({
    onSuccess: (result) => {
      toast.success("Intake form email sent!", { description: result.message });
      refetchActivityLog();
    },
    onError: (error) => {
      toast.error("Failed to send intake form email", { description: error.message });
    },
  });

  // Session notes removed - now managed from Clients > Coaching Sessions tab

  // Sync enrollment clients to main clients table
  const syncClientsMutation = trpc.transformation.syncEnrollmentClients.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      refetch();
    },
    onError: (error) => {
      toast.error("Sync failed", { description: error.message });
    },
  });

  const syncSingleMutation = trpc.transformation.syncSingleEnrollmentClient.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      refetchDetails();
      refetch();
    },
    onError: (error) => {
      toast.error("Sync failed", { description: error.message });
    },
  });

  // Resend enrollment link with fresh auth token
  const resendEnrollmentLinkMutation2 = trpc.transformation.resendEnrollmentLink.useMutation({
    onSuccess: (result) => {
      toast.success("Enrollment link sent!", { description: result.message });
      refetchActivityLog();
    },
    onError: (error) => {
      toast.error("Failed to send enrollment link", { description: error.message });
    },
  });

  // Bulk cleanup state
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const { data: duplicateData, isLoading: isScanning, refetch: refetchDuplicates } = trpc.transformation.scanDuplicateEnrollments.useQuery(
    undefined,
    { enabled: showCleanupDialog }
  );
  const mergeMutation = trpc.transformation.mergeEnrollments.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      refetchDuplicates();
      refetch();
    },
    onError: (error) => {
      toast.error("Merge failed", { description: error.message });
    },
  });

  // Update notes when enrollment details change
  useEffect(() => {
    if (enrollmentDetails?.coachNotes) {
      setCoachNotes(enrollmentDetails.coachNotes);
    } else {
      setCoachNotes("");
    }
  }, [enrollmentDetails]);

  // Filter enrollments
  const filteredEnrollments = enrollments?.filter((enrollment: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      enrollment.userName?.toLowerCase().includes(query) ||
      enrollment.userEmail?.toLowerCase().includes(query) ||
      enrollment.tier?.toLowerCase().includes(query)
    );
  }) || [];

  // Handle step toggle
  const handleStepToggle = (stepKey: string, currentValue: boolean) => {
    if (!selectedEnrollment) return;
    updateStepMutation.mutate({
      enrollmentId: selectedEnrollment.id,
      step: stepKey as any,
      value: !currentValue,
    });
  };

  // Handle save notes
  const handleSaveNotes = () => {
    if (!selectedEnrollment) return;
    setIsSavingNotes(true);
    updateNotesMutation.mutate({
      enrollmentId: selectedEnrollment.id,
      notes: coachNotes,
    });
  };

  // Open details dialog
  const openDetails = (enrollment: any) => {
    setSelectedEnrollment(enrollment);
    setShowDetailsDialog(true);
  };

  // Calculate stats per status
  const statusCounts = {
    all: enrollments?.length || 0,
    enrolled: enrollments?.filter((e: any) => e.status === "enrolled").length || 0,
    watching_videos: enrollments?.filter((e: any) => e.status === "watching_videos").length || 0,
    coaching_paid: enrollments?.filter((e: any) => e.status === "coaching_paid").length || 0,
    intake_complete: enrollments?.filter((e: any) => e.status === "intake_complete").length || 0,
    discovery_scheduled: enrollments?.filter((e: any) => e.status === "discovery_scheduled").length || 0,
    active: enrollments?.filter((e: any) => e.status === "active").length || 0,
    completed: enrollments?.filter((e: any) => e.status === "completed").length || 0,
  };
  const stats = {
    total: statusCounts.all,
    active: statusCounts.active,
    inProgress: enrollments?.filter((e: any) => !["completed", "renewed", "enrolled"].includes(e.status)).length || 0,
    completed: statusCounts.completed,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enrollment Management</h1>
            <p className="text-gray-600">Manage transformation program enrollments and journey progress</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                try {
                  toast.info('Generating CSV export...');
                  const result = await trpcUtils.transformation.exportEnrollmentsCsv.fetch({});
                  if (!result || result.count === 0) {
                    toast.error('No enrollments found to export');
                    return;
                  }
                  const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `enrollments-${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  toast.success(`Exported ${result.count} enrollments to CSV`);
                } catch (err) {
                  console.error('CSV export failed:', err);
                  toast.error('Failed to export enrollments');
                }
              }}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={() => syncClientsMutation.mutate()}
              variant="outline"
              className="gap-2 border-green-200 text-green-700 hover:bg-green-50"
              disabled={syncClientsMutation.isPending}
            >
              {syncClientsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Sync to Clients
            </Button>
            <Button onClick={() => setShowCleanupDialog(true)} variant="outline" className="gap-2 border-red-200 text-red-700 hover:bg-red-50">
              <GitMerge className="h-4 w-4" />
              Cleanup Duplicates
            </Button>
            <Button onClick={() => refetch()} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Enrollments</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Programs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 10-Day Deadline Overdue Alert */}
        {(() => {
          const now = new Date();
          const overdueEnrollments = (enrollments || []).filter((e: any) => {
            if (!e.enrolledAt || ['completed', 'renewed', 'active', 'launched'].includes(e.status)) return false;
            const deadline = new Date(new Date(e.enrolledAt).getTime() + 10 * 24 * 60 * 60 * 1000);
            return now > deadline;
          });
          if (overdueEnrollments.length === 0) return null;
          return (
            <Alert className="border-red-300 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800 font-semibold">
                {overdueEnrollments.length} Enrollment{overdueEnrollments.length > 1 ? 's' : ''} Past 10-Day Start Deadline
              </AlertTitle>
              <AlertDescription className="text-red-700">
                <p className="mb-2">These clients enrolled more than 10 days ago and have NOT yet started their program. This is causing 2-5 week delays.</p>
                <div className="flex flex-wrap gap-2">
                  {overdueEnrollments.slice(0, 5).map((e: any) => {
                    const overdueDays = Math.ceil((now.getTime() - new Date(new Date(e.enrolledAt).getTime() + 10 * 24 * 60 * 60 * 1000).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <Badge key={e.id} variant="outline" className="bg-red-100 text-red-800 border-red-300 cursor-pointer hover:bg-red-200" onClick={() => openDetails(e)}>
                        {e.userName || e.userEmail?.split('@')[0] || 'Unknown'} ({overdueDays}d overdue)
                      </Badge>
                    );
                  })}
                  {overdueEnrollments.length > 5 && (
                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                      +{overdueEnrollments.length - 5} more
                    </Badge>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          );
        })()}

        {/* Filters */}
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or tier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-gray-300"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-700 border-gray-300', activeColor: 'bg-gray-800 text-white border-gray-800' },
                  { value: 'enrolled', label: 'Enrolled', color: 'bg-blue-50 text-blue-700 border-blue-200', activeColor: 'bg-blue-600 text-white border-blue-600' },
                  { value: 'watching_videos', label: 'Watching Videos', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', activeColor: 'bg-indigo-600 text-white border-indigo-600' },
                  { value: 'coaching_paid', label: 'Coaching Paid', color: 'bg-amber-50 text-amber-700 border-amber-200', activeColor: 'bg-amber-600 text-white border-amber-600' },
                  { value: 'intake_complete', label: 'Intake Complete', color: 'bg-teal-50 text-teal-700 border-teal-200', activeColor: 'bg-teal-600 text-white border-teal-600' },
                  { value: 'discovery_scheduled', label: 'Strategy Scheduled', color: 'bg-green-50 text-green-700 border-green-200', activeColor: 'bg-green-600 text-white border-green-600' },
                  { value: 'active', label: 'Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', activeColor: 'bg-emerald-600 text-white border-emerald-600' },
                  { value: 'completed', label: 'Completed', color: 'bg-purple-50 text-purple-700 border-purple-200', activeColor: 'bg-purple-600 text-white border-purple-600' },
                ].map((s) => {
                  const count = statusCounts[s.value as keyof typeof statusCounts] || 0;
                  const isActive = statusFilter === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => setStatusFilter(s.value)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        isActive ? s.activeColor : s.color
                      } hover:opacity-90`}
                    >
                      {s.label}
                      <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                        isActive ? 'bg-white/20 text-inherit' : 'bg-white text-gray-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrollments Table */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Enrollments</CardTitle>
            <CardDescription>Click on an enrollment to manage journey steps</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : filteredEnrollments.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No enrollments found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>10-Day Deadline</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments.map((enrollment: any) => (
                    <TableRow key={enrollment.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{enrollment.userName || "Unknown"}</p>
                          <p className="text-sm text-gray-500">{enrollment.userEmail || "No email"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 capitalize">
                            {enrollment.tier?.replace(/_/g, " ") || "N/A"}
                          </Badge>
                          {enrollment.vipConcierge === 1 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">
                              ✦ VIP Concierge
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {enrollment.programType === "90_day_transformation" ? "90-Day" : "Protocol Only"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[enrollment.status] || "bg-gray-100 text-gray-800"}>
                          {enrollment.status?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {enrollment.enrolledAt ? toLocaleDateStringMT(enrollment.enrolledAt, { year: 'numeric', month: 'numeric', day: 'numeric' }) : "N/A"}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // Only show deadline for non-completed, non-active enrollments
                          if (!enrollment.enrolledAt || ['completed', 'renewed', 'active', 'launched'].includes(enrollment.status)) {
                            if (enrollment.status === 'active' || enrollment.status === 'launched') {
                              return <span className="text-xs text-green-600 font-medium">Started</span>;
                            }
                            if (enrollment.status === 'completed' || enrollment.status === 'renewed') {
                              return <span className="text-xs text-gray-400">—</span>;
                            }
                            return <span className="text-xs text-gray-400">—</span>;
                          }
                          const enrolledDate = new Date(enrollment.enrolledAt);
                          const deadlineDate = new Date(enrolledDate.getTime() + 10 * 24 * 60 * 60 * 1000);
                          const now = new Date();
                          const daysRemaining = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          
                          if (daysRemaining < 0) {
                            const overdueDays = Math.abs(daysRemaining);
                            return (
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                <span className="text-xs font-bold text-red-600">{overdueDays}d overdue</span>
                              </div>
                            );
                          } else if (daysRemaining <= 3) {
                            return (
                              <div className="flex items-center gap-1">
                                <Timer className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-xs font-semibold text-amber-600">{daysRemaining}d left</span>
                              </div>
                            );
                          } else {
                            return (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-xs text-gray-500">{daysRemaining}d left</span>
                              </div>
                            );
                          }
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetails(enrollment)}
                          className="gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enrollment Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              Manage Enrollment: {enrollmentDetails?.userName || selectedEnrollment?.userName}
            </DialogTitle>
            <DialogDescription>
              Update journey steps and add coach notes for this enrollment
            </DialogDescription>
          </DialogHeader>

          {enrollmentDetails ? (
            <div className="space-y-6">
              {/* Client Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Client Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>{" "}
                    <span className="text-gray-900">{enrollmentDetails.userName || "Unknown"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>{" "}
                    <span className="text-gray-900">{enrollmentDetails.userEmail || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Enrolled:</span>{" "}
                    <span className="text-gray-900">
                      {enrollmentDetails.enrolledAt
                        ? toLocaleDateStringMT(enrollmentDetails.enrolledAt, { year: 'numeric', month: 'numeric', day: 'numeric' })
                        : "N/A"}
                    </span>
                  </div>
                  {enrollmentDetails.vipConcierge === 1 && (
                    <div className="col-span-2">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                        ✦ VIP Supply Concierge — ${enrollmentDetails.vipConciergeFee?.toLocaleString() || '1,000'} add-on
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* 10-Day Deadline Alert in Details */}
              {(() => {
                if (!enrollmentDetails.enrolledAt || ['completed', 'renewed', 'active', 'launched'].includes(enrollmentDetails.status)) return null;
                const enrolledDate = new Date(enrollmentDetails.enrolledAt);
                const deadlineDate = new Date(enrolledDate.getTime() + 10 * 24 * 60 * 60 * 1000);
                const now = new Date();
                const daysRemaining = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (daysRemaining < 0) {
                  return (
                    <Alert className="border-red-300 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertTitle className="text-red-800 font-semibold">Program Start Overdue by {Math.abs(daysRemaining)} Days</AlertTitle>
                      <AlertDescription className="text-red-700">
                        This client enrolled on {enrolledDate.toLocaleDateString()} and should have started by {deadlineDate.toLocaleDateString()}. Immediate follow-up required to prevent further delays.
                      </AlertDescription>
                    </Alert>
                  );
                } else if (daysRemaining <= 3) {
                  return (
                    <Alert className="border-amber-300 bg-amber-50">
                      <Timer className="h-4 w-4 text-amber-600" />
                      <AlertTitle className="text-amber-800 font-semibold">Only {daysRemaining} Day{daysRemaining !== 1 ? 's' : ''} Until Start Deadline</AlertTitle>
                      <AlertDescription className="text-amber-700">
                        Deadline: {deadlineDate.toLocaleDateString()}. Prioritize getting this client started to avoid delays.
                      </AlertDescription>
                    </Alert>
                  );
                }
                return null;
              })()}

              {/* View as Client */}
              <div className="flex items-center gap-3 p-3 border border-indigo-200 rounded-lg bg-indigo-50">
                <Eye className="h-5 w-5 text-indigo-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-indigo-900">Client Preview</p>
                  <p className="text-xs text-indigo-600">
                    View the transformation journey exactly as this client sees it
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-100 gap-2"
                  onClick={() => {
                    const url = `/transformation?enrollmentId=${enrollmentDetails.id}&preview=admin`;
                    window.open(url, '_blank');
                    toast.info("Opening client view in a new tab...");
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  View as Client
                </Button>
              </div>

              {/* Journey Steps */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Journey Steps</h3>
                <div className="space-y-4">
                  {["Pre-Consult", "Protocol", "Fulfillment", "Launch"].map((phase) => (
                    <div key={phase} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <ChevronRight className="h-4 w-4" />
                        {phase}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {journeySteps
                          .filter((step) => step.phase === phase)
                          .map((step) => {
                            const StepIcon = step.icon;
                            const isCompleted = enrollmentDetails[step.key] === 1 || enrollmentDetails[step.key] === true;
                            return (
                              <div
                                key={step.key}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <StepIcon className={`h-5 w-5 ${isCompleted ? "text-green-600" : "text-gray-400"}`} />
                                  <span className="text-sm text-gray-700">{step.label}</span>
                                </div>
                                <Switch
                                  checked={isCompleted}
                                  onCheckedChange={() => handleStepToggle(step.key, isCompleted)}
                                  disabled={updateStepMutation.isPending}
                                />
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Actions (Retry + Resend) */}
              {!enrollmentDetails.coachingFeePaid && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Not Recorded
                  </h3>
                  <p className="text-sm text-amber-700 mb-3">
                    The coaching fee hasn't been recorded for this enrollment. You can send a new payment link to the client.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        setRetryResult(null);
                        retryPaymentMutation.mutate({ enrollmentId: selectedEnrollment.id });
                      }}
                      disabled={retryPaymentMutation.isPending}
                      className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                    >
                      {retryPaymentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      Retry Payment Recording
                    </Button>
                    <Button
                      onClick={() => {
                        setResendResult(null);
                        resendPaymentLinkMutation.mutate({ enrollmentId: selectedEnrollment.id });
                      }}
                      disabled={resendPaymentLinkMutation.isPending}
                      variant="outline"
                      className="border-blue-300 text-blue-700 hover:bg-blue-50 gap-2"
                    >
                      {resendPaymentLinkMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Resend Payment Link
                    </Button>
                  </div>
                  {retryResult && (
                    <Alert className={`mt-3 ${retryResult.success ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                      <AlertCircle className={`h-4 w-4 ${retryResult.success ? 'text-green-600' : 'text-gray-600'}`} />
                      <AlertTitle className={retryResult.success ? 'text-green-800' : 'text-gray-800'}>
                        {retryResult.success ? 'Payment Recovered!' : 'No Payment Found'}
                      </AlertTitle>
                      <AlertDescription className={retryResult.success ? 'text-green-700' : 'text-gray-700'}>
                        {retryResult.message}
                      </AlertDescription>
                    </Alert>
                  )}
                  {resendResult && (
                    <Alert className="mt-3 border-blue-300 bg-blue-50">
                      <Send className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-800">Payment Link Sent</AlertTitle>
                      <AlertDescription className="text-blue-700">
                        {resendResult.message}
                        {resendResult.approvalLink && (
                          <a href={resendResult.approvalLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-1 text-blue-600 underline text-xs">
                            <ExternalLink className="h-3 w-3" /> Open Payment Link
                          </a>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Resend Welcome Email */}
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Welcome Email
                </h3>
                <p className="text-sm text-blue-700 mb-3">
                  If the client didn't receive the original welcome email or it bounced, you can resend it.
                </p>
                <Button
                  onClick={() => {
                    resendWelcomeEmailMutation.mutate({ enrollmentId: selectedEnrollment.id });
                  }}
                  disabled={resendWelcomeEmailMutation.isPending}
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100 gap-2"
                >
                  {resendWelcomeEmailMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Resend Welcome Email
                </Button>
              </div>

              {/* Resend Intake Form Email */}
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Intake Form Email
                </h3>
                <p className="text-sm text-amber-700 mb-3">
                  {selectedEnrollment?.intakeFormCompleted
                    ? "Client has completed their intake form. You can resend the email or reset the form so they can redo it."
                    : "Send (or resend) the intake form email so the client can complete their health intake."}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => {
                      resendIntakeFormMutation.mutate({ enrollmentId: selectedEnrollment!.id });
                    }}
                    disabled={resendIntakeFormMutation.isPending}
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100 gap-2"
                  >
                    {resendIntakeFormMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Resend Intake Form Email
                  </Button>
                  {selectedEnrollment?.intakeFormCompleted && (
                    <Button
                      onClick={() => {
                        if (confirm('This will reset the intake form so the client can redo it. Are you sure?')) {
                          resendIntakeFormMutation.mutate({ enrollmentId: selectedEnrollment!.id, resetForm: true });
                        }
                      }}
                      disabled={resendIntakeFormMutation.isPending}
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-100 gap-2"
                    >
                      Reset & Resend
                    </Button>
                  )}
                </div>
              </div>

              {/* Enrollment Access Link removed - journey page deprecated */}

              {/* Email Delivery Tracking */}
              <Accordion type="single" collapsible className="border rounded-lg">
                <AccordionItem value="email-tracking" className="border-0">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2 text-gray-900 font-semibold">
                      <MailOpen className="h-5 w-5" />
                      Email Delivery Tracking ({emailTrackingData?.length || 0} emails)
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {emailTrackingData && emailTrackingData.length > 0 ? (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {emailTrackingData.map((track: any, i: number) => {
                          const emailTypeLabels: Record<string, string> = {
                            transformation_milestone: 'Milestone',
                            transformation_welcome: 'Welcome',
                            transformation_payment: 'Payment Confirmation',
                            transformation_admin: 'Admin Notification',
                            resend_welcome: 'Welcome (Resent)',
                            welcome: 'Welcome',
                            other: 'Other',
                          };
                          const emailTypeColors: Record<string, string> = {
                            transformation_milestone: 'bg-purple-100 text-purple-700',
                            transformation_welcome: 'bg-blue-100 text-blue-700',
                            transformation_payment: 'bg-green-100 text-green-700',
                            transformation_admin: 'bg-gray-100 text-gray-700',
                            resend_welcome: 'bg-indigo-100 text-indigo-700',
                            welcome: 'bg-blue-100 text-blue-700',
                            other: 'bg-gray-100 text-gray-700',
                          };
                          return (
                            <div key={track.id || i} className="border border-gray-200 rounded-lg p-3 bg-white">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge className={`text-xs ${emailTypeColors[track.emailType] || 'bg-gray-100 text-gray-700'}`}>
                                    {emailTypeLabels[track.emailType] || track.emailType}
                                  </Badge>
                                  {track.subject && (
                                    <span className="text-xs text-gray-500 truncate max-w-[200px]" title={track.subject}>
                                      {track.subject}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400">
                                  {track.sentAt ? new Date(track.sentAt).toLocaleString() : 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1">
                                  <Mail className={`h-3.5 w-3.5 ${track.recipientEmail ? 'text-blue-500' : 'text-gray-300'}`} />
                                  <span className="text-gray-600">{track.recipientEmail || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MailOpen className={`h-3.5 w-3.5 ${track.openedAt ? 'text-green-500' : 'text-gray-300'}`} />
                                  <span className={track.openedAt ? 'text-green-700 font-medium' : 'text-gray-400'}>
                                    {track.openedAt ? `Opened ${track.openCount || 1}x` : 'Not opened'}
                                  </span>
                                  {track.openedAt && (
                                    <span className="text-gray-400 ml-1">
                                      ({new Date(track.openedAt).toLocaleString()})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MousePointerClick className={`h-3.5 w-3.5 ${track.clickedAt ? 'text-amber-500' : 'text-gray-300'}`} />
                                  <span className={track.clickedAt ? 'text-amber-700 font-medium' : 'text-gray-400'}>
                                    {track.clickedAt ? `Clicked ${track.clickCount || 1}x` : 'No clicks'}
                                  </span>
                                  {track.clickedAt && (
                                    <span className="text-gray-400 ml-1">
                                      ({new Date(track.clickedAt).toLocaleString()})
                                    </span>
                                  )}
                                </div>
                              </div>
                              {track.lastClickedLink && (
                                <div className="mt-1 text-xs text-gray-400 truncate">
                                  Last clicked: <a href={track.lastClickedLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{track.lastClickedLink}</a>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No email tracking data for this enrollment yet.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Activity Log */}
              <Accordion type="single" collapsible className="border rounded-lg">
                <AccordionItem value="activity-log" className="border-0">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2 text-gray-900 font-semibold">
                      <History className="h-5 w-5" />
                      Activity Log ({activityLog?.length || 0} entries)
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {activityLog && activityLog.length > 0 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {activityLog.map((log: any, i: number) => {
                          const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                          const actionLabels: Record<string, string> = {
                            step_toggled: 'Step Updated',
                            payment_link_sent: 'Payment Link Sent',
                            payment_recovered: 'Payment Recovered',
                            enrollment_merged: 'Enrollments Merged',
                            enrollment_deleted: 'Enrollment Removed (Duplicate)',
                            welcome_email_resent: 'Welcome Email Resent',
                            enrollment_created: 'Enrollment Created',
                          };
                          const actionColors: Record<string, string> = {
                            step_toggled: 'bg-blue-100 text-blue-700',
                            payment_link_sent: 'bg-indigo-100 text-indigo-700',
                            payment_recovered: 'bg-green-100 text-green-700',
                            enrollment_merged: 'bg-purple-100 text-purple-700',
                            enrollment_deleted: 'bg-red-100 text-red-700',
                            welcome_email_resent: 'bg-cyan-100 text-cyan-700',
                            enrollment_created: 'bg-emerald-100 text-emerald-700',
                          };
                          return (
                            <div key={log.id || i} className="flex items-start gap-3 p-2 rounded bg-gray-50 text-sm">
                              <Badge className={`text-xs shrink-0 ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
                                {actionLabels[log.action] || log.action}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <div className="text-gray-700">
                                  {log.action === 'step_toggled' && details?.step && (
                                    <span>Toggled <strong>{details.step}</strong> {details.toggled === 'on' ? 'ON' : 'OFF'}</span>
                                  )}
                                  {log.action === 'payment_link_sent' && (
                                    <span>Sent ${details?.amount} payment link to {details?.sentTo}</span>
                                  )}
                                  {log.action === 'payment_recovered' && (
                                    <span>Recovered payment: ${details?.amount} from {details?.payerName}</span>
                                  )}
                                  {log.action === 'enrollment_merged' && (
                                    <span>Merged {details?.deletedCount} duplicate(s) into this enrollment</span>
                                  )}
                                  {log.action === 'enrollment_deleted' && (
                                    <span>Removed as duplicate, merged into #{details?.mergedInto}</span>
                                  )}
                                  {!['step_toggled', 'payment_link_sent', 'payment_recovered', 'enrollment_merged', 'enrollment_deleted'].includes(log.action) && (
                                    <span>{JSON.stringify(details)}</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {log.performed_by && <span>by {log.performed_by} &middot; </span>}
                                  {log.created_at ? new Date(log.created_at).toLocaleString() : 'Unknown time'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No activity recorded yet.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Intake Form Responses */}
              <Accordion type="single" collapsible className="border rounded-lg">
                <AccordionItem value="intake-form" className="border-0">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2 text-gray-900 font-semibold">
                      <FileText className="h-5 w-5" />
                      Intake Form {intakeFormData?.isSubmitted ? '(Completed)' : intakeFormData ? '(In Progress)' : '(Not Started)'}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {intakeFormData?.data ? (() => {
                      const d = intakeFormData.data;
                      const exportToPdf = async () => {
                        const { jsPDF } = await import('jspdf');
                        const doc = new jsPDF();
                        const clientName = d.fullName || enrollmentDetails?.userName || 'Client';
                        let y = 20;
                        doc.setFontSize(18);
                        doc.setTextColor(30, 58, 95);
                        doc.text('Intake Form Responses', 105, y, { align: 'center' });
                        y += 8;
                        doc.setFontSize(12);
                        doc.setTextColor(100, 100, 100);
                        doc.text(clientName, 105, y, { align: 'center' });
                        y += 5;
                        if (intakeFormData.submittedAt) {
                          doc.setFontSize(9);
                          doc.text(`Submitted: ${new Date(intakeFormData.submittedAt).toLocaleString()}`, 105, y, { align: 'center' });
                        }
                        y += 10;
                        const pdfSections = [
                          { title: 'Demographics', fields: [
                            { label: 'Full Name', value: d.fullName },
                            { label: 'Date of Birth', value: d.dateOfBirth ? new Date(d.dateOfBirth).toLocaleDateString() : null },
                            { label: 'Sex', value: d.sex },
                            { label: 'Email', value: d.email },
                            { label: 'Phone', value: d.phone },
                            { label: 'Address', value: [d.streetAddress, d.city, d.stateProvince, d.zipCode, d.country].filter(Boolean).join(', ') || null },
                          ]},
                          { title: 'Body Composition', fields: [
                            { label: 'Height', value: d.height },
                            { label: 'Current Weight', value: d.currentWeight ? `${d.currentWeight} lbs` : null },
                            { label: 'Goal Weight', value: d.goalWeight ? `${d.goalWeight} lbs` : null },
                            { label: 'Body Fat %', value: d.bodyFatPercentage },
                          ]},
                          { title: 'Goals & Experience', fields: [
                            { label: 'Peptide Goals', value: Array.isArray(d.peptideGoals) ? d.peptideGoals.join(', ') : d.peptideGoals },
                            { label: 'Primary Goal', value: d.primaryGoal },
                            { label: 'Secondary Goal', value: d.secondaryGoal },
                            { label: 'Additional Goals', value: d.additionalGoals },
                            { label: 'Previous Peptide Experience', value: d.previousPeptideExperience },
                            { label: 'Top 3 Goals', value: d.top3Goals },
                            { label: 'Weekly Time Commitment', value: d.weeklyTimeCommitment },
                          ]},
                          { title: 'Health & Medical', fields: [
                            { label: 'Medical Issues', value: d.medicalIssues },
                            { label: 'Current Medications', value: Array.isArray(d.currentMedications) ? d.currentMedications.join(', ') : d.currentMedications },
                            { label: 'Current Supplements', value: Array.isArray(d.currentSupplements) ? d.currentSupplements.join(', ') : d.currentSupplements },
                            { label: 'Food Intolerances', value: Array.isArray(d.foodIntolerances) ? d.foodIntolerances.join(', ') : d.foodIntolerances },
                            { label: 'Digestive Issues', value: d.digestiveIssues },
                            { label: 'Medical Diagnoses', value: d.medicalDiagnoses },
                            { label: 'Hormonal Status', value: d.hormonalStatus },
                            { label: 'Food Cravings', value: d.foodCravings },
                          ]},
                          { title: 'Physical Activity', fields: [
                            { label: 'Activity Routine', value: d.physicalActivityRoutine },
                            { label: 'Physical Limitations', value: d.physicalLimitations },
                          ]},
                          { title: 'Sleep & Stress', fields: [
                            { label: 'Sleep Duration', value: d.sleepDuration },
                            { label: 'Sleep Quality', value: d.sleepQuality ? `${d.sleepQuality}/5` : null },
                            { label: 'Stress Level', value: d.stressLevel },
                            { label: 'Main Stressors', value: d.mainStressors },
                            { label: 'Stress Management', value: d.stressManagementMethods },
                          ]},
                          { title: 'Substance Use', fields: [
                            { label: 'Alcohol', value: d.alcoholUse },
                            { label: 'Nicotine', value: d.nicotineUse },
                            { label: 'Cannabis', value: d.cannabisUse },
                            { label: 'Other Substances', value: d.otherSubstanceUse },
                          ]},
                          { title: 'Aggressiveness & Readiness', fields: [
                            { label: 'Protocol Aggressiveness', value: d.aggressivenessScale ? `${d.aggressivenessScale}/5` : null },
                            { label: 'Financial Aggressiveness', value: d.financialAggressivenessScale ? `${d.financialAggressivenessScale}/5` : null },
                            { label: 'Organizational Capacity', value: d.organizationalCapacityScale ? `${d.organizationalCapacityScale}/5` : null },
                          ]},
                          { title: 'Mental Health & Safety', fields: [
                            { label: 'Safety Screen Flags', value: Array.isArray(d.safetyScreenFlags) ? d.safetyScreenFlags.join(', ') : d.safetyScreenFlags },
                            { label: 'Mental Health History', value: d.mentalHealthHistory },
                            { label: 'Psych Medications', value: d.psychMedications },
                          ]},
                          { title: 'Emergency Contact', fields: [
                            { label: 'Name', value: d.emergencyContactName },
                            { label: 'Relationship', value: d.emergencyContactRelationship },
                            { label: 'Phone', value: d.emergencyContactPhone },
                          ]},
                          { title: 'Wearables & Tracking', fields: [
                            { label: 'Wearable Devices', value: Array.isArray(d.wearableDevices) ? d.wearableDevices.join(', ') : d.wearableDevices },
                            { label: 'Metrics Tracked', value: d.typicalMetricsTracked },
                          ]},
                          { title: 'Referral', fields: [
                            { label: 'Source', value: d.referralSource },
                            { label: 'Referral Name', value: d.referralName },
                            { label: 'Other', value: d.referralOther },
                          ]},
                          { title: 'Additional Notes', fields: [
                            { label: 'Other Concerns', value: d.otherConcerns },
                            { label: 'Additional Context', value: d.additionalContext },
                            { label: 'Other Goal Support', value: d.otherGoalSupport },
                          ]},
                        ];
                        for (const section of pdfSections) {
                          const filled = section.fields.filter(f => f.value && f.value !== '[]' && f.value !== 'null');
                          if (filled.length === 0) continue;
                          if (y > 260) { doc.addPage(); y = 20; }
                          doc.setFontSize(13);
                          doc.setTextColor(30, 58, 95);
                          doc.text(section.title, 14, y);
                          y += 2;
                          doc.setDrawColor(200, 200, 200);
                          doc.line(14, y, 196, y);
                          y += 5;
                          for (const field of filled) {
                            if (y > 275) { doc.addPage(); y = 20; }
                            doc.setFontSize(10);
                            doc.setTextColor(120, 120, 120);
                            doc.text(`${field.label}:`, 16, y);
                            doc.setTextColor(30, 30, 30);
                            const val = String(field.value);
                            const lines = doc.splitTextToSize(val, 120);
                            doc.text(lines, 65, y);
                            y += Math.max(6, lines.length * 5);
                          }
                          y += 4;
                        }
                        doc.save(`intake-form-${clientName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
                        toast.success('PDF downloaded!');
                      };
                      const sections = [
                        { title: 'Demographics', fields: [
                          { label: 'Full Name', value: d.fullName },
                          { label: 'Date of Birth', value: d.dateOfBirth ? new Date(d.dateOfBirth).toLocaleDateString() : null },
                          { label: 'Sex', value: d.sex },
                          { label: 'Email', value: d.email },
                          { label: 'Phone', value: d.phone },
                          { label: 'Address', value: [d.streetAddress, d.city, d.stateProvince, d.zipCode, d.country].filter(Boolean).join(', ') || null },
                        ]},
                        { title: 'Body Composition', fields: [
                          { label: 'Height', value: d.height },
                          { label: 'Current Weight', value: d.currentWeight ? `${d.currentWeight} lbs` : null },
                          { label: 'Goal Weight', value: d.goalWeight ? `${d.goalWeight} lbs` : null },
                          { label: 'Body Fat %', value: d.bodyFatPercentage },
                        ]},
                        { title: 'Goals & Experience', fields: [
                          { label: 'Peptide Goals', value: Array.isArray(d.peptideGoals) ? d.peptideGoals.join(', ') : d.peptideGoals },
                          { label: 'Primary Goal', value: d.primaryGoal },
                          { label: 'Secondary Goal', value: d.secondaryGoal },
                          { label: 'Additional Goals', value: d.additionalGoals },
                          { label: 'Previous Peptide Experience', value: d.previousPeptideExperience },
                          { label: 'Top 3 Goals', value: d.top3Goals },
                          { label: 'Weekly Time Commitment', value: d.weeklyTimeCommitment },
                        ]},
                        { title: 'Health & Medical', fields: [
                          { label: 'Medical Issues', value: d.medicalIssues },
                          { label: 'Current Medications', value: Array.isArray(d.currentMedications) ? d.currentMedications.join(', ') : d.currentMedications },
                          { label: 'Current Supplements', value: Array.isArray(d.currentSupplements) ? d.currentSupplements.join(', ') : d.currentSupplements },
                          { label: 'Food Intolerances', value: Array.isArray(d.foodIntolerances) ? d.foodIntolerances.join(', ') : d.foodIntolerances },
                          { label: 'Digestive Issues', value: d.digestiveIssues },
                          { label: 'Medical Diagnoses', value: d.medicalDiagnoses },
                          { label: 'Hormonal Status', value: d.hormonalStatus },
                          { label: 'Food Cravings', value: d.foodCravings },
                        ]},
                        { title: 'Physical Activity', fields: [
                          { label: 'Activity Routine', value: d.physicalActivityRoutine },
                          { label: 'Physical Limitations', value: d.physicalLimitations },
                        ]},
                        { title: 'Sleep & Stress', fields: [
                          { label: 'Sleep Duration', value: d.sleepDuration },
                          { label: 'Sleep Quality', value: d.sleepQuality ? `${d.sleepQuality}/5` : null },
                          { label: 'Stress Level', value: d.stressLevel },
                          { label: 'Main Stressors', value: d.mainStressors },
                          { label: 'Stress Management', value: d.stressManagementMethods },
                        ]},
                        { title: 'Substance Use', fields: [
                          { label: 'Alcohol', value: d.alcoholUse },
                          { label: 'Nicotine', value: d.nicotineUse },
                          { label: 'Cannabis', value: d.cannabisUse },
                          { label: 'Other Substances', value: d.otherSubstanceUse },
                        ]},
                        { title: 'Aggressiveness & Readiness', fields: [
                          { label: 'Protocol Aggressiveness', value: d.aggressivenessScale ? `${d.aggressivenessScale}/5` : null },
                          { label: 'Financial Aggressiveness', value: d.financialAggressivenessScale ? `${d.financialAggressivenessScale}/5` : null },
                          { label: 'Organizational Capacity', value: d.organizationalCapacityScale ? `${d.organizationalCapacityScale}/5` : null },
                        ]},
                        { title: 'Mental Health & Safety', fields: [
                          { label: 'Safety Screen Flags', value: Array.isArray(d.safetyScreenFlags) ? d.safetyScreenFlags.join(', ') : d.safetyScreenFlags },
                          { label: 'Mental Health History', value: d.mentalHealthHistory },
                          { label: 'Psych Medications', value: d.psychMedications },
                        ]},
                        { title: 'Emergency Contact', fields: [
                          { label: 'Name', value: d.emergencyContactName },
                          { label: 'Relationship', value: d.emergencyContactRelationship },
                          { label: 'Phone', value: d.emergencyContactPhone },
                        ]},
                        { title: 'Wearables & Tracking', fields: [
                          { label: 'Wearable Devices', value: Array.isArray(d.wearableDevices) ? d.wearableDevices.join(', ') : d.wearableDevices },
                          { label: 'Metrics Tracked', value: d.typicalMetricsTracked },
                        ]},
                        { title: 'Referral', fields: [
                          { label: 'Source', value: d.referralSource },
                          { label: 'Referral Name', value: d.referralName },
                          { label: 'Other', value: d.referralOther },
                        ]},
                        { title: 'Additional Notes', fields: [
                          { label: 'Other Concerns', value: d.otherConcerns },
                          { label: 'Additional Context', value: d.additionalContext },
                          { label: 'Other Goal Support', value: d.otherGoalSupport },
                        ]},
                      ];
                      return (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto">
                          <div className="flex items-center justify-between">
                            {intakeFormData.submittedAt && (
                              <p className="text-xs text-gray-500">Submitted: {new Date(intakeFormData.submittedAt).toLocaleString()}</p>
                            )}
                            <Button size="sm" variant="outline" onClick={exportToPdf} className="ml-auto">
                              <Download className="h-4 w-4 mr-1" />
                              Export PDF
                            </Button>
                          </div>
                          {sections.map((section) => {
                            const displayFields = section.fields.filter(f => {
                              const hasValue = f.value && f.value !== '[]' && f.value !== 'null';
                              const isEditable = !!intakeEditableFieldMap[f.label];
                              return hasValue || isEditable;
                            });
                            if (displayFields.length === 0) return null;
                            return (
                              <div key={section.title} className="border-b border-gray-100 pb-3">
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">{section.title}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {displayFields.map((field) => {
                                    const isEditable = !!intakeEditableFieldMap[field.label];
                                    const isEditing = intakeEditingField === field.label;
                                    const isEmpty = !field.value || field.value === '[]' || field.value === 'null';
                                    
                                    if (isEditing) {
                                      return (
                                        <div key={field.label} className="text-sm col-span-2 bg-blue-50 p-2 rounded">
                                          <Label className="text-xs text-gray-600 mb-1 block">{field.label}</Label>
                                          <div className="flex gap-2">
                                            <Input
                                              value={intakeEditValue}
                                              onChange={(e) => setIntakeEditValue(e.target.value)}
                                              className="h-8 text-sm flex-1"
                                              placeholder={`Enter ${field.label.toLowerCase()}...`}
                                              autoFocus
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' && selectedEnrollment) {
                                                  const fk = intakeEditableFieldMap[field.label];
                                                  if (fk) intakeUpdateFieldMutation.mutate({ enrollmentId: selectedEnrollment.id, fields: { [fk]: intakeEditValue } });
                                                }
                                                if (e.key === 'Escape') { setIntakeEditingField(null); setIntakeEditValue(''); }
                                              }}
                                            />
                                            <Button size="sm" variant="default" className="h-8 px-2" onClick={() => {
                                              const fk = intakeEditableFieldMap[field.label];
                                              if (fk && selectedEnrollment) intakeUpdateFieldMutation.mutate({ enrollmentId: selectedEnrollment.id, fields: { [fk]: intakeEditValue } });
                                            }} disabled={intakeUpdateFieldMutation.isPending}>
                                              {intakeUpdateFieldMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setIntakeEditingField(null); setIntakeEditValue(''); }}>
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    }
                                    
                                    return (
                                      <div key={field.label} className={`text-sm group flex items-start gap-1 ${isEmpty ? 'opacity-60' : ''}`}>
                                        <div className="flex-1">
                                          <span className="text-gray-500">{field.label}:</span>{' '}
                                          {isEmpty ? (
                                            <span className="text-amber-600 italic text-xs">Not provided</span>
                                          ) : (
                                            <span className="text-gray-900">{String(field.value)}</span>
                                          )}
                                        </div>
                                        {isEditable && (
                                          <button
                                            onClick={() => { setIntakeEditingField(field.label); setIntakeEditValue(isEmpty ? '' : String(field.value)); }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-400 hover:text-blue-600"
                                            title={isEmpty ? `Add ${field.label}` : `Edit ${field.label}`}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })() : (
                      <p className="text-sm text-gray-500 italic">No intake form data available for this enrollment.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Per-Enrollment Sync to Clients */}
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                <Users className="h-5 w-5 text-gray-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Client Record</p>
                  <p className="text-xs text-gray-500">
                    {enrollmentDetails?.clientProtocolId && enrollmentDetails.clientProtocolId > 0
                      ? `Linked to client #${enrollmentDetails.clientId} / protocol #${enrollmentDetails.clientProtocolId}`
                      : enrollmentDetails?.clientId && enrollmentDetails.clientId > 0
                      ? `Linked to client #${enrollmentDetails.clientId} (no protocol yet)`
                      : 'Not yet linked to a client record'}
                  </p>
                </div>
                {enrollmentDetails?.clientProtocolId && enrollmentDetails.clientProtocolId > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/admin/clients/${enrollmentDetails.clientProtocolId}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={enrollmentDetails?.clientId && enrollmentDetails.clientId > 0 ? 'outline' : 'default'}
                  className={enrollmentDetails?.clientId && enrollmentDetails.clientId > 0 ? '' : 'bg-green-600 hover:bg-green-700 text-white'}
                  disabled={syncSingleMutation.isPending}
                  onClick={() => {
                    if (selectedEnrollment?.id) {
                      syncSingleMutation.mutate({ enrollmentId: selectedEnrollment.id });
                    }
                  }}
                >
                  {syncSingleMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <GitMerge className="h-4 w-4 mr-1" />
                  )}
                  {enrollmentDetails?.clientId && enrollmentDetails.clientId > 0 ? 'Re-sync' : 'Sync to Clients'}
                </Button>
              </div>

              {/* Coach Notes (Quick Notes) */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Quick Notes
                </h3>
                <Textarea
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  placeholder="Add quick notes about this client's progress, preferences, or any important information..."
                  className="min-h-[100px] bg-white border-gray-300"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                  >
                    {isSavingNotes ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Notes
                  </Button>
                </div>
              </div>



            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Enrollment Cleanup Dialog */}
      <Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <GitMerge className="h-5 w-5" />
              Bulk Enrollment Cleanup
            </DialogTitle>
            <DialogDescription>
              Scan for duplicate enrollments and merge them to keep your data clean.
            </DialogDescription>
          </DialogHeader>

          {isScanning ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <span className="ml-3 text-gray-600">Scanning for duplicates...</span>
            </div>
          ) : duplicateData ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Duplicate Groups:</span>{" "}
                    <span className="font-semibold text-gray-900">{duplicateData.totalDuplicateGroups}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Extra Enrollments:</span>{" "}
                    <span className="font-semibold text-red-600">{duplicateData.totalDuplicateEnrollments}</span>
                  </div>
                </div>
              </div>

              {duplicateData.groups.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">No duplicates found!</p>
                  <p className="text-sm text-gray-500">All enrollments are unique.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {duplicateData.groups.map((group: any, gi: number) => {
                    // Find the best enrollment to keep (prefer paid, then most recent)
                    const paidIndex = group.paidStatuses.findIndex((p: boolean) => p);
                    const bestKeepIdx = paidIndex >= 0 ? paidIndex : 0;
                    const keepId = group.enrollmentIds[bestKeepIdx];
                    const deleteIds = group.enrollmentIds.filter((_: number, i: number) => i !== bestKeepIdx);

                    return (
                      <div key={gi} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-medium text-gray-900">{group.identifier}</span>
                            <Badge className="ml-2 bg-gray-100 text-gray-600 text-xs">{group.type}</Badge>
                          </div>
                          <Badge className="bg-red-100 text-red-700">{group.count} enrollments</Badge>
                        </div>
                        <div className="space-y-1 mb-3">
                          {group.enrollmentIds.map((id: number, i: number) => (
                            <div key={id} className={`flex items-center gap-2 text-xs p-1.5 rounded ${
                              i === bestKeepIdx ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                            }`}>
                              <span className="font-mono">#{id}</span>
                              <Badge className={`text-xs ${statusColors[group.statuses[i]] || 'bg-gray-100 text-gray-600'}`}>
                                {group.statuses[i]}
                              </Badge>
                              <span className="text-gray-500">{group.tiers[i]}</span>
                              {group.paidStatuses[i] && <Badge className="bg-green-100 text-green-700 text-xs">Paid</Badge>}
                              {i === bestKeepIdx && <Badge className="bg-blue-100 text-blue-700 text-xs">Keep</Badge>}
                            </div>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => mergeMutation.mutate({ keepEnrollmentId: keepId, deleteEnrollmentIds: deleteIds })}
                          disabled={mergeMutation.isPending}
                          className="bg-red-600 hover:bg-red-700 text-white gap-1 text-xs"
                        >
                          {mergeMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <GitMerge className="h-3 w-3" />
                          )}
                          Merge: Keep #{keepId}, Remove {deleteIds.length} duplicate(s)
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCleanupDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
