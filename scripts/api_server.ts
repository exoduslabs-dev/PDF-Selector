import { serve } from 'bun';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Base path for customer files on disk
const BASE_FILES_PATH = `/Volumes/Archives/Next-Label/database`;
const PREPRESS_OUT_PATH = process.env.PREPRESS_OUT_PATH || `/Volumes/Archives/Next-Label/prepress_out`;

async function ensurePdfThumbnail(pdfPath: string, size: number = 1024): Promise<string> {
  const fs = require('fs');
  // Derive thumbnail directory by replacing '/files/' with '/thumbs/'
  const parts = pdfPath.split('/');
  const filesIndex = parts.lastIndexOf('files');
  const dirPath = filesIndex > 0 ? parts.slice(0, filesIndex).join('/') : pdfPath.substring(0, pdfPath.lastIndexOf('/'));
  const thumbDir = `${dirPath}/thumbs/${size}`;
  const baseName = pdfPath.split('/').pop();
  const thumbName = `${(baseName || 'file').replace(/\.pdf$/i, '')}.png`;
  const thumbPath = `${thumbDir}/${thumbName}`;

  try { fs.mkdirSync(thumbDir, { recursive: true }); } catch {}
  try {
    if (fs.existsSync(thumbPath)) {
      // Regenerate if thumbnail is older than the PDF so it stays fresh and at current resolution
      try {
        const pdfStat = fs.statSync(pdfPath);
        const thumbStat = fs.statSync(thumbPath);
        if (thumbStat.mtimeMs >= pdfStat.mtimeMs) {
          return thumbPath;
        }
      } catch {}
    }
  } catch {}

  // Use macOS QuickLook to generate thumbnail
  const proc = Bun.spawn([
    '/usr/bin/qlmanage',
    '-t',
    '-s',
    String(Math.max(64, Math.min(8192, Math.floor(size)))) ,
    '-o',
    thumbDir,
    pdfPath,
  ], { stdout: 'ignore', stderr: 'ignore' });
  await proc.exited;

  // qlmanage outputs as filename.pdf.png in thumbDir; normalize to <name>.png
  const candidate = `${thumbDir}/${baseName}.png`;
  const candidate2 = `${thumbDir}/${baseName}.pdf.png`;
  try {
    const existsCandidate = fs.existsSync(candidate);
    const existsCandidate2 = fs.existsSync(candidate2);
    if (!existsCandidate && existsCandidate2) {
      fs.renameSync(candidate2, thumbPath);
      return thumbPath;
    }
    if (existsCandidate) {
      // If output already matches, rename to our normalized name if needed
      if (candidate !== thumbPath) {
        try { fs.renameSync(candidate, thumbPath); } catch {}
      }
      return thumbPath;
    }
  } catch {}

  // Fallback: return expected path even if not found; caller can handle 404
  return thumbPath;
}

