import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Bell, Mail, Clock, Users, CheckCircle, AlertTriangle, 
  ArrowLeft, FileText, Zap, Settings, ExternalLink
} from "lucide-react";
import { Link } from "wouter";

// Comprehensive notification system documentation
const emailNotifications = [
  {
    name: "New Client Welcome Email",
    trigger: "Admin creates new client protocol",
    recipient: "Client",
    settingKey: "notification_new_client_welcome",
    location: "server/routers.ts - clientProtocol.create",
    description: "Sends welcome email with protocol link and launchpad access when admin creates a new client",
    status: "active"
  },
  {
    name: "Protocol Link Email",
    trigger: "Admin sends protocol link",
    recipient: "Client",
    settingKey: "notification_protocol_link",
    location: "server/emailService.ts - sendProtocolLink",
    description: "Sends protocol access link to client email",
    status: "active"
  },
  {
    name: "Protocol Approval Notification",
    trigger: "Client approves protocol",
    recipient: "Admin",
    settingKey: "notification_protocol_approved",
    location: "server/routers.ts - clientProtocol.approve",
    description: "Notifies admin when client approves their protocol",
    status: "active"
  },
  {
    name: "Protocol Viewed Notification",
    trigger: "Client views protocol",
    recipient: "Admin",
    settingKey: "notification_protocol_viewed",
    location: "server/routers.ts",
    description: "Notifies admin when client opens/views their protocol",
    status: "active"
  },
  {
    name: "Order Confirmation Email",
    trigger: "Store order placed",
    recipient: "Client",
    settingKey: "notification_order_confirmation",
    location: "server/emailService.ts - sendOrderConfirmationEmail",
    description: "Sends order details and confirmation to customer",
    status: "active"
  },
  {
    name: "Shipping Notification",
    trigger: "Order shipped",
    recipient: "Client",
    settingKey: "notification_shipping",
    location: "server/emailService.ts - sendShippingNotification",
    description: "Notifies customer when order is shipped with tracking info",
    status: "active"
  },
  {
    name: "Payment Received Notification",
    trigger: "Payment completed",
    recipient: "Admin",
    settingKey: "notification_payment_received",
    location: "server/payment/router.ts",
    description: "Notifies admin of successful payment",
    status: "active"
  },
  {
    name: "Payment Failed Notification",
    trigger: "Payment fails",
    recipient: "Admin",
    settingKey: "notification_payment_failed",
    location: "server/payment/router.ts",
    description: "Alerts admin when payment fails",
    status: "active"
  },
  {
    name: "Payment Refunded Notification",
    trigger: "Refund processed",
    recipient: "Admin",
    settingKey: "notification_payment_refunded",
    location: "server/payment/router.ts",
    description: "Notifies admin when refund is processed",
    status: "active"
  },
  {
    name: "Profile Completed Notification",
    trigger: "Client completes profile",
    recipient: "Admin",
    settingKey: "notification_profile_completed",
    location: "server/emailService.ts - sendProfileCompletionNotification",
    description: "Notifies admin when client completes their profile",
    status: "active"
  },
  {
    name: "Packing Slip Created Notification",
    trigger: "Packing slip generated",
    recipient: "Admin",
    settingKey: "notification_packing_slip_created",
    location: "server/routers.ts",
    description: "Notifies admin when packing slip is created",
    status: "active"
  },
  {
    name: "Protocol Option Selected",
    trigger: "Client selects protocol option",
    recipient: "Admin",
    settingKey: "notification_protocol_option_selected",
    location: "server/routers.ts - selectProtocolOption",
    description: "Notifies admin when client selects from multiple protocol options",
    status: "active"
  },
  {
    name: "Account Invite Email",
    trigger: "Admin invites client to create account",
    recipient: "Client",
    settingKey: "notification_account_invite",
    location: "server/emailService.ts - sendAccountInviteEmail",
    description: "Sends account creation invitation to client",
    status: "active"
  },
  {
    name: "Welcome Email (Account Created)",
    trigger: "Client creates account",
    recipient: "Client",
    settingKey: "notification_welcome",
    location: "server/emailService.ts - sendWelcomeEmail",
    description: "Sends welcome email after account creation",
    status: "active"
  },
  {
    name: "High Discount Coupon Alert",
    trigger: "Coupon with high discount used",
    recipient: "Admin",
    settingKey: "notification_high_discount",
    location: "server/emailService.ts - sendHighDiscountCouponNotification",
    description: "Alerts admin when high-value discount coupon is used",
    status: "active"
  },
  {
    name: "Subtask Assignment Notification",
    trigger: "Subtask assigned to team member",
    recipient: "Team Member",
    settingKey: "notification_subtask_assignment",
    location: "server/emailService.ts - sendSubtaskAssignmentNotification",
    description: "Notifies team member when assigned a subtask",
    status: "active"
  },
  {
    name: "Waiver Announcement Email",
    trigger: "Admin sends waiver announcement",
    recipient: "Client",
    settingKey: "notification_waiver_announcement",
    location: "server/emailService.ts - sendWaiverAnnouncementEmail",
    description: "Sends waiver/announcement to clients",
    status: "active"
  },
  {
    name: "Payment Status Notification",
    trigger: "Payment status changes",
    recipient: "Client",
    settingKey: "notification_payment_status",
    location: "server/emailService.ts - sendPaymentStatusNotification",
    description: "Notifies client of payment status changes",
    status: "active"
  },
  {
    name: "Transformation Milestone Email",
    trigger: "Client reaches transformation milestone",
    recipient: "Client",
    settingKey: "notification_transformation_milestone",
    location: "server/emailService.ts - sendTransformationMilestoneEmail",
    description: "Congratulates client on reaching transformation milestone",
    status: "active"
  },
  {
    name: "Admin Milestone Notification",
    trigger: "Client reaches milestone",
    recipient: "Admin",
    settingKey: "notification_admin_milestone",
    location: "server/emailService.ts - sendAdminMilestoneNotification",
    description: "Notifies admin of client milestone achievement",
    status: "active"
  },
  {
    name: "Transformation Payment Confirmation",
    trigger: "Transformation payment completed",
    recipient: "Client",
    settingKey: "notification_transformation_payment",
    location: "server/emailService.ts - sendTransformationPaymentConfirmationEmail",
    description: "Confirms transformation program payment",
    status: "active"
  },
  {
    name: "Transformation Payment Admin Notification",
    trigger: "Transformation payment received",
    recipient: "Admin",
    settingKey: "notification_transformation_payment_admin",
    location: "server/emailService.ts - sendTransformationPaymentAdminNotification",
    description: "Notifies admin of transformation payment",
    status: "active"
  },
  {
    name: "Guest Enrollment Verification",
    trigger: "Guest enrolls in transformation",
    recipient: "Guest",
    settingKey: "notification_guest_enrollment",
    location: "server/emailService.ts - sendGuestEnrollmentVerificationEmail",
    description: "Sends verification email for guest enrollment",
    status: "active"
  },
];

