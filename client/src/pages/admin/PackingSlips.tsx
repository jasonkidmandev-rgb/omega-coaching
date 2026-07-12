import * as React from "react";
import AdminLayout from "@/components/AdminLayout";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  Package, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  ChevronRight,
  Search,
  Filter,
  Truck,
  ClipboardList,
  Tag,
  Printer,
  Archive,
  ArchiveRestore,
  Trash2,
  MoreVertical,
  RefreshCw,
  Lock,
  Unlock,
  Download,
  FileDown,
  ShoppingCart,
  ExternalLink
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function PackingSlips() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedSlips, setSelectedSlips] = React.useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = React.useState("active");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [slipToDelete, setSlipToDelete] = React.useState<number | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  
  const utils = trpc.useUtils();
  const { data: packingSlips, isLoading } = trpc.packingSlip.list.useQuery();
  const { data: archivedSlips, isLoading: isLoadingArchived } = trpc.packingSlip.listArchived.useQuery();
  
  const archiveMutation = trpc.packingSlip.archive.useMutation({
    onSuccess: () => {
      utils.packingSlip.list.invalidate();
      utils.packingSlip.listArchived.invalidate();
      toast.success("Packing slip archived");
    },
    onError: (error) => toast.error(error.message),
  });
  
  const restoreMutation = trpc.packingSlip.restore.useMutation({
    onSuccess: () => {
      utils.packingSlip.list.invalidate();
      utils.packingSlip.listArchived.invalidate();
      toast.success("Packing slip restored");
    },
    onError: (error) => toast.error(error.message),
  });
  
  const permanentDeleteMutation = trpc.packingSlip.permanentDelete.useMutation({
    onSuccess: () => {
      utils.packingSlip.listArchived.invalidate();
      toast.success("Packing slip permanently deleted");
      setDeleteDialogOpen(false);
      setSlipToDelete(null);
    },
    onError: (error) => toast.error(error.message),
  });
  
  const bulkArchiveMutation = trpc.packingSlip.bulkArchive.useMutation({
    onSuccess: (data) => {
      utils.packingSlip.list.invalidate();
      utils.packingSlip.listArchived.invalidate();
      toast.success(`${data.archived} packing slip(s) archived`);
      setSelectedSlips(new Set());
    },
    onError: (error) => toast.error(error.message),
  });
  
  const bulkDeleteMutation = trpc.packingSlip.bulkDelete.useMutation({
    onSuccess: (data) => {
      utils.packingSlip.listArchived.invalidate();
      toast.success(`${data.deleted} packing slip(s) permanently deleted`);
      setSelectedSlips(new Set());
      setBulkDeleteDialogOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });
  
  const regenerateMutation = trpc.packingSlip.regenerate.useMutation({
    onSuccess: (data) => {
      utils.packingSlip.list.invalidate();
      toast.success(data.message);
    },
    onError: (error) => toast.error(error.message),
  });
  
  const bulkRegenerateMutation = trpc.packingSlip.bulkRegenerate.useMutation({
    onSuccess: (data) => {
      utils.packingSlip.list.invalidate();
      toast.success(`${data.regenerated} packing slip(s) regenerated with correct items`);
      setSelectedSlips(new Set());
    },
    onError: (error) => toast.error(error.message),
  });
  
  const bulkLockMutation = trpc.packingSlip.bulkLock.useMutation({
    onSuccess: (data) => {
      utils.packingSlip.list.invalidate();
      toast.success(`${data.locked} packing slip(s) locked`);
      setSelectedSlips(new Set());
    },
    onError: (error) => toast.error(error.message),
  });
  
  const bulkUnlockMutation = trpc.packingSlip.bulkUnlock.useMutation({
    onSuccess: (data) => {
      utils.packingSlip.list.invalidate();
      toast.success(`${data.unlocked} packing slip(s) unlocked`);
      setSelectedSlips(new Set());
    },
    onError: (error) => toast.error(error.message),
  });

  const downloadBatchPdfMutation = trpc.packingSlip.downloadBatchPdf.useMutation({
    onSuccess: (data: { data: string; filename: string }) => {
      // Convert base64 to blob and download
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${selectedSlips.size} packing slip(s) as PDF`);
      setSelectedSlips(new Set());
    },
    onError: (error: { message?: string }) => toast.error(error.message || 'Failed to generate PDF'),
  });

  const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending: {
      label: "Pending",
      className: "bg-gray-100 text-gray-600",
      icon: <Clock className="h-4 w-4" />,
    },
    in_progress: {
      label: "In Progress",
      className: "bg-blue-100 text-blue-700",
      icon: <Package className="h-4 w-4" />,
    },
    partial: {
      label: "Partial",
      className: "bg-amber-100 text-amber-700",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    complete: {
      label: "Complete",
      className: "bg-green-100 text-green-700",
      icon: <CheckCircle className="h-4 w-4" />,
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-red-100 text-red-700",
      icon: <XCircle className="h-4 w-4" />,
    },
  };

  const filteredSlips = React.useMemo(() => {
    if (!packingSlips) return [];
    
    return packingSlips.filter((slip) => {
      const matchesSearch = 
        slip.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slip.clientEmail.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || slip.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [packingSlips, searchTerm, statusFilter]);

  const stats = React.useMemo(() => {
    if (!packingSlips) return { pending: 0, inProgress: 0, partial: 0, complete: 0 };
    
    return {
      pending: packingSlips.filter(s => s.status === 'pending').length,
      inProgress: packingSlips.filter(s => s.status === 'in_progress').length,
      partial: packingSlips.filter(s => s.status === 'partial').length,
      complete: packingSlips.filter(s => s.status === 'complete').length,
    };
  }, [packingSlips]);

  // Get slips with shipping addresses for batch printing
  const slipsWithAddresses = React.useMemo(() => {
    if (!packingSlips) return [];
    return filteredSlips.filter(slip => slip.shippingStreet || slip.shippingCity);
  }, [filteredSlips, packingSlips]);

  const toggleSlipSelection = (slipId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedSlips);
    if (newSelected.has(slipId)) {
      newSelected.delete(slipId);
    } else {
      newSelected.add(slipId);
    }
    setSelectedSlips(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedSlips.size === slipsWithAddresses.length) {
      setSelectedSlips(new Set());
    } else {
      setSelectedSlips(new Set(slipsWithAddresses.map(s => s.id)));
    }
  };

  const handleBatchPrintLabels = () => {
    if (selectedSlips.size === 0) {
      toast.error("Please select at least one packing slip");
      return;
    }

    const selectedSlipData = filteredSlips.filter(s => selectedSlips.has(s.id));
    const slipsWithoutAddress = selectedSlipData.filter(s => !s.shippingStreet && !s.shippingCity);
    
    if (slipsWithoutAddress.length > 0) {
      toast.error(`${slipsWithoutAddress.length} selected slip(s) have no shipping address`);
      return;
    }

    // Create a new window for batch labels
    const labelWindow = window.open('', '_blank', 'width=450,height=800');
    if (!labelWindow) {
      toast.error("Please allow popups to print shipping labels");
      return;
    }

    const fromAddress = {
      name: "Omega Longevity",
      street: "1098 W. South Jordan Pkwy #106",
      city: "South Jordan",
      state: "UT",
      zip: "84095"
    };

    const labelsHtml = selectedSlipData.map(slip => `
      <div class="label-page">
        <div class="label-container">
          <div class="header">OMEGA LONGEVITY</div>
          
          <div class="from-section">
            <div class="from-label">FROM:</div>
            <div>${fromAddress.name}</div>
            <div>${fromAddress.street}</div>
            <div>${fromAddress.city}, ${fromAddress.state} ${fromAddress.zip}</div>
          </div>
          
          <div class="to-section">
            <div class="to-label">SHIP TO:</div>
            <div class="to-name">${slip.shippingName || slip.clientName}</div>
            <div class="to-address">
              ${slip.shippingStreet || ''}<br>
              ${slip.shippingCity || ''}, ${slip.shippingState || ''} ${slip.shippingZip || ''}<br>
              ${slip.shippingCountry && slip.shippingCountry !== 'USA' ? slip.shippingCountry + '<br>' : ''}
            </div>
            ${slip.shippingPhone ? '<div class="to-phone">Phone: ' + slip.shippingPhone + '</div>' : ''}
          </div>
          
          <div class="barcode-placeholder">
            <div class="barcode-text">PS-${slip.id.toString().padStart(6, '0')}</div>
          </div>
          
          <div class="footer">
            <span class="order-id">Order #${slip.id}</span>
            <span>${new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    `).join('');

    const batchLabelHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shipping Labels - Batch Print (${selectedSlipData.length} labels)</title>
        <style>
          @page {
            size: 4in 6in;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            background: white;
          }
          .label-page {
            width: 4in;
            height: 6in;
            padding: 0.25in;
            page-break-after: always;
          }
          .label-page:last-child {
            page-break-after: auto;
          }
          .label-container {
            border: 2px solid #000;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .header {
            background: #000;
            color: white;
            padding: 8px 12px;
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            letter-spacing: 1px;
          }
          .from-section {
            padding: 12px;
            border-bottom: 1px dashed #ccc;
            font-size: 11px;
          }
          .from-label {
            font-weight: bold;
            font-size: 10px;
            color: #666;
            margin-bottom: 4px;
          }
          .to-section {
            padding: 16px;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .to-label {
            font-weight: bold;
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
          }
          .to-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 6px;
          }
          .to-address {
            font-size: 14px;
            line-height: 1.5;
          }
          .to-phone {
            font-size: 12px;
            color: #666;
            margin-top: 8px;
          }
          .footer {
            border-top: 1px solid #000;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            background: #f5f5f5;
          }
          .order-id {
            font-weight: bold;
          }
          .barcode-placeholder {
            border-top: 1px solid #000;
            padding: 12px;
            text-align: center;
            background: #fafafa;
          }
          .barcode-text {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            letter-spacing: 2px;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    labelWindow.document.write(batchLabelHtml);
    labelWindow.document.close();
    toast.success(`Printing ${selectedSlipData.length} shipping label(s)`);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-primary" />
            Packing Slips
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage order fulfillment and track shipments
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('pending')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <Clock className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('in_progress')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('partial')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.partial}</p>
                  <p className="text-sm text-muted-foreground">Partial</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('complete')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.complete}</p>
                  <p className="text-sm text-muted-foreground">Complete</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Batch Controls */}
            {filteredSlips.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedSlips.size === filteredSlips.length && filteredSlips.length > 0}
                    onCheckedChange={() => {
                      if (selectedSlips.size === filteredSlips.length) {
                        setSelectedSlips(new Set());
                      } else {
                        setSelectedSlips(new Set(filteredSlips.map(s => s.id)));
                      }
                    }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedSlips.size > 0 
                      ? `${selectedSlips.size} selected` 
                      : `Select all (${filteredSlips.length})`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedSlips.size === 0) {
                        toast.error("Please select at least one packing slip");
                        return;
                      }
                      bulkRegenerateMutation.mutate({ ids: Array.from(selectedSlips) });
                    }}
                    disabled={selectedSlips.size === 0 || bulkRegenerateMutation.isPending}
                  >
                    {bulkRegenerateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ClipboardList className="h-4 w-4 mr-2" />
                    )}
                    Regenerate Items
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleBatchPrintLabels}
                    disabled={selectedSlips.size === 0}
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    Print Labels
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedSlips.size === 0) {
                        toast.error("Please select at least one packing slip");
                        return;
                      }
                      bulkLockMutation.mutate({ ids: Array.from(selectedSlips) });
                    }}
                    disabled={selectedSlips.size === 0 || bulkLockMutation.isPending}
                  >
                    {bulkLockMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4 mr-2" />
                    )}
                    Lock
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedSlips.size === 0) {
                        toast.error("Please select at least one packing slip");
                        return;
                      }
                      bulkUnlockMutation.mutate({ ids: Array.from(selectedSlips) });
                    }}
                    disabled={selectedSlips.size === 0 || bulkUnlockMutation.isPending}
                  >
                    {bulkUnlockMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Unlock className="h-4 w-4 mr-2" />
                    )}
                    Unlock
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      if (selectedSlips.size === 0) {
                        toast.error("Please select at least one packing slip");
                        return;
                      }
                      downloadBatchPdfMutation.mutate({ packingSlipIds: Array.from(selectedSlips) });
                    }}
                    disabled={selectedSlips.size === 0 || downloadBatchPdfMutation.isPending}
                  >
                    {downloadBatchPdfMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4 mr-2" />
                    )}
                    Download PDF
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Packing Slips List */}
        <Card>
          <CardHeader>
            <CardTitle>Active Packing Slips</CardTitle>
            <CardDescription>
              {filteredSlips.length} packing slip{filteredSlips.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSlips.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No packing slips found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your filters'
                    : 'Packing slips are created when clients approve their protocols'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSlips.map((slip) => {
                  const status = statusConfig[slip.status] || statusConfig.pending;
                  const progress = slip.totalItems > 0 
                    ? Math.round((slip.itemsFulfilled / slip.totalItems) * 100) 
                    : 0;
                  
                  const hasAddress = slip.shippingStreet || slip.shippingCity;
                  
                  return (
                    <div
                      key={slip.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/admin/packing-slips/${slip.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        {hasAddress && (
                          <div onClick={(e) => toggleSlipSelection(slip.id, e)}>
                            <Checkbox
                              checked={selectedSlips.has(slip.id)}
                              onCheckedChange={() => {}}
                            />
                          </div>
                        )}
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-semibold text-lg">
                            {slip.clientName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{slip.clientName}</p>
                            {/* Source link — see & jump to the protocol invoice /
                                custom order / store order this slip came from. */}
                            {(() => {
                              const src = (slip as any).source as 'protocol' | 'store' | 'custom' | undefined;
                              const protocolId = (slip as any).clientProtocolId;
                              const customOrderId = (slip as any).customOrderId;
                              const storeOrderId = (slip as any).storeOrderId;
                              let href: string | null = null;
                              let label = '';
                              if (src === 'custom' && customOrderId) {
                                href = `/admin/custom-orders/${customOrderId}`;
                                label = `Custom Order #${customOrderId}`;
                              } else if (src === 'store' && storeOrderId) {
                                href = `/admin/store-orders/${storeOrderId}`;
                                label = `Store Order #${storeOrderId}`;
                              } else if (protocolId) {
                                href = `/admin/clients/${protocolId}`;
                                label = `Protocol #${protocolId}`;
                              }
                              if (!href) return null;
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setLocation(href!); }}
                                  title={`Open source: ${label}`}
                                  className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {label}
                                </button>
                              );
                            })()}
                          </div>
                          <p className="text-sm text-muted-foreground">{slip.clientEmail}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={status.className}>
                              {status.icon}
                              <span className="ml-1">{status.label}</span>
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {slip.itemsFulfilled}/{slip.totalItems} items
                            </span>
                            {slip.itemsBackordered > 0 && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300">
                                {slip.itemsBackordered} backordered
                              </Badge>
                            )}
                            {!hasAddress && (
                              <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                No Address
                              </Badge>
                            )}
                            {(slip as any).hasMismatch && (
                              <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Needs Sync
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                          <p className="text-sm font-medium">{progress}% Complete</p>
                          <div className="w-24 h-2 bg-gray-100 rounded-full mt-1">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {toLocaleDateStringMT(slip.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                          </p>
                          {slip.signedAt && (
                            <p className="text-xs text-green-600">
                              Signed {toLocaleDateStringMT(slip.signedAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/admin/packing-slips/${slip.id}`);
                            }}>
                              <Package className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                archiveMutation.mutate({ id: slip.id });
                              }}
                              className="text-amber-600"
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {!['complete', 'cancelled'].includes(slip.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-blue-600 hover:text-blue-800 px-2 h-7 shrink-0"
                            onClick={(e) => { e.stopPropagation(); setLocation('/admin/fulfillment-queue'); }}
                            title="Open in Fulfillment Queue"
                          >
                            Queue →
                          </Button>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Bulk Archive Button */}
            {selectedSlips.size > 0 && (
              <div className="mt-4 pt-4 border-t flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => bulkArchiveMutation.mutate({ ids: Array.from(selectedSlips) })}
                  disabled={bulkArchiveMutation.isPending}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive {selectedSlips.size} Selected
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Archived Slips Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Archived Packing Slips
            </CardTitle>
            <CardDescription>
              Archived slips are automatically deleted after 30 days. {archivedSlips?.length || 0} archived slip(s).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingArchived ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !archivedSlips || archivedSlips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Archive className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No archived packing slips</p>
              </div>
            ) : (
              <div className="space-y-2">
                {archivedSlips.map((slip) => {
                  const archivedDate = slip.archivedAt ? new Date(slip.archivedAt) : new Date();
                  const deleteDate = new Date(archivedDate);
                  deleteDate.setDate(deleteDate.getDate() + 30);
                  const daysUntilDelete = Math.ceil((deleteDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div
                      key={slip.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {slip.clientName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">{slip.clientName}</p>
                          <p className="text-sm text-muted-foreground">
                            Archived {toLocaleDateStringMT(archivedDate, { year: 'numeric', month: 'numeric', day: 'numeric' })} •
                            <span className={daysUntilDelete <= 7 ? "text-red-500 font-medium" : ""}>
                              {daysUntilDelete > 0 ? ` Deletes in ${daysUntilDelete} days` : " Pending deletion"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreMutation.mutate({ id: slip.id })}
                          disabled={restoreMutation.isPending}
                        >
                          <ArchiveRestore className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSlipToDelete(slip.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Packing Slip?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The packing slip and all its items will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => slipToDelete && permanentDeleteMutation.mutate({ id: slipToDelete })}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
