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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
              STRING_AGG(DISTINCT COALESCE(q.notes, ''), ' | ') as notes,
              MIN(q.customerid) as customerid,
              MIN(c.customername) as customername,
              MIN(q.quotedate) as orderdate,
              MIN(q.quotedate) as duedate,
              BOOL_AND(COALESCE(q.processed, false)) as all_processed
            FROM quotes q
            LEFT JOIN customers c ON q.customerid = c.customerid
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
          WITH job_summary AS (
            SELECT 
              jl.jobid,
              CONCAT(COALESCE(jl.sizexmm::text, 'N/A'), ' x ', COALESCE(jl.sizeymm::text, 'N/A')) as size_mm,
              jl.quantity,
              jl.productname,
              jl.materialname,
              jl.customerid,
              jl.lineidentifier,
              jl.linedescription,
              jl.processed,
              c.customername,
              jl.orderdate,
              jl.duedate,
              jl.quoteid
            FROM job_lines jl 
            LEFT JOIN customers c ON jl.customerid = c.customerid
            WHERE jl.jobid IS NOT NULL
          ),
          job_aggregated AS (
            SELECT 
              jobid,
              size_mm,
              COUNT(*) as line_count,
              SUM(quantity) as total_quantity,
              STRING_AGG(DISTINCT quantity::text, ', ' ORDER BY quantity::text) as individual_quantities,
              STRING_AGG(DISTINCT productname, ', ') as products,
              STRING_AGG(DISTINCT materialname, ', ') as materials,
              STRING_AGG(DISTINCT lineidentifier, ', ') as line_identifiers,
              STRING_AGG(DISTINCT linedescription, ' | ') as descriptions,
              MIN(customerid) as customerid,
              MIN(customername) as customername,
              MIN(orderdate) as orderdate,
              MIN(duedate) as duedate,
              MIN(quoteid) as quoteid,
              BOOL_AND(COALESCE(processed, false)) as all_processed
            FROM job_summary 
            GROUP BY jobid, size_mm
          )
          SELECT 
            ja.jobid,
            ja.size_mm,
            ja.line_count,
            ja.total_quantity,
            ja.individual_quantities,
            ja.products,
            ja.materials,
            ja.line_identifiers,
            ja.descriptions,
            ja.customername,
            ja.orderdate,
            ja.duedate,
            ja.quoteid,
            ja.all_processed as processed,
            COUNT(*) OVER (PARTITION BY ja.jobid) as size_variations
          FROM job_aggregated ja
          ORDER BY ja.jobid DESC, ja.size_mm
          ${limitClause}
        `);
        
        // Group by jobId to show size variations
        const groupedJobs = result.rows.reduce((acc, row) => {
          if (!acc[row.jobid]) {
            acc[row.jobid] = {
              jobId: row.jobid,
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
          
          acc[row.jobid].totalLines += parseInt(row.line_count) || 0;
          acc[row.jobid].totalQuantity += parseInt(row.total_quantity) || 0;
          acc[row.jobid].sizeGroups.push({
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

        // Create the directory path
        const basePath = BASE_FILES_PATH;
        const customerPath = `${basePath}/${customerName}/${size}/${quoteId}/files`;
        
        // Create directory if it doesn't exist
        await Bun.write(`${customerPath}/.keep`, '');
        
        // Save the file
        const filePath = `${customerPath}/${file.name}`;
        await Bun.write(filePath, file);

        // If pdf, generate thumbnail async (do not block response)
        if (/\.pdf$/i.test(file.name)) {
          ensurePdfThumbnail(filePath).catch(() => {});
        }

        // Log the file upload to database (optional)
        await client.query(`
          INSERT INTO customer_file_index (
            id, filename, filelocation, uploadedat, notes, customerfolderid
          ) VALUES (
            gen_random_uuid(), $1, $2, NOW(), $3, NULL
          )
        `, [file.name, filePath, `Uploaded via ${type} interface for ${quoteId}`]);

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
          // For jobs, update job_lines table
          const lineIds = lineIdentifiers.split(',').map((id: string) => id.trim());
          
          for (const lineId of lineIds) {
            await client.query(`
              UPDATE job_lines 
              SET processed = true 
              WHERE jobid = $1 
                AND lineidentifier = $2
                AND CONCAT(COALESCE(sizexmm::text, 'N/A'), ' x ', COALESCE(sizeymm::text, 'N/A')) = $3
            `, [id, lineId, size]);
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

        if (!customerName || !size || !quoteId) {
          return new Response(JSON.stringify({ error: 'Missing required parameters' }), { 
            status: 400, 
            headers 
          });
        }

        // Query database for files
        const result = await client.query(`
          SELECT filename, filelocation, uploadedat 
          FROM customer_file_index 
          WHERE filelocation LIKE $1
          ORDER BY uploadedat DESC
        `, [`%${customerName}/${size}/${quoteId}/files/%`]);

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
            const res = await client.query('SELECT * FROM job_lines WHERE lineidentifier = $1 LIMIT 1', [lineId]);
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
              : `  <jobId>${xmlEscape(row.jobid || id)}</jobId>\n  <jobLineId>${xmlEscape(row.joblineid || '')}</jobLineId>\n  <jobName>${xmlEscape(row.jobname || '')}</jobName>\n`)
            +
            `  <customerId>${xmlEscape(row.customerid || '')}</customerId>\n` +
            `  <customerName>${xmlEscape(row.customername || '')}</customerName>\n` +
            (row.customercontactname ? `  <customerContactName>${xmlEscape(row.customercontactname)}</customerContactName>\n` : '') +
            (row.customercontactemail ? `  <customerContactEmail>${xmlEscape(row.customercontactemail)}</customerContactEmail>\n` : '') +
            (row.accountmanagername ? `  <accountManagerName>${xmlEscape(row.accountmanagername)}</accountManagerName>\n` : '') +
            (row.accountmanageremail ? `  <accountManagerEmail>${xmlEscape(row.accountmanageremail)}</accountManagerEmail>\n` : '') +
            `  <quantity>${xmlEscape(row.quantity || '')}</quantity>\n` +
            (row.sizexmm ? `  <sizeXmm>${xmlEscape(row.sizexmm)}</sizeXmm>\n` : '') +
            (row.sizeymm ? `  <sizeYmm>${xmlEscape(row.sizeymm)}</sizeYmm>\n` : '') +
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
            (row.deliverytoaddress ? `  <deliveryToAddress>${xmlEscape(row.deliverytoaddress)}</deliveryToAddress>\n` : '') +
            (row.profitcentrename ? `  <profitCentreName>${xmlEscape(row.profitcentrename)}</profitCentreName>\n` : '') +
            `</jobline>\n`;

          const xmlPath = path.join(outDir, `${folderName}.xml`);
          await Bun.write(xmlPath, xml);

          // Copy entire files folder alongside
          const filesDir = path.join(BASE_FILES_PATH, String(row.customername || ''), String(size), String(id), 'files');
          const destFilesDir = path.join(outDir, folderName);
          cpDir(filesDir, destFilesDir);

          // Mark this line as processed so it appears in Archive
          try {
            if (type === 'quote') {
              await client.query('UPDATE quotes SET processed = true WHERE lineidentifier = $1', [lineId]);
            } else {
              await client.query('UPDATE job_lines SET processed = true WHERE lineidentifier = $1', [lineId]);
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
        const { filename, customerName, size, quoteId } = body;

        if (!filename || !customerName || !size || !quoteId) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
            status: 400, 
            headers 
          });
        }

        // First, get the actual file location from the database
        const fileResult = await client.query(`
          SELECT filelocation 
          FROM customer_file_index 
          WHERE filename = $1 AND filelocation LIKE $2
          LIMIT 1
        `, [filename, `%${customerName}/${size}/${quoteId}/files/%`]);

        if (fileResult.rows.length === 0) {
          return new Response(JSON.stringify({ error: 'File not found in database' }), { 
            status: 404, 
            headers 
          });
        }

        const actualFilePath = fileResult.rows[0].filelocation;

        // Delete file from filesystem
        const file = Bun.file(actualFilePath);
        if (await file.exists()) {
          const fs = require('fs');
          fs.unlinkSync(actualFilePath);
          console.log(`Deleted file from filesystem: ${actualFilePath}`);
        } else {
          console.log(`File not found on filesystem: ${actualFilePath}`);
        }

        // Delete file record from database
        await client.query(`
          DELETE FROM customer_file_index 
          WHERE filename = $1 AND filelocation = $2
        `, [filename, actualFilePath]);

        console.log(`Deleted file record from database: ${filename}`);

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'File deleted successfully' 
        }), { headers });
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
          // Get job line details and associated quote
          const jobRes = await client.query(`
            SELECT jl.*, c.customername
            FROM job_lines jl 
            LEFT JOIN customers c ON jl.customerid = c.customerid 
            WHERE jl.lineidentifier = $1 LIMIT 1
          `, [lineId]);
          
          if (jobRes.rows.length === 0) {
            continue;
          }

          const jobLine = jobRes.rows[0];
          const quoteId = jobLine.quoteid;
          
          if (!quoteId) {
            continue;
          }

          // Check if quote files exist
          const quoteFiles = await client.query(`
            SELECT COUNT(*) as file_count FROM customer_file_index 
            WHERE filelocation LIKE $1
          `, [`%${jobLine.customername}/${size}/${quoteId}/files/%`]);

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
          // Get job line details and associated quote
          const jobRes = await client.query(`
            SELECT jl.*, c.customername
            FROM job_lines jl 
            LEFT JOIN customers c ON jl.customerid = c.customerid 
            WHERE jl.lineidentifier = $1 LIMIT 1
          `, [lineId]);
          
          if (jobRes.rows.length === 0) {
            errors.push(`Job line ${lineId} not found`);
            continue;
          }

          const jobLine = jobRes.rows[0];
          const quoteId = jobLine.quoteid;
          
          if (!quoteId) {
            errors.push(`No quote ID found for job line ${lineId}`);
            continue;
          }

          // Check if files were already imported to avoid duplication
          const existingFiles = await client.query(`
            SELECT filename FROM customer_file_index 
            WHERE filelocation LIKE $1 AND notes LIKE $2
          `, [`%${jobLine.customername}/${size}/${jobId}/files/%`, `%Imported from quote ${quoteId}%`]);

          if (existingFiles.rows.length > 0) {
            errors.push(`Files already imported for job line ${lineId} (found ${existingFiles.rows.length} existing files)`);
            continue;
          }

          // Find quote files
          const quoteFiles = await client.query(`
            SELECT filename, filelocation FROM customer_file_index 
            WHERE filelocation LIKE $1
          `, [`%${jobLine.customername}/${size}/${quoteId}/files/%`]);

          if (quoteFiles.rows.length === 0) {
            errors.push(`No files found for quote ${quoteId}, size ${size}`);
            continue;
          }

          // Copy files from quote directory to job directory
          const jobFilesDir = path.join(BASE_FILES_PATH, String(jobLine.customername), String(size), String(jobId), 'files');
          
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

                // Generate PDF thumbnail if it's a PDF
                if (/\.pdf$/i.test(fileName)) {
                  ensurePdfThumbnail(destFile).catch(() => {});
                }

                copiedFiles.push(fileName);
              } else {
                errors.push(`Source file not found: ${sourceFile}`);
              }
            } catch (err) {
              errors.push(`Failed to copy ${fileName}: ${err}`);
            }
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
        
        let whereClause = 'jl.jobid IS NOT NULL';
        let queryParams: any[] = [limit];
        let paramIndex = 1;
        
        // Add company-specific filtering
        if (company === 'labex' && filter) {
          whereClause += ` AND jl.lineidentifier LIKE $${++paramIndex}`;
          queryParams.push(`${filter}%`);
        }
        
        const result = await client.query(`
          SELECT 
            jl.id,
            jl.lineidentifier,
            jl.jobid,
            jl.jobname,
            jl.quantity,
            jl.sizexmm,
            jl.sizeymm,
            jl.materialname,
            jl.finishingname,
            jl.tool,
            jl.duedate,
            jl.orderdate,
            jl.processed,
            c.customername,
            jl.quoteid
          FROM job_lines jl
          LEFT JOIN customers c ON jl.customerid = c.customerid
          WHERE ${whereClause}
          ORDER BY jl.orderdate DESC, jl.jobid DESC
          LIMIT $1
        `, queryParams);

        // Transform data for Kanban board
        const kanbanData = result.rows.map(row => {
          // Check if tool field exists and has data, otherwise use a placeholder
          const toolValue = row.tool && row.tool.trim() !== '' ? row.tool : 'Tool not specified';
          
          return {
            id: row.id,
            jobNumber: row.lineidentifier || row.jobid,
            customer: row.customername,
            material: row.materialname,
            finishing: row.finishingname,
            readyDate: row.duedate ? new Date(row.duedate).toLocaleDateString() : undefined,
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

    return new Response('Not found', { status: 404, headers });
  },
  port: 3001,
  hostname: '0.0.0.0', // Listen on all network interfaces
});

console.log('API server running on http://0.0.0.0:3001');
console.log('Access via IP: http://[YOUR_IP_ADDRESS]:3001');
