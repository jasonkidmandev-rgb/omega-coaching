import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MessageSquare, Search, Inbox as InboxIcon, CheckCheck,
  Send, RefreshCw, Mail, MailOpen, Video, Reply, X,
  Volume2, VolumeX, ExternalLink, Loader2
} from "lucide-react";
import { formatDistanceToNowMT } from "@/lib/timezone";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface Conversation {
  clientProtocolId: number;
  clientName: string;
  clientEmail: string | null;
  protocolStatus: string;
  clientVisibility: string;
  lastMessageId: number;
  lastMessage: string;
  lastAuthorType: "coach" | "client";
  lastAuthorName: string | null;
  lastMessageAt: string;
  lastLoomUrl: string | null;
  unreadCount: number;
  clientLastSeenAt: string | null;
}

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

// ── Notification sound using Web Audio API ──
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(880, now, 0.15);
    playTone(1174.66, now + 0.12, 0.2);
  } catch (e) {
    // Audio not available
  }
}

// ── Tab title flash hook ──
function useTabTitleFlash() {
  const originalTitle = useRef(document.title);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFlashing = useRef(false);

  const startFlash = useCallback((unreadCount: number) => {
    if (isFlashing.current) return;
    isFlashing.current = true;
    originalTitle.current = document.title.replace(/^\(\d+\) /, "");
    let showUnread = true;
    intervalRef.current = setInterval(() => {
      document.title = showUnread
        ? `(${unreadCount}) New Message! - ${originalTitle.current}`
        : originalTitle.current;
      showUnread = !showUnread;
    }, 1000);
  }, []);

  const stopFlash = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isFlashing.current = false;
    document.title = originalTitle.current;
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") stopFlash();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stopFlash();
    };
  }, [stopFlash]);

  return { startFlash, stopFlash };
}