const cronJobs = [
  {
    name: "Check-in Reminder",
    schedule: "Daily at 8 AM MST",
    file: "checkinCron.ts",
    description: "Sends daily check-in reminders to clients who haven't submitted. Includes 48-hour escalation for missed check-ins.",
    notifications: ["Check-in reminder email", "48-hour escalation reminder", "Low score admin alert"],
    configurable: true,
    settingKeys: ["checkin_reminder_hours", "checkin_escalation_hours", "checkin_low_score_threshold"]
  },
  {
    name: "Payment Reminder",
    schedule: "Daily at 9 AM MST",
    file: "paymentReminderCron.ts",
    description: "Sends payment reminders for overdue invoices",
    notifications: ["Payment reminder email"],
    configurable: true,
    settingKeys: ["payment_reminder_days"]
  },
  {
    name: "Daily Digest",
    schedule: "Daily at 6 PM MST",
    file: "digestCron.ts",
    description: "Sends daily summary digest to admin with key metrics",
    notifications: ["Daily digest email"],
    configurable: true,
    settingKeys: ["digest_enabled"]
  },
  {
    name: "Email Report",
    schedule: "Weekly on Monday",
    file: "emailReportCron.ts",
    description: "Generates and sends weekly email engagement report",
    notifications: ["Weekly email report"],
    configurable: true,
    settingKeys: ["email_report_enabled"]
  },
  {
    name: "Enrollment Follow-up",
    schedule: "Daily",
    file: "enrollmentFollowUpCron.ts",
    description: "Sends follow-up emails for incomplete enrollments",
    notifications: ["Enrollment follow-up email"],
    configurable: true,
    settingKeys: ["enrollment_followup_enabled"]
  },
  {
    name: "Follow-up Reminder",
    schedule: "Daily",
    file: "followUpCron.ts",
    description: "Sends general follow-up reminders",
    notifications: ["Follow-up email"],
    configurable: true,
    settingKeys: ["followup_enabled"]
  },
  {
    name: "Low Stock Alert",
    schedule: "Daily at 9 AM MST",
    file: "lowStockAlertCron.ts",
    description: "Alerts admin when inventory items are low",
    notifications: ["Low stock alert email"],
    configurable: true,
    settingKeys: ["low_stock_threshold"]
  },
  {
    name: "Progress Reminder",
    schedule: "Weekly",
    file: "progressReminderCron.ts",
    description: "Reminds clients to update their progress photos/metrics",
    notifications: ["Progress reminder email"],
    configurable: true,
    settingKeys: ["progress_reminder_enabled"]
  },
  {
    name: "Scheduled Announcement",
    schedule: "As scheduled",
    file: "scheduledAnnouncementCron.ts",
    description: "Sends scheduled announcements at configured times",
    notifications: ["Scheduled announcement email"],
    configurable: true,
    settingKeys: ["announcement_enabled"]
  },
  {
    name: "Session Reminder",
    schedule: "Before scheduled sessions",
    file: "sessionReminderCron.ts",
    description: "Sends reminders before coaching sessions",
    notifications: ["Session reminder email"],
    configurable: true,
    settingKeys: ["session_reminder_hours"]
  },
  {
    name: "Waiver Expiration",
    schedule: "Daily",
    file: "waiverExpirationCron.ts",
    description: "Notifies clients of expiring waivers",
    notifications: ["Waiver expiration email"],
    configurable: true,
    settingKeys: ["waiver_expiration_days"]
  },
  {
    name: "Appointment Reminder",
    schedule: "Before appointments",
    file: "appointmentReminderCron.ts",
    description: "Sends reminders before scheduled appointments",
    notifications: ["Appointment reminder email"],
    configurable: true,
    settingKeys: ["appointment_reminder_hours"]
  },
  {
    name: "Archived Packing Slip Cleanup",
    schedule: "Weekly",
    file: "archivedPackingSlipCleanup.ts",
    description: "Cleans up old archived packing slips",
    notifications: [],
    configurable: false,
    settingKeys: []
  },
];

