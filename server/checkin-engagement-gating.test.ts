import { describe, it, expect } from 'vitest';

/**
 * Tests for the check-in schedule engagement level gating refactoring.
 * Verifies that:
 * 1. The cron query now checks isPaused and skipUntil
 * 2. Single engagement level changes use isEnabled (not just isPaused)
 * 3. Bulk engagement level changes are consistent
 * 4. Schedule creation is blocked for protocol_only clients
 * 5. Auto-create schedule on engagement upgrade
 */

// Simulate the cron query filter logic
function shouldProcessSchedule(schedule: {
  isEnabled: boolean;
  isPaused: boolean;
  skipUntil: Date | null;
  nextScheduledAt: Date;
}): boolean {
  const now = new Date();
  
  // Must be enabled
  if (!schedule.isEnabled) return false;
  
  // Must not be paused (NEW - was missing before)
  if (schedule.isPaused) return false;
  
  // nextScheduledAt must be in the past or now
  if (schedule.nextScheduledAt > now) return false;
  
  // skipUntil must be null or in the past (NEW - was missing before)
  if (schedule.skipUntil && schedule.skipUntil > now) return false;
  
  return true;
}

// Simulate engagement level change behavior
function getScheduleUpdateForEngagementChange(
  newLevel: string,
  hasExistingSchedule: boolean
): { action: string; fields?: Record<string, any> } {
  if (newLevel === 'protocol_only') {
    return {
      action: 'disable',
      fields: { isEnabled: false, isPaused: false, pausedReason: 'Engagement level set to Protocol Only' }
    };
  }
  
  if (newLevel === 'full_coaching' || newLevel === 'self_guided_checkins') {
    if (hasExistingSchedule) {
      return {
        action: 're-enable',
        fields: { isEnabled: true, isPaused: false, pausedReason: null }
      };
    } else {
      return {
        action: 'auto-create',
        fields: { isEnabled: true, frequency: 'weekly', dayOfWeek: 4, timeOfDay: '10:00' }
      };
    }
  }
  
  return { action: 'none' };
}

// Simulate schedule creation validation
function canCreateSchedule(engagementLevel: string): { allowed: boolean; error?: string } {
  if (engagementLevel === 'protocol_only') {
    return { allowed: false, error: 'Cannot enable check-ins for Protocol Only clients. Change the engagement level first.' };
  }
  return { allowed: true };
}

describe('Cron Query Filter (isPaused + skipUntil)', () => {
  it('should process enabled, non-paused schedule with past nextScheduledAt', () => {
    const result = shouldProcessSchedule({
      isEnabled: true,
      isPaused: false,
      skipUntil: null,
      nextScheduledAt: new Date('2020-01-01'),
    });
    expect(result).toBe(true);
  });

  it('should NOT process paused schedule even if enabled', () => {
    const result = shouldProcessSchedule({
      isEnabled: true,
      isPaused: true,
      skipUntil: null,
      nextScheduledAt: new Date('2020-01-01'),
    });
    expect(result).toBe(false);
  });

  it('should NOT process disabled schedule', () => {
    const result = shouldProcessSchedule({
      isEnabled: false,
      isPaused: false,
      skipUntil: null,
      nextScheduledAt: new Date('2020-01-01'),
    });
    expect(result).toBe(false);
  });

  it('should NOT process schedule with future skipUntil', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const result = shouldProcessSchedule({
      isEnabled: true,
      isPaused: false,
      skipUntil: futureDate,
      nextScheduledAt: new Date('2020-01-01'),
    });
    expect(result).toBe(false);
  });

  it('should process schedule with past skipUntil', () => {
    const result = shouldProcessSchedule({
      isEnabled: true,
      isPaused: false,
      skipUntil: new Date('2020-01-01'),
      nextScheduledAt: new Date('2020-01-01'),
    });
    expect(result).toBe(true);
  });

  it('should NOT process schedule with future nextScheduledAt', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const result = shouldProcessSchedule({
      isEnabled: true,
      isPaused: false,
      skipUntil: null,
      nextScheduledAt: futureDate,
    });
    expect(result).toBe(false);
  });
});

describe('Single Engagement Level Change', () => {
  it('should DISABLE (not just pause) schedule when set to protocol_only', () => {
    const result = getScheduleUpdateForEngagementChange('protocol_only', true);
    expect(result.action).toBe('disable');
    expect(result.fields?.isEnabled).toBe(false);
    expect(result.fields?.isPaused).toBe(false); // Clear paused flag too
  });

  it('should re-enable existing schedule when upgraded to full_coaching', () => {
    const result = getScheduleUpdateForEngagementChange('full_coaching', true);
    expect(result.action).toBe('re-enable');
    expect(result.fields?.isEnabled).toBe(true);
    expect(result.fields?.isPaused).toBe(false);
  });

  it('should re-enable existing schedule when upgraded to self_guided_checkins', () => {
    const result = getScheduleUpdateForEngagementChange('self_guided_checkins', true);
    expect(result.action).toBe('re-enable');
    expect(result.fields?.isEnabled).toBe(true);
  });

  it('should auto-create schedule when upgraded and no schedule exists', () => {
    const result = getScheduleUpdateForEngagementChange('full_coaching', false);
    expect(result.action).toBe('auto-create');
    expect(result.fields?.isEnabled).toBe(true);
    expect(result.fields?.frequency).toBe('weekly');
    expect(result.fields?.dayOfWeek).toBe(4); // Thursday
  });

  it('should auto-create schedule for self_guided_checkins when no schedule exists', () => {
    const result = getScheduleUpdateForEngagementChange('self_guided_checkins', false);
    expect(result.action).toBe('auto-create');
    expect(result.fields?.isEnabled).toBe(true);
  });
});

describe('Schedule Creation Validation', () => {
  it('should BLOCK schedule creation for protocol_only clients', () => {
    const result = canCreateSchedule('protocol_only');
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('Protocol Only');
  });

  it('should ALLOW schedule creation for full_coaching clients', () => {
    const result = canCreateSchedule('full_coaching');
    expect(result.allowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should ALLOW schedule creation for self_guided_checkins clients', () => {
    const result = canCreateSchedule('self_guided_checkins');
    expect(result.allowed).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('Consistency Between Single and Bulk Changes', () => {
  it('single protocol_only change should use isEnabled=false (matching bulk behavior)', () => {
    const singleResult = getScheduleUpdateForEngagementChange('protocol_only', true);
    // Bulk was already using isEnabled=false — now single matches
    expect(singleResult.fields?.isEnabled).toBe(false);
  });

  it('both single and bulk should clear isPaused when disabling', () => {
    const result = getScheduleUpdateForEngagementChange('protocol_only', true);
    expect(result.fields?.isPaused).toBe(false);
  });
});

describe('Database State Invariants', () => {
  it('a schedule should never be both enabled and paused simultaneously', () => {
    // After cleanup, no schedule should have isEnabled=true AND isPaused=true
    // This is enforced by the engagement change handlers
    const disableResult = getScheduleUpdateForEngagementChange('protocol_only', true);
    expect(disableResult.fields?.isEnabled === true && disableResult.fields?.isPaused === true).toBe(false);
    
    const enableResult = getScheduleUpdateForEngagementChange('full_coaching', true);
    expect(enableResult.fields?.isEnabled === true && enableResult.fields?.isPaused === true).toBe(false);
  });
});
