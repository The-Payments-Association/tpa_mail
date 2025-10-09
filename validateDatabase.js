const fs = require('fs');
const path = require('path');

// You can change this to validate any of the three files
const fileToValidate = '/Users/JackRobertson/tpa_mail/lib/membersDatabase.fixed.backup.js';

console.log('═══════════════════════════════════════');
console.log('🔍 DATABASE VALIDATION REPORT');
console.log('═══════════════════════════════════════');
console.log(`📁 File: ${path.basename(fileToValidate)}\n`);

// Read and parse the file
let fileContent, members;

try {
  fileContent = fs.readFileSync(fileToValidate, 'utf8');
  const arrayMatch = fileContent.match(/export const membersDatabase = ([\s\S]*);/);
  
  if (!arrayMatch) {
    console.error('❌ Could not find membersDatabase in file');
    process.exit(1);
  }
  
  members = eval(arrayMatch[1]);
  console.log(`✅ File parsed successfully`);
  console.log(`📊 Total entries: ${members.length}\n`);
} catch (error) {
  console.error('❌ Error reading file:', error.message);
  process.exit(1);
}

// Validation checks
const errors = [];
const warnings = [];
let checksRun = 0;

console.log('Running validation checks...\n');

// ============================================
// CHECK 1: IDs are sequential (1, 2, 3, ...)
// ============================================
checksRun++;
console.log('1️⃣  Checking IDs are sequential...');
let idsValid = true;
const missingIds = [];
const wrongIds = [];

for (let i = 0; i < members.length; i++) {
  const expectedId = i + 1;
  const actualId = members[i].id;
  
  if (actualId !== expectedId) {
    idsValid = false;
    wrongIds.push({
      index: i,
      expected: expectedId,
      actual: actualId,
      company: members[i].company
    });
  }
}

if (idsValid) {
  console.log(`   ✅ All IDs sequential from 1 to ${members.length}`);
} else {
  errors.push(`IDs not sequential - ${wrongIds.length} mismatches found`);
  console.log(`   ❌ Found ${wrongIds.length} ID mismatches:`);
  wrongIds.slice(0, 5).forEach(w => {
    console.log(`      Index ${w.index}: expected ${w.expected}, got ${w.actual} (${w.company})`);
  });
  if (wrongIds.length > 5) {
    console.log(`      ... and ${wrongIds.length - 5} more`);
  }
}

// ============================================
// CHECK 2: No duplicate IDs
// ============================================
checksRun++;
console.log('\n2️⃣  Checking for duplicate IDs...');
const idCounts = {};
members.forEach(m => {
  idCounts[m.id] = (idCounts[m.id] || 0) + 1;
});

const duplicateIds = Object.entries(idCounts).filter(([id, count]) => count > 1);

if (duplicateIds.length === 0) {
  console.log('   ✅ No duplicate IDs found');
} else {
  errors.push(`Found ${duplicateIds.length} duplicate IDs`);
  console.log(`   ❌ Found ${duplicateIds.length} duplicate IDs:`);
  duplicateIds.forEach(([id, count]) => {
    console.log(`      ID ${id} appears ${count} times`);
  });
}

// ============================================
// CHECK 3: No duplicate companies
// ============================================
checksRun++;
console.log('\n3️⃣  Checking for duplicate companies...');
const companyCounts = {};
members.forEach(m => {
  const key = m.company?.toLowerCase().trim();
  if (key) {
    companyCounts[key] = (companyCounts[key] || 0) + 1;
  }
});

const duplicateCompanies = Object.entries(companyCounts).filter(([company, count]) => count > 1);

if (duplicateCompanies.length === 0) {
  console.log('   ✅ No duplicate companies found');
} else {
  errors.push(`Found ${duplicateCompanies.length} duplicate companies`);
  console.log(`   ❌ Found ${duplicateCompanies.length} duplicate companies:`);
  duplicateCompanies.forEach(([company, count]) => {
    console.log(`      "${company}" appears ${count} times`);
  });
}

// ============================================
// CHECK 4: All required fields present
// ============================================
checksRun++;
console.log('\n4️⃣  Checking required fields...');
const requiredFields = ['id', 'company', 'expertise', 'interests', 'bio', 'avatar'];
const missingFields = [];

members.forEach((member, index) => {
  requiredFields.forEach(field => {
    if (!member[field] || (Array.isArray(member[field]) && member[field].length === 0)) {
      missingFields.push({
        index,
        id: member.id,
        company: member.company || 'Unknown',
        field
      });
    }
  });
});

