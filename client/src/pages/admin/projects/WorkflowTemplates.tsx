import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { 
  Plus, 
  ChevronDown,
  ChevronRight,
  Edit,
  Pencil,
  Trash2,
  FileText,
  Loader2,
  Settings,
  ListTodo,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function WorkflowTemplates() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [isAddSubtaskDialogOpen, setIsAddSubtaskDialogOpen] = useState(false);
  const [isEditSubtaskDialogOpen, setIsEditSubtaskDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedSubtask, setSelectedSubtask] = useState<any>(null);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<number>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  const [newTemplateData, setNewTemplateData] = useState({
    name: "",
    description: "",
    durationDays: 90,
    isDefault: false,
  });

  const [newTaskData, setNewTaskData] = useState({
    name: "",
    description: "",
    lifecycleStageId: 0,
    sortOrder: 0,
  });

  const [editTaskData, setEditTaskData] = useState({
    name: "",
    description: "",
    lifecycleStageId: 0,
    sortOrder: 0,
  });

  const [newSubtaskData, setNewSubtaskData] = useState({
    name: "",
    description: "",
    sortOrder: 0,
  });

  const [editSubtaskData, setEditSubtaskData] = useState({
    name: "",
    description: "",
    sortOrder: 0,
  });

  const { data: templates, refetch: refetchTemplates } = trpc.workflowTemplate.list.useQuery();
  const { data: lifecycleStages } = trpc.lifecycleStage.list.useQuery();

  const createTemplateMutation = trpc.workflowTemplate.create.useMutation({
    onSuccess: () => {
      toast.success("Workflow template created");
      refetchTemplates();
      setIsCreateDialogOpen(false);
      setNewTemplateData({ name: "", description: "", durationDays: 90, isDefault: false });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateTemplateMutation = trpc.workflowTemplate.update.useMutation({
    onSuccess: () => {
      toast.success("Workflow template updated");
      refetchTemplates();
      setIsEditDialogOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteTemplateMutation = trpc.workflowTemplate.delete.useMutation({
    onSuccess: () => {
      toast.success("Workflow template deleted");
      refetchTemplates();
    },
    onError: (error) => toast.error(error.message),
  });

  const createTaskMutation = trpc.workflowTemplate.createTask.useMutation({
    onSuccess: () => {
      toast.success("Task added to template");
      setIsAddTaskDialogOpen(false);
      setNewTaskData({ name: "", description: "", lifecycleStageId: 0, sortOrder: 0 });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateTaskMutation = trpc.workflowTemplate.updateTask.useMutation({
    onSuccess: () => {
      toast.success("Task updated");
      setIsEditTaskDialogOpen(false);
      setSelectedTask(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteTaskMutation = trpc.workflowTemplate.deleteTask.useMutation({
    onSuccess: () => {
      toast.success("Task deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  const createSubtaskMutation = trpc.workflowTemplate.createSubtask.useMutation({
    onSuccess: () => {
      toast.success("Subtask added");
      setIsAddSubtaskDialogOpen(false);
      setNewSubtaskData({ name: "", description: "", sortOrder: 0 });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateSubtaskMutation = trpc.workflowTemplate.updateSubtask.useMutation({
    onSuccess: () => {
      toast.success("Subtask updated");
      setIsEditSubtaskDialogOpen(false);
      setSelectedSubtask(null);
      setEditSubtaskData({ name: "", description: "", sortOrder: 0 });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteSubtaskMutation = trpc.workflowTemplate.deleteSubtask.useMutation({
    onSuccess: () => toast.success("Subtask deleted"),
    onError: (error: any) => toast.error(error.message),
  });

  const seedDefaultsMutation = trpc.workflowTemplate.seedDefaults.useMutation({
    onSuccess: (result) => {
      toast.success(`Seeded ${result.templates} templates with ${result.lifecycleStages} lifecycle stages and ${result.teamRoles} team roles`);
      refetchTemplates();
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleTemplateExpanded = (templateId: number) => {
    setExpandedTemplates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) newSet.delete(templateId);
      else newSet.add(templateId);
      return newSet;
    });
  };

  const toggleTaskExpanded = (taskId: number) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) newSet.delete(taskId);
      else newSet.add(taskId);
      return newSet;
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Workflow Templates</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage workflow templates for client projects
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => seedDefaultsMutation.mutate()}
              disabled={seedDefaultsMutation.isPending}
            >
              {seedDefaultsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              Seed Default Templates
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
        </div>

        {/* Templates List */}
        {templates && templates.length > 0 ? (
          <div className="space-y-4">
            {templates.map(template => (
              <Card key={template.id}>
                <Collapsible
                  open={expandedTemplates.has(template.id)}
                  onOpenChange={() => toggleTemplateExpanded(template.id)}
                >
                  <CardHeader className="cursor-pointer" onClick={() => toggleTemplateExpanded(template.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Toggle template details">
                            {expandedTemplates.has(template.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {template.name}
                            {template.isDefault && (
                              <Badge variant="secondary">Default</Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {template.durationDays} days &bull; {template.description || "No description"}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setNewTemplateData({
                              name: template.name,
                              description: template.description || "",
                              durationDays: template.durationDays,
                              isDefault: template.isDefault,
                            });
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setIsAddTaskDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Task
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete the template "${template.name}"? This will also delete all its tasks and subtasks.`)) {
                              deleteTemplateMutation.mutate({ id: template.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <TemplateTasksList
                        templateId={template.id}
                        lifecycleStages={lifecycleStages || []}
                        expandedTasks={expandedTasks}
                        onToggleTask={toggleTaskExpanded}
                        onAddSubtask={(task) => {
                          setSelectedTask(task);
                          setIsAddSubtaskDialogOpen(true);
                        }}
                        onEditTask={(task) => {
                          setSelectedTask(task);
                          setEditTaskData({
                            name: task.name,
                            description: task.description || "",
                            lifecycleStageId: task.lifecycleStageId,
                            sortOrder: task.sortOrder || 0,
                          });
                          setIsEditTaskDialogOpen(true);
                        }}
                        onDeleteTask={(taskId) => {
                          if (confirm("Are you sure you want to delete this task and all its subtasks?")) {
                            deleteTaskMutation.mutate({ id: taskId });
                          }
                        }}
                        onEditSubtask={(subtask, task) => {
                          setSelectedTask(task);
                          setSelectedSubtask(subtask);
                          setEditSubtaskData({
                            name: subtask.name,
                            description: subtask.description || "",
                            sortOrder: subtask.sortOrder || 0,
                          });
                          setIsEditSubtaskDialogOpen(true);
                        }}
                        onDeleteSubtask={(subtaskId) => {
                          if (confirm("Are you sure you want to delete this subtask?")) {
                            deleteSubtaskMutation.mutate({ id: subtaskId });
                          }
                        }}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No workflow templates</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first workflow template to standardize client onboarding
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lifecycle Stages Setup Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Lifecycle Stages
            </CardTitle>
            <CardDescription>
              Configure the stages that projects move through
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LifecycleStagesManager />
          </CardContent>
        </Card>

        {/* Team Members Setup Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              Manage team members who can be assigned to tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamMembersManager />
          </CardContent>
        </Card>
      </div>

      {/* Create Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workflow Template</DialogTitle>
            <DialogDescription>Create a new workflow template for client projects</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                value={newTemplateData.name}
                onChange={(e) => setNewTemplateData({ ...newTemplateData, name: e.target.value })}
                placeholder="e.g., 90-Day Protocol"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTemplateData.description}
                onChange={(e) => setNewTemplateData({ ...newTemplateData, description: e.target.value })}
                placeholder="Optional description..."
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (days)</Label>
              <Input
                type="number"
                value={newTemplateData.durationDays}
                onChange={(e) => setNewTemplateData({ ...newTemplateData, durationDays: parseInt(e.target.value) || 90 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!newTemplateData.name) { toast.error("Please enter a template name"); return; }
                createTemplateMutation.mutate(newTemplateData);
              }}
              disabled={createTemplateMutation.isPending}
            >
              {createTemplateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workflow Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                value={newTemplateData.name}
                onChange={(e) => setNewTemplateData({ ...newTemplateData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTemplateData.description}
                onChange={(e) => setNewTemplateData({ ...newTemplateData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (days)</Label>
              <Input
                type="number"
                value={newTemplateData.durationDays}
                onChange={(e) => setNewTemplateData({ ...newTemplateData, durationDays: parseInt(e.target.value) || 90 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!selectedTemplate) return;
                updateTemplateMutation.mutate({ id: selectedTemplate.id, ...newTemplateData });
              }}
              disabled={updateTemplateMutation.isPending}
            >
              {updateTemplateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task to Template</DialogTitle>
            <DialogDescription>Add a new task to "{selectedTemplate?.name}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Name *</Label>
              <Input
                value={newTaskData.name}
                onChange={(e) => setNewTaskData({ ...newTaskData, name: e.target.value })}
                placeholder="e.g., Complete intake forms"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTaskData.description}
                onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                placeholder="Optional description..."
              />
            </div>
            <div className="space-y-2">
              <Label>Lifecycle Stage *</Label>
              <Select
                value={newTaskData.lifecycleStageId.toString()}
                onValueChange={(value) => setNewTaskData({ ...newTaskData, lifecycleStageId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {lifecycleStages?.map(stage => (
                    <SelectItem key={stage.id} value={stage.id.toString()}>{stage.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={newTaskData.sortOrder}
                onChange={(e) => setNewTaskData({ ...newTaskData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTaskDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!newTaskData.name || !newTaskData.lifecycleStageId || !selectedTemplate) {
                  toast.error("Please fill in required fields");
                  return;
                }
                createTaskMutation.mutate({ workflowTemplateId: selectedTemplate.id, ...newTaskData });
              }}
              disabled={createTaskMutation.isPending}
            >
              {createTaskMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update the task details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Name *</Label>
              <Input
                value={editTaskData.name}
                onChange={(e) => setEditTaskData({ ...editTaskData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editTaskData.description}
                onChange={(e) => setEditTaskData({ ...editTaskData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Lifecycle Stage *</Label>
              <Select
                value={editTaskData.lifecycleStageId.toString()}
                onValueChange={(value) => setEditTaskData({ ...editTaskData, lifecycleStageId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {lifecycleStages?.map(stage => (
                    <SelectItem key={stage.id} value={stage.id.toString()}>{stage.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={editTaskData.sortOrder}
                onChange={(e) => setEditTaskData({ ...editTaskData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTaskDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!editTaskData.name || !selectedTask) {
                  toast.error("Please enter a task name");
                  return;
                }
                updateTaskMutation.mutate({ id: selectedTask.id, ...editTaskData });
              }}
              disabled={updateTaskMutation.isPending}
            >
              {updateTaskMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subtask Dialog */}
      <Dialog open={isAddSubtaskDialogOpen} onOpenChange={setIsAddSubtaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subtask</DialogTitle>
            <DialogDescription>Add a subtask to "{selectedTask?.name}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subtask Name *</Label>
              <Input
                value={newSubtaskData.name}
                onChange={(e) => setNewSubtaskData({ ...newSubtaskData, name: e.target.value })}
                placeholder="e.g., Send welcome email"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newSubtaskData.description}
                onChange={(e) => setNewSubtaskData({ ...newSubtaskData, description: e.target.value })}
                placeholder="Optional description..."
              />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={newSubtaskData.sortOrder}
                onChange={(e) => setNewSubtaskData({ ...newSubtaskData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSubtaskDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!newSubtaskData.name || !selectedTask) {
                  toast.error("Please enter a subtask name");
                  return;
                }
                createSubtaskMutation.mutate({ workflowTemplateTaskId: selectedTask.id, ...newSubtaskData });
              }}
              disabled={createSubtaskMutation.isPending}
            >
              {createSubtaskMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Subtask
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subtask Dialog */}
      <Dialog open={isEditSubtaskDialogOpen} onOpenChange={setIsEditSubtaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subtask</DialogTitle>
            <DialogDescription>Update the subtask details for task: {selectedTask?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-subtask-name">Subtask Name</Label>
              <Input
                id="edit-subtask-name"
                value={editSubtaskData.name}
                onChange={(e) => setEditSubtaskData({ ...editSubtaskData, name: e.target.value })}
                placeholder="Enter subtask name"
              />
            </div>
            <div>
              <Label htmlFor="edit-subtask-description">Description (optional)</Label>
              <Textarea
                id="edit-subtask-description"
                value={editSubtaskData.description}
                onChange={(e) => setEditSubtaskData({ ...editSubtaskData, description: e.target.value })}
                placeholder="Enter subtask description"
              />
            </div>
            <div>
              <Label htmlFor="edit-subtask-order">Sort Order</Label>
              <Input
                id="edit-subtask-order"
                type="number"
                value={editSubtaskData.sortOrder}
                onChange={(e) => setEditSubtaskData({ ...editSubtaskData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSubtaskDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!editSubtaskData.name || !selectedSubtask) {
                  toast.error("Please enter a subtask name");
                  return;
                }
                updateSubtaskMutation.mutate({ id: selectedSubtask.id, ...editSubtaskData });
              }}
              disabled={updateSubtaskMutation.isPending}
            >
              {updateSubtaskMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// Template Tasks List Component
function TemplateTasksList({
  templateId,
  lifecycleStages,
  expandedTasks,
  onToggleTask,
  onAddSubtask,
  onEditTask,
  onDeleteTask,
  onEditSubtask,
  onDeleteSubtask,
}: {
  templateId: number;
  lifecycleStages: any[];
  expandedTasks: Set<number>;
  onToggleTask: (taskId: number) => void;
  onAddSubtask: (task: any) => void;
  onEditTask: (task: any) => void;
  onDeleteTask: (taskId: number) => void;
  onEditSubtask: (subtask: any, task: any) => void;
  onDeleteSubtask: (subtaskId: number) => void;
}) {
  const { data: tasks } = trpc.workflowTemplate.getTasks.useQuery({ workflowTemplateId: templateId });

  // Group tasks by lifecycle stage
  const tasksByStage = tasks?.reduce((acc, task) => {
    const stageId = task.lifecycleStageId;
    if (!acc[stageId]) {
      acc[stageId] = [];
    }
    acc[stageId].push(task);
    return acc;
  }, {} as Record<number, typeof tasks>) || {};

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
        No tasks defined for this template yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lifecycleStages.map(stage => {
        const stageTasks = tasksByStage[stage.id] || [];
        if (stageTasks.length === 0) return null;

        return (
          <div key={stage.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stage.color || "#6B7280" }}
              />
              <h4 className="font-medium">{stage.name}</h4>
              <Badge variant="secondary" className="text-xs">
                {stageTasks.length} task{stageTasks.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="ml-5 space-y-2">
              {stageTasks.map(task => (
                <TemplateTaskItem
                  key={task.id}
                  task={task}
                  isExpanded={expandedTasks.has(task.id)}
                  onToggle={() => onToggleTask(task.id)}
                  onAddSubtask={() => onAddSubtask(task)}
                  onEditTask={() => onEditTask(task)}
                  onDeleteTask={() => onDeleteTask(task.id)}
                  onEditSubtask={(subtask) => onEditSubtask(subtask, task)}
                  onDeleteSubtask={onDeleteSubtask}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Template Task Item Component
function TemplateTaskItem({
  task,
  isExpanded,
  onToggle,
  onAddSubtask,
  onEditTask,
  onDeleteTask,
  onEditSubtask,
  onDeleteSubtask,
}: {
  task: any;
  isExpanded: boolean;
  onToggle: () => void;
  onAddSubtask: () => void;
  onEditTask: () => void;
  onDeleteTask: () => void;
  onEditSubtask: (subtask: any) => void;
  onDeleteSubtask: (subtaskId: number) => void;
}) {
  const { data: subtasks } = trpc.workflowTemplate.getSubtasks.useQuery({ workflowTemplateTaskId: task.id });

  return (
    <div className="border rounded-lg">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <div className="flex items-center gap-3 p-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Toggle task details">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <div className="flex-1">
            <p className="font-medium">{task.name}</p>
            {task.description && (
              <p className="text-xs text-muted-foreground">{task.description}</p>
            )}
          </div>
          {subtasks && subtasks.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {subtasks.length} subtask{subtasks.length !== 1 ? "s" : ""}
            </Badge>
          )}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEditTask(); }} aria-label="Edit task">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); onDeleteTask(); }} aria-label="Delete task">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 ml-9 space-y-2">
            {subtasks && subtasks.length > 0 && (
              <div className="space-y-1">
                {subtasks.map(subtask => (
                  <div key={subtask.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-slate-50 group">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      {subtask.name}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditSubtask(subtask)} aria-label="Edit subtask">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => onDeleteSubtask(subtask.id)} aria-label="Delete subtask">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={onAddSubtask}>
              <Plus className="h-3 w-3 mr-1" />
              Add Subtask
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Lifecycle Stages Manager Component
function LifecycleStagesManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<any>(null);
  const [newStageData, setNewStageData] = useState({ name: "", description: "", color: "#6B7280", sortOrder: 0 });
  const [editStageData, setEditStageData] = useState({ name: "", description: "", color: "#6B7280", sortOrder: 0 });

  const { data: stages, refetch } = trpc.lifecycleStage.list.useQuery();

  const createMutation = trpc.lifecycleStage.create.useMutation({
    onSuccess: () => {
      toast.success("Lifecycle stage created");
      refetch();
      setIsAddDialogOpen(false);
      setNewStageData({ name: "", description: "", color: "#6B7280", sortOrder: 0 });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.lifecycleStage.update.useMutation({
    onSuccess: () => {
      toast.success("Lifecycle stage updated");
      refetch();
      setIsEditDialogOpen(false);
      setSelectedStage(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.lifecycleStage.delete.useMutation({
    onSuccess: () => {
      toast.success("Lifecycle stage deleted");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const defaultStages = [
    { name: "Intake", color: "#8B5CF6", description: "Initial client intake and assessment" },
    { name: "Consult", color: "#3B82F6", description: "Consultation and protocol planning" },
    { name: "Protocol Build", color: "#10B981", description: "Building the client's protocol" },
    { name: "Billing", color: "#F59E0B", description: "Invoice and payment processing" },
    { name: "Fulfillment", color: "#EF4444", description: "Order preparation and shipping" },
    { name: "Onboarding", color: "#EC4899", description: "Client onboarding and setup" },
    { name: "Active Protocol", color: "#06B6D4", description: "Active program management" },
    { name: "Completion", color: "#84CC16", description: "Program completion and follow-up" },
  ];

  const createDefaultStages = async () => {
    for (let i = 0; i < defaultStages.length; i++) {
      await createMutation.mutateAsync({ ...defaultStages[i], sortOrder: i });
    }
  };

  return (
    <div className="space-y-4">
      {stages && stages.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stage</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stages.map(stage => (
              <TableRow key={stage.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color || "#6B7280" }} />
                    <span className="font-medium">{stage.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{stage.description || "-"}</TableCell>
                <TableCell>{stage.sortOrder}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setSelectedStage(stage);
                        setEditStageData({
                          name: stage.name,
                          description: stage.description || "",
                          color: stage.color || "#6B7280",
                          sortOrder: stage.sortOrder || 0,
                        });
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={() => {
                        if (confirm(`Delete stage "${stage.name}"? This may affect existing templates.`)) {
                          deleteMutation.mutate({ id: stage.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-6">
          <p className="text-muted-foreground mb-4">No lifecycle stages configured</p>
          <Button onClick={createDefaultStages} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Default Stages
          </Button>
        </div>
      )}
      <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Stage
      </Button>

      {/* Add Stage Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Lifecycle Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Stage Name *</Label>
              <Input value={newStageData.name} onChange={(e) => setNewStageData({ ...newStageData, name: e.target.value })} placeholder="e.g., Onboarding" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={newStageData.description} onChange={(e) => setNewStageData({ ...newStageData, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input type="color" value={newStageData.color} onChange={(e) => setNewStageData({ ...newStageData, color: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input type="number" value={newStageData.sortOrder} onChange={(e) => setNewStageData({ ...newStageData, sortOrder: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!newStageData.name) { toast.error("Please enter a stage name"); return; }
                createMutation.mutate(newStageData);
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lifecycle Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Stage Name *</Label>
              <Input value={editStageData.name} onChange={(e) => setEditStageData({ ...editStageData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={editStageData.description} onChange={(e) => setEditStageData({ ...editStageData, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input type="color" value={editStageData.color} onChange={(e) => setEditStageData({ ...editStageData, color: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input type="number" value={editStageData.sortOrder} onChange={(e) => setEditStageData({ ...editStageData, sortOrder: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!editStageData.name || !selectedStage) { toast.error("Please enter a stage name"); return; }
                updateMutation.mutate({ id: selectedStage.id, ...editStageData });
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Team Members Manager Component
function TeamMembersManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMemberData, setNewMemberData] = useState({ name: "", email: "" });

  const { data: members, refetch } = trpc.teamMember.list.useQuery();

  const createMutation = trpc.teamMember.create.useMutation({
    onSuccess: () => {
      toast.success("Team member added");
      refetch();
      setIsAddDialogOpen(false);
      setNewMemberData({ name: "", email: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      {members && members.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(member => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell className="text-muted-foreground">{member.email || "-"}</TableCell>
                <TableCell>
                  <Badge variant={member.isActive ? "default" : "secondary"}>
                    {member.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-center text-muted-foreground py-6">No team members configured</p>
      )}
      <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Team Member
      </Button>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={newMemberData.name} onChange={(e) => setNewMemberData({ ...newMemberData, name: e.target.value })} placeholder="e.g., John Smith" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={newMemberData.email} onChange={(e) => setNewMemberData({ ...newMemberData, email: e.target.value })} placeholder="john@example.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!newMemberData.name) { toast.error("Please enter a name"); return; }
                createMutation.mutate(newMemberData);
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
