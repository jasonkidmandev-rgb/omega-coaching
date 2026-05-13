import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Video, Plus, Trash2, Edit, ExternalLink, Play } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

interface LaunchpadItem {
  id: number;
  key: string;
  name: string;
  shortDescription?: string | null;
  longDescription?: string | null;
  linkUrl?: string | null;
  icon?: string | null;
  category?: string | null;
  sortOrder?: number | null;
  isActive?: boolean | null;
}

interface LaunchpadVideo {
  id: number;
  launchpadItemId: number;
  title: string;
  description?: string | null;
  videoUrl: string;
  videoType?: string | null;
  sortOrder?: number | null;
}

export default function LaunchpadSettings() {
  const { data: items, isLoading, refetch } = trpc.launchpad.list.useQuery();
  const [editingItem, setEditingItem] = useState<LaunchpadItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [selectedItemForVideo, setSelectedItemForVideo] = useState<LaunchpadItem | null>(null);
  const [newVideo, setNewVideo] = useState({ title: "", description: "", videoUrl: "", videoType: "loom" });

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

  const updateItem = trpc.launchpad.update.useMutation({
    onSuccess: () => {
      toast.success("Launchpad item updated");
      saveScrollPosition();
      refetch();
      setEditDialogOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const createVideo = trpc.launchpad.createVideo.useMutation({
    onSuccess: () => {
      toast.success("Video added");
      saveScrollPosition();
      refetch();
      setVideoDialogOpen(false);
      setNewVideo({ title: "", description: "", videoUrl: "", videoType: "loom" });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteVideo = trpc.launchpad.deleteVideo.useMutation({
    onSuccess: () => {
      toast.success("Video deleted");
      saveScrollPosition();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleUpdateItem = () => {
    if (!editingItem) return;
    updateItem.mutate({
      id: editingItem.id,
      name: editingItem.name,
      shortDescription: editingItem.shortDescription || undefined,
      longDescription: editingItem.longDescription || undefined,
      linkUrl: editingItem.linkUrl || undefined,
    });
  };

  const handleAddVideo = () => {
    if (!selectedItemForVideo) return;
    createVideo.mutate({
      launchpadItemId: selectedItemForVideo.id,
      title: newVideo.title,
      description: newVideo.description || undefined,
      videoUrl: newVideo.videoUrl,
      videoType: newVideo.videoType as "loom" | "youtube" | "vimeo" | "other",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Launchpad Settings
          </h1>
          <p className="text-muted-foreground">
            Manage descriptions, tooltips, and embedded videos for each Launchpad item
          </p>
        </div>

        {/* Items List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !items || items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No launchpad items configured yet
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {items.map((item: LaunchpadItem) => (
              <AccordionItem key={item.id} value={`item-${item.id}`} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.shortDescription || "No description"}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-auto mr-4">
                      {item.category || "uncategorized"}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-6">
                  <div className="space-y-4">
                    {/* Item Details */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground">Short Description (Tooltip)</Label>
                        <p className="mt-1">{item.shortDescription || "Not set"}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Link URL</Label>
                        <p className="mt-1 flex items-center gap-2">
                          {item.linkUrl ? (
                            <>
                              <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-xs">
                                {item.linkUrl}
                              </a>
                              <ExternalLink className="h-4 w-4" />
                            </>
                          ) : "Not set"}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-muted-foreground">Long Description (Popup)</Label>
                      <p className="mt-1 text-sm">{item.longDescription || "Not set"}</p>
                    </div>

                    {/* Videos Section */}
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-muted-foreground flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Embedded Videos
                        </Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedItemForVideo(item);
                            setVideoDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Video
                        </Button>
                      </div>
                      <LaunchpadItemVideos 
                        itemId={item.id} 
                        onDelete={(videoId) => deleteVideo.mutate({ id: videoId })}
                      />
                    </div>

                    {/* Edit Button */}
                    <div className="flex justify-end pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingItem(item);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Details
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Edit Item Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Launchpad Item</DialogTitle>
              <DialogDescription>
                Update the description and tooltip for this item
              </DialogDescription>
            </DialogHeader>
            {editingItem && (
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Short Description (Tooltip on hover)</Label>
                  <Input
                    value={editingItem.shortDescription || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, shortDescription: e.target.value })}
                    placeholder="Brief description shown on hover"
                  />
                </div>
                <div>
                  <Label>Long Description (Popup content)</Label>
                  <Textarea
                    value={editingItem.longDescription || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, longDescription: e.target.value })}
                    placeholder="Detailed explanation shown in popup"
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Link URL</Label>
                  <Input
                    value={editingItem.linkUrl || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, linkUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateItem} disabled={updateItem.isPending}>
                {updateItem.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Video Dialog */}
        <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Video to {selectedItemForVideo?.name}</DialogTitle>
              <DialogDescription>
                Add an embedded video (Loom, YouTube, Vimeo) to this launchpad item
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Video Title</Label>
                <Input
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                  placeholder="e.g., How to Navigate the Platform"
                />
              </div>
              <div>
                <Label>Video Type</Label>
                <Select
                  value={newVideo.videoType}
                  onValueChange={(value) => setNewVideo({ ...newVideo, videoType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loom">Loom</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="vimeo">Vimeo</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Video URL</Label>
                <Input
                  value={newVideo.videoUrl}
                  onChange={(e) => setNewVideo({ ...newVideo, videoUrl: e.target.value })}
                  placeholder="https://www.loom.com/share/..."
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={newVideo.description}
                  onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                  placeholder="Brief description of what this video covers"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVideoDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddVideo} disabled={createVideo.isPending || !newVideo.title || !newVideo.videoUrl}>
                {createVideo.isPending ? "Adding..." : "Add Video"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// Sub-component to fetch and display videos for an item
function LaunchpadItemVideos({ itemId, onDelete }: { itemId: number; onDelete: (id: number) => void }) {
  const { data: videos, isLoading } = trpc.launchpad.getVideos.useQuery({ launchpadItemId: itemId });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading videos...</div>;
  }

  if (!videos || videos.length === 0) {
    return <div className="text-sm text-muted-foreground">No videos added yet</div>;
  }

  return (
    <div className="space-y-2">
      {videos.map((video: LaunchpadVideo) => (
        <div key={video.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
              <Play className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">{video.title}</div>
              <div className="text-xs text-muted-foreground">
                {video.videoType} • {video.description || "No description"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" asChild>
              <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(video.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}