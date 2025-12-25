import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
  console.error('❌ Invalid service_role key!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkSuperAdmins() {
  console.log('🔍 Checking for super admin users...\n');

  try {
    // Check super_admins table
    const { data: superAdmins, error: adminError } = await supabase
      .from('super_admins')
      .select('*');

    if (adminError) {
      console.log('❌ Error checking super_admins:', adminError.message);
      return;
    }

    if (!superAdmins || superAdmins.length === 0) {
      console.log('📭 No super admin users found in database.\n');
      console.log('💡 To create a super admin:');
      console.log('   1. First, create a regular user account (sign up)');
      console.log('   2. Then add them to super_admins table in database');
      console.log('\n📋 Steps:');
      console.log('   a. Go to your app and sign up with email/password');
      console.log('   b. Go to Supabase Dashboard → Table Editor → super_admins');
      console.log('   c. Insert a new row with the user_id from auth.users');
      console.log('   OR run the SQL script I\'ll create for you!\n');
      return;
    }

    console.log(`✅ Found ${superAdmins.length} super admin(s):\n`);

    // Get user details for each super admin
    for (const admin of superAdmins) {
      const { data: user, error: userError } = await supabase.auth.admin.getUserById(admin.user_id);
      
      if (userError) {
        console.log(`   User ID: ${admin.user_id}`);
        console.log(`   Email: (Could not fetch - ${userError.message})`);
      } else if (user.user) {
        console.log(`   Email: ${user.user.email}`);
        console.log(`   User ID: ${admin.user_id}`);
        console.log(`   Created: ${new Date(admin.created_at).toLocaleDateString()}`);
      }
      console.log('');
    }

    console.log('💡 To create a new super admin:');
    console.log('   1. Sign up a new user in your app');
    console.log('   2. Get their user_id from auth.users table');
    console.log('   3. Insert into super_admins table\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkSuperAdmins();

