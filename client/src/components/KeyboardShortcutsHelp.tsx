import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ["⌘", "K"], description: "Open global search", category: "Navigation" },
  { keys: ["⌘", "N"], description: "Create new client", category: "Navigation" },
  { keys: ["⌘", "⇧", "N"], description: "Create new template", category: "Navigation" },
  { keys: ["⌘", "⇧", "P"], description: "Go to protocol items", category: "Navigation" },
  { keys: ["Esc"], description: "Close dialogs / Cancel", category: "Navigation" },
  
  // Editing
  { keys: ["⌘", "S"], description: "Save changes", category: "Editing" },
  { keys: ["⌘", "Z"], description: "Undo", category: "Editing" },
  { keys: ["⌘", "⇧", "Z"], description: "Redo", category: "Editing" },
  
  // Selection
  { keys: ["⌘", "A"], description: "Select all items", category: "Selection" },
  { keys: ["⇧", "Click"], description: "Select range", category: "Selection" },
  { keys: ["⌘", "Click"], description: "Toggle selection", category: "Selection" },
];

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show shortcuts help with Cmd+/ or Ctrl+/
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘/</kbd> anytime to show this help
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          {categories.map((category) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                {category}
              </h4>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <kbd
                            key={keyIndex}
                            className="px-2 py-1 bg-muted rounded text-xs font-mono min-w-[24px] text-center"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
