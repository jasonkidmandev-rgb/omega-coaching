/**
 * Seed script to pre-populate default workflow templates
 * Run with: node scripts/seed-workflow-templates.mjs
 */

import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'health_coach_protocol_app',
});

console.log('Connected to database');

// Define lifecycle stages
const lifecycleStages = [
  { name: 'Intake', description: 'Initial client intake and information gathering', color: '#6366F1', sortOrder: 1 },
  { name: 'Consult', description: 'Initial consultation and assessment', color: '#8B5CF6', sortOrder: 2 },
  { name: 'Protocol Build', description: 'Building and customizing the client protocol', color: '#EC4899', sortOrder: 3 },
  { name: 'Billing', description: 'Invoice generation and payment processing', color: '#F59E0B', sortOrder: 4 },
  { name: 'Fulfillment', description: 'Order preparation and shipping', color: '#10B981', sortOrder: 5 },
  { name: 'Onboarding', description: 'Client onboarding and education', color: '#06B6D4', sortOrder: 6 },
  { name: 'Active Protocol', description: 'Active protocol monitoring and support', color: '#3B82F6', sortOrder: 7 },
  { name: 'Completion', description: 'Protocol completion and follow-up', color: '#22C55E', sortOrder: 8 },
];

// Insert lifecycle stages
console.log('Inserting lifecycle stages...');
for (const stage of lifecycleStages) {
  const [existing] = await connection.execute(
    'SELECT id FROM lifecycle_stages WHERE name = ?',
    [stage.name]
  );
  if (existing.length === 0) {
    await connection.execute(
      'INSERT INTO lifecycle_stages (name, description, color, sortOrder) VALUES (?, ?, ?, ?)',
      [stage.name, stage.description, stage.color, stage.sortOrder]
    );
    console.log(`  Created stage: ${stage.name}`);
  } else {
    console.log(`  Stage exists: ${stage.name}`);
  }
}

// Get stage IDs
const [stages] = await connection.execute('SELECT id, name FROM lifecycle_stages');
const stageMap = {};
for (const stage of stages) {
  stageMap[stage.name] = stage.id;
}

// Define team roles
const teamRoles = [
  { name: 'Client Care', description: 'Client communication and support', color: '#6366F1' },
  { name: 'Practitioner', description: 'Clinical and protocol decisions', color: '#8B5CF6' },
  { name: 'Operations', description: 'Operational coordination', color: '#EC4899' },
  { name: 'Shipping/Vendor', description: 'Fulfillment and vendor coordination', color: '#10B981' },
  { name: 'Automation/CRM', description: 'System automation and CRM management', color: '#F59E0B' },
];

// Insert team roles
console.log('Inserting team roles...');
for (const role of teamRoles) {
  const [existing] = await connection.execute(
    'SELECT id FROM team_roles WHERE name = ?',
    [role.name]
  );
  if (existing.length === 0) {
    await connection.execute(
      'INSERT INTO team_roles (name, description, color) VALUES (?, ?, ?)',
      [role.name, role.description, role.color]
    );
    console.log(`  Created role: ${role.name}`);
  } else {
    console.log(`  Role exists: ${role.name}`);
  }
}

// Get role IDs
const [roles] = await connection.execute('SELECT id, name FROM team_roles');
const roleMap = {};
for (const role of roles) {
  roleMap[role.name] = role.id;
}

