const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'complete_setup.sql'), 'utf8');

// Parse tables
const tables = [...new Set([...content.matchAll(/CREATE TABLE IF NOT EXISTS ([a-zA-Z0-9_]+)/g)].map(m => m[1]))];

// Parse policies
const policies = [];
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('CREATE POLICY')) {
    let policyText = '';
    let j = i;
    while (j < lines.length && !lines[j].includes(';')) {
      policyText += lines[j] + ' ';
      j++;
    }
    if (j < lines.length) policyText += lines[j];
    policies.push(policyText.trim());
  }
}

console.log('=== POLICIES PER TABLE ===');
for (const t of tables) {
  const tablePolicies = policies.filter(p => p.includes(`ON ${t} `) || p.includes(`ON ${t}\n`));
  console.log(`\nTABLE: ${t} (${tablePolicies.length} policies)`);
  tablePolicies.forEach(p => console.log('  -> ' + p.replace(/\s+/g, ' ')));
}
