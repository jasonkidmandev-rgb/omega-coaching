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
import LaunchpadHub from "./pages/LaunchpadHub";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import AgeRestricted from "./pages/AgeRestricted";

// Lazy loaded admin pages (code splitting)
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/Dashboard"));
const AdminClients = lazyWithRetry(() => import("./pages/admin/Clients"));
const AdminClientProtocols = lazyWithRetry(() => import("./pages/admin/ClientProtocols"));
const AdminClientEdit = lazyWithRetry(() => import("./pages/admin/ClientEdit"));
const AdminTemplates = lazyWithRetry(() => import("./pages/admin/Templates"));
const AdminTemplateEdit = lazyWithRetry(() => import("./pages/admin/TemplateEdit"));
const AdminItems = lazyWithRetry(() => import("./pages/admin/Items"));
// Supplements page removed - consolidated into Protocol Items
const AdminTeam = lazyWithRetry(() => import("./pages/admin/Team"));
const AdminAuditLogs = lazyWithRetry(() => import("./pages/admin/AuditLogs"));
const AdminPrograms = lazyWithRetry(() => import("./pages/admin/Programs"));
const AdminLaunchpadSettings = lazyWithRetry(() => import("./pages/admin/LaunchpadSettings"));
const AdminInventory = lazyWithRetry(() => import("./pages/admin/Inventory"));
const AdminSettings = lazyWithRetry(() => import("./pages/admin/Settings"));
const AdminAffiliatePartners = lazyWithRetry(() => import("./pages/admin/AffiliatePartners"));
const AdminEmailBranding = lazyWithRetry(() => import("./pages/admin/EmailBranding"));
const AdminEmailPreview = lazyWithRetry(() => import("./pages/admin/EmailPreview"));
const AdminOrderHistory = lazyWithRetry(() => import("./pages/admin/OrderHistory"));
const AdminPackingSlips = lazyWithRetry(() => import("./pages/admin/PackingSlips"));
const AdminPackingSlipDetail = lazyWithRetry(() => import("./pages/admin/PackingSlipDetail"));
const AdminOnboardingManager = lazyWithRetry(() => import("./pages/admin/OnboardingManager"));
const AdminProjectList = lazyWithRetry(() => import("./pages/admin/projects/ProjectList"));
const AdminProjectDetail = lazyWithRetry(() => import("./pages/admin/projects/ProjectDetail"));
const AdminWorkflowTemplates = lazyWithRetry(() => import("./pages/admin/projects/WorkflowTemplates"));
const AdminPayments = lazyWithRetry(() => import("./pages/admin/Payments"));
const AdminStoreOrders = lazyWithRetry(() => import("./pages/admin/StoreOrders"));
const AdminCustomOrders = lazyWithRetry(() => import("./pages/admin/CustomOrders"));
const AdminStoreWaivers = lazyWithRetry(() => import("./pages/admin/StoreWaivers"));
const AdminPeptideCheatSheet = lazyWithRetry(() => import("./pages/admin/PeptideCheatSheetAdmin"));
const AdminCategoryManagement = lazyWithRetry(() => import("./pages/admin/CategoryManagement"));
const AdminNotificationReport = lazyWithRetry(() => import("./pages/admin/NotificationReport"));
const AdminEmailTemplatePreview = lazyWithRetry(() => import("./pages/admin/EmailTemplatePreview"));
const AdminNotificationSettings = lazyWithRetry(() => import("./pages/admin/NotificationSettings"));
const AdminPaymentHistory = lazyWithRetry(() => import("./pages/admin/PaymentHistory"));
const AdminClientCornerDashboard = lazyWithRetry(() => import("./pages/admin/ClientCornerDashboard"));
const AdminCheckinManagement = lazyWithRetry(() => import("./pages/admin/CheckinManagement"));
const AdminCheckinReview = lazyWithRetry(() => import("./pages/admin/CheckinReview"));
const AdminNotificationTemplates = lazyWithRetry(() => import("./pages/admin/NotificationTemplates"));
const AdminProtocolPresets = lazyWithRetry(() => import("./pages/admin/ProtocolPresets"));
const AdminEmailReportSettings = lazyWithRetry(() => import("./pages/admin/EmailReportSettings"));
const AdminEmailEngagement = lazyWithRetry(() => import("./pages/admin/EmailEngagement"));
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
const AdminNotificationAnalysis = lazyWithRetry(() => import("./pages/admin/NotificationAnalysis"));
const AdminNotificationHistory = lazyWithRetry(() => import("./pages/admin/NotificationHistory"));
const AdminProspects = lazyWithRetry(() => import("./pages/admin/Prospects"));
const AdminWebTrafficAnalytics = lazyWithRetry(() => import("./pages/admin/WebTrafficAnalytics"));
const AdminCoachingSessions = lazyWithRetry(() => import("./pages/admin/CoachingSessions"));
const AdminBookingCalendar = lazyWithRetry(() => import("./pages/admin/BookingCalendar"));
const AdminInbox = lazyWithRetry(() => import("./pages/admin/Inbox"));
const AdminChat = lazyWithRetry(() => import("./pages/admin/Chat"));
const AdminMorningBriefing = lazyWithRetry(() => import("./pages/admin/MorningBriefing"));
const AdminConversionTracking = lazyWithRetry(() => import("./pages/admin/ConversionTracking"));
const AdminShannonKanban = lazyWithRetry(() => import("./pages/admin/ShannonKanban"));
const AdminUpcomingAppointments = lazyWithRetry(() => import("./pages/admin/UpcomingAppointments"));
const AdminCalendlySettings = lazyWithRetry(() => import("./pages/admin/CalendlySettings"));
const AdminContactAdmin = lazyWithRetry(() => import("./pages/admin/ContactAdmin"));
const AdminDataIntegrityAudit = lazyWithRetry(() => import("./pages/admin/DataIntegrityAudit"));
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
const CustomOrderPaymentSuccess = lazyWithRetry(() => import("./pages/CustomOrderPaymentSuccess"));
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
const NotificationPreferences = lazyWithRetry(() => import("./pages/admin/NotificationPreferences"));
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

