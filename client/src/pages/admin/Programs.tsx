import { useState, useRef, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, Pencil, Trash2, Calendar, Target, ChevronRight, Layers } from "lucide-react";
import { toast } from "sonner";

export default function Programs() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPhaseDialogOpen, setIsPhaseDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [selectedPhase, setSelectedPhase] = useState<any>(null);
  const [expandedProgramId, setExpandedProgramId] = useState<number | null>(null);

  // Form state for program
  const [programName, setProgramName] = useState("");
  const [programDescription, setProgramDescription] = useState("");
  const [programMonths, setProgramMonths] = useState(12);

  // Form state for phase
  const [phaseName, setPhaseName] = useState("");
  const [phaseDescription, setPhaseDescription] = useState("");
  const [phaseGoals, setPhaseGoals] = useState("");
  const [phaseDuration, setPhaseDuration] = useState(3);
  const [phaseNumber, setPhaseNumber] = useState(1);
  const [phaseTemplateId, setPhaseTemplateId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: programs, isLoading } = trpc.program.list.useQuery();
  const { data: templates } = trpc.template.list.useQuery();

  // Scroll position preservation
  const savedScrollPosition = useRef<number | null>(null);
  const shouldRestoreScroll = useRef(false);

  useEffect(() => {
    if (shouldRestoreScroll.current && savedScrollPosition.current !== null) {
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollPosition.current!);
        savedScrollPosition.current = null;
        shouldRestoreScroll.current = false;
      });
    }
  });

  const saveScrollPosition = () => {
    savedScrollPosition.current = window.scrollY;
    shouldRestoreScroll.current = true;
  };

  const createProgramMutation = trpc.program.create.useMutation({
    onSuccess: () => {
      saveScrollPosition();
      utils.program.list.invalidate();
      setIsCreateDialogOpen(false);
      resetProgramForm();
      toast.success("Program created successfully");
    },
  });

  const updateProgramMutation = trpc.program.update.useMutation({
    onSuccess: () => {
      saveScrollPosition();
      utils.program.list.invalidate();
      setIsEditDialogOpen(false);
      resetProgramForm();
      toast.success("Program updated successfully");
    },
  });

  const deleteProgramMutation = trpc.program.delete.useMutation({
    onSuccess: () => {
      saveScrollPosition();
      utils.program.list.invalidate();
      toast.success("Program deleted successfully");
    },
  });

  const createPhaseMutation = trpc.program.createPhase.useMutation({
    onSuccess: () => {
      saveScrollPosition();
      utils.program.getPhases.invalidate();
      setIsPhaseDialogOpen(false);
      resetPhaseForm();
      toast.success("Phase created successfully");
    },
  });

  const updatePhaseMutation = trpc.program.updatePhase.useMutation({
    onSuccess: () => {
      saveScrollPosition();
      utils.program.getPhases.invalidate();
      setIsPhaseDialogOpen(false);
      resetPhaseForm();
      toast.success("Phase updated successfully");
    },
  });

  const deletePhaseMutation = trpc.program.deletePhase.useMutation({
    onSuccess: () => {
      saveScrollPosition();
      utils.program.getPhases.invalidate();
      toast.success("Phase deleted successfully");
    },
  });

  const resetProgramForm = () => {
    setProgramName("");
    setProgramDescription("");
    setProgramMonths(12);
    setSelectedProgram(null);
  };

  const resetPhaseForm = () => {
    setPhaseName("");
    setPhaseDescription("");
    setPhaseGoals("");
    setPhaseDuration(3);
    setPhaseNumber(1);
    setPhaseTemplateId(null);
    setSelectedPhase(null);
  };

  const handleEditProgram = (program: any) => {
    setSelectedProgram(program);
    setProgramName(program.name);
    setProgramDescription(program.description || "");
    setProgramMonths(program.totalMonths);
    setIsEditDialogOpen(true);
  };

  const handleAddPhase = (program: any) => {
    setSelectedProgram(program);
    resetPhaseForm();
    // Set next phase number
    const phases = program.phases || [];
    setPhaseNumber(phases.length + 1);
    setIsPhaseDialogOpen(true);
  };

  const handleEditPhase = (phase: any, program: any) => {
    setSelectedProgram(program);
    setSelectedPhase(phase);
    setPhaseName(phase.name);
    setPhaseDescription(phase.description || "");
    setPhaseGoals(phase.goals || "");
    setPhaseDuration(phase.durationMonths);
    setPhaseNumber(phase.phaseNumber);
    setPhaseTemplateId(phase.templateId);
    setIsPhaseDialogOpen(true);
  };

  const handleSaveProgram = () => {
    if (selectedProgram) {
      updateProgramMutation.mutate({
        id: selectedProgram.id,
        name: programName,
        description: programDescription || undefined,
        totalMonths: programMonths,
      });
    } else {
      createProgramMutation.mutate({
        name: programName,
        description: programDescription || undefined,
        totalMonths: programMonths,
      });
    }
  };

  const handleSavePhase = () => {
    if (selectedPhase) {
      updatePhaseMutation.mutate({
        id: selectedPhase.id,
        name: phaseName,
        description: phaseDescription || undefined,
        goals: phaseGoals || undefined,
        durationMonths: phaseDuration,
        phaseNumber,
        templateId: phaseTemplateId,
      });
    } else {
      createPhaseMutation.mutate({
        programId: selectedProgram.id,
        name: phaseName,
        description: phaseDescription || undefined,
        goals: phaseGoals || undefined,
        durationMonths: phaseDuration,
        phaseNumber,
        templateId: phaseTemplateId || undefined,
        sortOrder: phaseNumber,
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Programs</h1>
            <p className="text-muted-foreground mt-1">
              Manage multi-phase coaching programs with quarterly roadmaps
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Program
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading programs...</div>
        ) : programs && programs.length > 0 ? (
          <div className="space-y-4">
            {programs.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                isExpanded={expandedProgramId === program.id}
                onToggleExpand={() => setExpandedProgramId(expandedProgramId === program.id ? null : program.id)}
                onEdit={() => handleEditProgram(program)}
                onDelete={() => {
                  if (confirm("Delete this program and all its phases?")) {
                    deleteProgramMutation.mutate({ id: program.id });
                  }
                }}
                onAddPhase={() => handleAddPhase(program)}
                onEditPhase={(phase) => handleEditPhase(phase, program)}
                onDeletePhase={(phaseId) => {
                  if (confirm("Delete this phase?")) {
                    deletePhaseMutation.mutate({ id: phaseId });
                  }
                }}
                templates={templates || []}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Programs Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first multi-phase coaching program to get started.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Program
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Program Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          resetProgramForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedProgram ? "Edit Program" : "Create New Program"}</DialogTitle>
            <DialogDescription>
              {selectedProgram 
                ? "Update the program details below."
                : "Create a multi-phase coaching program with quarterly milestones."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="programName">Program Name *</Label>
              <Input
                id="programName"
                placeholder="12-Month Elite Optimization Program"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="programDescription">Description</Label>
              <Textarea
                id="programDescription"
                placeholder="Comprehensive health optimization program with quarterly phases..."
                value={programDescription}
                onChange={(e) => setProgramDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="programMonths">Total Duration (months)</Label>
              <Select value={programMonths.toString()} onValueChange={(v) => setProgramMonths(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Months</SelectItem>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="9">9 Months</SelectItem>
                  <SelectItem value="12">12 Months</SelectItem>
                  <SelectItem value="18">18 Months</SelectItem>
                  <SelectItem value="24">24 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                resetProgramForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleSaveProgram} disabled={!programName}>
                {selectedProgram ? "Update Program" : "Create Program"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Phase Dialog */}
      <Dialog open={isPhaseDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsPhaseDialogOpen(false);
          resetPhaseForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedPhase ? "Edit Phase" : "Add New Phase"}</DialogTitle>
            <DialogDescription>
              {selectedPhase 
                ? "Update the phase details below."
                : `Add a new phase to ${selectedProgram?.name || "the program"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phaseNumber">Phase Number</Label>
                <Input
                  id="phaseNumber"
                  type="number"
                  min={1}
                  value={phaseNumber}
                  onChange={(e) => setPhaseNumber(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phaseDuration">Duration (months)</Label>
                <Select value={phaseDuration.toString()} onValueChange={(v) => setPhaseDuration(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Month</SelectItem>
                    <SelectItem value="2">2 Months</SelectItem>
                    <SelectItem value="3">3 Months</SelectItem>
                    <SelectItem value="4">4 Months</SelectItem>
                    <SelectItem value="6">6 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phaseName">Phase Name *</Label>
              <Input
                id="phaseName"
                placeholder="Phase 1: Foundation"
                value={phaseName}
                onChange={(e) => setPhaseName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phaseDescription">Description</Label>
              <Textarea
                id="phaseDescription"
                placeholder="Build the foundation with core peptides and baseline protocols..."
                value={phaseDescription}
                onChange={(e) => setPhaseDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phaseGoals">Goals for this Phase</Label>
              <Textarea
                id="phaseGoals"
                placeholder="• Establish baseline health markers&#10;• Start core peptide stack&#10;• Optimize sleep and recovery"
                value={phaseGoals}
                onChange={(e) => setPhaseGoals(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phaseTemplate">Protocol Template (optional)</Label>
              <Select 
                value={phaseTemplateId?.toString() || "none"} 
                onValueChange={(v) => setPhaseTemplateId(v === "none" ? null : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template</SelectItem>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link a protocol template to auto-populate items when clients enter this phase.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => {
                setIsPhaseDialogOpen(false);
                resetPhaseForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleSavePhase} disabled={!phaseName}>
                {selectedPhase ? "Update Phase" : "Add Phase"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// Program Card Component
function ProgramCard({
  program,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddPhase,
  onEditPhase,
  onDeletePhase,
  templates,
}: {
  program: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddPhase: () => void;
  onEditPhase: (phase: any) => void;
  onDeletePhase: (phaseId: number) => void;
  templates: any[];
}) {
  const { data: phases } = trpc.program.getPhases.useQuery(
    { programId: program.id },
    { enabled: isExpanded }
  );

  const getTemplateName = (templateId: number | null) => {
    if (!templateId) return null;
    const template = templates.find((t) => t.id === templateId);
    return template?.name || null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onToggleExpand}>
            <ChevronRight className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            <div>
              <CardTitle className="text-xl">{program.name}</CardTitle>
              <CardDescription className="mt-1">
                {program.description || "No description"}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              <Calendar className="h-3 w-3 mr-1" />
              {program.totalMonths} months
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Program actions menu">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Program
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAddPhase}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Phase
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Program
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Program Phases
              </h4>
              <Button variant="outline" size="sm" onClick={onAddPhase}>
                <Plus className="h-4 w-4 mr-1" />
                Add Phase
              </Button>
            </div>
            {phases && phases.length > 0 ? (
              <div className="space-y-3">
                {phases.map((phase, index) => (
                  <div
                    key={phase.id}
                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">Q{phase.phaseNumber}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="font-semibold">{phase.name}</h5>
                        <Badge variant="secondary" className="text-xs">
                          {phase.durationMonths} mo
                        </Badge>
                        {getTemplateName(phase.templateId) && (
                          <Badge variant="outline" className="text-xs">
                            Template: {getTemplateName(phase.templateId)}
                          </Badge>
                        )}
                      </div>
                      {phase.description && (
                        <p className="text-sm text-muted-foreground mt-1">{phase.description}</p>
                      )}
                      {phase.goals && (
                        <div className="mt-2">
                          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                            <Target className="h-3 w-3" />
                            Goals
                          </div>
                          <p className="text-sm whitespace-pre-line">{phase.goals}</p>
                        </div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="flex-shrink-0" aria-label="Phase actions menu">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditPhase(phase)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Phase
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeletePhase(phase.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Phase
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p>No phases defined yet.</p>
                <Button variant="link" onClick={onAddPhase}>
                  Add your first phase
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
