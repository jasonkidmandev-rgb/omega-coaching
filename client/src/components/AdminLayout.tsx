import { useAuth } from "../_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { NotificationBell } from "./NotificationBell";
import { Badge } from "@/components/ui/badge";
import { GlobalSearch, SearchTrigger } from "./GlobalSearch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Users,
  FileText,
  Package,
  Pill,
  Home,
  Shield,
  Bell,
  Layers,
  BarChart3,
  Rocket,
  Warehouse,
  TrendingUp,
  Settings,
  Handshake,
  ChevronRight,
  Store,
  Percent,
  Mail,
  ShoppingCart,
  ClipboardList,
  Sparkles,
  FolderKanban,
  FolderOpen,
  History,
  Activity,
  DollarSign,
  FileSignature,
  ClipboardCheck,
  Eye,
  HeartPulse,
  Key,
  Video,
  Gift,
  CreditCard,
  Megaphone,
  BookOpen,
  Wrench,
  Webhook,
  Search,
  MessageSquare,
  Filter,
  Calendar,
  Inbox,
  Globe,
  FilePen,
  Zap,
  Sun,
  LayoutGrid,
  CalendarClock,
  UserCog,
  ListTodo,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { QuickActionsButton } from "./QuickActionsButton";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";

// Role-based menu item permissions
type RolePermission = 'admin' | 'manager' | 'viewer' | 'finance';

// Menu item type
interface MenuItem {
  icon: any;
  label: string;
  path: string;
  roles?: RolePermission[];
  badge?: 'transformation' | 'inbox';
}

// Menu category type with collapsible sub-items
interface MenuCategory {
  icon: any;
  label: string;
  roles?: RolePermission[];
  items: MenuItem[];
  defaultOpen?: boolean;
}

// Pinned top-level items (always visible, not inside collapsible categories)
const pinnedItems: MenuItem[] = [
  { icon: ListTodo, label: "My Action Items", path: "/admin/my-action-items", roles: ['admin', 'manager', 'viewer'] },
  { icon: BarChart3, label: "KPI Dashboard", path: "/admin/kpi-dashboard", roles: ['admin', 'manager'] },
  { icon: Inbox, label: "Message Inbox", path: "/admin/inbox", roles: ['admin', 'manager', 'viewer'], badge: 'inbox' },
];

