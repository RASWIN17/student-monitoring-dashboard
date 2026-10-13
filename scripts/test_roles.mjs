// Helper script to inspect and toggle user roles for local/cloud testing
// Usage:
//   node --env-file=.env.local scripts/test_roles.mjs list
//   node --env-file=.env.local scripts/test_roles.mjs set <email> <teacher|student>

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const action = process.argv[2] || 'list';
const targetEmail = process.argv[3];
const targetRole = process.argv[4];

async function main() {
  if (action === 'list') {
    console.log('\n--- Current User Profiles & Roles ---');
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, email, display_name, role, auth_user_id, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('No users found in database.');
      return;
    }

    console.table(
      users.map((u) => ({
        ID: u.id.slice(0, 8) + '...',
        Email: u.email,
        Name: u.display_name,
        Role: u.role.toUpperCase(),
        AuthLinked: u.auth_user_id ? 'YES' : 'NO',
      }))
    );
  } else if (action === 'set') {
    if (!targetEmail || !targetRole) {
      console.log('Usage: node --env-file=.env.local scripts/test_roles.mjs set <email> <teacher|student>');
      return;
    }

    if (targetRole !== 'teacher' && targetRole !== 'student' && targetRole !== 'admin') {
      console.error('Invalid role. Role must be teacher, student, or admin.');
      return;
    }

    console.log(`\nSetting role for ${targetEmail} to "${targetRole}"...`);
    const { data: updated, error } = await supabase
      .from('user_profiles')
      .update({ role: targetRole, updated_at: new Date().toISOString() })
      .ilike('email', targetEmail.trim().toLowerCase())
      .select()
      .single();

    if (error || !updated) {
      console.error('Failed to update role:', error?.message || 'User not found');
      return;
    }

    console.log(`✅ Success! Updated ${updated.email} role to: ${updated.role.toUpperCase()}`);

    // Also synchronize Supabase auth metadata if auth_user_id is present
    if (updated.auth_user_id) {
      try {
        await supabase.auth.admin.updateUserById(updated.auth_user_id, {
          user_metadata: { role: targetRole },
        });
        console.log(`✅ Auth user metadata synchronized.`);
      } catch (authErr) {
        console.warn('Note: Could not update auth metadata directly:', authErr.message);
      }
    }
  } else {
    console.log('Unknown action. Available actions: list, set');
  }
}

main().catch(console.error);
