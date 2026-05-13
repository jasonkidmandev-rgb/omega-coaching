import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Users, Clock, DollarSign, AlertCircle, 
  RefreshCw, Link2, Send, CheckCircle, XCircle,
  FileText, CreditCard, Mail, UserCheck, ClipboardList,
  Crown, Sparkles, Leaf, Eye, MousePointer, Download, History
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format, formatDistanceToNow } from "date-fns";

type FilterTab = "all" | "elite" | "flagship" | "essentials" | "intake_complete" | "intake_pending" | "expired_links";

export default function PendingEnrollments() {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [emailHistoryDialogOpen, setEmailHistoryDialogOpen] = useState(false);
  const [emailHistoryEnrollment, setEmailHistoryEnrollment] = useState<any>(null);

  const { data: pendingEnrollments, isLoading, refetch } = trpc.transformation.getPendingEnrollments.useQuery();
  const { data: emailTrackingStats } = trpc.emailTracking.getEnrollmentTrackingStats.useQuery();
  
  // Get enrollment IDs for batch tracking query
  const enrollmentIds = useMemo(() => 
    pendingEnrollments?.map((e: any) => e.id) || [], 
    [pendingEnrollments]
  );
  
  // Fetch email tracking status for all enrollments
  const { data: enrollmentTracking } = trpc.emailTracking.getTrackingByEnrollmentIds.useQuery(
    { enrollmentIds },
    { enabled: enrollmentIds.length > 0 }
  );
  
  const linkEnrollment = trpc.transformation.linkEnrollmentToUserByEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully linked to user: ${data.userName}`);
      setLinkDialogOpen(false);
      setLinkEmail("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resendEmail = trpc.transformation.resendVerificationEmail.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const tierNames: Record<string, string> = {
    elite: "Elite Longevity",
    flagship: "90-Day Transformation",
    essentials: "Protocol Essentials",
  };

  const tierColors: Record<string, string> = {
    elite: "bg-purple-100 text-purple-800",
    flagship: "bg-blue-100 text-blue-800",
    essentials: "bg-green-100 text-green-800",
  };

  const tierIcons: Record<string, React.ReactNode> = {
    elite: <Crown className="w-3 h-3" />,
    flagship: <Sparkles className="w-3 h-3" />,
    essentials: <Leaf className="w-3 h-3" />,
  };

  const handleLinkClick = (enrollment: any) => {
    setSelectedEnrollment(enrollment);
    setLinkEmail(enrollment.email || "");
    setLinkDialogOpen(true);
  };

  const handleLinkSubmit = () => {
    if (!selectedEnrollment || !linkEmail) return;
    linkEnrollment.mutate({
      enrollmentId: selectedEnrollment.id,
      userEmail: linkEmail,
    });
  };

  const handleResendEmail = (enrollmentId: number) => {
    resendEmail.mutate({ enrollmentId });
  };

  // Bulk selection handlers
  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEnrollments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEnrollments.map((e: any) => e.id)));
    }
  };

  const handleBulkResend = async () => {
    if (selectedIds.size === 0) {
      toast.error("No enrollments selected");
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const id of Array.from(selectedIds)) {
      try {
        await resendEmail.mutateAsync({ enrollmentId: id });
        successCount++;
      } catch {
        errorCount++;
      }
    }
    
    if (successCount > 0) {
      toast.success(`Resent emails to ${successCount} enrollment(s)`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to resend to ${errorCount} enrollment(s)`);
    }
    
    setSelectedIds(new Set());
    refetch();
  };

  const handleExportCSV = () => {
    if (selectedIds.size === 0) {
      toast.error("No enrollments selected");
      return;
    }
    
    const selectedEnrollments = filteredEnrollments.filter((e: any) => selectedIds.has(e.id));
    
    const headers = ["Name", "Email", "Program", "Payment Amount", "Payment Date", "Intake Complete", "Link Status"];
    const rows = selectedEnrollments.map((e: any) => [
      e.clientName || "Unknown",
      e.email || "",
      tierNames[e.tier] || e.tier,
      `$${parseFloat(e.coachingFeeAmount || 0).toFixed(2)}`,
      e.coachingFeePaidAt ? format(new Date(e.coachingFeePaidAt), "yyyy-MM-dd") : "N/A",
      e.intakeFormCompleted ? "Yes" : "No",
      isTokenExpired(e.authTokenExpiresAt) ? "Expired" : "Active",
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pending-enrollments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    
    toast.success(`Exported ${selectedIds.size} enrollment(s) to CSV`);
  };

  const openEmailHistory = (enrollment: any) => {
    setEmailHistoryEnrollment(enrollment);
    setEmailHistoryDialogOpen(true);
  };

  const isTokenExpired = (expiresAt: string | null) => {
    if (!expiresAt) return true;
    return new Date(expiresAt) < new Date();
  };

  // Calculate onboarding progress for each enrollment
  const getOnboardingProgress = (enrollment: any) => {
    const steps = [
      { id: "payment", label: "Payment", complete: enrollment.coachingFeePaid, icon: CreditCard },
      { id: "verification", label: "Verification Sent", complete: !!enrollment.authToken, icon: Mail },
      { id: "account", label: "Account Setup", complete: !!enrollment.userId, icon: UserCheck },
      { id: "intake", label: "Intake Form", complete: enrollment.intakeFormCompleted, icon: ClipboardList },
    ];
    
    const completedSteps = steps.filter(s => s.complete).length;
    const progress = (completedSteps / steps.length) * 100;
    
    return { steps, completedSteps, progress };
  };

  // Filter enrollments based on active tab
  const filteredEnrollments = useMemo(() => {
    if (!pendingEnrollments) return [];
    
    switch (activeTab) {
      case "elite":
        return pendingEnrollments.filter((e: any) => e.tier === "elite");
      case "flagship":
        return pendingEnrollments.filter((e: any) => e.tier === "flagship");
      case "essentials":
        return pendingEnrollments.filter((e: any) => e.tier === "essentials");
      case "intake_complete":
        return pendingEnrollments.filter((e: any) => e.intakeFormCompleted);
      case "intake_pending":
        return pendingEnrollments.filter((e: any) => !e.intakeFormCompleted);
      case "expired_links":
        return pendingEnrollments.filter((e: any) => isTokenExpired(e.authTokenExpiresAt));
      default:
        return pendingEnrollments;
    }
  }, [pendingEnrollments, activeTab]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: pendingEnrollments?.length || 0,
    elite: pendingEnrollments?.filter((e: any) => e.tier === "elite").length || 0,
    flagship: pendingEnrollments?.filter((e: any) => e.tier === "flagship").length || 0,
    essentials: pendingEnrollments?.filter((e: any) => e.tier === "essentials").length || 0,
    expiredTokens: pendingEnrollments?.filter((e: any) => isTokenExpired(e.authTokenExpiresAt)).length || 0,
    intakeComplete: pendingEnrollments?.filter((e: any) => e.intakeFormCompleted).length || 0,
    intakePending: pendingEnrollments?.filter((e: any) => !e.intakeFormCompleted).length || 0,
    totalRevenue: pendingEnrollments?.reduce((sum: number, e: any) => sum + (parseFloat(e.coachingFeeAmount) || 0), 0) || 0,
  }), [pendingEnrollments]);

  // Onboarding Checklist Component
  const OnboardingChecklist = ({ enrollment }: { enrollment: any }) => {
    const { steps, progress } = getOnboardingProgress(enrollment);
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="flex gap-1">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`flex items-center justify-center w-6 h-6 rounded-full ${
                  step.complete 
                    ? "bg-green-100 text-green-600" 
                    : "bg-gray-100 text-gray-400"
                }`}
                title={`${step.label}: ${step.complete ? "Complete" : "Pending"}`}
              >
                <Icon className="w-3 h-3" />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pending Enrollments</h1>
            <p className="text-muted-foreground">
              Paid enrollments awaiting account setup
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting account setup
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired Links</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.expiredTokens}</div>
              <p className="text-xs text-muted-foreground">
                Need new verification email
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Intake Complete</CardTitle>
              <FileText className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.intakeComplete}</div>
              <p className="text-xs text-muted-foreground">
                Forms submitted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${stats.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                From pending enrollments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Email Tracking Stats */}
        {emailTrackingStats && emailTrackingStats.totalSent > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Engagement</CardTitle>
              <CardDescription>Follow-up email tracking for pending enrollments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Sent</p>
                    <p className="text-2xl font-bold">{emailTrackingStats.totalSent}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Eye className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Opened</p>
                    <p className="text-2xl font-bold">{emailTrackingStats.totalOpened}</p>
                    <p className="text-xs text-muted-foreground">{emailTrackingStats.openRate.toFixed(1)}% rate</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MousePointer className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Clicked</p>
                    <p className="text-2xl font-bold">{emailTrackingStats.totalClicked}</p>
                    <p className="text-xs text-muted-foreground">{emailTrackingStats.clickRate.toFixed(1)}% rate</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No Engagement</p>
                    <p className="text-2xl font-bold">{emailTrackingStats.totalSent - emailTrackingStats.totalOpened}</p>
                    <p className="text-xs text-muted-foreground">May need phone follow-up</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Banner */}
        {stats.expiredTokens > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-start sm:items-center gap-3 sm:gap-4 py-4">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-medium text-amber-800">
                  {stats.expiredTokens} enrollment{stats.expiredTokens > 1 ? 's have' : ' has'} expired verification links
                </p>
                <p className="text-sm text-amber-700">
                  Use the "Resend Email" button to send new verification links to these clients.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enrollments Table with Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Enrollments</CardTitle>
            <CardDescription>
              These clients have paid but haven't completed account setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)} className="space-y-4">
              <TabsList className="flex h-auto gap-1 overflow-x-auto w-full justify-start pb-1">
                <TabsTrigger value="all" className="flex items-center gap-1 shrink-0 text-xs sm:text-sm">
                  All
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{stats.total}</Badge>
                </TabsTrigger>
                <TabsTrigger value="elite" className="flex items-center gap-1 shrink-0 text-xs sm:text-sm">
                  <Crown className="w-3 h-3 text-purple-600" />
                  Elite
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{stats.elite}</Badge>
                </TabsTrigger>
                <TabsTrigger value="flagship" className="flex items-center gap-1 shrink-0 text-xs sm:text-sm">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  Flagship
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{stats.flagship}</Badge>
                </TabsTrigger>
                <TabsTrigger value="essentials" className="flex items-center gap-1 shrink-0 text-xs sm:text-sm">
                  <Leaf className="w-3 h-3 text-green-600" />
                  Essentials
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{stats.essentials}</Badge>
                </TabsTrigger>
                <TabsTrigger value="intake_complete" className="flex items-center gap-1 shrink-0 text-xs sm:text-sm">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span className="hidden sm:inline">Intake</span> Done
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{stats.intakeComplete}</Badge>
                </TabsTrigger>
                <TabsTrigger value="intake_pending" className="flex items-center gap-1 shrink-0 text-xs sm:text-sm">
                  <ClipboardList className="w-3 h-3 text-orange-600" />
                  <span className="hidden sm:inline">Intake</span> Pending
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{stats.intakePending}</Badge>
                </TabsTrigger>
                <TabsTrigger value="expired_links" className="flex items-center gap-1 shrink-0 text-xs sm:text-sm">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Expired
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{stats.expiredTokens}</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredEnrollments.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium">
                      {activeTab === "all" ? "All caught up!" : "No enrollments in this category"}
                    </p>
                    <p className="text-muted-foreground">
                      {activeTab === "all" 
                        ? "No pending enrollments awaiting account setup."
                        : "Try selecting a different filter tab."}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Bulk Action Bar */}
                    {selectedIds.size > 0 && (
                      <div className="flex items-center gap-4 mb-4 p-3 bg-muted rounded-lg">
                        <span className="text-sm font-medium">
                          {selectedIds.size} enrollment(s) selected
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBulkResend}
                            disabled={resendEmail.isPending}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Resend Emails
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportCSV}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Export CSV
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedIds(new Set())}
                        >
                          Clear Selection
                        </Button>
                      </div>
                    )}
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <Table className="min-w-[900px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <Checkbox
                              checked={selectedIds.size === filteredEnrollments.length && filteredEnrollments.length > 0}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Program</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Email Status</TableHead>
                          <TableHead>Onboarding Progress</TableHead>
                          <TableHead>Link Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {filteredEnrollments.map((enrollment: any) => {
                        const tokenExpired = isTokenExpired(enrollment.authTokenExpiresAt);
                        
                        return (
                          <TableRow key={enrollment.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(enrollment.id)}
                                onCheckedChange={() => toggleSelection(enrollment.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{enrollment.clientName || "Unknown"}</p>
                                <p className="text-sm text-muted-foreground">{enrollment.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {enrollment.phone ? (
                                <a 
                                  href={`tel:${enrollment.phone}`}
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  {enrollment.phone}
                                </a>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${tierColors[enrollment.tier] || "bg-gray-100"} flex items-center gap-1 w-fit`}>
                                {tierIcons[enrollment.tier]}
                                {tierNames[enrollment.tier] || enrollment.tier}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-green-600">
                                  ${parseFloat(enrollment.coachingFeeAmount || 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {enrollment.coachingFeePaidAt 
                                    ? format(new Date(enrollment.coachingFeePaidAt), "MMM d, yyyy")
                                    : "N/A"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <button
                                onClick={() => openEmailHistory(enrollment)}
                                className="text-left hover:bg-muted/50 rounded p-1 -m-1 transition-colors cursor-pointer"
                                title="Click to view email history"
                              >
                              {(() => {
                                const tracking = enrollmentTracking?.[enrollment.id];
                                if (!tracking || !tracking.hasSent) {
                                  return (
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Mail className="w-4 h-4" />
                                      <span className="text-xs">No email</span>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      {/* Sent indicator */}
                                      <div 
                                        className="flex items-center gap-0.5" 
                                        title={tracking.sentAt ? `Sent: ${format(new Date(tracking.sentAt), "MMM d, h:mm a")}` : "Email sent"}
                                      >
                                        <Mail className="w-3.5 h-3.5 text-blue-500" />
                                      </div>
                                      {/* Opened indicator */}
                                      <div 
                                        className={`flex items-center gap-0.5 ${tracking.hasOpened ? "text-green-600" : "text-gray-300"}`}
                                        title={tracking.hasOpened && tracking.openedAt 
                                          ? `Opened: ${format(new Date(tracking.openedAt), "MMM d, h:mm a")} (${tracking.openCount}x)` 
                                          : "Not opened"}
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        {tracking.hasOpened && tracking.openCount > 1 && (
                                          <span className="text-xs">{tracking.openCount}</span>
                                        )}
                                      </div>
                                      {/* Clicked indicator */}
                                      <div 
                                        className={`flex items-center gap-0.5 ${tracking.hasClicked ? "text-purple-600" : "text-gray-300"}`}
                                        title={tracking.hasClicked && tracking.clickedAt 
                                          ? `Clicked: ${format(new Date(tracking.clickedAt), "MMM d, h:mm a")} (${tracking.clickCount}x)` 
                                          : "Not clicked"}
                                      >
                                        <MousePointer className="w-3.5 h-3.5" />
                                        {tracking.hasClicked && tracking.clickCount > 1 && (
                                          <span className="text-xs">{tracking.clickCount}</span>
                                        )}
                                      </div>
                                      <History className="w-3 h-3 text-muted-foreground" />
                                    </div>
                                    {!tracking.hasOpened && (
                                      <span className="text-xs text-amber-600">No engagement</span>
                                    )}
                                  </div>
                                );
                              })()}
                              </button>
                            </TableCell>
                            <TableCell className="min-w-[180px]">
                              <OnboardingChecklist enrollment={enrollment} />
                            </TableCell>
                            <TableCell>
                              {tokenExpired ? (
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Expired
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-green-600 border-green-300">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                              {enrollment.authTokenExpiresAt && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {tokenExpired 
                                    ? `Expired ${formatDistanceToNow(new Date(enrollment.authTokenExpiresAt))} ago`
                                    : `Expires in ${formatDistanceToNow(new Date(enrollment.authTokenExpiresAt))}`}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleResendEmail(enrollment.id)}
                                  disabled={resendEmail.isPending}
                                >
                                  <Send className="w-4 h-4 mr-1" />
                                  Resend
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleLinkClick(enrollment)}
                                >
                                  <Link2 className="w-4 h-4 mr-1" />
                                  Link
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      </TableBody>
                    </Table>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Onboarding Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Onboarding Progress Legend</CardTitle>
            <CardDescription>
              Track each client's journey through the enrollment process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Payment</p>
                  <p className="text-xs text-muted-foreground">Coaching fee received</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Verification</p>
                  <p className="text-xs text-muted-foreground">Email link sent</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Account Setup</p>
                  <p className="text-xs text-muted-foreground">User account linked</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Intake Form</p>
                  <p className="text-xs text-muted-foreground">Health questionnaire done</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Link Dialog */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Enrollment to User Account</DialogTitle>
              <DialogDescription>
                Enter the email address of an existing user account to link this enrollment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedEnrollment && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Client:</span>{" "}
                    <strong>{selectedEnrollment.clientName}</strong>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Program:</span>{" "}
                    <strong>{tierNames[selectedEnrollment.tier]}</strong>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Payment:</span>{" "}
                    <strong className="text-green-600">
                      ${parseFloat(selectedEnrollment.coachingFeeAmount || 0).toLocaleString()}
                    </strong>
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="linkEmail">User Email Address</Label>
                <Input
                  id="linkEmail"
                  type="email"
                  placeholder="user@example.com"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The user must already have an account. They can create one by signing in with Google, Microsoft, or Apple.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleLinkSubmit} 
                disabled={!linkEmail || linkEnrollment.isPending}
              >
                {linkEnrollment.isPending ? "Linking..." : "Link Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email History Dialog */}
        <Dialog open={emailHistoryDialogOpen} onOpenChange={setEmailHistoryDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Email History
              </DialogTitle>
              <DialogDescription>
                {emailHistoryEnrollment && (
                  <span>
                    Communication timeline for <strong>{emailHistoryEnrollment.clientName}</strong> ({emailHistoryEnrollment.email})
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <EmailHistoryTimeline enrollment={emailHistoryEnrollment} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailHistoryDialogOpen(false)}>
                Close
              </Button>
              {emailHistoryEnrollment && (
                <Button 
                  onClick={() => {
                    handleResendEmail(emailHistoryEnrollment.id);
                    setEmailHistoryDialogOpen(false);
                  }}
                  disabled={resendEmail.isPending}
                >
                  <Send className="w-4 h-4 mr-1" />
                  Send New Email
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}


// Email History Timeline Component
function EmailHistoryTimeline({ enrollment }: { enrollment: any }) {
  const { data: emailHistory, isLoading } = trpc.emailTracking.getEnrollmentTracking.useQuery(
    { enrollmentId: enrollment?.id },
    { enabled: !!enrollment?.id }
  );

  if (!enrollment) {
    return <div className="text-center py-4 text-muted-foreground">No enrollment selected</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!emailHistory || emailHistory.length === 0) {
    return (
      <div className="text-center py-8">
        <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium">No emails sent yet</p>
        <p className="text-muted-foreground">
          Click "Send New Email" to send a verification email to this client.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto">
      {emailHistory.map((email: any, index: number) => (
        <div key={email.id || index} className="relative pl-8 pb-4 border-l-2 border-muted last:border-l-0 last:pb-0">
          {/* Timeline dot */}
          <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
          
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            {/* Email header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{email.emailType || "Verification Email"}</p>
                {email.subject && (
                  <p className="text-xs text-muted-foreground">Subject: {email.subject}</p>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                {email.sentAt ? format(new Date(email.sentAt), "MMM d, yyyy h:mm a") : "Unknown"}
              </Badge>
            </div>
            
            {/* Engagement timeline */}
            <div className="flex flex-wrap gap-4 text-sm">
              {/* Sent */}
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-xs">Sent</p>
                  <p className="text-xs text-muted-foreground">
                    {email.sentAt ? format(new Date(email.sentAt), "h:mm a") : "-"}
                  </p>
                </div>
              </div>
              
              {/* Opened */}
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${email.openedAt ? "bg-green-100" : "bg-gray-100"}`}>
                  <Eye className={`w-3.5 h-3.5 ${email.openedAt ? "text-green-600" : "text-gray-400"}`} />
                </div>
                <div>
                  <p className="font-medium text-xs">Opened</p>
                  <p className="text-xs text-muted-foreground">
                    {email.openedAt ? (
                      <>
                        {format(new Date(email.openedAt), "h:mm a")}
                        {email.openCount > 1 && <span className="ml-1">({email.openCount}x)</span>}
                      </>
                    ) : "-"}
                  </p>
                </div>
              </div>
              
              {/* Clicked */}
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${email.clickedAt ? "bg-purple-100" : "bg-gray-100"}`}>
                  <MousePointer className={`w-3.5 h-3.5 ${email.clickedAt ? "text-purple-600" : "text-gray-400"}`} />
                </div>
                <div>
                  <p className="font-medium text-xs">Clicked</p>
                  <p className="text-xs text-muted-foreground">
                    {email.clickedAt ? (
                      <>
                        {format(new Date(email.clickedAt), "h:mm a")}
                        {email.clickCount > 1 && <span className="ml-1">({email.clickCount}x)</span>}
                      </>
                    ) : "-"}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Engagement status */}
            {!email.openedAt && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded px-2 py-1 text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                No engagement detected - consider phone follow-up
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
