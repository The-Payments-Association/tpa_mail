const fs = require("fs");
const path = require("path");
const { membersDatabase } = require("./lib/membersDatabase.js");

const seen = new Set();
let maxId = Math.max(...membersDatabase.map(m => m.id));

const updated = membersDatabase.map(member => {
  if (seen.has(member.id)) {
    maxId++;
    return { ...member, id: maxId };
  }
  seen.add(member.id);
  return member;
});

// Helper to convert object to JS string with unquoted keys
function toJs(obj, indent = 2) {
  const json = JSON.stringify(obj, null, indent);
  // Remove quotes from object keys
  return json.replace(/"([^"]+)":/g, "$1:");
}

const outputPath = path.join(__dirname, "lib", "membersDatabase.fixed.js");

const fileContent =
  "// Auto-generated file with fixed unique IDs\n\n" +
  "export const membersDatabase = " +
  toJs(updated, 2) +
  ";\n";

fs.writeFileSync(outputPath, fileContent, "utf8");

console.log(`✅ Fixed database written to ${outputPath}`);