function PageTracker() {
  usePageTracker();
  return null;
}

function Router() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/launchpad"} component={LaunchpadHub} />
        <Route path={"/home"} component={Home} />
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
        {/* Admin routes */}
        <Route path={"/admin"} component={AdminDashboard} />
        <Route path={"/admin/dashboard"} component={AdminDashboard} />
        <Route path={"/admin/clients/new"} component={AdminClientEdit} />
        <Route path={"/admin/clients/:id"} component={AdminClientEdit} />
        <Route path={"/admin/clients"} component={AdminClients} />
        <Route path={"/admin/client-protocols"} component={AdminClientProtocols} />
        <Route path={"/admin/templates/new"} component={AdminTemplateEdit} />
        <Route path={"/admin/templates/:id"} component={AdminTemplateEdit} />
        <Route path={"/admin/templates"} component={AdminTemplates} />
        <Route path={"/admin/items"} component={AdminItems} />
        {/* Supplements route removed - use /admin/items with filter tabs */}
        <Route path={"/admin/team"} component={AdminTeam} />
        <Route path={"/admin/audit-logs"} component={AdminAuditLogs} />
        <Route path={"/admin/programs"} component={AdminPrograms} />
        <Route path={"/admin/launchpad-settings"} component={AdminLaunchpadSettings} />
        <Route path={"/admin/inventory"} component={AdminInventory} />
        <Route path={"/admin/settings"} component={AdminSettings} />
        <Route path={"/admin/notification-report"} component={AdminNotificationReport} />
        <Route path={"/admin/email-templates"} component={AdminEmailTemplatePreview} />
        <Route path={"/admin/email-report-settings"} component={AdminEmailReportSettings} />
        <Route path={"/admin/email-engagement"} component={AdminEmailEngagement} />
        <Route path={"/admin/notification-settings"} component={AdminNotificationSettings} />
        <Route path={"/admin/payment-history"} component={AdminPaymentHistory} />
        <Route path={"/admin/affiliate-partners"} component={AdminAffiliatePartners} />
        <Route path={"/admin/email-branding"} component={AdminEmailBranding} />
        <Route path={"/admin/email-preview"} component={AdminEmailPreview} />
        <Route path={"/admin/order-history"} component={AdminOrderHistory} />
        <Route path={"/admin/store-waivers"} component={AdminStoreWaivers} />
        <Route path={"/admin/packing-slips/:id"} component={AdminPackingSlipDetail} />
        <Route path={"/admin/packing-slips"} component={AdminPackingSlips} />
        <Route path={"/admin/onboarding"} component={AdminOnboardingManager} />
        <Route path={"/admin/peptide-cheat-sheet"} component={AdminPeptideCheatSheet} />
        <Route path={"/admin/categories"} component={AdminCategoryManagement} />
        {/* Client Projects (Back-Office) */}
        <Route path={"/admin/projects/new"} component={AdminProjectDetail} />
        <Route path={"/admin/projects/:id"} component={AdminProjectDetail} />
        <Route path={"/admin/projects"} component={AdminProjectList} />
        <Route path={"/admin/workflow-templates"} component={AdminWorkflowTemplates} />
        <Route path={"/admin/payments"} component={AdminPayments} />
        <Route path={"/admin/store-orders"} component={AdminStoreOrders} />
        <Route path={"/admin/custom-orders/:id"} component={AdminCustomOrders} />
        <Route path={"/admin/custom-orders"} component={AdminCustomOrders} />
        {/* Client Corner */}
        <Route path={"/admin/client-corner"} component={AdminClientCornerDashboard} />
        <Route path={"/admin/checkins"} component={AdminCheckinManagement} />
        <Route path={"/admin/checkin-management"}>{() => { window.location.replace('/admin/checkins'); return null; }}</Route>
        <Route path={"/admin/web-traffic"} component={AdminWebTrafficAnalytics} />
        <Route path={"/admin/clients/:clientId/checkins/:checkinId"} component={AdminCheckinReview} />
        <Route path={"/admin/notification-templates"} component={AdminNotificationTemplates} />
        <Route path={"/admin/protocol-presets"} component={AdminProtocolPresets} />
        <Route path={"/admin/promo-codes"} component={AdminPromoCodes} />
        <Route path={"/admin/promo-code-analytics"} component={AdminPromoCodeAnalytics} />
        <Route path={"/admin/store-promos"} component={AdminStorePromos} />

        <Route path={"/admin/masterclass-videos"} component={AdminMasterclassVideos} />
        <Route path={"/admin/enrollments"} component={AdminEnrollments} />
        <Route path={"/admin/transformation-payments"} component={AdminTransformationPayments} />
        <Route path={"/admin/intake-form-editor"} component={AdminIntakeFormEditor} />
        <Route path={"/admin/forms-editor"} component={AdminFormsEditor} />
        <Route path={"/admin/notification-analysis"} component={AdminNotificationAnalysis} />
        <Route path={"/admin/notification-history"} component={AdminNotificationHistory} />
        <Route path={"/admin/prospects/:id"} component={AdminProspects} />
        <Route path={"/admin/prospects"} component={AdminProspects} />
        <Route path={"/admin/coaching-sessions"} component={AdminCoachingSessions} />
        <Route path={"/admin/booking-calendar"} component={AdminBookingCalendar} />
        <Route path={"/admin/inbox"} component={AdminInbox} />
        <Route path={"/admin/chat/:id"} component={AdminChat} />
        <Route path={"/admin/morning-briefing"} component={AdminMorningBriefing} />
        <Route path={"/admin/conversion-tracking"} component={AdminConversionTracking} />
        <Route path={"/admin/shannon-kanban"} component={AdminShannonKanban} />
        <Route path={"/admin/upcoming-appointments"} component={AdminUpcomingAppointments} />
        <Route path={"/admin/calendly-settings"} component={AdminCalendlySettings} />
        <Route path={"/admin/contact-admin"} component={AdminContactAdmin} />
        <Route path={"/admin/data-integrity"} component={AdminDataIntegrityAudit} />
        <Route path={"/admin/my-action-items"} component={MyActionItems} />
        <Route path={"/admin/fulfillment-queue"} component={FulfillmentQueue} />
        <Route path={"/admin/backorders"} component={AdminBackorders} />
        <Route path={"/admin/notification-preferences"} component={NotificationPreferences} />
        <Route path={"/admin/kpi-dashboard"} component={KPIDashboard} />
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
        <Route path={"/custom-order/:id/payment-success"} component={CustomOrderPaymentSuccess} />
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
