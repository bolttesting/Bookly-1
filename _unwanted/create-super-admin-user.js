import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Minimal .env loader (no dotenv dependency)
try {
  const envPath = join(dirname(__dirname), '.env');
  const env = readFileSync(envPath, 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '').replace(/\r$/, '');
    }
  }
} catch {
  // ignore if .env missing; env vars may already be set
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment/.env');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY does not look like a valid JWT');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password || password.length < 6) {
  console.error('Usage: node create-super-admin-user.js "<email>" "<password(min 6 chars)>"');
  process.exit(1);
}

async function main() {
  console.log('👤 Creating Super Admin user...');

  try {
    // Try to create user
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: 'Super',
        last_name: 'Admin',
      },
    });

    let userId;

    if (createError) {
      if (createError.message.toLowerCase().includes('already registered')) {
        console.log('ℹ️  User already exists, looking it up...');
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
          perPage: 1000,
        });
        if (listError) {
          console.error('❌ Error listing users:', listError.message);
          process.exit(1);
        }
        const existing = usersData.users?.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase(),
        );
        if (!existing) {
          console.error('❌ User reported as existing but not found in listUsers');
          process.exit(1);
        }
        userId = existing.id;
      } else {
        console.error('❌ Error creating user:', createError.message);
        process.exit(1);
      }
    } else if (userData?.user) {
      userId = userData.user.id;
      console.log('✅ User created with id:', userId);
    } else {
      console.error('❌ Failed to create user (no user returned)');
      process.exit(1);
    }

    // Insert into super_admins
    console.log('🔐 Adding user to super_admins...');
    const { error: insertError } = await supabase
      .from('super_admins')
      .insert({ user_id: userId })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        console.log('ℹ️  User is already a super admin.');
      } else {
        console.error('❌ Error adding to super_admins:', insertError.message);
        process.exit(1);
      }
    } else {
      console.log('✅ Super admin row created.');
    }

    console.log('\n📋 Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('🔗 Login at: /super-admin');
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

main();

