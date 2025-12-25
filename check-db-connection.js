import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🔍 Checking database connection...\n');
console.log('URL:', SUPABASE_URL);
console.log('');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkConnection() {
  try {
    // Try to query businesses table
    const { data, error, count } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: false })
      .limit(1);

    if (error) {
      console.log('❌ Connection failed:', error.message);
      console.log('\n💡 The project might have been deleted or you lost access.');
      return false;
    }

    console.log('✅ Database connection successful!');
    console.log(`📊 Found ${count || 0} businesses`);
    console.log('\n✅ The database EXISTS and is accessible!');
    console.log('   The issue is just accessing it through the dashboard.');
    console.log('\n💡 Solution: We can reset it directly without dashboard access!');
    return true;
  } catch (err) {
    console.log('❌ Error:', err.message);
    return false;
  }
}

checkConnection();

