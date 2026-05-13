import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, MessageSquare, User, Send, Video, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { FormData } from "./types";
import React, { useEffect, useState, useCallback } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import { processMessageForDisplay } from "@/lib/htmlUtils";
import NotesHistoryViewer from "@/components/NotesHistoryViewer";
import { useAutoSave } from "@/hooks/useAutoSave";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";

type Comment = {
  id: number;
  authorType: "coach" | "client";
  authorName: string | null;
  message: string;
  loomUrl: string | null;
  isRead: boolean;
  createdAt: Date | string;
};

type CoachNotesTabProps = {
  clientId: number | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  comments: Comment[];
  newComment: string;
  setNewComment: React.Dispatch<React.SetStateAction<string>>;
  loomUrl: string;
  setLoomUrl: React.Dispatch<React.SetStateAction<string>>;
  showLoomInput: boolean;
  setShowLoomInput: React.Dispatch<React.SetStateAction<boolean>>;
  commentsEndRef: React.RefObject<HTMLDivElement | null>;
  handleSendComment: () => void;
  createCommentMutation: {
    isPending: boolean;
  };
  updateMutation: {
    mutate: (params: any) => void;
    mutateAsync: (params: any) => Promise<any>;
    isPending: boolean;
  };
  isSubTab?: boolean;
  renderSection?: 'comments' | 'coach-notes' | 'both';
};

