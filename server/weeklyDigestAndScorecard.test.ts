import { describe, it, expect, vi } from 'vitest';

// Test that the weekly digest cron module exports the expected function
describe('Weekly Team Digest Cron', () => {
  it('should export sendWeeklyTeamDigest function', async () => {
    const mod = await import('./cron/weeklyTeamDigestCron');
    expect(typeof mod.sendWeeklyTeamDigest).toBe('function');
  });

  it('should export initWeeklyTeamDigestCron function', async () => {
    const mod = await import('./cron/weeklyTeamDigestCron');
    expect(typeof mod.initWeeklyTeamDigestCron).toBe('function');
  });
});

// Test that the pipeline scorecard endpoint exists in the automation router
describe('Pipeline Scorecard Endpoint', () => {
  it('should have pipelineScorecard in the automation router', async () => {
    const { appRouter } = await import('./routers');
    // Check the automation router has the pipelineScorecard procedure
    expect((appRouter as any)._def.procedures['automation.pipelineScorecard']).toBeDefined();
  });

  it('should have sendWeeklyDigest mutation in the automation router', async () => {
    const { appRouter } = await import('./routers');
    expect((appRouter as any)._def.procedures['automation.sendWeeklyDigest']).toBeDefined();
  });
});
