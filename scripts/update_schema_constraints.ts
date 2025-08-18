#!/usr/bin/env bun
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

async function updateSchemaConstraints() {
  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // 1. Add unique constraint to customer_file_index (handle conflicts)
    console.log('\n📋 Adding unique constraint to customer_file_index...');
    try {
      // First, find and handle any duplicates
      const duplicates = await client.query(`
        SELECT filelocation, COUNT(*) as count 
        FROM customer_file_index 
        GROUP BY filelocation 
        HAVING COUNT(*) > 1
      `);
      
      if (duplicates.rows.length > 0) {
        console.log(`⚠️  Found ${duplicates.rows.length} duplicate file locations. Cleaning up...`);
        
        for (const dup of duplicates.rows) {
          // Keep the newest record, delete older ones
          await client.query(`
            DELETE FROM customer_file_index 
            WHERE filelocation = $1 
            AND id NOT IN (
              SELECT id FROM customer_file_index 
              WHERE filelocation = $1 
              ORDER BY uploadedat DESC 
              LIMIT 1
            )
          `, [dup.filelocation]);
          console.log(`  ✅ Cleaned up duplicates for: ${dup.filelocation}`);
        }
      }

      // Add the unique constraint
      await client.query(`
        ALTER TABLE customer_file_index 
        ADD CONSTRAINT uq_customer_file_index_location UNIQUE (filelocation)
      `);
      console.log('✅ Added unique constraint to customer_file_index');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Unique constraint already exists on customer_file_index');
      } else {
        console.error('❌ Error adding unique constraint:', error.message);
      }
    }

    // 2. Add new indexes to customer_file_index
    console.log('\n📋 Adding indexes to customer_file_index...');
    const fileIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_customer_file_index_notes ON customer_file_index(notes) WHERE notes IS NOT NULL'
    ];

    for (const indexSql of fileIndexes) {
      try {
        await client.query(indexSql);
        console.log('✅ Added index:', indexSql.split(' ')[5]);
      } catch (error: any) {
        console.log('ℹ️  Index already exists or error:', error.message);
      }
    }

    // 3. Update line_file_associations constraints
    console.log('\n📋 Updating line_file_associations constraints...');
    
    // Add NOT NULL constraint to association_type
    try {
      await client.query(`
        UPDATE line_file_associations 
        SET association_type = 'quote' 
        WHERE association_type IS NULL AND quote_id IS NOT NULL
      `);
      await client.query(`
        UPDATE line_file_associations 
        SET association_type = 'job' 
        WHERE association_type IS NULL AND job_id IS NOT NULL
      `);
      
      await client.query(`
        ALTER TABLE line_file_associations 
        ALTER COLUMN association_type SET NOT NULL
      `);
      console.log('✅ Made association_type NOT NULL');
    } catch (error: any) {
      console.log('ℹ️  association_type constraint already exists or error:', error.message);
    }

    // Add CHECK constraint for association_type values
    try {
      await client.query(`
        ALTER TABLE line_file_associations 
        ADD CONSTRAINT chk_association_type_values 
        CHECK (association_type IN ('quote', 'job'))
      `);
      console.log('✅ Added CHECK constraint for association_type values');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  CHECK constraint already exists');
      } else {
        console.error('❌ Error adding CHECK constraint:', error.message);
      }
    }

    // Update existing CHECK constraint
    try {
      await client.query(`
        ALTER TABLE line_file_associations 
        DROP CONSTRAINT IF EXISTS chk_association_type
      `);
      await client.query(`
        ALTER TABLE line_file_associations 
        ADD CONSTRAINT chk_association_type CHECK (
          (quote_line_identifier IS NOT NULL AND job_line_identifier IS NULL AND association_type = 'quote') OR
          (quote_line_identifier IS NULL AND job_line_identifier IS NOT NULL AND association_type = 'job')
        )
      `);
      console.log('✅ Updated CHECK constraint for association logic');
    } catch (error: any) {
      console.log('ℹ️  CHECK constraint update error:', error.message);
    }

    // Add unique constraints for preventing duplicate associations
    try {
      await client.query(`
        ALTER TABLE line_file_associations 
        ADD CONSTRAINT uq_file_quote_association UNIQUE (file_id, quote_id, quote_line_identifier)
      `);
      console.log('✅ Added unique constraint for quote associations');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Quote association unique constraint already exists');
      } else {
        console.error('❌ Error adding quote unique constraint:', error.message);
      }
    }

    try {
      await client.query(`
        ALTER TABLE line_file_associations 
        ADD CONSTRAINT uq_file_job_association UNIQUE (file_id, job_id, job_line_identifier)
      `);
      console.log('✅ Added unique constraint for job associations');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Job association unique constraint already exists');
      } else {
        console.error('❌ Error adding job unique constraint:', error.message);
      }
    }

    // 4. Add new indexes to line_file_associations
    console.log('\n📋 Adding indexes to line_file_associations...');
    const associationIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_line_file_associations_context ON line_file_associations(uploaded_for_context)',
      'CREATE INDEX IF NOT EXISTS idx_line_file_associations_created_at ON line_file_associations(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_line_file_quote_composite ON line_file_associations(quote_id, association_type) WHERE association_type = \'quote\'',
      'CREATE INDEX IF NOT EXISTS idx_line_file_job_composite ON line_file_associations(job_id, association_type) WHERE association_type = \'job\''
    ];

    for (const indexSql of associationIndexes) {
      try {
        await client.query(indexSql);
        console.log('✅ Added index:', indexSql.split(' ')[5]);
      } catch (error: any) {
        console.log('ℹ️  Index already exists or error:', error.message);
      }
    }

    // 5. Final verification
    console.log('\n📊 Final verification...');
    
    const fileCount = await client.query('SELECT COUNT(*) as count FROM customer_file_index');
    const assocCount = await client.query('SELECT COUNT(*) as count FROM line_file_associations');
    const assocTypes = await client.query(`
      SELECT association_type, COUNT(*) as count 
      FROM line_file_associations 
      GROUP BY association_type
    `);

    console.log(`✅ Files in index: ${fileCount.rows[0].count}`);
    console.log(`✅ File associations: ${assocCount.rows[0].count}`);
    console.log('✅ Association types:');
    assocTypes.rows.forEach(row => {
      console.log(`    ${row.association_type}: ${row.count}`);
    });

    // Check constraints
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name IN ('customer_file_index', 'line_file_associations')
      ORDER BY table_name, constraint_type
    `);
    
    console.log('✅ Active constraints:');
    constraints.rows.forEach(row => {
      console.log(`    ${row.constraint_name}: ${row.constraint_type}`);
    });

    console.log('\n🎉 Schema update completed successfully!');

  } catch (error) {
    console.error('❌ Schema update failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
updateSchemaConstraints().catch(console.error);
