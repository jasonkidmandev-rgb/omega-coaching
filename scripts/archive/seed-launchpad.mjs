import mysql from 'mysql2/promise';

async function seedLaunchpadItems() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  const items = [
    { key: 'healthie', name: 'Healthie', shortDescription: 'Intake forms, waivers, health goals, and secure document uploads', longDescription: 'Healthie is our secure platform for managing your health journey. Upload labs, complete intake forms, sign waivers, and set your health goals all in one place.', category: 'platform', sortOrder: 1 },
    { key: 'omega_elite_community', name: 'Omega Elite Community', shortDescription: 'Online coaching platform with cutting-edge biohacking protocols', longDescription: 'Join our exclusive community for $69/mo (7 days free) and get access to cutting-edge biohacking, weight loss, recovery, and longevity protocols from elite coaches.', category: 'platform', sortOrder: 2 },
    { key: 'peptidepro_app', name: 'PeptidePro.App', shortDescription: 'Day-to-day protocol tracking on any device', longDescription: 'Your personal protocol companion. Login on computer or phone to see your daily protocol, check items off as you complete them, and stay on track with your health optimization journey.', category: 'platform', sortOrder: 3 },
    { key: 'omega_practitioner', name: 'Omega Peptide Practitioner', shortDescription: 'Connect with our practitioner network', longDescription: 'Get connected with our network of qualified peptide practitioners who can help guide your optimization journey with professional medical oversight.', category: 'platform', sortOrder: 4 },
    { key: 'ultimate_omega_program', name: '12 Month Ultimate Omega Elite Optimization Program', shortDescription: 'Our flagship 12-month transformation program', longDescription: 'The Ultimate Omega Elite Optimization Program is our comprehensive 12-month journey designed to transform your health at the cellular level. Includes quarterly phases, personalized protocols, and ongoing coaching support.', category: 'coaching', sortOrder: 5 },
    { key: 'protocol_hub', name: 'Protocol Collaboration Center', shortDescription: 'Review, approve, and discuss your personalized protocol', longDescription: 'Your central hub for protocol management. Review your personalized protocol, approve it when ready, leave comments, and watch embedded Loom videos from your coach explaining each component.', category: 'resource', sortOrder: 6 },
    { key: 'elite_weight_loss_diy', name: 'Elite Weight Loss & Lean Muscle DIY Program', shortDescription: 'Self-guided weight loss and muscle building program', longDescription: 'Coming Soon! Our comprehensive DIY program includes video tutorials, supplement recommendations, exercise templates, and a complete protocol guide for $300.', category: 'course', sortOrder: 7 },
    { key: '90_day_protocol_build', name: '90 Day Protocol Build', shortDescription: 'Custom protocol design with PeptidePro setup', longDescription: 'Get a custom protocol designed specifically for your goals. Includes PeptidePro schedule setup, 1 month Omega Elite access, and email support for $500.', category: 'coaching', sortOrder: 8 },
    { key: '90_day_transformation', name: '90 Day Transformation Mentorship', shortDescription: 'Our flagship life-changing protocol', longDescription: 'Our flagship mentorship program. Full protocol design, reconstitution training call, weekly coaching calls, and unlimited messaging support. After 90 days, eligible for Alumni Mentorship. $2,500 + peptide costs.', category: 'coaching', sortOrder: 9 },
    { key: '90_day_alumni', name: '90 Day Alumni Mentorship', shortDescription: 'Continued support for returning clients', longDescription: 'For clients who have completed the Transformation Mentorship. Protocol refinement, bi-weekly coaching calls, messaging support, and PeptidePro updates for $1,500.', category: 'coaching', sortOrder: 10 },
  ];
  
  for (const item of items) {
    try {
      await connection.execute(
        `INSERT INTO launchpad_items (\`key\`, name, shortDescription, longDescription, category, sortOrder, isActive) 
         VALUES (?, ?, ?, ?, ?, ?, true) 
         ON DUPLICATE KEY UPDATE name=VALUES(name), shortDescription=VALUES(shortDescription), longDescription=VALUES(longDescription)`,
        [item.key, item.name, item.shortDescription, item.longDescription, item.category, item.sortOrder]
      );
      console.log('Added:', item.name);
    } catch (err) {
      console.error('Error adding', item.name, err.message);
    }
  }
  
  await connection.end();
  console.log('Done!');
}

seedLaunchpadItems().catch(console.error);
