import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  FileText,
  Search,
  Loader2,
  Plus,
  Save,
  X,
  Trash2,
  Pin,
  PinOff,
  Pencil,
  Calendar,
  Users,
  ClipboardList,
  ChevronDown,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Session note templates
const sessionTemplates: Record<string, { label: string; content: string }> = {
  discovery: {
    label: "Strategy Session",
    content: `## Strategy Session Notes

**Client Goals:**
- 

**Current Health Status:**
- 

**Key Concerns:**
- 

**Recommended Approach:**
- 

**Action Items:**
- [ ] 
- [ ] 

**Next Steps:**
- Schedule follow-up: 
- Protocol design target date: `,
  },
  check_in: {
    label: "Check-In",
    content: `## Check-In Notes

**Progress Since Last Session:**
- 

**Current Protocol Adherence:**
- Compliance level: 
- Any missed doses: 

**Side Effects / Concerns:**
- 

**Adjustments Made:**
- 

**Action Items:**
- [ ] 
- [ ] 

**Next Check-In:** `,
  },
  training: {
    label: "Training Session",
    content: `## Training Session Notes

**Training Topics Covered:**
- 

**Reconstitution Review:**
- Technique: 
- Dosing confirmed: 

**Client Confidence Level:** /10

**Questions Addressed:**
- 

**Follow-Up Items:**
- [ ] 
- [ ] `,
  },
  reconstitution: {
    label: "Reconstitution Session",
    content: `## Reconstitution Session Notes

**Products Reviewed:**
- 

**Reconstitution Steps Covered:**
- BAC water volume: 
- Storage instructions: 

**Injection Technique:**
- Site rotation: 
- Technique notes: 

**Client Demonstrated:**
- [ ] Proper reconstitution
- [ ] Correct dosing
- [ ] Safe injection technique

**Notes:** `,
  },
  follow_up: {
    label: "Follow-Up",
    content: `## Follow-Up Notes

**Reason for Follow-Up:**
- 

**Updates Since Last Contact:**
- 

**Resolution / Outcome:**
- 

**Action Items:**
- [ ] 
- [ ] `,
  },
  ad_hoc: {
    label: "General Note",
    content: "",
  },
};

const typeLabels: Record<string, string> = {
  discovery: "Strategy Session",
  check_in: "Check-In",
  training: "Training",
  reconstitution: "Reconstitution",
  follow_up: "Follow-Up",
  ad_hoc: "General Note",
};

const typeColors: Record<string, string> = {
  discovery: "bg-purple-100 text-purple-800",
  check_in: "bg-green-100 text-green-800",
  training: "bg-blue-100 text-blue-800",
  reconstitution: "bg-cyan-100 text-cyan-800",
  follow_up: "bg-amber-100 text-amber-800",
  ad_hoc: "bg-gray-100 text-gray-800",
};

const tierLabels: Record<string, string> = {
  elite: "Elite",
  flagship: "90-Day",
  essentials: "Essentials",
};

