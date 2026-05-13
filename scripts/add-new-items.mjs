import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Get category IDs
    const [categories] = await connection.execute('SELECT id, name FROM categories');
    const categoryMap = {};
    for (const cat of categories) {
      categoryMap[cat.name] = cat.id;
    }
    
    console.log('Categories:', categoryMap);
    
    // Get Mitochondria Reboot Anti-Aging category ID
    const mitoId = categoryMap['Mitochondria Reboot Anti-Aging'];
    const leanMuscleId = categoryMap['Lean Muscle / Fat Loss / Hormone Support'];
    const gutHealthId = categoryMap['Gut Health'];
    
    // First, create a new "Supplements" category if it doesn't exist
    let supplementsId;
    if (!categoryMap['Supplements']) {
      const [result] = await connection.execute(
        'INSERT INTO categories (name, description, sortOrder) VALUES (?, ?, ?)',
        ['Supplements', 'Daily supplements and longevity products', 100]
      );
      supplementsId = result.insertId;
      console.log('Created Supplements category with ID:', supplementsId);
    } else {
      supplementsId = categoryMap['Supplements'];
    }
    
    // ============================================
    // ADD NEW PEPTIDES
    // ============================================
    
    // 1. Klotho-1 peptide (Mitochondria Reboot Anti-Aging)
    await connection.execute(
      `INSERT INTO protocol_items (categoryId, name, schedule, duration, price, defaultQty, purpose, itemType, isDiscountable, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [mitoId, 'Klotho-1 Peptide', '100-200mcg 2-3x/week', '90 days', '0.00', 0, 'Anti-aging/Longevity/Cognitive Support', 'peptide', true, 50]
    );
    console.log('Added: Klotho-1 Peptide');
    
    // 2. Follistatin (Lean Muscle Weight Loss)
    await connection.execute(
      `INSERT INTO protocol_items (categoryId, name, schedule, duration, price, defaultQty, purpose, itemType, isDiscountable, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [leanMuscleId, 'Follistatin', '100mcg/day', '90 days', '0.00', 0, 'Muscle Growth/Myostatin Inhibitor', 'peptide', true, 50]
    );
    console.log('Added: Follistatin');
    
    // 3. Recumbant (Lean Muscle Weight Loss)
    await connection.execute(
      `INSERT INTO protocol_items (categoryId, name, schedule, duration, price, defaultQty, purpose, itemType, isDiscountable, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [leanMuscleId, 'Recumbant', 'As directed', '90 days', '0.00', 0, 'Muscle Support/Recovery', 'peptide', true, 51]
    );
    console.log('Added: Recumbant');
    
    // 4. Advanced Physique Modalities (Lean Muscle Weight Loss) - placeholder for individual edits
    await connection.execute(
      `INSERT INTO protocol_items (categoryId, name, schedule, duration, price, defaultQty, purpose, notes, itemType, isDiscountable, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [leanMuscleId, 'Advanced Physique Modalities', 'Customized per client', '90 days', '0.00', 0, 'Advanced body composition protocols', 'Customize based on individual client needs and goals', 'other', true, 52]
    );
    console.log('Added: Advanced Physique Modalities');
    
    // 5. BioGutPro (Gut Health)
    await connection.execute(
      `INSERT INTO protocol_items (categoryId, name, schedule, duration, price, defaultQty, purpose, itemType, isDiscountable, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [gutHealthId, 'BioGutPro', '1 scoop daily', '90 days', '0.00', 1, 'Gut Health/Microbiome Support', 'supplement', true, 50]
    );
    console.log('Added: BioGutPro');
    
    // 6. Glutathione 500MG
    await connection.execute(
      `INSERT INTO protocol_items (categoryId, name, schedule, duration, price, defaultQty, purpose, itemType, isDiscountable, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [supplementsId, 'Glutathione 500MG', '500mg daily', '90 days', '0.00', 1, 'Master Antioxidant/Detox/Cellular Health', 'supplement', true, 1]
    );
    console.log('Added: Glutathione 500MG');
    
    // ============================================
    // ADD SUPPLEMENTS FROM GOHIGHLEVEL PAGE
    // ============================================
    
    const supplements = [
      { name: 'ProdromeGlia™ (Softgels)', schedule: 'As directed', purpose: 'White matter & glial support - Omega-9 plasmalogen precursors', affiliateUrl: 'https://prodrome.com/products/prodromeglia-softgel', affiliateCode: 'KIDMAN25' },
      { name: 'ProdromeNeuro™ (Softgels)', schedule: 'As directed', purpose: 'Neuron & grey matter support - Omega-3 (DHA) plasmalogens', affiliateUrl: 'https://prodrome.com/products/prodromeneuro-softgel', affiliateCode: 'KIDMAN25' },
      { name: 'VITALITYbits® Spirulina/Chlorella', schedule: 'As directed', purpose: 'Complete plant protein, chlorophyll, vitamins, minerals, antioxidants', affiliateUrl: null, affiliateCode: null },
      { name: 'Micro Ingredients Organic Spirulina Chlorella', schedule: 'As directed', purpose: 'Optimal nutrition and detoxification - 50-50 blend', affiliateUrl: null, affiliateCode: null },
      { name: 'Organ Health Bundle (Revive)', schedule: 'As directed', purpose: 'Liver, kidneys, heart, cardiovascular support', affiliateUrl: 'https://revivesups.com/', affiliateCode: 'JASON10!' },
      { name: 'Mitopure Softgels Urolithin A', schedule: 'As directed', purpose: 'Mitophagy activation, mitochondrial function, muscle endurance', affiliateUrl: 'https://shop.timeline.com/', affiliateCode: 'OMEGA' },
      { name: 'Fatty15 C15:0', schedule: 'As directed', purpose: 'Cellular resilience, membrane strength, longevity pathways', affiliateUrl: 'https://fatty15.com/', affiliateCode: 'JASONKIDMAN' },
      { name: 'StemRegen', schedule: 'As directed', purpose: 'Stem cell activation, natural repair and regeneration', affiliateUrl: null, affiliateCode: null },
      { name: 'Force Factor Spermidine', schedule: 'As directed', purpose: 'Cellular health, autophagy support', affiliateUrl: null, affiliateCode: null },
      { name: 'Seeking Health B Complex Plus', schedule: 'As directed', purpose: 'Methylated B vitamins for energy, mood, metabolic function', affiliateUrl: 'https://www.seekinghealth.com/', affiliateCode: null },
      { name: 'Source Naturals TMG 750mg', schedule: 'As directed', purpose: 'Cardiovascular health, liver protection, homocysteine support', affiliateUrl: null, affiliateCode: null },
      { name: 'Vitamin D3 + K2 (MK-4) + Vitamin C', schedule: '5000 IU daily', purpose: 'Bone health, calcium absorption, immune support', affiliateUrl: null, affiliateCode: null },
      { name: 'InfiniLyte Optimized Electrolyte', schedule: 'As directed', purpose: '7 essential electrolytes, cardiovascular health, recovery', affiliateUrl: null, affiliateCode: null },
      { name: 'Mushroom Breakthrough Chocolicious', schedule: 'As directed', purpose: 'Cognitive focus, collagen, mushroom extracts, immune health', affiliateUrl: 'https://bioptimizers.com/', affiliateCode: null },
      { name: 'Redmond Re-Lyte® Hydration', schedule: 'As directed', purpose: 'Sugar-free electrolyte blend, optimal hydration', affiliateUrl: 'https://redmond.life/', affiliateCode: null },
      { name: 'Tiger Milk Mushroom Capsules', schedule: 'As directed', purpose: 'Neuroprotection, immune function, inflammation support', affiliateUrl: null, affiliateCode: null },
      { name: 'Garden of Life RAW Probiotics', schedule: 'As directed', purpose: '50 billion CFU, 33 strains, digestive balance, gut health', affiliateUrl: 'https://www.gardenoflife.com/', affiliateCode: null },
      { name: 'Trace Keto Electrolyte Powder', schedule: 'As directed', purpose: 'Zero sugar electrolytes for keto/active lifestyles', affiliateUrl: null, affiliateCode: null },
      { name: 'California Gold Nutrition HydrationUP', schedule: 'As directed', purpose: 'Low-calorie electrolyte drink mix with vitamins C & E', affiliateUrl: null, affiliateCode: null },
      { name: 'Vinia Red Grape Powder', schedule: 'As directed', purpose: 'Red grape polyphenols, cardiovascular support', affiliateUrl: null, affiliateCode: null },
      { name: 'Timeline Urithrinol A', schedule: 'As directed', purpose: 'Urolithin A for mitochondrial health and cellular energy', affiliateUrl: 'https://shop.timeline.com/OMEGA', affiliateCode: 'OMEGA' },
      { name: 'ReviveMD Heart, Kidney, Liver', schedule: 'As directed', purpose: 'Comprehensive organ support supplement', affiliateUrl: 'https://revivesups.com/?sca_ref=10046847.wiqL3YylA4', affiliateCode: null },
    ];
    
    for (const supp of supplements) {
      await connection.execute(
        `INSERT INTO protocol_items (categoryId, name, schedule, duration, price, defaultQty, purpose, affiliateUrl, affiliateCode, itemType, isDiscountable, sortOrder)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [supplementsId, supp.name, supp.schedule, '90 days', '0.00', 0, supp.purpose, supp.affiliateUrl, supp.affiliateCode, 'supplement', true, 10]
      );
      console.log('Added supplement:', supp.name);
    }
    
    // ============================================
    // CREATE GAME PLAN TEMPLATE (NO PRICING)
    // ============================================
    
    // Create the template
    const [templateResult] = await connection.execute(
      `INSERT INTO templates (name, description, durationMonths, isDefault)
       VALUES (?, ?, ?, ?)`,
      ['12-Month Game Plan', 'Comprehensive 12-month roadmap template with all available peptides and supplements. No pricing - use for planning and discussion.', 12, false]
    );
    const gamePlanTemplateId = templateResult.insertId;
    console.log('Created Game Plan template with ID:', gamePlanTemplateId);
    
    // Get all protocol items and add them to the template with qty 0
    const [allItems] = await connection.execute('SELECT id FROM protocol_items WHERE isActive = 1');
    
    for (const item of allItems) {
      await connection.execute(
        `INSERT INTO template_items (templateId, protocolItemId, quantity, isRecommended)
         VALUES (?, ?, ?, ?)`,
        [gamePlanTemplateId, item.id, 0, false]
      );
    }
    console.log(`Added ${allItems.length} items to Game Plan template`);
    
    console.log('\\n✅ All items added successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

main();
