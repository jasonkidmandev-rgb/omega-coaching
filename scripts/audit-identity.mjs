import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.DATABASE_URL);

const q = async (label, sql) => {
  try {
    const [r] = await conn.query(sql);
    console.log(`\n--- ${label} ---`);
    console.log(JSON.stringify(r, null, 1).slice(0, 1500));
  } catch (e) {
    console.log(`\n--- ${label} ---\nERROR: ${e.message}`);
  }
};

// Does a legacy `clients` table still exist?
await q('legacy `clients` table exists?', `
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients'`);

// Are the leftover clientId columns actually populated?
await q('leftover clientId columns — populated?', `
  SELECT 'transformation_enrollments' t, COUNT(*) total, COUNT(clientId) withClientId FROM transformation_enrollments
  UNION ALL SELECT 'prospects', COUNT(*), COUNT(clientId) FROM prospects
  UNION ALL SELECT 'appointments', COUNT(*), COUNT(clientId) FROM appointments
  UNION ALL SELECT 'client_packages', COUNT(*), COUNT(clientId) FROM client_packages
  UNION ALL SELECT 'automation_events', COUNT(*), COUNT(clientId) FROM automation_events
  UNION ALL SELECT 'transformation_code_usage', COUNT(*), COUNT(clientId) FROM transformation_code_usage`);

// contactId coverage on the main tables
await q('contactId coverage', `
  SELECT 'client_protocols' t, COUNT(*) total, COUNT(contactId) withContact FROM client_protocols
  UNION ALL SELECT 'custom_orders', COUNT(*), COUNT(contactId) FROM custom_orders
  UNION ALL SELECT 'packing_slips', COUNT(*), COUNT(contactId) FROM packing_slips
  UNION ALL SELECT 'protocol_comments', COUNT(*), COUNT(contactId) FROM protocol_comments
  UNION ALL SELECT 'documents', COUNT(*), COUNT(contactId) FROM documents
  UNION ALL SELECT 'transformation_enrollments', COUNT(*), COUNT(contactId) FROM transformation_enrollments
  UNION ALL SELECT 'users', COUNT(*), COUNT(contactId) FROM users
  UNION ALL SELECT 'prospects', COUNT(*), COUNT(contactId) FROM prospects`);

// store_orders / saved_addresses are keyed to userId, not contactId
await q('userId-keyed vs contact world', `
  SELECT 'store_orders' t, COUNT(*) total, COUNT(userId) withUser FROM store_orders
  UNION ALL SELECT 'saved_addresses', COUNT(*), COUNT(userId) FROM saved_addresses
  UNION ALL SELECT 'progress_photos', COUNT(*), COUNT(userId) FROM progress_photos
  UNION ALL SELECT 'intake_form_responses', COUNT(*), COUNT(userId) FROM intake_form_responses`);

// How many contacts actually have a login (user account)?
await q('contacts with vs without a user account', `
  SELECT COUNT(*) totalContacts,
         SUM(CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END) withUserAccount
  FROM contacts c LEFT JOIN users u ON u.contactId = c.id`);

// Address fragmentation: how many distinct addresses per person?
await q('address copies per contact (top offenders)', `
  SELECT contactId, COUNT(DISTINCT CONCAT(COALESCE(shippingStreet,''),'|',COALESCE(shippingZip,''))) distinctAddrs
  FROM client_protocols WHERE shippingStreet IS NOT NULL AND shippingStreet <> ''
  GROUP BY contactId HAVING distinctAddrs > 1 ORDER BY distinctAddrs DESC LIMIT 10`);

await conn.end();
