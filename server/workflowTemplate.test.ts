import { describe, it, expect, vi } from 'vitest';

// Test that the router has the required mutations for workflow template management
describe('Workflow Template Router', () => {
  it('should have updateTask mutation defined in router', async () => {
    const routers = await import('./routers');
    const appRouter = (routers as any).appRouter;
    expect(appRouter).toBeDefined();
    // Check the router has the workflowTemplate namespace
    expect(appRouter._def.procedures).toBeDefined();
    const procedures = appRouter._def.procedures;
    expect(procedures['workflowTemplate.updateTask']).toBeDefined();
  });

  it('should have deleteTask mutation defined in router', async () => {
    const routers = await import('./routers');
    const appRouter = (routers as any).appRouter;
    const procedures = appRouter._def.procedures;
    expect(procedures['workflowTemplate.deleteTask']).toBeDefined();
  });

  it('should have delete (template) mutation defined in router', async () => {
    const routers = await import('./routers');
    const appRouter = (routers as any).appRouter;
    const procedures = appRouter._def.procedures;
    expect(procedures['workflowTemplate.delete']).toBeDefined();
  });

  it('should have lifecycleStage.delete mutation defined in router', async () => {
    const routers = await import('./routers');
    const appRouter = (routers as any).appRouter;
    const procedures = appRouter._def.procedures;
    expect(procedures['lifecycleStage.delete']).toBeDefined();
  });

  it('should have lifecycleStage.update mutation defined in router', async () => {
    const routers = await import('./routers');
    const appRouter = (routers as any).appRouter;
    const procedures = appRouter._def.procedures;
    expect(procedures['lifecycleStage.update']).toBeDefined();
  });

  it('should have all existing workflow template mutations preserved', async () => {
    const routers = await import('./routers');
    const appRouter = (routers as any).appRouter;
    const procedures = appRouter._def.procedures;
    
    // Existing mutations that should still work
    expect(procedures['workflowTemplate.list']).toBeDefined();
    expect(procedures['workflowTemplate.get']).toBeDefined();
    expect(procedures['workflowTemplate.create']).toBeDefined();
    expect(procedures['workflowTemplate.update']).toBeDefined();
    expect(procedures['workflowTemplate.getTasks']).toBeDefined();
    expect(procedures['workflowTemplate.createTask']).toBeDefined();
    expect(procedures['workflowTemplate.getSubtasks']).toBeDefined();
    expect(procedures['workflowTemplate.createSubtask']).toBeDefined();
    expect(procedures['workflowTemplate.updateSubtask']).toBeDefined();
    expect(procedures['workflowTemplate.deleteSubtask']).toBeDefined();
    expect(procedures['workflowTemplate.seedDefaults']).toBeDefined();
  });
});

describe('Workflow Template DB Functions', () => {
  it('should export updateWorkflowTemplateTask function', async () => {
    const db = await import('./db');
    expect(typeof db.updateWorkflowTemplateTask).toBe('function');
  });

  it('should export deleteWorkflowTemplateTask function', async () => {
    const db = await import('./db');
    expect(typeof db.deleteWorkflowTemplateTask).toBe('function');
  });

  it('should export deleteWorkflowTemplate function', async () => {
    const db = await import('./db');
    expect(typeof db.deleteWorkflowTemplate).toBe('function');
  });

  it('should export deleteLifecycleStage function', async () => {
    const db = await import('./db');
    expect(typeof db.deleteLifecycleStage).toBe('function');
  });

  it('should export all existing workflow functions', async () => {
    const db = await import('./db');
    expect(typeof db.getAllWorkflowTemplates).toBe('function');
    expect(typeof db.getWorkflowTemplateById).toBe('function');
    expect(typeof db.createWorkflowTemplate).toBe('function');
    expect(typeof db.updateWorkflowTemplate).toBe('function');
    expect(typeof db.getWorkflowTemplateTasks).toBe('function');
    expect(typeof db.createWorkflowTemplateTask).toBe('function');
    expect(typeof db.getWorkflowTemplateSubtasks).toBe('function');
    expect(typeof db.createWorkflowTemplateSubtask).toBe('function');
    expect(typeof db.updateWorkflowTemplateSubtask).toBe('function');
    expect(typeof db.deleteWorkflowTemplateSubtask).toBe('function');
  });
});
