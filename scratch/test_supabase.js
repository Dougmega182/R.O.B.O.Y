const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey?.slice(0, 15) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

const testTable = 'chores';
async function test() {
  const { data, error } = await supabase.from(testTable).select('*').limit(1);
  if (error) {
    console.error('Connection Error:', error);
  } else {
    console.log(`Success! Data from ${testTable}:`, data);
  }
}

test();
