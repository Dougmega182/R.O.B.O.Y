const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = "postgresql://postgres.xdtsuqmwjcuwtbdwzkdh:MXo88%25I%23jizB!17zg*TIcLOrFbKQsK%26mpDQHA4EjM@3.106.102.114:5432/postgres";

async function runSchema() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to Supabase Postgres...');
    
    const schemaPath = path.join(__dirname, '..', 'supabase_schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Running schema update...');
    await client.query(sql);
    console.log('Schema update successful!');
    
  } catch (err) {
    console.error('Schema Error:', err);
  } finally {
    await client.end();
  }
}

runSchema();
