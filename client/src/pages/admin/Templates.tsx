import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { Plus, MoreHorizontal, Edit, Trash2, FileText, Star, AlertTriangle, Tag, Filter } from "lucide-react";
import { TableSkeleton } from "@/components/TableSkeleton";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useRef, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export default function AdminTemplates() {
  const [, setLocation] = useLocation();

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

  const { data: templates, refetch, isLoading: isLoadingTemplates } = trpc.template.list.useQuery();
  const [tagFilter, setTagFilter] = useState<string>("");

  // Get all unique tags from templates
  const allTags = useMemo(() => {
    if (!templates) return [];
    const tagSet = new Set<string>();
    templates.forEach(t => {
      if ((t as any).tags) {
        (t as any).tags.split(',').forEach((tag: string) => {
          const trimmed = tag.trim().toLowerCase();
          if (trimmed) tagSet.add(trimmed);
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [templates]);

  // Filter templates by tag
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!tagFilter) return templates;
    return templates.filter(t => {
      const tags = ((t as any).tags || '').toLowerCase();
      return tags.includes(tagFilter.toLowerCase());
    });
  }, [templates, tagFilter]);
  const { data: allProtocolItems } = trpc.protocolItem.list.useQuery();
  
  // Fetch template items for each template to check sync status
  const templateItemsQueries = templates?.map(t => t.id) || [];
  const { data: allTemplateItems } = trpc.template.getAllTemplateItems.useQuery(
    undefined,
    { enabled: templates && templates.length > 0 }
  );

  // Calculate which templates are out of sync
  const templateSyncStatus = useMemo(() => {
    if (!templates || !allProtocolItems || !allTemplateItems) return {};
    
    const status: Record<number, { inSync: boolean; missingCount: number }> = {};
    const totalProtocolItems = allProtocolItems.length;
    
    templates.forEach(template => {
      const templateItems = allTemplateItems.filter(ti => ti.templateId === template.id);
      const templateItemIds = new Set(templateItems.map(ti => ti.protocolItemId));
      const missingCount = allProtocolItems.filter(pi => !templateItemIds.has(pi.id)).length;
      
      status[template.id] = {
        inSync: missingCount === 0,
        missingCount,
      };
    });
    
    return status;
  }, [templates, allProtocolItems, allTemplateItems]);

  const deleteMutation = trpc.template.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      saveScrollPosition();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete the template "${name}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Templates</h1>
            <p className="text-muted-foreground mt-1">
              Manage protocol templates for quick client setup
            </p>
          </div>
          <Button onClick={() => setLocation("/admin/templates/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Templates</CardTitle>
                <CardDescription>
                  {filteredTemplates.length} of {templates?.length || 0} templates
                  {tagFilter && ` (filtered by "${tagFilter}")`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tagFilter && (
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer bg-primary text-primary-foreground"
                        onClick={() => setTagFilter("")}
                      >
                        {tagFilter} ×
                      </Badge>
                    )}
                    {!tagFilter && allTags.slice(0, 5).map(tag => (
                      <Badge 
                        key={tag}
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary/10"
                        onClick={() => setTagFilter(tag)}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                    {!tagFilter && allTags.length > 5 && (
                      <Badge variant="outline" className="text-muted-foreground">
                        +{allTags.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTemplates ? (
              <TableSkeleton columns={5} rows={5} />
            ) : templates && templates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Sync Status</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => {
                    const syncStatus = templateSyncStatus[template.id];
                    const templateTags = ((template as any).tags || '').split(',').filter((t: string) => t.trim());
                    return (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{template.name}</span>
                            {template.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-xs">{template.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {templateTags.length > 0 ? templateTags.map((tag: string, idx: number) => (
                              <Badge 
                                key={idx} 
                                variant="secondary" 
                                className="text-xs cursor-pointer hover:bg-primary/20"
                                onClick={() => setTagFilter(tag.trim())}
                              >
                                {tag.trim()}
                              </Badge>
                            )) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{template.durationMonths} months</TableCell>
                        <TableCell>
                          {syncStatus && !syncStatus.inSync ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 cursor-pointer">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {syncStatus.missingCount} missing
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>This template is missing {syncStatus.missingCount} protocol item(s).</p>
                                  <p className="text-xs text-muted-foreground mt-1">Click Edit to sync with Protocol Items.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : syncStatus?.inSync ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              In Sync
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Loading...</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {template.isDefault && (
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Template actions menu">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setLocation(`/admin/templates/${template.id}`)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(template.id, template.name)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">No templates yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first template to streamline client onboarding
                </p>
                <Button onClick={() => setLocation("/admin/templates/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