if (missingFields.length === 0) {
  console.log('   ✅ All entries have required fields');
} else {
  errors.push(`${missingFields.length} missing required fields`);
  console.log(`   ❌ Found ${missingFields.length} missing required fields:`);
  missingFields.slice(0, 5).forEach(m => {
    console.log(`      ${m.company} (ID ${m.id}): missing "${m.field}"`);
  });
  if (missingFields.length > 5) {
    console.log(`      ... and ${missingFields.length - 5} more`);
  }
}

// ============================================
// CHECK 5: No nested arrays or invalid types
// ============================================
checksRun++;
console.log('\n5️⃣  Checking for nested arrays and invalid types...');
const invalidTypes = [];

members.forEach((member, index) => {
  if (Array.isArray(member)) {
    invalidTypes.push({
      index,
      type: 'nested array',
      id: 'N/A'
    });
  } else if (typeof member !== 'object' || member === null) {
    invalidTypes.push({
      index,
      type: typeof member,
      id: 'N/A'
    });
  }
});

if (invalidTypes.length === 0) {
  console.log('   ✅ All entries are valid objects');
} else {
  errors.push(`Found ${invalidTypes.length} invalid entry types`);
  console.log(`   ❌ Found ${invalidTypes.length} invalid entry types:`);
  invalidTypes.forEach(i => {
    console.log(`      Index ${i.index}: ${i.type}`);
  });
}

// ============================================
// CHECK 6: Company names not empty/undefined
// ============================================
checksRun++;
console.log('\n6️⃣  Checking company names...');
const invalidCompanies = members.filter((m, i) => 
  !m.company || m.company.trim() === ''
).map((m, i) => ({ index: i, id: m.id }));

if (invalidCompanies.length === 0) {
  console.log('   ✅ All companies have valid names');
} else {
  errors.push(`${invalidCompanies.length} entries with invalid company names`);
  console.log(`   ❌ Found ${invalidCompanies.length} entries with invalid company names`);
  invalidCompanies.forEach(c => {
    console.log(`      Index ${c.index}, ID ${c.id}`);
  });
}

// ============================================
// CHECK 7: Array fields contain valid data
// ============================================
checksRun++;
console.log('\n7️⃣  Checking array fields contain valid data...');
const arrayFields = ['expertise', 'interests', 'marketSegments', 'geographicFocus'];
const invalidArrays = [];

members.forEach((member, index) => {
  arrayFields.forEach(field => {
    if (member[field]) {
      if (!Array.isArray(member[field])) {
        invalidArrays.push({
          index,
          id: member.id,
          company: member.company,
          field,
          issue: 'not an array'
        });
      } else {
        // Check for empty strings or undefined in arrays
        member[field].forEach((item, itemIndex) => {
          if (!item || (typeof item === 'string' && item.trim() === '')) {
            invalidArrays.push({
              index,
              id: member.id,
              company: member.company,
              field,
              issue: `empty item at position ${itemIndex}`
            });
          }
        });
      }
    }
  });
});

if (invalidArrays.length === 0) {
  console.log('   ✅ All array fields contain valid data');
} else {
  warnings.push(`${invalidArrays.length} issues in array fields`);
  console.log(`   ⚠️  Found ${invalidArrays.length} issues in array fields:`);
  invalidArrays.slice(0, 5).forEach(a => {
    console.log(`      ${a.company} (ID ${a.id}): ${a.field} - ${a.issue}`);
  });
  if (invalidArrays.length > 5) {
    console.log(`      ... and ${invalidArrays.length - 5} more`);
  }
}

// ============================================
// FINAL SUMMARY
// ============================================
console.log('\n═══════════════════════════════════════');
console.log('📊 VALIDATION SUMMARY');
console.log('═══════════════════════════════════════');
console.log(`Total entries:       ${members.length}`);
console.log(`Checks run:          ${checksRun}`);
console.log(`Errors found:        ${errors.length}`);
console.log(`Warnings found:      ${warnings.length}`);
console.log('═══════════════════════════════════════');

if (errors.length > 0) {
  console.log('\n❌ ERRORS:');
  errors.forEach((error, i) => {
    console.log(`   ${i + 1}. ${error}`);
  });
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  warnings.forEach((warning, i) => {
    console.log(`   ${i + 1}. ${warning}`);
  });
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅ ✅ ✅ DATABASE IS VALID! ✅ ✅ ✅');
  console.log('\n🎉 All checks passed! Your database is clean and ready to use.\n');
  process.exit(0);
} else if (errors.length === 0) {
  console.log('\n✅ DATABASE IS VALID (with warnings)');
  console.log('\n⚠️  No critical errors, but some warnings to review.\n');
  process.exit(0);
} else {
  console.log('\n❌ DATABASE HAS ERRORS');
  console.log('\n💡 Please fix the errors listed above and run validation again.\n');
  process.exit(1);
}