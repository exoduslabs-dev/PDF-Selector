const express = require('express');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');

// Load environment variables
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PDF conversion functionality - Enhanced with better error handling
async function convertPdfToImage(pdfPath, outputDir, tileWidth = 140) {
  try {
    if (!fs.existsSync(pdfPath)) {
      console.log(`PDF file not found: ${pdfPath}`);
      return { imagePath: null, pageCount: 0 };
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // First, try to get page count even if rendering fails
    let pageCount = 0;
    try {
      const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
      const data = new Uint8Array(fs.readFileSync(pdfPath));
      const loadingTask = pdfjsLib.getDocument({
        data,
        disableFontFace: true,
        useSystemFonts: false,
        verbosity: 0
      });
      const pdfDoc = await loadingTask.promise;
      pageCount = pdfDoc.numPages;
      console.log(`PDF loaded: ${pageCount} pages`);
      
      // Try PDF.js rendering with enhanced error handling
      try {
        const { createCanvas } = require('canvas');
        
        // Set up enhanced NodeCanvasFactory with proper error handling
        const NodeCanvasFactory = class {
          create(width, height) {
            const canvas = createCanvas(width, height);
            const context = canvas.getContext('2d');
            
            // Ensure proper canvas setup
            if (!canvas || !context) {
              throw new Error('Failed to create canvas or context');
            }
            
            return { canvas, context };
          }
          
          reset(canvasAndContext, width, height) {
            if (canvasAndContext && canvasAndContext.canvas) {
              canvasAndContext.canvas.width = width;
              canvasAndContext.canvas.height = height;
            }
          }
          
          destroy(canvasAndContext) {
            if (canvasAndContext) {
              if (canvasAndContext.canvas) {
                canvasAndContext.canvas.width = 0;
                canvasAndContext.canvas.height = 0;
                canvasAndContext.canvas = null;
              }
              canvasAndContext.context = null;
            }
          }
        };

        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        
        // Calculate scale to fit desired width
        const scale = Math.min((tileWidth * 2) / viewport.width, 2.0); // Cap at 2x scale
        const scaledViewport = page.getViewport({ scale });
        
        const canvas = createCanvas(scaledViewport.width, scaledViewport.height);
        const context = canvas.getContext('2d');
        
        if (!canvas || !context) {
          throw new Error('Failed to create main canvas');
        }
        
        // Set up rendering context with timeout
        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
          canvasFactory: new NodeCanvasFactory(),
          background: 'white'
        };
        
        // Add timeout to prevent hanging
        const renderPromise = page.render(renderContext).promise;
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF render timeout')), 30000)
        );
        
        await Promise.race([renderPromise, timeoutPromise]);
        
        const imgBuffer = canvas.toBuffer('image/png');
        const imgFilename = `${path.basename(pdfPath, '.pdf')}_thumb.png`;
        const imgPath = path.join(outputDir, imgFilename);
        
        fs.writeFileSync(imgPath, imgBuffer);
        
        if (pageCount > 1) {
          console.log(`PDF thumbnail created: ${imgPath} (${pageCount} pages - showing page 1)`);
        } else {
          console.log(`PDF thumbnail created: ${imgPath}`);
        }
        
        return { imagePath: imgPath, pageCount };
        
      } catch (renderError) {
        console.log('PDF.js rendering failed:', renderError.message);
        
        // Try alternative rendering approach
        try {
          console.log('Attempting alternative PDF rendering...');
          return await tryAlternativePdfRendering(pdfPath, outputDir, pageCount, tileWidth);
        } catch (altError) {
          console.log('Alternative rendering also failed:', altError.message);
          return { imagePath: null, pageCount };
        }
      }
      
    } catch (pdfLoadError) {
      console.log('Failed to load PDF with PDF.js:', pdfLoadError.message);
      return { imagePath: null, pageCount: 0 };
    }
    
  } catch (err) {
    console.error(`PDF conversion error: ${err}`);
    return { imagePath: null, pageCount: 0 };
  }
}

