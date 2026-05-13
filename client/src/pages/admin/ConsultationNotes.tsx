import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { StickyNote, Plus, Clock, User, FileText, ChevronDown, ChevronUp } from "lucide-react";

export default function ConsultationNotes() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expandedNote, setExpandedNote] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    consultType: "quick_hit_20min" as string,
    notes: "",
    recommendations: "",
    nextSteps: "",
    suggestedTier: "",
    suggestedProgram: "",
    consultDate: new Date().toISOString().slice(0, 16),
    prospectId: "",
    enrollmentId: "",
    clientId: "",
  });

  const notesQuery = trpc.consultationNotes.list.useQuery({ limit: 50 });
  const createMutation = trpc.consultationNotes.create.useMutation({
    onSuccess: () => {
      toast.success("Consultation notes saved");
      setShowAddDialog(false);
      setFormData({
        consultType: "quick_hit_20min",
        notes: "",
        recommendations: "",
        nextSteps: "",
        suggestedTier: "",
        suggestedProgram: "",
        consultDate: new Date().toISOString().slice(0, 16),
        prospectId: "",
        enrollmentId: "",
        clientId: "",
      });
      notesQuery.refetch();
    },
    onError: (error) => {
      toast.error("Failed to save notes", { description: error.message });
    },
  });

  const notes = notesQuery.data || [];

  const consultTypeLabels: Record<string, string> = {
    quick_hit_20min: "20-Min Quick Hit Consult",
    strategy_session: "Strategy Session",
    discovery_call: "Discovery Call",
    follow_up: "Follow-Up",
    other: "Other",
  };

  const consultTypeBadgeColors: Record<string, string> = {
    quick_hit_20min: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    strategy_session: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    discovery_call: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    follow_up: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <StickyNote className="h-6 w-6 text-amber-500" />
              Consultation Notes
            </h1>
            <p className="text-muted-foreground mt-1">
              Jason's post-consultation notes — visible to Shannon for next-step planning
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Notes
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Consultation Notes</DialogTitle>
                <DialogDescription>
                  Enter notes from your consultation. Shannon will see these for next-step planning.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Consultation Type</Label>
                    <Select
                      value={formData.consultType}
                      onValueChange={(v) => setFormData({ ...formData, consultType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quick_hit_20min">20-Min Quick Hit Consult</SelectItem>
                        <SelectItem value="strategy_session">Strategy Session</SelectItem>
                        <SelectItem value="discovery_call">Discovery Call</SelectItem>
                        <SelectItem value="follow_up">Follow-Up</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Consultation Date/Time</Label>
                    <Input
                      type="datetime-local"
                      value={formData.consultDate}
                      onChange={(e) => setFormData({ ...formData, consultDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Prospect ID (optional)</Label>
                    <Input
                      type="number"
                      placeholder="Lead pipeline ID"
                      value={formData.prospectId}
                      onChange={(e) => setFormData({ ...formData, prospectId: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Enrollment ID (optional)</Label>
                    <Input
                      type="number"
                      placeholder="Enrollment ID"
                      value={formData.enrollmentId}
                      onChange={(e) => setFormData({ ...formData, enrollmentId: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client ID (optional)</Label>
                    <Input
                      type="number"
                      placeholder="Client ID"
                      value={formData.clientId}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Consultation Notes *</Label>
                  <Textarea
                    placeholder="What was discussed? Key concerns, symptoms, goals..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recommendations</Label>
                  <Textarea
                    placeholder="What did you recommend? Protocols, supplements, lifestyle changes..."
                    value={formData.recommendations}
                    onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Next Steps (visible to Shannon)</Label>
                  <Textarea
                    placeholder="What should happen next? Follow-up call, send info, schedule strategy session..."
                    value={formData.nextSteps}
                    onChange={(e) => setFormData({ ...formData, nextSteps: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Suggested Tier</Label>
                    <Select
                      value={formData.suggestedTier}
                      onValueChange={(v) => setFormData({ ...formData, suggestedTier: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flagship">Flagship (90-Day)</SelectItem>
                        <SelectItem value="elite">Elite (4-Month)</SelectItem>
                        <SelectItem value="premium">Premium (6-Month)</SelectItem>
                        <SelectItem value="undecided">Undecided</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Suggested Program</Label>
                    <Input
                      placeholder="e.g., Weight Loss, Performance, Longevity"
                      value={formData.suggestedProgram}
                      onChange={(e) => setFormData({ ...formData, suggestedProgram: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (!formData.notes.trim()) {
                      toast.error("Notes are required");
                      return;
                    }
                    createMutation.mutate({
                      consultType: formData.consultType as any,
                      notes: formData.notes,
                      recommendations: formData.recommendations || undefined,
                      nextSteps: formData.nextSteps || undefined,
                      suggestedTier: formData.suggestedTier || undefined,
                      suggestedProgram: formData.suggestedProgram || undefined,
                      consultDate: formData.consultDate,
                      prospectId: formData.prospectId ? parseInt(formData.prospectId) : undefined,
                      enrollmentId: formData.enrollmentId ? parseInt(formData.enrollmentId) : undefined,
                      clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
                    });
                  }}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Saving..." : "Save Notes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          {notes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <StickyNote className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No consultation notes yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click "Add Notes" after a consultation to record your observations and next steps.
                </p>
              </CardContent>
            </Card>
          ) : (
            notes.map((note: any) => (
              <Card key={note.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={consultTypeBadgeColors[note.consultType] || consultTypeBadgeColors.other}>
                        {consultTypeLabels[note.consultType] || note.consultType}
                      </Badge>
                      {note.suggestedTier && (
                        <Badge variant="outline" className="capitalize">{note.suggestedTier}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(note.consultDate).toLocaleDateString()} {new Date(note.consultDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {expandedNote === note.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                  <p className="text-sm mt-2 line-clamp-2">{note.notes}</p>
                </CardHeader>
                {expandedNote === note.id && (
                  <CardContent className="pt-0 space-y-4">
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Full Notes
                      </h4>
                      <p className="text-sm whitespace-pre-wrap">{note.notes}</p>
                    </div>
                    {note.recommendations && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground">{note.recommendations}</p>
                      </div>
                    )}
                    {note.nextSteps && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <h4 className="text-sm font-medium mb-1 text-blue-800 dark:text-blue-400">
                          Next Steps (for Shannon)
                        </h4>
                        <p className="text-sm whitespace-pre-wrap text-blue-700 dark:text-blue-300">{note.nextSteps}</p>
                      </div>
                    )}
                    {note.suggestedProgram && (
                      <div className="text-sm">
                        <span className="font-medium">Suggested Program:</span>{" "}
                        <span className="text-muted-foreground">{note.suggestedProgram}</span>
                      </div>
                    )}
                    <div className="flex gap-4 text-xs text-muted-foreground border-t pt-3">
                      {note.prospectId && <span>Prospect #{note.prospectId}</span>}
                      {note.enrollmentId && <span>Enrollment #{note.enrollmentId}</span>}
                      {note.clientId && <span>Client #{note.clientId}</span>}
                      <span>Entered: {note.noteEnteredAt ? new Date(note.noteEnteredAt).toLocaleString() : "—"}</span>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
