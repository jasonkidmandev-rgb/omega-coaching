# PeptideCoach.Pro: Next Sprint Improvement Priorities

## Presentation Overview
- **Audience:** Development team and stakeholders
- **Purpose:** Prioritize technical improvements for the next development sprint
- **Tone:** Professional, action-oriented, data-driven

---

## Slide 1: Title Slide

**Title:** PeptideCoach.Pro Technical Improvement Roadmap

**Subtitle:** High & Medium Priority Items for Next Sprint

**Date:** January 2026

**Prepared by:** Development Team

**Image:** /home/ubuntu/health-coach-protocol-app/slide_images/roadmap.png

---

## Slide 2: Application Health Overview

**Heading:** Current Application Status: Production-Ready with Optimization Opportunities

**Key Points:**
- 31 admin pages, 38 components, 17 public pages all functioning correctly
- 24 test files covering critical payment, email, and client management flows
- Database schema with 50+ tables properly structured with relationships
- Role-based permission system with 5 user roles fully implemented
- All major features tested and operational in production

**Supporting Data:**
- 0 TypeScript compilation errors
- 12 active client protocols currently in system
- 15 team members with proper role assignments

---

## Slide 3: High Priority - Security Enhancement

**Heading:** Rate Limiting Required on Public Endpoints to Prevent Abuse

**Image:** /home/ubuntu/health-coach-protocol-app/slide_images/security.jpg

**The Problem:**
- Public tracking endpoints (`/api/track/open/:id`, `/api/track/click/:id`) have no request limits
- Login and authentication endpoints vulnerable to brute force attempts
- Email sending endpoints could be exploited for spam

**Recommended Solution:**
- Implement express-rate-limit middleware with 100 requests/15 minutes for public endpoints
- Add stricter limits (5 attempts/15 minutes) for authentication endpoints
- Log and alert on rate limit violations

**Impact:** Prevents potential DDoS attacks and abuse of email system

**Effort:** 4-6 hours implementation

---

## Slide 4: High Priority - Code Maintainability

**Heading:** ClientEdit.tsx at 3,293 Lines Requires Immediate Refactoring

**Current State:**
- Single file contains 33 useState hooks, 17 mutations, 19 queries
- 8 distinct tab sections ranging from 11 to 751 lines each
- 114 Dialog component usages embedded inline
- Cognitive complexity makes debugging and testing difficult

**Proposed Structure:**
- Extract 8 tab components (DetailsTab, ItemsTab, PricingTab, etc.)
- Create 5 dialog components (CloneDialog, EmailDialog, etc.)
- Centralize data fetching in custom hooks
- Reduce main component to ~400 lines

**Impact:** Improved maintainability, easier testing, faster onboarding for new developers

**Effort:** 6 development days (detailed plan available)

---

## Slide 5: Medium Priority - Database Performance

**Heading:** 12 Missing Database Indexes Causing Unnecessary Full Table Scans

**Image:** /home/ubuntu/health-coach-protocol-app/slide_images/database.jpg

**Most Critical Missing Indexes:**

| Table | Column | Query Frequency | Expected Improvement |
|-------|--------|-----------------|---------------------|
| notifications | userId | Every page load | 80-95% faster |
| clientProtocolItems | clientProtocolId | Every protocol view | 70-90% faster |
| emailEvents | trackingToken | Every email open | 90% faster |
| clientProtocols | clientEmail | Client lookups | 60-80% faster |

**Implementation:**
- Add indexes to Drizzle schema
- Run `pnpm db:push` to apply
- No code changes required

**Impact:** Faster page loads, reduced database CPU usage

**Effort:** 2-3 hours implementation

---

## Slide 6: Medium Priority - Frontend Performance

**Heading:** Code Splitting Not Implemented - All Admin Pages Load Upfront

**Image:** /home/ubuntu/health-coach-protocol-app/slide_images/bundle.webp

**Current State:**
- No React.lazy or Suspense usage found in codebase
- All 31 admin pages bundled together
- Initial JavaScript bundle larger than necessary
- Slower first-load experience for users

**Recommended Solution:**
- Implement route-based code splitting with React.lazy
- Add Suspense boundaries with loading skeletons
- Prioritize splitting for heavy components (charts, PDF generation)

**Expected Results:**
- 30-50% reduction in initial bundle size
- Faster time-to-interactive for first page load
- Better Core Web Vitals scores

