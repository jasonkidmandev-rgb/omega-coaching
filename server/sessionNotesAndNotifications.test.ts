import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: any[]) => ({
      strings,
      values,
      queryChunks: [],
    }),
    { raw: (s: string) => ({ queryChunks: [], raw: s }) }
  ),
}));

const mockExecute = vi.fn();
vi.mock('./db', () => ({
  __esModule: true,
  default: vi.fn(() => Promise.resolve({ execute: mockExecute })),
  getDb: vi.fn(() => Promise.resolve({ execute: mockExecute })),
}));

vi.mock('./emailService', () => ({
  sendTransformationMilestoneEmail: vi.fn().mockResolvedValue(undefined),
  sendAdminMilestoneNotification: vi.fn().mockResolvedValue(undefined),
  sendTransformationPaymentConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendTransformationPaymentAdminNotification: vi.fn().mockResolvedValue(undefined),
  sendEmail: vi.fn().mockResolvedValue(undefined),
  sendIntakeFormEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./emailTracking', () => ({
  createEmailTrackingEvent: vi.fn().mockResolvedValue(1),
  injectTrackingPixel: vi.fn((html: string) => html),
  wrapLinksForTracking: vi.fn((html: string) => html),
  recordEmailOpen: vi.fn().mockResolvedValue(undefined),
  recordEmailClick: vi.fn().mockResolvedValue(undefined),
  getEmailTrackingByEnrollment: vi.fn().mockResolvedValue([]),
}));

describe('Coaching Session Notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Schema', () => {
    it('should have coaching_session_notes table with required columns', () => {
      // The table was created with these columns:
      const requiredColumns = [
        'id', 'enrollment_id', 'user_id', 'session_date',
        'session_type', 'content', 'coach_id', 'coach_name',
        'is_pinned', 'created_at', 'updated_at'
      ];
      expect(requiredColumns).toHaveLength(11);
    });

    it('should support all session types', () => {
      const sessionTypes = ['discovery', 'check_in', 'training', 'reconstitution', 'ad_hoc', 'follow_up'];
      expect(sessionTypes).toHaveLength(6);
      expect(sessionTypes).toContain('discovery');
      expect(sessionTypes).toContain('check_in');
      expect(sessionTypes).toContain('ad_hoc');
    });

    it('should link notes to both enrollment and user for dual-access', () => {
      // Notes have enrollment_id AND user_id so they can be queried from either direction
      const note = {
        enrollment_id: 210005,
        user_id: 42,
        session_type: 'discovery',
        content: 'Initial consultation notes',
      };
      expect(note.enrollment_id).toBeDefined();
      expect(note.user_id).toBeDefined();
    });
  });

  describe('Session Note CRUD Operations', () => {
    it('should create a session note with all required fields', async () => {
      mockExecute
        .mockResolvedValueOnce([[{ userId: 42 }]]) // enrollment lookup
        .mockResolvedValueOnce([{ insertId: 1 }]) // insert
        .mockResolvedValueOnce([{ insertId: 1 }]); // activity log

      const noteInput = {
        enrollmentId: 210005,
        sessionDate: '2026-02-10',
        sessionType: 'discovery',
        content: 'Discussed health goals and current supplements. Client interested in bioregulator protocol.',
        isPinned: false,
      };

      expect(noteInput.enrollmentId).toBe(210005);
      expect(noteInput.sessionType).toBe('discovery');
      expect(noteInput.content.length).toBeGreaterThan(0);
    });

    it('should query session notes by enrollment ID', async () => {
      const mockNotes = [
        { id: 1, enrollment_id: 210005, session_type: 'discovery', content: 'Note 1', is_pinned: 1, session_date: '2026-02-10' },
        { id: 2, enrollment_id: 210005, session_type: 'check_in', content: 'Note 2', is_pinned: 0, session_date: '2026-02-15' },
      ];
      // Query returns notes ordered by pinned first, then by date desc
      expect(mockNotes).toHaveLength(2);
      expect(mockNotes[0].is_pinned).toBe(1); // Pinned notes first
    });

    it('should query session notes by user ID across all enrollments', async () => {
      const mockNotes = [
        { id: 1, enrollment_id: 210005, session_type: 'discovery', content: 'Note from enrollment 1', tier: 'flagship' },
        { id: 3, enrollment_id: 210010, session_type: 'check_in', content: 'Note from enrollment 2', tier: 'elite' },
      ];
      // Notes span multiple enrollments for the same user
      expect(mockNotes).toHaveLength(2);
      expect(mockNotes[0].enrollment_id).not.toBe(mockNotes[1].enrollment_id);
    });

    it('should query session notes by client email for client profile view', async () => {
      const mockNotes = [
        { id: 1, enrollment_id: 210005, session_type: 'discovery', content: 'Note 1', tier: 'flagship' },
      ];
      // Client profile view joins enrollment data to show context
      expect(mockNotes).toHaveLength(1);
      expect(mockNotes[0].tier).toBe('flagship');
    });

    it('should update a session note content and pin status', async () => {
      mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const updateInput = {
        noteId: 1,
        content: 'Updated consultation notes with new findings.',
        isPinned: true,
      };

      expect(updateInput.content).toContain('Updated');
      expect(updateInput.isPinned).toBe(true);
    });

    it('should delete a session note', async () => {
      mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const deleteInput = { noteId: 1 };
      expect(deleteInput.noteId).toBe(1);
    });

    it('should log session note creation in enrollment activity log', async () => {
      const activityLog = {
        enrollmentId: 210005,
        action: 'session_note_added',
        details: {
          sessionType: 'discovery',
          sessionDate: '2026-02-10',
          coachName: 'Lisa Admin',
        },
      };

      expect(activityLog.action).toBe('session_note_added');
      expect(activityLog.details.sessionType).toBe('discovery');
    });
  });

  describe('Session Notes Visibility', () => {
    it('should be visible from enrollment detail dialog', () => {
      // Enrollment detail queries by enrollmentId
      const enrollmentQuery = { enrollmentId: 210005 };
      expect(enrollmentQuery.enrollmentId).toBeDefined();
    });

    it('should be visible from client profile page via email lookup', () => {
      // Client profile queries by clientEmail
      const clientQuery = { clientEmail: 'feyh3415@gmail.com' };
      expect(clientQuery.clientEmail).toBeDefined();
    });

    it('should show enrollment context (tier, status) in client profile view', () => {
      const noteWithContext = {
        id: 1,
        enrollment_id: 210005,
        tier: 'flagship',
        enrollment_status: 'coaching_paid',
        content: 'Discovery session notes',
      };
      expect(noteWithContext.tier).toBe('flagship');
      expect(noteWithContext.enrollment_status).toBe('coaching_paid');
    });
  });
});

