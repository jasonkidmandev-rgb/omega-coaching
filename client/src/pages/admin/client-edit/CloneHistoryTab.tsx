import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { History, CopyPlus } from "lucide-react";

type CloneHistoryEntry = {
  id: number;
  sourceProtocolId: number | null;
  targetProtocolId: number | null;
  sourceProtocolName: string | null;
  targetProtocolName: string | null;
  cloneType: "new_client" | "existing_client" | "bulk" | "from_template";
  itemsCloned: number;
  createdAt: Date | string;
};

type CloneHistoryTabProps = {
  clientId: number | null;
  cloneHistory: CloneHistoryEntry[];
  setLocation: (path: string) => void;
  isSubTab?: boolean;
};

export default function CloneHistoryTab({
  clientId,
  cloneHistory,
  setLocation,
  isSubTab = false,
}: CloneHistoryTabProps) {
  const content = (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Clone History
          </CardTitle>
          <CardDescription>
            Track when this protocol was cloned from another source or used as a source for cloning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cloneHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No clone history found for this protocol.</p>
              <p className="text-sm mt-1">Clone history will appear here when this protocol is cloned or created from a template.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cloneHistory.map((entry) => {
                const isSource = entry.sourceProtocolId === clientId;
                const isTarget = entry.targetProtocolId === clientId;
                
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                  >
                    <div className={`p-2 rounded-full ${isSource ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                      {isSource ? <CopyPlus className="h-4 w-4" /> : <History className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {isSource ? 'Cloned to' : 'Cloned from'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {entry.cloneType === 'new_client' && 'New Client'}
                          {entry.cloneType === 'existing_client' && 'Existing Client'}
                          {entry.cloneType === 'bulk' && 'Bulk Clone'}
                          {entry.cloneType === 'from_template' && 'From Template'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isSource ? (
                          <>
                            <span className="font-medium text-foreground">{entry.targetProtocolName}</span>
                            {' '}was created from this protocol
                          </>
                        ) : (
                          <>
                            Created from{' '}
                            <span className="font-medium text-foreground">{entry.sourceProtocolName}</span>
                          </>
                        )}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{entry.itemsCloned} items cloned</span>
                        <span>{new Date(entry.createdAt).toLocaleDateString()} at {new Date(entry.createdAt).toLocaleTimeString()}</span>
                      </div>
                      {isSource && entry.targetProtocolId && (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto mt-1 text-xs"
                          onClick={() => setLocation(`/admin/clients/${entry.targetProtocolId}`)}
                        >
                          View cloned protocol →
                        </Button>
                      )}
                      {!isSource && entry.sourceProtocolId && (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto mt-1 text-xs"
                          onClick={() => setLocation(`/admin/clients/${entry.sourceProtocolId}`)}
                        >
                          View source protocol →
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
  );

  if (isSubTab) return content;
  return <TabsContent value="clone-history">{content}</TabsContent>;
}
