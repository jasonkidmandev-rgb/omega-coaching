import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Link as LinkIcon, Strikethrough,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Compact toolbar button ──
function TBtn({
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
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={cn(
        'h-7 w-7 flex items-center justify-center rounded transition-colors',
        isActive ? 'bg-orange-100 text-orange-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
        disabled && 'opacity-30 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}

// ── Mini toolbar for chat ──
function ChatToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
  }, [editor]);

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-200 bg-gray-50/80">
      <TBtn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold (Ctrl+B)">
        <Bold className="h-3.5 w-3.5" />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic (Ctrl+I)">
        <Italic className="h-3.5 w-3.5" />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline (Ctrl+U)">
        <UnderlineIcon className="h-3.5 w-3.5" />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough">
        <Strikethrough className="h-3.5 w-3.5" />
      </TBtn>
      <div className="w-px h-4 bg-gray-300 mx-1" />
      <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
        <List className="h-3.5 w-3.5" />
      </TBtn>
      <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Numbered List">
        <ListOrdered className="h-3.5 w-3.5" />
      </TBtn>
      <div className="w-px h-4 bg-gray-300 mx-1" />
      <TBtn onClick={setLink} isActive={editor.isActive('link')} title="Add Link">
        <LinkIcon className="h-3.5 w-3.5" />
      </TBtn>
    </div>
  );
}

// ── Public handle for parent to call getHTML / clear ──
export interface ChatEditorHandle {
  getHTML: () => string;
  getText: () => string;
  clear: () => void;
  isEmpty: () => boolean;
  focus: () => void;
}

interface ChatRichTextEditorProps {
  placeholder?: string;
  disabled?: boolean;
  onSubmit?: () => void;          // Ctrl+Enter fires this
  className?: string;
}

const ChatRichTextEditor = forwardRef<ChatEditorHandle, ChatRichTextEditorProps>(
  ({ placeholder = 'Type a message...', disabled = false, onSubmit, className }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          code: false,
          blockquote: false,
          horizontalRule: false,
          // Disable built-in link and underline to use standalone with custom config
          link: false,
          underline: false,
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-blue-600 underline cursor-pointer',
          },
        }),
        Placeholder.configure({ placeholder }),
      ],
      editable: !disabled,
      editorProps: {
        attributes: {
          class: cn(
            'focus:outline-none px-3 py-2 text-sm leading-relaxed min-h-[40px] max-h-[150px] overflow-y-auto',
            'prose prose-sm max-w-none',
            'prose-p:my-0.5 prose-ul:my-1 prose-ol:my-1 prose-li:my-0',
            '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
            '[&_a]:text-blue-600 [&_a]:underline',
            '[&_p.is-editor-empty:first-child::before]:text-gray-400 [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:h-0'
          ),
        },
        handleKeyDown: (_view, event) => {
          // Ctrl+Enter or Cmd+Enter to send
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onSubmit?.();
            return true;
          }
          return false;
        },
        // Handle Word paste - TipTap's StarterKit already handles paste cleanup
        // but we add extra handling for Word-specific junk
        handlePaste: (_view, event) => {
          const html = event.clipboardData?.getData('text/html');
          if (html && (html.includes('urn:schemas-microsoft-com') || html.includes('mso-') || html.includes('MsoNormal'))) {
            // Let TipTap handle it - StarterKit already strips Word junk
            // The default paste handler will clean up the HTML
            return false;
          }
          return false;
        },
      },
    });

    // Expose handle to parent
    useImperativeHandle(ref, () => ({
      getHTML: () => {
        if (!editor) return '';
        const html = editor.getHTML();
        // Return empty string if editor only has empty paragraph
        if (html === '<p></p>' || html === '') return '';
        return html;
      },
      getText: () => editor?.getText() || '',
      clear: () => {
        editor?.commands.clearContent();
      },
      isEmpty: () => {
        if (!editor) return true;
        return editor.isEmpty;
      },
      focus: () => {
        editor?.commands.focus();
      },
    }), [editor]);

    // Update editable state
    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled);
      }
    }, [disabled, editor]);

    return (
      <div className={cn(
        'rounded-2xl bg-gray-100 border border-transparent focus-within:ring-1 focus-within:ring-orange-500 overflow-hidden transition-all',
        disabled && 'opacity-50',
        className
      )}>
        <ChatToolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
    );
  }
);

ChatRichTextEditor.displayName = 'ChatRichTextEditor';
export default ChatRichTextEditor;
