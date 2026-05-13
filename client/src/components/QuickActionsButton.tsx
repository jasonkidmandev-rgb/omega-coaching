import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Users,
  FileText,
  Package,
  Mail,
  Zap,
  LayoutDashboard,
  Layers,
} from "lucide-react";

export function QuickActionsButton() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  const actions = [
    {
      label: "New Client",
      icon: Users,
      path: "/admin/clients/new",
      description: "Create a new client protocol",
    },
    {
      label: "New Template",
      icon: FileText,
      path: "/admin/templates/new",
      description: "Create a new template",
    },
    {
      label: "New Protocol Item",
      icon: Package,
      path: "/admin/items/new",
      description: "Add a new protocol item",
    },
    {
      label: "New Program",
      icon: Layers,
      path: "/admin/programs/new",
      description: "Create a new coaching program",
    },
  ];

  const quickNav = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { label: "Clients", icon: Users, path: "/admin/clients" },
    { label: "Templates", icon: FileText, path: "/admin/templates" },
  ];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50 bg-primary hover:bg-primary/90"
        >
          <Zap className="h-6 w-6" />
          <span className="sr-only">Quick Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-64 mb-2">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Quick Create
        </div>
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.path}
            onClick={() => {
              setLocation(action.path);
              setOpen(false);
            }}
            className="cursor-pointer"
          >
            <action.icon className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span>{action.label}</span>
              <span className="text-xs text-muted-foreground">
                {action.description}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Quick Navigate
        </div>
        {quickNav.map((nav) => (
          <DropdownMenuItem
            key={nav.path}
            onClick={() => {
              setLocation(nav.path);
              setOpen(false);
            }}
            className="cursor-pointer"
          >
            <nav.icon className="h-4 w-4 mr-2" />
            <span>{nav.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
