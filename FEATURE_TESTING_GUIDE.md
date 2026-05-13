# PeptideCoach.Pro - Feature Testing Guide

**Last Updated:** January 18, 2026  
**Total Features:** 50+ updates across 8 development phases

---

## Quick Links

| Feature | URL Path |
|---------|----------|
| Payment History | `/admin/payment-history` |
| Revenue Goals | `/admin/revenue-goals` |
| Notification Settings | `/admin/notification-settings` |
| Client Payment Portal | `/payments/:token` |
| Audit Logs | `/admin/audit-logs` |
| Team Management | `/admin/team` |
| Store Waivers | `/admin/store-waivers` |
| Peptide Cheat Sheet | `/peptide-cheat-sheet` |
| Client Dashboard | `/dashboard` |
| Omega Store | `/store` |

---

## Phase 10: Payment & Revenue Features

### 1. Venmo Payment Fix
**What was fixed:** Venmo payment redirects were returning 404 errors after successful payment.

**How to test:**
1. Go to a client protocol with pending payment
2. Select Venmo as payment method
3. Complete the Venmo payment flow
4. Verify you're redirected to `/payment/success` (not a 404 page)
5. Check that `/payment/failure` and `/payment/venmo-confirmation` pages also load correctly

---

### 2. Admin Override for Manual Payments
**Location:** Admin → Client Edit → Pricing Tab

**Features to test:**
- [ ] "Mark as Paid" button appears for pending payments
- [ ] "Mark as Failed" button appears for pending payments
- [ ] "Mark as Refunded" button appears for paid payments
- [ ] Payment status badge updates immediately after action
- [ ] Inventory is deducted when marking as paid
- [ ] Packing slip is generated when marking as paid

**How to test:**
1. Navigate to Admin → Clients → Select a client with pending payment
2. Go to the Pricing tab
3. Look for the Payment Status section
4. Click "Mark as Paid" and verify:
   - Status changes to "Paid"
   - Email notification is sent to client
   - Inventory is deducted (check Inventory page)
   - Packing slip is created (check Packing Slips page)

---

### 3. Payment Email Notifications
**Automatic emails sent when:**
- Payment is marked as received (success email)
- Payment fails (failure email with retry instructions)
- Payment is refunded (refund confirmation email)

**How to test:**
1. Mark a payment as paid → Check client receives success email
2. Mark a payment as failed → Check client receives failure email
3. Mark a payment as refunded → Check client receives refund email
4. Verify emails include order details and next steps

---

### 4. Payment History Dashboard
**Location:** Admin → Payment History (`/admin/payment-history`)

**Features to test:**
- [ ] View all payment transactions in table format
- [ ] Filter by status: Pending, Paid, Failed, Refunded
- [ ] Filter by date range (start date, end date)
- [ ] Filter by payment method: Venmo, CC, PayPal, Stripe, Other
- [ ] Search by client name or email
- [ ] View payment totals and statistics cards
- [ ] Monthly trends chart displays correctly
- [ ] Payment method breakdown pie chart
- [ ] Conversion rate tracking
- [ ] Pending follow-up alerts for overdue payments

---

### 5. Payment Reminder Emails
**Automatic reminders sent at:**
- 3 days after protocol sent (gentle reminder)
- 7 days after protocol sent (moderate reminder)
- 14 days after protocol sent (urgent reminder)

**How to test:**
1. Create a test client with pending payment
2. Wait for cron job to run (daily at 9 AM) or manually trigger
3. Verify reminder emails are sent at correct intervals
4. Verify reminder count is tracked (no duplicate emails)
5. Verify payment link is included in emails

---

### 6. Revenue Dashboard
**Location:** Admin → Payment History (`/admin/payment-history`)

**Features to test:**
- [ ] Total Revenue card shows correct amount
- [ ] Current Month Revenue card
- [ ] Previous Month Revenue card
- [ ] Weekly Revenue card
- [ ] Average Order Value calculation
- [ ] Amount column in payment history table
- [ ] Revenue breakdown by payment method
- [ ] Pending revenue shown in follow-up alerts

---

### 7. Revenue Goals/Targets
**Location:** Admin → Revenue Goals (`/admin/revenue-goals`)

**Features to test:**
- [ ] View current month progress bar
- [ ] Set monthly revenue targets for next 12 months
- [ ] Edit existing goals
- [ ] Delete goals
- [ ] Visual indicators: On Track (green), Behind (yellow), Exceeded (blue)
- [ ] Percentage of goal achieved displays correctly

**How to test:**
1. Navigate to Revenue Goals page
2. Click "Set Goal" for a future month
3. Enter target amount (e.g., $10,000)
4. Save and verify goal appears in the list
5. Check progress bar updates based on actual revenue

---

### 8. Admin Notification Settings
**Location:** Admin → Notification Settings (`/admin/notification-settings`)

