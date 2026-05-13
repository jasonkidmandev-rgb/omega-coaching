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
  ClipboardList,
  Save,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { SaveStatusIndicator } from "@/components/SaveStatusIndicator";

const DEFAULT_PERIODIZATION_CONTENT = `
<h2>Overview</h2>
<p></p>
<h2>Bloodwork Recommendations</h2>
<p></p>
<h2>Primary and Secondary Goals</h2>
<p></p>
<h2>Short Term Goals</h2>
<p></p>
<h2>Long Term Goals</h2>
<p></p>
<h2>Upcoming Dates (if applicable)</h2>
<p></p>
<h2>Baseline Hormone Optimization</h2>
<p></p>
<h2>Assessment of Current Bloodwork, Scans, Health Review, and Testing History</h2>
<p></p>
`.trim();

// Enhanced Toolbar for the periodization editor
function PeriodizationToolbar({ editor }: { editor: Editor | null }) {
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
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1.5 rounded-t-md">
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarBtn>
      <div className="w-px h-6 bg-border mx-1" />
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Underline"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarBtn>
      <div className="w-px h-6 bg-border mx-1" />
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Blockquote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarBtn>
      <div className="w-px h-6 bg-border mx-1" />
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarBtn>
      <div className="w-px h-6 bg-border mx-1" />
      <ToolbarBtn onClick={setLink} isActive={editor.isActive("link")} title="Link">
        <LinkIcon className="h-4 w-4" />
      </ToolbarBtn>
      <div className="w-px h-6 bg-border mx-1" />
      <ToolbarBtn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <Undo className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
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
    <Button
      type="button"
      variant={isActive ? "secondary" : "ghost"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-7 w-7 p-0"
    >
      {children}
    </Button>
  );
}

interface PeriodizationOverviewProps {
  clientProtocolId: number;
  isAdmin?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function PeriodizationOverview({
  clientProtocolId,
  isAdmin = false,
  isCollapsed: externalCollapsed,
  onToggleCollapse,
}: PeriodizationOverviewProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const contentRef = useRef<string>("");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHydratingRef = useRef(true); // Prevent autosave during initial content load
  const hasHydratedOnceRef = useRef(false); // Only hydrate from server data once
  const userHasEditedRef = useRef(false); // Only autosave after user actually types
  const lastHydratedContentRef = useRef<string>(""); // Track what content we hydrated to detect template loads

  const collapsed = externalCollapsed !== undefined ? externalCollapsed : isCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setIsCollapsed(!isCollapsed));

  // Warn user when navigating away with unsaved changes
  useUnsavedChangesWarning(hasChanges && isAdmin, 'You have unsaved changes in the Periodization Overview. Are you sure you want to leave?');

  // Fetch section data
  const { data: sectionData, isLoading } = trpc.protocolSections.get.useQuery({
    clientProtocolId,
    sectionType: "periodization",
  });

  const upsertMutation = trpc.protocolSections.upsert.useMutation();
  const utils = trpc.useUtils();

