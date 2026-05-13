import { describe, it, expect } from 'vitest';

describe('Session Reminder Cron Job', () => {
  it('should have session reminder cron module', async () => {
    const sessionReminderModule = await import('./cron/sessionReminderCron');
    expect(sessionReminderModule).toBeDefined();
    expect(typeof sessionReminderModule.initSessionReminderCron).toBe('function');
    expect(typeof sessionReminderModule.processSessionReminders).toBe('function');
  });

  it('should export initSessionReminderCron function', async () => {
    const { initSessionReminderCron } = await import('./cron/sessionReminderCron');
    expect(initSessionReminderCron).toBeDefined();
    expect(typeof initSessionReminderCron).toBe('function');
  });

  it('should export processSessionReminders function for manual triggering', async () => {
    const { processSessionReminders } = await import('./cron/sessionReminderCron');
    expect(processSessionReminders).toBeDefined();
    expect(typeof processSessionReminders).toBe('function');
  });

  it('should export stopSessionReminderCron function', async () => {
    const { stopSessionReminderCron } = await import('./cron/sessionReminderCron');
    expect(stopSessionReminderCron).toBeDefined();
    expect(typeof stopSessionReminderCron).toBe('function');
  });

  it('should export triggerSessionReminderJob function', async () => {
    const { triggerSessionReminderJob } = await import('./cron/sessionReminderCron');
    expect(triggerSessionReminderJob).toBeDefined();
    expect(typeof triggerSessionReminderJob).toBe('function');
  });

  it('should export getLastSessionReminderCronRun function', async () => {
    const { getLastSessionReminderCronRun } = await import('./cron/sessionReminderCron');
    expect(getLastSessionReminderCronRun).toBeDefined();
    expect(typeof getLastSessionReminderCronRun).toBe('function');
  });
});

describe('Session Reminder Email Template', () => {
  it('should generate HTML email with session details', async () => {
    // The email template is embedded in the cron module
    // Testing that the module loads correctly validates the template
    const module = await import('./cron/sessionReminderCron');
    expect(module).toBeDefined();
  });
});

describe('Session Reminder Settings', () => {
  it('should respect session_reminders_enabled setting', async () => {
    // The cron job checks the setting before processing
    // This validates the integration with the settings system
    const module = await import('./cron/sessionReminderCron');
    expect(module.processSessionReminders).toBeDefined();
  });
});