**Features to test:**
- [ ] Enable/disable payment reminders globally
- [ ] Customize reminder schedule (change days: 3, 7, 14)
- [ ] Set maximum number of reminders
- [ ] Configure send time
- [ ] Preview shows how reminders will be sent
- [ ] Per-client notification preferences

**How to test:**
1. Navigate to Notification Settings
2. Toggle "Enable Payment Reminders" off
3. Verify no reminder emails are sent
4. Toggle back on and customize schedule
5. Verify new schedule is applied

---

### 9. Revenue Goal Alerts
**Automatic email alerts:**
- When monthly revenue goal is achieved (celebration email)
- When revenue is at risk (below 50% with less than 10 days remaining)

**How to test:**
1. Set a revenue goal for current month
2. Mark enough payments as paid to exceed goal
3. Verify admin receives "Goal Achieved" email
4. For "at risk" test: Set high goal, wait until mid-month with low revenue

---

### 10. Historical Goal Tracking
**Location:** Admin → Revenue Goals → Historical Tab

**Features to test:**
- [ ] View past 12 months performance
- [ ] Goal vs actual revenue for each month
- [ ] Trend analysis: Improving, Declining, Stable
- [ ] Bar chart visualization
- [ ] Summary cards: Total Revenue, Goals Achieved, Avg Monthly, Trend
- [ ] Status badges: Achieved, On Track, At Risk, Behind
- [ ] Toggle between Upcoming and Historical tabs

---

### 11. Client Payment Portal
**Location:** `/payments/:token` (client-facing)

**Features to test:**
- [ ] Client can view all their protocols
- [ ] Payment status displayed for each protocol
- [ ] Outstanding balances shown clearly
- [ ] Payment history with dates and amounts
- [ ] Payment method icons (PayPal, Venmo, CC)
- [ ] Status badges (Pending, Paid, Failed, Refunded)
- [ ] "Pay Now" links for outstanding balances
- [ ] Payment details dialog with item breakdown
- [ ] Summary cards: Total Paid, Outstanding, Total Protocols

**How to test:**
1. Get a client's access token from their protocol URL
2. Navigate to `/payments/{token}`
3. Verify all payment information displays correctly
4. Click on a payment to see item breakdown

---

### 12. Automated Goal Suggestions
**Location:** Admin → Revenue Goals → "AI Suggestions" button

**Features to test:**
- [ ] Click "AI Suggestions" to analyze historical data
- [ ] View suggested goals for upcoming months
- [ ] Confidence levels: High, Medium, Low
- [ ] Growth trend calculation
- [ ] "Apply Suggestion" button for individual months
- [ ] "Apply All Suggestions" button for bulk application
- [ ] Data quality warning when limited data available
- [ ] Statistics summary: Total Revenue, Average, Trend

**How to test:**
1. Navigate to Revenue Goals page
2. Click "AI Suggestions" button
3. Review suggested amounts and confidence levels
4. Click "Apply" on a suggestion to auto-fill goal
5. Click "Apply All" to fill all suggested goals

---

## Phase 8: HIPAA Compliance & Security

### 13. Audit Logging
**Location:** Admin → Audit Logs (`/admin/audit-logs`)

**Features to test:**
- [ ] View all audit log entries
- [ ] Filter by action type (role_change, user_created, etc.)
- [ ] View admin name, target user, action details
- [ ] PHI access logging
- [ ] 6-year retention policy

---

### 14. Field-Level Encryption
**Backend feature - verify in database:**
- [ ] Sensitive PHI fields are encrypted (AES-256-GCM)
- [ ] Encryption keys are properly managed
- [ ] Data can be decrypted when accessed by authorized users

---

### 15. Security Headers
**Verify in browser developer tools (Network tab):**
- [ ] Helmet middleware active
- [ ] Content Security Policy (CSP) headers present
- [ ] X-Frame-Options header
- [ ] X-Content-Type-Options header

---

## Phase 7: Testing & CI/CD

### 16. Role-Based Access Control
**Location:** Admin → Team Management (`/admin/team`)

**Roles to test:**
- **Admin:** Full access to everything
- **Manager:** Cannot modify admin accounts/settings
- **Viewer:** Read-only access to protocols, analytics, clients
- **Finance:** Manage payments, refunds, financial operations

**How to test:**
1. Create users with different roles
2. Log in as each role
3. Verify menu items are hidden/shown appropriately
4. Verify actions are restricted based on role

---

## Phase 6: E2E Testing & Refactoring

### 17. Store Waivers Management
**Location:** Admin → Store Waivers (`/admin/store-waivers`)

**Features to test:**
- [ ] View all signed waivers
- [ ] Filter by status: Active, Expiring Soon, Expired
- [ ] Bulk extend expiration (3/6/12/24 months)
- [ ] Bulk revoke waivers
- [ ] Send announcement emails to waiver holders
- [ ] View waiver renewal history
- [ ] Scheduled announcements
- [ ] Announcement templates

---

## Phase 5: Component Library