// Organized menu structure with parent categories
const menuCategories: MenuCategory[] = [
  // 1. Clients (daily client work, ordered by frequency)
  {
    icon: Users,
    label: "Clients",
    roles: ['admin', 'manager', 'viewer'],
    defaultOpen: true,
    items: [
      { icon: Users, label: "Clients", path: "/admin/clients", roles: ['admin', 'manager', 'viewer'] },
      { icon: ClipboardCheck, label: "Client Protocols", path: "/admin/client-protocols", roles: ['admin', 'manager', 'viewer'] },
      { icon: FolderKanban, label: "Client Projects", path: "/admin/projects", roles: ['admin', 'manager', 'viewer'] },
      { icon: HeartPulse, label: "Client Corner", path: "/admin/client-corner", roles: ['admin', 'manager', 'viewer'] },
      { icon: CalendarClock, label: "Upcoming Appointments", path: "/admin/upcoming-appointments", roles: ['admin', 'manager'] },
    ],
  },
  // 2. Coaching (enrollment & pipeline flow)
  {
    icon: HeartPulse,
    label: "Coaching",
    roles: ['admin', 'manager'],
    items: [
      { icon: Users, label: "Enrollments", path: "/admin/enrollments", roles: ['admin', 'manager'] },
      { icon: Filter, label: "Lead Pipeline", path: "/admin/prospects", roles: ['admin'] },
      { icon: LayoutGrid, label: "Shannon's Kanban", path: "/admin/shannon-kanban", roles: ['admin'] },
      { icon: ClipboardList, label: "Coaching Sessions", path: "/admin/coaching-sessions", roles: ['admin', 'manager'] },
      { icon: Calendar, label: "Booking Calendar", path: "/admin/booking-calendar", roles: ['admin', 'manager'] },
      { icon: ClipboardCheck, label: "Manage Check-Ins", path: "/admin/checkins", roles: ['admin', 'manager'] },
      { icon: DollarSign, label: "Coaching Payments", path: "/admin/transformation-payments", roles: ['admin', 'finance'], badge: 'transformation' },
    ],
  },
  // 3. Fulfillment & Operations (Packing Slips, Custom Orders, Inventory — always visible)
  {
    icon: Package,
    label: "Fulfillment & Operations",
    roles: ['admin', 'manager', 'finance'],
    items: [
      { icon: ClipboardList, label: "Slip Management", path: "/admin/packing-slips", roles: ['admin', 'manager'] },
      { icon: FilePen, label: "Custom Orders", path: "/admin/custom-orders", roles: ['admin', 'manager', 'finance'] },
      { icon: Package, label: "Fulfillment Queue", path: "/admin/fulfillment-queue", roles: ['admin', 'manager'] },
      { icon: AlertTriangle, label: "Backorders", path: "/admin/backorders", roles: ['admin', 'manager'] },
      { icon: Warehouse, label: "Inventory", path: "/admin/inventory", roles: ['admin', 'manager'] },
    ],
  },
  // Store — hidden for compliance (backend preserved)
  // To re-enable: remove the `hidden: true` flag below
  {
    icon: ShoppingCart,
    label: "Store",
    roles: ['admin', 'manager', 'finance'],
    hidden: true,
    items: [
      { icon: ShoppingCart, label: "Store Orders", path: "/admin/store-orders", roles: ['admin', 'manager', 'finance'] },
      { icon: FileSignature, label: "Store Waivers", path: "/admin/store-waivers", roles: ['admin', 'manager'] },
    ],
  },
  // 4. Payments & Finance
  {
    icon: CreditCard,
    label: "Payments & Finance",
    roles: ['admin', 'finance'],
    items: [
      { icon: History, label: "Payment History", path: "/admin/payment-history", roles: ['admin', 'finance'] },
      { icon: Activity, label: "Job Health", path: "/admin/job-health", roles: ['admin'] },
    ],
  },
  // 5. Marketing & Outreach
  {
    icon: Megaphone,
    label: "Marketing & Outreach",
    roles: ['admin', 'manager', 'finance'],
    items: [
      // Store hidden for compliance: { icon: Store, label: "Store Promos", path: "/admin/store-promos", roles: ['admin', 'manager', 'finance'] },
      { icon: Handshake, label: "Affiliate Partners", path: "/admin/affiliate-partners", roles: ['admin', 'manager'] },
      { icon: Globe, label: "Web Traffic", path: "/admin/web-traffic", roles: ['admin'] },
    ],
  },
  // 6. Daily Tools & Automation
  {
    icon: Zap,
    label: "Daily Tools",
    roles: ['admin'],
    items: [
      { icon: Sun, label: "Lisa's Morning Briefing", path: "/admin/morning-briefing", roles: ['admin'] },
      { icon: TrendingUp, label: "Conversion Tracking", path: "/admin/conversion-tracking", roles: ['admin'] },
    ],
  },
  // 7. Team & Settings (consolidated config/admin/setup)
  {
    icon: Wrench,
    label: "Team & Settings",
    roles: ['admin', 'manager'],
    items: [
      // Team & Access
      { icon: Shield, label: "Team", path: "/admin/team", roles: ['admin', 'manager'] },
      { icon: Settings, label: "Site Settings", path: "/admin/settings", roles: ['admin'] },
      { icon: CalendarClock, label: "Calendly Settings", path: "/admin/calendly-settings", roles: ['admin'] },
      { icon: Webhook, label: "Integrations", path: "/admin/integrations", roles: ['admin'] },
      // Protocol Setup
      { icon: FileText, label: "Templates", path: "/admin/templates", roles: ['admin', 'manager', 'viewer'] },
      { icon: Package, label: "Protocol Items", path: "/admin/items", roles: ['admin', 'manager', 'viewer'] },
      { icon: FolderOpen, label: "Categories", path: "/admin/categories", roles: ['admin', 'manager'] },
      { icon: Layers, label: "Programs", path: "/admin/programs", roles: ['admin', 'manager', 'viewer'] },
      // Coaching Setup
      { icon: Percent, label: "Coaching Promos", path: "/admin/promo-codes", roles: ['admin', 'manager', 'finance'] },
      { icon: Video, label: "Masterclass Videos", path: "/admin/masterclass-videos", roles: ['admin'] },
      { icon: FileText, label: "Forms Editor", path: "/admin/forms-editor", roles: ['admin'] },
      // Content & Resources
      { icon: Rocket, label: "Launchpad Settings", path: "/admin/launchpad-settings", roles: ['admin'] },
      { icon: FileText, label: "Peptide Cheat Sheet", path: "/admin/peptide-cheat-sheet", roles: ['admin', 'manager'] },
      // Email & Notifications
      { icon: Mail, label: "Email Branding", path: "/admin/email-branding", roles: ['admin'] },
      { icon: Eye, label: "Email Preview", path: "/admin/email-preview", roles: ['admin'] },
      { icon: Activity, label: "Email Engagement", path: "/admin/email-engagement", roles: ['admin'] },
      { icon: Bell, label: "Notification Analysis", path: "/admin/notification-analysis", roles: ['admin'] },
      { icon: History, label: "Notification History", path: "/admin/notification-history", roles: ['admin'] },
      { icon: Bell, label: "Team Email Preferences", path: "/admin/notification-preferences", roles: ['admin', 'manager'] },
      // Data & Admin Tools
      { icon: UserCog, label: "Contact Admin", path: "/admin/contact-admin", roles: ['admin'] },
      { icon: ShieldCheck, label: "Data Integrity Audit", path: "/admin/data-integrity", roles: ['admin'] },
      { icon: History, label: "Audit Logs", path: "/admin/audit-logs", roles: ['admin'] },
      { icon: ListTodo, label: "Workflow Templates", path: "/admin/workflow-templates", roles: ['admin', 'manager'] },
      { icon: Sparkles, label: "Onboarding Wizard", path: "/admin/onboarding", roles: ['admin'] },
    ],
  },
];

