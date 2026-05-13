import mysql from 'mysql2/promise';

// Get database URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Parse the DATABASE_URL
const url = new URL(DATABASE_URL);
const config = {
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false }
};

// Normalize a product name for comparison
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
    .replace(/mg$/, '')        // Remove trailing mg
    .replace(/mcg$/, '')       // Remove trailing mcg
    .replace(/(\d+)mg/g, '$1') // Remove mg after numbers
    .replace(/(\d+)mcg/g, '$1') // Remove mcg after numbers
    .trim();
}

// Extract the base product name (before dosage)
function extractBaseName(name) {
  // Common patterns to extract base name
  const patterns = [
    /^([a-zA-Z0-9\-\s\/]+?)[\s\-]*\d+\s*(mg|mcg|ml)?/i,  // Name followed by dosage
    /^([a-zA-Z0-9\-\s\/]+?)[\s\-]*\(/i,                   // Name followed by parenthesis
    /^([a-zA-Z0-9\-\s\/]+)$/i                             // Just the name
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match && match[1]) {
      return match[1].trim().toLowerCase();
    }
  }
  return name.toLowerCase().trim();
}

// Calculate similarity score between two strings (0-1)
function similarity(str1, str2) {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);
  
  if (s1 === s2) return 1;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    return shorter.length / longer.length;
  }
  
  // Levenshtein distance based similarity
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - matrix[len1][len2] / maxLen;
}

// Known mappings for common variations
const knownMappings = {
  'bpc157': ['bpc-157', 'bpc 157', 'bpc157'],
  'bpc-157': ['bpc157', 'bpc 157'],
  'cjc1295': ['cjc-1295', 'cjc 1295'],
  'cjc1295/ipamorelin': ['cjc-1295/ipamorelin', 'cjc1295 ipamorelin'],
  'tb500': ['tb-500', 'tb 500'],
  'tb4frag': ['tb4-frag', 'tb-4 frag', 'tb-500 frag'],
  'ghkcu': ['ghk-cu', 'ghk cu'],
  'pt141': ['pt-141', 'pt 141'],
  'nad+': ['nad', 'nad plus'],
  'motsc': ['mots-c', 'mots c'],
  'ta1': ['thymosin alpha 1', 'thymosin alpha-1'],
  'ss31': ['ss-31'],
  'dsip': ['delta sleep', 'delta-sleep'],
  'kisspeptin': ['kisspeptin-10', 'kisspeptin10'],
};

async function main() {
  const connection = await mysql.createConnection(config);
  
  try {
    // Get all protocol items
    const [protocolItems] = await connection.execute(
      'SELECT id, name FROM protocol_items ORDER BY name'
    );
    console.log(`Found ${protocolItems.length} protocol items`);
    
    // Get all inventory items
    const [inventoryItems] = await connection.execute(
      'SELECT id, name FROM inventory_items ORDER BY name'
    );
    console.log(`Found ${inventoryItems.length} inventory items`);
    
    // Get existing mappings to avoid duplicates
    const [existingMappings] = await connection.execute(
      'SELECT protocolItemId FROM protocol_inventory_mapping'
    );
    const mappedProtocolIds = new Set(existingMappings.map(m => m.protocolItemId));
    console.log(`Found ${mappedProtocolIds.size} existing mappings`);
    
    const mappings = [];
    const unmapped = [];
    
    for (const protocolItem of protocolItems) {
      // Skip if already mapped
      if (mappedProtocolIds.has(protocolItem.id)) {
        continue;
      }
      
      const protocolBaseName = extractBaseName(protocolItem.name);
      const protocolNormalized = normalizeName(protocolItem.name);
      
      let bestMatch = null;
      let bestScore = 0;
      
      for (const inventoryItem of inventoryItems) {
        const inventoryBaseName = extractBaseName(inventoryItem.name);
        const inventoryNormalized = normalizeName(inventoryItem.name);
        
        // Calculate similarity scores
        const baseScore = similarity(protocolBaseName, inventoryBaseName);
        const fullScore = similarity(protocolNormalized, inventoryNormalized);
        
        // Use the higher score
        const score = Math.max(baseScore, fullScore);
        
        // Check for exact base name match
        if (protocolBaseName === inventoryBaseName) {
          bestMatch = inventoryItem;
          bestScore = 1;
          break;
        }
        
        // Check known mappings
        for (const [key, variants] of Object.entries(knownMappings)) {
          if (protocolNormalized.includes(key) || variants.some(v => protocolNormalized.includes(v.replace(/[^a-z0-9]/g, '')))) {
            if (inventoryNormalized.includes(key) || variants.some(v => inventoryNormalized.includes(v.replace(/[^a-z0-9]/g, '')))) {
              if (score > bestScore) {
                bestMatch = inventoryItem;
                bestScore = Math.max(score, 0.85); // Boost score for known mappings
              }
            }
          }
        }
        
        if (score > bestScore && score >= 0.6) {
          bestMatch = inventoryItem;
          bestScore = score;
        }
      }
      
      if (bestMatch && bestScore >= 0.6) {
        mappings.push({
          protocolItemId: protocolItem.id,
          protocolItemName: protocolItem.name,
          inventoryItemId: bestMatch.id,
          inventoryItemName: bestMatch.name,
          score: bestScore
        });
      } else {
        unmapped.push({
          id: protocolItem.id,
          name: protocolItem.name
        });
      }
    }
    
    console.log(`\n=== AUTO-MAPPING RESULTS ===`);
    console.log(`Matched: ${mappings.length} items`);
    console.log(`Unmapped: ${unmapped.length} items`);
    
    // Sort by score (highest first)
    mappings.sort((a, b) => b.score - a.score);
    
    console.log(`\n--- High Confidence Matches (>= 0.8) ---`);
    const highConfidence = mappings.filter(m => m.score >= 0.8);
    for (const m of highConfidence) {
      console.log(`  [${(m.score * 100).toFixed(0)}%] "${m.protocolItemName}" -> "${m.inventoryItemName}"`);
    }
    
    console.log(`\n--- Medium Confidence Matches (0.6 - 0.8) ---`);
    const mediumConfidence = mappings.filter(m => m.score >= 0.6 && m.score < 0.8);
    for (const m of mediumConfidence) {
      console.log(`  [${(m.score * 100).toFixed(0)}%] "${m.protocolItemName}" -> "${m.inventoryItemName}"`);
    }
    
    // Insert mappings into database
    console.log(`\n--- Inserting ${mappings.length} mappings into database ---`);
    
    let inserted = 0;
    for (const mapping of mappings) {
      try {
        await connection.execute(
          `INSERT INTO protocol_inventory_mapping (protocolItemId, inventoryItemId, quantityPerUnit, createdAt) 
           VALUES (?, ?, 1, NOW())`,
          [mapping.protocolItemId, mapping.inventoryItemId]
        );
        inserted++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  Skipping duplicate: ${mapping.protocolItemName}`);
        } else {
          console.error(`  Error inserting ${mapping.protocolItemName}:`, err.message);
        }
      }
    }
    
    console.log(`\nSuccessfully inserted ${inserted} mappings!`);
    
    if (unmapped.length > 0) {
      console.log(`\n--- Unmapped Protocol Items (need manual mapping) ---`);
      for (const item of unmapped.slice(0, 20)) {
        console.log(`  - ${item.name}`);
      }
      if (unmapped.length > 20) {
        console.log(`  ... and ${unmapped.length - 20} more`);
      }
    }
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
