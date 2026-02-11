import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const envPath = join(dirname(__dirname), '.env');
  const env = readFileSync(envPath, 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '').replace(/\r$/, '');
  }
} catch (_) {}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
  console.error('❌ Invalid SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function doChange(email, newPassword) {
  if (!email?.trim() || !newPassword || newPassword.length < 6) {
    console.log('❌ Email and password (min 6 chars) are required');
    return false;
  }
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.log('❌ Error listing users:', listError.message);
    return false;
  }
  const user = users?.find((u) => u.email?.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    console.log('❌ No user found with that email.');
    return false;
  }
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
  if (updateError) {
    console.log('❌ Error updating password:', updateError.message);
    return false;
  }
  console.log('✅ Password updated. Log in at /super-admin with the new password.');
  return true;
}

async function changePassword() {
  const argEmail = process.argv[2];
  const argPassword = process.argv[3];

  if (argEmail && argPassword) {
    await doChange(argEmail, argPassword);
    process.exit(0);
    return;
  }

  console.log('🔐 Change Super Admin Password\n');
  console.log('Usage (no terminal?): node change-super-admin-password.js "email@example.com" "NewPassword123"\n');

  const email = await question('Super admin email: ');
  const newPassword = await question('New password (min 6 characters): ');
  rl.close();
  await doChange(email, newPassword);
}

changePassword();
