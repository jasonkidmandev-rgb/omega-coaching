import { useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
  ClipboardCheck, Settings, FileText, Plus, Edit, Trash2,
  Eye, CheckCircle, AlertTriangle, Clock, MessageSquare, Video, Mic, Users, BarChart3,
  GripVertical, ArrowUp, ArrowDown, Save, RefreshCw, Activity, Play, XCircle, Zap, Timer, Search
} from "lucide-react";
import BulkScheduleUpdate from "@/components/BulkScheduleUpdate";
import CheckinAnalytics from "@/components/CheckinAnalytics";
import { format, formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { toast } from "sonner";

interface Question {
  id: string;
  text: string;
  type: 'scale' | 'text' | 'checkbox' | 'select';
  options?: string[];
  required: boolean;
  order: number;
}

export default function CheckinManagement() {

  const [activeTab, setActiveTab] = useState("templates");
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [editingQuestions, setEditingQuestions] = useState<Question[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lowScoreThreshold, setLowScoreThreshold] = useState(5);
  const [reminderHours, setReminderHours] = useState(48);
  const [newTemplateName, setNewTemplateName] = useState("");

  // "All Check-ins" tab — search / filter / pagination state
  const [checkinSearch, setCheckinSearch] = useState("");
  const [checkinStatusFilter, setCheckinStatusFilter] = useState<string>("all");
  const [checkinVisibleCount, setCheckinVisibleCount] = useState(25);

  // Fetch templates
  const { data: templates, isLoading: loadingTemplates, refetch: refetchTemplates } = 
    trpc.checkin.templates.list.useQuery();
  
  // Fetch all check-ins
  const { data: allCheckins, isLoading: loadingCheckins, refetch: refetchCheckins } =
    trpc.checkin.list.useQuery({ limit: 500 });
  
  // Fetch enabled schedules
  const { data: enabledSchedules, isLoading: loadingSchedules } = 
    trpc.checkin.schedules.getAllEnabled.useQuery();
  
  // Fetch check-in settings
  const { data: checkinSettings, refetch: refetchSettings } = 
    trpc.checkin.settings.get.useQuery();
  
  // Fetch cron health data
  const { data: cronHealth, isLoading: loadingCronHealth, refetch: refetchCronHealth } = 
    trpc.checkin.cronHealth.useQuery(undefined, {
      refetchInterval: 60000, // Auto-refresh every 60 seconds
    });

  // Derived data for the "All Check-ins" tab: at-a-glance counts + filtered/paged list.
  // Filtering is done in-memory (small dataset) for instant, responsive UX.
  const checkinCounts = useMemo(() => {
    const list = allCheckins || [];
    return {
      total: list.length,
      needsReview: list.filter(c => c.status === 'submitted').length,
      lowScore: list.filter(c => c.hasLowScore).length,
      awaiting: list.filter(c => c.status === 'pending' || c.status === 'incomplete').length,
      reviewed: list.filter(c => c.status === 'reviewed').length,
    };
  }, [allCheckins]);

  const filteredCheckins = useMemo(() => {
    let list = allCheckins || [];
    if (checkinStatusFilter === 'submitted') list = list.filter(c => c.status === 'submitted');
    else if (checkinStatusFilter === 'low') list = list.filter(c => c.hasLowScore);
    else if (checkinStatusFilter === 'awaiting') list = list.filter(c => c.status === 'pending' || c.status === 'incomplete');
    else if (checkinStatusFilter === 'reviewed') list = list.filter(c => c.status === 'reviewed');
    const q = checkinSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        (((c as any).clientName as string) || '').toLowerCase().includes(q) ||
        `client #${c.clientProtocolId}`.includes(q)
      );
    }
    return list;
  }, [allCheckins, checkinStatusFilter, checkinSearch]);

  const visibleCheckins = filteredCheckins.slice(0, checkinVisibleCount);

  // Global kill switch
  const { data: globalStatus, refetch: refetchGlobalStatus } = trpc.checkin.global.getStatus.useQuery();
  const setGlobalStatusMutation = trpc.checkin.global.setStatus.useMutation({
    onSuccess: (data) => {
      toast.success(data.enabled ? "Check-ins enabled platform-wide" : "All check-ins disabled platform-wide");
      refetchGlobalStatus();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Manual trigger mutation
  const manualTriggerMutation = trpc.checkin.manualTrigger.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
      refetchCronHealth();
      refetchCheckins();
    },
    onError: (error) => {
      toast.error(`Manual trigger failed: ${error.message}`);
    }
  });
  
  // Mutations
  const createTemplateMutation = trpc.checkin.templates.create.useMutation({
    onSuccess: (data) => {
      toast.success("Template created successfully");
      refetchTemplates();
      setNewTemplateName("");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const updateTemplateMutation = trpc.checkin.templates.update.useMutation({
    onSuccess: () => {
      toast.success("Check-in template has been saved");
      refetchTemplates();
      setEditTemplateOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  const updateSettingsMutation = trpc.checkin.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Check-in settings have been saved");
      refetchSettings();
      setSettingsOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
  
  const resendMutation = trpc.checkin.resendCheckin.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Check-in resent!");
      refetchCheckins();
    },
    onError: (error) => {
      toast.error(`Failed to resend: ${error.message}`);
    }
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600">Pending</Badge>;
      case 'submitted':
        return <Badge variant="secondary" className="bg-orange-500/20 text-orange-600">Awaiting Review</Badge>;
      case 'reviewed':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-600">Reviewed</Badge>;
      case 'incomplete':
        return <Badge variant="destructive">Incomplete</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getScoreBadge = (score: number | null) => {
    if (score === null) return <Badge variant="outline">N/A</Badge>;
    const threshold = checkinSettings?.lowScoreThreshold || 5;
    if (score <= threshold) return <Badge variant="destructive">{score}/10</Badge>;
    if (score <= 7) return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">{score}/10</Badge>;
    return <Badge variant="secondary" className="bg-green-500/20 text-green-600">{score}/10</Badge>;
  };

  const handleEditTemplate = (template: any) => {
    setSelectedTemplate(template);
    setEditingQuestions([...(template.questions as Question[])].sort((a, b) => a.order - b.order));
    setEditTemplateOpen(true);
  };
  
  const handleOpenSettings = () => {
    setLowScoreThreshold(checkinSettings?.lowScoreThreshold || 5);
    setReminderHours(checkinSettings?.reminderEscalationHours || 48);
    setSettingsOpen(true);
  };
  
  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      lowScoreThreshold,
      reminderEscalationHours: reminderHours,
    });
  };
  
  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...editingQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setEditingQuestions(updated);
  };
  
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === editingQuestions.length - 1)) {
      return;
    }
    const updated = [...editingQuestions];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    // Update order values
    updated.forEach((q, i) => {
      q.order = i;
    });
    setEditingQuestions(updated);
  };
  
  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      text: 'New Question',
      type: 'scale',
      required: true,
      order: editingQuestions.length,
    };
    setEditingQuestions([...editingQuestions, newQuestion]);
  };
  
  const removeQuestion = (index: number) => {
    const updated = editingQuestions.filter((_, i) => i !== index);
    updated.forEach((q, i) => {
      q.order = i;
    });
    setEditingQuestions(updated);
  };
  
  const handleSaveTemplate = () => {
    if (selectedTemplate) {
      updateTemplateMutation.mutate({
        id: selectedTemplate.id,
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        isDefault: !!selectedTemplate.isDefault,
        questions: editingQuestions,
      });
    }
  };

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Check-in Management</h1>
          <p className="text-muted-foreground">
            Manage check-in templates, schedules, and review client submissions
          </p>
        </div>
        <Button onClick={handleOpenSettings} variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Global kill switch */}
      <Card className={globalStatus && !globalStatus.enabled ? "border-red-300 bg-red-50" : "border-green-200 bg-green-50/40"}>
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
          <div className="flex items-start gap-3">
            {globalStatus && !globalStatus.enabled
              ? <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              : <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />}
            <div>
              <p className="font-semibold">
                {globalStatus && !globalStatus.enabled
                  ? "Check-ins are OFF platform-wide"
                  : "Check-ins are ON platform-wide"}
              </p>
              <p className="text-sm text-muted-foreground">
                Master switch for all check-in sending (scheduled emails, reminders, low-score alerts,
                and the manual trigger). When off, no client receives a check-in regardless of their
                individual schedule, and changing a client's engagement level will not re-enable them.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium">{globalStatus?.enabled ? "Enabled" : "Disabled"}</span>
            <Switch
              checked={!!globalStatus?.enabled}
              disabled={setGlobalStatusMutation.isPending || !globalStatus}
              onCheckedChange={(checked) => setGlobalStatusMutation.mutate({ enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">All Check-ins</TabsTrigger>
          <TabsTrigger value="schedules">Active Schedules</TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-1" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="bulk-update">
            <Users className="h-4 w-4 mr-1" />
            Bulk Update
          </TabsTrigger>
          <TabsTrigger value="cron-health">
            <Activity className="h-4 w-4 mr-1" />
            Cron Health
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Check-in Templates
                  </CardTitle>
                  <CardDescription>
                    Manage the questions asked in weekly check-ins. Click Edit to customize questions.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="New template name..."
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="w-48 h-9"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTemplateName.trim()) {
                        createTemplateMutation.mutate({
                          name: newTemplateName.trim(),
                          isDefault: templates?.length === 0,
                          questions: [],
                        });
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    disabled={!newTemplateName.trim() || createTemplateMutation.isPending}
                    onClick={() => {
                      createTemplateMutation.mutate({
                        name: newTemplateName.trim(),
                        isDefault: !templates || templates.length === 0,
                        questions: [],
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTemplates ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : templates && templates.length > 0 ? (
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div 
                      key={template.id} 
                      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{template.name}</h3>
                            {template.isDefault && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description || "No description"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {(template.questions as any[])?.length || 0} questions
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit Questions
                          </Button>
                        </div>
                      </div>
                      
                      {/* Preview questions */}
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Questions Preview:</p>
                        {(template.questions as any[])?.slice(0, 3).map((q: any, idx: number) => (
                          <div key={q.id} className="text-sm pl-4 border-l-2 border-muted">
                            {idx + 1}. {q.text}
                            <span className="text-xs text-muted-foreground ml-2">({q.type})</span>
                          </div>
                        ))}
                        {(template.questions as any[])?.length > 3 && (
                          <p className="text-xs text-muted-foreground pl-4">
                            +{(template.questions as any[]).length - 3} more questions
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No templates found</p>
                  <p className="text-sm">Create a check-in template to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                All Check-ins
              </CardTitle>
              <CardDescription>
                View and manage all client check-in submissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* At-a-glance filter chips — also serve as status counts */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All', count: checkinCounts.total, active: 'bg-primary text-primary-foreground border-transparent' },
                  { key: 'submitted', label: 'Needs review', count: checkinCounts.needsReview, active: 'bg-orange-500 text-white border-transparent' },
                  { key: 'low', label: 'Low score', count: checkinCounts.lowScore, active: 'bg-red-500 text-white border-transparent' },
                  { key: 'awaiting', label: 'Awaiting client', count: checkinCounts.awaiting, active: 'bg-blue-500 text-white border-transparent' },
                  { key: 'reviewed', label: 'Reviewed', count: checkinCounts.reviewed, active: 'bg-green-600 text-white border-transparent' },
                ].map(chip => {
                  const isActive = checkinStatusFilter === chip.key;
                  return (
                    <button
                      key={chip.key}
                      onClick={() => { setCheckinStatusFilter(chip.key); setCheckinVisibleCount(25); }}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                        isActive ? chip.active : 'bg-card border-border hover:bg-accent'
                      }`}
                    >
                      {chip.label}
                      <span className={`rounded-full px-1.5 text-xs ${isActive ? 'bg-white/20' : 'bg-muted text-muted-foreground'}`}>
                        {chip.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search + result count + refresh */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by client name..."
                    value={checkinSearch}
                    onChange={(e) => { setCheckinSearch(e.target.value); setCheckinVisibleCount(25); }}
                    className="pl-9"
                  />
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  Showing {visibleCheckins.length} of {filteredCheckins.length}
                </span>
                <Button variant="outline" size="icon" onClick={() => refetchCheckins()} title="Refresh">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="h-[600px]">
                {loadingCheckins ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : filteredCheckins.length > 0 ? (
                  <div className="space-y-3">
                    {visibleCheckins.map((checkin) => (
                      <div 
                        key={checkin.id} 
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                            checkin.status === 'reviewed' ? 'bg-green-500/10' :
                            checkin.status === 'submitted' ? 'bg-orange-500/10' :
                            checkin.status === 'incomplete' ? 'bg-red-500/10' :
                            'bg-blue-500/10'
                          }`}>
                            {checkin.status === 'reviewed' ? (
                              <CheckCircle className="h-6 w-6 text-green-500" />
                            ) : checkin.status === 'submitted' ? (
                              <Clock className="h-6 w-6 text-orange-500" />
                            ) : checkin.status === 'incomplete' ? (
                              <AlertTriangle className="h-6 w-6 text-red-500" />
                            ) : (
                              <ClipboardCheck className="h-6 w-6 text-blue-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{(checkin as any).clientName || `Client #${checkin.clientProtocolId}`}</p>
                            <p className="text-sm text-muted-foreground">
                              {checkin.sentAt ? format(new Date(checkin.sentAt), 'MMM d, yyyy') : 'N/A'}
                              {checkin.submittedAt && (
                                <> • Submitted {formatDistanceToNow(new Date(checkin.submittedAt), { addSuffix: true })}</>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(checkin.status)}
                          {checkin.overallScore !== null && getScoreBadge(checkin.overallScore)}
                          {checkin.hasLowScore && (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          )}
                          {(checkin.status === 'pending' || checkin.status === 'incomplete') && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-orange-600 hover:text-orange-700"
                              disabled={resendMutation.isPending}
                              onClick={() => {
                                if (confirm(`Resend check-in reminder to ${(checkin as any).clientName || `Client #${checkin.clientProtocolId}`}?`)) {
                                  resendMutation.mutate({ checkinId: checkin.id });
                                }
                              }}
                            >
                              <RefreshCw className={`h-4 w-4 mr-1 ${resendMutation.isPending ? 'animate-spin' : ''}`} />
                              Resend
                            </Button>
                          )}
                          <Link href={`/admin/clients/${checkin.clientProtocolId}/checkins/${checkin.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                    {filteredCheckins.length > visibleCheckins.length && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setCheckinVisibleCount(c => c + 25)}
                      >
                        Load more ({filteredCheckins.length - visibleCheckins.length} more)
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{(allCheckins?.length ?? 0) > 0 ? 'No check-ins match your filters' : 'No check-ins yet'}</p>
                    <p className="text-sm">
                      {(allCheckins?.length ?? 0) > 0
                        ? 'Try clearing the search or choosing a different filter'
                        : 'Check-ins will appear here once clients submit them'}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Active Schedules
              </CardTitle>
              <CardDescription>
                Clients with weekly check-ins enabled
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSchedules ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : enabledSchedules && enabledSchedules.length > 0 ? (
                <div className="space-y-3">
                  {enabledSchedules.map((schedule) => (
                    <div 
                      key={schedule.id} 
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div>
                        <p className="font-medium">{(schedule as any).clientName || `Client #${schedule.clientProtocolId}`}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.frequency} • {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][schedule.dayOfWeek]} at {schedule.timeOfDay}
                        </p>
                        {schedule.nextScheduledAt && (
                          <p className="text-xs text-muted-foreground">
                            Next: {format(new Date(schedule.nextScheduledAt), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                          Active
                        </Badge>
                        <Link href={`/admin/clients/${schedule.clientProtocolId}`}>
                          <Button size="sm" variant="outline">
                            View Client
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active schedules</p>
                  <p className="text-sm">Enable check-ins from individual client pages</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <CheckinAnalytics />
        </TabsContent>

        {/* Bulk Update Tab */}
        <TabsContent value="bulk-update">
          <BulkScheduleUpdate />
        </TabsContent>

        {/* Cron Health Tab */}
        <TabsContent value="cron-health" className="space-y-4">
          {/* Manual Trigger Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-500" />
                    Send Check-ins Now
                  </CardTitle>
                  <CardDescription>
                    Manually trigger all overdue check-in sends, reminders, and low-score alerts
                  </CardDescription>
                </div>
                <Button
                  onClick={() => manualTriggerMutation.mutate()}
                  disabled={manualTriggerMutation.isPending}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {manualTriggerMutation.isPending ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                  ) : (
                    <><Play className="h-4 w-4 mr-2" /> Send Check-ins Now</>
                  )}
                </Button>
              </div>
            </CardHeader>
            {manualTriggerMutation.data && (
              <CardContent>
                <div className={`p-3 rounded-lg border ${
                  manualTriggerMutation.data.success 
                    ? 'bg-green-500/10 border-green-500/30 text-green-600' 
                    : 'bg-red-500/10 border-red-500/30 text-red-600'
                }`}>
                  <p className="text-sm font-medium">{manualTriggerMutation.data.message}</p>
                  {manualTriggerMutation.data.success && (
                    <div className="flex gap-4 mt-2 text-xs">
                      <span>Schedules: {manualTriggerMutation.data.schedulesProcessed}</span>
                      <span>Reminders: {manualTriggerMutation.data.remindersProcessed}</span>
                      <span>Alerts: {manualTriggerMutation.data.alertsProcessed}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Job Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loadingCronHealth ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)
            ) : cronHealth?.jobs?.map((job) => {
              const jobLabels: Record<string, string> = {
                'checkin_send': 'Check-in Sender',
                'checkin_reminders': 'Reminder Sender',
                'checkin_low_scores': 'Low Score Alerts',
              };
              const jobIntervals: Record<string, string> = {
                'checkin_send': 'Every 5 min',
                'checkin_reminders': 'Every 30 min',
                'checkin_low_scores': 'Every 15 min',
              };
              const isHealthy = job.lastStatus === 'success' && job.recentFailures === 0;
              const isWarning = job.lastStatus === 'partial' || (job.recentFailures > 0 && job.recentFailures < 3);
              const isError = job.lastStatus === 'error' || job.recentFailures >= 3;
              
              return (
                <Card key={job.jobName} className={`border-l-4 ${
                  isError ? 'border-l-red-500' : isWarning ? 'border-l-yellow-500' : 'border-l-green-500'
                }`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {jobLabels[job.jobName] || job.jobName}
                      </CardTitle>
                      {isError ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : isWarning ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{jobIntervals[job.jobName]}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last Run</span>
                      <span className="font-medium">
                        {job.lastRun 
                          ? formatDistanceToNow(new Date(job.lastRun), { addSuffix: true })
                          : 'Never'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={job.lastStatus === 'success' ? 'secondary' : job.lastStatus === 'error' ? 'destructive' : 'outline'}
                        className={job.lastStatus === 'success' ? 'bg-green-500/20 text-green-600' : ''}
                      >
                        {job.lastStatus || 'N/A'}
                      </Badge>
                    </div>
                    {job.lastItemsProcessed !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Processed</span>
                        <span>{job.lastItemsSucceeded}/{job.lastItemsProcessed} items</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Triggered By</span>
                      <Badge variant="outline" className="text-xs">
                        {job.lastTriggeredBy || 'N/A'}
                      </Badge>
                    </div>
                    {job.lastDurationMs !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {job.lastDurationMs < 1000 ? `${job.lastDurationMs}ms` : `${(job.lastDurationMs / 1000).toFixed(1)}s`}
                        </span>
                      </div>
                    )}
                    {job.recentFailures > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Failures (24h)</span>
                        <Badge variant="destructive">{job.recentFailures}</Badge>
                      </div>
                    )}
                    {job.lastErrorMessage && (
                      <p className="text-xs text-red-500 mt-1 truncate" title={job.lastErrorMessage}>
                        {job.lastErrorMessage}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Summary Stats */}
          {cronHealth && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5" />
                  Schedule Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{cronHealth.activeScheduleCount}</p>
                    <p className="text-xs text-muted-foreground">Active Schedules</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">
                      {cronHealth.nextScheduledCheckin 
                        ? format(new Date(cronHealth.nextScheduledCheckin), 'MMM d')
                        : 'None'
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">Next Check-in</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">
                      {cronHealth.nextScheduledCheckin 
                        ? format(new Date(cronHealth.nextScheduledCheckin), 'h:mm a')
                        : '--'
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">Next Send Time</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">
                      {cronHealth.recentRuns?.filter(r => r.status === 'error').length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Recent Errors</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Run History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-5 w-5" />
                    Recent Run History
                  </CardTitle>
                  <CardDescription>Last 20 cron runs across all jobs</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchCronHealth()}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCronHealth ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : cronHealth?.recentRuns && cronHealth.recentRuns.length > 0 ? (
                <div className="space-y-2">
                  {cronHealth.recentRuns.map((run: any) => {
                    const jobLabels: Record<string, string> = {
                      'checkin_send': 'Sender',
                      'checkin_reminders': 'Reminders',
                      'checkin_low_scores': 'Alerts',
                    };
                    return (
                      <div key={run.id} className="flex items-center justify-between p-2 rounded border text-sm">
                        <div className="flex items-center gap-3">
                          {run.status === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : run.status === 'error' ? (
                            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                          )}
                          <span className="font-medium">{jobLabels[run.jobName] || run.jobName}</span>
                          <Badge variant="outline" className="text-xs">{run.triggeredBy}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span className="text-xs">
                            {run.itemsSucceeded}/{run.itemsProcessed} items
                          </span>
                          {run.durationMs !== null && (
                            <span className="text-xs">
                              {run.durationMs < 1000 ? `${run.durationMs}ms` : `${(run.durationMs / 1000).toFixed(1)}s`}
                            </span>
                          )}
                          <span className="text-xs">
                            {run.startedAt ? formatDistanceToNow(new Date(run.startedAt), { addSuffix: true }) : 'Unknown'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No cron runs recorded yet</p>
                  <p className="text-sm">Run history will appear after the first cron cycle or manual trigger</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Template Dialog with Question Editing */}
      <Dialog open={editTemplateOpen} onOpenChange={setEditTemplateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Check-in Template</DialogTitle>
            <DialogDescription>
              Customize the template settings and questions. Drag questions to reorder them.
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-6">
              {/* Template Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input 
                    value={selectedTemplate.name} 
                    onChange={(e) => setSelectedTemplate({...selectedTemplate, name: e.target.value})}
                  />
                </div>
                <div className="flex items-center justify-between pt-6">
                  <Label>Set as Default Template</Label>
                  <Switch 
                    checked={selectedTemplate.isDefault}
                    onCheckedChange={(checked) => setSelectedTemplate({...selectedTemplate, isDefault: checked})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={selectedTemplate.description || ''} 
                  onChange={(e) => setSelectedTemplate({...selectedTemplate, description: e.target.value})}
                />
              </div>
              
              {/* Questions Editor */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Questions</Label>
                  <Button size="sm" onClick={addQuestion}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Question
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {editingQuestions.map((question, index) => (
                    <div key={question.id} className="p-4 rounded-lg border bg-muted/30 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6"
                            onClick={() => moveQuestion(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6"
                            onClick={() => moveQuestion(index, 'down')}
                            disabled={index === editingQuestions.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-sm font-medium text-muted-foreground w-6">
                          {index + 1}.
                        </span>
                        <div className="flex-1 space-y-2">
                          <Input
                            value={question.text}
                            onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                            placeholder="Question text"
                          />
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Type:</Label>
                              <Select
                                value={question.type}
                                onValueChange={(value) => updateQuestion(index, 'type', value)}
                              >
                                <SelectTrigger className="w-32 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="scale">Scale (1-10)</SelectItem>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="checkbox">Checkbox</SelectItem>
                                  <SelectItem value="select">Select</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={question.required}
                                onCheckedChange={(checked) => updateQuestion(index, 'required', checked)}
                              />
                              <Label className="text-xs">Required</Label>
                            </div>
                          </div>
                          {question.type === 'select' && (
                            <div className="space-y-1">
                              <Label className="text-xs">Options (comma-separated):</Label>
                              <Input
                                value={question.options?.join(', ') || ''}
                                onChange={(e) => updateQuestion(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                                placeholder="Option 1, Option 2, Option 3"
                              />
                            </div>
                          )}
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeQuestion(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplateOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTemplate}
              disabled={updateTemplateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              {updateTemplateMutation.isPending ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Check-in Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check-in Settings</DialogTitle>
            <DialogDescription>
              Configure global check-in behavior and alert thresholds.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Low Score Threshold */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Low Score Alert Threshold</Label>
                  <p className="text-sm text-muted-foreground">
                    Scores at or below this value will trigger alerts
                  </p>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {lowScoreThreshold}/10
                </Badge>
              </div>
              <Slider
                value={[lowScoreThreshold]}
                onValueChange={(value) => setLowScoreThreshold(value[0])}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 (Very Low)</span>
                <span>5 (Default)</span>
                <span>10 (High)</span>
              </div>
            </div>
            
            {/* Reminder Escalation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Reminder Escalation</Label>
                  <p className="text-sm text-muted-foreground">
                    Send follow-up reminder after this many hours
                  </p>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {reminderHours}h
                </Badge>
              </div>
              <Select
                value={reminderHours.toString()}
                onValueChange={(value) => setReminderHours(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 hours (1 day)</SelectItem>
                  <SelectItem value="48">48 hours (2 days)</SelectItem>
                  <SelectItem value="72">72 hours (3 days)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A second reminder will be sent to clients who haven't responded within this time.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSettings}
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}