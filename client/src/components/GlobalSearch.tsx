import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Users, 
  FileText, 
  Package, 
  Settings, 
  Layers, 
  Mail, 
  ShoppingCart, 
  ClipboardList,
  Warehouse,
  TrendingUp,
  Shield,
  BarChart3,
  Rocket,
  Handshake,
  Ticket,
  LayoutDashboard,
  Pill,
  ListChecks,
  Command,
  User,
  GraduationCap,
  Loader2,
  Zap,
  StickyNote
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface SearchItem {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  category: "navigation" | "settings" | "action" | "client" | "enrollment";
  keywords: string[];
}

const searchItems: SearchItem[] = [
  // Navigation items
  { id: "dashboard", title: "Dashboard", description: "Overview and stats", path: "/admin", icon: <LayoutDashboard className="h-4 w-4" />, category: "navigation", keywords: ["home", "overview", "stats", "analytics"] },
  { id: "clients", title: "Clients", description: "Manage client protocols", path: "/admin/clients", icon: <Users className="h-4 w-4" />, category: "navigation", keywords: ["protocols", "customers", "users", "people"] },
  { id: "enrollments", title: "Enrollments", description: "Manage coaching enrollments", path: "/admin/enrollments", icon: <GraduationCap className="h-4 w-4" />, category: "navigation", keywords: ["coaching", "transformation", "journey", "pipeline"] },
  { id: "programs", title: "Programs", description: "Manage coaching programs", path: "/admin/programs", icon: <Layers className="h-4 w-4" />, category: "navigation", keywords: ["coaching", "courses", "packages"] },
  { id: "templates", title: "Templates", description: "Protocol templates", path: "/admin/templates", icon: <FileText className="h-4 w-4" />, category: "navigation", keywords: ["presets", "defaults", "blueprints"] },
  { id: "items", title: "Protocol Items", description: "Manage protocol items", path: "/admin/items", icon: <Package className="h-4 w-4" />, category: "navigation", keywords: ["products", "supplements", "peptides"] },
  { id: "inventory", title: "Inventory", description: "Manage inventory levels", path: "/admin/inventory", icon: <Warehouse className="h-4 w-4" />, category: "navigation", keywords: ["stock", "warehouse", "products"] },
  { id: "team", title: "Team", description: "Manage team members", path: "/admin/team", icon: <Shield className="h-4 w-4" />, category: "navigation", keywords: ["users", "admins", "staff", "employees"] },
  { id: "launchpad", title: "Launchpad Settings", description: "Configure launchpad", path: "/admin/launchpad-settings", icon: <Rocket className="h-4 w-4" />, category: "navigation", keywords: ["homepage", "landing", "portal"] },
  { id: "settings", title: "Site Settings", description: "General site settings", path: "/admin/settings", icon: <Settings className="h-4 w-4" />, category: "navigation", keywords: ["configuration", "preferences", "options"] },
  { id: "partners", title: "Affiliate Partners", description: "Manage partners", path: "/admin/affiliate-partners", icon: <Handshake className="h-4 w-4" />, category: "navigation", keywords: ["affiliates", "referrers", "vendors"] },
  { id: "email", title: "Email Branding", description: "Customize email templates", path: "/admin/email-branding", icon: <Mail className="h-4 w-4" />, category: "navigation", keywords: ["templates", "notifications", "logo", "design"] },
  // Store hidden for compliance: { id: "orders", title: "Store Orders", description: "View all orders", path: "/admin/store-orders", icon: <ShoppingCart className="h-4 w-4" />, category: "navigation", keywords: ["purchases", "transactions", "payments", "paypal"] },
  { id: "packing", title: "Packing Slips", description: "Fulfillment management", path: "/admin/packing-slips", icon: <ClipboardList className="h-4 w-4" />, category: "navigation", keywords: ["shipping", "fulfillment", "orders", "delivery"] },
  { id: "morning-briefing", title: "Lisa's Morning Briefing", description: "Daily task queue, deadlines, and new clients", path: "/admin/morning-briefing", icon: <Zap className="h-4 w-4" />, category: "navigation", keywords: ["lisa", "morning", "briefing", "tasks", "queue", "deadlines", "daily"] },
  { id: "conversion-tracking", title: "Conversion Tracking", description: "Prospect-to-client pipeline metrics", path: "/admin/conversion-tracking", icon: <Zap className="h-4 w-4" />, category: "navigation", keywords: ["conversion", "tracking", "pipeline", "funnel", "metrics", "sales", "prospects"] },
  
  // Quick actions
  { id: "new-client", title: "Create New Client", description: "Start a new protocol", path: "/admin/clients/new", icon: <Users className="h-4 w-4" />, category: "action", keywords: ["add", "create", "new", "protocol"] },
  { id: "new-template", title: "Create Template", description: "Create a new template", path: "/admin/templates/new", icon: <FileText className="h-4 w-4" />, category: "action", keywords: ["add", "create", "new", "preset"] },
  { id: "new-item", title: "Add Protocol Item", description: "Add a new item", path: "/admin/items/new", icon: <Package className="h-4 w-4" />, category: "action", keywords: ["add", "create", "new", "product"] },
];

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce the query for API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Search clients from the database
  const { data: clientResults, isLoading: clientsLoading } = trpc.clientProtocol.list.useQuery(
    { filter: 'all' },
    { enabled: open && debouncedQuery.length >= 2 }
  );

  // Search enrollments from the database
  const { data: enrollmentResults, isLoading: enrollmentsLoading } = trpc.transformation.getAllEnrollments.useQuery(
    { limit: 100 },
    { enabled: open && debouncedQuery.length >= 2 }
  );

  const isSearching = (clientsLoading || enrollmentsLoading) && debouncedQuery.length >= 2;

  // Filter static items
  const filteredStaticItems = query.trim() === "" 
    ? searchItems.slice(0, 10)
    : searchItems.filter(item => {
        const searchLower = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.keywords.some(k => k.toLowerCase().includes(searchLower))
        );
      });

  // Build dynamic client results
  const filteredClientItems: SearchItem[] = debouncedQuery.length >= 2 && clientResults
    ? (clientResults as any[])
        .filter((c: any) => {
          const searchLower = debouncedQuery.toLowerCase();
          return (
            c.clientName?.toLowerCase().includes(searchLower) ||
            c.name?.toLowerCase().includes(searchLower) ||
            c.email?.toLowerCase().includes(searchLower)
          );
        })
        .slice(0, 5)
        .map((c: any) => ({
          id: `client-${c.id}`,
          title: c.clientName || c.name || "Unknown",
          description: c.email || "No email",
          path: `/admin/clients/${c.id}`,
          icon: <User className="h-4 w-4" />,
          category: "client" as const,
          keywords: [],
        }))
    : [];

  // Build dynamic enrollment results
  const filteredEnrollmentItems: SearchItem[] = debouncedQuery.length >= 2 && enrollmentResults
    ? (enrollmentResults as any[])
        .filter((e: any) => {
          const searchLower = debouncedQuery.toLowerCase();
          return (
            e.userName?.toLowerCase().includes(searchLower) ||
            e.userEmail?.toLowerCase().includes(searchLower) ||
            e.tier?.toLowerCase().includes(searchLower)
          );
        })
        .slice(0, 5)
        .map((e: any) => ({
          id: `enrollment-${e.id}`,
          title: e.userName || "Unknown",
          description: `${e.tier?.replace(/_/g, " ") || "N/A"} • ${e.status?.replace(/_/g, " ") || "enrolled"}`,
          path: `/admin/enrollments`,
          icon: <GraduationCap className="h-4 w-4" />,
          category: "enrollment" as const,
          keywords: [],
        }))
    : [];

  const allItems = [...filteredStaticItems, ...filteredClientItems, ...filteredEnrollmentItems];

  useEffect(() => {
    if (open) {
      setQuery("");
      setDebouncedQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, clientResults, enrollmentResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && allItems[selectedIndex]) {
      e.preventDefault();
      setLocation(allItems[selectedIndex].path);
      onOpenChange(false);
    }
  };

  const handleSelect = (item: SearchItem) => {
    setLocation(item.path);
    onOpenChange(false);
  };

  const groupedItems = {
    client: allItems.filter(i => i.category === "client"),
    enrollment: allItems.filter(i => i.category === "enrollment"),
    action: allItems.filter(i => i.category === "action"),
    navigation: allItems.filter(i => i.category === "navigation"),
    settings: allItems.filter(i => i.category === "settings"),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search clients, enrollments, pages..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
          />
          {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-2">
            ESC
          </kbd>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto p-2">
          {allItems.length === 0 && !isSearching ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {query.length < 2 ? "Type at least 2 characters to search clients & enrollments" : `No results found for "${query}"`}
            </div>
          ) : (
            <>
              {/* Clients */}
              {groupedItems.client.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Clients
                  </div>
                  {groupedItems.client.map((item) => {
                    const globalIdx = allItems.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors ${
                          globalIdx === selectedIndex
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className={`p-1.5 rounded-md ${globalIdx === selectedIndex ? "bg-primary-foreground/20" : "bg-blue-50 text-blue-600"}`}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{item.title}</div>
                          <div className={`text-xs truncate ${globalIdx === selectedIndex ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {item.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Enrollments */}
              {groupedItems.enrollment.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Enrollments
                  </div>
                  {groupedItems.enrollment.map((item) => {
                    const globalIdx = allItems.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors ${
                          globalIdx === selectedIndex
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className={`p-1.5 rounded-md ${globalIdx === selectedIndex ? "bg-primary-foreground/20" : "bg-amber-50 text-amber-600"}`}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{item.title}</div>
                          <div className={`text-xs truncate ${globalIdx === selectedIndex ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {item.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Quick Actions */}
              {groupedItems.action.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Quick Actions
                  </div>
                  {groupedItems.action.map((item) => {
                    const globalIdx = allItems.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors ${
                          globalIdx === selectedIndex
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className={`p-1.5 rounded-md ${globalIdx === selectedIndex ? "bg-primary-foreground/20" : "bg-muted"}`}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{item.title}</div>
                          <div className={`text-xs truncate ${globalIdx === selectedIndex ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {item.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Pages */}
              {groupedItems.navigation.length > 0 && (
                <div>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Pages
                  </div>
                  {groupedItems.navigation.map((item) => {
                    const globalIdx = allItems.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors ${
                          globalIdx === selectedIndex
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className={`p-1.5 rounded-md ${globalIdx === selectedIndex ? "bg-primary-foreground/20" : "bg-muted"}`}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{item.title}</div>
                          <div className={`text-xs truncate ${globalIdx === selectedIndex ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {item.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="border-t px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">↑↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">↵</kbd>
            <span>Select</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg border transition-colors"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium ml-2">
        <Command className="h-3 w-3" />K
      </kbd>
    </button>
  );
}
