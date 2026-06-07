import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Dumbbell,
  Flame,
  Utensils,
  Brain,
  Pill,
  Zap,
  Sun,
  Heart,
  Save,
  Loader2,
  Edit2,
  Eye,
  CheckSquare,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { SaveStatusIndicator } from "@/components/SaveStatusIndicator";

// Tab definitions
const PROGRAM_TABS = [
  { id: "training_split", label: "Training Split", icon: Dumbbell },
  { id: "warmup_cooldown", label: "Warm Up & Cool Down", icon: Flame },
  { id: "energetic_systems", label: "Energetic Systems", icon: Zap },
  { id: "nutrition", label: "Nutrition", icon: Utensils },
  { id: "neuroplastic_drills", label: "Neuroplastic Drills", icon: Brain },
  { id: "supplementation", label: "Supplementation", icon: Pill },
  { id: "emf_quantum", label: "EMF & Quantum", icon: Zap },
  { id: "lifestyle_circadian", label: "Lifestyle & Circadian", icon: Sun },
  { id: "mentality", label: "Mentality & Mindset", icon: Heart },
  { id: "guidelines", label: "Guidelines", icon: CheckSquare },
] as const;

type TabId = typeof PROGRAM_TABS[number]["id"];

// Default content templates for each tab
const DEFAULT_TAB_CONTENT: Record<TabId, string> = {
  training_split: `
<h2>Split Overview</h2>
<p>Define the weekly training split here.</p>
<h2>Week 1 — Damage Emphasis</h2>
<p>Slow controlled tempos, mechanical failure on every set, full range of motion. Rest periods 60–90s. Nasal breathing preferred.</p>
<h2>Week 2 — Glycolytic Emphasis</h2>
<p>Supersets with 20–30 pump reps, constant tension, 30–60s rest. Strict nasal breathing to push NO production.</p>
<h2>Key Training Notes</h2>
<p></p>
`.trim(),
  warmup_cooldown: `
<h2>Warm Up Protocol</h2>
<p>Define warm-up routine here.</p>
<h2>Cool Down Protocol</h2>
<p>Define cool-down routine here.</p>
<h2>Mobility Work</h2>
<p></p>
`.trim(),
  energetic_systems: `
<h2>Energetic Systems Overview</h2>
<p>Define energy system training protocols here.</p>
<h2>Aerobic Base</h2>
<p></p>
<h2>Anaerobic Capacity</h2>
<p></p>
`.trim(),
  nutrition: `
<h2>Nutrition Overview</h2>
<p>Define nutritional guidelines and macro targets here.</p>
<h2>Daily Macros</h2>
<p></p>
<h2>Meal Timing</h2>
<p></p>
<h2>Supplementation with Meals</h2>
<p></p>
`.trim(),
  neuroplastic_drills: `
<h2>Neuroplastic Drills Overview</h2>
<p>Define neuroplasticity exercises and protocols here.</p>
<h2>Visual Drills</h2>
<p></p>
<h2>Vestibular Drills</h2>
<p></p>
<h2>Proprioceptive Drills</h2>
<p></p>
`.trim(),
  supplementation: `
<h2>Supplementation Protocol</h2>
<p>Define supplementation schedule and recommendations here.</p>
<h2>Morning Stack</h2>
<p></p>
<h2>Pre-Workout</h2>
<p></p>
<h2>Post-Workout</h2>
<p></p>
<h2>Evening Stack</h2>
<p></p>
`.trim(),
  emf_quantum: `
<h2>EMF & Quantum Biology</h2>
<p>Define EMF mitigation and quantum biology protocols here.</p>
<h2>Light Exposure Protocol</h2>
<p></p>
<h2>Grounding / Earthing</h2>
<p></p>
<h2>EMF Mitigation</h2>
<p></p>
`.trim(),
  lifestyle_circadian: `
<h2>Lifestyle & Circadian Rhythm</h2>
<p>Define lifestyle and circadian optimization protocols here.</p>
<h2>Morning Routine</h2>
<p></p>
<h2>Evening Routine</h2>
<p></p>
<h2>Sleep Optimization</h2>
<p></p>
`.trim(),
  mentality: `
<h2>Mentality & Mindset</h2>
<p>Define mindset and mental performance protocols here.</p>
<h2>Daily Practices</h2>
<p></p>
<h2>Breathwork</h2>
<p></p>
<h2>Meditation</h2>
<p></p>
<h2>Journaling</h2>
<p></p>
`.trim(),
};