// Define 90-Day Protocol template
const template90Day = {
  name: '90-Day Protocol',
  description: 'Standard 90-day health optimization protocol workflow',
  durationDays: 90,
  isDefault: true,
  tasks: [
    // Intake Stage
    {
      stage: 'Intake',
      name: 'Initial Contact & Qualification',
      description: 'First contact with potential client and qualification',
      dueDaysFromStart: 1,
      role: 'Client Care',
      subtasks: [
        { name: 'Receive inquiry/application', description: 'Log initial contact' },
        { name: 'Send welcome email', description: 'Automated welcome sequence' },
        { name: 'Schedule discovery call', description: 'Book initial consultation' },
        { name: 'Send intake forms', description: 'Health history, goals, waivers' },
      ]
    },
    {
      stage: 'Intake',
      name: 'Document Collection',
      description: 'Gather all required client documents',
      dueDaysFromStart: 3,
      role: 'Client Care',
      subtasks: [
        { name: 'Collect health history form', description: 'Review for completeness' },
        { name: 'Collect signed waivers', description: 'Liability and consent forms' },
        { name: 'Collect lab results (if available)', description: 'Recent bloodwork' },
        { name: 'Verify contact information', description: 'Phone, email, address' },
      ]
    },
    // Consult Stage
    {
      stage: 'Consult',
      name: 'Discovery Consultation',
      description: 'Initial consultation to assess client needs',
      dueDaysFromStart: 5,
      role: 'Practitioner',
      subtasks: [
        { name: 'Review intake documents', description: 'Prepare for consultation' },
        { name: 'Conduct discovery call', description: '30-60 minute consultation' },
        { name: 'Document client goals', description: 'Primary and secondary objectives' },
        { name: 'Assess current health status', description: 'Baseline assessment' },
        { name: 'Determine protocol fit', description: 'Recommend appropriate program' },
      ]
    },
    {
      stage: 'Consult',
      name: 'Lab Review (if applicable)',
      description: 'Review and interpret lab results',
      dueDaysFromStart: 7,
      role: 'Practitioner',
      subtasks: [
        { name: 'Review lab results', description: 'Analyze bloodwork and markers' },
        { name: 'Identify optimization opportunities', description: 'Note areas for improvement' },
        { name: 'Document recommendations', description: 'Protocol customization notes' },
      ]
    },
    // Protocol Build Stage
    {
      stage: 'Protocol Build',
      name: 'Protocol Design',
      description: 'Create customized protocol for client',
      dueDaysFromStart: 10,
      role: 'Practitioner',
      subtasks: [
        { name: 'Select base template', description: 'Choose appropriate protocol template' },
        { name: 'Customize peptide stack', description: 'Adjust based on client needs' },
        { name: 'Set dosing schedule', description: 'Personalize timing and amounts' },
        { name: 'Add supplements', description: 'Complementary supplement recommendations' },
        { name: 'Add lifestyle notes', description: 'Diet, exercise, sleep recommendations' },
        { name: 'Review for contraindications', description: 'Safety check' },
      ]
    },
    {
      stage: 'Protocol Build',
      name: 'Protocol Review & Approval',
      description: 'Client reviews and approves protocol',
      dueDaysFromStart: 12,
      role: 'Client Care',
      subtasks: [
        { name: 'Send protocol for review', description: 'Share protocol link with client' },
        { name: 'Schedule protocol walkthrough', description: 'Explain protocol details' },
        { name: 'Answer client questions', description: 'Address concerns' },
        { name: 'Obtain client approval', description: 'Confirm protocol acceptance' },
      ]
    },
    // Billing Stage
    {
      stage: 'Billing',
      name: 'Invoice & Payment',
      description: 'Generate invoice and process payment',
      dueDaysFromStart: 14,
      role: 'Operations',
      subtasks: [
        { name: 'Generate invoice', description: 'Create itemized invoice' },
        { name: 'Send invoice to client', description: 'Email payment request' },
        { name: 'Process payment', description: 'Confirm payment received' },
        { name: 'Send payment confirmation', description: 'Receipt and next steps' },
      ]
    },
    // Fulfillment Stage
    {
      stage: 'Fulfillment',
      name: 'Order Preparation',
      description: 'Prepare client order for shipping',
      dueDaysFromStart: 16,
      role: 'Shipping/Vendor',
      subtasks: [
        { name: 'Create packing slip', description: 'Generate order details' },
        { name: 'Pull inventory items', description: 'Gather all protocol items' },
        { name: 'Quality check', description: 'Verify correct items and quantities' },
        { name: 'Package order', description: 'Prepare for shipping' },
        { name: 'Generate shipping label', description: 'Create tracking number' },
      ]
    },
    {
      stage: 'Fulfillment',
      name: 'Shipping & Delivery',
      description: 'Ship order and confirm delivery',
      dueDaysFromStart: 18,
      role: 'Shipping/Vendor',
      subtasks: [
        { name: 'Ship order', description: 'Hand off to carrier' },
        { name: 'Send tracking info', description: 'Email tracking link to client' },
        { name: 'Monitor delivery', description: 'Track shipment progress' },
        { name: 'Confirm delivery', description: 'Verify client received order' },
      ]
    },
    // Onboarding Stage
    {
      stage: 'Onboarding',
      name: 'Client Onboarding',
      description: 'Educate client on protocol execution',
      dueDaysFromStart: 20,
      role: 'Client Care',
      subtasks: [
        { name: 'Send welcome kit', description: 'Digital resources and guides' },
        { name: 'Schedule onboarding call', description: 'Protocol walkthrough session' },
        { name: 'Conduct onboarding session', description: 'Teach reconstitution, injection technique' },
        { name: 'Provide support resources', description: 'FAQ, contact info, community access' },
        { name: 'Set up tracking app', description: 'PeptidePro or similar' },
      ]
    },
    {
      stage: 'Onboarding',
      name: 'First Week Check-in',
      description: 'Ensure smooth protocol start',
      dueDaysFromStart: 25,
      role: 'Client Care',
      subtasks: [
        { name: 'Send check-in message', description: 'How is first week going?' },
        { name: 'Address any issues', description: 'Troubleshoot problems' },
        { name: 'Confirm protocol adherence', description: 'Verify client is following protocol' },
        { name: 'Document feedback', description: 'Log client experience' },
      ]
    },
    // Active Protocol Stage
    {
      stage: 'Active Protocol',
      name: 'Week 2-4 Monitoring',
      description: 'Early protocol monitoring and support',
      dueDaysFromStart: 30,
      role: 'Client Care',
      subtasks: [
        { name: 'Bi-weekly check-in', description: 'Progress and adherence check' },
        { name: 'Monitor for side effects', description: 'Document any adverse reactions' },
        { name: 'Adjust protocol if needed', description: 'Minor tweaks based on response' },
        { name: 'Encourage tracking', description: 'Remind to log progress' },
      ]
    },
    {
      stage: 'Active Protocol',
      name: 'Month 2 Review',
      description: 'Mid-protocol assessment',
      dueDaysFromStart: 60,
      role: 'Practitioner',
      subtasks: [
        { name: 'Review progress metrics', description: 'Assess improvements' },
        { name: 'Conduct check-in call', description: 'Detailed progress discussion' },
        { name: 'Evaluate protocol effectiveness', description: 'Is it working?' },
        { name: 'Make adjustments', description: 'Modify protocol if needed' },
        { name: 'Plan for completion', description: 'Discuss next steps' },
      ]
    },
    {
      stage: 'Active Protocol',
      name: 'Ongoing Support',
      description: 'Continuous client support throughout protocol',
      dueDaysFromStart: 75,
      role: 'Client Care',
      subtasks: [
        { name: 'Weekly check-ins', description: 'Regular touchpoints' },
        { name: 'Answer questions', description: 'Respond to client inquiries' },
        { name: 'Provide motivation', description: 'Encouragement and accountability' },
        { name: 'Document progress', description: 'Log improvements and challenges' },
      ]
    },
    // Completion Stage
    {
      stage: 'Completion',
      name: 'Protocol Completion',
      description: 'Wrap up 90-day protocol',
      dueDaysFromStart: 90,
      role: 'Practitioner',
      subtasks: [
        { name: 'Final progress review', description: 'Assess overall results' },
        { name: 'Conduct completion call', description: 'Review journey and outcomes' },
        { name: 'Document results', description: 'Before/after comparison' },
        { name: 'Collect testimonial', description: 'Request feedback/review' },
        { name: 'Discuss next steps', description: 'Continuation or maintenance options' },
      ]
    },
    {
      stage: 'Completion',
      name: 'Follow-up & Retention',
      description: 'Post-protocol follow-up',
      dueDaysFromStart: 95,
      role: 'Client Care',
      subtasks: [
        { name: 'Send completion certificate', description: 'Acknowledge achievement' },
        { name: 'Present continuation options', description: '12-month program, maintenance' },
        { name: 'Request referrals', description: 'Referral program invitation' },
        { name: 'Schedule follow-up', description: 'Book 30-day post-protocol check' },
      ]
    },
  ]
};

