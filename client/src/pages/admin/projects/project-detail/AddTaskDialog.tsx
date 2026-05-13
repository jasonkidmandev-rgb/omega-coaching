import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { LifecycleStage } from "./types";

type NewTaskData = {
  name: string;
  description: string;
  lifecycleStageId: number;
};

type AddTaskDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newTaskData: NewTaskData;
  setNewTaskData: (data: NewTaskData) => void;
  lifecycleStages: LifecycleStage[] | undefined;
  onSubmit: () => void;
  isPending: boolean;
};

export default function AddTaskDialog({
  isOpen,
  onOpenChange,
  newTaskData,
  setNewTaskData,
  lifecycleStages,
  onSubmit,
  isPending,
}: AddTaskDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>
            Create a new task for this project
          </DialogDescription>
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
                  <SelectItem key={stage.id} value={stage.id.toString()}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