export default function CoachingSessions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // Add note dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForEnrollmentId, setAddForEnrollmentId] = useState<number | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteSessionType, setNewNoteSessionType] = useState<string>("ad_hoc");
  const [newNoteDate, setNewNoteDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Edit note state
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");

  // Fetch active coaching enrollments (paid + has user account)
  const { data: enrollments, isLoading: isLoadingEnrollments } = trpc.transformation.getAllEnrollments.useQuery({
    status: undefined,
    limit: 200,
  });

  // Filter to active coaching clients (paid, with user account linked)
  const activeEnrollments = useMemo(() => {
    if (!enrollments) return [];
    return enrollments.filter((e: any) => 
      e.coachingFeePaid && e.userId
    ).sort((a: any, b: any) => {
      // Sort by most recent activity
      const dateA = a.updatedAt || a.enrolledAt || '';
      const dateB = b.updatedAt || b.enrolledAt || '';
      return dateB.localeCompare(dateA);
    });
  }, [enrollments]);

  // Fetch session notes for selected enrollment
  const { data: sessionNotes, refetch: refetchNotes } = trpc.transformation.getSessionNotes.useQuery(
    { enrollmentId: selectedEnrollmentId || 0 },
    { enabled: !!selectedEnrollmentId }
  );

  // Mutations
  const createNoteMutation = trpc.transformation.createSessionNote.useMutation({
    onSuccess: () => {
      toast.success("Session note added");
      setNewNoteContent("");
      setShowAddDialog(false);
      refetchNotes();
    },
    onError: (error) => toast.error("Failed to add note", { description: error.message }),
  });

  const updateNoteMutation = trpc.transformation.updateSessionNote.useMutation({
    onSuccess: () => {
      toast.success("Note updated");
      setEditingNoteId(null);
      refetchNotes();
    },
    onError: (error) => toast.error("Failed to update note", { description: error.message }),
  });

  const deleteNoteMutation = trpc.transformation.deleteSessionNote.useMutation({
    onSuccess: () => {
      toast.success("Note deleted");
      refetchNotes();
    },
    onError: (error) => toast.error("Failed to delete note", { description: error.message }),
  });

  const pinNoteMutation = trpc.transformation.updateSessionNote.useMutation({
    onSuccess: () => refetchNotes(),
  });

  // Filter enrollments by search
  const filteredEnrollments = useMemo(() => {
    if (!searchQuery.trim()) return activeEnrollments;
    const q = searchQuery.toLowerCase();
    return activeEnrollments.filter((e: any) =>
      (e.userName || "").toLowerCase().includes(q) ||
      (e.userEmail || "").toLowerCase().includes(q) ||
      (e.tier || "").toLowerCase().includes(q)
    );
  }, [activeEnrollments, searchQuery]);

  // Filter notes by type
  const filteredNotes = useMemo(() => {
    if (!sessionNotes) return [];
    if (typeFilter === "all") return sessionNotes;
    return sessionNotes.filter((n: any) => n.session_type === typeFilter);
  }, [sessionNotes, typeFilter]);

  const selectedEnrollment = activeEnrollments.find((e: any) => e.id === selectedEnrollmentId);

  const handleUseTemplate = (templateKey: string) => {
    setNewNoteSessionType(templateKey);
    setNewNoteContent(sessionTemplates[templateKey]?.content || "");
  };

  const handleOpenAddDialog = (enrollmentId: number) => {
    setAddForEnrollmentId(enrollmentId);
    setNewNoteContent("");
    setNewNoteSessionType("ad_hoc");
    setNewNoteDate(new Date().toISOString().split("T")[0]);
    setShowAddDialog(true);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="h-8 w-8 text-primary" />
              Coaching Sessions
            </h1>
            <p className="text-muted-foreground mt-1">
              Document and manage coaching session notes for active clients
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Client List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Active Clients
                  <Badge variant="outline" className="ml-auto">{activeEnrollments.length}</Badge>
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingEnrollments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredEnrollments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No active coaching clients found
                  </div>
                ) : (
                  <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                    {filteredEnrollments.map((enrollment: any) => (
                      <button
                        key={enrollment.id}
                        onClick={() => setSelectedEnrollmentId(enrollment.id)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          selectedEnrollmentId === enrollment.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {enrollment.userName || enrollment.clientName || "Unknown"}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {enrollment.userEmail || enrollment.email || "No email"}
                            </p>
                          </div>
                          <Badge className={`text-xs shrink-0 ml-2 ${
                            enrollment.tier === "elite" ? "bg-amber-100 text-amber-800" :
                            enrollment.tier === "flagship" ? "bg-blue-100 text-blue-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {tierLabels[enrollment.tier] || enrollment.tier}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Session Notes */}
          <div className="lg:col-span-2">
            {selectedEnrollmentId && selectedEnrollment ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedEnrollment.userName || selectedEnrollment.clientName || "Unknown Client"}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedEnrollment.userEmail || selectedEnrollment.email} &middot; {tierLabels[selectedEnrollment.tier] || selectedEnrollment.tier}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="discovery">Discovery</SelectItem>
                          <SelectItem value="check_in">Check-In</SelectItem>
                          <SelectItem value="training">Training</SelectItem>
                          <SelectItem value="reconstitution">Reconstitution</SelectItem>
                          <SelectItem value="follow_up">Follow-Up</SelectItem>
                          <SelectItem value="ad_hoc">General</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => handleOpenAddDialog(selectedEnrollmentId)}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                      >
                        <Plus className="h-4 w-4" /> Add Note
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredNotes && filteredNotes.length > 0 ? (
                    <div className="space-y-3">
                      {filteredNotes.map((note: any) => (
                        <div
                          key={note.id}
                          className={`border rounded-lg p-4 ${
                            note.is_pinned ? "border-amber-300 bg-amber-50" : "bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={typeColors[note.session_type] || "bg-gray-100 text-gray-800"}>
                                {typeLabels[note.session_type] || note.session_type}
                              </Badge>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(note.session_date).toLocaleDateString()}
                              </span>
                              {note.is_pinned && <Pin className="h-3 w-3 text-amber-600" />}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => pinNoteMutation.mutate({ noteId: note.id, isPinned: !note.is_pinned })}
                                title={note.is_pinned ? "Unpin" : "Pin"}
                              >
                                {note.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditingNoteContent(note.content);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                onClick={() => {
                                  if (confirm("Delete this session note?")) {
                                    deleteNoteMutation.mutate({ noteId: note.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {editingNoteId === note.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingNoteContent}
                                onChange={(e) => setEditingNoteContent(e.target.value)}
                                className="min-h-[120px] bg-white font-mono text-sm"
                              />
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditingNoteId(null)}>
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  disabled={updateNoteMutation.isPending}
                                  onClick={() =>
                                    updateNoteMutation.mutate({ noteId: note.id, content: editingNoteContent })
                                  }
                                >
                                  {updateNoteMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "Save"
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</div>
                          )}
                          <div className="mt-2 text-xs text-gray-400">
                            by {note.coach_name || "Admin"} &middot;{" "}
                            {new Date(note.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No session notes yet</p>
                      <p className="text-sm mt-1">Click "Add Note" to document a coaching session</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-20">
                  <div className="text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Select a client</p>
                    <p className="text-sm mt-1">Choose an active coaching client from the list to view or add session notes</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Add Session Note Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>New Session Note</DialogTitle>
            <DialogDescription>
              Document a coaching session for {selectedEnrollment?.userName || selectedEnrollment?.clientName || "this client"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Session Type</Label>
                <Select value={newNoteSessionType} onValueChange={(val) => {
                  setNewNoteSessionType(val);
                  // Don't auto-fill template if user already has content
                  if (!newNoteContent.trim()) {
                    setNewNoteContent(sessionTemplates[val]?.content || "");
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discovery">Strategy Session</SelectItem>
                    <SelectItem value="check_in">Check-In</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="reconstitution">Reconstitution</SelectItem>
                    <SelectItem value="follow_up">Follow-Up</SelectItem>
                    <SelectItem value="ad_hoc">General Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Session Date</Label>
                <Input
                  type="date"
                  value={newNoteDate}
                  onChange={(e) => setNewNoteDate(e.target.value)}
                />
              </div>
            </div>

            {/* Template Buttons */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Use Template</Label>
              <div className="flex flex-wrap gap-1">
                {Object.entries(sessionTemplates)
                  .filter(([key]) => key !== "ad_hoc")
                  .map(([key, template]) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleUseTemplate(key)}
                    >
                      {template.label}
                    </Button>
                  ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 text-red-600 hover:text-red-700"
                  onClick={() => setNewNoteContent("")}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Document session observations, client progress, action items, and follow-up tasks..."
                className="min-h-[250px] font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
              disabled={!newNoteContent.trim() || createNoteMutation.isPending}
              onClick={() => {
                if (addForEnrollmentId) {
                  createNoteMutation.mutate({
                    enrollmentId: addForEnrollmentId,
                    sessionDate: newNoteDate,
                    sessionType: newNoteSessionType as any,
                    content: newNoteContent.trim(),
                  });
                }
              }}
            >
              {createNoteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
