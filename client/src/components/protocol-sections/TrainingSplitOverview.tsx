import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Undo,
  Redo,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Zap,
  Flame,
  Shield,
  Save,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { SaveStatusIndicator } from "@/components/SaveStatusIndicator";

// Default training split data structure
const DEFAULT_TRAINING_SPLIT = {
  title: "12 Week Recovery & Longevity Emphasized",
  viewMode: "mesocycle" as "mesocycle" | "macrocycle",
  phases: [
    {
      id: "alarm",
      name: "Alarm Phase",
      weekRange: "Weeks 1-2",
      weekStart: 1,
      weekEnd: 2,
      color: "green",
      icon: "shield",
      description: "Begin myocyte maturation cycle while initiating organelle involvement",
      adjustmentsHeader: "TRAINING ADJUSTMENTS TO BASE PROGRAM",
      weeks: [
        { week: 1, title: "Week 1", description: "None — Rotation 1" },
        { week: 2, title: "Week 2", description: "None — Rotation 2" },
      ],
    },
    {
      id: "glycolytic",
      name: "Glycolytic Upregulation Phase",
      weekRange: "Weeks 3-8",
      weekStart: 3,
      weekEnd: 8,
      color: "amber",
      icon: "flame",
      description: "Progressive overload with glycolytic emphasis to drive metabolic adaptation",
      adjustmentsHeader: "TRAINING ADJUSTMENTS TO BASE PROGRAM",
      weeks: [
        { week: 3, title: "Week 3", description: "Add 1 drop set to the last set of each exercise" },
        { week: 4, title: "Week 4", description: "Add 1 drop set to the last set of each exercise, increase weight by 5%" },
        { week: 5, title: "Week 5", description: "Add 2 drop sets to the last set of each exercise" },
        { week: 6, title: "Week 6", description: "Add 2 drop sets, increase weight by 5%" },
        { week: 7, title: "Week 7", description: "Add 3 drop sets to the last set of each exercise" },
        { week: 8, title: "Week 8", description: "Add 3 drop sets, increase weight by 5%, add partial reps" },
      ],
    },
    {
      id: "alactic",
      name: "Alactic Improvement Phase",
      weekRange: "Weeks 9-12",
      weekStart: 9,
      weekEnd: 12,
      color: "red",
      icon: "zap",
      description: "High-intensity, low-rep focus for neural drive and maximal strength improvements",
      adjustmentsHeader: "TRAINING ADJUSTMENTS TO BASE PROGRAM",
      weeks: [
        { week: 9, title: "Week 9", description: "Reduce reps to 4-6, increase rest to 2-3 minutes" },
        { week: 10, title: "Week 10", description: "Reduce reps to 3-5, add cluster sets" },
        { week: 11, title: "Week 11", description: "Reduce reps to 2-4, add heavy negatives" },
        { week: 12, title: "Week 12", description: "Continue to add reps to set or load onto the bar keeping the total number of working sets the same" },
      ],
    },
  ],
  additionalNotes: "",
};

type Phase = typeof DEFAULT_TRAINING_SPLIT.phases[0];
type TrainingSplitData = typeof DEFAULT_TRAINING_SPLIT;

// Phase icon component
function PhaseIcon({ icon, color }: { icon: string; color: string }) {
  const colorClasses: Record<string, string> = {
    green: "bg-green-100 text-green-600",
    amber: "bg-amber-100 text-amber-600",
    red: "bg-red-100 text-red-600",
  };
  const IconComponent = icon === "shield" ? Shield : icon === "flame" ? Flame : Zap;
  return (
    <div className={cn("flex items-center justify-center w-8 h-8 rounded-full", colorClasses[color] || "bg-gray-100 text-gray-600")}>
      <IconComponent className="h-4 w-4" />
    </div>
  );
}

