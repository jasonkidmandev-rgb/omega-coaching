import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  FolderOpen,
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  FlaskConical,
  TrendingUp,
  FileSignature,
  BookOpen,
  User,
  File,
  Image,
  FileSpreadsheet,
  ArrowLeft,
  Plus,
  Clock,
  Shield,
  ShieldOff,
  RefreshCw,
  FolderPlus,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

interface DocumentsSubTabProps {
  clientId: number;
  clientName: string;
}

const folderIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  labs: FlaskConical,
  progress_reports: TrendingUp,
  intake_waivers: FileSignature,
  resources: BookOpen,
  personal: User,
};

export default function DocumentsSubTab({ clientId, clientName }: DocumentsSubTabProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadVisibility, setUploadVisibility] = useState<"shared" | "coach_only">("shared");
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);
  const [deleteDocName, setDeleteDocName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize system folders
  const initFoldersMutation = trpc.document.folders.initializeSystemFolders.useMutation({
    onSuccess: () => {
      foldersQuery.refetch();
      toast.success("Document folders initialized");
    },
    onError: (err) => toast.error(err.message),
  });

  // Fetch folders
  const foldersQuery = trpc.document.folders.list.useQuery(
    { clientProtocolId: clientId },
    { enabled: !!clientId }
  );

  // Fetch documents for the selected folder (or all)
  const docsQuery = trpc.document.list.useQuery(
    { clientProtocolId: clientId, folderId: selectedFolderId ?? undefined },
    { enabled: !!clientId }
  );

  // Fetch pending document requests
  const requestsQuery = trpc.document.requests.list.useQuery(
    { clientProtocolId: clientId, status: "pending" },
    { enabled: !!clientId }
  );

  // Upload mutation
  const uploadMutation = trpc.document.upload.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      docsQuery.refetch();
      foldersQuery.refetch();
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadDescription("");
      setIsUploading(false);
    },
    onError: (err) => {
      toast.error(err.message || "Upload failed");
      setIsUploading(false);
    },
  });

  // Delete mutation
  const deleteMutation = trpc.document.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      docsQuery.refetch();
      foldersQuery.refetch();
      setDeleteDocId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  // Restore mutation
  const restoreMutation = trpc.document.restore.useMutation({
    onSuccess: () => {
      toast.success("Document restored");
      docsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Visibility update mutation
  const updateMutation = trpc.document.update.useMutation({
    onSuccess: () => {
      toast.success("Document updated");
      docsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const folders = foldersQuery.data || [];
  const documents = docsQuery.data || [];
  const pendingRequests = requestsQuery.data || [];

  const currentFolder = folders.find((f: any) => f.id === selectedFolderId);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || selectedFolderId === null) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      uploadMutation.mutate({
        clientProtocolId: clientId,
        folderId: selectedFolderId,
        name: selectedFile.name,
        description: uploadDescription || undefined,
        base64Data: base64,
        mimeType: selectedFile.type,
        visibility: uploadVisibility,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith("image/")) return Image;
    if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel")) return FileSpreadsheet;
    if (mimeType?.includes("pdf")) return FileText;
    return File;
  };

  const getFolderIcon = (folder: any) => {
    const key = folder.systemType || folder.name?.toLowerCase().replace(/ /g, "_") || "";
    return folderIcons[key] || FolderOpen;
  };

  // Loading state
  if (foldersQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  // No folders yet — offer to initialize
  if (folders.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Document Folders</h3>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          Initialize the default document folders (Labs, Progress Reports, Intake & Waivers, Resources, Personal) for {clientName}.
        </p>
        <Button
          onClick={() => initFoldersMutation.mutate({ clientProtocolId: clientId })}
          disabled={initFoldersMutation.isPending}
        >
          <FolderPlus className="h-4 w-4 mr-2" />
          {initFoldersMutation.isPending ? "Creating..." : "Initialize Folders"}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedFolderId !== null && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedFolderId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-orange-500" />
              {selectedFolderId === null ? "Documents" : currentFolder?.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedFolderId === null
                ? `${documents.length} document${documents.length !== 1 ? "s" : ""} across ${folders.length} folders`
                : `${documents.length} file${documents.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              foldersQuery.refetch();
              docsQuery.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {selectedFolderId !== null && (
            <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          )}
        </div>
      </div>

      {/* Pending Document Requests */}
      {pendingRequests.length > 0 && selectedFolderId === null && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 pb-3">
            <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Document Requests ({pendingRequests.length})
            </h4>
            <div className="space-y-2">
              {pendingRequests.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between text-sm bg-white rounded-md px-3 py-2 border border-amber-200">
                  <div>
                    <span className="font-medium">{req.title}</span>
                    {req.dueDate && (
                      <span className="text-xs text-amber-600 ml-2">
                        Due {format(new Date(req.dueDate), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-amber-700 border-amber-300">Pending</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Folder Grid */}
      {selectedFolderId === null ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {folders.map((folder: any) => {
            const Icon = getFolderIcon(folder);
            const folderDocs = documents.filter((d: any) => d.folderId === folder.id);
            const hasClientUploads = folderDocs.some((d: any) => d.uploadedBy === "client");
            return (
              <Card
                key={folder.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors relative"
                onClick={() => setSelectedFolderId(folder.id)}
              >
                <CardContent className="pt-5 pb-4 px-4">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm leading-tight">{folder.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {folderDocs.length} file{folderDocs.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {hasClientUploads && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Client Upload
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Document List */
        <Card>
          <CardContent className="pt-4">
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium">No documents in this folder</p>
                <p className="text-sm mt-1">Upload a file to get started</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc: any) => {
                  const FileIcon = getFileIcon(doc.mimeType || "");
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <FileIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{doc.name}</p>
                          {doc.description && (
                            <p className="text-xs text-muted-foreground truncate">{doc.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(doc.fileSize || 0)}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                            </span>
                            <Badge
                              variant={doc.uploadedBy === "client" ? "default" : "outline"}
                              className={`text-[10px] px-1.5 py-0 ${
                                doc.uploadedBy === "client"
                                  ? "bg-blue-500 hover:bg-blue-600"
                                  : ""
                              }`}
                            >
                              {doc.uploadedBy === "client" ? "Client" : doc.uploadedBy === "system" ? "System" : "Coach"}
                            </Badge>
                            {doc.visibility === "coach_only" && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600">
                                <Shield className="h-2.5 w-2.5 mr-0.5" />
                                Coach Only
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {/* Toggle visibility */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title={doc.visibility === "shared" ? "Make coach-only" : "Make shared with client"}
                          onClick={() =>
                            updateMutation.mutate({
                              id: doc.id,
                              visibility: doc.visibility === "shared" ? "coach_only" : "shared",
                            })
                          }
                        >
                          {doc.visibility === "shared" ? (
                            <ShieldOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Shield className="h-4 w-4 text-amber-500" />
                          )}
                        </Button>
                        {/* View */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(doc.s3Url, "_blank")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {/* Download */}
                        <Button variant="ghost" size="sm" asChild>
                          <a href={doc.s3Url} download={doc.name} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteDocId(doc.id);
                            setDeleteDocName(doc.name);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a file to {currentFolder?.name || "this folder"} for {clientName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>File</Label>
              <div className="mt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.txt"
                />
                {selectedFile ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                    <FileText className="h-8 w-8 text-orange-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-20 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to select file (max 10MB)</span>
                    </div>
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Brief description of this document..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={uploadVisibility} onValueChange={(v: "shared" | "coach_only") => setUploadVisibility(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared" textValue="Shared with Client">
                    <span className="flex items-center gap-2">
                      <Eye className="h-3.5 w-3.5" /> Shared with Client
                    </span>
                  </SelectItem>
                  <SelectItem value="coach_only" textValue="Coach Only">
                    <span className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5" /> Coach Only
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDocId !== null} onOpenChange={(open) => !open && setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDocName}"? This can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deleteDocId && deleteMutation.mutate({ id: deleteDocId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
