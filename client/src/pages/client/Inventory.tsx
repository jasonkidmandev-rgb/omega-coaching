import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, AlertTriangle, CheckCircle2, Circle, 
  ShoppingCart, Plus, RefreshCw, ArrowLeft
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type InventoryStatus = 'full' | 'half' | 'running_low' | 'out';

const statusConfig: Record<InventoryStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  full: { label: 'Full', icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-500/10' },
  half: { label: 'Half', icon: Circle, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  running_low: { label: 'Running Low', icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-500/10' },
  out: { label: 'Out', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-500/10' },
};

export default function ClientInventory() {
  const [, setLocation] = useLocation();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  
  // Fetch inventory
  const { data: inventory, isLoading, refetch } = trpc.clientInventory.getMyInventory.useQuery();
  
  // Update status mutation
  const updateStatusMutation = trpc.clientInventory.bulkUpdateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status");
    }
  });
  
  // Request reorder mutation
  const requestReorderMutation = trpc.clientInventory.requestReorder.useMutation({
    onSuccess: () => {
      toast.success("Reorder request sent to your coach");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to request reorder");
    }
  });
  
  // Add item mutation (using clientAddItem via token - simplified for now)
  // Note: This would need the token from auth context
  
  const handleStatusChange = (itemId: number, newStatus: InventoryStatus) => {
    updateStatusMutation.mutate({
      updates: [{ id: itemId, status: newStatus }],
      changedBy: 'client',
    });
  };
  
  const handleRequestReorder = (itemId: number) => {
    requestReorderMutation.mutate({ itemId });
  };
  
  type InventoryItem = NonNullable<typeof inventory>[number];
  
  // Group items by category
  const groupedInventory = inventory?.reduce((acc: Record<string, InventoryItem[]>, item: InventoryItem) => {
    const category = item.itemCategory || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>) || {};
  
  const categories = Object.keys(groupedInventory).sort();
  
  // Stats
  const stats = {
    total: inventory?.length || 0,
    full: inventory?.filter((i: InventoryItem) => i.status === 'full').length || 0,
    half: inventory?.filter((i: InventoryItem) => i.status === 'half').length || 0,
    runningLow: inventory?.filter((i: InventoryItem) => i.status === 'running_low').length || 0,
    out: inventory?.filter((i: InventoryItem) => i.status === 'out').length || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">My Inventory</h1>
            <p className="text-muted-foreground">
              Track your supplements and protocol items
            </p>
          </div>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.full}</p>
                <p className="text-sm text-muted-foreground">Full Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.runningLow}</p>
                <p className="text-sm text-muted-foreground">Running Low</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.out}</p>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory List */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No inventory items yet</p>
              <p className="text-sm">Your protocol items will appear here once added</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {categories.map(category => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
                <CardDescription>
                  {groupedInventory[category].length} items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {groupedInventory[category].map((item: InventoryItem) => {
                    const status = item.status as InventoryStatus;
                    const config = statusConfig[status];
                    const StatusIcon = config.icon;
                    
                    return (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                            <StatusIcon className={`h-5 w-5 ${config.color}`} />
                          </div>
                          <div>
                            <p className="font-medium">{item.itemName}</p>
                            {item.notes && (
                              <p className="text-sm text-muted-foreground">{item.notes}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Select
                            key={`inv-status-${item.id}-${status}`}
                            value={status}
                            onValueChange={(value: InventoryStatus) => handleStatusChange(item.id, value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full" textValue="Full">
                                <span className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  Full
                                </span>
                              </SelectItem>
                              <SelectItem value="half" textValue="Half">
                                <span className="flex items-center gap-2">
                                  <Circle className="h-4 w-4 text-blue-600" />
                                  Half
                                </span>
                              </SelectItem>
                              <SelectItem value="running_low" textValue="Running Low">
                                <span className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                                  Running Low
                                </span>
                              </SelectItem>
                              <SelectItem value="out" textValue="Out">
                                <span className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-red-600" />
                                  Out
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {(status === 'running_low' || status === 'out') && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRequestReorder(item.id)}
                              disabled={item.reorderTaskCreated}
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              {item.reorderTaskCreated ? 'Requested' : 'Reorder'}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
            <DialogDescription>
              Add a supplement or item that's not in your protocol
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input
                id="itemName"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g., Vitamin D3"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="itemCategory">Category (optional)</Label>
              <Input
                id="itemCategory"
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                placeholder="e.g., Vitamins"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="itemNotes">Notes (optional)</Label>
              <Textarea
                id="itemNotes"
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                placeholder="Any additional notes..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                // TODO: Implement add item via token
                toast.info("Feature coming soon - contact your coach to add items");
                setAddDialogOpen(false);
              }}
              disabled={!newItemName.trim()}
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
