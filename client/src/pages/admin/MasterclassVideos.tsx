import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Video, Edit, ExternalLink, Play, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { flagOn } from "@shared/flags";

export default function MasterclassVideos() {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [googleDriveVideoId, setGoogleDriveVideoId] = useState("");
  const [googleDriveFolderId, setGoogleDriveFolderId] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState("");
  const [chapters, setChapters] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  const utils = trpc.useUtils();
  const { data: videos, isLoading } = trpc.transformation.getMasterclassVideos.useQuery();
  
  const updateMutation = trpc.transformation.updateMasterclassVideo.useMutation({
    onSuccess: () => {
      toast.success("Video updated successfully");
      setIsEditOpen(false);
      setSelectedVideo(null);
      utils.transformation.getMasterclassVideos.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const handleEdit = (video: any) => {
    setSelectedVideo(video);
    setTitle(video.title || "");
    setDescription(video.description || "");
    setGoogleDriveVideoId(video.googleDriveVideoId || "");
    setGoogleDriveFolderId(video.googleDriveFolderId || "");
    setYoutubeVideoId(video.youtubeVideoId || "");
    setEstimatedDurationMinutes(video.estimatedDurationMinutes?.toString() || "");
    setChapters(video.chapters || "");
    setIsRequired(video.isRequired || false);
    setIsActive(flagOn(video.isActive));
    setIsEditOpen(true);
  };
  
  const handleUpdate = () => {
    if (!selectedVideo) return;
    updateMutation.mutate({
      id: selectedVideo.id,
      title,
      description: description || undefined,
      googleDriveVideoId: googleDriveVideoId || undefined,
      googleDriveFolderId: googleDriveFolderId || undefined,
      youtubeVideoId: youtubeVideoId || undefined,
      estimatedDurationMinutes: estimatedDurationMinutes ? parseInt(estimatedDurationMinutes) : undefined,
      chapters: chapters || undefined,
      isRequired,
      isActive,
    });
  };
  
  const extractVideoId = (url: string): string => {
    // Extract video ID from various Google Drive URL formats
    // https://drive.google.com/file/d/VIDEO_ID/view
    // https://drive.google.com/open?id=VIDEO_ID
    const fileMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return fileMatch[1];
    
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return idMatch[1];
    
    // If it's already just an ID, return as-is
    if (/^[a-zA-Z0-9_-]+$/.test(url)) return url;
    
    return url;
  };
  
  const extractFolderId = (url: string): string => {
    // Extract folder ID from Google Drive folder URLs
    // https://drive.google.com/drive/folders/FOLDER_ID
    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return folderMatch[1];
    
    // If it's already just an ID, return as-is
    if (/^[a-zA-Z0-9_-]+$/.test(url)) return url;
    
    return url;
  };
  
  const extractYoutubeVideoId = (url: string): string => {
    // Extract video ID from various YouTube URL formats
    // https://youtu.be/VIDEO_ID
    // https://www.youtube.com/watch?v=VIDEO_ID
    // https://youtube.com/watch?v=VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return shortMatch[1];
    
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) return watchMatch[1];
    
    // If it's already just an ID, return as-is
    if (/^[a-zA-Z0-9_-]+$/.test(url)) return url;
    
    return url;
  };
  
  const getVideoUrl = (video: any): string | null => {
    if (video.youtubeVideoId) {
      return `https://www.youtube.com/watch?v=${video.youtubeVideoId}`;
    }
    if (video.googleDriveVideoId) {
      return `https://drive.google.com/file/d/${video.googleDriveVideoId}/view`;
    }
    if (video.googleDriveFolderId) {
      return `https://drive.google.com/drive/folders/${video.googleDriveFolderId}`;
    }
    return null;
  };
  
  const getSectionLabel = (sectionNumber: number): string => {
    if (sectionNumber === 0) return "Intro";
    if (sectionNumber === 13) return "Bonus";
    if (sectionNumber === 14) return "Testimonials";
    return `Section ${sectionNumber}`;
  };
  
  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Masterclass Videos</h1>
          <p className="text-slate-600">Manage video content for the 90-Day Transformation Program</p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.open("https://drive.google.com/drive/folders/1pSaA3lkTjTGVJEfSt0fBrI3w8et8H6ON", "_blank")}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Google Drive Folder
        </Button>
      </div>
      
      {/* Instructions Card */}
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-amber-800 text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            How to Add Video Links
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-700 text-sm space-y-2">
          <p>1. Open the Google Drive folder containing your videos</p>
          <p>2. Right-click on a video file and select "Get link" or "Share"</p>
          <p>3. Make sure "Anyone with the link" can view</p>
          <p>4. Copy the link and paste it in the "Google Drive Video ID" field below</p>
          <p className="font-medium">The system will automatically extract the video ID from the URL.</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Video Library</CardTitle>
          <CardDescription>
            {(videos as any[])?.length || 0} video section(s) configured. Section 4 (Anti-Aging/Bioregulators) is required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : (videos as any[])?.length === 0 ? (
            <div className="text-center py-8">
              <Video className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No videos configured</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Section</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Video Link</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(videos as any[])?.map((video: any) => {
                  const videoUrl = getVideoUrl(video);
                  const hasLink = !!videoUrl;
                  
                  return (
                    <TableRow key={video.id} className={video.isRequired ? "bg-amber-50" : ""}>
                      <TableCell>
                        <Badge variant={video.isRequired ? "default" : "outline"} className={video.isRequired ? "bg-amber-500" : ""}>
                          {getSectionLabel(video.sectionNumber)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{video.title}</p>
                          {video.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{video.description}</p>
                          )}
                          {video.isRequired && (
                            <Badge variant="outline" className="mt-1 text-xs border-amber-500 text-amber-600">
                              Required
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {video.estimatedDurationMinutes ? (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Clock className="h-4 w-4" />
                            <span>{video.estimatedDurationMinutes} min</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {hasLink ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => window.open(videoUrl, "_blank")}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Linked
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        ) : (
                          <span className="text-amber-600 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            Not linked
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {video.isActive ? (
                          <Badge variant="outline" className="border-green-500 text-green-600">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-300 text-slate-500">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(video)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Video Section</DialogTitle>
            <DialogDescription>
              Update the video details and Google Drive link
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="googleDriveVideoId">Google Drive Video Link or ID</Label>
              <Input
                id="googleDriveVideoId"
                placeholder="Paste full URL or video ID"
                value={googleDriveVideoId}
                onChange={(e) => setGoogleDriveVideoId(extractVideoId(e.target.value))}
              />
              <p className="text-xs text-slate-500">
                Paste the full Google Drive share link - the ID will be extracted automatically
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="googleDriveFolderId">Google Drive Folder Link or ID (optional)</Label>
              <Input
                id="googleDriveFolderId"
                placeholder="For sections with multiple videos"
                value={googleDriveFolderId}
                onChange={(e) => setGoogleDriveFolderId(extractFolderId(e.target.value))}
              />
              <p className="text-xs text-slate-500">
                Use this if the section has multiple videos in a folder
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtubeVideoId" className="flex items-center gap-2">
                <span className="text-red-600">▶</span> YouTube Video Link or ID (Recommended)
              </Label>
              <Input
                id="youtubeVideoId"
                placeholder="Paste YouTube URL (e.g., https://youtu.be/KPWMCE8pFpM)"
                value={youtubeVideoId}
                onChange={(e) => setYoutubeVideoId(extractYoutubeVideoId(e.target.value))}
              />
              <p className="text-xs text-slate-500">
                Paste any YouTube link - the video ID will be extracted automatically. YouTube videos are preferred for better playback.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Estimated Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={estimatedDurationMinutes}
                onChange={(e) => setEstimatedDurationMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chapters">Chapter Timestamps (optional)</Label>
              <Textarea
                id="chapters"
                placeholder="0:00 Introduction
2:30 What are peptides?
5:45 How they work
10:00 Getting started"
                value={chapters}
                onChange={(e) => setChapters(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-slate-500">
                Enter chapter timestamps, one per line. Format: "0:00 Chapter Title". These will appear as clickable jump points in the video player.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Required Video</Label>
                <p className="text-xs text-slate-500">Clients must watch this before proceeding</p>
              </div>
              <Switch
                checked={isRequired}
                onCheckedChange={setIsRequired}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-xs text-slate-500">Show this video in the library</p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}