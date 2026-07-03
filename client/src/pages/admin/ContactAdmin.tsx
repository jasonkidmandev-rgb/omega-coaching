import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  Users,
  Edit,
  Save,
  X,
  Mail,
  Phone,
  User,
  Link2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function ContactAdmin() {
  const [search, setSearch] = useState("");
  const [editingContact, setEditingContact] = useState<any>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });

  const utils = trpc.useUtils();

  // Reuse the contacts list query to get contacts
  const { data, isLoading } = trpc.contacts.list.useQuery({
    search: search || undefined,
    stage: "all",
    limit: 100,
    offset: 0,
  });

  const updateMutation = trpc.contacts.updateContact.useMutation({
    onSuccess: () => {
      toast.success("Contact updated — changes propagated to all linked records");
      setEditingContact(null);
      utils.contacts.list.invalidate();
    },
    onError: (err) => {
      toast.error(`Update failed: ${err.message}`);
    },
  });

  const people = data?.people || [];

  // Filter to only show people with contactId (canonical contacts)
  const contacts = people.filter((p: any) => p.contactId);

  const openEdit = (person: any) => {
    const nameParts = (person.name || "").split(" ");
    setEditForm({
      firstName: nameParts[0] || "",
      lastName: nameParts.slice(1).join(" ") || "",
      email: person.email || "",
      phone: person.phone || "",
    });
    setEditingContact(person);
  };

  const handleSave = () => {
    if (!editingContact?.contactId) return;
    updateMutation.mutate({
      contactId: editingContact.contactId,
      firstName: editForm.firstName || undefined,
      lastName: editForm.lastName || undefined,
      email: editForm.email || null,
      phone: editForm.phone || null,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contact Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit canonical contact records. Changes propagate to all linked prospects, protocols, enrollments, and user accounts.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{contacts.length}</div>
              <div className="text-xs text-muted-foreground">Total Contacts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {contacts.filter((c: any) => c.email && c.phone).length}
              </div>
              <div className="text-xs text-muted-foreground">Complete Records</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {contacts.filter((c: any) => !c.email).length}
              </div>
              <div className="text-xs text-muted-foreground">Missing Email</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {contacts.filter((c: any) => !c.phone).length}
              </div>
              <div className="text-xs text-muted-foreground">Missing Phone</div>
            </CardContent>
          </Card>
        </div>

        {/* Contacts Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                No contacts found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">Phone</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">Stage</th>
                      <th className="text-center p-3 font-medium hidden lg:table-cell">Status</th>
                      <th className="text-center p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((person: any, idx: number) => {
                      const hasEmail = !!person.email;
                      const hasPhone = !!person.phone;
                      const isComplete = hasEmail && hasPhone;

                      return (
                        <tr key={person.id || idx} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{person.name}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            {hasEmail ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                {person.email}
                              </span>
                            ) : (
                              <span className="text-orange-500 text-xs flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Missing
                              </span>
                            )}
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            {hasPhone ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {person.phone}
                              </span>
                            ) : (
                              <span className="text-orange-500 text-xs flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Missing
                              </span>
                            )}
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            <Badge variant="outline" className="text-xs">{person.lifecycleStage?.replace(/_/g, " ")}</Badge>
                          </td>
                          <td className="p-3 text-center hidden lg:table-cell">
                            {isComplete ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-orange-500 mx-auto" />
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(person)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" /> Edit Contact
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Changes will propagate to all linked records (prospects, protocols, enrollments, user accounts).
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">First Name</label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm(f => ({ ...f, firstName: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Last Name</label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm(f => ({ ...f, lastName: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@example.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+1234567890"
                  className="pl-10"
                />
              </div>
            </div>

            {editingContact && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                <div className="font-medium text-muted-foreground">Linked Records:</div>
                <div className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Contact ID: {editingContact.contactId}
                </div>
                <div className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Stage: {editingContact.lifecycleStage?.replace(/_/g, " ")}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingContact(null)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Save className="h-4 w-4 mr-1" />
                {updateMutation.isPending ? "Saving..." : "Save & Propagate"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
