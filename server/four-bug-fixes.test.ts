import { describe, it, expect, vi } from 'vitest';

/**
 * Tests for the 4-bug batch fix:
 * 1. Cancelled client tasks filtered from action items
 * 2. Reassignment dropdown on My Items tab
 * 3. Duplicate task deduplication in createTaskFromRule
 * 4. Master Template replaced with client-friendly name in profile complete email
 */

// Test 1: Cancelled client tasks filter
describe('Fix #1: Cancelled client tasks filter', () => {
  it('getActionItemsForTeamMember should include ne(clientProjects.status, "cancelled") filter', async () => {
    const dbSource = await import('fs').then(fs => 
      fs.readFileSync('/home/ubuntu/health-coach-protocol-app/server/db.ts', 'utf-8')
    );
    
    // Find the getActionItemsForTeamMember function and verify it has the cancelled filter
    const fnStart = dbSource.indexOf('async function getActionItemsForTeamMember');
    const fnEnd = dbSource.indexOf('async function getAllActionItems');
    const fnBody = dbSource.substring(fnStart, fnEnd);
    
    expect(fnBody).toContain('ne(clientProjects.status, "cancelled")');
    expect(fnBody).toContain('Filter out tasks for cancelled projects');
  });

  it('getAllActionItems should include ne(clientProjects.status, "cancelled") filter', async () => {
    const dbSource = await import('fs').then(fs => 
      fs.readFileSync('/home/ubuntu/health-coach-protocol-app/server/db.ts', 'utf-8')
    );
    
    // Find the getAllActionItems function
    const fnStart = dbSource.indexOf('async function getAllActionItems');
    const fnEnd = dbSource.indexOf('\n}', fnStart + 100);
    const fnBody = dbSource.substring(fnStart, fnEnd + 2);
    
    expect(fnBody).toContain('ne(clientProjects.status, "cancelled")');
    expect(fnBody).toContain('Filter out tasks for cancelled projects');
  });
});

// Test 2: Reassignment dropdown on My Items tab
describe('Fix #2: Reassignment dropdown on My Items tab', () => {
  it('My Items tab TaskCard should have showReassign={true} and onReassign prop', async () => {
    const source = await import('fs').then(fs => 
      fs.readFileSync('/home/ubuntu/health-coach-protocol-app/client/src/pages/admin/MyActionItems.tsx', 'utf-8')
    );
    
    // Find the my-tasks TabsContent section
    const myTasksStart = source.indexOf('TabsContent value="my-tasks"');
    const myTasksEnd = source.indexOf('TabsContent value="all-tasks"');
    const myTasksSection = source.substring(myTasksStart, myTasksEnd);
    
    // Verify TaskCard in my-tasks section has reassignment props
    expect(myTasksSection).toContain('showReassign={true}');
    expect(myTasksSection).toContain('onReassign=');
    expect(myTasksSection).toContain('teamMembers=');
  });
});

// Test 3: Duplicate task deduplication
describe('Fix #3: Duplicate task deduplication in createTaskFromRule', () => {
  it('createTaskFromRule should check for existing tasks before creating', async () => {
    const source = await import('fs').then(fs => 
      fs.readFileSync('/home/ubuntu/health-coach-protocol-app/server/automation/lifecycleAdvancement.ts', 'utf-8')
    );
    
    // Find createTaskFromRule function
    const fnStart = source.indexOf('async function createTaskFromRule');
    const fnEnd = source.indexOf('async function createFollowUpTask');
    const fnBody = source.substring(fnStart, fnEnd);
    
    // Verify deduplication logic exists
    expect(fnBody).toContain('getProjectTasks');
    expect(fnBody).toContain('duplicate');
    expect(fnBody).toContain('Skipping duplicate task');
    expect(fnBody).toContain("t.status === 'pending' || t.status === 'in_progress'");
  });

  it('should return existing task ID when duplicate is found', async () => {
    const source = await import('fs').then(fs => 
      fs.readFileSync('/home/ubuntu/health-coach-protocol-app/server/automation/lifecycleAdvancement.ts', 'utf-8')
    );
    
    const fnStart = source.indexOf('async function createTaskFromRule');
    const fnEnd = source.indexOf('async function createFollowUpTask');
    const fnBody = source.substring(fnStart, fnEnd);
    
    // Should return duplicate.id instead of creating a new task
    expect(fnBody).toContain('return duplicate.id');
  });
});

// Test 4: Master Template in profile complete email
describe('Fix #4: Master Template replaced in profile complete email', () => {
  it('should NOT use template.name for protocolName in profile complete email', async () => {
    const source = await import('fs').then(fs => 
      fs.readFileSync('/home/ubuntu/health-coach-protocol-app/server/routers.ts', 'utf-8')
    );
    
    // Find the profile completion notification section
    const sectionStart = source.indexOf('If profile just became complete');
    const sectionEnd = source.indexOf('Create in-app notification', sectionStart);
    const section = source.substring(sectionStart, sectionEnd);
    
    // Should NOT contain the old template.name pattern
    expect(section).not.toContain("template?.name || 'Custom Protocol'");
    expect(section).not.toContain("const template = protocol.templateId");
    
    // Should contain the new program-based name logic
    expect(section).toContain('Omega Longevity Protocol');
    expect(section).toContain('getProgramById');
  });

  it('should fall back to duration-based name when no program exists', async () => {
    const source = await import('fs').then(fs => 
      fs.readFileSync('/home/ubuntu/health-coach-protocol-app/server/routers.ts', 'utf-8')
    );
    
    const sectionStart = source.indexOf('If profile just became complete');
    const sectionEnd = source.indexOf('Create in-app notification', sectionStart);
    const section = source.substring(sectionStart, sectionEnd);
    
    // Should have duration-based fallback
    expect(section).toContain('durationMonths');
    expect(section).toContain('Month Omega Protocol');
  });
});