// Enhanced Toolbar
function ProgramToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1.5">
      <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive("heading", { level: 1 })} title="H1">
        <Heading1 className="h-4 w-4" />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })} title="H2">
        <Heading2 className="h-4 w-4" />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive("heading", { level: 3 })} title="H3">
        <Heading3 className="h-4 w-4" />
      </TBtn>
      <div className="w-px h-6 bg-border mx-1" />
      <TBtn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Bold">
        <Bold className="h-4 w-4" />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Italic">
        <Italic className="h-4 w-4" />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} title="Underline">
        <UnderlineIcon className="h-4 w-4" />
      </TBtn>
      <div className="w-px h-6 bg-border mx-1" />
      <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} title="Bullet List">
        <List className="h-4 w-4" />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")} title="Numbered List">
        <ListOrdered className="h-4 w-4" />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive("blockquote")} title="Blockquote">
        <Quote className="h-4 w-4" />
      </TBtn>
      <div className="w-px h-6 bg-border mx-1" />
      <TBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} isActive={editor.isActive({ textAlign: "left" })} title="Left">
        <AlignLeft className="h-4 w-4" />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} isActive={editor.isActive({ textAlign: "center" })} title="Center">
        <AlignCenter className="h-4 w-4" />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} isActive={editor.isActive({ textAlign: "right" })} title="Right">
        <AlignRight className="h-4 w-4" />
      </TBtn>
      <div className="w-px h-6 bg-border mx-1" />
      <TBtn onClick={setLink} isActive={editor.isActive("link")} title="Link">
        <LinkIcon className="h-4 w-4" />
      </TBtn>
      <div className="w-px h-6 bg-border mx-1" />
      <TBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
        <Undo className="h-4 w-4" />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
        <Redo className="h-4 w-4" />
      </TBtn>
    </div>
  );
}

function TBtn({ onClick, isActive, disabled, children, title }: { onClick: () => void; isActive?: boolean; disabled?: boolean; children: React.ReactNode; title: string }) {
  return (
    <Button type="button" variant={isActive ? "secondary" : "ghost"} size="sm" onClick={onClick} disabled={disabled} title={title} className="h-7 w-7 p-0">
      {children}
    </Button>
  );
}

type RichTabId = Exclude<TabId, "guidelines">;

