import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { 
  Merge, 
  Trash2, 
  RotateCcw, 
  History, 
  AlertTriangle, 
  Search,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Package,
  Copy,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function ProductManagement() {
  const [activeTab, setActiveTab] = useState("merge");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Merge state
  const [sourceProductId, setSourceProductId] = useState<number | null>(null);
  const [targetProductId, setTargetProductId] = useState<number | null>(null);
  const [mergeReason, setMergeReason] = useState("");
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  
  // Restore state
  const [restoreLogId, setRestoreLogId] = useState<number | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  
  const { data: products } = trpc.protocolItem.list.useQuery();
  const { data: duplicates, refetch: refetchDuplicates } = trpc.protocolItem.findDuplicates.useQuery();
  const { data: deletionLog, refetch: refetchDeletionLog } = trpc.protocolItem.getDeletionLog.useQuery({ limit: 100 });
  const { data: mergeLog, refetch: refetchMergeLog } = trpc.protocolItem.getMergeLog.useQuery({ limit: 100 });
  
  const mergeMutation = trpc.protocolItem.merge.useMutation({
    onSuccess: (result) => {
      toast.success(`Successfully merged products. ${result.clientItemsMerged} client items and ${result.templateItemsMerged} template items were reassigned.`);
      setSourceProductId(null);
      setTargetProductId(null);
      setMergeReason("");
      setShowMergeConfirm(false);
      refetchDuplicates();
      refetchMergeLog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const restoreMutation = trpc.protocolItem.restore.useMutation({
    onSuccess: (result) => {
      toast.success(`Successfully restored "${result.productName}" as a new product (ID: ${result.newProductId})`);
      setRestoreLogId(null);
      setShowRestoreConfirm(false);
      refetchDeletionLog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const sourceProduct = products?.find(p => p.id === sourceProductId);
  const targetProduct = products?.find(p => p.id === targetProductId);
  
  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  const handleMerge = () => {
    if (!sourceProductId || !targetProductId) return;
    mergeMutation.mutate({
      sourceId: sourceProductId,
      targetId: targetProductId,
      reason: mergeReason || undefined,
    });
  };
  
  const handleRestore = () => {
    if (!restoreLogId) return;
    restoreMutation.mutate({ deletionLogId: restoreLogId });
  };
  
  return (
    <AdminLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Product Management</h1>
        <p className="text-muted-foreground">
          Merge duplicate products, view deletion history, and restore accidentally deleted items
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="merge" className="flex items-center gap-2">
            <Merge className="h-4 w-4" />
            Merge Products
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Duplicates
            {duplicates && duplicates.length > 0 && (
              <Badge variant="destructive" className="ml-1">{duplicates.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="deletion-log" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Deletion Log
          </TabsTrigger>
          <TabsTrigger value="merge-log" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Merge History
          </TabsTrigger>
        </TabsList>
        
        {/* Merge Products Tab */}
        <TabsContent value="merge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Merge className="h-5 w-5" />
                Merge Duplicate Products
              </CardTitle>
              <CardDescription>
                Select a source product to merge INTO a target product. All client protocol items and template items 
                using the source product will be reassigned to the target product, then the source product will be deleted.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                {/* Source Product */}
                <div className="space-y-2">
                  <Label className="text-destructive font-semibold">Source Product (will be deleted)</Label>
                  <Select
                    value={sourceProductId?.toString() || ""}
                    onValueChange={(v) => setSourceProductId(v ? parseInt(v) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProducts.map((product) => (
                        <SelectItem 
                          key={product.id} 
                          value={product.id.toString()}
                          disabled={product.id === targetProductId}
                        >
                          {product.name} (ID: {product.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {sourceProduct && (
                    <Card className="border-destructive/50 bg-destructive/5">
                      <CardContent className="p-3 text-sm">
                        <p className="font-medium">{sourceProduct.name}</p>
                        <p className="text-muted-foreground">Category: {sourceProduct.categoryId}</p>
                        <p className="text-muted-foreground">Price: ${sourceProduct.price || 0}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                {/* Arrow */}
                <div className="flex items-center justify-center pt-8">
                  <ArrowRight className="h-8 w-8 text-muted-foreground" />
                </div>
                
                {/* Target Product */}
                <div className="space-y-2">
                  <Label className="text-green-600 font-semibold">Target Product (will keep)</Label>
                  <Select
                    value={targetProductId?.toString() || ""}
                    onValueChange={(v) => setTargetProductId(v ? parseInt(v) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProducts.map((product) => (
                        <SelectItem 
                          key={product.id} 
                          value={product.id.toString()}
                          disabled={product.id === sourceProductId}
                        >
                          {product.name} (ID: {product.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {targetProduct && (
                    <Card className="border-green-500/50 bg-green-50">
                      <CardContent className="p-3 text-sm">
                        <p className="font-medium">{targetProduct.name}</p>
                        <p className="text-muted-foreground">Category: {targetProduct.categoryId}</p>
                        <p className="text-muted-foreground">Price: ${targetProduct.price || 0}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Reason for Merge (optional)</Label>
                <Textarea
                  placeholder="e.g., Duplicate product created by mistake, consolidating similar items..."
                  value={mergeReason}
                  onChange={(e) => setMergeReason(e.target.value)}
                />
              </div>
              
              <Button
                onClick={() => setShowMergeConfirm(true)}
                disabled={!sourceProductId || !targetProductId || mergeMutation.isPending}
                className="w-full"
              >
                <Merge className="h-4 w-4 mr-2" />
                Merge Products
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Duplicates Tab */}
        <TabsContent value="duplicates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Potential Duplicate Products
              </CardTitle>
              <CardDescription>
                Products with identical names (case-insensitive) that may need to be merged
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!duplicates || duplicates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No duplicate products found!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {duplicates.map((group, index) => (
                    <Card key={index} className="border-amber-200 bg-amber-50/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          "{group.name}" - {group.products.length} duplicates
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.products.map((product: any) => (
                              <TableRow key={product.id}>
                                <TableCell>{product.id}</TableCell>
                                <TableCell>{product.name}</TableCell>
                                <TableCell>{product.categoryId}</TableCell>
                                <TableCell>${product.price || 0}</TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSourceProductId(product.id);
                                      setActiveTab("merge");
                                    }}
                                  >
                                    Select as Source
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Deletion Log Tab */}
        <TabsContent value="deletion-log" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Product Deletion Audit Log
              </CardTitle>
              <CardDescription>
                Track who deleted products and when. Restore accidentally deleted items.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!deletionLog || deletionLog.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-12 w-12 mx-auto mb-2" />
                  <p>No deletion history yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Deleted By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Affected Items</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletionLog.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{log.productName}</p>
                            <p className="text-xs text-muted-foreground">ID: {log.originalProductId}</p>
                          </div>
                        </TableCell>
                        <TableCell>{log.deletedByName || 'Unknown'}</TableCell>
                        <TableCell>{format(new Date(log.deletedAt), 'MMM d, yyyy h:mm a')}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{log.affectedClientProtocols} client protocols</p>
                            <p>{log.affectedTemplates} templates</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.deletionReason || '-'}
                        </TableCell>
                        <TableCell>
                          {log.isRestored ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Restored
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Deleted
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!log.isRestored && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRestoreLogId(log.id);
                                setShowRestoreConfirm(true);
                              }}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restore
                            </Button>
                          )}
                          {log.isRestored && log.restoredProductId && (
                            <span className="text-xs text-muted-foreground">
                              New ID: {log.restoredProductId}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Merge Log Tab */}
        <TabsContent value="merge-log" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Product Merge History
              </CardTitle>
              <CardDescription>
                Track all product merges performed in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!mergeLog || mergeLog.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-12 w-12 mx-auto mb-2" />
                  <p>No merge history yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source Product</TableHead>
                      <TableHead>Target Product</TableHead>
                      <TableHead>Merged By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items Merged</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mergeLog.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium line-through text-muted-foreground">{log.sourceProductName}</p>
                            <p className="text-xs text-muted-foreground">ID: {log.sourceProductId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-green-600">{log.targetProductName}</p>
                            <p className="text-xs text-muted-foreground">ID: {log.targetProductId}</p>
                          </div>
                        </TableCell>
                        <TableCell>{log.mergedByName || 'Unknown'}</TableCell>
                        <TableCell>{format(new Date(log.mergedAt), 'MMM d, yyyy h:mm a')}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{log.clientProtocolItemsMerged} client items</p>
                            <p>{log.templateItemsMerged} template items</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.mergeReason || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Merge Confirmation Dialog */}
      <AlertDialog open={showMergeConfirm} onOpenChange={setShowMergeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Product Merge
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to merge:</p>
              <div className="bg-muted p-3 rounded-md space-y-1">
                <p><strong>Source (will be deleted):</strong> {sourceProduct?.name} (ID: {sourceProductId})</p>
                <p><strong>Target (will keep):</strong> {targetProduct?.name} (ID: {targetProductId})</p>
              </div>
              <p className="text-amber-600 font-medium">
                All client protocol items and template items using the source product will be reassigned to the target product.
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMerge} className="bg-amber-600 hover:bg-amber-700">
              <Merge className="h-4 w-4 mr-2" />
              Confirm Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-green-500" />
              Confirm Product Restore
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p>This will create a new product with the same data as the deleted product.</p>
              <p className="mt-2 text-muted-foreground">
                Note: The restored product will have a new ID. Any client protocol items that were using 
                the original product will NOT be automatically reconnected.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} className="bg-green-600 hover:bg-green-700">
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </AdminLayout>
  );
}