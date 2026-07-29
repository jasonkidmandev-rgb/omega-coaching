import { Suspense, lazy } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AgeDisclaimer, useAgeVerification } from "./components/AgeDisclaimer";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { ScrollToTop } from "./components/ScrollToTop";
import { ScrollRestoration } from "./components/ScrollRestoration";
import { usePageTracker } from "./hooks/usePageTracker";
import { lazyWithRetry } from "./lib/lazyWithRetry";

// Eagerly loaded pages (critical path)
import Home from "./pages/Home";
import Cover from "./pages/Cover";
import LaunchpadHub from "./pages/LaunchpadHub";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import AgeRestricted from "./pages/AgeRestricted";

// The admin shell. Hoisted out of the individual pages and mounted above the admin
// router (see AdminRoutes below) so it survives navigation instead of being rebuilt on
// every click. Lazy so the public/marketing bundle does not carry the whole sidebar.
const AdminLayout = lazyWithRetry(() => import("./components/AdminLayout"));

// Lazy loaded admin pages (code splitting)
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/Dashboard"));
const AdminClients = lazyWithRetry(() => import("./pages/admin/Clients"));
const AdminPeople = lazyWithRetry(() => import("./pages/admin/People"));
const AdminClientProtocols = lazyWithRetry(() => import("./pages/admin/ClientProtocols"));
const AdminClientEdit = lazyWithRetry(() => import("./pages/admin/ClientEdit"));
const AdminTemplates = lazyWithRetry(() => import("./pages/admin/Templates"));
const AdminTemplateEdit = lazyWithRetry(() => import("./pages/admin/TemplateEdit"));
const AdminItems = lazyWithRetry(() => import("./pages/admin/Items"));
// Supplements page removed - consolidated into Protocol Items
const AdminTeam = lazyWithRetry(() => import("./pages/admin/Team"));
const AdminPrograms = lazyWithRetry(() => import("./pages/admin/Programs"));
const AdminInventory = lazyWithRetry(() => import("./pages/admin/Inventory"));
const AdminSettingsHub = lazyWithRetry(() => import("./pages/admin/SettingsHub"));
const AdminAffiliatePartners = lazyWithRetry(() => import("./pages/admin/AffiliatePartners"));
const AdminOrderHistory = lazyWithRetry(() => import("./pages/admin/OrderHistory"));
const AdminPackingSlips = lazyWithRetry(() => import("./pages/admin/PackingSlips"));
const AdminPackingSlipDetail = lazyWithRetry(() => import("./pages/admin/PackingSlipDetail"));
const AdminProjectList = lazyWithRetry(() => import("./pages/admin/projects/ProjectList"));
const AdminProjectDetail = lazyWithRetry(() => import("./pages/admin/projects/ProjectDetail"));
const AdminWorkflowTemplates = lazyWithRetry(() => import("./pages/admin/projects/WorkflowTemplates"));
const AdminJobHealth = lazyWithRetry(() => import("./pages/admin/JobHealth"));
const AdminStoreOrders = lazyWithRetry(() => import("./pages/admin/StoreOrders"));
const AdminCustomOrders = lazyWithRetry(() => import("./pages/admin/CustomOrders"));
const AdminStoreWaivers = lazyWithRetry(() => import("./pages/admin/StoreWaivers"));
const AdminPeptideCheatSheet = lazyWithRetry(() => import("./pages/admin/PeptideCheatSheetAdmin"));
const AdminCategoryManagement = lazyWithRetry(() => import("./pages/admin/CategoryManagement"));
const AdminPaymentHistory = lazyWithRetry(() => import("./pages/admin/PaymentHistory"));
const AdminCheckinManagement = lazyWithRetry(() => import("./pages/admin/CheckinManagement"));
const AdminCheckinReview = lazyWithRetry(() => import("./pages/admin/CheckinReview"));
const AdminProtocolPresets = lazyWithRetry(() => import("./pages/admin/ProtocolPresets"));
// Access codes removed
const AdminPromoCodes = lazyWithRetry(() => import("./pages/admin/PromoCodes"));
const AdminPromoCodeAnalytics = lazyWithRetry(() => import("./pages/admin/PromoCodeAnalytics"));
const AdminStorePromos = lazyWithRetry(() => import("./pages/admin/StorePromos"));
// Referral program removed
const AdminMasterclassVideos = lazyWithRetry(() => import("./pages/admin/MasterclassVideos"));
const AdminEnrollments = lazyWithRetry(() => import("./pages/admin/Enrollments"));
const AdminTransformationPayments = lazyWithRetry(() => import("./pages/admin/TransformationPayments"));
const AdminIntakeFormEditor = lazyWithRetry(() => import("./pages/admin/IntakeFormEditor"));
const AdminFormsEditor = lazyWithRetry(() => import("./pages/admin/FormsEditor"));
const AdminProspects = lazyWithRetry(() => import("./pages/admin/Prospects"));
const AdminWebTrafficAnalytics = lazyWithRetry(() => import("./pages/admin/WebTrafficAnalytics"));
const AdminCoachingSessions = lazyWithRetry(() => import("./pages/admin/CoachingSessions"));
const AdminBookingCalendar = lazyWithRetry(() => import("./pages/admin/BookingCalendar"));
const AdminInbox = lazyWithRetry(() => import("./pages/admin/Inbox"));
const AdminChat = lazyWithRetry(() => import("./pages/admin/Chat"));
const AdminMorningBriefing = lazyWithRetry(() => import("./pages/admin/MorningBriefing"));
const AdminConversionTracking = lazyWithRetry(() => import("./pages/admin/ConversionTracking"));
const AdminAcquisitionDashboard = lazyWithRetry(() => import("./pages/admin/AcquisitionDashboard"));
const AdminUpcomingAppointments = lazyWithRetry(() => import("./pages/admin/UpcomingAppointments"));
const TransformationEntry = lazyWithRetry(() => import("./pages/TransformationEntry"));
// TransformationJourney removed - page deprecated, route redirects to /transformation
const TransformationVerify = lazyWithRetry(() => import("./pages/TransformationVerify"));
const TierSelection = lazyWithRetry(() => import("./pages/TierSelection"));
const Masterclass = lazyWithRetry(() => import("./pages/Masterclass"));
const TransformationCheckout = lazyWithRetry(() => import("./pages/TransformationCheckout"));
const ProtocolBuildEntry = lazyWithRetry(() => import("./pages/ProtocolBuildEntry"));
const ProtocolBuildJourney = lazyWithRetry(() => import("./pages/ProtocolBuildJourney"));
const ClientPaymentPortal = lazyWithRetry(() => import("./pages/ClientPaymentPortal"));
const CommunityChoice = lazyWithRetry(() => import("./pages/CommunityChoice"));
const IntakeLanding = lazyWithRetry(() => import("./pages/IntakeLanding"));

