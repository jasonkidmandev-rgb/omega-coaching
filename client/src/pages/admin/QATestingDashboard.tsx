import { useState, useEffect } from 'react';
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ChevronDown, 
  ChevronRight,
  Download,
  RotateCcw,
  ClipboardCheck
} from 'lucide-react';

interface TestItem {
  id: string;
  title: string;
  steps: string[];
  completed: boolean;
  tester: string;
  notes: string;
}

interface TestCategory {
  id: string;
  title: string;
  team: string;
  priority: number;
  tests: TestItem[];
}

const initialCategories: TestCategory[] = [
  {
    id: 'payment',
    title: 'Payment & Order Flow',
    team: 'Admin/Finance Team',
    priority: 1,
    tests: [
      {
        id: 'payment-1',
        title: 'Venmo Checkout Flow (CRITICAL)',
        steps: [
          'Navigate to a client protocol with pending payment',
          'Click "Pay with Venmo" button',
          'Complete Venmo checkout',
          'Verify redirect back to success page',
          'Verify protocol payment status changes to "Paid"',
          'Verify packing slip is generated automatically',
          'Verify confirmation email is sent to client',
          'Verify admin notification is created'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'payment-2',
        title: 'Venmo Payment Approval (CRITICAL)',
        steps: [
          'Navigate to Admin → Payment Reconciliation',
          'Find a pending Venmo payment',
          'Click "Mark as Received" button',
          'Verify protocol payment status changes to "Paid"',
          'Verify packing slip is created automatically',
          'Verify confirmation email is sent to client',
          'Verify admin notification is created'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'payment-3',
        title: 'Outside Payment Recording',
        steps: [
          'Navigate to Admin → Clients → Select a client',
          'Go to Pricing tab',
          'Select "Other" as payment method',
          'Click "Record External Payment"',
          'Add notes about payment method (cash, check, etc.)',
          'Verify status changes to "Paid"',
          'Verify packing slip is created',
          'Verify confirmation email is sent'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'payment-4',
        title: 'Payment Reconciliation Dashboard',
        steps: [
          'Navigate to Admin → Payment Reconciliation',
          'Verify pending payments are listed',
          'Verify overdue indicators are shown (3+ days, 7+ days)',
          'Test bulk approval functionality',
          'Test reject payment functionality'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'payment-5',
        title: 'Payment Confirmation Email',
        steps: [
          'Complete any payment (Venmo or Other)',
          'Check client email inbox',
          'Verify confirmation email was received',
          'Verify email contains correct payment amount',
          'Verify email contains correct payment method',
          'Verify email contains protocol name'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'payment-6',
        title: 'Payment Status Transitions',
        steps: [
          'Verify pending → paid transition works',
          'Verify pending → failed transition works',
          'Verify paid → refunded transition works',
          'Verify status changes reflect in client protocol',
          'Verify status changes reflect in payment history'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'payment-7',
        title: 'Store Order Management',
        steps: [
          'Navigate to Admin → Store Orders',
          'Verify orders display with correct payment method',
          'Test status change functionality',
          'Test shipping/tracking update',
          'Test refund process'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'payment-8',
        title: 'Payment History',
        steps: [
          'Navigate to Admin → Payment History',
          'Verify all payments are listed',
          'Verify payment amounts are correct',
          'Verify payment methods are correct',
          'Test date filtering',
          'Test export functionality'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'versioning',
    title: 'Protocol Versioning',
    team: 'Coach Team',
    priority: 2,
    tests: [
      {
        id: 'version-1',
        title: 'Create New Protocol Version',
        steps: [
          'Navigate to Admin → Clients → Select a client',
          'Click "New Version" button',
          'Enter version name and notes',
          'Enable "Copy items from current protocol"',
          'Click "Create Version"',
          'Verify new version appears in dropdown'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'version-2',
        title: 'Compare Protocol Versions',
        steps: [
          'Navigate to a client with multiple versions',
          'Click "Compare" button',
          'Select two versions to compare',
          'Verify comparison shows Added/Removed/Modified items',
          'Verify item details are correct'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'version-3',
        title: 'Export PDF Comparison Report',
        steps: [
          'Open the Compare dialog',
          'Select two versions',
          'Click "Export PDF" button',
          'Verify PDF opens in new window',
          'Print or save the PDF',
          'Verify all comparison data is included'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'version-4',
        title: 'Rollback to Previous Version',
        steps: [
          'Open the Compare dialog',
          'Select the version to rollback to',
          'Click "Rollback to [Version]" button',
          'Confirm the rollback',
          'Verify protocol items match the old version'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'notifications',
    title: 'Notification System',
    team: 'Admin Team',
    priority: 3,
    tests: [
      {
        id: 'notify-1',
        title: 'Protocol View Notification',
        steps: [
          'Send a protocol link to a test client',
          'Have the client view the protocol',
          'Check notification bell in admin dashboard',
          'Verify "viewed protocol" notification appears'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'notify-2',
        title: 'Protocol Approval Notification',
        steps: [
          'Have a client approve their protocol',
          'Check notification bell in admin dashboard',
          'Verify "approved protocol" notification appears',
          'Check email notification (if enabled)'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'notify-3',
        title: 'Custom Notification Email',
        steps: [
          'Navigate to Admin → Team',
          'Click "Set Email" for an admin user',
          'Enter a custom notification email',
          'Trigger a notification event',
          'Verify email goes to custom address'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'packing',
    title: 'Packing Slips & Fulfillment',
    team: 'Operations Team',
    priority: 4,
    tests: [
      {
        id: 'packing-1',
        title: 'Packing Slip Generation on Payment',
        steps: [
          'Complete a Venmo payment for a protocol with peptides/supplements',
          'Navigate to Admin → Packing Slips',
          'Verify packing slip was created automatically',
          'Verify ONLY "Rec" (recommended) items appear',
          'Verify NO service items appear (e.g., Omega Elite Membership)',
          'Verify item quantities match the protocol'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'packing-2',
        title: 'Packing Slip Generation on Venmo Payment',
        steps: [
          'Navigate to Admin → Payment Reconciliation',
          'Find a pending Venmo payment',
          'Click "Mark as Received" to approve payment',
          'Navigate to Admin → Packing Slips',
          'Verify packing slip was created automatically',
          'Verify confirmation email was sent to client'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'packing-3',
        title: 'Service Items Exclusion (CRITICAL)',
        steps: [
          'Find a protocol with BOTH peptides AND services (e.g., Omega Elite Membership)',
          'Complete payment for the protocol',
          'Navigate to Admin → Packing Slips',
          'Open the packing slip',
          'VERIFY: Service items DO NOT appear on packing slip',
          'VERIFY: Only peptides, supplements, and supplies appear',
          'VERIFY: No "Unknown Item" entries exist'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'packing-4',
        title: 'Mismatch Detection and Indicator',
        steps: [
          'Navigate to Admin → Packing Slips',
          'Look for orange "Needs Sync" badge on any packing slip',
          'If found, click to open the packing slip',
          'Click "Regenerate Items" button',
          'Verify items now match the current protocol',
          'Verify "Needs Sync" badge is removed from list'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'packing-5',
        title: 'Regenerate Packing Slip Items',
        steps: [
          'Open a packing slip that shows "Needs Sync"',
          'Click "Check for Mismatches" button',
          'Review the mismatch details (missing, extra, quantity)',
          'Click "Regenerate Items" button',
          'Verify items are updated to match current protocol',
          'Verify service items are NOT included after regeneration'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'packing-6',
        title: 'Fulfillment Workflow',
        steps: [
          'Open a packing slip with pending items',
          'Check off items as fulfilled one by one',
          'Verify progress percentage updates correctly',
          'Mark an item as backordered if needed',
          'Verify backordered count updates',
          'Complete all items and verify status changes to "Complete"'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'packing-7',
        title: 'Waiver Signature Capture',
        steps: [
          'Navigate to a packing slip without signature',
          'Complete the waiver signature',
          'Verify signature is captured and displayed',
          'Verify signer name and timestamp are recorded'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'packing-8',
        title: 'Shipping Address Display',
        steps: [
          'Open a packing slip',
          'Verify shipping address is displayed correctly',
          'If "No Address" badge appears, verify client protocol has no shipping info',
          'Update shipping address in client protocol',
          'Verify packing slip shows updated address'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'packing-9',
        title: 'Remove Item from Packing Slip',
        steps: [
          'Open a packing slip with multiple items',
          'Click the remove/delete button on an item',
          'Confirm the removal',
          'Verify item is removed from the list',
          'Verify total items count is updated'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'packing-10',
        title: '$0 Protocol Handling',
        steps: [
          'Create a protocol with only affiliate links (no direct sales)',
          'Approve and complete payment for $0 total',
          'Navigate to Admin → Packing Slips',
          'Verify NO packing slip was created for $0 protocol'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'preview',
    title: 'Admin Preview Override',
    team: 'Coach Team',
    priority: 5,
    tests: [
      {
        id: 'preview-1',
        title: 'Preview Incomplete Profile Protocol',
        steps: [
          'Navigate to Admin → Clients',
          'Find a client with incomplete profile (< 100%)',
          'Click "Preview" button',
          'Verify yellow "Admin Preview Mode" banner appears',
          'Verify full protocol is visible despite incomplete profile',
          'Verify "Complete Your Profile" section is shown'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'email',
    title: 'Email & Communication',
    team: 'Admin Team',
    priority: 6,
    tests: [
      {
        id: 'email-1',
        title: 'Send Protocol Link Email',
        steps: [
          'Navigate to Admin → Clients → Select a client',
          'Click "Send Link" button',
          'Verify email is sent successfully',
          'Check recipient inbox for email',
          'Verify link in email works correctly'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'email-2',
        title: 'Send Protocol PDF Email',
        steps: [
          'Navigate to Admin → Clients → Select a client',
          'Click "Send PDF" button',
          'Verify email with PDF attachment is sent',
          'Check recipient inbox for email',
          'Verify PDF attachment opens correctly'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'email-3',
        title: 'Payment Reminder Email',
        steps: [
          'Navigate to Admin → Clients → Select unpaid client',
          'Find "Manual Payment Reminder" section',
          'Select urgency level (Friendly, Urgent, Final)',
          'Click "Send Reminder"',
          'Verify email is sent with correct urgency tone'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'client-corner',
    title: 'Client Corner Features',
    team: 'Client Experience Team',
    priority: 7,
    tests: [
      {
        id: 'cc-1',
        title: 'Weekly Check-In Flow',
        steps: [
          'Log in as a client',
          'Navigate to Weekly Check-Ins from Quick Actions',
          'Verify pending check-ins are displayed',
          'Complete a check-in form',
          'Verify submission success message'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'cc-2',
        title: 'Check-In Empty State',
        steps: [
          'Log in as a client with no pending check-ins',
          'Navigate to Weekly Check-Ins',
          'Verify "No check-ins yet" message displays',
          'Verify back button works correctly'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'cc-3',
        title: 'Client Documents',
        steps: [
          'Navigate to My Documents',
          'Verify document folders display correctly',
          'Test file upload functionality',
          'Verify back navigation works'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'cc-4',
        title: 'Client Inventory',
        steps: [
          'Navigate to My Inventory',
          'Verify inventory items display',
          'Test low stock alerts',
          'Verify back navigation works'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'cc-5',
        title: 'Client Metrics',
        steps: [
          'Navigate to My Metrics',
          'Verify metrics display correctly',
          'Test adding new measurements',
          'Verify back navigation works'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'coach-tools',
    title: 'Coach Tools & Efficiency',
    team: 'Coach Team',
    priority: 8,
    tests: [
      {
        id: 'ct-1',
        title: 'PDF Export from Check-In Review',
        steps: [
          'Navigate to Admin → Clients → Check-Ins',
          'Open a submitted check-in',
          'Click "Export PDF" button',
          'Verify PDF downloads with correct content'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'ct-2',
        title: 'Notification History Tab',
        steps: [
          'Navigate to Admin → Clients → Edit Client',
          'Click on "Email History" tab',
          'Verify notification history displays',
          'Test category and status filters'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'ct-3',
        title: 'Quick Notes from Client List',
        steps: [
          'Navigate to Admin → Clients',
          'Click dropdown menu on any client',
          'Select "Quick Note"',
          'Add a note and save',
          'Verify note appears in client profile'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'ct-4',
        title: 'Check-In Response Templates',
        steps: [
          'Open a check-in for review',
          'Click "Insert Template" dropdown',
          'Select a template',
          'Verify template text is inserted',
          'Verify personalization works'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'ct-5',
        title: 'Document Request Templates',
        steps: [
          'Navigate to client Documents tab',
          'Click "Request Documents" dropdown',
          'Select a template (e.g., Quarterly Labs)',
          'Verify request is created with correct items'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'dashboard-actions',
    title: 'Client Dashboard Quick Actions',
    team: 'Client Experience Team',
    priority: 9,
    tests: [
      {
        id: 'da-1',
        title: 'Quick Actions Section',
        steps: [
          'Log in as a client',
          'Verify Quick Actions section appears on dashboard',
          'Test Weekly Check-In button',
          'Test My Documents button',
          'Test My Inventory button',
          'Test My Metrics button'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'email-templates',
    title: 'Email Template Customization',
    team: 'Admin Team',
    priority: 10,
    tests: [
      {
        id: 'et-1',
        title: 'View Email Template Preview',
        steps: [
          'Navigate to Admin → Email Preview',
          'Select an email template from the list',
          'Verify preview displays correctly',
          'Verify available variables are shown'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'et-2',
        title: 'Customize Email Subject Line',
        steps: [
          'Open an email template in Email Preview',
          'Click "Edit" button to enter edit mode',
          'Modify the subject line',
          'Click "Save Changes"',
          'Verify "Customized" badge appears',
          'Verify changes persist after page refresh'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'et-3',
        title: 'Customize Email Body HTML',
        steps: [
          'Open an email template in edit mode',
          'Modify the HTML body content',
          'Use click-to-copy to insert variables',
          'Save changes and preview',
          'Verify HTML renders correctly'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'et-4',
        title: 'Reset Template to Default',
        steps: [
          'Open a customized email template',
          'Click "Reset to Default" button',
          'Confirm the reset action',
          'Verify template reverts to original content',
          'Verify "Customized" badge is removed'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'email-versioning',
    title: 'Email Template Versioning',
    team: 'Admin Team',
    priority: 11,
    tests: [
      {
        id: 'ev-1',
        title: 'Save Template Version',
        steps: [
          'Open an email template in edit mode',
          'Make changes to the template',
          'Click "Save Version" button',
          'Enter version name and notes',
          'Verify version is saved successfully',
          'Verify version count badge updates'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'ev-2',
        title: 'View Version History',
        steps: [
          'Open an email template with saved versions',
          'Click "Version History" tab',
          'Verify all saved versions are listed',
          'Verify version details (name, date, notes) display correctly'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'ev-3',
        title: 'Restore Previous Version',
        steps: [
          'Open version history for a template',
          'Select a previous version',
          'Click "Restore" button',
          'Confirm the restore action',
          'Verify template content matches restored version'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'ev-4',
        title: 'Delete Template Version',
        steps: [
          'Open version history for a template',
          'Click delete button on a version',
          'Confirm deletion',
          'Verify version is removed from history'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'email-engagement',
    title: 'Email Engagement Tracking',
    team: 'Admin Team',
    priority: 12,
    tests: [
      {
        id: 'ee-1',
        title: 'View Engagement Statistics',
        steps: [
          'Navigate to Admin → Email Preview',
          'Select an email template',
          'Verify engagement stats panel displays',
          'Check emails sent, opens, and click counts',
          'Verify open rate and click-through rate percentages'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'ee-2',
        title: 'Filter Engagement by Time Period',
        steps: [
          'Open engagement stats for a template',
          'Select "Last 24 Hours" filter',
          'Verify stats update accordingly',
          'Test "Last 7 Days" and "Last 30 Days" filters',
          'Verify data changes appropriately'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'ee-3',
        title: 'View Top Clicked Links',
        steps: [
          'Open engagement stats for a template',
          'Scroll to "Top Clicked Links" section',
          'Verify links are listed with click counts',
          'Verify links are sorted by popularity'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'ee-4',
        title: 'Email Open Tracking',
        steps: [
          'Send a test email to yourself',
          'Open the email in your inbox',
          'Return to Email Preview page',
          'Verify open count has increased',
          'Verify open appears in recent opens list'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'scheduled-reports',
    title: 'Scheduled Email Reports',
    team: 'Admin Team',
    priority: 13,
    tests: [
      {
        id: 'sr-1',
        title: 'Access Scheduled Reports Settings',
        steps: [
          'Navigate to Admin → Site Settings',
          'Click on "Tools" tab',
          'Click "Scheduled Reports" card',
          'Verify Email Report Settings page loads'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'sr-2',
        title: 'Configure Weekly Report',
        steps: [
          'Open Email Report Settings',
          'Enable "Weekly Delivery Summary" toggle',
          'Select day of week for delivery',
          'Select delivery time',
          'Add recipient email addresses',
          'Save settings'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'sr-3',
        title: 'Configure Monthly Report',
        steps: [
          'Open Email Report Settings',
          'Enable "Monthly Delivery Summary" toggle',
          'Select day of month for delivery',
          'Select delivery time',
          'Add recipient email addresses',
          'Save settings'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'sr-4',
        title: 'Send Test Report',
        steps: [
          'Open Email Report Settings',
          'Click "Send Test Report" button',
          'Check recipient inbox for test report',
          'Verify report contains delivery statistics',
          'Verify report contains engagement metrics'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'dashboard-customize',
    title: 'Dashboard Customization',
    team: 'Admin Team',
    priority: 14,
    tests: [
      {
        id: 'dc-1',
        title: 'Open Customization Panel',
        steps: [
          'Navigate to Admin → Dashboard',
          'Click "Customize" button in header',
          'Verify customization panel opens',
          'Verify all 10 widgets are listed with toggles'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'dc-2',
        title: 'Hide Dashboard Widget',
        steps: [
          'Open customization panel',
          'Toggle off "Client Email Open Rates" widget',
          'Close customization panel',
          'Verify widget is hidden from dashboard',
          'Refresh page and verify setting persists'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'dc-3',
        title: 'Show Hidden Widget',
        steps: [
          'Open customization panel',
          'Toggle on a previously hidden widget',
          'Close panel and verify widget reappears',
          'Verify widget displays correct data'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'dc-4',
        title: 'Reset to Default Layout',
        steps: [
          'Hide several widgets using customization panel',
          'Click "Reset to Defaults" button',
          'Confirm the reset action',
          'Verify all widgets are visible again'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'my-protocol',
    title: 'My Protocol Section',
    team: 'Admin Team',
    priority: 15,
    tests: [
      {
        id: 'mp-1',
        title: 'View My Protocol Section',
        steps: [
          'Navigate to Admin → Dashboard',
          'Verify "My Protocol" section appears at top',
          'Verify it shows your email address',
          'Verify "Quick Access" badge is displayed'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'mp-2',
        title: 'Access Own Protocol',
        steps: [
          'If you have a protocol, click "View My Protocol"',
          'Verify your protocol page loads correctly',
          'Verify you see your own protocol items'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'mp-3',
        title: 'Create Own Protocol',
        steps: [
          'If no protocol exists, click "Create My Protocol"',
          'Verify you are taken to protocol creation page',
          'Verify your email is pre-filled'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'pwa',
    title: 'Progressive Web App (PWA)',
    team: 'All Users',
    priority: 16,
    tests: [
      {
        id: 'pwa-1',
        title: 'Install App on Android',
        steps: [
          'Open the app in Chrome on an Android phone',
          'Wait for the install prompt to appear at the bottom',
          'Tap "Install App" button',
          'Verify app icon appears on home screen',
          'Open app from home screen',
          'Verify app opens in standalone mode (no browser UI)'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'pwa-2',
        title: 'Install App on iPhone',
        steps: [
          'Open the app in Safari on an iPhone',
          'Wait for the install prompt to appear',
          'Tap the Share button (square with arrow)',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" in the top right',
          'Verify app icon appears on home screen',
          'Open app from home screen',
          'Verify app opens in standalone mode'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'pwa-3',
        title: 'Offline Functionality',
        steps: [
          'Install the app on your phone',
          'Open the app and navigate to a few pages',
          'Turn on Airplane Mode',
          'Try to navigate within the app',
          'Verify cached pages load correctly',
          'Verify offline page shows for uncached content',
          'Turn off Airplane Mode and verify app reconnects'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'pwa-4',
        title: 'App Shortcuts',
        steps: [
          'Install the app on Android',
          'Long-press the app icon on home screen',
          'Verify "My Protocol" and "Check-In" shortcuts appear',
          'Tap a shortcut and verify it opens the correct page'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'pwa-5',
        title: 'Dismiss Install Prompt',
        steps: [
          'Open the app in a browser (not installed)',
          'Wait for install prompt to appear',
          'Click the X to dismiss',
          'Refresh the page',
          'Verify prompt does not reappear immediately',
          'Wait 7 days (or clear localStorage) and verify prompt returns'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'dashboard-labels',
    title: 'Dashboard Clarity Labels',
    team: 'Admin Team',
    priority: 17,
    tests: [
      {
        id: 'dl-1',
        title: 'Verify Client Overview Label',
        steps: [
          'Navigate to Admin → Dashboard',
          'Find "Client Overview" section',
          'Verify info tooltip explains these are client statistics',
          'Hover over tooltip to read full explanation'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'dl-2',
        title: 'Verify Client Activity Overview Label',
        steps: [
          'Scroll to "Client Activity Overview" section',
          'Verify section header clearly indicates client activity',
          'Verify info tooltip explains this shows client engagement',
          'Verify email analytics labels say "Client Email Open Rates"'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'transformation-access',
    title: 'Transformation Access & Tier Selection',
    team: 'Client Experience Team',
    priority: 18,
    tests: [
      {
        id: 'ta-1',
        title: 'Access Code Entry (CRITICAL)',
        steps: [
          'Navigate to /transformation',
          'Enter a valid access code (e.g., TRANSFORMATION)',
          'Click "Begin Transformation"',
          'Verify redirect to tier selection page',
          'Verify access code is validated correctly'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'ta-2',
        title: 'Tier Selection Flow',
        steps: [
          'On tier selection page, verify all 3 tiers display',
          'Click on each tier to select it',
          'Verify selected tier is highlighted',
          'Click "Continue with [Tier]" button',
          'Verify redirect to journey page with correct tier'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'ta-3',
        title: 'Invalid Access Code',
        steps: [
          'Navigate to /transformation',
          'Enter an invalid access code',
          'Click "Begin Transformation"',
          'Verify error message displays',
          'Verify user cannot proceed'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'transformation-masterclass',
    title: 'Transformation Masterclass Videos',
    team: 'Client Experience Team',
    priority: 19,
    tests: [
      {
        id: 'tm-1',
        title: 'Required Videos Display',
        steps: [
          'Navigate to transformation journey page',
          'Verify required videos section displays',
          'Verify "Mark Complete" buttons are visible',
          'Verify video count and progress indicator'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'tm-2',
        title: 'Mark Video Complete',
        steps: [
          'Click "Mark Complete" on a required video',
          'Verify video is marked as completed',
          'Verify progress indicator updates',
          'Verify completion persists after page refresh'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'tm-3',
        title: 'Continue Watching Dialog',
        steps: [
          'Complete all required videos',
          'Verify "Required Videos Complete!" dialog appears',
          'Verify "Continue to Payment" option',
          'Verify "Continue Watching Masterclass" option',
          'Test both options work correctly'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'transformation-payment',
    title: 'Transformation Payment Flow',
    team: 'Admin/Finance Team',
    priority: 20,
    tests: [
      {
        id: 'tp-1',
        title: 'Guest Email Collection (CRITICAL)',
        steps: [
          'As a guest (not logged in), complete required videos',
          'Click "Continue to Payment"',
          'Verify email/name collection form appears',
          'Enter valid email and name',
          'Verify payment options appear after entering info'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'tp-2',
        title: 'Venmo Payment',
        steps: [
          'Click Venmo payment option',
          'Complete Venmo checkout',
          'Verify redirect back to success page',
          'Verify payment status updates',
          'Verify confirmation email is sent'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'tp-3',
        title: 'Venmo Payment',
        steps: [
          'Click Venmo payment option',
          'Verify Venmo instructions display',
          'Verify Venmo handle and phone last 4 digits show',
          'Verify "I\'ve Sent Payment" button works',
          'Verify pending payment status'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'tp-4',
        title: 'Tier-Specific Pricing',
        steps: [
          'Test payment for Essentials tier ($1,000)',
          'Test payment for Flagship tier ($2,500)',
          'Test payment for Elite tier ($10,000)',
          'Verify processing fee calculation (3.5%)',
          'Verify total amount is correct'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'transformation-intake',
    title: 'Transformation Intake Form',
    team: 'Client Experience Team',
    priority: 21,
    tests: [
      {
        id: 'ti-1',
        title: 'Intake Form Display',
        steps: [
          'Navigate to intake form after payment',
          'Verify all 17 sections display',
          'Verify required fields are marked',
          'Verify signature sections are visible'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'ti-2',
        title: 'Intake Form Submission',
        steps: [
          'Fill out all required fields',
          'Sign all required signature sections',
          'Click Submit button',
          'Verify form submits successfully',
          'Verify confirmation message displays'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'ti-3',
        title: 'Admin Intake Notification',
        steps: [
          'Submit a completed intake form',
          'Check admin email inbox',
          'Verify notification email was received',
          'Verify email contains client name and tier',
          'Verify in-app notification appears for admin'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  },
  {
    id: 'transformation-admin',
    title: 'Transformation Admin Management',
    team: 'Admin Team',
    priority: 22,
    tests: [
      {
        id: 'tad-1',
        title: 'Enrollments Dashboard',
        steps: [
          'Navigate to Admin → Enrollments',
          'Verify enrollments list displays',
          'Verify tier and status columns',
          'Test filtering by tier/status',
          'Test search functionality'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'tad-2',
        title: 'Intake Form Editor',
        steps: [
          'Navigate to Admin → Intake Form Editor',
          'Verify all 17 sections display',
          'Test editing a section',
          'Test adding a new section',
          'Test reordering sections'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'tad-3',
        title: 'Access Codes Management',
        steps: [
          'Navigate to Admin → Access Codes',
          'Test creating a new access code',
          'Test editing an access code',
          'Test deactivating an access code',
          'Verify tier assignment works'
        ],
        completed: false,
        tester: '',
        notes: ''
      },
      {
        id: 'tad-4',
        title: 'Masterclass Videos Management',
        steps: [
          'Navigate to Admin → Masterclass Videos',
          'Test adding a new video',
          'Test editing video details',
          'Test marking video as required',
          'Test reordering videos'
        ],
        completed: false,
        tester: '',
        notes: ''
      }
    ]
  }
];

const verifiedFeatures = [
  { name: 'Dashboard Route (fixed)', description: '/admin/dashboard now loads correctly' },
  { name: 'Compare Button (fixed)', description: 'Works without clientId requirement' },
  { name: 'Version Rollback (new)', description: 'Rollback to previous protocol version' },
  { name: 'PDF Comparison Export (new)', description: 'Export version comparison as PDF' },
  { name: 'Admin Preview Override (verified)', description: '?preview=admin bypasses profile gate' },
  { name: 'Venmo Payments (verified)', description: 'Venmo checkout working correctly' },
  { name: 'Venmo Payments (verified)', description: 'Venmo payment recording working' },
  { name: 'Outside Payments (verified)', description: 'Record external payments feature' },
  { name: 'Packing Slips (verified)', description: 'Shows only "Rec" items correctly' },
  { name: 'Notification System (verified)', description: 'Protocol view/approval notifications' },
  { name: 'Stripe Cleanup (completed)', description: 'Legacy Stripe code removed - PayPal/Venmo only' },
  { name: 'QA Dashboard Sidebar (added)', description: 'QA Testing link added to admin sidebar' },
  // Features added January 25, 2026 - Morning
  { name: 'Check-In PDF Export (new)', description: 'Export check-in responses as PDF from review page' },
  { name: 'Notification History Tab (new)', description: 'View all automated emails sent to each client' },
  { name: 'Client Quick Actions (new)', description: 'Quick action buttons on client dashboard' },
  { name: 'Check-In Empty State (new)', description: 'Proper empty state with back navigation for check-ins' },
  { name: 'Back Navigation (new)', description: 'Added back buttons to Documents, Inventory, Metrics pages' },
  { name: 'Quick Notes (new)', description: 'Add notes from client list dropdown menu' },
  { name: 'Response Templates (new)', description: 'Insert template responses in check-in reviews' },
  { name: 'Document Request Templates (new)', description: 'One-click common document requests' },
  // Features added January 25, 2026 - Afternoon/Evening
  { name: 'Email Template Customization (new)', description: 'Edit subject lines and HTML body of automated emails' },
  { name: 'Email Template Versioning (new)', description: 'Save, restore, and manage template versions' },
  { name: 'Email Engagement Tracking (new)', description: 'Track open rates and click-through rates for emails' },
  { name: 'Scheduled Email Reports (new)', description: 'Configure automated weekly/monthly delivery reports' },
  { name: 'Dashboard Customization (new)', description: 'Show/hide dashboard widgets with persistent preferences' },
  { name: 'My Protocol Section (new)', description: 'Quick access to admin\'s own protocol from dashboard' },
  { name: 'Dashboard Clarity Labels (new)', description: 'Clear labels indicating client activity vs admin data' },
  { name: 'Tracking Pixel Endpoint (new)', description: 'Email open tracking via invisible pixel' },
  { name: 'Click Tracking Endpoint (new)', description: 'Link click tracking with redirect' },
  { name: 'Engagement Stats API (new)', description: 'API endpoints for email engagement metrics' },
  { name: 'Version History UI (new)', description: 'View and restore email template versions' },
  { name: 'Widget Toggle Panel (new)', description: 'Customize which dashboard widgets are visible' },
  { name: 'Reset to Defaults (new)', description: 'One-click reset for dashboard customization' },
  // Features added January 28, 2026 - System Audit
  { name: 'Service Items Exclusion (FIXED)', description: 'Services (e.g., Omega Elite Membership) no longer appear on packing slips' },
  { name: 'Mismatch Detection (FIXED)', description: 'checkMismatch, regenerate, bulkRegenerate now exclude services' },
  { name: 'Venmo Packing Slip Creation (NEW)', description: 'Packing slips auto-created when admin approves Venmo payment' },
  { name: 'Venmo Confirmation Email (NEW)', description: 'Confirmation email sent when Venmo payment is approved' },
  { name: 'Mismatch Indicator Badge (NEW)', description: 'Orange "Needs Sync" badge shows on packing slips with mismatches' },
  { name: 'Remove Item from Packing Slip (NEW)', description: 'Can remove individual items from packing slips' },
  { name: 'Comprehensive Audit Tests (NEW)', description: '36 new automated tests for packing slip and payment flows' },
  // Features added January 28, 2026 - PWA Implementation
  { name: 'Progressive Web App (NEW)', description: 'Install app on phone from browser - works on iOS and Android' },
  { name: 'PWA Install Prompt (NEW)', description: 'Automatic prompt to install app on mobile devices' },
  { name: 'Offline Support (NEW)', description: 'App works offline with cached assets and offline fallback page' },
  { name: 'App Icons (NEW)', description: 'Custom Omega Longevity icons for home screen and app launcher' },
  { name: 'Service Worker (NEW)', description: 'Background caching for faster load times and offline support' },
  // Features added February 4, 2026 - Transformation Journey
  { name: 'Transformation Journey (NEW)', description: 'Complete transformation program onboarding flow' },
  { name: 'Access Code System (NEW)', description: 'Access code validation with tier-specific routing' },
  { name: 'Tier Selection Page (NEW)', description: 'User can choose program tier (Elite/Flagship/Essentials)' },
  { name: 'Masterclass Videos (NEW)', description: 'Required and optional video content with progress tracking' },
  { name: 'Guest Payment Flow (NEW)', description: 'Guests can pay before creating an account' },
  { name: 'Venmo Integration', description: 'Payment processing for transformation program' },
  { name: 'Intake Form System (NEW)', description: '17-section intake form with signatures and legal text' },
  { name: 'Admin Intake Notification (NEW)', description: 'Email notification when client completes intake form' },
  { name: 'Enrollment Management (NEW)', description: 'Admin dashboard for managing transformation enrollments' },
  { name: 'Continue Watching Dialog (NEW)', description: 'Option to continue masterclass after required videos' },
  { name: 'Progress Tracking (NEW)', description: 'Track client progress through transformation journey' }
];

export default function QATestingDashboard() {
  const [categories, setCategories] = useState<TestCategory[]>(() => {
    const saved = localStorage.getItem('qa-testing-progress');
    return saved ? JSON.parse(saved) : initialCategories;
  });
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('qa-testing-progress', JSON.stringify(categories));
  }, [categories]);

  const toggleTest = (categoryId: string, testId: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          tests: cat.tests.map(test => {
            if (test.id === testId) {
              return { ...test, completed: !test.completed };
            }
            return test;
          })
        };
      }
      return cat;
    }));
  };

  const updateTestField = (categoryId: string, testId: string, field: 'tester' | 'notes', value: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          tests: cat.tests.map(test => {
            if (test.id === testId) {
              return { ...test, [field]: value };
            }
            return test;
          })
        };
      }
      return cat;
    }));
  };

  const toggleExpanded = (testId: string) => {
    setExpandedTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  };

  const resetProgress = () => {
    if (confirm('Are you sure you want to reset all testing progress?')) {
      setCategories(initialCategories);
      setExpandedTests(new Set());
    }
  };

  const exportReport = () => {
    const report = {
      exportDate: new Date().toISOString(),
      categories: categories.map(cat => ({
        ...cat,
        completedCount: cat.tests.filter(t => t.completed).length,
        totalCount: cat.tests.length
      }))
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalTests = categories.reduce((sum, cat) => sum + cat.tests.length, 0);
  const completedTests = categories.reduce((sum, cat) => sum + cat.tests.filter(t => t.completed).length, 0);
  const progressPercent = Math.round((completedTests / totalTests) * 100);

  return (
    <AdminLayout>
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <ClipboardCheck className="h-10 w-10 text-orange-500" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">QA Testing Dashboard</h1>
          </div>
          <p className="text-gray-600">Health Coach Protocol Manager - Team Testing Assignments</p>
          <p className="text-sm text-gray-500 mt-1">Last Updated: January 25, 2026</p>
        </div>

        {/* Progress Overview */}
        <Card className="bg-white border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="#334155" strokeWidth="8" fill="none" />
                    <circle 
                      cx="48" cy="48" r="40" 
                      stroke="#f97316" 
                      strokeWidth="8" 
                      fill="none"
                      strokeDasharray={`${progressPercent * 2.51} 251`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">{progressPercent}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{completedTests} of {totalTests} tests completed</p>
                  <p className="text-gray-600">Keep testing to reach 100%!</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportReport} className="border-gray-300 text-gray-700 hover:bg-gray-100">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
                <Button variant="outline" size="sm" onClick={resetProgress} className="border-gray-300 text-gray-700 hover:bg-gray-100">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Progress
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Notice */}
        <Card className="bg-blue-900/30 border-blue-700">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-300">Payment System: Venmo Only</h3>
                <p className="text-blue-200/80 text-sm mt-1">
                  The payment system uses Venmo exclusively. There is no Stripe or PayPal integration. 
                  Payment methods available: Venmo and Other (for recording external payments).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verified Features */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Features Verified Working
            </CardTitle>
            <CardDescription className="text-gray-600">
              These features have been tested and confirmed functional
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {verifiedFeatures.map((feature, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded bg-gray-100/30">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{feature.name}</p>
                    <p className="text-xs text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Testing Categories */}
        {categories.map(category => {
          const catCompleted = category.tests.filter(t => t.completed).length;
          const catTotal = category.tests.length;
          const catPercent = Math.round((catCompleted / catTotal) * 100);
          
          return (
            <Card key={category.id} className="bg-white border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      Priority {category.priority}: {category.title}
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Assigned to: {category.team}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-800">{catCompleted}/{catTotal}</p>
                      <p className="text-xs text-gray-600">{catPercent}% complete</p>
                    </div>
                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 transition-all duration-300"
                        style={{ width: `${catPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {category.tests.map(test => {
                  const isExpanded = expandedTests.has(test.id);
                  return (
                    <div 
                      key={test.id} 
                      className={`border rounded-lg p-3 transition-colors ${
                        test.completed 
                          ? 'border-green-700 bg-green-900/20' 
                          : 'border-gray-300 bg-gray-100/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={test.completed}
                          onCheckedChange={() => toggleTest(category.id, test.id)}
                          className="border-slate-500"
                        />
                        <button 
                          onClick={() => toggleExpanded(test.id)}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-600" />
                          )}
                          <span className={`font-medium ${test.completed ? 'text-green-600 line-through' : 'text-gray-900'}`}>
                            {test.title}
                          </span>
                        </button>
                        {test.completed && (
                          <Badge className="bg-green-600 text-white">Completed</Badge>
                        )}
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-3 ml-9 space-y-3">
                          <div className="bg-gray-50 rounded p-3">
                            <p className="text-xs font-medium text-gray-600 mb-2">Test Steps:</p>
                            <ol className="list-decimal list-inside space-y-1">
                              {test.steps.map((step, i) => (
                                <li key={i} className="text-sm text-gray-700">{step}</li>
                              ))}
                            </ol>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-gray-600">Tester Name</label>
                              <Input
                                value={test.tester}
                                onChange={(e) => updateTestField(category.id, test.id, 'tester', e.target.value)}
                                placeholder="Enter your name"
                                className="mt-1 bg-gray-100 border-gray-300 text-gray-900"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600">Notes</label>
                              <Textarea
                                value={test.notes}
                                onChange={(e) => updateTestField(category.id, test.id, 'notes', e.target.value)}
                                placeholder="Any issues or observations..."
                                className="mt-1 bg-gray-100 border-gray-300 text-gray-900 h-10"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
    </AdminLayout>
  );
}