// Define 12-Month Protocol template
const template12Month = {
  name: '12-Month Ultimate Omega Program',
  description: 'Comprehensive 12-month elite optimization program workflow',
  durationDays: 365,
  isDefault: false,
  tasks: [
    // Intake Stage
    {
      stage: 'Intake',
      name: 'Application & Qualification',
      description: 'Application review and client qualification',
      dueDaysFromStart: 1,
      role: 'Client Care',
      subtasks: [
        { name: 'Review application', description: 'Assess program fit' },
        { name: 'Send welcome package', description: 'Program overview and expectations' },
        { name: 'Schedule qualification call', description: 'Book screening consultation' },
        { name: 'Send comprehensive intake forms', description: 'Detailed health history' },
      ]
    },
    {
      stage: 'Intake',
      name: 'Comprehensive Document Collection',
      description: 'Gather all required documentation',
      dueDaysFromStart: 5,
      role: 'Client Care',
      subtasks: [
        { name: 'Collect detailed health history', description: 'Complete medical background' },
        { name: 'Collect all waivers and agreements', description: 'Legal documentation' },
        { name: 'Request recent lab work', description: 'Comprehensive panel' },
        { name: 'Collect lifestyle assessment', description: 'Diet, exercise, sleep, stress' },
        { name: 'Verify insurance/payment method', description: 'Financial qualification' },
      ]
    },
    // Consult Stage
    {
      stage: 'Consult',
      name: 'Comprehensive Consultation',
      description: 'In-depth initial consultation',
      dueDaysFromStart: 10,
      role: 'Practitioner',
      subtasks: [
        { name: 'Review all intake documents', description: 'Thorough preparation' },
        { name: 'Conduct 90-minute consultation', description: 'Deep dive assessment' },
        { name: 'Establish baseline metrics', description: 'Document starting point' },
        { name: 'Set 12-month goals', description: 'Define success criteria' },
        { name: 'Create phased approach', description: 'Quarterly milestones' },
      ]
    },
    {
      stage: 'Consult',
      name: 'Lab Analysis & Recommendations',
      description: 'Comprehensive lab review',
      dueDaysFromStart: 14,
      role: 'Practitioner',
      subtasks: [
        { name: 'Analyze comprehensive labs', description: 'Full panel review' },
        { name: 'Identify optimization priorities', description: 'Key areas to address' },
        { name: 'Create supplement protocol', description: 'Foundation supplements' },
        { name: 'Design Phase 1 peptide stack', description: 'Initial protocol' },
        { name: 'Document long-term strategy', description: '12-month roadmap' },
      ]
    },
    // Protocol Build Stage
    {
      stage: 'Protocol Build',
      name: 'Phase 1 Protocol Design (Q1)',
      description: 'Build first quarter protocol',
      dueDaysFromStart: 18,
      role: 'Practitioner',
      subtasks: [
        { name: 'Design Q1 peptide protocol', description: 'Foundation phase' },
        { name: 'Set Q1 supplement stack', description: 'Supporting supplements' },
        { name: 'Create lifestyle recommendations', description: 'Diet, exercise, sleep' },
        { name: 'Define Q1 success metrics', description: 'Measurable goals' },
        { name: 'Prepare client education materials', description: 'Phase 1 guides' },
      ]
    },
    {
      stage: 'Protocol Build',
      name: 'Protocol Presentation & Approval',
      description: 'Present and approve full program',
      dueDaysFromStart: 21,
      role: 'Client Care',
      subtasks: [
        { name: 'Schedule protocol presentation', description: 'Book detailed walkthrough' },
        { name: 'Present 12-month roadmap', description: 'Overview of all phases' },
        { name: 'Review Phase 1 in detail', description: 'Immediate protocol' },
        { name: 'Address questions and concerns', description: 'Full Q&A' },
        { name: 'Obtain program commitment', description: 'Client approval' },
      ]
    },
    // Billing Stage
    {
      stage: 'Billing',
      name: 'Program Enrollment & Payment',
      description: 'Process enrollment and payment',
      dueDaysFromStart: 25,
      role: 'Operations',
      subtasks: [
        { name: 'Generate program invoice', description: 'Full program or payment plan' },
        { name: 'Set up payment schedule', description: 'Monthly or quarterly billing' },
        { name: 'Process initial payment', description: 'First payment' },
        { name: 'Send enrollment confirmation', description: 'Welcome to the program' },
        { name: 'Set up recurring billing', description: 'Automated payments' },
      ]
    },
    // Fulfillment Stage
    {
      stage: 'Fulfillment',
      name: 'Phase 1 Order Preparation',
      description: 'Prepare Q1 supplies',
      dueDaysFromStart: 28,
      role: 'Shipping/Vendor',
      subtasks: [
        { name: 'Generate Q1 packing list', description: 'All Phase 1 items' },
        { name: 'Pull inventory', description: 'Gather all items' },
        { name: 'Quality assurance check', description: 'Verify everything' },
        { name: 'Package with care instructions', description: 'Include guides' },
        { name: 'Generate shipping label', description: 'Priority shipping' },
      ]
    },
    {
      stage: 'Fulfillment',
      name: 'Phase 1 Shipping',
      description: 'Ship Q1 supplies',
      dueDaysFromStart: 30,
      role: 'Shipping/Vendor',
      subtasks: [
        { name: 'Ship order', description: 'Priority carrier' },
        { name: 'Send tracking information', description: 'Real-time updates' },
        { name: 'Monitor delivery', description: 'Track progress' },
        { name: 'Confirm receipt', description: 'Client received order' },
      ]
    },
    // Onboarding Stage
    {
      stage: 'Onboarding',
      name: 'Comprehensive Onboarding',
      description: 'Full program onboarding',
      dueDaysFromStart: 33,
      role: 'Client Care',
      subtasks: [
        { name: 'Send elite welcome kit', description: 'Premium resources' },
        { name: 'Schedule onboarding session', description: '90-minute deep dive' },
        { name: 'Conduct hands-on training', description: 'Reconstitution, injection, tracking' },
        { name: 'Set up all tracking tools', description: 'Apps, journals, metrics' },
        { name: 'Introduce support team', description: 'Meet your team' },
        { name: 'Grant community access', description: 'Omega Elite Community' },
      ]
    },
    {
      stage: 'Onboarding',
      name: 'First Week Elite Support',
      description: 'Intensive first week support',
      dueDaysFromStart: 40,
      role: 'Client Care',
      subtasks: [
        { name: 'Daily check-ins', description: 'First week touchpoints' },
        { name: 'Address any issues immediately', description: 'Rapid response' },
        { name: 'Verify protocol adherence', description: 'Confirm proper execution' },
        { name: 'Celebrate first week completion', description: 'Milestone acknowledgment' },
      ]
    },
    // Active Protocol Stage - Q1
    {
      stage: 'Active Protocol',
      name: 'Q1 Active Monitoring (Days 30-90)',
      description: 'First quarter active support',
      dueDaysFromStart: 90,
      role: 'Client Care',
      subtasks: [
        { name: 'Weekly check-ins', description: 'Regular touchpoints' },
        { name: 'Bi-weekly coaching calls', description: 'Scheduled support' },
        { name: 'Monitor progress metrics', description: 'Track improvements' },
        { name: 'Adjust protocol as needed', description: 'Fine-tuning' },
        { name: 'Prepare Q1 review', description: 'Quarterly assessment' },
      ]
    },
    {
      stage: 'Active Protocol',
      name: 'Q1 Review & Q2 Planning',
      description: 'End of Q1 assessment and Q2 prep',
      dueDaysFromStart: 95,
      role: 'Practitioner',
      subtasks: [
        { name: 'Conduct Q1 review call', description: 'Comprehensive assessment' },
        { name: 'Analyze Q1 results', description: 'What worked, what didn\'t' },
        { name: 'Design Q2 protocol', description: 'Next phase adjustments' },
        { name: 'Order Q2 supplies', description: 'Next quarter fulfillment' },
        { name: 'Set Q2 goals', description: 'Updated targets' },
      ]
    },
    // Q2
    {
      stage: 'Active Protocol',
      name: 'Q2 Active Monitoring (Days 91-180)',
      description: 'Second quarter active support',
      dueDaysFromStart: 180,
      role: 'Client Care',
      subtasks: [
        { name: 'Weekly check-ins', description: 'Regular touchpoints' },
        { name: 'Bi-weekly coaching calls', description: 'Scheduled support' },
        { name: 'Mid-program labs', description: 'Progress bloodwork' },
        { name: 'Monitor progress metrics', description: 'Track improvements' },
        { name: 'Prepare Q2 review', description: 'Quarterly assessment' },
      ]
    },
    {
      stage: 'Active Protocol',
      name: 'Q2 Review & Q3 Planning',
      description: 'Mid-year assessment and Q3 prep',
      dueDaysFromStart: 185,
      role: 'Practitioner',
      subtasks: [
        { name: 'Conduct mid-year review', description: 'Comprehensive 6-month assessment' },
        { name: 'Analyze lab results', description: 'Compare to baseline' },
        { name: 'Design Q3 protocol', description: 'Advanced phase' },
        { name: 'Order Q3 supplies', description: 'Next quarter fulfillment' },
        { name: 'Adjust long-term strategy', description: 'Refine roadmap' },
      ]
    },
    // Q3
    {
      stage: 'Active Protocol',
      name: 'Q3 Active Monitoring (Days 181-270)',
      description: 'Third quarter active support',
      dueDaysFromStart: 270,
      role: 'Client Care',
      subtasks: [
        { name: 'Weekly check-ins', description: 'Regular touchpoints' },
        { name: 'Bi-weekly coaching calls', description: 'Scheduled support' },
        { name: 'Monitor progress metrics', description: 'Track improvements' },
        { name: 'Prepare Q3 review', description: 'Quarterly assessment' },
      ]
    },
    {
      stage: 'Active Protocol',
      name: 'Q3 Review & Q4 Planning',
      description: 'Q3 assessment and final quarter prep',
      dueDaysFromStart: 275,
      role: 'Practitioner',
      subtasks: [
        { name: 'Conduct Q3 review call', description: 'Comprehensive assessment' },
        { name: 'Analyze Q3 results', description: 'Progress evaluation' },
        { name: 'Design Q4 protocol', description: 'Final phase optimization' },
        { name: 'Order Q4 supplies', description: 'Final quarter fulfillment' },
        { name: 'Plan completion strategy', description: 'Maintenance transition' },
      ]
    },
    // Q4
    {
      stage: 'Active Protocol',
      name: 'Q4 Active Monitoring (Days 271-365)',
      description: 'Final quarter active support',
      dueDaysFromStart: 350,
      role: 'Client Care',
      subtasks: [
        { name: 'Weekly check-ins', description: 'Regular touchpoints' },
        { name: 'Bi-weekly coaching calls', description: 'Scheduled support' },
        { name: 'Final labs', description: 'End-of-program bloodwork' },
        { name: 'Monitor progress metrics', description: 'Track final improvements' },
        { name: 'Prepare completion review', description: 'Final assessment' },
      ]
    },
    // Completion Stage
    {
      stage: 'Completion',
      name: 'Program Completion',
      description: 'Complete 12-month program',
      dueDaysFromStart: 365,
      role: 'Practitioner',
      subtasks: [
        { name: 'Conduct final review call', description: 'Comprehensive year review' },
        { name: 'Analyze final lab results', description: 'Compare to baseline' },
        { name: 'Document transformation', description: 'Before/after documentation' },
        { name: 'Create maintenance protocol', description: 'Long-term sustainability' },
        { name: 'Collect detailed testimonial', description: 'Success story' },
      ]
    },
    {
      stage: 'Completion',
      name: 'Alumni Transition',
      description: 'Transition to alumni program',
      dueDaysFromStart: 370,
      role: 'Client Care',
      subtasks: [
        { name: 'Present alumni options', description: 'Continuation programs' },
        { name: 'Send completion certificate', description: 'Achievement recognition' },
        { name: 'Invite to alumni community', description: 'Ongoing support' },
        { name: 'Request referrals', description: 'Referral program' },
        { name: 'Schedule 30-day follow-up', description: 'Post-program check' },
      ]
    },
  ]
};

