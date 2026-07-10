import * as React from "react";
import AdminLayout from "@/components/AdminLayout";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { 
  Package, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  ArrowLeft,
  Printer,
  PenTool,
  Save,
  User,
  Mail,
  Calendar,
  ClipboardCheck,
  PackageX,
  MapPin,
  Edit,
  Tag,
  RefreshCw,
  Lock,
  Unlock,
  History,
  Shield,
  Download,
  Truck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Play
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocation, useParams } from "wouter";
import { useGoBack } from "@/hooks/useGoBack";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete, type AddressComponents } from '@/components/ui/address-autocomplete';
import { PhoneInput } from '@/components/ui/phone-input';

export default function PackingSlipDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const goBack = useGoBack("/admin/packing-slips");
  const [signatureMode, setSignatureMode] = React.useState(false);
  const [signatureData, setSignatureData] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [sendNotification, setSendNotification] = React.useState(true);
  const [trackingCarrier, setTrackingCarrier] = React.useState("");
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [editShippingOpen, setEditShippingOpen] = React.useState(false);
  const [editDimensionsOpen, setEditDimensionsOpen] = React.useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = React.useState(false);
  const [auditLogOpen, setAuditLogOpen] = React.useState(false);
  const [shippingForm, setShippingForm] = React.useState({
    shippingName: "",
    shippingStreet: "",
    shippingCity: "",
    shippingState: "",
    shippingZip: "",
    shippingCountry: "USA",
    shippingPhone: "",
  });
  const [dimensionsForm, setDimensionsForm] = React.useState({
    packageWeight: "",
    packageLength: "",
    packageWidth: "",
    packageHeight: "",
  });
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const isDrawingRef = React.useRef(false);
  const [expandedItemId, setExpandedItemId] = React.useState<number | null>(null);
  const [packingMode, setPackingMode] = React.useState(false);
  const [actionedInSession, setActionedInSession] = React.useState<Set<number>>(new Set());
  const [fulfilledSectionOpen, setFulfilledSectionOpen] = React.useState(false);
  const [backorderedSectionOpen, setBackorderedSectionOpen] = React.useState(true);
  
  const { data: packingSlip, isLoading, refetch } = trpc.packingSlip.getById.useQuery(
    { id: parseInt(params.id || "0") },
    { enabled: !!params.id }
  );

  const updateItemMutation = trpc.packingSlip.updateItem.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update item");
    },
  });

  const batchFulfillMutation = trpc.packingSlip.batchFulfillItems.useMutation({
    onSuccess: (data) => {
      refetch();
      toast.success(`${data.updated} item${data.updated !== 1 ? 's' : ''} updated`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update items");
    },
  });

  const signMutation = trpc.packingSlip.sign.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Packing slip signed and verified!");
      setSignatureMode(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to sign packing slip");
    },
  });

  const updateShippingMutation = trpc.packingSlip.updateShipping.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Shipping address updated!");
      setEditShippingOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update shipping address");
    },
  });

  const openEditShipping = () => {
    if (packingSlip) {
      setShippingForm({
        shippingName: packingSlip.shippingName || "",
        shippingStreet: packingSlip.shippingStreet || "",
        shippingCity: packingSlip.shippingCity || "",
        shippingState: packingSlip.shippingState || "",
        shippingZip: packingSlip.shippingZip || "",
        shippingCountry: packingSlip.shippingCountry || "USA",
        shippingPhone: packingSlip.shippingPhone || "",
      });
    }
    setEditShippingOpen(true);
  };

  const handleSaveShipping = () => {
    if (!packingSlip) return;
    updateShippingMutation.mutate({
      packingSlipId: packingSlip.id,
      ...shippingForm,
    });
  };

  const updateDimensionsMutation = trpc.packingSlip.updateDimensions.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Package dimensions updated!");
      setEditDimensionsOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update package dimensions");
    },
  });

  const markDeliveredMutation = trpc.packingSlip.markDelivered.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Package marked as delivered! Notification sent to customer.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to mark as delivered");
    },
  });

  const updateDeliveryStatusMutation = trpc.packingSlip.updateDeliveryStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Delivery status updated!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update delivery status");
    },
  });

  const regenerateMutation = trpc.packingSlip.regenerate.useMutation({
    onSuccess: (data) => {
      refetch();
      mismatchRefetch();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to regenerate packing slip");
    },
  });

  const lockMutation = trpc.packingSlip.lock.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Packing slip locked - no modifications allowed");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to lock packing slip");
    },
  });

  const unlockMutation = trpc.packingSlip.unlock.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Packing slip unlocked - modifications allowed");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to unlock packing slip");
    },
  });

  const downloadPdfMutation = trpc.packingSlip.downloadPdf.useMutation({
    onSuccess: (data: { data: string; filename: string }) => {
      // Create blob from base64 data and download
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to download PDF');
    },
  });

  const { data: auditLog, refetch: refetchAuditLog } = trpc.packingSlip.getAuditLog.useQuery(
    { packingSlipId: parseInt(params.id || "0") },
    { enabled: auditLogOpen && !!params.id }
  );

  // Check for mismatches between packing slip and current protocol
  const { data: mismatchData, refetch: mismatchRefetch } = trpc.packingSlip.checkMismatch.useQuery(
    { packingSlipId: parseInt(params.id || "0") },
    { enabled: !!params.id && !!packingSlip }
  );

  const openEditDimensions = () => {
    if (packingSlip) {
      setDimensionsForm({
        packageWeight: packingSlip.packageWeight || "",
        packageLength: packingSlip.packageLength || "",
        packageWidth: packingSlip.packageWidth || "",
        packageHeight: packingSlip.packageHeight || "",
      });
    }
    setEditDimensionsOpen(true);
  };

  const handleSaveDimensions = () => {
    if (!packingSlip) return;
    updateDimensionsMutation.mutate({
      packingSlipId: packingSlip.id,
      packageWeight: dimensionsForm.packageWeight ? parseFloat(dimensionsForm.packageWeight) : null,
      packageLength: dimensionsForm.packageLength ? parseFloat(dimensionsForm.packageLength) : null,
      packageWidth: dimensionsForm.packageWidth ? parseFloat(dimensionsForm.packageWidth) : null,
      packageHeight: dimensionsForm.packageHeight ? parseFloat(dimensionsForm.packageHeight) : null,
    });
  };

  const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending: {
      label: "Pending",
      className: "bg-gray-100 text-gray-600",
      icon: <Clock className="h-4 w-4" />,
    },
    fulfilled: {
      label: "Fulfilled",
      className: "bg-green-100 text-green-700",
      icon: <CheckCircle className="h-4 w-4" />,
    },
    partial: {
      label: "Partial",
      className: "bg-amber-100 text-amber-700",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    backordered: {
      label: "Backordered",
      className: "bg-orange-100 text-orange-700",
      icon: <PackageX className="h-4 w-4" />,
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-red-100 text-red-700",
      icon: <XCircle className="h-4 w-4" />,
    },
    in_progress: {
      label: "In Progress",
      className: "bg-blue-100 text-blue-700",
      icon: <Package className="h-4 w-4" />,
    },
    complete: {
      label: "Complete",
      className: "bg-green-100 text-green-700",
      icon: <CheckCircle className="h-4 w-4" />,
    },
  };

  // Canvas signature handling
  React.useEffect(() => {
    if (!signatureMode || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set up canvas
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        };
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };
    
    const startDrawing = (e: MouseEvent | TouchEvent) => {
      isDrawingRef.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };
    
    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };
    
    const stopDrawing = () => {
      isDrawingRef.current = false;
      setSignatureData(canvas.toDataURL());
    };
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
    
    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [signatureMode]);

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setSignatureData("");
    }
  };

  const handleFulfillItem = (itemId: number, quantity: number, currentFulfilled: number) => {
    const newFulfilled = currentFulfilled < quantity ? quantity : 0;
    updateItemMutation.mutate({
      itemId,
      quantityFulfilled: newFulfilled,
      status: newFulfilled === quantity ? 'fulfilled' : newFulfilled > 0 ? 'partial' : 'pending',
    });
  };

  const handleBackorderItem = (itemId: number, quantity: number) => {
    updateItemMutation.mutate({
      itemId,
      quantityBackordered: quantity,
      status: 'backordered',
    });
  };

  // Derived item groupings for the grouped view
  const pendingItems = packingSlip?.items?.filter((i: any) => i.status === 'pending' || i.status === 'partial') ?? [];
  const fulfilledItems = packingSlip?.items?.filter((i: any) => i.status === 'fulfilled') ?? [];
  const backorderedItems = packingSlip?.items?.filter((i: any) => i.status === 'backordered' || i.status === 'cancelled') ?? [];
  const pendingByType = pendingItems.reduce<Record<string, number[]>>((acc, item: any) => {
    if (!acc[item.itemType]) acc[item.itemType] = [];
    acc[item.itemType].push(item.id);
    return acc;
  }, {});

  // Packing mode: items not yet actioned in this session
  const packableItems = pendingItems.filter((i: any) => !actionedInSession.has(i.id));
  const currentPackingItem = packableItems[0] ?? null;

  const startPackingMode = () => {
    setActionedInSession(new Set());
    setPackingMode(true);
  };

  const exitPackingMode = () => {
    setPackingMode(false);
    setActionedInSession(new Set());
    refetch();
  };

  const handlePackingAction = (action: 'fulfill' | 'backorder') => {
    if (!currentPackingItem) return;
    // Optimistically remove from visible queue immediately
    setActionedInSession(prev => new Set([...prev, currentPackingItem.id]));
    if (action === 'fulfill') {
      updateItemMutation.mutate({
        itemId: currentPackingItem.id,
        quantityFulfilled: currentPackingItem.quantity,
        status: 'fulfilled',
      });
    } else {
      updateItemMutation.mutate({
        itemId: currentPackingItem.id,
        quantityBackordered: currentPackingItem.quantity,
        status: 'backordered',
      });
    }
  };

  const skipPackingItem = () => {
    if (!currentPackingItem) return;
    setActionedInSession(prev => new Set([...prev, currentPackingItem.id]));
  };

  // Keyboard shortcuts for packing mode
  React.useEffect(() => {
    if (!packingMode) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (currentPackingItem && !updateItemMutation.isPending) handlePackingAction('fulfill');
      } else if (e.key === 'b' || e.key === 'B') {
        if (currentPackingItem && !updateItemMutation.isPending) handlePackingAction('backorder');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        skipPackingItem();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [packingMode, currentPackingItem, updateItemMutation.isPending]);

  const handleSign = () => {
    if (!signatureData) {
      toast.error("Please provide a signature");
      return;
    }
    
    signMutation.mutate({
      packingSlipId: parseInt(params.id || "0"),
      signatureData,
      notes: notes || undefined,
      sendNotification,
      trackingCarrier: trackingCarrier || undefined,
      trackingNumber: trackingNumber || undefined,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintShippingLabel = () => {
    if (!packingSlip) return;
    
    // Create a new window for the shipping label
    const labelWindow = window.open('', '_blank', 'width=450,height=650');
    if (!labelWindow) {
      toast.error("Please allow popups to print shipping labels");
      return;
    }

    // Format the address
    const fromAddress = {
      name: "Omega Longevity",
      street: "1098 W. South Jordan Pkwy #106",
      city: "South Jordan",
      state: "UT",
      zip: "84095",
      country: "USA"
    };

    const toAddress = {
      name: packingSlip.shippingName || packingSlip.clientName,
      street: packingSlip.shippingStreet || "",
      city: packingSlip.shippingCity || "",
      state: packingSlip.shippingState || "",
      zip: packingSlip.shippingZip || "",
      country: packingSlip.shippingCountry || "USA",
      phone: packingSlip.shippingPhone || ""
    };

    // Generate the label HTML
    const labelHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shipping Label - ${packingSlip.clientName}</title>
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
            width: 4in;
            height: 6in;
            padding: 0.25in;
            background: white;
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
            <div class="to-name">${toAddress.name}</div>
            <div class="to-address">
              ${toAddress.street}<br>
              ${toAddress.city}, ${toAddress.state} ${toAddress.zip}<br>
              ${toAddress.country !== 'USA' ? toAddress.country + '<br>' : ''}
            </div>
            ${toAddress.phone ? '<div class="to-phone">Phone: ' + toAddress.phone + '</div>' : ''}
          </div>
          
          <div class="barcode-placeholder">
            <div class="barcode-text">PS-${packingSlip.id.toString().padStart(6, '0')}</div>
          </div>
          
          <div class="footer">
            <span class="order-id">Order #${packingSlip.id}</span>
            <span>${new Date().toLocaleDateString()}</span>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    labelWindow.document.write(labelHtml);
    labelWindow.document.close();
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

  if (!packingSlip) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Packing slip not found</h2>
          <Button onClick={() => setLocation('/admin/packing-slips')} className="mt-4">
            Back to Packing Slips
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const slipStatus = statusConfig[packingSlip.status] || statusConfig.pending;
  const progress = packingSlip.totalItems > 0
    ? Math.round((packingSlip.itemsFulfilled / packingSlip.totalItems) * 100)
    : 0;

  // Item row renderer shared across all three sections
  const renderItemRow = (item: any) => {
    const itemStatus = statusConfig[item.status] || statusConfig.pending;
    const isFulfilled = item.quantityFulfilled >= item.quantity;
    return (
      <div
        key={item.id}
        className={`grid grid-cols-12 gap-4 p-3 rounded-lg border items-center ${
          isFulfilled ? 'bg-green-50 border-green-200' :
          item.status === 'backordered' ? 'bg-orange-50 border-orange-200' : ''
        }`}
      >
        <div className="col-span-1 print:hidden">
          <Checkbox
            checked={isFulfilled}
            onCheckedChange={() => handleFulfillItem(item.id, item.quantity, item.quantityFulfilled)}
            disabled={updateItemMutation.isPending || !!packingSlip.signedAt || !!packingSlip.isLocked}
          />
        </div>
        <div className="col-span-4 print:col-span-5">
          <p className={`font-medium ${isFulfilled ? 'line-through text-muted-foreground' : ''}`}>
            {item.itemName}
          </p>
          {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
        </div>
        <div className="col-span-2">
          <Badge variant="outline" className="text-xs">{item.itemType}</Badge>
        </div>
        <div className="col-span-1 text-center font-semibold">{item.quantity}</div>
        <div className="col-span-2">
          <Badge className={itemStatus.className}>
            {itemStatus.icon}
            <span className="ml-1">{itemStatus.label}</span>
          </Badge>
        </div>
        <div className="col-span-2 print:hidden flex items-center gap-1">
          {!isFulfilled && item.status !== 'backordered' && !packingSlip.signedAt && !packingSlip.isLocked && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBackorderItem(item.id, item.quantity)}
              disabled={updateItemMutation.isPending}
            >
              <PackageX className="h-3 w-3 mr-1" />
              Backorder
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
            className="ml-auto"
          >
            {expandedItemId === item.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
        {expandedItemId === item.id && (
          <div className="col-span-12 bg-gray-50 rounded-lg p-3 mt-1 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Ship Source</Label>
                <Select
                  value={item.shipSource || 'omega'}
                  onValueChange={(val) => updateItemMutation.mutate({ itemId: item.id, shipSource: val as 'omega' | 'dropship' | 'vendor' | 'client_sourced' })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="omega">Omega (In-House)</SelectItem>
                    <SelectItem value="dropship">Drop Ship</SelectItem>
                    <SelectItem value="vendor">Vendor Direct</SelectItem>
                    <SelectItem value="client_sourced">Client Sourced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Carrier</Label>
                <Select
                  value={item.itemTrackingCarrier || ''}
                  onValueChange={(val) => updateItemMutation.mutate({ itemId: item.id, itemTrackingCarrier: val })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select carrier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FedEx">FedEx</SelectItem>
                    <SelectItem value="UPS">UPS</SelectItem>
                    <SelectItem value="USPS">USPS</SelectItem>
                    <SelectItem value="DHL">DHL</SelectItem>
                    <SelectItem value="PirateShip">PirateShip</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Tracking #</Label>
                <div className="flex gap-1">
                  <Input
                    className="h-8 text-xs"
                    placeholder="Enter tracking number"
                    defaultValue={item.itemTrackingNumber || ''}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val !== (item.itemTrackingNumber || '')) {
                        updateItemMutation.mutate({ itemId: item.id, itemTrackingNumber: val, itemTrackingCarrier: item.itemTrackingCarrier || undefined });
                      }
                    }}
                  />
                  {item.itemTrackingUrl && (
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => window.open(item.itemTrackingUrl, '_blank')}>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {item.shipSource && (
                <Badge variant="outline" className={`text-xs ${
                  item.shipSource === 'omega' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  item.shipSource === 'dropship' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  item.shipSource === 'vendor' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  'bg-gray-50 text-gray-700 border-gray-200'
                }`}>
                  <Truck className="h-3 w-3 mr-1" />
                  {item.shipSource === 'omega' ? 'Omega' : item.shipSource === 'dropship' ? 'Drop Ship' : item.shipSource === 'vendor' ? 'Vendor' : 'Client Sourced'}
                </Badge>
              )}
              {item.itemTrackingNumber && (
                <Badge
                  variant="outline"
                  className="text-xs bg-green-50 text-green-700 border-green-200 cursor-pointer"
                  onClick={() => item.itemTrackingUrl && window.open(item.itemTrackingUrl, '_blank')}
                >
                  <Package className="h-3 w-3 mr-1" />
                  {item.itemTrackingCarrier || 'Tracking'}: {item.itemTrackingNumber}
                  {item.itemTrackingUrl && <ExternalLink className="h-3 w-3 ml-1" />}
                </Badge>
              )}
            </div>
          </div>
        )}
        {expandedItemId !== item.id && (item.shipSource && item.shipSource !== 'omega' || item.itemTrackingNumber) && (
          <div className="col-span-12 flex gap-2 pl-8 -mt-1 mb-1">
            {item.shipSource && item.shipSource !== 'omega' && (
              <Badge variant="outline" className={`text-[10px] py-0 ${
                item.shipSource === 'dropship' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                item.shipSource === 'vendor' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                'bg-gray-50 text-gray-600 border-gray-200'
              }`}>
                {item.shipSource === 'dropship' ? 'Drop Ship' : item.shipSource === 'vendor' ? 'Vendor' : 'Client Sourced'}
              </Badge>
            )}
            {item.itemTrackingNumber && (
              <Badge
                variant="outline"
                className="text-[10px] py-0 bg-green-50 text-green-600 border-green-200 cursor-pointer"
                onClick={() => item.itemTrackingUrl && window.open(item.itemTrackingUrl, '_blank')}
              >
                {item.itemTrackingCarrier || 'Track'}: {item.itemTrackingNumber.substring(0, 12)}...
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 print:space-y-4">
        {/* Header - Hidden on print */}
        <div className="flex items-center justify-between print:hidden">
          <Button variant="ghost" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Packing Slips
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setRegenerateConfirmOpen(true)}
              disabled={regenerateMutation.isPending || !!packingSlip.signedAt}
              title={packingSlip.signedAt ? "Cannot regenerate a signed packing slip" : "Regenerate items from protocol"}
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ClipboardCheck className="h-4 w-4 mr-2" />
              )}
              Regenerate Items
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            {(packingSlip.shippingStreet || packingSlip.shippingCity) && (
              <Button variant="outline" onClick={handlePrintShippingLabel}>
                <Tag className="h-4 w-4 mr-2" />
                Print Label
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => {
                setAuditLogOpen(true);
                refetchAuditLog();
              }}
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
            {packingSlip.isLocked ? (
              <Button 
                variant="outline" 
                onClick={() => unlockMutation.mutate({ packingSlipId: packingSlip.id })}
                disabled={unlockMutation.isPending}
                className="text-amber-600 border-amber-300 hover:bg-amber-50"
              >
                {unlockMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Unlock className="h-4 w-4 mr-2" />
                )}
                Unlock
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => lockMutation.mutate({ packingSlipId: packingSlip.id })}
                disabled={lockMutation.isPending}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                {lockMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Lock
              </Button>
            )}
            {!packingSlip.signedAt && !packingSlip.isLocked && pendingItems.length > 0 && (
              <Button onClick={startPackingMode} className="bg-green-600 hover:bg-green-700 text-white">
                <Play className="h-4 w-4 mr-2" />
                Packing Mode
                <span className="ml-1.5 text-xs bg-white/25 px-1.5 py-0.5 rounded-full">{pendingItems.length}</span>
              </Button>
            )}
            {!packingSlip.signedAt && (
              <Button onClick={() => setSignatureMode(true)}>
                <PenTool className="h-4 w-4 mr-2" />
                Sign & Verify
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => downloadPdfMutation.mutate({ packingSlipId: packingSlip.id })}
              disabled={downloadPdfMutation.isPending}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              {downloadPdfMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>
          </div>
        </div>

        {/* Mismatch Warning Banner */}
        {mismatchData?.hasMismatch && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 print:hidden">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800">Packing Slip Out of Sync</h3>
                <p className="text-sm text-amber-700 mt-1">
                  This packing slip doesn't match the current protocol. The protocol may have been modified after this packing slip was created.
                </p>
                <div className="mt-2 space-y-1">
                  {mismatchData.mismatches.map((m, idx) => (
                    <div key={idx} className="text-sm">
                      {m.type === 'missing' && (
                        <span className="text-red-600">• Missing: {m.itemName} (should be qty {m.expected})</span>
                      )}
                      {m.type === 'extra' && (
                        <span className="text-orange-600">• Extra: {m.itemName} (qty {m.actual}) - not on current fulfillment list (may be client-sourced or removed)</span>
                      )}
                      {m.type === 'quantity' && (
                        <span className="text-amber-600">• Quantity mismatch: {m.itemName} - packing slip has {m.actual}, protocol has {m.expected}</span>
                      )}
                    </div>
                  ))}
                </div>
                {!packingSlip.signedAt ? (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => setRegenerateConfirmOpen(true)}
                    disabled={regenerateMutation.isPending}
                  >
                    {regenerateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sync with Protocol
                  </Button>
                ) : (
                  <p className="mt-3 text-sm text-amber-600 italic">
                    This packing slip is signed and cannot be synced. Items must be manually adjusted.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Print Header */}
        <div className="hidden print:block text-center mb-8">
          <div className="inline-block bg-white rounded-lg px-4 py-2 mb-3">
            <img src="/omega-longevity-logo.png" alt="Omega Longevity" className="h-12 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold">PACKING SLIP</h1>
          <p className="text-sm text-muted-foreground">1098 W. South Jordan Pkwy #106, South Jordan, UT 84095</p>
        </div>

        {/* Client Info & Status */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{packingSlip.clientName}</span>
                {/* Source link — bridge back to the originating protocol invoice /
                    custom order / store order (data is on the slip; this makes it clickable). */}
                {(() => {
                  const src = (packingSlip as any).source as 'protocol' | 'store' | 'custom' | undefined;
                  const protocolId = (packingSlip as any).clientProtocolId;
                  const customOrderId = (packingSlip as any).customOrderId;
                  const storeOrderId = (packingSlip as any).storeOrderId;
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
                    label = `Protocol / Invoice #${protocolId}`;
                  }
                  if (!href) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => setLocation(href!)}
                      title={`Open source: ${label}`}
                      className="print:hidden inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {label}
                    </button>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{packingSlip.clientEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Created: {toLocaleDateStringMT(packingSlip.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
              </div>
              
              {/* Shipping Address */}
              {(packingSlip.shippingStreet || packingSlip.shippingCity) && (
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Ship To:</p>
                    <Button variant="ghost" size="sm" onClick={openEditShipping} className="h-7 px-2">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <div className="text-sm space-y-1">
                    {packingSlip.shippingName && (
                      <p className="font-medium">{packingSlip.shippingName}</p>
                    )}
                    {packingSlip.shippingStreet && (
                      <p>{packingSlip.shippingStreet}</p>
                    )}
                    {(packingSlip.shippingCity || packingSlip.shippingState || packingSlip.shippingZip) && (
                      <p>
                        {packingSlip.shippingCity}{packingSlip.shippingCity && packingSlip.shippingState ? ', ' : ''}
                        {packingSlip.shippingState} {packingSlip.shippingZip}
                      </p>
                    )}
                    {packingSlip.shippingCountry && packingSlip.shippingCountry !== 'USA' && (
                      <p>{packingSlip.shippingCountry}</p>
                    )}
                    {packingSlip.shippingPhone && (
                      <p className="text-muted-foreground">Phone: {packingSlip.shippingPhone}</p>
                    )}
                  </div>
                </div>
              )}
              {!packingSlip.shippingStreet && !packingSlip.shippingCity && (
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-amber-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      No shipping address on file
                    </p>
                    <Button variant="outline" size="sm" onClick={openEditShipping} className="h-7">
                      <MapPin className="h-3 w-3 mr-1" />
                      Add Address
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Package Dimensions */}
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Package Dimensions:</p>
                  <Button variant="ghost" size="sm" onClick={openEditDimensions} className="h-7 px-2">
                    <Edit className="h-3 w-3 mr-1" />
                    {(packingSlip.packageWeight || packingSlip.packageLength) ? 'Edit' : 'Add'}
                  </Button>
                </div>
                {(packingSlip.packageWeight || packingSlip.packageLength || packingSlip.packageWidth || packingSlip.packageHeight) ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {packingSlip.packageWeight && (
                      <div className="p-2 bg-gray-100 rounded">
                        <p className="text-muted-foreground text-xs">Weight</p>
                        <p className="font-medium">{packingSlip.packageWeight} lbs</p>
                      </div>
                    )}
                    {(packingSlip.packageLength || packingSlip.packageWidth || packingSlip.packageHeight) && (
                      <div className="p-2 bg-gray-100 rounded">
                        <p className="text-muted-foreground text-xs">Dimensions (L×W×H)</p>
                        <p className="font-medium">
                          {packingSlip.packageLength || '-'}" × {packingSlip.packageWidth || '-'}" × {packingSlip.packageHeight || '-'}"
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No dimensions set</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Fulfillment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={slipStatus.className}>
                  {slipStatus.icon}
                  <span className="ml-1">{slipStatus.label}</span>
                </Badge>
                <span className="text-sm font-medium">{progress}% Complete</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="p-2 bg-gray-100 rounded">
                  <p className="font-semibold">{packingSlip.totalItems}</p>
                  <p className="text-muted-foreground">Total</p>
                </div>
                <div className="p-2 bg-green-50 rounded">
                  <p className="font-semibold text-green-600">{packingSlip.itemsFulfilled}</p>
                  <p className="text-muted-foreground">Fulfilled</p>
                </div>
                <div className="p-2 bg-amber-50 rounded">
                  <p className="font-semibold text-amber-600">{packingSlip.itemsBackordered}</p>
                  <p className="text-muted-foreground">Backordered</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Delivery Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={{
                  pending: 'bg-gray-100 text-gray-600',
                  shipped: 'bg-blue-100 text-blue-700',
                  in_transit: 'bg-purple-100 text-purple-700',
                  delivered: 'bg-green-100 text-green-700',
                  exception: 'bg-red-100 text-red-700',
                }[((packingSlip as any).deliveryStatus || 'pending') as 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'exception']}>
                  {{
                    pending: 'Pending',
                    shipped: 'Shipped',
                    in_transit: 'In Transit',
                    delivered: '✅ Delivered',
                    exception: 'Exception',
                  }[((packingSlip as any).deliveryStatus || 'pending') as 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'exception']}
                </Badge>
                {(packingSlip as any).deliveredAt && (
                  <span className="text-sm text-muted-foreground">
                    Delivered: {toLocaleDateStringMT((packingSlip as any).deliveredAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                  </span>
                )}
              </div>
              
              {/* Tracking Info */}
              {packingSlip.trackingNumber && (
                <div className="p-3 bg-gray-100 rounded-lg">
                  <p className="text-sm font-medium">Tracking: {packingSlip.trackingCarrier || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{packingSlip.trackingNumber}</p>
                  {packingSlip.trackingUrl && (
                    <a 
                      href={packingSlip.trackingUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Track Package →
                    </a>
                  )}
                </div>
              )}
              
              {/* Mark as Delivered Button */}
              {packingSlip.signedAt && (packingSlip as any).deliveryStatus !== 'delivered' && (
                <Button
                  onClick={() => markDeliveredMutation.mutate({ packingSlipId: packingSlip.id, sendNotification: true })}
                  disabled={markDeliveredMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {markDeliveredMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Marking as Delivered...</>
                  ) : (
                    <><CheckCircle className="h-4 w-4 mr-2" /> Mark as Delivered & Notify Customer</>
                  )}
                </Button>
              )}
              
              {(packingSlip as any).deliveryStatus === 'delivered' && (packingSlip as any).deliveryNotificationSent && (
                <p className="text-sm text-green-600 text-center">
                  ✅ Customer was notified of delivery
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Items List */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Items to Fulfill
                </CardTitle>
                <CardDescription>
                  Check off items as you pack. Fulfilled items collapse automatically.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Bulk quick-fulfill by item type */}
            {!packingSlip.signedAt && !packingSlip.isLocked && Object.keys(pendingByType).length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg print:hidden">
                <p className="text-xs font-medium text-blue-700 mb-2">Quick Fulfill by Type:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(pendingByType).map(([type, itemIds]) => (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-100"
                      disabled={batchFulfillMutation.isPending}
                      onClick={() => batchFulfillMutation.mutate({ packingSlipId: packingSlip.id, itemIds, action: 'fulfill' })}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Fulfill all {type} ({itemIds.length})
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Column Header */}
            <div className="grid grid-cols-12 gap-4 p-3 bg-gray-100 rounded-lg font-medium text-sm mb-2">
              <div className="col-span-1 print:hidden">Done</div>
              <div className="col-span-4 print:col-span-5">Item</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 print:hidden">Actions</div>
            </div>

            {/* Pending section — always visible */}
            {pendingItems.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 mb-2">
                  <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span className="text-sm font-semibold text-amber-800">Pending ({pendingItems.length})</span>
                </div>
                <div className="space-y-2">
                  {pendingItems.map((item: any) => renderItemRow(item))}
                </div>
              </div>
            )}

            {/* Backordered section — expanded by default */}
            {backorderedItems.length > 0 && (
              <div className="mb-3">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-100 mb-2 hover:bg-orange-100 transition-colors print:hidden"
                  onClick={() => setBackorderedSectionOpen(v => !v)}
                >
                  <PackageX className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  <span className="text-sm font-semibold text-orange-800">Backordered ({backorderedItems.length})</span>
                  <span className="ml-auto">{backorderedSectionOpen ? <ChevronUp className="h-4 w-4 text-orange-500" /> : <ChevronDown className="h-4 w-4 text-orange-500" />}</span>
                </button>
                {backorderedSectionOpen && (
                  <div className="space-y-2">
                    {backorderedItems.map((item: any) => renderItemRow(item))}
                  </div>
                )}
              </div>
            )}

            {/* Fulfilled section — collapsed by default */}
            {fulfilledItems.length > 0 && (
              <div>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-100 mb-2 hover:bg-green-100 transition-colors print:hidden"
                  onClick={() => setFulfilledSectionOpen(v => !v)}
                >
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-semibold text-green-800">Fulfilled ({fulfilledItems.length})</span>
                  <span className="ml-auto">{fulfilledSectionOpen ? <ChevronUp className="h-4 w-4 text-green-500" /> : <ChevronDown className="h-4 w-4 text-green-500" />}</span>
                </button>
                {fulfilledSectionOpen && (
                  <div className="space-y-2 print:hidden">
                    {fulfilledItems.map((item: any) => renderItemRow(item))}
                  </div>
                )}
                {/* Always show on print regardless of collapse state */}
                <div className="hidden print:block space-y-2">
                  {fulfilledItems.map((item: any) => renderItemRow(item))}
                </div>
              </div>
            )}

            {packingSlip.items?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No items on this packing slip.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Signature Section */}
        {packingSlip.signedAt ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Verified & Signed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Signed By</Label>
                  <p className="font-medium">{packingSlip.fulfilledByName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date & Time</Label>
                  <p className="font-medium">{toLocaleDateStringMT(packingSlip.signedAt)}</p>
                </div>
              </div>
              {packingSlip.signatureData && (
                <div>
                  <Label className="text-muted-foreground">Signature</Label>
                  <div className="border rounded-lg p-2 bg-white mt-1">
                    <img 
                      src={packingSlip.signatureData} 
                      alt="Signature" 
                      className="max-h-24"
                    />
                  </div>
                </div>
              )}
              {packingSlip.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="mt-1">{packingSlip.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : signatureMode ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                Sign & Verify Packing Slip
              </CardTitle>
              <CardDescription>
                Draw your signature below to verify this packing slip is complete
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Signature</Label>
                <div className="border-2 border-dashed rounded-lg mt-1 bg-white">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="w-full touch-none cursor-crosshair"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={clearSignature} className="mt-2">
                  Clear Signature
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Shipping Carrier</Label>
                  <select
                    value={trackingCarrier}
                    onChange={(e) => setTrackingCarrier(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select carrier...</option>
                    <option value="FedEx">FedEx</option>
                    <option value="UPS">UPS</option>
                    <option value="USPS">USPS</option>
                    <option value="DHL">DHL</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <Label>Tracking Number</Label>
                  <Input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes about this fulfillment..."
                  className="mt-1"
                />
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  id="sendNotification"
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sendNotification" className="text-sm text-blue-800">
                  <span className="font-medium">Send shipping notification email</span>
                  <span className="block text-xs text-blue-600">Client will receive an email with shipment details</span>
                </label>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleSign} disabled={!signatureData || signMutation.isPending}>
                  {signMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Sign & Complete
                </Button>
                <Button variant="outline" onClick={() => setSignatureMode(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Print Footer */}
        <div className="hidden print:block border-t pt-4 mt-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Packed By:</p>
              <div className="border-b border-black h-8"></div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Date:</p>
              <div className="border-b border-black h-8"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Shipping Dialog */}
      <Dialog open={editShippingOpen} onOpenChange={setEditShippingOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Edit Shipping Address
            </DialogTitle>
            <DialogDescription>
              Update the shipping address for this packing slip.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="shippingName">Full Name</Label>
              <Input
                id="shippingName"
                value={shippingForm.shippingName}
                onChange={(e) => setShippingForm({ ...shippingForm, shippingName: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shippingStreet">Street Address</Label>
              <AddressAutocomplete
                id="shippingStreet"
                value={shippingForm.shippingStreet}
                onChange={(value) => setShippingForm({ ...shippingForm, shippingStreet: value })}
                onAddressSelect={(address: AddressComponents) => {
                  setShippingForm({
                    ...shippingForm,
                    shippingStreet: address.street,
                    shippingCity: address.city,
                    shippingState: address.state,
                    shippingZip: address.zip,
                    shippingCountry: address.country || 'USA'
                  });
                }}
                placeholder="Start typing address..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="shippingCity">City</Label>
                <Input
                  id="shippingCity"
                  value={shippingForm.shippingCity}
                  onChange={(e) => setShippingForm({ ...shippingForm, shippingCity: e.target.value })}
                  placeholder="Austin"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shippingState">State</Label>
                <Input
                  id="shippingState"
                  value={shippingForm.shippingState}
                  onChange={(e) => setShippingForm({ ...shippingForm, shippingState: e.target.value })}
                  placeholder="TX"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="shippingZip">ZIP Code</Label>
                <Input
                  id="shippingZip"
                  value={shippingForm.shippingZip}
                  onChange={(e) => setShippingForm({ ...shippingForm, shippingZip: e.target.value })}
                  placeholder="78737"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shippingCountry">Country</Label>
                <Input
                  id="shippingCountry"
                  value={shippingForm.shippingCountry}
                  onChange={(e) => setShippingForm({ ...shippingForm, shippingCountry: e.target.value })}
                  placeholder="USA"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shippingPhone">Phone Number</Label>
              <PhoneInput
                id="shippingPhone"
                value={shippingForm.shippingPhone}
                onChange={(value) => setShippingForm({ ...shippingForm, shippingPhone: value })}
                placeholder="(555) 123-4567"
                showCountryCode={true}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditShippingOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveShipping} disabled={updateShippingMutation.isPending}>
              {updateShippingMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Package Dimensions Dialog */}
      <Dialog open={editDimensionsOpen} onOpenChange={setEditDimensionsOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Package Dimensions
            </DialogTitle>
            <DialogDescription>
              Enter the package weight and dimensions for carrier rate shopping.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="packageWeight">Weight (lbs)</Label>
              <Input
                id="packageWeight"
                type="number"
                step="0.1"
                min="0"
                value={dimensionsForm.packageWeight}
                onChange={(e) => setDimensionsForm({ ...dimensionsForm, packageWeight: e.target.value })}
                placeholder="e.g., 2.5"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="packageLength">Length (in)</Label>
                <Input
                  id="packageLength"
                  type="number"
                  step="0.1"
                  min="0"
                  value={dimensionsForm.packageLength}
                  onChange={(e) => setDimensionsForm({ ...dimensionsForm, packageLength: e.target.value })}
                  placeholder="12"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="packageWidth">Width (in)</Label>
                <Input
                  id="packageWidth"
                  type="number"
                  step="0.1"
                  min="0"
                  value={dimensionsForm.packageWidth}
                  onChange={(e) => setDimensionsForm({ ...dimensionsForm, packageWidth: e.target.value })}
                  placeholder="8"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="packageHeight">Height (in)</Label>
                <Input
                  id="packageHeight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={dimensionsForm.packageHeight}
                  onChange={(e) => setDimensionsForm({ ...dimensionsForm, packageHeight: e.target.value })}
                  placeholder="6"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDimensionsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDimensions} disabled={updateDimensionsMutation.isPending}>
              {updateDimensionsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Dimensions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Confirmation Dialog */}
      <Dialog open={regenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Regenerate Items
            </DialogTitle>
            <DialogDescription className="text-left">
              <div className="space-y-3 pt-2">
                <p className="font-medium text-foreground">
                  This action will replace ALL items on this packing slip with the current recommended items from the protocol.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-amber-800 text-sm">
                    <strong>Warning:</strong> Any fulfillment status (checked items, backorder status) will be lost. This cannot be undone.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Only use this if the packing slip items are incorrect and need to be reset from the protocol.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRegenerateConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                regenerateMutation.mutate({ packingSlipId: packingSlip?.id || 0 });
                setRegenerateConfirmOpen(false);
              }}
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Yes, Regenerate Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Packing Mode Dialog */}
      <Dialog open={packingMode} onOpenChange={(open) => { if (!open) exitPackingMode(); }}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-600" />
              Packing Mode
            </DialogTitle>
            <DialogDescription>
              {packableItems.length > 0
                ? `${packableItems.length} item${packableItems.length !== 1 ? 's' : ''} remaining · Enter = Packed · B = Backorder · → = Skip`
                : 'All items actioned!'}
            </DialogDescription>
          </DialogHeader>

          {currentPackingItem ? (
            <div className="space-y-5 py-2">
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium tabular-nums">
                    {actionedInSession.size + ((packingSlip.items?.length ?? 0) - pendingItems.length)} / {packingSlip.items?.length ?? 0}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${((actionedInSession.size + ((packingSlip.items?.length ?? 0) - pendingItems.length)) / Math.max(packingSlip.items?.length ?? 1, 1)) * 100}%`
                    }}
                  />
                </div>
              </div>

              {/* Current item card */}
              <div className="border-2 rounded-xl p-6 text-center bg-card shadow-sm">
                <Badge variant="outline" className="mb-3">{currentPackingItem.itemType}</Badge>
                <p className="text-xl font-semibold mb-2 leading-tight">{currentPackingItem.itemName}</p>
                <p className="text-muted-foreground text-sm">
                  Quantity: <span className="font-bold text-foreground text-base">{currentPackingItem.quantity}</span>
                </p>
                {currentPackingItem.notes && (
                  <p className="text-sm text-amber-700 mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    {currentPackingItem.notes}
                  </p>
                )}
                {currentPackingItem.shipSource && currentPackingItem.shipSource !== 'omega' && (
                  <Badge variant="outline" className="mt-3 text-xs">
                    {currentPackingItem.shipSource === 'dropship' ? 'Drop Ship' :
                     currentPackingItem.shipSource === 'vendor' ? 'Vendor Direct' : 'Client Sourced'}
                  </Badge>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="h-14 text-base bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handlePackingAction('fulfill')}
                  disabled={updateItemMutation.isPending}
                >
                  {updateItemMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Packed
                      <kbd className="ml-2 text-xs bg-green-800/30 px-1.5 py-0.5 rounded font-mono">↵</kbd>
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="h-14 text-base border-orange-300 text-orange-700 hover:bg-orange-50"
                  onClick={() => handlePackingAction('backorder')}
                  disabled={updateItemMutation.isPending}
                >
                  <PackageX className="h-5 w-5 mr-2" />
                  Backorder
                  <kbd className="ml-2 text-xs bg-orange-100 px-1.5 py-0.5 rounded font-mono">B</kbd>
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={skipPackingItem}>
                  Skip →
                  <kbd className="ml-1 text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">→</kbd>
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={exitPackingMode}>
                  Exit
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <p className="text-lg font-semibold">All items actioned!</p>
                <p className="text-sm text-muted-foreground">You've worked through all pending items.</p>
              </div>
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={exitPackingMode}>
                Done — Back to Slip
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Audit Log Dialog */}
      <Dialog open={auditLogOpen} onOpenChange={setAuditLogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Packing Slip History
            </DialogTitle>
            <DialogDescription>
              Complete audit trail of all changes made to this packing slip.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {!auditLog || auditLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No history recorded yet.</p>
                <p className="text-sm">Changes will be tracked from now on.</p>
              </div>
            ) : (
              auditLog.map((entry: any) => (
                <div key={entry.id} className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {entry.action === 'locked' && <Lock className="h-4 w-4 text-green-600" />}
                      {entry.action === 'unlocked' && <Unlock className="h-4 w-4 text-amber-600" />}
                      {entry.action === 'signed' && <PenTool className="h-4 w-4 text-blue-600" />}
                      {entry.action === 'regenerated' && <RefreshCw className="h-4 w-4 text-purple-600" />}
                      {entry.action === 'item_status_changed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {entry.action === 'item_added' && <Package className="h-4 w-4 text-blue-600" />}
                      {entry.action === 'item_removed' && <PackageX className="h-4 w-4 text-red-600" />}
                      {entry.action === 'tracking_updated' && <MapPin className="h-4 w-4 text-indigo-600" />}
                      {entry.action === 'delivery_marked' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {entry.action === 'created' && <Package className="h-4 w-4 text-blue-600" />}
                      {entry.action === 'status_changed' && <Clock className="h-4 w-4 text-amber-600" />}
                      <span className="font-medium capitalize">
                        {entry.action.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {toLocaleDateStringMT(entry.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {entry.performedByName && (
                      <span>by {entry.performedByName}</span>
                    )}
                  </div>
                  {entry.details && (
                    <div className="mt-2 text-sm bg-background rounded p-2">
                      <pre className="whitespace-pre-wrap text-xs">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuditLogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