// Tab content editor component
function TabContentEditor({
  tabId,
  content,
  isAdmin,
  isEditing,
  onChange,
}: {
  tabId: RichTabId;
  content: string;
  isAdmin: boolean;
  isEditing: boolean;
  onChange: (html: string) => void;
}) {
  // Guard to prevent setContent from triggering onChange during hydration/tab switch
  const isSettingContentRef = useRef(true); // Start as true to block initial onUpdate
  const hasInitializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Add content here..." }),
    ],
    content: content || DEFAULT_TAB_CONTENT[tabId],
    editable: isAdmin && isEditing,
    onUpdate: ({ editor }) => {
      // Don't propagate changes triggered by programmatic setContent or initial load
      if (isSettingContentRef.current) return;
      onChangeRef.current(editor.getHTML());
    },
  });

  // After editor initializes, release the guard after a safe delay
  useEffect(() => {
    if (editor && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // Keep guard up for 500ms after initial mount to block all hydration-triggered onUpdate events
      setTimeout(() => {
        isSettingContentRef.current = false;
      }, 500);
    }
  }, [editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(isAdmin && isEditing);
    }
  }, [editor, isAdmin, isEditing]);

  // Sync content from parent state to editor, but guard against triggering onChange
  // This only fires when content prop changes AFTER initialization (e.g., template load)
  useEffect(() => {
    if (editor && hasInitializedRef.current && content) {
      const currentContent = editor.getHTML();
      if (currentContent !== content) {
        isSettingContentRef.current = true;
        editor.commands.setContent(content);
        // Use longer timeout to ensure ALL TipTap async onUpdate events have fired
        setTimeout(() => {
          isSettingContentRef.current = false;
        }, 500);
      }
    }
  }, [editor, content]);

  return (
    <div>
      {isAdmin && isEditing && <ProgramToolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className={cn(
          "prose prose-sm max-w-none p-4",
          "[&_.tiptap]:outline-none [&_.tiptap]:min-h-[300px]",
          "[&_.tiptap_h1]:text-2xl [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:mb-2 [&_.tiptap_h1]:mt-6 [&_.tiptap_h1]:text-gray-900",
          "[&_.tiptap_h2]:text-xl [&_.tiptap_h2]:font-semibold [&_.tiptap_h2]:mb-2 [&_.tiptap_h2]:mt-5 [&_.tiptap_h2]:text-blue-600 [&_.tiptap_h2]:border-b [&_.tiptap_h2]:border-blue-200 [&_.tiptap_h2]:pb-1",
          "[&_.tiptap_h3]:text-lg [&_.tiptap_h3]:font-medium [&_.tiptap_h3]:mb-1 [&_.tiptap_h3]:mt-4 [&_.tiptap_h3]:text-gray-700",
          "[&_.tiptap_p]:mb-2 [&_.tiptap_p]:text-gray-600",
          "[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ul]:mb-2",
          "[&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6 [&_.tiptap_ol]:mb-2",
          "[&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-blue-300 [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:italic [&_.tiptap_blockquote]:text-gray-500",
          "[&_.tiptap_a]:text-blue-600 [&_.tiptap_a]:underline",
          "[&_.tiptap_.is-editor-empty]:before:content-[attr(data-placeholder)] [&_.tiptap_.is-editor-empty]:before:text-gray-400 [&_.tiptap_.is-editor-empty]:before:float-left [&_.tiptap_.is-editor-empty]:before:pointer-events-none"
        )}
      />
    </div>
  );
}

