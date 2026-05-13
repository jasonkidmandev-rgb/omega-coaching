export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export type Task = {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: Date | string | null;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  subtasks?: Subtask[];
};

export type Subtask = {
  id: number;
  taskId: number;
  title: string;
  status: TaskStatus;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type ProjectNote = {
  id: number;
  projectId: number;
  content: string;
  isPinned: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type TrackingInfo = {
  id: number;
  projectId: number;
  carrier: string;
  trackingNumber: string;
  description: string | null;
  createdAt: Date | string;
};

export type ProjectFile = {
  id: number;
  projectId: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  createdAt: Date | string;
};

export type ActivityLog = {
  id: number;
  projectId: number;
  action: string;
  details: string | null;
  createdAt: Date | string;
};

export type FormData = {
  clientName: string;
  clientEmail: string;
  status: ProjectStatus;
  priority: Priority;
  currentLifecycleStageId?: number;
  assignedTeamMemberId?: number;
  clientProtocolId?: number;
  workflowTemplateId?: number;
};

export type LifecycleStage = {
  id: number;
  name: string;
  sortOrder: number;
};

export type TeamMember = {
  id: number;
  name: string;
};

export type ClientProtocol = {
  id: number;
  clientName: string;
  deletedAt: Date | string | null;
  archivedAt: Date | string | null;
};

export type WorkflowTemplate = {
  id: number;
  name: string;
  durationDays: number;
};

export const statusConfig = {
  pending: { label: "Pending", color: "bg-slate-100 text-slate-600" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-600" },
  completed: { label: "Completed", color: "bg-green-100 text-green-600" },
  blocked: { label: "Blocked", color: "bg-red-100 text-red-600" },
  skipped: { label: "Skipped", color: "bg-slate-100 text-slate-400" },
};

export const projectStatusConfig = {
  active: { label: "Active", color: "bg-green-100 text-green-800" },
  on_hold: { label: "On Hold", color: "bg-amber-100 text-amber-800" },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
};
