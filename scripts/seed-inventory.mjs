import fs from 'fs';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function seedInventory() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Read the inventory data
    const data = JSON.parse(fs.readFileSync('/home/ubuntu/inventory_data.json', 'utf8'));
    
    console.log('Seeding inventory categories...');
    
    // Insert categories
    for (const cat of data.categories) {
      await connection.execute(
        'INSERT INTO inventory_categories (name, sortOrder) VALUES (?, ?)',
        [cat.name, cat.sortOrder]
      );
      console.log(`  Created category: ${cat.name}`);
    }
    
    // Get the inserted category IDs
    const [categories] = await connection.execute('SELECT id, name FROM inventory_categories ORDER BY sortOrder');
    const categoryMap = {};
    categories.forEach((cat, idx) => {
      categoryMap[idx + 1] = cat.id;
    });
    
    console.log('\nSeeding inventory items...');
    
    // Insert items
    let itemCount = 0;
    for (const item of data.items) {
      const realCategoryId = categoryMap[item.categoryId];
      if (realCategoryId) {
        await connection.execute(
          'INSERT INTO inventory_items (categoryId, name, quantity, lowStockThreshold, isActive, sortOrder) VALUES (?, ?, ?, ?, ?, ?)',
          [realCategoryId, item.name, item.quantity, item.lowStockThreshold, true, itemCount]
        );
        itemCount++;
      }
    }
    
    console.log(`  Created ${itemCount} inventory items`);
    console.log('\nInventory seeding complete!');
    
  } catch (error) {
    console.error('Error seeding inventory:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedInventory();