### 18. Shared UI Components
**Verify these components work throughout the app:**
- [ ] TableSkeleton (loading states)
- [ ] EmptyState (no data scenarios)
- [ ] ProgressBar and StepProgress
- [ ] StatusBadge (consistent status display)
- [ ] LoadingSpinner (FullPageLoader, InlineLoader, ButtonLoader)
- [ ] InfoTooltip and LabelWithTooltip
- [ ] CopyButton and CopyField
- [ ] ConfirmDialog and DeleteConfirmDialog
- [ ] Breadcrumb navigation

---

## Phase 4: Admin Efficiency

### 19. Keyboard Shortcuts
**Test these shortcuts:**
- [ ] `Cmd+K` (or `Ctrl+K`): Global search
- [ ] `Cmd+N`: New client
- [ ] `Cmd+Shift+N`: New template
- [ ] `Cmd+/`: Help dialog

---

### 20. Quick Actions Button
**Location:** Floating button on admin dashboard

**Features to test:**
- [ ] Quick Actions button visible on dashboard
- [ ] Opens menu with common actions
- [ ] Fast navigation to frequently used features

---

### 21. Today's Tasks Widget
**Location:** Admin Dashboard

**Features to test:**
- [ ] Shows pending actions for today
- [ ] Overdue follow-ups highlighted
- [ ] Click to navigate to relevant page

---

## Earlier Features (Phases 1-3)

### 22. Peptide Cheat Sheet
**Location:** `/peptide-cheat-sheet` and Admin → Peptides

**Features to test:**
- [ ] View all peptides by category
- [ ] Search and filter peptides
- [ ] Admin: Add/edit/delete peptides
- [ ] Admin: Upload images/PDFs for peptides
- [ ] User: Favorite peptides
- [ ] User: View favorites in profile

---

### 23. Client Dashboard
**Location:** `/dashboard` (client-facing)

**Features to test:**
- [ ] Welcome message with time-based greeting
- [ ] Quick stats showing protocol overview
- [ ] Quick links to protocol, store, messages
- [ ] Recent activity section
- [ ] My Progress tracker

---

### 24. Booking Calendar System
**Location:** Admin → Booking Calendar

**Features to test:**
- [ ] View calendar with appointments
- [ ] Set availability hours per day
- [ ] Block vacation/time off
- [ ] Client booking page
- [ ] Available slot picker
- [ ] 24-hour reminder emails
- [ ] 1-hour reminder emails

---

### 25. Coupon Code System
**Location:** Admin → Coupons

**Features to test:**
- [ ] Create coupons with discount percentage
- [ ] Set usage type: One-time, Multi-use, Unlimited
- [ ] Set expiration dates
- [ ] Bulk coupon generation
- [ ] Coupon analytics dashboard
- [ ] Auto-deactivation when max uses reached
- [ ] Expiration reminders

---

### 26. Client Projects (Back-Office)
**Location:** Admin → Client Projects

**Features to test:**
- [ ] View all client projects
- [ ] Filter by lifecycle stage
- [ ] Task and subtask management
- [ ] Assign tasks to team members
- [ ] File attachments (S3 storage)
- [ ] Packing slips embedded in project view
- [ ] Drag-and-drop task reordering

---

### 27. Email Tracking
**Features to test:**
- [ ] Email sent status on client list
- [ ] Email opened status on client list
- [ ] Click-through tracking
- [ ] Email analytics widget on dashboard

---

### 28. Clone Protocol Feature
**Location:** Admin → Client Edit → Clone button

**Features to test:**
- [ ] Clone to new client
- [ ] Clone to existing client
- [ ] Bulk clone to multiple clients
- [ ] Clone history tracking
- [ ] "New from Template" quick action

---

### 29. Template Management
**Location:** Admin → Templates

**Features to test:**
- [ ] Create/edit templates
- [ ] Drag-and-drop item reordering
- [ ] Copy items from another template
- [ ] Template preview mode
- [ ] Template categories/tags
- [ ] Sync with Protocol Items
- [ ] Out-of-sync indicator

---

### 30. Inventory Management
**Location:** Admin → Inventory

**Features to test:**
- [ ] View all inventory items
- [ ] Edit item details (name, price, SKU)
- [ ] Adjust quantities
- [ ] Low stock alerts
- [ ] Category management
- [ ] Protocol-to-inventory mapping
- [ ] Duplicate scanner

---

## Test Account Information

**Admin Test Account:**
- Email: [Your admin email]
- Password: [Your admin password]

**Client Test Account:**
- Email: [Test client email]
- Password: [Test client password]

**Test Payment Cards:**
- PayPal Sandbox: Use PayPal sandbox credentials
- Stripe Test: 4242 4242 4242 4242 (any future date, any CVC)

---

## Reporting Issues

When reporting issues, please include:
1. **Feature name** from this list
2. **Steps to reproduce** the issue
3. **Expected behavior** vs **Actual behavior**
4. **Screenshots** if applicable
5. **Browser and device** information

---

## Questions?

Contact the development team for any questions about testing these features.
