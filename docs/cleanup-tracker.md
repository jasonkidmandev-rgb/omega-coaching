# App Cleanup Tracker

Last updated: 2026-06-07

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
| Packing Slips | 🔴 High | Lisa's report sent — top priority | ⬜ Pending |
| Fulfillment Queue | 🔴 High | Make less redundant and more obvious/accessible | ⬜ Pending |
| Back buttons | 🟡 Medium | Many admin pages don't navigate back correctly — needs a pass across all pages | ⬜ Pending |
| Lead Pipeline + Shannon Kanban | 🟡 Medium | Align the two views per recent discussion | ⬜ Pending |
| Manage Check-ins | 🟡 Medium | Currently very inefficient — explore surfacing through the client corner view | ⬜ Pending |
| Coaching Payments — remove test payments | 🟡 Medium | Add an easy way to delete test/dummy payment records | ⬜ Pending |
| Calendly Integration | 🟡 Medium | Lisa & Shannon need to schedule the coach with clients directly through the app. Current booking calendar page exists but is untested and possibly over-complex. Needs: (1) test if two-way sync works, (2) simplify the flow | ⬜ Pending |
| Email & Notifications overhaul | 🟢 Low | Generally working but needs efficiency improvements | ⬜ Pending |
| Data Integrity Audit → prevent at entry | 🟢 Low | Long-term: prevent bad data at the point of entry so this tool becomes unnecessary, then remove it | ⬜ Pending |
| SMS / Push notification code | 🟢 Low | Remove all Twilio and push notification backend code — push doesn't work on mobile install anyway | ⬜ Pending |

---

## Notes

- **Coaching Promos** — NOT being removed. Only Protocol Coupons (unused). The coaching promos feature is actively used and stays.
- **Recommendations list** — before removing the Recommendations page, the full list must be copied into a separate document so it can be added to program guide templates.
- **Sales Report vs Payment History** — Sales Report (Fulfillment section) overlaps with Payment History (Payments & Finance). Sales Report is being removed; Payment History stays.
