// deleteEntry.js
// node deleteEntry.js 2 (number 2 being the entry id to delete)

import { membersDatabase } from './lib/membersDatabase.fixed.backup.js';
import fs from 'fs';

function deleteEntry(id) {
  const index = membersDatabase.findIndex(member => member.id === id);
  
  if (index === -1) {
    console.log(`Entry with ID ${id} not found`);
    return;
  }

  // Remove the entry
  const deleted = membersDatabase.splice(index, 1);
  
  // Write back to file
  const fileContent = `export const membersDatabase = ${JSON.stringify(membersDatabase, null, 2)};`;
  
  // Write to the same file you're reading from
  fs.writeFileSync('./lib/membersDatabase.fixed.backup.js', fileContent, 'utf8');
  
  console.log(`Deleted: ${deleted[0].company} (ID: ${id})`);
  console.log(`Remaining entries: ${membersDatabase.length}`);
}

// Usage
const idToDelete = process.argv[2];
if (!idToDelete) {
  console.log('Usage: node deleteEntry.js <id>');
  process.exit(1);
}

deleteEntry(parseInt(idToDelete));