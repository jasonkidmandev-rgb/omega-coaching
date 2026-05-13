import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Undo, Redo, Strikethrough } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  minHeight?: string;
  debounceMs?: number;
  onAutoSave?: (content: string) => void;
  autoSaveIndicator?: 'saving' | 'saved' | 'idle';
}

// Toolbar button component
function ToolbarButton({
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
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );
}

// Toolbar component
function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // Add https:// if no protocol specified
    const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-1 border-b p-2 bg-muted/30">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      <ToolbarButton
        onClick={setLink}
        isActive={editor.isActive('link')}
        title="Add Link"
      >
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
      
      <div className="w-px h-6 bg-border mx-1" />
      
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  className,
  editable = true,
  minHeight = '200px',
  debounceMs = 1000,
  onAutoSave,
  autoSaveIndicator = 'idle',
}: RichTextEditorProps) {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef(content);
  // Track whether the content change came from the editor (user typing) vs external prop
  const isInternalUpdateRef = useRef(false);
  // Store the latest onChange ref to avoid stale closures
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Disable headings for notes
        link: false, // Use standalone Link with custom config
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none p-4',
          'prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0',
          '[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6',
          '[&_a]:text-primary [&_a]:underline'
        ),
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Mark this as an internal update so the useEffect doesn't re-set content
      isInternalUpdateRef.current = true;
      onChangeRef.current(html);
      
      // Auto-save with debounce
      if (onAutoSave && html !== lastSavedContentRef.current) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          onAutoSave(html);
          lastSavedContentRef.current = html;
        }, debounceMs);
      }
    },
  });

  // Update editor content ONLY when prop changes from external source (e.g., server restore, initial load)
  // Skip if the change came from the editor itself (user typing)
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      // Reset the flag - this change came from the editor, don't re-set content
      isInternalUpdateRef.current = false;
      return;
    }
    
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
      lastSavedContentRef.current = content;
    }
  }, [content, editor]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={cn('border rounded-md overflow-hidden bg-background', className)}>
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
      {onAutoSave && (
        <div className="flex items-center justify-end px-3 py-1.5 border-t bg-muted/30 text-xs text-muted-foreground">
          {autoSaveIndicator === 'saving' && (
            <span className="flex items-center gap-1">
              <span className="animate-pulse">●</span> Saving...
            </span>
          )}
          {autoSaveIndicator === 'saved' && (
            <span className="flex items-center gap-1 text-green-600">
              ✓ Saved
            </span>
          )}
          {autoSaveIndicator === 'idle' && (
            <span>Auto-save enabled</span>
          )}
        </div>
      )}
    </div>
  );
}

// Export a simple hook for using the editor
export function useRichTextEditor(initialContent: string) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false, // Use standalone Link with custom config
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: initialContent,
  });

  return editor;
}
