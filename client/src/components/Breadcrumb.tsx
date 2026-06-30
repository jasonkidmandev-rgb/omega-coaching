import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "wouter";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// Route to label mapping
const routeLabels: Record<string, string> = {
  admin: "Admin",
  clients: "Clients",
  templates: "Templates",
  items: "Protocol Items",
  // supplements removed - consolidated into Protocol Items
  inventory: "Inventory",
  team: "Team",
  "launchpad-settings": "Launchpad Settings",
  settings: "Site Settings",
  "affiliate-partners": "Affiliate Partners",
  "email-branding": "Email Branding",
  "store-orders": "Store Orders",
  "packing-slips": "Slip Management",
  backorders: "Backorders",
  onboarding: "Onboarding Wizard",
  projects: "Client Projects",
  reports: "Reports",
  payments: "Payments",
  programs: "Programs",
  new: "New",
  edit: "Edit",
};

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  const [location] = useLocation();

  // Auto-generate breadcrumbs from URL if items not provided
  const breadcrumbs: BreadcrumbItem[] = items || (() => {
    const parts = location.split("/").filter(Boolean);
    const result: BreadcrumbItem[] = [];
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath += `/${part}`;
      
      // Skip numeric IDs but keep them in the path
      if (/^\d+$/.test(part)) {
        continue;
      }

      const label = routeLabels[part] || part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " ");
      
      // Don't add link for the last item
      if (i === parts.length - 1) {
        result.push({ label });
      } else {
        result.push({ label, path: currentPath });
      }
    }

    return result;
  })();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className={`flex items-center text-sm text-muted-foreground ${className}`}>
      <Link href="/admin" className="hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-2" />
          {item.path ? (
            <Link
              href={item.path}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
