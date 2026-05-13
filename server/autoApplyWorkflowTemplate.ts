/**
 * Auto-detect and apply the appropriate workflow template to a client project
 * based on the linked protocol's duration.
 * 
 * This function should be called whenever a client project is created from a protocol
 * to ensure the workflow template (and its tasks/subtasks) are automatically applied.
 */
import * as db from './db';

/**
 * Given a clientProjectId and optionally a clientProtocolId,
 * detect the right workflow template and apply it.
 * 
 * Logic:
 * - 3-month (90-day) protocols → "90-Day Protocol" template
 * - 12-month protocols → "12-Month Ultimate Omega Program" template
 * - Fallback: use the default template (isDefault=1)
 */
export async function autoApplyWorkflowTemplate(
  clientProjectId: number,
  clientProtocolId?: number | null
): Promise<{ applied: boolean; templateId?: number; templateName?: string; reason: string }> {
  try {
    // Get the project to check if it already has a template
    const project = await db.getClientProjectById(clientProjectId);
    if (!project) {
      return { applied: false, reason: 'Project not found' };
    }
    
    // Skip if project already has a workflow template
    if (project.workflowTemplateId) {
      return { applied: false, reason: `Project already has workflow template #${project.workflowTemplateId}` };
    }
    
    // Get all active workflow templates
    const allTemplates = await db.getAllWorkflowTemplates();
    if (allTemplates.length === 0) {
      return { applied: false, reason: 'No active workflow templates found' };
    }
    
    // Determine protocol duration
    let durationMonths: number | null = null;
    const protocolId = clientProtocolId || project.clientProtocolId;
    
    if (protocolId) {
      const protocol = await db.getClientProtocolById(protocolId);
      if (protocol) {
        durationMonths = protocol.durationMonths;
      }
    }
    
    // Match template based on duration
    let selectedTemplate: typeof allTemplates[0] | null = null;
    
    if (durationMonths) {
      if (durationMonths <= 3) {
        // Look for 90-Day Protocol template
        selectedTemplate = allTemplates.find(t => 
          t.name.toLowerCase().includes('90-day') || 
          t.name.toLowerCase().includes('90 day') ||
          (t.durationDays && t.durationDays <= 100 && t.durationDays >= 80)
        ) || null;
      } else if (durationMonths >= 12) {
        // Look for 12-Month template
        selectedTemplate = allTemplates.find(t => 
          t.name.toLowerCase().includes('12-month') || 
          t.name.toLowerCase().includes('12 month') ||
          (t.durationDays && t.durationDays >= 300)
        ) || null;
      }
    }
    
    // Fallback to default template
    if (!selectedTemplate) {
      selectedTemplate = allTemplates.find(t => t.isDefault === 1) || null;
    }
    
    // Still no template? Use the first active one
    if (!selectedTemplate && allTemplates.length > 0) {
      selectedTemplate = allTemplates[0];
    }
    
    if (!selectedTemplate) {
      return { applied: false, reason: 'No suitable workflow template found' };
    }
    
    // Apply the template
    await db.applyWorkflowTemplateToProject(clientProjectId, selectedTemplate.id);
    
    console.log(`[AutoWorkflow] Applied template "${selectedTemplate.name}" (#${selectedTemplate.id}) to project #${clientProjectId} (duration: ${durationMonths || 'unknown'} months)`);
    
    return {
      applied: true,
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      reason: `Applied "${selectedTemplate.name}" based on ${durationMonths ? `${durationMonths}-month protocol` : 'default template'}`,
    };
  } catch (error) {
    console.error(`[AutoWorkflow] Failed to auto-apply template to project #${clientProjectId}:`, error);
    return { applied: false, reason: `Error: ${(error as Error).message}` };
  }
}
