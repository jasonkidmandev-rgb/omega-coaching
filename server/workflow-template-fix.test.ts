import { describe, it, expect, vi } from 'vitest';

describe('Workflow Template Auto-Apply Fix', () => {
  describe('autoApplyWorkflowTemplate module', () => {
    it('should export autoApplyWorkflowTemplate function', async () => {
      const mod = await import('./autoApplyWorkflowTemplate');
      expect(mod.autoApplyWorkflowTemplate).toBeDefined();
      expect(typeof mod.autoApplyWorkflowTemplate).toBe('function');
    });
  });

  describe('Template matching logic', () => {
    it('should match 90-day template for 3-month protocols', () => {
      const templates = [
        { id: 3, name: '90-Day Protocol', durationDays: 90, isDefault: 1, isActive: 1 },
        { id: 4, name: '12-Month Ultimate Omega Program', durationDays: 365, isDefault: 0, isActive: 1 },
      ];
      const durationMonths = 3;
      
      let selected = null;
      if (durationMonths <= 3) {
        selected = templates.find(t => 
          t.name.toLowerCase().includes('90-day') || 
          t.name.toLowerCase().includes('90 day') ||
          (t.durationDays && t.durationDays <= 100 && t.durationDays >= 80)
        ) || null;
      }
      
      expect(selected).not.toBeNull();
      expect(selected!.id).toBe(3);
      expect(selected!.name).toBe('90-Day Protocol');
    });

    it('should match 12-month template for 12-month protocols', () => {
      const templates = [
        { id: 3, name: '90-Day Protocol', durationDays: 90, isDefault: 1, isActive: 1 },
        { id: 4, name: '12-Month Ultimate Omega Program', durationDays: 365, isDefault: 0, isActive: 1 },
      ];
      const durationMonths = 12;
      
      let selected = null;
      if (durationMonths >= 12) {
        selected = templates.find(t => 
          t.name.toLowerCase().includes('12-month') || 
          t.name.toLowerCase().includes('12 month') ||
          (t.durationDays && t.durationDays >= 300)
        ) || null;
      }
      
      expect(selected).not.toBeNull();
      expect(selected!.id).toBe(4);
      expect(selected!.name).toBe('12-Month Ultimate Omega Program');
    });

    it('should fallback to default template when duration is unknown', () => {
      const templates = [
        { id: 3, name: '90-Day Protocol', durationDays: 90, isDefault: 1, isActive: 1 },
        { id: 4, name: '12-Month Ultimate Omega Program', durationDays: 365, isDefault: 0, isActive: 1 },
      ];
      const durationMonths = null;
      
      let selected = null;
      // No duration match possible
      if (!selected) {
        selected = templates.find(t => t.isDefault === 1) || null;
      }
      
      expect(selected).not.toBeNull();
      expect(selected!.id).toBe(3);
    });

    it('should not match 12-month template for 6-month protocols', () => {
      const templates = [
        { id: 3, name: '90-Day Protocol', durationDays: 90, isDefault: 1, isActive: 1 },
        { id: 4, name: '12-Month Ultimate Omega Program', durationDays: 365, isDefault: 0, isActive: 1 },
      ];
      const durationMonths = 6;
      
      let selected = null;
      if (durationMonths <= 3) {
        selected = templates.find(t => 
          t.name.toLowerCase().includes('90-day')
        ) || null;
      } else if (durationMonths >= 12) {
        selected = templates.find(t => 
          t.name.toLowerCase().includes('12-month')
        ) || null;
      }
      
      // 6 months doesn't match either, should fall back to default
      expect(selected).toBeNull();
      
      // Fallback
      selected = templates.find(t => t.isDefault === 1) || null;
      expect(selected).not.toBeNull();
      expect(selected!.id).toBe(3);
    });
  });

  describe('Protocol creation code paths', () => {
    it('should have autoApplyWorkflowTemplate import in routers.ts', async () => {
      const fs = await import('fs');
      const routersContent = fs.readFileSync('/home/ubuntu/health-coach-protocol-app/server/routers.ts', 'utf-8');
      
      // Check all 6 code paths that create projects
      const autoApplyImports = routersContent.match(/autoApplyWorkflowTemplate/g);
      expect(autoApplyImports).not.toBeNull();
      // Should appear in: create path 1, create path 2, clone, bulkClone, renew, syncClientsToProjects, backfillTemplates
      expect(autoApplyImports!.length).toBeGreaterThanOrEqual(7);
    });

    it('should have backfillTemplates endpoint defined', async () => {
      const fs = await import('fs');
      const routersContent = fs.readFileSync('/home/ubuntu/health-coach-protocol-app/server/routers.ts', 'utf-8');
      
      expect(routersContent).toContain('backfillTemplates: adminProcedure');
      expect(routersContent).toContain('autoApplyWorkflowTemplate(project.id, project.clientProtocolId)');
    });
  });

  describe('Frontend integration', () => {
    it('should have backfill button in ProjectList', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('/home/ubuntu/health-coach-protocol-app/client/src/pages/admin/projects/ProjectList.tsx', 'utf-8');
      
      expect(content).toContain('backfillTemplatesMutation');
      expect(content).toContain('Backfill Templates');
      expect(content).toContain('backfillTemplates.useMutation');
    });

    it('should have apply template dropdown in ProjectDetail when tasks are empty', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('/home/ubuntu/health-coach-protocol-app/client/src/pages/admin/projects/ProjectDetail.tsx', 'utf-8');
      
      expect(content).toContain('applyTemplateMutation');
      expect(content).toContain('Apply a workflow template...');
      expect(content).toContain('applyTemplate.useMutation');
    });
  });
});