**Effort:** 1-2 development days

---

## Slide 7: Medium Priority - Accessibility Compliance

**Heading:** 10+ Images Missing Alt Text and 416 Non-Semantic Click Handlers

**Image:** /home/ubuntu/health-coach-protocol-app/slide_images/accessibility.jpg

**Accessibility Issues Found:**

| Issue | Count | Impact |
|-------|-------|--------|
| Images without alt text | 10+ | Screen readers cannot describe images |
| onClick on non-button elements | 416 | Keyboard navigation broken |
| Missing ARIA labels | Multiple | Assistive technology confusion |

**Affected Files:**
- ManusDialog.tsx, LaunchpadHub.tsx, Partners.tsx
- ClientEdit.tsx, PackingSlipDetail.tsx, StoreWaivers.tsx
- Client Dashboard components

**Solution:**
- Add descriptive alt text to all images
- Convert clickable divs to buttons or add role="button"
- Add aria-label to icon-only buttons

**Effort:** 4-6 hours

---

## Slide 8: Medium Priority - Test Coverage Gaps

**Heading:** New Features Lack Test Coverage - Roles, Audit Logs, Team Invitations

**Image:** /home/ubuntu/health-coach-protocol-app/slide_images/testing.jpeg

**Features Without Tests:**

| Feature | Risk Level | Recommended Tests |
|---------|------------|-------------------|
| Role-based permissions | High | Unit tests for each role's access |
| Audit logging | Medium | Integration tests for log creation |
| Team invitations | Medium | E2E tests for invite flow |
| Announcement tracking | Low | Unit tests for open/click tracking |

**Current Coverage:**
- 24 test files exist for payments, email, client management
- New role system (5 roles) has no dedicated tests
- Audit log creation not verified by tests

**Impact:** Reduced confidence in permission system, potential security gaps

**Effort:** 2-3 development days

---

## Slide 9: Sprint Planning Summary

**Heading:** Recommended Sprint Allocation: 2 Weeks of Focused Improvement

**Week 1 Focus:**
- Day 1-2: Add database indexes (2-3 hours) + Rate limiting (4-6 hours)
- Day 3-4: Begin ClientEdit.tsx refactoring (extract types, hooks)
- Day 5: Fix accessibility issues (alt text, ARIA labels)

**Week 2 Focus:**
- Day 1-3: Complete ClientEdit.tsx refactoring (extract tab components)
- Day 4: Implement code splitting for admin routes
- Day 5: Add tests for role-based permissions

**Total Estimated Effort:**
- High Priority Items: 7-8 days
- Medium Priority Items: 4-5 days
- Buffer for testing/review: 1-2 days

---

## Slide 10: Expected Outcomes

**Heading:** Sprint Completion Will Deliver Measurable Improvements

**Security:**
- Rate limiting prevents abuse of public endpoints
- Audit logging tested and verified

**Performance:**
- 60-90% faster database queries with new indexes
- 30-50% smaller initial JavaScript bundle
- Improved Core Web Vitals scores

**Maintainability:**
- ClientEdit.tsx reduced from 3,293 to ~400 lines
- 18 new focused, testable components
- Easier onboarding for new developers

**Quality:**
- Accessibility compliance for screen readers
- Test coverage for critical permission system
- Reduced technical debt

---

## Slide 11: Next Steps

**Heading:** Immediate Actions to Begin Sprint

**This Week:**
1. Review and approve this improvement plan
2. Create Jira/Linear tickets for each work item
3. Assign developers to high-priority items
4. Schedule code review sessions for refactoring work

**Resources Needed:**
- 1-2 senior developers for refactoring work
- QA time for regression testing
- Stakeholder availability for accessibility review

**Documentation Available:**
- ClientEdit Refactoring Plan (detailed 6-day breakdown)
- Missing Database Indexes (with Drizzle schema code)
- Deep Dive Evaluation Report (full technical analysis)

---

## Slide 12: Questions & Discussion

**Heading:** Ready to Discuss Priorities and Timeline

**Key Discussion Points:**
- Should we prioritize security (rate limiting) or performance (indexes)?
- Is the 6-day refactoring timeline acceptable?
- Do we need additional test coverage beyond role permissions?
- Any concerns about the proposed changes?

**Contact:**
- Technical questions: Review attached documentation
- Sprint planning: Schedule follow-up meeting

---

*End of Presentation Content*
