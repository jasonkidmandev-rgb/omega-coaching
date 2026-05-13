// Script to update category icons in the database
// Run with: node scripts/updateCategoryIcons.mjs

import pg from 'pg';
const { Client } = pg;

const categoryIconMap = {
  'Recovery, Healing & Inflammation': '/category-images/recovery-healing.png',
  'Cognition / Mental Energy / Sleep': '/category-images/cognition-sleep.png',
  'Brain Restoration': '/category-images/brain-restoration.png',
  'Lean Muscle / Fat Loss / Hormone Support': '/category-images/lean-muscle.png',
  'Immunity': '/category-images/immunity.png',
  'Mitochondria Reboot Anti-Aging': '/category-images/mitochondria.png',
  'BioRegulator Peptides (Khavinson)': '/category-images/bioregulator.png',
  'Gut Health': '/category-images/gut-health.png',
  'Skin Anti-Aging': '/category-images/skin-antiaging.png',
  'Fun & Tanning': '/category-images/fun-tanning.png',
  'Adjuncts': '/category-images/adjuncts.png',
  'Supplies': '/category-images/supplies.png',
  'Services': '/category-images/services.png',
  'Supplements': '/category-images/supplements.png',
};

async function updateCategoryIcons() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Get all categories
    const result = await client.query('SELECT id, name, "displayName", "iconUrl" FROM categories');
    console.log(`Found ${result.rows.length} categories`);
    
    for (const category of result.rows) {
      const displayName = category.displayName || category.name;
      const newIconUrl = categoryIconMap[displayName];
      
      if (newIconUrl) {
        console.log(`Updating ${displayName}: ${newIconUrl}`);
        await client.query(
          'UPDATE categories SET "iconUrl" = $1 WHERE id = $2',
          [newIconUrl, category.id]
        );
      } else {
        console.log(`No icon mapping for: ${displayName}`);
      }
    }
    
    console.log('Done updating category icons');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

updateCategoryIcons();