// Function to insert a template with tasks and subtasks
async function insertTemplate(template) {
  // Check if template exists
  const [existing] = await connection.execute(
    'SELECT id FROM workflow_templates WHERE name = ?',
    [template.name]
  );
  
  let templateId;
  if (existing.length > 0) {
    templateId = existing[0].id;
    console.log(`Template exists: ${template.name} (ID: ${templateId})`);
    // Update existing template
    await connection.execute(
      'UPDATE workflow_templates SET description = ?, durationDays = ?, isDefault = ? WHERE id = ?',
      [template.description, template.durationDays, template.isDefault, templateId]
    );
  } else {
    // Insert new template
    const [result] = await connection.execute(
      'INSERT INTO workflow_templates (name, description, durationDays, isDefault) VALUES (?, ?, ?, ?)',
      [template.name, template.description, template.durationDays, template.isDefault]
    );
    templateId = result.insertId;
    console.log(`Created template: ${template.name} (ID: ${templateId})`);
  }
  
  // Insert tasks
  let taskOrder = 0;
  for (const task of template.tasks) {
    const stageId = stageMap[task.stage];
    const roleId = roleMap[task.role] || null;
    
    // Check if task exists
    const [existingTask] = await connection.execute(
      'SELECT id FROM workflow_template_tasks WHERE workflowTemplateId = ? AND name = ?',
      [templateId, task.name]
    );
    
    let taskId;
    if (existingTask.length > 0) {
      taskId = existingTask[0].id;
      // Update existing task
      await connection.execute(
        'UPDATE workflow_template_tasks SET description = ?, lifecycleStageId = ?, defaultOwnerRoleId = ?, dueDaysFromStart = ?, sortOrder = ? WHERE id = ?',
        [task.description, stageId, roleId, task.dueDaysFromStart, taskOrder, taskId]
      );
    } else {
      // Insert new task
      const [taskResult] = await connection.execute(
        'INSERT INTO workflow_template_tasks (workflowTemplateId, lifecycleStageId, name, description, defaultOwnerRoleId, dueDaysFromStart, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [templateId, stageId, task.name, task.description, roleId, task.dueDaysFromStart, taskOrder]
      );
      taskId = taskResult.insertId;
    }
    taskOrder++;
    
    // Insert subtasks
    let subtaskOrder = 0;
    for (const subtask of task.subtasks) {
      // Check if subtask exists
      const [existingSubtask] = await connection.execute(
        'SELECT id FROM workflow_template_subtasks WHERE workflowTemplateTaskId = ? AND name = ?',
        [taskId, subtask.name]
      );
      
      if (existingSubtask.length === 0) {
        await connection.execute(
          'INSERT INTO workflow_template_subtasks (workflowTemplateTaskId, name, description, sortOrder) VALUES (?, ?, ?, ?)',
          [taskId, subtask.name, subtask.description, subtaskOrder]
        );
      } else {
        await connection.execute(
          'UPDATE workflow_template_subtasks SET description = ?, sortOrder = ? WHERE id = ?',
          [subtask.description, subtaskOrder, existingSubtask[0].id]
        );
      }
      subtaskOrder++;
    }
  }
  
  console.log(`  Inserted ${template.tasks.length} tasks with subtasks`);
}

// Run the seed
console.log('\nSeeding 90-Day Protocol template...');
await insertTemplate(template90Day);

console.log('\nSeeding 12-Month Ultimate Omega Program template...');
await insertTemplate(template12Month);

console.log('\nSeed completed successfully!');
await connection.end();