// Helper to check if user has access to a menu item
const hasMenuAccess = (item: MenuItem | MenuCategory, userRole: string): boolean => {
  if (!item.roles) return true;
  return item.roles.includes(userRole as RolePermission);
};

// Helper to check if any item in a category is active
const isCategoryActive = (category: MenuCategory, location: string): boolean => {
  return category.items.some(item => location === item.path);
};

// Helper to get all paths for active menu detection
const getAllPaths = (): string[] => {
  const paths: string[] = ['/admin'];
  pinnedItems.forEach(item => paths.push(item.path));
  menuCategories.forEach(cat => {
    cat.items.forEach(item => paths.push(item.path));
  });
  return paths;
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const [rememberMe, setRememberMe] = useState(true);
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full bg-white rounded-2xl shadow-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Pill className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center">
              Health Coach Protocol Manager
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Sign in to access your admin dashboard and manage client protocols.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = "/login?returnTo=/admin";
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in to Continue
          </Button>
          <div className="text-center">
            <a 
              href="/forgot-password" 
              className="text-sm text-muted-foreground hover:text-primary underline"
            >
              Forgot your password?
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has a staff role
  const staffRoles = ['admin', 'manager', 'viewer', 'finance'];
  if (!staffRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full bg-white rounded-2xl shadow-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center">
              Access Denied
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              You don't have permission to access the admin dashboard. Please contact your administrator if you believe this is an error.
            </p>
          </div>
          <div className="flex gap-3 w-full">
            <Button
              onClick={() => {
                window.location.href = '/';
              }}
              variant="outline"
              className="flex-1"
            >
              Go to Launchpad
            </Button>
            <Button
              onClick={() => {
                window.location.href = '/account';
              }}
              className="flex-1"
            >
              My Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <AdminLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </AdminLayoutContent>
    </SidebarProvider>
  );
}

type AdminLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function AdminLayoutContent({
  children,
  setSidebarWidth,
}: AdminLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Query pending counts for badges
  const { data: pendingTransformationCount } = trpc.transformation.getPendingPaymentsCount.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: inboxUnreadData } = trpc.inbox.totalUnread.useQuery(undefined, {
    refetchInterval: 30000,
  });
  
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  // Sidebar search state
  const [sidebarSearch, setSidebarSearch] = useState("");
  
  // Filter menu items based on search
  const filteredCategories = useMemo(() => {
    if (!sidebarSearch.trim()) return menuCategories;
    
    const searchLower = sidebarSearch.toLowerCase();
    return menuCategories.map(cat => ({
      ...cat,
      items: cat.items.filter(item => 
        item.label.toLowerCase().includes(searchLower) ||
        cat.label.toLowerCase().includes(searchLower)
      )
    })).filter(cat => cat.items.length > 0);
  }, [sidebarSearch]);

  // Filter pinned items based on search
  const filteredPinnedItems = useMemo(() => {
    if (!sidebarSearch.trim()) return pinnedItems;
    const searchLower = sidebarSearch.toLowerCase();
    return pinnedItems.filter(item => item.label.toLowerCase().includes(searchLower));
  }, [sidebarSearch]);
  
  // Track which categories are open
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => {
    // Default open the category that contains the current path
    const open = new Set<string>();
    menuCategories.forEach(cat => {
      if (cat.defaultOpen || isCategoryActive(cat, location)) {
        open.add(cat.label);
      }
    });
    return open;
  });

  const toggleCategory = (label: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  // Find active menu item for header display
  const findActiveMenuItem = (): { label: string } | undefined => {
    if (location === '/admin') return { label: 'Dashboard' };
    // Check pinned items first
    const pinnedMatch = pinnedItems.find(i => location === i.path);
    if (pinnedMatch) return pinnedMatch;
    for (const cat of menuCategories) {
      const item = cat.items.find(i => location === i.path);
      if (item) return item;
    }
    return undefined;
  };
  const activeMenuItem = findActiveMenuItem();

  // Get badge count for an item
  const getBadgeCount = (badge?: string): number => {
    if (badge === 'transformation') return pendingTransformationCount || 0;
    if (badge === 'inbox') return inboxUnreadData?.count || 0;
    return 0;
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n" && !e.shiftKey) {
        e.preventDefault();
        setLocation("/admin/clients/new");
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "N") {
        e.preventDefault();
        setLocation("/admin/templates/new");
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "g") {
        e.preventDefault();
        setLocation("/admin/clients");
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, setLocation]);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0 bg-[#1e3a5f]"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center bg-[#1e3a5f]">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-[#2d4a6f] rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-white/70" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate text-white">
                    Protocol Manager
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 bg-[#1e3a5f] overflow-y-auto">
            {/* Sidebar Search */}
            {!isCollapsed && (
              <div className="px-3 py-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    type="text"
                    placeholder="Search menu..."
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    className="pl-8 h-9 bg-[#2d4a6f] border-white/10 text-white placeholder:text-white/40 focus:border-amber-500 focus:ring-amber-500/20"
                  />
                </div>
              </div>
            )}
            <SidebarMenu className="px-2 py-1">
              {/* Home Link */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setLocation("/launchpad")}
                  tooltip="Home"
                  className="h-10 transition-all font-normal text-white/70 hover:text-white hover:bg-[#2d4a6f]"
                >
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Dashboard (top-level) */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location === "/admin"}
                  onClick={() => setLocation("/admin")}
                  tooltip="Dashboard"
                  className={`h-10 transition-all font-normal ${
                    location === "/admin"
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : "text-white/70 hover:text-white hover:bg-[#2d4a6f]"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Pinned Items (Message Inbox, Client 360) */}
              {filteredPinnedItems
                .filter(item => hasMenuAccess(item, user?.role || 'user'))
                .map((item) => {
                  const isActive = location === item.path;
                  const badgeCount = item.badge ? getBadgeCount(item.badge) : 0;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className={`h-10 transition-all font-normal ${
                          isActive
                            ? "bg-amber-500 text-white hover:bg-amber-600"
                            : "text-white/70 hover:text-white hover:bg-[#2d4a6f]"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="flex items-center gap-2">
                          {item.label}
                          {badgeCount > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs font-semibold animate-pulse">
                              {badgeCount}
                            </Badge>
                          )}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

              {/* Separator between pinned items and categories */}
              <div className="my-1.5 mx-2 border-t border-white/10" />

              {/* Collapsible Categories */}
              {filteredCategories
                .filter(cat => hasMenuAccess(cat, user?.role || 'user') && !(cat as any).hidden)
                .map((category) => {
                  const isOpen = openCategories.has(category.label);
                  const isCatActive = isCategoryActive(category, location);
                  const accessibleItems = category.items.filter(item => hasMenuAccess(item, user?.role || 'user'));
                  
                  if (accessibleItems.length === 0) return null;

                  // Check if any item in category has a badge
                  const hasBadge = accessibleItems.some(item => item.badge && getBadgeCount(item.badge) > 0);

                  return (
                    <Collapsible
                      key={category.label}
                      open={isOpen}
                      onOpenChange={() => toggleCategory(category.label)}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={category.label}
                            className={`h-10 transition-all font-normal ${
                              isCatActive && !isOpen
                                ? "bg-amber-500/30 text-amber-300 hover:bg-amber-500/40"
                                : "text-white/70 hover:text-white hover:bg-[#2d4a6f]"
                            }`}
                          >
                            <category.icon className="h-4 w-4" />
                            <span className="flex items-center gap-2">
                              {category.label}
                              {hasBadge && !isOpen && (
                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                              )}
                            </span>
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="border-white/10 ml-2">
                            {accessibleItems.map((item) => {
                              const isActive = location === item.path;
                              const badgeCount = item.badge ? getBadgeCount(item.badge) : 0;
                              
                              return (
                                <SidebarMenuSubItem key={item.path}>
                                  <SidebarMenuSubButton
                                    onClick={() => setLocation(item.path)}
                                    className={`cursor-pointer ${
                                      isActive
                                        ? "bg-amber-500 text-white"
                                        : "text-white/60 hover:text-white hover:bg-[#2d4a6f]"
                                    }`}
                                  >
                                    <item.icon className="h-4 w-4" />
                                    <span className="flex items-center gap-2">
                                      {item.label}
                                      {badgeCount > 0 && (
                                        <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs font-semibold animate-pulse">
                                          {badgeCount}
                                        </Badge>
                                      )}
                                    </span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 bg-[#1e3a5f]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-[#2d4a6f] transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                  <Avatar className="h-9 w-9 border border-white/20 shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-amber-500 text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-white">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-white/60 truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-slate-50">
        <div className="flex border-b h-12 md:h-14 items-center justify-between bg-white px-3 md:px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-2">
            {isMobile && <SidebarTrigger className="h-8 w-8 md:h-9 md:w-9 rounded-lg bg-background" />}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex flex-col gap-0.5 md:gap-1">
                <span className="tracking-tight text-foreground font-medium text-sm md:text-base">
                  {activeMenuItem?.label ?? "Menu"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SearchTrigger onClick={() => setSearchOpen(true)} />
            <NotificationBell />
          </div>
        </div>
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
        <main className="flex-1 p-3 md:p-6">{children}</main>
        <QuickActionsButton />
        <KeyboardShortcutsHelp />
      </SidebarInset>
    </>
  );
}
