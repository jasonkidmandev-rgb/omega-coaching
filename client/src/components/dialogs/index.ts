// Re-export existing well-designed confirm dialogs
export { ConfirmDialog, DeleteConfirmDialog, ArchiveConfirmDialog } from "@/components/ConfirmDialog";

// New shared dialog components
export { default as ConfirmationDialog } from "./ConfirmationDialog";
export type { ConfirmationDialogProps } from "./ConfirmationDialog";

export { default as FormDialog } from "./FormDialog";
export type { FormDialogProps } from "./FormDialog";
