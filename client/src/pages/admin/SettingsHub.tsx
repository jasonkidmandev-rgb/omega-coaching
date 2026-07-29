import { Suspense } from "react";
import { useLocation, useParams } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings as SettingsIcon } from "lucide-react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { useAuth } from "../../_core/hooks/useAuth";

/**
 * One Settings page with tabs, replacing 13 separate admin settings routes.
 *
 * Deliberately a *container*, not a rewrite: each tab renders the existing page component
 * untouched. Those pages keep their own headings and their own data fetching, so nothing
 * about their behaviour changes and there is no migration risk beyond the routing. Tidying
 * their internals (duplicate headings, differing page padding) is a separate pass.
 *
 * The old routes still work — App.tsx redirects each one to its tab here, client-side, so
 * bookmarks and any links we haven't found survive. Deep links work too:
 * `/admin/settings/notifications` opens that tab directly, and switching tabs updates the
 * URL, so a tab is shareable and the browser Back button steps between tabs.
 *
 * `Templates` (protocol templates) is intentionally NOT here despite being on the M1 list:
 * it has `/new` and `/:id` sub-routes, so it's a CRUD area rather than a settings panel and
 * folding it in would mean nesting a router inside a tab. Flagged in current.md.
 */

const SiteSettings = lazyWithRetry(() => import("./Settings"));
const NotificationSettings = lazyWithRetry(() => import("./NotificationSettings"));
const NotificationTemplates = lazyWithRetry(() => import("./NotificationTemplates"));
const NotificationPreferences = lazyWithRetry(() => import("./NotificationPreferences"));
const NotificationReport = lazyWithRetry(() => import("./NotificationReport"));
const NotificationAnalysis = lazyWithRetry(() => import("./NotificationAnalysis"));
const NotificationHistory = lazyWithRetry(() => import("./NotificationHistory"));
const EmailBranding = lazyWithRetry(() => import("./EmailBranding"));
const EmailTemplatePreview = lazyWithRetry(() => import("./EmailTemplatePreview"));
const EmailReportSettings = lazyWithRetry(() => import("./EmailReportSettings"));
const EmailPreview = lazyWithRetry(() => import("./EmailPreview"));
const IntegrationSettings = lazyWithRetry(() => import("./IntegrationSettings"));
const CalendlySettings = lazyWithRetry(() => import("./CalendlySettings"));
const LaunchpadSettings = lazyWithRetry(() => import("./LaunchpadSettings"));

type TabDef = {
  /** URL segment — /admin/settings/<slug>. Keep stable; these get bookmarked. */
  slug: string;
  label: string;
  group: string;
  Component: React.ComponentType;
  /** The route this replaced, kept so the redirects in App.tsx stay traceable. */
  legacyPath: string;
  /**
   * Who sees the tab. Mirrors the `roles` the sidebar used to carry per link — without
   * this, collapsing 9 sidebar entries into one page would show a manager the admin-only
   * panels the sidebar previously hid from them. Defaults to admin-only.
   */
  roles?: string[];
};

export const SETTINGS_TABS: TabDef[] = [
  { slug: "site", label: "Site", group: "General", Component: SiteSettings, legacyPath: "/admin/settings" },
  { slug: "integrations", label: "Integrations", group: "General", Component: IntegrationSettings, legacyPath: "/admin/integrations" },
  { slug: "calendly", label: "Calendly", group: "General", Component: CalendlySettings, legacyPath: "/admin/calendly-settings" },
  { slug: "launchpad", label: "Launchpad", group: "General", Component: LaunchpadSettings, legacyPath: "/admin/launchpad-settings" },

  { slug: "notifications", label: "Notifications", group: "Notifications", Component: NotificationSettings, legacyPath: "/admin/notification-settings" },
  { slug: "notification-templates", label: "Templates", group: "Notifications", Component: NotificationTemplates, legacyPath: "/admin/notification-templates" },
  { slug: "notification-preferences", label: "My Preferences", group: "Notifications", Component: NotificationPreferences, legacyPath: "/admin/notification-preferences", roles: ["admin", "manager"] },
  { slug: "notification-report", label: "Report", group: "Notifications", Component: NotificationReport, legacyPath: "/admin/notification-report" },
  { slug: "notification-analysis", label: "Analysis", group: "Notifications", Component: NotificationAnalysis, legacyPath: "/admin/notification-analysis" },
  { slug: "notification-history", label: "History", group: "Notifications", Component: NotificationHistory, legacyPath: "/admin/notification-history" },

  { slug: "email-branding", label: "Branding", group: "Email", Component: EmailBranding, legacyPath: "/admin/email-branding" },
  { slug: "email-templates", label: "Templates", group: "Email", Component: EmailTemplatePreview, legacyPath: "/admin/email-templates" },
  { slug: "email-reports", label: "Reports", group: "Email", Component: EmailReportSettings, legacyPath: "/admin/email-report-settings" },
  { slug: "email-preview", label: "Preview", group: "Email", Component: EmailPreview, legacyPath: "/admin/email-preview" },
];

const DEFAULT_TAB = "site";
const GROUP_ORDER = ["General", "Notifications", "Email"];

function TabFallback() {
  return (
    <div className="space-y-4 py-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default function SettingsHub() {
  const params = useParams<{ tab?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const role = user?.role;
  const tabs = SETTINGS_TABS.filter((t) => (t.roles ?? ["admin"]).includes(role ?? ""));

  const requested = params.tab;
  // An unknown slug — or one this role can't see — falls back to the first tab they CAN
  // see, rather than rendering an empty shell. A stale bookmark should land somewhere
  // useful, and a manager following an admin's link shouldn't get a blank page.
  const active = tabs.some((t) => t.slug === requested)
    ? requested!
    : (tabs.some((t) => t.slug === DEFAULT_TAB) ? DEFAULT_TAB : tabs[0]?.slug);

  if (!active) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have access to any settings.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-orange-500/20 rounded-xl">
          <SettingsIcon className="h-6 w-6 text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Site configuration, notifications and email.
          </p>
        </div>
      </div>

      <Tabs
        value={active}
        // replace: true — switching tabs shouldn't stack history entries, so Back leaves
        // Settings rather than walking every tab the user glanced at.
        onValueChange={(slug) => setLocation(`/admin/settings/${slug}`, { replace: true })}
        className="space-y-6"
      >
        <TabsList className="w-full flex flex-wrap justify-start h-auto gap-1 bg-transparent p-0 border-b rounded-none">
          {GROUP_ORDER.map((group) => {
            const groupTabs = tabs.filter((t) => t.group === group);
            if (groupTabs.length === 0) return null;
            return (
              <div key={group} className="flex items-center gap-1 mr-3 mb-1">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 select-none">
                  {group}
                </span>
                {groupTabs.map((t) => (
                  <TabsTrigger
                    key={t.slug}
                    value={t.slug}
                    className="min-h-[40px] px-2.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500/10 transition-colors"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </div>
            );
          })}
        </TabsList>

        {tabs.map((t) => (
          <TabsContent key={t.slug} value={t.slug} className="mt-0">
            {/* Mounted only while selected, so opening Settings loads one panel's data,
                not all fourteen. */}
            {active === t.slug && (
              <Suspense fallback={<TabFallback />}>
                <t.Component />
              </Suspense>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
