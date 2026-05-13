import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Plus, Edit, Trash2, ListChecks, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";

export default function AdminRequirements() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

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

  const { data: requirements, refetch } = trpc.requirements.list.useQuery();

  const createMutation = trpc.requirements.create.useMutation({
    onSuccess: () => {
      toast.success("Recommendation created");
      saveScrollPosition();
      refetch();
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.requirements.update.useMutation({
    onSuccess: () => {
      toast.success("Recommendation updated");
      saveScrollPosition();
      refetch();
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.requirements.delete.useMutation({
    onSuccess: () => {
      toast.success("Recommendation deleted");
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this recommendation?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      text: formData.get("text") as string,
      isDefault: formData.get("isDefault") === "on",
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Recommendations</h1>
            <p className="text-muted-foreground mt-1">
              Manage default recommendations shown on client protocols
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingItem(null);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Recommendation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Recommendation" : "Add New Recommendation"}</DialogTitle>
                <DialogDescription>
                  {editingItem ? "Update the recommendation text" : "Add a new recommendation for client protocols"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="text">Recommendation Text *</Label>
                    <Input
                      id="text"
                      name="text"
                      defaultValue={editingItem?.text || ""}
                      placeholder="Drink body weight in OZ of water per day minimum"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isDefault"
                      name="isDefault"
                      defaultChecked={editingItem?.isDefault ?? true}
                    />
                    <Label htmlFor="isDefault">Include by default in new protocols</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingItem ? "Update" : "Add Recommendation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Protocol Recommendations</CardTitle>
            <CardDescription>
              These recommendations are shown to clients on their protocol page
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requirements && requirements.length > 0 ? (
              <div className="space-y-3">
                {requirements.map((req, index) => (
                  <div
                    key={req.id}
                    className="flex items-start gap-3 p-4 rounded-lg border bg-white hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-muted-foreground mt-1">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{req.text}</p>
                      {req.isDefault && (
                        <span className="inline-flex items-center mt-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(req)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(req.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ListChecks className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">No recommendations yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add recommendations that will be shown on client protocols
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Recommendation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Example Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Example Recommendations</CardTitle>
            <CardDescription>
              Common recommendations you might want to add
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Limit alcohol & sugar as much as possible (anti-inflammatory)</p>
              <p>• Eat Target Goal Body Weight in Grams of Protein per day</p>
              <p>• Drink body weight in OZ of water per day minimum</p>
              <p>• Add electrolytes while fasting and/or in heat and/or pre/post workouts</p>
              <p>• Add turmeric/curcumin and Fish oil/Omega 3's for joints</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