// ── Guidelines tab: reads/writes client_protocol_requirements ──
function GuidelinesTabContent({
  clientProtocolId,
  isAdmin,
  isEditing,
}: {
  clientProtocolId: number;
  isAdmin: boolean;
  isEditing: boolean;
}) {
  const utils = trpc.useUtils();
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const { data: items = [], isLoading } = trpc.requirements.listForProtocol.useQuery({ clientProtocolId });
  const addMutation = trpc.requirements.addToProtocol.useMutation({
    onSuccess: () => utils.requirements.listForProtocol.invalidate({ clientProtocolId }),
  });
  const updateMutation = trpc.requirements.updateInProtocol.useMutation({
    onSuccess: () => { utils.requirements.listForProtocol.invalidate({ clientProtocolId }); setEditingId(null); },
  });
  const removeMutation = trpc.requirements.removeFromProtocol.useMutation({
    onSuccess: () => utils.requirements.listForProtocol.invalidate({ clientProtocolId }),
  });
  const seedMutation = trpc.requirements.seedFromDefaults.useMutation({
    onSuccess: (data) => {
      utils.requirements.listForProtocol.invalidate({ clientProtocolId });
      toast.success(data.seeded > 0 ? `Loaded ${data.seeded} default guidelines` : data.message);
    },
  });

  const handleAdd = async () => {
    if (!newText.trim()) return;
    await addMutation.mutateAsync({ clientProtocolId, text: newText.trim() });
    setNewText("");
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || editingId === null) return;
    await updateMutation.mutateAsync({ id: editingId, text: editText.trim() });
  };

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading guidelines...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isAdmin && isEditing
            ? "Add, edit, or remove guidelines for this client."
            : "Guidelines and recommendations for this protocol."}
        </p>
        {isAdmin && isEditing && items.length === 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => seedMutation.mutate({ clientProtocolId })}
            disabled={seedMutation.isPending}
          >
            {seedMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Load Defaults
          </Button>
        )}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          {isAdmin && isEditing ? 'No guidelines yet. Add one below or click "Load Defaults".' : "No guidelines configured for this protocol."}
        </p>
      )}

      <ul className="space-y-2">
        {items.map((item: any) => (
          <li key={item.id} className="flex items-start gap-3 group">
            <CheckSquare className="h-4 w-4 text-green-500 shrink-0 mt-1" />
            {isAdmin && isEditing && editingId === item.id ? (
              <div className="flex-1 flex gap-2">
                <Input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingId(null); }}
                  className="h-7 text-sm"
                  autoFocus
                />
                <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
              </div>
            ) : (
              <>
                <span
                  className={`flex-1 text-sm ${isAdmin && isEditing ? "cursor-pointer hover:text-blue-600" : ""}`}
                  onClick={() => { if (isAdmin && isEditing) { setEditingId(item.id); setEditText(item.text); } }}
                >
                  {item.text}
                </span>
                {isAdmin && isEditing && (
                  <button
                    onClick={() => removeMutation.mutate({ id: item.id })}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      {isAdmin && isEditing && (
        <div className="flex gap-2 pt-2 border-t">
          <Input
            placeholder="Add a new guideline..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            className="h-8 text-sm"
          />
          <Button size="sm" className="h-8 gap-1 px-3" onClick={handleAdd} disabled={!newText.trim() || addMutation.isPending}>
            {addMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

interface CompleteProgramGuideProps {
  clientProtocolId: number;
  isAdmin?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function CompleteProgramGuide({
  clientProtocolId,
  isAdmin = false,
  isCollapsed: externalCollapsed,
  onToggleCollapse,
}: CompleteProgramGuideProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("training_split");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [tabContents, setTabContents] = useState<Record<string, string>>({});
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabContentsRef = useRef<Record<string, string>>({});
  const isHydratingRef = useRef(true); // Prevent autosave during initial content load
  const hasHydratedOnceRef = useRef(false); // Only hydrate from server data once
  const userHasEditedRef = useRef(false); // Only autosave after user actually types
  const lastHydratedContentRef = useRef<string>(""); // Track hydrated content to detect template loads

  const collapsed = externalCollapsed !== undefined ? externalCollapsed : isCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setIsCollapsed(!isCollapsed));

  // Warn user when navigating away with unsaved changes
  useUnsavedChangesWarning(hasChanges && isEditing, 'You have unsaved changes in the Program Guide. Are you sure you want to leave?');

  const { data: sectionData, isLoading } = trpc.protocolSections.get.useQuery({
    clientProtocolId,
    sectionType: "program_guide",
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
      
      if ((!hasHydratedOnceRef.current || isTemplateLoad) && content.tabs) {
        isHydratingRef.current = true;
        setTabContents(content.tabs);
        lastHydratedContentRef.current = contentFingerprint;
        hasHydratedOnceRef.current = true;
        if (isTemplateLoad) {
          userHasEditedRef.current = false; // Reset since this is a fresh template
        }
        // Use longer timeout to ensure all React state updates flush
        setTimeout(() => {
          isHydratingRef.current = false;
          setHasChanges(false);
        }, 500);
      } else if (!content.tabs && !hasHydratedOnceRef.current) {
        isHydratingRef.current = false;
      }
    } else if (!sectionData?.content) {
      setTimeout(() => {
        isHydratingRef.current = false;
      }, 500);
    }
  }, [sectionData]);

  // Keep ref in sync with state for autosave
  useEffect(() => {
    tabContentsRef.current = tabContents;
  }, [tabContents]);

  const autosaveRetryRef = useRef(0);
  const MAX_AUTOSAVE_RETRIES = 2;
  const autosaveBackoffRef = useRef(2000);

  const handleTabContentChange = useCallback((html: string) => {
    setTabContents((prev) => ({ ...prev, [activeTab]: html }));
    // Skip autosave during hydration (initial content load)
    if (isHydratingRef.current) return;
    // Mark that user has actually edited content
    userHasEditedRef.current = true;
    setHasChanges(true);
    // Debounced autosave - 5 second delay to reduce server load
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      doAutosave();
    }, 5000);
  }, [activeTab]);

  const doAutosave = useCallback(async () => {
    const currentContents = tabContentsRef.current;
    if (!currentContents || Object.keys(currentContents).length === 0) return;
    // Don't autosave if user hasn't actually edited anything
    if (!userHasEditedRef.current) return;
    setIsSaving(true);
    try {
      await upsertMutation.mutateAsync({
        clientProtocolId,
        sectionType: "program_guide",
        content: { tabs: currentContents },
        isEnabled: true,
      });
      setHasChanges(false);
      setLastSaved(new Date());
      autosaveRetryRef.current = 0;
    } catch (error: any) {
      console.error("Autosave failed:", error);
      const msg = error?.message || '';
      const isRateLimit = msg.includes('Too many requests') || msg.includes('429');
      const isPayloadError = msg.includes('payload') || msg.includes('too large') || msg.includes('PAYLOAD_TOO_LARGE');

      if (isPayloadError) {
        toast.error("Content is too large to save. Try reducing the content size.");
      } else if (autosaveRetryRef.current < MAX_AUTOSAVE_RETRIES) {
        autosaveRetryRef.current++;
        const delay = isRateLimit ? 10000 : 3000 * autosaveRetryRef.current;
        console.log(`[ProgramGuide] Retrying autosave in ${delay}ms (attempt ${autosaveRetryRef.current})...`);
        autosaveTimerRef.current = setTimeout(() => doAutosave(), delay);
      } else {
        autosaveRetryRef.current = 0;
        autosaveBackoffRef.current = Math.min(autosaveBackoffRef.current * 2, 15000);
        toast.error("Auto-save failed. Click Save All to retry.");
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
        if (userHasEditedRef.current && !isHydratingRef.current && Object.keys(tabContentsRef.current).length > 0) {
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
      await upsertMutation.mutateAsync({
        clientProtocolId,
        sectionType: "program_guide",
        content: { tabs: tabContents },
        isEnabled: true,
      });
      utils.protocolSections.get.invalidate({ clientProtocolId, sectionType: "program_guide" });
      setHasChanges(false);
      setLastSaved(new Date());
      toast.success("Program guide saved");
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('payload') || msg.includes('too large')) {
        toast.error("Content is too large to save. Try reducing the content size.");
      } else {
        toast.error("Failed to save program guide. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [clientProtocolId, tabContents, upsertMutation, utils]);

  if (isLoading) {
    return (
      <div className="border rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm border-blue-200">
      {/* Header */}
      <button
        onClick={toggleCollapse}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-600">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-lg">Complete Program Guide</h3>
            <p className="text-sm text-muted-foreground">
              Training, nutrition, recovery, neuroplastics, lifestyle & mindset protocols
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {PROGRAM_TABS.length} sections
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
        <div className="border-t">
          {/* Action buttons */}
          {isAdmin && (
            <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b">
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="gap-2"
              >
                {isEditing ? <Eye className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                {isEditing ? "Preview" : "Edit Content"}
              </Button>
              {isEditing && (
                <Button onClick={handleSave} disabled={isSaving || !hasChanges} size="sm" className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save All
                </Button>
              )}
            </div>
          )}

          {/* Tab bar */}
          <div ref={tabScrollRef} className="flex overflow-x-auto border-b bg-muted/10 scrollbar-hide">
            {PROGRAM_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0",
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600 bg-blue-50/50"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="min-h-[400px]">
            {activeTab === "guidelines" ? (
              <GuidelinesTabContent
                clientProtocolId={clientProtocolId}
                isAdmin={isAdmin}
                isEditing={isEditing}
              />
            ) : (
              <TabContentEditor
                key={activeTab}
                tabId={activeTab as Exclude<TabId, "guidelines">}
                content={tabContents[activeTab] || ""}
                isAdmin={isAdmin}
                isEditing={isEditing}
                onChange={handleTabContentChange}
              />
            )}
          </div>

          {/* Save footer for admin */}
          {isAdmin && isEditing && (
            <div className="flex items-center justify-between border-t p-3 bg-muted/20">
              <SaveStatusIndicator isSaving={isSaving} hasChanges={hasChanges} lastSaved={lastSaved} />
              <Button onClick={handleSave} disabled={isSaving || !hasChanges} size="sm" className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save All
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