const inAppNotifications = [
  {
    type: "protocol_approved",
    description: "Client approved their protocol",
    icon: "CheckCircle",
    color: "green"
  },
  {
    type: "protocol_viewed",
    description: "Client viewed their protocol",
    icon: "Eye",
    color: "blue"
  },
  {
    type: "payment_received",
    description: "Payment received from client",
    icon: "DollarSign",
    color: "green"
  },
  {
    type: "payment_failed",
    description: "Payment failed",
    icon: "AlertTriangle",
    color: "red"
  },
  {
    type: "payment_refunded",
    description: "Payment refunded",
    icon: "RefreshCw",
    color: "yellow"
  },
  {
    type: "profile_completed",
    description: "Client completed their profile",
    icon: "User",
    color: "green"
  },
  {
    type: "packing_slip_created",
    description: "Packing slip created",
    icon: "Package",
    color: "blue"
  },
  {
    type: "protocol_option_selected",
    description: "Client selected protocol option",
    icon: "CheckSquare",
    color: "purple"
  },
  {
    type: "low_checkin_score",
    description: "Client submitted low wellness score",
    icon: "AlertTriangle",
    color: "red"
  },
  {
    type: "checkin_submitted",
    description: "Client submitted check-in",
    icon: "ClipboardCheck",
    color: "green"
  },
];