// Alternative PDF rendering method using different approach
async function tryAlternativePdfRendering(pdfPath, outputDir, pageCount, tileWidth) {
  try {
    // Try using pdftoppm or similar command-line tool if available
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    const imgFilename = `${path.basename(pdfPath, '.pdf')}_thumb.png`;
    const imgPath = path.join(outputDir, imgFilename);
    
    // Try pdftoppm (part of poppler-utils)
    try {
      await execPromise(`pdftoppm -png -f 1 -l 1 -scale-to-x ${tileWidth * 2} -scale-to-y -1 "${pdfPath}" "${imgPath.replace('.png', '')}"`);
      
      // pdftoppm creates files with -1 suffix, rename it
      const generatedFile = imgPath.replace('.png', '-1.png');
      if (fs.existsSync(generatedFile)) {
        fs.renameSync(generatedFile, imgPath);
        console.log(`PDF thumbnail created using pdftoppm: ${imgPath}`);
        return { imagePath: imgPath, pageCount };
      }
    } catch (pdftoppmError) {
      console.log('pdftoppm not available or failed');
    }
    
    // Try ImageMagick convert
    try {
      await execPromise(`convert "${pdfPath}[0]" -resize ${tileWidth * 2}x -quality 85 "${imgPath}"`);
      
      if (fs.existsSync(imgPath)) {
        console.log(`PDF thumbnail created using ImageMagick: ${imgPath}`);
        return { imagePath: imgPath, pageCount };
      }
    } catch (convertError) {
      console.log('ImageMagick convert not available or failed');
    }
    
    throw new Error('No alternative PDF rendering methods available');
    
  } catch (error) {
    console.log('Alternative PDF rendering failed:', error.message);
    return { imagePath: null, pageCount };
  }
}

