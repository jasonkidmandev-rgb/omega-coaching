/**
 * Seeds the default weekly check-in template with 13 questions.
 * Run: DATABASE_URL=<url> node scripts/seed-checkin-template.mjs
 *
 * Safe to run multiple times — skips if a template already exists.
 */
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const questions = [
  {
    id: 'q_1',
    text: 'How would you rate your overall wellbeing this week?',
    type: 'scale',
    required: true,
    order: 0,
  },
  {
    id: 'q_2',
    text: 'How are your energy levels?',
    type: 'scale',
    required: true,
    order: 1,
  },
  {
    id: 'q_3',
    text: 'How is your sleep quality?',
    type: 'scale',
    required: true,
    order: 2,
  },
  {
    id: 'q_4',
    text: 'How would you rate your stress levels this week? (1 = very stressed, 10 = very calm)',
    type: 'scale',
    required: true,
    order: 3,
  },
  {
    id: 'q_5',
    text: 'How is your mood and mental state?',
    type: 'scale',
    required: true,
    order: 4,
  },
  {
    id: 'q_6',
    text: 'How well are you adhering to your training program?',
    type: 'scale',
    required: true,
    order: 5,
  },
  {
    id: 'q_7',
    text: 'How well are you adhering to your nutrition plan?',
    type: 'scale',
    required: true,
    order: 6,
  },
  {
    id: 'q_8',
    text: 'How well are you adhering to your supplementation/peptide protocol?',
    type: 'scale',
    required: true,
    order: 7,
  },
  {
    id: 'q_9',
    text: 'How would you rate your nasal breathing practice this week?',
    type: 'scale',
    required: true,
    order: 8,
  },
  {
    id: 'q_10',
    text: 'Did you complete your daily neuroplastic morning routine?',
    type: 'checkbox',
    required: false,
    order: 9,
  },
  {
    id: 'q_11',
    text: 'What were your biggest wins this week?',
    type: 'text',
    required: false,
    order: 10,
  },
  {
    id: 'q_12',
    text: 'What challenges did you face this week?',
    type: 'text',
    required: false,
    order: 11,
  },
  {
    id: 'q_13',
    text: 'Do you have any questions or concerns for your coach?',
    type: 'text',
    required: false,
    order: 12,
  },
];

const conn = await mysql.createConnection(DATABASE_URL);

try {
  const [rows] = await conn.execute('SELECT COUNT(*) AS cnt FROM checkin_templates');
  const count = rows[0].cnt;

  if (count > 0) {
    console.log(`✅ checkin_templates already has ${count} row(s) — skipping seed.`);
    process.exit(0);
  }

  await conn.execute(
    'INSERT INTO checkin_templates (name, description, is_default, is_active, questions) VALUES (?, ?, ?, ?, ?)',
    [
      'Default Weekly Check-in',
      'Standard 13-question weekly check-in covering wellbeing, adherence, and open feedback.',
      1,
      1,
      JSON.stringify(questions),
    ]
  );

  console.log('✅ Default weekly check-in template seeded with 13 questions.');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
} finally {
  await conn.end();
}
