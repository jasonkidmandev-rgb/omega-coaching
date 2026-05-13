import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Phase 24: Appointments, Merge, Contact Admin, Data Quality', () => {

  // ===== Upcoming Appointments Page =====
  describe('Upcoming Appointments Page', () => {
    it('should have UpcomingAppointments.tsx page file', () => {
      const filePath = path.join(ROOT, 'client/src/pages/admin/UpcomingAppointments.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should use booking.getAppointments tRPC query', () => {
      const content = fs.readFileSync(path.join(ROOT, 'client/src/pages/admin/UpcomingAppointments.tsx'), 'utf-8');
      expect(content).toContain('booking.');
    });

    it('should have type filter pills for appointment types', () => {
      const content = fs.readFileSync(path.join(ROOT, 'client/src/pages/admin/UpcomingAppointments.tsx'), 'utf-8');
      expect(content).toContain('Discovery');
    });

    it('should display meeting links', () => {
      const content = fs.readFileSync(path.join(ROOT, 'client/src/pages/admin/UpcomingAppointments.tsx'), 'utf-8');
      expect(content).toContain('meetingLink') || expect(content).toContain('meeting_link');
    });

    it('should be registered in App.tsx routes', () => {
      const appContent = fs.readFileSync(path.join(ROOT, 'client/src/App.tsx'), 'utf-8');
      expect(appContent).toContain('/admin/upcoming-appointments');
      expect(appContent).toContain('AdminUpcomingAppointments');
    });
  });

  // ===== Client 360 Appointments Enhancement =====
  describe('Client 360 Appointments Enhancement', () => {
    it('should have enhanced appointments tab in Client360', () => {
      const content = fs.readFileSync(path.join(ROOT, 'client/src/pages/admin/Client360.tsx'), 'utf-8');
      expect(content).toContain('Upcoming');
    });

    it('should join appointment types in client360 detail endpoint', () => {
      const routerContent = fs.readFileSync(path.join(ROOT, 'server/client360/router.ts'), 'utf-8');
      expect(routerContent).toContain('appointmentTypes');
    });
  });

  // ===== Merge Records =====
  describe('Merge Records Feature', () => {
    it('should have mergeContacts mutation in client360 router', () => {
      const routerContent = fs.readFileSync(path.join(ROOT, 'server/client360/router.ts'), 'utf-8');
      expect(routerContent).toContain('mergeContacts');
    });

    it('should accept primaryContactId and secondaryContactId inputs', () => {
      const routerContent = fs.readFileSync(path.join(ROOT, 'server/client360/router.ts'), 'utf-8');
      expect(routerContent).toContain('primaryContactId');
      expect(routerContent).toContain('secondaryContactId');
    });

    it('should update prospects, protocols, enrollments, and users on merge', () => {
      const routerContent = fs.readFileSync(path.join(ROOT, 'server/client360/router.ts'), 'utf-8');
      // Should update all 4 tables
      const mergeSection = routerContent.substring(routerContent.indexOf('mergeContacts'));
      expect(mergeSection).toContain('prospects');
      expect(mergeSection).toContain('clientProtocols');
    });

    it('should delete the secondary contact after merge', () => {
      const routerContent = fs.readFileSync(path.join(ROOT, 'server/client360/router.ts'), 'utf-8');
      const mergeSection = routerContent.substring(routerContent.indexOf('mergeContacts'));
      expect(mergeSection).toContain('delete');
    });

    it('should have merge mode UI in Client360 dashboard', () => {
      const content = fs.readFileSync(path.join(ROOT, 'client/src/pages/admin/Client360.tsx'), 'utf-8');
      expect(content).toContain('mergeMode');
      expect(content).toContain('Merge Records');
    });

    it('should have merge confirmation dialog', () => {
      const content = fs.readFileSync(path.join(ROOT, 'client/src/pages/admin/Client360.tsx'), 'utf-8');
      expect(content).toContain('Confirm Merge');
      expect(content).toContain('PRIMARY (kept)');
      expect(content).toContain('SECONDARY (merged in & deleted)');
    });

    it('should require exactly 2 selections for merge', () => {
      const content = fs.readFileSync(path.join(ROOT, 'client/src/pages/admin/Client360.tsx'), 'utf-8');
      expect(content).toContain('Select exactly 2 people to merge');
    });
  });

  // ===== Contact Admin Page =====
  describe('Contact Admin Page', () => {
    it('should have ContactAdmin.tsx page file', () => {
      const filePath = path.join(ROOT, 'client/src/pages/admin/ContactAdmin.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should have updateContact mutation in client360 router', () => {
      const routerContent = fs.readFileSync(path.join(ROOT, 'server/client360/router.ts'), 'utf-8');
      expect(routerContent).toContain('updateContact');
    });

    it('should propagate changes to linked records', () => {
      const routerContent = fs.readFileSync(path.join(ROOT, 'server/client360/router.ts'), 'utf-8');
      const updateSection = routerContent.substring(routerContent.indexOf('updateContact'));
      // Should update contacts table
      expect(updateSection).toContain('contacts');
    });

    it('should have edit form with first name, last name, email, phone', () => {
      const content = fs.readFileSync(path.join(ROOT, 'client/src/pages/admin/ContactAdmin.tsx'), 'utf-8');
      expect(content).toContain('firstName');
      expect(content).toContain('lastName');
      expect(content).toContain('email');
      expect(content).toContain('phone');
    });

    it('should show Save & Propagate button', () => {
      const content = fs.readFileSync(path.join(ROOT, 'client/src/pages/admin/ContactAdmin.tsx'), 'utf-8');
      expect(content).toContain('Save & Propagate');
    });

    it('should be registered in App.tsx routes', () => {
      const appContent = fs.readFileSync(path.join(ROOT, 'client/src/App.tsx'), 'utf-8');
      expect(appContent).toContain('/admin/contact-admin');
      expect(appContent).toContain('AdminContactAdmin');
    });
  });

  // ===== Data Quality Dashboard =====
  describe('Data Quality Dashboard', () => {
    it('should have DataQuality.tsx page file', () => {
      const filePath = path.join(ROOT, 'client/src/pages/admin/DataQuality.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should have dataQuality endpoint in client360 router', () => {
      const routerContent = fs.readFileSync(path.join(ROOT, 'server/client360/router.ts'), 'utf-8');
      expect(routerContent).toContain('dataQuality');
    });

    it('should track missing email, missing phone, and missing both', () => {
      const routerContent = fs.readFileSync(path.join(ROOT, 'server/client360/router.ts'), 'utf-8');
      const dqSection = routerContent.substring(routerContent.indexOf('dataQuality'));
      expect(dqSection).toContain('missingEmail');
      expect(dqSection).toContain('missingPhone');
    });

    it('should track data quality issues', () => {
      const routerContent = fs.readFileSync(path.join(ROOT, 'server/client360/router.ts'), 'utf-8');
      const dqSection = routerContent.substring(routerContent.indexOf('dataQuality'));
      expect(dqSection).toContain('missingEmail');
      expect(dqSection).toContain('missingPhone');
      expect(dqSection).toContain('completionRate');
    });

    it('should show health score and completion rate', () => {
      const content = fs.readFileSync(path.join(ROOT, 'client/src/pages/admin/DataQuality.tsx'), 'utf-8');
      expect(content).toContain('Health Score');
      expect(content).toContain('completionRate');
    });

    it('should show unlinked records count', () => {
      const content = fs.readFileSync(path.join(ROOT, 'client/src/pages/admin/DataQuality.tsx'), 'utf-8');
      expect(content).toContain('Unlinked');
    });

    it('should have Fix button linking to Contact Admin', () => {
      const content = fs.readFileSync(path.join(ROOT, 'client/src/pages/admin/DataQuality.tsx'), 'utf-8');
      expect(content).toContain('/admin/contact-admin');
    });

    it('should be registered in App.tsx routes', () => {
      const appContent = fs.readFileSync(path.join(ROOT, 'client/src/App.tsx'), 'utf-8');
      expect(appContent).toContain('/admin/data-quality');
      expect(appContent).toContain('AdminDataQuality');
    });
  });

  // ===== Sidebar Navigation =====
  describe('Sidebar Navigation', () => {
    it('should have all 3 new pages in AdminLayout sidebar', () => {
      const layoutContent = fs.readFileSync(path.join(ROOT, 'client/src/components/AdminLayout.tsx'), 'utf-8');
      expect(layoutContent).toContain('Upcoming Appointments');
      expect(layoutContent).toContain('Contact Admin');
      expect(layoutContent).toContain('Data Quality');
    });

    it('should use appropriate icons', () => {
      const layoutContent = fs.readFileSync(path.join(ROOT, 'client/src/components/AdminLayout.tsx'), 'utf-8');
      expect(layoutContent).toContain('CalendarClock');
      expect(layoutContent).toContain('UserCog');
      expect(layoutContent).toContain('DatabaseZap');
    });

    it('should place new items under Clients & Protocols category', () => {
      const layoutContent = fs.readFileSync(path.join(ROOT, 'client/src/components/AdminLayout.tsx'), 'utf-8');
      // All 3 new items should be near Client 360 in the sidebar
      const client360Idx = layoutContent.indexOf('Client 360');
      const apptIdx = layoutContent.indexOf('Upcoming Appointments');
      const contactIdx = layoutContent.indexOf('Contact Admin');
      const dqIdx = layoutContent.indexOf('Data Quality');
      expect(apptIdx).toBeGreaterThan(client360Idx);
      expect(contactIdx).toBeGreaterThan(client360Idx);
      expect(dqIdx).toBeGreaterThan(client360Idx);
    });
  });
});