const client = new Client({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

await client.connect();

serve({
  async fetch(req) {
    const url = new URL(req.url);
    
    // Add CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers });
    }

    if (url.pathname === '/api/quotes') {
      try {
        // Get limit parameter from query string
        const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 50;
        
        let limitClause = '';
        if (limit > 0) {
          limitClause = `LIMIT ${limit}`;
        }
        
        const result = await client.query(`
          WITH quote_aggregated AS (
            SELECT 
              q.quoteid,
              CONCAT(COALESCE(q.sizexmm::text, 'N/A'), ' x ', COALESCE(q.sizeymm::text, 'N/A')) as size_mm,
              COUNT(*) as line_count,
              SUM(q.quantity) as total_quantity,
              STRING_AGG(DISTINCT q.quantity::text, ', ' ORDER BY q.quantity::text) as individual_quantities,
              STRING_AGG(DISTINCT q.materialname, ', ') as products,
              STRING_AGG(DISTINCT q.materialname, ', ') as materials,
              STRING_AGG(DISTINCT q.lineidentifier, ', ') as line_identifiers,
              STRING_AGG(DISTINCT q.linedescription, ' | ') as descriptions,
              STRING_AGG(DISTINCT COALESCE(q.supply, ''), ' | ') as supply,
              STRING_AGG(DISTINCT COALESCE(q.notes, ''), ' | ') as notes,
              MIN(q.customerid) as customerid,
              MIN(COALESCE(q.customername, c.name)) as customername,
              MIN(q.quotedate) as orderdate,
              MIN(q.quotedate) as duedate,
              BOOL_AND(COALESCE(q.processed, false)) as all_processed
            FROM quotes q
            LEFT JOIN customers c ON q.customerid = c.customer_id
            GROUP BY q.quoteid, q.sizexmm, q.sizeymm
          )
          SELECT 
            qa.quoteid,
            qa.size_mm,
            qa.line_count,
            qa.total_quantity,
            qa.individual_quantities,
            qa.products,
            qa.materials,
            qa.line_identifiers,
            qa.descriptions,
            qa.supply,
            qa.notes,
            qa.customername,
            qa.orderdate,
            qa.duedate,
            qa.all_processed as processed,
            COUNT(*) OVER (PARTITION BY qa.quoteid) as size_variations
          FROM quote_aggregated qa
          ORDER BY qa.quoteid DESC, qa.size_mm
          ${limitClause}
        `);

        // Removed debug logging to improve performance
        
        // Group by quoteId to show size variations
        const groupedQuotes = result.rows.reduce((acc, row) => {
          if (!acc[row.quoteid]) {
            acc[row.quoteid] = {
              quoteId: row.quoteid,
              customerName: row.customername,
              orderDate: row.orderdate,
              dueDate: row.duedate,
              sizeVariations: row.size_variations,
              totalLines: 0,
              totalQuantity: 0,
              sizeGroups: []
            };
          }
          
          acc[row.quoteid].totalLines += parseInt(row.line_count) || 0;
          acc[row.quoteid].totalQuantity += parseInt(row.total_quantity) || 0;
          acc[row.quoteid].sizeGroups.push({
            size: row.size_mm,
            lineCount: parseInt(row.line_count) || 0,
            totalQuantity: parseInt(row.total_quantity) || 0,
            individualQuantities: row.individual_quantities,
            products: row.products,
            materials: row.materials,
            lineIdentifiers: row.line_identifiers,
            descriptions: row.descriptions,
            supply: row.supply,
            notes: row.notes,
            processed: row.processed
          });
          
          // Removed debug logging to improve performance
          
          return acc;
        }, {});

        return new Response(JSON.stringify(Object.values(groupedQuotes)), { headers });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers 
        });
      }
    }

    if (url.pathname === '/api/update-quote-notes' && req.method === 'POST') {
      try {
        const body = await req.json();
        const { quoteId, size, notes } = body;

        if (!quoteId || !size) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
            status: 400, 
            headers 
          });
        }

        // Parse size to get dimensions
        const sizeMatch = size.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
        if (!sizeMatch) {
          return new Response(JSON.stringify({ error: 'Invalid size format' }), { 
            status: 400, 
            headers 
          });
        }

        const sizeX = parseFloat(sizeMatch[1]);
        const sizeY = parseFloat(sizeMatch[2]);

        // Update notes for all quote lines with this size
        const result = await client.query(`
          UPDATE quotes 
          SET notes = $1 
          WHERE quoteid = $2 AND sizexmm = $3 AND sizeymm = $4
        `, [notes, quoteId, sizeX, sizeY]);

        if (result.rowCount === 0) {
          return new Response(JSON.stringify({ error: 'No quotes found with specified size' }), { 
            status: 404, 
            headers 
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Notes updated successfully',
          updatedCount: result.rowCount
        }), { headers });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers 
        });
      }
    }

    if (url.pathname === '/api/jobs') {
      try {
        // Get limit parameter from query string
        const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 50;
        
        let limitClause = '';
        if (limit > 0) {
          limitClause = `LIMIT ${limit}`;
        }
        
        const result = await client.query(`
          SELECT 
            j.job_id,
            CONCAT(COALESCE(j.size_x::text, 'N/A'), ' x ', COALESCE(j.size_y::text, 'N/A')) as size_mm,
            1 as line_count,
            j.qty_ordered as total_quantity,
            j.qty_ordered::text as individual_quantities,
            COALESCE(j.product_name, j.job_number) as products,
            COALESCE(j.material_name, m.material_name) as materials,
            COALESCE(j.line_identifier, j.job_number) as line_identifiers,
            COALESCE(j.line_description, j.special_instructions) as descriptions,
            c.name as customername,
            j.order_date as orderdate,
            j.due_date as duedate,
            j.quote_id as quoteid,
            j.processed as processed,
            1 as size_variations
          FROM jobs j
          LEFT JOIN customers c ON j.customer_id = c.customer_id
          LEFT JOIN materials m ON j.material_id = m.material_id
          WHERE j.job_id IS NOT NULL
          ORDER BY j.order_date DESC, j.job_id DESC
          ${limitClause}
        `);
        
        // Group by jobId to show jobs (simplified since jobs table already consolidates data)
        const groupedJobs = result.rows.reduce((acc, row) => {
          if (!acc[row.job_id]) {
            acc[row.job_id] = {
              jobId: row.job_id,
              customerName: row.customername,
              orderDate: row.orderdate,
              dueDate: row.duedate,
              quoteId: row.quoteid,
              sizeVariations: row.size_variations,
              totalLines: 0,
              totalQuantity: 0,
              sizeGroups: []
            };
          }
          
          acc[row.job_id].totalLines += parseInt(row.line_count) || 0;
          acc[row.job_id].totalQuantity += parseInt(row.total_quantity) || 0;
          acc[row.job_id].sizeGroups.push({
            size: row.size_mm,
            lineCount: parseInt(row.line_count) || 0,
            totalQuantity: parseInt(row.total_quantity) || 0,
            individualQuantities: row.individual_quantities,
            products: row.products,
            materials: row.materials,
            lineIdentifiers: row.line_identifiers,
            descriptions: row.descriptions,
            processed: row.processed
          });
          
          return acc;
        }, {});

        return new Response(JSON.stringify(Object.values(groupedJobs)), { headers });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers 
        });
      }
    }

    if (url.pathname === '/api/customers') {
      try {
        const result = await client.query(`
          SELECT * FROM customers 
          ORDER BY customername
        `);
        return new Response(JSON.stringify(result.rows), { headers });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers 
        });
      }
    }

    if (url.pathname === '/api/upload-file' && req.method === 'POST') {
      try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const customerName = formData.get('customerName') as string;
        const size = formData.get('size') as string;
        const quoteId = formData.get('quoteId') as string;
        const type = formData.get('type') as string; // 'quote' or 'job'

        if (!file || !customerName || !size || !quoteId) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
            status: 400, 
            headers 
          });
        }

        // Create the directory path based on customer structure
        const basePath = BASE_FILES_PATH;
        const customerPath = `${basePath}/${customerName}/${size}/${quoteId}/files`;
        
        // Create directory if it doesn't exist
        await Bun.write(`${customerPath}/.keep`, '');
        
        // Save the file to the customer folder
        const filePath = `${customerPath}/${file.name}`;
        await Bun.write(filePath, file);

        console.log(`File uploaded: ${file.name} to ${filePath}`);

        // If pdf, generate thumbnail async (do not block response)
        if (/\.pdf$/i.test(file.name)) {
          ensurePdfThumbnail(filePath).catch(() => {});
        }

        // Store file location in customer_file_index (single source of truth)
        const fileResult = await client.query(`
          INSERT INTO customer_file_index (
            id, filename, filelocation, uploadedat, notes, customerfolderid, deleted
          ) VALUES (
            gen_random_uuid(), $1, $2, NOW(), $3, NULL, FALSE
          ) 
          ON CONFLICT (filelocation) DO UPDATE SET
            uploadedat = NOW(),
            notes = $3,
            deleted = FALSE
          RETURNING id
        `, [file.name, filePath, `Uploaded via ${type} interface for ${quoteId}`]);
        
        const fileId = fileResult.rows[0].id;
        
        // Create association with quote or job line using junction table
        if (type === 'quote') {
          await client.query(`
            INSERT INTO line_file_associations (
              association_id, file_id, quote_line_identifier, quote_id, 
              association_type, uploaded_for_context, created_by, deleted_from_association
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, 'quote', 'quote_submission', 'system', FALSE
            )
            ON CONFLICT (file_id, quote_id, quote_line_identifier) DO UPDATE SET
              deleted_from_association = FALSE,
              uploaded_for_context = 'quote_submission'
          `, [fileId, quoteId, quoteId]); // Using quoteId as line identifier for now
        } else if (type === 'job') {
          await client.query(`
            INSERT INTO line_file_associations (
              association_id, file_id, job_line_identifier, job_id,
              association_type, uploaded_for_context, created_by, deleted_from_association
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, 'job', 'job_production', 'system', FALSE
            )
            ON CONFLICT (file_id, job_id, job_line_identifier) DO UPDATE SET
              deleted_from_association = FALSE,
              uploaded_for_context = 'job_production'
          `, [fileId, quoteId, quoteId]); // Using quoteId as job identifier
        }

        console.log(`File indexed in database: ${file.name} at ${filePath}`);

        return new Response(JSON.stringify({ 
          success: true, 
          filePath: filePath,
          message: 'File uploaded successfully' 
        }), { headers });
      } catch (error: any) {
        console.error('File upload error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers 
        });
      }
    }

    if (url.pathname === '/api/submit-line' && req.method === 'POST') {
      try {
        const body = await req.json();
        const { id, type, size, lineIdentifiers } = body;

        if (!id || !type || !size || !lineIdentifiers) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
            status: 400, 
            headers 
          });
        }

        // Update the processed flag for the specific lines
        if (type === 'quote') {
          // For quotes, update quotes table that match the quoteid AND size dimensions
          // Parse the size string to get dimensions
          const sizeParts = size.split(' x ');
          const sizeX = sizeParts[0] === 'N/A' ? null : parseFloat(sizeParts[0]);
          const sizeY = sizeParts[1] === 'N/A' ? null : parseFloat(sizeParts[1]);
          
          console.log(`Updating quotes for quoteid: ${id}, size: ${size}, parsed sizeX: ${sizeX}, sizeY: ${sizeY}`);
          
          const result = await client.query(`
            UPDATE quotes 
            SET processed = true 
            WHERE quoteid = $1 
              AND COALESCE(sizexmm, 0) = COALESCE($2, 0)
              AND COALESCE(sizeymm, 0) = COALESCE($3, 0)
          `, [id, sizeX, sizeY]);
          
          console.log(`Updated ${result.rowCount} quotes`);
        } else if (type === 'job') {
          // For jobs, update jobs table using processed field
          const jobIds = lineIdentifiers.split(',').map((id: string) => id.trim());
          
          for (const jobId of jobIds) {
            await client.query(`
              UPDATE jobs 
              SET processed = true
              WHERE job_id = $1 
                AND CONCAT(COALESCE(size_x::text, 'N/A'), ' x ', COALESCE(size_y::text, 'N/A')) = $2
            `, [id, size]);
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Line submitted successfully' 
        }), { headers });
      } catch (error: any) {
        console.error('Submit line error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers 
        });
      }
    }

    if (url.pathname === '/api/get-files' && req.method === 'GET') {
      try {
        const urlParams = new URLSearchParams(url.search);
        const customerName = urlParams.get('customerName');
        const size = urlParams.get('size');
        const quoteId = urlParams.get('quoteId');
        const type = urlParams.get('type') || 'quote'; // Default to quote for backward compatibility

        if (!customerName || !size || !quoteId) {
          return new Response(JSON.stringify({ error: 'Missing required parameters' }), { 
            status: 400, 
            headers 
          });
        }

        // Query database for files using junction table, excluding deleted files
        console.log(`Looking for files associated with ${type}Id: ${quoteId}`);
        console.log(`Query parameters: customerName=${customerName}, size=${size}, quoteId=${quoteId}, type=${type}`);
        
        // Build the query based on type
        const isJob = type === 'job';
        const idField = isJob ? 'job_id' : 'quote_id';
        const associationType = isJob ? 'job' : 'quote';
        
        const result = await client.query(`
          SELECT cf.filename, cf.filelocation, cf.uploadedat, lfa.uploaded_for_context
          FROM customer_file_index cf
          JOIN line_file_associations lfa ON cf.id = lfa.file_id
          WHERE lfa.${idField} = $1 AND lfa.association_type = $2
            AND cf.deleted = FALSE 
            AND lfa.deleted_from_association = FALSE
          ORDER BY cf.uploadedat DESC
        `, [quoteId, associationType]);

        console.log(`Junction table query found ${result.rows.length} files for ${type}Id: ${quoteId}`);
        if (result.rows.length > 0) {
          console.log('Files found via junction table:', result.rows.map(r => r.filename));
        }
        
        // Return junction table results (may be empty if all files are deleted from association)
        return new Response(JSON.stringify(result.rows), { headers });
      } catch (error: any) {
        console.error('Get files error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers 
        });
      }
    }

    if (url.pathname === '/api/thumbnail' && req.method === 'GET') {
      try {
        const urlParams = new URLSearchParams(url.search);
        const filePath = urlParams.get('filePath');
        
        if (!filePath) {
          return new Response(JSON.stringify({ error: 'Missing file path' }), { 
            status: 400, 
            headers 
          });
        }

        const file = Bun.file(filePath);
        
        if (!await file.exists()) {
          return new Response(JSON.stringify({ error: 'File not found' }), { 
            status: 404, 
            headers 
          });
        }

        const extension = filePath.split('.').pop()?.toLowerCase();
        
        // For images, return the file directly
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '')) {
          return new Response(file, {
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // For PDFs, just return file info - thumbnails will be handled client-side
        if (extension === 'pdf') {
          const fs = require('fs');
          const fileStats = fs.statSync(filePath);
          
          return new Response(JSON.stringify({
            filename: filePath.split('/').pop(),
            size: fileStats.size,
            type: 'pdf'
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }

        // For other file types, return file info
        const fs = require('fs');
        const fileStats = fs.statSync(filePath);
        
        return new Response(JSON.stringify({
          filename: filePath.split('/').pop(),
          size: fileStats.size,
          type: extension || 'unknown'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });

      } catch (error: any) {
        console.error('Thumbnail error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers 
        });
      }
    }

    if (url.pathname === '/api/file-content' && req.method === 'GET') {
      try {
        const urlParams = new URLSearchParams(url.search);
        let filePath = urlParams.get('filePath');
        
        console.log('File content request for:', filePath);
        
        if (!filePath) {
          console.log('Missing file path in request');
          return new Response(JSON.stringify({ error: 'Missing file path' }), { 
            status: 400, 
            headers 
          });
        }

        // Try to decode the path if it looks like it's URL encoded
        try {
          const decodedPath = decodeURIComponent(filePath);
          if (decodedPath !== filePath) {
            console.log('Decoded path from:', filePath, 'to:', decodedPath);
            filePath = decodedPath;
          }
        } catch (decodeError) {
          // If decoding fails, use the original path
          console.log('Path decoding failed, using original path');
        }

        // Normalize and auto-prefix base path if a relative path was provided (optimistic UI)
        filePath = filePath.trim();
        if (!filePath.startsWith('/')) {
          filePath = `${BASE_FILES_PATH}/${filePath}`;
        } else if (!filePath.startsWith(BASE_FILES_PATH)) {
          // If it's absolute but not under our base, assume it's missing the base
          filePath = `${BASE_FILES_PATH}${filePath}`;
        }

        const file = Bun.file(filePath);
        const exists = await file.exists();
        
        console.log(`File exists: ${exists} for path: ${filePath}`);
        
        if (!exists) {
          return new Response(JSON.stringify({ error: 'File not found' }), { 
            status: 404, 
            headers 
          });
        }

        console.log('Serving file content for:', filePath);

        // Infer content type from file extension for better client compatibility
        const lowerPath = filePath.toLowerCase();
        let contentType = 'application/octet-stream';
        if (lowerPath.endsWith('.pdf')) contentType = 'application/pdf';
        else if (lowerPath.endsWith('.png')) contentType = 'image/png';
        else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (lowerPath.endsWith('.webp')) contentType = 'image/webp';
        else if (lowerPath.endsWith('.gif')) contentType = 'image/gif';

        // Return the raw file content with proper CORS headers
        return new Response(file, {
          headers: {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        });

      } catch (error: any) {
        console.error('File content error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers 
        });
      }
    }

    if (url.pathname === '/api/file-thumbnail' && req.method === 'GET') {
      try {
        const urlParams = new URLSearchParams(url.search);
        let filePath = urlParams.get('filePath');

        if (!filePath) {
          return new Response(JSON.stringify({ error: 'Missing file path' }), { status: 400, headers });
        }

        try {
          const decoded = decodeURIComponent(filePath);
          if (decoded !== filePath) filePath = decoded;
        } catch {}

        // Normalize to base path
        filePath = filePath.trim();
        if (!filePath.startsWith('/')) {
          filePath = `${BASE_FILES_PATH}/${filePath}`;
        } else if (!filePath.startsWith(BASE_FILES_PATH)) {
          filePath = `${BASE_FILES_PATH}${filePath}`;
        }

        // If pdf, ensure thumbnail exists
        if (/\.pdf$/i.test(filePath)) {
          const thumbPath = await ensurePdfThumbnail(filePath);
          const thumbFile = Bun.file(thumbPath);
          if (!(await thumbFile.exists())) {
            return new Response(JSON.stringify({ error: 'Thumbnail not found' }), { status: 404, headers });
          }
          return new Response(thumbFile, {
            headers: {
              'Content-Type': 'image/png',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
            }
          });
        }

        // For non-pdf, just return file content (image)
        const file = Bun.file(filePath);
        if (!(await file.exists())) {
          return new Response(JSON.stringify({ error: 'File not found' }), { status: 404, headers });
        }
        return new Response(file, {
          headers: {
            'Content-Type': 'image/png',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        });
      } catch (error: any) {
        console.error('File thumbnail error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
      }
    }

    // Debug endpoint to inspect customer_file_index
    if (url.pathname === '/api/debug-files' && req.method === 'GET') {
      try {
        const urlParams = new URLSearchParams(url.search);
        const customerName = urlParams.get('customerName');
        
        if (!customerName) {
          return new Response(JSON.stringify({ error: 'Missing customerName parameter' }), { 
            status: 400, 
            headers 
          });
        }

        // Get all files for this customer
        const result = await client.query(`
          SELECT filename, filelocation, uploadedat, notes
          FROM customer_file_index 
          WHERE filelocation LIKE $1
          ORDER BY uploadedat DESC
          LIMIT 50
        `, [`%${customerName}%`]);

        return new Response(JSON.stringify({
          customer: customerName,
          totalFiles: result.rows.length,
          files: result.rows
        }), { headers });
      } catch (error: any) {
        console.error('Debug files error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers 
        });
      }
    }

    // Build a prepress package: XML + PDF folder copy for quotes or jobs
    if (url.pathname === '/api/prepress-package' && req.method === 'POST') {
      try {
        const body = await req.json();
        const { type, id, size, lineIdentifiers } = body || {};
        if (!type || !id || !size || !lineIdentifiers) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers });
        }

        const fs = require('fs');
        const path = require('path');
        const ensureDir = (p: string) => { try { fs.mkdirSync(p, { recursive: true }); } catch {} };
        const cpDir = (src: string, dest: string) => {
          try {
            if (fs.existsSync(src)) {
              if (fs.cpSync) {
                fs.cpSync(src, dest, { recursive: true });
              } else {
                // Fallback: shallow copy files
                ensureDir(dest);
                const entries = fs.readdirSync(src, { withFileTypes: true });
                for (const e of entries) {
                  const s = path.join(src, e.name);
                  const d = path.join(dest, e.name);
                  if (e.isDirectory()) {
                    cpDir(s, d);
                  } else {
                    fs.copyFileSync(s, d);
                  }
                }
              }
            }
          } catch (e) {
            console.error('Copy error:', e);
          }
        };

        const identifiers: string[] = String(lineIdentifiers)
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => !!s);

        const packages: string[] = [];

        for (const lineId of identifiers) {
          let row: any = null;
          if (type === 'quote') {
            const res = await client.query('SELECT * FROM quotes WHERE lineidentifier = $1 LIMIT 1', [lineId]);
            row = res.rows[0];
          } else {
            const res = await client.query('SELECT * FROM jobs WHERE job_number = $1 LIMIT 1', [lineId]);
            row = res.rows[0];
          }

          if (!row) {
            console.warn(`No row found for ${type} lineIdentifier=${lineId}`);
            continue;
          }

          const baseId = (type === 'quote' ? (row.quoteid || id) : (row.jobid || id));
          let linePart = String(lineId);
          // Strip any leading repeats of "<baseId>-" (handles cases like Q2556-Q2556-716)
          while (linePart.startsWith(`${baseId}-`)) {
            linePart = linePart.substring(baseId.length + 1);
          }
          const folderName = `${baseId}-${linePart}`;
          // Separate quotes and jobs into different directories
          const typeDir = path.join(PREPRESS_OUT_PATH, type === 'quote' ? 'quotes' : 'jobs');
          ensureDir(typeDir);
          const outDir = path.join(typeDir, folderName);
          ensureDir(outDir);

          // Compose XML structure similar to parse-*.ts jobline root
          const xmlEscape = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
            `<jobline>\n` +
            `  <lineIdentifier>${xmlEscape(row.lineidentifier || lineId)}</lineIdentifier>\n` +
            (row.lineidentifiernoprefix ? `  <lineIdentifierNoPrefix>${xmlEscape(row.lineidentifiernoprefix)}</lineIdentifierNoPrefix>\n` : '') +
            (type === 'quote'
              ? `  <QuoteId>${xmlEscape(row.quoteid || id)}</QuoteId>\n  <QuoteLineId>${xmlEscape(row.quotelineid || '')}</QuoteLineId>\n  <quoteDescription>${xmlEscape(row.quotedescription || '')}</quoteDescription>\n  <quoteDate>${xmlEscape(row.quotedate || '')}</quoteDate>\n`
              : `  <jobId>${xmlEscape(row.jobid || id)}</jobId>\n  <jobLineId>${xmlEscape(row.joblineid || '')}</jobLineId>\n  <jobName>${xmlEscape(row.jobname || '')}</jobName>\n  <orderDate>${xmlEscape(row.orderdate || '')}</orderDate>\n  <dueDate>${xmlEscape(row.duedate || '')}</dueDate>\n`)
            +
            (row.recipeid ? `  <recipeId>${xmlEscape(row.recipeid)}</recipeId>\n` : '') +
            `  <customerId>${xmlEscape(row.customerid || '')}</customerId>\n` +
            `  <customerName>${xmlEscape(row.customername || '')}</customerName>\n` +
            (row.customercontactname ? `  <customerContactName>${xmlEscape(row.customercontactname)}</customerContactName>\n` : '') +
            (row.customercontactemail ? `  <customerContactEmail>${xmlEscape(row.customercontactemail)}</customerContactEmail>\n` : '') +
            (row.accountmanagername ? `  <accountManagerName>${xmlEscape(row.accountmanagername)}</accountManagerName>\n` : '') +
            (row.accountmanageremail ? `  <accountManagerEmail>${xmlEscape(row.accountmanageremail)}</accountManagerEmail>\n` : '') +
            (row.itemid ? `  <itemId>${xmlEscape(row.itemid)}</itemId>\n` : '') +
            (row.productid ? `  <productId>${xmlEscape(row.productid)}</productId>\n` : '') +
            (row.productcode ? `  <productCode>${xmlEscape(row.productcode)}</productCode>\n` : '') +
            (row.productname ? `  <productName>${xmlEscape(row.productname)}</productName>\n` : '') +
            `  <quantity>${xmlEscape(row.quantity || '')}</quantity>\n` +
            (row.sizexmm ? `  <sizeXmm>${xmlEscape(row.sizexmm)}</sizeXmm>\n` : '') +
            (row.sizeymm ? `  <sizeYmm>${xmlEscape(row.sizeymm)}</sizeYmm>\n` : '') +
            (row.sibling ? `  <sibling>${xmlEscape(row.sibling)}</sibling>\n` : '') +
            (row.siblingcount ? `  <siblingCount>${xmlEscape(row.siblingcount)}</siblingCount>\n` : '') +
            (row.revision ? `  <revision>${xmlEscape(row.revision)}</revision>\n` : '') +
            (row.approvers ? `  <approvers>${xmlEscape(row.approvers)}</approvers>\n` : '') +
            (row.filename ? `  <fileName>${xmlEscape(row.filename)}</fileName>\n` : '') +
            (row.filelocation ? `  <fileLocation>${xmlEscape(row.filelocation)}</fileLocation>\n` : '') +
            (row.materialname ? `  <materialName>${xmlEscape(row.materialname)}</materialName>\n` : '') +
            (row.laminatename ? `  <laminateName>${xmlEscape(row.laminatename)}</laminateName>\n` : '') +
            (row.finishingname ? `  <finishingName>${xmlEscape(row.finishingname)}</finishingName>\n` : '') +
            (row.printcolour ? `  <Print_Colour>${xmlEscape(row.printcolour)}</Print_Colour>\n` : '') +
            (row.tool ? `  <Tool>${xmlEscape(row.tool)}</Tool>\n` : '') +
            (row.cores ? `  <Cores>${xmlEscape(row.cores)}</Cores>\n` : '') +
            (row.handmachineapplied ? `  <key name="Hand/Machine Applied">${xmlEscape(row.handmachineapplied)}</key>\n` : '') +
            (row.supply ? `  <Supply>${xmlEscape(row.supply)}</Supply>\n` : '') +
            (row.kinds ? `  <kinds>${xmlEscape(row.kinds)}</kinds>\n` : '') +
            (row.rolldirection ? `  <RollDirection>${xmlEscape(row.rolldirection)}</RollDirection>\n` : '') +
            `  <lineDescription>${xmlEscape(row.linedescription || '')}</lineDescription>\n` +
            (type === 'job' && row.quoteid ? `  <quoteId>${xmlEscape(row.quoteid)}</quoteId>\n` : '') +
            (row.deliverytoaddress ? `  <deliveryToAddress>${xmlEscape(row.deliverytoaddress)}</deliveryToAddress>\n` : '') +
            (row.profitcentrename ? `  <profitCentreName>${xmlEscape(row.profitcentrename)}</profitCentreName>\n` : '') +
            (row.customerfolderid ? `  <customerFolderId>${xmlEscape(row.customerfolderid)}</customerFolderId>\n` : '') +
            (row.status ? `  <status>${xmlEscape(row.status)}</status>\n` : '') +
            (row.changehistory ? `  <changeHistory>${xmlEscape(row.changehistory)}</changeHistory>\n` : '') +
            (row.notes ? `  <notes>${xmlEscape(row.notes)}</notes>\n` : '') +
            `</jobline>\n`;

          const xmlPath = path.join(outDir, `${folderName}.xml`);
          await Bun.write(xmlPath, xml);

          // Copy only files that are associated with this specific quote/job line via junction table
          const destFilesDir = path.join(outDir, folderName);
          ensureDir(destFilesDir);
          
          // Get files from junction table that belong to this quote/job
          const associatedFiles = await client.query(`
            SELECT cf.filename, cf.filelocation 
            FROM customer_file_index cf
            JOIN line_file_associations lfa ON cf.id = lfa.file_id
            WHERE lfa.${type === 'quote' ? 'quote_id' : 'job_id'} = $1 
              AND lfa.association_type = $2
            ORDER BY cf.uploadedat DESC
          `, [type === 'quote' ? (row.quoteid || id) : (row.jobid || id), type]);
          
          console.log(`Found ${associatedFiles.rows.length} associated files for ${type} ${id}`);
          
          // Fallback: if no files found via junction table, try legacy path-based approach
          if (associatedFiles.rows.length === 0) {
            console.log(`No files found via junction table, trying legacy path search...`);
            const legacyFiles = await client.query(`
              SELECT filename, filelocation 
              FROM customer_file_index 
              WHERE filelocation LIKE $1
              ORDER BY uploadedat DESC
            `, [`%${row.customername}/${size}/${id}/files/%`]);
            
            console.log(`Legacy search found ${legacyFiles.rows.length} files`);
            
            // Copy each tracked file individually
            for (const fileRow of legacyFiles.rows) {
              const sourceFile = fileRow.filelocation;
              const fileName = fileRow.filename;
              const destFile = path.join(destFilesDir, fileName);
              
              try {
                if (fs.existsSync(sourceFile)) {
                  fs.copyFileSync(sourceFile, destFile);
                  console.log(`Copied (legacy): ${fileName}`);
                } else {
                  console.warn(`File not found: ${sourceFile}`);
                }
              } catch (error) {
                console.error(`Error copying file ${fileName}:`, error);
              }
            }
          } else {
            // Copy each associated file individually
            for (const fileRow of associatedFiles.rows) {
              const sourceFile = fileRow.filelocation;
              const fileName = fileRow.filename;
              const destFile = path.join(destFilesDir, fileName);
              
              try {
                if (fs.existsSync(sourceFile)) {
                  fs.copyFileSync(sourceFile, destFile);
                  console.log(`Copied: ${fileName}`);
                } else {
                  console.warn(`File not found: ${sourceFile}`);
                }
              } catch (error) {
                console.error(`Error copying file ${fileName}:`, error);
              }
            }
          }

          // Mark this line as processed so it appears in Archive
          try {
            if (type === 'quote') {
              await client.query('UPDATE quotes SET processed = true WHERE lineidentifier = $1', [lineId]);
            } else {
              await client.query('UPDATE jobs SET processed = true WHERE job_number = $1', [lineId]);
            }
          } catch (e) {
            console.warn('Failed to mark processed for', type, lineId, e);
          }

          packages.push(outDir);
        }

        return new Response(JSON.stringify({ success: true, packages }), { headers });
      } catch (error: any) {
        console.error('Prepress package error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
      }
    }

    if (url.pathname === '/api/add-test-file' && req.method === 'POST') {
      try {
        const body = await req.json();
        const { filename, filelocation } = body;

        if (!filename || !filelocation) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
            status: 400, 
            headers 
          });
        }

        await client.query(`
          INSERT INTO customer_file_index (
            id, filename, filelocation, uploadedat, notes, customerfolderid
          ) VALUES (
            gen_random_uuid(), $1, $2, NOW(), 'Test file', NULL
          )
        `, [filename, filelocation]);

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Test file added successfully' 
        }), { headers });
      } catch (error: any) {
        console.error('Add test file error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers 
        });
      }
    }

    if (url.pathname === '/api/delete-file' && req.method === 'DELETE') {
      try {
        const body = await req.json();
        const { filename, customerName, size, quoteId, type, deleteType } = body;

        if (!filename || !customerName || !size || !quoteId || !type) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
            status: 400, 
            headers 
          });
        }

        // Get the file information from database
        const fileResult = await client.query(`
          SELECT cf.id, cf.filelocation 
          FROM customer_file_index cf
          WHERE cf.filename = $1 AND cf.filelocation LIKE $2 AND cf.deleted = FALSE
          LIMIT 1
        `, [filename, `%${customerName}/${size}/${quoteId}/files/%`]);

        if (fileResult.rows.length === 0) {
          return new Response(JSON.stringify({ error: 'File not found in database' }), { 
            status: 404, 
            headers 
          });
        }

        const fileId = fileResult.rows[0].id;
        const actualFilePath = fileResult.rows[0].filelocation;

        // Two deletion modes based on user choice
        if (deleteType === 'association') {
          // Mode 1: Delete only from this job/quote association
          console.log(`Marking file as deleted from ${type} association: ${filename}`);
          
          if (type === 'quote') {
            await client.query(`
              UPDATE line_file_associations 
              SET deleted_from_association = TRUE,
                  deleted_from_association_at = NOW(),
                  deleted_from_association_by = 'user'
              WHERE file_id = $1 AND quote_id = $2 AND association_type = 'quote'
            `, [fileId, quoteId]);
          } else if (type === 'job') {
            await client.query(`
              UPDATE line_file_associations 
              SET deleted_from_association = TRUE,
                  deleted_from_association_at = NOW(),
                  deleted_from_association_by = 'user'
              WHERE file_id = $1 AND job_id = $2 AND association_type = 'job'
            `, [fileId, quoteId]);
          }

          return new Response(JSON.stringify({ 
            success: true, 
            message: `File removed from ${type} (file still available in customer folder)`,
            deleteType: 'association'
          }), { headers });

        } else {
          // Mode 2: Delete from customer folder completely
          console.log(`Deleting file completely from customer folder: ${filename}`);
          
          // Mark file as deleted in customer_file_index
          await client.query(`
            UPDATE customer_file_index 
            SET deleted = TRUE,
                deleted_at = NOW(),
                deleted_by = 'user'
            WHERE id = $1
          `, [fileId]);

          // Mark all associations as deleted
          await client.query(`
            UPDATE line_file_associations 
            SET deleted_from_association = TRUE,
                deleted_from_association_at = NOW(),
                deleted_from_association_by = 'user'
            WHERE file_id = $1
          `, [fileId]);

          // Delete physical file from filesystem
          const file = Bun.file(actualFilePath);
          if (await file.exists()) {
            const fs = require('fs');
            fs.unlinkSync(actualFilePath);
            console.log(`Deleted physical file: ${actualFilePath}`);
          } else {
            console.log(`Physical file not found: ${actualFilePath}`);
          }

          return new Response(JSON.stringify({ 
            success: true, 
            message: 'File deleted completely from customer folder',
            deleteType: 'complete'
          }), { headers });
        }

      } catch (error: any) {
        console.error('Delete file error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers 
        });
      }
    }

    if (url.pathname === '/api/check-quote-files' && req.method === 'POST') {
      try {
        const body = await req.json();
        const { jobId, size, lineIdentifiers } = body || {};
        
        if (!jobId || !size || !lineIdentifiers) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers });
        }

        const identifiers: string[] = String(lineIdentifiers)
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => !!s);

        let hasFiles = false;

        for (const lineId of identifiers) {
          // Get job details and associated quote
          const jobRes = await client.query(`
            SELECT j.*, c.name as customername
            FROM jobs j 
            LEFT JOIN customers c ON j.customer_id = c.customer_id 
            WHERE j.job_number = $1 LIMIT 1
          `, [lineId]);
          
          if (jobRes.rows.length === 0) {
            continue;
          }

          const job = jobRes.rows[0];
          const quoteId = job.quote_id;
          
          if (!quoteId) {
            continue;
          }

          // Check if quote files exist
          const quoteFiles = await client.query(`
            SELECT COUNT(*) as file_count FROM customer_file_index 
            WHERE filelocation LIKE $1
          `, [`%${job.customername}/${size}/${quoteId}/files/%`]);

          if (quoteFiles.rows[0] && parseInt(quoteFiles.rows[0].file_count) > 0) {
            hasFiles = true;
            break; // Found files, no need to check other lines
          }
        }

        return new Response(JSON.stringify({ 
          hasFiles,
          jobId,
          size 
        }), { headers });
      } catch (error: any) {
        console.error('Check quote files error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
      }
    }

    if (url.pathname === '/api/import-quote-files' && req.method === 'POST') {
      try {
        const body = await req.json();
        const { jobId, size, lineIdentifiers } = body || {};
        
        if (!jobId || !size || !lineIdentifiers) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers });
        }

        const fs = require('fs');
        const path = require('path');
        const copiedFiles: string[] = [];
        const errors: string[] = [];

        const identifiers: string[] = String(lineIdentifiers)
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => !!s);

        for (const lineId of identifiers) {
          // Get job details and associated quote
          const jobRes = await client.query(`
            SELECT j.*, c.name as customername
            FROM jobs j 
            LEFT JOIN customers c ON j.customer_id = c.customer_id 
            WHERE j.job_number = $1 LIMIT 1
          `, [lineId]);
          
          if (jobRes.rows.length === 0) {
            errors.push(`Job line ${lineId} not found`);
            continue;
          }

          const job = jobRes.rows[0];
          const quoteId = job.quote_id;
          
          if (!quoteId) {
            errors.push(`No quote ID found for job line ${lineId}`);
            continue;
          }

          // Get quote files from the quote directory
          const quoteFiles = await client.query(`
            SELECT filename, filelocation FROM customer_file_index 
            WHERE filelocation LIKE $1
          `, [`%${job.customername}/${size}/${quoteId}/files/%`]);

          // Create job files directory
          const jobFilesDir = path.join(BASE_FILES_PATH, String(job.customername), String(size), String(jobId), 'files');
          
          // Create job files directory if it doesn't exist
          try { fs.mkdirSync(jobFilesDir, { recursive: true }); } catch {}

          for (const quoteFile of quoteFiles.rows) {
            const sourceFile = quoteFile.filelocation;
            const fileName = quoteFile.filename;
            const destFile = path.join(jobFilesDir, fileName);

            try {
              // Copy the file
              if (fs.existsSync(sourceFile)) {
                fs.copyFileSync(sourceFile, destFile);
                
                // Add to database
                await client.query(`
                  INSERT INTO customer_file_index (
                    id, filename, filelocation, uploadedat, notes, customerfolderid
                  ) VALUES (
                    gen_random_uuid(), $1, $2, NOW(), $3, NULL
                  )
                `, [fileName, destFile, `Imported from quote ${quoteId} for job line ${lineId}`]);

                copiedFiles.push(`${fileName} -> ${destFile}`);
              } else {
                errors.push(`Source file not found: ${sourceFile}`);
              }
            } catch (err) {
              errors.push(`Failed to copy ${fileName}: ${err}`);
            }
          }

          try {
            // Mark job as processed if needed
            await client.query('UPDATE jobs SET processed = true WHERE job_number = $1', [lineId]);
          } catch (e) {
            console.warn('Failed to mark processed for job', lineId, e);
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          copiedFiles,
          errors: errors.length > 0 ? errors : undefined,
          message: `Imported ${copiedFiles.length} files` + (errors.length > 0 ? ` with ${errors.length} errors` : '')
        }), { headers });
      } catch (error: any) {
        console.error('Import quote files error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
      }
    }

    // Kanban board data endpoint
    if (url.pathname === '/api/kanban-data') {
      try {
        const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 20;
        const company = url.searchParams.get('company');
        const filter = url.searchParams.get('filter');
        
        let whereClause = 'j.job_id IS NOT NULL';
        let queryParams: any[] = [limit];
        let paramIndex = 1;
        
        // Add company-specific filtering
        if (company === 'labex' && filter) {
          whereClause += ` AND j.job_number LIKE $${++paramIndex}`;
          queryParams.push(`${filter}%`);
        }
        
        const result = await client.query(`
          SELECT 
            j.job_id as id,
            j.job_number as lineidentifier,
            j.job_id as jobid,
            COALESCE(j.job_name, j.product_name) as jobname,
            j.qty_ordered as quantity,
            j.size_x as sizexmm,
            j.size_y as sizeymm,
            COALESCE(j.material_name, m.material_name) as materialname,
            COALESCE(j.finishing_name, f.finishing_type) as finishingname,
            COALESCE(j.tool, t.die_number) as tool,
            j.due_date as duedate,
            j.order_date as orderdate,
            j.processed,
            c.name as customername,
            j.quote_id as quoteid
          FROM jobs j
          LEFT JOIN customers c ON j.customer_id = c.customer_id
          LEFT JOIN materials m ON j.material_id = m.material_id
          LEFT JOIN finishing_options f ON j.finishing_id = f.finishing_id
          LEFT JOIN tools_library t ON j.tool_id = t.tool_id
          WHERE ${whereClause}
          ORDER BY j.order_date DESC, j.job_id DESC
          LIMIT $1
        `, queryParams);

        // Transform data for Kanban board
        const kanbanData = result.rows.map(row => {
          // Check if tool field exists and has data, otherwise use a placeholder
          const toolValue = row.tool && row.tool.trim() !== '' ? row.tool : 'Tool not specified';
          const due = row.duedate ? new Date(row.duedate) : undefined;
          const now = new Date();
          const overdueDate = due && due < now ? due.toISOString() : undefined;
          
          return {
            id: row.id,
            jobNumber: row.lineidentifier || row.jobid,
            customer: row.customername,
            material: row.materialname,
            finishing: row.finishingname,
            readyDate: row.duedate ? new Date(row.duedate).toLocaleDateString() : undefined,
            dueDate: row.duedate || undefined,
            overdueDate,
            orderDate: row.orderdate,
            quantity: row.quantity,
            tool: toolValue,
            processed: row.processed,
            quoteId: row.quoteid
          };
        });

        return new Response(JSON.stringify({ 
          success: true, 
          data: kanbanData,
          total: kanbanData.length
        }), { headers });
      } catch (error: any) {
        console.error('Kanban data error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
      }
    }

    // Debug endpoint to check file associations
    if (url.pathname === '/api/debug-associations' && req.method === 'GET') {
      try {
        const urlParams = new URLSearchParams(url.search);
        const quoteId = urlParams.get('quoteId');
        const customerName = urlParams.get('customerName');
        const size = urlParams.get('size');
        
        if (!quoteId) {
          return new Response(JSON.stringify({ error: 'Missing quoteId parameter' }), { 
            status: 400, 
            headers 
          });
        }

        // Check association table entries
        const associationResult = await client.query(`
          SELECT 
            cf.id, cf.filename, cf.filelocation, cf.deleted as file_deleted,
            lfa.quote_id, lfa.job_id, lfa.association_type, 
            lfa.deleted_from_association, lfa.deleted_from_association_at
          FROM customer_file_index cf
          JOIN line_file_associations lfa ON cf.id = lfa.file_id
          WHERE lfa.quote_id = $1 OR lfa.job_id = $1
          ORDER BY cf.filename
        `, [quoteId]);

        // Also check what the main get-files query would return
        let mainQueryResult = [];
        if (customerName && size) {
          const mainResult = await client.query(`
            SELECT cf.filename, cf.filelocation, cf.uploadedat, lfa.uploaded_for_context
            FROM customer_file_index cf
            JOIN line_file_associations lfa ON cf.id = lfa.file_id
            WHERE lfa.quote_id = $1 AND lfa.association_type = 'quote'
              AND cf.deleted = FALSE 
              AND lfa.deleted_from_association = FALSE
            ORDER BY cf.uploadedat DESC
          `, [quoteId]);
          mainQueryResult = mainResult.rows;
        }

        // Check legacy search too
        let legacyResult = [];
        if (customerName && size) {
          const searchPattern = `%${customerName}/${size}/${quoteId}/files/%`;
          const legacy = await client.query(`
            SELECT filename, filelocation, uploadedat 
            FROM customer_file_index 
            WHERE filelocation LIKE $1 AND deleted = FALSE
            ORDER BY uploadedat DESC
          `, [searchPattern]);
          legacyResult = legacy.rows;
        }

        return new Response(JSON.stringify({
          associations: associationResult.rows,
          mainQueryResult,
          legacyResult,
          params: { quoteId, customerName, size }
        }), { headers });
      } catch (error: any) {
        console.error('Debug files error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers 
        });
      }
    }

    // Materials endpoint
    if (url.pathname === '/api/materials' && req.method === 'GET') {
      try {
        const result = await client.query(`
          SELECT 
            material_id,
            material_code,
            material_name,
            substrate_type,
            adhesive_type,
            handling,
            weight_gsm,
            width_mm,
            length_mm,
            coating,
            grain_direction,
            glossy_level,
            conductive,
            white_material,
            cost_aud,
            stock,
            reorder_level,
            lead_time_days,
            pricing_unit,
            aliases
          FROM materials
          ORDER BY material_name ASC
        `);

        return new Response(JSON.stringify({ 
          success: true, 
          materials: result.rows,
          total: result.rows.length
        }), { headers });
      } catch (error: any) {
        console.error('Materials error:', error);
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers 
        });
      }
    }

    // Create new material
    if (url.pathname === '/api/materials' && req.method === 'POST') {
      try {
        const body = await req.json();
        const {
          material_code, material_name, substrate_type, adhesive_type, handling,
          weight_gsm, width_mm, length_mm, coating, grain_direction, glossy_level,
          conductive, white_material, cost_aud, stock, 
          reorder_level, lead_time_days, pricing_unit, aliases
        } = body;

        if (!material_name) {
          return new Response(JSON.stringify({ error: 'Material name is required' }), {
            status: 400,
            headers
          });
        }

        // Generate material ID
        const material_id = `MAT-${Date.now()}`;

        const result = await client.query(`
          INSERT INTO materials (
            material_id, material_code, material_name, substrate_type, adhesive_type,
            handling, weight_gsm, width_mm, length_mm, coating, grain_direction,
            glossy_level, conductive, white_material, cost_aud,
            stock, reorder_level, lead_time_days, pricing_unit, aliases
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING *
        `, [
          material_id, material_code, material_name, substrate_type, adhesive_type,
          handling, weight_gsm, width_mm, length_mm, coating, grain_direction,
          glossy_level, conductive, white_material, cost_aud,
          stock, reorder_level, lead_time_days, pricing_unit, aliases
        ]);

        return new Response(JSON.stringify({
          success: true,
          material: result.rows[0]
        }), { headers });
      } catch (error: any) {
        console.error('Create material error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers
        });
      }
    }

    // Update material
    if (url.pathname.startsWith('/api/materials/') && req.method === 'PUT') {
      try {
        const materialId = url.pathname.split('/').pop();
        const body = await req.json();
        const {
          material_code, material_name, substrate_type, adhesive_type, handling,
          weight_gsm, width_mm, length_mm, coating, grain_direction, glossy_level,
          conductive, white_material, cost_aud, stock,
          reorder_level, lead_time_days, pricing_unit, aliases
        } = body;

        if (!material_name) {
          return new Response(JSON.stringify({ error: 'Material name is required' }), {
            status: 400,
            headers
          });
        }

        const result = await client.query(`
          UPDATE materials SET
            material_code = $2, material_name = $3, substrate_type = $4, adhesive_type = $5,
            handling = $6, weight_gsm = $7, width_mm = $8, length_mm = $9, coating = $10,
            grain_direction = $11, glossy_level = $12, conductive = $13, white_material = $14,
            cost_aud = $15, stock = $16, reorder_level = $17, lead_time_days = $18,
            pricing_unit = $19, aliases = $20
          WHERE material_id = $1
          RETURNING *
        `, [
          materialId, material_code, material_name, substrate_type, adhesive_type,
          handling, weight_gsm, width_mm, length_mm, coating, grain_direction,
          glossy_level, conductive, white_material, cost_aud,
          stock, reorder_level, lead_time_days, pricing_unit, aliases
        ]);

        if (result.rows.length === 0) {
          return new Response(JSON.stringify({ error: 'Material not found' }), {
            status: 404,
            headers
          });
        }

        return new Response(JSON.stringify({
          success: true,
          material: result.rows[0]
        }), { headers });
      } catch (error: any) {
        console.error('Update material error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers
        });
      }
    }

    // Import materials from job lines
    if (url.pathname === '/api/import-materials-from-jobs' && req.method === 'POST') {
      try {
        // Get distinct material names from jobs that aren't already in materials table
        const jobMaterials = await client.query(`
          SELECT DISTINCT j.material_name
          FROM jobs j
          WHERE j.material_name IS NOT NULL 
            AND j.material_name != ''
            AND j.material_name != 'nan'
            AND NOT EXISTS (
              SELECT 1 FROM materials m 
              WHERE LOWER(m.material_name) = LOWER(j.material_name)
            )
          ORDER BY j.material_name
        `);

        let imported = 0;
        for (const row of jobMaterials.rows) {
          const materialName = row.material_name.trim();
          if (materialName) {
            const material_id = `MAT-JOB-${Date.now()}-${imported}`;
            const material_code = materialName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 10);
            
            await client.query(`
              INSERT INTO materials (
                material_id, material_code, material_name, substrate_type, adhesive_type,
                handling, weight_gsm, width_mm, length_mm, coating,
                cost_aud, stock, reorder_level, lead_time_days,
                pricing_unit, aliases
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            `, [
              material_id, material_code, materialName, 'paper', 'permanent',
              'hand_applied', 80, 1000, 1000, 'matte',
              0, 0, 10, 7, 'sqm', ''
            ]);
            imported++;
          }
        }

        return new Response(JSON.stringify({
          success: true,
          imported,
          message: `Imported ${imported} new materials from job lines`
        }), { headers });
      } catch (error: any) {
        console.error('Import materials error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers
        });
      }
    }

    return new Response('Not found', { status: 404, headers });
  },
  port: 3001,
  hostname: '0.0.0.0', // Listen on all network interfaces
});

console.log('API server running on http://0.0.0.0:3001');
console.log('Access via IP: http://[YOUR_IP_ADDRESS]:3001');