// Macrocycle progress bar
function MacrocycleBar({ phases }: { phases: Phase[] }) {
  const totalWeeks = 12;
  const colorMap: Record<string, string> = {
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <div className="mb-6">
      <div className="flex rounded-lg overflow-hidden h-8 border">
        {phases.map((phase) => {
          const weeks = phase.weekEnd - phase.weekStart + 1;
          const widthPercent = (weeks / totalWeeks) * 100;
          return (
            <div
              key={phase.id}
              className={cn("flex items-center justify-center text-white text-xs font-medium", colorMap[phase.color] || "bg-gray-500")}
              style={{ width: `${widthPercent}%` }}
            >
              {phase.name.split(" ")[0]}
            </div>
          );
        })}
      </div>
      <div className="flex mt-1">
        {phases.map((phase) => {
          const weeks = phase.weekEnd - phase.weekStart + 1;
          const widthPercent = (weeks / totalWeeks) * 100;
          return (
            <div key={phase.id} className="text-center text-xs text-muted-foreground" style={{ width: `${widthPercent}%` }}>
              Wk {phase.weekStart}-{phase.weekEnd}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Phase accordion component
function PhaseAccordion({
  phase,
  isAdmin,
  isExpanded,
  onToggle,
  onUpdate,
}: {
  phase: Phase;
  isAdmin: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updated: Phase) => void;
}) {
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editPhaseDesc, setEditPhaseDesc] = useState(false);
  const [phaseDescDraft, setPhaseDescDraft] = useState(phase.description);

  const badgeColorMap: Record<string, string> = {
    green: "bg-green-100 text-green-700 border-green-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    red: "bg-red-100 text-red-700 border-red-200",
  };

  const borderColorMap: Record<string, string> = {
    green: "border-l-green-500",
    amber: "border-l-amber-500",
    red: "border-l-red-500",
  };

  return (
    <div className={cn("border rounded-lg overflow-hidden", borderColorMap[phase.color], "border-l-4")}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <PhaseIcon icon={phase.icon} color={phase.color} />
          <div className="text-left">
            <span className="font-semibold">{phase.name}</span>
            <Badge variant="outline" className={cn("ml-2 text-xs", badgeColorMap[phase.color])}>
              {phase.weekRange}
            </Badge>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t px-4 pb-4">
          {/* Phase description */}
          <div className="py-3">
            {editPhaseDesc && isAdmin ? (
              <div className="flex gap-2">
                <Textarea
                  value={phaseDescDraft}
                  onChange={(e) => setPhaseDescDraft(e.target.value)}
                  className="text-sm"
                  rows={2}
                />
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onUpdate({ ...phase, description: phaseDescDraft });
                      setEditPhaseDesc(false);
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditPhaseDesc(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p
                className={cn("text-sm text-muted-foreground", isAdmin && "cursor-pointer hover:bg-muted/30 rounded p-1 -m-1")}
                onClick={() => isAdmin && setEditPhaseDesc(true)}
              >
                {phase.description}
              </p>
            )}
          </div>

          {/* Training adjustments header */}
          <div className="mb-3">
            <h4 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
              {phase.adjustmentsHeader}
            </h4>
          </div>

          {/* Week entries */}
          <div className="space-y-2">
            {phase.weeks.map((week, idx) => (
              <div key={week.week} className="flex items-start gap-3 py-2 border-b last:border-b-0">
                <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                  Week {week.week}
                </Badge>
                {editingWeek === idx && isAdmin ? (
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="text-sm"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const updatedWeeks = [...phase.weeks];
                        updatedWeeks[idx] = { ...week, description: editDesc };
                        onUpdate({ ...phase, weeks: updatedWeeks });
                        setEditingWeek(null);
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingWeek(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className={cn("text-sm flex-1", isAdmin && "cursor-pointer hover:bg-muted/30 rounded px-1 -mx-1")}
                    onClick={() => {
                      if (isAdmin) {
                        setEditingWeek(idx);
                        setEditDesc(week.description);
                      }
                    }}
                  >
                    {week.description}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Add week button for admin */}
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs"
              onClick={() => {
                const nextWeek = phase.weeks.length > 0 ? phase.weeks[phase.weeks.length - 1].week + 1 : phase.weekStart;
                const updatedWeeks = [...phase.weeks, { week: nextWeek, title: `Week ${nextWeek}`, description: "Enter adjustment..." }];
                onUpdate({ ...phase, weeks: updatedWeeks });
              }}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Week
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Additional notes editor (simpler toolbar)
function NotesToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1.5">
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Bold">
        <Bold className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Italic">
        <Italic className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} title="Underline">
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarBtn>
      <div className="w-px h-6 bg-border mx-1" />
      <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} title="Bullet List">
        <List className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")} title="Numbered List">
        <ListOrdered className="h-4 w-4" />
      </ToolbarBtn>
      <div className="w-px h-6 bg-border mx-1" />
      <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
        <Undo className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
        <Redo className="h-4 w-4" />
      </ToolbarBtn>
    </div>
  );
}

function ToolbarBtn({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <Button type="button" variant={isActive ? "secondary" : "ghost"} size="sm" onClick={onClick} disabled={disabled} title={title} className="h-7 w-7 p-0">
      {children}
    </Button>
  );
}

interface TrainingSplitOverviewProps {
  clientProtocolId: number;
  isAdmin?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function TrainingSplitOverview({
  clientProtocolId,
  isAdmin = false,
  isCollapsed: externalCollapsed,
  onToggleCollapse,
}: TrainingSplitOverviewProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(["alarm"]));
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [splitData, setSplitData] = useState<TrainingSplitData>(DEFAULT_TRAINING_SPLIT);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const notesRef = useRef<string>("");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const splitDataRef = useRef<TrainingSplitData>(DEFAULT_TRAINING_SPLIT);
  const isHydratingRef = useRef(true); // Prevent autosave during initial content load
  const hasHydratedOnceRef = useRef(false); // Only hydrate from server data once
  const userHasEditedRef = useRef(false); // Only autosave after user actually types
  const lastHydratedContentRef = useRef<string>(""); // Track hydrated content to detect template loads

  const collapsed = externalCollapsed !== undefined ? externalCollapsed : isCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setIsCollapsed(!isCollapsed));

  // Warn user when navigating away with unsaved changes
  useUnsavedChangesWarning(hasChanges && isAdmin, 'You have unsaved changes in the Training Split. Are you sure you want to leave?');

  const { data: sectionData, isLoading } = trpc.protocolSections.get.useQuery({
    clientProtocolId,
    sectionType: "training_split",
  });

  const upsertMutation = trpc.protocolSections.upsert.useMutation();
  const utils = trpc.useUtils();

  // Load data from DB - only on FIRST load, not background refetches
  // BUT also detect template loads (server content changed significantly)
  useEffect(() => {
    if (sectionData?.content) {
      const content = sectionData.content as any;
      const contentFingerprint = JSON.stringify(content);
      const isTemplateLoad = hasHydratedOnceRef.current && contentFingerprint !== lastHydratedContentRef.current;
      
      if ((!hasHydratedOnceRef.current || isTemplateLoad) && content.splitData) {
        isHydratingRef.current = true;
        setSplitData(content.splitData);
        notesRef.current = content.splitData.additionalNotes || "";
        lastHydratedContentRef.current = contentFingerprint;
        hasHydratedOnceRef.current = true;
        if (isTemplateLoad) {
          userHasEditedRef.current = false; // Reset since this is a fresh template
        }
        // Use longer timeout to ensure all state updates flush
        setTimeout(() => {
          isHydratingRef.current = false;
          setHasChanges(false);
        }, 500);
      } else if (!content.splitData && !hasHydratedOnceRef.current) {
        isHydratingRef.current = false;
      }
    } else if (!sectionData?.content) {
      setTimeout(() => {
        isHydratingRef.current = false;
      }, 500);
    }
  }, [sectionData]);

  const notesEditor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Underline,
      Placeholder.configure({
        placeholder: "Add any additional training notes, modifications, or client-specific adjustments here...",
      }),
    ],
    content: splitData.additionalNotes || "",
    editable: isAdmin,
    onUpdate: ({ editor }) => {
      notesRef.current = editor.getHTML();
      // Skip autosave during hydration (initial content load)
      if (isHydratingRef.current) return;
      // Mark that user has actually edited content
      userHasEditedRef.current = true;
      setHasChanges(true);
      // Debounced autosave - 5 second delay to reduce server load
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => doAutosave(), 5000);
    },
  });

  // Update notes editor content - only on first load, but also detect template loads
  const hasHydratedNotesRef = useRef(false);
  const lastHydratedNotesRef = useRef<string>("");
  useEffect(() => {
    if (notesEditor && sectionData?.content) {
      const content = sectionData.content as any;
      const notesContent = content.splitData?.additionalNotes || "";
      const isTemplateLoad = hasHydratedNotesRef.current && notesContent !== lastHydratedNotesRef.current;
      
      if ((!hasHydratedNotesRef.current || isTemplateLoad) && notesContent) {
        isHydratingRef.current = true;
        notesEditor.commands.setContent(notesContent);
        lastHydratedNotesRef.current = notesContent;
        hasHydratedNotesRef.current = true;
        if (isTemplateLoad) {
          userHasEditedRef.current = false;
        }
        setTimeout(() => {
          isHydratingRef.current = false;
          setHasChanges(false);
        }, 500);
      }
    }
  }, [notesEditor, sectionData]);

  useEffect(() => {
    if (notesEditor) {
      notesEditor.setEditable(isAdmin);
    }
  }, [notesEditor, isAdmin]);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  // Keep ref in sync for autosave
  useEffect(() => {
    splitDataRef.current = splitData;
  }, [splitData]);

  const updatePhase = (index: number, updated: Phase) => {
    setSplitData((prev) => {
      const phases = [...prev.phases];
      phases[index] = updated;
      return { ...prev, phases };
    });
    // Skip autosave during hydration
    if (isHydratingRef.current) return;
    // Mark that user has actually edited content
    userHasEditedRef.current = true;
    setHasChanges(true);
    // Debounced autosave - 5 second delay to reduce server load
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => doAutosave(), 5000);
  };

  const autosaveRetryRef = useRef(0);
  const MAX_AUTOSAVE_RETRIES = 2;
  const autosaveBackoffRef = useRef(2000);

  const doAutosave = useCallback(async () => {
    // Don't autosave if user hasn't actually edited anything
    if (!userHasEditedRef.current) return;
    setIsSaving(true);
    try {
      const dataToSave = {
        ...splitDataRef.current,
        additionalNotes: notesRef.current,
      };
      await upsertMutation.mutateAsync({
        clientProtocolId,
        sectionType: "training_split",
        content: { splitData: dataToSave },
        isEnabled: true,
      });
      setHasChanges(false);
      setLastSaved(new Date());
      autosaveRetryRef.current = 0;
    } catch (error: any) {
      console.error("Autosave failed:", error);
      const msg = error?.message || '';
      const isRateLimit = msg.includes('Too many requests') || msg.includes('429');
      const isPayloadError = msg.includes('payload') || msg.includes('too large');

      if (isPayloadError) {
        toast.error("Content is too large to save. Try reducing the content size.");
      } else if (autosaveRetryRef.current < MAX_AUTOSAVE_RETRIES) {
        autosaveRetryRef.current++;
        const delay = isRateLimit ? 10000 : 3000 * autosaveRetryRef.current;
        console.log(`[TrainingSplit] Retrying autosave in ${delay}ms (attempt ${autosaveRetryRef.current})...`);
        autosaveTimerRef.current = setTimeout(() => doAutosave(), delay);
      } else {
        autosaveRetryRef.current = 0;
        autosaveBackoffRef.current = Math.min(autosaveBackoffRef.current * 2, 15000);
        toast.error("Auto-save failed. Click Save to retry.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [clientProtocolId, upsertMutation]);

  // Cleanup autosave timer on unmount, and flush pending save only if there are actual changes
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
        // Only flush if user has actually edited and there are real changes
        if (userHasEditedRef.current && !isHydratingRef.current) {
          doAutosave();
        }
      }
    };
  }, [doAutosave]);

  const handleSave = useCallback(async () => {
    // Cancel any pending autosave
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setIsSaving(true);
    try {
      const dataToSave = {
        ...splitData,
        additionalNotes: notesRef.current,
      };
      await upsertMutation.mutateAsync({
        clientProtocolId,
        sectionType: "training_split",
        content: { splitData: dataToSave },
        isEnabled: true,
      });
      utils.protocolSections.get.invalidate({ clientProtocolId, sectionType: "training_split" });
      setHasChanges(false);
      setLastSaved(new Date());
      toast.success("Training split saved");
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('payload') || msg.includes('too large')) {
        toast.error("Content is too large to save. Try reducing the content size.");
      } else {
        toast.error("Failed to save training split. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [clientProtocolId, splitData, upsertMutation, utils]);

  if (isLoading) {
    return (
      <div className="border rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <button
        onClick={toggleCollapse}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100 text-orange-600">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-lg">{splitData.title}</h3>
            <p className="text-sm text-muted-foreground">
              Mesocycle breakdown with phase-specific training adjustments
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {splitData.phases.length} phases
          </Badge>
          {collapsed ? (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="border-t p-4 space-y-4">
          {/* Editable title for admin */}
          {isAdmin && editingTitle ? (
            <div className="flex gap-2 items-center mb-4">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="text-lg font-semibold"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSplitData((prev) => ({ ...prev, title: titleDraft }));
                  setEditingTitle(false);
                  setHasChanges(true);
                }}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : isAdmin ? (
            <div
              className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 rounded p-1 -m-1 mb-2"
              onClick={() => {
                setTitleDraft(splitData.title);
                setEditingTitle(true);
              }}
            >
              <Edit2 className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Click to edit title</span>
            </div>
          ) : null}

          {/* Macrocycle Bar */}
          <MacrocycleBar phases={splitData.phases} />

          {/* Phase Accordions */}
          <div className="space-y-3">
            {splitData.phases.map((phase, idx) => (
              <PhaseAccordion
                key={phase.id}
                phase={phase}
                isAdmin={isAdmin}
                isExpanded={expandedPhases.has(phase.id)}
                onToggle={() => togglePhase(phase.id)}
                onUpdate={(updated) => updatePhase(idx, updated)}
              />
            ))}
          </div>

          {/* Additional Training Notes */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Additional Training Notes</h4>
            <div className="border rounded-lg overflow-hidden">
              {isAdmin && <NotesToolbar editor={notesEditor} />}
              <EditorContent
                editor={notesEditor}
                className={cn(
                  "prose prose-sm max-w-none p-3",
                  "[&_.tiptap]:outline-none [&_.tiptap]:min-h-[100px]",
                  "[&_.tiptap_p]:mb-2 [&_.tiptap_p]:text-gray-600",
                  "[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6",
                  "[&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6",
                  "[&_.tiptap_.is-editor-empty]:before:content-[attr(data-placeholder)] [&_.tiptap_.is-editor-empty]:before:text-gray-400 [&_.tiptap_.is-editor-empty]:before:float-left [&_.tiptap_.is-editor-empty]:before:pointer-events-none"
                )}
              />
            </div>
          </div>

          {/* Save button for admin */}
          {isAdmin && (
            <div className="flex items-center justify-between border-t pt-3 mt-4">
              <SaveStatusIndicator isSaving={isSaving} hasChanges={hasChanges} lastSaved={lastSaved} />
              <Button onClick={handleSave} disabled={isSaving || !hasChanges} size="sm" className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
