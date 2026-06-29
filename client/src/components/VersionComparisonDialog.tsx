import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Minus, RefreshCw, FileText, ArrowRight, Download, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { toLocaleDateStringMT } from "@/lib/timezone";

interface VersionComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: number;
  currentProtocolId: number;
  versionHistory: Array<{
    id: number;
    version: number;
    versionName: string | null;
    versionNotes: string | null;
    status: string;
    createdAt: string;
    isActiveVersion: boolean;
  }>;
  onRollbackComplete?: () => void;
}

export function VersionComparisonDialog({
  open,
  onOpenChange,
  clientId,
  currentProtocolId,
  versionHistory,
  onRollbackComplete,
}: VersionComparisonDialogProps) {
  const [version1Id, setVersion1Id] = useState<number | null>(null);
  const [version2Id, setVersion2Id] = useState<number | null>(currentProtocolId);

  const { data: comparison, isLoading } = trpc.clientProtocol.compareVersions.useQuery(
    { version1Id: version1Id!, version2Id: version2Id! },
    { enabled: !!version1Id && !!version2Id && version1Id !== version2Id }
  );

  const rollbackMutation = trpc.clientProtocol.rollbackToVersion.useMutation({
    onSuccess: () => {
      toast.success("Successfully rolled back to previous version");
      onOpenChange(false);
      onRollbackComplete?.();
    },
    onError: (error) => {
      toast.error(`Failed to rollback: ${error.message}`);
    },
  });

  const getStatusBadge = (status: 'added' | 'removed' | 'modified' | 'unchanged') => {
    switch (status) {
      case 'added':
        return <Badge className="bg-green-500 text-white"><Plus className="h-3 w-3 mr-1" />Added</Badge>;
      case 'removed':
        return <Badge className="bg-red-500 text-white"><Minus className="h-3 w-3 mr-1" />Removed</Badge>;
      case 'modified':
        return <Badge className="bg-yellow-500 text-white"><RefreshCw className="h-3 w-3 mr-1" />Modified</Badge>;
      default:
        return <Badge variant="secondary">Unchanged</Badge>;
    }
  };

  const handleExportPDF = () => {
    if (!comparison) return;

    const version1 = versionHistory.find(v => v.id === version1Id);
    const version2 = versionHistory.find(v => v.id === version2Id);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Protocol Comparison Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 2px solid #f97316; padding-bottom: 10px; }
          h2 { color: #666; margin-top: 30px; }
          .summary { display: flex; gap: 20px; margin: 20px 0; }
          .summary-item { padding: 15px; border-radius: 8px; text-align: center; flex: 1; }
          .added { background: #dcfce7; color: #166534; }
          .removed { background: #fee2e2; color: #991b1b; }
          .modified { background: #fef9c3; color: #854d0e; }
          .unchanged { background: #f3f4f6; color: #374151; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f3f4f6; }
          .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .notes { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>Protocol Version Comparison Report</h1>
        <p><strong>Generated:</strong> ${toLocaleDateStringMT(new Date())}</p>
        <p><strong>From:</strong> ${version1?.versionName || `Version ${version1?.version}`} (${toLocaleDateStringMT(version1?.createdAt || '', { year: 'numeric', month: 'numeric', day: 'numeric' })})</p>
        <p><strong>To:</strong> ${version2?.versionName || `Version ${version2?.version}`} (${toLocaleDateStringMT(version2?.createdAt || '', { year: 'numeric', month: 'numeric', day: 'numeric' })})</p>
        
        <h2>Summary</h2>
        <div class="summary">
          <div class="summary-item added"><strong>${comparison.summary.added}</strong><br/>Added</div>
          <div class="summary-item removed"><strong>${comparison.summary.removed}</strong><br/>Removed</div>
          <div class="summary-item modified"><strong>${comparison.summary.modified}</strong><br/>Modified</div>
          <div class="summary-item unchanged"><strong>${comparison.summary.unchanged}</strong><br/>Unchanged</div>
        </div>

        ${comparison.protocol1.versionNotes || comparison.protocol2.versionNotes ? `
          <h2>Version Notes</h2>
          ${comparison.protocol1.versionNotes ? `<div class="notes"><strong>${comparison.protocol1.versionName || `v${comparison.protocol1.version}`}:</strong> ${comparison.protocol1.versionNotes}</div>` : ''}
          ${comparison.protocol2.versionNotes ? `<div class="notes"><strong>${comparison.protocol2.versionName || `v${comparison.protocol2.version}`}:</strong> ${comparison.protocol2.versionNotes}</div>` : ''}
        ` : ''}

        <h2>Detailed Changes</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Status</th>
              <th>${comparison.protocol1.versionName || `v${comparison.protocol1.version}`}</th>
              <th>${comparison.protocol2.versionName || `v${comparison.protocol2.version}`}</th>
            </tr>
          </thead>
          <tbody>
            ${comparison.comparison
              .sort((a, b) => {
                const order = { added: 0, removed: 1, modified: 2, unchanged: 3 };
                return order[a.status] - order[b.status];
              })
              .map(item => `
                <tr style="background: ${item.status === 'added' ? '#dcfce7' : item.status === 'removed' ? '#fee2e2' : item.status === 'modified' ? '#fef9c3' : 'white'}">
                  <td>${item.itemName}</td>
                  <td>${item.categoryName}</td>
                  <td><span class="badge" style="background: ${item.status === 'added' ? '#22c55e' : item.status === 'removed' ? '#ef4444' : item.status === 'modified' ? '#eab308' : '#9ca3af'}; color: white;">${item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span></td>
                  <td>${item.v1?.isRecommended ? `Qty: ${item.v1.quantity}` : '—'}</td>
                  <td>${item.v2?.isRecommended ? `Qty: ${item.v2.quantity}` : '—'}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }
    toast.success("PDF export opened in new window. Use your browser's print dialog to save as PDF.");
  };

  const handleRollback = () => {
    if (!version1Id || !version2Id) return;
    
    const targetVersion = versionHistory.find(v => v.id === version1Id);
    if (!targetVersion) return;

    if (confirm(`Are you sure you want to rollback to "${targetVersion.versionName || `Version ${targetVersion.version}`}"? This will create a new version based on the selected older version.`)) {
      rollbackMutation.mutate({
        sourceVersionId: version2Id,
        targetVersionId: version1Id,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Compare Protocol Versions
          </DialogTitle>
          <DialogDescription>
            Select two versions to see what changed between them
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">From Version</label>
            <Select
              value={version1Id?.toString() || ''}
              onValueChange={(value) => setVersion1Id(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select older version" />
              </SelectTrigger>
              <SelectContent>
                {versionHistory
                  .filter(v => v.id !== version2Id)
                  .map((version) => (
                    <SelectItem key={version.id} value={version.id.toString()} textValue={version.versionName || `v${version.version}`}>
                      {version.versionName || `v${version.version}`}
                      {version.isActiveVersion && " (Current)"}
                      <span className="text-muted-foreground ml-2 text-xs">
                        {toLocaleDateStringMT(version.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">To Version</label>
            <Select
              value={version2Id?.toString() || ''}
              onValueChange={(value) => setVersion2Id(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select newer version" />
              </SelectTrigger>
              <SelectContent>
                {versionHistory
                  .filter(v => v.id !== version1Id)
                  .map((version) => (
                    <SelectItem key={version.id} value={version.id.toString()} textValue={version.versionName || `v${version.version}`}>
                      {version.versionName || `v${version.version}`}
                      {version.isActiveVersion && " (Current)"}
                      <span className="text-muted-foreground ml-2 text-xs">
                        {toLocaleDateStringMT(version.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {version1Id && version2Id && version1Id === version2Id && (
          <div className="text-center py-8 text-muted-foreground">
            Please select two different versions to compare
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {comparison && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{comparison.summary.added}</div>
                <div className="text-xs text-green-600">Added</div>
              </div>
              <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{comparison.summary.removed}</div>
                <div className="text-xs text-red-600">Removed</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-600">{comparison.summary.modified}</div>
                <div className="text-xs text-yellow-600">Modified</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-600">{comparison.summary.unchanged}</div>
                <div className="text-xs text-gray-600">Unchanged</div>
              </div>
            </div>

            {/* Version Notes */}
            {(comparison.protocol1.versionNotes || comparison.protocol2.versionNotes) && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {comparison.protocol1.versionNotes && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {comparison.protocol1.versionName || `v${comparison.protocol1.version}`} Notes:
                    </div>
                    <p className="text-sm">{comparison.protocol1.versionNotes}</p>
                  </div>
                )}
                {comparison.protocol2.versionNotes && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {comparison.protocol2.versionName || `v${comparison.protocol2.version}`} Notes:
                    </div>
                    <p className="text-sm">{comparison.protocol2.versionNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Comparison Table */}
            <ScrollArea className="h-[300px] border rounded-lg">
              <table className="w-full">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Item</th>
                    <th className="text-left p-3 text-sm font-medium">Category</th>
                    <th className="text-center p-3 text-sm font-medium">Status</th>
                    <th className="text-center p-3 text-sm font-medium">
                      {comparison.protocol1.versionName || `v${comparison.protocol1.version}`}
                    </th>
                    <th className="text-center p-3 text-sm font-medium">
                      <ArrowRight className="h-4 w-4 inline" />
                    </th>
                    <th className="text-center p-3 text-sm font-medium">
                      {comparison.protocol2.versionName || `v${comparison.protocol2.version}`}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.comparison
                    .sort((a, b) => {
                      // Sort by status: added, removed, modified, unchanged
                      const order = { added: 0, removed: 1, modified: 2, unchanged: 3 };
                      return order[a.status] - order[b.status];
                    })
                    .map((item, index) => (
                      <tr 
                        key={item.protocolItemId} 
                        className={`border-b ${
                          item.status === 'added' ? 'bg-green-50/50 dark:bg-green-950/30' :
                          item.status === 'removed' ? 'bg-red-50/50 dark:bg-red-950/30' :
                          item.status === 'modified' ? 'bg-yellow-50/50 dark:bg-yellow-950/30' :
                          ''
                        }`}
                      >
                        <td className="p-3 text-sm">{item.itemName}</td>
                        <td className="p-3 text-sm text-muted-foreground">{item.categoryName}</td>
                        <td className="p-3 text-center">{getStatusBadge(item.status)}</td>
                        <td className="p-3 text-center text-sm">
                          {item.v1?.isRecommended ? (
                            <span>Qty: {item.v1.quantity}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <ArrowRight className="h-4 w-4 text-muted-foreground inline" />
                        </td>
                        <td className="p-3 text-center text-sm">
                          {item.v2?.isRecommended ? (
                            <span>Qty: {item.v2.quantity}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {comparison.comparison.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No differences found between these versions
                </div>
              )}
            </ScrollArea>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleRollback}
                disabled={rollbackMutation.isPending}
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
              >
                {rollbackMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Rollback to {versionHistory.find(v => v.id === version1Id)?.versionName || 'Selected Version'}
              </Button>
              <Button onClick={handleExportPDF} className="bg-orange-500 hover:bg-orange-600">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </>
        )}

        {!version1Id && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            Select two versions above to compare them
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
