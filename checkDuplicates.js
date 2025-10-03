// checkDuplicates.js
const { membersDatabase } = require("./lib/membersDatabase.js");

const idMap = new Map();
const duplicates = new Map();

for (const member of membersDatabase) {
  if (idMap.has(member.id)) {
    if (!duplicates.has(member.id)) {
      duplicates.set(member.id, [idMap.get(member.id)]);
    }
    duplicates.get(member.id).push(member.company);
  } else {
    idMap.set(member.id, member.company);
  }
}

if (duplicates.size === 0) {
  console.log("✅ No duplicate IDs found.");
} else {
  console.log("❌ Duplicate IDs found:");
  duplicates.forEach((companies, id) => {
    console.log(`ID: ${id} is used by companies: ${companies.join(", ")}`);
  });
}
