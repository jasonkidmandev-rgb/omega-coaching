import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, Clock, User, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface NotesHistoryViewerProps {
  clientProtocolId: number;
  noteType: 'internal_notes' | 'coach_notes' | 'comment';
  onRestore?: (content: string) => void;
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

function truncateText(text: string, maxLength: number = 100): string {
  const stripped = stripHtml(text);
  if (stripped.length <= maxLength) return stripped;
  return stripped.substring(0, maxLength) + '...';
}

export default function NotesHistoryViewer({
  clientProtocolId,
  noteType,
  onRestore,
}: NotesHistoryViewerProps) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: history = [], isLoading } = trpc.clientProtocol.getNotesHistory.useQuery(
    { clientProtocolId, noteType },
    { enabled: open }
  );

  const noteTypeLabel = {
    internal_notes: 'Internal Notes',
    coach_notes: 'Coach Notes',
    comment: 'Comment',
  }[noteType];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          View History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {noteTypeLabel} History
          </DialogTitle>
          <DialogDescription>
            View all changes made to this note over time. Click on an entry to see full details.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No history available yet.</p>
              <p className="text-sm">Changes will appear here after the first save.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry, index) => (
                <div
                  key={entry.id}
                  className={cn(
                    'border rounded-lg p-4 transition-colors',
                    expandedId === entry.id ? 'bg-muted/50' : 'hover:bg-muted/30'
                  )}
                >
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            entry.changeType === 'created'
                              ? 'default'
                              : entry.changeType === 'updated'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {entry.changeType}
                        </Badge>
                        {index === 0 && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(entry.createdAt)}
                        </span>
                        {entry.changedByName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.changedByName}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm">
                        {truncateText(entry.content || '', 150)}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="ml-2">
                      {expandedId === entry.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {expandedId === entry.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {entry.changeType === 'updated' && entry.previousContent && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Previous Version
                            </p>
                            <div
                              className="text-sm p-3 bg-red-50 border border-red-200 rounded prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: entry.previousContent }}
                            />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              New Version
                            </p>
                            <div
                              className="text-sm p-3 bg-green-50 border border-green-200 rounded prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: entry.content || '' }}
                            />
                          </div>
                        </div>
                      )}

                      {(entry.changeType === 'created' || !entry.previousContent) && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Content
                          </p>
                          <div
                            className="text-sm p-3 bg-muted rounded prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: entry.content || '' }}
                          />
                        </div>
                      )}

                      {onRestore && index > 0 && (
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRestore(entry.content || '');
                              setOpen(false);
                            }}
                          >
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Restore This Version
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
