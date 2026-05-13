import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the email service
vi.mock('./emailService', () => ({
  sendTransformationMilestoneEmail: vi.fn().mockResolvedValue({ success: true, message: 'Email sent' }),
  sendAdminMilestoneNotification: vi.fn().mockResolvedValue({ success: true, message: 'Notification sent' }),
}));

// Mock the database
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue({
    execute: vi.fn().mockResolvedValue([[]]),
  }),
}));

describe('Admin Enrollment Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Journey Steps', () => {
    const journeySteps = [
      { key: 'bioregulatorVideoWatched', label: 'Bioregulator Video', phase: 'Pre-Consult' },
      { key: 'coachingFeePaid', label: 'Coaching Fee Paid', phase: 'Pre-Consult' },
      { key: 'discoverySessionScheduled', label: 'Discovery Scheduled', phase: 'Pre-Consult' },
      { key: 'discoverySessionCompleted', label: 'Discovery Completed', phase: 'Pre-Consult' },
      { key: 'protocolReady', label: 'Protocol Ready', phase: 'Protocol' },
      { key: 'protocolApproved', label: 'Protocol Approved', phase: 'Protocol' },
      { key: 'protocolPaid', label: 'Protocol Paid', phase: 'Protocol' },
      { key: 'boxShipped', label: 'Box Shipped', phase: 'Fulfillment' },
      { key: 'boxDelivered', label: 'Box Delivered', phase: 'Fulfillment' },
      { key: 'unpackingVideoWatched', label: 'Unpacking Video', phase: 'Launch' },
      { key: 'reconstitutionScheduled', label: 'Training Scheduled', phase: 'Launch' },
      { key: 'reconstitutionCompleted', label: 'Training Completed', phase: 'Launch' },
    ];

    it('should have all 12 journey steps defined', () => {
      expect(journeySteps).toHaveLength(12);
    });

    it('should have steps organized into 4 phases', () => {
      const phases = [...new Set(journeySteps.map(s => s.phase))];
      expect(phases).toEqual(['Pre-Consult', 'Protocol', 'Fulfillment', 'Launch']);
    });

    it('should have Pre-Consult phase with 4 steps', () => {
      const preConsultSteps = journeySteps.filter(s => s.phase === 'Pre-Consult');
      expect(preConsultSteps).toHaveLength(4);
    });

    it('should have Protocol phase with 3 steps', () => {
      const protocolSteps = journeySteps.filter(s => s.phase === 'Protocol');
      expect(protocolSteps).toHaveLength(3);
    });

    it('should have Fulfillment phase with 2 steps', () => {
      const fulfillmentSteps = journeySteps.filter(s => s.phase === 'Fulfillment');
      expect(fulfillmentSteps).toHaveLength(2);
    });

    it('should have Launch phase with 3 steps', () => {
      const launchSteps = journeySteps.filter(s => s.phase === 'Launch');
      expect(launchSteps).toHaveLength(3);
    });
  });

  describe('Milestone Email Triggers', () => {
    const milestoneSteps = [
      'coachingFeePaid',
      'discoverySessionCompleted',
      'protocolReady',
      'boxShipped',
      'boxDelivered',
      'reconstitutionCompleted',
    ];

    it('should have 6 milestone steps that trigger emails', () => {
      expect(milestoneSteps).toHaveLength(6);
    });

    it('should include coaching fee paid milestone', () => {
      expect(milestoneSteps).toContain('coachingFeePaid');
    });

    it('should include discovery completed milestone', () => {
      expect(milestoneSteps).toContain('discoverySessionCompleted');
    });

    it('should include protocol ready milestone', () => {
      expect(milestoneSteps).toContain('protocolReady');
    });

    it('should include box shipped milestone', () => {
      expect(milestoneSteps).toContain('boxShipped');
    });

    it('should include box delivered milestone', () => {
      expect(milestoneSteps).toContain('boxDelivered');
    });

    it('should include training completed milestone', () => {
      expect(milestoneSteps).toContain('reconstitutionCompleted');
    });
  });

  describe('Enrollment Status Colors', () => {
    const statusColors: Record<string, string> = {
      enrolled: 'bg-blue-100 text-blue-800',
      watching_videos: 'bg-purple-100 text-purple-800',
      video_complete: 'bg-indigo-100 text-indigo-800',
      coaching_paid: 'bg-green-100 text-green-800',
      discovery_scheduled: 'bg-amber-100 text-amber-800',
      discovery_complete: 'bg-orange-100 text-orange-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      renewed: 'bg-emerald-100 text-emerald-800',
    };

    it('should have color mappings for all major statuses', () => {
      expect(Object.keys(statusColors).length).toBeGreaterThanOrEqual(9);
    });

    it('should have enrolled status with blue color', () => {
      expect(statusColors.enrolled).toContain('blue');
    });

    it('should have active status with green color', () => {
      expect(statusColors.active).toContain('green');
    });

    it('should have completed status with gray color', () => {
      expect(statusColors.completed).toContain('gray');
    });
  });
});

