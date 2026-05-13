import { useState, useRef, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Shield,
  Star,
  Copy,
  CheckCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";


type Partner = {
  id: number;
  name: string;
  description: string | null;
  url: string;
  code: string | null;
  discountText: string | null;
  logoUrl: string | null;
  testimonial: string | null;
  category: "peptides" | "supplements" | "nootropics" | "tools" | "health" | "other";
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
};

const categoryOptions = [
  { value: "peptides", label: "Peptides" },
  { value: "supplements", label: "Supplements" },
  { value: "nootropics", label: "Nootropics" },
  { value: "tools", label: "Tools & Apps" },
  { value: "health", label: "Health & Wellness" },
  { value: "other", label: "Other" },
];

export default function AffiliatePartners() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Scroll position preservation
  const savedScrollPosition = useRef<number | null>(null);
  const shouldRestoreScroll = useRef(false);

  useEffect(() => {
    if (shouldRestoreScroll.current && savedScrollPosition.current !== null) {
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollPosition.current!);
        savedScrollPosition.current = null;
        shouldRestoreScroll.current = false;
      });
    }
  });

  const saveScrollPosition = () => {
    savedScrollPosition.current = window.scrollY;
    shouldRestoreScroll.current = true;
  };
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    code: "",
    discountText: "",
    logoUrl: "",
    testimonial: "",
    category: "other" as Partner["category"],
    isFeatured: false,
    isActive: true,
    sortOrder: 0,
  });

  const { data: partners, refetch } = trpc.affiliatePartners.list.useQuery({});
  const createMutation = trpc.affiliatePartners.create.useMutation({
    onSuccess: () => {
      alert("Partner created successfully");
      saveScrollPosition();
      refetch();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      alert("Error creating partner: " + error.message);
    },
  });
  const updateMutation = trpc.affiliatePartners.update.useMutation({
    onSuccess: () => {
      alert("Partner updated successfully");
      saveScrollPosition();
      refetch();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      alert("Error updating partner: " + error.message);
    },
  });
  const deleteMutation = trpc.affiliatePartners.delete.useMutation({
    onSuccess: () => {
      alert("Partner deleted successfully");
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      alert("Error deleting partner: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      url: "",
      code: "",
      discountText: "",
      logoUrl: "",
      testimonial: "",
      category: "other",
      isFeatured: false,
      isActive: true,
      sortOrder: 0,
    });
    setEditingPartner(null);
  };

  const handleOpenDialog = (partner?: Partner) => {
    if (partner) {
      setEditingPartner(partner);
      setFormData({
        name: partner.name,
        description: partner.description || "",
        url: partner.url,
        code: partner.code || "",
        discountText: partner.discountText || "",
        logoUrl: partner.logoUrl || "",
        testimonial: partner.testimonial || "",
        category: partner.category,
        isFeatured: partner.isFeatured,
        isActive: partner.isActive,
        sortOrder: partner.sortOrder,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.url) {
      alert("Name and URL are required");
      return;
    }

    const data = {
      name: formData.name,
      description: formData.description || undefined,
      url: formData.url,
      code: formData.code || undefined,
      discountText: formData.discountText || undefined,
      logoUrl: formData.logoUrl || undefined,
      testimonial: formData.testimonial || undefined,
      category: formData.category,
      isFeatured: formData.isFeatured,
      isActive: formData.isActive,
      sortOrder: formData.sortOrder,
    };

    if (editingPartner) {
      updateMutation.mutate({ id: editingPartner.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this partner?")) {
      deleteMutation.mutate({ id });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleActive = (partner: Partner) => {
    updateMutation.mutate({ id: partner.id, isActive: !partner.isActive });
  };

  const toggleFeatured = (partner: Partner) => {
    updateMutation.mutate({ id: partner.id, isFeatured: !partner.isFeatured });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Affiliate Partners</h1>
            <p className="text-muted-foreground">
              Manage your affiliate partner links and discount codes
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Partner
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{partners?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {partners?.filter(p => p.isActive).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Featured</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {partners?.filter(p => p.isFeatured).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">With Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {partners?.filter(p => p.code).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Partners Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Partners</CardTitle>
            <CardDescription>
              Click on a partner to edit, or use the action buttons to manage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="text-center">Featured</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners?.map((partner) => (
                  <TableRow key={partner.id} className={!partner.isActive ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{partner.name}</span>
                        {partner.isFeatured && (
                          <Shield className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {partner.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {partner.code ? (
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {partner.code}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => copyCode(partner.code!)}
                          >
                            {copiedCode === partner.code ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No code</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {partner.discountText || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={partner.isFeatured}
                        onCheckedChange={() => toggleFeatured(partner)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={partner.isActive}
                        onCheckedChange={() => toggleActive(partner)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(partner.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenDialog(partner)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(partner.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPartner ? "Edit Partner" : "Add New Partner"}
              </DialogTitle>
              <DialogDescription>
                {editingPartner
                  ? "Update the partner details below"
                  : "Fill in the details for the new affiliate partner"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Partner name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as Partner["category"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">Affiliate URL *</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com/?ref=omega"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the partner"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Discount Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="OMEGA15"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discountText">Discount Text</Label>
                  <Input
                    id="discountText"
                    value={formData.discountText}
                    onChange={(e) => setFormData({ ...formData, discountText: e.target.value })}
                    placeholder="15% off your order"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testimonial">Your Review/Testimonial</Label>
                <Textarea
                  id="testimonial"
                  value={formData.testimonial}
                  onChange={(e) => setFormData({ ...formData, testimonial: e.target.value })}
                  placeholder="Why you recommend this partner..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center gap-6 pt-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                    />
                    <Label htmlFor="isFeatured">Featured</Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingPartner ? "Update Partner" : "Add Partner"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
