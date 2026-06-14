# App Cleanup Tracker

Last updated: 2026-06-10

---

## Removals

### ✅ Done
- **Client 360** — route, sidebar link, page component, and all deep-links removed (`669c3ac`)

---

### 🔴 Remove — Clear-cut (no dependencies)

| Feature | Route | File | Status |
|---------|-------|------|--------|
| Protocol Analytics | `/admin/protocol-analytics` | `pages/admin/ProtocolAnalytics.tsx` | ✅ Done |
| Pending Enrollments | `/admin/pending-enrollments` | `pages/admin/PendingEnrollments.tsx` | ✅ Done |
| Sales Report | `/admin/sales-report` | `pages/admin/SalesReport.tsx` | ✅ Done |
| Reports (Payments & Finance) | `/admin/reports` | `pages/admin/projects/Reports.tsx` | ✅ Done |
| Revenue Goals | `/admin/revenue-goals` | `pages/admin/RevenueGoals.tsx` | ✅ Done |
| Protocol Coupons | `/admin/coupons` | `pages/admin/Coupons.tsx` | ✅ Done |
| Affiliate Analytics | `/admin/affiliate-analytics` | `pages/admin/AffiliateAnalytics.tsx` | ✅ Done |
| Shannon Pipeline Scorecard | `/admin/pipeline-scorecard` | `pages/admin/PipelineScorecard.tsx` | ✅ Done |
| Automation Dashboard | `/admin/automation` | `pages/admin/AutomationDashboard.tsx` | ✅ Done |
| Check-in Analytics | `/admin/checkin-analytics` | `pages/admin/CheckinAnalytics.tsx` | ✅ Done |
| Consultation Notes | `/admin/consultation-notes` | `pages/admin/ConsultationNotes.tsx` | ✅ Done |
| QA Testing | `/admin/qa-testing` | `pages/admin/QATestingDashboard.tsx` | ✅ Done |
| Product Management | `/admin/product-management` | `pages/admin/ProductManagement.tsx` | ✅ Done |
| Push Notifications page | `/admin/push-notifications` | `pages/admin/PushNotifications.tsx` | ✅ Done (SMS/push backend code — separate task) |
| PaymentReconciliation (orphaned) | — | `pages/admin/PaymentReconciliation.tsx` | ✅ Deleted — reconciliation UI lives in PricingTab |

---

### 🟡 Remove — Pre-step Required First

| Feature | Route | Pre-step Needed | Status |
|---------|-------|-----------------|--------|
| Recommendations | `/admin/recommendations` | Ported into Program Guide as Guidelines tab. Data preserved in DB. Admin page removed (`0b99f77`) | ✅ Done |

---

### 🔵 Remove — Needs Investigation First

| Feature | Route | What to Investigate | Status |
|---------|-------|---------------------|--------|
| Operations | `/admin/operations` | Different kanban view of same data as Client Projects — redundant, no unique endpoints. Investigated in `docs/investigation-audit.md` | ✅ Done |
| Data Quality | `/admin/data-quality` | Read-only diagnostic pointing to Contact Admin — no standalone value. Investigated in `docs/investigation-audit.md` | ✅ Done |
| Audit Logs | `/admin/audit-logs` | **KEPT** — security/compliance log viewer for role changes & admin actions. See audit doc. | 🔴 Kept |
| Launchpad Settings | `/admin/launchpad-settings` | **KEPT** — `/launchpad` URL embedded in client welcome emails; it's the onboarding entry point. See audit doc. | 🔴 Kept |

---

## New Features / Fixes

| Item | Priority | Notes | Status |
|------|----------|-------|--------|
| Packing Slips | 🔴 High | Full overhaul: 21 audit fixes, ship source tracking, per-item tracking numbers, audit log, lock/unlock, sign & verify, mismatch detection, batch PDF, Packing Mode, grouped sections, Quick Fulfill by Type, batch fulfill mutation | ✅ Done |
| Fulfillment Queue | 🔴 High | Fully redesigned: urgency groups, progress bars, split-pane master/detail layout, cross-links to packing slip detail and backorders | ✅ Done |
| Backorders page | 🔴 High | New `/admin/backorders` page with item cards, ship-source badges, tracking links | ✅ Done |
| Payment system overhaul | 🔴 High | Stripe webhook → client_protocols sync fixed; shared `processProtocolPaymentReceived()` service; PricingTab shows Stripe enrollment panel + sync gap detection + one-click fix; `paymentMethod` enum migration applied to Railway DB | ✅ Done |
| Back buttons | 🟡 Medium | Audit done: CheckinReview + ProtocolPresets destinations fixed, NotificationSettings back button added (`699de91`) | ✅ Done |
| omegalongevity.com purchase webhook | 🔴 High | Endpoint live: HMAC-signed `/api/external/omegalongevity/v1/purchase`, event log + replay, product mappings, provisioning service. Migration 0115 applied to Railway; secret set in Railway; Settings → External Integrations UI (`/admin/integrations`) for mappings + event log; spec doc sent to Alex. Remaining: add mappings when Alex sends package list, then live test purchase | 🟡 Partial |
| Lead Pipeline + Shannon Kanban | 🟡 Medium | Align the two views per recent discussion | ⬜ Pending |
| Manage Check-ins | 🟡 Medium | Page exists and bugs fixed. Goal of surfacing through Client Corner view not yet done | 🟡 Partial |
| Check-in global kill switch | 🔴 High | Root cause of "disabled but still sending": no global off — disable was per-schedule + selection-based, and `updateEngagementLevel` silently re-enabled schedules. Fix: `checkins_globally_enabled` site setting enforced in every send path (scheduled/reminders/low-score/manual trigger) and in the engagement auto-enable; toggle on Check-in Management page. **Default OFF** (fail-safe) — check-ins disabled platform-wide until explicitly turned on | ✅ Done |
| Coaching Payments — remove test payments | 🟡 Medium | Delete button + confirm dialog on each payment card; `transformation.deletePayment` mutation handles both pending-payment rows and auto-verified enrollment records | ✅ Done |
| Calendly Integration | 🟡 Medium | 450-line settings page exists, env vars added. Two-way sync untested, flow not yet simplified | 🟡 Partial |
| Email & Notifications overhaul | 🟢 Low | Resend migration done (major). Efficiency improvements still pending | 🟡 Partial |
| Data Integrity Audit → prevent at entry | 🟢 Low | Long-term: prevent bad data at the point of entry so this tool becomes unnecessary, then remove it | ⬜ Pending |
| SMS / Push notification code | 🟢 Low | Removed: smsService (both), pushNotification.ts, push router, prospect SMS sending/templates/cron, Account SMS toggle, NotificationSettings push tab, dashboard push banners, sw.js push handlers, twilio/web-push deps. SMS history display + DB tables kept | ✅ Done |

---

## Notes

- **Coaching Promos** — NOT being removed. Only Protocol Coupons (unused). The coaching promos feature is actively used and stays.
- **Recommendations list** — before removing the Recommendations page, the full list must be copied into a separate document so it can be added to program guide templates.
- **Sales Report vs Payment History** — Sales Report (Fulfillment section) overlaps with Payment History (Payments & Finance). Sales Report is being removed; Payment History stays.
