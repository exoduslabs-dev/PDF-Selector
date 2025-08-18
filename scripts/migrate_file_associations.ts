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

async function migrateFileAssociations() {
  await client.connect();
  
  console.log('Starting file association migration...');
  
  try {
    // Get all files from customer_file_index that aren't already associated
    const filesResult = await client.query(`
      SELECT cf.id, cf.filename, cf.filelocation
      FROM customer_file_index cf
      LEFT JOIN line_file_associations lfa ON cf.id = lfa.file_id
      WHERE lfa.file_id IS NULL
      ORDER BY cf.uploadedat DESC
    `);
    
    console.log(`Found ${filesResult.rows.length} unassociated files`);
    
    let quotesAssociated = 0;
    let jobsAssociated = 0;
    let unmatched = 0;
    
    for (const file of filesResult.rows) {
      const filePath = file.filelocation;
      
      // Extract quote/job ID from file path pattern: /customer/size/quoteId/files/filename
      // Pattern: /Volumes/Archives/Next-Label/database/CustomerName/Size/QuoteOrJobId/files/filename
      const pathMatch = filePath.match(/\/([^\/]+)\/([^\/]+)\/([^\/]+)\/files\/[^\/]+$/);
      
      if (!pathMatch) {
        console.log(`Could not parse path: ${filePath}`);
        unmatched++;
        continue;
      }
      
      const [, customerName, size, idFromPath] = pathMatch;
      
      // First, try to match as a quote
      const quoteResult = await client.query(`
        SELECT quoteid, lineidentifier 
        FROM quotes 
        WHERE quoteid = $1
        LIMIT 1
      `, [idFromPath]);
      
      if (quoteResult.rows.length > 0) {
        const quote = quoteResult.rows[0];
        await client.query(`
          INSERT INTO line_file_associations (
            association_id, file_id, quote_line_identifier, quote_id, 
            association_type, uploaded_for_context, created_by
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, 'quote', 'migrated_association', 'migration_script'
          )
        `, [file.id, quote.lineidentifier || quote.quoteid, quote.quoteid]);
        
        quotesAssociated++;
        console.log(`Associated ${file.filename} with quote ${quote.quoteid}`);
        continue;
      }
      
      // If not a quote, try to match as a job
      const jobResult = await client.query(`
        SELECT job_id, job_number 
        FROM jobs 
        WHERE job_id = $1 OR job_number = $1
        LIMIT 1
      `, [idFromPath]);
      
      if (jobResult.rows.length > 0) {
        const job = jobResult.rows[0];
        await client.query(`
          INSERT INTO line_file_associations (
            association_id, file_id, job_line_identifier, job_id,
            association_type, uploaded_for_context, created_by
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, 'job', 'migrated_association', 'migration_script'
          )
        `, [file.id, job.job_number || job.job_id, job.job_id]);
        
        jobsAssociated++;
        console.log(`Associated ${file.filename} with job ${job.job_id}`);
        continue;
      }
      
      console.log(`No matching quote or job found for ID: ${idFromPath} (file: ${file.filename})`);
      unmatched++;
    }
    
    console.log(`Migration complete:`);
    console.log(`- Quotes associated: ${quotesAssociated}`);
    console.log(`- Jobs associated: ${jobsAssociated}`);
    console.log(`- Unmatched files: ${unmatched}`);
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await client.end();
  }
}

// Run the migration
migrateFileAssociations().catch(console.error);