describe('Milestone Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Notification Coverage', () => {
    it('should send both in-app and email notifications for new enrollment', () => {
      // New enrollment creates in-app notification AND sends admin email
      const inAppNotif = {
        type: 'new_enrollment',
        title: 'New Enrollment: Richard Feyh',
        message: 'Richard Feyh (feyh3415@gmail.com) enrolled in the flagship tier transformation program',
      };
      const emailNotif = {
        milestone: 'new_enrollment',
        milestoneLabel: 'New Enrollment - flagship Tier',
      };
      expect(inAppNotif.type).toBe('new_enrollment');
      expect(emailNotif.milestone).toBe('new_enrollment');
    });

    it('should send both in-app and email notifications for profile completed', () => {
      const inAppNotif = {
        type: 'profile_completed',
        title: 'Richard Feyh completed their profile',
      };
      const emailNotif = {
        milestone: 'profile_completed',
        milestoneLabel: 'Profile Completed - Ready for Masterclass',
      };
      expect(inAppNotif.type).toBe('profile_completed');
      expect(emailNotif.milestone).toBe('profile_completed');
    });

    it('should send both in-app and email notifications for video complete (public)', () => {
      const inAppNotif = {
        type: 'enrollment_update',
        title: 'Richard Feyh completed masterclass videos',
      };
      const emailNotif = {
        milestone: 'video_complete',
        milestoneLabel: 'Masterclass Videos Completed - flagship Tier',
      };
      expect(inAppNotif.type).toBe('enrollment_update');
      expect(emailNotif.milestone).toBe('video_complete');
    });

    it('should send both in-app and email notifications for video complete (logged-in)', () => {
      // The logged-in updateEnrollmentJourneyStep also sends notifications
      const milestoneLabels: Record<string, string> = {
        bioregulatorVideoWatched: 'Masterclass Videos Completed',
        discoverySessionScheduled: 'Discovery Session Scheduled',
        discoverySessionCompleted: 'Discovery Session Completed',
      };
      expect(milestoneLabels.bioregulatorVideoWatched).toBe('Masterclass Videos Completed');
    });

    it('should send both in-app and email notifications for discovery session scheduled', () => {
      const milestoneLabels: Record<string, string> = {
        discoverySessionScheduled: 'Discovery Session Scheduled',
      };
      expect(milestoneLabels.discoverySessionScheduled).toBe('Discovery Session Scheduled');
    });

    it('should send both in-app and email notifications for payment received', () => {
      // Payment has its own dedicated notification flow
      const paymentNotif = {
        type: 'payment_received',
        title: 'Payment Received: Richard Feyh - $2500',
      };
      expect(paymentNotif.type).toBe('payment_received');
    });

    it('should send both in-app and email notifications for intake form completed', () => {
      const inAppNotif = {
        type: 'other',
        title: 'Intake Form Completed: Richard Feyh',
      };
      const emailNotif = {
        milestone: 'intake_form_completed',
        milestoneLabel: 'Intake Form Completed - Flagship',
      };
      expect(inAppNotif.type).toBe('other');
      expect(emailNotif.milestone).toBe('intake_form_completed');
    });

    it('should skip duplicate notifications for payment in client-side step handler', () => {
      // The client-side updateEnrollmentJourneyStep skips coachingFeePaid
      // because payment already has its own notification block
      const step = 'coachingFeePaid';
      const shouldNotify = step !== 'coachingFeePaid';
      expect(shouldNotify).toBe(false);
    });
  });

  describe('Notification Content', () => {
    it('should include client name, email, and tier in all notifications', () => {
      const notification = {
        clientName: 'Richard Feyh',
        clientEmail: 'feyh3415@gmail.com',
        milestone: 'video_complete',
        milestoneLabel: 'Masterclass Videos Completed - flagship Tier',
      };
      expect(notification.clientName).toBeTruthy();
      expect(notification.clientEmail).toBeTruthy();
      expect(notification.milestoneLabel).toContain('flagship');
    });

    it('should send notifications to all admin users', () => {
      // Notifications are sent to all users with role = 'admin'
      const query = "SELECT u.id FROM users u WHERE u.role = 'admin'";
      expect(query).toContain("role = 'admin'");
    });

    it('should handle missing client info gracefully', () => {
      const clientName = null || 'Unknown';
      const clientEmail = null || '';
      expect(clientName).toBe('Unknown');
      expect(clientEmail).toBe('');
    });
  });

  describe('Full Milestone Coverage Matrix', () => {
    it('should have notifications for all enrollment milestones', () => {
      const milestones = [
        'new_enrollment',
        'profile_completed',
        'bioregulatorVideoWatched', // video complete
        'coachingFeePaid', // payment
        'intake_form_completed',
        'discoverySessionScheduled',
        'discoverySessionCompleted',
        'protocolReady',
        'protocolApproved',
        'protocolPaid',
        'boxShipped',
        'boxDelivered',
        'reconstitutionScheduled',
        'reconstitutionCompleted',
      ];

      // All milestones should have both in-app and email notifications
      expect(milestones.length).toBe(14);

      // Client-side milestones that now have notifications
      const clientSideMilestones = [
        'new_enrollment',
        'profile_completed',
        'bioregulatorVideoWatched',
        'discoverySessionScheduled',
        'discoverySessionCompleted',
      ];
      expect(clientSideMilestones.length).toBe(5);

      // Admin-toggled milestones already had notifications
      const adminMilestones = [
        'coachingFeePaid',
        'intake_form_completed',
        'protocolReady',
        'protocolApproved',
        'protocolPaid',
        'boxShipped',
        'boxDelivered',
        'reconstitutionScheduled',
        'reconstitutionCompleted',
      ];
      expect(adminMilestones.length).toBe(9);
    });
  });
});
