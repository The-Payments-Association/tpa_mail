const fs = require('fs');
const path = require('path');

const dbPath = '/Users/JackRobertson/tpa_mail/lib/membersDatabase.fixed.backup.js';

console.log('🔧 Removing duplicate companies...\n');

// Read and parse the file
const fileContent = fs.readFileSync(dbPath, 'utf8');
const arrayMatch = fileContent.match(/export const membersDatabase = ([\s\S]*);/);

if (!arrayMatch) {
  console.error('❌ Could not find membersDatabase');
  process.exit(1);
}

// Use eval to parse the JavaScript array
const members = eval(arrayMatch[1]);

console.log(`📊 Starting with ${members.length} members\n`);

// Track seen companies and keep only the first occurrence
const seenCompanies = new Set();
const uniqueMembers = [];
const duplicatesRemoved = [];

members.forEach((member, index) => {
  const companyLower = member.company.toLowerCase().trim();
  
  if (seenCompanies.has(companyLower)) {
    duplicatesRemoved.push({
      id: member.id,
      company: member.company,
      originalIndex: index
    });
    console.log(`❌ Removing duplicate: ${member.company} (ID: ${member.id})`);
  } else {
    seenCompanies.add(companyLower);
    uniqueMembers.push(member);
  }
});

console.log(`\n✅ Removed ${duplicatesRemoved.length} duplicates\n`);
console.log(`📊 Unique members: ${uniqueMembers.length}\n`);

// Renumber IDs sequentially after removing duplicates
console.log('🔢 Renumbering IDs after duplicate removal...\n');

uniqueMembers.forEach((member, index) => {
  const oldId = member.id;
  const newId = index + 1;
  member.id = newId;
  
  if (oldId !== newId) {
    console.log(`   ${member.company}: ${oldId} → ${newId}`);
  }
});

// Validate
console.log('\n✅ Validation: Checking IDs are sequential...\n');

let allValid = true;
for (let i = 0; i < uniqueMembers.length; i++) {
  const expectedId = i + 1;
  const actualId = uniqueMembers[i].id;
  
  if (actualId !== expectedId) {
    console.log(`❌ ID mismatch at index ${i}: expected ${expectedId}, got ${actualId}`);
    allValid = false;
  }
}

if (allValid) {
  console.log(`✅ All ${uniqueMembers.length} IDs are sequential and in order!\n`);
} else {
  console.log('❌ ID validation failed!\n');
  process.exit(1);
}

// Generate new file
const newFileContent = `// Auto-generated file with fixed unique IDs and no duplicates

export const membersDatabase = ${JSON.stringify(uniqueMembers, null, 2)};
`;

// Create backup
const backupPath = dbPath.replace('.js', '.backup-' + Date.now() + '.js');
fs.copyFileSync(dbPath, backupPath);
console.log(`📦 Backup created: ${path.basename(backupPath)}\n`);

// Write new file
fs.writeFileSync(dbPath, newFileContent, 'utf8');
console.log(`✅ Database file updated: ${dbPath}\n`);

// Final summary
console.log('═══════════════════════════════════════');
console.log('📊 FINAL SUMMARY');
console.log('═══════════════════════════════════════');
console.log(`Original entries:        ${members.length}`);
console.log(`Duplicates removed:      ${duplicatesRemoved.length}`);
console.log(`Final unique entries:    ${uniqueMembers.length}`);
console.log(`Final ID range:          1 to ${uniqueMembers.length}`);
console.log('═══════════════════════════════════════');

if (duplicatesRemoved.length > 0) {
  console.log('\n📋 Duplicates that were removed:');
  duplicatesRemoved.forEach(dup => {
    console.log(`   - ${dup.company} (was ID: ${dup.id})`);
  });
}

console.log('\n✅ Duplicate removal completed successfully!\n');