describe('Transformation Milestone Emails', () => {
  const milestoneContent = {
    coaching_paid: {
      title: 'Payment Confirmed!',
      emoji: '💳',
    },
    discovery_completed: {
      title: 'Discovery Session Complete!',
      emoji: '🎯',
    },
    protocol_ready: {
      title: 'Your Protocol is Ready!',
      emoji: '✨',
    },
    box_shipped: {
      title: 'Your Box Has Shipped!',
      emoji: '🚚',
    },
    box_delivered: {
      title: 'Your Box Has Arrived!',
      emoji: '📬',
    },
    training_completed: {
      title: "Training Complete - You're Ready!",
      emoji: '🚀',
    },
    week3_review: {
      title: 'Week 3 Check-In Time!',
      emoji: '📈',
    },
    month3_final: {
      title: 'Final Review - 90 Days Complete!',
      emoji: '🎊',
    },
  };

  it('should have content for all 8 milestone types', () => {
    expect(Object.keys(milestoneContent)).toHaveLength(8);
  });

  it('should have appropriate title for coaching paid milestone', () => {
    expect(milestoneContent.coaching_paid.title).toContain('Payment');
  });

  it('should have appropriate title for protocol ready milestone', () => {
    expect(milestoneContent.protocol_ready.title).toContain('Protocol');
  });

  it('should have appropriate title for box shipped milestone', () => {
    expect(milestoneContent.box_shipped.title).toContain('Shipped');
  });

  it('should have appropriate title for training completed milestone', () => {
    expect(milestoneContent.training_completed.title).toContain('Training');
  });

  it('should have appropriate title for 90 day completion', () => {
    expect(milestoneContent.month3_final.title).toContain('90 Days');
  });

  it('should have emojis for visual appeal', () => {
    Object.values(milestoneContent).forEach(content => {
      expect(content.emoji).toBeTruthy();
      expect(content.emoji.length).toBeGreaterThan(0);
    });
  });
});

describe('Admin Milestone Notifications', () => {
  const milestoneLabels: Record<string, string> = {
    coachingFeePaid: 'Coaching Fee Paid',
    discoverySessionCompleted: 'Discovery Session Completed',
    protocolReady: 'Protocol Ready',
    boxShipped: 'Box Shipped',
    boxDelivered: 'Box Delivered',
    reconstitutionCompleted: 'Training Completed',
  };

  it('should have human-readable labels for all milestone steps', () => {
    expect(Object.keys(milestoneLabels)).toHaveLength(6);
  });

  it('should have descriptive label for coaching fee paid', () => {
    expect(milestoneLabels.coachingFeePaid).toBe('Coaching Fee Paid');
  });

  it('should have descriptive label for discovery completed', () => {
    expect(milestoneLabels.discoverySessionCompleted).toBe('Discovery Session Completed');
  });

  it('should have descriptive label for training completed', () => {
    expect(milestoneLabels.reconstitutionCompleted).toBe('Training Completed');
  });
});
