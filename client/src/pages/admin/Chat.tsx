import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { processMessageForDisplay } from "@/lib/htmlUtils";
import ChatRichTextEditor, { type ChatEditorHandle } from "@/components/ChatRichTextEditor";
import {
  ArrowLeft, Send, User, Video, Loader2, ExternalLink,
  Phone, Mail, MoreVertical, Check, CheckCheck, Circle
} from "lucide-react";
import { formatMT, formatDistanceToNowMT, getDateLabelMT, isSameDayMT } from "@/lib/timezone";
import { useLocation, useParams } from "wouter";

interface Comment {
  id: number;
  clientProtocolId: number;
  authorType: "coach" | "client";
  authorName: string | null;
  message: string;
  loomUrl: string | null;
  isRead: boolean;
  createdAt: string | Date;
}

interface ClientProtocol {
  id: number;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  status: string;
  clientVisibility: string;
}

// ── Strip HTML helper ──
function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

// ── Date group label (Mountain Time) ──
function getDateLabel(dateStr: string): string {
  return getDateLabelMT(dateStr);
}

export default function AdminChat() {
  const params = useParams<{ id: string }>();
  const clientProtocolId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const [showLoomInput, setShowLoomInput] = useState(false);
  const [loomUrl, setLoomUrl] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ChatEditorHandle>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Fetch client protocol info
  const { data: protocol, isLoading: protocolLoading } = trpc.clientProtocol.get.useQuery(
    { id: clientProtocolId },
    { enabled: clientProtocolId > 0 }
  );

  // Fetch comments
  const { data: comments = [], isLoading: commentsLoading, refetch } = trpc.comments.list.useQuery(
    { clientProtocolId },
    { enabled: clientProtocolId > 0, refetchInterval: 15000 }
  );

  // Mark as read mutation
  const markReadMutation = trpc.comments.markRead.useMutation();

  // Create comment mutation
  const createCommentMutation = trpc.comments.create.useMutation({
    onSuccess: () => {
      editorRef.current?.clear();
      setLoomUrl("");
      setShowLoomInput(false);
      refetch();
    },
  });

  // Mark client messages as read when opening
  useEffect(() => {
    if (clientProtocolId > 0 && (comments as Comment[]).some(c => c.authorType === "client" && !c.isRead)) {
      markReadMutation.mutate({ clientProtocolId, authorType: "client" });
    }
  }, [clientProtocolId, comments]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments, isAtBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!commentsLoading && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
    }
  }, [commentsLoading]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 100;
    setIsAtBottom(container.scrollHeight - container.scrollTop - container.clientHeight < threshold);
  }, []);

  const handleSend = useCallback(() => {
    if (!editorRef.current || editorRef.current.isEmpty()) return;
    const html = editorRef.current.getHTML();
    if (!html) return;
    createCommentMutation.mutate({
      clientProtocolId,
      authorType: "coach",
      authorName: "Coach",
      message: html,
      loomUrl: loomUrl.trim() || undefined,
    });
  }, [loomUrl, clientProtocolId, createCommentMutation]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; label: string; messages: Comment[] }[] = [];
    (comments as Comment[]).forEach((msg) => {
      const dateStr = typeof msg.createdAt === 'string' ? msg.createdAt : msg.createdAt.toISOString();
      const label = getDateLabel(dateStr);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.label === label) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ date: dateStr, label, messages: [msg] });
      }
    });
    return groups;
  }, [comments]);

  const clientName = (protocol as ClientProtocol)?.clientName || "Client";
  const clientEmail = (protocol as ClientProtocol)?.clientEmail || "";
  const clientPhone = (protocol as ClientProtocol)?.clientPhone || "";

  // Fetch client last seen
  const { data: lastSeenData } = trpc.inbox.clientLastSeen.useQuery(
    { clientEmail },
    { enabled: !!clientEmail, refetchInterval: 30000 }
  );

  // Format last seen status
  const lastSeenStatus = useMemo(() => {
    if (!lastSeenData?.lastSeenAt) return null;
    const lastSeen = new Date(lastSeenData.lastSeenAt);
    const diffMs = Date.now() - lastSeen.getTime();
    const diffMin = diffMs / 60000;
    if (diffMin < 5) return { text: "Online", isOnline: true };
    return { text: `Last seen ${formatDistanceToNowMT(lastSeen, { addSuffix: true })}`, isOnline: false };
  }, [lastSeenData]);
  const initials = clientName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  if (protocolLoading || commentsLoading) {
    return (
      <AdminLayout>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header skeleton */}
        <div className="bg-white border-b px-3 py-3 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        {/* Messages skeleton */}
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
              <Skeleton className={`h-16 rounded-2xl ${i % 2 === 0 ? "w-2/3" : "w-1/2"}`} />
            </div>
          ))}
        </div>
      </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
    <div className="h-[100dvh] flex flex-col bg-gray-100">
      {/* ── Chat Header ── */}
      <div className="bg-white border-b border-gray-200 px-2 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 shadow-sm flex-shrink-0 z-10">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/admin/inbox")}
          className="h-9 w-9 p-0 flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
          {initials}
        </div>

        {/* Client info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
            {clientName}
          </h1>
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] sm:text-xs text-gray-500 truncate">
              {clientEmail || "No email"}
              {clientPhone && ` • ${clientPhone}`}
            </p>
          </div>
          {lastSeenStatus && (
            <div className="flex items-center gap-1">
              <Circle className={`h-2 w-2 fill-current ${lastSeenStatus.isOnline ? 'text-green-500' : 'text-gray-400'}`} />
              <span className={`text-[10px] ${lastSeenStatus.isOnline ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                {lastSeenStatus.text}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {clientPhone && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hidden sm:flex"
              onClick={() => window.open(`tel:${clientPhone}`)}
            >
              <Phone className="h-4 w-4 text-gray-500" />
            </Button>
          )}
          {clientEmail && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hidden sm:flex"
              onClick={() => window.open(`mailto:${clientEmail}`)}
            >
              <Mail className="h-4 w-4 text-gray-500" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            onClick={() => setLocation(`/admin/clients/${clientProtocolId}`)}
          >
            <ExternalLink className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Profile</span>
          </Button>
        </div>
      </div>

      {/* ── Messages Area ── */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-1"
        style={{ overscrollBehavior: "contain" }}
      >
        {(comments as Comment[]).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-base font-medium">No messages yet</p>
            <p className="text-sm mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <span className="bg-gray-200/80 text-gray-600 text-[11px] font-medium px-3 py-1 rounded-full">
                  {group.label}
                </span>
              </div>

              {/* Messages in this group */}
              {group.messages.map((msg, idx) => {
                const isCoach = msg.authorType === "coach";
                const isConsecutive = idx > 0 && group.messages[idx - 1].authorType === msg.authorType;
                const timeStr = formatMT(msg.createdAt, "h:mm a");

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCoach ? "justify-end" : "justify-start"} ${
                      isConsecutive ? "mt-0.5" : "mt-3"
                    }`}
                  >
                    {/* Client avatar (only for first in sequence) */}
                    {!isCoach && !isConsecutive && (
                      <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-[10px] font-semibold mr-1.5 mt-1 flex-shrink-0">
                        {initials}
                      </div>
                    )}
                    {!isCoach && isConsecutive && (
                      <div className="w-7 mr-1.5 flex-shrink-0" />
                    )}

                    <div className={`max-w-[80%] sm:max-w-[65%]`}>
                      {/* Author name (only for first in sequence from client) */}
                      {!isCoach && !isConsecutive && (
                        <p className="text-[10px] text-gray-500 mb-0.5 ml-1">
                          {msg.authorName || clientName}
                        </p>
                      )}

                      {/* Message bubble */}
                      <div
                        className={`px-3 py-2 ${
                          isCoach
                            ? `bg-orange-500 text-white ${isConsecutive ? "rounded-2xl rounded-tr-md" : "rounded-2xl rounded-tr-sm"}`
                            : `bg-white text-gray-900 shadow-sm ${isConsecutive ? "rounded-2xl rounded-tl-md" : "rounded-2xl rounded-tl-sm"}`
                        }`}
                      >
                        {/* Message text - supports both rich HTML and legacy plain text */}
                        <div
                          className={`text-[13px] sm:text-sm leading-relaxed break-words whitespace-pre-wrap
                            [&_p]:my-0.5 [&_br]:block
                            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
                            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
                            [&_li]:my-0
                            [&_strong]:font-bold [&_em]:italic [&_u]:underline [&_s]:line-through
                            ${isCoach
                              ? "prose-invert [&_a]:text-blue-200 [&_a]:underline"
                              : "[&_a]:text-blue-600 [&_a]:underline"
                            }`}
                          dangerouslySetInnerHTML={{
                            __html: processMessageForDisplay(msg.message, isCoach),
                          }}
                        />

                        {/* Loom video */}
                        {msg.loomUrl && (
                          <div className="mt-2">
                            <div className="aspect-video rounded-lg overflow-hidden bg-gray-900 max-w-[300px]">
                              <iframe
                                src={msg.loomUrl.replace("loom.com/share", "loom.com/embed")}
                                frameBorder="0"
                                allowFullScreen
                                className="w-full h-full"
                              />
                            </div>
                          </div>
                        )}

                        {/* Time + read status */}
                        <div className={`flex items-center gap-1 mt-1 ${
                          isCoach ? "justify-end" : "justify-start"
                        }`}>
                          <span className={`text-[10px] ${
                            isCoach ? "text-orange-200" : "text-gray-400"
                          }`}>
                            {timeStr}
                          </span>
                          {isCoach && (
                            msg.isRead
                              ? <CheckCheck className="h-3 w-3 text-orange-200" />
                              : <Check className="h-3 w-3 text-orange-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* ── Scroll to bottom indicator ── */}
      {!isAtBottom && (comments as Comment[]).length > 0 && (
        <div className="absolute bottom-24 right-4 sm:right-8 z-20">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full h-10 w-10 p-0 shadow-lg bg-white border"
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            <ArrowLeft className="h-4 w-4 rotate-[-90deg]" />
          </Button>
        </div>
      )}

      {/* ── Message Input ── */}
      <div className="bg-white border-t border-gray-200 px-2 sm:px-4 py-2 flex-shrink-0 safe-area-bottom">
        {/* Loom URL input */}
        {showLoomInput && (
          <div className="mb-2 flex items-center gap-2">
            <Video className="h-4 w-4 text-purple-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Paste Loom video URL..."
              value={loomUrl}
              onChange={(e) => setLoomUrl(e.target.value)}
              className="flex-1 text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setShowLoomInput(false); setLoomUrl(""); }}
            >
              Cancel
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Loom toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-9 w-9 p-0 flex-shrink-0 ${showLoomInput ? "text-purple-500" : "text-gray-400"}`}
            onClick={() => setShowLoomInput(!showLoomInput)}
          >
            <Video className="h-5 w-5" />
          </Button>

          {/* Rich Text Editor */}
          <div className="flex-1">
            <ChatRichTextEditor
              ref={editorRef}
              placeholder="Type a message..."
              disabled={createCommentMutation.isPending}
              onSubmit={handleSend}
            />
          </div>

          {/* Send button */}
          <Button
            size="sm"
            onClick={handleSend}
            disabled={createCommentMutation.isPending}
            className="h-9 w-9 p-0 rounded-full bg-orange-500 hover:bg-orange-600 flex-shrink-0 disabled:opacity-40"
          >
            {createCommentMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Keyboard shortcut hint - desktop only */}
        <p className="text-[10px] text-gray-400 text-center mt-1 hidden sm:block">
          Ctrl+Enter to send • Paste from Word supported • Messages auto-refresh every 15s
        </p>
      </div>
    </div>
    </AdminLayout>
  );
}