// Lazy loaded client pages
const ClientProtocol = lazyWithRetry(() => import("./pages/client/Protocol"));
const ClientDashboard = lazyWithRetry(() => import("./pages/client/Dashboard"));
const CompareProtocols = lazyWithRetry(() => import("./pages/client/CompareProtocols"));
const ClientCheckin = lazyWithRetry(() => import("./pages/client/Checkin"));
const ClientCheckinLatest = lazyWithRetry(() => import("./pages/client/CheckinLatest"));
const ClientDocuments = lazyWithRetry(() => import("./pages/client/Documents"));
const ClientInventory = lazyWithRetry(() => import("./pages/client/Inventory"));
const ClientMetrics = lazyWithRetry(() => import("./pages/client/Metrics"));
// Client referrals removed
const ClientSessions = lazyWithRetry(() => import("./pages/client/Sessions"));
const Account = lazyWithRetry(() => import("./pages/Account"));
const Order = lazyWithRetry(() => import("./pages/Order"));
const OrderHistory = lazyWithRetry(() => import("./pages/OrderHistory"));
const Partners = lazyWithRetry(() => import("./pages/Partners"));
const CoachingPrograms = lazyWithRetry(() => import("./pages/CoachingPrograms"));
const PeptideCheatSheet = lazyWithRetry(() => import("./pages/PeptideCheatSheet"));
const Promotions = lazyWithRetry(() => import("./pages/Promotions"));
const WaiverRenewal = lazyWithRetry(() => import("./pages/WaiverRenewal"));
// StoreWaiver component is in @/components/StoreWaiver, used by Order page
const PaymentSuccess = lazyWithRetry(() => import("./pages/PaymentSuccess"));
const PaymentFailure = lazyWithRetry(() => import("./pages/PaymentFailure"));
// VenmoPaymentConfirmation removed - migrating to Stripe
const CustomOrderPaymentCancelled = lazyWithRetry(() => import("./pages/CustomOrderPaymentCancelled"));
const OrderConfirmation = lazyWithRetry(() => import("./pages/OrderConfirmation"));
const InstallApp = lazyWithRetry(() => import("./pages/InstallApp"));
const SetPassword = lazyWithRetry(() => import("./pages/SetPassword"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const AcceptInvite = lazyWithRetry(() => import("./pages/AcceptInvite"));
const MyActionItems = lazyWithRetry(() => import("./pages/admin/MyActionItems"));
const FulfillmentQueue = lazyWithRetry(() => import("./pages/admin/FulfillmentQueue"));
const AdminBackorders = lazyWithRetry(() => import("./pages/admin/Backorders"));
const KPIDashboard = lazyWithRetry(() => import("./pages/admin/KPIDashboard"));

// Loading spinner component for Suspense fallback
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

// Fallback for a page chunk loading *inside* the admin shell. Deliberately NOT
// LoadingSpinner: that one is `min-h-screen bg-slate-900`, and rendering it here would
// just move the full-screen dark flash rather than remove it. This occupies the content
// area only, so the sidebar and header stay visible and in place.
function PageSkeleton() {
  return (
    <div className="p-6 space-y-4" aria-busy="true" aria-label="Loading page">
      <div className="h-8 w-64 rounded-md bg-muted animate-pulse" />
      <div className="h-4 w-96 rounded bg-muted animate-pulse" />
      <div className="grid gap-4 pt-4">
        <div className="h-32 rounded-lg bg-muted animate-pulse" />
        <div className="h-32 rounded-lg bg-muted animate-pulse" />
      </div>
    </div>
  );
}

function PageTracker() {
  usePageTracker();
  return null;
}

/**
 * The admin application.
 *
 * AdminLayout is mounted HERE, above the admin router, instead of inside each of the
 * 64 admin pages. Two things follow from that, and both were bugs before:
 *
 *  1. The shell survives navigation. Previously the layout was a child of the page, so
 *     every route swap destroyed and rebuilt it - resetting the sidebar scroll position
 *     and its expanded categories, and re-firing its badge queries.
 *
 *  2. The Suspense boundary for page chunks now sits INSIDE the chrome. Previously the
 *     only boundary was App-level and its fallback was full-screen, so loading any lazy
 *     page blanked the entire UI to a dark spinner - indistinguishable from a full page
 *     reload. Now the sidebar and header stay put and only the content area changes.
 *
 * See docs/risks/2026-07-29-navigation-rerender-trace.md for the full trace.
 */
function AdminRoutes() {
  return (
    // Outer boundary: covers the one-time load of the shell chunk itself.
    <Suspense fallback={<LoadingSpinner />}>
      <AdminLayout>
        {/* Inner boundary: per-page chunks, scoped to the content area. */}
        <Suspense fallback={<PageSkeleton />}>
          <Switch>
          <Route path={"/admin"} component={AdminDashboard} />
          <Route path={"/admin/dashboard"} component={AdminDashboard} />
          <Route path={"/admin/clients/new"} component={AdminClientEdit} />
          <Route path={"/admin/clients/:id"} component={AdminClientEdit} />
          <Route path={"/admin/clients"} component={AdminClients} />
          <Route path={"/admin/people"} component={AdminPeople} />
          <Route path={"/admin/client-protocols"} component={AdminClientProtocols} />
          <Route path={"/admin/templates/new"} component={AdminTemplateEdit} />
          <Route path={"/admin/templates/:id"} component={AdminTemplateEdit} />
          <Route path={"/admin/templates"} component={AdminTemplates} />
          <Route path={"/admin/items"} component={AdminItems} />
          {/* Supplements route removed - use /admin/items with filter tabs */}
          <Route path={"/admin/team"} component={AdminTeam} />
          <Route path={"/admin/programs"} component={AdminPrograms} />
          <Route path={"/admin/launchpad-settings"}><Redirect to={"/admin/settings/launchpad"} /></Route>
          <Route path={"/admin/inventory"} component={AdminInventory} />
          <Route path={"/admin/settings/:tab"} component={AdminSettingsHub} />
          <Route path={"/admin/settings"} component={AdminSettingsHub} />
          <Route path={"/admin/notification-report"}><Redirect to={"/admin/settings/notification-report"} /></Route>
          <Route path={"/admin/email-templates"}><Redirect to={"/admin/settings/email-templates"} /></Route>
          <Route path={"/admin/email-report-settings"}><Redirect to={"/admin/settings/email-reports"} /></Route>
          <Route path={"/admin/notification-settings"}><Redirect to={"/admin/settings/notifications"} /></Route>
          <Route path={"/admin/payment-history"} component={AdminPaymentHistory} />
          <Route path={"/admin/job-health"} component={AdminJobHealth} />
          <Route path={"/admin/affiliate-partners"} component={AdminAffiliatePartners} />
          <Route path={"/admin/email-branding"}><Redirect to={"/admin/settings/email-branding"} /></Route>
          <Route path={"/admin/email-preview"}><Redirect to={"/admin/settings/email-preview"} /></Route>
          <Route path={"/admin/order-history"} component={AdminOrderHistory} />
          <Route path={"/admin/store-waivers"} component={AdminStoreWaivers} />
          <Route path={"/admin/packing-slips/:id"} component={AdminPackingSlipDetail} />
          <Route path={"/admin/packing-slips"} component={AdminPackingSlips} />
          <Route path={"/admin/peptide-cheat-sheet"} component={AdminPeptideCheatSheet} />
          <Route path={"/admin/categories"} component={AdminCategoryManagement} />
          {/* Client Projects (Back-Office) */}
          <Route path={"/admin/projects/new"} component={AdminProjectDetail} />
          <Route path={"/admin/projects/:id"} component={AdminProjectDetail} />
          <Route path={"/admin/projects"} component={AdminProjectList} />
          <Route path={"/admin/workflow-templates"} component={AdminWorkflowTemplates} />
          <Route path={"/admin/store-orders/:id"} component={AdminStoreOrders} />
          <Route path={"/admin/store-orders"} component={AdminStoreOrders} />
          <Route path={"/admin/custom-orders/:id"} component={AdminCustomOrders} />
          <Route path={"/admin/custom-orders"} component={AdminCustomOrders} />
          <Route path={"/admin/checkins"} component={AdminCheckinManagement} />
          <Route path={"/admin/checkin-management"}>{() => { window.location.replace('/admin/checkins'); return null; }}</Route>
          <Route path={"/admin/web-traffic"} component={AdminWebTrafficAnalytics} />
          <Route path={"/admin/clients/:clientId/checkins/:checkinId"} component={AdminCheckinReview} />
          <Route path={"/admin/notification-templates"}><Redirect to={"/admin/settings/notification-templates"} /></Route>
          <Route path={"/admin/protocol-presets"} component={AdminProtocolPresets} />
          <Route path={"/admin/integrations"}><Redirect to={"/admin/settings/integrations"} /></Route>
          <Route path={"/admin/promo-codes"} component={AdminPromoCodes} />
          <Route path={"/admin/promo-code-analytics"} component={AdminPromoCodeAnalytics} />
          <Route path={"/admin/store-promos"} component={AdminStorePromos} />

          <Route path={"/admin/masterclass-videos"} component={AdminMasterclassVideos} />
          <Route path={"/admin/enrollments"} component={AdminEnrollments} />
          <Route path={"/admin/transformation-payments"} component={AdminTransformationPayments} />
          <Route path={"/admin/intake-form-editor"} component={AdminIntakeFormEditor} />
          <Route path={"/admin/forms-editor"} component={AdminFormsEditor} />
          <Route path={"/admin/notification-analysis"}><Redirect to={"/admin/settings/notification-analysis"} /></Route>
          <Route path={"/admin/notification-history"}><Redirect to={"/admin/settings/notification-history"} /></Route>
          <Route path={"/admin/prospects/:id"} component={AdminProspects} />
          <Route path={"/admin/prospects"} component={AdminProspects} />
          <Route path={"/admin/coaching-sessions"} component={AdminCoachingSessions} />
          <Route path={"/admin/booking-calendar"} component={AdminBookingCalendar} />
          <Route path={"/admin/inbox"} component={AdminInbox} />
          <Route path={"/admin/chat/:id"} component={AdminChat} />
          <Route path={"/admin/morning-briefing"} component={AdminMorningBriefing} />
          <Route path={"/admin/conversion-tracking"} component={AdminConversionTracking} />
          {/* Retired: the standalone board now lives as the "Kanban" tab inside Lead Pipeline. */}
          <Route path={"/admin/shannon-kanban"}>{() => { window.location.replace('/admin/prospects?tab=kanban'); return null; }}</Route>
          <Route path={"/admin/acquisition"} component={AdminAcquisitionDashboard} />
          <Route path={"/admin/upcoming-appointments"} component={AdminUpcomingAppointments} />
          <Route path={"/admin/calendly-settings"}><Redirect to={"/admin/settings/calendly"} /></Route>
          <Route path={"/admin/my-action-items"} component={MyActionItems} />
          <Route path={"/admin/fulfillment-queue"} component={FulfillmentQueue} />
          <Route path={"/admin/backorders"} component={AdminBackorders} />
          <Route path={"/admin/notification-preferences"}><Redirect to={"/admin/settings/notification-preferences"} /></Route>
          <Route path={"/admin/kpi-dashboard"} component={KPIDashboard} />
          {/* Unmatched /admin/* — without this the content area renders blank, since
              this Switch no longer falls through to the app-level NotFound route. */}
          <Route component={NotFound} />
          </Switch>
        </Suspense>
      </AdminLayout>
    </Suspense>
  );
}

function Router() {
  const [location] = useLocation();

  // Route the whole /admin/* tree through one persistent element. Branching on the
  // location rather than using two <Route> entries is deliberate: a Switch swapping
  // between a "/admin" route and a "/admin/:rest*" route would unmount AdminRoutes on
  // that transition and remount the shell - the exact bug this is fixing.
  if (location === "/admin" || location.startsWith("/admin/")) {
    return <AdminRoutes />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Switch>
        <Route path={"/"} component={Cover} />
        <Route path={"/launchpad"} component={LaunchpadHub} />
        <Route path={"/home"} component={Cover} />
        {/* Legal pages - accessible without age verification */}
        <Route path={"/terms"} component={Terms} />
        <Route path={"/privacy"} component={Privacy} />
        <Route path={"/age-restricted"} component={AgeRestricted} />
        <Route path={"/login"} component={Login} />
        <Route path={"/signin"} component={Login} />
        <Route path={"/set-password"} component={SetPassword} />
        <Route path={"/forgot-password"} component={ForgotPassword} />
        <Route path={"/accept-invite"} component={AcceptInvite} />
        <Route path={"/partners"} component={Partners} />
        <Route path={"/community"} component={CommunityChoice} />
        <Route path={"/intake"} component={IntakeLanding} />
        <Route path={"/masterclass"}>{() => { window.location.replace("/transformation"); return null; }}</Route>
        <Route path={"/transformation/checkout"} component={TransformationCheckout} />
        <Route path={"/transformation/masterclass"} component={Masterclass} />
        <Route path={"/transformation/select-tier"}>{() => { window.location.replace("/transformation#coaching-plans"); return null; }}</Route>
        <Route path={"/transformation/journey"}>{() => { window.location.replace("/transformation"); return null; }}</Route>
        <Route path={"/transformation/verify"} component={TransformationVerify} />
        <Route path={"/transformation"} component={TransformationEntry} />
        <Route path={"/protocol-build"} component={ProtocolBuildEntry} />
        <Route path={"/protocol-build/journey"} component={ProtocolBuildJourney} />
        {/* Client protocol view (public, no login required) */}
        <Route path={"/protocol/:token"} component={ClientProtocol} />
        {/* Client payment portal (public, access via token) */}
        <Route path={"/payments/:token"} component={ClientPaymentPortal} />
        {/* Client dashboard (requires login) */}
        <Route path={"/dashboard"} component={ClientDashboard} />
        <Route path={"/compare-protocols"} component={CompareProtocols} />
        {/* Client corner pages */}
        <Route path={"/checkin/latest"} component={ClientCheckinLatest} />
        <Route path={"/checkin/:id"} component={ClientCheckin} />
        <Route path={"/documents"} component={ClientDocuments} />
        <Route path={"/inventory"} component={ClientInventory} />
        <Route path={"/metrics"} component={ClientMetrics} />

        {/* Sessions page */}
        <Route path={"/sessions"} component={ClientSessions} />
        <Route path={"/client/sessions"} component={ClientSessions} />
        {/* Account page */}
        <Route path={"/account"} component={Account} />
        {/* Store redirect - goes to main page */}
        <Route path={"/store"}>{() => { window.location.replace("/"); return null; }}</Route>
        {/* Order page */}
        <Route path={"/order"} component={Order} />
        <Route path={"/order-confirmation"} component={OrderConfirmation} />
        <Route path={"/order-history"} component={OrderHistory} />
        <Route path={"/coaching-programs"}>{() => { window.location.replace("/transformation"); return null; }}</Route>
        <Route path={"/peptide-cheat-sheet"} component={PeptideCheatSheet} />
        <Route path={"/promotions"} component={Promotions} />
        <Route path={"/offers"} component={Promotions} />
        <Route path={"/deals"} component={Promotions} />
        {/* Waiver pages */}
        {/* Waiver is handled inline in Order page via StoreWaiver component */}
        <Route path={"/waiver/renew/:token"} component={WaiverRenewal} />
        {/* Payment pages */}
        <Route path={"/payment/success"} component={PaymentSuccess} />
        <Route path={"/payment-success"}>{() => { window.location.replace("/payment/success" + window.location.search); return null; }}</Route>
        <Route path={"/payment/failure"} component={PaymentFailure} />
        {/* Venmo confirmation route removed - migrating to Stripe */}

        {/* Custom order payment pages */}
        {/* Stripe cancel_url emits /custom-order/payment-cancelled/<id>; the route below
            used to be /custom-order/:id/payment-cancelled, which never matched, so every
            cancelled custom-order payment landed on the 404 page. Old shape kept as an
            alias in case a live Stripe session still carries it. */}
        <Route path={"/custom-order/payment-cancelled/:id"} component={CustomOrderPaymentCancelled} />
        <Route path={"/custom-order/:id/payment-cancelled"} component={CustomOrderPaymentCancelled} />
        {/* PWA Install Instructions */}
        <Route path={"/install"} component={InstallApp} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AgeVerificationWrapper({ children }: { children: React.ReactNode }) {
  const { isVerified, isLoading, markVerified } = useAgeVerification();

  // Show nothing while loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <>
      {!isVerified && <AgeDisclaimer onAccept={markVerified} />}
      {children}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider>
          <AgeVerificationWrapper>
            <ScrollRestoration />
            <PageTracker />
            <Router />
            <ScrollToTop />
            <PWAInstallPrompt />
          </AgeVerificationWrapper>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
