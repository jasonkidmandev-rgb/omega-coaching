import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MessageSquare, Send, Video, ExternalLink } from "lucide-react";
import ChatRichTextEditor, { type ChatEditorHandle } from "@/components/ChatRichTextEditor";
import { processMessageForDisplay } from "@/lib/htmlUtils";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { cn } from "@/lib/utils";

interface ClientChatPanelProps {
  clientProtocolId?: number;
  clientName?: string;
  accessToken?: string;
  className?: string;
}

/**
 * Same data (protocolComments via clientProtocolId) and send path as the
 * "Discussion" card on the client Protocol page — this is a second surface
 * for the same conversation, not a separate chat feature.
 */
export function ClientChatPanel({ clientProtocolId, clientName, accessToken, className }: ClientChatPanelProps) {
  const [, setLocation] = useLocation();
  const editorRef = useRef<ChatEditorHandle>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousLength = useRef<number | null>(null);
  const [loomUrl, setLoomUrl] = useState("");
  const [showLoomInput, setShowLoomInput] = useState(false);

  const { data: comments = [], refetch } = trpc.comments.list.useQuery(
    { clientProtocolId: clientProtocolId || 0 },
    { enabled: !!clientProtocolId, refetchInterval: 15000 }
  );

  const createMutation = trpc.comments.create.useMutation({
    onSuccess: () => refetch(),
    onError: (error) => toast.error(error.message),
  });

  const markReadMutation = trpc.comments.markRead.useMutation();

  useEffect(() => {
    if (clientProtocolId && comments.some((c: any) => c.authorType === 'coach' && !c.isRead)) {
      markReadMutation.mutate({ clientProtocolId, authorType: "client" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientProtocolId, comments.length]);

  useEffect(() => {
    // Scroll only the message list itself, not scrollIntoView() - that walks up
    // every scrollable ancestor (including the whole page) to bring the target
    // into view, which was dragging the page scroll along with every new message.
    if (previousLength.current !== null && comments.length > previousLength.current) {
      const el = messagesContainerRef.current;
      el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
    previousLength.current = comments.length;
  }, [comments.length]);

  const handleSend = () => {
    if (!clientProtocolId) return;
    const html = editorRef.current?.getHTML() || '';
    const text = editorRef.current?.getText() || '';
    if (!text.trim()) return;
    createMutation.mutate({
      clientProtocolId,
      authorType: "client",
      authorName: clientName || "You",
      message: html,
      loomUrl: loomUrl.trim() || undefined,
    });
    editorRef.current?.clear();
    setLoomUrl("");
    setShowLoomInput(false);
  };

  if (!clientProtocolId) {
    return (
      <div className={cn("flex flex-col items-center justify-center text-center p-6 h-full bg-white", className)}>
        <MessageSquare className="h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">
          Messages will appear here once your coach sets up your protocol.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-purple-500" />
          <span className="font-semibold text-gray-900 text-sm">Messages</span>
        </div>
        {accessToken && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500 hover:text-gray-900 h-7 px-2"
            onClick={() => setLocation(`/protocol/${accessToken}#comments`)}
          >
            Full view
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {comments.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">
            No messages yet. Say hello to your coach!
          </p>
        ) : (
          comments.map((comment: any) => (
            <div
              key={comment.id}
              className={cn(
                "p-3 rounded-lg text-sm",
                comment.authorType === "coach"
                  ? "bg-amber-50 border-l-2 border-amber-400"
                  : "bg-gray-50 border-l-2 border-gray-300"
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-medium text-gray-900 text-xs">
                  {comment.authorName || (comment.authorType === "coach" ? "Coach" : "You")}
                </span>
                <span className="text-[11px] text-gray-400">
                  {toLocaleDateStringMT(comment.createdAt, { month: "numeric", day: "numeric" })}
                </span>
              </div>
              <div
                className="text-sm prose prose-sm max-w-none whitespace-pre-wrap break-words [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:text-blue-600 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: processMessageForDisplay(comment.message, comment.authorType === 'coach') }}
              />
              {comment.loomUrl && (
                <div className="mt-2 aspect-video rounded-lg overflow-hidden bg-gray-900">
                  <iframe
                    src={comment.loomUrl.replace("loom.com/share", "loom.com/embed")}
                    frameBorder="0"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-gray-200 p-3 space-y-2 shrink-0">
        <ChatRichTextEditor
          ref={editorRef}
          placeholder="Type a message..."
          onSubmit={handleSend}
          disabled={createMutation.isPending}
        />
        {showLoomInput && (
          <Input
            placeholder="Paste Loom video URL (optional)"
            value={loomUrl}
            onChange={(e) => setLoomUrl(e.target.value)}
            className="text-sm"
          />
        )}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSend}
            disabled={createMutation.isPending}
            className="flex-1 bg-purple-500 hover:bg-purple-600"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Send
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 shrink-0"
            onClick={() => setShowLoomInput(!showLoomInput)}
            title="Add Loom video"
          >
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
