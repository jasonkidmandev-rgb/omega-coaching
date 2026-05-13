/**
 * Migration script: Update intake_form_config to match the new 9-step streamlined form.
 * 
 * New 9-step structure:
 *   1. financial       - Financial Agreement (signature) — KEEP as-is
 *   2. waiver          - Consulting Waiver (signature) — KEEP as-is
 *   3. agreements      - Agreements & Privacy (signature + checkbox) — NEW (merges privacy + collaboration)
 *   4. demographics    - Your Information — NEW (replaces personal_info, no address)
 *   5. healthProfile   - Health Profile — NEW (body comp + goals + safety screening)
 *   6. healthMeds      - Health & Medications — NEW (merges health_history, current_medications, allergies, dietary)
 *   7. emergency       - Emergency Contact — KEEP (update sectionNumber)
 *   8. lifestyle       - Lifestyle & Readiness — NEW (merges lifestyle, exercise, sleep, stress + capacity)
 *   9. review          - Review & Submit — NEW (includes referral)
 * 
 * Old sections to deactivate: privacy(3), collaboration(4), personal_info(5), health_history(6),
 *   current_medications(7), allergies(8), health_goals(9), lifestyle(10), dietary(11), exercise(12),
 *   sleep(13), stress(14), medical_provider(16), informed_consent(17)
 */

import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('Starting intake form section migration...');
  
  // Step 1: Deactivate old sections that have been merged/replaced
  const deactivateKeys = [
    'privacy', 'collaboration', 'personal_info', 'health_history',
    'current_medications', 'allergies', 'health_goals', 'lifestyle',
    'dietary', 'exercise', 'sleep', 'stress', 'medical_provider', 'informed_consent'
  ];
  
  for (const key of deactivateKeys) {
    await conn.execute(
      'UPDATE intake_form_config SET isActive = 0 WHERE sectionKey = ?',
      [key]
    );
    console.log(`  Deactivated: ${key}`);
  }
  
  // Step 2: Update existing sections that are kept (financial, waiver, emergency_contact)
  // financial stays at section 1
  await conn.execute(
    'UPDATE intake_form_config SET sectionNumber = 1, sortOrder = 1 WHERE sectionKey = ?',
    ['financial']
  );
  console.log('  Updated: financial -> section 1');
  
  // waiver stays at section 2
  await conn.execute(
    'UPDATE intake_form_config SET sectionNumber = 2, sortOrder = 2 WHERE sectionKey = ?',
    ['waiver']
  );
  console.log('  Updated: waiver -> section 2');
  
  // emergency_contact moves to section 7
  await conn.execute(
    'UPDATE intake_form_config SET sectionNumber = 7, sortOrder = 7 WHERE sectionKey = ?',
    ['emergency_contact']
  );
  console.log('  Updated: emergency_contact -> section 7');
  
  // Step 3: Insert new merged sections
  const newSections = [
    {
      sectionKey: 'agreements',
      sectionNumber: 3,
      title: 'Agreements & Privacy',
      displayText: 'Combined Privacy Disclosure acknowledgment and Collaboration Agreement with signature. Includes AI services notice, tardiness/cancellation policies, and parent/guardian signature for minors.',
      isRequired: true,
      requiresSignature: true,
      requiresCheckbox: true,
      sortOrder: 3,
    },
    {
      sectionKey: 'demographics',
      sectionNumber: 4,
      title: 'Your Information',
      displayText: 'Client demographics: full name, date of birth, sex, email, and mobile phone. Address fields have been removed (collected at point of sale instead).',
      isRequired: true,
      requiresSignature: false,
      requiresCheckbox: false,
      sortOrder: 4,
    },
    {
      sectionKey: 'healthProfile',
      sectionNumber: 5,
      title: 'Health Profile',
      displayText: 'Body composition (height, weight, goal weight), peptide goals selection with primary/secondary designation, previous peptide experience, and safety screening flags.',
      isRequired: true,
      requiresSignature: false,
      requiresCheckbox: false,
      sortOrder: 5,
    },
    {
      sectionKey: 'healthMeds',
      sectionNumber: 6,
      title: 'Health & Medications',
      displayText: 'Current medications (including psychiatric), medical conditions/diagnoses, current supplements, and physical activity routine. Consolidates the former Health History, Medications, Allergies, and Dietary sections.',
      isRequired: true,
      requiresSignature: false,
      requiresCheckbox: false,
      sortOrder: 6,
    },
    {
      sectionKey: 'lifestyle_readiness',
      sectionNumber: 8,
      title: 'Lifestyle & Readiness',
      displayText: 'Substance use (consolidated), sleep duration/quality, stress level, wearable devices, aggressiveness scales (synergistic, financial, organizational), weekly time commitment, and optional notes for coach.',
      isRequired: true,
      requiresSignature: false,
      requiresCheckbox: false,
      sortOrder: 8,
    },
    {
      sectionKey: 'review',
      sectionNumber: 9,
      title: 'Review & Submit',
      displayText: 'Referral source, review summary of all provided information, signature status check, and form submission. Clients can navigate back to any section to make changes before submitting.',
      isRequired: true,
      requiresSignature: false,
      requiresCheckbox: false,
      sortOrder: 9,
    },
  ];
  
  for (const section of newSections) {
    try {
      await conn.execute(
        `INSERT INTO intake_form_config (sectionKey, sectionNumber, title, displayText, isRequired, requiresSignature, requiresCheckbox, isActive, sortOrder)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          section.sectionKey,
          section.sectionNumber,
          section.title,
          section.displayText,
          section.isRequired,
          section.requiresSignature,
          section.requiresCheckbox,
          section.sortOrder,
        ]
      );
      console.log(`  Created: ${section.sectionKey} -> section ${section.sectionNumber}`);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        // Already exists, update it instead
        await conn.execute(
          `UPDATE intake_form_config SET sectionNumber = ?, title = ?, displayText = ?, isRequired = ?, requiresSignature = ?, requiresCheckbox = ?, isActive = 1, sortOrder = ? WHERE sectionKey = ?`,
          [
            section.sectionNumber,
            section.title,
            section.displayText,
            section.isRequired,
            section.requiresSignature,
            section.requiresCheckbox,
            section.sortOrder,
            section.sectionKey,
          ]
        );
        console.log(`  Updated (already existed): ${section.sectionKey} -> section ${section.sectionNumber}`);
      } else {
        throw err;
      }
    }
  }
  
  // Step 4: Verify final state
  const [rows] = await conn.execute(
    'SELECT id, sectionKey, sectionNumber, title, isActive, sortOrder FROM intake_form_config WHERE isActive = 1 ORDER BY sortOrder'
  );
  
  console.log('\n=== Final Active Sections ===');
  console.table(rows);
  
  await conn.end();
  console.log('\nMigration complete!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
