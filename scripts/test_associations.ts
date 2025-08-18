import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testAssociations() {
  const client = new Client({
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT),
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
  });

  try {
    await client.connect();
    console.log('🔗 Testing file associations...');
    
    const result = await client.query(`
      SELECT cf.filename, lfa.association_type, lfa.quote_id
      FROM customer_file_index cf
      JOIN line_file_associations lfa ON cf.id = lfa.file_id
      LIMIT 3
    `);
    
    console.log(`✅ Found ${result.rows.length} file associations:`);
    result.rows.forEach(row => {
      console.log(`  - ${row.filename} -> ${row.association_type}:${row.quote_id}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

testAssociations();
