import { describe, it, expect } from 'vitest';

describe('Shannon Daily Pipeline Cron', () => {
  it('should export sendShannonDailyPipeline function', async () => {
    const mod = await import('./cron/shannonDailyPipelineCron');
    expect(typeof mod.sendShannonDailyPipeline).toBe('function');
  });

  it('should export initShannonDailyPipelineCron function', async () => {
    const mod = await import('./cron/shannonDailyPipelineCron');
    expect(typeof mod.initShannonDailyPipelineCron).toBe('function');
  });
});

describe('Bulk Stalled Projects & Shannon Pipeline Endpoints', () => {
  it('should have listStalledProjects in the automation router', async () => {
    const { appRouter } = await import('./routers');
    expect((appRouter as any)._def.procedures['automation.listStalledProjects']).toBeDefined();
  });

  it('should have bulkResolveProjects in the automation router', async () => {
    const { appRouter } = await import('./routers');
    expect((appRouter as any)._def.procedures['automation.bulkResolveProjects']).toBeDefined();
  });

  it('should have sendShannonPipeline in the automation router', async () => {
    const { appRouter } = await import('./routers');
    expect((appRouter as any)._def.procedures['automation.sendShannonPipeline']).toBeDefined();
  });
});
