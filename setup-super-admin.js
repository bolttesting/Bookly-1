import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
  console.error('❌ Invalid service_role key in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupSuperAdmin() {
  console.log('👤 Create Super Admin User\n');
  console.log('This will create a new user and make them a super admin.\n');

  const email = await question('Enter email for super admin: ');
  const password = await question('Enter password (min 6 characters): ');

  if (!email || !password || password.length < 6) {
    console.log('\n❌ Email and password (min 6 chars) are required');
    rl.close();
    return;
  }

  console.log('\n📡 Creating user...');

  try {
    // Create user using admin API
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: 'Super',
        last_name: 'Admin'
      }
    });

    if (createError) {
      if (createError.message.includes('already registered')) {
        console.log('⚠️  User already exists. Getting user ID...');
        
        // Get existing user
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users.find(u => u.email === email);
        
        if (!existingUser) {
          console.log('❌ Could not find existing user');
          rl.close();
          return;
        }

        // Add to super_admins
        const { error: insertError } = await supabase
          .from('super_admins')
          .insert({ user_id: existingUser.id })
          .select();

        if (insertError) {
          if (insertError.code === '23505') {
            console.log('✅ User is already a super admin!');
          } else {
            console.log('❌ Error adding to super_admins:', insertError.message);
          }
        } else {
          console.log('✅ Added existing user as super admin!');
        }
      } else {
        console.log('❌ Error creating user:', createError.message);
      }
      rl.close();
      return;
    }

    if (!userData?.user) {
      console.log('❌ Failed to create user');
      rl.close();
      return;
    }

    console.log('✅ User created successfully!');
    console.log(`   User ID: ${userData.user.id}`);

    // Add to super_admins table
    console.log('\n📡 Adding to super_admins table...');
    const { error: insertError } = await supabase
      .from('super_admins')
      .insert({ user_id: userData.user.id })
      .select();

    if (insertError) {
      console.log('❌ Error adding to super_admins:', insertError.message);
    } else {
      console.log('✅ Super admin created successfully!\n');
      console.log('📋 Login Credentials:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}\n`);
      console.log('🔗 Login at: http://localhost:8080/super-admin');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }

  rl.close();
}

setupSuperAdmin();

