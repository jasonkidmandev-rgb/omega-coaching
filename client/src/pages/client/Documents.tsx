import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FolderOpen, FileText, Upload, Download, Eye,
  FlaskConical, TrendingUp, FileSignature, BookOpen, User,
  Plus, File, Image, FileSpreadsheet, ArrowLeft
} from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const folderIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'labs': FlaskConical,
  'progress_reports': TrendingUp,
  'intake_waivers': FileSignature,
  'resources': BookOpen,
  'personal': User,
};

export default function ClientDocuments() {
  const [, setLocation] = useLocation();
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch folders with documents
  const { data: folders, isLoading, refetch } = trpc.document.getFolders.useQuery();
  
  // Upload mutation - use clientUploadProtected for logged-in client uploads
  const uploadMutation = trpc.document.clientUploadProtected.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      refetch();
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setIsUploading(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload document");
      setIsUploading(false);
    }
  });
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile || selectedFolder === null) return;
    
    setIsUploading(true);
    
    // Convert file to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      uploadMutation.mutate({
        folderId: selectedFolder,
        name: selectedFile.name,
        base64Data: base64,
        mimeType: selectedFile.type,
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
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
    if (mimeType.includes('pdf')) return FileText;
    return File;
  };
  
  type FolderType = NonNullable<typeof folders>[number];
  type DocumentType = FolderType['documents'][number];
  
  const currentFolder = folders?.find((f: FolderType) => f.id === selectedFolder);
  const folderKey = currentFolder?.name?.toLowerCase().replace(/ /g, '_') || '';
  const FolderIcon = folderIcons[folderKey] || FolderOpen;

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Show empty state if no folders (no protocol)
  if (!folders || folders.length === 0) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">My Documents</h1>
            <p className="text-muted-foreground">
              Access your labs, progress reports, and resources
            </p>
          </div>
        </div>
        <Card className="p-8 text-center">
          <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Documents Yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your document folders will appear here once your coach creates your protocol. 
            Check back soon or contact your coach if you have questions.
          </p>
        </Card>
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
            <h1 className="text-2xl font-bold">My Documents</h1>
            <p className="text-muted-foreground">
              Access your labs, progress reports, and resources
            </p>
          </div>
        </div>
      </div>

      {/* Folder Grid or Document List */}
      {selectedFolder === null ? (
        // Folder Grid
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {folders?.map((folder: FolderType) => {
            const iconKey = folder.name?.toLowerCase().replace(/ /g, '_') || '';
            const Icon = folderIcons[iconKey] || FolderOpen;
            return (
              <Card 
                key={folder.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setSelectedFolder(folder.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{folder.name}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">
                          {folder.documents?.length || 0} files
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        // Document List
        <div className="space-y-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedFolder(null)}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              All Folders
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium flex items-center gap-2">
              <FolderIcon className="h-4 w-4" />
              {currentFolder?.name}
            </span>
          </div>
          
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FolderIcon className="h-5 w-5 text-orange-500" />
                    {currentFolder?.name}
                  </CardTitle>
                </div>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {currentFolder?.documents && currentFolder.documents.length > 0 ? (
                  <div className="space-y-3">
                    {currentFolder.documents.map((doc: DocumentType) => {
                      const FileIcon = getFileIcon(doc.mimeType || '');
                      return (
                        <div 
                          key={doc.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                              <FileIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatFileSize(doc.fileSize || 0)}</span>
                                <span>•</span>
                                <span>{formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}</span>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs">
                                  {doc.uploadedBy === 'coach' ? 'From Coach' : 'Your Upload'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(doc.s3Url || '', '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              asChild
                            >
                              <a href={doc.s3Url || ''} download={doc.name}>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-50" />
                    <p>No documents yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => setUploadDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Upload your first document
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document to your {currentFolder?.name} folder
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="h-12 w-12 mx-auto text-orange-500" />
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="font-medium">Click to select a file</p>
                  <p className="text-sm text-muted-foreground">
                    PDF, images, or documents up to 10MB
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