const client = new Client({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

client.connect();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { customerName, size, quoteId } = req.body;
    const basePath = `/Volumes/Archives/Next-Label/database`;
    const customerPath = `${basePath}/${customerName}/${size}/${quoteId}/files`;
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(customerPath)) {
      fs.mkdirSync(customerPath, { recursive: true });
    }
    
    cb(null, customerPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// API Routes
app.get('/api/quotes', async (req, res) => {
  try {
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
        qa.customername,
        qa.orderdate,
        qa.duedate,
        qa.all_processed as processed,
        COUNT(*) OVER (PARTITION BY qa.quoteid) as size_variations
      FROM quote_aggregated qa
      ORDER BY qa.quoteid, qa.size_mm
    `);
    
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
        processed: row.processed
      });
      
      return acc;
    }, {});

    res.json(Object.values(groupedQuotes));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/thumbnail', async (req, res) => {
  try {
    const filePath = req.query.filePath;
    
    if (!filePath) {
      return res.status(400).json({ error: 'Missing file path' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const extension = path.extname(filePath).toLowerCase().substring(1);
    
    // For images, return the file directly (browser will handle display)
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
      return res.sendFile(filePath);
    }
    
    // For PDFs, try to generate a thumbnail
    if (extension === 'pdf') {
      try {
        // Create thumbnail directory if it doesn't exist
        const thumbnailDir = '/tmp/pdf_thumbnails';
        if (!fs.existsSync(thumbnailDir)) {
          fs.mkdirSync(thumbnailDir, { recursive: true });
        }
        
        const fileHash = Buffer.from(filePath).toString('base64').replace(/[\/\+=]/g, '_');
        const thumbnailPath = path.join(thumbnailDir, `${fileHash}.png`);
        
        // Check if thumbnail already exists
        if (fs.existsSync(thumbnailPath)) {
          // Even for cached thumbnails, get PDF metadata for headers
          let pageCount = 0;
          let isMultiPage = false;
          try {
            const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
            const data = new Uint8Array(fs.readFileSync(filePath));
            const loadingTask = pdfjsLib.getDocument({ data, verbosity: 0 });
            const pdfDoc = await loadingTask.promise;
            pageCount = pdfDoc.numPages;
            isMultiPage = pageCount > 1;
          } catch (metadataError) {
            console.log('Could not read PDF metadata for cached thumbnail:', metadataError);
          }
          
          res.set({
            'Content-Type': 'image/png',
            'X-PDF-Page-Count': pageCount.toString(),
            'X-PDF-Multi-Page': isMultiPage ? 'true' : 'false'
          });
          return res.sendFile(thumbnailPath);
        }

        // Generate thumbnail using PDF.js
        const thumbnailResult = await convertPdfToImage(filePath, thumbnailDir);
        
        if (thumbnailResult.imagePath && fs.existsSync(thumbnailResult.imagePath)) {
          res.set({
            'Content-Type': 'image/png',
            'X-PDF-Page-Count': thumbnailResult.pageCount.toString(),
            'X-PDF-Multi-Page': thumbnailResult.pageCount > 1 ? 'true' : 'false'
          });
          return res.sendFile(thumbnailResult.imagePath);
        }
      } catch (pdfError) {
        console.log('PDF thumbnail generation failed, falling back to placeholder:', pdfError);
      }

      // Try to get page count even if rendering failed
      let pageCount = 0;
      let isMultiPage = false;
      try {
        const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
        const data = new Uint8Array(fs.readFileSync(filePath));
        const loadingTask = pdfjsLib.getDocument({ data, verbosity: 0 });
        const pdfDoc = await loadingTask.promise;
        pageCount = pdfDoc.numPages;
        isMultiPage = pageCount > 1;
      } catch (metadataError) {
        console.log('Could not read PDF metadata:', metadataError);
      }

      // Fallback: Create a simple PDF placeholder image with page info
      const pageInfo = isMultiPage ? `${pageCount} pages - showing page 1` : '';
      const placeholderSvg = `
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="#f3f4f6"/>
          <rect x="20" y="20" width="160" height="160" fill="white" stroke="#d1d5db" stroke-width="2"/>
          <text x="100" y="85" font-family="Arial" font-size="14" fill="#374151" text-anchor="middle">PDF</text>
          <text x="100" y="105" font-family="Arial" font-size="11" fill="#6b7280" text-anchor="middle">${path.basename(filePath)}</text>
          ${isMultiPage ? `<text x="100" y="125" font-family="Arial" font-size="9" fill="#ef4444" text-anchor="middle">Multi-page detected</text>` : ''}
          ${isMultiPage ? `<text x="100" y="140" font-family="Arial" font-size="9" fill="#6b7280" text-anchor="middle">${pageCount} pages</text>` : ''}
          <text x="100" y="${isMultiPage ? '155' : '130'}" font-family="Arial" font-size="16" fill="#9ca3af" text-anchor="middle">📄</text>
        </svg>
      `;
      
      res.set({
        'Content-Type': 'image/svg+xml',
        'X-PDF-Page-Count': pageCount.toString(),
        'X-PDF-Multi-Page': isMultiPage ? 'true' : 'false'
      });
      return res.send(placeholderSvg);
    }

    // For other file types, create a placeholder
    const placeholderSvg = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#f9fafb"/>
        <rect x="20" y="20" width="160" height="160" fill="white" stroke="#e5e7eb" stroke-width="2"/>
        <text x="100" y="90" font-family="Arial" font-size="12" fill="#374151" text-anchor="middle">${extension.toUpperCase() || 'FILE'}</text>
        <text x="100" y="110" font-family="Arial" font-size="10" fill="#6b7280" text-anchor="middle">${path.basename(filePath)}</text>
        <text x="100" y="130" font-family="Arial" font-size="16" fill="#9ca3af" text-anchor="middle">📎</text>
      </svg>
    `;

    res.set('Content-Type', 'image/svg+xml');
    res.send(placeholderSvg);

  } catch (error) {
    console.error('Thumbnail error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/get-files', async (req, res) => {
  try {
    const { customerName, size, quoteId } = req.query;

    if (!customerName || !size || !quoteId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Query database for files
    const result = await client.query(`
      SELECT filename, filelocation, uploadedat 
      FROM customer_file_index 
      WHERE filelocation LIKE $1
      ORDER BY uploadedat DESC
    `, [`%${customerName}/${size}/${quoteId}/files/%`]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Other routes would go here...

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on http://0.0.0.0:${PORT}`);
  console.log(`Access via IP: http://[YOUR_IP_ADDRESS]:${PORT}`);
});