// ── Strip HTML helper ──
function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export default function AdminInbox() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [expandedReply, setExpandedReply] = useState<number | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem("inbox-sound-enabled");
    return stored !== null ? stored === "true" : true;
  });

  const prevUnreadRef = useRef<number | null>(null);
  const { startFlash } = useTabTitleFlash();

  // Fetch conversations
  const { data: conversations, isLoading, refetch } = trpc.inbox.conversations.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  // Fetch total unread
  const { data: unreadData } = trpc.inbox.totalUnread.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  // Mark as read mutation
  const markReadMutation = trpc.inbox.markRead.useMutation({
    onSuccess: () => { refetch(); },
  });

  // Create comment mutation for inline reply
  const createCommentMutation = trpc.comments.create.useMutation({
    onSuccess: (_data, variables) => {
      setReplyTexts((prev) => ({ ...prev, [variables.clientProtocolId]: "" }));
      setExpandedReply(null);
      refetch();
      toast.success("Reply sent!");
    },
    onError: (error) => {
      toast.error(`Failed to send: ${error.message}`);
    },
  });

  // ── Notification detection ──
  const totalUnread = unreadData?.count || 0;

  useEffect(() => {
    if (prevUnreadRef.current !== null && totalUnread > prevUnreadRef.current) {
      if (soundEnabled) playNotificationSound();
      if (document.visibilityState === "hidden") startFlash(totalUnread);
      const diff = totalUnread - prevUnreadRef.current;
      toast.info(`${diff} new message${diff > 1 ? "s" : ""} received`, { duration: 4000 });
    }
    prevUnreadRef.current = totalUnread;
  }, [totalUnread, soundEnabled, startFlash]);

  useEffect(() => {
    localStorage.setItem("inbox-sound-enabled", String(soundEnabled));
  }, [soundEnabled]);

  const handleOpenConversation = useCallback((conv: Conversation) => {
    if (conv.unreadCount > 0) {
      markReadMutation.mutate({ clientProtocolId: conv.clientProtocolId });
    }
    setLocation(`/admin/chat/${conv.clientProtocolId}`);
  }, [markReadMutation, setLocation]);

  const handleMarkAllRead = useCallback((conv: Conversation) => {
    markReadMutation.mutate(
      { clientProtocolId: conv.clientProtocolId },
      { onSuccess: () => toast.success(`Marked messages from ${conv.clientName} as read`) }
    );
  }, [markReadMutation]);

  const handleToggleReply = useCallback((clientProtocolId: number) => {
    setExpandedReply((prev) => (prev === clientProtocolId ? null : clientProtocolId));
  }, []);

  const handleSendReply = useCallback((conv: Conversation) => {
    const text = replyTexts[conv.clientProtocolId]?.trim();
    if (!text) return;
    createCommentMutation.mutate({
      clientProtocolId: conv.clientProtocolId,
      authorType: "coach",
      authorName: "Coach",
      message: text,
    });
  }, [replyTexts, createCommentMutation]);

  const handleReplyKeyDown = useCallback((e: React.KeyboardEvent, conv: Conversation) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendReply(conv);
    }
  }, [handleSendReply]);

  const filteredConversations = useMemo(() => {
    return (conversations as Conversation[] || []).filter((conv) => {
      const matchesSearch =
        !searchQuery ||
        conv.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.clientEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filter === "all" || (filter === "unread" && conv.unreadCount > 0);
      return matchesSearch && matchesFilter;
    });
  }, [conversations, searchQuery, filter]);

  const unreadConversations = useMemo(() => {
    return (conversations as Conversation[] || []).filter((c) => c.unreadCount > 0).length;
  }, [conversations]);

  return (
    <AdminLayout>
      <div className="space-y-3 sm:space-y-6 p-3 sm:p-6">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                <MessageSquare className="h-5 w-5 sm:h-7 sm:w-7 text-orange-500 flex-shrink-0" />
                <span className="truncate">Message Inbox</span>
                {totalUnread > 0 && (
                  <Badge className="bg-red-500 text-white text-xs sm:text-sm px-1.5 sm:px-2 py-0.5">
                    {totalUnread}
                  </Badge>
                )}
              </h1>
              <p className="text-gray-500 mt-1 text-xs sm:text-sm hidden sm:block">
                All client conversations in one place. Click a conversation to open chat.
              </p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`h-8 w-8 sm:h-9 sm:w-9 p-0 ${soundEnabled ? "" : "text-gray-400"}`}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-8 sm:h-9 px-2 sm:px-3"
              >
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[
            { icon: MessageSquare, color: "blue", value: (conversations as Conversation[] || []).length, label: "Chats" },
            { icon: Mail, color: "red", value: totalUnread, label: "Unread" },
            { icon: InboxIcon, color: "orange", value: unreadConversations, label: "Reply" },
            { icon: CheckCheck, color: "green", value: (conversations as Conversation[] || []).length - unreadConversations, label: "Done" },
          ].map(({ icon: Icon, color, value, label }) => (
            <Card key={label} className="border-gray-200">
              <CardContent className="p-2.5 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`p-1.5 sm:p-2 rounded-lg bg-${color}-50 hidden sm:block`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 text-${color}-600`} />
                  </div>
                  <div className="text-center sm:text-left w-full">
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">
                      {isLoading ? "..." : value}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 sm:h-10 text-sm"
            />
          </div>
          <div className="flex gap-1.5">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className={`h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm ${filter === "all" ? "bg-orange-500 hover:bg-orange-600" : ""}`}
            >
              All
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("unread")}
              className={`h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm ${filter === "unread" ? "bg-red-500 hover:bg-red-600" : ""}`}
            >
              <Mail className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Unread </span>({totalUnread})
            </Button>
          </div>
        </div>

        {/* Conversation List */}
        <Card className="border-gray-200">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                    <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-gray-400 px-4">
                <InboxIcon className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4" />
                <p className="text-base sm:text-lg font-medium text-center">
                  {searchQuery || filter === "unread"
                    ? "No matching conversations"
                    : "No conversations yet"}
                </p>
                <p className="text-xs sm:text-sm mt-1 text-center">
                  {searchQuery
                    ? "Try a different search term"
                    : filter === "unread"
                    ? "All messages have been read!"
                    : "Messages will appear here when clients start chatting"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredConversations.map((conv) => (
                  <ConversationRow
                    key={conv.clientProtocolId}
                    conversation={conv}
                    onOpen={handleOpenConversation}
                    onMarkRead={handleMarkAllRead}
                    isReplyExpanded={expandedReply === conv.clientProtocolId}
                    onToggleReply={handleToggleReply}
                    replyText={replyTexts[conv.clientProtocolId] || ""}
                    onReplyTextChange={(text) =>
                      setReplyTexts((prev) => ({ ...prev, [conv.clientProtocolId]: text }))
                    }
                    onSendReply={() => handleSendReply(conv)}
                    onReplyKeyDown={(e) => handleReplyKeyDown(e, conv)}
                    isSending={createCommentMutation.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auto-refresh indicator */}
        <p className="text-[10px] sm:text-xs text-gray-400 text-center">
          Auto-refreshing every 30s {soundEnabled ? "• Sound on" : "• Sound off"}
        </p>
      </div>
    </AdminLayout>
  );
}

// ── Message History Preview ──
function MessageHistoryPreview({ clientProtocolId }: { clientProtocolId: number }) {
  const { data: allComments, isLoading } = trpc.comments.list.useQuery(
    { clientProtocolId },
    { staleTime: 10000 }
  );

  // Show last 5 messages
  const recentMessages = useMemo(() => {
    if (!allComments) return [];
    const comments = allComments as Comment[];
    return comments.slice(-5);
  }, [allComments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400 mr-2" />
        <span className="text-xs text-gray-400">Loading messages...</span>
      </div>
    );
  }

  if (!recentMessages.length) {
    return (
      <div className="text-center py-3">
        <p className="text-xs text-gray-400">No previous messages</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[200px] sm:max-h-[250px] overflow-y-auto px-1 py-1 scrollbar-thin">
      <p className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wider px-1">
        Recent Messages ({(allComments as Comment[])?.length || 0} total)
      </p>
      {recentMessages.map((msg) => {
        const isCoach = msg.authorType === "coach";
        const plainText = stripHtml(msg.message);
        const truncated = plainText.length > 200 ? plainText.substring(0, 200) + "..." : plainText;
        const timeStr = msg.createdAt
          ? formatDistanceToNowMT(new Date(msg.createdAt), { addSuffix: true })
          : "";

        return (
          <div
            key={msg.id}
            className={`flex ${isCoach ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-xl px-3 py-2 ${
                isCoach
                  ? "bg-orange-500 text-white rounded-br-sm"
                  : "bg-gray-200 text-gray-800 rounded-bl-sm"
              }`}
            >
              <p className="text-xs sm:text-sm leading-relaxed break-words whitespace-pre-wrap">
                {truncated}
              </p>
              {msg.loomUrl && (
                <div className={`flex items-center gap-1 mt-1 ${isCoach ? "text-orange-100" : "text-gray-500"}`}>
                  <Video className="h-3 w-3" />
                  <span className="text-[10px]">Loom video attached</span>
                </div>
              )}
              <p className={`text-[10px] mt-1 ${isCoach ? "text-orange-200" : "text-gray-400"}`}>
                {isCoach ? "You" : msg.authorName || "Client"} • {timeStr}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConversationRow({
  conversation: conv,
  onOpen,
  onMarkRead,
  isReplyExpanded,
  onToggleReply,
  replyText,
  onReplyTextChange,
  onSendReply,
  onReplyKeyDown,
  isSending,
}: {
  conversation: Conversation;
  onOpen: (conv: Conversation) => void;
  onMarkRead: (conv: Conversation) => void;
  isReplyExpanded: boolean;
  onToggleReply: (id: number) => void;
  replyText: string;
  onReplyTextChange: (text: string) => void;
  onSendReply: () => void;
  onReplyKeyDown: (e: React.KeyboardEvent) => void;
  isSending: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasUnread = conv.unreadCount > 0;
  const isFromClient = conv.lastAuthorType === "client";
  const timeAgo = conv.lastMessageAt
    ? formatDistanceToNowMT(new Date(conv.lastMessageAt), { addSuffix: true })
    : "";

  const plainMessage = conv.lastMessage ? stripHtml(conv.lastMessage) : "";
  const messagePreview =
    plainMessage.length > 100
      ? plainMessage.substring(0, 100) + "..."
      : plainMessage;

  const initials = conv.clientName
    ? conv.clientName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "??";

  useEffect(() => {
    if (isReplyExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isReplyExpanded]);

  return (
    <div>
      {/* Main conversation row */}
      <div
        className={`flex items-center gap-2.5 sm:gap-4 p-2.5 sm:p-4 cursor-pointer transition-colors active:bg-gray-100 hover:bg-gray-50 ${
          hasUnread ? "bg-orange-50/50" : ""
        }`}
        onClick={() => onOpen(conv)}
      >
        {/* Avatar with online indicator */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs sm:text-base font-semibold ${
              hasUnread ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            {initials}
          </div>
          {conv.clientLastSeenAt && (() => {
            const diffMin = (Date.now() - new Date(conv.clientLastSeenAt).getTime()) / 60000;
            return diffMin < 5 ? (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-green-500 rounded-full border-2 border-white" />
            ) : null;
          })()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5">
            <span
              className={`text-sm sm:text-base truncate ${
                hasUnread ? "font-bold text-gray-900" : "font-medium text-gray-700"
              }`}
            >
              {conv.clientName}
            </span>
            {hasUnread && (
              <Badge className="bg-red-500 text-white text-[10px] sm:text-xs px-1 sm:px-1.5 py-0 flex-shrink-0">
                {conv.unreadCount}
              </Badge>
            )}
            {conv.lastLoomUrl && (
              <Video className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-purple-500 flex-shrink-0" />
            )}
          </div>
          <p
            className={`text-xs sm:text-sm truncate ${
              hasUnread ? "text-gray-800" : "text-gray-500"
            }`}
          >
            {isFromClient ? "" : "You: "}
            {messagePreview}
          </p>
          <div className="flex items-center gap-2 mt-0.5 hidden sm:flex">
            {conv.clientEmail && (
              <p className="text-[10px] sm:text-xs text-gray-400 truncate">
                {conv.clientEmail}
              </p>
            )}
            {conv.clientLastSeenAt && (
              <span className={`text-[10px] flex-shrink-0 ${
                (Date.now() - new Date(conv.clientLastSeenAt).getTime()) / 60000 < 5
                  ? 'text-green-600 font-medium' : 'text-gray-400'
              }`}>
                {(Date.now() - new Date(conv.clientLastSeenAt).getTime()) / 60000 < 5
                  ? '• Online'
                  : `• Seen ${formatDistanceToNowMT(new Date(conv.clientLastSeenAt), { addSuffix: true })}`
                }
              </span>
            )}
          </div>
        </div>

        {/* Right side - time & actions */}
        <div className="flex flex-col items-end gap-0.5 sm:gap-1 flex-shrink-0">
          <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">{timeAgo}</span>
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Quick reply button */}
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 ${isReplyExpanded ? "text-orange-500" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleReply(conv.clientProtocolId);
              }}
            >
              <Reply className="h-3.5 w-3.5" />
            </Button>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hidden sm:flex"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(conv);
                }}
              >
                <MailOpen className="h-3.5 w-3.5 text-gray-400" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hidden sm:flex"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(conv);
              }}
            >
              <ExternalLink className="h-3.5 w-3.5 text-gray-300" />
            </Button>
          </div>
        </div>
      </div>

      {/* Inline reply panel with message history */}
      {isReplyExpanded && (
        <div className="bg-gray-50 border-t border-gray-100">
          {/* Message history preview */}
          <div className="px-3 sm:px-4 pt-3 pb-1">
            <MessageHistoryPreview clientProtocolId={conv.clientProtocolId} />
          </div>

          {/* Divider */}
          <div className="mx-3 sm:mx-4 border-t border-gray-200 my-2" />

          {/* Reply input */}
          <div className="px-3 sm:px-4 pb-3">
            <Textarea
              ref={textareaRef}
              placeholder={`Reply to ${conv.clientName}...`}
              value={replyText}
              onChange={(e) => onReplyTextChange(e.target.value)}
              onKeyDown={onReplyKeyDown}
              className="min-h-[50px] sm:min-h-[60px] max-h-[100px] sm:max-h-[120px] resize-none text-sm bg-white"
              disabled={isSending}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] sm:text-xs text-gray-400 hidden sm:inline">
                Ctrl+Enter to send
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleReply(conv.clientProtocolId)}
                  className="h-8 text-xs px-2 sm:px-3"
                >
                  <X className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Cancel</span>
                </Button>
                <Button
                  size="sm"
                  onClick={onSendReply}
                  disabled={!replyText.trim() || isSending}
                  className="h-8 bg-orange-500 hover:bg-orange-600 text-xs px-3 sm:px-4"
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  {isSending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