export default function CoachNotesTab({
  clientId,
  formData,
  setFormData,
  comments,
  newComment,
  setNewComment,
  loomUrl,
  setLoomUrl,
  showLoomInput,
  setShowLoomInput,
  commentsEndRef,
  handleSendComment,
  createCommentMutation,
  updateMutation,
  isSubTab = false,
  renderSection = 'both',
}: CoachNotesTabProps) {
  const trpcUtils = trpc.useUtils();
  const [localCoachNotes, setLocalCoachNotes] = useState(formData.coachNotes || "");
  
  // Sync local state when formData changes (e.g., from server)
  useEffect(() => {
    setLocalCoachNotes(formData.coachNotes || "");
  }, [formData.coachNotes]);
  
  // Auto-save hook for coach notes
  const { status: autoSaveStatus, lastSavedAt, debouncedSave, saveNow, setInitialContent } = useAutoSave({
    debounceMs: 1500,
    onSave: async (content) => {
      if (!clientId) return;
      await updateMutation.mutateAsync({
        id: clientId,
        coachNotes: content,
      });
      // Invalidate history query to show new entry
      trpcUtils.clientProtocol.getNotesHistory.invalidate({ clientProtocolId: clientId, noteType: 'coach_notes' });
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
  
  // Warn when navigating away with unsaved coach notes
  useUnsavedChangesWarning(autoSaveStatus === 'saving' || autoSaveStatus === 'retrying', 'You have unsaved coach notes. Are you sure you want to leave?');

  // Set initial content on mount
  useEffect(() => {
    setInitialContent(formData.coachNotes || "");
  }, [formData.coachNotes, setInitialContent]);
  
  const handleCoachNotesChange = useCallback((content: string) => {
    setLocalCoachNotes(content);
    setFormData(prev => ({ ...prev, coachNotes: content }));
    debouncedSave(content);
  }, [setFormData, debouncedSave]);
  
  const handleRestoreVersion = useCallback((content: string) => {
    setLocalCoachNotes(content);
    setFormData(prev => ({ ...prev, coachNotes: content }));
    saveNow(content);
    toast.success('Version restored');
  }, [setFormData, saveNow]);

  const commentsContent = (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Discussion with {formData.clientName || "Client"}
            </CardTitle>
            <CardDescription>
              Communicate with your client about their protocol. You can add Loom videos for detailed explanations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Comments List */}
            <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </p>
              ) : (
                comments.map((comment: Comment) => (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-lg ${
                      comment.authorType === "coach"
                        ? "bg-primary/5 border-l-4 border-primary"
                        : "bg-slate-100 border-l-4 border-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        comment.authorType === "coach" ? "bg-primary text-white" : "bg-slate-400 text-white"
                      }`}>
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {comment.authorName || (comment.authorType === "coach" ? "You" : formData.clientName)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {comment.authorType === "client" && !comment.isRead && (
                        <Badge variant="destructive" className="ml-auto">New</Badge>
                      )}
                    </div>
                    {/* Render comment message with HTML support and preserve formatting */}
                    <div 
                      className="text-sm prose prose-sm max-w-none [&_p]:my-2 [&_p]:leading-relaxed [&_br]:block [&_br]:my-1 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: processMessageForDisplay(comment.message, comment.authorType === 'coach') }}
                    />
                    {comment.loomUrl && (
                      <div className="mt-3">
                        <div className="aspect-video rounded-lg overflow-hidden bg-slate-900">
                          <iframe
                            src={comment.loomUrl.replace("loom.com/share", "loom.com/embed")}
                            frameBorder="0"
                            allowFullScreen
                            className="w-full h-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* New Comment Input with Rich Text Editor */}
            <div className="space-y-3 pt-4 border-t">
              <Label>New Message</Label>
              <RichTextEditor
                content={newComment}
                onChange={setNewComment}
                placeholder="Type your message to the client..."
                minHeight="120px"
              />
              {showLoomInput && (
                <Input
                  placeholder="Paste Loom video URL (optional)"
                  value={loomUrl}
                  onChange={(e) => setLoomUrl(e.target.value)}
                />
              )}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSendComment}
                  disabled={!newComment.trim() || newComment === '<p></p>' || createCommentMutation.isPending}
                >
                  {createCommentMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowLoomInput(!showLoomInput)}
                  title="Add Loom video"
                >
                  <Video className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
  );

  const coachNotesContent = (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personalized Coach Notes
                </CardTitle>
                <CardDescription>
                  Add personalized notes and instructions for this client. These notes will be visible to the client in their protocol view and included in the PDF export.
                </CardDescription>
              </div>
              {clientId && (
                <NotesHistoryViewer
                  clientProtocolId={clientId}
                  noteType="coach_notes"
                  onRestore={handleRestoreVersion}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Notes & Instructions</Label>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {autoSaveStatus === 'saving' && (
                    <span className="flex items-center gap-1.5 text-blue-600">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                      <span className="font-medium">Saving...</span>
                    </span>
                  )}
                  {autoSaveStatus === 'retrying' && (
                    <span className="flex items-center gap-1.5 text-amber-600">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                      <span className="font-medium">Retrying save...</span>
                    </span>
                  )}
                  {autoSaveStatus === 'saved' && (
                    <span className="flex items-center gap-1.5 text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      <span className="font-medium">Saved</span>
                      {lastSavedAt && (
                        <span className="text-muted-foreground font-normal">
                          {lastSavedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                      )}
                    </span>
                  )}
                  {autoSaveStatus === 'error' && (
                    <span className="flex items-center gap-1.5 text-red-600">
                      <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                      <span className="font-medium">Save failed</span>
                    </span>
                  )}
                  {autoSaveStatus === 'idle' && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {lastSavedAt ? (
                        <>
                          <span>Last saved</span>
                          <span className="font-medium">
                            {lastSavedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </span>
                        </>
                      ) : (
                        <span>Auto-save enabled</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
              <RichTextEditor
                content={localCoachNotes}
                onChange={handleCoachNotesChange}
                placeholder="Enter personalized notes, instructions, tips, or guidance for this client...

Examples:
• Specific dosing adjustments based on their health goals
• Timing recommendations for their schedule
• Foods to avoid or include
• Exercise recommendations
• Progress milestones to track"
                minHeight="300px"
              />
              <p className="text-xs text-muted-foreground">
                These notes will be visible to the client. Use formatting to make them easy to read. Changes are saved automatically.
              </p>
            </div>
          </CardContent>
        </Card>
  );

  if (isSubTab) {
    if (renderSection === 'comments') return commentsContent;
    if (renderSection === 'coach-notes') return coachNotesContent;
    return <>{commentsContent}{coachNotesContent}</>;
  }

  return (
    <>
      {(renderSection === 'both' || renderSection === 'comments') && (
        <TabsContent value="comments">{commentsContent}</TabsContent>
      )}
      {(renderSection === 'both' || renderSection === 'coach-notes') && (
        <TabsContent value="coach-notes">{coachNotesContent}</TabsContent>
      )}
    </>
  );
}
