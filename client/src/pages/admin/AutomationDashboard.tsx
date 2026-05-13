import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { formatDateTimeMT } from "@/lib/timezone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Zap, CheckCircle, XCircle, Clock, Activity, Play, RefreshCw, AlertTriangle, UserX, Search, Mail, Target, RotateCcw, Trash2, PauseCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function AutomationDashboard() {
  const [enrollmentIdFilter, setEnrollmentIdFilter] = useState<string>("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");

  const statsQuery = trpc.automation.getStats.useQuery();
  const eventsQuery = trpc.automation.getEvents.useQuery({
    limit: 100,
    enrollmentId: enrollmentIdFilter ? parseInt(enrollmentIdFilter) : undefined,
    eventType: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
  });

  const triggerMutation = trpc.automation.triggerOnboarding.useMutation({
    onSuccess: (result) => {
      toast.success("Onboarding automation triggered successfully", {
        description: `Created: Client=${result.clientCreated ? 'Yes' : 'Existing'}, Protocol=${result.protocolCreated ? 'Yes' : 'Existing'}, Project=${result.projectCreated ? 'Yes' : 'Existing'}`,
      });
      eventsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error("Automation failed", { description: error.message });
    },
  });

  const [manualEnrollmentId, setManualEnrollmentId] = useState("");
  const [stalledResults, setStalledResults] = useState<any>(null);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);

  const stalledProjectsQuery = trpc.automation.listStalledProjects.useQuery();

  const bulkResolveMutation = trpc.automation.bulkResolveProjects.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.updated} project(s) updated to ${result.newStatus}`);
      setSelectedProjects([]);
      stalledProjectsQuery.refetch();
      eventsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error("Bulk action failed", { description: error.message });
    },
  });

  const nightlyReconcileMutation = trpc.automation.runNightlyReconciliation.useMutation({
    onSuccess: (result) => {
      toast.success(`Nightly reconciliation complete`, {
        description: `${result.projectsReconciled} projects fixed, ${result.projectsReactivated} reactivated, ${result.prospectsLinked} prospects linked, ${result.prospectsAssigned} assigned, ${result.duplicatesFound} duplicate groups found`,
      });
      stalledProjectsQuery.refetch();
    },
    onError: (err) => toast.error(`Nightly reconciliation failed: ${err.message}`),
  });

  const reconcileMutation = trpc.automation.reconcileStages.useMutation({
    onSuccess: (result) => {
      toast.success(`Reconciliation complete: ${result.advanced} project(s) advanced out of ${result.checked} checked`, {
        description: result.details.map((d: any) => `${d.clientName}: stage ${d.fromStage} → ${d.toStage} (${d.reason})`).join('\n'),
      });
      stalledProjectsQuery.refetch();
      eventsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error("Reconciliation failed", { description: error.message });
    },
  });

  const shannonPipelineMutation = trpc.automation.sendShannonPipeline.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Shannon's pipeline email sent", {
          description: `Sent to ${result.sentTo.join(', ')}`,
        });
      } else {
        toast.error("Pipeline email failed", { description: result.error });
      }
    },
    onError: (error) => {
      toast.error("Failed to send pipeline email", { description: error.message });
    },
  });

  const toggleProject = (id: number) => {
    setSelectedProjects(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };
  const toggleAllProjects = () => {
    const allIds = (stalledProjectsQuery.data || []).map((p: any) => p.id);
    setSelectedProjects(prev => prev.length === allIds.length ? [] : allIds);
  };

  const digestMutation = trpc.automation.sendWeeklyDigest.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Weekly digest sent", {
          description: `Sent to ${result.sentTo.length} recipient(s): ${result.sentTo.join(', ')}`,
        });
      } else {
        toast.error("Digest failed", { description: result.error });
      }
      eventsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error("Failed to send digest", { description: error.message });
    },
  });

  const stalledCheckMutation = trpc.automation.checkStalledClients.useMutation({
    onSuccess: (result) => {
      setStalledResults(result);
      if (result.stalledCount === 0) {
        toast.success("No stalled clients detected", {
          description: "All active projects have recent task progress.",
        });
      } else {
        toast.warning(`${result.stalledCount} stalled client(s) found`, {
          description: `${result.notificationsSent} notification(s) sent to team members.`,
        });
      }
      eventsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error("Stalled client check failed", { description: error.message });
    },
  });

  const stats = statsQuery.data;
  const events = eventsQuery.data || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "skipped":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><AlertTriangle className="h-3 w-3 mr-1" />Skipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      client_created: "Client Created",
      client_matched: "Client Matched",
      protocol_created: "Protocol Created",
      protocol_exists: "Protocol Exists",
      project_created: "Project Created",
      project_exists: "Project Exists",
      task_assigned: "Task Assigned",
      enrollment_linked: "Enrollment Linked",
      onboarding_complete: "Onboarding Complete",
      onboarding_failed: "Onboarding Failed",
    };
    return labels[type] || type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-amber-500" />
              Onboarding Automation
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor automated client onboarding from payment to project setup
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { eventsQuery.refetch(); statsQuery.refetch(); }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-3xl font-bold">{stats?.total || 0}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.success || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-3xl font-bold text-red-600">{stats?.failed || 0}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Last 24h</p>
                  <p className="text-3xl font-bold text-amber-600">{stats?.last24h || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="events">
          <TabsList className="flex-wrap">
            <TabsTrigger value="events">Event Log</TabsTrigger>
            <TabsTrigger value="manual">Manual Trigger</TabsTrigger>
            <TabsTrigger value="stalled">Stalled Clients</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Actions{stalledProjectsQuery.data && stalledProjectsQuery.data.length > 0 && <Badge variant="destructive" className="ml-2">{stalledProjectsQuery.data.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="digest">Weekly Digest</TabsTrigger>
            <TabsTrigger value="shannon">Shannon Pipeline</TabsTrigger>
            <TabsTrigger value="reconcile">Reconcile Stages</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <Input
                placeholder="Filter by Enrollment ID..."
                value={enrollmentIdFilter}
                onChange={(e) => setEnrollmentIdFilter(e.target.value)}
                className="max-w-xs"
              />
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="client_created">Client Created</SelectItem>
                  <SelectItem value="client_matched">Client Matched</SelectItem>
                  <SelectItem value="protocol_created">Protocol Created</SelectItem>
                  <SelectItem value="project_created">Project Created</SelectItem>
                  <SelectItem value="task_assigned">Task Assigned</SelectItem>
                  <SelectItem value="onboarding_complete">Onboarding Complete</SelectItem>
                  <SelectItem value="onboarding_failed">Onboarding Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Events Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Time</th>
                        <th className="text-left p-3 font-medium">Event</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Enrollment</th>
                        <th className="text-left p-3 font-medium">Client</th>
                        <th className="text-left p-3 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No automation events yet. Events will appear here when a client pays for a transformation program.
                          </td>
                        </tr>
                      ) : (
                        events.map((event: any) => (
                          <tr key={event.id} className="border-b hover:bg-muted/30">
                            <td className="p-3 whitespace-nowrap text-muted-foreground">
                              {formatDateTimeMT(event.createdAt)}
                            </td>
                            <td className="p-3">
                              <span className="font-medium">{getEventTypeLabel(event.eventType)}</span>
                            </td>
                            <td className="p-3">{getStatusBadge(event.status)}</td>
                            <td className="p-3">
                              {event.enrollmentId ? (
                                <a href={`/admin/enrollments`} className="text-blue-600 hover:underline">
                                  #{event.enrollmentId}
                                </a>
                              ) : "—"}
                            </td>
                            <td className="p-3">
                              {event.clientId ? (
                                <a href={`/admin/clients`} className="text-blue-600 hover:underline">
                                  #{event.clientId}
                                </a>
                              ) : "—"}
                            </td>
                            <td className="p-3 max-w-xs truncate text-muted-foreground">
                              {event.details || event.errorMessage || "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Manual Onboarding Trigger
                </CardTitle>
                <CardDescription>
                  Manually trigger the onboarding automation for a specific enrollment.
                  Use this for enrollments that were paid before automation was enabled,
                  or to retry a failed automation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Enrollment ID</label>
                    <Input
                      placeholder="Enter enrollment ID..."
                      value={manualEnrollmentId}
                      onChange={(e) => setManualEnrollmentId(e.target.value)}
                      className="w-64"
                      type="number"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (!manualEnrollmentId) {
                        toast.error("Please enter an enrollment ID");
                        return;
                      }
                      triggerMutation.mutate({ enrollmentId: parseInt(manualEnrollmentId) });
                    }}
                    disabled={triggerMutation.isPending || !manualEnrollmentId}
                  >
                    {triggerMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Trigger Onboarding
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-400 mb-2">What this does:</p>
                  <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
                    <li>Creates or matches a Client record (by email/phone)</li>
                    <li>Creates a draft Client Protocol from the tier-appropriate template</li>
                    <li>Creates a Client Project with the 90-Day Protocol workflow</li>
                    <li>Auto-assigns tasks to team members (Jason, Lisa, Shannon, Kari)</li>
                    <li>Creates Peptide Pro signup and Omega Community access tasks for Lisa</li>
                    <li>Creates end-of-protocol reminder tasks (wrap-up session, testimonial request)</li>
                    <li>Skips any step that's already been completed (safe to re-run)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="stalled" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-orange-500" />
                  Stalled Client Detector
                </CardTitle>
                <CardDescription>
                  Detect clients stuck in onboarding for more than 48 hours with no task progress.
                  Runs automatically daily at 8:00 AM, or trigger manually below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => stalledCheckMutation.mutate()}
                  disabled={stalledCheckMutation.isPending}
                  variant="outline"
                >
                  {stalledCheckMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Run Stalled Client Check Now
                    </>
                  )}
                </Button>

                {stalledResults && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Badge variant={stalledResults.stalledCount > 0 ? "destructive" : "default"} className="text-sm px-3 py-1">
                        {stalledResults.stalledCount} stalled client(s)
                      </Badge>
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        {stalledResults.notificationsSent} notification(s) sent
                      </Badge>
                    </div>

                    {stalledResults.clients && stalledResults.clients.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-3 font-medium">Client</th>
                              <th className="text-left p-3 font-medium">Project</th>
                              <th className="text-left p-3 font-medium">Stalled</th>
                              <th className="text-left p-3 font-medium">Progress</th>
                              <th className="text-left p-3 font-medium">Assigned To</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stalledResults.clients.map((client: any, idx: number) => (
                              <tr key={idx} className="border-b hover:bg-muted/30">
                                <td className="p-3 font-medium">{client.clientName}</td>
                                <td className="p-3">{client.projectName}</td>
                                <td className="p-3">
                                  <Badge variant="destructive">
                                    {Math.floor(client.hoursStalled / 24)}d {client.hoursStalled % 24}h
                                  </Badge>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                      <div
                                        className="bg-blue-500 h-2 rounded-full"
                                        style={{ width: `${client.totalTasks > 0 ? (client.completedTasks / client.totalTasks) * 100 : 0}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {client.completedTasks}/{client.totalTasks}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3 text-muted-foreground">
                                  {client.assignedTeamMember || "Unassigned"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-400 mb-2">How it works:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                    <li>Checks all active projects created more than 48 hours ago</li>
                    <li>Flags projects where no tasks have been completed, or last completion was 48+ hours ago</li>
                    <li>Sends notifications to assigned team members and admin</li>
                    <li>Runs automatically every day at 8:00 AM</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* BULK STALLED PROJECTS TAB */}
          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-orange-500" />
                  Stalled & On-Hold Projects — Bulk Actions
                </CardTitle>
                <CardDescription>
                  Review and take action on stalled or on-hold projects. Select projects and choose an action.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedProjects.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                    <span className="text-sm font-medium">{selectedProjects.length} selected</span>
                    <Button size="sm" variant="default" onClick={() => bulkResolveMutation.mutate({ projectIds: selectedProjects, action: 'complete' })} disabled={bulkResolveMutation.isPending}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Mark Completed
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => bulkResolveMutation.mutate({ projectIds: selectedProjects, action: 'reactivate' })} disabled={bulkResolveMutation.isPending}>
                      <RotateCcw className="h-4 w-4 mr-1" /> Re-activate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => bulkResolveMutation.mutate({ projectIds: selectedProjects, action: 'on_hold' })} disabled={bulkResolveMutation.isPending}>
                      <PauseCircle className="h-4 w-4 mr-1" /> On Hold
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => bulkResolveMutation.mutate({ projectIds: selectedProjects, action: 'cancel' })} disabled={bulkResolveMutation.isPending}>
                      <Trash2 className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                  </div>
                )}

                {stalledProjectsQuery.isLoading ? (
                  <p className="text-muted-foreground text-center py-8">Loading stalled projects...</p>
                ) : !stalledProjectsQuery.data?.length ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <p className="text-lg font-medium text-green-600">No stalled projects!</p>
                    <p className="text-sm text-muted-foreground">All projects are progressing normally.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-3 w-10">
                            <Checkbox checked={selectedProjects.length === stalledProjectsQuery.data.length && stalledProjectsQuery.data.length > 0} onCheckedChange={toggleAllProjects} />
                          </th>
                          <th className="text-left p-3 font-medium">Client</th>
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">Progress</th>
                          <th className="text-left p-3 font-medium">Stalled</th>
                          <th className="text-left p-3 font-medium">Assigned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stalledProjectsQuery.data.map((project: any) => (
                          <tr key={project.id} className={`border-b hover:bg-muted/30 ${selectedProjects.includes(project.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                            <td className="p-3">
                              <Checkbox checked={selectedProjects.includes(project.id)} onCheckedChange={() => toggleProject(project.id)} />
                            </td>
                            <td className="p-3">
                              <div className="font-medium">{project.clientName}</div>
                              {project.clientEmail && <div className="text-xs text-muted-foreground">{project.clientEmail}</div>}
                            </td>
                            <td className="p-3">
                              <Badge variant={project.status === 'on_hold' ? 'secondary' : 'outline'} className={project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' : ''}>
                                {project.status}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${project.totalTasks > 0 ? (project.completedTasks / project.totalTasks) * 100 : 0}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground">{project.completedTasks}/{project.totalTasks}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant={project.hoursSinceActivity >= 72 ? 'destructive' : 'outline'}>
                                {Math.floor(project.hoursSinceActivity / 24)}d
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground text-xs">{project.assignedTo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm" onClick={() => stalledProjectsQuery.refetch()}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${stalledProjectsQuery.isFetching ? 'animate-spin' : ''}`} />
                    Refresh List
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="digest" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  Weekly Team Digest
                </CardTitle>
                <CardDescription>
                  Sends a summary email to Jason, Shannon, Lisa, and Vee with new enrollments,
                  stalled clients, pending protocol builds, and team task stats.
                  Runs automatically every Monday at 8:00 AM.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => digestMutation.mutate()}
                  disabled={digestMutation.isPending}
                  variant="outline"
                >
                  {digestMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Weekly Digest Now
                    </>
                  )}
                </Button>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-400 mb-2">Recipients:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                    <li>Jason Kidman (Admin)</li>
                    <li>Shannon (Lead Pipeline)</li>
                    <li>Lisa (Client Care)</li>
                    <li>Vee / Vilma (Drop-ship Orders)</li>
                  </ul>
                  <p className="font-medium text-blue-800 dark:text-blue-400 mt-3 mb-2">Includes:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
                    <li>New enrollments this week</li>
                    <li>Stalled clients (48+ hours with no progress)</li>
                    <li>Pending protocol builds (Jason's queue)</li>
                    <li>Team task summary (pending, overdue, completed)</li>
                    <li>Quick stats overview</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* SHANNON PIPELINE TAB */}
          <TabsContent value="shannon" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-500" />
                  Shannon's Daily Pipeline Email
                </CardTitle>
                <CardDescription>
                  Sends Shannon a daily pipeline scorecard email at 8:00 AM with overdue callbacks,
                  hot leads, today's follow-up queue, and recent conversions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => shannonPipelineMutation.mutate()}
                  disabled={shannonPipelineMutation.isPending}
                  variant="outline"
                >
                  {shannonPipelineMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      Send Shannon's Pipeline Email Now
                    </>
                  )}
                </Button>

                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-sm">
                  <p className="font-medium text-orange-800 dark:text-orange-400 mb-2">Email includes:</p>
                  <ul className="list-disc list-inside space-y-1 text-orange-700 dark:text-orange-300">
                    <li>Quick stats: overdue, hot leads, today's follow-ups, conversion rate</li>
                    <li>Overdue callbacks table with urgency indicators and notes</li>
                    <li>Hot leads (ready for consult, engaged, waiting on client)</li>
                    <li>Today's follow-up queue with scheduled times</li>
                    <li>Recent conversions this week with tier and days-to-convert</li>
                    <li>Direct link to full Pipeline Scorecard dashboard</li>
                  </ul>
                  <p className="font-medium text-orange-800 dark:text-orange-400 mt-3 mb-1">Schedule:</p>
                  <p className="text-orange-700 dark:text-orange-300">Daily at 8:00 AM to shannon@omegalongevity.com</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reconcile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-purple-500" />
                  Full System Reconciliation
                </CardTitle>
                <CardDescription>
                  Runs automatically every night at 2 AM. Fixes lifecycle stages, links prospects to clients, assigns unassigned prospects to Shannon, reactivates on-hold projects with paid enrollments, and scans for duplicates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Button
                    onClick={() => nightlyReconcileMutation.mutate()}
                    disabled={nightlyReconcileMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {nightlyReconcileMutation.isPending ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Running Full Reconciliation...</>
                    ) : (
                      <><RefreshCw className="h-4 w-4 mr-2" /> Run Full Nightly Reconciliation Now</>
                    )}
                  </Button>
                  <Button
                    onClick={() => reconcileMutation.mutate()}
                    disabled={reconcileMutation.isPending}
                    variant="outline"
                    className="border-purple-300 text-purple-700"
                  >
                    {reconcileMutation.isPending ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                    ) : (
                      <>Stage Reconciliation Only</>
                    )}
                  </Button>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-sm">
                  <p className="font-medium text-purple-800 dark:text-purple-400 mb-2">Full Nightly Reconciliation includes:</p>
                  <ul className="list-disc list-inside space-y-1 text-purple-700 dark:text-purple-300">
                    <li>Advances lifecycle stages for projects with paid enrollments stuck at wrong stage</li>
                    <li>Assigns Lisa to unassigned active projects</li>
                    <li>Reactivates on-hold projects that have paid enrollments</li>
                    <li>Links unlinked prospects to their matching client records</li>
                    <li>Assigns unassigned prospects to Shannon</li>
                    <li>Scans for duplicate prospects and notifies admin if found</li>
                  </ul>
                  <p className="text-purple-600 dark:text-purple-400 mt-3 text-xs">Runs automatically at 2:00 AM daily. Use the button above to run it immediately.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
