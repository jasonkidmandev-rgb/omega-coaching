/**
 * Backfill Missing Prospects
 * 
 * Creates prospect records for clients/enrollments that don't have one.
 * This ensures Shannon can see every person in the lead pipeline.
 */
import mysql from 'mysql2/promise';
import crypto from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;

async function run() {
  const conn = await mysql.createConnection(DATABASE_URL);
  console.log('Connected to database\n');

  // 1. Find all clients that have NO matching prospect (by email)
  const [missingClients] = await conn.execute(`
    SELECT c.id, c.name, c.email, c.phone, c.createdAt,
      te.id as enrollmentId, te.tier, te.status as enrollmentStatus, te.coachingFeeAmount
    FROM clients c
    LEFT JOIN prospects p ON p.email = c.email
    LEFT JOIN transformation_enrollments te ON te.email = c.email
    WHERE p.id IS NULL
      AND c.email IS NOT NULL
      AND c.email != ''
      AND c.email != 'test@test.com'
    ORDER BY c.createdAt ASC
  `);

  console.log(`Found ${missingClients.length} clients without prospect records\n`);

  let created = 0;
  let skipped = 0;
  const results = [];

  for (const client of missingClients) {
    // Skip internal team members
    const internalEmails = [
      'jason@kidmancorp.com', 'jkidman@gmail.com',
      'shannon@omegalongevity.com',
      'vienvelle@gmail.com',
    ];
    if (internalEmails.includes(client.email?.toLowerCase())) {
      console.log(`  SKIP (internal): ${client.name} <${client.email}>`);
      skipped++;
      continue;
    }

    const trackingToken = crypto.randomBytes(16).toString('hex');
    const phone = client.phone || 'not-provided';
    
    // Determine status based on enrollment
    let status = 'new';
    let source = 'backfill-client';
    let notes = `Backfilled from client record #${client.id}. `;
    
    if (client.enrollmentId) {
      // Has an enrollment - they're enrolled
      status = 'enrolled';
      source = 'enrollment-backfill';
      notes += `Enrolled in ${client.tier || 'unknown'} tier (enrollment #${client.enrollmentId}, status: ${client.enrollmentStatus}).`;
      if (client.coachingFeeAmount) {
        notes += ` Coaching fee: $${client.coachingFeeAmount}.`;
      }
    } else {
      // No enrollment - they're a client but may not have gone through pipeline
      source = 'client-backfill';
      notes += `Client created ${new Date(client.createdAt).toLocaleDateString()} but no enrollment found. May need follow-up.`;
    }

    try {
      const [result] = await conn.execute(
        `INSERT INTO prospects (name, email, phone, status, source, notes, trackingToken, enrollmentId, lastContactedAt, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          client.name,
          client.email,
          phone,
          status,
          source,
          notes,
          trackingToken,
          client.enrollmentId || null,
          client.createdAt, // Use original client creation date as last contacted
          client.createdAt, // Preserve original timeline
        ]
      );

      console.log(`  CREATED: ${client.name} <${client.email}> → status=${status}, source=${source} (prospect #${result.insertId})`);
      results.push({ name: client.name, email: client.email, status, prospectId: result.insertId });
      created++;
    } catch (err) {
      console.error(`  ERROR: ${client.name} <${client.email}> → ${err.message}`);
    }
  }

  // 2. Also check for enrollments that have no client AND no prospect (edge case)
  const [orphanEnrollments] = await conn.execute(`
    SELECT te.id, te.clientName, te.email, te.phone, te.tier, te.status, te.coachingFeeAmount, te.createdAt
    FROM transformation_enrollments te
    LEFT JOIN prospects p ON p.email = te.email
    LEFT JOIN clients c ON c.email = te.email
    WHERE p.id IS NULL
      AND c.id IS NULL
      AND te.email IS NOT NULL
      AND te.email != ''
  `);

  if (orphanEnrollments.length > 0) {
    console.log(`\nFound ${orphanEnrollments.length} orphan enrollments (no client, no prospect):`);
    for (const te of orphanEnrollments) {
      const trackingToken = crypto.randomBytes(16).toString('hex');
      try {
        const [result] = await conn.execute(
          `INSERT INTO prospects (name, email, phone, status, source, notes, trackingToken, enrollmentId, lastContactedAt, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            te.clientName,
            te.email,
            te.phone || 'not-provided',
            'enrolled',
            'orphan-enrollment-backfill',
            `Backfilled from orphan enrollment #${te.id} (${te.tier} tier, status: ${te.status}). No client record found.`,
            trackingToken,
            te.id,
            te.createdAt,
            te.createdAt,
          ]
        );
        console.log(`  CREATED: ${te.clientName} <${te.email}> → enrolled (prospect #${result.insertId})`);
        created++;
      } catch (err) {
        console.error(`  ERROR: ${te.clientName} <${te.email}> → ${err.message}`);
      }
    }
  }

  console.log(`\n=== BACKFILL COMPLETE ===`);
  console.log(`Created: ${created}`);
  console.log(`Skipped (internal): ${skipped}`);
  
  // Verify final counts
  const [finalCount] = await conn.execute('SELECT COUNT(*) as cnt FROM prospects');
  const [enrolledCount] = await conn.execute("SELECT COUNT(*) as cnt FROM prospects WHERE status = 'enrolled'");
  console.log(`\nTotal prospects now: ${finalCount[0].cnt}`);
  console.log(`Total enrolled: ${enrolledCount[0].cnt}`);

  await conn.end();
}

run().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
