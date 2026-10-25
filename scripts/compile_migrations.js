const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const outputFile = path.join(__dirname, '..', 'supabase', 'complete_setup.sql');

// Make 003_rls_policies idempotent
const rlsFile = path.join(migrationsDir, '003_rls_policies.sql');
let rlsContent = fs.readFileSync(rlsFile, 'utf8');
if (!rlsContent.includes('DROP POLICY IF EXISTS "Public profiles are readable by owner or admin"')) {
  rlsContent = rlsContent.replace(/CREATE POLICY "([^"]+)"\s+ON\s+([a-zA-Z0-9_]+)/g, (match, p1, p2) => {
    return `DROP POLICY IF EXISTS "${p1}" ON ${p2};\n${match}`;
  });
  fs.writeFileSync(rlsFile, rlsContent, 'utf8');
  console.log('Updated 003_rls_policies.sql with DROP POLICY IF EXISTS');
}

const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

let output = `-- ====================================================================
-- EASY FARM COMPLETE DATABASE SETUP & MIGRATION SCRIPT
-- Paste and run this in your new Supabase project SQL Editor in one click.
-- ====================================================================

`;

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, 'utf8').trim();
  output += `\n-- ====================================================================\n`;
  output += `-- MIGRATION: ${file}\n`;
  output += `-- ====================================================================\n\n`;
  output += content + '\n\n';
}

// Append admin provisioning block
output += `-- ====================================================================
-- PROVISION INITIAL ADMIN PROFILE
-- Links shivashankarlode@gmail.com to profiles & admin_users
-- ====================================================================
DO $$
DECLARE
  admin_auth_id UUID;
  admin_prof_id UUID;
BEGIN
  SELECT id INTO admin_auth_id FROM auth.users WHERE email = 'shivashankarlode@gmail.com' LIMIT 1;
  
  IF admin_auth_id IS NOT NULL THEN
    -- Check if a profile record already exists for this user or email
    SELECT id INTO admin_prof_id FROM profiles WHERE auth_user_id = admin_auth_id OR email = 'shivashankarlode@gmail.com' LIMIT 1;
    
    IF admin_prof_id IS NOT NULL THEN
      UPDATE profiles 
      SET role = 'admin', auth_user_id = admin_auth_id, full_name = 'Shiva Shankar' 
      WHERE id = admin_prof_id;
    ELSE
      INSERT INTO profiles (auth_user_id, full_name, email, role, phone)
      VALUES (admin_auth_id, 'Shiva Shankar', 'shivashankarlode@gmail.com', 'admin', '+91 98490 12345')
      RETURNING id INTO admin_prof_id;
    END IF;
    
    IF admin_prof_id IS NOT NULL THEN
      INSERT INTO admin_users (profile_id, permissions)
      VALUES (admin_prof_id, '{"all": true}'::jsonb)
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;
  END IF;
END $$;
`;

fs.writeFileSync(outputFile, output, 'utf8');
console.log(`Generated ${outputFile} successfully (${output.split('\n').length} lines).`);