  const sectionContent = sectionData?.content as { html?: string } | null;
  const initialContent = sectionContent?.html || DEFAULT_PERIODIZATION_CONTENT;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({ openOnClick: false }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: "Add your periodization notes here...",
      }),
    ],
    content: initialContent,
    editable: isAdmin,
    onUpdate: ({ editor }) => {
      contentRef.current = editor.getHTML();
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
    },
  });

  // Update editor content when data loads - only on FIRST load, not background refetches
  // BUT also detect template loads (server content changed significantly)
  useEffect(() => {
    if (editor && sectionContent?.html) {
      const serverHtml = sectionContent.html;
      const isTemplateLoad = hasHydratedOnceRef.current && serverHtml !== lastHydratedContentRef.current;
      
      if (!hasHydratedOnceRef.current || isTemplateLoad) {
        isHydratingRef.current = true;
        editor.commands.setContent(serverHtml);
        contentRef.current = serverHtml;
        lastHydratedContentRef.current = serverHtml;
        hasHydratedOnceRef.current = true;
        if (isTemplateLoad) {
          userHasEditedRef.current = false; // Reset since this is a fresh template
        }
        // Use a longer timeout to ensure TipTap's onUpdate has fired and been ignored
        setTimeout(() => {
          isHydratingRef.current = false;
          setHasChanges(false);
        }, 500);
      }
    } else if (editor && !sectionContent?.html) {
      // No server content yet, mark hydration complete after initial render
      setTimeout(() => {
        isHydratingRef.current = false;
      }, 500);
    }
  }, [editor, sectionData]);

  // Set editable based on admin status
  useEffect(() => {
    if (editor) {
      editor.setEditable(isAdmin);
    }
  }, [editor, isAdmin]);

  const autosaveRetryRef = useRef(0);
  const MAX_AUTOSAVE_RETRIES = 2;
  const autosaveBackoffRef = useRef(2000); // Start with 2s debounce

  const doAutosave = useCallback(async () => {
    if (!contentRef.current) return;
    // Don't autosave if user hasn't actually edited anything
    if (!userHasEditedRef.current) return;
    setIsSaving(true);
    try {
      await upsertMutation.mutateAsync({
        clientProtocolId,
        sectionType: "periodization",
        content: { html: contentRef.current },
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
        // Exponential backoff: 3s, 6s, 12s...
        const delay = isRateLimit ? 10000 : 3000 * autosaveRetryRef.current;
        console.log(`[Periodization] Retrying autosave in ${delay}ms (attempt ${autosaveRetryRef.current})...`);
        autosaveTimerRef.current = setTimeout(() => doAutosave(), delay);
      } else {
        autosaveRetryRef.current = 0;
        // Increase debounce time to reduce request frequency
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
        if (userHasEditedRef.current && !isHydratingRef.current && contentRef.current) {
          doAutosave();
        }
      }
    };
  }, [doAutosave]);

  const handleSave = useCallback(async () => {
    if (!contentRef.current) return;
    // Cancel any pending autosave
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setIsSaving(true);
    try {
      await upsertMutation.mutateAsync({
        clientProtocolId,
        sectionType: "periodization",
        content: { html: contentRef.current },
        isEnabled: true,
      });
      utils.protocolSections.get.invalidate({ clientProtocolId, sectionType: "periodization" });
      setHasChanges(false);
      setLastSaved(new Date());
      toast.success("Periodization overview saved");
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('payload') || msg.includes('too large')) {
        toast.error("Content is too large to save. Try reducing the content size.");
      } else {
        toast.error("Failed to save periodization overview. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [clientProtocolId, upsertMutation, utils]);

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
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 text-purple-600">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-lg">Periodization Overview</h3>
            <p className="text-sm text-muted-foreground">
              Custom notes, goals, bloodwork recommendations, and assessments
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            8 sections
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
          {isAdmin && (
            <PeriodizationToolbar editor={editor} />
          )}
          <div
            className={cn(
              "periodization-editor",
              isAdmin ? "min-h-[400px]" : "min-h-[200px]",
              !isAdmin && "pointer-events-none"
            )}
          >
            <EditorContent
              editor={editor}
              className={cn(
                "prose prose-sm max-w-none p-4",
                "[&_.tiptap]:outline-none [&_.tiptap]:min-h-[380px]",
                "[&_.tiptap_h1]:text-2xl [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:mb-2 [&_.tiptap_h1]:mt-6 [&_.tiptap_h1]:text-gray-900",
                "[&_.tiptap_h2]:text-xl [&_.tiptap_h2]:font-semibold [&_.tiptap_h2]:mb-2 [&_.tiptap_h2]:mt-5 [&_.tiptap_h2]:text-orange-600 [&_.tiptap_h2]:border-b [&_.tiptap_h2]:border-orange-200 [&_.tiptap_h2]:pb-1",
                "[&_.tiptap_h3]:text-lg [&_.tiptap_h3]:font-medium [&_.tiptap_h3]:mb-1 [&_.tiptap_h3]:mt-4 [&_.tiptap_h3]:text-gray-700",
                "[&_.tiptap_p]:mb-2 [&_.tiptap_p]:text-gray-600",
                "[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ul]:mb-2",
                "[&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6 [&_.tiptap_ol]:mb-2",
                "[&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-orange-300 [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:italic [&_.tiptap_blockquote]:text-gray-500",
                "[&_.tiptap_a]:text-blue-600 [&_.tiptap_a]:underline",
                "[&_.tiptap_.is-editor-empty]:before:content-[attr(data-placeholder)] [&_.tiptap_.is-editor-empty]:before:text-gray-400 [&_.tiptap_.is-editor-empty]:before:float-left [&_.tiptap_.is-editor-empty]:before:pointer-events-none"
              )}
            />
          </div>
          {isAdmin && (
            <div className="flex items-center justify-between border-t p-3 bg-muted/20">
              <SaveStatusIndicator isSaving={isSaving} hasChanges={hasChanges} lastSaved={lastSaved} />
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                size="sm"
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
