import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AdminLayout from "@/components/AdminLayout";
import { toLocaleDateStringMT } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus, Search, MoreHorizontal, Eye, Trash2, Send, Package, Truck,
  CheckCircle, Clock, DollarSign, FileText, X, ChevronDown, ChevronUp,
  AlertCircle, RefreshCw, Copy, ExternalLink, Pencil, Save, Percent, ShieldAlert, ShieldCheck, Gift,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Status badge config
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color?: string }> = {
  draft: { label: "Draft", variant: "outline" },
  pending_payment: { label: "Pending Payment", variant: "secondary" },
  pending_venmo: { label: "Pending Payment", variant: "secondary", color: "bg-blue-100 text-blue-800" },
  paid: { label: "Paid", variant: "default", color: "bg-green-100 text-green-800" },
  processing: { label: "Processing", variant: "default", color: "bg-yellow-100 text-yellow-800" },
  shipped: { label: "Shipped", variant: "default", color: "bg-purple-100 text-purple-800" },
  delivered: { label: "Delivered", variant: "default", color: "bg-green-200 text-green-900" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  refunded: { label: "Refunded", variant: "destructive" },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, variant: "outline" as const };
  return (
    <Badge variant={config.variant} className={config.color || ""}>
      {config.label}
    </Badge>
  );
}

// ============ CREATE ORDER DIALOG ============
interface LineItem {
  inventoryItemId: number | null;
  name: string;
  description: string;
  quantity: number;
  pricePerUnit: string;
  originalPrice: string;
  itemType: "product" | "service" | "shipping" | "custom";
  isDiscountable: boolean;
}

function CreateOrderDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Client search
  const { data: clients } = trpc.clientProtocol.list.useQuery({ filter: "active" });
  const { data: inventoryData } = trpc.inventory.getWithProtocolPrices.useQuery();
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<{
    id?: number; userId?: number; name: string; email: string; phone?: string;
    shippingName?: string; shippingStreet?: string; shippingCity?: string;
    shippingState?: string; shippingZip?: string; shippingCountry?: string;
    shippingPhone?: string;
  } | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Order form
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "manual">("manual");
  const [shippingMethod, setShippingMethod] = useState<"standard" | "expedited" | "overnight" | "pickup">("standard");
  const [adminNotes, setAdminNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [discountType, setDiscountType] = useState<"dollar" | "percent">("dollar");
  const [discountOverride, setDiscountOverride] = useState(false);
  const [shippingFee, setShippingFee] = useState("0");

  // Shipping address
  const [shippingName, setShippingName] = useState("");
  const [shippingStreet, setShippingStreet] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingCountry, setShippingCountry] = useState("United States");
  const [shippingPhone, setShippingPhone] = useState("");

  // Manual client entry
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  // Product picker
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const createMutation = trpc.customOrders.create.useMutation({
    onSuccess: () => {
      toast.success("Custom order created successfully");
      onCreated();
      onOpenChange(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setSelectedClient(null);
    setClientSearch("");
    setManualName("");
    setManualEmail("");
    setManualPhone("");
    setPaymentMethod("manual");
    setShippingMethod("standard");
    setAdminNotes("");
    setLineItems([]);
    setDiscountAmount("0");
    setDiscountType("dollar");
    setDiscountOverride(false);
    setShippingFee("0");
    setShippingName("");
    setShippingStreet("");
    setShippingCity("");
    setShippingState("");
    setShippingZip("");
    setShippingCountry("United States");
    setShippingPhone("");
  };

  // Filter clients for search
  const filteredClients = useMemo(() => {
    if (!clients || !clientSearch.trim()) return [];
    const q = clientSearch.toLowerCase();
    // Deduplicate by email
    const seen = new Set<string>();
    return clients.filter((c: any) => {
      const match = c.clientName?.toLowerCase().includes(q) || c.clientEmail?.toLowerCase().includes(q);
      if (!match || !c.clientEmail) return false;
      if (seen.has(c.clientEmail)) return false;
      seen.add(c.clientEmail);
      return true;
    }).slice(0, 10);
  }, [clients, clientSearch]);

  const selectClient = (client: any) => {
    setSelectedClient({
      id: client.id,
      userId: client.userId,
      name: client.clientName,
      email: client.clientEmail || "",
      phone: client.clientPhone || "",
      shippingName: client.shippingName || client.clientName,
      shippingStreet: client.shippingStreet || "",
      shippingCity: client.shippingCity || "",
      shippingState: client.shippingState || "",
      shippingZip: client.shippingZip || "",
      shippingCountry: client.shippingCountry || "United States",
      shippingPhone: client.shippingPhone || client.clientPhone || "",
    });
    setShippingName(client.shippingName || client.clientName || "");
    setShippingStreet(client.shippingStreet || "");
    setShippingCity(client.shippingCity || "");
    setShippingState(client.shippingState || "");
    setShippingZip(client.shippingZip || "");
    setShippingCountry(client.shippingCountry || "United States");
    setShippingPhone(client.shippingPhone || client.clientPhone || "");
    setClientSearch("");
    setShowClientDropdown(false);
  };

  // Add product from catalog
  const addProductFromCatalog = (item: any) => {
    const existingIdx = lineItems.findIndex(li => li.inventoryItemId === item.id);
    if (existingIdx >= 0) {
      const updated = [...lineItems];
      updated[existingIdx].quantity += 1;
      setLineItems(updated);
    } else {
      setLineItems([...lineItems, {
        inventoryItemId: item.id,
        name: item.name,
        description: "",
        quantity: 1,
        pricePerUnit: item.price || "0",
        originalPrice: item.price || "0",
        itemType: "product",
        isDiscountable: !!item.isDiscountable,
      }]);
    }
    setShowProductPicker(false);
    setProductSearch("");
  };

  // Add custom line item
  const addCustomLineItem = () => {
    setLineItems([...lineItems, {
      inventoryItemId: null,
      name: "",
      description: "",
      quantity: 1,
      pricePerUnit: "0",
      originalPrice: "0",
      itemType: "custom",
      isDiscountable: false,
    }]);
  };

  const removeLineItem = (idx: number) => {
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const updateLineItem = (idx: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    (updated[idx] as any)[field] = value;
    setLineItems(updated);
  };

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (parseFloat(item.pricePerUnit) || 0) * item.quantity;
  }, 0);
  // Discountable subtotal: only items marked as discountable (unless override)
  const discountableSubtotal = discountOverride ? subtotal : lineItems.reduce((sum, item) => {
    return sum + (item.isDiscountable ? (parseFloat(item.pricePerUnit) || 0) * item.quantity : 0);
  }, 0);
  const nonDiscountableItems = lineItems.filter(item => !item.isDiscountable && item.inventoryItemId);
  const rawDiscountInput = parseFloat(discountAmount) || 0;
  const calculatedDiscount = discountType === "percent"
    ? Math.round(discountableSubtotal * (rawDiscountInput / 100) * 100) / 100
    : Math.min(rawDiscountInput, discountableSubtotal);
  const shipping = parseFloat(shippingFee) || 0;
  const total = Math.max(0, subtotal - calculatedDiscount + shipping);

  const handleSubmit = () => {
    const clientName = selectedClient?.name || manualName;
    const clientEmail = selectedClient?.email || manualEmail;
    if (!clientName || !clientEmail) {
      toast.error("Client name and email are required");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    for (const item of lineItems) {
      if (!item.name.trim()) {
        toast.error("All line items must have a name");
        return;
      }
    }

    createMutation.mutate({
      userId: selectedClient?.userId || null,
      clientName,
      clientEmail,
      clientPhone: selectedClient?.phone || manualPhone || undefined,
      paymentMethod,
      items: lineItems.map(li => ({
        inventoryItemId: li.inventoryItemId,
        name: li.name,
        description: li.description || undefined,
        quantity: li.quantity,
        pricePerUnit: li.pricePerUnit,
        originalPrice: li.originalPrice || undefined,
        itemType: li.itemType,
        isDiscountable: li.isDiscountable,
      })),
      discountAmount: calculatedDiscount.toFixed(2),
      shippingFee: shippingFee,
      shippingName: shippingName || undefined,
      shippingStreet: shippingStreet || undefined,
      shippingCity: shippingCity || undefined,
      shippingState: shippingState || undefined,
      shippingZip: shippingZip || undefined,
      shippingCountry: shippingCountry || undefined,
      shippingPhone: shippingPhone || undefined,
      shippingMethod: shippingMethod,
      adminNotes: adminNotes || undefined,
    });
  };

  // Flatten inventory for product search
  const allProducts = useMemo(() => {
    if (!inventoryData) return [];
    return inventoryData.flatMap((cat: any) =>
      (cat.items || []).filter((item: any) => item.isActive).map((item: any) => ({
        ...item,
        categoryName: cat.name,
      }))
    );
  }, [inventoryData]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return allProducts;
    const q = productSearch.toLowerCase();
    return allProducts.filter((p: any) =>
      p.name.toLowerCase().includes(q) || p.categoryName?.toLowerCase().includes(q)
    );
  }, [allProducts, productSearch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Order</DialogTitle>
          <DialogDescription>
            Create a custom invoice for a client with special pricing or custom items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Client</Label>
            {selectedClient ? (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{selectedClient.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                  {selectedClient.phone && (
                    <p className="text-sm text-muted-foreground">{selectedClient.phone}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search existing clients..."
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    className="pl-9"
                  />
                  {showClientDropdown && filteredClients.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredClients.map((c: any) => (
                        <button
                          key={c.id}
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                          onClick={() => selectClient(c)}
                        >
                          <span className="font-medium">{c.clientName}</span>
                          <span className="text-muted-foreground ml-2">{c.clientEmail}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Or enter manually:</div>
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Name *" value={manualName} onChange={e => setManualName(e.target.value)} />
                  <Input placeholder="Email *" type="email" value={manualEmail} onChange={e => setManualEmail(e.target.value)} />
                  <Input placeholder="Phone" value={manualPhone} onChange={e => setManualPhone(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Line Items</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowProductPicker(true)}>
                  <Package className="h-4 w-4 mr-1" /> From Catalog
                </Button>
                <Button variant="outline" size="sm" onClick={addCustomLineItem}>
                  <Plus className="h-4 w-4 mr-1" /> Custom Item
                </Button>
              </div>
            </div>

            {lineItems.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                No items added yet. Add from catalog or create a custom item.
              </div>
            ) : (
              <div className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        {item.inventoryItemId ? (
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            {item.originalPrice !== item.pricePerUnit && (
                              <p className="text-xs text-muted-foreground">
                                Catalog: ${item.originalPrice}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Input
                            placeholder="Item name *"
                            value={item.name}
                            onChange={e => updateLineItem(idx, "name", e.target.value)}
                            className="h-8 text-sm"
                          />
                        )}
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => updateLineItem(idx, "quantity", parseInt(e.target.value) || 1)}
                          className="h-8 text-sm text-center"
                        />
                      </div>
                      <div className="col-span-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                          <Input
                            value={item.pricePerUnit}
                            onChange={e => updateLineItem(idx, "pricePerUnit", e.target.value)}
                            className="h-8 text-sm pl-5"
                          />
                        </div>
                      </div>
                      <div className="col-span-2 text-right text-sm font-medium">
                        ${((parseFloat(item.pricePerUnit) || 0) * item.quantity).toFixed(2)}
                      </div>
                      <div className="col-span-1 text-right">
                        <Button variant="ghost" size="sm" onClick={() => removeLineItem(idx)} className="h-8 w-8 p-0">
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Column headers */}
                <div className="grid grid-cols-12 gap-2 px-3 text-xs text-muted-foreground">
                  <div className="col-span-5">Item</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2">Price</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>
              </div>
            )}

            {/* Non-discountable items warning */}
            {nonDiscountableItems.length > 0 && rawDiscountInput > 0 && !discountOverride && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">Non-discountable items excluded from discount:</p>
                  <ul className="text-amber-700 text-xs mt-1">
                    {nonDiscountableItems.map((item, i) => (
                      <li key={i}>• {item.name} (${((parseFloat(item.pricePerUnit) || 0) * item.quantity).toFixed(2)})</li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      id="discount-override"
                      checked={discountOverride}
                      onCheckedChange={(checked) => setDiscountOverride(!!checked)}
                    />
                    <label htmlFor="discount-override" className="text-xs text-amber-800 cursor-pointer">
                      Override: Apply discount to ALL items
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discountableSubtotal !== subtotal && rawDiscountInput > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Discountable subtotal:</span>
                    <span>${discountableSubtotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center gap-2">
                  <span>Discount:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDiscountType(discountType === "dollar" ? "percent" : "dollar")}
                      className="h-7 w-7 flex items-center justify-center rounded border hover:bg-accent text-xs font-medium shrink-0"
                      title={`Switch to ${discountType === "dollar" ? "percentage" : "dollar amount"}`}
                    >
                      {discountType === "dollar" ? <DollarSign className="h-3.5 w-3.5" /> : <Percent className="h-3.5 w-3.5" />}
                    </button>
                    <div className="relative w-20">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {discountType === "dollar" ? "$" : "%"}
                      </span>
                      <Input
                        value={discountAmount}
                        onChange={e => setDiscountAmount(e.target.value)}
                        className="h-7 text-sm pl-5 text-right"
                      />
                    </div>
                  </div>
                </div>
                {discountType === "percent" && rawDiscountInput > 0 && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Discount amount:</span>
                    <span>-${calculatedDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center gap-2">
                  <span>Shipping:</span>
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                    <Input
                      value={shippingFee}
                      onChange={e => setShippingFee(e.target.value)}
                      className="h-7 text-sm pl-5 text-right"
                    />
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Shipping Address */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Shipping Address</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Full Name" value={shippingName} onChange={e => setShippingName(e.target.value)} />
              <Input placeholder="Phone" value={shippingPhone} onChange={e => setShippingPhone(e.target.value)} />
            </div>
            <Input placeholder="Street Address" value={shippingStreet} onChange={e => setShippingStreet(e.target.value)} />
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="City" value={shippingCity} onChange={e => setShippingCity(e.target.value)} />
              <Input placeholder="State" value={shippingState} onChange={e => setShippingState(e.target.value)} />
              <Input placeholder="ZIP" value={shippingZip} onChange={e => setShippingZip(e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* Payment & Shipping Method */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Shipping Method</Label>
              <Select value={shippingMethod} onValueChange={(v: any) => setShippingMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="expedited">Expedited</SelectItem>
                  <SelectItem value="overnight">Overnight</SelectItem>
                  <SelectItem value="pickup">Local Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Admin Notes (internal only)</Label>
            <Textarea
              placeholder="Internal notes about this order..."
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Order"}
          </Button>
        </DialogFooter>

        {/* Product Picker Dialog */}
        <Dialog open={showProductPicker} onOpenChange={setShowProductPicker}>
          <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add from Catalog</DialogTitle>
            </DialogHeader>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">No products found</p>
              ) : (
                filteredProducts.map((p: any) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-3 py-2 hover:bg-accent rounded-md flex items-center justify-between"
                    onClick={() => addProductFromCatalog(p)}
                  >
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        {p.name}
                        {!p.isDiscountable && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-normal">
                            <ShieldCheck className="h-3 w-3" /> Non-Disc.
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.categoryName} · Stock: {p.quantity}
                        {p.priceSource === "protocol" && <span className="text-green-600"> · Protocol Price</span>}
                      </p>
                    </div>
                    <span className="text-sm font-medium">${p.price || "0.00"}</span>
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

// ============ ORDER DETAIL DIALOG ============
// Editable statuses - orders in these statuses can be edited
const EDITABLE_STATUSES = ["draft", "pending_payment", "processing"];

function OrderDetailDialog({ orderId, open, onOpenChange, onUpdated }: {
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const { data: order, refetch } = trpc.customOrders.get.useQuery(
    { id: orderId! },
    { enabled: !!orderId && open }
  );
  const { data: inventoryData } = trpc.inventory.getWithProtocolPrices.useQuery();

  const sendInvoiceMutation = trpc.customOrders.sendInvoice.useMutation({
    onSuccess: (data) => {
      toast.success("Invoice sent! Payment link generated.");
      refetch();
      onUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  const resendInvoiceMutation = trpc.customOrders.resendInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice resent to client!");
      refetch();
      onUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatusMutation = trpc.customOrders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      refetch();
      onUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateOrderMutation = trpc.customOrders.update.useMutation({
    onSuccess: () => {
      toast.success("Order updated successfully");
      setIsEditing(false);
      refetch();
      onUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  // Venmo verification removed - migrating to Stripe

  const updateShippingMutation = trpc.customOrders.updateShipping.useMutation({
    onSuccess: () => {
      toast.success("Shipping info updated");
      refetch();
      onUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  const completeGiftMutation = trpc.customOrders.completeGiftOrder.useMutation({
    onSuccess: () => {
      toast.success("Gift/trade order completed! Packing slip generated.");
      refetch();
      onUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("USPS");

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editClientName, setEditClientName] = useState("");
  const [editClientEmail, setEditClientEmail] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<"stripe" | "manual">("manual");
  const [editShippingMethod, setEditShippingMethod] = useState<"standard" | "expedited" | "overnight" | "pickup">("standard");
  const [editAdminNotes, setEditAdminNotes] = useState("");
  const [editLineItems, setEditLineItems] = useState<LineItem[]>([]);
  const [editDiscountAmount, setEditDiscountAmount] = useState("0");
  const [editDiscountType, setEditDiscountType] = useState<"dollar" | "percent">("dollar");
  const [editDiscountOverride, setEditDiscountOverride] = useState(false);
  const [editShippingFee, setEditShippingFee] = useState("0");
  const [editShippingName, setEditShippingName] = useState("");
  const [editShippingStreet, setEditShippingStreet] = useState("");
  const [editShippingCity, setEditShippingCity] = useState("");
  const [editShippingState, setEditShippingState] = useState("");
  const [editShippingZip, setEditShippingZip] = useState("");
  const [editShippingCountry, setEditShippingCountry] = useState("United States");
  const [editShippingPhone, setEditShippingPhone] = useState("");
  const [showEditProductPicker, setShowEditProductPicker] = useState(false);
  const [editProductSearch, setEditProductSearch] = useState("");

  useEffect(() => {
    if (order) {
      setTrackingNumber(order.order.trackingNumber || "");
      setTrackingCarrier(order.order.trackingCarrier || "USPS");
    }
  }, [order]);

  // Reset edit mode when dialog closes
  useEffect(() => {
    if (!open) setIsEditing(false);
  }, [open]);

  const enterEditMode = () => {
    if (!order) return;
    const o = order.order;
    setEditClientName(o.clientName || "");
    setEditClientEmail(o.clientEmail || "");
    setEditClientPhone(o.clientPhone || "");
    setEditPaymentMethod((o.paymentMethod as "stripe" | "manual") || "manual");
    setEditShippingMethod((o.shippingMethod as any) || "standard");
    setEditAdminNotes(o.adminNotes || "");
    setEditDiscountAmount(o.discountAmount?.toString() || "0");
    setEditShippingFee(o.shippingFee?.toString() || "0");
    setEditShippingName(o.shippingName || "");
    setEditShippingStreet(o.shippingStreet || "");
    setEditShippingCity(o.shippingCity || "");
    setEditShippingState(o.shippingState || "");
    setEditShippingZip(o.shippingZip || "");
    setEditShippingCountry(o.shippingCountry || "United States");
    setEditShippingPhone(o.shippingPhone || "");
    setEditLineItems(order.items.map((item: any) => ({
      inventoryItemId: item.inventoryItemId || null,
      name: item.name,
      description: item.description || "",
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit?.toString() || "0",
      originalPrice: item.originalPrice?.toString() || item.pricePerUnit?.toString() || "0",
      itemType: item.itemType || "product",
      isDiscountable: !!item.isDiscountable,
    })));
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!order) return;
    if (editLineItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    for (const item of editLineItems) {
      if (!item.name.trim()) {
        toast.error("All line items must have a name");
        return;
      }
    }
    updateOrderMutation.mutate({
      id: order.order.id,
      clientName: editClientName,
      clientEmail: editClientEmail,
      clientPhone: editClientPhone || undefined,
      paymentMethod: editPaymentMethod,
      items: editLineItems.map(li => ({
        inventoryItemId: li.inventoryItemId,
        name: li.name,
        description: li.description || undefined,
        quantity: li.quantity,
        pricePerUnit: li.pricePerUnit,
        originalPrice: li.originalPrice || undefined,
        itemType: li.itemType,
        isDiscountable: li.isDiscountable,
      })),
      discountAmount: editCalculatedDiscount.toFixed(2),
      shippingFee: editShippingFee,
      shippingName: editShippingName || undefined,
      shippingStreet: editShippingStreet || undefined,
      shippingCity: editShippingCity || undefined,
      shippingState: editShippingState || undefined,
      shippingZip: editShippingZip || undefined,
      shippingCountry: editShippingCountry || undefined,
      shippingPhone: editShippingPhone || undefined,
      shippingMethod: editShippingMethod,
      adminNotes: editAdminNotes || undefined,
    });
  };

  // Edit mode helpers
  const addEditCustomLineItem = () => {
    setEditLineItems([...editLineItems, {
      inventoryItemId: null, name: "", description: "", quantity: 1,
      pricePerUnit: "0", originalPrice: "0", itemType: "custom", isDiscountable: false,
    }]);
  };
  const removeEditLineItem = (idx: number) => setEditLineItems(editLineItems.filter((_, i) => i !== idx));
  const updateEditLineItem = (idx: number, field: keyof LineItem, value: any) => {
    const updated = [...editLineItems];
    (updated[idx] as any)[field] = value;
    setEditLineItems(updated);
  };
  const addEditProductFromCatalog = (item: any) => {
    const existingIdx = editLineItems.findIndex(li => li.inventoryItemId === item.id);
    if (existingIdx >= 0) {
      const updated = [...editLineItems];
      updated[existingIdx].quantity += 1;
      setEditLineItems(updated);
    } else {
      setEditLineItems([...editLineItems, {
        inventoryItemId: item.id, name: item.name, description: "", quantity: 1,
        pricePerUnit: item.price || "0", originalPrice: item.price || "0",
        itemType: "product", isDiscountable: !!item.isDiscountable,
      }]);
    }
    setShowEditProductPicker(false);
    setEditProductSearch("");
  };

  const editSubtotal = editLineItems.reduce((sum, item) => sum + (parseFloat(item.pricePerUnit) || 0) * item.quantity, 0);
  const editDiscountableSubtotal = editDiscountOverride ? editSubtotal : editLineItems.reduce((sum, item) => {
    return sum + (item.isDiscountable ? (parseFloat(item.pricePerUnit) || 0) * item.quantity : 0);
  }, 0);
  const editNonDiscountableItems = editLineItems.filter(item => !item.isDiscountable && item.inventoryItemId);
  const editRawDiscountInput = parseFloat(editDiscountAmount) || 0;
  const editCalculatedDiscount = editDiscountType === "percent"
    ? Math.round(editDiscountableSubtotal * (editRawDiscountInput / 100) * 100) / 100
    : Math.min(editRawDiscountInput, editDiscountableSubtotal);
  const editShipping = parseFloat(editShippingFee) || 0;
  const editTotal = Math.max(0, editSubtotal - editCalculatedDiscount + editShipping);

  const allProducts = useMemo(() => {
    if (!inventoryData) return [];
    return inventoryData.flatMap((cat: any) =>
      (cat.items || []).filter((item: any) => item.isActive).map((item: any) => ({
        ...item, categoryName: cat.name,
      }))
    );
  }, [inventoryData]);

  const filteredEditProducts = useMemo(() => {
    if (!editProductSearch.trim()) return allProducts;
    const q = editProductSearch.toLowerCase();
    return allProducts.filter((p: any) =>
      p.name.toLowerCase().includes(q) || p.categoryName?.toLowerCase().includes(q)
    );
  }, [allProducts, editProductSearch]);

  if (!order) return null;

  const o = order.order;
  const items = order.items;
  const isEditable = EDITABLE_STATUSES.includes(o.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              Order {o.orderNumber}
              <StatusBadge status={o.status} />
            </DialogTitle>
            {isEditable && !isEditing && (
              <Button variant="outline" size="sm" onClick={enterEditMode}>
                <Pencil className="h-4 w-4 mr-1" /> Edit Order
              </Button>
            )}
            {isEditing && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={updateOrderMutation.isPending}>
                  <Save className="h-4 w-4 mr-1" />
                  {updateOrderMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
          <DialogDescription>
            Created {toLocaleDateStringMT(o.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })} by {o.createdByName || "Admin"}
            {isEditable && !isEditing && (
              <span className="ml-2 text-blue-600 text-xs">(Editable)</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Info */}
          {isEditing ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Client</h4>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Name *" value={editClientName} onChange={e => setEditClientName(e.target.value)} />
                <Input placeholder="Email *" type="email" value={editClientEmail} onChange={e => setEditClientEmail(e.target.value)} />
                <Input placeholder="Phone" value={editClientPhone} onChange={e => setEditClientPhone(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-1">Client</h4>
                <p className="text-sm">{o.clientName}</p>
                <p className="text-sm text-muted-foreground">{o.clientEmail}</p>
                {o.clientPhone && <p className="text-sm text-muted-foreground">{o.clientPhone}</p>}
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1">Shipping Address</h4>
                {o.shippingStreet ? (
                  <div className="text-sm text-muted-foreground">
                    <p>{o.shippingName}</p>
                    <p>{o.shippingStreet}</p>
                    <p>{o.shippingCity}, {o.shippingState} {o.shippingZip}</p>
                    {o.shippingPhone && <p>{o.shippingPhone}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No address provided</p>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Line Items */}
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Items</h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowEditProductPicker(true)}>
                    <Package className="h-4 w-4 mr-1" /> From Catalog
                  </Button>
                  <Button variant="outline" size="sm" onClick={addEditCustomLineItem}>
                    <Plus className="h-4 w-4 mr-1" /> Custom Item
                  </Button>
                </div>
              </div>
              {editLineItems.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                  No items. Add from catalog or create a custom item.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 px-3 text-xs text-muted-foreground">
                    <div className="col-span-5">Item</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2">Price</div>
                    <div className="col-span-2 text-right">Total</div>
                    <div className="col-span-1"></div>
                  </div>
                  {editLineItems.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          {item.inventoryItemId ? (
                            <div>
                              <p className="text-sm font-medium">{item.name}</p>
                              {item.originalPrice !== item.pricePerUnit && (
                                <p className="text-xs text-muted-foreground">Catalog: ${item.originalPrice}</p>
                              )}
                            </div>
                          ) : (
                            <Input
                              placeholder="Item name *"
                              value={item.name}
                              onChange={e => updateEditLineItem(idx, "name", e.target.value)}
                              className="h-8 text-sm"
                            />
                          )}
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number" min={1} value={item.quantity}
                            onChange={e => updateEditLineItem(idx, "quantity", parseInt(e.target.value) || 1)}
                            className="h-8 text-sm text-center"
                          />
                        </div>
                        <div className="col-span-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                            <Input
                              value={item.pricePerUnit}
                              onChange={e => updateEditLineItem(idx, "pricePerUnit", e.target.value)}
                              className="h-8 text-sm pl-5"
                            />
                          </div>
                        </div>
                        <div className="col-span-2 text-right text-sm font-medium">
                          ${((parseFloat(item.pricePerUnit) || 0) * item.quantity).toFixed(2)}
                        </div>
                        <div className="col-span-1 text-right">
                          <Button variant="ghost" size="sm" onClick={() => removeEditLineItem(idx)} className="h-8 w-8 p-0">
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Non-discountable items warning */}
              {editNonDiscountableItems.length > 0 && editRawDiscountInput > 0 && !editDiscountOverride && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">Non-discountable items excluded:</p>
                    <ul className="text-amber-700 text-xs mt-1">
                      {editNonDiscountableItems.map((item, i) => (
                        <li key={i}>• {item.name} (${((parseFloat(item.pricePerUnit) || 0) * item.quantity).toFixed(2)})</li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-2 mt-2">
                      <Checkbox
                        id="edit-discount-override"
                        checked={editDiscountOverride}
                        onCheckedChange={(checked) => setEditDiscountOverride(!!checked)}
                      />
                      <label htmlFor="edit-discount-override" className="text-xs text-amber-800 cursor-pointer">
                        Override: Apply discount to ALL items
                      </label>
                    </div>
                  </div>
                </div>
              )}
              {/* Edit Totals */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${editSubtotal.toFixed(2)}</span>
                  </div>
                  {editDiscountableSubtotal !== editSubtotal && editRawDiscountInput > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Discountable subtotal:</span>
                      <span>${editDiscountableSubtotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center gap-2">
                    <span>Discount:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditDiscountType(editDiscountType === "dollar" ? "percent" : "dollar")}
                        className="h-7 w-7 flex items-center justify-center rounded border hover:bg-accent text-xs font-medium shrink-0"
                        title={`Switch to ${editDiscountType === "dollar" ? "percentage" : "dollar amount"}`}
                      >
                        {editDiscountType === "dollar" ? <DollarSign className="h-3.5 w-3.5" /> : <Percent className="h-3.5 w-3.5" />}
                      </button>
                      <div className="relative w-20">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {editDiscountType === "dollar" ? "$" : "%"}
                        </span>
                        <Input value={editDiscountAmount} onChange={e => setEditDiscountAmount(e.target.value)} className="h-7 text-sm pl-5 text-right" />
                      </div>
                    </div>
                  </div>
                  {editDiscountType === "percent" && editRawDiscountInput > 0 && (
                    <div className="flex justify-between text-xs text-green-600">
                      <span>Discount amount:</span>
                      <span>-${editCalculatedDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center gap-2">
                    <span>Shipping:</span>
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input value={editShippingFee} onChange={e => setEditShippingFee(e.target.value)} className="h-7 text-sm pl-5 text-right" />
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total:</span>
                    <span>${editTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              {/* Edit Product Picker Dialog */}
              <Dialog open={showEditProductPicker} onOpenChange={setShowEditProductPicker}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Product from Catalog</DialogTitle>
                  </DialogHeader>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search products..." value={editProductSearch} onChange={e => setEditProductSearch(e.target.value)} className="pl-9" />
                  </div>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {filteredEditProducts.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-4">No products found</p>
                    ) : (
                      filteredEditProducts.map((p: any) => (
                        <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-accent rounded-md flex items-center justify-between" onClick={() => addEditProductFromCatalog(p)}>
                          <div>
                            <p className="text-sm font-medium flex items-center gap-1.5">
                              {p.name}
                              {!p.isDiscountable && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-normal">
                                  <ShieldCheck className="h-3 w-3" /> Non-Disc.
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {p.categoryName} · Stock: {p.quantity}
                              {p.priceSource === "protocol" && <span className="text-green-600"> · Protocol Price</span>}
                            </p>
                          </div>
                          <span className="text-sm font-medium">${p.price || "0.00"}</span>
                        </button>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-semibold mb-2">Items</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.name}</p>
                        {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                        {item.originalPrice && parseFloat(item.originalPrice) !== parseFloat(item.pricePerUnit) && (
                          <p className="text-xs text-muted-foreground">Catalog: ${parseFloat(item.originalPrice).toFixed(2)}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">${parseFloat(item.pricePerUnit).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${(parseFloat(item.pricePerUnit) * item.quantity).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end mt-2">
                <div className="w-48 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${parseFloat(o.subtotal).toFixed(2)}</span>
                  </div>
                  {parseFloat(o.discountAmount) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-${parseFloat(o.discountAmount).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(o.shippingFee) > 0 && (
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span>${parseFloat(o.shippingFee).toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>${parseFloat(o.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Payment & Shipping - editable */}
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Payment Method</Label>
                  <Select value={editPaymentMethod} onValueChange={(v: any) => setEditPaymentMethod(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Shipping Method</Label>
                  <Select value={editShippingMethod} onValueChange={(v: any) => setEditShippingMethod(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="expedited">Expedited</SelectItem>
                      <SelectItem value="overnight">Overnight</SelectItem>
                      <SelectItem value="pickup">Local Pickup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Shipping Address</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Full Name" value={editShippingName} onChange={e => setEditShippingName(e.target.value)} />
                  <Input placeholder="Phone" value={editShippingPhone} onChange={e => setEditShippingPhone(e.target.value)} />
                </div>
                <Input placeholder="Street Address" value={editShippingStreet} onChange={e => setEditShippingStreet(e.target.value)} />
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="City" value={editShippingCity} onChange={e => setEditShippingCity(e.target.value)} />
                  <Input placeholder="State" value={editShippingState} onChange={e => setEditShippingState(e.target.value)} />
                  <Input placeholder="ZIP" value={editShippingZip} onChange={e => setEditShippingZip(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Admin Notes (internal only)</Label>
                <Textarea placeholder="Internal notes..." value={editAdminNotes} onChange={e => setEditAdminNotes(e.target.value)} rows={2} />
              </div>
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-semibold mb-2">Payment</h4>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="capitalize">{o.paymentMethod || "manual"}</Badge>
                <Badge variant="outline">{o.shippingMethod || "standard"}</Badge>
              </div>
            </div>
          )}

          {/* Actions based on status */}
          {o.status === "draft" && parseFloat(o.total) === 0 && (
            <div className="space-y-3">
              <Separator />
              <h4 className="text-sm font-semibold">Gift / Trade Order</h4>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm">
                <p className="text-amber-800">This is a <strong>$0.00 order</strong>. No payment is required.</p>
                <p className="text-amber-700 mt-1">Completing this will mark it as processing and generate a packing slip.</p>
              </div>
              <Button
                onClick={() => completeGiftMutation.mutate({ id: o.id })}
                disabled={completeGiftMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Gift className="h-4 w-4 mr-2" />
                {completeGiftMutation.isPending ? "Completing..." : "Complete as Gift / Trade"}
              </Button>
            </div>
          )}

          {o.status === "draft" && parseFloat(o.total) > 0 && (
            <div className="space-y-3">
              <Separator />
              <h4 className="text-sm font-semibold">Send Invoice</h4>
              <p className="text-sm text-muted-foreground">
                This will generate a payment link and send it to the client via email.
              </p>
              <Button
                onClick={() => sendInvoiceMutation.mutate({ id: o.id })}
                disabled={sendInvoiceMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {sendInvoiceMutation.isPending ? "Sending..." : "Send Invoice to Client"}
              </Button>
            </div>
          )}

          {(o.status === "pending_payment") && (
            <div className="space-y-3">
              <Separator />
              <h4 className="text-sm font-semibold">Resend Invoice</h4>
              <p className="text-sm text-muted-foreground">
                Resend the payment link to the client.
              </p>
              <Button
                variant="outline"
                onClick={() => resendInvoiceMutation.mutate({ id: o.id })}
                disabled={resendInvoiceMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${resendInvoiceMutation.isPending ? "animate-spin" : ""}`} />
                {resendInvoiceMutation.isPending ? "Resending..." : "Resend Invoice to Client"}
              </Button>
            </div>
          )}

          {/* Venmo verification removed - Stripe payment confirmation will be automatic */}

          {(o.status === "paid" || o.status === "processing") && (
            <div className="space-y-3">
              <Separator />
              <h4 className="text-sm font-semibold">Shipping & Tracking</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Carrier</Label>
                  <Select value={trackingCarrier} onValueChange={setTrackingCarrier}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USPS">USPS</SelectItem>
                      <SelectItem value="UPS">UPS</SelectItem>
                      <SelectItem value="FedEx">FedEx</SelectItem>
                      <SelectItem value="DHL">DHL</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tracking Number</Label>
                  <Input
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => updateShippingMutation.mutate({
                    id: o.id,
                    trackingNumber,
                    trackingCarrier,
                    status: "shipped",
                  })}
                  disabled={updateShippingMutation.isPending || !trackingNumber}
                >
                  <Truck className="h-4 w-4 mr-2" /> Mark as Shipped
                </Button>
                {o.status === "paid" && (
                  <Button
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ id: o.id, status: "processing" })}
                    disabled={updateStatusMutation.isPending}
                  >
                    <Package className="h-4 w-4 mr-2" /> Mark Processing
                  </Button>
                )}
              </div>
            </div>
          )}

          {o.status === "shipped" && (
            <div className="space-y-3">
              <Separator />
              <h4 className="text-sm font-semibold">Tracking</h4>
              <div className="text-sm">
                <p><strong>Carrier:</strong> {o.trackingCarrier}</p>
                <p><strong>Tracking:</strong> {o.trackingNumber}</p>
              </div>
              <Button
                onClick={() => updateStatusMutation.mutate({ id: o.id, status: "delivered" })}
                disabled={updateStatusMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" /> Mark as Delivered
              </Button>
            </div>
          )}

          {/* Admin Notes */}
          {o.adminNotes && (
            <div>
              <Separator />
              <h4 className="text-sm font-semibold mt-3 mb-1">Admin Notes</h4>
              <p className="text-sm text-muted-foreground">{o.adminNotes}</p>
            </div>
          )}

          {/* Cancel Order */}
          {!["cancelled", "refunded", "delivered"].includes(o.status) && (
            <div>
              <Separator />
              <Button
                variant="destructive"
                size="sm"
                className="mt-3"
                onClick={() => {
                  if (confirm("Are you sure you want to cancel this order?")) {
                    updateStatusMutation.mutate({ id: o.id, status: "cancelled" });
                  }
                }}
                disabled={updateStatusMutation.isPending}
              >
                Cancel Order
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ MAIN PAGE ============
export default function CustomOrders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: orders, refetch, isLoading } = trpc.customOrders.list.useQuery(
    { status: statusFilter === "all" ? undefined : statusFilter }
  );

  const deleteMutation = trpc.customOrders.delete.useMutation({
    onSuccess: () => {
      toast.success("Order deleted");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter((o: any) =>
      o.clientName.toLowerCase().includes(q) ||
      o.clientEmail.toLowerCase().includes(q) ||
      o.orderNumber.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Orders</h1>
          <p className="text-muted-foreground">
            Create and manage custom invoices with special pricing for VIP clients.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Custom Order
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or order number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_payment">Pending Payment</SelectItem>
            <SelectItem value="pending_venmo">Pending (Legacy)</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No custom orders yet</p>
              <p className="text-sm">Create your first custom order to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order: any) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setDetailOrderId(order.id);
                      setDetailOpen(true);
                    }}
                  >
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{order.clientName}</p>
                        <p className="text-xs text-muted-foreground">{order.clientEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{order.items?.length || "—"} items</span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${parseFloat(order.total).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {(order.paymentMethod || "manual").charAt(0).toUpperCase() + (order.paymentMethod || "manual").slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {toLocaleDateStringMT(order.createdAt, { year: 'numeric', month: 'numeric', day: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setDetailOrderId(order.id);
                            setDetailOpen(true);
                          }}>
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          {EDITABLE_STATUSES.includes(order.status) && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setDetailOrderId(order.id);
                              setDetailOpen(true);
                              // Edit mode will be triggered from the detail dialog
                            }}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit Order
                            </DropdownMenuItem>
                          )}
                          {EDITABLE_STATUSES.includes(order.status) && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Delete this order?")) {
                                  deleteMutation.mutate({ id: order.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => refetch()}
      />
      <OrderDetailDialog
        orderId={detailOrderId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={() => refetch()}
      />
    </div>
    </AdminLayout>
  );
}