export default function NotificationAnalysis() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <AdminLayout>
    <div className="container max-w-7xl py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="h-6 w-6 text-amber-500" />
              Notification System Analysis
            </h1>
            <p className="text-gray-600">Comprehensive overview of all notification types and triggers</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{emailNotifications.length}</p>
                <p className="text-sm text-muted-foreground">Email Notifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cronJobs.length}</p>
                <p className="text-sm text-muted-foreground">Scheduled Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Bell className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inAppNotifications.length}</p>
                <p className="text-sm text-muted-foreground">In-App Notifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Settings className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cronJobs.filter(j => j.configurable).length}</p>
                <p className="text-sm text-muted-foreground">Configurable Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="cron">Scheduled</TabsTrigger>
          <TabsTrigger value="inapp">In-App</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification System Overview</CardTitle>
              <CardDescription>
                The Omega Longevity platform uses a comprehensive notification system to keep clients and admins informed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications Section */}
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                  <Mail className="h-5 w-5 text-blue-500" />
                  Email Notifications ({emailNotifications.length})
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Email notifications are sent via SMTP for important events like protocol creation, payments, and check-ins.
                  Each notification type can be enabled/disabled in Site Settings.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {emailNotifications.slice(0, 9).map((n, i) => (
                    <Badge key={i} variant="outline" className="justify-start py-1.5">
                      <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                      {n.name}
                    </Badge>
                  ))}
                  {emailNotifications.length > 9 && (
                    <Badge variant="secondary" className="justify-start py-1.5">
                      +{emailNotifications.length - 9} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Scheduled Jobs Section */}
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-green-500" />
                  Scheduled Jobs ({cronJobs.length})
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Automated tasks run on schedules to send reminders, generate reports, and maintain the system.
                  Most jobs are configurable through Site Settings.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {cronJobs.map((job, i) => (
                    <Badge key={i} variant="outline" className="justify-start py-1.5">
                      <Zap className="h-3 w-3 mr-1 text-amber-500" />
                      {job.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* In-App Notifications Section */}
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                  <Bell className="h-5 w-5 text-purple-500" />
                  In-App Notifications ({inAppNotifications.length})
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Real-time notifications displayed in the admin dashboard notification bell.
                  These provide instant alerts for important events.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {inAppNotifications.map((n, i) => (
                    <Badge key={i} variant="outline" className="justify-start py-1.5">
                      <Bell className="h-3 w-3 mr-1 text-purple-500" />
                      {n.type.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Configuration Links */}
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-3">Configuration</h3>
                <div className="flex flex-wrap gap-3">
                  <Link href="/admin/settings">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Site Settings
                    </Button>
                  </Link>
                  <Link href="/admin/email-branding">
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4 mr-2" />
                      Email Branding
                    </Button>
                  </Link>
                  <Link href="/admin/checkin-management">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Check-in Settings
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emails Tab */}
        <TabsContent value="emails" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                All email notifications sent by the system, their triggers, and recipients.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Notification</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailNotifications.map((notification, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{notification.name}</p>
                            <p className="text-xs text-muted-foreground">{notification.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{notification.trigger}</TableCell>
                        <TableCell>
                          <Badge variant={notification.recipient === "Admin" ? "secondary" : "outline"}>
                            {notification.recipient}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cron Jobs Tab */}
        <TabsContent value="cron" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Jobs (Cron)</CardTitle>
              <CardDescription>
                Automated tasks that run on schedules to send reminders and maintain the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {cronJobs.map((job, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-green-500" />
                            {job.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">{job.schedule}</p>
                        </div>
                        <div className="flex gap-2">
                          {job.configurable && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              Configurable
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm mb-3">{job.description}</p>
                      {job.notifications.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.notifications.map((n, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {n}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        File: server/cron/{job.file}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* In-App Tab */}
        <TabsContent value="inapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>In-App Notifications</CardTitle>
              <CardDescription>
                Real-time notifications displayed in the admin dashboard notification bell.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inAppNotifications.map((notification, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {notification.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{notification.description}</TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            notification.color === "red" ? "bg-red-100 text-red-700" :
                            notification.color === "green" ? "bg-green-100 text-green-700" :
                            notification.color === "blue" ? "bg-blue-100 text-blue-700" :
                            notification.color === "yellow" ? "bg-yellow-100 text-yellow-700" :
                            "bg-purple-100 text-purple-700"
                          }
                        >
                          {notification.color === "red" ? "High" : 
                           notification.color === "yellow" ? "Medium" : "Normal"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}