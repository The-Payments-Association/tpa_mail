const fs = require('fs');
const path = require('path');

// Path to your database file
const dbPath = '/Users/JackRobertson/tpa_mail/lib/membersDatabase.fixed.backup.js';

console.log('🔧 Starting database ID fix...\n');

// Read the file
let fileContent = fs.readFileSync(dbPath, 'utf8');

// Extract the array content (everything between [ and ])
const arrayMatch = fileContent.match(/export const membersDatabase = \[([\s\S]*)\];/);

if (!arrayMatch) {
  console.error('❌ Could not find membersDatabase array in file');
  process.exit(1);
}

// Parse the JSON-like content
// We need to convert the JS object to valid JSON first
let arrayContent = arrayMatch[1];

// Add quotes around unquoted keys to make it valid JSON
arrayContent = arrayContent
  .replace(/(\w+):/g, '"$1":')  // Add quotes to keys
  .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas

// Try to parse it
let members;
try {
  members = JSON.parse(`[${arrayContent}]`);
} catch (error) {
  console.error('❌ Error parsing database:', error.message);
  console.log('Attempting alternative parsing method...');
  
  // Alternative: use eval (less safe but works with JS syntax)
  try {
    members = eval(`[${arrayMatch[1]}]`);
  } catch (evalError) {
    console.error('❌ Could not parse database content');
    process.exit(1);
  }
}

console.log(`📊 Found ${members.length} members in database\n`);

// Filter out any invalid entries (nested arrays, empty objects, etc.)
const validMembers = members.filter((member, index) => {
  if (Array.isArray(member)) {
    console.log(`⚠️  Removing nested array at index ${index}`);
    return false;
  }
  if (!member || typeof member !== 'object') {
    console.log(`⚠️  Removing invalid entry at index ${index}`);
    return false;
  }
  if (!member.company) {
    console.log(`⚠️  Removing entry without company name at index ${index}`);
    return false;
  }
  return true;
});

console.log(`✅ Valid members after filtering: ${validMembers.length}\n`);

// Check for duplicates before renumbering
const duplicateIds = {};
const duplicateCompanies = {};

validMembers.forEach((member, index) => {
  if (member.id) {
    duplicateIds[member.id] = (duplicateIds[member.id] || 0) + 1;
  }
  if (member.company) {
    duplicateCompanies[member.company] = (duplicateCompanies[member.company] || 0) + 1;
  }
});

// Report duplicates
const dupeIds = Object.entries(duplicateIds).filter(([id, count]) => count > 1);
const dupeCompanies = Object.entries(duplicateCompanies).filter(([company, count]) => count > 1);

if (dupeIds.length > 0) {
  console.log('⚠️  Duplicate IDs found:');
  dupeIds.forEach(([id, count]) => {
    console.log(`   ID ${id} appears ${count} times`);
  });
  console.log();
}

if (dupeCompanies.length > 0) {
  console.log('⚠️  Duplicate companies found:');
  dupeCompanies.forEach(([company, count]) => {
    console.log(`   "${company}" appears ${count} times`);
  });
  console.log();
}

// Renumber all IDs sequentially
console.log('🔢 Renumbering IDs sequentially...\n');

validMembers.forEach((member, index) => {
  const oldId = member.id;
  const newId = index + 1;
  member.id = newId;
  
  if (oldId !== newId) {
    console.log(`   ${member.company}: ${oldId || 'undefined'} → ${newId}`);
  }
});

// Validate: Check all IDs are sequential
console.log('\n✅ Validation: Checking IDs are sequential...\n');

let allValid = true;
for (let i = 0; i < validMembers.length; i++) {
  const expectedId = i + 1;
  const actualId = validMembers[i].id;
  
  if (actualId !== expectedId) {
    console.log(`❌ ID mismatch at index ${i}: expected ${expectedId}, got ${actualId}`);
    allValid = false;
  }
}

if (allValid) {
  console.log(`✅ All ${validMembers.length} IDs are sequential and in order!\n`);
} else {
  console.log('❌ ID validation failed!\n');
  process.exit(1);
}

// Generate the new file content
console.log('💾 Generating new file content...\n');

const newFileContent = `// Auto-generated file with fixed unique IDs

export const membersDatabase = ${JSON.stringify(validMembers, null, 2)};
`;

// Create backup of original file
const backupPath = dbPath.replace('.js', '.backup-' + Date.now() + '.js');
fs.copyFileSync(dbPath, backupPath);
console.log(`📦 Backup created: ${path.basename(backupPath)}\n`);

// Write the new file
fs.writeFileSync(dbPath, newFileContent, 'utf8');
console.log(`✅ Database file updated: ${dbPath}\n`);

// Final summary
console.log('═══════════════════════════════════════');
console.log('📊 SUMMARY');
console.log('═══════════════════════════════════════');
console.log(`Original entries:     ${members.length}`);
console.log(`Valid entries:        ${validMembers.length}`);
console.log(`Removed entries:      ${members.length - validMembers.length}`);
console.log(`Duplicate IDs fixed:  ${dupeIds.length}`);
console.log(`Duplicate companies:  ${dupeCompanies.length}`);
console.log(`Final ID range:       1 to ${validMembers.length}`);
console.log('═══════════════════════════════════════');
console.log('\n✅ Database fix completed successfully!\n');